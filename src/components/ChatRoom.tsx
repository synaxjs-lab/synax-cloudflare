import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  UserProfile,
  ChatMessage,
  AppSettings,
  TimeStatus,
} from '../types';
import { MessageItem } from './MessageItem';
import { MessageComposer } from './MessageComposer';
import { TimeRemainingPill } from './TimeBanner';
import { LogoMark } from './LogoMark';
import {
  Phone,
  Video,
  Search,
  Pin,
  Settings,
  Palette,
  LogOut,
  UserCircle,
  Bell,
  SlidersHorizontal,
  X,
  ImagePlus,
  Upload,
  Check,
  MoreHorizontal,
} from 'lucide-react';
import { ApiService } from '../services/api';
import { socketService } from '../services/socket';
import { SoundEffects } from '../services/sound';
import { ServerClock } from '../services/clock';


const LiveTimePill = React.memo(({ timeStatus }: { timeStatus: TimeStatus | null }) => {
  const [secondsLeft, setSecondsLeft] = useState(timeStatus?.remainingSeconds ?? 0);
  const [expired, setExpired] = useState(Boolean(timeStatus?.isExpired));

  useEffect(() => {
    setSecondsLeft(Math.max(0, Number(timeStatus?.remainingSeconds || 0)));
    setExpired(Boolean(timeStatus?.isExpired));
  }, [timeStatus?.remainingSeconds, timeStatus?.isExpired, timeStatus?.serverTimestamp]);

  useEffect(() => {
    if (!timeStatus || timeStatus.isExpired) return;
    const tick = () => {
      const elapsed = Math.max(0, Math.floor((ServerClock.now() - Number(timeStatus.serverTimestamp || ServerClock.now())) / 1000));
      const next = Math.max(0, Number(timeStatus.remainingSeconds || 0) - elapsed);
      setSecondsLeft((previous) => previous === next ? previous : next);
      setExpired(next <= 0);
    };
    tick();
    const interval = window.setInterval(tick, 1000);
    return () => window.clearInterval(interval);
  }, [timeStatus]);

  if (!timeStatus) return null;
  return (
    <TimeRemainingPill
      secondsLeft={secondsLeft}
      isExpired={expired}
    />
  );
});

function mergeChatMessages(current: ChatMessage[], incoming: ChatMessage[]): ChatMessage[] {
  const records = new Map<string, ChatMessage>();
  const idToKey = new Map<string, string>();
  const clientToKey = new Map<string, string>();
  const statusRank: Record<ChatMessage['status'], number> = { sent: 0, delivered: 1, read: 2 };

  const add = (message: ChatMessage) => {
    const id = String(message.id || '');
    const clientId = String(message.clientMessageId || '').trim();
    const existingKey = (id && idToKey.get(id)) || (clientId && clientToKey.get(clientId));
    const key = existingKey || `message:${clientId || id || `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
    const previous = records.get(key);

    if (!previous) {
      records.set(key, message);
    } else {
      const previousRank = statusRank[previous.status] ?? 0;
      const incomingRank = statusRank[message.status] ?? 0;
      records.set(key, {
        ...previous,
        ...message,
        status: incomingRank >= previousRank ? message.status : previous.status,
        clientMessageId: previous.clientMessageId || message.clientMessageId,
      });
    }

    if (id) idToKey.set(id, key);
    if (clientId) clientToKey.set(clientId, key);
  };

  current.forEach(add);
  incoming.forEach(add);
  return Array.from(records.values()).sort((a, b) => Number(a.timestamp) - Number(b.timestamp));
}

function normalizeUiTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (value <= 0) return 0;
    return value < 100_000_000_000 ? Math.round(value * 1000) : Math.round(value);
  }
  if (typeof value === 'string') {
    const v = value.trim();
    if (!v) return 0;
    if (/^\d+(?:\.\d+)?$/.test(v)) {
      const n = Number(v);
      if (!Number.isFinite(n) || n <= 0) return 0;
      return n < 100_000_000_000 ? Math.round(n * 1000) : Math.round(n);
    }
    const parsed = Date.parse(v);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return 0;
}

interface ChatRoomProps {
  currentUser: UserProfile;
  otherUser: UserProfile;
  initialMessages: ChatMessage[];
  settings: AppSettings;
  timeStatus: TimeStatus | null;
  onLogout: () => void;
  onOpenProfile: () => void;
  onStartCall: (callType: 'voice' | 'video') => void;
}

const CHAT_BACKGROUNDS: Array<{
  id: string;
  label: string;
  backgroundImage: string;
  backgroundColor: string;
}> = [
  {
    id: 'stars',
    label: 'Starfield',
    backgroundImage: 'radial-gradient(circle at 18% 18%, rgba(129,140,248,.22) 0 1px, transparent 1.5px), radial-gradient(circle at 82% 28%, rgba(244,114,182,.20) 0 1px, transparent 1.5px), radial-gradient(circle at 62% 78%, rgba(45,212,191,.14) 0 1px, transparent 1.5px), linear-gradient(135deg, #020617 0%, #0f172a 48%, #1e1b4b 100%)',
    backgroundColor: '#020617',
  },
  {
    id: 'nebula',
    label: 'Nebula',
    backgroundImage: 'radial-gradient(circle at 20% 20%, rgba(99,102,241,.42), transparent 32%), radial-gradient(circle at 80% 25%, rgba(217,70,239,.30), transparent 30%), radial-gradient(circle at 55% 80%, rgba(59,130,246,.24), transparent 34%), linear-gradient(135deg, #050816, #15102b 52%, #070b19)',
    backgroundColor: '#050816',
  },
  {
    id: 'aurora',
    label: 'Aurora',
    backgroundImage: 'radial-gradient(circle at 28% 18%, rgba(34,211,238,.24), transparent 30%), radial-gradient(circle at 70% 28%, rgba(16,185,129,.20), transparent 32%), linear-gradient(135deg, #020617 0%, #052e36 48%, #0f172a 100%)',
    backgroundColor: '#020617',
  },
  {
    id: 'twilight',
    label: 'Twilight',
    backgroundImage: 'linear-gradient(135deg, #080b18 0%, #1e1b4b 42%, #3b0764 100%)',
    backgroundColor: '#080b18',
  },
  {
    id: 'midnight',
    label: 'Midnight',
    backgroundImage: 'linear-gradient(145deg, #020308 0%, #0b1020 50%, #111827 100%)',
    backgroundColor: '#020308',
  },
  {
    id: 'crimson',
    label: 'Crimson',
    backgroundImage: 'radial-gradient(circle at 78% 18%, rgba(244,63,94,.20), transparent 28%), linear-gradient(135deg, #07040a 0%, #24070f 56%, #180d24 100%)',
    backgroundColor: '#07040a',
  },
];


type SharedChatBackground = {
  backgroundType: 'preset' | 'image';
  backgroundValue: string;
  updatedAt: number;
  updatedBy?: string | null;
};

const DEFAULT_SHARED_BACKGROUND: SharedChatBackground = {
  backgroundType: 'preset',
  backgroundValue: 'stars',
  updatedAt: 0,
  updatedBy: null,
};

