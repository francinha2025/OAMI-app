import React, { useState, useRef } from 'react';
import { Camera, Upload, X, Image as ImageIcon, Plus, Loader2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { CameraModal } from './CameraModal';

interface PhotoUploadProps {
  photos: string[];
  onChange: (photos: string[]) => void;
  label?: string;
  maxPhotos?: number;
}

export const PhotoUpload: React.FC<PhotoUploadProps> = ({ 
  photos, 
  onChange, 
  label = "Fotos da Atividade / Registro",
  maxPhotos = 10
}) => {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files: File[] = Array.from(e.target.files || []);
    if (files.length === 0) return;

    const newBase64Photos: string[] = [];
    let processedCount = 0;

    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        newBase64Photos.push(base64);
        processedCount++;

        if (processedCount === files.length) {
          const updatedPhotos = [...photos, ...newBase64Photos].slice(0, maxPhotos);
          onChange(updatedPhotos);
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleCameraCapture = (base64: string) => {
    if (photos.length < maxPhotos) {
      onChange([...photos, `data:image/jpeg;base64,${base64}`]);
    }
  };

  const removePhoto = (index: number) => {
    const newPhotos = [...photos];
    newPhotos.splice(index, 1);
    onChange(newPhotos);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">{label}</label>
        <span className="text-[10px] font-bold text-gray-400">{photos.length}/{maxPhotos}</span>
      </div>

      <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
        {photos.map((photo, index) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            key={index} 
            className="relative aspect-square rounded-2xl overflow-hidden group border border-gray-100 dark:border-gray-800"
          >
            <img src={photo} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button 
              type="button"
              onClick={() => removePhoto(index)}
              className="absolute top-2 right-2 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity shadow-lg"
            >
              <X size={12} />
            </button>
          </motion.div>
        ))}

        {photos.length < maxPhotos && (
          <div className="flex gap-2 aspect-square">
            <button 
              type="button"
              onClick={() => setIsCameraOpen(true)}
              className="flex-1 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-400 hover:text-green-600 hover:border-green-300"
            >
              <Camera size={24} />
              <span className="text-[10px] font-bold">Câmera</span>
            </button>
            <button 
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center justify-center gap-2 bg-gray-50 dark:bg-gray-800 border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-all text-gray-400 hover:text-blue-600 hover:border-blue-300"
            >
              <Upload size={24} />
              <span className="text-[10px] font-bold">Galeria</span>
            </button>
          </div>
        )}
      </div>

      <input 
        type="file" 
        multiple 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef}
        onChange={handleFileChange}
      />

      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={handleCameraCapture}
        mode="photo"
      />
    </div>
  );
};
