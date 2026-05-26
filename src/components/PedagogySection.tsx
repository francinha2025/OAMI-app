import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Brain, ClipboardList, 
  Palette, Music, Gamepad2, BookOpen, Users2,
  AlertCircle, FileText, Settings, Plus, Search, 
  Filter, MoreVertical, ChevronRight, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, Eye, 
  Download, Printer, X, Info, ArrowLeft,
  TrendingUp, UserCircle, LogOut, Moon, Sun,
  Smile, Meh, Frown, History, Lightbulb, Loader2, Zap,
  Calendar, Target, Star, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area, Legend
} from 'recharts';
import { format, isToday, parseISO, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeReplace } from '../lib/utils';
import { generateModernPDF, generateMultiSectionPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { extractFormData, fixGrammar } from '../services/geminiService';
import { ROLE_LABELS } from '../constants';
import { 
  PedagogyPatient, PedagogyInitialAssessment, PedagogyEvolution, 
  PedagogyActivity, PedagogyStimulationTracking, PedagogySocialParticipation, 
  PedagogyIndividualPlan, PedagogyLifeHistory,
  User as UserType, Elderly,
  NursingEvolution, PhysioEvolution, PsychEvolution, SocialEvolution, NutritionEvolution, Workshop, AppNotification, Professional
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';
import { MultiPatientSelector } from './MultiPatientSelector';
import { ProductivitySection } from './ProductivitySection';
import { Award } from 'lucide-react';

// Movendo componentes auxiliares para o topo para evitar problemas de inicialização
const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    'PRESERVADO': 'bg-green-100 text-green-700',
    'LEVE_COMPROMETIMENTO': 'bg-yellow-100 text-yellow-700',
    'COMPROMETIDO': 'bg-red-100 text-red-700'
  };
  return (
    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", colors[status as keyof typeof colors])}>
      {safeReplace(status, '_', ' ')}
    </span>
  );
};

