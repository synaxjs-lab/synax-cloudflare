type EventCallback = (data: any) => void;

class SocketService {
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private lastPresenceEvent: any | null = null;
  private reconnectTimer: number | null = null;
  private token: string | null = null;
  private isConnecting = false;
  private reconnectAttempts = 0;
  private chatActive = false;
  private heartbeatTimer: number | null = null;
  private authenticated = false;
  // Preserve the latest typing state across a temporary WebSocket reconnect.
  // This prevents a user who is already typing from being invisible simply
  // because the socket was reconnecting at the exact moment typing started.
  private desiredTyping = false;
  private presenceVisibilityHandler: (() => void) | null = null;
  private connectivityHandler: (() => void) | null = null;
  private pendingMessageWaiters = new Map<string, { resolve: (value: any) => void; timer: number }>();
  private realtimeReadyWaiters = new Set<(ready: boolean) => void>();

  private isSynaxVisible() {
    return document.visibilityState === 'visible';
  }

  // Calls use authenticated HTTP polling instead of relying on a particular
  // WebSocket/container instance. Chat continues using the normal WebSocket.
  private callPollTimer: number | null = null;
  private callPollInFlight = false;
  private callSignalAfterId = 0;
  private callSignalSince = 0;
  private visibilityHandler: (() => void) | null = null;
  private pendingCallEvents = new Map<string, any[]>();
  private seenCallSignalIds = new Set<number>();

  connect(token: string) {
    const changed = this.token !== token;
    this.token = token;

    if (changed) {
      this.lastPresenceEvent = null;
      this.callSignalAfterId = 0;
      this.callSignalSince = Date.now() - 120_000;
      this.seenCallSignalIds.clear();
    }

    this.startCallPolling();

    if (!this.presenceVisibilityHandler) {
      this.presenceVisibilityHandler = () => {
        if (document.visibilityState === 'visible') {
          if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
            this.reconnectAttempts = 0;
            if (this.reconnectTimer !== null) {
              window.clearTimeout(this.reconnectTimer);
              this.reconnectTimer = null;
            }
            if (this.token) this.connect(this.token);
            return;
          }
        }
        if (!this.authenticated) return;
        const active = this.isSynaxVisible();
        this.chatActive = active;
        this.send({ type: 'chat:active', active });
        this.send({ type: 'presence:heartbeat', active, timestamp: Date.now() });
      };
      document.addEventListener('visibilitychange', this.presenceVisibilityHandler);
      window.addEventListener('pageshow', this.presenceVisibilityHandler);
    }

