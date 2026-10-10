import { ServerClock } from './clock';

import {
  AuthSession,
  ChatMessage,
  AppSettings,
  UserProfile,
  TimeStatus,
  ActivityLog
} from '../types';

async function readApiJson<T = any>(res: Response): Promise<T | null> {
  const contentType = res.headers.get('content-type') || '';
  const text = await res.text();
  if (!text) return null;
  if (contentType.includes('application/json')) {
    try { return JSON.parse(text) as T; } catch {}
  }
  // Some proxy/runtime failures return HTML/plain text instead of JSON.
  // Preserve the body as a safe diagnostic string instead of throwing
  // "Unexpected token '<'".
  return { __nonJson: true, raw: text } as T;
}

function apiErrorFromResponse(data: any, status: number): string {
  if (data?.message) return String(data.message);
  if (data?.detail) return String(data.detail);
  if (data?.error) return String(data.error);
  if (data?.__nonJson) {
    const raw = String(data.raw || '').replace(/\s+/g, ' ').trim();
    return raw.startsWith('<!DOCTYPE') || raw.startsWith('<html')
      ? `Server returned an HTML error page (HTTP ${status}).`
      : (raw.slice(0, 500) || `Request failed (HTTP ${status}).`);
  }
  return `Request failed (HTTP ${status}).`;
}

let authToken: string | null = null;
let adminAuthToken: string | null = null;

async function apiFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const response = await fetch(input, init);
  ServerClock.syncFromHeaders(response.headers);
  return response;
}

function encodeTusMetadataValue(value: string): string {
  const bytes = new TextEncoder().encode(String(value));
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function isVideoFile(file: File | Blob, originalName: string): boolean {
  const mimeType = String(file.type || '').toLowerCase();
  return mimeType.startsWith('video/') || /\.(mp4|m4v|mov|webm|3gp|3gpp|avi|mkv)$/i.test(originalName);
}

function isImageFile(file: File | Blob, originalName: string): boolean {
  const mimeType = String(file.type || '').toLowerCase();
  return mimeType.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif|heic|heif|bmp|tiff?)$/i.test(originalName);
}

function inferMediaMimeType(file: File | Blob, originalName: string, kind: 'image' | 'video'): string {
  const declared = String(file.type || '').split(';')[0].trim().toLowerCase();
  if (declared && declared !== 'application/octet-stream') return declared;
  const ext = (originalName.match(/\.([^.]+)$/)?.[1] || '').toLowerCase();
  const known: Record<string, string> = {
    jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif',
    avif: 'image/avif', heic: 'image/heic', heif: 'image/heif', bmp: 'image/bmp', tif: 'image/tiff', tiff: 'image/tiff',
    mp4: 'video/mp4', m4v: 'video/x-m4v', mov: 'video/quicktime', webm: 'video/webm',
    '3gp': 'video/3gpp', '3gpp': 'video/3gpp', avi: 'video/x-msvideo', mkv: 'video/x-matroska',
  };
  return known[ext] || (kind === 'image' ? 'image/jpeg' : 'video/mp4');
}

function getResumableChunkSize(): number {
  // Smaller chunks reduce peak memory pressure on mobile browsers/older phones.
  const nav = navigator as Navigator & { deviceMemory?: number; userAgentData?: { mobile?: boolean } };
  const isMobile = nav.userAgentData?.mobile ?? /Android|iPhone|iPad|iPod|Mobile/i.test(nav.userAgent || '');
  if (isMobile && (typeof nav.deviceMemory !== 'number' || nav.deviceMemory <= 4)) return 1 * 1024 * 1024;
  if (isMobile) return 2 * 1024 * 1024;
  return 4 * 1024 * 1024;
}

