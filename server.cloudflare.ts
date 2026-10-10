import express, { Request, Response, NextFunction } from 'express';
import http from 'http';
import bcrypt from 'bcryptjs';

// Type definitions for internal server database
interface DbSchema {
  users: {
    person_1: {
      id: 'person_1';
      slot: 1;
      name: string;
      username: string;
      passwordHash: string;
      logo: any;
      pfpUrl: string;
      nickname: string;
      bio: string;
      isLocked: boolean;
      lockReason?: string;
      allowedMinutes: number;
      dailyUsageSeconds: number;
      dailyUsageDate?: string;
      sessionStartTimestamp?: number;
      activeUsageSeconds?: number;
      activeSessionCount?: number;
      activeSessionStartedAt?: number;
      lastActiveTimestamp?: number;
    };
    person_2: {
      id: 'person_2';
      slot: 2;
      name: string;
      username: string;
      passwordHash: string;
      logo: any;
      pfpUrl: string;
      nickname: string;
      bio: string;
      isLocked: boolean;
      lockReason?: string;
      allowedMinutes: number;
      dailyUsageSeconds: number;
      dailyUsageDate?: string;
      sessionStartTimestamp?: number;
      activeUsageSeconds?: number;
      activeSessionCount?: number;
      activeSessionStartedAt?: number;
      lastActiveTimestamp?: number;
    };
  };
  admin: {
    username: string;
    passwordHash: string;
  };
  settings: {
    worldTitle: string;
    worldSubtitle: string;
    welcomeMessage: string;
    theme: 'celestial' | 'cyberpunk' | 'twilight' | 'aurora';
    chatWallpaper: string;
    accentColor: string;
    introDurationSeconds: number;
    timeOverMessage: string;
    timeStrategy: 'continuous' | 'daily';
    dailyResetAtMidnight?: boolean;
    warningMinutes: number[];
    showTimerToUsers?: boolean;
    restrictionsOnExpire: {
      disableMessaging: boolean;
      disableVoiceCalls: boolean;
      disableVideoCalls: boolean;
      disableImages: boolean;
      disableFiles: boolean;
      disableVoiceMessages: boolean;
      lockSession: boolean;
    };
    featuresEnabled: {
      messages: boolean;
      reactions: boolean;
      imageSharing: boolean;
      fileSharing: boolean;
      voiceMessages: boolean;
      voiceCalls: boolean;
      videoCalls: boolean;
      editing: boolean;
      deleting: boolean;
    };
  };
  messages: any[];
  sessions: Record<string, {
    token: string;
    userId: 'person_1' | 'person_2' | 'admin';
    sessionStart: number;
    lastActive: number;
    allowedSeconds: number;
    isExpired: boolean;
    active?: boolean;
    endedAt?: number;
  }>;
  logs: any[];
}

// Initial seed
function getInitialDb(): DbSchema {
  const salt = bcrypt.genSaltSync(10);
  return {
    users: {
      person_1: {
        id: 'person_1',
        slot: 1,
        name: 'Kaelen Thorne',
        username: 'kaelen',
        passwordHash: bcrypt.hashSync('synax123', salt),
        logo: {
          id: 'astral_crest',
          name: 'Astral Crest',
          accentColor: '#6366f1',
          glowColor: 'rgba(99, 102, 241, 0.5)',
          svgPath: 'M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z'
        },
        pfpUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop&q=80',
        nickname: 'Kael',
        bio: 'Guardian of the Northern Star',
        isLocked: false,
        allowedMinutes: 60,
        dailyUsageSeconds: 0,
        activeUsageSeconds: 0,
        activeSessionCount: 0,
      },
      person_2: {
        id: 'person_2',
        slot: 2,
        name: 'Seraphina Vance',
        username: 'seraphina',
        passwordHash: bcrypt.hashSync('synax123', salt),
        logo: {
          id: 'lunar_chrono',
          name: 'Lunar Chrono',
          accentColor: '#ec4899',
          glowColor: 'rgba(236, 72, 153, 0.5)',
          svgPath: 'M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z'
        },
        pfpUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop&q=80',
        nickname: 'Sera',
        bio: 'Keeper of the Celestial Loom',
        isLocked: false,
        allowedMinutes: 60,
        dailyUsageSeconds: 0,
      }
    },
    admin: {
      username: 'admin',
      passwordHash: bcrypt.hashSync('synax-admin-777', salt),
    },
    settings: {
      worldTitle: 'SYNAX',
      worldSubtitle: 'Where Two Worlds Meet.',
      welcomeMessage: 'Welcome to your private sanctuary. Every conversation, voice note, and shared moment here belongs solely to you both.',
      theme: 'celestial',
      chatWallpaper: 'stars',
      accentColor: '#6366f1',
      introDurationSeconds: 7,
      timeOverMessage: 'Your private-world time has ended for now. See you again soon ✨',
      timeStrategy: 'daily',
      dailyResetAtMidnight: true,
      warningMinutes: [10, 5, 1],
      showTimerToUsers: true,
      restrictionsOnExpire: {
        disableMessaging: true,
        disableVoiceCalls: true,
        disableVideoCalls: true,
        disableImages: true,
        disableFiles: true,
        disableVoiceMessages: true,
        lockSession: false
      },
      featuresEnabled: {
        messages: true,
        reactions: true,
        imageSharing: true,
        fileSharing: true,
        voiceMessages: true,
        voiceCalls: true,
        videoCalls: true,
        editing: true,
        deleting: true
      }
    },
    messages: [
      {
        id: 'msg_init_sys',
        senderId: 'system',
        type: 'system',
        text: '✦ The Synax sanctuary has been initialized. A sacred digital world for two.',
        timestamp: Date.now() - 3600000,
        status: 'read',
        reactions: {}
      },
      {
        id: 'msg_init_1',
        senderId: 'person_1',
        type: 'text',
        text: 'Hey Sera! I configured our private sanctuary. No algorithms, no noise, just our universe.',
        timestamp: Date.now() - 3000000,
        status: 'read',
        reactions: { person_2: '✨' }
      },
      {
        id: 'msg_init_2',
        senderId: 'person_2',
        type: 'text',
        text: 'Kael, this is stunning! The opening marks and atmosphere are breathtaking. Let us guard this sanctuary.',
        timestamp: Date.now() - 2500000,
        status: 'read',
        reactions: { person_1: '❤️' }
      }
    ],
    sessions: {},
    logs: [
      {
        id: 'log_init',
        timestamp: Date.now(),
        actor: 'System',
        action: 'Synax Core Initialized',
        details: 'Initial configuration and user marks loaded',
        level: 'info'
      }
    ]
  };
}

// Persistent state: Supabase Postgres in production, local JSON only for development fallback.
// IMPORTANT: SUPABASE_SERVICE_ROLE_KEY is server-only and must never be exposed to the browser.
let SUPABASE_URL = '';
let SUPABASE_SERVICE_ROLE_KEY = '';
let cloudflareEnv: any = null;
let cloudflareExecutionContext: any = null;

export function configureCloudflareRuntime(env: any, ctx: any) {
  cloudflareEnv = env;
  cloudflareExecutionContext = ctx;
  SUPABASE_URL = String(env.SUPABASE_URL || '').replace(/\/$/, '');

  // Supabase now supports opaque secret keys (sb_secret_...). They are API keys,
  // not JWTs, so they must be sent in the `apikey` header and NOT as
  // `Authorization: Bearer ...`. Legacy service-role JWTs can still use both.
  let configuredKey = String(
    env.SUPABASE_SECRET_KEY ||
    env.SUPABASE_SERVICE_ROLE_KEY ||
    ''
  );

  // Supabase hosted environments may expose secret keys as a JSON dictionary.
  if (!configuredKey && env.SUPABASE_SECRET_KEYS) {
    try {
      const parsed = typeof env.SUPABASE_SECRET_KEYS === 'string'
        ? JSON.parse(env.SUPABASE_SECRET_KEYS)
        : env.SUPABASE_SECRET_KEYS;
      configuredKey = String(parsed?.default || Object.values(parsed || {})[0] || '');
    } catch {
      // Keep the empty value so initialization returns a clear configuration error.
    }
  }

  SUPABASE_SERVICE_ROLE_KEY = configuredKey;
}
const SUPABASE_STATE_TABLE = 'synax_state';
const SUPABASE_STATE_ID = 'main';
const SUPABASE_SESSIONS_TABLE = 'synax_sessions';
const SUPABASE_CALL_SIGNALS_TABLE = 'synax_call_signals';
const SUPABASE_MESSAGES_TABLE = 'synax_messages';
const SUPABASE_USER_USAGE_TABLE = 'synax_user_usage';
const SUPABASE_CHAT_SETTINGS_TABLE = 'synax_chat_settings';
const SYNAX_CHAT_ID = 'private';
const ALLOWED_CHAT_BACKGROUND_PRESETS = new Set(['stars','nebula','aurora','twilight','midnight','crimson']);
const isProduction = true;
const useSupabase = true;

let db: DbSchema;
let persistenceQueue: Promise<void> = Promise.resolve();
let lastRemoteSync = 0;
let stateRefreshInFlight: Promise<void> | null = null;
const STATE_REFRESH_TTL_MS = 10000;
const SESSION_CACHE_TTL_MS = 8000;
const sessionCache = new Map<string, { session: DbSchema['sessions'][string]; expiresAt: number }>();

// Supabase projects created with the newer Data API defaults may have the
// application tables present in Postgres but not yet exposed to PostgREST.
// Keep the app functional in that situation and fall back to the canonical
// synax_state document until the table is available.
let sessionsTableAvailable: boolean | null = null;
let messagesTableAvailable: boolean | null = null;
let usageTableAvailable: boolean | null = null;
let usageCheckpointRpcAvailable: boolean | null = null;

function isMissingDataApiTableError(error: unknown): boolean {
  const message = String(error instanceof Error ? error.message : error || '');
  return /PGRST205|42P01|Could not find the table|schema cache|relation .* does not exist/i.test(message);
}


type ChatBackgroundRecord = {
  chat_id: string;
  background_type: 'preset' | 'image';
  background_value: string;
  background_updated_at: number;
  updated_by: 'person_1' | 'person_2' | null;
};

const DEFAULT_CHAT_BACKGROUND: ChatBackgroundRecord = {
  chat_id: SYNAX_CHAT_ID,
  background_type: 'preset',
  background_value: 'stars',
  background_updated_at: 0,
  updated_by: null,
};

function normalizeChatBackground(row: any): ChatBackgroundRecord {
  const type = row?.background_type === 'image' ? 'image' : 'preset';
  const value = String(row?.background_value || (type === 'preset' ? 'stars' : '')).trim();
  return {
    chat_id: SYNAX_CHAT_ID,
    background_type: type,
    background_value: type === 'preset' && !ALLOWED_CHAT_BACKGROUND_PRESETS.has(value) ? 'stars' : value,
    background_updated_at: Number(row?.background_updated_at || 0),
    updated_by: row?.updated_by === 'person_1' || row?.updated_by === 'person_2' ? row.updated_by : null,
  };
}

async function loadChatBackground(): Promise<ChatBackgroundRecord> {
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_CHAT_SETTINGS_TABLE}?chat_id=eq.${encodeURIComponent(SYNAX_CHAT_ID)}` +
      `&select=chat_id,background_type,background_value,background_updated_at,updated_by&limit=1`,
    );
    const rows = await res.json() as any[];
    return rows[0] ? normalizeChatBackground(rows[0]) : DEFAULT_CHAT_BACKGROUND;
  } catch (error) {
    if (isMissingDataApiTableError(error)) return DEFAULT_CHAT_BACKGROUND;
    throw error;
  }
}

async function saveChatBackground(background: ChatBackgroundRecord) {
  await supabaseFetch(`/rest/v1/${SUPABASE_CHAT_SETTINGS_TABLE}?on_conflict=chat_id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body: JSON.stringify({
      chat_id: SYNAX_CHAT_ID,
      background_type: background.background_type,
      background_value: background.background_value,
      background_updated_at: background.background_updated_at,
      updated_by: background.updated_by,
      updated_at: new Date().toISOString(),
    }),
  });
}

function cloneDb(value: DbSchema): DbSchema {
  return JSON.parse(JSON.stringify(value));
}

function getSupabaseAuthHeaders(): Record<string, string> {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Supabase environment variables are missing. Add SUPABASE_URL and SUPABASE_SECRET_KEY to the Cloudflare Worker.');
  }

  const headers: Record<string, string> = {
    // Keep privileged Storage credentials on the Worker only. Supabase's
    // opaque sb_secret_* keys are API keys, not JWTs, so never put them in a
    // Bearer header. Legacy service-role JWTs still use both headers.
    apikey: SUPABASE_SERVICE_ROLE_KEY,
  };
  if (!SUPABASE_SERVICE_ROLE_KEY.startsWith('sb_')) {
    headers.Authorization = `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`;
  }
  return headers;
}

function getSupabaseHeaders() {
  return { ...getSupabaseAuthHeaders(), 'Content-Type': 'application/json' };
}

