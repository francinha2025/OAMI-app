import { refineCaregiverSpeech } from '../services/geminiService';

export interface SpeechRecognitionResult {
  rawText: string;
  refinedText: string;
}

/**
 * Checks if the browser supports Speech Recognition natively (Web Speech API).
 */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition);
}

/**
 * Starts speech recognition session with Portuguese (pt-BR).
 */
export function startSpeechRecognitionSession({
  onInterimResult,
  onFinalResult,
  onError,
  onEnd
}: {
  onInterimResult?: (transcript: string) => void;
  onFinalResult: (result: SpeechRecognitionResult) => void;
  onError: (errorMsg: string) => void;
  onEnd?: () => void;
}): { stop: () => void; abort: () => void } {
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

  if (!SpeechRecognition) {
    onError("Reconhecimento de voz não suportado neste navegador. Utilize o Google Chrome no celular ou computador.");
    return { stop: () => {}, abort: () => {} };
  }

  let fullTranscript = '';
  let recognition: any = null;

  try {
    recognition = new SpeechRecognition();
    recognition.lang = 'pt-BR';
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event: any) => {
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const item = event.results[i];
        if (item.isFinal) {
          fullTranscript += (fullTranscript ? ' ' : '') + item[0].transcript;
        } else {
          interim += item[0].transcript;
        }
      }

      if (onInterimResult) {
        onInterimResult(interim || fullTranscript);
      }
    };

    recognition.onerror = (event: any) => {
      console.warn("Speech recognition error:", event.error);
      if (event.error === 'not-allowed') {
        onError("Permissão de microfone negada. Por favor, autorize o microfone para falar.");
      } else if (event.error === 'no-speech') {
        // Just silent
      } else {
        onError("Não foi possível captar a voz. Tente falar novamente.");
      }
    };

    recognition.onend = async () => {
      if (onEnd) onEnd();
      const raw = fullTranscript.trim();
      if (!raw) return;

      try {
        const refined = await refineCaregiverSpeech(raw);
        onFinalResult({ rawText: raw, refinedText: refined });
      } catch {
        onFinalResult({ rawText: raw, refinedText: raw });
      }
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.stop();
        } catch {}
      },
      abort: () => {
        try {
          recognition.abort();
        } catch {}
      }
    };
  } catch (err: any) {
    onError("Erro ao inicializar microfone: " + (err.message || String(err)));
    return { stop: () => {}, abort: () => {} };
  }
}
