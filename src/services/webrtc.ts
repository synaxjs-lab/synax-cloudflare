export type WebRTCCallType = 'voice' | 'video';

export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

type IceServer = RTCIceServer;

function isLocalDevelopmentHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1' || hostname.endsWith('.localhost');
}

function ensureMediaSecureContext(): void {
  const secure = typeof window.isSecureContext === 'boolean'
    ? window.isSecureContext
    : window.location.protocol === 'https:' || isLocalDevelopmentHost(window.location.hostname);
  if (!secure) {
    throw new Error('Microphone and camera access requires HTTPS. Open SYNAX using its secure https:// address.');
  }
}

/**
 * Small compatibility wrapper for current browsers and older Android browser
 * engines/WebViews that expose the prefixed getUserMedia callback API.
 */
export async function requestUserMediaCompat(constraints: MediaStreamConstraints): Promise<MediaStream> {
  ensureMediaSecureContext();

  const mediaDevices = navigator.mediaDevices;
  if (mediaDevices && typeof mediaDevices.getUserMedia === 'function') {
    return mediaDevices.getUserMedia.call(mediaDevices, constraints);
  }

  const legacyNavigator = navigator as Navigator & {
    getUserMedia?: (c: MediaStreamConstraints, success: (stream: MediaStream) => void, failure: (error: any) => void) => void;
    webkitGetUserMedia?: (c: MediaStreamConstraints, success: (stream: MediaStream) => void, failure: (error: any) => void) => void;
    mozGetUserMedia?: (c: MediaStreamConstraints, success: (stream: MediaStream) => void, failure: (error: any) => void) => void;
  };
  const legacyMethod = legacyNavigator.getUserMedia || legacyNavigator.webkitGetUserMedia || legacyNavigator.mozGetUserMedia;
  if (!legacyMethod) {
    throw new Error('This browser does not expose microphone/camera access. Update Chrome, Firefox, Samsung Internet, or the Android System WebView, then try again.');
  }

  return new Promise<MediaStream>((resolve, reject) => {
    try {
      legacyMethod.call(navigator, constraints, resolve, reject);
    } catch (error) {
      reject(error);
    }
  });
}

/** Ask for media directly in response to the user's click/tap. The modest video
 * constraints work better across low-memory Android devices; older engines get
 * a boolean video fallback if they reject modern constraint dictionaries. */
export async function requestCallMedia(callType: WebRTCCallType): Promise<MediaStream> {
  if (callType === 'voice') {
    try {
      return await requestUserMediaCompat({ audio: true, video: false });
    } catch (error: any) {
      if (error?.name === 'NotAllowedError' || error?.name === 'PermissionDeniedError' || error?.name === 'SecurityError') {
        throw new Error('Microphone permission was denied. Allow microphone access for SYNAX in your browser settings, then try again.');
      }
      throw error;
    }
  }

  try {
    return await requestUserMediaCompat({
      audio: true,
      video: {
        facingMode: { ideal: 'user' },
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 24, max: 30 },
      },
    });
  } catch (firstError: any) {
    if (firstError?.name === 'NotAllowedError' || firstError?.name === 'PermissionDeniedError' || firstError?.name === 'SecurityError') {
      throw new Error('Camera or microphone permission was denied. Allow both permissions for SYNAX in your browser settings, then try again.');
    }

    // Older mobile engines can reject ideal/facingMode constraint dictionaries.
    try {
      return await requestUserMediaCompat({ audio: true, video: true });
    } catch (fallbackError: any) {
      const error = fallbackError || firstError;
      if (error?.name === 'NotFoundError' || error?.name === 'DevicesNotFoundError') {
        throw new Error('This device did not report a usable camera and microphone. Check that they are connected and not disabled by another app.');
      }
      if (error?.name === 'NotReadableError' || error?.name === 'TrackStartError') {
        throw new Error('The camera or microphone is busy. Close other apps using it and try again.');
      }
      throw new Error(error?.message || 'Camera and microphone access could not be started.');
    }
  }
}

/**
 * SYNAX WebRTC core. It uses trickle ICE so call setup does not wait for all
 * candidate gathering. Early candidates are preserved until the remote SDP is
 * applied; this is important because HTTP signaling can deliver candidates
 * before the recipient presses Accept.
 */