async function supabaseFetch(pathname: string, init: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${pathname}`, {
    ...init,
    headers: { ...getSupabaseHeaders(), ...(init.headers || {}) },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`Supabase ${res.status}: ${body.slice(0, 500)}`);
  }
  return res;
}

async function persistToSupabase(snapshot: DbSchema) {
  const body = JSON.stringify({ id: SUPABASE_STATE_ID, state: snapshot, updated_at: new Date().toISOString() });
  const res = await supabaseFetch(`/rest/v1/${SUPABASE_STATE_TABLE}?on_conflict=id`, {
    method: 'POST',
    headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
    body,
  });
  await res.arrayBuffer().catch(() => undefined);
}

async function loadDbFromSupabase(): Promise<DbSchema | null> {
  const res = await supabaseFetch(`/rest/v1/${SUPABASE_STATE_TABLE}?id=eq.${encodeURIComponent(SUPABASE_STATE_ID)}&select=state&limit=1`);
  const rows = await res.json() as Array<{ state: DbSchema }>;
  return rows[0]?.state || null;
}

type SupabaseMessageRow = {
  id: string;
  client_message_id?: string | null;
  sender_id: 'person_1' | 'person_2' | 'system';
  type: 'text' | 'image' | 'video' | 'file' | 'voice' | 'system';
  text?: string | null;
  file_url?: string | null;
  file_name?: string | null;
  file_size?: number | null;
  audio_duration?: number | null;
  timestamp: number;
  status: 'sent' | 'delivered' | 'read';
  reactions?: Record<string, string> | null;
  reply_to?: { id: string; text: string; senderName: string } | null;
  is_pinned?: boolean | null;
  is_edited?: boolean | null;
  deleted?: boolean | null;
};

function rowToChatMessage(row: SupabaseMessageRow): any {
  return {
    id: row.id,
    clientMessageId: row.client_message_id || undefined,
    senderId: row.sender_id,
    type: row.type,
    text: row.text || '',
    fileUrl: row.file_url || undefined,
    fileName: row.file_name || undefined,
    fileSize: row.file_size == null ? undefined : Number(row.file_size),
    audioDuration: row.audio_duration == null ? undefined : Number(row.audio_duration),
    timestamp: Number(row.timestamp),
    status: row.status,
    reactions: row.reactions || {},
    replyTo: (() => {
      const value = row.reply_to;
      if (!value) return undefined;
      if (typeof value === 'string') {
        try { return JSON.parse(value); } catch { return undefined; }
      }
      return value;
    })(),
    isPinned: Boolean(row.is_pinned),
    isEdited: Boolean(row.is_edited),
    deleted: Boolean(row.deleted),
  };
}

function chatMessageToRow(message: any, clientMessageId?: string | null): SupabaseMessageRow {
  return {
    id: String(message.id),
    client_message_id: clientMessageId || null,
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
}

async function loadMessagesFromSupabase(): Promise<any[]> {
  const pending = await loadPendingMessagesFromRealtime();
  if (messagesTableAvailable === false) {
    return mergePendingMessages(db.messages || [], pending);
  }
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_MESSAGES_TABLE}?select=id,client_message_id,sender_id,type,text,file_url,file_name,file_size,audio_duration,timestamp,status,reactions,reply_to,is_pinned,is_edited,deleted&order=timestamp.asc&limit=5000`
    );
    const rows = await res.json() as SupabaseMessageRow[];
    messagesTableAvailable = true;
    let messages = rows.map(rowToChatMessage);
    if (messages.length === 0 && Array.isArray(db?.messages) && db.messages.length > 0) {
      // Seed lazily on the first history request instead of during startup.
      messages = await ensureMessagesTableSeed(db.messages);
    }
    return mergePendingMessages(messages, pending);
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      messagesTableAvailable = false;
      return mergePendingMessages(db.messages || [], pending);
    }
    // Pending messages are still safe to display while Supabase is temporarily
    // unavailable. Preserve them instead of making a refresh erase a message.
    if (pending.length) {
      console.warn('SYNAX message history temporarily unavailable; serving durable pending messages:', error);
      return mergePendingMessages(db.messages || [], pending);
    }
    throw error;
  }
}

async function findMessageById(id: string): Promise<any | null> {
  if (messagesTableAvailable === false) {
    return (db.messages || []).find((message: any) => String(message.id) === String(id)) || null;
  }
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_MESSAGES_TABLE}?id=eq.${encodeURIComponent(id)}&select=id,client_message_id,sender_id,type,text,file_url,file_name,file_size,audio_duration,timestamp,status,reactions,reply_to,is_pinned,is_edited,deleted&limit=1`
    );
    const rows = await res.json() as SupabaseMessageRow[];
    messagesTableAvailable = true;
    return rows[0] ? rowToChatMessage(rows[0]) : null;
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      messagesTableAvailable = false;
      return (db.messages || []).find((message: any) => String(message.id) === String(id)) || null;
    }
    throw error;
  }
}

async function findMessageByClientId(clientMessageId: string): Promise<any | null> {
  if (messagesTableAvailable === false) {
    return (db.messages || []).find((message: any) => String(message.clientMessageId || '') === String(clientMessageId)) || null;
  }
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_MESSAGES_TABLE}?client_message_id=eq.${encodeURIComponent(clientMessageId)}&select=id,client_message_id,sender_id,type,text,file_url,file_name,file_size,audio_duration,timestamp,status,reactions,reply_to,is_pinned,is_edited,deleted&limit=1`
    );
    const rows = await res.json() as SupabaseMessageRow[];
    messagesTableAvailable = true;
    return rows[0] ? rowToChatMessage(rows[0]) : null;
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      messagesTableAvailable = false;
      return (db.messages || []).find((message: any) => String(message.clientMessageId || '') === String(clientMessageId)) || null;
    }
    throw error;
  }
}

async function insertMessageToSupabase(message: any, clientMessageId?: string | null): Promise<any> {
  if (messagesTableAvailable === false) {
    const existing = clientMessageId ? await findMessageByClientId(String(clientMessageId)) : null;
    if (existing) return existing;
    const next = [...(db.messages || []), { ...message, clientMessageId: clientMessageId || message.clientMessageId }];
    db.messages = next.slice(-5000);
    await saveDbSync();
    return message;
  }

  const row = chatMessageToRow(message, clientMessageId);
  const useIdempotency = Boolean(clientMessageId);
  // client_message_id deduplicates normal user messages; idempotency on the
  // primary key also protects system/call messages and concurrent retries.
  const path = useIdempotency
    ? `/rest/v1/${SUPABASE_MESSAGES_TABLE}?on_conflict=client_message_id`
    : `/rest/v1/${SUPABASE_MESSAGES_TABLE}?on_conflict=id`;
  try {
    const res = await supabaseFetch(path, {
      method: 'POST',
      headers: {
        Prefer: 'resolution=ignore-duplicates,return=representation',
      },
      body: JSON.stringify(row),
    });
    messagesTableAvailable = true;
    const rows = await res.json().catch(() => []);
    if (Array.isArray(rows) && rows[0]) return rowToChatMessage(rows[0]);
    if (useIdempotency) {
      const existing = await findMessageByClientId(String(clientMessageId));
      if (existing) return existing;
    } else {
      const existing = await findMessageById(String(message.id));
      if (existing) return existing;
    }
    return message;
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    messagesTableAvailable = false;
    const existing = clientMessageId ? await findMessageByClientId(String(clientMessageId)) : null;
    if (existing) return existing;
    db.messages = [...(db.messages || []), { ...message, clientMessageId: clientMessageId || message.clientMessageId }].slice(-5000);
    await saveDbSync();
    return message;
  }
}

async function updateMessageInSupabase(id: string, patch: Record<string, unknown>): Promise<any | null> {
  if (messagesTableAvailable === false) {
    const index = (db.messages || []).findIndex((message: any) => String(message.id) === String(id));
    if (index < 0) return null;
    const updated = { ...db.messages[index], ...patch };
    if ('file_url' in patch) updated.fileUrl = patch.file_url;
    if ('is_pinned' in patch) updated.isPinned = patch.is_pinned;
    if ('is_edited' in patch) updated.isEdited = patch.is_edited;
    if ('deleted' in patch) updated.deleted = patch.deleted;
    db.messages[index] = updated;
    await saveDbSync();
    return updated;
  }
  try {
    const res = await supabaseFetch(`/rest/v1/${SUPABASE_MESSAGES_TABLE}?id=eq.${encodeURIComponent(id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify(patch),
    });
    messagesTableAvailable = true;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) && rows[0] ? rowToChatMessage(rows[0]) : null;
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    messagesTableAvailable = false;
    return updateMessageInSupabase(id, patch);
  }
}

async function markMessagesReadInSupabase(senderId: 'person_1' | 'person_2', messageIds?: string[]) {
  const safeIds = Array.isArray(messageIds)
    ? messageIds.filter((id) => /^[A-Za-z0-9._:-]{1,160}$/.test(String(id))).slice(0, 200)
    : [];

  if (messagesTableAvailable === false) {
    let count = 0;
    db.messages = (db.messages || []).map((message: any) => {
      const idMatches = !safeIds.length || safeIds.includes(String(message.id));
      if (message.senderId === senderId && idMatches && message.status !== 'read') {
        count += 1;
        return { ...message, status: 'read' };
      }
      return message;
    });
    if (count) await saveDbSync();
    return count;
  }
  try {
    const idFilter = safeIds.length
      ? `&id=in.(${safeIds.map((id) => encodeURIComponent(String(id))).join(',')})`
      : '';
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_MESSAGES_TABLE}?sender_id=eq.${senderId}&status=neq.read${idFilter}`,
      {
        method: 'PATCH',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({ status: 'read' }),
      }
    );
    messagesTableAvailable = true;
    const rows = await res.json().catch(() => []);
    return Array.isArray(rows) ? rows.length : 0;
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    messagesTableAvailable = false;
    return markMessagesReadInSupabase(senderId, messageIds);
  }
}

async function clearMessagesInSupabase(seedMessages: any[]) {
  if (messagesTableAvailable === false) {
    db.messages = [...seedMessages];
    await saveDbSync();
    return;
  }
  try {
    await supabaseFetch(`/rest/v1/${SUPABASE_MESSAGES_TABLE}?id=not.is.null`, {
      method: 'DELETE',
      headers: { Prefer: 'return=minimal' },
    });
    messagesTableAvailable = true;
    if (seedMessages.length) {
      await supabaseFetch(`/rest/v1/${SUPABASE_MESSAGES_TABLE}`, {
        method: 'POST',
        headers: { Prefer: 'return=minimal' },
        body: JSON.stringify(seedMessages.map((message) => chatMessageToRow(message))),
      });
    }
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    messagesTableAvailable = false;
    db.messages = [...seedMessages];
    await saveDbSync();
  }
}

async function ensureMessagesTableSeed(seedMessages: any[]) {
  if (messagesTableAvailable === false) return seedMessages;
  try {
    const probe = await supabaseFetch(
      `/rest/v1/${SUPABASE_MESSAGES_TABLE}?select=id&limit=1`
    );
    messagesTableAvailable = true;
    const existingRows = await probe.json().catch(() => []);
    if (Array.isArray(existingRows) && existingRows.length > 0) {
      return loadMessagesFromSupabase();
    }
    if (seedMessages.length > 0) {
      // Worker isolates can start concurrently. Two isolates may both see an
      // empty table and attempt to seed the same message IDs. Use PostgREST
      // id-conflict resolution so initialization is fully idempotent.
      await supabaseFetch(`/rest/v1/${SUPABASE_MESSAGES_TABLE}?on_conflict=id`, {
        method: 'POST',
        headers: { Prefer: 'resolution=ignore-duplicates,return=minimal' },
        body: JSON.stringify(seedMessages.map((message) => chatMessageToRow(message))),
      });
    }
    return await loadMessagesFromSupabase();
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      messagesTableAvailable = false;
      return seedMessages;
    }
    throw error;
  }
}

type UserUsageRow = {
  user_id: 'person_1' | 'person_2';
  continuous_used_seconds: number;
  daily_used_seconds: number;
  daily_usage_date?: string | null;
  active: boolean;
  active_started_at?: number | null;
  last_heartbeat: number;
  last_seen: number;
  updated_at?: string | null;
  usage_version: number;

};

function normalizePresenceTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return 0;
    return value < 100_000_000_000 ? Math.round(value * 1000) : Math.round(value);
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    if (/^\d+(?:\.\d+)?$/.test(trimmed)) {
      const numeric = Number(trimmed);
      if (!Number.isFinite(numeric) || numeric <= 0) return 0;
      return numeric < 100_000_000_000 ? Math.round(numeric * 1000) : Math.round(numeric);
    }
    const parsed = Date.parse(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
}

function isRecentlyHeartbeating(lastHeartbeat: unknown, now = Date.now()): boolean {
  const timestamp = normalizePresenceTimestamp(lastHeartbeat);
  return timestamp > 0 && now - timestamp <= 15_000;
}

function makeDefaultUsageRow(userId: 'person_1' | 'person_2'): UserUsageRow {
  return {
    user_id: userId,
    continuous_used_seconds: 0,
    daily_used_seconds: 0,
    daily_usage_date: getIndiaDateKey(),
    active: false,
    active_started_at: null,
    last_heartbeat: 0,
    last_seen: 0,
    updated_at: null,
    usage_version: 0,
  };
}

function usageFromLegacyUser(userId: 'person_1' | 'person_2'): UserUsageRow {
  const user = db.users[userId] as any;
  return {
    user_id: userId,
    continuous_used_seconds: Number(user.activeUsageSeconds || user.dailyUsageSeconds || 0),
    daily_used_seconds: Number(user.dailyUsageSeconds || 0),
    daily_usage_date: user.dailyUsageDate || getIndiaDateKey(),
    active: false,
    active_started_at: null,
    last_heartbeat: normalizePresenceTimestamp(user.lastActiveTimestamp),
    last_seen: normalizePresenceTimestamp(user.lastActiveTimestamp),
    updated_at: null,
    usage_version: 0,
  };
}

function mirrorUsageToLegacyUser(row: UserUsageRow) {
  const user = db.users[row.user_id] as any;
  user.activeUsageSeconds = Number(row.continuous_used_seconds || 0);
  user.dailyUsageSeconds = Number(row.daily_used_seconds || 0);
  user.dailyUsageDate = row.daily_usage_date || getIndiaDateKey();
  user.lastActiveTimestamp = Number(row.last_seen || 0) || undefined;
  user.activeSessionStartedAt = row.active_started_at || undefined;
}

async function loadUsageRow(userId: 'person_1' | 'person_2'): Promise<UserUsageRow> {
  if (usageTableAvailable === false) return usageFromLegacyUser(userId);
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_USER_USAGE_TABLE}?user_id=eq.${userId}&select=user_id,continuous_used_seconds,daily_used_seconds,daily_usage_date,active,active_started_at,last_heartbeat,last_seen,updated_at,usage_version&limit=1`
    );
    const rows = await res.json() as any[];
    usageTableAvailable = true;
    const row = rows[0];
    if (!row) {
      const created = makeDefaultUsageRow(userId);
      await saveUsageRow(created);
      return created;
    }
    return {
      user_id: userId,
      continuous_used_seconds: Number(row.continuous_used_seconds || 0),
      daily_used_seconds: Number(row.daily_used_seconds || 0),
      daily_usage_date: row.daily_usage_date || null,
      active: Boolean(row.active),
      active_started_at: row.active_started_at == null ? null : Number(row.active_started_at),
      last_heartbeat: normalizePresenceTimestamp(row.last_heartbeat),
      last_seen: normalizePresenceTimestamp(row.last_seen),
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
      usage_version: Number(row.usage_version || 0),
    };
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      usageTableAvailable = false;
      return usageFromLegacyUser(userId);
    }
    throw error;
  }
}

async function loadAllUsageRows(): Promise<Record<'person_1' | 'person_2', UserUsageRow>> {
  if (usageTableAvailable === false) {
    return {
      person_1: usageFromLegacyUser('person_1'),
      person_2: usageFromLegacyUser('person_2'),
    };
  }
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_USER_USAGE_TABLE}?select=user_id,continuous_used_seconds,daily_used_seconds,daily_usage_date,active,active_started_at,last_heartbeat,last_seen,updated_at,usage_version`
    );
    const rows = await res.json() as any[];
    usageTableAvailable = true;
    const result = {
      person_1: makeDefaultUsageRow('person_1'),
      person_2: makeDefaultUsageRow('person_2'),
    };
    for (const row of rows) {
      if (row.user_id === 'person_1' || row.user_id === 'person_2') {
        result[row.user_id] = {
          user_id: row.user_id,
          continuous_used_seconds: Number(row.continuous_used_seconds || 0),
          daily_used_seconds: Number(row.daily_used_seconds || 0),
          daily_usage_date: row.daily_usage_date || null,
          active: Boolean(row.active),
          active_started_at: row.active_started_at == null ? null : Number(row.active_started_at),
          last_heartbeat: normalizePresenceTimestamp(row.last_heartbeat),
          last_seen: normalizePresenceTimestamp(row.last_seen),
          updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
          usage_version: Number(row.usage_version || 0),
        };
      }
    }
    for (const userId of ['person_1', 'person_2'] as const) {
      if (!rows.some((row) => row.user_id === userId)) await saveUsageRow(result[userId]);
    }
    return result;
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      usageTableAvailable = false;
      return {
        person_1: usageFromLegacyUser('person_1'),
        person_2: usageFromLegacyUser('person_2'),
      };
    }
    throw error;
  }
}

