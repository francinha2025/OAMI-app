import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, Check, Loader2, Scan } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { createWorker } from 'tesseract.js';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string, ocrText?: string) => void;
  mode?: 'photo' | 'ocr';
}

export const CameraModal: React.FC<CameraModalProps> = ({ isOpen, onClose, onCapture, mode = 'photo' }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedImage, setCapturedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => stopCamera();
  }, [isOpen]);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setError(null);
    } catch (err) {
      console.error("Camera Error:", err);
      setError("Não foi possível acessar a câmera. Verifique as permissões.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCapturedImage(null);
    setIsProcessing(false);
    setOcrProgress(0);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL('image/jpeg');
        setCapturedImage(dataUrl);
      }
    }
  };

  const processOCR = async (image: string) => {
    setIsProcessing(true);
    try {
      const worker = await createWorker('por', 1, {
        logger: m => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      const { data: { text } } = await worker.recognize(image);
      await worker.terminate();
      return text;
    } catch (err) {
      console.error("OCR Error:", err);
      return "";
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConfirm = async () => {
    if (capturedImage) {
      let ocrText = "";
      if (mode === 'ocr') {
        ocrText = await processOCR(capturedImage);
      }
      onCapture(capturedImage.split(',')[1], ocrText);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="relative w-full max-w-2xl bg-gray-900 rounded-3xl overflow-hidden shadow-2xl"
        >
          <div className="absolute top-4 right-4 z-10">
            <button 
              onClick={onClose}
              className="p-2 bg-white/10 hover:bg-white/20 text-white rounded-full transition-all"
            >
              <X size={24} />
            </button>
          </div>

          <div className="aspect-[4/3] relative bg-black flex items-center justify-center">
            {error ? (
              <div className="text-white text-center p-8">
                <p className="mb-4">{error}</p>
                <button 
                  onClick={startCamera}
                  className="px-6 py-2 bg-green-600 rounded-xl font-bold"
                >
                  Tentar Novamente
                </button>
              </div>
            ) : capturedImage ? (
              <img src={capturedImage} alt="Captured" className="w-full h-full object-contain" />
            ) : (
              <video 
                ref={videoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
            )}
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="p-6 flex justify-center items-center gap-6 bg-gray-900">
            {isProcessing ? (
              <div className="flex flex-col items-center gap-4 text-white">
                <Loader2 className="animate-spin text-green-500" size={48} />
                <div className="text-center">
                  <p className="font-bold">Processando Documento...</p>
                  <p className="text-xs text-gray-400">{ocrProgress}% concluído</p>
                </div>
              </div>
            ) : !capturedImage ? (
              <button 
                onClick={capturePhoto}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center border-4 border-gray-400 hover:scale-105 transition-all"
              >
                <div className="w-12 h-12 bg-white rounded-full border-2 border-gray-900 flex items-center justify-center">
                  {mode === 'ocr' && <Scan size={24} className="text-gray-900" />}
                </div>
              </button>
            ) : (
              <>
                <button 
                  onClick={() => setCapturedImage(null)}
                  className="flex items-center gap-2 px-6 py-3 bg-white/10 text-white rounded-2xl font-bold hover:bg-white/20 transition-all"
                >
                  <RefreshCw size={20} />
                  Tirar Outra
                </button>
                <button 
                  onClick={handleConfirm}
                  className="flex items-center gap-2 px-8 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all"
                >
                  <Check size={20} />
                  {mode === 'ocr' ? 'Digitalizar' : 'Usar Foto'}
                </button>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
