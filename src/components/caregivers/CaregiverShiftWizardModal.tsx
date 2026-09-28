import React, { useState, useEffect, useCallback } from 'react';
import { 
  X, Check, ArrowRight, ArrowLeft, Mic, Camera, AlertTriangle, 
  Smile, User as UserIcon, Users, Calendar, Clock, Package, 
  Plus, Trash2, Edit3, CheckCircle2, Search, HeartHandshake, ShieldAlert,
  Moon, Sun, CloudSun, Sparkles, Info
} from 'lucide-react';
import { collection, addDoc, updateDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Elderly, User, StaffMember, Professional, ShiftSchedule, CaregiverShiftReport } from '../../types';
import { format } from 'date-fns';
import { VoiceDictationModal } from './VoiceDictationModal';
import { NotePhotoModal } from './NotePhotoModal';
import { CaregiverDiapersModal } from './CaregiverDiapersModal';
import { formatShiftName, formatShiftStatus, formatDiaperCount } from './caregiverUtils';

interface CaregiverShiftWizardModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  elderlyList: Elderly[];
  staffList: StaffMember[];
  professionalsList: Professional[];
  shiftSchedules?: ShiftSchedule[];
  existingReports: CaregiverShiftReport[];
  initialDraft?: Partial<CaregiverShiftReport> | null;
  editingReport?: CaregiverShiftReport | null;
  onFinishedSuccess: () => void;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const RESIDENT_TAGS = [
  { id: 'BEM', label: '😊 Bem e estável' },
  { id: 'SONOLENTO', label: '😴 Mais sonolento(a)' },
  { id: 'ALIMENTACAO', label: '🍽️ Alteração na alimentação' },
  { id: 'HIDRATACAO', label: '💧 Alteração na hidratação' },
  { id: 'HIGIENE', label: '🚿 Higiene e banho' },
  { id: 'ELIMINACAO', label: '🚽 Eliminações' },
  { id: 'REPOUSO', label: '🛏️ Repouso no leito' },
  { id: 'MOBILIDADE', label: '🚶 Mobilidade e locomoção' },
  { id: 'COMPORTAMENTO', label: '😟 Alteração de comportamento' },
  { id: 'OCORRENCIA', label: '⚠️ Ocorrência clínica' },
  { id: 'OUTRO', label: '📝 Outra observação' },
];

