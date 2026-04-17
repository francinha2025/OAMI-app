import React, { useState } from 'react';
import { Scan, Loader2 } from 'lucide-react';
import { CameraModal } from './CameraModal';

interface DigitizeButtonProps {
  onDigitize: (text: string, imageUrl: string) => void;
  label?: string;
  className?: string;
}

export const DigitizeButton: React.FC<DigitizeButtonProps> = ({ 
  onDigitize, 
  label = "Digitalizar Documento",
  className = "" 
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  const handleCapture = (base64: string, ocrText?: string) => {
    onDigitize(ocrText || "", `data:image/jpeg;base64,${base64}`);
  };

  return (
    <>
      <button 
        type="button"
        onClick={() => setIsCameraOpen(true)}
        className={`flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none ${className}`}
      >
        <Scan size={20} />
        {label}
      </button>

      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCapture}
        mode="ocr"
      />
    </>
  );
};
