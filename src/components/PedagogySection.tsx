import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Brain, ClipboardList, 
  Palette, Music, Gamepad2, BookOpen, Users2,
  AlertCircle, FileText, Settings, Plus, Search, 
  Filter, MoreVertical, ChevronRight, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, 
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
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { extractFormData, fixGrammar } from '../services/geminiService';
import { 
  PedagogyPatient, PedagogyInitialAssessment, PedagogyEvolution, 
  PedagogyActivity, PedagogyStimulationTracking, PedagogySocialParticipation, 
  PedagogyIndividualPlan, PedagogyLifeHistory,
  User as UserType 
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

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
}

type TabType = 'dashboard' | 'residents' | 'activities' | 'monitoring' | 'reports' | 'settings';

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

export const PedagogySection: React.FC<PedagogySectionProps> = ({
  user,
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
  onLogout
}) => {
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
  const [formData, setFormData] = useState<any>({});
  const [editingData, setEditingData] = useState<any>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: string } | null>(null);
  const [isExtracting, setIsExtracting] = useState(false);

  useEffect(() => {
    localStorage.setItem('oami-pedagogy-tab', activeTab);
  }, [activeTab]);

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
    if (!initialData) {
      const now = new Date();
      setFormData({
        date: format(now, 'yyyy-MM-dd'),
        time: format(now, 'HH:mm'),
        participants: []
      });
    } else {
      setFormData(initialData || {});
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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
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
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                  value={formData.age === undefined || isNaN(formData.age) ? '' : formData.age}
                  onChange={(e) => setFormData({ ...formData, age: e.target.value === '' ? 0 : parseInt(e.target.value) })}
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
            <div>
              <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Idoso</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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
            <div>
              <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Idoso</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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
            <div>
              <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Idoso</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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
            <div>
              <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Idoso</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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
            <div>
              <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Idoso</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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
            <div className="space-y-6">
              <label className="block text-sm font-black text-gray-900 dark:text-white mb-1">Idoso</label>
              <select
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
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
                    <img src={selectedPatient.photoUrl} alt={selectedPatient.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black">{selectedPatient?.name || 'N/A'}</h2>
                  <p className="text-blue-50 font-bold mt-1">
                    {selectedPatient?.age ? `${selectedPatient.age} anos` : 'Idade não informada'} • {selectedPatient?.schooling || 'Escolaridade não informada'}
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
                <div className="flex gap-2">
                  <button 
                    onClick={() => openModal('evolution', { activityTitle: activity.title })}
                    className="flex-1 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-purple-100 dark:border-purple-800"
                  >
                    Registrar Participação
                  </button>
                  <button 
                    onClick={() => openModal('activity', activity)}
                    className="p-2 text-pink-600 hover:bg-pink-50 rounded-lg border border-pink-100"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ id: activity.id, type: 'activity' })}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg border border-red-100"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Evoluções Recentes</h4>
        <div className="space-y-3">
          {(evolutions || []).slice().sort((a, b) => {
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
                      <p className="text-sm font-black text-gray-900 dark:text-white">{patient?.name}</p>
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
                    onClick={() => openModal('evolution', evolution)}
                    className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ id: evolution.id, type: 'evolution' })}
                    className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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
        <h3 className="text-xl font-black text-gray-900 dark:text-white" translate="no">Acompanhamento de Progresso</h3>
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
            <h5 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Últimas Estimulações</h5>
            <div className="space-y-3">
              {(stimulationTrackings || []).slice().sort((a, b) => {
                const dateDiff = b.date.localeCompare(a.date);
                if (dateDiff !== 0) return dateDiff;
                return (b.time || '').localeCompare(a.time || '');
              }).slice(0, 5).map((stim) => {
                const patient = (patients || []).find(p => p.id === stim.patientId);
                return (
                  <div key={stim.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-gray-900">{patient?.name}</p>
                      <p className="text-xs text-gray-500">{safeDateFormat(stim.date)}{stim.time ? ` às ${stim.time}` : ''}</p>
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
            <h5 className="text-sm font-black text-gray-400 dark:text-gray-500 uppercase tracking-wider">Últimas Participações</h5>
            <div className="space-y-3">
              {(socialParticipations || []).slice().sort((a, b) => {
                const dateDiff = b.date.localeCompare(a.date);
                if (dateDiff !== 0) return dateDiff;
                return (b.time || '').localeCompare(a.time || '');
              }).slice(0, 5).map((soc) => {
                const patient = (patients || []).find(p => p.id === soc.patientId);
                return (
                  <div key={soc.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-between">
                    <div>
                      <p className="text-sm font-black text-gray-900">{patient?.name}</p>
                      <p className="text-xs text-gray-500">{safeDateFormat(soc.date)}{soc.time ? ` às ${soc.time}` : ''}</p>
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

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar snap-x scroll-smooth sticky top-0 bg-gray-50 dark:bg-gray-950 z-10 lg:static lg:bg-transparent">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'residents', label: 'Residentes', icon: Users },
          { id: 'activities', label: 'Oficinas & Atividades', icon: Palette },
          { id: 'monitoring', label: 'Monitoramento', icon: TrendingUp },
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
                    {(filteredPatients || []).map((patient) => (
                      <motion.div
                        key={patient.id}
                        layout
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                        onClick={() => setSelectedPatient(patient)}
                      >
                        <div className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-100">
                                {patient.photoUrl ? (
                                  <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
                                ) : (
                                  <UserIcon className="w-8 h-8 text-blue-400" />
                                )}
                              </div>
                              <div>
                                <h4 className="font-black text-gray-900 dark:text-white">{patient.name}</h4>
                                <p className="text-sm text-gray-900 dark:text-gray-300 font-black">{patient.age} anos • {patient.schooling}</p>
                              </div>
                            </div>
                            <div className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                              patient.cognitiveLevel === 'ALTO' ? "bg-green-50 text-green-700 border-green-100" :
                              patient.cognitiveLevel === 'MEDIO' ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                              "bg-red-50 text-red-700 border-red-100"
                            )}>
                              {patient.cognitiveLevel}
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
                    ))}
                  </div>
                </div>
              )
            )}
            {activeTab === 'activities' && renderActivitiesTab()}
            {activeTab === 'monitoring' && renderMonitoring()}
            {activeTab === 'reports' && (
              <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Módulo de Relatórios</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Gere relatórios pedagógicos completos, acompanhamento de evolução cognitiva e participação social em PDF.
                </p>
                <div className="flex gap-4 mt-6">
                  <button 
                    onClick={async () => {
                      if ((patients || []).length === 0) return;
                      const data = (patients || []).map(p => {
                        const patientEvolutions = (evolutions || []).filter(e => e.patientId === p.id);
                        return [p.name, p.age, patientEvolutions.length, p.status];
                      });
                      await generateModernPDF({
                        title: 'Relatório Pedagógico Geral',
                        subtitle: `Acompanhamento Pedagógico - ${format(new Date(), "dd/MM/yyyy")}`,
                        columns: ['Residente', 'Idade', 'Evoluções', 'Status'],
                        data,
                        fileName: 'relatorio_pedagogico_geral'
                      });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-100"
                  >
                    <Download className="w-5 h-5" />
                    GERAR PDF
                  </button>
                  <button 
                    onClick={async () => {
                      if ((patients || []).length === 0) return;
                      const data = (patients || []).map(p => {
                        const patientEvolutions = (evolutions || []).filter(e => e.patientId === p.id);
                        return [p.name, p.age, patientEvolutions.length, p.status];
                      });
                      await generateModernWord({
                        title: 'Relatório Pedagógico Geral',
                        subtitle: `Acompanhamento Pedagógico - ${format(new Date(), "dd/MM/yyyy")}`,
                        columns: ['Residente', 'Idade', 'Evoluções', 'Status'],
                        data,
                        fileName: 'relatorio_pedagogico_geral'
                      });
                    }}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold shadow-lg shadow-green-100"
                  >
                    <FileText className="w-5 h-5" />
                    GERAR WORD
                  </button>
                </div>
              </div>
            )}
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
