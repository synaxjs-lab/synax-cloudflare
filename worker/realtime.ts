import { DurableObject } from 'cloudflare:workers';

interface Env {
  SUPABASE_URL: string;
  SUPABASE_SECRET_KEY: string;
}

type UserId = 'person_1' | 'person_2';
type ClientInfo = {
  userId: UserId | 'admin' | 'guest';
  role: 'user' | 'admin';
  /** True only while this browser has the SYNAX tab visible. */
  chatActive: boolean;
  /** Timestamp of the last application-level heartbeat received. */
  lastHeartbeat: number;
  /** Last moment this socket was known to be viewing the visible SYNAX tab. */
  lastActiveAt: number;
};

const HEARTBEAT_TIMEOUT_MS = 12_000;
const PRESENCE_ALARM_MS = 5_000;
const MESSAGE_DEDUP_TTL_MS = 24 * 60 * 60 * 1000;
const PENDING_MESSAGE_PREFIX = 'pendingMessage:';
const MESSAGE_DEDUP_PREFIX = 'messageDedup:';

function isUserId(value: unknown): value is UserId {
  return value === 'person_1' || value === 'person_2';
}

function normalizeTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return 0;
    return value < 100_000_000_000 ? Math.round(value * 1000) : Math.round(value);
  }
  if (typeof value === 'string') {
    const text = value.trim();
    if (!text) return 0;
    if (/^\d+(?:\.\d+)?$/.test(text)) {
      const numeric = Number(text);
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      return numeric < 100_000_000_000 ? Math.round(numeric * 1000) : Math.round(numeric);
    }
    const parsed = Date.parse(text);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
}

function oppositeUser(userId: UserId): UserId {
  return userId === 'person_1' ? 'person_2' : 'person_1';
}

function json(data: unknown, init: ResponseInit = {}) {
  return new Response(JSON.stringify(data), {
    ...init,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      ...(init.headers || {}),
    },
  });
}

