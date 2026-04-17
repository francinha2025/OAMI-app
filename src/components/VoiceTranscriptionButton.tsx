import React, { useState, useEffect } from 'react';
import { Mic, MicOff, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';

interface VoiceTranscriptionButtonProps {
  onTranscribe: (text: string) => void;
  className?: string;
  label?: string;
}

export const VoiceTranscriptionButton: React.FC<VoiceTranscriptionButtonProps> = ({ 
  onTranscribe, 
  className, 
  label 
}) => {
  const [isListening, setIsListening] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognitionInstance = new SpeechRecognition();
      recognitionInstance.continuous = false;
      recognitionInstance.interimResults = false;
      recognitionInstance.lang = 'pt-BR';

      recognitionInstance.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        onTranscribe(transcript);
        setIsListening(false);
      };

      recognitionInstance.onerror = (event: any) => {
        console.error('Speech recognition error', event.error);
        setIsListening(false);
      };

      recognitionInstance.onend = () => {
        setIsListening(false);
      };

      setRecognition(recognitionInstance);
    }
  }, [onTranscribe]);

  const toggleListening = () => {
    if (isListening) {
      recognition?.stop();
    } else {
      recognition?.start();
      setIsListening(true);
    }
  };

  if (!recognition) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      className={cn(
        "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all shadow-sm",
        isListening 
          ? "bg-red-100 text-red-600 animate-pulse border border-red-200" 
          : "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/40",
        className
      )}
      title={isListening ? "Parar de ouvir" : "Ativar comando de voz"}
    >
      {isListening ? (
        <>
          <MicOff size={14} />
          {label || 'Ouvindo...'}
        </>
      ) : (
        <>
          <Mic size={14} />
          {label || 'Voz'}
        </>
      )}
    </button>
  );
};
