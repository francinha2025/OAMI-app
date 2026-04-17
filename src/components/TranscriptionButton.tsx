import React, { useState, useRef } from 'react';
import { Camera, Loader2, FileSearch, Image as ImageIcon } from 'lucide-react';
import { GoogleGenAI } from "@google/genai";
import { cn } from '../lib/utils';
import { CameraModal } from './CameraModal';

interface TranscriptionButtonProps {
  onTranscribe: (text: string) => void;
  className?: string;
  label?: string;
}

export const TranscriptionButton: React.FC<TranscriptionButtonProps> = ({ onTranscribe, className, label }) => {
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processImage = async (base64Data: string, mimeType: string = 'image/jpeg') => {
    setIsTranscribing(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Transcreva o texto manuscrito ou impresso desta imagem de um documento institucional (como um relatório de evolução, visita ou plano de atendimento). Retorne apenas o texto transcrito, sem comentários adicionais. Se houver campos específicos, tente manter a estrutura se possível, mas foque no conteúdo textual principal." },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ]
      });

      const transcribedText = response.text;
      if (transcribedText) {
        onTranscribe(transcribedText);
      }
    } catch (error) {
      console.error("Transcription Error:", error);
    } finally {
      setIsTranscribing(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      processImage(base64Data, file.type);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <input
        type="file"
        accept="image/*"
        className="hidden"
        ref={fileInputRef}
        onChange={handleFileChange}
      />
      
      <CameraModal 
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(base64) => processImage(base64)}
      />

      <div className="flex gap-1">
        <button
          type="button"
          disabled={isTranscribing}
          onClick={() => setIsCameraOpen(true)}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-600 text-white rounded-l-lg text-xs font-bold hover:bg-green-700 transition-all disabled:opacity-50"
          title="Tirar foto agora"
        >
          {isTranscribing ? (
            <Loader2 size={14} className="animate-spin" />
          ) : (
            <Camera size={14} />
          )}
          {label || 'Câmera'}
        </button>
        <button
          type="button"
          disabled={isTranscribing}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-r-lg text-xs font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-all disabled:opacity-50 border-l border-green-200 dark:border-green-800"
          title="Escolher arquivo ou foto da galeria"
        >
          <ImageIcon size={14} />
          Galeria
        </button>
      </div>
    </div>
  );
};
