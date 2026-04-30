import { useEffect, useRef, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { VideoCallSession, Visit } from '../types';
import { videoCallService, VideoCallState } from '../services/videoCallService';

interface Props {
  session: VideoCallSession;
  visit: Visit;
  residentPhotoUrl?: string;
  residentName?: string;
  onClose: () => void;
  onEnded?: () => void;
}

export function VideoCallModal({ session, visit, residentPhotoUrl, residentName, onClose, onEnded }: Props) {
  const [state, setState] = useState<VideoCallState>('IDLE');
  const [detail, setDetail] = useState<{ rejectionReason?: string; error?: string }>({});
  const [secondsLeft, setSecondsLeft] = useState(60);
  const [connectedSeconds, setConnectedSeconds] = useState(0);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const unitLabel = visit.unit_block && visit.unit_number
    ? `${visit.unit_block} ${visit.unit_number}`
    : visit.unit_number ?? '';

  const handleStateChange = useCallback((newState: VideoCallState, d?: { rejectionReason?: string; error?: string }) => {
    setState(newState);
    setDetail(d ?? {});

    if (newState === 'CALLING') {
      setSecondsLeft(60);
      timerRef.current = setInterval(() => {
        setSecondsLeft(s => {
          if (s <= 1) { clearInterval(timerRef.current!); return 0; }
          return s - 1;
        });
      }, 1000);
    }

    if (newState === 'CONNECTED') {
      if (timerRef.current) clearInterval(timerRef.current);
      setConnectedSeconds(0);
      timerRef.current = setInterval(() => setConnectedSeconds(s => s + 1), 1000);

      if (localVideoRef.current) {
        const stream = videoCallService.getLocalStream();
        if (stream) localVideoRef.current.srcObject = stream;
      }
      if (remoteVideoRef.current) {
        const stream = videoCallService.getRemoteStream();
        if (stream) remoteVideoRef.current.srcObject = stream;
      }
    }

    if (newState === 'REJECTED' || newState === 'MISSED') {
      if (timerRef.current) clearInterval(timerRef.current);
      setTimeout(onClose, 3000);
    }

    if (newState === 'ENDED') {
      if (timerRef.current) clearInterval(timerRef.current);
      onEnded?.();
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    videoCallService.startCall(session, handleStateChange);

    const beforeUnload = (e: BeforeUnloadEvent) => {
      if (state === 'CONNECTED' || state === 'CALLING') {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', beforeUnload);

    return () => {
      window.removeEventListener('beforeunload', beforeUnload);
      if (timerRef.current) clearInterval(timerRef.current);
      videoCallService.reset();
    };
  }, []);

  const handleEnd = () => {
    videoCallService.endCall();
  };

  const toggleMute = () => {
    const stream = videoCallService.getLocalStream();
    stream?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  };

  const toggleCamera = () => {
    const stream = videoCallService.getLocalStream();
    stream?.getVideoTracks().forEach(t => { t.enabled = !t.enabled; });
    setCameraOff(c => !c);
  };

  const formatDuration = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/90">
      <div className="relative w-full max-w-lg mx-4 rounded-2xl overflow-hidden shadow-2xl bg-gray-900 text-white">

        {/* CALLING */}
        {(state === 'IDLE' || state === 'REQUESTING_MEDIA' || state === 'CALLING') && (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-6">
            {residentPhotoUrl ? (
              <img
                src={residentPhotoUrl}
                alt="Morador"
                className="w-28 h-28 rounded-full object-cover ring-4 ring-amber-400 ring-offset-4 ring-offset-gray-900"
              />
            ) : (
              <div className="w-28 h-28 rounded-full bg-gray-700 flex items-center justify-center ring-4 ring-amber-400 ring-offset-4 ring-offset-gray-900">
                <span className="text-4xl">👤</span>
              </div>
            )}

            <div className="text-center">
              <p className="text-xl font-semibold">{residentName ?? visit.visitor_name}</p>
              {unitLabel && <p className="text-gray-400 text-sm mt-1">Apartamento {unitLabel}</p>}
            </div>

            <div className="flex items-center gap-3 text-amber-400">
              <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              <span className="text-sm">A chamar o morador…</span>
            </div>

            {state === 'CALLING' && (
              <p className="text-gray-500 text-xs">{secondsLeft}s restantes</p>
            )}

            <button
              onClick={handleEnd}
              className="mt-2 px-8 py-3 rounded-full bg-red-600 hover:bg-red-700 active:scale-95 transition font-medium"
            >
              Cancelar
            </button>
          </div>
        )}

        {/* CONNECTED */}
        {state === 'CONNECTED' && (
          <div className="relative w-full aspect-[9/16] sm:aspect-video bg-black">
            {/* Remote (resident) video — full size */}
            <video
              ref={remoteVideoRef}
              autoPlay
              playsInline
              className="w-full h-full object-cover"
            />

            {/* Local (guard) video — PiP bottom-right */}
            <video
              ref={localVideoRef}
              autoPlay
              playsInline
              muted
              className={`absolute bottom-16 right-3 w-24 h-32 sm:w-32 sm:h-44 rounded-xl object-cover ring-2 ring-white shadow-lg ${cameraOff ? 'hidden' : ''}`}
            />

            {/* Duration */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/50 text-white text-xs px-3 py-1 rounded-full">
              {formatDuration(connectedSeconds)}
            </div>

            {/* Controls */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-5">
              <button
                onClick={toggleMute}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${muted ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'}`}
                title={muted ? 'Ativar microfone' : 'Silenciar'}
              >
                {muted ? '🔇' : '🎙️'}
              </button>

              <button
                onClick={handleEnd}
                className="w-14 h-14 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center text-xl shadow-lg transition active:scale-95"
                title="Terminar chamada"
              >
                📵
              </button>

              <button
                onClick={toggleCamera}
                className={`w-12 h-12 rounded-full flex items-center justify-center transition ${cameraOff ? 'bg-gray-600' : 'bg-white/20 hover:bg-white/30'}`}
                title={cameraOff ? 'Ligar câmera' : 'Desligar câmera'}
              >
                {cameraOff ? '📷' : '🎥'}
              </button>
            </div>
          </div>
        )}

        {/* REJECTED / MISSED */}
        {(state === 'REJECTED' || state === 'MISSED') && (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
            <div className="text-5xl">{state === 'MISSED' ? '⏰' : '❌'}</div>
            <p className="text-lg font-semibold">
              {state === 'MISSED' ? 'Sem resposta' : 'Chamada recusada'}
            </p>
            <p className="text-sm text-gray-400 text-center">
              {detail.rejectionReason ?? (state === 'MISSED' ? 'O morador não respondeu a tempo.' : 'O morador recusou a chamada.')}
            </p>
            <p className="text-xs text-gray-600">A fechar…</p>
          </div>
        )}

        {/* FAILED */}
        {state === 'FAILED' && (
          <div className="flex flex-col items-center justify-center py-12 px-6 gap-4">
            <div className="text-5xl">⚠️</div>
            <p className="text-lg font-semibold">Chamada falhada</p>
            <p className="text-sm text-gray-400 text-center">
              {detail.error ?? 'Ocorreu um erro inesperado.'}
            </p>
            <button
              onClick={onClose}
              className="mt-2 px-8 py-3 rounded-full bg-gray-700 hover:bg-gray-600 transition font-medium"
            >
              Fechar
            </button>
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
