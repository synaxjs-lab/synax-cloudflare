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

  private getIceServers(): IceServer[] {
    const servers: IceServer[] = [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
      { urls: 'stun:stun2.l.google.com:19302' },
      { urls: 'stun:stun.cloudflare.com:3478' },
    ];

    const env = (import.meta as any).env || {};
    if (env.VITE_TURN_URL && env.VITE_TURN_USERNAME && env.VITE_TURN_CREDENTIAL) {
      servers.push({
        urls: env.VITE_TURN_URL,
        username: env.VITE_TURN_USERNAME,
        credential: env.VITE_TURN_CREDENTIAL,
      });
    }

    return servers;
  }

  private createPeerConnection(): RTCPeerConnection {
    if (this.pc && this.pc.signalingState !== 'closed') return this.pc;

    const pc = new RTCPeerConnection({
      iceServers: this.getIceServers(),
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

  private addLocalTracks(stream: MediaStream) {
    const pc = this.createPeerConnection();
    const existingTrackIds = new Set(
      pc.getSenders().map((sender) => sender.track?.id).filter(Boolean) as string[]
    );

    for (const track of stream.getTracks()) {
      if (!existingTrackIds.has(track.id)) {
        pc.addTrack(track, stream);
      }
    }
  }

  private preparePeer(stream: MediaStream) {
    this.cleanupPeerOnly();
    this.localStream = stream;
    this.pendingCandidates = [];
    return this.createPeerConnection();
  }

  async createOffer(_callType: WebRTCCallType, stream: MediaStream): Promise<RTCSessionDescriptionInit> {
    const pc = this.preparePeer(stream);
    this.addLocalTracks(stream);
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
    const pc = this.preparePeer(stream);

    await pc.setRemoteDescription(offer);
    this.remoteDescriptionReady = true;
    await this.applyPendingCandidates();

    this.addLocalTracks(stream);
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
