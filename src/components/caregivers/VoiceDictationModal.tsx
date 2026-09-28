import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Mic, MicOff, Check, Edit2, RotateCcw, X, Loader2, Volume2 } from 'lucide-react';
import { startSpeechRecognitionSession, isSpeechRecognitionSupported } from '../../lib/speechRecognition';

interface VoiceDictationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmText: (text: string) => void;
  promptTitle?: string;
}

export const VoiceDictationModal: React.FC<VoiceDictationModalProps> = ({
  isOpen,
  onClose,
  onConfirmText,
  promptTitle = "Relate como foi o plantão"
}) => {
  // 1. REFS RELACIONADOS À GRAVAÇÃO
  const sessionRef = useRef<{ stop: () => void; abort: () => void } | null>(null);
  const isMountedRef = useRef<boolean>(true);

  // 2. STATES RELACIONADOS À GRAVAÇÃO
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [interimText, setInterimText] = useState<string>('');
  const [finalText, setFinalText] = useState<string>('');
  const [isRefining, setIsRefining] = useState<boolean>(false);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 3. HANDLE STOP RECORDING (useCallback)
  const handleStopRecording = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.stop();
      } catch (err) {
        console.warn("Erro ao parar sessão de voz:", err);
      }
    }
    if (isMountedRef.current) {
      setIsRecording(false);
      setIsRefining(true);
    }
  }, []);

  // 4. HANDLE ABORT / CANCEL RECORDING (useCallback)
  const handleAbortRecording = useCallback(() => {
    if (sessionRef.current) {
      try {
        sessionRef.current.abort();
      } catch (err) {
        console.warn("Erro ao abortar sessão de voz:", err);
      }
      sessionRef.current = null;
    }
    if (isMountedRef.current) {
      setIsRecording(false);
      setIsRefining(false);
    }
  }, []);

  // 5. HANDLE START RECORDING (useCallback)
  const handleStartRecording = useCallback(() => {
    setErrorMsg(null);
    setInterimText('');
    setFinalText('');
    setIsEditing(false);

    if (!isSpeechRecognitionSupported()) {
      setErrorMsg("O reconhecimento de voz não é suportado pelo seu navegador. Recomendamos utilizar o Google Chrome no celular ou computador.");
      return;
    }

    if (sessionRef.current) {
      try {
        sessionRef.current.abort();
      } catch {}
      sessionRef.current = null;
    }

    setIsRecording(true);
    setIsRefining(false);

    sessionRef.current = startSpeechRecognitionSession({
      onInterimResult: (trans) => {
        if (isMountedRef.current) {
          setInterimText(trans);
        }
      },
      onFinalResult: (result) => {
        if (isMountedRef.current) {
          setIsRefining(false);
          setIsRecording(false);
          setFinalText(result.refinedText || result.rawText);
        }
      },
      onError: (msg) => {
        if (isMountedRef.current) {
          setIsRecording(false);
          setIsRefining(false);
          setErrorMsg(msg);
        }
      },
      onEnd: () => {
        if (isMountedRef.current) {
          setIsRefining(true);
        }
      }
    });
  }, []);

  // 6. FUNÇÕES DE AÇÃO
  const handleConfirm = useCallback(() => {
    const textToUse = finalText.trim() || interimText.trim();
    if (textToUse) {
      handleAbortRecording();
      onConfirmText(textToUse);
      onClose();
    }
  }, [finalText, interimText, handleAbortRecording, onConfirmText, onClose]);

  const handleClose = useCallback(() => {
    handleAbortRecording();
    onClose();
  }, [handleAbortRecording, onClose]);

  // 7. CICLO DE VIDA DO MODAL E CLEANUP
  useEffect(() => {
    isMountedRef.current = true;

    if (isOpen) {
      handleStartRecording();
    } else {
      handleAbortRecording();
      setFinalText('');
      setInterimText('');
      setErrorMsg(null);
      setIsEditing(false);
    }

    return () => {
      isMountedRef.current = false;
      if (sessionRef.current) {
        try {
          sessionRef.current.abort();
        } catch {}
        sessionRef.current = null;
      }
    };
  }, [isOpen, handleStartRecording, handleAbortRecording]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
            <Mic size={22} className={isRecording ? 'animate-pulse text-red-500' : ''} />
            <h3 className="text-lg font-black">{promptTitle}</h3>
          </div>
          <button
            type="button"
            onClick={handleClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Estado 1: Mensagem de Erro */}
        {errorMsg && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{errorMsg}</p>
            <button
              type="button"
              onClick={handleStartRecording}
              className="py-2.5 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md active:scale-95"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Estado 2: Gravando */}
        {isRecording && !errorMsg && (
          <div className="text-center py-6 space-y-6">
            <div className="relative w-28 h-28 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping" />
              <div className="w-24 h-24 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xl shadow-emerald-600/30">
                <Mic size={40} className="animate-pulse" />
              </div>
            </div>

            <div>
              <p className="text-xl font-black text-gray-900 dark:text-white">
                Pode falar, estou ouvindo...
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Fale naturalmente. Quando concluir o relato, toque no botão abaixo.
              </p>
            </div>

            {/* Prévia em tempo real */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl min-h-[80px] max-h-36 overflow-y-auto border border-gray-100 dark:border-gray-800">
              <p className="text-sm text-gray-700 dark:text-gray-300 italic font-medium">
                {interimText || "Ouvindo sua voz..."}
              </p>
            </div>

            <button
              type="button"
              onClick={handleStopRecording}
              className="w-full py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black text-base shadow-lg shadow-red-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <MicOff size={20} />
              Concluir Fala
            </button>
          </div>
        )}

        {/* Estado 3: Organizando transcrição */}
        {isRefining && !errorMsg && (
          <div className="text-center py-10 space-y-4">
            <Loader2 size={44} className="animate-spin text-emerald-600 mx-auto" />
            <p className="text-base font-bold text-gray-800 dark:text-white">
              Organizando o relato...
            </p>
            <p className="text-xs text-gray-500">
              Ajustando pontuação e clareza sem alterar o que você falou.
            </p>
          </div>
        )}

        {/* Estado 4: Conferência do Texto */}
        {!isRecording && !isRefining && !errorMsg && finalText && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                <Volume2 size={16} /> Confira o seu relato:
              </span>
              {!isEditing && (
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1"
                >
                  <Edit2 size={12} /> Editar Manualmente
                </button>
              )}
            </div>

            {isEditing ? (
              <textarea
                value={finalText}
                onChange={(e) => setFinalText(e.target.value)}
                rows={6}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-emerald-400 dark:border-emerald-600 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            ) : (
              <div className="p-4 bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl max-h-52 overflow-y-auto">
                <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-medium">
                  {finalText}
                </p>
              </div>
            )}

            {/* Botões de Ação */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check size={20} />
                Está Correto (Usar este texto)
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit2 size={14} />
                  {isEditing ? 'Salvar Edição' : 'Corrigir'}
                </button>

                <button
                  type="button"
                  onClick={handleStartRecording}
                  className="py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCcw size={14} />
                  Gravar Novamente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