export const CaregiverShiftWizardModal: React.FC<CaregiverShiftWizardModalProps> = ({
  isOpen,
  onClose,
  user,
  elderlyList,
  staffList,
  professionalsList,
  shiftSchedules = [],
  existingReports,
  initialDraft,
  editingReport,
  onFinishedSuccess,
  showToast
}) => {
  const [step, setStep] = useState<number>(1);
  const totalSteps = 5;

  // Estado do Formulário
  const [date, setDate] = useState<string>(format(new Date(), 'yyyy-MM-dd'));
  const [shift, setShift] = useState<'MANHA' | 'TARDE' | 'NOITE' | '24_HORAS'>('MANHA');
  const [startTime, setStartTime] = useState<string>('07:00');
  const [endTime, setEndTime] = useState<string>('13:00');

  // Colegas de Equipe
  const [selectedCoworkers, setSelectedCoworkers] = useState<Array<{ id?: string; name: string; role?: string }>>([]);
  const [customCoworkerName, setCustomCoworkerName] = useState<string>('');
  const [showAddCustomCoworker, setShowAddCustomCoworker] = useState<boolean>(false);

  // Status Geral do Plantão e Relato
  const [status, setStatus] = useState<'TRANQUILO' | 'COM_OCORRENCIAS' | 'INTERCORRENCIA'>('TRANQUILO');
  const [generalNotes, setGeneralNotes] = useState<string>('');

  // Observações por Acolhido
  const [hasResidentNotes, setHasResidentNotes] = useState<boolean>(false);
  const [residentNotes, setResidentNotes] = useState<Array<{
    elderlyId: string;
    elderlyName: string;
    statusTags: string[];
    observation: string;
  }>>([]);
  const [activeResidentForNotes, setActiveResidentForNotes] = useState<Elderly | null>(null);
  const [tempTags, setTempTags] = useState<string[]>([]);
  const [tempObs, setTempObs] = useState<string>('');
  const [residentSearch, setResidentSearch] = useState<string>('');

  // Intercorrências
  const [hasIncidents, setHasIncidents] = useState<boolean>(false);
  const [incidents, setIncidents] = useState<Array<{
    elderlyId: string;
    elderlyName: string;
    time?: string;
    description: string;
    actionTaken: string;
    notifiedPeople: string[];
  }>>([]);
  const [tempIncElderly, setTempIncElderly] = useState<Elderly | null>(null);
  const [tempIncTime, setTempIncTime] = useState<string>(format(new Date(), 'HH:mm'));
  const [tempIncDesc, setTempIncDesc] = useState<string>('');
  const [tempIncAction, setTempIncAction] = useState<string>('');
  const [tempIncNotified, setTempIncNotified] = useState<string[]>([]);

  // Fraldas utilizadas
  const [diapersUsed, setDiapersUsed] = useState<Array<{
    elderlyId: string;
    elderlyName: string;
    size: string;
    quantity: number;
    time?: string;
  }>>([]);

  // Modais de voz, foto e fraldas
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState<boolean>(false);
  const [voiceTarget, setVoiceTarget] = useState<'GENERAL' | 'RESIDENT' | 'INCIDENT'>('GENERAL');
  const [isPhotoModalOpen, setIsPhotoModalOpen] = useState<boolean>(false);
  const [photoTarget, setPhotoTarget] = useState<'GENERAL' | 'RESIDENT' | 'INCIDENT'>('GENERAL');
  const [isDiaperModalOpen, setIsDiaperModalOpen] = useState<boolean>(false);

  // Estados de confirmação e salvamento
  const [showConfirmModal, setShowConfirmModal] = useState<boolean>(false);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Chave de Rascunho
  const draftKey = `oami_caregiver_shift_draft_${user.id}`;

  const applyDraft = useCallback((data: any) => {
    if (data.date) setDate(data.date);
    if (data.shift) setShift(data.shift);
    if (data.startTime) setStartTime(data.startTime);
    if (data.endTime) setEndTime(data.endTime);
    if (data.teamMembers) setSelectedCoworkers(data.teamMembers);
    if (data.status) setStatus(data.status);
    if (data.generalNotes) setGeneralNotes(data.generalNotes);
    if (data.residentNotes && data.residentNotes.length > 0) {
      setResidentNotes(data.residentNotes);
      setHasResidentNotes(true);
    } else {
      setResidentNotes([]);
      setHasResidentNotes(false);
    }
    if (data.incidents && data.incidents.length > 0) {
      setIncidents(data.incidents);
      setHasIncidents(true);
    } else {
      setIncidents([]);
      setHasIncidents(false);
    }
    if (data.diapersUsed) setDiapersUsed(data.diapersUsed);
    else setDiapersUsed([]);
  }, []);

  // Inicializar rascunho ou dados para edição se disponível
  useEffect(() => {
    if (isOpen) {
      if (editingReport) {
        applyDraft(editingReport);
      } else if (initialDraft) {
        applyDraft(initialDraft);
      } else {
        const saved = localStorage.getItem(draftKey);
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            applyDraft(parsed);
          } catch {}
        }
      }
    }
  }, [isOpen, editingReport, initialDraft, draftKey, applyDraft]);

  // Salvamento automático do rascunho (apenas quando não estiver em modo de edição)
  useEffect(() => {
    if (!isOpen || isFinished || !!editingReport) return;
    const draftData = {
      date,
      shift,
      startTime,
      endTime,
      teamMembers: selectedCoworkers,
      status,
      generalNotes,
      residentNotes,
      hasIncidents,
      incidents,
      diapersUsed,
      updatedAt: new Date().toISOString()
    };
    try {
      localStorage.setItem(draftKey, JSON.stringify(draftData));
    } catch {}
  }, [date, shift, startTime, endTime, selectedCoworkers, status, generalNotes, residentNotes, hasIncidents, incidents, diapersUsed, isOpen, isFinished, draftKey, editingReport]);

  // Ajuste automático de horários por turno
  const handleShiftSelect = (newShift: 'MANHA' | 'TARDE' | 'NOITE' | '24_HORAS') => {
    setShift(newShift);
    if (newShift === 'MANHA') {
      setStartTime('07:00');
      setEndTime('13:00');
    } else if (newShift === 'TARDE') {
      setStartTime('13:00');
      setEndTime('19:00');
    } else if (newShift === 'NOITE') {
      setStartTime('19:00');
      setEndTime('07:00');
    } else if (newShift === '24_HORAS') {
      setStartTime('07:00');
      setEndTime('07:00');
    }
  };

  // Alternar colega na seleção (mantido por compatibilidade)
  const toggleCoworker = (coworker: { id?: string; name: string; role?: string }) => {
    const exists = selectedCoworkers.some(c => c.name.toLowerCase() === coworker.name.toLowerCase());
    if (exists) {
      setSelectedCoworkers(selectedCoworkers.filter(c => c.name.toLowerCase() !== coworker.name.toLowerCase()));
    } else {
      setSelectedCoworkers([...selectedCoworkers, coworker]);
    }
  };

  // Adicionar colega digitado no plantão
  const handleAddCustomCoworker = () => {
    if (!customCoworkerName.trim()) return;
    const rawNames = customCoworkerName
      .split(/[,;\n]+/)
      .map(n => n.trim())
      .filter(n => n.length > 0);

    const existingNames = new Set(selectedCoworkers.map(c => c.name.toLowerCase()));
    const toAdd = rawNames
      .filter(n => !existingNames.has(n.toLowerCase()))
      .map(n => ({ name: n, role: 'Colega de Plantão' }));

    if (toAdd.length > 0) {
      setSelectedCoworkers(prev => [...prev, ...toAdd]);
    }
    setCustomCoworkerName('');
    setShowAddCustomCoworker(false);
  };

  // Salvar observação individual
  const handleSaveResidentNote = () => {
    if (!activeResidentForNotes) return;
    const newEntry = {
      elderlyId: activeResidentForNotes.id,
      elderlyName: activeResidentForNotes.name,
      statusTags: tempTags,
      observation: tempObs.trim()
    };
    const updated = residentNotes.filter(n => n.elderlyId !== activeResidentForNotes.id);
    setResidentNotes([...updated, newEntry]);
    setActiveResidentForNotes(null);
    setTempTags([]);
    setTempObs('');
  };

  // Adicionar intercorrência
  const handleAddIncident = () => {
    if (!tempIncElderly || !tempIncDesc.trim()) {
      showToast("Informe o(a) acolhido(a) e relate o que aconteceu na intercorrência.", "error");
      return;
    }
    const newInc = {
      elderlyId: tempIncElderly.id,
      elderlyName: tempIncElderly.name,
      time: tempIncTime,
      description: tempIncDesc.trim(),
      actionTaken: tempIncAction.trim(),
      notifiedPeople: tempIncNotified
    };
    setIncidents([...incidents, newInc]);
    setTempIncElderly(null);
    setTempIncDesc('');
    setTempIncAction('');
    setTempIncNotified([]);
    showToast("Intercorrência adicionada ao relatório.", "success");
  };

  // Envio e Finalização do Plantão (ou Salvamento de Edição)
  const handleFinalizeShift = async () => {
    setIsSaving(true);
    const now = new Date();
    const totalDiapers = diapersUsed.reduce((acc, d) => acc + d.quantity, 0);

    const reportData: Omit<CaregiverShiftReport, 'id'> = {
      date,
      shift,
      startTime,
      endTime,
      caregiverId: editingReport?.caregiverId || user.id,
      caregiverName: editingReport?.caregiverName || user.name,
      caregiverEmail: editingReport?.caregiverEmail || user.email || '',
      teamMembers: selectedCoworkers,
      status,
      generalNotes: generalNotes.trim(),
      residentNotes,
      hasIncidents: incidents.length > 0,
      incidents,
      diapersUsed,
      totalDiapersCount: totalDiapers,
      isDraft: false,
      createdAt: editingReport?.createdAt || now.toISOString(),
      createdByUserId: editingReport?.createdByUserId || user.id,
      createdByName: editingReport?.createdByName || user.name,
      createdByEmail: editingReport?.createdByEmail || user.email || '',
      finishedAt: editingReport?.finishedAt || now.toISOString(),
      updatedAt: now.toISOString(),
      updatedByUserId: user.id,
      updatedByName: user.name,
      changeLog: [
        ...(editingReport?.changeLog || []),
        {
          timestamp: now.toISOString(),
          userId: user.id,
          userName: user.name,
          action: editingReport ? 'ATUALIZADO' : 'FINALIZADO',
          details: editingReport
            ? 'Plantão editado e atualizado pela usuária.'
            : 'Plantão finalizado pela cuidadora responsável.'
        }
      ]
    };

    try {
      if (editingReport?.id) {
        await updateDoc(doc(db, 'caregiverShifts', editingReport.id), reportData as any);
        showToast("Plantão atualizado com sucesso!", "success");
      } else {
        await addDoc(collection(db, 'caregiverShifts'), reportData);
        localStorage.removeItem(draftKey);
        showToast("Plantão registrado e finalizado com sucesso!", "success");
      }
      setIsFinished(true);
      setShowConfirmModal(false);
      onFinishedSuccess();
    } catch (err: any) {
      console.error("Erro ao salvar plantão:", err);
      showToast("Erro ao salvar o plantão. Verifique sua conexão com a internet.", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Retorno de Ditado por Voz
  const handleVoiceConfirm = (text: string) => {
    if (voiceTarget === 'GENERAL') {
      setGeneralNotes(prev => (prev ? prev + '\n' + text : text));
    } else if (voiceTarget === 'RESIDENT') {
      setTempObs(prev => (prev ? prev + ' ' + text : text));
    } else if (voiceTarget === 'INCIDENT') {
      setTempIncDesc(prev => (prev ? prev + ' ' + text : text));
    }
  };

  // Retorno da Digitalização de Foto
  const handlePhotoConfirm = (text: string) => {
    if (photoTarget === 'GENERAL') {
      setGeneralNotes(prev => (prev ? prev + '\n' + text : text));
    } else if (photoTarget === 'RESIDENT') {
      setTempObs(prev => (prev ? prev + ' ' + text : text));
    } else if (photoTarget === 'INCIDENT') {
      setTempIncDesc(prev => (prev ? prev + ' ' + text : text));
    }
  };

  // Avançar de etapa com segurança (adiciona colega digitado se pendente)
  const handleNextStep = () => {
    if (step === 2 && customCoworkerName.trim()) {
      handleAddCustomCoworker();
    }
    setStep(prev => prev + 1);
  };

  if (!isOpen) return null;

  // Verificação de relatório duplicado
  const duplicateReport = existingReports.find(
    r => (editingReport ? r.id !== editingReport.id : true) && r.date === date && r.shift === shift && !r.isDraft
  );

  // TELA DE CONCLUSÃO COM SUCESSO
  if (isFinished) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm">
        <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-8 text-center space-y-6 shadow-2xl border border-emerald-100 dark:border-emerald-950">
          <div className="w-24 h-24 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <CheckCircle2 size={54} />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-black text-gray-900 dark:text-white">
              {editingReport ? "Plantão Atualizado com Sucesso!" : "Plantão Registrado com Sucesso!"}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300">
              {editingReport
                ? "As alterações no relatório de plantão foram salvas com sucesso no sistema da Casa OAMI."
                : "Seu relatório de plantão foi finalizado e salvo com sucesso no sistema da Casa OAMI."}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 active:scale-95 transition-all"
          >
            Voltar ao Início
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] max-w-2xl w-full p-5 md:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 my-auto">
        {/* Cabeçalho Superior: Etapas e Fechar */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block">
                Etapa {step} de {totalSteps}
              </span>
              {editingReport && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300/40">
                  Modo Edição
                </span>
              )}
            </div>
            <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white leading-tight">
              {step === 1 && (editingReport ? "Editar Identificação do Plantão" : "Identificação do Plantão")}
              {step === 2 && (editingReport ? "Editar Colegas de Plantão" : "Quem trabalhou com você?")}
              {step === 3 && (editingReport ? "Editar Relato do Plantão" : "Como foi o plantão?")}
              {step === 4 && (editingReport ? "Editar Acolhidos e Ocorrências" : "Acolhidos e Ocorrências")}
              {step === 5 && (editingReport ? "Confira e Salve as Alterações" : "Confira e Finalize")}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={22} />
          </button>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            ETAPA 1: IDENTIFICAÇÃO DO PLANTÃO
            ───────────────────────────────────────────────────────────── */}
        {step === 1 && (
          <div className="space-y-6">
            {/* Alerta de duplicidade */}
            {duplicateReport && (
              <div className="p-4 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 rounded-2xl flex items-start gap-3">
                <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={20} />
                <div className="text-xs text-amber-800 dark:text-amber-300">
                  <span className="font-bold block text-sm">Atenção: já existe um relatório registrado para este plantão!</span>
                  Data: {duplicateReport.date} | Turno: {formatShiftName(duplicateReport.shift)} | Cuidadora: {duplicateReport.caregiverName}.
                </div>
              </div>
            )}

            {/* Identificação da Cuidadora Logada */}
            <div className="p-4 bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-black text-lg flex items-center justify-center shadow-md">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider block">
                  Cuidadora Responsável
                </span>
                <p className="font-bold text-base text-gray-900 dark:text-white truncate">
                  {user.name}
                </p>
                <p className="text-xs text-gray-500 truncate">{user.email || 'Conta vinculada institucional'}</p>
              </div>
            </div>

            {/* Data do Plantão */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Data do Plantão
              </label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-base font-bold text-gray-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Seleção do Turno com Botões Grandes */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Qual foi o seu turno?
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => handleShiftSelect('MANHA')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                    shift === 'MANHA'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Sun size={20} />
                  ☀️ MANHÃ
                </button>

                <button
                  type="button"
                  onClick={() => handleShiftSelect('TARDE')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                    shift === 'TARDE'
                      ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <CloudSun size={20} />
                  🌤️ TARDE
                </button>

                <button
                  type="button"
                  onClick={() => handleShiftSelect('NOITE')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                    shift === 'NOITE'
                      ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Moon size={20} />
                  🌙 NOITE
                </button>

                <button
                  type="button"
                  onClick={() => handleShiftSelect('24_HORAS')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2.5 transition-all ${
                    shift === '24_HORAS'
                      ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  <Clock size={20} />
                  🕐 24 HORAS
                </button>
              </div>
            </div>

            {/* Horários de Entrada e Saída */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Horário de Entrada</label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-500 uppercase">Horário de Saída</label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full p-3.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ETAPA 2: QUEM ESTAVA NO PLANTÃO (DIGITAÇÃO DIRETA DOS NOMES)
            ───────────────────────────────────────────────────────────── */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <label className="text-base font-black text-gray-800 dark:text-gray-100 block">
                Quem trabalhou junto no plantão com você?
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Digite o nome das colegas ou profissionais que estiveram no plantão com você.
              </p>
            </div>

            {/* Espaço para Digitar o Nome */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 uppercase tracking-wider block">
                Nome de quem trabalhou junto no plantão
              </label>
              <div className="flex gap-2.5">
                <input
                  type="text"
                  placeholder="Digite o nome completo (ex: Maria da Silva)..."
                  value={customCoworkerName}
                  onChange={(e) => setCustomCoworkerName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCoworker();
                    }
                  }}
                  className="flex-1 p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-bold text-gray-800 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleAddCustomCoworker}
                  disabled={!customCoworkerName.trim()}
                  className="px-5 py-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-emerald-600/20 shrink-0"
                >
                  <Plus size={18} />
                  Adicionar
                </button>
              </div>
              <p className="text-[11px] text-gray-400">
                Pressione <strong>Enter</strong> ou clique em <strong>Adicionar</strong>. Você pode digitar quantas colegas desejar.
              </p>
            </div>

            {/* Colegas Adicionados */}
            {selectedCoworkers.length > 0 ? (
              <div className="space-y-2.5 pt-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-400 uppercase tracking-wider">
                    Colegas Adicionados ({selectedCoworkers.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedCoworkers([])}
                    className="text-[11px] text-red-500 hover:text-red-700 font-bold"
                  >
                    Remover todos
                  </button>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {selectedCoworkers.map((coworker, idx) => (
                    <div
                      key={idx}
                      className="p-3.5 bg-emerald-50/70 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl flex items-center justify-between"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-black text-xs flex items-center justify-center shrink-0">
                          {coworker.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="truncate">
                          <span className="text-sm font-black text-gray-900 dark:text-gray-100 block truncate">
                            {coworker.name}
                          </span>
                          <span className="text-[10px] text-emerald-700 dark:text-emerald-400 font-medium">
                            {coworker.role || 'Colega de Plantão'}
                          </span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setSelectedCoworkers(selectedCoworkers.filter((_, i) => i !== idx))}
                        className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-xl transition-all shrink-0"
                        title="Remover colega"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs text-gray-500 flex items-start gap-3">
                <Info size={18} className="text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-gray-700 dark:text-gray-300 block mb-0.5">
                    Plantão individual?
                  </span>
                  <span>
                    Caso tenha trabalhado sozinha neste plantão, não é necessário preencher este campo. Basta clicar em <strong>Continuar</strong>.
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ETAPA 3: COMO FOI O PLANTÃO?
            ───────────────────────────────────────────────────────────── */}
        {step === 3 && (
          <div className="space-y-6">
            {/* Botões Rápidos de Situação */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Qual foi a situação geral do plantão?
              </label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setStatus('TRANQUILO')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    status === 'TRANQUILO'
                      ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  😊 TRANQUILO
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('COM_OCORRENCIAS')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    status === 'COM_OCORRENCIAS'
                      ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  😐 COM OCORRÊNCIAS
                </button>

                <button
                  type="button"
                  onClick={() => setStatus('INTERCORRENCIA')}
                  className={`p-4 rounded-2xl font-black text-sm flex items-center justify-center gap-2 transition-all ${
                    status === 'INTERCORRENCIA'
                      ? 'bg-red-600 text-white shadow-lg shadow-red-600/30 scale-[1.02]'
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  ⚠️ INTERCORRÊNCIA
                </button>
              </div>
            </div>

            {/* Campo de Relato Geral */}
            <div className="space-y-2">
              <label className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider block">
                Relato geral do plantão
              </label>

              <textarea
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                rows={5}
                placeholder="Descreva aqui como transcorreu o plantão, a rotina dos acolhidos e o que for relevante para a próxima equipe saber..."
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
              />

              {/* Botões de Apoio por Voz e Foto */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setVoiceTarget('GENERAL');
                    setIsVoiceModalOpen(true);
                  }}
                  className="py-4 px-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all flex items-center justify-center gap-2.5"
                >
                  <Mic size={20} />
                  Falar em vez de digitar
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setPhotoTarget('GENERAL');
                    setIsPhotoModalOpen(true);
                  }}
                  className="py-4 px-4 bg-gray-800 hover:bg-gray-900 text-white rounded-2xl font-black text-sm shadow-md active:scale-95 transition-all flex items-center justify-center gap-2.5"
                >
                  <Camera size={20} />
                  Fotografar Anotação
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ETAPA 4: ACOLHIDOS E OCORRÊNCIAS
            ───────────────────────────────────────────────────────────── */}
        {step === 4 && (
          <div className="space-y-6">
            {/* Bloco A: Observações sobre os Acolhidos */}
            <div className="p-5 bg-gray-50 dark:bg-gray-800/60 rounded-3xl space-y-4 border border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-black text-sm text-gray-900 dark:text-white">
                    Deseja registrar observações sobre algum acolhido?
                  </h4>
                  <p className="text-xs text-gray-500">Alimentação, sono, banho, comportamento, etc.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasResidentNotes(true)}
                    className={`py-2 px-4 rounded-xl font-bold text-xs ${
                      hasResidentNotes ? 'bg-emerald-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    SIM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHasResidentNotes(false);
                      setResidentNotes([]);
                    }}
                    className={`py-2 px-4 rounded-xl font-bold text-xs ${
                      !hasResidentNotes ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    NÃO
                  </button>
                </div>
              </div>

              {hasResidentNotes && (
                <div className="space-y-4 pt-2 border-t border-gray-200 dark:border-gray-700">
                  {!activeResidentForNotes ? (
                    <div className="space-y-3">
                      <div className="relative">
                        <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Buscar acolhido(a) pelo nome..."
                          value={residentSearch}
                          onChange={(e) => setResidentSearch(e.target.value)}
                          className="w-full pl-9 pr-3 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                        />
                      </div>

                      <div className="max-h-36 overflow-y-auto space-y-1.5 pr-1">
                        {elderlyList
                          .filter(e => e.status === 'ATIVO')
                          .filter(e => !residentSearch || e.name.toLowerCase().includes(residentSearch.toLowerCase().trim()))
                          .map((eld) => (
                            <button
                              key={eld.id}
                              type="button"
                              onClick={() => {
                                setActiveResidentForNotes(eld);
                                setTempTags([]);
                                setTempObs('');
                              }}
                              className="w-full p-2.5 rounded-xl bg-white dark:bg-gray-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 text-left font-bold text-xs flex items-center justify-between border border-gray-100 dark:border-gray-750"
                            >
                              <span>{eld.name}</span>
                              <Plus size={14} className="text-emerald-600" />
                            </button>
                          ))}
                      </div>
                    </div>
                  ) : (
                    /* Formulário do acolhido selecionado */
                    <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-emerald-200 dark:border-emerald-800 space-y-3">
                      <div className="flex justify-between items-center">
                        <span className="font-black text-sm text-emerald-800 dark:text-emerald-300">
                          Acolhido(a): {activeResidentForNotes.name}
                        </span>
                        <button
                          type="button"
                          onClick={() => setActiveResidentForNotes(null)}
                          className="text-xs text-gray-400 hover:text-red-500 font-bold"
                        >
                          Trocar acolhido(a)
                        </button>
                      </div>

                      {/* Etiquetas de estado */}
                      <div>
                        <span className="text-[10px] font-bold text-gray-400 uppercase block mb-1.5">
                          Como esteve durante o plantão?
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {RESIDENT_TAGS.map((tag) => {
                            const isSelected = tempTags.includes(tag.id);
                            return (
                              <button
                                key={tag.id}
                                type="button"
                                onClick={() => {
                                  if (isSelected) setTempTags(tempTags.filter(t => t !== tag.id));
                                  else setTempTags([...tempTags, tag.id]);
                                }}
                                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                  isSelected
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200'
                                }`}
                              >
                                {tag.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Observação Livre */}
                      <div className="space-y-1.5">
                        <textarea
                          placeholder="Observação detalhada (opcional)..."
                          value={tempObs}
                          onChange={(e) => setTempObs(e.target.value)}
                          rows={2}
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                        />

                        <div className="flex justify-between items-center gap-2">
                          <div className="flex gap-1.5">
                            <button
                              type="button"
                              onClick={() => {
                                setVoiceTarget('RESIDENT');
                                setIsVoiceModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            >
                              <Mic size={12} /> Falar por voz
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setPhotoTarget('RESIDENT');
                                setIsPhotoModalOpen(true);
                              }}
                              className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 hover:bg-emerald-100 text-gray-700 dark:text-gray-300 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            >
                              <Camera size={12} /> Foto de anotação
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={handleSaveResidentNote}
                            className="px-4 py-1.5 bg-emerald-600 text-white rounded-xl text-xs font-black shadow-sm"
                          >
                            Salvar Observação
                          </button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Lista de observações salvas */}
                  {residentNotes.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <span className="text-[10px] font-bold text-gray-400 uppercase block">
                        Observações Registradas ({residentNotes.length})
                      </span>
                      {residentNotes.map((note, idx) => (
                        <div key={idx} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-700 flex justify-between items-start gap-2">
                          <div>
                            <span className="font-bold text-xs text-gray-900 dark:text-white block">{note.elderlyName}</span>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {note.statusTags.map(tagId => (
                                <span key={tagId} className="px-2 py-0.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 text-[9px] font-bold rounded">
                                  {RESIDENT_TAGS.find(t => t.id === tagId)?.label || tagId}
                                </span>
                              ))}
                            </div>
                            {note.observation && (
                              <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 italic">
                                "{note.observation}"
                              </p>
                            )}
                          </div>

                          <button
                            type="button"
                            onClick={() => setResidentNotes(residentNotes.filter((_, i) => i !== idx))}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Bloco B: Intercorrências */}
            <div className="p-5 bg-red-50/50 dark:bg-red-950/20 rounded-3xl space-y-4 border border-red-100 dark:border-red-900/30">
              <div className="flex justify-between items-center">
                <div>
                  <h4 className="font-black text-sm text-red-900 dark:text-red-300">
                    Houve alguma intercorrência no plantão?
                  </h4>
                  <p className="text-xs text-red-600 dark:text-red-400">Quedas, mal-estar, ferimentos, picos de pressão, etc.</p>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHasIncidents(false)}
                    className={`py-2 px-4 rounded-xl font-bold text-xs ${
                      !hasIncidents ? 'bg-gray-700 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    NÃO
                  </button>
                  <button
                    type="button"
                    onClick={() => setHasIncidents(true)}
                    className={`py-2 px-4 rounded-xl font-bold text-xs ${
                      hasIncidents ? 'bg-red-600 text-white' : 'bg-gray-200 dark:bg-gray-700'
                    }`}
                  >
                    SIM
                  </button>
                </div>
              </div>

              {hasIncidents && (
                <div className="space-y-4 pt-2 border-t border-red-200 dark:border-red-900/40">
                  <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-800 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Acolhido(a) envolvido(a)</label>
                        <select
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                          value={tempIncElderly?.id || ''}
                          onChange={(e) => {
                            const found = elderlyList.find(eld => eld.id === e.target.value);
                            setTempIncElderly(found || null);
                          }}
                        >
                          <option value="">Selecione o(a) acolhido(a)...</option>
                          {elderlyList.filter(e => e.status === 'ATIVO').map(e => (
                            <option key={e.id} value={e.id}>{e.name}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Horário aproximado</label>
                        <input
                          type="time"
                          value={tempIncTime}
                          onChange={(e) => setTempIncTime(e.target.value)}
                          className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">O que aconteceu? (Relato claro)</label>
                      <textarea
                        value={tempIncDesc}
                        onChange={(e) => setTempIncDesc(e.target.value)}
                        placeholder="Descreva a ocorrência com clareza..."
                        rows={2}
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Qual conduta ou providência foi tomada?</label>
                      <input
                        type="text"
                        value={tempIncAction}
                        onChange={(e) => setTempIncAction(e.target.value)}
                        placeholder="Ex.: Acomodado(a) no leito, comunicada a equipe de enfermagem..."
                        className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-gray-500 uppercase block mb-1">Quem foi comunicado?</label>
                      <div className="flex flex-wrap gap-2">
                        {['Equipe de Enfermagem', 'Coordenação', 'Família / Responsável', 'Médico(a)'].map((notif) => {
                          const isChecked = tempIncNotified.includes(notif);
                          return (
                            <button
                              key={notif}
                              type="button"
                              onClick={() => {
                                if (isChecked) setTempIncNotified(tempIncNotified.filter(n => n !== notif));
                                else setTempIncNotified([...tempIncNotified, notif]);
                              }}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                                isChecked
                                  ? 'bg-red-600 text-white border-red-600'
                                  : 'bg-gray-50 dark:bg-gray-800 border-gray-200 text-gray-700 dark:text-gray-300'
                              }`}
                            >
                              {notif}
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddIncident}
                      className="w-full py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-bold transition-all shadow-md"
                    >
                      Adicionar Intercorrência
                    </button>
                  </div>

                  {/* Lista de Intercorrências Adicionadas */}
                  {incidents.length > 0 && (
                    <div className="space-y-2">
                      {incidents.map((inc, i) => (
                        <div key={i} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900 flex justify-between items-start gap-2">
                          <div className="text-xs">
                            <span className="font-black text-red-700 dark:text-red-400 block">
                              {inc.elderlyName} ({inc.time || 'Horário não informado'})
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 font-medium">{inc.description}</p>
                            {inc.actionTaken && (
                              <p className="text-gray-500 text-[11px] mt-0.5">Conduta adotada: {inc.actionTaken}</p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => setIncidents(incidents.filter((_, idx) => idx !== i))}
                            className="text-gray-400 hover:text-red-500 p-1"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            ETAPA 5: FRALDAS UTILIZADAS E REVISÃO DO PLANTÃO
            ───────────────────────────────────────────────────────────── */}
        {step === 5 && (
          <div className="space-y-6">
            {/* Bloco de Fraldas */}
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2 text-blue-700 dark:text-blue-400 font-black text-sm">
                  <Package size={18} />
                  <span>Fraldas Utilizadas no Plantão</span>
                </div>

                <button
                  type="button"
                  onClick={() => setIsDiaperModalOpen(true)}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1 shadow-sm"
                >
                  <Plus size={14} /> Lançar Fralda
                </button>
              </div>

              {diapersUsed.length === 0 ? (
                <p className="text-xs text-blue-700/70 dark:text-blue-300/70 italic">
                  Nenhuma fralda lançada neste plantão até o momento. Se houve trocas, toque no botão acima.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {diapersUsed.map((d, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs p-2 bg-white dark:bg-gray-900 rounded-xl border border-blue-100 dark:border-blue-900">
                      <span className="font-bold text-gray-800 dark:text-gray-200">
                        {d.elderlyName} — {formatDiaperCount(d.quantity)} (Tamanho {d.size})
                      </span>
                      <span className="text-[10px] text-gray-400">{d.time || ''}</span>
                    </div>
                  ))}
                  <div className="text-right text-xs font-black text-blue-800 dark:text-blue-300 pt-1">
                    Total utilizado: {formatDiaperCount(diapersUsed.reduce((acc, d) => acc + d.quantity, 0))}
                  </div>
                </div>
              )}
            </div>

            {/* Resumo Completo do Plantão */}
            <div className="p-5 bg-gray-50 dark:bg-gray-800/60 rounded-3xl space-y-3.5 border border-gray-100 dark:border-gray-800">
              <h4 className="font-black text-sm text-gray-900 dark:text-white uppercase tracking-wider">
                Confira o Resumo do seu Plantão
              </h4>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div>
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Data e Turno:</span>
                  <span className="font-black text-gray-800 dark:text-gray-200">
                    {date} • Turno {formatShiftName(shift)} ({startTime} às {endTime})
                  </span>
                </div>
                <div>
                  <span className="text-gray-400 font-bold block uppercase text-[10px]">Cuidadora Responsável:</span>
                  <span className="font-black text-gray-800 dark:text-gray-200">{user.name}</span>
                </div>
              </div>

              <div className="text-xs">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Equipe no Plantão:</span>
                <span className="font-bold text-gray-800 dark:text-gray-200">
                  {selectedCoworkers.length > 0 ? selectedCoworkers.map(c => c.name).join(', ') : 'Apenas a cuidadora responsável (individual)'}
                </span>
              </div>

              <div className="text-xs">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Situação do Plantão:</span>
                <span className={`inline-block px-2.5 py-0.5 rounded-full font-black text-[10px] mt-0.5 ${
                  status === 'TRANQUILO' ? 'bg-emerald-100 text-emerald-800' :
                  status === 'COM_OCORRENCIAS' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {formatShiftStatus(status)}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <span className="text-gray-400 font-bold block uppercase text-[10px]">Relato Geral:</span>
                <div className="p-3 bg-white dark:bg-gray-900 rounded-xl text-gray-700 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">
                  {generalNotes || 'Nenhum relato geral digitado.'}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center pt-2">
                <div className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-750">
                  <span className="text-[10px] text-gray-400 font-bold block">OBS. ACOLHIDOS</span>
                  <span className="text-base font-black text-gray-800 dark:text-white">{residentNotes.length}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-750">
                  <span className="text-[10px] text-gray-400 font-bold block">INTERCORRÊNCIAS</span>
                  <span className="text-base font-black text-red-600">{incidents.length}</span>
                </div>
                <div className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-750">
                  <span className="text-[10px] text-gray-400 font-bold block">FRALDAS USADAS</span>
                  <span className="text-base font-black text-blue-600">{diapersUsed.reduce((acc, d) => acc + d.quantity, 0)}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            BOTÕES DE NAVEGAÇÃO INFERIORES (VOLTAR & CONTINUAR / FINALIZAR)
            ───────────────────────────────────────────────────────────── */}
        <div className="flex gap-3 pt-4 border-t border-gray-100 dark:border-gray-800">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-4 px-6 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-700 dark:text-gray-300 rounded-2xl font-black text-sm flex items-center gap-2 transition-all active:scale-95"
            >
              <ArrowLeft size={18} />
              Voltar
            </button>
          )}

          {step < totalSteps ? (
            <button
              type="button"
              onClick={handleNextStep}
              className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              Continuar
              <ArrowRight size={20} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 py-4 px-6 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black text-base shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <CheckCircle2 size={22} />
              {editingReport ? "Salvar Alterações" : "Finalizar Plantão"}
            </button>
          )}
        </div>
      </div>

      {/* Modal de Confirmação Final */}
      {showConfirmModal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-sm w-full p-6 text-center space-y-5 border border-gray-100 dark:border-gray-800 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={36} />
            </div>
            <div>
              <h4 className="text-lg font-black text-gray-900 dark:text-white">
                {editingReport ? "Salvar alterações do plantão?" : "Deseja finalizar o plantão?"}
              </h4>
              <p className="text-xs text-gray-500 mt-1">
                {editingReport
                  ? "As alterações feitas neste relatório serão gravadas no histórico oficial da instituição."
                  : "Ao finalizar, o relatório será gravado oficialmente no sistema para a coordenação e para a próxima equipe de plantão."}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs"
              >
                Voltar e Revisar
              </button>
              <button
                type="button"
                disabled={isSaving}
                onClick={handleFinalizeShift}
                className="flex-1 py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-xs shadow-md shadow-emerald-600/30"
              >
                {isSaving ? "Salvando..." : editingReport ? "Sim, Salvar" : "Sim, Finalizar Plantão"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ditado por Voz */}
      <VoiceDictationModal
        isOpen={isVoiceModalOpen}
        onClose={() => setIsVoiceModalOpen(false)}
        onConfirmText={handleVoiceConfirm}
        promptTitle={
          voiceTarget === 'GENERAL'
            ? "Relate como foi o plantão"
            : voiceTarget === 'RESIDENT'
            ? "Fale a observação sobre o(a) acolhido(a)"
            : "Descreva a intercorrência ocorrida"
        }
      />

      {/* Modal de Foto de Anotação do Caderno */}
      <NotePhotoModal
        isOpen={isPhotoModalOpen}
        onClose={() => setIsPhotoModalOpen(false)}
        onConfirmText={handlePhotoConfirm}
      />

      {/* Modal de Lançamento de Fraldas */}
      <CaregiverDiapersModal
        isOpen={isDiaperModalOpen}
        onClose={() => setIsDiaperModalOpen(false)}
        user={user}
        elderlyList={elderlyList}
        currentShiftName={shift}
        onLoggedSuccess={(rec) => {
          setDiapersUsed(prev => [...prev, rec]);
        }}
        showToast={showToast}
      />
    </div>
  );
};