async function checkpointUsageAtomically(
  userId: 'person_1' | 'person_2',
  active: boolean,
  now = Date.now(),
): Promise<UserUsageRow | null> {
  if (usageCheckpointRpcAvailable === false) return null;

  try {
    const res = await supabaseFetch('/rest/v1/rpc/synax_checkpoint_usage', {
      method: 'POST',
      body: JSON.stringify({
        p_user_id: userId,
        p_now_ms: now,
        p_active: active,
        p_today: getIndiaDateKey(now),
        p_grace_ms: 15000,
      }),
    });
    const payload = await res.json();
    const row = Array.isArray(payload) ? payload[0] : payload;
    if (!row) throw new Error('SYNAX timer RPC returned no usage row.');
    usageCheckpointRpcAvailable = true;
    return {
      user_id: userId,
      continuous_used_seconds: Number(row.continuous_used_seconds || 0),
      daily_used_seconds: Number(row.daily_used_seconds || 0),
      daily_usage_date: row.daily_usage_date || null,
      active: Boolean(row.active),
      active_started_at: row.active_started_at == null ? null : Number(row.active_started_at),
      last_heartbeat: normalizePresenceTimestamp(row.last_heartbeat),
      last_seen: normalizePresenceTimestamp(row.last_seen),
      updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
      usage_version: Number(row.usage_version || 0),
    };
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error || '');
    if (/PGRST202|PGRST204|42883|function .*synax_checkpoint_usage.*does not exist|schema cache/i.test(message)) {
      usageCheckpointRpcAvailable = false;
      return null;
    }
    throw error;
  }
}

async function saveUsageRow(row: UserUsageRow) {
  mirrorUsageToLegacyUser(row);
  if (usageTableAvailable === false) {
    await saveDbSync();
    return;
  }
  try {
    await supabaseFetch(`/rest/v1/${SUPABASE_USER_USAGE_TABLE}?on_conflict=user_id`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({ ...row, updated_at: new Date().toISOString(), usage_version: Number(row.usage_version || 0) }),
    });
    usageTableAvailable = true;
  } catch (error) {
    if (isMissingDataApiTableError(error)) {
      usageTableAvailable = false;
      await saveDbSync();
      return;
    }
    throw error;
  }
}

// SYNAX uses India time for daily resets and display timestamps.
function getIndiaDateKey(timestamp = Date.now()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(timestamp));
}

function getIndiaDayStart(timestamp = Date.now()): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(new Date(timestamp));
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  return Date.UTC(Number(values.year), Number(values.month) - 1, Number(values.day)) - (5.5 * 60 * 60 * 1000);
}

function activeElapsedSeconds(row: UserUsageRow, now: number): number {
  if (!row.active || !row.active_started_at) return 0;
  const lastHeartbeat = row.last_heartbeat || row.active_started_at;
  const effectiveEnd = Math.min(now, lastHeartbeat + 8000);
  return Math.max(0, Math.floor((effectiveEnd - row.active_started_at) / 1000));
}

/**
 * Daily-reset mode is the authoritative policy when the admin switch is on.
 * Keep timeStrategy for backward compatibility with older saved settings.
 */
function isDailyResetEnabled(): boolean {
  return db.settings.dailyResetAtMidnight === true || db.settings.timeStrategy === 'daily';
}

function normalizeTimeSettings() {
  // SYNAX uses one fixed policy: each configured allowance is a daily allowance
  // and is restored only by the scheduled 12:00 AM Asia/Kolkata reset.
  // Normal requests, refreshes, reconnects and heartbeats never reset usage.
  db.settings.dailyResetAtMidnight = true;
  db.settings.timeStrategy = 'daily';
}

function computeTimeStatusFromUsage(userId: 'person_1' | 'person_2', usage: UserUsageRow, now = Date.now()) {
  const user = db.users[userId] as any;
  const allowedMinutes = Number(user.allowedMinutes ?? 60);
  const hasLimit = allowedMinutes > 0;
  const allowedSeconds = hasLimit ? allowedMinutes * 60 : 86400;
  const strategy = isDailyResetEnabled() ? 'daily' : (db.settings.timeStrategy || 'continuous');
  let usedSeconds = 0;
  if (strategy === 'continuous') {
    usedSeconds = Number(usage.continuous_used_seconds || 0) + activeElapsedSeconds(usage, now);
  } else {
    // The request path never resets based on the calendar date. The scheduled
    // midnight job is the sole automatic reset authority.
    usedSeconds = Number(usage.daily_used_seconds || 0);
    if (usage.active && usage.active_started_at) {
      const lastHeartbeat = usage.last_heartbeat || usage.active_started_at;
      const effectiveEnd = Math.min(now, lastHeartbeat + 15000);
      usedSeconds += Math.max(0, Math.floor((effectiveEnd - Number(usage.active_started_at)) / 1000));
    }
  }
  const remainingSeconds = Math.max(0, allowedSeconds - usedSeconds);
  return {
    hasLimit,
    mode: strategy,
    allowedSeconds,
    remainingSeconds,
    isExpired: hasLimit && remainingSeconds <= 0,
    customMessage: db.settings.timeOverMessage,
    serverTimestamp: now,
    dailyUsageDate: usage.daily_usage_date || null,
    usageUpdatedAt: usage.updated_at || null,
    usageVersion: Number(usage.usage_version || 0),
    warnings: (db.settings.warningMinutes || [10, 5, 1]).map((m) => Number(m) * 60),
  };
}

async function getPersistentTimeRemaining(userId: 'person_1' | 'person_2') {
  const usage = await loadUsageRow(userId);
  return computeTimeStatusFromUsage(userId, usage);
}

async function setPersistentChatPresence(userId: 'person_1' | 'person_2', active: boolean) {
  const now = Date.now();

  // Atomically checkpoint the usage row in Supabase. This prevents one
  // Cloudflare isolate/reconnect from overwriting a newer timer state.
  const atomic = await checkpointUsageAtomically(userId, active, now);
  if (atomic) return computeTimeStatusFromUsage(userId, atomic, now);

  // The V39 timer is authoritative in Supabase. Never fall back to the old
  // in-memory usage model because a stale Worker isolate can resurrect time.
  if (usageCheckpointRpcAvailable === false) {
    throw new Error('SYNAX authoritative timer SQL is not installed. Run SUPABASE-V39-TIMER-CALLS-VIDEO.sql.');
  }
  const usage = await loadUsageRow(userId);
  const wasActive = Boolean(usage.active);

  if (active) {
    if (!usage.active || !usage.active_started_at) usage.active_started_at = now;
    usage.active = true;
    usage.last_heartbeat = now;
  } else {
    const elapsed = activeElapsedSeconds(usage, now);
    if (wasActive && elapsed > 0 && usage.active_started_at) {
      usage.daily_used_seconds = Number(usage.daily_used_seconds || 0) + elapsed;
    }
    usage.active = false;
    usage.active_started_at = null;
    usage.last_heartbeat = now;
    if (wasActive) usage.last_seen = now;
  }

  await saveUsageRow(usage);
  return computeTimeStatusFromUsage(userId, usage, now);
}

async function getPersistentPresenceState(userId: 'person_1' | 'person_2') {
  const usage = await loadUsageRow(userId);
  const now = Date.now();
  const lastHeartbeat = normalizePresenceTimestamp(usage.last_heartbeat);
  const lastSeen = normalizePresenceTimestamp(usage.last_seen);
  const isOnline = Boolean(usage.active && isRecentlyHeartbeating(lastHeartbeat, now));
  return { active: isOnline, lastHeartbeat, lastSeen };
}

async function getPersistentPresenceSummary() {
  const rows = await loadAllUsageRows();
  const now = Date.now();
  const result: { person_1: boolean; person_2: boolean; lastSeen_1: number; lastSeen_2: number } = {
    person_1: false, person_2: false, lastSeen_1: 0, lastSeen_2: 0,
  };
  for (const userId of ['person_1', 'person_2'] as const) {
    const row = rows[userId];
    const online = Boolean(row.active && row.last_heartbeat && now - row.last_heartbeat <= 12000);
    result[userId] = online;
    result[userId === 'person_1' ? 'lastSeen_1' : 'lastSeen_2'] = Number(row.last_seen || 0);
  }
  return result;
}

async function resetPersistentUsage(userId: 'person_1' | 'person_2', now = Date.now()) {
  const usage = await loadUsageRow(userId);
  usage.continuous_used_seconds = 0;
  usage.daily_used_seconds = 0;
  usage.daily_usage_date = getIndiaDateKey(now);
  usage.last_seen = usage.last_seen || now;
  usage.last_heartbeat = usage.active ? now : usage.last_heartbeat;
  usage.active_started_at = usage.active ? now : null;
  await saveUsageRow(usage);
  return computeTimeStatusFromUsage(userId, usage, now);
}

/**
 * Reset both users' daily allowance at the India-local midnight boundary.
 * This is intentionally persisted in synax_user_usage so it works across
 * Cloudflare Worker isolates and survives refresh/reconnects.
 */
export async function runDailyUsageReset(scheduledTime = Date.now()): Promise<{ reset: boolean; date: string }> {
  if (!db) {
    await initializeDatabase();
  } else {
    await refreshDbFromSupabase(true);
  }

  normalizeTimeSettings();
  const resetDate = getIndiaDateKey(scheduledTime);

  try {
    const res = await supabaseFetch('/rest/v1/rpc/synax_reset_daily_usage', {
      method: 'POST',
      body: JSON.stringify({
        p_reset_date: resetDate,
        p_reset_at_ms: scheduledTime,
      }),
    });
    const payload = await res.json();
    const rows = Array.isArray(payload) ? payload : [];

    for (const row of rows) {
      if (row?.user_id !== 'person_1' && row?.user_id !== 'person_2') continue;
      const userId = row.user_id as 'person_1' | 'person_2';
      const usage: UserUsageRow = {
        user_id: userId,
        continuous_used_seconds: Number(row.continuous_used_seconds || 0),
        daily_used_seconds: Number(row.daily_used_seconds || 0),
        daily_usage_date: row.daily_usage_date || resetDate,
        active: Boolean(row.active),
        active_started_at: row.active_started_at == null ? null : Number(row.active_started_at),
        last_heartbeat: normalizePresenceTimestamp(row.last_heartbeat),
        last_seen: normalizePresenceTimestamp(row.last_seen),
        updated_at: typeof row.updated_at === 'string' ? row.updated_at : null,
        usage_version: Number(row.usage_version || 0),
      };
      const timeStatus = computeTimeStatusFromUsage(userId, usage, Date.now());
      broadcast({ type: 'time:tick', userId, timeStatus });
    }

    usageCheckpointRpcAvailable = true;
    console.log(`✦ SYNAX daily usage reset completed for ${resetDate}`);
    return { reset: true, date: resetDate };
  } catch (error) {
    const message = String(error instanceof Error ? error.message : error || '');
    if (!/PGRST202|PGRST204|42883|function .*synax_reset_daily_usage.*does not exist|schema cache/i.test(message)) {
      throw error;
    }

    throw new Error('SYNAX daily reset SQL is not installed. Run SUPABASE-V39-TIMER-CALLS-VIDEO.sql.');
    /* const rows = await loadAllUsageRows();
    for (const userId of ['person_1', 'person_2'] as const) {
      const usage = rows[userId];
      if (usage.daily_usage_date === resetDate) continue;

      const heartbeat = normalizePresenceTimestamp(usage.last_heartbeat);
      const activeAtReset = Boolean(
        usage.active &&
        heartbeat > 0 &&
        heartbeat <= Date.now() + 15_000 &&
        heartbeat >= scheduledTime - 15_000
      );

      usage.daily_usage_date = resetDate;
      usage.daily_used_seconds = 0;
      if (activeAtReset) {
        usage.active = true;
        usage.active_started_at = scheduledTime;
      } else if (usage.active) {
        usage.active = false;
        usage.active_started_at = null;
        usage.last_seen = heartbeat || usage.last_seen || scheduledTime;
      }

      await saveUsageRow(usage);
      const timeStatus = computeTimeStatusFromUsage(userId, usage, Date.now());
      broadcast({ type: 'time:tick', userId, timeStatus });
    }

    console.log(`✦ SYNAX daily usage reset completed for ${resetDate} (fallback)`);
    return { reset: true, date: resetDate }; */
  }
}

