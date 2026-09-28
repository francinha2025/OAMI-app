import React, { useState, useEffect } from 'react';
import { 
  HeartHandshake, PlusCircle, Package, ClipboardList, BookOpen, 
  Calendar, Clock, User as UserIcon, Users, CheckCircle2, 
  AlertTriangle, Eye, Download, Search, Filter, RefreshCw,
  Sparkles, ShieldCheck, ArrowRight, ChevronRight, FileText,
  Edit3, Trash2
} from 'lucide-react';
import { deleteDoc, doc } from 'firebase/firestore';
import { db } from '../../firebase';
import { Elderly, User, StaffMember, Professional, ShiftSchedule, CaregiverShiftReport } from '../../types';
import { CaregiverShiftWizardModal } from './CaregiverShiftWizardModal';
import { CaregiverDiapersModal } from './CaregiverDiapersModal';
import { PreviousShiftModal } from './PreviousShiftModal';
import { CaregiverShiftDetailsModal } from './CaregiverShiftDetailsModal';
import { generateCaregiverShiftPdf } from './caregiverPdfGenerator';
import { formatShiftName, formatShiftStatus, formatDiaperCount } from './caregiverUtils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CaregiversSectionProps {
  user: User;
  elderlyList: Elderly[];
  staffList: StaffMember[];
  professionalsList: Professional[];
  shiftSchedules?: ShiftSchedule[];
  caregiverShifts: CaregiverShiftReport[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onNavigateToDiapers?: () => void;
}

