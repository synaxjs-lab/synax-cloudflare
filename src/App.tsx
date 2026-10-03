import React, { useState, useEffect } from 'react';
import { AnimatePresence } from 'motion/react';
import { CosmicBackground } from './components/CosmicBackground';
import { CinematicIntro } from './components/CinematicIntro';
import { IdentitySelect } from './components/IdentitySelect';
import { PasswordModal } from './components/PasswordModal';
import { ChatRoom } from './components/ChatRoom';
import { AdminPanel } from './components/AdminPanel';
import { AdminLoginModal } from './components/AdminLoginModal';
import { UserProfileModal } from './components/UserProfileModal';
import { CallModal, ActiveCallState } from './components/CallModal';
import { UserProfile, AppSettings, TimeStatus, ChatMessage } from './types';
import { ApiService } from './services/api';
import { socketService } from './services/socket';
import { ServerClock } from './services/clock';
import { SoundEffects } from './services/sound';
import { Loader2 } from 'lucide-react';

const createCallId = () => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
  } catch {}
  return `call_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
};

export default function App() {
  const [viewState, setViewState] = useState<'loading' | 'intro' | 'select' | 'password' | 'chat' | 'admin'>('loading');
  const [selectedUserId, setSelectedUserId] = useState<'person_1' | 'person_2' | null>(null);
  const [activeSide, setActiveSide] = useState<'left' | 'right' | 'both' | null>('both');

  // Entities
  const [person1, setPerson1] = useState<UserProfile | null>(null);
  const [person2, setPerson2] = useState<UserProfile | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [timeStatus, setTimeStatus] = useState<TimeStatus | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [initError, setInitError] = useState<string | null>(null);

  // Modals
  const [showAdminLogin, setShowAdminLogin] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  // Initial Load
  useEffect(() => {
    const initApp = async () => {
      try {
        setInitError(null);
        const storedToken = localStorage.getItem('synax_user_token');

        // Load the public config and existing authenticated session in parallel.
        // This removes an unnecessary waterfall on mobile without trusting a
        // stale local session as valid.
        const configPromise = ApiService.getConfig();

        if (storedToken) {
          try {
            const [config, meRes] = await Promise.all([configPromise, ApiService.getMe()]);

            setPerson1(config.person1);
            setPerson2(config.person2);
            setSettings(meRes.settings || config.settings);
            setTimeStatus(meRes.timeStatus || config.timeStatus);
            setCurrentUser(meRes.user);

            if (meRes.user.id === 'person_1') {
              setPerson1(meRes.user);
              if (meRes.otherUser) setPerson2(meRes.otherUser);
            } else {
              setPerson2(meRes.user);
              if (meRes.otherUser) setPerson1(meRes.otherUser);
            }

            // Enter chat as soon as authentication is confirmed. ChatRoom loads
            // message history in the background after realtime listeners exist.
            socketService.connect(storedToken);
            setMessages([]);
            setViewState('chat');
            return;
          } catch (e) {
            localStorage.removeItem('synax_user_token');
          }
        }

        const config = await configPromise;
        setPerson1(config.person1);
        setPerson2(config.person2);
        setSettings(config.settings);
        setTimeStatus(config.timeStatus);

        const introSeen = sessionStorage.getItem('synax_intro_seen');
        setViewState(introSeen === 'true' ? 'select' : 'intro');
      } catch (err) {
        console.error('Failed to initialize Synax:', err);
        setInitError(err instanceof Error ? err.message : 'Failed to connect to the SYNAX backend.');
        setViewState('select');
      }
    };

    initApp();
  }, []);

  // Global WebSocket event listeners (Time ticks, incoming calls, locks)
  useEffect(() => {
    const unsubTime = socketService.on('time:tick', (data) => {
      if (!data.timeStatus) return;

      // A device should only render its own authoritative countdown.
      if (data.userId && currentUser?.id && data.userId !== currentUser.id) {
        return;
      }

      ServerClock.sync(data.timeStatus.serverTimestamp);
      setTimeStatus({
        ...data.timeStatus,
        remainingSeconds: Math.max(
          0,
          Math.floor(Number(data.timeStatus.remainingSeconds) || 0)
        ),
      });
    });

    const handleIncomingCall = (data: any) => {
      if (!currentUser || viewState !== 'chat') return;

      const targetId = data.targetId;
      if (targetId && targetId !== currentUser.id) return;

      const callId = typeof data.callId === 'string' && data.callId ? data.callId : null;
      if (!callId) return;

      const createdAt = data._signalCreatedAt ? Date.parse(data._signalCreatedAt) : Date.now();
      if (Number.isFinite(createdAt) && Date.now() - createdAt > 60_000) return;

      const fromUserId = data.fromUserId || data.callerId;
      const other = fromUserId === 'person_1' ? person1 : person2;
      const offerSdp = data.sdp;

      setActiveCall((previous) => {
        if (previous && previous.status !== 'ended') {
          // Ignore duplicate delivery of the same offer.
          if (previous.callId === callId) return previous;
          // Do not stack two simultaneous calls in the same modal.
          return previous;
        }

        return {
          callId,
          role: 'callee',
          status: 'ringing',
          callType: data.callType === 'video' ? 'video' : 'voice',
          otherUserId: fromUserId || (currentUser.id === 'person_1' ? 'person_2' : 'person_1'),
          otherUserName: other?.name || other?.nickname || 'Sanctuary Partner',
          otherUserPfp: other?.pfpUrl || '',
          offerSdp,
        };
      });

      // Rare fallback: an event without SDP can recover the offer directly from
      // the shared call mailbox before the user presses Accept.
      if (!offerSdp) {
        void socketService.getCallOffer(callId).then((offer) => {
          if (!offer?.sdp) return;
          setActiveCall((previous) =>
            previous?.callId === callId
              ? { ...previous, offerSdp: offer.sdp, callType: offer.callType === 'video' ? 'video' : previous.callType }
              : previous
          );
        });
      }
    };

    // Call signaling is delivered by SocketService's shared authenticated call mailbox.
    const unsubIncomingCall = socketService.on('call:incoming', handleIncomingCall);

    const unsubCallEnd = socketService.on('call:end', (data) => {
      setActiveCall((prev) => {
        if (!prev || (data.callId && data.callId !== prev.callId)) return prev;
        return { ...prev, status: 'ended' };
      });
      window.setTimeout(() => setActiveCall((prev) => (prev?.status === 'ended' ? null : prev)), 1200);
    });

    const unsubCallReject = socketService.on('call:reject', (data) => {
      setActiveCall((prev) => {
        if (!prev || (data.callId && data.callId !== prev.callId)) return prev;
        return { ...prev, status: 'ended' };
      });
      window.setTimeout(() => setActiveCall((prev) => (prev?.status === 'ended' ? null : prev)), 1200);
    });

    const unsubSettings = socketService.on('settings:updated', (data) => {
      if (data.settings) {
        setSettings(data.settings);
      }
    });

    const unsubLockout = socketService.on('session:lockout', (data) => {
      // User was locked out or emergency lockdown initiated
      if (viewState === 'chat') {
        alert(data.reason || 'Sanctuary session terminated by Administrator');
        handleLogout();
      }
    });

    return () => {
      unsubTime();
      unsubIncomingCall();
      unsubCallEnd();
      unsubCallReject();
      unsubSettings();
      unsubLockout();
    };
  }, [currentUser, person1, person2, viewState]);

  // Handlers
  const handleIntroComplete = () => {
    sessionStorage.setItem('synax_intro_seen', 'true');
    setViewState('select');
  };

  const handleSelectUser = (userId: 'person_1' | 'person_2') => {
    SoundEffects.playAtmosphereChime();
    setSelectedUserId(userId);
    setViewState('password');
  };

  const handlePasswordSubmit = async (password: string) => {
    if (!selectedUserId) return;
    const loginRes = await ApiService.login(selectedUserId, password);
    setCurrentUser(loginRes.user);

    if (loginRes.user.id === 'person_1') {
      setPerson1(loginRes.user);
      if (loginRes.otherUser) setPerson2(loginRes.otherUser);
    } else {
      setPerson2(loginRes.user);
      if (loginRes.otherUser) setPerson1(loginRes.otherUser);
    }

    setSettings(loginRes.settings);
    setTimeStatus(loginRes.timeStatus);

    // Connect WebSocket and enter the chat immediately. ChatRoom performs the
    // initial message reconciliation in the background so a slow history request
    // can never make the opening screen feel frozen.
    socketService.connect(loginRes.token);
    setMessages([]);

    SoundEffects.playSent();
    setViewState('chat');
  };

  const handleLogout = async () => {
    await ApiService.logout();
    socketService.disconnect();
    setCurrentUser(null);
    setSelectedUserId(null);
    setViewState('select');
  };

  const handleStartCall = async (callType: 'voice' | 'video') => {
    const other = currentUser?.id === 'person_1' ? person2 : person1;
    if (!other || !currentUser) return;

    // Get the local media stream from the original button gesture. Mobile browsers
    // are much more reliable when microphone/camera permission is requested here.
    let localStream: MediaStream | undefined;
    try {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callType === 'video',
        });
      } catch (err) {
        if (callType === 'video') {
          localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } else {
          throw err;
        }
      }
    } catch (err: any) {
      setActiveCall({
        callId: createCallId(),
        role: 'caller',
        status: 'ended',
        callType,
        otherUserId: other.id,
        otherUserName: other.name,
        otherUserPfp: other.pfpUrl,
        initialError: err?.message || 'Microphone/camera permission was denied.',
      });
      return;
    }

    setActiveCall({
      callId: createCallId(),
      role: 'caller',
      status: 'calling',
      callType,
      otherUserId: other.id,
      otherUserName: other.name,
      otherUserPfp: other.pfpUrl,
      localStream,
    });
  };

  if (viewState === 'loading' || !person1 || !person2) {
    if (initError && !person1 && !person2) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black text-white p-6">
        <div className="max-w-xl w-full rounded-2xl border border-red-500/30 bg-white/5 p-6 backdrop-blur">
          <h1 className="text-xl font-semibold mb-2">SYNAX could not connect</h1>
          <p className="text-white/70 mb-4">The Cloudflare Worker returned an error while loading the sanctuary.</p>
          <pre className="text-sm whitespace-pre-wrap break-words rounded-lg bg-black/50 p-4 text-red-200">{initError}</pre>
          <button className="mt-4 px-4 py-2 rounded-lg bg-white text-black" onClick={() => window.location.reload()}>Retry</button>
        </div>
      </div>
    );
  }

  return (
      <div className="fixed inset-0 bg-[#03050a] flex flex-col items-center justify-center text-slate-100 select-none">
        <CosmicBackground theme={settings?.theme || 'celestial'} />
        <div className="relative z-10 flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border border-indigo-400/30 flex items-center justify-center bg-slate-950/70 backdrop-blur-xl shadow-[0_0_30px_rgba(99,102,241,0.35)]">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-300" />
            </div>
            <div className="absolute -inset-2.5 rounded-full border border-indigo-400/15 animate-pulse pointer-events-none" />
          </div>
          <div className="text-center space-y-1.5">
            <h2 className="text-base font-bold uppercase tracking-anime-wide font-cinzel text-transparent bg-clip-text bg-gradient-to-b from-white via-indigo-100 to-indigo-300 text-shadow-anime-glow">
              SYNAX
            </h2>
            <p className="text-[11px] uppercase tracking-anime-pill font-sans-celestial text-slate-400 font-light text-shadow-subtle">
              Where Two Worlds Meet
            </p>
          </div>
        </div>
      </div>
    );
  }

  const otherUser = currentUser?.id === 'person_1' ? person2 : person1;
  const selectedUser = selectedUserId === 'person_1' ? person1 : person2;

  return (
    <div className="min-h-screen bg-[#03050a] text-slate-100 font-sans-celestial antialiased selection:bg-indigo-500/30 selection:text-indigo-200 overflow-hidden">
      {/* Dynamic Cosmic Universe Background Canvas. It is intentionally disabled
          inside the chat because ChatRoom already renders its own static/shared
          background; this removes a full-screen RAF loop while messaging. */}
      {viewState !== 'chat' && (
        <CosmicBackground
        theme={settings?.theme || 'celestial'}
        activeSide={
          viewState === 'password'
            ? selectedUserId === 'person_1'
              ? 'left'
              : 'right'
            : activeSide
        }
        />
      )}

      {/* Main View Router */}
        <AnimatePresence mode="wait">
        {/* VIEW 1: CINEMATIC TWO-PERSON OPENING ANIMATION */}
        {viewState === 'intro' && (
          <CinematicIntro
            key="cinematic-intro"
            person1={{ name: person1.name, logo: person1.logo }}
            person2={{ name: person2.name, logo: person2.logo }}
            worldTitle={settings?.worldTitle || 'SYNAX'}
            worldSubtitle={settings?.worldSubtitle || 'Where Two Worlds Meet.'}
            onComplete={handleIntroComplete}
          />
        )}

        {/* VIEW 2: USER SELECTION SCREEN */}
        {viewState === 'select' && (
          <IdentitySelect
            key="identity-select"
            person1={person1 as any}
            person2={person2 as any}
            worldTitle={settings?.worldTitle || 'SYNAX'}
            worldSubtitle={settings?.worldSubtitle || 'Where Two Worlds Meet.'}
            onSelect={handleSelectUser}
            onOpenAdmin={() => setShowAdminLogin(true)}
            onReplayIntro={() => setViewState('intro')}
            onHoverRealm={setActiveSide}
          />
        )}

        {/* VIEW 3: PASSWORD SCREEN */}
        {viewState === 'password' && selectedUser && (
          <PasswordModal
            key="password-modal"
            userId={selectedUser.id as any}
            name={selectedUser.name}
            username={selectedUser.username}
            logo={selectedUser.logo}
            onSubmit={handlePasswordSubmit}
            onBack={() => {
              setActiveSide('both');
              setViewState('select');
            }}
          />
        )}

        {/* VIEW 4: MAIN SYNAX SANCTUARY CHAT UI */}
        {viewState === 'chat' && currentUser && otherUser && settings && (
          <ChatRoom
            key="chat-room"
            currentUser={currentUser}
            otherUser={otherUser}
            initialMessages={messages}
            settings={settings}
            timeStatus={timeStatus}
            onLogout={handleLogout}
            onOpenProfile={() => setShowProfileModal(true)}
            onStartCall={handleStartCall}
          />
        )}

        {/* VIEW 5: PROTECTED ADMIN PANEL */}
        {viewState === 'admin' && (
          <AdminPanel
            key="admin-panel"
            onExit={() => {
              ApiService.adminLogout();
              setViewState('select');
            }}
          />
        )}
        </AnimatePresence>

      {/* MODAL: ADMIN MASTER LOGIN */}
      <AdminLoginModal
        isOpen={showAdminLogin}
        onClose={() => setShowAdminLogin(false)}
        onSuccess={() => {
          setShowAdminLogin(false);
          setViewState('admin');
        }}
      />

      {/* MODAL: USER PFP & PROFILE SETTINGS */}
      <AnimatePresence>
        {showProfileModal && currentUser && (
          <UserProfileModal
            user={currentUser}
            onClose={() => setShowProfileModal(false)}
            onProfileUpdated={(updated) => {
              setCurrentUser(updated);
              if (updated.id === 'person_1') setPerson1(updated);
              else setPerson2(updated);
            }}
          />
        )}
      </AnimatePresence>

      {/* MODAL: WEBRTC CALLING INTERFACE */}
      <AnimatePresence>
        {activeCall && (
          <CallModal
            callState={activeCall}
            onClose={() => setActiveCall(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