async function getSessionFromSupabase(token: string): Promise<DbSchema['sessions'][string] | null> {
  if (!useSupabase || sessionsTableAvailable === false) {
    await refreshDbFromSupabase(true);
    return db.sessions[token] || null;
  }
  const now = Date.now();
  const cached = sessionCache.get(token);
  if (cached && cached.expiresAt > now) return cached.session;

  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_SESSIONS_TABLE}?token=eq.${encodeURIComponent(token)}&select=token,user_id,session_start,last_active,allowed_seconds,is_expired,active,ended_at&limit=1`
    );
    const rows = await res.json() as any[];
    sessionsTableAvailable = true;
    const row = rows[0];
    if (!row) {
      sessionCache.delete(token);
      return null;
    }
    const session = {
      token: row.token,
      userId: row.user_id,
      sessionStart: Number(row.session_start),
      lastActive: Number(row.last_active),
      allowedSeconds: Number(row.allowed_seconds),
      isExpired: Boolean(row.is_expired),
      active: Boolean(row.active),
      ...(row.ended_at == null ? {} : { endedAt: Number(row.ended_at) }),
    } as DbSchema['sessions'][string];
    sessionCache.set(token, { session, expiresAt: now + SESSION_CACHE_TTL_MS });
    return session;
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    sessionsTableAvailable = false;
    await refreshDbFromSupabase(true);
    return db.sessions[token] || null;
  }
}

async function saveSessionToSupabase(session: DbSchema['sessions'][string]) {
  sessionCache.set(session.token, { session, expiresAt: Date.now() + SESSION_CACHE_TTL_MS });
  db.sessions[session.token] = session;
  if (!useSupabase || sessionsTableAvailable === false) {
    await saveDbSync();
    return;
  }
  try {
    await supabaseFetch(`/rest/v1/${SUPABASE_SESSIONS_TABLE}?on_conflict=token`, {
      method: 'POST',
      headers: { Prefer: 'resolution=merge-duplicates,return=minimal' },
      body: JSON.stringify({
        token: session.token,
        user_id: session.userId,
        session_start: session.sessionStart,
        last_active: session.lastActive,
        allowed_seconds: session.allowedSeconds,
        is_expired: session.isExpired,
        active: Boolean(session.active),
        ended_at: session.endedAt ?? null,
      }),
    });
    sessionsTableAvailable = true;
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    sessionsTableAvailable = false;
    await saveDbSync();
  }
}

async function deleteSessionFromSupabase(token: string) {
  sessionCache.delete(token);
  delete db.sessions[token];
  if (!useSupabase || sessionsTableAvailable === false) {
    await saveDbSync();
    return;
  }
  try {
    await supabaseFetch(`/rest/v1/${SUPABASE_SESSIONS_TABLE}?token=eq.${encodeURIComponent(token)}`, { method: 'DELETE' });
    sessionsTableAvailable = true;
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    sessionsTableAvailable = false;
    await saveDbSync();
  }
}

async function listSessionsFromSupabase() {
  if (!useSupabase || sessionsTableAvailable === false) {
    await refreshDbFromSupabase(true);
    return Object.values(db.sessions);
  }
  try {
    const res = await supabaseFetch(
      `/rest/v1/${SUPABASE_SESSIONS_TABLE}?select=token,user_id,session_start,last_active,allowed_seconds,is_expired,active,ended_at&order=session_start.desc`
    );
    sessionsTableAvailable = true;
    const rows = await res.json() as any[];
    return rows.map((row) => ({
      token: row.token,
      userId: row.user_id,
      sessionStart: Number(row.session_start),
      lastActive: Number(row.last_active),
      allowedSeconds: Number(row.allowed_seconds),
      isExpired: Boolean(row.is_expired),
      active: Boolean(row.active),
      ...(row.ended_at == null ? {} : { endedAt: Number(row.ended_at) }),
    }));
  } catch (error) {
    if (!isMissingDataApiTableError(error)) throw error;
    sessionsTableAvailable = false;
    await refreshDbFromSupabase(true);
    return Object.values(db.sessions);
  }
}

async function ensureSupabaseSchemaRow(seed: DbSchema) {
  const current = await loadDbFromSupabase();
  if (current) return current;
  await persistToSupabase(seed);
  return seed;
}

async function ensureStorageBucket() {
  if (!useSupabase) return;
  try {
    await supabaseFetch('/storage/v1/bucket', {
      method: 'POST',
      body: JSON.stringify({ id: 'synax-uploads', name: 'synax-uploads', public: true }),
    });
  } catch (err: any) {
    // The schema SQL creates this bucket. If it already exists, or if the
    // storage endpoint is temporarily unavailable, do not prevent the core
    // SYNAX API from starting; uploads will report their own actionable error.
    const message = String(err?.message || '');
    const duplicate =
      message.includes('BucketAlreadyExists') ||
      message.includes('Bucket already exists') ||
      message.includes('statusCode\":\"409') ||
      message.includes('statusCode=409') ||
      message.includes('Supabase 409');

    if (!duplicate) {
      console.warn('SYNAX storage bucket check failed; continuing startup:', message);
    }
  }
}

async function initializeDatabase() {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SYNAX Cloudflare requires SUPABASE_URL and SUPABASE_SECRET_KEY.');
  }

  const seed = getInitialDb();
  db = (await ensureSupabaseSchemaRow(cloneDb(seed))) || seed;
  normalizeTimeSettings();

  // Do not load or seed the entire chat history during Worker startup.
  // Chat history is fetched asynchronously by the chat screen, which keeps
  // first paint/login fast and avoids a heavy Supabase round-trip on every isolate.
  db.messages = Array.isArray(db.messages) ? db.messages : seed.messages;

  for (const id of ['person_1', 'person_2'] as const) {
    const user = db.users[id] as any;
    user.activeUsageSeconds ??= 0;
    user.activeSessionCount = 0;
    user.activeSessionStartedAt = undefined;
    user.sessionStartTimestamp = undefined;
  }

  // Storage is already created by the SQL schema in normal deployments.
  // Do not block application startup on a non-critical bucket check.
  void ensureStorageBucket();

  // Sessions are already persisted when they are created or updated. Rewriting
  // every session sequentially on every new Cloudflare isolate adds cold-start
  // latency and unnecessary Supabase traffic, so startup only resets the
  // in-memory active flag.
  for (const session of Object.values(db.sessions) as any[]) session.active = false;
  lastRemoteSync = Date.now();
  console.log('✦ SYNAX Cloudflare persistence: Supabase');
}

async function refreshDbFromSupabase(force = false) {
  if (!useSupabase || !db) return;
  const now = Date.now();
  if (!force && now - lastRemoteSync < STATE_REFRESH_TTL_MS) return;
  if (stateRefreshInFlight) return stateRefreshInFlight;

  stateRefreshInFlight = (async () => {
    try {
      const remote = await loadDbFromSupabase();
      if (remote) {
        db = remote;
        const beforeDailyReset = (db.settings as any)?.dailyResetAtMidnight;
        const beforeStrategy = db.settings.timeStrategy;
        normalizeTimeSettings();
        if (beforeDailyReset !== (db.settings as any)?.dailyResetAtMidnight || beforeStrategy !== db.settings.timeStrategy) {
          void saveDbSync();
        }
        lastRemoteSync = Date.now();
      }
    } catch (err) {
      // Keep the last known good state for transient Supabase failures.
      console.error('Failed to refresh SYNAX state:', err);
    } finally {
      stateRefreshInFlight = null;
    }
  })();
  return stateRefreshInFlight;
}

function saveDbSync(): Promise<void> {
  const snapshot = cloneDb(db);
  persistenceQueue = persistenceQueue
    .catch(() => undefined)
    .then(() => persistToSupabase(snapshot))
    .catch((err) => console.error('Failed to persist SYNAX state:', err));

  // Cloudflare may finish the HTTP response before a detached promise finishes.
  cloudflareExecutionContext?.waitUntil?.(persistenceQueue);
  return persistenceQueue;
}

async function flushPersistence() {
  await persistenceQueue;
}

function addLog(actor: string, action: string, details?: string, level: 'info' | 'warn' | 'alert' = 'info') {
  const log = {
    id: `log_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    timestamp: Date.now(),
    actor,
    action,
    details,
    level,
  };
  db.logs.unshift(log);
  if (db.logs.length > 300) db.logs = db.logs.slice(0, 300);
  void saveDbSync();
}

// Call signaling is persisted in Supabase so separate Cloudflare Worker
// invocations can exchange offers/answers/ICE candidates safely.
type CallSignalRow = {
  id: number;
  from_user_id: 'person_1' | 'person_2';
  target_user_id: 'person_1' | 'person_2';
  type: string;
  call_type?: 'voice' | 'video';
  payload: any;
  created_at: string;
};

const localCallSignals: CallSignalRow[] = [];
let localCallSignalId = 1;
const CALL_SIGNAL_MAX_AGE_MS = 10 * 60 * 1000;

function getOppositeUserId(userId: 'person_1' | 'person_2'): 'person_1' | 'person_2' {
  return userId === 'person_1' ? 'person_2' : 'person_1';
}

async function validateCallSignal(userId: 'person_1' | 'person_2', data: any, authoritativeTimeStatus?: any): Promise<string | null> {
  if (!data || typeof data.type !== 'string' || !data.type.startsWith('call:')) {
    return 'Invalid call signal.';
  }

  if (typeof data.callId !== 'string' || data.callId.length < 8 || data.callId.length > 128) {
    return 'Invalid call id.';
  }

  const callType = data.callType === 'video' ? 'video' : 'voice';
  const timeStatus = authoritativeTimeStatus || await getPersistentTimeRemaining(userId);
  if (timeStatus.isExpired) {
    if (callType === 'voice' && db.settings.restrictionsOnExpire.disableVoiceCalls) {
      return db.settings.timeOverMessage || 'Communication time has expired.';
    }
    if (callType === 'video' && db.settings.restrictionsOnExpire.disableVideoCalls) {
      return db.settings.timeOverMessage || 'Communication time has expired.';
    }
  }

  if (callType === 'voice' && !db.settings.featuresEnabled.voiceCalls) {
    return 'Voice calls are disabled by Admin.';
  }
  if (callType === 'video' && !db.settings.featuresEnabled.videoCalls) {
    return 'Video calls are disabled by Admin.';
  }
  return null;
}

async function storeCallSignal(signal: Omit<CallSignalRow, 'id' | 'created_at'>): Promise<number> {
  const createdAt = new Date().toISOString();

  if (useSupabase) {
    const res = await supabaseFetch(`/rest/v1/${SUPABASE_CALL_SIGNALS_TABLE}`, {
      method: 'POST',
      headers: { Prefer: 'return=representation' },
      body: JSON.stringify({ ...signal, created_at: createdAt }),
    });
    const rows = await res.json() as Array<{ id: number }>;
    return Number(rows[0]?.id || 0);
  }

  const row: CallSignalRow = { ...signal, id: localCallSignalId++, created_at: createdAt };
  localCallSignals.push(row);
  const cutoff = Date.now() - CALL_SIGNAL_MAX_AGE_MS;
  while (localCallSignals.length && Date.parse(localCallSignals[0].created_at) < cutoff) {
    localCallSignals.shift();
  }
  return row.id;
}

async function readCallSignals(
  targetUserId: 'person_1' | 'person_2',
  afterId: number,
  sinceIso: string,
  callId?: string
): Promise<CallSignalRow[]> {
  if (useSupabase) {
    const params = new URLSearchParams({
      target_user_id: `eq.${targetUserId}`,
      id: `gt.${Math.max(0, afterId)}`,
      created_at: `gte.${sinceIso}`,
      order: 'id.asc',
      limit: '100',
      select: 'id,from_user_id,target_user_id,type,call_type,payload,created_at',
    });
    if (callId) params.set('payload->>callId', `eq.${callId}`);
    const res = await supabaseFetch(`/rest/v1/${SUPABASE_CALL_SIGNALS_TABLE}?${params.toString()}`);
    return await res.json() as CallSignalRow[];
  }

  const since = Date.parse(sinceIso) || 0;
  const cutoff = Date.now() - CALL_SIGNAL_MAX_AGE_MS;
  for (let i = localCallSignals.length - 1; i >= 0; i--) {
    if (Date.parse(localCallSignals[i].created_at) < cutoff) localCallSignals.splice(0, i + 1);
    else break;
  }
  return localCallSignals.filter(
    (row) => row.target_user_id === targetUserId && row.id > afterId && Date.parse(row.created_at) >= since && (!callId || row.payload?.callId === callId)
  ).slice(0, 100);
}

// Cloudflare realtime transport is handled by worker/realtime.ts (Durable Object).
function broadcast(payload: any, _filterFn?: any) {
  const binding = cloudflareEnv?.SYNAX_REALTIME_HUB;
  if (!binding) return;
  try {
    const id = binding.idFromName('main');
    const stub = binding.get(id);
    const request = new Request('https://synax.internal/broadcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const promise = stub.fetch(request);
    cloudflareExecutionContext?.waitUntil?.(promise);
  } catch (err) {
    console.error('Realtime broadcast failed:', err);
  }
}

// Chat sends need an acknowledgement so the sender can immediately show
// DOUBLE TICKS when the recipient has a live authenticated WebSocket. Other
// realtime events stay fire-and-forget so they never block the API.
async function broadcastChatMessage(payload: any): Promise<{ recipientOnline: boolean; delivered: boolean; message?: any }> {
  const binding = cloudflareEnv?.SYNAX_REALTIME_HUB;
  if (!binding) {
    throw new Error('Cloudflare realtime Durable Object binding is unavailable.');
  }

  const id = binding.idFromName('main');
  const stub = binding.get(id);
  const request = new Request('https://synax.internal/broadcast', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const response = await stub.fetch(request);
  const data = await response.json().catch(() => ({})) as any;
  if (!response.ok) {
    throw new Error(String(data?.detail || data?.error || `Realtime hub returned HTTP ${response.status}`));
  }

  return {
    recipientOnline: Boolean(data?.recipientOnline),
    delivered: Boolean(data?.delivered),
    message: data?.message,
  };
}

async function recordCallChatEvent(params: {
  callId: string;
  eventType: 'call:offer' | 'call:answer' | 'call:reject' | 'call:end';
  callType: 'voice' | 'video';
  actorId: 'person_1' | 'person_2';
}): Promise<any | null> {
  const actor = db.users[params.actorId] as any;
  const label = params.callType === 'video' ? 'video call' : 'voice call';
  const textByEvent: Record<string, string> = {
    'call:offer': `📞 ${actor.name} started a ${label}.`,
    'call:answer': `✅ ${actor.name} joined the ${label}.`,
    'call:reject': `❌ ${actor.name} declined the ${label}.`,
    'call:end': `📞 ${actor.name} ended the ${label}.`,
  };
  const clientMessageId = `call_history_${params.callId}_${params.eventType.replace(':', '_')}`;
  const historyMessage = {
    id: `msg_call_${params.callId}_${params.eventType.replace(':', '_')}`,
    clientMessageId,
    senderId: 'system',
    type: 'system',
    text: textByEvent[params.eventType],
    timestamp: Date.now(),
    status: 'read',
    reactions: {},
  };
  const persisted = await insertMessageToSupabase(historyMessage, clientMessageId);
  db.messages = [...(db.messages || []).filter((m: any) => String(m.clientMessageId || '') !== clientMessageId), persisted]
    .sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp));
  broadcast({ type: 'chat:new_message', message: persisted });
  return persisted;
}