async function uploadResumableMedia(
  file: File | Blob,
  originalName: string,
  onProgress: (progress: number) => void,
  kind: 'image' | 'video',
): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
  const token = ApiService.getToken();
  if (!token) throw new Error('Not authenticated');

  const uploadLength = Number(file.size || 0);
  if (!Number.isFinite(uploadLength) || uploadLength <= 0) {
    throw new Error('The selected media file is empty.');
  }
  if (uploadLength > 500 * 1024 * 1024) {
    throw new Error('This media file is too large to send.');
  }

  const mimeType = inferMediaMimeType(file, originalName, kind);
  const prepareResponse = await apiFetch('/api/upload/resumable', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      fileName: originalName,
      mimeType,
      kind,
      fileSize: uploadLength,
    }),
    cache: 'no-store',
  });
  const prepareData = await prepareResponse.json().catch(() => ({}));
  if (!prepareResponse.ok) {
    throw new Error(apiErrorFromResponse(prepareData, prepareResponse.status));
  }
  if (prepareData?.timeStatus?.serverTimestamp) ServerClock.sync(prepareData.timeStatus.serverTimestamp);

  const uploadUrl = String(prepareData?.uploadUrl || '');
  const fileUrl = String(prepareData?.fileUrl || '');
  if (!uploadUrl || !fileUrl) {
    throw new Error('The media upload could not be prepared.');
  }

  const RETRY_DELAYS = [0, 1000, 2000, 4000, 8000, 12000];
  const CHUNK_SIZE = getResumableChunkSize();
  const sleep = (ms: number) => new Promise<void>((resolve) => window.setTimeout(resolve, ms));
  let offset = 0;
  onProgress(0);

  const readOffset = async (): Promise<number> => {
    const res = await apiFetch('/api/upload/resumable/offset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ uploadUrl }),
      cache: 'no-store',
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(apiErrorFromResponse(data, res.status));
    const remoteOffset = Number(data?.offset || 0);
    if (!Number.isFinite(remoteOffset) || remoteOffset < 0 || remoteOffset > uploadLength) {
      throw new Error('The media upload returned an invalid offset.');
    }
    return remoteOffset;
  };

  try {
    offset = await readOffset();
    onProgress(Math.max(0, Math.min(100, (offset / uploadLength) * 100)));
  } catch {
    offset = 0;
  }

  while (offset < uploadLength) {
    let chunkDone = false;

    for (let attempt = 0; attempt < RETRY_DELAYS.length && !chunkDone; attempt++) {
      if (RETRY_DELAYS[attempt] > 0) await sleep(RETRY_DELAYS[attempt]);
      const priorOffset = offset;
      try {
        // Always derive the next slice from the authoritative storage offset.
        // If a PATCH succeeded but its response was lost, the remote offset can
        // already be ahead; never send an empty or stale slice in that case.
        offset = await readOffset();
        if (offset !== priorOffset) {
          onProgress(Math.max(0, Math.min(99.9, (offset / uploadLength) * 100)));
        }
        if (offset >= uploadLength) {
          chunkDone = true;
          break;
        }

        const chunkStart = offset;
        const chunkEnd = Math.min(uploadLength, chunkStart + CHUNK_SIZE);
        const chunk = file.slice(chunkStart, chunkEnd);
        const response = await new Promise<XMLHttpRequest>((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PATCH', '/api/upload/resumable/chunk', true);
          xhr.timeout = 120_000;
          xhr.setRequestHeader('Authorization', `Bearer ${token}`);
          xhr.setRequestHeader('X-Synax-Upload-URL', uploadUrl);
          xhr.setRequestHeader('Upload-Offset', String(chunkStart));
          xhr.setRequestHeader('Content-Type', 'application/octet-stream');
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const uploaded = chunkStart + event.loaded;
              onProgress(Math.max(0, Math.min(99.9, (uploaded / uploadLength) * 100)));
            }
          };
          xhr.onload = () => resolve(xhr);
          xhr.onerror = () => reject(new Error('Network error while sending a media chunk.'));
          xhr.ontimeout = () => reject(new Error('Media upload chunk timed out.'));
          xhr.onabort = () => reject(new Error('Media upload was interrupted.'));
          xhr.send(chunk);
        });

        if (response.status === 409) {
          const actualOffset = await readOffset();
          if (actualOffset > chunkStart) {
            offset = actualOffset;
            onProgress(Math.max(0, Math.min(99.9, (offset / uploadLength) * 100)));
            chunkDone = true;
          }
          // If storage is still at chunkStart, retry the same slice after the
          // configured delay. Otherwise the outer loop resumes at actualOffset.
          continue;
        }
        if (response.status < 200 || response.status >= 300) {
          const body = response.responseText || '';
          throw new Error(`Media chunk upload failed (HTTP ${response.status}). ${body.slice(0, 240)}`.trim());
        }

        const serverOffset = Number(response.getResponseHeader('Upload-Offset') || chunkEnd);
        if (!Number.isFinite(serverOffset) || serverOffset <= chunkStart || serverOffset > uploadLength) {
          throw new Error('The server returned an invalid media upload offset.');
        }
        offset = serverOffset;
        onProgress(Math.max(0, Math.min(99.9, (offset / uploadLength) * 100)));
        chunkDone = true;
      } catch (error) {
        if (attempt === RETRY_DELAYS.length - 1) throw error;
        try {
          const actualOffset = await readOffset();
          if (actualOffset > offset) {
            offset = actualOffset;
            onProgress(Math.max(0, Math.min(99.9, (offset / uploadLength) * 100)));
          }
          if (offset >= uploadLength) chunkDone = true;
        } catch {
          // Keep the last known offset; the next retry re-reads it before slicing.
        }
      }
    }

    if (!chunkDone && offset < uploadLength) {
      throw new Error('The media upload could not continue. Please try again.');
    }
  }

  // Confirm the storage-side offset before reporting 100%. This prevents the
  // classic mobile symptom where the browser shows 100% but the remote object
  // is not actually complete yet.
  let finalOffset = -1;
  let finalVerifyError: unknown = null;
  for (let attempt = 0; attempt < RETRY_DELAYS.length; attempt++) {
    if (RETRY_DELAYS[attempt] > 0) await sleep(RETRY_DELAYS[attempt]);
    try {
      finalOffset = await readOffset();
      if (finalOffset === uploadLength) break;
    } catch (error) {
      finalVerifyError = error;
    }
  }
  if (finalOffset !== uploadLength) {
    if (finalOffset < 0 && finalVerifyError instanceof Error) throw finalVerifyError;
    throw new Error(`The media upload stopped at ${Math.floor((Math.max(0, finalOffset) / uploadLength) * 100)}%.`);
  }
  onProgress(100);
  return {
    fileUrl,
    fileName: String(prepareData.fileName || originalName),
    fileSize: uploadLength,
  };
}

