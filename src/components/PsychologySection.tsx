import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Brain, ClipboardList, 
  MessageSquare, Heart, Users2, Puzzle, Activity, 
  AlertCircle, FileText, Settings, Plus, Search, 
  Filter, MoreVertical, ChevronRight, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, 
  Download, Printer, X, Info, ArrowLeft,
  TrendingUp, UserCircle, LogOut, Moon, Sun,
  Smile, Meh, Frown, History, Lightbulb, Loader2, Zap,
  Calendar
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PsychPatient, PsychInitialAssessment, PsychEvolution, 
  PsychAppointment, PsychEmotionalMonitoring, PsychFamilyBond, 
  PsychActivity, PsychCognitionAssessment, PsychInterventionPlan,
  User as UserType, Elderly 
} from '../types';
import { format, parseISO } from 'date-fns';
import { cn, safeReplace } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { extractFormData, fixGrammar } from '../services/geminiService';
import { ROLE_LABELS } from '../constants';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface PsychologySectionProps {
  user: UserType;
  elderly: Elderly[];
  patients: PsychPatient[];
  initialAssessments: PsychInitialAssessment[];
  evolutions: PsychEvolution[];
  appointments: PsychAppointment[];
  emotionalMonitorings: PsychEmotionalMonitoring[];
  familyBonds: PsychFamilyBond[];
  activities: PsychActivity[];
  cognitionAssessments: PsychCognitionAssessment[];
  interventionPlans: PsychInterventionPlan[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onSavePatient: (data: Omit<PsychPatient, 'id'>, id?: string) => Promise<void>;
  onSaveInitialAssessment: (data: Omit<PsychInitialAssessment, 'id'>, id?: string) => Promise<void>;
  onSaveEvolution: (data: Omit<PsychEvolution, 'id'>, id?: string) => Promise<void>;
  onSaveAppointment: (data: Omit<PsychAppointment, 'id'>, id?: string) => Promise<void>;
  onSaveEmotionalMonitoring: (data: Omit<PsychEmotionalMonitoring, 'id'>, id?: string) => Promise<void>;
  onSaveFamilyBond: (data: Omit<PsychFamilyBond, 'id'>, id?: string) => Promise<void>;
  onSaveActivity: (data: Omit<PsychActivity, 'id'>, id?: string) => Promise<void>;
  onSaveCognitionAssessment: (data: Omit<PsychCognitionAssessment, 'id'>, id?: string) => Promise<void>;
  onSaveInterventionPlan: (data: Omit<PsychInterventionPlan, 'id'>, id?: string) => Promise<void>;
  onDeleteRecord: (collectionName: string, id: string) => Promise<void>;
  onDeletePatient: (id: string) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  onUpdateProfile: (data: Partial<UserType>) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
  professionals?: any[];
  sendNotification?: any;
}

type PsychTab = 
  | 'dashboard' | 'patients' | 'initial' 
  | 'evolution' | 'appointments' | 'emotions' 
  | 'family' | 'activities' | 'cognition' 
  | 'alerts' | 'reports' | 'settings';

export const PsychologySection = (props: PsychologySectionProps) => {
  const { 
    elderly, patients, initialAssessments, evolutions, appointments, 
    emotionalMonitorings, familyBonds, activities, cognitionAssessments,
    interventionPlans, theme, setTheme, onLogout, showToast,
    onSavePatient, onSaveInitialAssessment, onSaveEvolution, onSaveAppointment,
    onSaveEmotionalMonitoring, onSaveFamilyBond, onSaveActivity,
    onSaveCognitionAssessment, onSaveInterventionPlan, onDeleteRecord,
    onDeletePatient, onSavePhotos, user, onUpdateProfile,
    professionals = []
  } = props;
  const [activeTab, setActiveTab] = useState<PsychTab>(() => {
    const saved = localStorage.getItem('oami-psychology-tab');
    return (saved as PsychTab) || 'dashboard';
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);
  const [modalType, setModalType] = useState<'patient' | 'initial' | 'evolution' | 'appointment' | 'emotion' | 'family' | 'activity' | 'cognition' | 'plan' | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [evolutionPatientFilter, setEvolutionPatientFilter] = useState('');
  const [initialPatientFilter, setInitialPatientFilter] = useState('');
  const [appointmentPatientFilter, setAppointmentPatientFilter] = useState('');
  const [emotionPatientFilter, setEmotionPatientFilter] = useState('');
  const [familyPatientFilter, setFamilyPatientFilter] = useState('');
  const [activityPatientFilter, setActivityPatientFilter] = useState('');
  const [cognitionPatientFilter, setCognitionPatientFilter] = useState('');
  const [reportsPatientFilter, setReportsPatientFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'patient' | 'initial' | 'evolution' | 'appointment' | 'emotion' | 'family' | 'activity' | 'cognition' | 'plan' } | null>(null);

  useEffect(() => {
    localStorage.setItem('oami-psychology-tab', activeTab);
  }, [activeTab]);

  const filteredPatients = useMemo(() => {
    return (patients || []).filter(p => {
      const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
      const name = linked?.name || p.name || '';
      return name.toLowerCase().includes(searchQuery.toLowerCase());
    });
  }, [patients, elderly, searchQuery]);

  const selectedPatient = useMemo(() => 
    (patients || []).find(p => p.id === selectedPatientId), 
    [patients, selectedPatientId]
  );

  const renderReports = () => {
    const downloadReport = async (title: string, formatType: 'pdf' | 'word') => {
      if ((patients || []).length === 0) return;

      let filteredPatients = (patients || []);
      if (reportsPatientFilter) {
        filteredPatients = filteredPatients.filter(p => p.id === reportsPatientFilter);
      }

      const data = filteredPatients.map((p: any) => {
        const patientEvolutions = (evolutions || []).filter((e: any) => e.patientId === p.id);
        const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
        return [
          linked?.name || p.name,
          linked ? (new Date().getFullYear() - new Date(linked.birthDate).getFullYear()) : p.age,
          patientEvolutions.length,
          patientEvolutions[0]?.intervention || 'Sem intervenção recente'
        ];
      });

      if (formatType === 'pdf') {
        await generateModernPDF({
          title,
          subtitle: `Relatório de Psicologia - ${format(new Date(), "dd/MM/yyyy")}${reportsPatientFilter ? ` - Paciente: ${patients.find(p => p.id === reportsPatientFilter)?.name}` : ''}`,
          columns: ['Paciente', 'Idade', 'Total Evoluções', 'Última Intervenção'],
          data,
          fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
        });
      } else {
        await generateModernWord({
          title,
          subtitle: `Relatório de Psicologia - ${format(new Date(), "dd/MM/yyyy")}${reportsPatientFilter ? ` - Paciente: ${patients.find(p => p.id === reportsPatientFilter)?.name}` : ''}`,
          columns: ['Paciente', 'Idade', 'Total Evoluções', 'Última Intervenção'],
          data,
          fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
        });
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Relatórios de Psicologia</h2>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <Filter size={16} className="text-gray-400 ml-2" />
            <select 
              value={reportsPatientFilter}
              onChange={(e) => setReportsPatientFilter(e.target.value)}
              className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-400 min-w-[200px]"
            >
              <option value="">Todos os Idosos (Geral)</option>
              {patients.map(p => {
                const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                return (
                  <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
                );
              })}
              <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard 
            title="Relatório Psicológico" 
            description="Gere um relatório detalhado do estado emocional do idoso." 
            icon={<FileText className="text-blue-600" />} 
            onDownloadPDF={() => downloadReport('Relatório Psicológico Geral', 'pdf')}
            onDownloadWord={() => downloadReport('Relatório Psicológico Geral', 'word')}
          />
          <ReportCard 
            title="Evolução Semestral" 
            description="Resumo das evoluções e intervenções dos últimos 6 meses." 
            icon={<TrendingUp className="text-green-600" />} 
            onDownloadPDF={() => downloadReport('Evolução Semestral', 'pdf')}
            onDownloadWord={() => downloadReport('Evolução Semestral', 'word')}
          />
          <ReportCard 
            title="Parecer Técnico" 
            description="Documento oficial para fins jurídicos ou familiares." 
            icon={<ClipboardList className="text-purple-600" />} 
            onDownloadPDF={() => downloadReport('Parecer Técnico', 'pdf')}
            onDownloadWord={() => downloadReport('Parecer Técnico', 'word')}
          />
        </div>
      </div>
    );
  };

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAppointments = (appointments || []).filter(a => a.date === today);
    const sadPatients = (emotionalMonitorings || []).filter(m => m.date === today && m.wellBeing === 'TRISTE').length;
    const isolatedPatients = (familyBonds || []).filter(f => !f.receivesVisits).length;

    return {
      totalPatients: (patients || []).length,
      todayAppointments: todayAppointments.length,
      sadPatients,
      isolatedPatients
    };
  }, [patients, appointments, emotionalMonitorings, familyBonds]);

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

  const renderDashboard = () => (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          icon={<Users className="text-blue-600" />} 
          label="Idosos Acompanhados" 
          value={stats.totalPatients.toString()} 
          color="blue"
        />
        <StatCard 
          icon={<Calendar className="text-green-600" />} 
          label="Atendimentos Hoje" 
          value={stats.todayAppointments.toString()} 
          color="green"
        />
        <StatCard 
          icon={<AlertCircle className="text-amber-600" />} 
          label="Idosos Isolados" 
          value={stats.isolatedPatients.toString()} 
          color="amber"
          alert={stats.isolatedPatients > 0}
        />
        <StatCard 
          icon={<Frown className="text-red-600" />} 
          label="Sinais de Tristeza" 
          value={stats.sadPatients.toString()} 
          color="red"
          alert={stats.sadPatients > 0}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="text-blue-600" size={20} />
              Monitoramento de Bem-estar
            </h3>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={(emotionalMonitorings || []).slice(-7).map(m => ({
                  date: m.date,
                  score: m.wellBeing === 'FELIZ' ? 3 : m.wellBeing === 'NEUTRO' ? 2 : 1
                }))}>
                  <defs>
                    <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={[0, 4]} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="score" stroke="#3b82f6" fillOpacity={1} fill="url(#colorScore)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="text-amber-600" size={20} />
              Próximos Atendimentos
            </h3>
            <div className="space-y-3">
              {(appointments || [])
                .filter(a => a.status === 'PENDENTE')
                .slice(0, 5)
                .map(app => {
                  const patient = (patients || []).find(p => p.id === app.patientId);
                  const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                  const displayName = linked?.name || patient?.name;
                  return (
                    <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
                          <MessageSquare size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{displayName}</p>
                          <p className="text-xs text-gray-500">{app.type} • {app.time}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-colors">
                        Iniciar
                      </button>
                    </div>
                  );
                })}
              {(appointments || []).filter(a => a.status === 'PENDENTE').length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm italic">Nenhum atendimento pendente.</p>
              )}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              Alertas Importantes
            </h3>
            <div className="space-y-4">
              {stats.sadPatients > 0 && (
                <div className="flex gap-3 p-3 bg-red-50 dark:bg-red-900/20 rounded-2xl border border-red-100 dark:border-red-900/30">
                  <Frown className="text-red-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-red-900 dark:text-red-200">Tristeza Persistente</p>
                    <p className="text-xs text-red-700 dark:text-red-300">{stats.sadPatients} idosos apresentaram sinais de tristeza hoje.</p>
                  </div>
                </div>
              )}
              {stats.isolatedPatients > 0 && (
                <div className="flex gap-3 p-3 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-900/30">
                  <AlertCircle className="text-amber-600 shrink-0" size={20} />
                  <div>
                    <p className="text-sm font-bold text-amber-900 dark:text-amber-200">Isolamento Social</p>
                    <p className="text-xs text-amber-700 dark:text-amber-300">{stats.isolatedPatients} idosos não recebem visitas frequentes.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="bg-blue-600 rounded-3xl p-6 text-white shadow-lg shadow-blue-200 dark:shadow-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Brain size={20} />
              </div>
              <h3 className="font-bold">Saúde Cognitiva</h3>
            </div>
            <p className="text-sm opacity-90 mb-4">Lembre-se de realizar as oficinas de memória semanais para estimular a cognição.</p>
            <button className="w-full py-2 bg-white text-blue-600 rounded-xl text-sm font-bold hover:bg-blue-50 transition-colors">
              Ver Atividades
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 md:mx-0 md:px-0 snap-x scroll-smooth sticky top-0 bg-gray-50 dark:bg-gray-950 z-10 lg:static lg:bg-transparent custom-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'patients', label: 'Idosos', icon: Users },
          { id: 'initial', label: 'Avaliação Inicial', icon: Brain },
          { id: 'evolution', label: 'Evolução', icon: ClipboardList },
          { id: 'appointments', label: 'Atendimentos', icon: MessageSquare },
          { id: 'emotions', label: 'Emoções', icon: Heart },
          { id: 'family', label: 'Família', icon: Users2 },
          { id: 'activities', label: 'Atividades', icon: Puzzle },
          { id: 'cognition', label: 'Cognição', icon: Activity },
          { id: 'alerts', label: 'Alertas', icon: AlertCircle },
          { id: 'reports', label: 'Relatórios', icon: FileText },
          { id: 'settings', label: 'Configurações', icon: Settings },
        ].map((tab) => (
          <NavButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id as PsychTab);
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
            {activeTab === 'patients' && (
              selectedPatientId ? (
                <PatientDetailView 
                  patient={selectedPatient}
                  elderly={elderly}
                  evolutions={evolutions}
                  monitorings={emotionalMonitorings}
                  bonds={familyBonds}
                  activities={activities}
                  assessments={initialAssessments}
                  appointments={appointments}
                  onBack={() => setSelectedPatientId(null)}
                  onEdit={(p: any) => { setEditingData(p); setModalType('patient'); setIsModalOpen(true); }}
                  onDelete={(id: string) => setDeleteConfirm({ id, type: 'patient' })}
                />
              ) : selectedPatientId && !selectedPatient ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                  <UserIcon className="w-16 h-16 text-gray-200 mb-4" />
                  <p className="text-gray-500 font-bold">Idoso não encontrado ou sem vínculo.</p>
                  <button onClick={() => setSelectedPatientId(null)} className="mt-4 text-blue-600 font-black hover:underline">Voltar para lista</button>
                </div>
              ) : (
                <PatientsView 
                  patients={filteredPatients}
                  elderly={elderly}
                  searchQuery={searchQuery}
                  setSearchQuery={setSearchQuery}
                  onSelect={setSelectedPatientId}
                  onAdd={() => { setModalType('patient'); setIsModalOpen(true); }}
                  onEdit={(p: any) => { setEditingData(p); setModalType('patient'); setIsModalOpen(true); }}
                  onDelete={(id: string) => setDeleteConfirm({ id, type: 'patient' })}
                />
              )
            )}
            {activeTab === 'initial' && (
              <InitialAssessmentView 
                patients={patients}
                elderly={elderly}
                assessments={initialAssessments}
                filter={initialPatientFilter}
                setFilter={setInitialPatientFilter}
                onAdd={() => { setModalType('initial'); setIsModalOpen(true); }}
                onEdit={(a: any) => { setEditingData(a); setModalType('initial'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'initial' })}
              />
            )}
            {activeTab === 'evolution' && (
              <EvolutionView 
                patients={patients}
                elderly={elderly}
                evolutions={evolutions}
                filter={evolutionPatientFilter}
                setFilter={setEvolutionPatientFilter}
                onAdd={() => { setModalType('evolution'); setIsModalOpen(true); }}
                onEdit={(e: any) => { setEditingData(e); setModalType('evolution'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'evolution' })}
              />
            )}
            {activeTab === 'appointments' && (
              <AppointmentsView 
                patients={patients}
                elderly={elderly}
                appointments={appointments}
                filter={appointmentPatientFilter}
                setFilter={setAppointmentPatientFilter}
                onAdd={() => { setModalType('appointment'); setIsModalOpen(true); }}
                onEdit={(a: any) => { setEditingData(a); setModalType('appointment'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'appointment' })}
              />
            )}
            {activeTab === 'emotions' && (
              <EmotionsView 
                patients={patients}
                elderly={elderly}
                monitorings={emotionalMonitorings}
                filter={emotionPatientFilter}
                setFilter={setEmotionPatientFilter}
                onAdd={() => { setModalType('emotion'); setIsModalOpen(true); }}
                onEdit={(e: any) => { setEditingData(e); setModalType('emotion'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'emotion' })}
              />
            )}
            {activeTab === 'family' && (
              <FamilyView 
                patients={patients}
                elderly={elderly}
                bonds={familyBonds}
                filter={familyPatientFilter}
                setFilter={setFamilyPatientFilter}
                onAdd={() => { setModalType('family'); setIsModalOpen(true); }}
                onEdit={(f: any) => { setEditingData(f); setModalType('family'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'family' })}
              />
            )}
            {activeTab === 'activities' && (
              <ActivitiesView 
                patients={patients}
                elderly={elderly}
                activities={activities}
                filter={activityPatientFilter}
                setFilter={setActivityPatientFilter}
                onAdd={() => { setModalType('activity'); setIsModalOpen(true); }}
                onEdit={(a: any) => { setEditingData(a); setModalType('activity'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'activity' })}
                professionals={professionals}
              />
            )}
            {activeTab === 'cognition' && (
              <CognitionView 
                patients={patients}
                elderly={elderly}
                assessments={cognitionAssessments}
                filter={cognitionPatientFilter}
                setFilter={setCognitionPatientFilter}
                onAdd={() => { setModalType('cognition'); setIsModalOpen(true); }}
                onEdit={(c: any) => { setEditingData(c); setModalType('cognition'); setIsModalOpen(true); }}
                onDelete={(id: string) => setDeleteConfirm({ id, type: 'cognition' })}
              />
            )}
            {activeTab === 'alerts' && (
              <AlertsView 
                patients={patients}
                elderly={elderly}
                monitorings={emotionalMonitorings}
                bonds={familyBonds}
              />
            )}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'settings' && (
              <SettingsView 
                user={user}
                theme={theme}
                setTheme={setTheme}
                onLogout={onLogout}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <PsychologyModal 
            isOpen={isModalOpen}
            onClose={() => {
              setIsModalOpen(false);
              setEditingData(null);
              setModalType(null);
            }}
            type={modalType}
            patients={patients}
            elderly={elderly}
            showToast={showToast}
            onSavePhotos={onSavePhotos}
            editingData={editingData}
            professionals={professionals}
            user={user}
            onSave={async (data: any) => {
              const payload = { ...data, registeredBy: user.name };
              const id = editingData?.id;
              if (modalType === 'patient') await onSavePatient(data as any, id);
              if (modalType === 'initial') await onSaveInitialAssessment(payload as any, id);
              if (modalType === 'evolution') await onSaveEvolution(payload as any, id);
              if (modalType === 'appointment') await onSaveAppointment(payload as any, id);
              if (modalType === 'emotion') await onSaveEmotionalMonitoring(payload as any, id);
              if (modalType === 'family') await onSaveFamilyBond(payload as any, id);
              if (modalType === 'activity') await onSaveActivity(payload as any, id);
              if (modalType === 'cognition') await onSaveCognitionAssessment(payload as any, id);
              if (modalType === 'plan') await onSaveInterventionPlan(payload as any, id);
              setIsModalOpen(false);
              setEditingData(null);
            }}
          />
        )}
      </AnimatePresence>

      <ConfirmationModal 
        isOpen={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (!deleteConfirm) return;
          try {
            if (deleteConfirm.type === 'patient') {
              await onDeletePatient(deleteConfirm.id);
              setSelectedPatientId(null);
            } else {
              const mapping: Record<string, string> = {
                initial: 'psychInitialAssessments',
                evolution: 'psychEvolutions',
                appointment: 'psychAppointments',
                emotion: 'psychEmotionalMonitorings',
                family: 'psychFamilyBonds',
                activity: 'psychActivities',
                cognition: 'psychCognitionAssessments',
                plan: 'psychInterventionPlans'
              };
              await onDeleteRecord(mapping[deleteConfirm.type], deleteConfirm.id);
            }
          } finally {
            setDeleteConfirm(null);
          }
        }}
        title={`Excluir ${deleteConfirm?.type === 'patient' ? 'Paciente' : 'Registro'}`}
        message={`Tem certeza que deseja excluir este ${deleteConfirm?.type === 'patient' ? 'paciente' : 'registro'}? Esta ação não pode ser desfeita.`}
      />
    </div>
  );
};


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
    {label}
  </button>
);