async function loadPendingMessagesFromRealtime(): Promise<any[]> {
  const binding = cloudflareEnv?.SYNAX_REALTIME_HUB;
  if (!binding) return [];
  try {
    const id = binding.idFromName('main');
    const stub = binding.get(id);
    const response = await stub.fetch(new Request('https://synax.internal/pending-messages', {
      method: 'GET',
    }));
    if (!response.ok) return [];
    const data = await response.json().catch(() => ({})) as any;
    return Array.isArray(data?.messages) ? data.messages : [];
  } catch (error) {
    console.warn('SYNAX pending realtime messages unavailable:', error);
    return [];
  }
}

function mergePendingMessages(current: any[], pending: any[]): any[] {
  if (!pending.length) return current;
  const statusRank: Record<string, number> = { sent: 0, delivered: 1, read: 2 };
  const byKey = new Map<string, any>();
  const keyFor = (message: any) => String(message?.clientMessageId || message?.id || '');

  for (const message of current) byKey.set(keyFor(message), message);
  for (const message of pending) {
    const key = keyFor(message);
    if (!key) continue;
    const previous = byKey.get(key);
    if (!previous) {
      byKey.set(key, message);
      continue;
    }
    const previousRank = statusRank[String(previous.status)] ?? 0;
    const incomingRank = statusRank[String(message.status)] ?? 0;
    byKey.set(key, {
      ...previous,
      ...message,
      status: incomingRank >= previousRank ? message.status : previous.status,
      clientMessageId: previous.clientMessageId || message.clientMessageId,
    });
  }

  return Array.from(byKey.values()).sort((a, b) => Number(a.timestamp || 0) - Number(b.timestamp || 0));
}

// Middleware: Authenticate User
async function requireUserAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Unauthorized: Missing token' });
    return;
  }
  const token = authHeader.split(' ')[1];
  let session: DbSchema['sessions'][string] | null = null;
  try {
    session = await getSessionFromSupabase(token);
  } catch (err) {
    console.error('Failed to validate user session:', err);
    res.status(503).json({ error: 'Authentication service temporarily unavailable' });
    return;
  }
  if (!session || (session.userId !== 'person_1' && session.userId !== 'person_2')) {
    res.status(401).json({ error: 'Invalid or expired session' });
    return;
  }
  await refreshDbFromSupabase();
  const userId = session.userId as 'person_1' | 'person_2';
  const user = db.users[userId];
  if (user.isLocked) {
    res.status(403).json({ error: 'USER_LOCKED', message: user.lockReason || 'This identity has been locked by the Administrator.' });
    return;
  }
  const timeStatus = await getPersistentTimeRemaining(userId);
  if (timeStatus.isExpired && db.settings.restrictionsOnExpire.lockSession) {
    res.status(403).json({ error: 'TIME_EXPIRED', message: db.settings.timeOverMessage, timeStatus });
    return;
  }
  // API requests by themselves do not make a user online.
  const now = Date.now();
  session.lastActive = now;
  (req as any).user = user;
  (req as any).session = session;
  (req as any).userId = userId;
  (req as any).timeStatus = timeStatus;
  next();
}

// Middleware: Authenticate Admin
async function requireAdminAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Admin unauthorized' });
    return;
  }
  const token = authHeader.split(' ')[1];
  let session: DbSchema['sessions'][string] | null = null;
  try {
    session = await getSessionFromSupabase(token);
  } catch (err) {
    console.error('Failed to validate admin session:', err);
    res.status(503).json({ error: 'Authentication service temporarily unavailable' });
    return;
  }
  if (!session || session.userId !== 'admin') {
    res.status(401).json({ error: 'Invalid admin credentials' });
    return;
  }
  await refreshDbFromSupabase();
  (req as any).session = session;
  next();
}