    if (!this.connectivityHandler) {
      this.connectivityHandler = () => {
        if (!this.token || document.visibilityState !== 'visible') return;
        if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
          this.reconnectAttempts = 0;
          if (this.reconnectTimer !== null) {
            window.clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
          }
          this.connect(this.token);
        }
      };
      window.addEventListener('online', this.connectivityHandler);
      window.addEventListener('focus', this.connectivityHandler);
    }

    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      if (this.ws.readyState === WebSocket.OPEN && this.authenticated) {
        const active = this.isSynaxVisible();
        this.chatActive = active;
        this.send({ type: 'chat:active', active });
        this.send({ type: 'presence:heartbeat', active, timestamp: Date.now() });
      }
      return;
    }

    this.isConnecting = true;
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;

    try {
      this.ws = new WebSocket(wsUrl);

        this.ws.onopen = () => {
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        if (this.reconnectTimer !== null) {
          window.clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
        this.authenticated = false;
        this.send({
          type: 'auth',
          token: this.token,
          active: document.visibilityState === 'visible',
        });
        this.emit('connection:open', { status: 'connected' });
      };

      this.ws.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'auth:success') {
            this.authenticated = true;
            for (const resolve of this.realtimeReadyWaiters) resolve(true);
            this.realtimeReadyWaiters.clear();
            // Re-apply the desired chat-focus state after every reconnect and
            // request a fresh presence snapshot now that the socket is auth'd.
            const active = this.isSynaxVisible();
            this.chatActive = active;
            this.send({ type: 'chat:active', active });
            this.startHeartbeat();
            this.send({ type: 'presence:heartbeat', active });
            if (payload.presence) {
              this.emit('presence:update', { type: 'presence:update', presence: payload.presence });
            }
            if (this.desiredTyping) {
              this.send({ type: 'typing', isTyping: true });
            }
          }
          if (payload.type === 'chat:message_ack' && payload.clientMessageId) {
            const waiter = this.pendingMessageWaiters.get(String(payload.clientMessageId));
            if (waiter) {
              window.clearTimeout(waiter.timer);
              this.pendingMessageWaiters.delete(String(payload.clientMessageId));
              waiter.resolve(payload.message || payload);
            }
          } else if (payload.type === 'chat:message_error' && payload.clientMessageId) {
            const waiter = this.pendingMessageWaiters.get(String(payload.clientMessageId));
            if (waiter) {
              window.clearTimeout(waiter.timer);
              this.pendingMessageWaiters.delete(String(payload.clientMessageId));
              waiter.resolve(null);
            }
          }
          if (payload.type) this.emit(payload.type, payload);
        } catch (error) {
          console.warn('SYNAX WebSocket message parse failed:', error);
        }
      };

        this.ws.onclose = () => {
        this.isConnecting = false;
        this.stopHeartbeat();
        this.authenticated = false;
        this.emit('connection:closed', { status: 'disconnected' });
        this.scheduleReconnect();
        // Call polling intentionally remains active.
        this.startCallPolling();
      };

      this.ws.onerror = () => {
        this.isConnecting = false;
      };
    } catch {
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  private startHeartbeat() {
    this.stopHeartbeat();

    const beat = () => {
      if (this.ws?.readyState !== WebSocket.OPEN || !this.authenticated) return;
      // Application-level heartbeat is required so the Durable Object can
      // distinguish a healthy background SYNAX connection from a browser that
      // was actually closed/killed without delivering a reliable close event.
      // The `active` flag controls ONLINE/READ only; the socket itself controls
      // DELIVERY.
      try {
        this.ws.send(JSON.stringify({
          type: 'presence:heartbeat',
          active: this.isSynaxVisible(),
          timestamp: Date.now(),
        }));
      } catch {}
    };

    beat();
    this.heartbeatTimer = window.setInterval(beat, 4_000);
  }

  private stopHeartbeat() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer !== null || !this.token) return;
    const visibleFastPath = document.visibilityState === 'visible' && navigator.onLine !== false;
    const delay = visibleFastPath
      ? Math.min(3000, 200 * Math.pow(2, this.reconnectAttempts))
      : Math.min(8000, 750 * Math.pow(2, this.reconnectAttempts));
    this.reconnectAttempts += 1;
    this.reconnectTimer = window.setTimeout(() => {
      this.reconnectTimer = null;
      if (this.token) this.connect(this.token);
    }, delay);
  }

  send(data: any) {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(data));
        return true;
      } catch {}
    }
    return false;
  }

  isRealtimeReady() {
    return Boolean(this.ws?.readyState === WebSocket.OPEN && this.authenticated);
  }

  private async waitForRealtimeReady(timeoutMs = 450): Promise<boolean> {
    if (this.isRealtimeReady()) return true;
    this.ensureRealtimeNow();
    if (this.isRealtimeReady()) return true;
    return await new Promise<boolean>((resolve) => {
      let settled = false;
      const finish = (ready: boolean) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        this.realtimeReadyWaiters.delete(finish);
        resolve(ready);
      };
      const timer = window.setTimeout(() => finish(this.isRealtimeReady()), timeoutMs);
      this.realtimeReadyWaiters.add(finish);
    });
  }

  async sendChatMessage(message: any, timeoutMs = 1000): Promise<any | null> {
    const clientMessageId = String(message?.clientMessageId || '').trim();
    if (!clientMessageId) return null;
    if (!(await this.waitForRealtimeReady(450))) return null;

    const resultPromise = new Promise<any | null>((resolve) => {
      const timer = window.setTimeout(() => {
        this.pendingMessageWaiters.delete(clientMessageId);
        resolve(null);
      }, timeoutMs);
      this.pendingMessageWaiters.set(clientMessageId, { resolve, timer });
    });

    if (!this.send({ type: 'chat:send_message', message })) {
      const waiter = this.pendingMessageWaiters.get(clientMessageId);
      if (waiter) window.clearTimeout(waiter.timer);
      this.pendingMessageWaiters.delete(clientMessageId);
      return null;
    }

    return await resultPromise;
  }

  sendTyping(isTyping: boolean) {
    this.desiredTyping = Boolean(isTyping);
    return this.send({ type: 'typing', isTyping: this.desiredTyping });
  }

  sendMarkRead(messageIds?: string[]) {
    if (!this.chatActive) return false;
    return this.send({ type: 'chat:mark_read', messageIds: messageIds?.length ? messageIds.slice(0, 200) : undefined });
  }

  isConnected() {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  /**
   * Whether the user is actively viewing the SYNAX chat. This controls READ
   * receipts only; ONLINE/delivered state is based on the authenticated socket.
   */
  setChatActive(active: boolean) {
    this.chatActive = Boolean(active);
    if (!this.authenticated) return false;
    const sent = this.send({ type: 'chat:active', active: this.chatActive });
    if (this.chatActive) this.send({ type: 'presence:heartbeat', active: true });
    return sent;
  }

  requestPresence() {
    return this.send({ type: 'presence:request' });
  }

  ensureRealtimeNow() {
    if (!this.token || document.visibilityState !== 'visible') return;
    if (!this.ws || this.ws.readyState === WebSocket.CLOSED || this.ws.readyState === WebSocket.CLOSING) {
      this.reconnectAttempts = 0;
      if (this.reconnectTimer !== null) {
        window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = null;
      }
      this.connect(this.token);
    }
  }

  /**
   * Best-effort lifecycle shutdown used when the browser is genuinely
   * unloading. Visibility changes are handled separately so a backgrounded
   * mobile/browser tab can stay connected and continue receiving messages.
   */
  closeForPageExit() {
    this.desiredTyping = false;
    this.chatActive = false;
    this.authenticated = false;
    if (this.ws?.readyState === WebSocket.OPEN) {
      try { this.ws.send(JSON.stringify({ type: 'chat:active', active: false })); } catch {}
      try { this.ws.close(1000, 'Page exiting'); } catch {}
    }
    this.stopHeartbeat();
  }

  async sendCallSignal(payload: any): Promise<boolean> {
    const token = this.token;
    if (!token) {
      this.emit('call:error', { error: 'Not authenticated for calls.' });
      return false;
    }
    if (!payload?.callId || !String(payload?.type || '').startsWith('call:')) {
      this.emit('call:error', { error: 'Invalid call signal.' });
      return false;
    }

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 10_000);

    try {
      const res = await fetch('/api/call/signal', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
        cache: 'no-store',
        keepalive: payload.type === 'call:end' || payload.type === 'call:reject',
        signal: controller.signal,
      });

      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        this.emit('call:error', { error: body.error || 'Call signaling failed.' });
        return false;
      }
      return true;
    } catch (error) {
      console.error('SYNAX call signal request failed:', error);
      this.emit('call:error', { error: 'Unable to reach the call signaling service.' });
      return false;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  async getCallOffer(callId: string): Promise<any | null> {
    const token = this.token;
    if (!token || !callId) return null;

    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);

    try {
      const url = `/api/call/signals?callId=${encodeURIComponent(callId)}&since=${encodeURIComponent(Date.now() - 120_000)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
        signal: controller.signal,
      });
      if (!res.ok) return null;
      const data = await res.json();
      const rows = Array.isArray(data.signals) ? data.signals : [];
      return rows.find((row: any) => row?.payload?.type === 'call:offer')?.payload || null;
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeout);
    }
  }

  private startCallPolling() {
    if (this.callPollTimer !== null || !this.token) return;

    if (!this.callSignalSince) this.callSignalSince = Date.now() - 120_000;

    this.visibilityHandler = () => {
      if (document.visibilityState === 'visible') void this.pollCallSignals();
    };
    document.addEventListener('visibilitychange', this.visibilityHandler);

    void this.pollCallSignals();
    this.callPollTimer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void this.pollCallSignals();
    }, 2000);
  }

  private async pollCallSignals() {
    if (this.callPollInFlight || !this.token || document.visibilityState !== 'visible') return;
    this.callPollInFlight = true;

    try {
      const url = `/api/call/signals?after=${encodeURIComponent(this.callSignalAfterId)}&since=${encodeURIComponent(this.callSignalSince)}`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${this.token}` },
        cache: 'no-store',
      });

      if (!res.ok) return;

      const data = await res.json();
      const signals = Array.isArray(data.signals) ? data.signals : [];

      for (const row of signals) {
        const rowId = Number(row?.id || 0);
        if (rowId > 0) {
          this.callSignalAfterId = Math.max(this.callSignalAfterId, rowId);
          if (this.seenCallSignalIds.has(rowId)) continue;
          this.seenCallSignalIds.add(rowId);

          if (this.seenCallSignalIds.size > 1000) {
            const first = this.seenCallSignalIds.values().next().value;
            if (typeof first === 'number') this.seenCallSignalIds.delete(first);
          }
        }

        const payload = row?.payload;
        if (!payload?.type?.startsWith('call:')) continue;

        const eventName = payload.type === 'call:offer' ? 'call:incoming' : payload.type;
        this.emit(eventName, {
          ...payload,
          _signalId: rowId || undefined,
          _signalCreatedAt: row?.created_at,
        });
      }
    } catch (error) {
      // Call transport errors must never interrupt the rest of SYNAX.
      console.warn('SYNAX call polling failed:', error);
    } finally {
      this.callPollInFlight = false;
    }
  }

  private stopCallPolling() {
    if (this.callPollTimer !== null) {
      window.clearInterval(this.callPollTimer);
      this.callPollTimer = null;
    }
    if (this.visibilityHandler) {
      document.removeEventListener('visibilitychange', this.visibilityHandler);
      this.visibilityHandler = null;
    }
    this.callPollInFlight = false;
  }

  on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);

    if (event === 'presence:update' && this.lastPresenceEvent) {
      try { callback(this.lastPresenceEvent); } catch (error) { console.error(error); }
    }

    if (event.startsWith('call:')) {
      const pending = this.pendingCallEvents.get(event);
      if (pending?.length) {
        this.pendingCallEvents.delete(event);
        for (const payload of pending) {
          try { callback(payload); } catch (error) { console.error(error); }
        }
      }
    }

    return () => this.off(event, callback);
  }

  off(event: string, callback: EventCallback) {
    const set = this.listeners.get(event);
    if (!set) return;
    set.delete(callback);
    if (set.size === 0) this.listeners.delete(event);
  }

  emit(event: string, data: any) {
    if (event === 'presence:update') this.lastPresenceEvent = data;
    const set = this.listeners.get(event);
    if (set?.size) {
      set.forEach((callback) => {
        try { callback(data); } catch (error) { console.error(`SYNAX ${event} listener error:`, error); }
      });
      return;
    }

    if (event.startsWith('call:')) {
      const pending = this.pendingCallEvents.get(event) || [];
      pending.push(data);
      if (pending.length > 20) pending.splice(0, pending.length - 20);
      this.pendingCallEvents.set(event, pending);
    }
  }

  disconnect() {
    if (this.reconnectTimer !== null) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.stopCallPolling();
    this.stopHeartbeat();
    this.pendingCallEvents.clear();
    this.seenCallSignalIds.clear();
    this.token = null;
    this.authenticated = false;
    this.lastPresenceEvent = null;
    this.reconnectAttempts = 0;
    this.callSignalAfterId = 0;
    this.callSignalSince = 0;

    for (const [key, waiter] of this.pendingMessageWaiters) {
      window.clearTimeout(waiter.timer);
      waiter.resolve(null);
      this.pendingMessageWaiters.delete(key);
    }
    for (const resolve of this.realtimeReadyWaiters) resolve(false);
    this.realtimeReadyWaiters.clear();

    if (this.presenceVisibilityHandler) {
      document.removeEventListener('visibilitychange', this.presenceVisibilityHandler);
      window.removeEventListener('pageshow', this.presenceVisibilityHandler);
      this.presenceVisibilityHandler = null;
    }
    if (this.connectivityHandler) {
      window.removeEventListener('online', this.connectivityHandler);
      window.removeEventListener('focus', this.connectivityHandler);
      this.connectivityHandler = null;
    }

    if (this.ws) {
      try { this.ws.close(); } catch {}
      this.ws = null;
    }
  }
}

export const socketService = new SocketService();
