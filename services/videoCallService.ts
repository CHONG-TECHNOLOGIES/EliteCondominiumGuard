import { supabase } from './supabaseClient';
import { VideoCallSession, VideoCallStatus, SignalingMessage } from '../types';
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

const CALL_TIMEOUT_MS = 60_000;

class VideoCallService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private remoteStream: MediaStream | null = null;
  private channel: ReturnType<typeof supabase.channel> | null = null;
  private session: VideoCallSession | null = null;
  private onStateChange: VideoCallStateChangeHandler | null = null;
  private timeoutHandle: ReturnType<typeof setTimeout> | null = null;
  private currentState: VideoCallState = 'IDLE';

  getLocalStream(): MediaStream | null { return this.localStream; }
  getRemoteStream(): MediaStream | null { return this.remoteStream; }
  getState(): VideoCallState { return this.currentState; }

  async startCall(
    session: VideoCallSession,
    onStateChange: VideoCallStateChangeHandler
  ): Promise<void> {
    this.session = session;
    this.onStateChange = onStateChange;

    this.setState('REQUESTING_MEDIA');

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: true
      });
    } catch {
      this.setState('FAILED', { error: 'Permita acesso à câmera e microfone nas definições do browser.' });
      return;
    }

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    this.localStream.getTracks().forEach(track => {
      this.pc!.addTrack(track, this.localStream!);
    });

    this.remoteStream = new MediaStream();
    this.pc.ontrack = (event) => {
      event.streams[0]?.getTracks().forEach(track => {
        this.remoteStream!.addTrack(track);
      });
    };

    this.pc.oniceconnectionstatechange = () => {
      if (this.pc?.iceConnectionState === 'disconnected' || this.pc?.iceConnectionState === 'failed') {
        this.handleNetworkDrop();
      }
    };

    this.channel = supabase.channel(`video-call-${session.id}`, {
      config: { broadcast: { self: false } }
    });

    this.channel
      .on('broadcast', { event: 'answer' }, async ({ payload }: { payload: SignalingMessage }) => {
        if (!this.pc || !payload.sdp) return;
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription({ type: 'answer', sdp: payload.sdp }));
          this.clearTimeout();
          this.setState('CONNECTED');
        } catch (err: any) {
          logger.error('Failed to set remote description', err.message);
        }
      })
      .on('broadcast', { event: 'ice-candidate' }, async ({ payload }: { payload: SignalingMessage }) => {
        if (!this.pc || !payload.candidate) return;
        try {
          await this.pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
        } catch (err: any) {
          logger.error('Failed to add ICE candidate', err.message);
        }
      })
      .on('broadcast', { event: 'reject' }, ({ payload }: { payload: { reason?: string } }) => {
        this.clearTimeout();
        this.cleanup('REJECTED');
        this.setState('REJECTED', { rejectionReason: payload?.reason || 'Chamada recusada pelo morador.' });
        SupabaseService.updateVideoCallSessionStatus(session.id, 'REJECTED', payload?.reason);
      })
      .on('broadcast', { event: 'hangup' }, () => {
        this.cleanup('ENDED');
        this.setState('ENDED');
        SupabaseService.updateVideoCallSessionStatus(session.id, 'ENDED');
      });

    this.pc.onicecandidate = (event) => {
      if (!event.candidate) return;
      this.channel?.send({
        type: 'broadcast',
        event: 'ice-candidate',
        payload: { type: 'ice-candidate', candidate: event.candidate.toJSON() } satisfies SignalingMessage
      });
    };

    await this.channel.subscribe();

    let offer: RTCSessionDescriptionInit;
    try {
      offer = await this.pc.createOffer();
      await this.pc.setLocalDescription(offer);
    } catch (err: any) {
      this.setState('FAILED', { error: 'Não foi possível iniciar a chamada. Verifique a sua ligação.' });
      logger.error('Failed to create offer', err.message);
      return;
    }

    this.channel.send({
      type: 'broadcast',
      event: 'offer',
      payload: { type: 'offer', sdp: offer.sdp } satisfies SignalingMessage
    });

    this.setState('CALLING');

    this.timeoutHandle = setTimeout(() => {
      this.cleanup('MISSED');
      this.setState('MISSED', { rejectionReason: 'Sem resposta do morador.' });
      SupabaseService.updateVideoCallSessionStatus(session.id, 'MISSED');
    }, CALL_TIMEOUT_MS);
  }

  endCall(): void {
    if (!this.session) return;
    this.channel?.send({
      type: 'broadcast',
      event: 'hangup',
      payload: {}
    });
    const sessionId = this.session.id;
    const wasConnected = this.currentState === 'CONNECTED';
    this.cleanup('ENDED');
    this.setState('ENDED');
    SupabaseService.updateVideoCallSessionStatus(sessionId, wasConnected ? 'ENDED' : 'MISSED');
  }

  private handleNetworkDrop(): void {
    if (this.currentState !== 'CONNECTED') return;
    setTimeout(() => {
      if (this.pc?.iceConnectionState === 'disconnected' || this.pc?.iceConnectionState === 'failed') {
        const sessionId = this.session?.id;
        this.cleanup('FAILED');
        this.setState('FAILED', { error: 'Ligação perdida durante a chamada.' });
        if (sessionId) SupabaseService.updateVideoCallSessionStatus(sessionId, 'FAILED');
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

  private cleanup(_finalStatus: VideoCallStatus | 'IDLE'): void {
    this.clearTimeout();

    this.localStream?.getTracks().forEach(t => t.stop());
    this.localStream = null;

    if (this.pc) {
      this.pc.ontrack = null;
      this.pc.onicecandidate = null;
      this.pc.oniceconnectionstatechange = null;
      this.pc.close();
      this.pc = null;
    }

    this.channel?.unsubscribe();
    this.channel = null;
    this.remoteStream = null;
    this.session = null;
    this.currentState = 'IDLE';
  }

  reset(): void {
    this.cleanup('IDLE');
    this.onStateChange = null;
  }
}

export const videoCallService = new VideoCallService();