const StatCard = ({ icon, label, value, color, alert }: { icon: React.ReactNode, label: string, value: string, color: string, alert?: boolean }) => (
  <div className={cn(
    "bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 relative overflow-hidden",
    alert && "border-red-200 dark:border-red-900/50"
  )}>
    <div className="flex items-center gap-4 relative z-10">
      <div className={cn("p-3 rounded-2xl", `bg-${color}-100 dark:bg-${color}-900/30`)}>
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-2xl font-black text-gray-800 dark:text-white">{value}</p>
      </div>
    </div>
    {alert && <div className="absolute top-0 right-0 w-2 h-full bg-red-500" />}
  </div>
);

const PatientDetailView = ({ patient, elderly, evolutions, monitorings, bonds, activities, assessments, appointments, onBack, onEdit, onDelete }: any) => {
  const linkedElderly = patient.elderlyId ? (elderly || []).find((e: any) => e.id === patient.elderlyId) : null;
  const name = linkedElderly?.name || patient.name;
  
  let age = patient.age;
  if (linkedElderly) {
    const birthDate = parseISO(linkedElderly.birthDate);
    age = new Date().getFullYear() - birthDate.getFullYear();
  }
  
  const photoUrl = linkedElderly?.photo || patient.photoUrl;

  const patientEvolutions = (evolutions || []).filter((e: any) => e.patientId === patient.id);
  const patientMonitorings = (monitorings || []).filter((m: any) => m.patientId === patient.id);
  const patientBonds = (bonds || []).filter((b: any) => b.patientId === patient.id);
  const patientActivities = (activities || []).filter((a: any) => a.patientId === patient.id);

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex items-center gap-4">
        <button 
          onClick={onBack}
          className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
        >
          <ArrowLeft size={24} />
        </button>
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tight">Perfil do Paciente</h2>
          <p className="text-gray-500 font-bold">Psicologia • {name}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm text-center">
            <div className="w-32 h-32 rounded-3xl bg-blue-100 dark:bg-blue-900/30 mx-auto mb-6 border-4 border-white dark:border-gray-800 shadow-xl overflow-hidden">
              {photoUrl ? (
                <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <UserIcon className="w-16 h-16 text-blue-600 mt-8 mx-auto" />
              )}
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight mb-1">{name}</h3>
            <p className="text-gray-500 font-bold mb-6 italic">Ingressou em {format(parseISO(patient.entryDate || patient.createdAt), 'dd/MM/yyyy')}</p>
            
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Idade</p>
                <p className="font-bold text-gray-900 dark:text-white">{age} anos</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-center">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Visitas</p>
                <p className="font-bold text-gray-900 dark:text-white">{patient.hasVisits ? 'Sim' : 'Não'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm">
            <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <History size={18} className="text-blue-600" />
              Histórico de Vida
            </h4>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/50">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                "{patient.lifeHistory || 'Nenhum histórico registrado.'}"
              </p>
            </div>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <StatCard icon={<Smile className="text-green-600" />} label="Bem-estar" value={patientMonitorings[0]?.wellBeing || 'N/A'} color="green" />
            <StatCard icon={<ClipboardList className="text-blue-600" />} label="Evoluções" value={String(patientEvolutions.length)} color="blue" />
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-gray-800">
              <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-blue-600" />
                Resumo de Acompanhamento
              </h4>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                {patientEvolutions.length > 0 ? (
                  patientEvolutions.slice(0, 3).map((evo: any) => (
                    <div key={evo.id} className="flex gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="w-12 h-12 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm shrink-0">
                        <Calendar size={20} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{format(parseISO(evo.date), 'dd/MM/yyyy')}</span>
                          <span className="text-[10px] px-2 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 rounded-full font-black uppercase tracking-widest">{evo.category}</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{evo.evolution}</p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-center text-gray-400 py-8 italic font-medium">Nenhuma evolução registrada para este paciente.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const PatientsView = ({ patients, elderly, searchQuery, setSearchQuery, onSelect, onAdd, onEdit, onDelete }: any) => (
  <div className="space-y-6">
    <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
      <div className="relative w-full md:w-96">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
        <input 
          type="text"
          placeholder="Buscar idoso..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />
      </div>
      <button onClick={onAdd} className="w-full md:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all">
        <Plus size={20} /> Novo Idoso
      </button>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {(patients || []).map((patient: PsychPatient) => {
        const linkedElderly = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
        const name = linkedElderly?.name || patient.name;
        const photoUrl = linkedElderly?.photo || patient.photoUrl;
        let age = patient.age;
        if (linkedElderly) {
          const birthDate = parseISO(linkedElderly.birthDate);
          age = new Date().getFullYear() - birthDate.getFullYear();
        }

        return (
          <div key={patient.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all group">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-4">
                <div className="w-16 h-16 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 overflow-hidden">
                  {photoUrl ? (
                    <img src={photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserIcon size={32} />
                  )}
                </div>
                <div>
                  <h4 className="font-black text-gray-800 dark:text-white group-hover:text-blue-600 transition-colors line-clamp-1">{name}</h4>
                  <p className="text-xs text-gray-500">{age} anos • {linkedElderly?.entryDate || patient.entryDate}</p>
                </div>
              </div>
              <div className="flex gap-1 shrink-0">
                <button onClick={(e) => { e.stopPropagation(); onEdit(patient); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-colors">
                  <Edit2 size={16} />
                </button>
                <button onClick={(e) => { e.stopPropagation(); onDelete(patient.id); }} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-colors">
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <div className="space-y-2 mb-6">
              {linkedElderly && (
                <div className="flex items-center gap-1.5 mb-2">
                  <span className="px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 text-[8px] font-black rounded uppercase tracking-tighter">Vinculado</span>
                  <span className="text-[10px] text-gray-400 font-medium truncate">CPF: {linkedElderly.cpf}</span>
                </div>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <Users2 size={14} className="text-blue-500" />
                <span>Visitas: {patient.hasVisits ? 'Sim' : 'Não'}</span>
              </div>
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                <History size={14} className="text-blue-500 shrink-0" />
                <span className="line-clamp-1">{patient.lifeHistory || 'Sem histórico de vida registrado'}</span>
              </div>
            </div>

            <div className="flex gap-2 pt-4 border-t border-gray-50 dark:border-gray-800">
              <button onClick={() => onSelect(patient.id)} className="flex-1 py-2 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/30 hover:text-blue-600 transition-all">
                Ver Perfil
              </button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const InitialAssessmentView = ({ patients, elderly, assessments, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Avaliações Iniciais</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Nova Avaliação
      </button>
    </div>
    <div className="space-y-4">
      {(assessments || []).filter((a: any) => !filter || a.patientId === filter).map((a: PsychInitialAssessment & { targetName?: string, targetType?: string }) => {
        const patient = (patients || []).find((p: any) => p.id === a.patientId);
        const linked = patient?.elderlyId ? (elderly || []).find((e: any) => e.id === patient.elderlyId) : null;
        const displayName = a.patientId === 'OUTRO' 
          ? `${a.targetName || 'Outro'} (${a.targetType?.replace('_', ' ') || 'Comunidade'})`
          : (linked?.name || patient?.name);

        return (
          <div key={a.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-2">
              <h4 className="font-bold text-blue-600">{displayName}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{a.date}</span>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(a)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs mb-3">
              <div>
                <p className="text-gray-400 uppercase font-bold">Estado Emocional</p>
                <p className="font-medium">{a.emotionalState}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase font-bold">Cognição</p>
                <p className="font-medium">{a.cognition}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase font-bold">Humor</p>
                <p className="font-medium">{a.mood}</p>
              </div>
              <div>
                <p className="text-gray-400 uppercase font-bold">Adaptação</p>
                <p className="font-medium">{a.adaptationLevel}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{a.observations}</p>
          </div>
        );
      })}
    </div>
  </div>
);

const EvolutionView = ({ patients, elderly, evolutions, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Evoluções Psicológicas</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Nova Evolução
      </button>
    </div>
    <div className="space-y-6">
      {(evolutions || []).filter((e: any) => !filter || e.patientId === filter).map((e: PsychEvolution) => {
        const patient = (patients || []).find((p: any) => p.id === e.patientId);
        const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
        const displayName = e.patientId === 'OUTRO' 
          ? `${e.targetName || 'Outro'} (${e.targetType?.replace('_', ' ') || 'Comunidade'})`
          : (linked?.name || patient?.name);

        return (
          <div key={e.id} className="relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-gray-800">
            <div className="absolute left-[-4px] top-0 w-2 h-2 rounded-full bg-blue-600" />
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-gray-800 dark:text-white">{displayName}</h4>
                <p className="text-xs text-gray-500">{e.date} às {e.time}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => onEdit(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                <button onClick={() => onDelete(e.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-blue-600">Obs:</span> {e.observation}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-green-600">Intervenção:</span> {e.intervention}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const AppointmentsView = ({ patients, elderly, appointments, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Atendimentos</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Novo Atendimento
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <th className="pb-4">Idoso</th>
            <th className="pb-4">Data/Hora</th>
            <th className="pb-4">Tipo</th>
            <th className="pb-4">Status</th>
            <th className="pb-4">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {(appointments || []).filter((app: any) => !filter || app.patientId === filter).map((app: PsychAppointment & { targetName?: string, targetType?: string }) => {
            const patient = (patients || []).find((p: any) => p.id === app.patientId);
            const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
            const displayName = app.patientId === 'OUTRO' 
              ? `${app.targetName || 'Outro'} (${app.targetType?.replace('_', ' ') || 'Comunidade'})`
              : (linked?.name || patient?.name);

            return (
              <tr key={app.id} className="border-t border-gray-50 dark:border-gray-800">
                <td className="py-4 font-bold">{displayName}</td>
                <td className="py-4 text-gray-500">{app.date} {app.time}</td>
                <td className="py-4">
                  <span className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-[10px] font-bold uppercase">
                    {app.type}
                  </span>
                </td>
                <td className="py-4">
                  <span className={cn(
                    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                    app.status === 'REALIZADO' ? "bg-green-50 text-green-600" :
                    app.status === 'FALTOU' ? "bg-red-50 text-red-600" : "bg-amber-50 text-amber-600"
                  )}>
                    {app.status}
                  </span>
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(app)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(app.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const EmotionsView = ({ patients, elderly, monitorings, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Monitoramento Emocional</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Registrar Emoção
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(monitorings || []).filter((m: any) => !filter || m.patientId === filter).map((m: PsychEmotionalMonitoring & { targetName?: string, targetType?: string }) => {
        const patient = (patients || []).find((p: any) => p.id === m.patientId);
        const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
        const displayName = m.patientId === 'OUTRO' 
          ? `${m.targetName || 'Outro'} (${m.targetType?.replace('_', ' ') || 'Comunidade'})`
          : (linked?.name || patient?.name);

        return (
          <div key={m.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "p-2 rounded-xl",
                  m.wellBeing === 'FELIZ' ? "bg-green-100 text-green-600" :
                  m.wellBeing === 'NEUTRO' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                )}>
                  {m.wellBeing === 'FELIZ' ? <Smile size={20} /> : m.wellBeing === 'NEUTRO' ? <Meh size={20} /> : <Frown size={20} />}
                </div>
                <div>
                  <h4 className="font-bold">{displayName}</h4>
                  <p className="text-xs text-gray-500">{m.date}</p>
                </div>
              </div>
              <div className="flex gap-1">
                <button onClick={() => onEdit(m)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                <button onClick={() => onDelete(m.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <EmotionIndicator label="Tristeza" level={m.sadness} />
              <EmotionIndicator label="Ansiedade" level={m.anxiety} />
              <EmotionIndicator label="Solidão" level={m.loneliness} />
              <EmotionIndicator label="Irritabilidade" level={m.irritability} />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const EmotionIndicator = ({ label, level }: { label: string, level: string }) => (
  <div className="space-y-1">
    <p className="text-[10px] font-bold text-gray-400 uppercase">{label}</p>
    <div className="flex gap-1">
      {[1, 2, 3].map(i => (
        <div 
          key={i} 
          className={cn(
            "h-1.5 flex-1 rounded-full",
            i === 1 && level !== 'NENHUM' ? "bg-blue-400" :
            i === 2 && (level === 'MODERADO' || level === 'INTENSO') ? "bg-blue-500" :
            i === 3 && level === 'INTENSO' ? "bg-blue-600" : "bg-gray-100 dark:bg-gray-800"
          )}
        />
      ))}
    </div>
    <p className="text-[10px] text-right text-gray-500">{level}</p>
  </div>
);

const FamilyView = ({ patients, elderly, bonds, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Vínculo Familiar</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Registrar Contato
      </button>
    </div>
    <div className="space-y-4">
      {(bonds || []).filter((b: any) => !filter || b.patientId === filter).map((b: PsychFamilyBond & { targetName?: string, targetType?: string }) => {
        const patient = (patients || []).find((p: any) => p.id === b.patientId);
        const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
        const displayName = b.patientId === 'OUTRO' 
          ? `${b.targetName || 'Outro'} (${b.targetType?.replace('_', ' ') || 'Comunidade'})`
          : (linked?.name || patient?.name);

        return (
          <div key={b.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl flex items-start gap-4">
            <div className={cn(
              "p-3 rounded-xl shrink-0",
              b.receivesVisits ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
            )}>
              <Users2 size={24} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-1">
                <h4 className="font-bold text-gray-800 dark:text-white">{displayName}</h4>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400">{b.date}</span>
                  <div className="flex gap-1">
                    <button onClick={() => onEdit(b)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(b.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>
                </div>
              </div>
              <div className="flex gap-4 text-xs mb-2">
                <p><span className="text-gray-400 font-bold">VISITAS:</span> {b.receivesVisits ? 'Sim' : 'Não'}</p>
                <p><span className="text-gray-400 font-bold">FREQUÊNCIA:</span> {b.frequency}</p>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold">Relação:</span> {b.familyRelationship}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const ActivitiesView = ({ patients, elderly, activities, onAdd, onEdit, onDelete, filter, setFilter, professionals = [] }: any) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Atividades Psicossociais</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Nova Atividade
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(activities || []).filter((act: any) => !filter || (act.participants || []).includes(filter)).map((act: PsychActivity) => (
        <div key={act.id} className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between">
          <div>
            <div className="flex justify-between items-start mb-4">
              <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-full text-[10px] font-bold uppercase">
                {act.type}
              </span>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">{act.date}</span>
                <div className="flex gap-1">
                  <button onClick={() => onEdit(act)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(act.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
            <h4 className="text-lg font-bold mb-2">{act.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{act.description}</p>
            
            <div className="space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Participantes:</span>
              <div className="flex flex-wrap gap-1.5">
                {(act.participants || []).map(pid => {
                  const p = (patients || []).find((pt: any) => pt.id === pid);
                  const linked = p?.elderlyId ? (elderly || []).find((ed: any) => ed.id === p.elderlyId) : null;
                  return (
                    <span key={pid} className="px-2 py-0.5 bg-gray-105 dark:bg-gray-800 rounded-lg text-[10px] text-gray-500">
                      {linked?.name || p?.name || pid}
                    </span>
                  );
                })}
              </div>
            </div>
          </div>

          {act.coWorkers && act.coWorkers.length > 0 && (
            <div className="mt-4 pt-3 border-t border-gray-100 dark:border-gray-800 space-y-1">
              <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Equipe / Colaboradores:</span>
              <div className="flex flex-wrap gap-1.5">
                {act.coWorkers.map(cwId => {
                  const prof = professionals.find(p => p.id === cwId || p.email === cwId || p.name === cwId);
                  return (
                    <span key={cwId} className="px-2 py-0.5 bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900 rounded-lg text-[9.5px] font-medium text-blue-600 dark:text-blue-400">
                      {prof ? prof.name : cwId}
                    </span>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  </div>
);

const CognitionView = ({ patients, elderly, assessments, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
    <div className="flex justify-between items-center mb-6">
      <div className="flex items-center gap-4">
        <h3 className="text-lg font-bold">Avaliação Cognitiva</h3>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Filtrar p/ Idoso</option>
          {(patients || []).map((p: any) => {
            const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
            const name = linked?.name || p.name;
            return (
              <option key={p.id} value={p.id}>{name}</option>
            );
          })}
          <option value="OUTRO">Outros (Comunidade/Cuidador)</option>
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
        <Plus size={18} /> Nova Avaliação
      </button>
    </div>
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            <th className="pb-4">Idoso</th>
            <th className="pb-4">Data</th>
            <th className="pb-4">Memória</th>
            <th className="pb-4">Atenção</th>
            <th className="pb-4">Orientação</th>
            <th className="pb-4">Ações</th>
          </tr>
        </thead>
        <tbody className="text-sm">
          {(assessments || []).filter((a: any) => !filter || a.patientId === filter).map((a: PsychCognitionAssessment & { targetName?: string, targetType?: string }) => {
            const patient = (patients || []).find((p: any) => p.id === a.patientId);
            const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
            const displayName = a.patientId === 'OUTRO' 
              ? `${a.targetName || 'Outro'} (${a.targetType?.replace('_', ' ') || 'Comunidade'})`
              : (linked?.name || patient?.name);

            return (
              <tr key={a.id} className="border-t border-gray-50 dark:border-gray-800">
                <td className="py-4 font-bold">{displayName}</td>
                <td className="py-4 text-gray-500">{a.date}</td>
                <td className="py-4">
                  <CognitionBadge status={a.memory} />
                </td>
                <td className="py-4">
                  <CognitionBadge status={a.attention} />
                </td>
                <td className="py-4">
                  <CognitionBadge status={a.orientation} />
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(a)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(a.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors"><Trash2 size={14} /></button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </div>
);

const CognitionBadge = ({ status }: { status: string }) => (
  <span className={cn(
    "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
    status === 'PRESERVADO' ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"
  )}>
    {status}
  </span>
);

const AlertsView = ({ patients, elderly, monitorings, bonds }: any) => {
  const alerts = useMemo(() => {
    const list: any[] = [];
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Sadness alerts
    (monitorings || []).filter((m: any) => m.date === today && m.wellBeing === 'TRISTE').forEach((m: any) => {
      const p = (patients || []).find((pt: any) => pt.id === m.patientId);
      const linked = p?.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
      list.push({ type: 'TRISTEZA', patient: linked?.name || p?.name, detail: 'Sinal de tristeza persistente registrado hoje.' });
    });

    // Isolation alerts
    (bonds || []).filter((b: any) => !b.receivesVisits).forEach((b: any) => {
      const p = (patients || []).find((pt: any) => pt.id === b.patientId);
      const linked = p?.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
      list.push({ type: 'ISOLAMENTO', patient: linked?.name || p?.name, detail: 'Idoso não recebe visitas familiares.' });
    });

    return list;
  }, [patients, elderly, monitorings, bonds]);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-bold">Alertas Psicossociais</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {alerts.map((alert, idx) => (
          <div key={idx} className={cn(
            "p-6 rounded-3xl border flex gap-4",
            alert.type === 'TRISTEZA' ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30" : "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900/30"
          )}>
            <div className={cn(
              "p-3 rounded-2xl shrink-0",
              alert.type === 'TRISTEZA' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
            )}>
              <AlertCircle size={24} />
            </div>
            <div>
              <h4 className={cn("font-bold", alert.type === 'TRISTEZA' ? "text-red-900 dark:text-red-200" : "text-amber-900 dark:text-amber-200")}>
                {alert.patient}
              </h4>
              <p className={cn("text-sm", alert.type === 'TRISTEZA' ? "text-red-700 dark:text-red-300" : "text-amber-700 dark:text-amber-300")}>
                {alert.detail}
              </p>
            </div>
          </div>
        ))}
        {alerts.length === 0 && (
          <div className="col-span-2 text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
            <CheckCircle2 className="mx-auto text-green-500 mb-4" size={48} />
            <p className="text-gray-500">Nenhum alerta crítico no momento.</p>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsView = ({ user, theme, setTheme, onLogout }: any) => (
  <div className="max-w-2xl space-y-6">
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex items-center gap-6 mb-8">
        <div className="w-24 h-24 rounded-3xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600">
          <UserCircle size={48} />
        </div>
        <div>
          <h3 className="text-2xl font-black">{user.name}</h3>
          <p className="text-gray-500 font-medium">Psicóloga • CRP: {user.registrationNumber || '00/00000'}</p>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
          <div className="flex items-center gap-3">
            {theme === 'dark' ? <Moon size={20} /> : <Sun size={20} />}
            <span className="font-bold">Tema do Sistema</span>
          </div>
          <button 
            onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
            className="px-4 py-2 bg-white dark:bg-gray-700 rounded-xl text-xs font-bold shadow-sm"
          >
            Alternar
          </button>
        </div>

        <button 
          onClick={onLogout}
          className="w-full flex items-center justify-center gap-3 p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl font-bold hover:bg-red-100 transition-colors"
        >
          <LogOut size={20} /> Sair do Sistema
        </button>
      </div>
    </div>
  </div>
);

const PsychologyModal = ({ isOpen, onClose, type, patients, elderly, onSave, onSavePhotos, editingData, showToast, professionals = [], user }: any) => {
  const [formData, setFormData] = useState<any>(editingData || {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    photos: [],
    elderlyId: editingData?.elderlyId || '',
    coWorkers: []
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [profSearch, setProfSearch] = useState('');

  // Sync formData when editingData changes or when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(editingData || {
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        photos: [],
        elderlyId: editingData?.elderlyId || '',
        coWorkers: editingData?.coWorkers || []
      });
      setProfSearch('');
    }
  }, [isOpen, editingData]);

  // Sincronização automática com Cadastro Geral
  const linkedElderly = useMemo(() => 
    formData.elderlyId ? (elderly || []).find(e => e.id === formData.elderlyId) : null,
  [formData.elderlyId, elderly]);

  useEffect(() => {
    if (linkedElderly && type === 'patient') {
      const birthDate = parseISO(linkedElderly.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      setFormData((prev: any) => ({
        ...prev,
        name: linkedElderly.name,
        fullName: linkedElderly.fullName || linkedElderly.name,
        age: age,
        birthDate: linkedElderly.birthDate,
        cpf: linkedElderly.cpf,
        entryDate: linkedElderly.entryDate,
        familyContact: linkedElderly.phone || linkedElderly.responsiblePhone || prev.familyContact,
        lifeHistory: linkedElderly.observations || prev.lifeHistory
      }));
    }
  }, [linkedElderly, type]);

  const handleDigitize = async (text: string) => {
    if (!text) return;
    setIsExtracting(true);
    try {
      const schemas: Record<string, string> = {
        patient: "name, age (number), birthDate, familyContact, lifeHistory",
        initial: "emotionalState, mood, adaptationLevel, observations",
        evolution: "observation, intervention",
        appointment: "type (INDIVIDUAL, GRUPO, RODA_CONVERSA), status (REALIZADO, FALTOU, PENDENTE), observations",
        emotion: "sadness (LEVE, MODERADO, INTENSO, NENHUM), anxiety (...), loneliness (...), irritability (...), wellBeing (FELIZ, NEUTRO, TRISTE), observations",
        family: "receivesVisits (boolean), frequency, familyRelationship, observations",
        activity: "title, type (OFICINA, DINAMICA, GRUPO), description",
        cognition: "memory (PRESERVADO, COMPROMETIDO), attention (...), orientation (...), observations",
        plan: "objectives, strategies, followUp"
      };
      
      const extractedData = await extractFormData(text, schemas[type] || "observations");
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
      } else {
        if (type === 'evolution') {
          setFormData((prev: any) => ({ ...prev, observation: (prev.observation || '') + '\n' + text }));
        } else if (type === 'activity') {
          setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { photos, ...data } = formData;
      await onSave(data, editingData?.id);

      if (photos && photos.length > 0 && formData.patientId) {
        const patient = (patients || []).find((p: any) => p.id === formData.patientId);
        const activityType = 
          type === 'evolution' ? 'Evolução Psicológica' :
          type === 'activity' ? 'Atividade Psicológica' : 'Atendimento Psicológico';
        
        await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.observation || formData.description);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  const patientOptions = useMemo(() => [
    ...(patients || []).map((p: any) => {
      const linked = p.elderlyId ? (elderly || []).find((e: any) => e.id === p.elderlyId) : null;
      return { value: p.id, label: linked?.name || p.name };
    }),
    { value: 'OUTRO', label: 'OUTRO (Comunidade / Cuidador)' }
  ], [patients, elderly]);

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-2 md:p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] w-full max-w-4xl max-h-[95vh] md:max-h-[90vh] overflow-hidden shadow-2xl flex flex-col"
      >
        <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-20">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <div className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
              <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Psicologia</span>
            </div>
            <h3 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white flex items-center gap-3">
              {editingData ? 'Editar' : 'Novo'} {
                type === 'patient' ? 'Idoso' : 
                type === 'initial' ? 'Avaliação Inicial' :
                type === 'evolution' ? 'Evolução' :
                type === 'appointment' ? 'Atendimento' :
                type === 'emotion' ? 'Monitoramento Emocional' :
                type === 'family' ? 'Vínculo Familiar' :
                type === 'activity' ? 'Atividade' :
                type === 'cognition' ? 'Avaliação Cognitiva' : 'Registro'
              }
              {isExtracting && (
                <span className="flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full animate-pulse">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Processando...
                </span>
              )}
            </h3>
          </div>
          <button 
            type="button"
            onClick={onClose} 
            className="p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all hover:rotate-90"
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="p-5 md:p-8 overflow-y-auto flex-1 space-y-6 md:space-y-8">
            {type === 'patient' && (
              <div className="md:col-span-2 space-y-3 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-800/30 transition-all mb-4">
                <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                  <Users size={14} />
                  Vincular ao Cadastro Geral (Idosos)
                </label>
                <select 
                  className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold dark:text-white"
                  value={formData.elderlyId || ''}
                  onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
                >
                  <option value="">-- Não vinculado / Novo Cadastro --</option>
                  {(elderly || []).map((e: any) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <p className="text-[10px] text-blue-600/60 ml-1 italic font-medium">Ao vincular, os dados de nome, idade, CPF e data de entrada serão sincronizados automaticamente.</p>
              </div>
            )}
            {type === 'patient' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Nome Completo" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} disabled={!!formData.elderlyId} />
                <Input label="CPF" value={formData.cpf} onChange={(v) => setFormData({ ...formData, cpf: v })} disabled={!!formData.elderlyId} />
                <Input 
                  label="Idade" 
                  type="number" 
                  value={formData.age === undefined || isNaN(formData.age) ? '' : formData.age.toString()} 
                  onChange={(v) => setFormData({ ...formData, age: v === '' ? 0 : parseInt(v) })} 
                  disabled={!!formData.elderlyId}
                />
                <Input label="Data de Nascimento" type="date" value={formData.birthDate} onChange={(v) => setFormData({ ...formData, birthDate: v })} disabled={!!formData.elderlyId} />
                <Input label="Data de Entrada" type="date" value={formData.entryDate} onChange={(v) => setFormData({ ...formData, entryDate: v })} disabled={!!formData.elderlyId} />
                <Input label="Escolaridade" value={formData.schooling} onChange={(v) => setFormData({ ...formData, schooling: v })} />
                <Input label="Contato Familiar" value={formData.familyContact} onChange={(v) => setFormData({ ...formData, familyContact: v })} />
                <div className="md:col-span-2">
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-bold text-gray-400 uppercase">História de Vida</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, lifeHistory: (formData.lifeHistory || '') + ' ' + t })} />
                  </div>
                  <TextArea label="" value={formData.lifeHistory} onChange={(v) => setFormData({ ...formData, lifeHistory: v })} />
                </div>
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={formData.hasVisits} 
                    onChange={(e) => setFormData({ ...formData, hasVisits: e.target.checked })} 
                    className="w-5 h-5 rounded-lg text-blue-600" 
                  />
                  <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Recebe visitas?</label>
                </div>
              </div>
            )}

            {type === 'initial' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={patientOptions} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                
                {formData.patientId === 'OUTRO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <Select 
                      label="Tipo de Público" 
                      value={formData.targetType} 
                      options={[
                        { value: 'IDOSO_COMUNIDADE', label: 'Idoso da Comunidade' },
                        { value: 'CUIDADOR_INSTITUICAO', label: 'Cuidador da Instituição' },
                        { value: 'CUIDADOR_COMUNIDADE', label: 'Cuidador da Comunidade' }
                      ]} 
                      onChange={(v) => setFormData({ ...formData, targetType: v })} 
                    />
                    <Input label="Nome / Identificação" value={formData.targetName} onChange={(v) => setFormData({ ...formData, targetName: v })} />
                  </div>
                )}

                <Input label="Data da Avaliação" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Estado Emocional" value={formData.emotionalState} onChange={(v) => setFormData({ ...formData, emotionalState: v })} />
                  <Select label="Cognição" value={formData.cognition} options={[{value: 'ORIENTADO', label: 'Orientado'}, {value: 'DESORIENTADO', label: 'Desorientado'}]} onChange={(v) => setFormData({ ...formData, cognition: v })} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Humor Predominante" value={formData.mood} onChange={(v) => setFormData({ ...formData, mood: v })} />
                  <Input label="Nível de Adaptação" value={formData.adaptationLevel} onChange={(v) => setFormData({ ...formData, adaptationLevel: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Observações Gerais</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={6}
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
              </div>
            )}

            {type === 'evolution' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={patientOptions} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                
                {formData.patientId === 'OUTRO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <Select 
                      label="Tipo de Público" 
                      value={formData.targetType} 
                      options={[
                        { value: 'IDOSO_COMUNIDADE', label: 'Idoso da Comunidade' },
                        { value: 'CUIDADOR_INSTITUICAO', label: 'Cuidador da Instituição' },
                        { value: 'CUIDADOR_COMUNIDADE', label: 'Cuidador da Comunidade' }
                      ]} 
                      onChange={(v) => setFormData({ ...formData, targetType: v })} 
                    />
                    <Input label="Nome / Identificação" value={formData.targetName} onChange={(v) => setFormData({ ...formData, targetName: v })} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <Input label="Data" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                  <Input label="Hora" value={formData.time} type="time" onChange={(v) => setFormData({ ...formData, time: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Evolução / Observação</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        disabled={isExtracting || !formData.observation}
                        onClick={async () => {
                          if (!formData.observation) return;
                          setIsExtracting(true);
                          try {
                            const fixed = await fixGrammar(formData.observation);
                            setFormData({ ...formData, observation: fixed });
                            showToast('Texto corrigido com sucesso', 'success');
                          } catch (err) {
                            console.error(err);
                            showToast('Erro ao corrigir texto', 'error');
                          } finally {
                            setIsExtracting(false);
                          }
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/30 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap size={14} />}
                        Corrigir
                      </button>
                      <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observation: (formData.observation || '') + ' ' + t })} />
                    </div>
                  </div>
                  <textarea 
                    rows={6}
                    value={formData.observation || ''}
                    onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none font-bold" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Intervenção</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, intervention: (formData.intervention || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={4}
                    value={formData.intervention || ''}
                    onChange={(e) => setFormData({ ...formData, intervention: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none font-medium" 
                  />
                </div>
              </div>
            )}

            {type === 'appointment' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={patientOptions} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                
                {formData.patientId === 'OUTRO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <Select 
                      label="Tipo de Público" 
                      value={formData.targetType} 
                      options={[
                        { value: 'IDOSO_COMUNIDADE', label: 'Idoso da Comunidade' },
                        { value: 'CUIDADOR_INSTITUICAO', label: 'Cuidador da Instituição' },
                        { value: 'CUIDADOR_COMUNIDADE', label: 'Cuidador da Comunidade' }
                      ]} 
                      onChange={(v) => setFormData({ ...formData, targetType: v })} 
                    />
                    <Input label="Nome / Identificação" value={formData.targetName} onChange={(v) => setFormData({ ...formData, targetName: v })} />
                  </div>
                )}

                <div className="grid grid-cols-2 gap-6">
                  <Input label="Data" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                  <Input label="Hora" value={formData.time} type="time" onChange={(v) => setFormData({ ...formData, time: v })} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Select label="Tipo de Atendimento" value={formData.type} options={[{value: 'INDIVIDUAL', label: 'Individual'}, {value: 'GRUPO', label: 'Grupo'}, {value: 'RODA_CONVERSA', label: 'Roda de Conversa'}]} onChange={(v) => setFormData({ ...formData, type: v })} />
                  <Select label="Status" value={formData.status} options={[{value: 'PENDENTE', label: 'Pendente'}, {value: 'REALIZADO', label: 'Realizado'}, {value: 'FALTOU', label: 'Faltou'}]} onChange={(v) => setFormData({ ...formData, status: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Observações do Atendimento</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={6}
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
              </div>
            )}

            {type === 'emotion' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={patientOptions} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                
                {formData.patientId === 'OUTRO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <Select 
                      label="Tipo de Público" 
                      value={formData.targetType} 
                      options={[
                        { value: 'IDOSO_COMUNIDADE', label: 'Idoso da Comunidade' },
                        { value: 'CUIDADOR_INSTITUICAO', label: 'Cuidador da Instituição' },
                        { value: 'CUIDADOR_COMUNIDADE', label: 'Cuidador da Comunidade' }
                      ]} 
                      onChange={(v) => setFormData({ ...formData, targetType: v })} 
                    />
                    <Input label="Nome / Identificação" value={formData.targetName} onChange={(v) => setFormData({ ...formData, targetName: v })} />
                  </div>
                )}

                <Input label="Data" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <Select label="Tristeza" value={formData.sadness} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, sadness: v })} />
                  <Select label="Ansiedade" value={formData.anxiety} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, anxiety: v })} />
                  <Select label="Solidão" value={formData.loneliness} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, loneliness: v })} />
                  <Select label="Irritabilidade" value={formData.irritability} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, irritability: v })} />
                </div>
                <Select label="Bem-estar Geral" value={formData.wellBeing} options={[{value: 'FELIZ', label: 'Feliz 😊'}, {value: 'NEUTRO', label: 'Neutro 😐'}, {value: 'TRISTE', label: 'Triste 😔'}]} onChange={(v) => setFormData({ ...formData, wellBeing: v })} />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Observações Adicionais</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
              </div>
            )}

            {type === 'family' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={patientOptions} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                
                {formData.patientId === 'OUTRO' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-800">
                    <Select 
                      label="Tipo de Público" 
                      value={formData.targetType} 
                      options={[
                        { value: 'IDOSO_COMUNIDADE', label: 'Idoso da Comunidade' },
                        { value: 'CUIDADOR_INSTITUICAO', label: 'Cuidador da Instituição' },
                        { value: 'CUIDADOR_COMUNIDADE', label: 'Cuidador da Comunidade' }
                      ]} 
                      onChange={(v) => setFormData({ ...formData, targetType: v })} 
                    />
                    <Input label="Nome / Identificação" value={formData.targetName} onChange={(v) => setFormData({ ...formData, targetName: v })} />
                  </div>
                )}

                <Input label="Data do Registro" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                <div className="flex items-center gap-3">
                  <input 
                    type="checkbox" 
                    checked={formData.receivesVisits} 
                    onChange={(e) => setFormData({ ...formData, receivesVisits: e.target.checked })} 
                    className="w-5 h-5 rounded-lg text-blue-600" 
                  />
                  <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Recebe visitas familiares?</label>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Frequência das Visitas" value={formData.frequency} onChange={(v) => setFormData({ ...formData, frequency: v })} />
                  <Input label="Qualidade da Relação" value={formData.familyRelationship} onChange={(v) => setFormData({ ...formData, familyRelationship: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Observações</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
              </div>
            )}

            {type === 'activity' && (
              <div className="space-y-6">
                <Input label="Título da Atividade" value={formData.title} onChange={(v) => setFormData({ ...formData, title: v })} />
                <div className="grid grid-cols-2 gap-6">
                  <Input label="Data" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                  <Select label="Tipo" value={formData.type} options={[{value: 'OFICINA', label: 'Oficina'}, {value: 'DINAMICA', label: 'Dinâmica'}, {value: 'GRUPO', label: 'Grupo'}]} onChange={(v) => setFormData({ ...formData, type: v })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Participantes</label>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl max-h-48 overflow-y-auto">
                    {(patients || []).map((p: any) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors">
                        <input 
                          type="checkbox" 
                          value={p.id}
                          checked={(formData.participants || []).includes(p.id)}
                          onChange={(e) => {
                            const current = formData.participants || [];
                            if (e.target.checked) setFormData({ ...formData, participants: [...current, p.id] });
                            else setFormData({ ...formData, participants: current.filter((id: string) => id !== p.id) });
                          }}
                          className="w-4 h-4 rounded text-blue-600"
                        />
                        <span className="truncate">{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Descrição da Atividade</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.description || ''}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>

                {/* Seleção de Co-workers / Outros Profissionais da Instituição */}
                <div className="space-y-3 pt-4 border-t border-gray-100 dark:border-gray-800">
                  <div className="flex justify-between items-center">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Co-workers / Profissionais Colaboradores</label>
                      <span className="text-[10px] text-gray-400">Selecione quem participou desta ação em conjunto</span>
                    </div>
                    {formData.coWorkers && formData.coWorkers.length > 0 && (
                      <button 
                        type="button" 
                        onClick={() => setFormData({ ...formData, coWorkers: [] })}
                        className="text-[10px] text-red-500 font-bold uppercase tracking-wider"
                      >
                        Limpar Seleção ({formData.coWorkers.length})
                      </button>
                    )}
                  </div>
                  
                  <div className="relative">
                    <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-blue-500 transition-all">
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
                                ? "bg-blend-color-burn bg-blue-500/10 dark:bg-blue-950/20 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-300"
                                : "bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-300"
                            )}
                          >
                            <div className="min-w-0">
                              <p className="text-xs font-bold truncate">{p.name}</p>
                              <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">{ROLE_LABELS[p.role] || p.role}</p>
                            </div>
                            <div className={cn(
                              "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                              isSelected ? "bg-blue-500 border-blue-500 text-white" : "border-gray-200 dark:border-gray-700 bg-transparent"
                            )}>
                              {isSelected && <CheckCircle2 size={12} />}
                            </div>
                          </button>
                        );
                      })
                    }
                  </div>
                </div>
              </div>
            )}

            {type === 'cognition' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={(patients || []).map((p: any) => ({ value: p.id, label: p.name }))} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                <Input label="Data da Avaliação" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                <div className="grid grid-cols-3 gap-6">
                  <Select label="Memória" value={formData.memory} options={[{value: 'PRESERVADO', label: 'Preservado'}, {value: 'COMPROMETIDO', label: 'Comprometido'}]} onChange={(v) => setFormData({ ...formData, memory: v })} />
                  <Select label="Atenção" value={formData.attention} options={[{value: 'PRESERVADO', label: 'Preservado'}, {value: 'COMPROMETIDO', label: 'Comprometido'}]} onChange={(v) => setFormData({ ...formData, attention: v })} />
                  <Select label="Orientação" value={formData.orientation} options={[{value: 'PRESERVADO', label: 'Preservado'}, {value: 'COMPROMETIDO', label: 'Comprometido'}]} onChange={(v) => setFormData({ ...formData, orientation: v })} />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Observações Adicionais</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
              </div>
            )}
            
            {type === 'plan' && (
              <div className="space-y-6">
                <Select label="Idoso" value={formData.patientId} options={(patients || []).map((p: any) => ({ value: p.id, label: p.name }))} onChange={(v) => setFormData({ ...formData, patientId: v })} />
                <Input label="Data do Plano" value={formData.date} type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Objetivos Terapêuticos</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, objectives: (formData.objectives || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.objectives || ''}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Estratégias de Intervenção</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, strategies: (formData.strategies || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={3}
                    value={formData.strategies || ''}
                    onChange={(e) => setFormData({ ...formData, strategies: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-400 uppercase">Acompanhamento</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, followUp: (formData.followUp || '') + ' ' + t })} />
                  </div>
                  <textarea 
                    rows={2}
                    value={formData.followUp || ''}
                    onChange={(e) => setFormData({ ...formData, followUp: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
                  />
                </div>
              </div>
            )}

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos} onChange={photos => setFormData({ ...formData, photos })} />
            </div>
          </div>

          <div className="p-5 md:p-8 border-t border-gray-100 dark:border-gray-800 flex gap-4 bg-white dark:bg-gray-900 sticky bottom-0 z-20">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 py-3 md:py-4 bg-gray-50 dark:bg-gray-800 text-gray-500 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all border border-transparent active:scale-95"
            >
              Cancelar
            </button>
            <button 
              type="submit" 
              className="flex-[2] py-3 md:py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all active:scale-95"
            >
              {editingData ? 'Salvar Edição' : 'Salvar Registro'}
            </button>
          </div>
        </form>
    </motion.div>
  </div>
  );
};

const Input = ({ label, type = "text", value, onChange, disabled }: { label: string, type?: string, value?: any, onChange: (v: string) => void, disabled?: boolean }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <input 
      type={type} 
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all",
        disabled && "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700"
      )} 
    />
  </div>
);

const TextArea = ({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <textarea 
      rows={3}
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none" 
    />
  </div>
);

const Select = ({ label, options, value, onChange, disabled }: { label: string, options: { value: string, label: string }[], value?: string, onChange: (v: string) => void, disabled?: boolean }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <select 
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all",
        disabled && "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700"
      )}
    >
      <option value="">Selecione...</option>
      {options.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
    </select>
  </div>
);

const ConfirmationModal = ({ isOpen, onClose, onConfirm, title, message }: any) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800"
      >
        <div className="w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 mb-6">
          <Trash2 size={24} />
        </div>
        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2">{title}</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-8 font-bold leading-relaxed">{message}</p>
        <div className="flex gap-4">
          <button 
            onClick={onClose} 
            className="flex-1 py-4 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-100 dark:hover:bg-gray-700 transition-all active:scale-95"
          >
            Cancelar
          </button>
          <button 
            onClick={onConfirm} 
            className="flex-1 py-4 bg-red-600 text-white rounded-2xl font-bold hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all active:scale-95"
          >
            Confirmar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const ReportCard = ({ title, description, icon, onDownloadPDF, onDownloadWord }: { title: string, description: string, icon: React.ReactNode, onDownloadPDF: () => void, onDownloadWord: () => void }) => (
  <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all">
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl w-fit mb-4">
      {icon}
    </div>
    <h4 className="font-bold mb-2">{title}</h4>
    <p className="text-sm text-gray-500 mb-6">{description}</p>
    <div className="flex gap-2">
      <button 
        onClick={onDownloadPDF}
        className="flex-1 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
      >
        <Download size={16} /> PDF
      </button>
      <button 
        onClick={onDownloadWord}
        className="flex-1 py-2 bg-green-600 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2"
      >
        <FileText size={16} /> WORD
      </button>
    </div>
  </div>
);
