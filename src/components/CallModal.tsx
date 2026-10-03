import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import {
  Phone,
  PhoneOff,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Maximize2,
  Minimize2,
  AlertCircle,
  Volume2,
} from 'lucide-react';
import { WebRTCManager } from '../services/webrtc';
import { SoundEffects } from '../services/sound';
import { socketService } from '../services/socket';

export interface ActiveCallState {
  role: 'caller' | 'callee';
  status: 'calling' | 'ringing' | 'connecting' | 'connected' | 'ended';
  callType: 'voice' | 'video';
  otherUserId: string;
  otherUserName: string;
  otherUserPfp: string;
  callId: string;
  offerSdp?: RTCSessionDescriptionInit;
  localStream?: MediaStream;
  initialError?: string;
}

interface CallModalProps {
  callState: ActiveCallState;
  onClose: () => void;
}

export const CallModal: React.FC<CallModalProps> = ({ callState, onClose }) => {
  const [status, setStatus] = useState<ActiveCallState['status']>(callState.status);
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [callDuration, setCallDuration] = useState(0);
  const [connectionMessage, setConnectionMessage] = useState('Initializing WebRTC...');
  const [hasError, setHasError] = useState<string | null>(callState.initialError || null);
  const [audioBlocked, setAudioBlocked] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rtcRef = useRef<WebRTCManager | null>(null);
  const localStreamRef = useRef<MediaStream | null>(callState.localStream || null);
  const closeRef = useRef(onClose);
  const endedRef = useRef(false);

  closeRef.current = onClose;

  const displayOtherUserName = callState.otherUserName?.trim() || 'Unknown Caller';
  const displayOtherUserPfp = callState.otherUserPfp?.trim() || '';

  useEffect(() => {
    let stopRing: (() => void) | null = null;
    if (status === 'ringing') {
      stopRing = SoundEffects.startIncomingRing();
    } else if (status === 'calling' || status === 'connecting') {
      stopRing = SoundEffects.startOutgoingRing();
    }
    return () => stopRing?.();
  }, [status]);

  useEffect(() => {
    if (status !== 'connected') return;
    const timer = window.setInterval(() => setCallDuration((value) => value + 1), 1000);
    return () => window.clearInterval(timer);
  }, [status]);

  const finish = (message?: string, error?: string) => {
    if (endedRef.current) return;
    endedRef.current = true;
    if (message) setConnectionMessage(message);
    if (error) setHasError(error);
    setStatus('ended');
  };

  const endSignal = () => {
    void socketService.sendCallSignal({
      callId: callState.callId,
      type: 'call:end',
      callType: callState.callType,
    });
  };

  useEffect(() => {
    const rtc = new WebRTCManager();
    rtcRef.current = rtc;

    rtc.onIceCandidate = (candidate) => {
      void socketService.sendCallSignal({
        callId: callState.callId,
        type: 'call:ice-candidate',
        callType: callState.callType,
        candidate,
      });
    };

    rtc.onRemoteStream = (stream) => {
      if (callState.callType === 'video' && remoteVideoRef.current) {
        remoteVideoRef.current.srcObject = stream;
        void remoteVideoRef.current.play().catch(() => undefined);
      }

      if (remoteAudioRef.current) {
        const audio = remoteAudioRef.current;
        audio.srcObject = stream;
        audio.autoplay = true;
        audio.muted = false;
        audio.playsInline = true;
        void audio.play()
          .then(() => setAudioBlocked(false))
          .catch(() => setAudioBlocked(true));
      }
    };

    rtc.onConnectionState = (state) => {
      if (endedRef.current) return;
      if (state === 'connected') {
        setHasError(null);
        setStatus('connected');
        setConnectionMessage('Connected');
        return;
      }
      if (state === 'connecting' || state === 'new') {
        setStatus((current) => current === 'ringing' ? current : 'connecting');
        setConnectionMessage('Connecting securely…');
        return;
      }
      if (state === 'disconnected') {
        setConnectionMessage('Connection interrupted…');
        return;
      }
      if (state === 'failed') {
        endSignal();
        finish('Connection failed', 'The devices could not establish the WebRTC connection.');
        return;
      }
      if (state === 'closed') {
        if (status !== 'ended') finish('Call ended');
      }
    };

    const unsubAnswer = socketService.on('call:answer', async (data) => {
      if (data.callId !== callState.callId || !data.sdp) return;
      try {
        await rtc.handleAnswer(data.sdp);
      } catch (error) {
        console.error('SYNAX answer handling failed:', error);
        finish('Connection failed', 'The call answer could not be applied.');
      }
    });

    const unsubCandidate = socketService.on('call:ice-candidate', async (data) => {
      if (data.callId !== callState.callId || !data.candidate) return;
      await rtc.addIceCandidate(data.candidate);
    });

    const unsubReject = socketService.on('call:reject', (data) => {
      if (data.callId !== callState.callId) return;
      finish('Call was declined');
      window.setTimeout(() => closeRef.current(), 1200);
    });

    const unsubEnd = socketService.on('call:end', (data) => {
      if (data.callId !== callState.callId) return;
      finish('Call ended');
      window.setTimeout(() => closeRef.current(), 800);
    });

    const unsubError = socketService.on('call:error', (data) => {
      // Only react to errors while this call is active.
      if (endedRef.current) return;
      finish('Call failed', data?.error || 'SYNAX call signaling failed.');
      window.setTimeout(() => closeRef.current(), 1500);
    });

    const startCaller = async () => {
      try {
        setConnectionMessage('Creating secure connection…');
        const stream = localStreamRef.current;
        if (!stream) throw new Error('Microphone/camera stream is unavailable.');

        if (callState.callType === 'video' && localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        const offer = await rtc.createOffer(callState.callType, stream);
        const sent = await socketService.sendCallSignal({
          callId: callState.callId,
          type: 'call:offer',
          callType: callState.callType,
          sdp: offer,
        });

        if (!sent) throw new Error('The call offer could not be delivered.');
        setStatus('calling');
        setConnectionMessage('Ringing remote sanctuary...');
      } catch (error: any) {
        finish('Call failed', error?.message || 'Could not start the call.');
      }
    };

    if (callState.role === 'caller') void startCaller();

    return () => {
      unsubAnswer();
      unsubCandidate();
      unsubReject();
      unsubEnd();
      unsubError();
      rtc.cleanup();
    };
    // This component is one call session; do not recreate the peer connection on render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Caller timeout and callee ringing timeout.
  useEffect(() => {
    if (status === 'connected' || status === 'ended') return;
    const timeoutMs = status === 'ringing' ? 60_000 : status === 'connecting' ? 25_000 : 45_000;
    const timer = window.setTimeout(() => {
      endSignal();
      finish(status === 'ringing' ? 'Call expired' : 'Connection timed out', 'No WebRTC connection was established.');
      window.setTimeout(() => closeRef.current(), 1200);
    }, timeoutMs);
    return () => window.clearTimeout(timer);
  }, [status]);

  const handleAcceptCall = async () => {
    if (isAccepting || endedRef.current) return;
    setIsAccepting(true);
    try {
      let offerSdp = callState.offerSdp;
      if (!offerSdp) {
        setConnectionMessage('Recovering secure call offer…');
        for (let attempt = 0; attempt < 5 && !offerSdp; attempt++) {
          offerSdp = (await socketService.getCallOffer(callState.callId))?.sdp;
          if (!offerSdp) await new Promise((resolve) => window.setTimeout(resolve, 300));
        }
      }
      if (!offerSdp) throw new Error('The call offer is unavailable. Please start the call again.');

      setConnectionMessage('Accessing microphone…');
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: callState.callType === 'video',
        });
      } catch (error) {
        if (callState.callType === 'video') {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        } else {
          throw error;
        }
      }

      localStreamRef.current = stream;
      if (callState.callType === 'video' && localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }

      if (!rtcRef.current) throw new Error('WebRTC engine is not ready.');
      setConnectionMessage('Creating secure connection…');
      const answer = await rtcRef.current.handleOfferAndCreateAnswer(
        offerSdp,
        callState.callType,
        stream,
      );

      const sent = await socketService.sendCallSignal({
        callId: callState.callId,
        type: 'call:answer',
        callType: callState.callType,
        sdp: answer,
      });
      if (!sent) throw new Error('Your answer could not be delivered to the caller.');

      setStatus('connecting');
      setConnectionMessage('Connecting securely…');
    } catch (error: any) {
      console.error('SYNAX accept failed:', error);
      setHasError(error?.message || 'Microphone/camera permission failed.');
      setConnectionMessage('Call could not connect');
    } finally {
      setIsAccepting(false);
    }
  };

  const enableAudio = async () => {
    const audio = remoteAudioRef.current;
    if (!audio) return;
    audio.muted = false;
    audio.autoplay = true;
    audio.playsInline = true;
    try {
      await audio.play();
      setAudioBlocked(false);
    } catch {
      setAudioBlocked(true);
    }
  };

  const handleRejectCall = () => {
    void socketService.sendCallSignal({
      callId: callState.callId,
      type: 'call:reject',
      callType: callState.callType,
    });
    finish('Call declined');
    closeRef.current();
  };

  const handleEndCall = () => {
    endSignal();
    rtcRef.current?.cleanup();
    finish('Call ended');
    closeRef.current();
  };

  const toggleMute = () => {
    const next = !isMuted;
    setIsMuted(next);
    rtcRef.current?.toggleMute(next);
  };

  const toggleVideo = () => {
    const next = !isVideoOff;
    setIsVideoOff(next);
    rtcRef.current?.toggleCamera(next);
  };

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;
    if (!isFullscreen) {
      void container.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      void document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <motion.div
      ref={containerRef}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-2 sm:p-4 select-none backdrop-blur-lg"
    >
      <audio ref={remoteAudioRef} autoPlay playsInline />

      <div className="relative w-full max-w-4xl h-[88vh] max-h-[720px] sm:h-[85vh] rounded-3xl bg-slate-950 border border-slate-800 flex flex-col overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.9)]">
        <div className="absolute top-0 inset-x-0 z-30 p-4 sm:p-6 flex items-center justify-between bg-gradient-to-b from-black/80 to-transparent">
          <div className="flex items-center gap-3 min-w-0">
            <div className="min-w-0">
              <h3 className="text-sm font-bold text-white font-cinzel tracking-wider truncate">{displayOtherUserName}</h3>
              <p className="text-[11px] text-slate-400 font-mono truncate">
                {status === 'connected' ? `Duration: ${formatDuration(callDuration)}` : connectionMessage}
              </p>
            </div>
          </div>
          <button type="button" onClick={toggleFullscreen} className="p-2 rounded-full bg-slate-900/80 text-slate-300 hover:text-white border border-slate-800">
            {isFullscreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>

        <div className="relative flex-1 w-full h-full flex items-center justify-center bg-[#07090e] overflow-hidden">
          {callState.callType === 'video' ? (
            <>
              <video ref={remoteVideoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {status !== 'connected' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 gap-4">
                  <div className="relative">
                    <img
                      src={displayOtherUserPfp}
                      alt={displayOtherUserName}
                      className="w-24 h-24 rounded-full object-cover border-2 border-indigo-500 shadow-[0_0_40px_rgba(99,102,241,0.5)]"
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                    <div className="absolute -inset-2 rounded-full border border-indigo-500/40 animate-ping" />
                  </div>
                  <p className="text-sm text-slate-300 font-cinzel tracking-wider">{connectionMessage}</p>
                  {hasError && <p className="max-w-sm text-center text-xs text-red-300 px-4">{hasError}</p>}
                </div>
              )}
              <div className="absolute bottom-24 right-4 sm:right-6 w-32 sm:w-48 h-24 sm:h-36 rounded-2xl overflow-hidden border-2 border-slate-700 bg-slate-900 shadow-2xl z-20">
                <video ref={localVideoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                {isVideoOff && <div className="absolute inset-0 bg-slate-950 flex items-center justify-center text-xs text-slate-500">Camera Off</div>}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-6 text-center z-10 px-4">
              <div className="relative">
                <img
                  src={displayOtherUserPfp}
                  alt={displayOtherUserName}
                  className="w-32 h-32 rounded-full object-cover border-4 border-indigo-500/60 shadow-[0_0_60px_rgba(99,102,241,0.4)]"
                  onError={(e) => { e.currentTarget.style.display = 'none'; }}
                />
                <motion.div
                  animate={{ scale: [1, 1.25, 1], opacity: [0.3, 0.7, 0.3] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="absolute -inset-4 rounded-full border border-indigo-400/50 pointer-events-none"
                />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-white font-cinzel tracking-widest">{displayOtherUserName}</h2>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-400 font-mono mt-1">Private Voice Frequency</p>
                <p className="text-sm text-slate-300 mt-2 font-mono">{status === 'connected' ? formatDuration(callDuration) : connectionMessage}</p>
              </div>
              {hasError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-950/60 border border-red-500/40 text-red-200 text-xs max-w-md">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{hasError}</span>
                </div>
              )}
              {audioBlocked && (
                <button type="button" onClick={enableAudio} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold border border-indigo-400/40">
                  <Volume2 className="w-4 h-4" />
                  Enable Speaker Audio
                </button>
              )}
            </div>
          )}
        </div>

        <div className="absolute bottom-0 inset-x-0 z-30 p-4 sm:p-6 flex items-center justify-center gap-4 bg-gradient-to-t from-black/90 to-transparent">
          {callState.role === 'callee' && status === 'ringing' ? (
            <div className="flex items-center gap-6">
              <button type="button" onClick={handleRejectCall} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-[0_0_25px_rgba(239,68,68,0.5)] transition-all active:scale-95">
                <PhoneOff className="w-5 h-5" />
                <span>Decline</span>
              </button>
              <button type="button" onClick={handleAcceptCall} disabled={isAccepting} className="flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 disabled:cursor-wait text-white font-semibold text-sm shadow-[0_0_25px_rgba(16,185,129,0.5)] transition-all active:scale-95">
                <Phone className="w-5 h-5" />
                <span>{isAccepting ? 'Connecting…' : <>Accept {displayOtherUserName}'s {callState.callType === 'video' ? 'Video Call' : 'Call'}</>}</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-3 sm:gap-4">
              <button type="button" onClick={toggleMute} className={`p-3.5 rounded-2xl border transition-all ${isMuted ? 'bg-red-600/80 border-red-500 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800'}`} title={isMuted ? 'Unmute microphone' : 'Mute microphone'}>
                {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              {callState.callType === 'video' && (
                <button type="button" onClick={toggleVideo} className={`p-3.5 rounded-2xl border transition-all ${isVideoOff ? 'bg-red-600/80 border-red-500 text-white' : 'bg-slate-900/80 border-slate-700 text-slate-200 hover:bg-slate-800'}`} title={isVideoOff ? 'Turn on camera' : 'Turn off camera'}>
                  {isVideoOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
                </button>
              )}
              <button type="button" onClick={handleEndCall} className="px-6 py-3.5 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-semibold text-xs uppercase tracking-wider shadow-[0_0_25px_rgba(239,68,68,0.4)] flex items-center gap-2 active:scale-95 transition-all">
                <PhoneOff className="w-5 h-5" />
                <span>End Call</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
