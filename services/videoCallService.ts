import { supabase } from './supabaseClient';
import { VideoCallSession, SignalingMessage } from '../types';
import { SupabaseService } from './Supabase';
import { logger } from './logger';

export type VideoCallState =
  | 'IDLE'
  | 'REQUESTING_MEDIA'
  | 'CALLING'
  | 'CONNECTED'
  | 'ENDED'
  | 'REJECTED'
  | 'MISSED'
  | 'FAILED';

export type VideoCallStateChangeHandler = (
  state: VideoCallState,
  detail?: { rejectionReason?: string; error?: string }
) => void;

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  ...(import.meta.env.VITE_TURN_USERNAME && import.meta.env.VITE_TURN_CREDENTIAL
    ? [{
        urls: 'turn:turn.cloudflare.com:3478',
        username: import.meta.env.VITE_TURN_USERNAME as string,
        credential: import.meta.env.VITE_TURN_CREDENTIAL as string
      }]
    : [])
];

const CALL_TIMEOUT_MS = 90_000;

class VideoCallService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private session: VideoCallSession | null = null;
  private onStateChange: VideoCallStateChangeHandler | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private currentState: VideoCallState = 'IDLE';
  private pendingIceCandidates: RTCIceCandidateInit[] = [];

  getLocalStream(): MediaStream | null { return this.localStream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }
  getState(): VideoCallState { return this.currentState; }

  async startCall(
    session: VideoCallSession,
    onStateChange: VideoCallStateChangeHandler
  ): Promise<void> {
    this.reset();
    this.session = session;
    this.onStateChange = onStateChange;
    this.pendingIceCandidates = [];

    logger.info('[VCALL] startCall begin', { sessionId: session.id });
    this.setState('REQUESTING_MEDIA');

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
      logger.info('[VCALL] media acquired', { sessionId: session.id });
    } catch (err) {
      logger.error('[VCALL] media access denied', err, undefined, { sessionId: session.id });
      this.setState('FAILED', { error: 'Permita acesso a camera e microfone nas definicoes do browser.' });
      return;
    }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, this.localStream!);
    });

    this.remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      logger.info('[VCALL] remote track received', { sessionId: session.id });
      event.streams[0]?.getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
    };

    this.pc.oniceconnectionstatechange = () => {
      logger.info('[VCALL] ICE connection state changed', {
        state: this.pc?.iceConnectionState,
        sessionId: session.id
      });
      if (this.pc?.iceConnectionState === 'disconnected' || this.pc?.iceConnectionState === 'failed') {
        this.handleNetworkDrop();
      }
    };

    this.pc.onsignalingstatechange = () => {
      logger.info('[VCALL] signaling state changed', {
        state: this.pc?.signalingState,
        sessionId: session.id
      });
    };

    this.channel = supabase.channel(`video-call-${session.id}`, {
      config: { broadcast: { self: false } }
    });

    this.channel
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: SignalingMessage }) => {
        logger.info('[VCALL] answer received from resident', {
          hasSdp: !!payload.sdp,
          sessionId: session.id
        });
        if (!this.pc || !payload.sdp) {
          logger.warn('[VCALL] answer ignored — no pc or no sdp', { sessionId: session.id });
          return;
        }
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }));
          logger.info('[VCALL] remote description set from answer', { sessionId: session.id });
          await this.flushPendingIceCandidates();
          this.clearTimeout();
          this.setState('CONNECTED');
          logger.info('[VCALL] CONNECTED', { sessionId: session.id });
        } catch (err) {
          logger.error('[VCALL] failed to set remote description from answer', err, undefined, { sessionId: session.id });
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: { payload: SignalingMessage }) => {
        if (!this.pc || !payload.candidate) return;
        try {
          if (!this.pc.remoteDescription) {
            this.pendingIceCandidates.push(payload.candidate);
            logger.debug('[VCALL] queued ICE candidate (no remote desc yet)', {
              queuedCount: this.pendingIceCandidates.length,
              sessionId: session.id
            });
            return;
          }
          await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
          logger.debug('[VCALL] ICE candidate applied', { sessionId: session.id });
        } catch (err) {
          logger.error('[VCALL] failed to add ICE candidate', err, undefined, { sessionId: session.id });
        }
      })
      .on('broadcast', { event: 'reject' }, ({ payload }: { payload: { reason?: string } }) => {
        logger.info('[VCALL] call rejected by resident', { reason: payload?.reason, sessionId: session.id });
        this.clearTimeout();
        this.cleanup();
        this.setState('REJECTED', { rejectionReason: payload?.reason || 'Chamada recusada pelo morador.' });
        void SupabaseService.updateVideoCallSessionStatus(session.id, 'REJECTED', payload?.reason);
      })
      .on('broadcast', { event: 'hangup' }, () => {
        logger.info('[VCALL] hangup received from resident', { sessionId: session.id });
        this.cleanup();
        this.setState('ENDED');
        void SupabaseService.updateVideoCallSessionStatus(session.id, 'ENDED');
      });

    this.pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      logger.debug('[VCALL] sending ICE candidate to resident', { sessionId: session.id });
      void this.sendBroadcast('ice-candidate', {
        type: 'ice-candidate',
        candidate: event.candidate.toJSON()
      } satisfies SignalingMessage);
    };

    try {
      logger.info('[VCALL] subscribing to channel', { channel: `video-call-${session.id}` });
      await this.subscribeToChannel();
      logger.info('[VCALL] channel subscribed successfully', { sessionId: session.id });
    } catch (err) {
      this.cleanup();
      this.setState('FAILED', { error: 'Nao foi possivel estabelecer a ligacao de sinalizacao.' });
      logger.error('[VCALL] channel subscription failed', err, undefined, { sessionId: session.id });
      return;
    }

    let offer: RTCSessionDescriptionInit;
    try {
      offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
      logger.info('[VCALL] offer created and local description set', {
        sdpLength: offer.sdp?.length ?? 0,
        sessionId: session.id
      });

      // Persist offer so resident can fetch it even if they miss the broadcast
      await SupabaseService.updateVideoCallSessionOffer(session.id, offer.sdp!);
      logger.info('[VCALL] offer_sdp persisted to DB', { sessionId: session.id });
    } catch (err) {
      this.setState('FAILED', { error: 'Nao foi possivel iniciar a chamada. Verifique a sua ligacao.' });
      logger.error('[VCALL] failed to create/persist offer', err, undefined, { sessionId: session.id });
      return;
    }

    logger.info('[VCALL] broadcasting offer to resident', { sessionId: session.id });
    const offerSent = await this.sendBroadcast('offer', { type: 'offer', sdp: offer.sdp } satisfies SignalingMessage);
    if (!offerSent) {
      logger.error('[VCALL] offer broadcast failed — sendBroadcast returned false', { sessionId: session.id });
      this.cleanup();
      this.setState('FAILED', { error: 'Nao foi possivel enviar o pedido de chamada.' });
      return;
    }
    logger.info('[VCALL] offer broadcast sent successfully', { sessionId: session.id });

    this.setState('CALLING');

    this.timeoutHandle = setTimeout(() => {
      logger.warn('[VCALL] call timed out — no answer from resident', { sessionId: session.id });
      this.cleanup();
      this.setState('MISSED', { rejectionReason: 'Sem resposta do morador.' });
      void SupabaseService.updateVideoCallSessionStatus(session.id, 'MISSED');
    }, CALL_TIMEOUT_MS);
  }

  endCall(): void {
    if (!this.session) return;
    logger.info('[VCALL] guard ended call', { sessionId: this.session.id });
    void this.sendBroadcast('hangup', {});
    const sessionId = this.session.id;
    const wasConnected = this.currentState === 'CONNECTED';
    this.cleanup();
    this.setState('ENDED');
    void SupabaseService.updateVideoCallSessionStatus(sessionId, wasConnected ? 'ENDED' : 'MISSED');
  }

  private handleNetworkDrop(): void {
    if (this.currentState !== 'CONNECTED') return;
    setTimeout(() => {
      if (this.pc?.iceConnectionState === 'disconnected' || this.pc?.iceConnectionState === 'failed') {
        const sessionId = this.session?.id;
        logger.warn('[VCALL] network drop detected', { sessionId });
        this.cleanup();
        this.setState('FAILED', { error: 'Ligacao perdida durante a chamada.' });
        if (sessionId) {
          void SupabaseService.updateVideoCallSessionStatus(sessionId, 'FAILED');
        }
      }
    }, 10_000);
  }

  private setState(state: VideoCallState, detail?: { rejectionReason?: string; error?: string }): void {
    this.currentState = state;
    this.onStateChange?.(state, detail);
  }

  private clearTimeout(): void {
    if (this.timeoutHandle) {
      clearTimeout(this.timeoutHandle);
      this.timeoutHandle = null;
    }
  }

  private async subscribeToChannel(): Promise<void> {
    if (!this.channel) throw new Error('Video call channel was not created');

    await new Promise<void>((resolve, reject) => {
      let settled = false;
      const settle = (callback: () => void) => {
        if (settled) return;
        settled = true;
        callback();
      };

      this.channel!.subscribe((status) => {
        logger.info('[VCALL] channel subscribe status', { status, sessionId: this.session?.id });
        if (status === 'SUBSCRIBED') {
          settle(resolve);
          return;
        }
        if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          settle(() => reject(new Error(`Video call channel subscribe failed: ${status}`)));
        }
      });
    });
  }

  private async sendBroadcast(
    event: SignalingMessage['type'] | 'hangup',
    payload: Record<string, unknown>
  ): Promise<boolean> {
    if (!this.channel) return false;

    try {
      const result = await this.channel.send({
        type: 'broadcast',
        event,
        payload
      });

      if (result !== 'ok') {
        logger.warn('[VCALL] broadcast returned non-ok', {
          event,
          result,
          sessionId: this.session?.id
        });
        return false;
      }

      return true;
    } catch (err) {
      logger.error('[VCALL] broadcast send threw exception', err, undefined, {
        event,
        sessionId: this.session?.id
      });
      return false;
    }
  }

  private async flushPendingIceCandidates(): Promise<void> {
    if (!this.pc?.remoteDescription || this.pendingIceCandidates.length === 0) return;

    logger.info('[VCALL] flushing queued ICE candidates', {
      count: this.pendingIceCandidates.length,
      sessionId: this.session?.id
    });

    const queuedCandidates = [...this.pendingIceCandidates];
    this.pendingIceCandidates = [];

    for (const candidate of queuedCandidates) {
      try {
        await this.pc.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        logger.error('[VCALL] failed to flush queued ICE candidate', err, undefined, {
          sessionId: this.session?.id
        });
      }
    }
  }

  private cleanup(): void {
    this.clearTimeout();
    this.pendingIceCandidates = [];

    this.localStream?.getTracks().forEach(track => track.stop());
    this.localStream = null;

    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.onsignalingstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    void this.channel?.unsubscribe();
    this.channel = null;
    this.remoteStream = null;
    this.session = null;
    this.currentState = 'IDLE';
  }

  reset(): void {
    this.cleanup();
    this.onStateChange = null;
  }
}

export const videoCallService = new VideoCallService();