async function supabaseFetch(env: Env, path: string, init: RequestInit = {}) {
  if (!env.SUPABASE_URL || !env.SUPABASE_SECRET_KEY) {
    throw new Error('Supabase environment variables are missing.');
  }

  const headers: Record<string, string> = {
    apikey: env.SUPABASE_SECRET_KEY,
    'Content-Type': 'application/json',
    ...((init.headers as Record<string, string>) || {}),
  };

  // New Supabase sb_secret_* keys are API keys, not JWTs. Only older JWT-style
  // service-role keys should also be copied to Authorization.
  if (!env.SUPABASE_SECRET_KEY.startsWith('sb_')) {
    headers.Authorization = `Bearer ${env.SUPABASE_SECRET_KEY}`;
  }

  const res = await fetch(`${env.SUPABASE_URL.replace(/\/$/, '')}${path}`, {
    ...init,
    headers,
  });

  if (!res.ok) {
    throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 400)}`);
  }
  return res;
}

async function loadSession(env: Env, token: string): Promise<ClientInfo | null> {
  if (!token) return null;

  const url =
    `/rest/v1/synax_sessions?token=eq.${encodeURIComponent(token)}` +
    `&select=token,user_id,active,ended_at&limit=1`;

  const res = await supabaseFetch(env, url);
  const rows = await res.json() as Array<{
    token: string;
    user_id: UserId | 'admin';
    active: boolean;
    ended_at?: number | null;
  }>;

  const row = rows[0];
  if (!row || row.ended_at) return null;

  return {
    userId: row.user_id,
    role: row.user_id === 'admin' ? 'admin' : 'user',
    chatActive: false,
    lastHeartbeat: Date.now(),
    lastActiveAt: 0,
  };
}

export class SynaxRealtimeHub extends DurableObject<Env> {
  private async getLastSeen(userId: UserId): Promise<number> {
    const cached = normalizeTimestamp((await this.ctx.storage.get<number>(`lastSeen:${userId}`)) || 0);
    if (cached > 0) return cached;

    // Durable Object storage is local to this DO instance. On a fresh DO
    // (or after a new deployment) it can be empty even though Supabase has
    // the real persistent last-seen value. Fall back to Supabase so the UI
    // never shows a fake/unavailable timestamp after reconnects/deployments.
    try {
      const response = await supabaseFetch(this.env,
        `/rest/v1/synax_user_usage?user_id=eq.${encodeURIComponent(userId)}&select=last_seen,last_heartbeat&limit=1`
      );
      const rows = await response.json().catch(() => []);
      const row = Array.isArray(rows) ? rows[0] : null;
      const lastSeen = normalizeTimestamp(row?.last_seen);
      if (lastSeen > 0) await this.ctx.storage.put(`lastSeen:${userId}`, lastSeen);
      return lastSeen;
    } catch (error) {
      console.warn('SYNAX persistent last-seen lookup failed:', error);
      return 0;
    }
  }

  private async setLastSeen(userId: UserId, timestamp: number) {
    if (!Number.isFinite(timestamp) || timestamp <= 0) return;
    const previous = Number((await this.ctx.storage.get<number>(`lastSeen:${userId}`)) || 0);
    if (previous >= timestamp) return;
    await this.ctx.storage.put(`lastSeen:${userId}`, timestamp);

    // Keep last-seen persistent across Durable Object replacement/restart.
    // This uses the existing synax_user_usage table; no new presence table is
    // required. Failure here must not break realtime presence.
    try {
      const response = await supabaseFetch(this.env,
        `/rest/v1/synax_user_usage?user_id=eq.${encodeURIComponent(userId)}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ last_seen: Math.floor(timestamp), active: false, active_started_at: null }),
        },
      );
      const rows = await response.json().catch(() => []);
      if (!Array.isArray(rows) || rows.length === 0) {
        await supabaseFetch(this.env, '/rest/v1/synax_user_usage?on_conflict=user_id', {
          method: 'POST',
          headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
          body: JSON.stringify({ user_id: userId, active: false, active_started_at: null, last_heartbeat: Math.floor(timestamp), last_seen: Math.floor(timestamp) }),
        });
      }
    } catch (error) {
      console.warn('SYNAX persistent last-seen save failed:', error);
    }
  }

  private isFresh(info: ClientInfo | null): boolean {
    return Boolean(info && Date.now() - Number(info.lastHeartbeat || 0) <= HEARTBEAT_TIMEOUT_MS);
  }

  private getAuthenticatedSockets() {
    return this.ctx.getWebSockets().filter((socket) => {
      const info = socket.deserializeAttachment() as ClientInfo | null;
      return Boolean(info && info.userId !== 'guest' && this.isFresh(info));
    });
  }

  private isUserConnected(userId: UserId, exceptSocket?: WebSocket): boolean {
    return this.ctx.getWebSockets().some((socket) => {
      if (exceptSocket && socket === exceptSocket) return false;
      const info = socket.deserializeAttachment() as ClientInfo | null;
      return info?.userId === userId && this.isFresh(info);
    });
  }

  /**
   * Delivery presence: a live authenticated socket means the account can
   * receive the event even if SYNAX is in the background.
   */
  private isUserReachable(userId: UserId, exceptSocket?: WebSocket): boolean {
    return this.isUserConnected(userId, exceptSocket);
  }

  /**
   * UI presence: ONLINE is only true when at least one authenticated socket
   * explicitly reports that the SYNAX tab is visible.
   * A background browser/mobile app can therefore remain deliverable without
   * being shown as ONLINE.
   */
  private isUserChatActive(userId: UserId, exceptSocket?: WebSocket): boolean {
    return this.ctx.getWebSockets().some((socket) => {
      if (exceptSocket && socket === exceptSocket) return false;
      const info = socket.deserializeAttachment() as ClientInfo | null;
      return info?.userId === userId && info.chatActive === true && this.isFresh(info);
    });
  }

  private async getPresenceSnapshot() {
    const [p1LastSeen, p2LastSeen] = await Promise.all([
      this.getLastSeen('person_1'),
      this.getLastSeen('person_2'),
    ]);

    return {
      person_1: this.isUserChatActive('person_1'),
      person_2: this.isUserChatActive('person_2'),
      lastSeen_1: p1LastSeen,
      lastSeen_2: p2LastSeen,
    };
  }

  private getFastPresenceSnapshot() {
    const sockets = this.ctx.getWebSockets();
    let person1 = false;
    let person2 = false;
    for (const socket of sockets) {
      const info = socket.deserializeAttachment() as ClientInfo | null;
      if (!info || !this.isFresh(info)) continue;
      if (info.userId === 'person_1' && info.chatActive) person1 = true;
      if (info.userId === 'person_2' && info.chatActive) person2 = true;
    }
    return {
      person_1: person1,
      person_2: person2,
      lastSeen_1: 0,
      lastSeen_2: 0,
    };
  }

  private async broadcastPresence() {
    const presence = await this.getPresenceSnapshot();
    const payload = JSON.stringify({ type: 'presence:update', presence });
    for (const socket of this.getAuthenticatedSockets()) {
      try { socket.send(payload); } catch {}
    }
    return presence;
  }

  private pendingMessageKey(message: any): string {
    const clientId = String(message?.clientMessageId || '').trim();
    const id = String(message?.id || '').trim();
    return `${PENDING_MESSAGE_PREFIX}${clientId || id}`;
  }

  private dedupMessageKey(clientMessageId: string): string {
    return `${MESSAGE_DEDUP_PREFIX}${clientMessageId}`;
  }

  private async loadPendingMessages(): Promise<any[]> {
    const entries = await this.ctx.storage.list<any>({ prefix: PENDING_MESSAGE_PREFIX });
    const messages: any[] = [];
    for (const value of entries.values()) {
      if (value && typeof value === 'object' && value.message) messages.push(value.message);
      else if (value && typeof value === 'object' && value.id) messages.push(value);
    }
    return messages.sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
  }

  private async persistMessageNow(message: any): Promise<boolean> {
    try {
      const clientMessageId = String(message?.clientMessageId || '').trim() || null;
      const row = {
        id: String(message.id),
        client_message_id: clientMessageId,
        sender_id: message.senderId,
        type: message.type,
        text: message.text || '',
        file_url: message.fileUrl || null,
        file_name: message.fileName || null,
        file_size: message.fileSize == null ? null : Number(message.fileSize),
        audio_duration: message.audioDuration == null ? null : Number(message.audioDuration),
        timestamp: Number(message.timestamp),
        status: message.status || 'sent',
        reactions: message.reactions || {},
        reply_to: message.replyTo || null,
        is_pinned: Boolean(message.isPinned),
        is_edited: Boolean(message.isEdited),
        deleted: Boolean(message.deleted),
      };
      const path = clientMessageId
        ? '/rest/v1/synax_messages?on_conflict=client_message_id'
        : '/rest/v1/synax_messages?on_conflict=id';
      await supabaseFetch(this.env, path, {
        method: 'POST',
        headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(row),
      });
      await this.ctx.storage.delete(this.pendingMessageKey(message));
      return true;
    } catch (error) {
      // Keep the canonical message in Durable Object storage. The alarm will
      // retry until Supabase accepts it, and /pending-messages makes the same
      // message recoverable even if the browser is refreshed meanwhile.
      console.warn('SYNAX pending message persistence deferred:', error);
      return false;
    }
  }

  private async flushPendingMessages() {
    const pending = await this.loadPendingMessages();
    for (const message of pending) {
      const recipientId = oppositeUser(message.senderId as UserId);
      if (message.status !== 'read' && this.isUserReachable(recipientId)) {
        message.status = 'delivered';
        await this.ctx.storage.put(this.pendingMessageKey(message), { message });
      }
      await this.persistMessageNow(message);
    }
  }

  private async persistEnqueuedMessage(message: any) {
    const ok = await this.persistMessageNow(message);
    if (!ok) await this.ensureMessageAlarm();
  }

  private async ensureMessageAlarm() {
    try {
      const current = await this.ctx.storage.getAlarm();
      const desired = Date.now() + 5_000;
      if (!current || current > desired + 5_000) await this.ctx.storage.setAlarm(desired);
    } catch (error) {
      console.warn('SYNAX message persistence alarm scheduling failed:', error);
    }
  }

  private async pruneMessageDedup() {
    const entries = await this.ctx.storage.list<any>({ prefix: MESSAGE_DEDUP_PREFIX });
    const now = Date.now();
    const deletes: Promise<void>[] = [];
    for (const [key, value] of entries) {
      const createdAt = Number(value?.createdAt || 0);
      if (createdAt && now - createdAt > MESSAGE_DEDUP_TTL_MS) deletes.push(this.ctx.storage.delete(key));
    }
    if (deletes.length) await Promise.all(deletes);
  }

  private async sendTypingUpdate(userId: UserId, isTyping: boolean, exceptSocket?: WebSocket) {
    const targetId = oppositeUser(userId);
    const payload = JSON.stringify({ type: 'typing:update', userId, isTyping });
    for (const socket of this.getAuthenticatedSockets()) {
      if (exceptSocket && socket === exceptSocket) continue;
      const targetInfo = socket.deserializeAttachment() as ClientInfo | null;
      if (targetInfo?.userId === targetId) {
        try { socket.send(payload); } catch {}
      }
    }
  }

  private async enqueueMessage(message: any): Promise<{ message: any; recipientOnline: boolean; delivered: boolean }> {
    const senderId = message?.senderId as UserId;
    if (!isUserId(senderId)) throw new Error('Invalid message sender.');
    const recipientId = oppositeUser(senderId);
    const clientMessageId = String(message?.clientMessageId || '').trim();

    let canonical = message;
    if (clientMessageId) {
      const existingDedup = await this.ctx.storage.get<any>(this.dedupMessageKey(clientMessageId));
      if (existingDedup?.message) canonical = existingDedup.message;
    }

    const recipientOnline = this.isUserReachable(recipientId);
    const incomingId = String(canonical?.id || '').trim();
    const canonicalId = incomingId && !incomingId.startsWith('pending_')
      ? incomingId
      : `msg_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    canonical = {
      ...canonical,
      id: canonicalId,
      clientMessageId: clientMessageId || canonical?.clientMessageId || undefined,
      timestamp: normalizeTimestamp(canonical?.timestamp) || Date.now(),
      status: recipientOnline && canonical.status !== 'read' ? 'delivered' : (canonical.status || 'sent'),
    };

    const queuedValue = {
      message: canonical,
      queuedAt: Date.now(),
    };
    const writes: Promise<void>[] = [
      this.ctx.storage.put(this.pendingMessageKey(canonical), queuedValue),
    ];
    if (clientMessageId) {
      writes.push(this.ctx.storage.put(this.dedupMessageKey(clientMessageId), {
        message: canonical,
        createdAt: Date.now(),
      }));
    }
    await Promise.all(writes);

    const serialized = JSON.stringify({
      type: 'chat:new_message',
      message: canonical,
    });
    for (const socket of this.getAuthenticatedSockets()) {
      try { socket.send(serialized); } catch {}
    }

    // Supabase is deliberately off the critical send path. The durable local
    // queue guarantees the message can still be recovered after a refresh.
    this.ctx.waitUntil(this.persistEnqueuedMessage(canonical));
    if (!recipientOnline) await this.ensureMessageAlarm();

    return { message: canonical, recipientOnline, delivered: recipientOnline };
  }

  private async ensurePresenceAlarm() {
    try {
      const current = await this.ctx.storage.getAlarm();
      const desired = Date.now() + PRESENCE_ALARM_MS;
      if (!current || current > desired + PRESENCE_ALARM_MS) {
        await this.ctx.storage.setAlarm(desired);
      }
    } catch (error) {
      console.warn('SYNAX presence alarm scheduling failed:', error);
    }
  }

  private async pruneStaleSockets() {
    const cutoff = Date.now() - HEARTBEAT_TIMEOUT_MS;
    let changed = false;
    for (const socket of this.ctx.getWebSockets()) {
      const info = socket.deserializeAttachment() as ClientInfo | null;
      if (!info || !isUserId(info.userId) || info.lastHeartbeat >= cutoff) continue;

      if (info.chatActive) {
        await this.setLastSeen(info.userId, info.lastActiveAt || Date.now());
      }
      changed = true;
      try { socket.close(1000, 'Presence heartbeat expired'); } catch {}
    }

    if (changed) await this.broadcastPresence();
  }

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // Cloudflare can answer lightweight ping/pong messages while the DO is
    // hibernated, helping long-lived chat sockets stay healthy.
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
    void this.ensurePresenceAlarm();
  }

  async alarm() {
    await this.pruneStaleSockets();
    await this.flushPendingMessages();
    await this.pruneMessageDedup();
    await this.ensurePresenceAlarm();
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);

    if (url.pathname === '/pending-messages' && request.method === 'GET') {
      return json({ messages: await this.loadPendingMessages() });
    }

    if (url.pathname === '/broadcast' && request.method === 'POST') {
      const payload = await request.json().catch(() => null) as any;
      if (!payload || typeof payload !== 'object') {
        return json({ error: 'Invalid broadcast payload' }, { status: 400 });
      }

      if (payload.type === 'chat:enqueue_message') {
        try {
          const result = await this.enqueueMessage(payload.message);
          return json({
            ok: true,
            recipientOnline: result.recipientOnline,
            delivered: result.delivered,
            message: result.message,
          });
        } catch (error) {
          return json({
            ok: false,
            error: 'Realtime message enqueue failed.',
            detail: error instanceof Error ? error.message : String(error),
          }, { status: 500 });
        }
      }

      let recipientOnline = false;
      const message = payload.message;
      let senderId: UserId | null = null;
      let recipientId: UserId | null = null;

      if (payload.type === 'chat:new_message' && message?.senderId && isUserId(message.senderId)) {
        senderId = message.senderId as UserId;
        recipientId = oppositeUser(senderId);
        recipientOnline = this.isUserReachable(recipientId);
      }

      // Broadcast FIRST. The previous implementation waited for a Supabase
      // PATCH before sending the message to the recipient, which put the
      // database round-trip directly on the chat's realtime critical path.
      // The message bubble now appears as soon as the Durable Object receives
      // it; delivery is reconciled immediately afterwards as a separate event.
      const serialized = JSON.stringify({
        ...payload,
        message: message && { ...message, status: 'sent' },
      });
      const sockets = this.getAuthenticatedSockets();
      for (const socket of sockets) {
        try {
          socket.send(serialized);
        } catch {
          try { socket.close(1011, 'Realtime delivery failed'); } catch {}
        }
      }

      let delivered = false;
      if (senderId && recipientId && recipientOnline && message?.id) {
        const deliveryPromise = this.markMessageDelivered(String(message.id), senderId, recipientId)
          .catch((error) => {
            console.warn('SYNAX background delivery reconciliation failed:', error);
            return false;
          });

        // Durable Object background work is intentionally detached from the
        // response. This keeps send latency independent of the Supabase receipt
        // update while still advancing the canonical delivery status.
        this.ctx.waitUntil(deliveryPromise);
        // We already know the recipient had a live authenticated socket at the
        // moment of broadcast. The exact database transition is completed by
        // the detached task and reported as chat:messages_delivered.
        delivered = false;
      }

      return json({
        ok: true,
        delivered,
        recipientOnline,
        recipients: sockets.length,
      });
    }

    if (url.pathname === '/enqueue-message' && request.method === 'POST') {
      const payload = await request.json().catch(() => null) as any;
      if (!payload?.message || !isUserId(payload.message.senderId)) {
        return json({ error: 'Invalid realtime message payload.' }, { status: 400 });
      }
      try {
        const result = await this.enqueueMessage(payload.message);
        return json({ ok: true, ...result });
      } catch (error) {
        console.error('SYNAX realtime message enqueue failed:', error);
        return json({
          error: 'Realtime message enqueue failed.',
          detail: error instanceof Error ? error.message : String(error),
        }, { status: 500 });
      }
    }

    if (url.pathname !== '/ws') {
      return new Response('Not found', { status: 404 });
    }

    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return new Response('Expected WebSocket upgrade', { status: 426 });
    }

    const pair = new WebSocketPair();
    const client = pair[0];
    const server = pair[1];

    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({
      userId: 'guest',
      role: 'user',
      chatActive: false,
      lastHeartbeat: Date.now(),
      lastActiveAt: 0,
    } satisfies ClientInfo);

    return new Response(null, {
      status: 101,
      webSocket: client,
    });
  }

  private async markMessageDelivered(
    messageId: string,
    senderId: UserId,
    recipientId: UserId,
  ): Promise<boolean> {
    try {
      // If another device already advanced this message, this remains harmless.
      const response = await supabaseFetch(this.env,
        `/rest/v1/synax_messages?id=eq.${encodeURIComponent(messageId)}&sender_id=eq.${senderId}&status=eq.sent`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ status: 'delivered' }),
        },
      );
      const changedRows = await response.json().catch(() => []);
      if (!Array.isArray(changedRows) || changedRows.length === 0) {
        // Another event may already have advanced this message to DELIVERED or READ.
        return false;
      }

      const event = JSON.stringify({
        type: 'chat:messages_delivered',
        recipientId,
        senderId,
        messageId,
      });

      for (const socket of this.getAuthenticatedSockets()) {
        try { socket.send(event); } catch {}
      }
      return true;
    } catch (error) {
      console.warn('SYNAX realtime message delivery update failed:', error);
      return false;
    }
  }

  private async markPartnerMessagesDelivered(recipientId: UserId) {
    const senderId = oppositeUser(recipientId);
    const changedPendingIds: string[] = [];

    // Advance durable queued messages too. These may not have reached Supabase
    // yet, but the recipient is now connected and therefore delivery is real.
    const pendingEntries = await this.ctx.storage.list<any>({ prefix: PENDING_MESSAGE_PREFIX });
    for (const [key, value] of pendingEntries) {
      const message = value?.message || value;
      if (!message || message.senderId !== senderId || message.status !== 'sent') continue;
      message.status = 'delivered';
      changedPendingIds.push(String(message.id));
      await this.ctx.storage.put(key, { ...(value?.message ? value : { message }), message });
    }

    try {
      await supabaseFetch(this.env,
        `/rest/v1/synax_messages?sender_id=eq.${senderId}&status=eq.sent`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=minimal' },
          body: JSON.stringify({ status: 'delivered' }),
        },
      );
    } catch (error) {
      console.warn('SYNAX realtime delivery reconciliation failed:', error);
    }

    const payload = JSON.stringify({
      type: 'chat:messages_delivered',
      recipientId,
      senderId,
      ...(changedPendingIds.length ? { messageIds: changedPendingIds } : {}),
    });
    for (const socket of this.getAuthenticatedSockets()) {
      try { socket.send(payload); } catch {}
    }

    if (changedPendingIds.length) await this.ensureMessageAlarm();
  }

  private async markPartnerMessagesRead(readerId: UserId, messageIds?: string[]) {
    const senderId = oppositeUser(readerId);
    const safeIds = Array.isArray(messageIds)
      ? messageIds.filter((id) => /^[A-Za-z0-9._:-]{1,160}$/.test(String(id))).slice(0, 200)
      : [];
    const idSet = new Set(safeIds.map(String));
    const changedIds = new Set<string>();

    // Mark queued messages read immediately as well. This keeps the read tick
    // correct even if Supabase persistence is still running in the background.
    const pendingEntries = await this.ctx.storage.list<any>({ prefix: PENDING_MESSAGE_PREFIX });
    for (const [key, value] of pendingEntries) {
      const message = value?.message || value;
      if (!message || message.senderId !== senderId || message.status === 'read') continue;
      if (idSet.size && !idSet.has(String(message.id))) continue;
      message.status = 'read';
      changedIds.add(String(message.id));
      await this.ctx.storage.put(key, { ...(value?.message ? value : { message }), message });
    }

    try {
      const idFilter = safeIds.length
        ? `&id=in.(${safeIds.map((id) => encodeURIComponent(String(id))).join(',')})`
        : '';
      const response = await supabaseFetch(this.env,
        `/rest/v1/synax_messages?sender_id=eq.${senderId}&status=neq.read${idFilter}`,
        {
          method: 'PATCH',
          headers: { Prefer: 'return=representation' },
          body: JSON.stringify({ status: 'read' }),
        },
      );
      const rows = await response.json().catch(() => []);
      if (Array.isArray(rows)) {
        for (const row of rows) {
          if (row?.id) changedIds.add(String(row.id));
        }
      }
    } catch (error) {
      console.warn('SYNAX realtime read reconciliation failed:', error);
    }

    if (!changedIds.size) return;

    const payload = JSON.stringify({
      type: 'chat:messages_read',
      readerId,
      senderId,
      messageIds: Array.from(changedIds),
    });
    for (const socket of this.getAuthenticatedSockets()) {
      try { socket.send(payload); } catch {}
    }
    await this.ensureMessageAlarm();
  }

  async webSocketMessage(ws: WebSocket, message: string | ArrayBuffer) {
    if (typeof message !== 'string') return;

    let data: any;
    try {
      data = JSON.parse(message);
    } catch {
      // A raw "ping" is handled by Cloudflare's auto-response hook.
      return;
    }

    if (data?.type === 'auth') {
      try {
        const session = await loadSession(this.env, String(data.token || ''));
        if (!session) {
          ws.send(JSON.stringify({ type: 'auth:error', error: 'Invalid or expired session' }));
          try { ws.close(1008, 'Unauthorized'); } catch {}
          return;
        }

        // Include the browser's current SYNAX visibility in the authenticated
        // socket state so ONLINE is established immediately on first connect,
        // without waiting for a later heartbeat or ChatRoom mount.
        const now = Date.now();
        const requestedActive = Boolean(data.active);
        ws.serializeAttachment({
          ...session,
          chatActive: requestedActive,
          lastHeartbeat: now,
          lastActiveAt: requestedActive ? now : 0,
        });
        await this.ensurePresenceAlarm();

        // Do not block the authenticated socket on Supabase lookups or receipt
        // reconciliation. Mobile browsers can open a fresh socket immediately
        // before sending a message; auth must become usable first.
        ws.send(JSON.stringify({
          type: 'auth:success',
          userId: session.userId,
          presence: this.getFastPresenceSnapshot(),
        }));

        const backgroundTasks: Promise<unknown>[] = [
          this.broadcastPresence(),
        ];
        if (isUserId(session.userId)) {
          backgroundTasks.push(this.markPartnerMessagesDelivered(session.userId));
        }
        this.ctx.waitUntil(Promise.allSettled(backgroundTasks));
        return;
      } catch (error) {
        console.error('SYNAX realtime auth error:', error);
        try {
          ws.send(JSON.stringify({ type: 'auth:error', error: 'Realtime authentication failed' }));
          ws.close(1011, 'Authentication service unavailable');
        } catch {}
        return;
      }
    }

    const info = (ws.deserializeAttachment() as ClientInfo | null) || {
      userId: 'guest' as const,
      role: 'user' as const,
      chatActive: false,
      lastHeartbeat: Date.now(),
      lastActiveAt: 0,
    };

    if (isUserId(info.userId)) {
      ws.serializeAttachment({ ...info, lastHeartbeat: Date.now(), lastActiveAt: Number(info.lastActiveAt || 0) });
    }

    if (data?.type === 'presence:request') {
      if (info.userId !== 'guest') {
        // Presence requests must never hold up the message queue on mobile.
        // Return the cheap in-memory snapshot immediately and refresh the
        // authoritative last-seen data in the background.
        try { ws.send(JSON.stringify({ type: 'presence:update', presence: this.getFastPresenceSnapshot() })); } catch {}
        this.ctx.waitUntil(this.broadcastPresence());
      }
      return;
    }

    if (isUserId(info.userId) && data?.type === 'presence:heartbeat') {
      const active = Boolean(data.active);
      const wasActive = info.chatActive === true;
      const now = Date.now();
      const lastActiveAt = active ? now : (info.lastActiveAt || now);
      ws.serializeAttachment({ ...info, chatActive: active, lastHeartbeat: now, lastActiveAt });
      if (!active && wasActive) {
        const anotherActiveSocket = this.isUserChatActive(info.userId, ws);
        if (!anotherActiveSocket) await this.setLastSeen(info.userId, lastActiveAt);
      }
      this.ctx.waitUntil(this.broadcastPresence());
      this.ctx.waitUntil(this.ensurePresenceAlarm());
      return;
    }

    if (isUserId(info.userId) && data?.type === 'chat:active') {
      const active = Boolean(data.active);
      const wasActive = info.chatActive === true;
      const now = Date.now();
      const lastActiveAt = active ? now : (info.lastActiveAt || now);
      ws.serializeAttachment({ ...info, chatActive: active, lastHeartbeat: now, lastActiveAt });

      if (!active && wasActive) {
        const anotherActiveSocket = this.isUserChatActive(info.userId, ws);
        if (!anotherActiveSocket) {
          await this.setLastSeen(info.userId, lastActiveAt);
        }
      }
      // IMPORTANT: chat visibility is presence only. READ is granted separately
      // through chat:mark_read for messages that the viewport actually shows.

      this.ctx.waitUntil(this.broadcastPresence());
      this.ctx.waitUntil(this.ensurePresenceAlarm());
      return;
    }

    if (isUserId(info.userId) && data?.type === 'chat:mark_read') {
      if (info.chatActive) {
        await this.markPartnerMessagesRead(info.userId, Array.isArray(data.messageIds) ? data.messageIds : undefined);
      }
      return;
    }

    if (isUserId(info.userId) && data?.type === 'typing') {
      await this.sendTypingUpdate(info.userId, Boolean(data.isTyping), ws);
      return;
    }

    if (isUserId(info.userId) && data?.type === 'chat:send_message') {
      const message = data.message;
      if (!message || !isUserId(message.senderId) || message.senderId !== info.userId) return;
      try {
        const result = await this.enqueueMessage({
          ...message,
          timestamp: Number(message.timestamp) > 0 ? Number(message.timestamp) : Date.now(),
        });
        try {
          ws.send(JSON.stringify({
            type: 'chat:message_ack',
            clientMessageId: result.message.clientMessageId,
            message: result.message,
            recipientOnline: result.recipientOnline,
            delivered: result.delivered,
          }));
        } catch {}
      } catch (error) {
        try {
          ws.send(JSON.stringify({
            type: 'chat:message_error',
            clientMessageId: message.clientMessageId,
            error: error instanceof Error ? error.message : 'Realtime message failed.',
          }));
        } catch {}
      }
      return;
    }
  }

  async webSocketClose(ws: WebSocket, _code: number, _reason: string) {
    const info = ws.deserializeAttachment() as ClientInfo | null;
    if (!info || !isUserId(info.userId)) return;

    // A user is ONLINE only when at least one remaining socket is on a
    // visible SYNAX tab. A background socket alone never keeps ONLINE=true.
    // Only a socket that was actually visible should advance Last seen on
    // close. If the tab was already hidden, its Last seen was recorded when
    // it left the visible state and must not be replaced with the close time.
    const stillChatActive = this.isUserChatActive(info.userId, ws);
    await this.sendTypingUpdate(info.userId, false, ws);

    if (info.chatActive && !stillChatActive) {
      await this.setLastSeen(info.userId, info.lastActiveAt || Date.now());
    }

    await this.broadcastPresence();
  }

  async webSocketError(_ws: WebSocket, error: unknown) {
    console.error('SYNAX realtime WebSocket error:', error);
  }
}
