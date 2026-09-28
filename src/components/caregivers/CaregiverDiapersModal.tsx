import React, { useState } from 'react';
import { X, Plus, Minus, Check, Package, Search, User as UserIcon } from 'lucide-react';
import { collection, addDoc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Elderly, User } from '../../types';
import { format } from 'date-fns';
import { formatShiftName, formatDiaperCount } from './caregiverUtils';

interface CaregiverDiapersModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  elderlyList: Elderly[];
  currentShiftName?: string;
  onLoggedSuccess?: (record: { elderlyId: string; elderlyName: string; size: string; quantity: number; time: string }) => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

export const CaregiverDiapersModal: React.FC<CaregiverDiapersModalProps> = ({
  isOpen,
  onClose,
  user,
  elderlyList,
  currentShiftName = 'MANHA',
  onLoggedSuccess,
  showToast
}) => {
  const [selectedElderly, setSelectedElderly] = useState<Elderly | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('G');
  const [quantity, setQuantity] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const SIZES = ['P', 'M', 'G', 'XG', 'Tamanho Único'];

  const filteredElderly = elderlyList
    .filter(e => e.status === 'ATIVO')
    .filter(e => !searchQuery || e.name.toLowerCase().includes(searchQuery.toLowerCase().trim()));

  const handleSave = async () => {
    if (!selectedElderly) {
      showToast("Selecione o(a) acolhido(a) que utilizou a fralda.", "error");
      return;
    }

    if (quantity <= 0) {
      showToast("A quantidade deve ser de pelo menos 1 fralda.", "error");
      return;
    }

    setIsSaving(true);
    const now = new Date();
    const todayStr = format(now, 'yyyy-MM-dd');
    const timeStr = format(now, 'HH:mm');

    try {
      // 1. Gravar em diaperConsumptionLogs (atualiza estoque da Fábrica SGPF)
      await addDoc(collection(db, 'diaperConsumptionLogs'), {
        elderlyId: selectedElderly.id,
        elderlyName: selectedElderly.name,
        date: todayStr,
        quantity: Number(quantity),
        size: selectedSize,
        shift: currentShiftName,
        usesDiapers: true,
        notes: `Registrado pela cuidadora ${user.name} às ${timeStr} (Turno ${formatShiftName(currentShiftName)})`,
        createdBy: user.name,
        createdByUserId: user.id,
        createdByEmail: user.email || '',
        createdAt: now.toISOString()
      });

      // 2. Gravar em diaperChangeRecords (atualiza prontuário de enfermagem do acolhido)
      await addDoc(collection(db, 'diaperChangeRecords'), {
        patientId: selectedElderly.id,
        elderlyId: selectedElderly.id,
        date: todayStr,
        time: timeStr,
        aspect: 'NORMAL',
        size: selectedSize,
        shift: currentShiftName,
        observations: `Troca de fralda (${quantity} un. tamanho ${selectedSize}) — Cuidadora: ${user.name}`,
        registeredBy: user.name,
        registeredByUserId: user.id,
        createdAt: now.toISOString()
      });

      if (onLoggedSuccess) {
        onLoggedSuccess({
          elderlyId: selectedElderly.id,
          elderlyName: selectedElderly.name,
          size: selectedSize,
          quantity,
          time: timeStr
        });
      }

      showToast(`Registrado com sucesso: ${formatDiaperCount(quantity)} para ${selectedElderly.name}.`, "success");
      // Resetar para próximo lançamento
      setSelectedElderly(null);
      setQuantity(1);
      onClose();
    } catch (err: any) {
      console.error("Erro ao registrar fralda:", err);
      showToast("Erro ao registrar o uso da fralda. Tente novamente.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-bold">
            <Package size={24} />
            <div>
              <h3 className="text-lg font-black leading-none">Fraldas Utilizadas</h3>
              <p className="text-xs text-gray-500 font-normal mt-0.5">Lançamento rápido do plantão</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* 1. SELEÇÃO DO ACOLHIDO */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
            1. Quem utilizou a fralda?
          </label>

          <div className="relative">
            <Search size={18} className="absolute left-3.5 top-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar acolhido(a) por nome..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="max-h-44 overflow-y-auto space-y-2 pr-1 pt-1">
            {filteredElderly.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Nenhum(a) acolhido(a) encontrado(a).</p>
            ) : (
              filteredElderly.map((eld) => {
                const isSelected = selectedElderly?.id === eld.id;
                return (
                  <button
                    key={eld.id}
                    type="button"
                    onClick={() => setSelectedElderly(eld)}
                    className={`w-full p-3 rounded-2xl flex items-center gap-3 text-left transition-all ${
                      isSelected
                        ? 'bg-blue-600 text-white shadow-md shadow-blue-500/30 font-bold'
                        : 'bg-gray-50 dark:bg-gray-800/80 hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-800 dark:text-gray-200'
                    }`}
                  >
                    {eld.photoUrl ? (
                      <img src={eld.photoUrl} alt="" className="w-9 h-9 rounded-full object-cover border border-white/40" />
                    ) : (
                      <div className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs ${
                        isSelected ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300'
                      }`}>
                        {eld.name.charAt(0)}
                      </div>
                    )}
                    <span className="font-bold text-sm truncate flex-1">{eld.name}</span>
                    {isSelected && <Check size={18} className="text-white shrink-0" />}
                  </button>
                );
              })
            )}
          </div>
        </div>

        {/* 2. TAMANHO DA FRALDA */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
            2. Tamanho da fralda
          </label>
          <div className="grid grid-cols-5 gap-2">
            {SIZES.map((sz) => (
              <button
                key={sz}
                type="button"
                onClick={() => setSelectedSize(sz)}
                className={`py-3 rounded-xl font-black text-xs transition-all ${
                  selectedSize === sz
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-600/30'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300'
                }`}
              >
                {sz}
              </button>
            ))}
          </div>
        </div>

        {/* 3. QUANTIDADE UTILIZADA */}
        <div className="space-y-2">
          <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
            3. Quantas fraldas foram utilizadas?
          </label>

          <div className="flex items-center justify-center gap-4 bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl">
            <button
              type="button"
              onClick={() => setQuantity(Math.max(1, quantity - 1))}
              className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 shadow flex items-center justify-center text-gray-800 dark:text-white active:scale-95 text-lg font-black"
            >
              <Minus size={20} />
            </button>

            <span className="text-3xl font-black text-blue-600 dark:text-blue-400 w-16 text-center">
              {quantity}
            </span>

            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="w-12 h-12 rounded-xl bg-white dark:bg-gray-700 shadow flex items-center justify-center text-gray-800 dark:text-white active:scale-95 text-lg font-black"
            >
              <Plus size={20} />
            </button>
          </div>

          <div className="flex justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => setQuantity(quantity + 1)}
              className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
            >
              +1 Fralda
            </button>
            <button
              type="button"
              onClick={() => setQuantity(quantity + 2)}
              className="px-4 py-2 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 rounded-xl text-xs font-bold transition-all"
            >
              +2 Fraldas
            </button>
          </div>
        </div>

        {/* Botão de Envio */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!selectedElderly || isSaving}
          className="w-full py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black text-base shadow-lg shadow-blue-600/20 disabled:opacity-50 active:scale-95 transition-all flex items-center justify-center gap-2"
        >
          {isSaving ? "Registrando..." : "Registrar Uso de Fralda"}
        </button>
      </div>
    </div>
  );
};
