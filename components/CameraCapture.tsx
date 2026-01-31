import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { PhotoQuality } from '../types';
import { logger, ErrorCategory } from '@/services/logger';

// Photo quality configuration for data saving
const QUALITY_CONFIG: Record<PhotoQuality, { scale: number; jpegQuality: number }> = {
  [PhotoQuality.HIGH]: { scale: 0.75, jpegQuality: 0.85 },
  [PhotoQuality.MEDIUM]: { scale: 0.5, jpegQuality: 0.7 },
  [PhotoQuality.LOW]: { scale: 0.25, jpegQuality: 0.5 }
};

interface CameraCaptureProps {
  onCapture: (base64Image: string) => void;
  mode?: 'photo' | 'scan';
  onQrScanned?: (qrData: string) => void;
  photoQuality?: PhotoQuality; // For data saving
}

const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, mode = 'photo', onQrScanned, photoQuality = PhotoQuality.MEDIUM }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string>('');

  const startCamera = async () => {
    try {
      // Check if mediaDevices is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError("Camera API not supported. Use HTTPS or localhost.");
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsStreaming(true);
        setError('');
      }
    } catch (err: any) {
      logger.error('Error accessing camera', err, ErrorCategory.CAMERA);

      // Provide specific error messages
      if (err.name === 'NotAllowedError') {
        setError("Camera permission denied. Allow camera access in browser.");
      } else if (err.name === 'NotFoundError') {
        setError("No camera found on this device.");
      } else if (err.name === 'NotReadableError') {
        setError("Camera is already in use by another app.");
      } else {
        setError("Camera unavailable. Use HTTPS or check permissions.");
      }
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      setIsStreaming(false);
    }
  };

  useEffect(() => {
    let qrScanner: Html5Qrcode | null = null;
    let isScanning = false;

    const initScanner = async () => {
      if (mode === 'scan' && onQrScanned) {
        try {
          // Create QR scanner instance
          qrScanner = new Html5Qrcode("qr-reader");

          // Start scanning with improved settings
          await qrScanner.start(
            { facingMode: "environment" },
            {
              fps: 20, // Increased from 10 for faster detection
              qrbox: 300, // Larger scanning area for better detection
              aspectRatio: 1.0, // Square aspect ratio
              disableFlip: false // Allow horizontal flip for better detection
            },
            (decodedText) => {
              // QR Code detected!
              logger.info('QR Code detected', { decodedText });
              onQrScanned(decodedText);
              // Stop scanner after successful scan
              if (qrScanner && isScanning) {
                isScanning = false;
                qrScanner.stop().catch((err) => logger.error('Failed to stop QR scanner', err, ErrorCategory.CAMERA));
              }
            },
            (errorMessage) => {
              // Scanning error (this fires continuously, so we don't log it)
            }
          );
          isScanning = true;
        } catch (err) {
          logger.error('QR Scanner error', err, ErrorCategory.CAMERA);
          setError("Failed to start QR scanner");
        }
      } else if (mode === 'photo') {
        // Photo mode - use regular camera
        startCamera();
      }
    };

    initScanner();

    return () => {
      // Cleanup: only stop if scanner is actually running
      if (qrScanner && isScanning) {
        qrScanner.stop().catch((err) => {
          // Ignore "scanner not running" errors during cleanup
          if (!err?.message?.includes('not running')) {
            logger.error('QR Scanner cleanup error', err, ErrorCategory.CAMERA);
          }
        });
      } else {
        stopCamera();
      }
    };
  }, [mode, onQrScanned]);

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      // Get quality settings based on photo quality prop
      const config = QUALITY_CONFIG[photoQuality];

      logger.debug('Capturing photo', {
        videoWidth: video.videoWidth,
        videoHeight: video.videoHeight,
        quality: photoQuality,
        scale: config.scale,
        jpegQuality: config.jpegQuality
      });

      // Set canvas size based on quality setting (for data saving)
      canvas.width = video.videoWidth * config.scale;
      canvas.height = video.videoHeight * config.scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg', config.jpegQuality);
        const sizeKB = Math.round(dataUrl.length * 0.75 / 1024); // Approximate KB
        logger.info('Photo captured', { quality: photoQuality, sizeKB });
        setCapturedImage(dataUrl);
        onCapture(dataUrl);
      }
    } else {
      logger.error('Cannot capture: video or canvas ref is null', undefined, ErrorCategory.CAMERA);
    }
  };

  const retake = () => {
    setCapturedImage(null);
    onCapture('');
  };

  if (error) {
    return (
      <div className="bg-slate-200 h-48 flex items-center justify-center rounded-lg text-slate-500">
        {error}
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4 w-full">
      {mode === 'scan' ? (
        <div className="w-full max-w-md">
          <div id="qr-reader" className="w-full rounded-lg overflow-hidden"></div>
          <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm text-blue-800 text-center font-medium">
              💡 Posicione o código QR dentro da área marcada
            </p>
          </div>
        </div>
      ) : (
        <div className="relative w-full max-w-md aspect-video bg-black rounded-lg overflow-hidden shadow-inner">
          {!capturedImage ? (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          ) : (
            <img src={capturedImage} alt="Captured" className="w-full h-full object-cover" />
          )}

          <canvas ref={canvasRef} className="hidden" />
        </div>
      )}

      <div className="flex gap-4">
        {mode === 'photo' && (
          !capturedImage ? (
            <button
              type="button"
              onClick={capturePhoto}
              className="flex items-center gap-2 px-6 py-3 bg-accent text-white rounded-full font-bold text-lg active:scale-95 transition-transform shadow-lg"
            >
              <Camera size={24} />
              Tirar Foto
            </button>
          ) : (
            <button
              type="button"
              onClick={retake}
              className="flex items-center gap-2 px-6 py-3 bg-slate-600 text-white rounded-full font-bold text-lg active:scale-95 transition-transform"
            >
              <RefreshCw size={24} />
              Repetir Foto
            </button>
          )
        )}
        {mode === 'scan' && (
          <div className="text-slate-500 font-medium animate-pulse">A procurar código QR...</div>
        )}
      </div>
    </div>
  );
};

export default CameraCapture;