async function optimizeChatBackgroundImage(file: File): Promise<File> {
  // Small modern images do not need another encode pass. Larger phone photos
  // are resized before upload so opening the chat never requires decoding a
  // 6K/8K camera image as the live CSS background.
  if (file.size <= 1.5 * 1024 * 1024) return file;

  try {
    const bitmap = await createImageBitmap(file);
    const maxDimension = 1920;
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) {
      bitmap.close();
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/jpeg', 0.82);
    });
    if (!blob) return file;

    return new File([blob], `synax-background-${Date.now()}.jpg`, {
      type: 'image/jpeg',
      lastModified: Date.now(),
    });
  } catch {
    // Some browsers do not expose createImageBitmap for every phone image
    // format. In that case the original validated file remains usable.
    return file;
  }
}

interface ChatBackgroundPickerProps {
  current: SharedChatBackground;
  uploading: boolean;
  onChoosePreset: (id: string) => void;
  onChoosePhoto: (file: File) => void;
  onRemove: () => void;
  onClose: () => void;
}

const ChatBackgroundPicker: React.FC<ChatBackgroundPickerProps> = ({
  current,
  uploading,
  onChoosePreset,
  onChoosePhoto,
  onRemove,
  onClose,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div
      className="fixed inset-0 z-[80] flex items-end md:items-center justify-center bg-black/65 backdrop-blur-sm p-0 md:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Shared chat background"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="w-full md:max-w-xl max-h-[88dvh] overflow-y-auto rounded-t-[28px] md:rounded-3xl border border-slate-700/80 bg-slate-950 shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-800 bg-slate-950/95 px-5 py-4 backdrop-blur-xl">
          <div className="min-w-0">
            <h3 className="text-base font-semibold text-white">Chat Background</h3>
            <p className="mt-0.5 text-xs text-slate-400">Shared for both people in this chat</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-w-11 min-h-11 rounded-2xl bg-slate-900 border border-slate-800 text-slate-300 flex items-center justify-center"
            aria-label="Close chat background settings"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-white">Choose a background</p>
                <p className="text-xs text-slate-500">Preset backgrounds sync instantly.</p>
              </div>
              {current.backgroundType === 'image' && <span className="text-xs text-emerald-400">Custom photo</span>}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {CHAT_BACKGROUNDS.map((background) => {
                const selected = current.backgroundType === 'preset' && current.backgroundValue === background.id;
                return (
                  <button
                    key={background.id}
                    type="button"
                    onClick={() => onChoosePreset(background.id)}
                    disabled={uploading}
                    className={`group overflow-hidden rounded-2xl border p-1.5 text-left transition ${selected ? 'border-indigo-400 ring-2 ring-indigo-400/30' : 'border-slate-700 hover:border-slate-500'} disabled:opacity-60`}
                    aria-pressed={selected}
                    aria-label={`Use ${background.label}`}
                  >
                    <span
                      className="relative block h-20 sm:h-24 rounded-xl overflow-hidden"
                      style={{ backgroundColor: background.backgroundColor, backgroundImage: background.backgroundImage }}
                    >
                      {selected && (
                        <span className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-full bg-indigo-500 text-white shadow-lg">
                          <Check className="w-4 h-4" />
                        </span>
                      )}
                    </span>
                    <span className="mt-2 block px-1 pb-1 text-xs font-medium text-slate-300">{background.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/50 p-4">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="w-full min-h-14 rounded-2xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-white font-semibold flex items-center justify-center gap-3"
            >
              {uploading ? <Upload className="w-5 h-5 animate-pulse" /> : <ImagePlus className="w-5 h-5" />}
              <span>{uploading ? 'Uploading photo…' : 'Choose photo from phone / device'}</span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) onChoosePhoto(file);
                event.target.value = '';
              }}
            />
            <p className="mt-2 text-center text-[11px] text-slate-500">JPG, PNG or WebP • up to 10 MB</p>
          </div>

          <button
            type="button"
            onClick={onRemove}
            disabled={uploading || (current.backgroundType === 'preset' && current.backgroundValue === 'stars')}
            className="w-full min-h-12 rounded-2xl border border-slate-700 bg-slate-900 text-slate-300 disabled:opacity-40"
          >
            Reset to default Starfield
          </button>
        </div>
      </div>
    </div>
  );
};

export const ChatRoom: React.FC<ChatRoomProps> = ({
  currentUser,
  otherUser,
  initialMessages,
  settings,
  timeStatus,
  onLogout,
  onOpenProfile,
  onStartCall,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages || []);
  const [renderLimit, setRenderLimit] = useState(240);
  const [otherPresence, setOtherPresence] = useState<{ isOnline: boolean; lastSeen: number }>({
    isOnline: false,
    // Never substitute the current time here. Until the authoritative realtime
    // snapshot arrives, the correct value is unknown rather than "now".
    lastSeen: normalizeUiTimestamp(otherUser.lastActiveTimestamp),
  });
  const [isOtherTyping, setIsOtherTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [replyingTo, setReplyingTo] = useState<ChatMessage | null>(null);
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);
  const [highlightedMessageId, setHighlightedMessageId] = useState<string | null>(null);
  const [isBackgroundPickerOpen, setIsBackgroundPickerOpen] = useState(false);
  const [isBackgroundUploading, setIsBackgroundUploading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [sharedBackground, setSharedBackground] = useState<SharedChatBackground>(() => ({
    ...DEFAULT_SHARED_BACKGROUND,
    backgroundValue: settings.chatWallpaper || 'stars',
  }));


  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const headerRef = useRef<HTMLElement | null>(null);
  const composerShellRef = useRef<HTMLDivElement | null>(null);
  const composerInputRef = useRef<HTMLTextAreaElement | null>(null);
  const chatActiveRef = useRef(false);
  const highlightTimerRef = useRef<number | null>(null);
  const initialHistoryLoadedRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>(initialMessages || []);
  const [freshMessageIds, setFreshMessageIds] = useState<Set<string>>(() => new Set());
  const freshMessageTimersRef = useRef<Map<string, number>>(new Map());
  const searchQueryRef = useRef('');
  const receiptSyncTimerRef = useRef<number | null>(null);
  const visibleReadTimerRef = useRef<number | null>(null);
  messagesRef.current = messages;
  searchQueryRef.current = searchQuery;


  const markFreshMessage = useCallback((messageId: string) => {
    if (!messageId) return;
    setFreshMessageIds((previous) => {
      const next = new Set(previous);
      next.add(String(messageId));
      return next;
    });
    const oldTimer = freshMessageTimersRef.current.get(String(messageId));
    if (oldTimer !== undefined) window.clearTimeout(oldTimer);
    const timer = window.setTimeout(() => {
      freshMessageTimersRef.current.delete(String(messageId));
      setFreshMessageIds((previous) => {
        if (!previous.has(String(messageId))) return previous;
        const next = new Set(previous);
        next.delete(String(messageId));
        return next;
      });
    }, 240);
    freshMessageTimersRef.current.set(String(messageId), timer);
  }, []);


  const selectedChatBackground = CHAT_BACKGROUNDS.find((item) => item.id === sharedBackground.backgroundValue) || CHAT_BACKGROUNDS[0];
  const isCustomBackground = sharedBackground.backgroundType === 'image' && /^https?:\/\//i.test(sharedBackground.backgroundValue);

  // Keep the scroll viewport measured from the real header/composer heights.
  // This removes brittle phone-specific padding values when the keyboard,
  // safe-area, search field, or action sheet changes the layout.
  useEffect(() => {
    const room = document.getElementById('synax-chat-room');
    const header = headerRef.current;
    const composer = composerShellRef.current;
    if (!room || !header || !composer) return;

    const updateLayoutMetrics = () => {
      room.style.setProperty('--synax-header-height', `${header.getBoundingClientRect().height}px`);
      room.style.setProperty('--synax-composer-height', `${composer.getBoundingClientRect().height}px`);
    };

    updateLayoutMetrics();
    const observer = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateLayoutMetrics) : null;
    observer?.observe(header);
    observer?.observe(composer);
    window.addEventListener('resize', updateLayoutMetrics);

    return () => {
      observer?.disconnect();
      window.removeEventListener('resize', updateLayoutMetrics);
    };
  }, [isSearching, replyingTo, isSettingsOpen]);

  // Background loading is intentionally non-blocking. A slow image/API request
  // must never delay entering the chat or message rendering.
  useEffect(() => {
    let cancelled = false;
    void ApiService.getChatBackground()
      .then((background) => {
        if (!cancelled) setSharedBackground(background);
      })
      .catch((error) => {
        console.warn('Shared chat background unavailable; using default:', error);
      });
    return () => { cancelled = true; };
  }, [currentUser.id]);

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messagesEndRef.current?.scrollIntoView({
      behavior,
      block: 'end',
    });
  };

  // Read receipts are tied to messages that are genuinely visible in the
  // SYNAX viewport, rather than marking the entire history read merely because
  // the tab became visible. A single batch keeps the network traffic small.
  const markVisibleUnreadMessages = useCallback(() => {
    if (document.visibilityState !== 'visible' || !document.hasFocus()) return;
    const container = messagesContainerRef.current;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const visibleIds: string[] = [];
    const messageById = new Map<string, ChatMessage>();
    messagesRef.current.forEach((message) => messageById.set(String(message.id), message));

    container.querySelectorAll<HTMLElement>('[data-message-id]').forEach((element) => {
      const id = element.dataset.messageId;
      if (!id) return;
      const message = messageById.get(id);
      if (!message || message.senderId !== otherUser.id || message.status === 'read') return;

      const rect = element.getBoundingClientRect();
      const overlapHeight = Math.max(0, Math.min(rect.bottom, containerRect.bottom) - Math.max(rect.top, containerRect.top));
      const visibleRatio = rect.height > 0 ? overlapHeight / rect.height : 0;
      if (visibleRatio >= 0.55) visibleIds.push(id);
    });

    if (!visibleIds.length) return;
    const uniqueIds = Array.from(new Set(visibleIds));
    const realtimeAccepted = socketService.sendMarkRead(uniqueIds);
    // Fall back to HTTP only when the authenticated realtime socket cannot
    // accept the read event. This avoids a duplicate request for every batch.
    if (!realtimeAccepted) void ApiService.markMessagesAsRead(uniqueIds);
  }, [otherUser.id]);

  const scheduleVisibleReadCheck = useCallback(() => {
    if (visibleReadTimerRef.current !== null) window.clearTimeout(visibleReadTimerRef.current);
    visibleReadTimerRef.current = window.setTimeout(() => {
      visibleReadTimerRef.current = null;
      markVisibleUnreadMessages();
    }, 80);
  }, [markVisibleUnreadMessages]);

  // ONLINE means this SYNAX tab is actually visible. DELIVERY
  // uses the independent authenticated WebSocket and therefore can remain
  // available while SYNAX is backgrounded. READ is only granted when active.
  useEffect(() => {
    let usageHeartbeat: number | null = null;

    const syncChatActivity = () => {
      const active = document.visibilityState === 'visible';
      chatActiveRef.current = active;

      // This flag controls ONLINE/presence in the Durable Object.
      socketService.setChatActive(active);

      // Preserve the original timer accounting: visible + focused SYNAX chat
      // periodically checkpoints active usage in Supabase. This is separate
      // from online/delivered state, which comes from the WebSocket.
      void ApiService.setChatPresence(active);

      if (usageHeartbeat !== null) {
        window.clearInterval(usageHeartbeat);
        usageHeartbeat = null;
      }
      if (active) {
        usageHeartbeat = window.setInterval(() => {
          if (document.visibilityState === 'visible') {
            void ApiService.setChatPresence(true);
          }
        }, 4000);
      }

      if (active) scheduleVisibleReadCheck();
    };

    syncChatActivity();
    socketService.requestPresence();
    document.addEventListener('visibilitychange', syncChatActivity);

    const markInactiveForLifecycle = () => {
      chatActiveRef.current = false;
      // Tell the realtime hub immediately. This is what makes the partner
      // switch from Online/blue-read to Offline without a refresh.
      socketService.setChatActive(false);
      void ApiService.setChatPresence(false);
    };

    const handlePageShow = () => {
      // BFCache restores do not remount React. Re-announce the current state
      // so the partner gets the correct Online/last-seen value immediately.
      syncChatActivity();
      socketService.requestPresence();
    };

    const handleBeforeUnload = () => {
      // Closing the browser/tab is different from simply switching away.
      // Explicitly closing the socket makes the DO observe the disconnect
      // quickly instead of waiting for a network timeout.
      chatActiveRef.current = false;
      socketService.closeForPageExit();
      void ApiService.setChatPresence(false);
    };

    window.addEventListener('pagehide', markInactiveForLifecycle);
    window.addEventListener('pageshow', handlePageShow);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('freeze', markInactiveForLifecycle as EventListener);

    return () => {
      markInactiveForLifecycle();
      if (usageHeartbeat !== null) window.clearInterval(usageHeartbeat);
      if (visibleReadTimerRef.current !== null) {
        window.clearTimeout(visibleReadTimerRef.current);
        visibleReadTimerRef.current = null;
      }
      document.removeEventListener('visibilitychange', syncChatActivity);
      window.removeEventListener('pagehide', markInactiveForLifecycle);
      window.removeEventListener('pageshow', handlePageShow);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('freeze', markInactiveForLifecycle as EventListener);
    };
  }, [currentUser.id, scheduleVisibleReadCheck]);

  useEffect(() => {
    scrollToBottom('auto');
    scheduleVisibleReadCheck();
  }, [scheduleVisibleReadCheck]);

  // Follow the latest message only when the user is already at the bottom.
  // Use an instant scroll so mobile never gets the laggy animation.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const distanceFromBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight;

    if (distanceFromBottom < 180) {
      requestAnimationFrame(() => {
        const el = messagesContainerRef.current;
        if (el) el.scrollTop = el.scrollHeight;
      });
    }
  }, [messages.length, isOtherTyping]);

  // Live presence reconciliation fallback. WebSocket updates are the fast path,
  // but this tiny endpoint makes presence self-healing without a page refresh.
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let timer: number | null = null;

    const syncPresence = async () => {
      if (stopped || inFlight || socketService.isConnected()) return;
      inFlight = true;
      try {
        const other = await ApiService.getPresenceState();
        if (stopped || !other || other.id !== otherUser.id) return;
        setOtherPresence((previous) => ({
          isOnline: other.isOnline,
          lastSeen: normalizeUiTimestamp(other.lastSeen) || previous.lastSeen || 0,
        }));
      } finally {
        inFlight = false;
      }
    };

    const immediate = () => { void syncPresence(); };
    void syncPresence();
    timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') void syncPresence();
    }, 10000);
    document.addEventListener('visibilitychange', immediate);
    window.addEventListener('focus', immediate);
    window.addEventListener('pageshow', immediate);

    return () => {
      stopped = true;
      if (timer !== null) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', immediate);
      window.removeEventListener('focus', immediate);
      window.removeEventListener('pageshow', immediate);
    };
  }, [currentUser.id, otherUser.id]);

  // Lightweight authoritative receipt reconciliation. WebSocket events remain
  // the fast path; this small status-only request repairs a missed event without
  // repeatedly downloading the full message history.
  useEffect(() => {
    let stopped = false;
    let inFlight = false;

    const reconcileReceipts = async () => {
      if (stopped || inFlight || document.visibilityState !== 'visible') return;
      const hasPendingReceipts = messagesRef.current.some(
        (message) => message.senderId === currentUser.id && message.status !== 'read'
      );
      if (!hasPendingReceipts) return;

      inFlight = true;
      try {
        const receipts = await ApiService.getMessageReceipts();
        if (stopped || !receipts.length) return;
        const statusRank: Record<ChatMessage['status'], number> = { sent: 0, delivered: 1, read: 2 };
        const receiptMap = new Map(receipts.map((receipt) => [String(receipt.id), receipt.status]));
        setMessages((prev) => prev.map((message) => {
          if (message.senderId !== currentUser.id) return message;
          const nextStatus = receiptMap.get(String(message.id));
          if (!nextStatus) return message;
          return (statusRank[nextStatus] ?? 0) > (statusRank[message.status] ?? 0)
            ? { ...message, status: nextStatus }
            : message;
        }));
      } finally {
        inFlight = false;
      }
    };

    void reconcileReceipts();
    receiptSyncTimerRef.current = window.setInterval(() => { void reconcileReceipts(); }, 10000);

    return () => {
      stopped = true;
      if (receiptSyncTimerRef.current !== null) {
        window.clearInterval(receiptSyncTimerRef.current);
        receiptSyncTimerRef.current = null;
      }
    };
  }, [currentUser.id, otherUser.id]);

  useEffect(() => () => {
    if (visibleReadTimerRef.current !== null) window.clearTimeout(visibleReadTimerRef.current);
    for (const timer of freshMessageTimersRef.current.values()) window.clearTimeout(timer);
    freshMessageTimersRef.current.clear();
    if (receiptSyncTimerRef.current !== null) window.clearInterval(receiptSyncTimerRef.current);
  }, []);

  // Real-time WebSocket Listeners
  useEffect(() => {
    const unsubMsg = socketService.on('chat:new_message', (data) => {
      if (!data.message) return;
      markFreshMessage(String(data.message.id));
      setMessages((prev) => mergeChatMessages(prev, [data.message]));

      // Delivery and read are intentionally different states. The realtime
      // layer marks a message DELIVERED when the recipient has a live socket.
      // READ is granted only after the individual message is visible in SYNAX.
      if (data.message.senderId === otherUser.id) {
        if (chatActiveRef.current) {
          window.setTimeout(() => SoundEffects.playReceived(), 0);
          scheduleVisibleReadCheck();
        }
      }
    });

    const unsubRead = socketService.on('chat:messages_read', (data) => {
      if (data.readerId !== otherUser.id) return;
      const ids = new Set(
        Array.isArray(data.messageIds) ? data.messageIds.map((id: unknown) => String(id)) : []
      );
      setMessages((prev) => prev.map((m) => {
        if (m.senderId !== currentUser.id) return m;
        if (ids.size && !ids.has(String(m.id))) return m;
        return { ...m, status: 'read' };
      }));
    });

    const unsubDelivered = socketService.on('chat:messages_delivered', (data) => {
      if (data.recipientId !== otherUser.id) return;

      setMessages((prev) =>
        prev.map((m) => {
          if (m.senderId !== currentUser.id || m.status !== 'sent') return m;
          if (data.messageId && m.id !== data.messageId) return m;
          return { ...m, status: 'delivered' };
        })
      );
    });

    const unsubReaction = socketService.on('chat:reaction_update', (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, reactions: data.reactions } : m))
      );
    });

    const unsubEdit = socketService.on('chat:message_edited', (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, text: data.text, isEdited: true } : m
        )
      );
    });

    const unsubDelete = socketService.on('chat:message_deleted', (data) => {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === data.messageId ? { ...m, deleted: true, text: 'This message was deleted' } : m
        )
      );
    });

    const unsubPin = socketService.on('chat:message_pinned', (data) => {
      setMessages((prev) =>
        prev.map((m) => (m.id === data.messageId ? { ...m, isPinned: data.isPinned } : m))
      );
    });

    const unsubTyping = socketService.on('typing:update', (data) => {
      if (data.userId === otherUser.id) {
        setIsOtherTyping(!!data.isTyping);
      }
    });

    const unsubBackground = socketService.on('chat:background_updated', (data) => {
      const updatedAt = Number(data?.updatedAt || 0);
      setSharedBackground((previous) => {
        if (updatedAt && previous.updatedAt && updatedAt < previous.updatedAt) return previous;
        return {
          backgroundType: data?.backgroundType === 'image' ? 'image' : 'preset',
          backgroundValue: String(data?.backgroundValue || 'stars'),
          updatedAt,
          updatedBy: data?.updatedBy || null,
        };
      });
    });

    const unsubPresence = socketService.on('presence:update', (data) => {
      if (data?.userId && data.userId === otherUser.id) {
        setOtherPresence((previous) => ({
          isOnline: Boolean(data.isOnline),
          // A missing timestamp is not "now". Keep the last authoritative
          // value we already know, preventing a fake current Last seen.
          lastSeen: normalizeUiTimestamp(data.lastSeen) || previous.lastSeen || 0,
        }));
        return;
      }
      if (data?.presence) {
        const isOnline = otherUser.id === 'person_1' ? Boolean(data.presence.person_1) : Boolean(data.presence.person_2);
        const incomingLastSeen = otherUser.id === 'person_1'
          ? normalizeUiTimestamp(data.presence.lastSeen_1)
          : normalizeUiTimestamp(data.presence.lastSeen_2);
        setOtherPresence((previous) => ({
          isOnline,
          lastSeen: incomingLastSeen || previous.lastSeen || 0,
        }));
      }
    });

    const unsubCleared = socketService.on('chat:history_cleared', () => {
      setMessages([
        {
          id: `msg_clr_${Date.now()}`,
          senderId: 'system',
          type: 'system',
          text: '✦ Chat history was cleared by the Administrator. A fresh chapter begins.',
          timestamp: Date.now(),
          status: 'read',
          reactions: {},
        },
      ]);
    });

    // Request a fresh snapshot after the listeners are registered. This also
    // covers the case where App connected the socket before ChatRoom mounted.
    socketService.requestPresence();

    // Important: ChatRoom's activity effect can run before these listeners are
    // attached. Re-send the current visible-tab state now so a newly opened
    // SYNAX tab both becomes ONLINE and gets READ receipts without a race.
    const visibleTab = document.visibilityState === 'visible';
    chatActiveRef.current = visibleTab;
    socketService.setChatActive(visibleTab);
    if (visibleTab) scheduleVisibleReadCheck();

    return () => {
      unsubMsg();
      unsubRead();
      unsubDelivered();
      unsubReaction();
      unsubEdit();
      unsubDelete();
      unsubPin();
      unsubTyping();
      unsubBackground();
      unsubPresence();
      unsubCleared();
    };
  }, [otherUser.id, currentUser.id, scheduleVisibleReadCheck]);

  // WebSocket is the normal realtime path. Reconcile immediately after connect,
  // when returning to the tab, and only poll while disconnected.
  useEffect(() => {
    let stopped = false;
    let inFlight = false;
    let interval: number | null = null;

    const refreshMessages = async () => {
      if (stopped || inFlight || document.visibilityState !== 'visible') return;
      inFlight = true;
      try {
        const latest = await ApiService.getMessages();
        if (!stopped) {
          const firstHistorySync = !initialHistoryLoadedRef.current;
          setMessages((prev) => mergeChatMessages(prev, latest));
          initialHistoryLoadedRef.current = true;
          if (firstHistorySync && latest.length > 0) {
            requestAnimationFrame(() => {
              const el = messagesContainerRef.current;
              if (el) el.scrollTop = el.scrollHeight;
            });
          }
        }
      } catch (err) {
        console.warn('SYNAX message reconciliation failed:', err);
      } finally {
        inFlight = false;
      }
    };

    const syncPolling = () => {
      if (interval !== null) {
        window.clearInterval(interval);
        interval = null;
      }
      if (!socketService.isConnected() && document.visibilityState === 'visible') {
        interval = window.setInterval(() => { void refreshMessages(); }, 2000);
      }
    };

    const unsubscribeOpen = socketService.on('connection:open', () => {
      socketService.requestPresence();
      socketService.setChatActive(chatActiveRef.current);
      if (chatActiveRef.current) scheduleVisibleReadCheck();
      void refreshMessages();
      syncPolling();
    });
    const unsubscribeClosed = socketService.on('connection:closed', () => {
      syncPolling();
      void refreshMessages();
    });
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        socketService.ensureRealtimeNow();
        void refreshMessages();
        scheduleVisibleReadCheck();
      }
      syncPolling();
    };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('online', handleVisibility);
    window.addEventListener('pageshow', handleVisibility);

    socketService.ensureRealtimeNow();
    void refreshMessages();
    syncPolling();

    return () => {
      stopped = true;
      if (interval !== null) window.clearInterval(interval);
      unsubscribeOpen();
      unsubscribeClosed();
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('online', handleVisibility);
      window.removeEventListener('pageshow', handleVisibility);
    };
  }, [currentUser.id, otherUser.id]);

  // Keep the browser clock aligned with the server-authoritative timer.
  useEffect(() => {
    if (!timeStatus) return;
    ServerClock.sync(timeStatus.serverTimestamp);
    const interval = window.setInterval(() => {
      void ApiService.getTimeStatus().then((latest) => {
        if (!latest) return;
        ServerClock.sync(latest.serverTimestamp);
      });
    }, 10000);
    return () => window.clearInterval(interval);
  }, [currentUser.id]);

  const jumpToMessage = useCallback(async (messageId: string) => {
    if (!messageId) return;

    const hadSearch = Boolean(searchQueryRef.current.trim());
    if (hadSearch) setSearchQuery('');

    const findTarget = () => document.getElementById(`msg-${messageId}`);
    const waitForPaint = () => new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });

    let target = findTarget();

    // First resolve from the messages we already have in memory. This makes a
    // reply tap work instantly even when the original is outside the current
    // render window or search results.
    if (!target) {
      const currentMessages = messagesRef.current;
      const localIndex = currentMessages.findIndex((message) => String(message.id) === String(messageId));
      if (localIndex >= 0) {
        setRenderLimit((current) => Math.max(current, currentMessages.length - localIndex));
        await waitForPaint();
        target = findTarget();
      }
    }

    // Fall back to the server only when the original is not in the current
    // client history (for example after a refresh/partial history load).
    if (!target) {
      try {
        const latest = await ApiService.getMessages();
        const merged = mergeChatMessages(messagesRef.current, latest);
        setMessages(merged);
        const targetIndex = merged.findIndex((message) => String(message.id) === String(messageId));
        if (targetIndex >= 0) {
          setRenderLimit((current) => Math.max(current, merged.length - targetIndex));
        }
      } catch (error) {
        console.warn('Unable to load reply target:', error);
      }
      await waitForPaint();
      target = findTarget();
    }

    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    setHighlightedMessageId(messageId);
    if (highlightTimerRef.current !== null) window.clearTimeout(highlightTimerRef.current);
    highlightTimerRef.current = window.setTimeout(() => {
      setHighlightedMessageId((current) => current === messageId ? null : current);
      highlightTimerRef.current = null;
    }, 1800);
  }, []);

  const handleReply = useCallback((message: ChatMessage) => {
    setReplyingTo(message);
    window.requestAnimationFrame(() => {
      composerInputRef.current?.focus();
      composerInputRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  }, []);

  // Message Send Handlers
  const handleSendMessage = async (payload: any) => {
    const clientMessageId = payload.clientMessageId || `client_${currentUser.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const reply = replyingTo
      ? {
          id: replyingTo.id,
          text: replyingTo.text || 'Attachment',
          senderName: replyingTo.senderId === currentUser.id ? 'You' : otherUser.name,
        }
      : undefined;

    const optimisticMessage: ChatMessage = {
      id: `pending_${clientMessageId}`,
      clientMessageId,
      senderId: currentUser.id,
      type: payload.type || 'text',
      text: payload.text || '',
      fileUrl: payload.fileUrl,
      fileName: payload.fileName,
      fileSize: payload.fileSize,
      audioDuration: payload.audioDuration,
      timestamp: ServerClock.now(),
      status: 'sent',
      reactions: {},
      replyTo: reply,
    };

    // Render immediately. The server response later replaces this message using
    // the same clientMessageId, so retries cannot produce a duplicate bubble.
    markFreshMessage(String(optimisticMessage.id));
    setMessages((prev) => mergeChatMessages(prev, [optimisticMessage]));
    setReplyingTo(null);
    window.setTimeout(() => SoundEffects.playSent(), 0);
    requestAnimationFrame(() => {
      const el = messagesContainerRef.current;
      if (el) el.scrollTop = el.scrollHeight;
    });

    try {
      // Fast path: an authenticated WebSocket sends directly to the Durable
      // Object. This removes the mobile browser's HTTP round-trip from the
      // normal message path. The optimistic bubble is already rendered above.
      // If the realtime socket is unavailable or its ack times out, fall back
      // immediately to the existing idempotent HTTP API with the same client ID.
      const realtimeMessage = await socketService.sendChatMessage({
        ...optimisticMessage,
        id: optimisticMessage.id,
        clientMessageId,
        replyTo: reply,
      });

      if (realtimeMessage) {
        setMessages((prev) => mergeChatMessages(prev, [realtimeMessage]));
        return;
      }

      const persisted = await ApiService.sendMessage({ ...payload, clientMessageId, replyTo: reply });
      setMessages((prev) => mergeChatMessages(prev, [persisted]));
    } catch (err: any) {
      // A network error can happen after the server has already accepted the
      // message. Re-read the canonical history once before removing the bubble,
      // so a successful server-side send is never made to disappear until refresh.
      let serverAccepted = false;
      try {
        const latest = await ApiService.getMessages();
        serverAccepted = latest.some((message) => String(message.clientMessageId || '') === clientMessageId);
        if (serverAccepted) {
          setMessages((prev) => mergeChatMessages(prev, latest));
          return;
        }
      } catch {}
      setMessages((prev) => prev.filter((message) => message.clientMessageId !== clientMessageId));
      console.error('Failed to send message:', err);
      throw err;
    }
  };
  const handleTyping = useCallback((isTyping: boolean) => {
    // Typing is ephemeral realtime state: never persist it in the database.
    // The WebSocket sends one start event per typing burst and one stop event
    // after the composer has been idle.
    socketService.sendTyping(Boolean(isTyping));
  }, []);

  const handleUpload = async (file: File | Blob, name?: string) => {
    return await ApiService.uploadFile(file, name);
  };

  const handleReact = useCallback(async (messageId: string, emoji: string) => {
    const current = messagesRef.current.find((message) => String(message.id) === String(messageId));
    if (!current) return;

    const previousReactions = { ...(current.reactions || {}) };
    const optimisticReactions = { ...previousReactions };
    if (optimisticReactions[currentUser.id] === emoji) delete optimisticReactions[currentUser.id];
    else optimisticReactions[currentUser.id] = emoji;

    // Reactions feel instant locally; the network request reconciles the result.
    setMessages((prev) => prev.map((message) =>
      String(message.id) === String(messageId)
        ? { ...message, reactions: optimisticReactions }
        : message
    ));

    try {
      const result = await ApiService.toggleReaction(messageId, emoji);
      if (result?.reactions && typeof result.reactions === 'object') {
        setMessages((prev) => prev.map((message) =>
          String(message.id) === String(messageId)
            ? { ...message, reactions: result.reactions }
            : message
        ));
      }
    } catch (err) {
      // Restore only this reaction if the authoritative request fails.
      setMessages((prev) => prev.map((message) =>
        String(message.id) === String(messageId)
          ? { ...message, reactions: previousReactions }
          : message
      ));
      console.error('Failed to update reaction:', err);
    }
  }, [currentUser.id]);

  const handlePin = useCallback(async (messageId: string) => {
    await ApiService.togglePin(messageId);
  }, []);

  const handleEdit = useCallback(async (messageId: string, text: string) => {
    await ApiService.editMessage(messageId, text);
  }, []);

  const handleDelete = useCallback(async (messageId: string) => {
    await ApiService.deleteMessage(messageId);
  }, []);

  const applyBackgroundResponse = (data: any) => {
    if (!data) return;
    setSharedBackground({
      backgroundType: data.backgroundType === 'image' ? 'image' : 'preset',
      backgroundValue: String(data.backgroundValue || 'stars'),
      updatedAt: Number(data.updatedAt || Date.now()),
      updatedBy: data.updatedBy || currentUser.id,
    });
  };

  const handleChooseBackgroundPreset = async (backgroundId: string) => {
    try {
      const result = await ApiService.setChatBackgroundPreset(backgroundId);
      applyBackgroundResponse(result);
      setIsBackgroundPickerOpen(false);
    } catch (error) {
      console.error('Failed to update shared chat background:', error);
      alert(error instanceof Error ? error.message : 'Unable to change chat background.');
    }
  };

  const handleChooseBackgroundPhoto = async (file: File) => {
    const inferredImage = /^image\//i.test(file.type) || /\.(jpe?g|png|webp|gif|avif|heic|heif)$/i.test(file.name);
    if (!inferredImage) {
      alert('Please choose an image file.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      alert('Please choose an image smaller than 10 MB.');
      return;
    }

    setIsBackgroundUploading(true);
    try {
      const optimizedFile = await optimizeChatBackgroundImage(file);
      const result = await ApiService.uploadChatBackground(optimizedFile);
      applyBackgroundResponse(result);
      setIsBackgroundPickerOpen(false);
    } catch (error) {
      console.error('Failed to upload shared chat background:', error);
      alert(error instanceof Error ? error.message : 'Unable to upload chat background.');
    } finally {
      setIsBackgroundUploading(false);
    }
  };

  const handleRemoveBackground = async () => {
    try {
      const result = await ApiService.removeChatBackground();
      applyBackgroundResponse(result);
    } catch (error) {
      console.error('Failed to reset shared chat background:', error);
      alert(error instanceof Error ? error.message : 'Unable to reset chat background.');
    }
  };

  // Keep the full history in memory for replies/search, but do not mount
  // thousands of MessageItem components at chat-open time. Normal chat view
  // renders the newest window and grows as the user scrolls upward. Search mode
  // intentionally renders all matches so existing search behavior is preserved.
  const filteredMessages = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return query
      ? messages.filter((m) => m.text?.toLowerCase().includes(query))
      : messages;
  }, [messages, searchQuery]);

  const displayedMessages = useMemo(() => {
    if (searchQuery.trim()) return filteredMessages;
    const start = Math.max(0, filteredMessages.length - renderLimit);
    return filteredMessages.slice(start);
  }, [filteredMessages, renderLimit, searchQuery]);

  // Keep read receipts tied to the actual viewport as messages mount, arrive,
  // or the user scrolls through the conversation.
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;
    const handleScroll = () => scheduleVisibleReadCheck();
    const handleFocus = () => scheduleVisibleReadCheck();
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('focus', handleFocus);
    scheduleVisibleReadCheck();
    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('focus', handleFocus);
    };
  }, [displayedMessages.length, renderLimit, searchQuery, scheduleVisibleReadCheck]);

  const hasOlderMessages = !searchQuery.trim() && filteredMessages.length > renderLimit;

  const pinnedMessage = useMemo(
    () => messages.find((m) => m.isPinned && !m.deleted),
    [messages]
  );

  const formatLastSeen = (timestamp: number) => {
    const normalized = normalizeUiTimestamp(timestamp);
    if (!normalized) return 'Offline';
    const d = new Date(normalized);
    if (Number.isNaN(d.getTime())) return 'Offline';
    return `Last seen ${d.toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })}`;
  };

  const handleMessagesScroll = useCallback(() => {
    if (searchQuery.trim()) return;
    const container = messagesContainerRef.current;
    if (!container || container.scrollTop > 100 || renderLimit >= filteredMessages.length) return;

    const previousHeight = container.scrollHeight;
    const previousTop = container.scrollTop;
    const nextLimit = Math.min(filteredMessages.length, renderLimit + 240);
    setRenderLimit(nextLimit);

    requestAnimationFrame(() => {
      const next = messagesContainerRef.current;
      if (!next) return;
      const addedHeight = next.scrollHeight - previousHeight;
      next.scrollTop = previousTop + Math.max(0, addedHeight);
    });
  }, [filteredMessages.length, renderLimit, searchQuery]);


  return (
    <div
      id="synax-chat-room"
      className="fixed inset-0 z-10 w-full h-[100dvh] overflow-hidden bg-[#04060c] text-slate-100 select-none"
    >
      {/* Compact header: identity first, secondary actions live in Settings. */}
      <header
        ref={headerRef}
        className="absolute inset-x-0 top-0 z-40 w-full bg-slate-950/96 border-b border-slate-800/80 backdrop-blur-lg"
        style={{ paddingTop: 'env(safe-area-inset-top)' }}
      >
        <div className="flex min-w-0 items-center gap-3 px-3 py-2.5 sm:px-4 md:px-5 md:py-3">
          <div className="relative w-10 h-10 sm:w-11 sm:h-11 rounded-full overflow-hidden border-2 border-indigo-500/50 shrink-0">
            <img
              src={otherUser.pfpUrl || ''}
              alt={otherUser.name}
              className="block w-full h-full object-cover object-center"
              onError={(e) => {
                const img = e.currentTarget;
                img.style.display = 'none';
                const fallback = img.nextElementSibling as HTMLElement | null;
                if (fallback) fallback.style.display = 'flex';
              }}
            />
            <div
              className="absolute inset-0 hidden items-center justify-center bg-slate-900 text-indigo-200 font-semibold text-sm"
              aria-hidden="true"
            >
              {(otherUser.nickname || otherUser.name || '?').charAt(0).toUpperCase()}
            </div>
            <span
              className={`absolute bottom-0 right-0 w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full border-2 border-slate-950 ${
                otherPresence.isOnline ? 'bg-emerald-500' : 'bg-slate-500'
              }`}
            />
          </div>

          <div className="min-w-0 flex-1 leading-tight">
            <div className="flex min-w-0 items-center gap-1.5">
              <h2 className="min-w-0 truncate text-[15px] sm:text-base font-bold text-white font-cinzel">
                {otherUser.nickname || otherUser.name}
              </h2>
              <LogoMark
                logo={otherUser.logo}
                size="sm"
                glow={false}
                className="opacity-70 shrink-0 scale-90"
              />
            </div>
            <p className="mt-0.5 truncate text-[11px] sm:text-xs">
              {isOtherTyping ? (
                <span className="inline-flex items-center gap-1 text-indigo-300" aria-label="Typing">
                  <span>typing</span>
                  <span className="synax-typing-dots" aria-hidden="true">
                    <span className="synax-typing-dot" />
                    <span className="synax-typing-dot" />
                    <span className="synax-typing-dot" />
                  </span>
                </span>
              ) : otherPresence.isOnline ? (
                <span className="text-emerald-400">Online</span>
              ) : (
                <span className="text-slate-400">{formatLastSeen(otherPresence.lastSeen)}</span>
              )}
            </p>
          </div>

          {/* The session timer is part of the compact header on every device. */}
          {(settings as AppSettings & { showTimerToUsers?: boolean }).showTimerToUsers !== false && timeStatus && (
            <div className="shrink-0 max-w-[94px] sm:max-w-none">
              <LiveTimePill timeStatus={timeStatus} />
            </div>
          )}

          <button
            type="button"
            onClick={() => setIsSettingsOpen((value) => !value)}
            className="shrink-0 inline-flex min-h-10 min-w-10 sm:min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-700/90 bg-slate-900/95 px-2.5 sm:px-3 text-slate-200 shadow-sm transition hover:border-slate-600 hover:bg-slate-800 active:scale-[0.98]"
            aria-label="Open chat settings"
            aria-expanded={isSettingsOpen}
            title="Settings"
          >
            <Settings className="h-[18px] w-[18px]" />
            <span className="hidden md:inline text-xs font-semibold">Settings</span>
          </button>

          <button
            type="button"
            onClick={onLogout}
            className="shrink-0 inline-flex min-h-10 min-w-10 sm:min-w-11 items-center justify-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-2.5 sm:px-3 text-red-300 shadow-sm transition hover:border-red-500/50 hover:bg-red-500/15 active:scale-[0.98]"
            aria-label="Log out of SYNAX"
            title="Log out"
          >
            <LogOut className="h-[18px] w-[18px]" />
            <span className="hidden md:inline text-xs font-semibold">Log out</span>
          </button>
        </div>
      </header>

      {/* Search is a temporary utility strip; it is not part of the permanent header. */}
      {isSearching && (
        <div
          className="absolute inset-x-0 top-0 z-[45] border-b border-slate-800/80 bg-slate-950/98 px-3 py-2.5 shadow-lg backdrop-blur-lg sm:px-4 md:px-5"
          style={{ paddingTop: 'calc(env(safe-area-inset-top) + 0.625rem)' }}
        >
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 shrink-0 text-slate-400" />
            <input
              autoFocus
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search messages…"
              className="min-w-0 flex-1 h-11 rounded-xl border border-slate-800 bg-slate-900 px-3 text-[16px] text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/70"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="min-h-11 px-3 rounded-xl text-xs font-semibold text-slate-300 bg-slate-900 border border-slate-800"
              >
                Clear
              </button>
            )}
            <button
              type="button"
              onClick={() => { setIsSearching(false); setSearchQuery(''); }}
              className="min-h-11 min-w-11 rounded-xl border border-slate-800 bg-slate-900 text-slate-300"
              aria-label="Close message search"
            >
              <X className="mx-auto h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Settings menu: desktop dropdown, mobile bottom sheet. */}
      {isSettingsOpen && (
        <div
          className="fixed inset-0 z-[70]"
          role="dialog"
          aria-modal="true"
          aria-label="SYNAX chat settings"
          onClick={() => setIsSettingsOpen(false)}
        >
          <div className="absolute inset-0 bg-black/55 md:bg-black/35" />
          <div
            className="absolute inset-x-0 bottom-0 md:inset-x-auto md:right-3 md:top-[calc(env(safe-area-inset-top)+5rem)] md:bottom-auto md:w-[min(360px,calc(100vw-24px))] rounded-t-[28px] md:rounded-2xl border border-slate-700/80 bg-slate-950/98 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:pb-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-700 md:hidden" />
            <div className="flex items-start justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">Chat Settings</p>
                <p className="mt-0.5 text-[11px] text-slate-500 truncate">
                  {otherUser.nickname || otherUser.name} · {otherPresence.isOnline ? 'Online' : 'Offline'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="min-h-10 min-w-10 rounded-xl border border-slate-800 bg-slate-900 text-slate-300"
                aria-label="Close settings"
              >
                <X className="mx-auto h-4 w-4" />
              </button>
            </div>

            <div className="mt-3 space-y-2">
              <button
                type="button"
                onClick={() => { setIsSettingsOpen(false); onOpenProfile(); }}
                className="w-full min-h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 flex items-center gap-3 text-left hover:bg-slate-800"
              >
                <UserCircle className="h-5 w-5 text-indigo-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">Profile settings</span>
                  <span className="block text-[11px] text-slate-500">Profile photo, name and account details</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setIsSettingsOpen(false);
                  setIsSearching(true);
                  setSearchQuery('');
                }}
                className="w-full min-h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 flex items-center gap-3 text-left hover:bg-slate-800"
              >
                <Search className="h-5 w-5 text-cyan-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">Search messages</span>
                  <span className="block text-[11px] text-slate-500">Find a message without cluttering the header</span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => { setIsSettingsOpen(false); setIsBackgroundPickerOpen(true); }}
                className="w-full min-h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 flex items-center gap-3 text-left hover:bg-slate-800"
              >
                <Palette className="h-5 w-5 text-fuchsia-300" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">Theme & chat background</span>
                  <span className="block text-[11px] text-slate-500">Shared background · current app theme: {settings.theme}</span>
                </span>
              </button>

              {settings.featuresEnabled.voiceCalls && (
                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); onStartCall('voice'); }}
                  disabled={!!(timeStatus?.isExpired && settings.restrictionsOnExpire.disableVoiceCalls)}
                  className="w-full min-h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 flex items-center gap-3 text-left hover:bg-slate-800 disabled:opacity-40"
                >
                  <Phone className="h-5 w-5 text-indigo-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">Voice call</span>
                    <span className="block text-[11px] text-slate-500">Start a voice call with {otherUser.name}</span>
                  </span>
                </button>
              )}

              {settings.featuresEnabled.videoCalls && (
                <button
                  type="button"
                  onClick={() => { setIsSettingsOpen(false); onStartCall('video'); }}
                  disabled={!!(timeStatus?.isExpired && settings.restrictionsOnExpire.disableVideoCalls)}
                  className="w-full min-h-12 rounded-xl border border-slate-800 bg-slate-900/90 px-3 flex items-center gap-3 text-left hover:bg-slate-800 disabled:opacity-40"
                >
                  <Video className="h-5 w-5 text-pink-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold text-white">Video call</span>
                    <span className="block text-[11px] text-slate-500">Start a video call with {otherUser.name}</span>
                  </span>
                </button>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <div className="min-h-12 rounded-xl border border-slate-800/90 bg-slate-900/60 px-3 flex items-center gap-2">
                  <Bell className="h-4 w-4 text-amber-300 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-200">Notifications</span>
                    <span className="block text-[10px] text-slate-500 truncate">Browser/device controls</span>
                  </div>
                </div>
                <div className="min-h-12 rounded-xl border border-slate-800/90 bg-slate-900/60 px-3 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4 text-slate-300 shrink-0" />
                  <div className="min-w-0">
                    <span className="block text-xs font-semibold text-slate-200">Chat options</span>
                    <span className="block text-[10px] text-slate-500 truncate">Files, replies & reactions</span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => { setIsSettingsOpen(false); onLogout(); }}
                className="mt-1 w-full min-h-12 rounded-xl border border-red-500/20 bg-red-500/10 px-3 flex items-center gap-3 text-left text-red-300 hover:bg-red-500/15"
              >
                <LogOut className="h-5 w-5" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold">Log out of SYNAX</span>
                  <span className="block text-[11px] text-red-300/60">End this session on this device</span>
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {isBackgroundPickerOpen && (
        <ChatBackgroundPicker
          current={sharedBackground}
          uploading={isBackgroundUploading}
          onChoosePreset={handleChooseBackgroundPreset}
          onChoosePhoto={(file) => { void handleChooseBackgroundPhoto(file); }}
          onRemove={() => { void handleRemoveBackground(); }}
          onClose={() => setIsBackgroundPickerOpen(false)}
        />
      )}

      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 z-0"
        style={
          isCustomBackground
            ? {
                backgroundColor: '#03050a',
                backgroundImage: `linear-gradient(rgba(3,5,15,0.48), rgba(3,5,15,0.48)), url("${sharedBackground.backgroundValue.replace(/"/g, '%22')}")`,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
            : {
                backgroundColor: selectedChatBackground.backgroundColor,
                backgroundImage: selectedChatBackground.backgroundImage,
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }
        }
      />

      <div aria-hidden="true" className="pointer-events-none fixed inset-0 z-[1] bg-black/10" />

      {/* Only this area scrolls */}
      <main
        ref={messagesContainerRef}
        onScroll={handleMessagesScroll}
        className="synax-chat-scroll-area absolute inset-0 z-10 min-h-0 px-2 sm:px-4"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: 'pan-y',
          pointerEvents: 'auto',
          overscrollBehavior: 'contain',
          paddingTop: `calc(var(--synax-header-height, 68px) + ${isSearching ? '64px' : '8px'})`,
          paddingBottom: 'calc(var(--synax-composer-height, 92px) + env(safe-area-inset-bottom) + 12px)',
        }}
      >
        {pinnedMessage && (
          <div className="w-full bg-slate-950 border-b border-indigo-500/20 px-3 py-2 flex items-center justify-between text-[10px] sm:text-xs text-indigo-200">
            <div className="flex min-w-0 items-center gap-2 truncate">
              <Pin className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
              <span className="font-semibold text-slate-300 shrink-0">Pinned:</span>
              <span className="truncate italic">"{pinnedMessage.text}"</span>
            </div>
            <button
              type="button"
              onClick={() => handlePin(pinnedMessage.id)}
              className="text-[11px] text-slate-400 shrink-0 ml-2"
            >
              Unpin
            </button>
          </div>
        )}

        <div className="min-h-full pb-2">
          {/* Smaller mobile welcome card */}
          <div className="w-full max-w-lg mx-auto mt-2 mb-4 sm:my-6 px-4 py-3 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-950/75 border border-slate-800/80 text-center shadow-xl">
            <div className="flex items-center justify-center gap-2.5 sm:gap-4 mb-2 sm:mb-3">
              <LogoMark logo={currentUser.logo} size="sm" glow={true} />
              <span className="text-indigo-400 text-xs">✦</span>
              <LogoMark logo={otherUser.logo} size="sm" glow={true} />
            </div>

            <h3 className="text-base sm:text-lg font-bold text-white font-cinzel tracking-anime-title mb-1">
              {settings.worldTitle || 'SYNAX'}
            </h3>

            <p className="text-[10px] sm:text-xs leading-relaxed text-slate-300/80 italic">
              {settings.welcomeMessage ||
                'Welcome to your private sanctuary. Every conversation belongs solely to you two.'}
            </p>
          </div>

          {hasOlderMessages && (
            <button
              type="button"
              onClick={handleMessagesScroll}
              className="mx-auto mb-3 flex min-h-10 items-center justify-center rounded-full border border-slate-700 bg-slate-950/80 px-4 text-[11px] font-semibold text-slate-300"
            >
              Load older messages
            </button>
          )}

          {displayedMessages.map((msg) => {
            const sender =
              msg.senderId === currentUser.id
                ? currentUser
                : otherUser;

            return (
              <MessageItem
                key={msg.id}
                message={msg}
                currentUserId={currentUser.id}
                senderName={sender.name}
                senderPfp={
                  sender.pfpUrl ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=100'
                }
                onReact={handleReact}
                onReply={handleReply}
                onJumpToMessage={jumpToMessage}
                isHighlighted={highlightedMessageId === msg.id}
                onPin={handlePin}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onOpenImage={setLightboxImage}
                animateOnMount={freshMessageIds.has(String(msg.id))}
              />
            );
          })}

          {isOtherTyping && (
            <div className="flex items-center gap-2 px-2.5 sm:px-4 py-2 text-xs text-slate-400">
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0">
                <img
                  src={
                    otherUser.pfpUrl ||
                    'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=100'
                  }
                  alt={otherUser.name}
                  className="block w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-1 items-center px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800">
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
              </div>
            </div>
          )}

          <div ref={messagesEndRef} className="h-px" />
        </div>
      </main>

      {/* Fixed composer. Safe-area is filled with the same dark background, so no strip shows. */}
      <div
        ref={composerShellRef}
        className="fixed inset-x-0 bottom-0 z-50 w-full bg-slate-950"
        style={{
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        <MessageComposer
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          onUpload={handleUpload}
          isExpired={timeStatus?.isExpired}
          settings={settings}
          replyingTo={replyingTo}
          onCancelReply={() => setReplyingTo(null)}
          inputRef={composerInputRef}
        />
      </div>

      {lightboxImage && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/90"
          onClick={() => setLightboxImage(null)}
        >
          <img
            src={lightboxImage}
            alt="Preview"
            className="max-w-full max-h-[90vh] object-contain rounded-2xl"
          />
          <button
            type="button"
            onClick={() => setLightboxImage(null)}
            className="absolute top-6 right-6 p-2 rounded-full bg-slate-900 text-white"
            aria-label="Close preview"
          >
            <X className="w-6 h-6" />
          </button>
        </div>
      )}
    </div>
  );
};
