import React, { useState, useRef } from 'react';
import { Camera, X, Check, Edit2, RotateCw, Loader2, FileText, Image as ImageIcon } from 'lucide-react';
import { transcribeCaregiverNote } from '../../services/geminiService';

interface NotePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmText: (extractedText: string) => void;
}

export const NotePhotoModal: React.FC<NotePhotoModalProps> = ({
  isOpen,
  onClose,
  onConfirmText
}) => {
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string>('');
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsLoading(true);

    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const base64 = reader.result as string;
        setPhotoPreview(base64);

        try {
          const text = await transcribeCaregiverNote(base64, file.type || 'image/jpeg');
          setExtractedText(text);
          setIsEditing(false);
        } catch (err: any) {
          setErrorMsg("Não foi possível ler o texto da imagem. Verifique a iluminação e tente tirar outra foto.");
        } finally {
          setIsLoading(false);
        }
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setErrorMsg("Erro ao processar imagem.");
      setIsLoading(false);
    }
  };

  const handleRetake = () => {
    setPhotoPreview(null);
    setExtractedText('');
    setIsEditing(false);
    setErrorMsg(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleConfirm = () => {
    if (extractedText.trim()) {
      onConfirmText(extractedText.trim());
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2 text-emerald-700 dark:text-emerald-400 font-bold">
            <Camera size={22} />
            <h3 className="text-lg font-black">Fotografar Anotação</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Input de Câmera Oculto */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={handleFileChange}
        />

        {/* Estado 1: Nenhuma foto selecionada */}
        {!photoPreview && !isLoading && (
          <div className="text-center py-8 space-y-4">
            <div className="w-20 h-20 mx-auto rounded-full bg-emerald-50 dark:bg-emerald-950/40 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <Camera size={36} />
            </div>
            <div>
              <p className="text-base font-bold text-gray-800 dark:text-gray-100">
                Tire uma foto do caderno ou folha de anotações
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                O sistema fará a leitura da escrita e transformará em texto automaticamente para o seu relatório.
              </p>
            </div>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <Camera size={20} />
              Tirar Foto Agora
            </button>
          </div>
        )}

        {/* Estado 2: Processamento */}
        {isLoading && (
          <div className="text-center py-12 space-y-4">
            <Loader2 size={44} className="animate-spin text-emerald-600 mx-auto" />
            <p className="text-base font-bold text-gray-800 dark:text-white">
              Lendo sua anotação...
            </p>
            <p className="text-xs text-gray-500">
              A inteligência artificial está identificando e convertendo o texto manuscrito.
            </p>
          </div>
        )}

        {/* Estado 3: Erro */}
        {errorMsg && !isLoading && (
          <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 rounded-2xl text-center space-y-3">
            <p className="text-sm font-semibold text-red-700 dark:text-red-400">{errorMsg}</p>
            <button
              type="button"
              onClick={handleRetake}
              className="py-2.5 px-5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all"
            >
              Tentar Novamente
            </button>
          </div>
        )}

        {/* Estado 4: Texto Extraído e Confirmação */}
        {photoPreview && !isLoading && extractedText && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={photoPreview}
                alt="Anotação fotografada"
                className="w-16 h-16 object-cover rounded-xl border border-gray-200 dark:border-gray-700 shrink-0"
              />
              <div className="text-xs text-gray-500">
                <span className="font-bold text-gray-700 dark:text-gray-300 block">Foto da Anotação</span>
                Confira o texto lido abaixo antes de confirmar o uso.
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                  Texto Identificado:
                </label>
                {!isEditing && (
                  <button
                    type="button"
                    onClick={() => setIsEditing(true)}
                    className="text-xs text-emerald-600 hover:underline font-bold flex items-center gap-1"
                  >
                    <Edit2 size={12} /> Editar
                  </button>
                )}
              </div>

              {isEditing ? (
                <textarea
                  value={extractedText}
                  onChange={(e) => setExtractedText(e.target.value)}
                  rows={6}
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 border border-emerald-300 dark:border-emerald-700 rounded-2xl text-sm font-medium text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              ) : (
                <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40 rounded-2xl max-h-48 overflow-y-auto">
                  <p className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed font-medium">
                    {extractedText}
                  </p>
                </div>
              )}
            </div>

            {/* Ações */}
            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={handleConfirm}
                className="w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/20 flex items-center justify-center gap-2 active:scale-95 transition-all"
              >
                <Check size={20} />
                Usar Este Texto
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setIsEditing(!isEditing)}
                  className="py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Edit2 size={14} />
                  {isEditing ? 'Salvar Edição' : 'Corrigir Texto'}
                </button>

                <button
                  type="button"
                  onClick={handleRetake}
                  className="py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <RotateCw size={14} />
                  Tirar Outra Foto
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
