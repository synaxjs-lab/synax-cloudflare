export type WebRTCCallType = 'voice' | 'video';

export type WebRTCConnectionState =
  | 'new'
  | 'connecting'
  | 'connected'
  | 'disconnected'
  | 'failed'
  | 'closed';

type IceServer = RTCIceServer;

/**
 * SYNAX WebRTC core.
 *
 * Important design choice: do NOT wait for ICE gathering to finish before
 * sending the offer/answer. ICE trickling is the normal WebRTC flow and keeps
 * calls from sitting on "Connecting..." while a browser waits for gathering.
 */
export class WebRTCManager {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteDescriptionReady = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private generation = 0;

  onRemoteStream: ((stream: MediaStream) => void) | null = null;
  onConnectionState: ((state: WebRTCConnectionState) => void) | null = null;
  onIceCandidate: ((candidate: RTCIceCandidateInit) => void) | null = null;

  private getFallbackIceServers(): IceServer[] {
    return [
      { urls: 'stun:stun.cloudflare.com:3478' },
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
    ];
  }

  private async loadIceServers(): Promise<IceServer[]> {
    try {
      const token = sessionStorage.getItem('synax_token') || localStorage.getItem('synax_user_token');
      const response = await fetch('/api/call/ice-servers', {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        cache: 'no-store',
      });
      const data = await response.json().catch(() => ({}));
      if (response.ok && Array.isArray(data?.iceServers) && data.iceServers.length > 0) {
        return data.iceServers as IceServer[];
      }
    } catch (error) {
      console.warn('SYNAX ICE server discovery failed:', error);
    }
    return this.getFallbackIceServers();
  }

  private async createPeerConnection(): Promise<RTCPeerConnection> {
    if (this.pc && this.pc.signalingState !== 'closed') return this.pc;

    const pc = new RTCPeerConnection({
      iceServers: await this.loadIceServers(),
      iceTransportPolicy: 'all',
      bundlePolicy: 'balanced',
      rtcpMuxPolicy: 'require',
    });

    const generation = ++this.generation;

    pc.ontrack = (event) => {
      const stream = event.streams?.[0] || new MediaStream([event.track]);
      this.onRemoteStream?.(stream);
    };

    pc.onicecandidate = (event) => {
      if (generation !== this.generation || !event.candidate) return;
      this.onIceCandidate?.(event.candidate.toJSON());
    };

    pc.onicecandidateerror = (event) => {
      console.warn('SYNAX ICE candidate error:', event.errorCode, event.errorText || 'unknown');
    };

    pc.onconnectionstatechange = () => {
      const state = pc.connectionState as WebRTCConnectionState;
      this.onConnectionState?.(state);
    };

    pc.oniceconnectionstatechange = () => {
      switch (pc.iceConnectionState) {
        case 'checking':
          this.onConnectionState?.('connecting');
          break;
        case 'connected':
        case 'completed':
          this.onConnectionState?.('connected');
          break;
        case 'disconnected':
          this.onConnectionState?.('disconnected');
          break;
        case 'failed':
          this.onConnectionState?.('failed');
          break;
        case 'closed':
          this.onConnectionState?.('closed');
          break;
      }
    };

    pc.onicecandidateerror = (event) => {
      console.warn('SYNAX ICE candidate error:', event.errorText || event.errorCode);
    };

    this.pc = pc;
    return pc;
  }

  private addLocalTracks(pc: RTCPeerConnection, stream: MediaStream) {
    const existingTrackIds = new Set(
      pc.getSenders().map((sender) => sender.track?.id).filter(Boolean) as string[]
    );

    for (const track of stream.getTracks()) {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, stream);
      }
    }
  }

  private async preparePeer(stream: MediaStream) {
    this.cleanupPeerOnly();
    this.localStream = stream;
    this.pendingCandidates = [];
    return await this.createPeerConnection();
  }

  async createOffer(_callType: WebRTCCallType, stream: MediaStream): Promise<RTCSessionDescriptionInit> {
    const pc = await this.preparePeer(stream);
    this.addLocalTracks(pc, stream);
    this.onConnectionState?.('connecting');

    const offer = await pc.createOffer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: _callType === 'video',
    });

    await pc.setLocalDescription(offer);

    // Return immediately. onicecandidate will deliver candidates separately.
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
    this.onConnectionState?.('connecting');

    const answer = await pc.createAnswer({
      offerToReceiveAudio: true,
      offerToReceiveVideo: _callType === 'video',
    });

    await pc.setLocalDescription(answer);

    // Return immediately. onicecandidate will trickle candidates afterward.
    return pc.localDescription?.toJSON() || answer;
  }

  async handleAnswer(sdp: RTCSessionDescriptionInit) {
    const pc = this.pc;
    if (!pc || !sdp || pc.signalingState === 'closed') return;

    // Ignore duplicate answers from duplicate transports/polls.
    if (pc.signalingState !== 'have-local-offer') return;

    await pc.setRemoteDescription(sdp);
    this.remoteDescriptionReady = true;
    await this.applyPendingCandidates();
  }

  async addIceCandidate(candidate: RTCIceCandidateInit | null) {
    if (!candidate) return;

    if (!this.pc || !this.remoteDescriptionReady) {
      this.pendingCandidates.push(candidate);
      return;
    }

    try {
      await this.pc.addIceCandidate(candidate);
    } catch (error) {
      // Candidate duplication/race should not destroy an otherwise valid call.
      console.warn('SYNAX ICE candidate ignored:', error);
    }
  }

  private async applyPendingCandidates() {
    if (!this.pc || !this.remoteDescriptionReady) return;

    const queued = this.pendingCandidates.splice(0);
    for (const candidate of queued) {
      try {
        await this.pc.addIceCandidate(candidate);
      } catch (error) {
        console.warn('SYNAX queued ICE candidate ignored:', error);
      }
    }
  }

  toggleMute(muted: boolean) {
    this.localStream?.getAudioTracks().forEach((track) => {
      track.enabled = !muted;
    });
  }

  toggleCamera(disabled: boolean) {
    this.localStream?.getVideoTracks().forEach((track) => {
      track.enabled = !disabled;
    });
  }

  getConnectionState(): WebRTCConnectionState {
    return (this.pc?.connectionState || 'new') as WebRTCConnectionState;
  }

  private cleanupPeerOnly() {
    this.generation += 1;

    if (this.pc) {
      try { this.pc.ontrack = null; } catch {}
      try { this.pc.onicecandidate = null; } catch {}
      try { this.pc.onconnectionstatechange = null; } catch {}
      try { this.pc.oniceconnectionstatechange = null; } catch {}
      try { this.pc.onicecandidateerror = null; } catch {}
      try { this.pc.close(); } catch {}
    }

    this.pc = null;
    this.remoteDescriptionReady = false;
    this.pendingCandidates = [];
  }

  cleanup() {
    this.cleanupPeerOnly();

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => {
        try { track.stop(); } catch {}
      });
    }

    this.localStream = null;
    this.onIceCandidate = null;
    this.onRemoteStream = null;
    this.onConnectionState = null;
  }
}