const ScoreCard: React.FC<{ label: string, score: number }> = ({ label, score }) => {
  const safeScore = isNaN(score) ? 0 : score;
  return (
    <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
        <span className="text-lg font-bold text-blue-600 dark:text-blue-400">{safeScore}/10</span>
      </div>
      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${safeScore * 10}%` }}
          className={cn(
            "h-full rounded-full transition-all duration-500",
            safeScore >= 8 ? "bg-green-500" : safeScore >= 6 ? "bg-blue-500" : "bg-orange-500"
          )}
        />
      </div>
    </div>
  );
};

interface PedagogySectionProps {
  user: UserType;
  elderly: Elderly[];
  patients: PedagogyPatient[];
  assessments: PedagogyInitialAssessment[];
  evolutions: PedagogyEvolution[];
  activities: PedagogyActivity[];
  stimulationTrackings: PedagogyStimulationTracking[];
  socialParticipations: PedagogySocialParticipation[];
  individualPlans: PedagogyIndividualPlan[];
  lifeHistories: PedagogyLifeHistory[];
  onSavePatient: (data: Partial<PedagogyPatient>) => Promise<void>;
  onSaveAssessment: (data: Partial<PedagogyInitialAssessment>) => Promise<void>;
  onSaveEvolution: (data: Partial<PedagogyEvolution>) => Promise<void>;
  onSaveActivity: (data: Partial<PedagogyActivity>) => Promise<void>;
  onSaveStimulation: (data: Partial<PedagogyStimulationTracking>) => Promise<void>;
  onSaveSocial: (data: Partial<PedagogySocialParticipation>) => Promise<void>;
  onSavePlan: (data: Partial<PedagogyIndividualPlan>) => Promise<void>;
  onSaveLifeHistory: (data: Partial<PedagogyLifeHistory>) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  onDeleteRecord: (collectionName: string, id: string) => Promise<void>;
  onDeletePatient: (id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
  professionals?: Professional[];
  nursingEvolutions?: NursingEvolution[];
  physioEvolutions?: PhysioEvolution[];
  psychEvolutions?: PsychEvolution[];
  pedagogyEvolutions?: PedagogyEvolution[];
  socialEvolutions?: SocialEvolution[];
  nutritionEvolutions?: NutritionEvolution[];
  workshops?: Workshop[];
  notifications?: AppNotification[];
  onDeleteNotification?: (id: string, e: React.MouseEvent) => void;
  onSaveCollaborationEvolution?: (collectionName: string, id: string, updatedData: any) => Promise<void>;
  onDeleteCollaborationEvolution?: (collectionName: string, id: string) => Promise<void>;
  psychActivities?: any[];
  pedagogyActivities?: any[];
  onViewActivity?: (activity: any) => void;
  defaultTab?: string;
}

type TabType = 'dashboard' | 'residents' | 'activities' | 'monitoring' | 'productivity' | 'reports' | 'settings';

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-shrink-0 lg:w-full flex items-center gap-3 px-6 lg:px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap snap-start group",
      active 
        ? "bg-green-600 text-white shadow-xl shadow-green-100 dark:shadow-none lg:translate-x-1" 
        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
    )}
  >
    <div className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-gray-400 group-hover:text-green-600")}>
      <Icon size={18} />
    </div>
    <span translate="no">{label}</span>
  </button>
);

export const PedagogySection: React.FC<PedagogySectionProps> = (props) => {
  const {
    user,
    elderly,
    patients,
    assessments,
    evolutions,
    activities,
    stimulationTrackings,
    socialParticipations,
    individualPlans,
    lifeHistories,
    onSavePatient,
    onSaveAssessment,
    onSaveEvolution,
    onSaveActivity,
    onSaveStimulation,
    onSaveSocial,
    onSavePlan,
    onSaveLifeHistory,
    onSavePhotos,
    onDeleteRecord,
    onDeletePatient,
    showToast,
    theme,
    setTheme,
    onLogout,
    professionals = [],
    nursingEvolutions = [],
    physioEvolutions = [],
    psychEvolutions = [],
    pedagogyEvolutions = [],
    socialEvolutions = [],
    nutritionEvolutions = [],
    workshops = [],
    notifications = [],
    onDeleteNotification,
    onSaveCollaborationEvolution,
    onDeleteCollaborationEvolution
  } = props;
  if (!user || !user.role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-6">
        <div className="text-center space-y-4">
          <div className="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Autenticando acesso pedagógico...</p>
          <p className="text-[10px] text-gray-400">Se demorar muito, tente atualizar a página.</p>
        </div>
      </div>
    );
  }

  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('oami-pedagogy-tab');
    return (saved as TabType) || 'dashboard';
  });
  const [residentSubTab, setResidentSubTab] = useState<'profile' | 'history' | 'assessment' | 'plan'>('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PedagogyPatient | null>(null);
  const [evolutionPatientFilter, setEvolutionPatientFilter] = useState('');
  const [stimulationPatientFilter, setStimulationPatientFilter] = useState('');
  const [socialPatientFilter, setSocialPatientFilter] = useState('');
  const [formData, setFormData] = useState<any>({});
  const [editingData, setEditingData] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: string } | null>(null);
  const [viewingEvo, setViewingEvo] = useState<any | null>(null);
  const [viewingAct, setViewingAct] = useState<any | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [reportsPatientFilter, setReportsPatientFilter] = useState('');
  const [reportFilterType, setReportFilterType] = useState<'month' | 'year' | 'semester' | 'days'>('month');
  const [reportSelectedMonth, setReportSelectedMonth] = useState(() => format(new Date(), 'yyyy-MM'));
  const [reportSelectedYear, setReportSelectedYear] = useState(() => String(new Date().getFullYear()));
  const [reportSelectedSemester, setReportSelectedSemester] = useState<'1' | '2'>('1');
  const [reportStartDate, setReportStartDate] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return format(d, 'yyyy-MM-dd');
  });
  const [reportEndDate, setReportEndDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [reportSelectedSections, setReportSelectedSections] = useState<string[]>([
    'evolutions', 'stimulation', 'social', 'activities', 'individualPlans', 'assessments'
  ]);
  const [profSearch, setProfSearch] = useState('');
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [isMulti, setIsMulti] = useState(false);

  // Sincronização automática com Cadastro Geral
  const linkedElderly = useMemo(() => 
    formData.elderlyId ? (elderly || []).find(e => e.id === formData.elderlyId) : null,
  [formData.elderlyId, elderly]);

  useEffect(() => {
    if (linkedElderly && (modalType === 'patient' || activeTab === 'residents')) {
      const birthDate = parseISO(linkedElderly.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      setFormData((prev: any) => ({
        ...prev,
        name: linkedElderly.name,
        age: age,
        birthDate: linkedElderly.birthDate,
        cpf: linkedElderly.cpf,
        entryDate: linkedElderly.entryDate,
        schooling: linkedElderly.schooling || prev.schooling,
        literacyLevel: linkedElderly.literacyLevel || prev.literacyLevel,
        previousProfession: linkedElderly.lastProfession || prev.previousProfession,
        cognitiveLimitations: linkedElderly.physicalLimitations || prev.cognitiveLimitations
      }));
    }
  }, [linkedElderly, modalType, activeTab]);

  useEffect(() => {
    localStorage.setItem('oami-pedagogy-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (props.defaultTab) {
      setActiveTab(props.defaultTab as any);
    }
  }, [props.defaultTab]);

  const onClose = () => setIsModalOpen(false);

  const handleDigitize = async (text: string) => {
    const type = modalType || activeTab;
    if (!text) return;

    setIsExtracting(true);
    try {
      const schemas: Record<string, string> = {
        patient: "name, age (number), schooling, previousProfession, literacyLevel (ALFABETIZADO, ANALFABETO, FUNCIONAL), cognitiveLevel (ALTO, MEDIO, BAIXO)",
        assessment: "behavioralObservations, physicalSkills, cognitiveStatus, socialInteraction",
        evolution: "evolution",
        activity: "title, description, objectives",
        stimulation: "activityDescription, reaction, observation",
        social: "activity, interactionLevel, mood",
        history: "lifeHistory, mainEvents, preferences, relevantRecords",
        plan: "shortTermGoals, longTermGoals, plannedActivities"
      };

      const extractedData = await extractFormData(text, schemas[type] || "description, observations");
      
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
      } else {
        if (type === 'evolution') {
          setFormData((prev: any) => ({ ...prev, evolution: (prev.evolution || '') + '\n' + text }));
        } else if (type === 'activity' || type === 'activities') {
          setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
        }
      }
    } catch (err) {
      console.error("Extraction error:", err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFixGrammar = async (field: string) => {
    if (!formData[field]) return;
    setIsExtracting(true);
    try {
      const fixed = await fixGrammar(formData[field]);
      setFormData((prev: any) => ({ ...prev, [field]: fixed }));
      showToast('Texto corrigido com sucesso', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao corrigir texto', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const type = modalType || activeTab;
      const { photos, ...data } = formData;
      const id = editingData?.id;

      if (isMulti && selectedPatientIds.length > 0 && !editingData && type !== 'patient' && type !== 'residents') {
        const primaryPid = selectedPatientIds[0];
        const payload = { ...data, patientId: primaryPid, patientIds: selectedPatientIds, id };

        switch (type) {
          case 'assessment':
            await onSaveAssessment({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'evolution':
            await onSaveEvolution({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'activity':
          case 'activities':
            await onSaveActivity({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'stimulation':
            await onSaveStimulation({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'social':
            await onSaveSocial({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'plan':
            await onSavePlan({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'history':
            await onSaveLifeHistory({ ...payload, date: payload.date || new Date().toISOString() });
            break;
        }

        if (photos && photos.length > 0) {
          const patient = (patients || []).find(p => p.id === primaryPid);
          const activityType = 
            type === 'evolution' ? 'Evolução Pedagógica' :
            type === 'activity' || type === 'activities' ? 'Atividade Pedagógica' : 'Atendimento Pedagógico';
          
          await onSavePhotos(photos, primaryPid, patient?.name || 'Paciente', activityType, data.evolution || data.description);
        }
      } else {
        if (!formData.patientId && type !== 'patient' && type !== 'residents' && type !== 'activity' && type !== 'activities') {
          alert('Por favor, selecione pelo menos um idoso!');
          setIsLoading(false);
          return;
        }

        const payload = { ...data, id };

        switch (type) {
          case 'patient':
          case 'residents':
            await onSavePatient(payload);
            break;
          case 'assessment':
            await onSaveAssessment({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'evolution':
            await onSaveEvolution({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'activity':
          case 'activities':
            await onSaveActivity({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'stimulation':
            await onSaveStimulation({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'social':
            await onSaveSocial({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'plan':
            await onSavePlan({ ...payload, date: payload.date || new Date().toISOString() });
            break;
          case 'history':
            await onSaveLifeHistory({ ...payload, date: payload.date || new Date().toISOString() });
            break;
        }

        if (photos && photos.length > 0 && formData.patientId) {
          const patient = (patients || []).find(p => p.id === formData.patientId);
          const activityType = 
            type === 'evolution' ? 'Evolução Pedagógica' :
            type === 'activity' || type === 'activities' ? 'Atividade Pedagógica' : 'Atendimento Pedagógico';
          
          await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.evolution || formData.description);
        }
      }

      setIsModalOpen(false);
      setModalType('');
      setFormData({});
      setEditingData(null);
      showToast('Registro salvo com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar registro. Verifique os dados.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const openModal = (type: string, initialData: any = null) => {
    setModalType(type);
    setProfSearch('');
    if (initialData?.patientId) {
      setSelectedPatientIds([initialData.patientId]);
    } else {
      setSelectedPatientIds([]);
    }
    setIsMulti(false);
    if (!initialData) {
      const now = new Date();
      setFormData({
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        participants: [],
        coWorkers: []
      });
    } else {
      setFormData({
        ...(initialData || {}),
        coWorkers: initialData?.coWorkers || []
      });
    }
    setEditingData(initialData);
    setIsModalOpen(true);
    setSelectedPatient(null);
  };

  const modalTitles: Record<string, string> = {
    patient: 'Cadastro Educacional',
    residents: 'Cadastro Educacional',
    assessment: 'Avaliação Inicial Pedagógica',
    evolution: 'Evolução Pedagógica',
    activity: 'Nova Oficina/Atividade',
    activities: 'Nova Oficina/Atividade',
    stimulation: 'Estimulação Cognitiva',
    social: 'Interação Social',
    plan: 'Plano Pedagógico Individual',
    history: 'História de Vida'
  };

  const renderModalContent = () => {
    const type = modalType || activeTab;
    switch (type) {
      case 'patient':
      case 'residents':
        return (
          <form onSubmit={handleSave} className="p-5 md:p-8 space-y-6 md:space-y-8">
            <div className="space-y-3 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-800/30 transition-all">
              <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Users size={14} />
                Vincular ao Cadastro Geral (Idosos)
              </label>
              <select 
                className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold dark:text-white"
                value={formData.elderlyId || ''}
                onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
              >
                <option value="">-- Não vinculado / Novo Cadastro --</option>
                {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <p className="text-[10px] text-blue-600/60 ml-1 italic font-medium">Sincroniza nome, idade, CPF e data de entrada.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black disabled:opacity-50"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!formData.elderlyId}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">URL da Foto</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                  placeholder="https://exemplo.com/foto.jpg"
                  value={formData.photoUrl || ''}
                  onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Idade</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black disabled:opacity-50"
                  value={formData.age === undefined || isNaN(formData.age) ? '' : formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value === '' ? 0 : parseInt(e.target.value) })}
                  disabled={!!formData.elderlyId}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Escolaridade</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.schooling || ''}
                  onChange={(e) => setFormData({ ...formData, schooling: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ANALFABETO">Analfabeto</option>
                  <option value="FUNDAMENTAL_INCOMPLETO">Fundamental Incompleto</option>
                  <option value="FUNDAMENTAL_COMPLETO">Fundamental Completo</option>
                  <option value="MEDIO_COMPLETO">Médio Completo</option>
                  <option value="SUPERIOR_COMPLETO">Superior Completo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Profissão Anterior</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.previousProfession || ''}
                  onChange={(e) => setFormData({ ...formData, previousProfession: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Nível de Alfabetização</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.literacyLevel || ''}
                  onChange={(e) => setFormData({ ...formData, literacyLevel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALFABETIZADO">Alfabetizado</option>
                  <option value="ANALFABETO">Analfabeto</option>
                  <option value="FUNCIONAL">Alfabetizado Funcional</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Nível Cognitivo</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.cognitiveLevel || ''}
                  onChange={(e) => setFormData({ ...formData, cognitiveLevel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Interesses (separados por vírgula)</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold"
                  value={formData.interestsStr || ''}
                  onChange={(e) => setFormData({ ...formData, interestsStr: e.target.value, interests: e.target.value.split(',').map(s => s.trim()) })}
                />
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-black text-gray-900 dark:text-white">Limitações Cognitivas</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, cognitiveLimitations: (formData.cognitiveLimitations || '') + ' ' + t })} />
                </div>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold h-20"
                  value={formData.cognitiveLimitations || ''}
                  onChange={(e) => setFormData({ ...formData, cognitiveLimitations: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Registro')}
              </button>
            </div>
          </form>
        );
      case 'assessment':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-gray-900 dark:text-gray-100">
            <div className="animate-fade-in col-span-2">
              <MultiPatientSelector 
                patients={(patients || []).map(p => ({ id: p.id, name: p.name }))}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Avaliado(s)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['memory', 'attention', 'language', 'comprehension', 'orientation', 'praxis', 'gnosis'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1 capitalize">
                    {field === 'praxis' ? 'Praxia' : field === 'gnosis' ? 'Gnosia' : field === 'comprehension' ? 'Compreensão' : field === 'orientation' ? 'Orientação' : field === 'memory' ? 'Memória' : field === 'attention' ? 'Atenção' : 'Linguagem'}
                  </label>
                  <select
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                    value={formData[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="PRESERVADO">Preservado</option>
                    <option value="LEVE_COMPROMETIMENTO">Leve Comprometimento</option>
                    <option value="COMPROMETIDO">Comprometido</option>
                  </select>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Observações</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Registro')}
              </button>
            </div>
          </form>
        );
      case 'evolution':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => ({ id: p.id, name: p.name }))}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) em Evolução"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Título da Atividade</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                value={formData.activityTitle || ''}
                onChange={(e) => setFormData({ ...formData, activityTitle: e.target.value })}
              />
            </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Data do Registro</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Horário</label>
                  <input
                    type="time"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                    value={formData.time || ''}
                    onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Participação</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.participation || ''}
                  onChange={(e) => setFormData({ ...formData, participation: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PASSIVO">Passivo</option>
                  <option value="RECUSOU">Recusou</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Humor</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.mood || ''}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALEGRE">Alegre</option>
                  <option value="CALMO">Calmo</option>
                  <option value="TRISTE">Triste</option>
                  <option value="AGITADO">Agitado</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">Resposta à Atividade</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    disabled={isExtracting || !formData.response}
                    onClick={async () => {
                      if (!formData.response) return;
                      setIsExtracting(true);
                      try {
                        const fixed = await fixGrammar(formData.response);
                        setFormData({ ...formData, response: fixed });
                        showToast('Texto corrigido com sucesso', 'success');
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao corrigir texto', 'error');
                      } finally {
                        setIsExtracting(false);
                      }
                    }}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors bg-green-50 dark:bg-green-900/30 px-2 py-1 rounded-lg disabled:opacity-50"
                  >
                    {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap size={14} />}
                    Corrigir
                  </button>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, response: (formData.response || '') + ' ' + t })} />
                </div>
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.response || ''}
                onChange={(e) => setFormData({ ...formData, response: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Registro')}
              </button>
            </div>
          </form>
        );
      case 'activity':
      case 'activities':
        return (
          <form onSubmit={handleSave} className="p-5 md:p-8 space-y-6 md:space-y-8 text-gray-900 dark:text-gray-100">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Título da Atividade</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Data</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Horário</label>
                <input
                  type="time"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Tipo</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="MEMORIA">Memória</option>
                  <option value="PINTURA">Pintura</option>
                  <option value="MUSICA">Música</option>
                  <option value="JOGOS">Jogos</option>
                  <option value="LEITURA">Leitura</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-gray-900 dark:text-white uppercase">Participantes</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700">
                {(patients || []).map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                    <input 
                      type="checkbox" 
                      value={p.id}
                      checked={(formData.participants || []).includes(p.id)}
                      onChange={(e) => {
                        const current = formData.participants || [];
                        if (e.target.checked) setFormData({ ...formData, participants: [...current, p.id] });
                        else setFormData({ ...formData, participants: current.filter((id: string) => id !== p.id) });
                      }}
                      className="w-4 h-4 rounded text-pink-600 border-gray-300 focus:ring-pink-500"
                    />
                    <span className="truncate text-gray-900 dark:text-gray-200 font-black">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-900 dark:text-white">Descrição/Objetivo</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            {/* Seleção de Co-workers / Outros Profissionais da Instituição */}
            <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <div>
                  <label className="text-xs font-black text-gray-400 dark:text-gray-350 uppercase tracking-wider block">Co-workers / Profissionais Colaboradores</label>
                  <span className="text-[10px] text-gray-400">Selecione quem participou desta ação em conjunto</span>
                </div>
                {formData.coWorkers && formData.coWorkers.length > 0 && (
                  <button 
                    type="button" 
                    onClick={() => setFormData({ ...formData, coWorkers: [] })}
                    className="text-[10px] text-red-500 font-bold uppercase tracking-wider font-black"
                  >
                    Limpar Seleção ({formData.coWorkers.length})
                  </button>
                )}
              </div>
              
              <div className="relative">
                <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-pink-500 transition-all">
                  <Search size={16} className="text-gray-400" />
                  <input 
                    type="text"
                    placeholder="Buscar profissional por nome ou cargo..."
                    value={profSearch}
                    onChange={(e) => setProfSearch(e.target.value)}
                    className="bg-transparent text-sm w-full outline-none text-gray-800 dark:text-white"
                  />
                  {profSearch && (
                    <button type="button" onClick={() => setProfSearch('')} className="text-gray-400 hover:text-gray-650">
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1">
                {professionals
                  .filter((p: any) => {
                    if (!profSearch) return true;
                    
                    const term = profSearch.toLowerCase();
                    const pName = (p.name || '').toLowerCase();
                    const pRole = (ROLE_LABELS[p.role] || p.role || '').toLowerCase();
                    return pName.includes(term) || pRole.includes(term);
                  })
                  .map((p: any) => {
                    const isSelected = (formData.coWorkers || []).includes(p.id) || (formData.coWorkers || []).includes(p.email);
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => {
                          const list = formData.coWorkers || [];
                          const identifier = p.id || p.email;
                          if (isSelected) {
                            setFormData({ ...formData, coWorkers: list.filter((item: string) => item !== p.id && item !== p.email) });
                          } else {
                            setFormData({ ...formData, coWorkers: [...list, identifier] });
                          }
                        }}
                        className={cn(
                          "flex items-center justify-between p-3 rounded-2xl border text-left transition-all",
                          isSelected 
                            ? "bg-blend-color-burn bg-pink-500/10 dark:bg-pink-950/20 border-pink-400 dark:border-pink-850 text-pink-900 dark:text-pink-300 font-black"
                            : "bg-white dark:bg-gray-855 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-300 font-medium"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">{ROLE_LABELS[p.role] || p.role}</p>
                        </div>
                        <div className={cn(
                          "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                          isSelected ? "bg-pink-500 border-pink-500 text-white" : "border-gray-200 dark:border-gray-700 bg-transparent"
                        )}>
                          {isSelected && <CheckCircle2 size={12} />}
                        </div>
                      </button>
                    );
                  })
                }
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-pink-600 text-white rounded-2xl font-bold shadow-lg shadow-pink-200 dark:shadow-none hover:bg-pink-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Atividade')}
              </button>
            </div>
          </form>
        );
      case 'stimulation':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => ({ id: p.id, name: p.name }))}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Monitorado(s)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Data do Registro</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Horário</label>
                <input
                  type="time"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: 'memoryScore', label: 'Memória' },
                { field: 'attentionScore', label: 'Atenção' },
                { field: 'reasoningScore', label: 'Raciocínio' },
                { field: 'languageScore', label: 'Linguagem' }
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">{item.label}</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                    value={formData[item.field] || ''}
                    onChange={(e) => setFormData({ ...formData, [item.field]: parseInt(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Observações</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Estimulação')}
              </button>
            </div>
          </form>
        );
      case 'social':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => ({ id: p.id, name: p.name }))}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) em Atividade"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Data</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Horário</label>
                <input
                  type="time"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Nível de Interação</label>
                <select
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.interactionLevel || ''}
                  onChange={(e) => setFormData({ ...formData, interactionLevel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                </select>
              </div>
              <div className="space-y-2 pt-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isIsolated"
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded"
                    checked={formData.isIsolated || false}
                    onChange={(e) => setFormData({ ...formData, isIsolated: e.target.checked })}
                  />
                  <label htmlFor="isIsolated" className="text-sm font-black text-gray-700 dark:text-gray-300 leading-none">Está Isolado?</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCommunicative"
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded"
                    checked={formData.isCommunicative || false}
                    onChange={(e) => setFormData({ ...formData, isCommunicative: e.target.checked })}
                  />
                  <label htmlFor="isCommunicative" className="text-sm font-black text-gray-700 dark:text-gray-300 leading-none">É Comunicativo?</label>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Observações Sociais</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={onClose} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Registro Social')}
              </button>
            </div>
          </form>
        );
      case 'plan':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-gray-900 dark:text-gray-100">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => ({ id: p.id, name: p.name }))}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Objetivos Pedagógicos</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, objectives: (formData.objectives || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.objectives || ''}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Estratégias de Intervenção</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, strategies: (formData.strategies || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.strategies || ''}
                onChange={(e) => setFormData({ ...formData, strategies: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Atividades Indicadas (separadas por vírgula)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                value={formData.indicatedActivitiesStr || ''}
                onChange={(e) => setFormData({ ...formData, indicatedActivitiesStr: e.target.value, indicatedActivities: e.target.value.split(',').map(s => s.trim()) })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={isLoading}
                className="flex-[2] py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading && <Loader2 className="w-5 h-5 animate-spin" />}
                {isLoading ? 'Salvando...' : (editingData ? 'Salvar Edição' : 'Salvar Plano')}
              </button>
            </div>
          </form>
        );
      case 'history':
        return (
          <form onSubmit={handleSave} className="p-5 md:p-8 space-y-6 md:space-y-8 text-gray-900 dark:text-gray-100">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => ({ id: p.id, name: p.name }))}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Principais Lembranças</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, memories: (formData.memories || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.memories || ''}
                onChange={(e) => setFormData({ ...formData, memories: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300">Histórias Marcantes</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, stories: (formData.stories || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black h-24"
                value={formData.stories || ''}
                onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">URLs das Fotos (separadas por vírgula)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                placeholder="https://exemplo.com/foto1.jpg, ..."
                value={formData.photosStr || ''}
                onChange={(e) => setFormData({ ...formData, photosStr: e.target.value, photos: e.target.value.split(',').map(s => s.trim()) })}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-gray-900 dark:text-white">Linha do Tempo</h4>
                <button
                  type="button"
                  onClick={() => {
                    const timeline = formData.timelineEvents || [];
                    setFormData({
                      ...formData,
                      timelineEvents: [...timeline, { date: '', event: '' }]
                    });
                  }}
                  className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900 font-black"
                >
                  + Adicionar Evento
                </button>
              </div>
              {(formData.timelineEvents || []).map((event: any, index: number) => (
                <div key={index} className="grid grid-cols-3 gap-2 items-end bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Data/Ano</label>
                    <input
                      type="text"
                      className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                      placeholder="Ex: 1950"
                      value={event.date}
                      onChange={(e) => {
                        const newTimeline = [...formData.timelineEvents];
                        newTimeline[index].date = e.target.value;
                        setFormData({ ...formData, timelineEvents: newTimeline });
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase mb-1">Evento</label>
                    <input
                      type="text"
                      className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                      placeholder="Ex: Casamento"
                      value={event.event}
                      onChange={(e) => {
                        const newTimeline = [...formData.timelineEvents];
                        newTimeline[index].event = e.target.value;
                        setFormData({ ...formData, timelineEvents: newTimeline });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newTimeline = formData.timelineEvents.filter((_: any, i: number) => i !== index);
                      setFormData({ ...formData, timelineEvents: newTimeline });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <div className="flex gap-4 pt-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 rounded-2xl font-bold hover:bg-gray-100 transition-all">
                Cancelar
              </button>
              <button type="submit" className="flex-[2] py-3 md:py-4 bg-orange-600 text-white rounded-2xl font-bold shadow-lg shadow-orange-200 dark:shadow-none hover:bg-orange-700 transition-all">
                {editingData ? 'Salvar Edição' : 'Salvar História'}
              </button>
            </div>
          </form>
        );
      default:
        return null;
    }
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const patientsList = patients || [];
    const activitiesList = activities || [];
    const socialParticipationsList = socialParticipations || [];
    const evolutionsList = evolutions || [];
    const individualPlansList = individualPlans || [];

    const today = format(new Date(), 'yyyy-MM-dd');
    const activitiesToday = activitiesList.filter(a => a.date === today);
    const lowParticipation = socialParticipationsList.filter(s => s.interactionLevel === 'BAIXO' && (s.date ? isToday(parseISO(s.date)) : false));
    
    const patientsWithEvolutionToday = new Set(
      evolutionsList
        .filter(e => e.date ? isToday(parseISO(e.date)) : false)
        .map(e => e.patientId)
    ).size;
    
    return {
      totalPatients: patientsList.length,
      activitiesToday: activitiesToday.length,
      lowParticipation: lowParticipation.length,
      noParticipation: Math.max(0, patientsList.length - patientsWithEvolutionToday),
      activePlans: individualPlansList.length,
      totalActivities: activitiesList.length
    };
  }, [patients, activities, socialParticipations, individualPlans, evolutions]);

  const activityTypeStats = useMemo(() => {
    const types: Record<string, number> = {};
    (activities || []).forEach(a => {
      types[a.type] = (types[a.type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({ name, value }));
  }, [activities]);

  const filteredPatients = (patients || []).filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Settings className="text-blue-600" size={24} />
          Configurações do Sistema
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                {theme === 'light' ? <Sun className="text-yellow-500" /> : <Moon className="text-blue-400" />}
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">Tema do Sistema</p>
                <p className="text-xs text-gray-500">Alterne entre modo claro e escuro</p>
              </div>
            </div>
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all"
            >
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <LogOut className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-red-600 dark:text-red-400">Sair da Conta</p>
                <p className="text-xs text-red-500/60">Encerre sua sessão atual</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
            >
              Sair Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Auxiliar para formatação de data segura
  const safeDateFormat = (dateStr: string | null | undefined, formatStr: string = 'dd/MM/yyyy') => {
    if (!dateStr) return '--/--';
    try {
      const parsed = parseISO(dateStr);
      if (isNaN(parsed.getTime())) return '--/--';
      return format(parsed, formatStr);
    } catch (e) {
      return '--/--';
    }
  };

  const safeReplace = (str: string | null | undefined, search: string, replacement: string) => {
    if (!str) return 'N/A';
    try {
      return String(str).split(search).join(replacement);
    } catch (e) {
      return String(str || 'N/A');
    }
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        {[
          { label: 'Idosos', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Oficinas Hoje', value: stats.activitiesToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Total Oficinas', value: stats.totalActivities, icon: Palette, color: 'text-pink-600', bg: 'bg-pink-50' },
          { label: 'Sem Evolução', value: stats.noParticipation, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Baixa Part.', value: stats.lowParticipation, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Planos Ativos', value: stats.activePlans, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-gray-900 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Evolução de Participação
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={(socialParticipations || []).slice(0, 15).reverse().map(s => ({
                  ...s,
                  interactionValue: s.interactionLevel === 'ALTO' ? 3 : s.interactionLevel === 'MEDIO' ? 2 : 1
                }))}>
                  <defs>
                    <linearGradient id="colorParticipation" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={(str) => {
                      if (!str) return '--/--';
                      try {
                        const date = parseISO(str);
                        if (isNaN(date.getTime())) return '--/--';
                        return format(date, 'dd/MM');
                      } catch (e) {
                        return '--/--';
                      }
                    }}
                    tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis 
                    domain={[0, 3]} 
                    ticks={[1, 2, 3]}
                    tickFormatter={(val) => val === 3 ? 'Alta' : val === 2 ? 'Média' : 'Baixa'}
                    tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="interactionValue" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorParticipation)" />
                </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cognitive Levels Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Nível Cognitivo Geral
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Alto', value: (patients || []).filter(p => p.cognitiveLevel === 'ALTO').length },
                    { name: 'Médio', value: (patients || []).filter(p => p.cognitiveLevel === 'MEDIO').length },
                    { name: 'Baixo', value: (patients || []).filter(p => p.cognitiveLevel === 'BAIXO').length },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
                <Legend iconType="circle" />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Distribution Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Palette className="w-5 h-5 text-pink-600" />
            Distribuição de Oficinas
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={activityTypeStats}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#64748b', fontSize: 10, fontWeight: 'bold'}} />
                <Tooltip contentStyle={{ borderRadius: '16px', border: 'none' }} />
                <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Recent Pedagogy Evolutions */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-green-600" />
            Últimas Evoluções
          </h3>
          <div className="space-y-4">
            {(evolutions || []).slice(0, 5).map((ev, i) => {
              const patient = (patients || []).find(p => p.id === ev.patientId);
              return (
                <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center border border-gray-100">
                     <UserIcon className="w-5 h-5 text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white truncate">{patient?.name || 'Desconhecido'}</p>
                    <p className="text-xs text-gray-500 truncate">{ev.activityTitle} • {safeDateFormat(ev.date, 'dd/MM')}</p>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-md text-[10px] font-black",
                    ev.participation === 'ATIVO' ? "bg-green-100 text-green-700" : "bg-orange-100 text-orange-700"
                  )}>
                    {ev.participation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Today's Activities */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Atividades do Dia
        </h3>
        <div className="space-y-4">
          {(activities || []).filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length > 0 ? (
            (activities || []).filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    {activity.type === 'MEMORIA' && <Brain className="w-5 h-5 text-purple-600" />}
                    {activity.type === 'PINTURA' && <Palette className="w-5 h-5 text-pink-600" />}
                    {activity.type === 'MUSICA' && <Music className="w-5 h-5 text-blue-600" />}
                    {activity.type === 'JOGOS' && <Gamepad2 className="w-5 h-5 text-green-600" />}
                    {activity.type === 'LEITURA' && <BookOpen className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{activity.title}</p>
                    <p className="text-sm text-gray-900 dark:text-gray-400 font-black">
                      {activity.time} • {(activity.participants || []).length} participantes
                    </p>
                    {(activity.participants || []).length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {activity.participants.slice(0, 3).map(pId => {
                          const p = (patients || []).find(pat => pat.id === pId);
                          return (
                            <span key={pId} className="px-1.5 py-0.5 bg-white dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded text-[9px] font-bold border border-gray-100 dark:border-gray-600">
                              {p?.name?.split(' ')[0]}
                            </span>
                          );
                        })}
                        {activity.participants.length > 3 && (
                          <span className="text-[9px] font-bold text-gray-400">+{activity.participants.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold text-sm">Ver Detalhes</button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma atividade agendada para hoje.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderResidents = () => {
    if (!selectedPatient) return null;

    const linkedElderly = selectedPatient.elderlyId ? (elderly || []).find(e => e.id === selectedPatient.elderlyId) : null;
    const name = linkedElderly?.name || selectedPatient.name;
    let age = selectedPatient.age;
    if (linkedElderly) {
      const birthDate = parseISO(linkedElderly.birthDate);
      age = new Date().getFullYear() - birthDate.getFullYear();
    }

    try {
      const history = (lifeHistories || []).find(h => h?.patientId === selectedPatient.id);
      const assessment = (assessments || []).find(a => a?.patientId === selectedPatient.id);
      const plan = (individualPlans || []).find(p => p?.patientId === selectedPatient.id);

      const subTabs = [
        { id: 'profile', label: 'Perfil & Interesses', icon: UserCircle },
        { id: 'history', label: 'História de Vida', icon: History },
        { id: 'assessment', label: 'Avaliação Inicial', icon: Brain },
        { id: 'plan', label: 'Plano (PPI)', icon: Target },
      ] as const;

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-2 text-gray-900 hover:text-black dark:hover:text-white font-bold"
            >
              <ArrowLeft className="w-5 h-5 font-bold" />
              Voltar para Lista
            </button>
            <button 
              onClick={() => setSelectedPatient(null)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="Fechar"
            >
              <X className="w-6 h-6 text-gray-900" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/30 overflow-hidden shadow-inner">
                  {selectedPatient?.photoUrl ? (
                    <img src={selectedPatient.photoUrl} alt={name || selectedPatient.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-white" />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <h2 className="text-3xl font-black">{name || selectedPatient?.name || 'N/A'}</h2>
                    {linkedElderly && (
                      <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-black uppercase tracking-widest border border-white/30">Vinculado</span>
                    )}
                  </div>
                  <p className="text-blue-50 font-bold mt-1">
                    {age || selectedPatient?.age} anos • {selectedPatient?.schooling || 'Escolaridade não informada'}
                  </p>
                  <div className="flex gap-2 mt-4">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider border border-white/20">
                      Cognitivo: {selectedPatient?.cognitiveLevel || 'N/A'}
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider border border-white/20">
                      {safeReplace(selectedPatient?.literacyLevel || '', '_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex border-b border-gray-200 dark:border-gray-800 px-8 bg-gray-50/50 dark:bg-gray-900/50 overflow-x-auto">
              {subTabs.map((sub) => {
                const Icon = sub.icon;
                return (
                  <button
                    key={sub.id}
                    onClick={() => setResidentSubTab(sub.id as any)}
                    className={cn(
                      "flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap",
                      residentSubTab === sub.id 
                        ? "border-blue-600 text-blue-900 dark:text-blue-400 bg-white dark:bg-gray-900" 
                        : "border-transparent text-gray-700 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
                    )}
                  >
                    <Icon className="w-4 h-4" />
                    {sub.label}
                  </button>
                );
              })}
            </div>

            <div className="p-8">
              {residentSubTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3">Profissão Anterior</h4>
                      <p className="text-gray-900 dark:text-gray-100 font-bold">{selectedPatient?.previousProfession || 'Não informada'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3">Interesses</h4>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(selectedPatient?.interests) ? selectedPatient.interests : []).map((interest, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-gray-900 dark:text-blue-300 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800">
                            {String(interest || 'N/A')}
                          </span>
                        ))}
                        {(!selectedPatient?.interests || selectedPatient.interests.length === 0) && <p className="text-xs text-gray-500">Nenhum interesse registrado.</p>}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3">Preferência de Rotina</h4>
                      <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/40 text-gray-900 dark:text-purple-300 rounded-full text-xs font-bold uppercase border border-purple-100 dark:border-purple-800">
                        {selectedPatient?.routinePreference || 'Não informada'}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-3">Limitações Cognitivas</h4>
                      <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                        <p className="text-gray-900 dark:text-gray-200 font-bold leading-relaxed">{selectedPatient?.cognitiveLimitations || 'Nenhuma limitação registrada.'}</p>
                      </div>
                    <button 
                      onClick={() => { openModal('patient', selectedPatient); setSelectedPatient(null); }}
                      className="mt-6 flex items-center gap-2 text-gray-900 dark:text-white hover:text-blue-700 font-black text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar Perfil Educacional
                    </button>
                  </div>
                </div>
              )}

              {residentSubTab === 'history' && (
                history ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div>
                        <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          Principais Lembranças
                        </h5>
                        <p className="text-gray-900 dark:text-white leading-relaxed italic font-bold">"{history.memories || 'Sem memórias registradas.'}"</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Histórias Marcantes
                        </h5>
                        <p className="text-gray-900 dark:text-white leading-relaxed font-bold">{history.stories || 'Sem histórias registradas.'}</p>
                      </div>
                      <div className="flex gap-4">
                        <button 
                          onClick={() => openModal('history', history)}
                          className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold text-sm"
                        >
                          <Edit2 className="w-4 h-4" />
                          Editar História
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: history.id, type: 'history' })}
                          className="flex items-center gap-2 text-red-600 hover:text-red-700 font-bold text-sm"
                        >
                          <Trash2 className="w-4 h-4" />
                          Excluir História
                        </button>
                      </div>
                    </div>

                    <div className="relative pl-8 border-l-2 border-black">
                      <h5 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider mb-6">Linha do Tempo</h5>
                      <div className="space-y-8">
                        {(Array.isArray(history?.timelineEvents) ? history.timelineEvents : []).map((event, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-black border-4 border-white shadow-sm" />
                            <p className="text-xs font-black text-gray-900 dark:text-white mb-1">{event?.date || '--/--'}</p>
                            <p className="text-sm text-gray-900 dark:text-white font-bold">{event?.event || 'Evento não descrito'}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-bold">Nenhuma história de vida registrada para este idoso.</p>
                    <button 
                      onClick={() => openModal('history', { patientId: selectedPatient.id })}
                      className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700"
                    >
                      Registrar História
                    </button>
                  </div>
                )
              )}

              {residentSubTab === 'assessment' && (
                assessment ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ScoreCard label="Memória" score={assessment.memory === 'PRESERVADO' ? 10 : assessment.memory === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                      <ScoreCard label="Atenção" score={assessment.attention === 'PRESERVADO' ? 10 : assessment.attention === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                      <ScoreCard label="Linguagem" score={assessment.language === 'PRESERVADO' ? 10 : assessment.language === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                      <ScoreCard label="Orientação" score={assessment.orientation === 'PRESERVADO' ? 10 : assessment.orientation === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <h5 className="text-sm font-bold text-gray-400 uppercase mb-3">Observações da Avaliação</h5>
                      <p className="text-gray-600 dark:text-gray-300">{assessment.observations || 'Sem observações adicionais.'}</p>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => openModal('assessment', assessment)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Refazer Avaliação
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ id: assessment.id, type: 'assessment' })}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 font-bold text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Avaliação
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-bold">Nenhuma avaliação cognitiva inicial realizada.</p>
                    <button 
                      onClick={() => openModal('assessment', { patientId: selectedPatient.id })}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                    >
                      Realizar Avaliação
                    </button>
                  </div>
                )
              )}

              {residentSubTab === 'plan' && (
                plan ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h5 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">Objetivos Pedagógicos</h5>
                        <p className="text-gray-900 dark:text-gray-200 leading-relaxed font-bold italic">"{plan.objectives || 'Sem objetivos definidos.'}"</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">Estratégias</h5>
                        <p className="text-gray-900 dark:text-gray-200 leading-relaxed font-bold">"{plan.strategies || 'Sem estratégias definidas.'}"</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">Atividades Indicadas</h5>
                      <div className="flex flex-wrap gap-2">
                        {(Array.isArray(plan?.indicatedActivities) ? plan.indicatedActivities : []).map((act, i) => (
                          <span key={i} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <button 
                        onClick={() => openModal('plan', plan)}
                        className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Atualizar Plano
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm({ id: plan.id, type: 'plan' })}
                        className="flex items-center gap-2 text-red-600 hover:text-red-700 font-bold text-sm"
                      >
                        <Trash2 className="w-4 h-4" />
                        Excluir Plano
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-gray-900 dark:text-white font-bold">Nenhum plano pedagógico individual (PPI) definido.</p>
                    <button 
                      onClick={() => openModal('plan', { patientId: selectedPatient.id })}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                    >
                      Criar Plano
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    } catch (error) {
      console.error("Erro ao renderizar detalhes do residente:", error);
      return (
        <div className="p-12 text-center bg-red-50 dark:bg-red-900/20 rounded-3xl border border-red-100 dark:border-red-900/30">
          <Brain className="w-16 h-16 text-red-300 mx-auto mb-4" />
          <h3 className="text-xl font-black text-red-900 dark:text-red-400 uppercase">Erro no Prontuário</h3>
          <p className="text-red-700 dark:text-red-500 font-bold mt-2">Não foi possível carregar todas as informações deste residente.</p>
          <button 
            onClick={() => setSelectedPatient(null)}
            className="mt-6 px-6 py-2 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700"
          >
            Voltar para Lista
          </button>
        </div>
      );
    }
  };









  const renderActivitiesTab = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-gray-900 dark:text-white" translate="no">Oficinas & Atividades Pedagógicas</h3>
        <button
          onClick={() => openModal('activity')}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Oficina
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-wider">Agenda de Oficinas</h4>
          <div className="grid grid-cols-1 gap-4">
            {(activities || []).slice().sort((a, b) => {
              const dateDiff = b.date.localeCompare(a.date);
              if (dateDiff !== 0) return dateDiff;
              return (b.time || '').localeCompare(a.time || '');
            }).map((activity) => (
              <div key={activity.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <h5 className="font-black text-gray-900 dark:text-white">{activity.title}</h5>
                      <p className="text-sm text-gray-900 dark:text-gray-400 font-black">
                        {safeDateFormat(activity.date)} às {activity.time}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-full text-xs font-black uppercase border border-pink-100 dark:border-pink-800">
                    {activity.type}
                  </span>
                </div>
                <p className="text-sm text-gray-900 dark:text-gray-300 mb-4 font-black leading-relaxed">{activity.description}</p>
                
                {(activity.participants || []).length > 0 && (
                  <div className="mb-4">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Participantes confirmados:</p>
                    <div className="flex flex-wrap gap-2">
                      {(activity.participants || []).map(pId => {
                        const p = (patients || []).find(pat => pat.id === pId);
                        return (
                          <span key={pId} className="px-3 py-1 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-xl text-[10px] font-black border border-gray-100 dark:border-gray-700 shadow-sm flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                            {p?.name || 'Idoso não encontrado'}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {activity.coWorkers && activity.coWorkers.length > 0 && (
                  <div className="mb-4 pt-3 border-t border-gray-100 dark:border-gray-800">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Equipe / Colaboradores:</p>
                    <div className="flex flex-wrap gap-2">
                      {activity.coWorkers.map(cwId => {
                        const prof = professionals.find(p => p.id === cwId || p.email === cwId || p.name === cwId);
                        return (
                          <span key={cwId} className="px-3 py-1 bg-pink-50/50 dark:bg-pink-950/20 text-pink-700 dark:text-pink-350 rounded-xl text-[10px] font-black border border-pink-100 dark:border-pink-900 shadow-sm">
                            {prof ? prof.name : cwId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <button 
                    onClick={() => openModal('evolution', { activityTitle: activity.title })}
                    className="flex-1 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-purple-100 dark:border-purple-800"
                  >
                    Registrar Participação
                  </button>
                  <button 
                    onClick={() => setViewingAct(activity)}
                    className="p-2 text-green-600 hover:bg-green-50 rounded-lg border border-green-100 dark:border-green-800"
                    title="Visualizar 👁️"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => openModal('activity', activity)}
                    className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg border border-pink-100 dark:border-pink-850"
                    title="Editar ✏️"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ id: activity.id, type: 'activity' })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-100 dark:border-red-850"
                    title="Excluir 🗑️"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Evoluções Recentes</h4>
            <select
              value={evolutionPatientFilter}
              onChange={(e) => setEvolutionPatientFilter(e.target.value)}
              className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Filtrar p/ Idoso</option>
              {(patients || []).map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        <div className="space-y-3">
          {(evolutions || []).filter(e => !evolutionPatientFilter || e.patientId === evolutionPatientFilter || e.patientIds?.includes(evolutionPatientFilter)).slice().sort((a, b) => {
            const dateDiff = b.date.localeCompare(a.date);
            if (dateDiff !== 0) return dateDiff;
            return (b.time || '').localeCompare(a.time || '');
          }).slice(0, 8).map((evolution) => {
            const patient = (patients || []).find(p => p.id === evolution.patientId);
            return (
              <div key={evolution.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                    {patient?.photoUrl ? <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-400 m-2.5" />}
                  </div>
                    <div>
                      <p className="text-sm font-black text-gray-900 dark:text-white">
                        {evolution.patientIds && evolution.patientIds.length > 1 
                          ? evolution.patientIds.map(pid => (patients || []).find(p => p.id === pid)?.name).filter(Boolean).join(', ')
                          : (patient?.name || 'N/A')}
                      </p>
                      <p className="text-[11px] text-gray-900 dark:text-gray-400 font-black">
                        {evolution.activityTitle} • {safeDateFormat(evolution.date, 'dd/MM')}{evolution.time ? ` às ${evolution.time}` : ''}
                      </p>
                    </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase border",
                    evolution.participation === 'ATIVO' ? "bg-green-50 text-green-700 border-green-100" : "bg-yellow-50 text-yellow-700 border-yellow-100"
                  )}>
                    {evolution.participation}
                  </span>
                  <p className="text-[10px] text-gray-900 dark:text-gray-400 mt-1 font-black">{safeDateFormat(evolution.date, 'dd/MM HH:mm')}</p>
                </div>
                <div className="flex gap-1 ml-4">
                  <button 
                    onClick={() => setViewingEvo(evolution)}
                    className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                    title="Visualizar 👁️"
                  >
                    <Eye className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => openModal('evolution', evolution)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                    title="Editar ✏️"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ id: evolution.id, type: 'evolution' })}
                    className="p-1.5 text-gray-400 hover:text-red-650 hover:bg-red-50 rounded-lg transition-colors"
                    title="Excluir 🗑️"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-black text-gray-900 dark:text-white" translate="no">Acompanhamento de Progresso</h3>
          <select
            value={stimulationPatientFilter}
            onChange={(e) => setStimulationPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Filtrar p/ Idoso (Estimulação)</option>
            {(patients || []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          <select
            value={socialPatientFilter}
            onChange={(e) => setSocialPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-green-500 min-w-[200px]"
          >
            <option value="">Filtrar p/ Idoso (Interação)</option>
            {(patients || []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('stimulation')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Estimulação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            Estimulação Cognitiva (Média)
          </h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Memória', value: (stimulationTrackings || []).reduce((acc, curr) => acc + (curr.memoryScore || 0), 0) / ((stimulationTrackings || []).length || 1) },
                { name: 'Atenção', value: (stimulationTrackings || []).reduce((acc, curr) => acc + (curr.attentionScore || 0), 0) / ((stimulationTrackings || []).length || 1) },
                { name: 'Raciocínio', value: (stimulationTrackings || []).reduce((acc, curr) => acc + (curr.reasoningScore || 0), 0) / ((stimulationTrackings || []).length || 1) },
                { name: 'Linguagem', value: (stimulationTrackings || []).reduce((acc, curr) => acc + (curr.languageScore || 0), 0) / ((stimulationTrackings || []).length || 1) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fill: 'black', fontWeight: 'bold'}} />
                <YAxis domain={[0, 10]} tick={{fill: 'black', fontWeight: 'bold'}} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="mt-8 space-y-4">
            <h5 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Histórico de Estimulação</h5>
            <div className="space-y-3">
              {(stimulationTrackings || [])
                .filter(stim => !stimulationPatientFilter || stim.patientId === stimulationPatientFilter || stim.patientIds?.includes(stimulationPatientFilter))
                .slice().sort((a, b) => {
                  const dateDiff = b.date.localeCompare(a.date);
                  if (dateDiff !== 0) return dateDiff;
                  return (b.time || '').localeCompare(a.time || '');
                }).map((stim) => {
                  const patient = (patients || []).find(p => p.id === stim.patientId);
                  return (
                    <div key={stim.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-center justify-between group hover:shadow-md transition-all">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                          {stim.patientIds && stim.patientIds.length > 1 
                            ? stim.patientIds.map(pid => (patients || []).find(p => p.id === pid)?.name).filter(Boolean).join(', ')
                            : (patient?.name || 'N/A')}
                        </p>
                        <p className="text-xs text-gray-500">{safeDateFormat(stim.date)}{stim.time ? ` às ${stim.time}` : ''} • Cognição: {Math.round(((stim.memoryScore || 0) + (stim.attentionScore || 0) + (stim.reasoningScore || 0) + (stim.languageScore || 0)) / 4)}/10</p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                          onClick={() => openModal('stimulation', stim)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: stim.id, type: 'stimulation' })}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-green-500" />
            Interação Social
          </h4>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Alta', value: (socialParticipations || []).filter(s => s.interactionLevel === 'ALTO').length },
                    { name: 'Média', value: (socialParticipations || []).filter(s => s.interactionLevel === 'MEDIO').length },
                    { name: 'Baixa', value: (socialParticipations || []).filter(s => s.interactionLevel === 'BAIXO').length },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-gray-500">Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs font-bold text-gray-500">Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-gray-500">Baixa</span>
            </div>
          </div>

          <div className="mt-8 space-y-4">
            <h5 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Histórico de Participações</h5>
            <div className="space-y-3">
              {(socialParticipations || [])
                .filter(soc => !socialPatientFilter || soc.patientId === socialPatientFilter || soc.patientIds?.includes(socialPatientFilter))
                .slice().sort((a, b) => {
                  const dateDiff = b.date.localeCompare(a.date);
                  if (dateDiff !== 0) return dateDiff;
                  return (b.time || '').localeCompare(a.time || '');
                }).map((soc) => {
                  const patient = (patients || []).find(p => p.id === soc.patientId);
                  return (
                    <div key={soc.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800/50 flex items-center justify-between group hover:shadow-md transition-all">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white">
                          {soc.patientIds && soc.patientIds.length > 1 
                            ? soc.patientIds.map(pid => (patients || []).find(p => p.id === pid)?.name).filter(Boolean).join(', ')
                            : (patient?.name || 'N/A')}
                        </p>
                        <p className="text-xs text-gray-500">{safeDateFormat(soc.date)}{soc.time ? ` às ${soc.time}` : ''} • Interação: <span className={cn(
                          "font-bold",
                          soc.interactionLevel === 'ALTO' ? "text-green-600" : soc.interactionLevel === 'MEDIO' ? "text-yellow-600" : "text-red-600"
                        )}>{soc.interactionLevel}</span></p>
                      </div>
                      <div className="flex items-center gap-2">
                         <button 
                          onClick={() => openModal('social', soc)}
                          className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteConfirm({ id: soc.id, type: 'social' })}
                          className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => {
    const isDateInSelectedRange = (dateStr: string) => {
      if (!dateStr) return false;
      const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
      
      if (reportFilterType === 'month') {
        return dateOnly.startsWith(reportSelectedMonth); // 'YYYY-MM'
      }
      if (reportFilterType === 'year') {
        return dateOnly.startsWith(reportSelectedYear); // 'YYYY'
      }
      if (reportFilterType === 'semester') {
        if (!dateOnly.startsWith(reportSelectedYear)) return false;
        const monthParts = dateOnly.split('-');
        if (monthParts.length < 2) return false;
        const month = parseInt(monthParts[1], 10);
        if (isNaN(month)) return false;
        if (reportSelectedSemester === '1') {
          return month >= 1 && month <= 6;
        } else {
          return month >= 7 && month <= 12;
        }
      }
      if (reportFilterType === 'days') {
        if (reportStartDate && dateOnly < reportStartDate) return false;
        if (reportEndDate && dateOnly > reportEndDate) return false;
        return true;
      }
      return true;
    };

    // Filtered lists based on search and selected patient filter
    const matchedPatients = (patients || []).filter(p => {
      const matchSearch = !searchTerm || p.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchPatient = !reportsPatientFilter || p.id === reportsPatientFilter;
      return matchSearch && matchPatient;
    });

    const isPatientInList = (pId: string) => {
      return matchedPatients.some(p => p.id === pId);
    };

    // Filtered Evolutions
    const filteredEvolutions = (evolutions || []).filter(e => {
      return isPatientInList(e.patientId) && isDateInSelectedRange(e.date);
    });

    // Filtered Stimulation Trackings (Estimulações Cognitivas)
    const filteredStimulation = (stimulationTrackings || []).filter(s => {
      return isPatientInList(s.patientId) && isDateInSelectedRange(s.date);
    });

    // Filtered Social Participations (Participação Social)
    const filteredSocial = (socialParticipations || []).filter(sp => {
      return isPatientInList(sp.patientId) && isDateInSelectedRange(sp.date);
    });

    // Filtered Activities (Oficinas Integradas)
    const filteredActivitiesList = (activities || []).filter(a => {
      const isDateValid = isDateInSelectedRange(a.date);
      if (!isDateValid) return false;
      
      if (!reportsPatientFilter) {
        // Se nenhum idoso específico estiver selecionado, exibe TODAS as oficinas no período
        return true;
      }
      
      // Se um idoso específico estiver selecionado, exibe as oficinas que ele participou
      // ou oficinas coletivas gerais (que não possuem lista delimitada de residentes)
      return !a.participants || a.participants.length === 0 || a.participants.includes(reportsPatientFilter);
    });

    // Filtered Individual Plans (Planos de Metas)
    const filteredPlans = (individualPlans || []).filter(ip => {
      return isPatientInList(ip.patientId) && isDateInSelectedRange(ip.date);
    });

    // Filtered Assessments (Avaliações Iniciais)
    const filteredAssessments = (assessments || []).filter(as => {
      return isPatientInList(as.patientId) && isDateInSelectedRange(as.date);
    });

    // Filtered Life Histories (Histórias de Vida)
    const filteredLifeHistories = (lifeHistories || []).filter(lh => {
      return isPatientInList(lh.patientId);
    });

    const toggleSection = (section: string) => {
      if (reportSelectedSections.includes(section)) {
        setReportSelectedSections(reportSelectedSections.filter(s => s !== section));
      } else {
        setReportSelectedSections([...reportSelectedSections, section]);
      }
    };

    const getSubtitleText = () => {
      let period = '';
      if (reportFilterType === 'month') {
        const [year, month] = reportSelectedMonth.split('-');
        const monthNames = [
          'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
          'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
        ];
        period = `${monthNames[parseInt(month, 10) - 1]} de ${year}`;
      } else if (reportFilterType === 'year') {
        period = `Ano de ${reportSelectedYear}`;
      } else if (reportFilterType === 'semester') {
        period = `${reportSelectedSemester}º Semestre de ${reportSelectedYear}`;
      } else if (reportFilterType === 'days') {
        const fmt = (d: string) => d ? format(parseISO(d), 'dd/MM/yyyy') : '...';
        period = `Período: ${fmt(reportStartDate)} até ${fmt(reportEndDate)}`;
      }
      
      const patientName = reportsPatientFilter 
        ? `Idoso: ${(patients || []).find(p => p.id === reportsPatientFilter)?.name}` 
        : 'Todos os Idosos (Geral)';
        
      return `Área: Pedagogia | ${patientName} | Cronograma: ${period}`;
    };

    const handleGenerateIntegratedReport = async (formatType: 'pdf' | 'word') => {
      const sections = [];
      const subtitleText = getSubtitleText();

      if (reportSelectedSections.includes('evolutions') && filteredEvolutions.length > 0) {
        const columns = reportsPatientFilter 
          ? ['Data/Hora', 'Atividade Realizada', 'Participação', 'Resposta / Observação', 'Responsável']
          : ['Data', 'Idoso', 'Atividade Realizada', 'Participação', 'Resposta / Observação', 'Responsável'];
          
        const data = filteredEvolutions.map(e => {
          const p = (patients || []).find(pt => pt.id === e.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(e.date), 'dd/MM/yyyy');
          const timeText = e.time ? ` às ${e.time}` : '';
          return reportsPatientFilter
            ? [`${dtFmt}${timeText}`, e.activityTitle, e.participation || 'ATIVO', `${e.response || ''}\n${e.observations || ''}`.trim() || '-', e.registeredBy || 'N/A']
            : [dtFmt, name || 'Geral', e.activityTitle, e.participation || 'ATIVO', `${e.response || ''}\n${e.observations || ''}`.trim() || '-', e.registeredBy || 'N/A'];
        });
        
        sections.push({ title: 'Evoluções Pedagógicas', columns, data });
      }

      if (reportSelectedSections.includes('stimulation') && filteredStimulation.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Memória', 'Atenção', 'Raciocínio', 'Linguagem', 'Observações']
          : ['Data', 'Idoso', 'Memória', 'Atenção', 'Raciocínio', 'Linguagem', 'Observações'];
          
        const data = filteredStimulation.map(s => {
          const p = (patients || []).find(pt => pt.id === s.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(s.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [dtFmt, `${s.memoryScore || 0}/10`, `${s.attentionScore || 0}/10`, `${s.reasoningScore || 0}/10`, `${s.languageScore || 0}/10`, s.observations || '-']
            : [dtFmt, name || 'Geral', `${s.memoryScore || 0}/10`, `${s.attentionScore || 0}/10`, `${s.reasoningScore || 0}/10`, `${s.languageScore || 0}/10`, s.observations || '-'];
        });
        
        sections.push({ title: 'Estimulação Cognitiva', columns, data });
      }

      if (reportSelectedSections.includes('social') && filteredSocial.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Nível Interação', 'Estado de Isolamento', 'Comunicação', 'Observações']
          : ['Data', 'Idoso', 'Nível Interação', 'Estado de Isolamento', 'Comunicação', 'Observações'];
          
        const data = filteredSocial.map(sp => {
          const p = (patients || []).find(pt => pt.id === sp.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(sp.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [dtFmt, sp.interactionLevel || 'MÉDIO', sp.isIsolated ? 'Sim (Isolado)' : 'Não', sp.isCommunicative ? 'Comunicativo' : 'Pouco comunicativo', sp.observations || '-']
            : [dtFmt, name || 'Geral', sp.interactionLevel || 'MÉDIO', sp.isIsolated ? 'Sim (Isolado)' : 'Não', sp.isCommunicative ? 'Comunicativo' : 'Pouco comunicativo', sp.observations || '-'];
        });
        
        sections.push({ title: 'Participação e Socialização', columns, data });
      }

      if (reportSelectedSections.includes('activities') && filteredActivitiesList.length > 0) {
        const columns = ['Data/Hora', 'Oficina / Atividade', 'Estratégia / Tipo', 'Desenvolvimento', 'Residentes Participantes'];
        const data = filteredActivitiesList.map(a => {
          const parts = (a.participants || []).map(pid => {
            const pt = (patients || []).find(p => p.id === pid);
            return pt?.elderlyId ? (elderly || []).find(ed => ed.id === pt.elderlyId)?.name : pt?.name;
          }).filter(Boolean).join(', ');
          const dtFmt = format(parseISO(a.date), 'dd/MM/yyyy');
          const timeText = a.time ? ` às ${a.time}` : '';
          return [`${dtFmt}${timeText}`, a.title, a.type, a.description, parts || 'Nenhum'];
        });
        
        sections.push({ title: 'Oficinas e Oficinas de Grupo', columns, data });
      }

      if (reportSelectedSections.includes('individualPlans') && filteredPlans.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Objetivos Pedagógicos', 'Atividades Indicadas', 'Estratégias de Intervenção']
          : ['Data', 'Idoso', 'Objetivos Pedagógicos', 'Atividades Indicadas', 'Estratégias de Intervenção'];
          
        const data = filteredPlans.map(ip => {
          const p = (patients || []).find(pt => pt.id === ip.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(ip.date), 'dd/MM/yyyy');
          const indicatedText = (ip.indicatedActivities || []).join(', ') || '-';
          return reportsPatientFilter
            ? [dtFmt, ip.objectives, indicatedText, ip.strategies]
            : [dtFmt, name || 'Geral', ip.objectives, indicatedText, ip.strategies];
        });
        
        sections.push({ title: 'Planos Individuais de Metas', columns, data });
      }

      if (reportSelectedSections.includes('assessments') && filteredAssessments.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Cognição & Linguagem', 'Praxia & Gnosia', 'Observações Detalhadas']
          : ['Data', 'Idoso', 'Cognição & Linguagem', 'Praxia & Gnosia', 'Observações Detalhadas'];
          
        const data = filteredAssessments.map(as => {
          const p = (patients || []).find(pt => pt.id === as.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(as.date), 'dd/MM/yyyy');
          const cogText = `Memória: ${as.memory || 'PRESERVADO'}\nAtenção: ${as.attention || 'PRESERVADO'}\nLinguagem: ${as.language || 'PRESERVADO'}\nCompreensão: ${as.comprehension || 'PRESERVADO'}\nOrientação: ${as.orientation || 'PRESERVADO'}`;
          const pgText = `Praxia: ${as.praxis || 'PRESERVADO'}\nGnosia: ${as.gnosis || 'PRESERVADO'}`;
          return reportsPatientFilter
            ? [dtFmt, cogText, pgText, as.observations || '-']
            : [dtFmt, name || 'Geral', cogText, pgText, as.observations || '-'];
        });
        
        sections.push({ title: 'Avaliações Iniciais Pedagógicas', columns, data });
      }

      if (reportSelectedSections.includes('lifeHistories') && filteredLifeHistories.length > 0) {
        const columns = ['Idoso', 'Lembranças Relatadas', 'Histórias Gravadas', 'Linha do Tempo de Destaques'];
        const data = filteredLifeHistories.map(lh => {
          const p = (patients || []).find(pt => pt.id === lh.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const timelineText = (lh.timelineEvents || [])
            .map(t => `[${t.date}] ${t.event}`)
            .join('\n') || '-';

          return [name || 'N/A', lh.memories || '-', lh.stories || '-', timelineText];
        });
        
        sections.push({ title: 'Histórico de Vida e Lembranças', columns, data });
      }

      if (sections.length === 0) {
        showToast('Nenhum dado selecionado ou encontrado para o período e idoso especificados', 'error');
        return;
      }

      const docTitle = reportsPatientFilter 
        ? `Prontuário Pedagógico - ${patients.find(p => p.id === reportsPatientFilter)?.name}`
        : 'Relatório Consolidado de Atividades (Pedagogia)';

      if (formatType === 'pdf') {
        try {
          await generateMultiSectionPDF({
            title: docTitle,
            subtitle: subtitleText,
            sections,
            fileName: `relatorio_pedagogia_${format(new Date(), 'yyyy-MM-dd')}`
          });
          showToast('Relatório em PDF gerado com sucesso!', 'success');
        } catch (e) {
          console.error(e);
          showToast('Erro ao exportar o PDF', 'error');
        }
      } else {
        try {
          const mergedColumns = ['Categoria', 'Data/Período', 'Paciente/Idoso', 'Descrição / Registro', 'Profissional Responsável'];
          const mergedData: any[][] = [];

          sections.forEach(sec => {
            sec.data.forEach(row => {
              if (reportsPatientFilter) {
                const targetName = patients.find(p => p.id === reportsPatientFilter)?.name || 'N/A';
                mergedData.push([
                  sec.title,
                  row[0],
                  targetName,
                  row.slice(1, -1).join(' | '),
                  row[row.length - 1] || 'N/A'
                ]);
              } else {
                mergedData.push([
                  sec.title,
                  row[0],
                  row[1] || 'Geral',
                  row.slice(2, -1).join(' | '),
                  row[row.length - 1] || 'N/A'
                ]);
              }
            });
          });

          await generateModernWord({
            title: docTitle,
            subtitle: subtitleText,
            columns: mergedColumns,
            data: mergedData,
            fileName: `relatorio_pedagogia_doc`
          });
          showToast('Relatório em Word gerado com sucesso!', 'success');
        } catch (err) {
          console.error(err);
          showToast('Erro ao exportar o Word', 'error');
        }
      }
    };

    const hasNoRecords = 
      filteredEvolutions.length === 0 && 
      filteredStimulation.length === 0 && 
      filteredSocial.length === 0 && 
      filteredActivitiesList.length === 0 && 
      filteredPlans.length === 0 && 
      filteredAssessments.length === 0 && 
      filteredLifeHistories.length === 0;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
            Gerador Inteligente de Relatórios
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Gere relatórios técnicos integrados de pedagogia para impressão oficial. Selecione múltiplos formatos de data, idosos e escolha quais módulos do sistema incluir no documento.
          </p>
        </div>

        {/* Filters Card Grid */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Patient selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block ml-0.5">
                Idoso / Residente
              </label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Filter size={16} className="text-gray-400 shrink-0" />
                <select 
                  value={reportsPatientFilter}
                  onChange={(e) => setReportsPatientFilter(e.target.value)}
                  className="w-full text-xs font-black bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white outline-none"
                >
                  <option value="">TODOS OS IDOSOS (GERAL)</option>
                  {patients.map(p => {
                    const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                    return (
                      <option key={p.id} value={p.id}>{(linked?.name || p.name || '').toUpperCase()}</option>
                    );
                  })}
                </select>
              </div>
            </div>

            {/* 2. Format filter category */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block ml-0.5">
                Formato do Período
              </label>
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Calendar size={16} className="text-gray-400 shrink-0" />
                <select 
                  value={reportFilterType}
                  onChange={(e) => setReportFilterType(e.target.value as any)}
                  className="w-full text-xs font-black bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white outline-none uppercase"
                >
                  <option value="month">Mensal (Mês Selecionado)</option>
                  <option value="year">Anual (Ano Inteiro)</option>
                  <option value="semester">Semestral (Metade do Ano)</option>
                  <option value="days">Por Dias (Intervalo Exato)</option>
                </select>
              </div>
            </div>

            {/* 3. The Date pickers */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block ml-0.5">
                Escolha do Período / Data
              </label>
              
              {reportFilterType === 'month' && (
                <input 
                  type="month"
                  value={reportSelectedMonth}
                  onChange={(e) => setReportSelectedMonth(e.target.value)}
                  className="w-full text-xs font-bold bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none"
                />
              )}

              {reportFilterType === 'year' && (
                <div className="bg-gray-50 dark:bg-gray-800 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <select
                    value={reportSelectedYear}
                    onChange={(e) => setReportSelectedYear(e.target.value)}
                    className="w-full text-xs font-black bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white outline-none"
                  >
                    {['2024', '2025', '2026', '2027'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportFilterType === 'semester' && (
                <div className="grid grid-cols-2 gap-2">
                  <select
                    value={reportSelectedSemester}
                    onChange={(e) => setReportSelectedSemester(e.target.value as any)}
                    className="w-full text-xs font-black bg-gray-50 dark:bg-gray-800 px-3 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white outline-none"
                  >
                    <option value="1">1º SEMESTRE (JAN - JUN)</option>
                    <option value="2">2º SEMESTRE (JUL - DEZ)</option>
                  </select>

                  <select
                    value={reportSelectedYear}
                    onChange={(e) => setReportSelectedYear(e.target.value)}
                    className="w-full text-xs font-black bg-gray-50 dark:bg-gray-800 px-3 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white outline-none"
                  >
                    {['2024', '2025', '2026', '2027'].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportFilterType === 'days' && (
                <div className="grid grid-cols-2 gap-2 items-center">
                  <input 
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full text-[10px] font-bold bg-gray-50 dark:bg-gray-800 px-2 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none"
                  />
                  <input 
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full text-[10px] font-bold bg-gray-50 dark:bg-gray-800 px-2 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section categories toggles with badges of found records */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Seções do Sistema a Incluir no Relatório
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { id: 'evolutions', title: 'Evoluções Pedagógicas', desc: 'Registros diários de evolução e atividades.', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', count: filteredEvolutions.length },
              { id: 'stimulation', title: 'Estimulação Cognitiva', desc: 'Acompanhamento de pontuação cognitiva (0 a 10).', icon: Brain, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', count: filteredStimulation.length },
              { id: 'social', title: 'Participação Social', desc: 'Nível de integração e socialização.', icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', count: filteredSocial.length },
              { id: 'activities', title: 'Oficinas e Oficinas de Grupo', desc: 'Dinâmicas coletivas e projetos realizados.', icon: Users, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20', count: filteredActivitiesList.length },
              { id: 'individualPlans', title: 'Plano Individual de Metas', desc: 'Planejamento e estratégias pedagógicas.', icon: Target, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/20', count: filteredPlans.length },
              { id: 'assessments', title: 'Avaliação Inicial', desc: 'Avaliação dos aspectos intelectuais e de compreensão.', icon: CheckCircle2, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', count: filteredAssessments.length },
              { id: 'lifeHistories', title: 'Histórico de Lembranças', desc: 'Eventos cronológicos marcantes e histórias gravadas.', icon: History, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', count: filteredLifeHistories.length },
            ].map((sec) => {
              const isChecked = reportSelectedSections.includes(sec.id);
              const IconComp = sec.icon;
              return (
                <div 
                  key={sec.id}
                  onClick={() => toggleSection(sec.id)}
                  className={cn(
                    "p-4 rounded-2xl border cursor-pointer transition-all flex items-start gap-3",
                    isChecked 
                      ? "border-emerald-500 bg-emerald-50/20 dark:bg-emerald-950/10 shadow-sm"
                      : "border-gray-100 dark:border-gray-800/80 hover:bg-gray-50/50 dark:hover:bg-gray-800/30"
                  )}
                >
                  <input 
                    type="checkbox"
                    checked={isChecked}
                    onChange={() => {}} // handled by div click
                    className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 rounded mt-1 border-gray-300"
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-white text-xs tracking-tight">
                        <IconComp size={14} className={sec.color} />
                        <span className="truncate">{sec.title}</span>
                      </div>
                      
                      <span className={cn(
                        "text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0",
                        sec.count > 0 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500"
                      )}>
                        {sec.count === 1 ? '1 reg' : `${sec.count} regs`}
                      </span>
                    </div>
                    <p className="text-[10px] leading-snug font-medium text-gray-500 dark:text-gray-400">
                      {sec.desc}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action triggers */}
        <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 mt-0.5">
              <Info size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tight">
                Configuração Pronta para Impressão
              </p>
              <p className="text-[11px] leading-relaxed font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                {hasNoRecords 
                  ? "Atenção: Não há registros cadastrados para os filtros selecionados. Cadastre evoluções ou mude as datas para habilitar relatórios."
                  : `Seu relatório integrará ${reportSelectedSections.filter(s => {
                      if (s === 'evolutions') return filteredEvolutions.length > 0;
                      if (s === 'stimulation') return filteredStimulation.length > 0;
                      if (s === 'social') return filteredSocial.length > 0;
                      if (s === 'activities') return filteredActivitiesList.length > 0;
                      if (s === 'individualPlans') return filteredPlans.length > 0;
                      if (s === 'assessments') return filteredAssessments.length > 0;
                      if (s === 'lifeHistories') return filteredLifeHistories.length > 0;
                      return false;
                    }).length} seções do prontuário oficial com formatação de alta qualidade.`
                }
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0 w-full md:w-auto">
            <button
              onClick={() => handleGenerateIntegratedReport('pdf')}
              disabled={hasNoRecords}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 font-black py-4 px-6 rounded-2xl shadow-lg transition-all text-xs tracking-wider uppercase shrink-0 select-none cursor-pointer",
                hasNoRecords
                  ? "bg-gray-250 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed shadow-none"
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-none"
              )}
            >
              <Printer size={16} />
              Imprimir PDF
            </button>

            <button
              onClick={() => handleGenerateIntegratedReport('word')}
              disabled={hasNoRecords}
              className={cn(
                "flex-1 md:flex-none flex items-center justify-center gap-2 font-black py-4 px-6 rounded-2xl shadow-lg transition-all text-xs tracking-wider uppercase shrink-0 select-none cursor-pointer",
                hasNoRecords
                  ? "bg-gray-250 text-gray-400 dark:bg-gray-800 dark:text-gray-600 cursor-not-allowed shadow-none"
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-none"
              )}
            >
              <FileText size={16} />
              Baixar Word
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar snap-x scroll-smooth sticky top-0 bg-gray-50 dark:bg-gray-950 z-10 lg:static lg:bg-transparent">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'residents', label: 'Residentes', icon: Users },
          { id: 'activities', label: 'Oficinas & Atividades', icon: Palette },
          { id: 'monitoring', label: 'Monitoramento', icon: TrendingUp },
          { id: 'productivity', label: 'Painel e Colaboração', icon: Award },
          { id: 'reports', label: 'Relatórios', icon: FileText },
          { id: 'settings', label: 'Configurações', icon: Settings },
        ].map((tab) => (
          <NavButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType);
              setEditingData(null);
            }}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'residents' && (
              selectedPatient ? renderResidents() : (
                <div className="space-y-6">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div className="relative flex-1 max-w-md">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Buscar idoso..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white"
                      />
                    </div>
                    <button
                      onClick={() => openModal('patient')}
                      className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-5 h-5" />
                      Novo Cadastro Educacional
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {(filteredPatients || []).map((patient) => {
                      const linkedElderly = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                      const name = linkedElderly?.name || patient.name;
                      let age = patient.age;
                      if (linkedElderly) {
                        const birthDate = parseISO(linkedElderly.birthDate);
                        age = new Date().getFullYear() - birthDate.getFullYear();
                      }

                      return (
                        <motion.div
                          key={patient.id}
                          layout
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer relative"
                          onClick={() => setSelectedPatient(patient)}
                        >
                          <div className="p-6">
                            <div className="flex items-start justify-between mb-4">
                              <div className="flex items-center gap-4">
                                <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-100">
                                  {patient.photoUrl ? (
                                    <img src={patient.photoUrl} alt={name} className="w-full h-full object-cover" />
                                  ) : (
                                    <UserIcon className="w-8 h-8 text-blue-400" />
                                  )}
                                </div>
                                <div>
                                  <h4 className="font-black text-gray-900 dark:text-white line-clamp-1">{name}</h4>
                                  <p className="text-sm text-gray-900 dark:text-gray-300 font-black">{age} anos • {patient.schooling}</p>
                                </div>
                              </div>
                              <div className="flex flex-col items-end gap-1">
                                <div className={cn(
                                  "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                                  patient.cognitiveLevel === 'ALTO' ? "bg-green-50 text-green-700 border-green-100" :
                                  patient.cognitiveLevel === 'MEDIO' ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                                  "bg-red-50 text-red-700 border-red-100"
                                )}>
                                  {patient.cognitiveLevel}
                                </div>
                                {linkedElderly && (
                                  <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-bold rounded uppercase">Vinculado</span>
                                )}
                              </div>
                            </div>

                          <div className="space-y-3 mb-6">
                            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200 font-black">
                              <BookOpen className="w-4 h-4 text-blue-500" />
                              <span>{safeReplace(patient.literacyLevel, '_', ' ')}</span>
                            </div>
                            <div className="flex items-center gap-2 text-sm text-gray-900 dark:text-gray-200 font-black">
                              <Star className="w-4 h-4 text-yellow-500" />
                              <span className="truncate">{(patient.interests || []).join(', ')}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); setSelectedPatient(patient); }}
                              className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-black hover:bg-blue-100 transition-colors"
                            >
                              Ver Prontuário
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); openModal('patient', patient); }}
                              className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button 
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ id: patient.id, type: 'resident' }); }}
                              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                  </div>
                </div>
              )
            )}
            {activeTab === 'productivity' && (
              <ProductivitySection
                user={user}
                professionals={professionals}
                nursingEvolutions={nursingEvolutions}
                physioEvolutions={physioEvolutions}
                psychEvolutions={psychEvolutions}
                pedagogyEvolutions={evolutions}
                socialEvolutions={socialEvolutions}
                nutritionEvolutions={nutritionEvolutions}
                workshops={workshops}
                notifications={notifications}
                elderly={elderly}
                onDeleteNotification={async (id, e) => {
                  e.stopPropagation();
                  if (onDeleteNotification) {
                    onDeleteNotification(id, e);
                  }
                }}
                onSaveEvolution={onSaveCollaborationEvolution || (async () => {})}
                onDeleteEvolution={onDeleteCollaborationEvolution || (async () => {})}
                showToast={showToast}
                targetSector="Pedagogia"
                targetRole="PEDAGOGA"
                psychActivities={props.psychActivities}
                pedagogyActivities={props.pedagogyActivities}
                onViewActivity={props.onViewActivity}
              />
            )}
            {activeTab === 'activities' && renderActivitiesTab()}
            {activeTab === 'monitoring' && renderMonitoring()}
            {activeTab === 'reports' && renderReports()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="bg-white dark:bg-gray-900 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800"
          >
            <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-6">
              <Trash2 size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Excluir Registro?</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 font-medium">Esta ação não pode ser desfeita. O registro será removido permanentemente.</p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancelar
              </button>
              <button 
                onClick={async () => {
                  try {
                    const collections: Record<string, string> = {
                      patient: 'pedagogyPatients',
                      assessment: 'pedagogyInitialAssessments',
                      evolution: 'pedagogyEvolutions',
                      activity: 'pedagogyActivities',
                      stimulation: 'pedagogyStimulationTrackings',
                      social: 'pedagogySocialParticipations',
                      plan: 'pedagogyIndividualPlans',
                      history: 'pedagogyLifeHistories',
                      resident: 'pedagogyPatients'
                    };
                    
                    const collectionName = collections[deleteConfirm.type];
                    if (collectionName) {
                      await onDeleteRecord(collectionName, deleteConfirm.id);
                    }
                    setDeleteConfirm(null);
                  } catch (err) {
                    console.error(err);
                  }
                }}
                className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all"
              >
                Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {viewingEvo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-lg w-full space-y-6 max-h-[85vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-purple-600">
                  <Brain size={24} />
                  <h3 className="text-xl font-bold text-gray-850 dark:text-white">Detalhes da Evolução Pedagógica</h3>
                </div>
                <button onClick={() => setViewingEvo(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Idoso</span>
                  <p className="text-base font-bold text-gray-800 dark:text-white">
                    {((patients || []).find(p => p.id === viewingEvo.patientId)?.name || 'N/A')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data / Horário</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {safeDateFormat(viewingEvo.date)} {viewingEvo.time ? ` às ${viewingEvo.time}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Registrado Por</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingEvo.registeredBy || 'Pedagogo'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Oficina / Título</span>
                    <p className="text-sm font-bold text-purple-600">
                      {viewingEvo.activityTitle || 'Atividade Livre'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Participação</span>
                    <p className="text-sm font-bold text-green-600">
                      {viewingEvo.participation || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Observações Pedagógicas</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingEvo.observation || viewingEvo.observations}
                  </p>
                </div>

                {viewingEvo.objectives && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Objetivos Alcançados</span>
                    <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                      {viewingEvo.objectives}
                    </p>
                  </div>
                )}

                {viewingEvo.coWorkers && viewingEvo.coWorkers.length > 0 && (
                  <div className="pt-3 border-t border-gray-105 dark:border-gray-800">
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Equipe / Colaboradores</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingEvo.coWorkers.map(cwId => {
                        const prof = (professionals || []).find(p => p.id === cwId || p.email === cwId || p.name === cwId);
                        return (
                          <span key={cwId} className="px-2 py-0.5 bg-green-50 dark:bg-green-950/35 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                            {prof ? prof.name : cwId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex pt-2 justify-end">
                <button 
                  onClick={() => setViewingEvo(null)}
                  className="px-6 py-2.5 bg-purple-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-purple-700 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingAct && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-lg w-full space-y-6 max-h-[85vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-pink-600">
                  <Palette size={24} />
                  <h3 className="text-xl font-bold text-gray-850 dark:text-white flex items-center gap-1.5">Detalhes da Oficina / Atividade</h3>
                </div>
                <button onClick={() => setViewingAct(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Título</span>
                    <p className="text-base font-bold text-gray-800 dark:text-white">
                      {viewingAct.title}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Tipo de Oficina</span>
                    <p className="text-sm font-bold text-pink-600 uppercase">
                      {viewingAct.type}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {safeDateFormat(viewingAct.date)} às {viewingAct.time}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Responsável</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingAct.registeredBy || 'Orientador'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Descrição / Planejamento</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingAct.description}
                  </p>
                </div>

                {viewingAct.participants && viewingAct.participants.length > 0 && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Participantes Sincronizados</span>
                    <div className="flex flex-wrap gap-1.5 flex-row">
                      {viewingAct.participants.map(pid => {
                        const p = (patients || []).find(pat => pat.id === pid);
                        return (
                          <span key={pid} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-805 rounded-xl text-xs text-gray-700 dark:text-gray-300 font-medium border border-gray-200/60 dark:border-gray-750 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-pink-500"></div>
                            {p?.name || pid}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}

                {viewingAct.coWorkers && viewingAct.coWorkers.length > 0 && (
                  <div className="pt-3 border-t border-gray-105 dark:border-gray-800">
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Equipe / Colaboradores</span>
                    <div className="flex flex-wrap gap-1">
                      {viewingAct.coWorkers.map(cwId => {
                        const prof = (professionals || []).find(p => p.id === cwId || p.email === cwId || p.name === cwId);
                        return (
                          <span key={cwId} className="px-2 py-0.5 bg-green-50 dark:bg-green-950/35 text-green-700 dark:text-green-400 text-xs font-bold rounded">
                            {prof ? prof.name : cwId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex pt-2 justify-end">
                <button 
                  onClick={() => setViewingAct(null)}
                  className="px-6 py-2.5 bg-pink-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-pink-700 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl border border-transparent dark:border-gray-800 transition-all flex flex-col">
            <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10">
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2" translate="no">
                {modalTitles[modalType || activeTab] || 'Novo Registro Pedagógico'}
                {isExtracting && (
                  <span className="flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full animate-pulse">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    Salvando...
                  </span>
                )}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-600 transition-colors">
                <X size={20} className="text-gray-900 dark:text-gray-100" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {renderModalContent()}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