export const CaregiversSection: React.FC<CaregiversSectionProps> = ({
  user,
  elderlyList,
  staffList,
  professionalsList,
  shiftSchedules = [],
  caregiverShifts = [],
  showToast,
  onNavigateToDiapers
}) => {
  // Navegação interna
  const [activeSubTab, setActiveSubTab] = useState<'HOME' | 'HISTORY'>('HOME');

  // Modais e Ações
  const [isWizardOpen, setIsWizardOpen] = useState<boolean>(false);
  const [editingShift, setEditingShift] = useState<CaregiverShiftReport | null>(null);
  const [shiftToDelete, setShiftToDelete] = useState<CaregiverShiftReport | null>(null);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);
  const [isDiaperModalOpen, setIsDiaperModalOpen] = useState<boolean>(false);
  const [isPreviousShiftModalOpen, setIsPreviousShiftModalOpen] = useState<boolean>(false);
  const [selectedShiftForDetails, setSelectedShiftForDetails] = useState<CaregiverShiftReport | null>(null);

  // Verificação de rascunho salvo
  const draftKey = `oami_caregiver_shift_draft_${user.id}`;
  const [hasDraft, setHasDraft] = useState<boolean>(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(draftKey);
      setHasDraft(!!saved);
    } catch {
      setHasDraft(false);
    }
  }, [isWizardOpen, user.id]);

  // Função para apagar plantão do Firestore
  const handleDeleteShift = async () => {
    if (!shiftToDelete) return;
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, 'caregiverShifts', shiftToDelete.id));
      showToast("Plantão apagado com sucesso!", "success");
      setShiftToDelete(null);
      if (selectedShiftForDetails?.id === shiftToDelete.id) {
        setSelectedShiftForDetails(null);
      }
    } catch (error) {
      console.error("Erro ao apagar plantão:", error);
      showToast("Erro ao apagar o plantão. Verifique sua conexão.", "error");
    } finally {
      setIsDeleting(false);
    }
  };

  // Ordenação de plantões (mais recentes primeiro)
  const sortedShifts = [...caregiverShifts].sort((a, b) => {
    const parseTime = (shift: CaregiverShiftReport) => {
      if (shift.createdAt) {
        const t = new Date(shift.createdAt).getTime();
        if (!isNaN(t)) return t;
      }
      if (shift.date) {
        const t = new Date(shift.date).getTime();
        if (!isNaN(t)) return t;
      }
      return 0;
    };
    return parseTime(b) - parseTime(a);
  });

  const previousShift = sortedShifts.length > 0 ? sortedShifts[0] : null;

  // Filtros do Histórico
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'TRANQUILO' | 'COM_OCORRENCIAS' | 'INTERCORRENCIA'>('ALL');
  const [shiftFilter, setShiftFilter] = useState<'ALL' | 'MANHA' | 'TARDE' | 'NOITE' | '24_HORAS'>('ALL');

  const filteredShifts = sortedShifts.filter(shift => {
    if (statusFilter !== 'ALL' && shift.status !== statusFilter) return false;
    if (shiftFilter !== 'ALL' && shift.shift !== shiftFilter) return false;
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      const matchName = shift.caregiverName?.toLowerCase().includes(term);
      const matchDate = shift.date?.includes(term);
      const matchNotes = shift.generalNotes?.toLowerCase().includes(term);
      const matchCoworker = shift.teamMembers?.some(m => m.name.toLowerCase().includes(term));
      if (!matchName && !matchDate && !matchNotes && !matchCoworker) return false;
    }
    return true;
  });

  const handleDiscardDraft = () => {
    try {
      localStorage.removeItem(draftKey);
      setHasDraft(false);
      showToast("Rascunho de plantão descartado com sucesso.", "success");
    } catch {
      showToast("Erro ao descartar rascunho.", "error");
    }
  };

  return (
    <div className="notranslate space-y-6 max-w-5xl mx-auto pb-12" translate="no">
      {/* Banner de Boas-Vindas */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-bold tracking-wide uppercase">
              <HeartHandshake size={14} /> Espaço das Cuidadoras
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
              Olá, {user.name.split(' ')[0]}!
            </h1>
            <p className="text-emerald-100 text-xs sm:text-sm font-medium max-w-xl">
              Bem-vinda ao seu canal de registro rápido e seguro. Tenha um excelente plantão de dedicação e cuidado aos nossos acolhidos!
            </p>
          </div>

          <div className="flex items-center gap-2 bg-black/10 backdrop-blur-md px-4 py-2.5 rounded-2xl border border-white/10 self-start md:self-auto text-xs font-bold">
            <Calendar size={16} className="text-emerald-300" />
            <span className="capitalize">{format(new Date(), "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
          </div>
        </div>

        {/* Abas Superiores */}
        <div className="flex gap-2 mt-6 pt-4 border-t border-white/15">
          <button
            type="button"
            onClick={() => setActiveSubTab('HOME')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'HOME'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <span>Início Rápido</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('HISTORY')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 ${
              activeSubTab === 'HISTORY'
                ? 'bg-white text-emerald-800 shadow-md'
                : 'bg-white/10 hover:bg-white/20 text-white'
            }`}
          >
            <ClipboardList size={14} />
            <span>Histórico de Plantões</span>
            {caregiverShifts.length > 0 && (
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeSubTab === 'HISTORY' ? 'bg-emerald-100 text-emerald-800' : 'bg-white/20 text-white'
              }`}>
                {caregiverShifts.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Alerta de Rascunho em Andamento */}
      {hasDraft && (
        <div className="p-4 sm:p-5 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0">
              <ClipboardList size={20} />
            </div>
            <div>
              <h4 className="text-sm font-black text-amber-900 dark:text-amber-200">
                Você possui um rascunho de plantão em andamento!
              </h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                Suas informações foram salvas para evitar perda de dados. Deseja continuar o preenchimento agora?
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto">
            <button
              type="button"
              onClick={() => setIsWizardOpen(true)}
              className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-black shadow-md transition-all flex items-center gap-1.5"
            >
              <span>Continuar Plantão</span>
              <ArrowRight size={14} />
            </button>
            <button
              type="button"
              onClick={handleDiscardDraft}
              className="px-3 py-2 rounded-xl text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-xs font-bold transition-all"
            >
              Descartar
            </button>
          </div>
        </div>
      )}

      {/* ABA: INÍCIO RÁPIDO (BOTÕES GRANDES E ACESSÍVEIS) */}
      {activeSubTab === 'HOME' && (
        <div className="space-y-6">
          <div className="text-center sm:text-left">
            <h2 className="text-lg font-black text-gray-900 dark:text-white">
              O que você deseja fazer agora?
            </h2>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Toque no botão correspondente para iniciar o atendimento de forma simples e rápida.
            </p>
          </div>

          {/* Grade com 4 Botões Principais */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
            
            {/* 1. REGISTRAR MEU PLANTÃO */}
            <button
              type="button"
              onClick={() => {
                setEditingShift(null);
                setIsWizardOpen(true);
              }}
              className="group text-left p-6 sm:p-7 rounded-[2rem] bg-gradient-to-br from-emerald-500 to-emerald-700 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between min-h-[170px] relative overflow-hidden border border-emerald-400/30"
            >
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                <ClipboardList size={140} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl">📝</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider">
                  Passo a Passo
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  REGISTRAR MEU PLANTÃO
                </h3>
                <p className="text-xs sm:text-sm text-emerald-100 font-medium mt-1">
                  Registre as informações do seu turno, equipe, acolhidos e utilize o ditado por voz.
                </p>
              </div>
            </button>

            {/* 2. FRALDAS UTILIZADAS */}
            <button
              type="button"
              onClick={() => {
                if (onNavigateToDiapers) {
                  onNavigateToDiapers();
                } else {
                  setIsDiaperModalOpen(true);
                }
              }}
              className="group text-left p-6 sm:p-7 rounded-[2rem] bg-gradient-to-br from-blue-500 to-blue-700 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between min-h-[170px] relative overflow-hidden border border-blue-400/30"
            >
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                <Package size={140} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl">🧷</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-1.5">
                  Controle de Fraldas <ArrowRight size={13} />
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  FRALDAS UTILIZADAS
                </h3>
                <p className="text-xs sm:text-sm text-blue-100 font-medium mt-1">
                  Acesse o Consumo e Controle de Fraldas pelos Idosos, estoque e registros de trocas.
                </p>
              </div>
            </button>

            {/* 3. MEUS PLANTÕES */}
            <button
              type="button"
              onClick={() => setActiveSubTab('HISTORY')}
              className="group text-left p-6 sm:p-7 rounded-[2rem] bg-gradient-to-br from-amber-500 to-amber-700 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between min-h-[170px] relative overflow-hidden border border-amber-400/30"
            >
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                <FileText size={140} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl">📋</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider">
                  Histórico e PDF
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  MEUS PLANTÕES
                </h3>
                <p className="text-xs sm:text-sm text-amber-100 font-medium mt-1">
                  Consulte os plantões finalizados, revise observações e gere relatórios em PDF.
                </p>
              </div>
            </button>

            {/* 4. CONSULTAR PLANTÃO ANTERIOR */}
            <button
              type="button"
              onClick={() => setIsPreviousShiftModalOpen(true)}
              className="group text-left p-6 sm:p-7 rounded-[2rem] bg-gradient-to-br from-indigo-500 to-purple-700 text-white shadow-xl hover:shadow-2xl hover:scale-[1.01] active:scale-[0.99] transition-all flex flex-col justify-between min-h-[170px] relative overflow-hidden border border-purple-400/30"
            >
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 opacity-15 pointer-events-none group-hover:scale-110 transition-transform">
                <BookOpen size={140} />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-3xl">📖</span>
                <span className="px-3 py-1 rounded-full bg-white/20 text-white text-[11px] font-black uppercase tracking-wider">
                  Passagem de Turno
                </span>
              </div>
              <div className="mt-4">
                <h3 className="text-xl sm:text-2xl font-black tracking-tight">
                  CONSULTAR PLANTÃO ANTERIOR
                </h3>
                <p className="text-xs sm:text-sm text-indigo-100 font-medium mt-1">
                  Veja as informações relatadas pela equipe anterior antes de iniciar suas atividades.
                </p>
              </div>
            </button>

          </div>

          {/* Resumo Rápido dos Últimos Plantões */}
          <div className="pt-4 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-black text-gray-800 dark:text-gray-200">
                Últimos Plantões Registrados
              </h3>
              <button
                type="button"
                onClick={() => setActiveSubTab('HISTORY')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 dark:text-emerald-400 flex items-center gap-1"
              >
                Ver todos ({caregiverShifts.length}) <ChevronRight size={14} />
              </button>
            </div>

            {sortedShifts.slice(0, 3).length === 0 ? (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                <ClipboardList size={32} className="mx-auto text-gray-300 dark:text-gray-600" />
                <p className="text-xs font-bold text-gray-500 dark:text-gray-400">
                  Nenhum plantão registrado até o momento.
                </p>
                <p className="text-[11px] text-gray-400">
                  Toque em <strong>"REGISTRAR MEU PLANTÃO"</strong> acima para registrar o seu primeiro turno!
                </p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {sortedShifts.slice(0, 3).map((shift) => (
                  <div
                    key={shift.id}
                    onClick={() => setSelectedShiftForDetails(shift)}
                    className="p-4 bg-white dark:bg-gray-850 hover:bg-emerald-50/50 dark:hover:bg-emerald-950/20 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-xs ${
                        shift.shift === 'MANHA' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300' :
                        shift.shift === 'TARDE' ? 'bg-orange-100 text-orange-800 dark:bg-orange-950/50 dark:text-orange-300' :
                        shift.shift === 'NOITE' ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-950/50 dark:text-indigo-300' :
                        'bg-purple-100 text-purple-800 dark:bg-purple-950/50 dark:text-purple-300'
                      }`}>
                        {shift.shift === 'MANHA' ? '☀️' : shift.shift === 'TARDE' ? '🌤️' : shift.shift === 'NOITE' ? '🌙' : '🕐'}
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-black text-sm text-gray-900 dark:text-white">
                            {shift.date} • Turno {formatShiftName(shift.shift)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                            shift.status === 'TRANQUILO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                            shift.status === 'COM_OCORRENCIAS' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                            'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                          }`}>
                            {formatShiftStatus(shift.status)}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                          Responsável: <strong>{shift.caregiverName}</strong>
                          {shift.totalDiapersCount > 0 && ` • 🧷 ${formatDiaperCount(shift.totalDiapersCount)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingShift(shift);
                          setIsWizardOpen(true);
                        }}
                        title="Editar este plantão"
                        className="p-2 text-gray-400 hover:text-amber-600 rounded-xl hover:bg-amber-50 dark:hover:bg-amber-950/30 transition-colors"
                      >
                        <Edit3 size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateCaregiverShiftPdf(shift);
                        }}
                        title="Baixar relatório em PDF"
                        className="p-2 text-gray-400 hover:text-emerald-600 rounded-xl hover:bg-emerald-50 dark:hover:bg-emerald-950/30 transition-colors"
                      >
                        <Download size={15} />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShiftToDelete(shift);
                        }}
                        title="Apagar este plantão do histórico"
                        className="p-2 text-gray-400 hover:text-red-600 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                      >
                        <Trash2 size={15} />
                      </button>
                      <ChevronRight size={18} className="text-gray-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ABA: HISTÓRICO COMPLETO */}
      {activeSubTab === 'HISTORY' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black text-gray-900 dark:text-white">
                Histórico de Plantões da Equipe
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Consulte os registros oficiais, edite informações, apague relatórios ou baixe em PDF.
              </p>
            </div>

            <button
              type="button"
              onClick={() => {
                setEditingShift(null);
                setIsWizardOpen(true);
              }}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95 transition-all self-start sm:self-auto"
            >
              <PlusCircle size={16} /> Novo Registro de Plantão
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="p-4 bg-white dark:bg-gray-850 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Campo de Busca */}
              <div className="relative">
                <Search size={16} className="absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por cuidadora, data, equipe..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Filtro de Status */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Todos os status</option>
                <option value="TRANQUILO">😊 Plantões Tranquilos</option>
                <option value="COM_OCORRENCIAS">😐 Com Ocorrências</option>
                <option value="INTERCORRENCIA">⚠️ Com Intercorrências</option>
              </select>

              {/* Filtro de Turno */}
              <select
                value={shiftFilter}
                onChange={(e) => setShiftFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Todos os turnos</option>
                <option value="MANHA">☀️ Turno da Manhã</option>
                <option value="TARDE">🌤️ Turno da Tarde</option>
                <option value="NOITE">🌙 Turno da Noite</option>
                <option value="24_HORAS">🕐 Plantão de 24 Horas</option>
              </select>
            </div>
          </div>

          {/* Lista de Plantões */}
          {filteredShifts.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-gray-850 rounded-3xl border border-gray-200 dark:border-gray-800 space-y-3">
              <ClipboardList size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-black text-gray-700 dark:text-gray-300">
                Nenhum plantão encontrado com os filtros selecionados.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('ALL');
                  setShiftFilter('ALL');
                }}
                className="text-xs text-emerald-600 font-bold hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredShifts.map((shift) => (
                <div
                  key={shift.id}
                  onClick={() => setSelectedShiftForDetails(shift)}
                  className="p-5 bg-white dark:bg-gray-850 hover:border-emerald-500 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm cursor-pointer transition-all space-y-3 hover:shadow-md flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    {/* Linha Superior */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">
                          {shift.shift === 'MANHA' ? '☀️' : shift.shift === 'TARDE' ? '🌤️' : shift.shift === 'NOITE' ? '🌙' : '🕐'}
                        </span>
                        <div>
                          <span className="font-black text-sm text-gray-900 dark:text-white">
                            {shift.date} • {formatShiftName(shift.shift)}
                          </span>
                          <span className="text-[11px] text-gray-400 block">
                            {shift.startTime || '07:00'} às {shift.endTime || '19:00'}
                          </span>
                        </div>
                      </div>

                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${
                        shift.status === 'TRANQUILO' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300' :
                        shift.status === 'COM_OCORRENCIAS' ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300' :
                        'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300'
                      }`}>
                        {formatShiftStatus(shift.status)}
                      </span>
                    </div>

                    {/* Cuidadora e Colegas */}
                    <div className="text-xs text-gray-600 dark:text-gray-300 space-y-1">
                      <p className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-gray-200">
                        <UserIcon size={13} className="text-emerald-600" />
                        <span>{shift.caregiverName}</span>
                      </p>
                      {shift.teamMembers && shift.teamMembers.length > 0 && (
                        <p className="text-[11px] text-gray-400 flex items-center gap-1">
                          <Users size={12} /> Com: {shift.teamMembers.map(m => m.name).join(', ')}
                        </p>
                      )}
                    </div>

                    {/* Prévia do Relato Geral */}
                    {shift.generalNotes && (
                      <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 italic bg-gray-50 dark:bg-gray-900/40 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800">
                        "{shift.generalNotes}"
                      </p>
                    )}

                    {/* Indicadores / Badges */}
                    <div className="flex flex-wrap gap-2 text-[11px] pt-1">
                      {shift.totalDiapersCount > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-bold flex items-center gap-1">
                          <Package size={11} /> {formatDiaperCount(shift.totalDiapersCount)}
                        </span>
                      )}
                      {shift.residentNotes && shift.residentNotes.length > 0 && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 font-bold flex items-center gap-1">
                          <CheckCircle2 size={11} /> {shift.residentNotes.length} {shift.residentNotes.length === 1 ? 'acolhido com observações' : 'acolhidos com observações'}
                        </span>
                      )}
                      {shift.hasIncidents && (
                        <span className="px-2 py-0.5 rounded-md bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 font-bold flex items-center gap-1">
                          <AlertTriangle size={11} /> {shift.incidents?.length || 1} {(shift.incidents?.length || 1) === 1 ? 'intercorrência' : 'intercorrências'}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between">
                    <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-black flex items-center gap-1 hover:underline">
                      <Eye size={13} /> Ver detalhes completos
                    </span>

                    <div className="flex items-center gap-1.5">
                      {/* Botão Editar */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingShift(shift);
                          setIsWizardOpen(true);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 text-amber-800 dark:text-amber-300 text-xs font-bold transition-colors flex items-center gap-1"
                        title="Editar este plantão"
                      >
                        <Edit3 size={13} /> Editar
                      </button>

                      {/* Botão PDF */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          generateCaregiverShiftPdf(shift);
                        }}
                        className="px-2.5 py-1.5 rounded-xl bg-gray-100 hover:bg-emerald-50 dark:bg-gray-800 dark:hover:bg-emerald-950/40 text-gray-700 hover:text-emerald-600 dark:text-gray-300 text-xs font-bold transition-colors flex items-center gap-1"
                        title="Baixar relatório em PDF"
                      >
                        <Download size={13} /> PDF
                      </button>

                      {/* Botão Lixeira (Apagar) */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setShiftToDelete(shift);
                        }}
                        className="p-1.5 rounded-xl bg-red-50 hover:bg-red-100 dark:bg-red-950/40 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 transition-colors"
                        title="Apagar este plantão do histórico"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAIS */}
      {/* 1. Assistente Passo a Passo do Plantão */}
      {isWizardOpen && (
        <CaregiverShiftWizardModal
          isOpen={isWizardOpen}
          onClose={() => {
            setIsWizardOpen(false);
            setEditingShift(null);
          }}
          user={user}
          elderlyList={elderlyList}
          staffList={staffList}
          professionalsList={professionalsList}
          shiftSchedules={shiftSchedules}
          existingReports={caregiverShifts}
          editingReport={editingShift}
          onFinishedSuccess={() => {
            setIsWizardOpen(false);
            setEditingShift(null);
            setHasDraft(false);
          }}
          showToast={showToast}
        />
      )}

      {/* 2. Modal de Registro Rápido de Fraldas */}
      {isDiaperModalOpen && (
        <CaregiverDiapersModal
          isOpen={isDiaperModalOpen}
          onClose={() => setIsDiaperModalOpen(false)}
          user={user}
          elderlyList={elderlyList}
          showToast={showToast}
        />
      )}

      {/* 3. Modal de Consulta do Plantão Anterior */}
      {isPreviousShiftModalOpen && (
        <PreviousShiftModal
          isOpen={isPreviousShiftModalOpen}
          onClose={() => setIsPreviousShiftModalOpen(false)}
          report={previousShift}
        />
      )}

      {/* 4. Modal de Detalhes do Plantão */}
      {selectedShiftForDetails && (
        <CaregiverShiftDetailsModal
          isOpen={!!selectedShiftForDetails}
          onClose={() => setSelectedShiftForDetails(null)}
          report={selectedShiftForDetails}
          onEdit={(shift) => {
            setEditingShift(shift);
            setIsWizardOpen(true);
          }}
          onDelete={(shift) => {
            setShiftToDelete(shift);
          }}
        />
      )}

      {/* 5. Modal de Confirmação para Apagar Plantão (Lixeirinha) */}
      {shiftToDelete && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl max-w-md w-full p-6 text-center space-y-5 border border-red-100 dark:border-red-950 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center shadow-lg shadow-red-500/20">
              <Trash2 size={32} />
            </div>

            <div className="space-y-2">
              <h4 className="text-xl font-black text-gray-900 dark:text-white">
                Apagar Plantão do Histórico?
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Tem certeza de que deseja apagar o registro deste plantão? Esta ação removerá o documento definitivamente e não pode ser desfeita.
              </p>
            </div>

            {/* Resumo do Plantão a ser apagado */}
            <div className="p-4 bg-gray-50 dark:bg-gray-800/70 rounded-2xl border border-gray-100 dark:border-gray-800 text-left text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold">Data do Plantão:</span>
                <span className="font-black text-gray-800 dark:text-gray-200">{shiftToDelete.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold">Turno:</span>
                <span className="font-black text-gray-800 dark:text-gray-200">{formatShiftName(shiftToDelete.shift)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400 font-bold">Responsável:</span>
                <span className="font-black text-emerald-600 dark:text-emerald-400 truncate max-w-[200px]">{shiftToDelete.caregiverName}</span>
              </div>
              {shiftToDelete.teamMembers && shiftToDelete.teamMembers.length > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-400 font-bold">Equipe:</span>
                  <span className="font-medium text-gray-600 dark:text-gray-300 truncate max-w-[200px]">
                    {shiftToDelete.teamMembers.map(m => m.name).join(', ')}
                  </span>
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-1">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setShiftToDelete(null)}
                className="flex-1 py-3 px-4 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-bold text-xs transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleDeleteShift}
                className="flex-1 py-3 px-4 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white rounded-xl font-black text-xs shadow-md shadow-red-600/30 flex items-center justify-center gap-1.5 transition-colors"
              >
                {isDeleting ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" />
                    Apagando...
                  </>
                ) : (
                  <>
                    <Trash2 size={14} />
                    Sim, Apagar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