export const ApiService = {
  setToken(token: string | null) {
    authToken = token;
    if (token) {
      sessionStorage.setItem('synax_token', token);
      localStorage.setItem('synax_user_token', token);
    } else {
      sessionStorage.removeItem('synax_token');
      localStorage.removeItem('synax_user_token');
    }
  },

  setAdminToken(token: string | null) {
    adminAuthToken = token;
    if (token) sessionStorage.setItem('synax_admin_token', token);
    else sessionStorage.removeItem('synax_admin_token');
  },

  getAdminToken(): string | null {
    if (!adminAuthToken && typeof window !== 'undefined') {
      adminAuthToken = sessionStorage.getItem('synax_admin_token');
    }
    return adminAuthToken;
  },

  getToken(): string | null {
    if (!authToken && typeof window !== 'undefined') {
      authToken = sessionStorage.getItem('synax_token') || localStorage.getItem('synax_user_token');
    }
    return authToken;
  },

  async getConfig(): Promise<{
    person1: UserProfile;
    person2: UserProfile;
    settings: AppSettings;
    timeStatus: TimeStatus | null;
  }> {
    const res = await apiFetch('/api/public/identities', { cache: 'no-store' });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const detail = data?.detail || data?.message || data?.error;
      throw new Error(
        detail
          ? `Failed to load sanctuary configuration: ${detail}`
          : `Failed to load sanctuary configuration (HTTP ${res.status})`
      );
    }
    const settings: AppSettings = data.settings || {
      worldTitle: data.worldTitle,
      worldSubtitle: data.worldSubtitle,
      theme: data.theme,
      accentColor: data.accentColor,
      introDurationSeconds: data.introDurationSeconds,
      welcomeMessage: 'Welcome to your private sanctuary. Every conversation belongs solely to you two.',
      chatWallpaper: 'stars',
      timeOverMessage: 'Your time in SYNAX has ended for now. See you again soon ✨',
      timeStrategy: 'continuous',
      warningMinutes: [10, 5, 1],
      restrictionsOnExpire: {
        disableMessaging: true,
        disableVoiceCalls: true,
        disableVideoCalls: true,
        disableImages: true,
        disableFiles: true,
        disableVoiceMessages: true,
        lockSession: false,
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
        deleting: true,
      },
    };
    return {
      person1: data.person_1,
      person2: data.person_2,
      settings,
      timeStatus: null,
    };
  },

  async login(userId: 'person_1' | 'person_2', password: string): Promise<AuthSession> {
    const res = await apiFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId, password }),
    });
    const data = await readApiJson<any>(res);
    if (!res.ok) {
      throw new Error(apiErrorFromResponse(data, res.status));
    }
    if (!data || data.__nonJson || !data.token) {
      throw new Error('Authentication server returned an invalid response.');
    }
    ApiService.setToken(data.token);
    return data as AuthSession;
  },

  async loginUser(userId: 'person_1' | 'person_2', password: string): Promise<AuthSession> {
    return this.login(userId, password);
  },

  async adminLogin(password: string): Promise<{ token: string; role: 'admin'; settings: AppSettings }> {
    const res = await apiFetch('/api/auth/admin-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await readApiJson<any>(res);
    if (!res.ok) {
      throw new Error(apiErrorFromResponse(data, res.status));
    }
    if (!data || data.__nonJson || !data.token) {
      throw new Error('Authentication server returned an invalid response.');
    }
    ApiService.setAdminToken(data.token);
    return data;
  },

  async loginAdmin(password: string) {
    return this.adminLogin(password);
  },

  async logout(): Promise<void> {
    const token = ApiService.getToken();
    if (token) {
      try { await apiFetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    }
    ApiService.setToken(null);
  },

  async adminLogout(): Promise<void> {
    const token = ApiService.getAdminToken();
    if (token) {
      try { await apiFetch('/api/auth/logout', { method: 'POST', headers: { Authorization: `Bearer ${token}` } }); } catch {}
    }
    ApiService.setAdminToken(null);
  },

  async getMe(): Promise<{
    user: UserProfile;
    otherUser: UserProfile;
    settings: AppSettings;
    timeStatus: TimeStatus;
  }> {
    const token = ApiService.getToken();
    if (!token) throw new Error('No auth token available');
    const res = await apiFetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      ApiService.setToken(null);
      throw new Error('Session expired');
    }
    return res.json();
  },

  async getTimeStatus(): Promise<TimeStatus | null> {
    const token = ApiService.getToken();
    if (!token) return null;
    try {
      const res = await apiFetch('/api/time', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) return null;
      if (data?.timeStatus?.serverTimestamp) ServerClock.sync(data.timeStatus.serverTimestamp);
      return data.timeStatus || null;
    } catch {
      return null;
    }
  },

  async updateOwnProfile(data: { pfpUrl?: string; nickname?: string; bio?: string }): Promise<UserProfile> {
    const token = ApiService.getToken();
    const res = await apiFetch('/api/profile/update', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to update profile');
    return result.user;
  },

  async getMessages(): Promise<ChatMessage[]> {
    const token = ApiService.getToken();
    const res = await apiFetch('/api/messages', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to fetch messages');
    return data.messages;
  },

  async markMessagesAsRead(messageIds?: string[]): Promise<void> {
    const token = ApiService.getToken();
    if (!token) return;
    try {
      await apiFetch('/api/messages/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(messageIds?.length ? { messageIds } : {}),
      });
    } catch (e) {
      console.warn('Failed to mark messages as read:', e);
    }
  },

  async getMessageReceipts(): Promise<Array<{ id: string; status: 'sent' | 'delivered' | 'read' }>> {
    const token = ApiService.getToken();
    if (!token) return [];
    try {
      const res = await apiFetch('/api/messages/receipts', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to fetch message receipts');
      return Array.isArray(data.receipts) ? data.receipts : [];
    } catch (error) {
      console.warn('Failed to reconcile message receipts:', error);
      return [];
    }
  },

  async setChatPresence(active: boolean): Promise<void> {
    const token = ApiService.getToken();
    try {
      await apiFetch('/api/presence/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ active }),
        keepalive: !active,
      });
    } catch (err) {
      // Presence should never break the chat UI.
      console.warn('Failed to update chat presence:', err);
    }
  },

  async getPresenceState(): Promise<{ id: 'person_1' | 'person_2'; isOnline: boolean; lastSeen: number } | null> {
    const token = ApiService.getToken();
    if (!token) return null;
    try {
      const res = await apiFetch('/api/presence/state', {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      if (!res.ok) return null;
      const data = await res.json().catch(() => null);
      const other = data?.other;
      if (!other || (other.id !== 'person_1' && other.id !== 'person_2')) return null;
      return {
        id: other.id,
        isOnline: Boolean(other.isOnline),
        lastSeen: Number(other.lastSeen || 0),
      };
    } catch {
      return null;
    }
  },

  async sendMessage(payload: {
    text?: string;
    type?: 'text' | 'image' | 'video' | 'file' | 'voice';
    fileUrl?: string;
    fileName?: string;
    fileSize?: number;
    audioDuration?: number;
    replyTo?: { id: string; text: string; senderName: string };
    clientMessageId?: string;
  }): Promise<ChatMessage> {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');

    // POST is made idempotent by clientMessageId on the server, so a network
    // retry cannot create a duplicate message after a lost response.
    const maxAttempts = payload.clientMessageId ? 2 : 1;
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), 8000);
      try {
        const res = await apiFetch('/api/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
          cache: 'no-store',
          signal: controller.signal,
        });
        const data = await res.json().catch(() => ({}));
        if (data?.message?.timestamp) ServerClock.syncFromHeaders(res.headers);
        if (res.ok) {
          if (data?.message && payload.clientMessageId && !data.message.clientMessageId) {
            data.message.clientMessageId = payload.clientMessageId;
          }
          return data.message;
        }

        const message = data.message || data.error || `Failed to send message (HTTP ${res.status})`;
        // Retry only transient gateway/service failures. Never retry validation
        // or permission errors such as TIME_EXPIRED.
        if (attempt >= maxAttempts || ![408, 425, 429, 500, 502, 503, 504].includes(res.status)) {
          throw new Error(message);
        }
        lastError = new Error(message);
      } catch (error) {
        lastError = error;
        if (attempt >= maxAttempts) break;
        // Abort/network errors are safe to retry because the server deduplicates
        // by clientMessageId.
        if (error instanceof DOMException && error.name !== 'AbortError') break;
        await new Promise((resolve) => window.setTimeout(resolve, 250 * attempt));
      } finally {
        window.clearTimeout(timer);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Failed to send message');
  },

  async toggleReaction(messageId: string, emoji: string): Promise<{ success: boolean; reactions: Record<string, string> }> {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');

    const res = await apiFetch(`/api/messages/${messageId}/reaction`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ emoji }),
      cache: 'no-store',
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data.error || 'Failed to update reaction');
    }

    return data;
  },

  async editMessage(messageId: string, text: string) {
    const token = ApiService.getToken();
    const res = await apiFetch(`/api/messages/${messageId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ text }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to edit message');
    return data.message;
  },

  async deleteMessage(messageId: string) {
    const token = ApiService.getToken();
    const res = await apiFetch(`/api/messages/${messageId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to delete message');
    return res.json();
  },

  async togglePin(messageId: string) {
    const token = ApiService.getToken();
    const res = await apiFetch(`/api/messages/${messageId}/pin`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  async getChatBackground(): Promise<{
    backgroundType: 'preset' | 'image';
    backgroundValue: string;
    updatedAt: number;
    updatedBy?: string | null;
  }> {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await apiFetch('/api/chat/background', {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await readApiJson<any>(res);
    if (!res.ok) throw new Error(apiErrorFromResponse(data, res.status));
    return {
      backgroundType: data?.backgroundType === 'image' ? 'image' : 'preset',
      backgroundValue: String(data?.backgroundValue || 'stars'),
      updatedAt: Number(data?.updatedAt || 0),
      updatedBy: data?.updatedBy || null,
    };
  },

  async setChatBackgroundPreset(backgroundId: string) {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await apiFetch('/api/chat/background/preset', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ backgroundId }),
      cache: 'no-store',
    });
    const data = await readApiJson<any>(res);
    if (!res.ok) throw new Error(apiErrorFromResponse(data, res.status));
    return data;
  },

  async uploadChatBackground(file: File) {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');
    // Send the image as raw bytes. The Worker handles this route before its
    // JSON/urlencoded parsers, so desktop and mobile browsers use the same
    // binary upload path without multipart parsing.
    const res = await apiFetch('/api/chat/background/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        // Keep the transport content type binary so every browser/mobile
        // WebView treats the payload as raw bytes. The real image MIME type
        // is sent separately for storage metadata.
        'Content-Type': 'application/octet-stream',
        'X-Synax-Content-Type': file.type || 'application/octet-stream',
        'X-Synax-File-Name': encodeURIComponent(file.name || 'chat-background'),
      },
      body: file,
      cache: 'no-store',
    });
    const data = await readApiJson<any>(res);
    if (!res.ok) throw new Error(apiErrorFromResponse(data, res.status));
    return data;
  },

  async removeChatBackground() {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');
    const res = await apiFetch('/api/chat/background', {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    const data = await readApiJson<any>(res);
    if (!res.ok) throw new Error(apiErrorFromResponse(data, res.status));
    return data;
  },

  async uploadFile(
    file: File | Blob,
    originalName?: string,
    onProgress?: (progress: number) => void,
  ): Promise<{ fileUrl: string; fileName: string; fileSize: number }> {
    const token = ApiService.getToken();
    if (!token) throw new Error('Not authenticated');
    const fileName = originalName || (file as File).name || 'upload.bin';

    // Images and videos use resumable chunked uploads. Sending them as one raw
    // body makes Cloudflare buffer the full file, which can exhaust Worker/mobile
    // memory and makes large photos fail. Chunks are sent serially, never in parallel.
    if (onProgress && (isVideoFile(file, fileName) || isImageFile(file, fileName))) {
      const kind = isVideoFile(file, fileName) ? 'video' : 'image';
      return await uploadResumableMedia(file, fileName, onProgress, kind);
    }

    if (onProgress) {
      return await new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open('POST', '/api/upload', true);
        xhr.timeout = 120_000;
        xhr.setRequestHeader('Authorization', `Bearer ${token}`);
        xhr.setRequestHeader('Content-Type', file.type || 'application/octet-stream');
        xhr.setRequestHeader('X-Synax-File-Name', encodeURIComponent(fileName));
        xhr.responseType = 'json';
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            onProgress(Math.max(0, Math.min(100, (event.loaded / event.total) * 100)));
          }
        };
        xhr.onerror = () => reject(new Error('Network error while uploading media.'));
        xhr.ontimeout = () => reject(new Error('Media upload timed out.'));
        xhr.onload = () => {
          const data: any = xhr.response && typeof xhr.response === 'object'
            ? xhr.response
            : (() => {
                try { return JSON.parse(xhr.responseText || '{}'); } catch { return {}; }
              })();
          if (xhr.status >= 200 && xhr.status < 300) {
            onProgress(100);
            resolve(data);
          } else {
            reject(new Error(data?.error || `File upload failed (HTTP ${xhr.status})`));
          }
        };
        xhr.send(file);
      });
    }

    const res = await apiFetch('/api/upload', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': file.type || 'application/octet-stream',
        'X-Synax-File-Name': encodeURIComponent(fileName),
      },
      body: file,
      cache: 'no-store',
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'File upload failed');
    return data;
  },

  // ==========================================
  // Admin Service Methods
  // ==========================================
  async adminGetUsers(): Promise<UserProfile[]> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load admin users');
    const data = await res.json();
    return [data.users.person_1, data.users.person_2];
  },

  async adminGetSettings(): Promise<AppSettings> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/overview', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error('Failed to load admin settings');
    const data = await res.json();
    return data.settings;
  },

  async adminGetAuditLogs(): Promise<ActivityLog[]> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/logs', {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.logs || [];
  },

  async adminGetMessages(): Promise<ChatMessage[]> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/messages', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to load admin messages');
    const data = await res.json();
    return data.messages || [];
  },

  async adminGetSessions(): Promise<any[]> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/sessions', { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to load admin sessions');
    const data = await res.json();
    return data.sessions || [];
  },

  async adminUpdateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/settings', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(settings),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update settings');
    return data.settings;
  },

  async adminUpdateUser(userId: 'person_1' | 'person_2', data: any) {
    const token = ApiService.getAdminToken();
    const payload: any = {};
    payload[userId] = data;

    const res = await apiFetch('/api/admin/users', {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    const resData = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(
        resData.error || resData.message || 'Failed to update user'
      );
    }

    // If locked status changed
    if (data.isLocked !== undefined) {
      await apiFetch(`/api/admin/user/${userId}/lock`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isLocked: data.isLocked, lockReason: data.lockReason }),
      });
    }

    return resData;
  },

  async adminAdjustUserTime(
    userId: 'person_1' | 'person_2',
    options: { setMinutes?: number; addMinutes?: number; resetSession?: boolean }
  ): Promise<TimeStatus> {
    const token = ApiService.getAdminToken();
    const res = await apiFetch(`/api/admin/user/${userId}/reset-time`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(options),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(
        data.error || data.message || 'Failed to adjust user time'
      );
    }
    return data.timeStatus;
  },

  async adminSetTimeLimit(
    userId: 'person_1' | 'person_2',
    minutes: number
  ): Promise<TimeStatus> {
    return ApiService.adminAdjustUserTime(userId, {
      setMinutes: minutes,
    });
  },

  async adminAddTime(
    userId: 'person_1' | 'person_2',
    minutes: number
  ): Promise<TimeStatus> {
    return ApiService.adminAdjustUserTime(userId, {
      addMinutes: minutes,
    });
  },

  async adminRemoveTime(
    userId: 'person_1' | 'person_2',
    minutes: number
  ): Promise<TimeStatus> {
    return ApiService.adminAdjustUserTime(userId, {
      addMinutes: -Math.abs(minutes),
    });
  },

  async adminResetUserUsage(
    userId: 'person_1' | 'person_2'
  ): Promise<TimeStatus> {
    return ApiService.adminAdjustUserTime(userId, {
      resetSession: true,
    });
  },

  async adminGrantExtraTime(minutes: number): Promise<TimeStatus> {
    const first = await ApiService.adminAddTime('person_1', minutes);
    const second = await ApiService.adminAddTime('person_2', minutes);
    return second || first;
  },

  async adminResetTimeUsage(): Promise<TimeStatus> {
    const first = await ApiService.adminResetUserUsage('person_1');
    const second = await ApiService.adminResetUserUsage('person_2');
    return second || first;
  },

  async adminClearMessages() {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/messages/clear', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    return res.json();
  },

  async adminUpdatePassword(currentPassword: string, newPassword: string) {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/change-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Failed to update administrator password');
    return data;
  },

  async adminResetDefaults() {
    const token = ApiService.getAdminToken();
    const res = await apiFetch('/api/admin/reset-defaults', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || data.message || 'Factory reset failed');
    return data;
  },
};