export async function createCloudflareHttpServer() {
  await initializeDatabase();
  const app = express();

  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Synax-File-Name, X-Synax-Content-Type');
    res.header('Access-Control-Expose-Headers', 'X-Synax-Server-Time');
    res.header('X-Synax-Server-Time', String(Date.now()));
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.post('/api/chat/background/upload', requireUserAuth, express.raw({ type: '*/*', limit: '10mb' }), async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    // Cloudflare's Node compatibility bridge can surface raw bodies as either
    // Buffer or Uint8Array. Normalize both forms instead of requiring
    // Buffer.isBuffer(), which could incorrectly report an empty upload.
    const rawBody = req.body as unknown;
    const buffer = rawBody instanceof Uint8Array
      ? Buffer.from(rawBody)
      : Buffer.isBuffer(rawBody)
        ? rawBody
        : null;
    const mimeType = String(req.headers['x-synax-content-type'] || req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    let originalName = String(req.headers['x-synax-file-name'] || 'chat-background').trim();
    try { originalName = decodeURIComponent(originalName); } catch {}

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: 'No background image selected.' });
      return;
    }
    if (!mimeType.startsWith('image/')) {
      res.status(400).json({ error: 'Only image files can be used as a chat background.' });
      return;
    }
    if (buffer.length > 10 * 1024 * 1024) {
      res.status(413).json({ error: 'Chat background images must be 10 MB or smaller.' });
      return;
    }

    try {
      const match = originalName.match(/(\.[^.]+)$/);
      const mimeExt: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
        'image/avif': '.avif',
        'image/svg+xml': '.svg',
      };
      const ext = (match?.[1] || mimeExt[mimeType] || '.img').toLowerCase().replace(/[^a-z0-9.]/g, '');
      const objectName = `chat-backgrounds/${SYNAX_CHAT_ID}/${Date.now()}-${crypto.randomUUID()}${ext}`;
      const encodedObjectPath = objectName.split('/').map(encodeURIComponent).join('/');
      await supabaseFetch(`/storage/v1/object/synax-uploads/${encodedObjectPath}`, {
        method: 'POST',
        headers: {
          'Content-Type': mimeType,
          'x-upsert': 'false',
        },
        body: new Uint8Array(buffer),
      });

      const backgroundUrl = `${SUPABASE_URL}/storage/v1/object/public/synax-uploads/${encodedObjectPath}`;
      const background: ChatBackgroundRecord = {
        chat_id: SYNAX_CHAT_ID,
        background_type: 'image',
        background_value: backgroundUrl,
        background_updated_at: Date.now(),
        updated_by: userId,
      };
      await saveChatBackground(background);

      broadcast({
        type: 'chat:background_updated',
        chatId: SYNAX_CHAT_ID,
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: userId,
      });

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: userId,
      });
    } catch (err: any) {
      const detail = err instanceof Error ? err.message : String(err || 'Unknown upload error');
      console.error('Failed to upload shared chat background:', detail);
      res.status(500).json({
        error: 'Chat background upload failed.',
        detail: detail.slice(0, 1200),
      });
    }
  });


  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Return short-lived WebRTC ICE credentials. A TURN relay is strongly preferred
  // for mobile carrier NATs, restrictive Wi-Fi, and symmetric NATs. The long-lived
  // Cloudflare TURN key never leaves the Worker. If TURN is not configured, SYNAX
  // still returns public STUN servers so same-network calls continue to work.
  app.get('/api/call/ice-servers', requireUserAuth, async (_req: Request, res: Response) => {
    const keyId = getConfiguredTurnKeyId();
    const apiToken = getConfiguredTurnApiToken();
    if (!keyId || !apiToken) {
      res.setHeader('Cache-Control', 'no-store');
      res.json({ iceServers: FALLBACK_ICE_SERVERS, turnConfigured: false, expiresAt: Date.now() + 300_000 });
      return;
    }

    try {
      const response = await fetch(
        `https://rtc.live.cloudflare.com/v1/turn/keys/${encodeURIComponent(keyId)}/credentials/generate-ice-servers`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ ttl: 86400 }),
        },
      );
      const data = await response.json().catch(() => ({} as any));
      if (!response.ok || !Array.isArray(data?.iceServers) || data.iceServers.length === 0) {
        throw new Error(`Cloudflare TURN credential request failed (HTTP ${response.status}).`);
      }
      res.setHeader('Cache-Control', 'private, no-store, max-age=0');
      res.json({ iceServers: data.iceServers, turnConfigured: true, expiresAt: Date.now() + 86400_000 });
    } catch (err) {
      console.error('SYNAX TURN credential generation failed:', err);
      res.setHeader('Cache-Control', 'no-store');
      // Graceful fallback keeps calls functional on networks where direct ICE works.
      res.json({
        iceServers: FALLBACK_ICE_SERVERS,
        turnConfigured: false,
        expiresAt: Date.now() + 300_000,
      });
    }
  });

  // Shared HTTP signaling fallback for WebRTC. This is the authoritative call
  // signaling path in production; it avoids process-local WebSocket fan-out.
  app.post('/api/call/signal', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    if (userId !== 'person_1' && userId !== 'person_2') {
      res.status(403).json({ error: 'Only user identities can place calls.' });
      return;
    }

    const data = req.body || {};
    const validationError = await validateCallSignal(userId, data, (req as any).timeStatus);
    if (validationError) {
      res.status(403).json({ type: 'call:error', error: validationError });
      return;
    }

    const targetUserId = getOppositeUserId(userId);
    const callType: 'voice' | 'video' = data.callType === 'video' ? 'video' : 'voice';

    // Keep the stored payload limited to signaling fields.
    const signalCreatedAt = new Date().toISOString();
    const payload = {
      type: data.type,
      callType,
      sdp: data.sdp,
      candidate: data.candidate,
      callerId: userId,
      fromUserId: userId,
      targetId: targetUserId,
      callId: data.callId,
      createdAt: signalCreatedAt,
      expiresAt: data.type === 'call:offer' ? Date.now() + 60_000 : undefined,
    };

    if (data.type === 'call:offer' || data.type === 'call:answer' || data.type === 'call:reject' || data.type === 'call:end') {
      try {
        await recordCallChatEvent({
          callId: String(data.callId),
          eventType: data.type,
          callType,
          actorId: userId,
        });
      } catch (historyError) {
        // History is best-effort; a temporary history outage must not break the call itself.
        console.warn('SYNAX call history record failed:', historyError);
      }
      if (data.type === 'call:offer') addLog(userId, `Initiated ${callType} call`, `To ${targetUserId}`);
    }

    try {
      const id = await storeCallSignal({
        from_user_id: userId,
        target_user_id: targetUserId,
        type: data.type,
        call_type: callType,
        payload,
      });

      // HTTP polling is the single authoritative delivery path for WebRTC
      // signaling. Do not also broadcast through WebSocket: doing both can
      // deliver duplicate answers/candidates and race the peer state machine.
      res.json({ success: true, id, createdAt: signalCreatedAt });
    } catch (err) {
      console.error('Failed to store call signal:', err);
      res.status(503).json({ type: 'call:error', error: 'Call signaling service is temporarily unavailable.' });
    }
  });

  app.get('/api/call/signals', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    if (userId !== 'person_1' && userId !== 'person_2') {
      res.status(403).json({ signals: [], error: 'Not a user session.' });
      return;
    }

      const afterId = Math.max(0, Number(req.query.after || 0));
    const sinceMs = Number(req.query.since || Date.now() - 5000);
    const requestedCallId = typeof req.query.callId === 'string' ? req.query.callId : undefined;
    const sinceIso = new Date(Number.isFinite(sinceMs) ? sinceMs : Date.now() - 5000).toISOString();

    try {
      const signals = await readCallSignals(userId, afterId, sinceIso, requestedCallId);
      res.json({ signals });
    } catch (err) {
      console.error('Failed to read call signals:', err);
      res.status(503).json({ signals: [], error: 'Call signaling service is temporarily unavailable.' });
    }
  });
  // ==========================================
  // PUBLIC API ROUTES
  // ==========================================

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true, persistence: 'supabase', initialized: Boolean(db), timestamp: Date.now() });
  });

  app.get('/api/time', requireUserAuth, async (req: Request, res: Response) => {
    try {
      // requireUserAuth already calculated the authoritative status. Reuse it
      // rather than issuing a second Supabase usage query.
      res.json({ timeStatus: (req as any).timeStatus });
    } catch (err) {
      console.error('Failed to load time status:', err);
      res.status(503).json({ error: 'Time service temporarily unavailable.' });
    }
  });

  // Public identities for cinematic opening and user selection
  app.get('/api/public/identities', async (_req: Request, res: Response) => {
    await refreshDbFromSupabase();
    res.json({
      worldTitle: db.settings.worldTitle,
      worldSubtitle: db.settings.worldSubtitle,
      theme: db.settings.theme,
      accentColor: db.settings.accentColor,
      introDurationSeconds: db.settings.introDurationSeconds,
      settings: db.settings,
      person_1: {
        id: 'person_1',
        name: db.users.person_1.name,
        username: db.users.person_1.username,
        logo: db.users.person_1.logo,
        isLocked: db.users.person_1.isLocked,
      },
      person_2: {
        id: 'person_2',
        name: db.users.person_2.name,
        username: db.users.person_2.username,
        logo: db.users.person_2.logo,
        isLocked: db.users.person_2.isLocked,
      }
    });
  });

  // User Login (Person 1 or Person 2)
  app.post('/api/auth/login', async (req: Request, res: Response) => {
    const { userId, password } = req.body;
    if (userId !== 'person_1' && userId !== 'person_2') {
      res.status(400).json({ error: 'Invalid user selection. Only Person 1 and Person 2 exist.' });
      return;
    }

    const user = db.users[userId];
    if (user.isLocked) {
      addLog(userId, 'Login Blocked', 'Attempted login while locked', 'alert');
      res.status(403).json({
        error: 'LOCKED',
        message: user.lockReason || 'This identity has been locked by the Administrator.'
      });
      return;
    }

    const isValid = bcrypt.compareSync(password || '', user.passwordHash);
    if (!isValid) {
      addLog(userId, 'Failed Login Attempt', 'Incorrect password entered', 'warn');
      res.status(401).json({ error: 'Incorrect password for this identity.' });
      return;
    }

    // Login itself never consumes active-use time.
    // Reconcile first so stale active fields cannot make an offline user lose time.
    const timeStatus = await getPersistentTimeRemaining(userId);
    if (timeStatus.isExpired) {
      res.status(403).json({ error: 'TIME_EXPIRED', message: timeStatus.customMessage, timeStatus });
      return;
    }

    // IMPORTANT: logging in alone does NOT consume time.
    // The active-use timer starts only after this token successfully authenticates
    // a live WebSocket connection in the WebSocket handler below.
    const token = `synax_${userId}_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const newSession = {
      token,
      userId,
      sessionStart: Date.now(),
      lastActive: Date.now(),
      allowedSeconds: user.allowedMinutes * 60,
      isExpired: timeStatus.isExpired,
      active: false
    };
    db.sessions[token] = newSession;

    await saveSessionToSupabase(newSession);
    saveDbSync();
    addLog(userId, 'User Logged In', `Session started: ${user.name} entered the sanctuary`);
    // Vercel can route the next request to another container. Do not return the
    // login response until the shared session has been written to Supabase.
    await flushPersistence();

    const otherId = userId === 'person_1' ? 'person_2' : 'person_1';
    const otherPersistentPresence = await getPersistentPresenceState(otherId);
    const otherUser = {
      id: otherId,
      slot: db.users[otherId].slot,
      name: db.users[otherId].name,
      username: db.users[otherId].username,
      logo: db.users[otherId].logo,
      pfpUrl: db.users[otherId].pfpUrl,
      nickname: db.users[otherId].nickname,
      bio: db.users[otherId].bio,
      lastActiveTimestamp: Number(otherPersistentPresence.lastSeen || db.users[otherId].lastActiveTimestamp || 0) || undefined,
    };

    res.json({
      token,
      user: {
        id: user.id,
        slot: user.slot,
        name: user.name,
        username: user.username,
        logo: user.logo,
        pfpUrl: user.pfpUrl,
        nickname: user.nickname,
        bio: user.bio,
        allowedMinutes: user.allowedMinutes,
      },
      otherUser,
      timeStatus,
      settings: db.settings
    });
  });

  // Logout: close one active session and invalidate its token.
  app.post('/api/auth/logout', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.json({ success: true });
      return;
    }
    const token = authHeader.split(' ')[1];
    let session: DbSchema['sessions'][string] | null = null;
    try {
      session = await getSessionFromSupabase(token);
    } catch (err) {
      console.error('Failed to load session for logout:', err);
      res.status(503).json({ error: 'Authentication service temporarily unavailable' });
      return;
    }
    if (!session) {
      res.json({ success: true });
      return;
    }
    session.endedAt = Date.now();
    session.active = false;
    if (session.userId === 'person_1' || session.userId === 'person_2') {
      try { await setPersistentChatPresence(session.userId, false); } catch (err) { console.error('Failed to stop persistent chat timer:', err); }
    }
    try { await deleteSessionFromSupabase(token); } catch (err) { console.error('Failed to delete shared session:', err); }
    delete db.sessions[token];
    saveDbSync();
    await flushPersistence();
    // Realtime presence is owned by the Durable Object. Do not broadcast the
    // persistent timer table here: that snapshot can lag behind live sockets
    // and overwrite an authoritative ONLINE state in connected clients.
    res.json({ success: true });
  });

  // Admin Login
  app.post('/api/auth/admin-login', async (req: Request, res: Response) => {
    const { password } = req.body;
    const isValid = bcrypt.compareSync(password || '', db.admin.passwordHash);
    if (!isValid) {
      addLog('Admin Portal', 'Admin Login Failed', 'Incorrect admin password attempt', 'alert');
      res.status(401).json({ error: 'Incorrect Administrator password.' });
      return;
    }

    const token = `synax_admin_${Date.now()}_${Math.random().toString(36).substring(2, 12)}`;
    const adminSession = {
      token,
      userId: 'admin' as const,
      sessionStart: Date.now(),
      lastActive: Date.now(),
      allowedSeconds: 86400 * 365,
      isExpired: false
    };
    db.sessions[token] = adminSession;

    await saveSessionToSupabase(adminSession);
    saveDbSync();
    addLog('Admin Portal', 'Admin Login Success', 'Admin authenticated into System Controls');
    // Ensure the token exists in shared storage before the frontend starts
    // requesting /api/admin/* from potentially different Vercel containers.
    await flushPersistence();

    res.json({
      token,
      role: 'admin',
      settings: db.settings
    });
  });

  // Current session status verification
  app.get('/api/auth/me', async (req: Request, res: Response) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      res.status(401).json({ error: 'No token' });
      return;
    }
    const token = authHeader.split(' ')[1];
    let session: DbSchema['sessions'][string] | null = null;
    try {
      session = await getSessionFromSupabase(token);
    } catch (err) {
      console.error('Failed to validate session:', err);
      res.status(503).json({ error: 'Authentication service temporarily unavailable' });
      return;
    }
    if (!session) {
      res.status(401).json({ error: 'Session expired' });
      return;
    }

    if (session.userId === 'admin') {
      res.json({ role: 'admin', settings: db.settings });
      return;
    }

    const userId = session.userId as 'person_1' | 'person_2';
    const user = db.users[userId];
    const otherId = userId === 'person_1' ? 'person_2' : 'person_1';
    const otherUser = db.users[otherId];
    const otherPersistentPresence = await getPersistentPresenceState(otherId);
    const timeStatus = await getPersistentTimeRemaining(userId);

    res.json({
      token,
      user: {
        id: user.id,
        slot: user.slot,
        name: user.name,
        username: user.username,
        logo: user.logo,
        pfpUrl: user.pfpUrl,
        nickname: user.nickname,
        bio: user.bio,
        isLocked: user.isLocked,
        lockReason: user.lockReason,
        allowedMinutes: user.allowedMinutes,
      },
      otherUser: {
        id: otherId,
        slot: otherUser.slot,
        name: otherUser.name,
        username: otherUser.username,
        logo: otherUser.logo,
        pfpUrl: otherUser.pfpUrl,
        nickname: otherUser.nickname,
        bio: otherUser.bio,
        lastActiveTimestamp: Number(otherPersistentPresence.lastSeen || otherUser.lastActiveTimestamp || 0) || undefined,
      },
      timeStatus,
      settings: db.settings
    });
  });

  // Update own PFP & profile info (User can ONLY edit their own PFP/bio, not the other person's, and not the logo!)
  app.post('/api/profile/update', requireUserAuth, (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const { pfpUrl, nickname, bio } = req.body;
    const user = db.users[userId];

    if (pfpUrl !== undefined) user.pfpUrl = pfpUrl;
    if (nickname !== undefined) user.nickname = nickname;
    if (bio !== undefined) user.bio = bio;

    saveDbSync();
    addLog(userId, 'Profile Updated', `Updated personal PFP / profile information`);

    // Broadcast profile change so other user's screen updates instantly
    broadcast({
      type: 'profile:updated',
      userId,
      profile: {
        id: user.id,
        name: user.name,
        pfpUrl: user.pfpUrl,
        nickname: user.nickname,
        bio: user.bio
      }
    });

    res.json({ success: true, user });
  });

  // ==========================================
  // CHAT & MESSAGING API
  // ==========================================

  // ==========================================
  // SHARED CHAT BACKGROUND API
  // ==========================================

  app.get('/api/chat/background', requireUserAuth, async (_req: Request, res: Response) => {
    try {
      const background = await loadChatBackground();
      res.json({
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: background.updated_by,
      });
    } catch (err: any) {
      console.error('Failed to load shared chat background:', err);
      res.status(503).json({ error: 'Chat background is temporarily unavailable.' });
    }
  });

  app.post('/api/chat/background/preset', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const backgroundId = String(req.body?.backgroundId || '').trim();
    if (!ALLOWED_CHAT_BACKGROUND_PRESETS.has(backgroundId)) {
      res.status(400).json({ error: 'Invalid chat background preset.' });
      return;
    }
    try {
      const background: ChatBackgroundRecord = {
        chat_id: SYNAX_CHAT_ID,
        background_type: 'preset',
        background_value: backgroundId,
        background_updated_at: Date.now(),
        updated_by: userId,
      };
      await saveChatBackground(background);
      broadcast({
        type: 'chat:background_updated',
        chatId: SYNAX_CHAT_ID,
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: userId,
      });
      res.json({
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: userId,
      });
    } catch (err) {
      console.error('Failed to save preset chat background:', err);
      res.status(503).json({ error: 'Unable to save chat background.' });
    }
  });

  app.delete('/api/chat/background', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    try {
      const background: ChatBackgroundRecord = {
        chat_id: SYNAX_CHAT_ID,
        background_type: 'preset',
        background_value: 'stars',
        background_updated_at: Date.now(),
        updated_by: userId,
      };
      await saveChatBackground(background);
      broadcast({
        type: 'chat:background_updated',
        chatId: SYNAX_CHAT_ID,
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: userId,
      });
      res.json({
        backgroundType: background.background_type,
        backgroundValue: background.background_value,
        updatedAt: background.background_updated_at,
        updatedBy: userId,
      });
    } catch (err) {
      console.error('Failed to reset shared chat background:', err);
      res.status(503).json({ error: 'Unable to reset chat background.' });
    }
  });

  // Get messages from the canonical Supabase chat table. This avoids the
  // cross-isolate overwrite/race problems of keeping the conversation inside
  // a Cloudflare Worker global variable.
  app.get('/api/messages', requireUserAuth, async (_req: Request, res: Response) => {
    try {
      const messages = await loadMessagesFromSupabase();
      db.messages = messages;
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.json({ messages });
    } catch (err) {
      console.error('Failed to load messages:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Send a message. clientMessageId makes retries idempotent so a lost network
  // response never creates duplicate messages.
  app.post('/api/messages', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const otherId = userId === 'person_1' ? 'person_2' : 'person_1';
    const { text, type, fileUrl, fileName, fileSize, audioDuration, replyTo } = req.body;
    const clientMessageId = typeof req.body?.clientMessageId === 'string' ? req.body.clientMessageId.trim() : '';
    const timeStatus = (req as any).timeStatus || await getPersistentTimeRemaining(userId);

    if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableMessaging) {
      res.status(403).json({
        error: 'TIME_EXPIRED',
        message: db.settings.timeOverMessage || 'Sanctuary communication time has expired.',
        timeStatus
      });
      return;
    }

    if (!db.settings.featuresEnabled.messages) {
      res.status(403).json({ error: 'Messaging is temporarily disabled by Admin.' });
      return;
    }
    if (type === 'voice') {
      if (!db.settings.featuresEnabled.voiceMessages) {
        res.status(403).json({ error: 'Voice messages are disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableVoiceMessages) {
        res.status(403).json({ error: 'Voice messages are restricted due to expired sanctuary time.' });
        return;
      }
    }
    if (type === 'image') {
      if (!db.settings.featuresEnabled.imageSharing) {
        res.status(403).json({ error: 'Image sharing is disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableImages) {
        res.status(403).json({ error: 'Image sharing is restricted due to expired sanctuary time.' });
        return;
      }
    }
    if (type === 'video') {
      if (!db.settings.featuresEnabled.imageSharing) {
        res.status(403).json({ error: 'Photo/video sharing is disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableImages) {
        res.status(403).json({ error: 'Video sharing is restricted due to expired sanctuary time.' });
        return;
      }
    }
    if (type === 'file') {
      if (!db.settings.featuresEnabled.fileSharing) {
        res.status(403).json({ error: 'File sharing is disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableFiles) {
        res.status(403).json({ error: 'File sharing is restricted due to expired sanctuary time.' });
        return;
      }
    }

    // Delivery state is advanced by the realtime layer. Do not perform an extra
    // Supabase presence read before every message send.
    const now = Date.now();
    const generatedId = `msg_${now}_${Math.random().toString(36).slice(2, 8)}`;
    const validClientMessageId = clientMessageId && /^[A-Za-z0-9._:-]{8,140}$/.test(clientMessageId)
      ? clientMessageId
      : null;
    const newMessage = {
      id: generatedId,
      clientMessageId: validClientMessageId || undefined,
      senderId: userId,
      type: type || 'text',
      text: text || '',
      fileUrl: fileUrl || undefined,
      fileName: fileName || undefined,
      fileSize: fileSize || undefined,
      audioDuration: audioDuration || undefined,
      timestamp: now,
      status: 'sent' as 'sent' | 'delivered' | 'read',
      reactions: {},
      replyTo: replyTo ? {
        id: replyTo.id,
        text: replyTo.text,
        senderName: replyTo.senderName
      } : undefined
    };

    try {
      // The API still performs all authentication, time-limit, and feature checks
      // before this point. After validation, hand the canonical message to the
      // Durable Object. It writes to durable DO storage and broadcasts first,
      // while Supabase persistence happens asynchronously with retries. This
      // removes the Supabase round-trip from the user's send path and prevents
      // a refresh from erasing a just-sent message.
      const delivery = await broadcastChatMessage({
        type: 'chat:enqueue_message',
        message: newMessage,
      });

      let responseMessage = (delivery.message || newMessage) as any;
      if (delivery.delivered && responseMessage.status !== 'read') responseMessage = { ...responseMessage, status: 'delivered' };

      db.messages = [...(db.messages || []).filter((m: any) =>
        m.id !== responseMessage.id && (!validClientMessageId || m.clientMessageId !== validClientMessageId)
      ), responseMessage].sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp));

      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.json({
        success: true,
        message: responseMessage,
        delivery: {
          recipientOnline: delivery.recipientOnline,
          delivered: delivery.delivered,
        },
      });
    } catch (err) {
      console.error('Realtime enqueue failed; using durable Supabase fallback:', err);
      // The realtime hub must never turn an otherwise-valid message into a 503.
      // Persist the message directly, then make a best-effort realtime fan-out.
      // The optimistic client bubble is reconciled against this canonical row.
      try {
        const persistedMessage = await insertMessageToSupabase(newMessage, validClientMessageId);
        db.messages = [...(db.messages || []).filter((m: any) =>
          m.id !== persistedMessage.id && (!validClientMessageId || m.clientMessageId !== validClientMessageId)
        ), persistedMessage]
          .sort((a: any, b: any) => Number(a.timestamp) - Number(b.timestamp));

        // Do not let a second realtime failure undo the successful database send.
        // broadcast() is intentionally fire-and-forget and swallows transport errors.
        broadcast({ type: 'chat:new_message', message: persistedMessage });

        res.setHeader('Cache-Control', 'no-store, max-age=0');
        res.json({
          success: true,
          message: {
            ...persistedMessage,
            clientMessageId: persistedMessage?.clientMessageId || validClientMessageId || undefined,
          },
          delivery: { recipientOnline: false, delivered: false },
        });
      } catch (fallbackError) {
        console.error('Failed to persist fallback message:', fallbackError);
        res.status(503).json({
          error: 'Message storage temporarily unavailable.',
          detail: fallbackError instanceof Error ? fallbackError.message : String(fallbackError),
        });
      }
    }
  });

  // Mark partner messages as read. When messageIds are supplied, only those
  // messages are advanced; this lets the client use true viewport-based read
  // receipts instead of marking an entire history read merely because the tab
  // became visible.
  app.post('/api/messages/mark-read', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const otherId = userId === 'person_1' ? 'person_2' : 'person_1';
    const messageIds = Array.isArray(req.body?.messageIds) ? req.body.messageIds : undefined;
    try {
      const readCount = await markMessagesReadInSupabase(otherId, messageIds);
      if (readCount > 0) {
        broadcast({
          type: 'chat:messages_read',
          readerId: userId,
          senderId: otherId,
          messageIds: Array.isArray(messageIds) ? messageIds : undefined,
        });
      }
      res.json({ success: true, count: readCount });
    } catch (err) {
      console.error('Failed to mark messages read:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Lightweight live presence snapshot used as a reconciliation fallback.
  // WebSocket/Durable Object remains the fastest path; this endpoint ensures the
  // UI can recover from a dropped presence event without requiring a refresh.
  app.get('/api/presence/state', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const otherId = userId === 'person_1' ? 'person_2' : 'person_1';
    try {
      const [self, other] = await Promise.all([
        getPersistentPresenceState(userId),
        getPersistentPresenceState(otherId),
      ]);
      res.setHeader('Cache-Control', 'no-store, max-age=0');
      res.json({
        serverTimestamp: Date.now(),
        self: { isOnline: self.active, lastSeen: self.lastSeen },
        other: { id: otherId, isOnline: other.active, lastSeen: other.lastSeen },
      });
    } catch (err) {
      console.error('Failed to load live presence state:', err);
      res.status(503).json({ error: 'Presence service temporarily unavailable.' });
    }
  });

  // Lightweight authoritative receipt reconciliation. This endpoint returns
  // only the current user's latest outgoing message statuses, allowing the UI
  // to recover from a missed WebSocket delivery/read event without downloading
  // the entire chat history every few seconds.
  app.get('/api/messages/receipts', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    try {
      if (messagesTableAvailable === false) {
        const rows = (db.messages || [])
          .filter((message: any) => message.senderId === userId)
          .slice(-100)
          .map((message: any) => ({ id: String(message.id), status: message.status }));
        res.json({ receipts: rows });
        return;
      }
      const response = await supabaseFetch(
        `/rest/v1/${SUPABASE_MESSAGES_TABLE}?sender_id=eq.${userId}&select=id,status&order=timestamp.desc&limit=100`
      );
      const rows = await response.json().catch(() => []);
      res.json({
        receipts: Array.isArray(rows)
          ? rows.map((row: any) => ({ id: String(row.id), status: row.status }))
          : [],
      });
    } catch (err) {
      if (isMissingDataApiTableError(err)) {
        messagesTableAvailable = false;
        const rows = (db.messages || [])
          .filter((message: any) => message.senderId === userId)
          .slice(-100)
          .map((message: any) => ({ id: String(message.id), status: message.status }));
        res.json({ receipts: rows });
        return;
      }
      console.error('Failed to load message receipts:', err);
      res.status(503).json({ error: 'Chat receipt service temporarily unavailable.' });
    }
  });

  // Toggle reaction on a message.
  app.post('/api/messages/:id/reaction', requireUserAuth, async (req: Request, res: Response) => {
    if (!db.settings.featuresEnabled.reactions) {
      res.status(403).json({ error: 'Reactions are disabled by Admin.' });
      return;
    }
    const userId = (req as any).userId as string;
    const { id } = req.params;
    const { emoji } = req.body;
    if (typeof emoji !== 'string' || emoji.length > 32) {
      res.status(400).json({ error: 'Invalid reaction.' });
      return;
    }
    try {
      const msg = await findMessageById(id);
      if (!msg) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      const reactions = { ...(msg.reactions || {}) };
      if (reactions[userId] === emoji) delete reactions[userId];
      else reactions[userId] = emoji;
      const updated = await updateMessageInSupabase(id, { reactions });
      broadcast({ type: 'chat:reaction_update', messageId: id, reactions });
      res.json({ success: true, reactions, message: updated || msg });
    } catch (err) {
      console.error('Failed to update reaction:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Edit message.
  app.put('/api/messages/:id', requireUserAuth, async (req: Request, res: Response) => {
    if (!db.settings.featuresEnabled.editing) {
      res.status(403).json({ error: 'Editing is disabled by Admin.' });
      return;
    }
    const userId = (req as any).userId as string;
    const { id } = req.params;
    const { text } = req.body;
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > 10000) {
      res.status(400).json({ error: 'Invalid message text.' });
      return;
    }
    try {
      const msg = await findMessageById(id);
      if (!msg) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      if (msg.senderId !== userId) {
        res.status(403).json({ error: 'You can only edit your own messages.' });
        return;
      }
      const updated = await updateMessageInSupabase(id, { text, is_edited: true });
      broadcast({ type: 'chat:message_edited', messageId: id, text, isEdited: true });
      res.json({ success: true, message: updated || { ...msg, text, isEdited: true } });
    } catch (err) {
      console.error('Failed to edit message:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Delete message.
  app.delete('/api/messages/:id', requireUserAuth, async (req: Request, res: Response) => {
    if (!db.settings.featuresEnabled.deleting) {
      res.status(403).json({ error: 'Deleting messages is disabled by Admin.' });
      return;
    }
    const userId = (req as any).userId as string;
    const { id } = req.params;
    try {
      const msg = await findMessageById(id);
      if (!msg) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      if (msg.senderId !== userId) {
        res.status(403).json({ error: 'You can only delete your own messages.' });
        return;
      }
      await updateMessageInSupabase(id, { deleted: true, text: 'This message was deleted', file_url: null });
      broadcast({ type: 'chat:message_deleted', messageId: id });
      res.json({ success: true });
    } catch (err) {
      console.error('Failed to delete message:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Pin / unpin message.
  app.post('/api/messages/:id/pin', requireUserAuth, async (req: Request, res: Response) => {
    const { id } = req.params;
    try {
      const msg = await findMessageById(id);
      if (!msg) {
        res.status(404).json({ error: 'Message not found' });
        return;
      }
      const isPinned = !Boolean(msg.isPinned);
      await updateMessageInSupabase(id, { is_pinned: isPinned });
      broadcast({ type: 'chat:message_pinned', messageId: id, isPinned });
      res.json({ success: true, isPinned });
    } catch (err) {
      console.error('Failed to pin message:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Presence + authoritative server timer. The state is stored in Supabase so
  // a heartbeat is not lost when Cloudflare sends the next request to another isolate.
  app.post('/api/presence/chat', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const active = req.body?.active !== false;
    try {
      const timeStatus = await setPersistentChatPresence(userId, active);
      const lastSeen = Date.now();
      // Persistent usage/timer heartbeat is separate from realtime presence.
      // Do not broadcast a partial presence object here because it can overwrite
      // the other user's live state. The Durable Object is the single source of
      // truth for ONLINE (chatActive socket) and DELIVERY (connected socket).
      const presence = { userId, isOnline: active, lastSeen };
      broadcast({ type: 'time:tick', userId, timeStatus });
      res.json({ success: true, presence, timeStatus });
    } catch (err) {
      console.error('Failed to update persistent presence/time:', err);
      res.status(503).json({ error: 'Presence/time service temporarily unavailable.' });
    }
  });


  // Start a resumable Supabase Storage upload using Worker-only credentials.
  // The previous signed-upload-token flow failed with Storage's
  // "Invalid Compact JWS" response. The browser never receives Storage keys;
  // all creation, offset checks, and chunk requests are authenticated here.
  app.post('/api/upload/resumable', requireUserAuth, async (req: Request, res: Response) => {
    const userId = (req as any).userId as 'person_1' | 'person_2';
    const timeStatus = (req as any).timeStatus || await getPersistentTimeRemaining(userId);
    const fileNameInput = typeof req.body?.fileName === 'string' ? req.body.fileName : 'upload.bin';
    const mimeTypeInput = typeof req.body?.mimeType === 'string' ? req.body.mimeType : '';
    const kind = req.body?.kind === 'video' || req.body?.kind === 'image' || req.body?.kind === 'voice' || req.body?.kind === 'file'
      ? req.body.kind
      : 'file';

    if (timeStatus.isExpired && db.settings.restrictionsOnExpire.lockSession) {
      res.status(403).json({ error: 'TIME_EXPIRED', message: db.settings.timeOverMessage, timeStatus });
      return;
    }

    if (kind === 'video' || kind === 'image') {
      if (!db.settings.featuresEnabled.imageSharing) {
        res.status(403).json({ error: 'Photo/video sharing is disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableImages) {
        res.status(403).json({ error: 'Photo/video sharing is restricted due to expired sanctuary time.', timeStatus });
        return;
      }
    } else if (kind === 'voice') {
      if (!db.settings.featuresEnabled.voiceMessages) {
        res.status(403).json({ error: 'Voice messages are disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableVoiceMessages) {
        res.status(403).json({ error: 'Voice messages are restricted due to expired sanctuary time.', timeStatus });
        return;
      }
    } else {
      if (!db.settings.featuresEnabled.fileSharing) {
        res.status(403).json({ error: 'File sharing is disabled by Admin.' });
        return;
      }
      if (timeStatus.isExpired && db.settings.restrictionsOnExpire.disableFiles) {
        res.status(403).json({ error: 'File sharing is restricted due to expired sanctuary time.', timeStatus });
        return;
      }
    }

    const mimeType = String(mimeTypeInput || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    const originalName = String(fileNameInput || 'upload.bin').trim().slice(0, 240) || 'upload.bin';
    const match = originalName.match(/(\.[^.]+)$/);
    const ext = (match?.[1] || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
    const safeExt = ext && ext.length <= 15 ? ext : '';
    const declaredFileSize = Number(req.body?.fileSize || 0);
    if (!Number.isFinite(declaredFileSize) || declaredFileSize <= 0 || declaredFileSize > 500 * 1024 * 1024) {
      res.status(400).json({ error: 'Invalid media file size. Maximum supported size is 500 MB.' });
      return;
    }
    const objectPath = `chat/${userId}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}${safeExt}`;

    try {
      const supabaseHost = new URL(SUPABASE_URL).hostname;
      const directStorageHost = supabaseHost.endsWith('.supabase.co')
        ? `${supabaseHost.slice(0, -'.supabase.co'.length)}.storage.supabase.co`
        : supabaseHost;
      const uploadEndpoint = `https://${directStorageHost}/storage/v1/upload/resumable`;
      const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/synax-uploads/${objectPath.split('/').map(encodeURIComponent).join('/')}`;
      const encodeMetadata = (value: string) => Buffer.from(value, 'utf8').toString('base64');
      const metadata = [
        `bucketName ${encodeMetadata('synax-uploads')}`,
        `objectName ${encodeMetadata(objectPath)}`,
        `contentType ${encodeMetadata(mimeType)}`,
        `cacheControl ${encodeMetadata('3600')}`,
      ].join(',');

      const createResponse = await fetch(uploadEndpoint, {
        method: 'POST',
        headers: {
          ...getSupabaseAuthHeaders(),
          'Tus-Resumable': '1.0.0',
          'Upload-Length': String(declaredFileSize),
          'Upload-Metadata': metadata,
          'x-upsert': 'true',
        },
      });
      if (!createResponse.ok) {
        const body = await createResponse.text().catch(() => '');
        throw new Error(`Supabase could not start the resumable upload (HTTP ${createResponse.status}). ${body.slice(0, 500)}`);
      }
      const rawLocation = createResponse.headers.get('Location');
      if (!rawLocation) throw new Error('Supabase did not return an upload location.');
      // Some Storage deployments return a relative Location header.
      const uploadUrl = new URL(rawLocation, uploadEndpoint).toString();

      res.setHeader('Cache-Control', 'no-store');
      res.json({
        uploadUrl,
        bucketName: 'synax-uploads',
        objectName: objectPath,
        fileUrl,
        fileName: originalName,
        mimeType,
        timeStatus: { serverTimestamp: Date.now(), remainingSeconds: timeStatus.remainingSeconds, isExpired: timeStatus.isExpired },
      });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err || 'Unknown upload initialization error');
      console.error('Failed to create resumable media upload:', detail);
      res.status(503).json({ error: 'Unable to prepare media upload.', detail: detail.slice(0, 1000) });
    }
  });

  // Same-origin TUS offset/chunk proxy for reliable mobile uploads.
  // Only Supabase's configured Storage host and resumable path are accepted.
  const validateTusUploadTarget = (rawUrl: string): URL => {
    const target = new URL(String(rawUrl || ''));
    const configuredHost = new URL(SUPABASE_URL).hostname;
    const allowedHost = configuredHost.endsWith('.supabase.co')
      ? `${configuredHost.slice(0, -'.supabase.co'.length)}.storage.supabase.co`
      : configuredHost;
    if (target.protocol !== 'https:' || target.hostname !== allowedHost || !target.pathname.startsWith('/storage/v1/upload/resumable')) {
      throw new Error('Invalid resumable upload target.');
    }
    return target;
  };

  app.post('/api/upload/resumable/offset', requireUserAuth, async (req: Request, res: Response) => {
    try {
      const target = validateTusUploadTarget(String(req.body?.uploadUrl || ''));
      const remote = await fetch(target.toString(), {
        method: 'HEAD',
        headers: { ...getSupabaseAuthHeaders(), 'Tus-Resumable': '1.0.0' },
      });
      if (!remote.ok) {
        const body = await remote.text().catch(() => '');
        return res.status(remote.status).json({ error: body.slice(0, 500) || 'Unable to read upload offset.' });
      }
      res.setHeader('Cache-Control', 'no-store');
      res.json({ offset: Number(remote.headers.get('Upload-Offset') || 0) });
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err || 'Unknown upload error');
      res.status(400).json({ error: detail });
    }
  });

  app.patch('/api/upload/resumable/chunk', requireUserAuth, express.raw({ type: '*/*', limit: '8mb' }), async (req: Request, res: Response) => {
    try {
      const target = validateTusUploadTarget(String(req.headers['x-synax-upload-url'] || ''));
      const offset = String(req.headers['upload-offset'] || '0');
      const chunk = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      if (!chunk.length) return res.status(400).json({ error: 'Empty upload chunk.' });
      const remote = await fetch(target.toString(), {
        method: 'PATCH',
        headers: {
          ...getSupabaseAuthHeaders(),
          'Tus-Resumable': '1.0.0',
          'Upload-Offset': offset,
          'Content-Type': 'application/offset+octet-stream',
        },
        body: chunk,
      });
      const responseBody = await remote.text().catch(() => '');
      if (!remote.ok) {
        return res.status(remote.status).send(responseBody.slice(0, 1000));
      }
      const nextOffset = remote.headers.get('Upload-Offset');
      if (nextOffset) res.setHeader('Upload-Offset', nextOffset);
      res.setHeader('Tus-Resumable', '1.0.0');
      return res.status(204).end();
    } catch (err) {
      const detail = err instanceof Error ? err.message : String(err || 'Unknown upload error');
      return res.status(400).json({ error: detail });
    }
  });

  // File / Voice / Image Upload
  // The Cloudflare build uses a raw request body so image/file/voice uploads do
  // not depend on multipart parsing in the Workers Node compatibility layer.
  app.post('/api/upload', requireUserAuth, express.raw({ type: '*/*', limit: '25mb' }), async (req: Request, res: Response) => {
    const buffer = Buffer.isBuffer(req.body) ? req.body : null;
    const mimeType = String(req.headers['content-type'] || 'application/octet-stream').split(';')[0].trim().toLowerCase();
    let originalName = String(req.headers['x-synax-file-name'] || 'upload.bin').trim();
    try { originalName = decodeURIComponent(originalName); } catch {}

    if (!buffer || buffer.length === 0) {
      res.status(400).json({ error: 'No file uploaded' });
      return;
    }

    try {
      if (useSupabase) {
        const match = originalName.match(/(\.[^.]+)$/);
        const ext = (match?.[1] || '').toLowerCase().replace(/[^a-z0-9.]/g, '');
        const safeExt = ext && ext.length <= 15 ? ext : '';
        const objectName = `${Date.now()}-${Math.random().toString(36).substring(2, 8)}${safeExt}`;
        await supabaseFetch(`/storage/v1/object/synax-uploads/${encodeURIComponent(objectName)}`, {
          method: 'POST',
          headers: {
            'Content-Type': mimeType,
            'x-upsert': 'false',
          },
          body: buffer,
        });
        const fileUrl = `${SUPABASE_URL}/storage/v1/object/public/synax-uploads/${encodeURIComponent(objectName)}`;
        res.setHeader('Cache-Control', 'no-store');
        res.json({ fileUrl, fileName: originalName, fileSize: buffer.length, mimeType });
        return;
      }

      res.status(503).json({ error: 'Cloudflare uploads require Supabase Storage.' });
    } catch (err) {
      console.error('Upload failed:', err);
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  // ==========================================
  // ADMIN PANEL CONTROLS API
  // ==========================================

  // Admin Overview
  app.get('/api/admin/overview', requireAdminAuth, async (_req: Request, res: Response) => {
    const p1Time = await getPersistentTimeRemaining('person_1');
    const p2Time = await getPersistentTimeRemaining('person_2');
    const presence = await getPersistentPresenceSummary();
    const messages = await loadMessagesFromSupabase();

    res.json({
      users: {
        person_1: {
          ...db.users.person_1,
          passwordHash: undefined,
          timeStatus: p1Time
        },
        person_2: {
          ...db.users.person_2,
          passwordHash: undefined,
          timeStatus: p2Time
        }
      },
      settings: db.settings,
      presence,
      totalMessages: messages.length,
      logs: db.logs.slice(0, 50)
    });
  });

  // Admin: Update Identities & Passwords
  app.put('/api/admin/users', requireAdminAuth, (req: Request, res: Response) => {
    const { person_1, person_2 } = req.body;

    if (person_1) {
      const u1 = db.users.person_1;
      if (person_1.name) u1.name = person_1.name;
      if (person_1.username) u1.username = person_1.username;
      if (person_1.password && person_1.password.trim().length > 0) {
        u1.passwordHash = bcrypt.hashSync(person_1.password, 10);
      }
      if (person_1.logo) u1.logo = person_1.logo;
      if (person_1.allowedMinutes !== undefined) u1.allowedMinutes = Number(person_1.allowedMinutes);
    }

    if (person_2) {
      const u2 = db.users.person_2;
      if (person_2.name) u2.name = person_2.name;
      if (person_2.username) u2.username = person_2.username;
      if (person_2.password && person_2.password.trim().length > 0) {
        u2.passwordHash = bcrypt.hashSync(person_2.password, 10);
      }
      if (person_2.logo) u2.logo = person_2.logo;
      if (person_2.allowedMinutes !== undefined) u2.allowedMinutes = Number(person_2.allowedMinutes);
    }

    saveDbSync();
    addLog('Admin', 'Updated Person Identities / Credentials', 'Names, logos or limits modified');

    broadcast({
      type: 'identities:updated',
      person_1: {
        name: db.users.person_1.name,
        logo: db.users.person_1.logo,
        allowedMinutes: db.users.person_1.allowedMinutes
      },
      person_2: {
        name: db.users.person_2.name,
        logo: db.users.person_2.logo,
        allowedMinutes: db.users.person_2.allowedMinutes
      }
    });

    res.json({ success: true, users: db.users });
  });

  // Admin: Lock / Unlock User
  app.post('/api/admin/user/:id/lock', requireAdminAuth, (req: Request, res: Response) => {
    const userId = req.params.id as 'person_1' | 'person_2';
    const { isLocked, lockReason } = req.body;

    if (userId !== 'person_1' && userId !== 'person_2') {
      res.status(400).json({ error: 'Invalid user' });
      return;
    }

    db.users[userId].isLocked = !!isLocked;
    db.users[userId].lockReason = lockReason || undefined;

    saveDbSync();
    addLog('Admin', isLocked ? `Locked ${db.users[userId].name}` : `Unlocked ${db.users[userId].name}`, lockReason, isLocked ? 'alert' : 'info');

    broadcast({
      type: 'user:lock_state',
      userId,
      isLocked: db.users[userId].isLocked,
      lockReason: db.users[userId].lockReason
    });

    res.json({ success: true, user: db.users[userId] });
  });

  // Admin: Reset Time / Grant Extra Time
  app.post('/api/admin/user/:id/reset-time', requireAdminAuth, async (req: Request, res: Response) => {
    const userId = req.params.id as 'person_1' | 'person_2';
    const { setMinutes, addMinutes, resetSession } = req.body;

    if (userId !== 'person_1' && userId !== 'person_2') {
      res.status(400).json({ error: 'Invalid user' });
      return;
    }

    const user = db.users[userId] as any;

    // SET EXACT LIMIT:
    // adminSetTimeLimit() sends { setMinutes: N }. The previous endpoint
    // ignored this field, so the input appeared to save but the server kept
    // the old limit. Treat setMinutes as an absolute configured limit.
    let didSetLimit = false;
    if (setMinutes !== undefined && setMinutes !== null && setMinutes !== '') {
      const parsed = Number(setMinutes);
      if (!Number.isFinite(parsed) || parsed < 1) {
        res.status(400).json({ error: 'Time limit must be at least 1 minute.' });
        return;
      }

      user.allowedMinutes = Math.max(1, Math.floor(parsed));
      didSetLimit = true;

      // Keep any in-memory session records consistent with the new configured limit.
      for (const session of Object.values(db.sessions) as any[]) {
        if (session.userId === userId) {
          session.allowedSeconds = user.allowedMinutes * 60;
          try { await saveSessionToSupabase(session); } catch (err) { console.error('Failed to update shared session limit:', err); }
        }
      }
    }

    // RESET CONSUMED USAGE (does not change configured limit).
    if (resetSession) {
      await resetPersistentUsage(userId);
      user.activeUsageSeconds = 0;
      user.dailyUsageSeconds = 0;
      user.dailyUsageDate = getIndiaDateKey();
      user.sessionStartTimestamp = undefined;
      user.activeSessionStartedAt = undefined;
    }

    // ADD / REMOVE TIME FROM THE CONFIGURED LIMIT.
    if (addMinutes !== undefined && addMinutes !== null) {
      const delta = Number(addMinutes);
      if (!Number.isFinite(delta)) {
        res.status(400).json({ error: 'Invalid time adjustment.' });
        return;
      }

      user.allowedMinutes = Math.max(
        1,
        Math.floor(Number(user.allowedMinutes || 60) + delta)
      );

      for (const session of Object.values(db.sessions) as any[]) {
        if (session.userId === userId) {
          session.allowedSeconds = user.allowedMinutes * 60;
          try { await saveSessionToSupabase(session); } catch (err) { console.error('Failed to update shared session limit:', err); }
        }
      }
    }

    saveDbSync();

    const newStatus = await getPersistentTimeRemaining(userId);

    const action = didSetLimit
      ? `Set exact limit to ${user.allowedMinutes}m`
      : `Adjusted time`;

    addLog(
      'Admin',
      `${action} for ${user.name}`,
      `Reset usage: ${!!resetSession}; Added: ${addMinutes || 0}m`
    );

    // Immediately push the updated authoritative timer to connected devices.
    broadcast({
      type: 'time:tick',
      userId,
      timeStatus: newStatus
    });

    // Also push the updated configured limit to identity/admin views.
    broadcast({
      type: 'identities:updated',
      person_1: {
        name: db.users.person_1.name,
        logo: db.users.person_1.logo,
        allowedMinutes: db.users.person_1.allowedMinutes
      },
      person_2: {
        name: db.users.person_2.name,
        logo: db.users.person_2.logo,
        allowedMinutes: db.users.person_2.allowedMinutes
      }
    });

    res.json({
      success: true,
      timeStatus: newStatus,
      user: {
        ...user,
        passwordHash: undefined
      }
    });
  });

  // Admin: Update App & Communication Settings
  app.put('/api/admin/settings', requireAdminAuth, (req: Request, res: Response) => {
    const newSettings = req.body;
    db.settings = {
      ...db.settings,
      ...newSettings,
      restrictionsOnExpire: {
        ...db.settings.restrictionsOnExpire,
        ...(newSettings.restrictionsOnExpire || {})
      },
      featuresEnabled: {
        ...db.settings.featuresEnabled,
        ...(newSettings.featuresEnabled || {})
      }
    };

    saveDbSync();
    addLog('Admin', 'Settings Updated', 'Appearance, time rules or communication features updated');

    broadcast({
      type: 'settings:updated',
      settings: db.settings
    });

    res.json({ success: true, settings: db.settings });
  });

  // Admin: Read messages and active sessions without user-only auth.
  app.get('/api/admin/messages', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const messages = await loadMessagesFromSupabase();
      res.json({ messages });
    } catch (err) {
      console.error('Failed to load admin messages:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  app.get('/api/admin/sessions', requireAdminAuth, async (_req: Request, res: Response) => {
    try {
      const sessions = (await listSessionsFromSupabase()).map((s: any) => ({
        userId: s.userId,
        sessionStart: s.sessionStart,
        lastActive: s.lastActive,
        allowedSeconds: s.allowedSeconds,
        isExpired: s.isExpired,
        active: Boolean(s.active),
      }));
      res.json({ sessions });
    } catch (err) {
      console.error('Failed to list shared sessions:', err);
      res.status(503).json({ sessions: [], error: 'Session service temporarily unavailable' });
    }
  });

  // Admin: Factory reset. Restores default identities/settings/chat/time and keeps the admin logged in.
  app.post('/api/admin/reset-defaults', requireAdminAuth, async (_req: Request, res: Response) => {
    const currentAdminSessions = Object.values(db.sessions).filter((s: any) => s.userId === 'admin');
    const fresh = getInitialDb();
    db = fresh;
    await clearMessagesInSupabase(db.messages);
    await resetPersistentUsage('person_1');
    await resetPersistentUsage('person_2');
    for (const s of currentAdminSessions) {
      db.sessions[s.token] = s;
    }
    saveDbSync();
    for (const s of currentAdminSessions) {
      try { await saveSessionToSupabase(s as any); } catch (err) { console.error('Failed to preserve admin session:', err); }
    }
    broadcast({ type: 'settings:updated', settings: db.settings });
    broadcast({ type: 'identities:updated', person_1: db.users.person_1, person_2: db.users.person_2 });
    broadcast({ type: 'chat:history_cleared' });
    for (const id of ['person_1', 'person_2'] as const) {
      void getPersistentTimeRemaining(id).then((timeStatus) => broadcast({ type: 'time:tick', userId: id, timeStatus })).catch(() => undefined);
    }
    res.json({ success: true, settings: db.settings });
  });

  // Admin: Clear Chat History
  app.post('/api/admin/messages/clear', requireAdminAuth, async (_req: Request, res: Response) => {
    const freshSystemMessage = {
      id: `msg_clr_${Date.now()}`,
      senderId: 'system',
      type: 'system',
      text: '✦ Chat history was cleared by the Administrator. A fresh chapter begins.',
      timestamp: Date.now(),
      status: 'read',
      reactions: {}
    };
    try {
      await clearMessagesInSupabase([freshSystemMessage]);
      db.messages = [freshSystemMessage];
      addLog('Admin', 'Chat History Cleared', 'All previous messages purged');
      broadcast({ type: 'chat:history_cleared' });
      res.json({ success: true });
    } catch (err) {
      console.error('Failed to clear messages:', err);
      res.status(503).json({ error: 'Chat storage temporarily unavailable.' });
    }
  });

  // Admin: View Audit Logs
  app.get('/api/admin/logs', requireAdminAuth, (_req: Request, res: Response) => {
    res.json({ logs: db.logs });
  });

  // Admin: Change Administrator Password
  app.post('/api/admin/change-password', requireAdminAuth, (req: Request, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
      res.status(400).json({ error: 'New password must be at least 4 characters long.' });
      return;
    }

    if (!bcrypt.compareSync(currentPassword || '', db.admin.passwordHash)) {
      res.status(401).json({ error: 'Current administrator password is incorrect.' });
      return;
    }

    db.admin.passwordHash = bcrypt.hashSync(newPassword.trim(), 10);
    saveDbSync();
    addLog('Admin', 'Password Changed', 'Master administrator password successfully updated');
    res.json({ success: true });
  });

  // Never let Express turn API exceptions into an HTML error page. The React
  // client expects JSON from /api/*; returning HTML causes errors such as
  // "Unexpected token '<'" when the client calls response.json().
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('SYNAX API unhandled error:', err);
    if (req.path === '/api' || req.path.startsWith('/api/')) {
      if (res.headersSent) return next(err);
      const status = Number.isInteger(err?.status) && err.status >= 400 && err.status < 600 ? err.status : 500;
      res.status(status).json({
        error: 'SYNAX API request failed.',
        detail: err instanceof Error ? err.message : String(err || 'Unknown server error'),
      });
      return;
    }
    next(err);
  });

  // Cloudflare Worker serves the SPA static assets independently.
  // This Express server is used only for the API routes.
  return http.createServer(app);
}
