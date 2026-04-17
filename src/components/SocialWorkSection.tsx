import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Heart, FileText, 
  Scale, BookOpen, ClipboardList, Share2,
  Calendar, AlertTriangle, Receipt, Settings,
  Plus, Search, Filter, MoreVertical, ChevronRight,
  CheckCircle2, Clock, Phone, User as UserIcon,
  Trash2, Edit2, Download, Printer, X, Info,
  ArrowLeft, TrendingUp, UserCircle, LogOut,
  Moon, Sun, Smile, Meh, Frown, History,
  Lightbulb, Target, Star, ShieldAlert,
  Home, MapPin, Briefcase, DollarSign,
  FileCheck, FileWarning, FileX, Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { format, isToday, parseISO, startOfToday, isSameDay, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { 
  User as UserType,
  SocialPatient, SocialFamilyTie, SocialDocumentation,
  SocialLegalSituation, SocialStudy, SocialEvolution,
  SocialReferral, SocialFamilyVisit, SocialRiskSituation,
  PIA
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface SocialWorkSectionProps {
  user: UserType;
  patients: SocialPatient[];
  familyTies: SocialFamilyTie[];
  documentations: SocialDocumentation[];
  legalSituations: SocialLegalSituation[];
  socialStudies: SocialStudy[];
  evolutions: SocialEvolution[];
  referrals: SocialReferral[];
  familyVisits: SocialFamilyVisit[];
  riskSituations: SocialRiskSituation[];
  pias: PIA[];
  onSavePatient: (data: Partial<SocialPatient>) => Promise<void>;
  onSaveFamilyTie: (data: Partial<SocialFamilyTie>) => Promise<void>;
  onSaveDocumentation: (data: Partial<SocialDocumentation>) => Promise<void>;
  onSaveLegalSituation: (data: Partial<SocialLegalSituation>) => Promise<void>;
  onSaveSocialStudy: (data: Partial<SocialStudy>) => Promise<void>;
  onSaveEvolution: (data: Partial<SocialEvolution>) => Promise<void>;
  onSaveReferral: (data: Partial<SocialReferral>) => Promise<void>;
  onSaveFamilyVisit: (data: Partial<SocialFamilyVisit>) => Promise<void>;
  onSaveRiskSituation: (data: Partial<SocialRiskSituation>) => Promise<void>;
  onSavePIA: (data: Partial<PIA>) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

type TabType = 
  | 'dashboard' | 'profile' | 'family' | 'docs' 
  | 'legal' | 'study' | 'evolution' | 'referrals' 
  | 'visits' | 'risk' | 'benefits' | 'reports' | 'settings' | 'pia';

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
      active 
        ? "bg-green-600 text-white shadow-lg shadow-green-100 dark:shadow-none" 
        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
    )}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

export const SocialWorkSection: React.FC<SocialWorkSectionProps> = ({
  user,
  patients,
  familyTies,
  documentations,
  legalSituations,
  socialStudies,
  evolutions,
  referrals,
  familyVisits,
  riskSituations,
  pias,
  onSavePatient,
  onSaveFamilyTie,
  onSaveDocumentation,
  onSaveLegalSituation,
  onSaveSocialStudy,
  onSaveEvolution,
  onSaveReferral,
  onSaveFamilyVisit,
  onSaveRiskSituation,
  onSavePIA,
  onSavePhotos,
  theme,
  setTheme,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingData, setEditingData] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<SocialPatient | null>(null);
  const [formData, setFormData] = useState<any>({});

  // Dashboard Stats
  const stats = useMemo(() => {
    const familyTiesList = familyTies || [];
    const documentationsList = documentations || [];
    const referralsList = referrals || [];
    const familyVisitsList = familyVisits || [];
    const patientsList = patients || [];

    const noFamily = familyTiesList.filter(f => !f.hasFamily || f.abandonmentRisk).length;
    const pendingDocs = documentationsList.filter(d => 
      d.rg === 'PENDENTE' || d.cpf === 'PENDENTE' || d.sus === 'PENDENTE' ||
      d.rg === 'INEXISTENTE' || d.cpf === 'INEXISTENTE' || d.sus === 'INEXISTENTE'
    ).length;
    const activeReferrals = referralsList.filter(r => r.status === 'EM_ANDAMENTO').length;
    const upcomingVisits = familyVisitsList.filter(v => parseISO(v.date) >= startOfToday()).length;

    return {
      totalPatients: patientsList.length,
      noFamily,
      pendingDocs,
      activeReferrals,
      upcomingVisits
    };
  }, [patients, familyTies, documentations, referrals, familyVisits]);

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (type: string, initialData: any = {}) => {
    setModalType(type);
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const handleDigitize = (text: string) => {
    const type = modalType || activeTab;
    if (type === 'evolution') {
      setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
    } else if (type === 'docs' || type === 'documentation') {
      setFormData((prev: any) => ({ ...prev, observations: (prev.observations || '') + '\n' + text }));
    } else if (type === 'study') {
      setFormData((prev: any) => ({ ...prev, socialStudy: (prev.socialStudy || '') + '\n' + text }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const type = modalType || activeTab;
      const { photos, ...data } = formData;
      const id = formData.id;
      
      switch (type) {
        case 'patient':
        case 'profile':
          await onSavePatient(data, id);
          break;
        case 'family':
          await onSaveFamilyTie(data, id);
          break;
        case 'docs':
          await onSaveDocumentation(data, id);
          break;
        case 'legal':
          await onSaveLegalSituation(data, id);
          break;
        case 'study':
          await onSaveSocialStudy({ ...data, date: data.date || new Date().toISOString() }, id);
          break;
        case 'evolution':
          await onSaveEvolution({ ...data, date: data.date || new Date().toISOString() }, id);
          break;
        case 'referral':
        case 'referrals':
          await onSaveReferral({ ...data, date: data.date || new Date().toISOString() }, id);
          break;
        case 'visit':
        case 'visits':
          await onSaveFamilyVisit({ ...data, date: data.date || new Date().toISOString() }, id);
          break;
        case 'risk':
          await onSaveRiskSituation({ ...data, date: data.date || new Date().toISOString() }, id);
          break;
        case 'pia':
          await onSavePIA({ ...data, date: data.date || new Date().toISOString(), responsible: data.responsible || user.name }, id);
          break;
      }

      if (photos && photos.length > 0 && formData.patientId) {
        const patient = patients.find(p => p.id === formData.patientId);
        const activityType = 
          type === 'evolution' ? 'Evolução Social' :
          type === 'docs' ? 'Documentação Social' :
          type === 'study' ? 'Estudo Social' : 'Atendimento Social';
        
        await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.description || formData.observations || formData.socialStudy);
      }

      setIsModalOpen(false);
      setModalType('');
      setFormData({});
    } catch (err) {
      console.error(err);
    }
  };

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

  const evolutionChartData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - i);
      return format(d, 'yyyy-MM-dd');
    }).reverse();

    return last7Days.map(date => {
      const count = evolutions.filter(e => e.date.startsWith(date)).length;
      return {
        date,
        count
      };
    });
  }, [evolutions]);

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Total Acompanhado', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Sem Vínculo/Risco', value: stats.noFamily, icon: Heart, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Docs Pendentes', value: stats.pendingDocs, icon: FileWarning, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Encaminhamentos', value: stats.activeReferrals, icon: Share2, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Visitas Agendadas', value: stats.upcomingVisits, icon: Calendar, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.label}</p>
                <p className="text-2xl font-bold mt-1">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Evolução de Atendimentos
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={evolutionChartData}>
                <defs>
                  <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(str) => format(parseISO(str), 'dd/MM')} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEvolution)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-6 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Situações de Risco por Tipo
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Abandono', value: (riskSituations || []).filter(r => r.type === 'ABANDONO').length },
                    { name: 'Negligência', value: (riskSituations || []).filter(r => r.type === 'NEGLIGENCIA').length },
                    { name: 'Violação', value: (riskSituations || []).filter(r => r.type === 'VIOLACAO_DIREITOS').length },
                    { name: 'Outros', value: (riskSituations || []).filter(r => r.type === 'OUTRO').length },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#ef4444" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#3b82f6" />
                  <Cell fill="#10b981" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-blue-600" />
            Encaminhamentos Recentes
          </h3>
          <div className="space-y-4">
            {referrals.slice(-5).map((referral, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white rounded-lg shadow-sm">
                    <Share2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">{referral.destination}</p>
                    <p className="text-sm text-gray-500">{referral.description}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  referral.status === 'CONCLUIDO' ? "bg-green-100 text-green-700" :
                  referral.status === 'EM_ANDAMENTO' ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {referral.status.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <FileWarning className="w-5 h-5 text-orange-600" />
            Alertas Críticos
          </h3>
          <div className="space-y-3">
            {stats.noFamily > 0 && (
              <div className="p-3 bg-red-50 border border-red-100 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-red-900">{stats.noFamily} idosos sem vínculo familiar</p>
                  <p className="text-xs text-red-700">Risco de abandono identificado.</p>
                </div>
              </div>
            )}
            {stats.pendingDocs > 0 && (
              <div className="p-3 bg-orange-50 border border-orange-100 rounded-xl flex items-start gap-3">
                <FileX className="w-5 h-5 text-orange-600 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-orange-900">{stats.pendingDocs} pendências documentais</p>
                  <p className="text-xs text-orange-700">Regularização necessária para benefícios.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderModalContent = () => {
    const type = modalType || activeTab;
    switch (type) {
      case 'patient':
      case 'profile':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data de Nascimento</label>
                <input
                  required
                  type="date"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.birthDate || ''}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Naturalidade</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.naturalness || ''}
                  onChange={(e) => setFormData({ ...formData, naturalness: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado Civil</label>
                <select
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.maritalStatus || ''}
                  onChange={(e) => setFormData({ ...formData, maritalStatus: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="SOLTEIRO">Solteiro(a)</option>
                  <option value="CASADO">Casado(a)</option>
                  <option value="DIVORCIADO">Divorciado(a)</option>
                  <option value="VIUVO">Viúvo(a)</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Escolaridade</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.schooling || ''}
                  onChange={(e) => setFormData({ ...formData, schooling: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Profissão Anterior</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.previousProfession || ''}
                  onChange={(e) => setFormData({ ...formData, previousProfession: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Renda (R$)</label>
                <input
                  required
                  type="number"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.income || ''}
                  onChange={(e) => setFormData({ ...formData, income: parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status do Benefício</label>
                <select
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.benefitStatus || ''}
                  onChange={(e) => setFormData({ ...formData, benefitStatus: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="SUSPENSO">Suspenso</option>
                  <option value="NAO_POSSUI">Não Possui</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Cadastro
            </button>
          </form>
        );
      case 'evolution':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atendimento</label>
              <input
                required
                type="text"
                placeholder="Ex: Atendimento Individual, Contato Familiar..."
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.serviceType || ''}
                onChange={(e) => setFormData({ ...formData, serviceType: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Situação Observada</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observation: (formData.observation || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
                value={formData.observation || ''}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Conduta / Encaminhamentos</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, conduct: (formData.conduct || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
                value={formData.conduct || ''}
                onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Evolução
            </button>
          </form>
        );
      case 'referral':
      case 'referrals':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.destination || ''}
                onChange={(e) => setFormData({ ...formData, destination: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="CRAS">CRAS</option>
                <option value="CREAS">CREAS</option>
                <option value="INSS">INSS</option>
                <option value="DEFENSORIA">Defensoria Pública</option>
                <option value="SAUDE">Saúde</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Descrição da Ação</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.status || ''}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <option value="EM_ANDAMENTO">Em Andamento</option>
                <option value="CONCLUIDO">Concluído</option>
                <option value="NAO_REALIZADO">Não Realizado</option>
              </select>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Encaminhamento
            </button>
          </form>
        );
      case 'visit':
      case 'visits':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Visitante</label>
              <input
                required
                type="text"
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.visitorName || ''}
                onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Parentesco</label>
              <input
                required
                type="text"
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.kinship || ''}
                onChange={(e) => setFormData({ ...formData, kinship: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Observações da Visita</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
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

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Registrar Visita
            </button>
          </form>
        );
      case 'risk':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Risco</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.type || ''}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              >
                <option value="">Selecione</option>
                <option value="ABANDONO">Abandono</option>
                <option value="NEGLIGENCIA">Negligência</option>
                <option value="VIOLACAO_DIREITOS">Violação de Direitos</option>
                <option value="OUTRO">Outro</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Gravidade</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.severity || ''}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
              >
                <option value="BAIXA">Baixa</option>
                <option value="MEDIA">Média</option>
                <option value="ALTA">Alta</option>
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Descrição da Situação</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
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

            <button type="submit" className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">
              Registrar Risco
            </button>
          </form>
        );
      case 'pia':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
                <select
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.elderlyId || ''}
                  onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
                >
                  <option value="">Selecione o idoso</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.status || 'EM_ANDAMENTO'}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                >
                  <option value="EM_ANDAMENTO">Em Andamento</option>
                  <option value="CONCLUIDO">Concluído</option>
                  <option value="REVISAR">Revisar</option>
                </select>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasBPC || false}
                  onChange={(e) => setFormData({ ...formData, hasBPC: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Possui BPC</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasPension || false}
                  onChange={(e) => setFormData({ ...formData, hasPension: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Possui Aposentadoria</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasLoans || false}
                  onChange={(e) => setFormData({ ...formData, hasLoans: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Possui Empréstimos</label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Renda Mensal (R$)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.monthlyIncome || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: parseFloat(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Envolvimento Familiar</label>
                <select
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.familyInvolvement || 'MEDIO'}
                  onChange={(e) => setFormData({ ...formData, familyInvolvement: e.target.value })}
                >
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                  <option value="NENHUM">Nenhum</option>
                </select>
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Objetivos do Plano</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, objectives: (formData.objectives || '') + ' ' + t })} />
                </div>
                <textarea
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg h-24"
                  value={formData.objectives || ''}
                  onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                />
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Ações Propostas</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, actions: (formData.actions || '') + ' ' + t })} />
                </div>
                <textarea
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg h-24"
                  value={formData.actions || ''}
                  onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
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

            <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">
              Salvar PIA
            </button>
          </form>
        );
      case 'family':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
                <select
                  required
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.patientId || ''}
                  onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
                >
                  <option value="">Selecione o idoso</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={formData.hasFamily ?? true}
                  onChange={(e) => setFormData({ ...formData, hasFamily: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Possui Família</label>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={formData.abandonmentRisk || false}
                  onChange={(e) => setFormData({ ...formData, abandonmentRisk: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700 text-red-600">Risco de Abandono</label>
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium text-gray-700">Observações Gerais</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                </div>
                <textarea
                  className="w-full p-2 border border-gray-200 rounded-lg h-24"
                  value={formData.observations || ''}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                />
              </div>
            </div>
            
            <div className="border-t border-gray-100 pt-4">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-bold text-gray-900">Membros da Família</h4>
                <button
                  type="button"
                  onClick={() => {
                    const members = formData.members || [];
                    setFormData({
                      ...formData,
                      members: [...members, { id: Math.random().toString(36).substr(2, 9), name: '', kinship: '', phone: '', visitFrequency: 'MENSAL', relationshipQuality: 'BOA' }]
                    });
                  }}
                  className="text-xs font-bold text-pink-600 hover:text-pink-700 flex items-center gap-1"
                >
                  <Plus size={14} /> Adicionar Membro
                </button>
              </div>
              <div className="space-y-4">
                {(formData.members || []).map((member: any, index: number) => (
                  <div key={member.id} className="p-4 bg-gray-50 rounded-xl space-y-3 relative">
                    <button
                      type="button"
                      onClick={() => {
                        const members = [...formData.members];
                        members.splice(index, 1);
                        setFormData({ ...formData, members });
                      }}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="col-span-2">
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Nome</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          value={member.name}
                          onChange={(e) => {
                            const members = [...formData.members];
                            members[index].name = e.target.value;
                            setFormData({ ...formData, members });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Parentesco</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          value={member.kinship}
                          onChange={(e) => {
                            const members = [...formData.members];
                            members[index].kinship = e.target.value;
                            setFormData({ ...formData, members });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Telefone</label>
                        <input
                          type="text"
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          value={member.phone}
                          onChange={(e) => {
                            const members = [...formData.members];
                            members[index].phone = e.target.value;
                            setFormData({ ...formData, members });
                          }}
                        />
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Freq. Visitas</label>
                        <select
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          value={member.visitFrequency}
                          onChange={(e) => {
                            const members = [...formData.members];
                            members[index].visitFrequency = e.target.value;
                            setFormData({ ...formData, members });
                          }}
                        >
                          <option value="SEMANAL">Semanal</option>
                          <option value="QUINZENAL">Quinzenal</option>
                          <option value="MENSAL">Mensal</option>
                          <option value="RARO">Raro</option>
                          <option value="INEXISTENTE">Inexistente</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase">Qualidade Relac.</label>
                        <select
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          value={member.relationshipQuality}
                          onChange={(e) => {
                            const members = [...formData.members];
                            members[index].relationshipQuality = e.target.value;
                            setFormData({ ...formData, members });
                          }}
                        >
                          <option value="BOA">Boa</option>
                          <option value="REGULAR">Regular</option>
                          <option value="DISTANTE">Distante</option>
                          <option value="ROMPIDA">Rompida</option>
                        </select>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <button type="submit" className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700">
              Salvar Vínculo Familiar
            </button>
          </form>
        );
      case 'docs':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['rg', 'cpf', 'sus', 'birthCertificate', 'addressProof'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-medium text-gray-700 mb-1 uppercase text-xs">
                    {field === 'rg' ? 'RG' : 
                     field === 'cpf' ? 'CPF' : 
                     field === 'sus' ? 'Cartão SUS' : 
                     field === 'birthCertificate' ? 'Certidão' : 'Comprovante Resid.'}
                  </label>
                  <select
                    required
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                    value={formData[field] || 'PENDENTE'}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  >
                    <option value="COMPLETO">Completo</option>
                    <option value="PENDENTE">Pendente</option>
                    <option value="INEXISTENTE">Inexistente</option>
                  </select>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Observações</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
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

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Documentação
            </button>
          </form>
        );
      case 'legal':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status da Situação</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Regular, Em processo de interdição..."
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.situationStatus || ''}
                  onChange={(e) => setFormData({ ...formData, situationStatus: e.target.value })}
                />
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={formData.isInterdicted || false}
                  onChange={(e) => setFormData({ ...formData, isInterdicted: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Interditado</label>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome do Curador</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.curatorName || ''}
                  onChange={(e) => setFormData({ ...formData, curatorName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">CPF do Curador</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.curatorCpf || ''}
                  onChange={(e) => setFormData({ ...formData, curatorCpf: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fone do Curador</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 rounded-lg"
                  value={formData.curatorPhone || ''}
                  onChange={(e) => setFormData({ ...formData, curatorPhone: e.target.value })}
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

            <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">
              Salvar Situação Legal
            </button>
          </form>
        );
      case 'study':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Estudo</label>
              <input
                required
                type="text"
                placeholder="Ex: Estudo de Caso - Admissão"
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.title || ''}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Conteúdo do Estudo Social</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, content: (formData.content || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-200 rounded-lg h-48"
                value={formData.content || ''}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700">
              Salvar Estudo Social
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  const renderDocumentation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Controle de Documentação</h3>
        <button
          onClick={() => openModal('docs')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Atualizar Documentos
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-100">
            <tr>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">Idoso</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">RG</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">CPF</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">SUS</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">Certidão</th>
              <th className="px-6 py-4 text-sm font-bold text-gray-500 uppercase">Residência</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {documentations.map((doc) => {
              const patient = patients.find(p => p.id === doc.patientId);
              const getStatusBadge = (status: string) => (
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                  status === 'COMPLETO' ? "bg-green-100 text-green-700" :
                  status === 'PENDENTE' ? "bg-orange-100 text-orange-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {status}
                </span>
              );

              return (
                <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 font-medium text-gray-900">{patient?.name}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.rg)}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.cpf)}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.sus)}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.birthCertificate)}</td>
                  <td className="px-6 py-4">{getStatusBadge(doc.addressProof)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderFamilyTies = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Vínculo Familiar</h3>
        <button
          onClick={() => openModal('family')}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Vínculo
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {familyTies.map((tie) => {
          const patient = patients.find(p => p.id === tie.patientId);
          return (
            <div key={tie.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-pink-50 flex items-center justify-center">
                    <Heart className="w-6 h-6 text-pink-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{patient?.name}</h4>
                    <p className="text-sm text-gray-500">{tie.hasFamily ? 'Possui Família' : 'Sem Vínculo Familiar'}</p>
                  </div>
                </div>
                {tie.abandonmentRisk && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 rounded-full text-xs font-bold uppercase flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Risco Abandono
                  </span>
                )}
              </div>

              <div className="space-y-4">
                {(tie.members || []).map((member) => (
                  <div key={member.id} className="p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                    <div>
                      <p className="text-sm font-bold text-gray-900">{member.name} ({member.kinship})</p>
                      <p className="text-xs text-gray-500">{member.phone}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-gray-400 uppercase">Visitas</p>
                      <p className="text-xs font-bold text-gray-700">{member.visitFrequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderLegalSituation = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Situação Legal</h3>
        <button
          onClick={() => openModal('legal')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Situação
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {legalSituations.map((legal) => {
          const patient = patients.find(p => p.id === legal.patientId);
          return (
            <div key={legal.id} className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-purple-50 flex items-center justify-center">
                    <Scale className="w-6 h-6 text-purple-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{patient?.name}</h4>
                    <p className="text-sm text-gray-500">Status: {legal.situationStatus}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  legal.isInterdicted ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"
                )}>
                  {legal.isInterdicted ? 'Interditado' : 'Não Interditado'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Curador</p>
                  <p className="font-bold text-gray-700">{legal.curatorName || 'Não possui'}</p>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Processo</p>
                  <p className="font-bold text-gray-700">{legal.processNumber || 'N/A'}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPatients = () => {
    if (selectedPatient) {
      const patientFamily = familyTies.find(f => f.patientId === selectedPatient.id);
      const patientDocs = documentations.find(d => d.patientId === selectedPatient.id);
      const patientLegal = legalSituations.find(l => l.patientId === selectedPatient.id);
      const patientStudy = socialStudies.find(s => s.patientId === selectedPatient.id);
      const patientEvolutions = evolutions.filter(e => e.patientId === selectedPatient.id);

      return (
        <div className="space-y-6">
          <button 
            onClick={() => setSelectedPatient(null)}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Voltar para lista
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm text-center">
                <div className="w-32 h-32 rounded-full bg-blue-50 mx-auto mb-4 border-4 border-white shadow-md overflow-hidden">
                  {selectedPatient.photoUrl ? (
                    <img src={selectedPatient.photoUrl} alt={selectedPatient.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-blue-400 mt-6 mx-auto" />
                  )}
                </div>
                <h3 className="text-xl font-bold text-gray-900">{selectedPatient.name}</h3>
                <p className="text-sm text-gray-500 mb-4">{format(parseISO(selectedPatient.birthDate), 'dd/MM/yyyy')} ({new Date().getFullYear() - new Date(selectedPatient.birthDate).getFullYear()} anos)</p>
                <div className="flex flex-wrap justify-center gap-2">
                  <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase">{selectedPatient.maritalStatus}</span>
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    selectedPatient.benefitStatus === 'ATIVO' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
                  )}>
                    {selectedPatient.benefitStatus}
                  </span>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Informações Básicas
                </h4>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Naturalidade</span>
                    <span className="font-bold text-gray-900">{selectedPatient.naturalness}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Escolaridade</span>
                    <span className="font-bold text-gray-900">{selectedPatient.schooling}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Profissão</span>
                    <span className="font-bold text-gray-900">{selectedPatient.previousProfession}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Renda Mensal</span>
                    <span className="font-bold text-green-600">R$ {selectedPatient.income.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
                <div className="flex border-b border-gray-100">
                  {['Vínculo', 'Documentos', 'Legal', 'Estudo'].map((tab) => (
                    <button key={tab} className="flex-1 py-4 text-sm font-bold text-gray-500 hover:text-blue-600 transition-colors border-b-2 border-transparent hover:border-blue-600">
                      {tab}
                    </button>
                  ))}
                </div>
                <div className="p-6">
                  <div className="space-y-6">
                    <div>
                      <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Heart className="w-5 h-5 text-pink-500" />
                        Situação Familiar
                      </h5>
                      {patientFamily ? (
                        <div className="space-y-3">
                          <p className="text-sm text-gray-600">{patientFamily.observations}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            {patientFamily.members.map(m => (
                              <div key={m.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="font-bold text-gray-900">{m.name} ({m.kinship})</p>
                                <p className="text-xs text-gray-500">{m.phone}</p>
                                <div className="mt-2 flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-gray-400 uppercase">Relação:</span>
                                  <span className="text-[10px] font-bold text-blue-600 uppercase">{m.relationshipQuality}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Nenhum vínculo familiar registrado.</p>
                      )}
                    </div>

                    <div className="pt-6 border-t border-gray-100">
                      <h5 className="font-bold text-gray-900 mb-3 flex items-center gap-2">
                        <Scale className="w-5 h-5 text-purple-500" />
                        Situação Jurídica
                      </h5>
                      {patientLegal ? (
                        <div className="grid grid-cols-2 gap-4">
                          <div className="p-4 bg-purple-50 rounded-xl">
                            <p className="text-[10px] font-bold text-purple-400 uppercase">Curador</p>
                            <p className="font-bold text-purple-900">{patientLegal.curatorName || 'Não possui'}</p>
                          </div>
                          <div className="p-4 bg-purple-50 rounded-xl">
                            <p className="text-[10px] font-bold text-purple-400 uppercase">Interdição</p>
                            <p className="font-bold text-purple-900">{patientLegal.isInterdicted ? 'Sim' : 'Não'}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400 italic">Situação legal não registrada.</p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2 uppercase tracking-tight">
                    <History className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                    Últimas Evoluções
                  </h4>
                  <button onClick={() => openModal('evolution', { patientId: selectedPatient.id })} className="text-sm font-black text-blue-600 dark:text-blue-400 hover:underline">
                    Nova Evolução
                  </button>
                </div>
                <div className="space-y-4">
                  {patientEvolutions.slice(-3).map((evo, i) => (
                    <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest">{evo.serviceType}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">{format(parseISO(evo.date), 'dd/MM/yyyy')}</span>
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{evo.observation}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar idoso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black dark:text-white font-medium"
            />
          </div>
          <button
            onClick={() => openModal('patient')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Cadastro Social
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group"
              onClick={() => setSelectedPatient(patient)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-100 group-hover:border-blue-300 transition-colors">
                      {patient.photoUrl ? (
                        <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{patient.name}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">{format(parseISO(patient.birthDate), 'dd/MM/yyyy')}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                    patient.benefitStatus === 'ATIVO' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                    patient.benefitStatus === 'SUSPENSO' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                    "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                  )}>
                    {patient.benefitStatus.replace('_', ' ')}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>{patient.naturalness}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    <DollarSign className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>R$ {patient.income.toLocaleString()} ({patient.benefits.join(', ')})</span>
                  </div>
                </div>

                <button className="w-full py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-black hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors uppercase tracking-widest">
                  Ver Prontuário Social
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderSocialStudy = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Estudo Social</h3>
        <button
          onClick={() => openModal('study')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Estudo
        </button>
      </div>

      <div className="space-y-6">
        {socialStudies.map((study) => {
          const patient = patients.find(p => p.id === study.patientId);
          return (
            <div key={study.id} className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight">{patient?.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Realizado em {format(parseISO(study.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors">
                  <Download className="w-5 h-5 text-gray-400" />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Histórico de Vida</h5>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{study.lifeHistory}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Condições Sociais</h5>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{study.socialConditions}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div>
                    <h5 className="text-xs font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Motivo da Institucionalização</h5>
                    <p className="text-gray-700 dark:text-gray-300 leading-relaxed font-medium">{study.institutionalizationReason}</p>
                  </div>
                  <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800">
                    <h5 className="text-xs font-black text-blue-800 dark:text-blue-300 uppercase mb-2 tracking-widest">Parecer Técnico</h5>
                    <p className="text-blue-900 dark:text-blue-200 font-bold italic">"{study.technicalOpinion}"</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderEvolution = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Evolução Social</h3>
        <button
          onClick={() => openModal('evolution')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Evolução
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100">
          {evolutions.map((evolution) => {
            const patient = patients.find(p => p.id === evolution.patientId);
            return (
              <div key={evolution.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                      <ClipboardList className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{patient?.name}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{format(parseISO(evolution.date), "dd 'de' MMMM 'às' HH:mm", { locale: ptBR })}</p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold uppercase">
                    {evolution.serviceType}
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 ml-13">
                  <div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Observação</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{evolution.observation}</p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">Conduta</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">{evolution.conduct}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );

  const renderReferrals = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Encaminhamentos</h3>
        <button
          onClick={() => openModal('referrals')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo Encaminhamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {referrals.map((referral) => {
          const patient = patients.find(p => p.id === referral.patientId);
          return (
            <div key={referral.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-4">
                <div className={cn(
                  "p-3 rounded-xl",
                  referral.status === 'CONCLUIDO' ? "bg-green-50 dark:bg-green-900/20" :
                  referral.status === 'EM_ANDAMENTO' ? "bg-blue-50 dark:bg-blue-900/20" : "bg-red-50 dark:bg-red-900/20"
                )}>
                  <Share2 className={cn(
                    "w-6 h-6",
                    referral.status === 'CONCLUIDO' ? "text-green-600 dark:text-green-400" :
                    referral.status === 'EM_ANDAMENTO' ? "text-blue-600 dark:text-blue-400" : "text-red-600 dark:text-red-400"
                  )} />
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                  referral.status === 'CONCLUIDO' ? "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" :
                  referral.status === 'EM_ANDAMENTO' ? "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300"
                )}>
                  {referral.status.replace('_', ' ')}
                </span>
              </div>
              
              <h4 className="font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-tight">{referral.destination}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-medium">{patient?.name}</p>
              
              <div className="flex-1 bg-gray-50 dark:bg-gray-800 p-4 rounded-xl mb-4 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 font-medium">{referral.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500">
                <span className="font-bold">{format(parseISO(referral.date), 'dd/MM/yyyy')}</span>
                <button className="text-blue-600 dark:text-blue-400 font-black hover:underline">Ver Detalhes</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderVisits = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900">Controle de Visitas</h3>
        <button
          onClick={() => openModal('visits')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Registrar Visita
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 overflow-hidden shadow-sm">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
            <tr>
              <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Data</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Idoso</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Visitante</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Parentesco</th>
              <th className="px-6 py-4 text-xs font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Observações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {familyVisits.map((visit) => {
              const patient = patients.find(p => p.id === visit.patientId);
              return (
                <tr key={visit.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">{format(parseISO(visit.date), 'dd/MM/yyyy')}</td>
                  <td className="px-6 py-4 font-black text-gray-900 dark:text-white uppercase tracking-tight">{patient?.name}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-bold">{visit.visitorName}</td>
                  <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300">{visit.kinship}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">{visit.observations}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderRiskSituations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Situações de Risco</h3>
        <button
          onClick={() => openModal('risk')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Registrar Risco
        </button>
      </div>

      <div className="space-y-4">
        {riskSituations.map((risk) => {
          const patient = patients.find(p => p.id === risk.patientId);
          return (
            <div key={risk.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-l-4 border-l-red-500 shadow-sm border border-gray-100 dark:border-gray-800">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900">{patient?.name}</h4>
                    <p className="text-sm font-bold text-red-600 uppercase tracking-wider">{risk.type}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    risk.severity === 'ALTA' ? "bg-red-100 text-red-700" :
                    risk.severity === 'MEDIA' ? "bg-orange-100 text-orange-700" :
                    "bg-blue-100 text-blue-700"
                  )}>
                    Gravidade {risk.severity}
                  </span>
                  <span className="text-xs text-gray-400">{format(parseISO(risk.date), 'dd/MM/yyyy')}</span>
                </div>
              </div>
              <p className="text-gray-700 bg-gray-50 p-4 rounded-xl border border-gray-100">{risk.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-xs font-medium text-gray-500">Status: <span className="font-bold text-gray-700">{risk.status.replace('_', ' ')}</span></span>
                <button className="text-blue-600 text-sm font-bold hover:underline">Atualizar Acompanhamento</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderPIA = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Plano Individual de Atendimento (PIA)</h3>
        <button
          onClick={() => openModal('pia')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Novo PIA
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {pias.map((pia) => {
          const patient = patients.find(p => p.id === pia.elderlyId);
          return (
            <div key={pia.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 text-lg">{patient?.name}</h4>
                    <p className="text-sm text-gray-500">Data: {format(parseISO(pia.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-xs font-bold uppercase",
                    pia.status === 'CONCLUIDO' ? "bg-green-100 text-green-700" :
                    pia.status === 'EM_ANDAMENTO' ? "bg-blue-100 text-blue-700" :
                    "bg-orange-100 text-orange-700"
                  )}>
                    {pia.status.replace('_', ' ')}
                  </span>
                  <button 
                    onClick={() => openModal('pia', pia)}
                    className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Situação Financeira</p>
                  <div className="space-y-1">
                    <p className="text-sm flex items-center justify-between">
                      <span>BPC:</span>
                      <span className="font-bold">{pia.hasBPC ? 'Sim' : 'Não'}</span>
                    </p>
                    <p className="text-sm flex items-center justify-between">
                      <span>Aposentadoria:</span>
                      <span className="font-bold">{pia.hasPension ? 'Sim' : 'Não'}</span>
                    </p>
                    <p className="text-sm flex items-center justify-between">
                      <span>Renda:</span>
                      <span className="font-bold">R$ {pia.monthlyIncome.toLocaleString()}</span>
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Vínculo Familiar</p>
                  <div className="space-y-1">
                    <p className="text-sm flex items-center justify-between">
                      <span>Envolvimento:</span>
                      <span className="font-bold">{pia.familyInvolvement}</span>
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 rounded-xl">
                  <p className="text-xs font-bold text-gray-400 uppercase mb-2">Responsável</p>
                  <p className="text-sm font-bold text-gray-700">{pia.responsible}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h5 className="text-sm font-bold text-gray-900 mb-1">Objetivos</h5>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{pia.objectives}</p>
                </div>
                <div>
                  <h5 className="text-sm font-bold text-gray-900 mb-1">Ações</h5>
                  <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{pia.actions}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderBenefits = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Benefícios Sociais</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {patients.map((patient) => (
          <div key={patient.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full bg-green-50 flex items-center justify-center">
                <Receipt className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h4 className="font-bold text-gray-900">{patient.name}</h4>
                <p className="text-xs text-gray-500">Renda: R$ {patient.income.toLocaleString()}</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                <span className="text-sm text-gray-600">Status Geral</span>
                <span className={cn(
                  "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                  patient.benefitStatus === 'ATIVO' ? "bg-green-100 text-green-700" :
                  patient.benefitStatus === 'SUSPENSO' ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  {patient.benefitStatus.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {patient.benefits.map((benefit, i) => (
                  <span key={i} className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold uppercase">
                    {benefit}
                  </span>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => {
    const handleGeneratePDF = (title: string) => {
      if ((patients || []).length === 0) return;

      const data = (patients || []).map(p => {
        const patientEvolutions = evolutions.filter(e => e.patientId === p.id);
        const patientReferrals = referrals.filter(r => r.patientId === p.id);
        return [
          p.name,
          p.age,
          patientEvolutions.length,
          patientReferrals.length,
          p.status
        ];
      });

      generateModernPDF({
        title,
        subtitle: `Relatório de Assistência Social - ${format(new Date(), "dd/MM/yyyy")}`,
        columns: ['Paciente', 'Idade', 'Evoluções', 'Encaminhamentos', 'Status'],
        data,
        fileName: title.toLowerCase().replace(/\s/g, '_')
      });
    };

    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Gerar Relatórios</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[
            { title: 'Relatório Social Individual', desc: 'Perfil completo, histórico e evolução do idoso.', icon: FileText, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
            { title: 'Estudo Social Técnico', desc: 'Análise aprofundada para fins judiciais ou de rede.', icon: BookOpen, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
            { title: 'Relatório para Ministério Público', desc: 'Documento padronizado para órgãos de fiscalização.', icon: Scale, color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
            { title: 'Relatório de Vínculo Familiar', desc: 'Histórico de visitas e contatos com a família.', icon: Heart, color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
          ].map((report, i) => (
            <div 
              key={i} 
              onClick={() => handleGeneratePDF(report.title)}
              className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer group"
            >
              <div className="flex items-start gap-4">
                <div className={cn("p-4 rounded-2xl transition-colors", report.color)}>
                  <report.icon className="w-8 h-8" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight">{report.title}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium">{report.desc}</p>
                  <button className="mt-4 flex items-center gap-2 text-sm font-black text-blue-600 dark:text-blue-400">
                    <Download className="w-4 h-4" />
                    Gerar PDF
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="w-full lg:w-64 space-y-2 max-h-[calc(100vh-100px)] overflow-y-auto no-scrollbar scroll-smooth">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'profile', label: 'Perfil do Idoso', icon: Users },
          { id: 'pia', label: 'PIA', icon: ClipboardList },
          { id: 'family', label: 'Vínculo Familiar', icon: Heart },
          { id: 'docs', label: 'Documentação', icon: FileText },
          { id: 'legal', label: 'Situação Legal', icon: Scale },
          { id: 'study', label: 'Estudo Social', icon: BookOpen },
          { id: 'evolution', label: 'Evolução', icon: ClipboardList },
          { id: 'referrals', label: 'Encaminhamentos', icon: Share2 },
          { id: 'visits', label: 'Visitas', icon: Calendar },
          { id: 'risk', label: 'Situações de Risco', icon: ShieldAlert },
          { id: 'benefits', label: 'Benefícios', icon: Receipt },
          { id: 'reports', label: 'Relatórios', icon: FileCheck },
          { id: 'settings', label: 'Configurações', icon: Settings },
        ].map((tab) => (
          <NavButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
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
            {activeTab === 'profile' && renderPatients()}
            {activeTab === 'pia' && renderPIA()}
            {activeTab === 'family' && renderFamilyTies()}
            {activeTab === 'docs' && renderDocumentation()}
            {activeTab === 'legal' && renderLegalSituation()}
            {activeTab === 'study' && renderSocialStudy()}
            {activeTab === 'evolution' && renderEvolution()}
            {activeTab === 'referrals' && renderReferrals()}
            {activeTab === 'visits' && renderVisits()}
            {activeTab === 'risk' && renderRiskSituations()}
            {activeTab === 'benefits' && renderBenefits()}
            {activeTab === 'reports' && renderReports()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden border dark:border-gray-800"
            >
              <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-gray-50 dark:bg-gray-800/50">
                <h3 className="text-lg font-bold text-gray-900 uppercase tracking-wider">
                  {modalType || activeTab}
                </h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
                  <X className="w-5 h-5" />
                </button>
              </div>
              {renderModalContent()}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