export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private remoteDescriptionReady = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private generation = 0;
  private lastReportedState: WebRTCConnectionState | null = null;

  onRemoteStream: ((stream: MediaStream) => void) | null = null;
  onConnectionState: ((state: WebRTCConnectionState) => void) | null = null;
  onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;
  onIceServerStatus: ((turnAvailable: boolean) => void) | null = null;

  private getFallbackIceServers(): IceServer[] {
    return [
      { urls: ['stun:stun.cloudflare.com:3478', 'stun:stun.l.google.com:19302'] },
    ];
  }

  private async loadIceServers(): Promise<IceServer[]> {
    const fallback = this.getFallbackIceServers();
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 6000);
    try {
      let token = '';
      try {
        token = sessionStorage.getItem('synax_token') || localStorage.getItem('synax_user_token') || '';
      } catch {
        // Storage can be disabled in strict/private modes; the endpoint still gets
        // attempted, but normally the authenticated local token will be available.
      }

      const response = await fetch('/api/call/ice-servers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
        signal: controller.signal,
      });
      const data = await response.json().catch(() => ({} as any));
      const normalized: IceServer[] = (Array.isArray(data?.iceServers) ? data.iceServers : [])
        .map((server: any) => {
          const rawUrls = Array.isArray(server?.urls) ? server.urls : [server?.urls];
          const urls = rawUrls
            .filter((url: unknown): url is string => typeof url === 'string' && Boolean(url.trim()))
            .filter((url: string) => !/:53(?:\?|$)/i.test(url));
          return { ...server, urls } as IceServer;
        })
        .filter((server: any) => Array.isArray(server.urls) && server.urls.length > 0);

      const turnAvailable = response.ok && normalized.some((server: any) =>
        Boolean(server.username && server.credential) &&
        (Array.isArray(server.urls) ? server.urls : [server.urls]).some((url: string) => /^turns?:/i.test(url))
      );
      this.onIceServerStatus?.(turnAvailable);

      if (response.ok && normalized.length) {
        if (!turnAvailable) {
          console.warn('SYNAX TURN relay is not configured; some mobile/carrier networks may not connect.');
        }
        return normalized;
      }
    } catch (error) {
      this.onIceServerStatus?.(false);
      console.warn('SYNAX ICE server discovery failed; using STUN fallback:', error);
    } finally {
      window.clearTimeout(timeout);
    }
    return fallback;
  }

  private reportConnectionState(state: WebRTCConnectionState) {
    if (this.lastReportedState === state) return;
    this.lastReportedState = state;
    this.onConnectionState?.(state);
  }

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    if (this.pc && this.pc.signalingState !== 'closed') return this.pc;

    const legacyWindow = window as Window & { webkitRTCPeerConnection?: typeof RTCPeerConnection };
    const PeerConnectionCtor = window.RTCPeerConnection || legacyWindow.webkitRTCPeerConnection;
    if (!PeerConnectionCtor) {
      throw new Error('This browser does not support WebRTC calling. Update your Android browser or Android System WebView.');
    }

    const pc = new PeerConnectionCtor({
      iceServers: await this.loadIceServers(),
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
    });

    const generation = ++this.generation;
    this.remoteStream = null;

    pc.ontrack = (event) => {
      const suppliedStream = event.streams?.[0];
      if (suppliedStream) {
        this.remoteStream = suppliedStream;
        this.onRemoteStream?.(suppliedStream);
        return;
      }
      // Compatibility path for engines where RTCTrackEvent.streams is empty.
      if (!this.remoteStream) this.remoteStream = new MediaStream();
      if (!this.remoteStream.getTracks().some((track) => track.id === event.track.id)) {
        this.remoteStream.addTrack(event.track);
      }
      this.onRemoteStream?.(this.remoteStream);
    };

    // Older WebRTC implementations can expose addstream instead of ontrack.
    (pc as any).onaddstream = (event: any) => {
      if (generation !== this.generation || !event?.stream) return;
      this.remoteStream = event.stream as MediaStream;
      this.onRemoteStream?.(this.remoteStream);
    };

    pc.onicecandidate = (event) => {
      if (generation !== this.generation || !event.candidate) return;
      try {
        const candidate = typeof event.candidate.toJSON === 'function'
          ? event.candidate.toJSON()
          : {
              candidate: event.candidate.candidate,
              sdpMid: event.candidate.sdpMid,
              sdpMLineIndex: event.candidate.sdpMLineIndex,
              usernameFragment: (event.candidate as any).usernameFragment,
            };
        this.onIceCandidate?.(candidate);
      } catch (error) {
        console.warn('SYNAX ICE candidate serialization failed:', error);
      }
    };

    pc.onicecandidateerror = (event) => {
      console.warn('SYNAX ICE candidate error:', (event as any).errorCode, (event as any).errorText || 'unknown');
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState as WebRTCConnectionState;
      if (state) this.reportConnectionState(state);
    };

    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case 'checking':
          this.reportConnectionState('connecting');
          break;
        case 'connected':
        case 'completed':
          this.reportConnectionState('connected');
          break;
        case 'disconnected':
          this.reportConnectionState('disconnected');
          break;
        case 'failed':
          this.reportConnectionState('failed');
          break;
        case 'closed':
          this.reportConnectionState('closed');
          break;
      }
    };

    this.pc = pc;
    return pc;
  }

  private addLocalTracks(pc: RTCPeerConnection, stream: MediaStream) {
    const legacyPc = pc as any;
    if (typeof pc.addTrack === 'function') {
      const existingTrackIds = new Set(
        pc.getSenders().map((sender) => sender.track?.id).filter(Boolean) as string[]
      );
      for (const track of stream.getTracks()) {
        if (!existingTrackIds.has(track.id)) pc.addTrack(track, stream);
      }
      return;
    }
    if (typeof legacyPc.addStream === 'function') {
      legacyPc.addStream(stream);
      return;
    }
    throw new Error('This browser has no supported way to attach microphone/camera tracks. Update your browser.');
  }

  private async preparePeer(stream: MediaStream) {
    // ICE candidates can arrive as soon as the callee receives the offer, before
    // the user taps Accept. Preserve those candidates across initial PC creation.
    const earlyCandidates = this.pendingCandidates.splice(0);
    this.cleanupPeerOnly();
    this.pendingCandidates = earlyCandidates;
    this.localStream = stream;
    return await this.createPeerConnection();
  }

  async createOffer(_callType: WebRTCCallType, stream: MediaStream): Promise<RTCSessionDescriptionInit> {
    const pc = await this.preparePeer(stream);
    this.addLocalTracks(pc, stream);
    this.reportConnectionState('connecting');

    // Tracks are attached before offer creation; avoiding obsolete offer options
    // improves compatibility with older Android WebRTC implementations.
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    return pc.localDescription?.toJSON() || offer;
  }

  async handleOfferAndCreateAnswer(
    offer: RTCSessionDescriptionInit,
    _callType: WebRTCCallType,
    stream: MediaStream
  ): Promise<RTCSessionDescriptionInit> {
    const pc = await this.preparePeer(stream);
    await pc.setRemoteDescription(offer);
    this.remoteDescriptionReady = true;
    await this.applyPendingCandidates();

    this.addLocalTracks(pc, stream);
    this.reportConnectionState('connecting');
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return pc.localDescription?.toJSON() || answer;
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit) {
    const pc = this.pc;
    if (!pc || !sdp || pc.signalingState === 'closed') return;
    // Both initial answers and ICE-restart answers are valid only for a local offer.
    if (pc.signalingState !== 'have-local-offer') return;

    this.remoteDescriptionReady = false;
    await pc.setRemoteDescription(sdp);
    this.remoteDescriptionReady = true;
    await this.applyPendingCandidates();
  }

  async createIceRestartOffer(): Promise<RTCSessionDescriptionInit | null> {
    const pc = this.pc;
    if (!pc || pc.signalingState === 'closed' || pc.signalingState !== 'stable') return null;

    // Queue new remote candidates until the restart answer has been applied.
    this.remoteDescriptionReady = false;
    try {
      (pc as any).restartIce?.();
      const offer = await pc.createOffer({ iceRestart: true });
      await pc.setLocalDescription(offer);
      return pc.localDescription?.toJSON() || offer;
    } catch (error) {
      this.remoteDescriptionReady = true;
      console.warn('SYNAX ICE restart offer failed:', error);
      throw error;
    }
  }

  async handleIceRestartOffer(offer: RTCSessionDescriptionInit): Promise<RTCSessionDescriptionInit> {
    const pc = this.pc;
    if (!pc || pc.signalingState === 'closed') throw new Error('The call connection is no longer active.');
    if (pc.signalingState !== 'stable') throw new Error('The call is still negotiating. Please retry the connection.');

    this.remoteDescriptionReady = false;
    await pc.setRemoteDescription(offer);
    this.remoteDescriptionReady = true;
    await this.applyPendingCandidates();
    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    return pc.localDescription?.toJSON() || answer;
  }

  async addIceCandidate(candidate: RTCIceCandidateInit | null) {
    if (!candidate) return;
    if (!this.pc || !this.remoteDescriptionReady) {
      this.pendingCandidates.push(candidate);
      // Prevent an unexpected signaling flood from growing memory indefinitely.
      if (this.pendingCandidates.length > 200) this.pendingCandidates.splice(0, this.pendingCandidates.length - 200);
      return;
    }

    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      // Stale-generation ICE candidates can legitimately arrive while a mobile
      // network changes. They should not crash the call state machine.
      console.warn('SYNAX ICE candidate could not be applied:', error);
    }
  }

  private async applyPendingCandidates() {
    if (!this.pc || !this.remoteDescriptionReady) return;
    const queued = this.pendingCandidates.splice(0);
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn('SYNAX queued ICE candidate could not be applied:', error);
      }
    }
  }

  async switchCamera(): Promise<boolean> {
    if (!this.pc || !this.localStream) return false;
    const currentTrack = this.localStream.getVideoTracks()[0];
    if (!currentTrack) return false;

    const settings = typeof currentTrack.getSettings === 'function' ? currentTrack.getSettings() : {};
    const targetFacing = settings.facingMode === 'environment' ? 'user' : 'environment';
    let nextStream: MediaStream;
    try {
      nextStream = await requestUserMediaCompat({
        audio: false,
        video: { facingMode: { ideal: targetFacing }, width: { ideal: 640 }, height: { ideal: 480 } },
      });
    } catch {
      try {
        nextStream = await requestUserMediaCompat({ audio: false, video: true });
      } catch {
        return false;
      }
    }

    const nextTrack = nextStream.getVideoTracks()[0];
    if (!nextTrack) {
      nextStream.getTracks().forEach((track) => track.stop());
      return false;
    }

    const sender = this.pc.getSenders().find((item) => item.track?.kind === 'video');
    if (!sender || typeof sender.replaceTrack !== 'function') {
      nextStream.getTracks().forEach((track) => track.stop());
      return false;
    }

    try {
      await sender.replaceTrack(nextTrack);
      this.localStream.removeTrack(currentTrack);
      currentTrack.stop();
      this.localStream.addTrack(nextTrack);
      return true;
    } catch (error) {
      nextStream.getTracks().forEach((track) => track.stop());
      console.warn('SYNAX camera switch failed:', error);
      return false;
    }
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  toggleMute(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => { track.enabled = !muted; });
  }

  toggleCamera(disabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => { track.enabled = !disabled; });
  }

  getConnectionState(): WebRTCConnectionState {
    if (!this.pc) return 'new';
    const peerState = this.pc.connectionState as WebRTCConnectionState | undefined;
    const iceState = this.pc.iceConnectionState;

    // Some older Android WebRTC builds expose `connectionState` but do not
    // update it consistently. Prefer a definitive ICE state over a stale `new`
    // peer state, otherwise recovery logic can misclassify a connected call.
    if (iceState === 'connected' || iceState === 'completed') return 'connected';
    if (iceState === 'failed') return 'failed';
    if (iceState === 'disconnected') return 'disconnected';
    if (iceState === 'closed') return 'closed';
    if (peerState && peerState !== 'new') return peerState;
    return peerState || 'new';
  }

  private cleanupPeerOnly() {
    this.generation += 1;
    if (this.pc) {
      try { this.pc.ontrack = null; } catch {}
      try { (this.pc as any).onaddstream = null; } catch {}
      try { this.pc.onicecandidate = null; } catch {}
      try { this.pc.onconnectionstatechange = null; } catch {}
      try { this.pc.oniceconnectionstatechange = null; } catch {}
      try { this.pc.onicecandidateerror = null; } catch {}
      try { this.pc.close(); } catch {}
    }
    this.pc = null;
    this.remoteStream = null;
    this.remoteDescriptionReady = false;
    this.pendingCandidates = [];
    this.lastReportedState = null;
  }

  cleanup() {
    this.cleanupPeerOnly();
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => { try { track.stop(); } catch {} });
    }
    this.localStream = null;
    this.onIceCandidate = null;
    this.onRemoteStream = null;
    this.onConnectionState = null;
    this.onIceServerStatus = null;
  }
}
