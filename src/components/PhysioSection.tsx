import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, ClipboardList, LineChart, 
  Dumbbell, Calendar, FileText, Settings, 
  Plus, Search, Filter, MoreVertical, 
  ChevronRight, AlertCircle, CheckCircle2, 
  Clock, MapPin, Phone, Mail, 
  User as UserIcon, Camera, Trash2, Edit2, Eye, 
  Download, Printer, Share2, X, Target,
  Heart, Shield, Info, ArrowLeft,
  Star, MessageSquare, Bell,
  Stethoscope, Activity, TrendingUp,
  UserCircle, LogOut, Moon, Sun, Loader2, Zap
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeReplace } from '../lib/utils';
import { ROLE_LABELS } from '../constants';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { extractFormData, fixGrammar } from '../services/geminiService';
import { PhysioPatient, PhysioAssessment, PhysioEvolution, PhysioExercise, PhysioAppointment, User as UserType, Elderly } from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface PhysioSectionProps {
  user: UserType;
  elderly: Elderly[];
  patients: PhysioPatient[];
  assessments: PhysioAssessment[];
  evolutions: PhysioEvolution[];
  exercises: PhysioExercise[];
  appointments: PhysioAppointment[];
  professionals?: any[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onSavePatient: (data: Omit<PhysioPatient, 'id'>, id?: string) => Promise<void>;
  onDeletePatient: (id: string) => Promise<void>;
  onSaveAssessment: (data: Omit<PhysioAssessment, 'id'>, id?: string) => Promise<void>;
  onSaveEvolution: (data: Omit<PhysioEvolution, 'id'>, id?: string) => Promise<void>;
  onSaveExercise: (data: Omit<PhysioExercise, 'id'>, id?: string) => Promise<void>;
  onSaveAppointment: (data: Omit<PhysioAppointment, 'id'>, id?: string) => Promise<void>;
  onDeleteRecord: (collectionName: string, id: string) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  onUpdateProfile?: (data: Partial<UserType>) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

export const PhysioSection = ({ 
  user, 
  elderly,
  patients, 
  assessments, 
  evolutions, 
  exercises, 
  appointments,
  professionals = [],
  showToast,
  onSavePatient,
  onDeletePatient,
  onSaveAssessment,
  onSaveEvolution,
  onSaveExercise,
  onSaveAppointment,
  onDeleteRecord,
  onSavePhotos,
  theme,
  setTheme,
  onLogout,
  onUpdateProfile
}: PhysioSectionProps) => {
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const saved = localStorage.getItem('oami-physio-tab');
    return saved || 'dashboard';
  });
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PhysioPatient | null>(null);
  const [editingData, setEditingData] = useState<any>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [evolutionPatientFilter, setEvolutionPatientFilter] = useState('');
  const [assessmentPatientFilter, setAssessmentPatientFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'patient' | 'assessment' | 'evolution' | 'exercise' | 'appointment' } | null>(null);
  const [viewingEvo, setViewingEvo] = useState<PhysioEvolution | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportPatientId, setReportPatientId] = useState('');
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

  const filteredPatients = useMemo(() => {
    return (patients || []).filter(p => 
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.diagnosis || '').toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

  useEffect(() => {
    localStorage.setItem('oami-physio-tab', activeSubTab);
  }, [activeSubTab]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !onUpdateProfile) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await onUpdateProfile({ photoUrl: base64String });
    };
    reader.readAsDataURL(file);
  };

  const handleGeneratePatientPDF = async () => {
    if (!reportPatientId) {
      showToast('Selecione um paciente para gerar o prontuário', 'error');
      return;
    }

    const patient = (patients || []).find(p => p.id === reportPatientId);
    if (!patient) return;

    const patientAssessments = (assessments || []).filter(a => a.patientId === reportPatientId);
    const patientEvolutions = (evolutions || []).filter(e => e.patientId === reportPatientId);

    const data: any[] = [
      ['Nome', patient.name],
      ['Idade', patient.age],
      ['Diagnóstico Principal', patient.diagnosis],
      ['Categoria', patient.category],
      ['Telefone', patient.phone],
      ['', ''],
      ['AVALIAÇÕES FISIOTERAPÊUTICAS', ''],
    ];

    patientAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(a => {
      data.push([{ content: `Avaliação em ${format(parseISO(a.date), 'dd/MM/yyyy')}`, colSpan: 2, styles: { fillColor: [200, 200, 200], fontStyle: 'bold' } }]);
      if (a.complaint) data.push(['Queixa Principal', a.complaint]);
      if (a.medicalDiagnosis) data.push(['Diagnóstico Médico', a.medicalDiagnosis]);
      if (a.hda) data.push(['HDA', a.hda]);
      if (a.hpp) data.push(['HPP', a.hpp]);
      if (a.currentMedications) data.push(['Medicações', a.currentMedications]);
      if (a.complementaryExams) data.push(['Exames', a.complementaryExams]);
      if (a.vitals) {
        const v = a.vitals;
        data.push(['Sinais Vitais', `FC: ${v.heartRate || '---'} bpm, FR: ${v.respRate || '---'} irpm, PA: ${v.bloodPressure || '---'}`]);
      }
      if (a.inspectionPalpation) data.push(['Inspeção/Palpação', a.inspectionPalpation]);
      if (a.motionLimitation) data.push(['Limitação Adm', a.motionLimitation]);
      if (a.specificTests) data.push(['Testes Específicos', a.specificTests]);
      if (a.functionalDiagnosis) data.push(['Diagnóstico Funcional', a.functionalDiagnosis]);
      if (a.treatmentObjectives) data.push(['Objetivos', a.treatmentObjectives]);
      if (a.treatmentPlan) data.push(['Plano', a.treatmentPlan]);
      data.push(['Escala de Dor', `${a.painScale}/10`]);
      data.push(['Risco de Queda', a.fallRisk || 'N/A']);
      data.push(['', '']);
    });

    data.push(['EVOLUÇÕES DIÁRIAS', '']);
    patientEvolutions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(e => {
      data.push([format(parseISO(e.date), 'dd/MM/yyyy'), `Evolução: ${e.evolution}\nProcedimentos: ${e.procedures}`]);
    });

    await generateModernPDF({
      title: `Prontuário de Fisioterapia - ${patient.name}`,
      subtitle: `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      columns: ['Campo/Data', 'Descrição/Informação'],
      data,
      fileName: `prontuario_${safeReplace(patient.name.toLowerCase(), /\s/g, '_')}`
    });
  };

  const handleGenerateActivityPDF = async () => {
    const [year, month] = reportMonth.split('-');
    const monthEvolutions = evolutions.filter(e => {
      const date = parseISO(e.date);
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
    });

    const data = monthEvolutions.map(e => {
      const patient = (patients || []).find(p => p.id === e.patientId);
      return [
        format(parseISO(e.date), 'dd/MM/yyyy'),
        patient?.name || 'N/A',
        e.procedures,
        e.evolution
      ];
    });

    await generateModernPDF({
      title: `Relatório de Atividades - ${format(parseISO(`${reportMonth}-01`), 'MMMM/yyyy', { locale: ptBR })}`,
      subtitle: `Resumo mensal de atendimentos de fisioterapia`,
      columns: ['Data', 'Paciente', 'Procedimentos', 'Evolução'],
      data,
      fileName: `relatorio_atividades_${reportMonth}`
    });
  };

  const handleGeneratePatientWord = async () => {
    if (!reportPatientId) {
      showToast('Selecione um paciente para gerar o prontuário', 'error');
      return;
    }
    const patient = (patients || []).find(p => p.id === reportPatientId);
    if (!patient) return;

    const patientAssessments = (assessments || []).filter(a => a.patientId === reportPatientId);
    const patientEvolutions = (evolutions || []).filter(e => e.patientId === reportPatientId);

    const data: any[][] = [
      ['Nome', patient.name],
      ['Idade', String(patient.age)],
      ['Diagnóstico Principal', patient.diagnosis],
      ['Categoria', patient.category],
      ['Telefone', patient.phone],
      ['', ''],
      ['AVALIAÇÕES FISIOTERAPÊUTICAS', ''],
    ];

    patientAssessments.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(a => {
      data.push([`Avaliação em ${format(parseISO(a.date), 'dd/MM/yyyy')}`, '']);
      if (a.complaint) data.push(['Queixa Principal', a.complaint]);
      if (a.medicalDiagnosis) data.push(['Diagnóstico Médico', a.medicalDiagnosis]);
      if (a.hda) data.push(['HDA', a.hda]);
      if (a.currentMedications) data.push(['Medicações', a.currentMedications]);
      if (a.functionalDiagnosis) data.push(['Diagnóstico Funcional', a.functionalDiagnosis]);
      if (a.treatmentPlan) data.push(['Plano', a.treatmentPlan]);
      data.push(['Escala de Dor', `${a.painScale}/10`]);
      data.push(['', '']);
    });

    data.push(['EVOLUÇÕES DIÁRIAS', '']);
    patientEvolutions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).forEach(e => {
      data.push([format(parseISO(e.date), 'dd/MM/yyyy'), `Evolução: ${e.evolution}\nProcedimentos: ${e.procedures}`]);
    });

    await generateModernWord({
      title: `Prontuário de Fisioterapia - ${patient.name}`,
      subtitle: `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      columns: ['Campo/Data', 'Descrição/Informação'],
      data,
      fileName: `prontuario_${safeReplace(patient.name.toLowerCase(), /\s/g, '_')}`
    });
  };

  const handleGenerateActivityWord = async () => {
    const [year, month] = reportMonth.split('-');
    const monthEvolutions = evolutions.filter(e => {
      const date = parseISO(e.date);
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
    });

    const data = monthEvolutions.map(e => {
      const patient = (patients || []).find(p => p.id === e.patientId);
      return [
        format(parseISO(e.date), 'dd/MM/yyyy'),
        patient?.name || 'N/A',
        e.procedures,
        e.evolution
      ];
    });

    await generateModernWord({
      title: `Relatório de Atividades - ${format(parseISO(`${reportMonth}-01`), 'MMMM/yyyy', { locale: ptBR })}`,
      subtitle: `Resumo mensal de atendimentos de fisioterapia`,
      columns: ['Data', 'Paciente', 'Procedimentos', 'Evolução'],
      data,
      fileName: `relatorio_atividades_${reportMonth}`
    });
  };

    const stats = useMemo(() => {
    const patientsList = patients || [];
    const appointmentsList = appointments || [];
    const evolutionsList = evolutions || [];
    const assessmentsList = assessments || [];

    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAppointments = (appointmentsList || []).filter(a => a.date === today);
    const pendingEvolutions = (todayAppointments || []).filter(a => a.status === 'ATENDIDO' && !(evolutionsList || []).some(e => e.patientId === a.patientId && e.date === today)).length;
    
    return {
      totalPatients: patientsList.length,
      todayAppointments: todayAppointments.length,
      pendingEvolutions,
      highPainAlerts: (assessmentsList || []).filter(a => a.painScale >= 7).length
    };
  }, [patients, appointments, evolutions, assessments]);

  const weeklyAttendanceData = useMemo(() => {
    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    return days.map((day, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      const dateStr = dayDate.toISOString().split('T')[0];
      
      const count = (evolutions || []).filter(e => e.date.startsWith(dateStr)).length;
      return { name: day, total: count };
    });
  }, [evolutions]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'patients', label: 'Pacientes', icon: Users },
    { id: 'assessment', label: 'Avaliação', icon: ClipboardList },
    { id: 'evolution', label: 'Evolução', icon: LineChart },
    { id: 'exercises', label: 'Exercícios', icon: Dumbbell },
    { id: 'agenda', label: 'Agenda', icon: Calendar },
    { id: 'reports', label: 'Relatórios', icon: FileText },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8 min-h-[80vh]">
      {/* Internal Navigation */}
      <aside className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar snap-x scroll-smooth sticky top-0 bg-gray-50 dark:bg-gray-950 z-10 lg:static lg:bg-transparent">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSubTab(item.id)}
            className={cn(
              "flex-shrink-0 lg:w-full flex items-center gap-3 px-6 lg:px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap snap-start group",
              activeSubTab === item.id 
                ? "bg-green-600 text-white shadow-xl shadow-green-100 dark:shadow-none translate-x-0 lg:translate-x-1" 
                : "text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-gray-800"
            )}
          >
            <div className={cn("transition-transform group-hover:scale-110", activeSubTab === item.id ? "text-white" : "text-gray-400 group-hover:text-green-600")}>
              <item.icon size={18} />
            </div>
            {item.label}
          </button>
        ))}
      </aside>

      {/* Content Area */}
      <div className="flex-1">
        <AnimatePresence mode="wait">
          {activeSubTab === 'dashboard' && (
            <motion.div
              key="dashboard"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard 
                  title="Pacientes" 
                  value={stats.totalPatients} 
                  icon={Users} 
                  color="blue" 
                  subtitle="Total cadastrados"
                />
                <StatCard 
                  title="Atendimentos" 
                  value={stats.todayAppointments} 
                  icon={Calendar} 
                  color="green" 
                  subtitle="Agendados para hoje"
                />
                <StatCard 
                  title="Evoluções" 
                  value={stats.pendingEvolutions} 
                  icon={Edit2} 
                  color="orange" 
                  subtitle="Pendentes hoje"
                />
                <StatCard 
                  title="Alertas" 
                  value={stats.highPainAlerts} 
                  icon={AlertCircle} 
                  color="red" 
                  subtitle="Dor alta / Faltas"
                />
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Atendimentos da Semana</h3>
                  <div style={{ width: '100%', height: 300 }}>
                    <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                      <BarChart data={weeklyAttendanceData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                        <XAxis dataKey="name" axisLine={false} tickLine={false} />
                        <YAxis axisLine={false} tickLine={false} />
                        <Tooltip cursor={{ fill: '#f9fafb' }} />
                        <Bar dataKey="total" fill="#10b981" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Alertas Inteligentes</h3>
                  <div className="space-y-4">
                    {stats.highPainAlerts > 0 ? (
                      <div className="flex items-start gap-4 p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl">
                        <AlertCircle className="text-red-600 dark:text-red-400 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-sm font-bold text-red-800 dark:text-red-300">Pacientes com Dor Alta</p>
                          <p className="text-xs text-red-600 dark:text-red-400 mt-1">Existem {stats.highPainAlerts} pacientes relatando dor acima de 7.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-900/30 rounded-2xl">
                        <CheckCircle2 className="text-green-600 dark:text-green-400 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-sm font-bold text-green-800 dark:text-green-300">Tudo em dia</p>
                          <p className="text-xs text-green-600 dark:text-green-400 mt-1">Nenhum alerta crítico no momento.</p>
                        </div>
                      </div>
                    )}
                    
                    {stats.pendingEvolutions > 0 && (
                      <div className="flex items-start gap-4 p-4 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-2xl">
                        <Edit2 className="text-orange-600 dark:text-orange-400 flex-shrink-0" size={20} />
                        <div>
                          <p className="text-sm font-bold text-orange-800 dark:text-orange-300">Evoluções Pendentes</p>
                          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1">Você tem {stats.pendingEvolutions} atendimentos sem evolução registrada hoje.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'patients' && (
            <motion.div
              key="patients"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Pacientes</h2>
                  <p className="text-gray-500 dark:text-gray-400">Gestão de prontuários e diagnósticos</p>
                </div>
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className="relative flex-1 md:w-64">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input 
                      type="text"
                      placeholder="Buscar paciente..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-sm"
                    />
                  </div>
                  <button 
                    onClick={() => {
                      setSelectedPatient(null);
                      setIsPatientModalOpen(true);
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 whitespace-nowrap"
                  >
                    <Plus size={20} />
                    Novo Paciente
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                {(filteredPatients || []).map((patient) => {
                  const linkedElder = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                  const displayName = linkedElder ? linkedElder.name : patient.name;
                  
                  let displayAge = patient.age;
                  if (linkedElder) {
                    const birthDate = parseISO(linkedElder.birthDate);
                    displayAge = new Date().getFullYear() - birthDate.getFullYear();
                  }

                  return (
                    <div key={patient.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900/30 transition-all group">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 overflow-hidden">
                            {patient.photoUrl || (linkedElder && linkedElder.photoUrl) ? (
                              <img src={linkedElder?.photoUrl || patient.photoUrl} alt={displayName} className="w-full h-full object-cover" />
                            ) : (
                              <UserIcon size={28} />
                            )}
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-green-600 transition-colors uppercase truncate max-w-[150px]">{displayName}</h4>
                            <div className="flex items-center gap-2">
                              <p className="text-xs text-gray-500 dark:text-gray-400">{displayAge} anos • {patient.category}</p>
                              {linkedElder && <span className="text-[8px] bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded-full font-black uppercase">Vinculado</span>}
                            </div>
                          </div>
                        </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={() => {
                            setSelectedPatient(patient);
                            setIsPatientModalOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button 
                          onClick={() => onDeletePatient(patient.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
                        <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Diagnóstico</p>
                        <p className="text-xs text-gray-700 dark:text-gray-300 line-clamp-2">{patient.diagnosis}</p>
                      </div>
                      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 px-1">
                        <div className="flex items-center gap-1">
                          <Phone size={12} />
                          {patient.phone}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock size={12} />
                          Desde {format(parseISO(patient.createdAt), 'MM/yy')}
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
                {(filteredPatients || []).length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-gray-700">
                      <Users size={40} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 italic">Nenhum paciente encontrado.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'assessment' && (
            <motion.div
              key="assessment"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Ficha de Avaliação</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-gray-500 dark:text-gray-400">Avaliação física e funcional completa</p>
                    <select
                      value={assessmentPatientFilter}
                      onChange={(e) => setAssessmentPatientFilter(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    >
                      <option value="">Filtrar p/ Idoso</option>
                      {(patients || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => { setEditingData(null); setIsDetailView(false); setIsAssessmentModalOpen(true); }}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Iniciar Avaliação
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {(assessments || []).filter(a => !assessmentPatientFilter || a.patientId === assessmentPatientFilter).map((a) => {
                  const patient = (patients || []).find(p => p.id === a.patientId);
                  return (
                    <div 
                      key={a.id} 
                      className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900/30 transition-all group cursor-pointer"
                      onClick={() => { setEditingData(a); setIsDetailView(true); setIsAssessmentModalOpen(true); }}
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400">
                            <ClipboardList size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-green-600 transition-colors line-clamp-1">{patient?.name || 'N/A'}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{format(parseISO(a.date), 'dd/MM/yyyy')}</p>
                          </div>
                        </div>
                        <div className="flex gap-1" onClick={e => e.stopPropagation()}>
                          <button onClick={() => { setEditingData(a); setIsDetailView(true); setIsAssessmentModalOpen(true); }} className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <FileText size={18} />
                          </button>
                          <button onClick={() => { setEditingData(a); setIsDetailView(false); setIsAssessmentModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors">
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => setDeleteConfirm({ id: a.id, type: 'assessment' })} className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Escala de Dor</p>
                          <div className="flex items-center gap-2">
                             <span className={cn(
                              "text-sm font-bold",
                              a.painScale >= 7 ? "text-red-600" : a.painScale >= 4 ? "text-orange-600" : "text-green-600"
                            )}>
                              {a.painScale}/10
                            </span>
                            <div className="flex-1 h-1.5 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div 
                                className={cn(
                                  "h-full rounded-full transition-all",
                                  a.painScale >= 7 ? "bg-red-600" : a.painScale >= 4 ? "bg-orange-600" : "bg-green-600"
                                )}
                                style={{ width: `${a.painScale * 10}%` }}
                              />
                            </div>
                          </div>
                        </div>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Risco de Queda</p>
                          <span className={cn(
                            "text-xs font-bold uppercase",
                            a.fallRisk === 'ALTO' ? "text-red-600" : a.fallRisk === 'MEDIO' ? "text-orange-600" : "text-green-600"
                          )}>
                            {a.fallRisk || 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {(assessments || []).length === 0 && (
                  <div className="col-span-full py-20 text-center space-y-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800">
                    <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-gray-700">
                      <ClipboardList size={40} />
                    </div>
                    <p className="text-gray-500 dark:text-gray-400 italic">Nenhuma avaliação encontrada.</p>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'evolution' && (
            <motion.div
              key="evolution"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Evolução do Paciente</h2>
                  <div className="flex items-center gap-3 mt-1">
                    <p className="text-gray-500 dark:text-gray-400">Registro diário de sessões e progresso</p>
                    <select
                      value={evolutionPatientFilter}
                      onChange={(e) => setEvolutionPatientFilter(e.target.value)}
                      className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                    >
                      <option value="">Filtrar p/ Idoso</option>
                      {(patients || []).map(p => (
                        <option key={p.id} value={p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <button 
                  onClick={() => setIsEvolutionModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Nova Evolução
                </button>
              </div>

              <div className="space-y-4">
                {(evolutions || []).filter(e => !evolutionPatientFilter || e.patientId === evolutionPatientFilter).map((e) => {
                  const patient = (patients || []).find(p => p.id === e.patientId);
                  return (
                    <div key={e.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                            <Activity size={20} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">{patient?.name || 'N/A'}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{format(parseISO(e.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={() => setViewingEvo(e)} 
                            className="p-2 text-green-650 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                            title="Visualizar 👁️"
                          >
                            <Eye size={16} />
                          </button>
                          <button onClick={() => { setEditingData(e); setIsEvolutionModalOpen(true); }} className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors" title="Editar ✏️">
                            <Edit2 size={16} />
                          </button>
                          <button 
                            onClick={(ev) => {
                              ev.stopPropagation();
                              setDeleteConfirm({ id: e.id, type: 'evolution' });
                            }} 
                            className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                            title="Excluir 🗑️"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                        {e.painLevel !== undefined && (
                          <div className="text-right">
                            <p className="text-[10px] font-bold text-gray-400 uppercase">Dor Relatada</p>
                            <p className="text-sm font-bold text-red-600">{e.painLevel}/10</p>
                          </div>
                        )}
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                          <p className="text-[10px] font-bold text-gray-400 uppercase mb-2">Procedimentos</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{e.procedures}</p>
                        </div>
                        <div className="p-4 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/20">
                          <p className="text-[10px] font-bold text-green-600 uppercase mb-2">Evolução</p>
                          <p className="text-sm text-gray-700 dark:text-gray-300">{e.evolution}</p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'exercises' && (
            <motion.div
              key="exercises"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Exercícios e Protocolos</h2>
                  <p className="text-gray-500 dark:text-gray-400">Biblioteca de reabilitação</p>
                </div>
                <button 
                  onClick={() => setIsExerciseModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Novo Exercício
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {exercises.map((ex) => (
                  <div key={ex.id} className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden group">
                    <div className="h-40 bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative">
                      {ex.imageUrl ? (
                        <img src={ex.imageUrl} alt={ex.title} className="w-full h-full object-cover" />
                      ) : (
                        <Dumbbell size={48} className="text-gray-300 dark:text-gray-700" />
                      )}
                      <div className="absolute top-4 left-4 flex gap-2">
                        <button onClick={() => { setEditingData(ex); setIsExerciseModalOpen(true); }} className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-blue-600 shadow-sm transition-all hover:scale-110">
                          <Edit2 size={14} />
                        </button>
                        <button onClick={() => setDeleteConfirm({ id: ex.id, type: 'exercise' })} className="p-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-red-600 shadow-sm transition-all hover:scale-110">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="absolute top-4 right-4 px-3 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-full text-[10px] font-bold text-green-600 uppercase">
                        {ex.category}
                      </div>
                    </div>
                    <div className="p-6 space-y-3">
                      <h4 className="font-bold text-gray-800 dark:text-white">{ex.title}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-2">{ex.description}</p>
                      <button className="w-full py-3 bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-600 transition-all">
                        Associar ao Paciente
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {activeSubTab === 'agenda' && (
            <motion.div
              key="agenda"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Agenda de Atendimentos</h2>
                  <p className="text-gray-500 dark:text-gray-400">Controle de horários e presenças</p>
                </div>
                <button 
                  onClick={() => setIsAppointmentModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Agendar Sessão
                </button>
              </div>

              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
                <div className="flex items-center justify-between mb-8">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white">Hoje, {format(new Date(), "dd 'de' MMMM", { locale: ptBR })}</h3>
                  <div className="flex gap-2">
                    <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight className="rotate-180" size={20} /></button>
                    <button className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"><ChevronRight size={20} /></button>
                  </div>
                </div>

                <div className="space-y-4">
                  {appointments.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).sort((a, b) => a.time.localeCompare(b.time)).map((a) => {
                    const patient = (patients || []).find(p => p.id === a.patientId);
                    return (
                      <div key={a.id} className="flex items-center gap-6 p-4 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded-2xl transition-all border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                        <div className="w-20 text-center">
                          <p className="text-lg font-bold text-gray-800 dark:text-white">{a.time}</p>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Horário</p>
                        </div>
                        <div className="flex-1 flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                            <UserIcon size={24} />
                          </div>
                          <div>
                            <h4 className="font-bold text-gray-800 dark:text-white">{patient?.name || 'N/A'}</h4>
                            <p className="text-xs text-gray-500 dark:text-gray-400">{patient?.diagnosis || 'Sem diagnóstico'}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className={cn(
                            "px-3 py-1 rounded-full text-[10px] font-bold uppercase",
                            a.status === 'ATENDIDO' ? "bg-green-100 text-green-600" : a.status === 'FALTOU' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
                          )}>
                            {a.status}
                          </span>
                          <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors">
                            <MoreVertical size={20} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                  {(appointments || []).filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length === 0 && (
                    <div className="py-12 text-center text-gray-400 italic">
                      Nenhum atendimento agendado para hoje.
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'reports' && (
            <motion.div
              key="reports"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8"
            >
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios e Documentos</h2>
                  <p className="text-gray-500 dark:text-gray-400">Exportação de dados e prontuários em PDF</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                    <FileText size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Prontuário Completo</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Gere um PDF com todo o histórico, avaliações e evoluções do paciente.</p>
                  </div>
                  <div className="space-y-4">
                    <select 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                      value={reportPatientId}
                      onChange={(e) => setReportPatientId(e.target.value)}
                    >
                      <option value="">Selecionar Paciente...</option>
                      {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                    <div className="flex gap-4">
                      <button 
                        onClick={handleGeneratePatientPDF}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
                      >
                        <Download size={20} />
                        PDF
                      </button>
                      <button 
                        onClick={handleGeneratePatientWord}
                        className="flex-1 flex items-center justify-center gap-2 bg-blue-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-600 transition-all"
                      >
                        <FileText size={20} />
                        Word
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
                  <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white">Relatório de Atividades</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Resumo mensal de atendimentos, faltas e produtividade.</p>
                  </div>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <input 
                        type="month" 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white" 
                        value={reportMonth}
                        onChange={(e) => setReportMonth(e.target.value)}
                      />
                      <div className="flex gap-4">
                        <button 
                          onClick={handleGenerateActivityPDF}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 transition-all"
                        >
                          <Download size={20} />
                          PDF
                        </button>
                        <button 
                          onClick={handleGenerateActivityWord}
                          className="flex-1 flex items-center justify-center gap-2 bg-green-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-600 transition-all"
                        >
                          <FileText size={20} />
                          Word
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeSubTab === 'settings' && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-2xl mx-auto space-y-8"
            >
              <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-8">
                <div className="flex items-center gap-6">
                  <div className="relative group">
                    <div className="w-24 h-24 rounded-3xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center overflow-hidden border-4 border-white dark:border-gray-800 shadow-lg">
                      {user.photoUrl ? (
                        <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <UserCircle className="text-green-600 dark:text-green-400" size={48} />
                      )}
                    </div>
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handlePhotoChange} 
                      className="hidden" 
                      accept="image/*" 
                    />
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute -bottom-2 -right-2 p-2 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all"
                    >
                      <Camera size={16} />
                    </button>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">{user.name}</h3>
                    <p className="text-gray-500 dark:text-gray-400">Fisioterapeuta • OAMI</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Profissional</label>
                      <input 
                        type="text" 
                        defaultValue={user.name}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Registro (CREFITO)</label>
                      <input 
                        type="text" 
                        defaultValue={user.registrationNumber || ''}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      {theme === 'light' ? <Sun className="text-orange-500" /> : <Moon className="text-blue-500" />}
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">Tema do Sistema</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Alternar entre claro e escuro</p>
                      </div>
                    </div>
                    <button 
                      onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
                      className={cn(
                        "w-12 h-6 rounded-full p-1 transition-colors",
                        theme === 'dark' ? "bg-green-600" : "bg-gray-300"
                      )}
                    >
                      <div className={cn(
                        "w-4 h-4 bg-white rounded-full transition-transform",
                        theme === 'dark' ? "translate-x-6" : "translate-x-0"
                      )} />
                    </button>
                  </div>

                  <button 
                    onClick={onLogout}
                    className="w-full flex items-center justify-center gap-2 p-4 text-red-600 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all border border-red-100 dark:border-red-900/30"
                  >
                    <LogOut size={20} />
                    Sair do Sistema
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Patient Modal */}
      <AnimatePresence>
        {isPatientModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 md:p-4" onClick={() => setIsPatientModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white sticky top-0 z-10 shrink-0">
                <h3 className="text-xl md:text-2xl font-black">{selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}</h3>
                <button onClick={() => setIsPatientModalOpen(false)} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <PatientForm 
                  elderly={elderly}
                  initialData={selectedPatient} 
                  onSave={async (data) => {
                    await onSavePatient(data, selectedPatient?.id);
                    setIsPatientModalOpen(false);
                  }}
                  onCancel={() => setIsPatientModalOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isAssessmentModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 md:p-4" onClick={() => { setIsAssessmentModalOpen(false); setEditingData(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white sticky top-0 z-10 shrink-0">
                <h3 className="text-xl md:text-2xl font-black">{isDetailView ? 'Detalhes da Avaliação' : (editingData ? 'Editar Avaliação' : 'Nova Avaliação')}</h3>
                <div className="flex items-center gap-2">
                  {isDetailView && (
                    <>
                      <button 
                        onClick={() => setIsDetailView(false)} 
                        className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button 
                        onClick={() => { 
                          setDeleteConfirm({ id: editingData?.id || '', type: 'assessment' }); 
                          setIsAssessmentModalOpen(false); 
                        }} 
                        className="p-3 bg-red-500/20 rounded-2xl hover:bg-red-500/40 transition-colors text-red-100"
                        title="Excluir"
                      >
                        <Trash2 size={20} />
                      </button>
                    </>
                  )}
                  <button onClick={() => { setIsAssessmentModalOpen(false); setEditingData(null); setIsDetailView(false); }} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors">
                    <X size={20} />
                  </button>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <AssessmentForm 
                  patients={patients}
                  initialData={editingData}
                  isDetailView={isDetailView}
                  onSave={async (data) => {
                    await onSaveAssessment(data, editingData?.id);
                    // Stay open and switch to detail view
                    setIsDetailView(true);
                  }}
                  onCancel={() => { setIsAssessmentModalOpen(false); setEditingData(null); setIsDetailView(false); }}
                  onSavePhotos={onSavePhotos}
                  onDeleteRecord={onDeleteRecord}
                  onEdit={() => setIsDetailView(false)}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isEvolutionModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 md:p-4" onClick={() => { setIsEvolutionModalOpen(false); setEditingData(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white sticky top-0 z-10 shrink-0">
                <h3 className="text-xl md:text-2xl font-black">{editingData ? 'Editar Evolução' : 'Nova Evolução'}</h3>
                <button onClick={() => { setIsEvolutionModalOpen(false); setEditingData(null); }} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <EvolutionForm 
                  patients={patients}
                  showToast={showToast}
                  initialData={editingData}
                  professionals={professionals}
                  user={user}
                  onSave={async (data) => {
                    await onSaveEvolution(data, editingData?.id);
                    setIsEvolutionModalOpen(false);
                    setEditingData(null);
                  }}
                  onCancel={() => { setIsEvolutionModalOpen(false); setEditingData(null); }}
                  onSavePhotos={onSavePhotos}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isExerciseModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 md:p-4" onClick={() => { setIsExerciseModalOpen(false); setEditingData(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white sticky top-0 z-10 shrink-0">
                <h3 className="text-xl md:text-2xl font-black">{editingData ? 'Editar Exercício' : 'Novo Exercício'}</h3>
                <button onClick={() => { setIsExerciseModalOpen(false); setEditingData(null); }} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <ExerciseForm 
                  initialData={editingData}
                  onSave={async (data) => {
                    await onSaveExercise(data, editingData?.id);
                    setIsExerciseModalOpen(false);
                    setEditingData(null);
                  }}
                  onCancel={() => { setIsExerciseModalOpen(false); setEditingData(null); }}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isAppointmentModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-2 md:p-4" onClick={() => { setIsAppointmentModalOpen(false); setEditingData(null); }}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[95vh] md:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white sticky top-0 z-10 shrink-0">
                <h3 className="text-xl md:text-2xl font-black">{editingData ? 'Editar Agendamento' : 'Novo Agendamento'}</h3>
                <button onClick={() => { setIsAppointmentModalOpen(false); setEditingData(null); }} className="p-3 bg-white/20 rounded-2xl hover:bg-white/30 transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-6 md:p-8">
                <AppointmentForm 
                  patients={patients}
                  initialData={editingData}
                  onSave={async (data) => {
                    await onSaveAppointment(data, editingData?.id);
                    setIsAppointmentModalOpen(false);
                    setEditingData(null);
                  }}
                  onCancel={() => { setIsAppointmentModalOpen(false); setEditingData(null); }}
                />
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-sm w-full text-center space-y-6"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mx-auto text-red-600 dark:text-red-400">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Confirmar Exclusão</h3>
                <p className="text-gray-500 dark:text-gray-400 mt-2">Deseja realmente excluir este registro? Esta ação não pode ser desfeita.</p>
              </div>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 font-bold text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    if (deleteConfirm.type === 'patient') {
                      await onDeletePatient(deleteConfirm.id);
                    } else {
                      const collections = {
                        assessment: 'physioAssessments',
                        evolution: 'physioEvolutions',
                        exercise: 'physioExercises',
                        appointment: 'physioAppointments'
                      };
                      await onDeleteRecord(collections[deleteConfirm.type], deleteConfirm.id);
                    }
                    setDeleteConfirm(null);
                  }}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-2xl shadow-lg hover:bg-red-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {viewingEvo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-lg w-full space-y-6 max-h-[85vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-green-600">
                  <Activity size={24} />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detalhes da Evolução</h3>
                </div>
                <button onClick={() => setViewingEvo(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Paciente</span>
                  <p className="text-base font-bold text-gray-800 dark:text-white">
                    {(patients || []).find(p => p.id === viewingEvo.patientId)?.name || 'N/A'}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {format(parseISO(viewingEvo.date), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </div>
                  {viewingEvo.painLevel !== undefined && (
                    <div>
                      <span className="text-[10px] font-black uppercase text-gray-400">Nível de Dor</span>
                      <p className="text-sm font-bold text-red-600">{viewingEvo.painLevel}/10</p>
                    </div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Evolução Clínica</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed whitespace-pre-wrap mt-1">
                    {viewingEvo.evolution}
                  </p>
                </div>

                {viewingEvo.procedures && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Procedimentos Realizados</span>
                    <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                      {viewingEvo.procedures}
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
                  className="px-6 py-2.5 bg-green-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-green-700 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, subtitle }: { title: string, value: number, icon: any, color: string, subtitle: string }) => {
  const colors = {
    blue: "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-blue-100 dark:border-blue-900/30",
    green: "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-100 dark:border-green-900/30",
    orange: "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 border-orange-100 dark:border-orange-900/30",
    red: "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-100 dark:border-red-900/30",
  };

  return (
    <div className={cn("p-6 rounded-3xl border shadow-sm space-y-4", colors[color as keyof typeof colors])}>
      <div className="flex justify-between items-start">
        <div className="p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm">
          <Icon size={24} />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider opacity-60">{title}</span>
      </div>
      <div>
        <p className="text-3xl font-bold">{value}</p>
        <p className="text-[10px] font-medium opacity-60 mt-1">{subtitle}</p>
      </div>
    </div>
  );
};

const PatientForm = ({ elderly, initialData, onSave, onCancel }: { elderly: Elderly[], initialData: PhysioPatient | null, onSave: (data: Omit<PhysioPatient, 'id'>) => Promise<void>, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Omit<PhysioPatient, 'id'>>({
    elderlyId: initialData?.elderlyId || '',
    name: initialData?.name || '',
    age: initialData?.age || 0,
    diagnosis: initialData?.diagnosis || '',
    phone: initialData?.phone || '',
    photoUrl: initialData?.photoUrl || '',
    photos: initialData?.photos || [],
    observations: initialData?.observations || '',
    category: initialData?.category || 'ORTOPEDIA',
    createdAt: initialData?.createdAt || new Date().toISOString()
  });
  const [isExtracting, setIsExtracting] = useState(false);

  const linkedElderly = useMemo(() => 
    formData.elderlyId ? (elderly || []).find(e => e.id === formData.elderlyId) : null,
  [formData.elderlyId, elderly]);

  useEffect(() => {
    if (linkedElderly) {
      const birthDate = parseISO(linkedElderly.birthDate);
      const age = new Date().getFullYear() - birthDate.getFullYear();
      setFormData(prev => ({
        ...prev,
        name: linkedElderly.name,
        age: age,
        diagnosis: linkedElderly.diagnoses || prev.diagnosis,
        phone: linkedElderly.phone || linkedElderly.responsiblePhone || prev.phone,
        observations: linkedElderly.physicalLimitations || prev.observations
      }));
    }
  }, [linkedElderly]);

  const handleDigitize = async (text: string) => {
    if (!text) return;
    setIsExtracting(true);
    try {
      const extractedData = await extractFormData(text, "name, age (number), diagnosis, phone, category (ORTOPEDIA, NEUROLOGIA, RESPIRATORIA, GERIATRIA), observations");
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData(prev => ({ ...prev, ...extractedData }));
      } else {
        setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis || '') + '\n' + text }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Vincular ao Cadastro Geral (Idosos)</label>
        <select
          value={formData.elderlyId}
          onChange={e => setFormData({ ...formData, elderlyId: e.target.value })}
          className="w-full p-4 bg-green-50 dark:bg-green-900/10 border border-green-100 dark:border-green-900/30 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white font-bold"
        >
          <option value="">-- Não vinculado / Novo Cadastro --</option>
          {(elderly || []).map(e => (
            <option key={e.id} value={e.id}>{e.name} (Entrada: {format(parseISO(e.entryDate), 'dd/MM/yyyy')})</option>
          ))}
        </select>
        <p className="text-[10px] text-gray-500 ml-1 italic">Ao vincular, os dados de nome, idade e CPF serão sincronizados automaticamente.</p>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
        <input 
          type="text" 
          value={formData.name}
          readOnly={!!formData.elderlyId}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className={cn(
            "w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white",
            formData.elderlyId && "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900"
          )}
          placeholder="Ex: Maria Oliveira"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Idade</label>
          <input 
            type="number" 
            value={formData.age || ''}
            readOnly={!!formData.elderlyId}
            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
            className={cn(
              "w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white",
              formData.elderlyId && "opacity-60 cursor-not-allowed bg-gray-100 dark:bg-gray-900"
            )}
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
          <input 
            type="text" 
            value={formData.phone}
            onChange={e => setFormData({ ...formData, phone: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
            placeholder="(00) 00000-0000"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
        <select 
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value as any })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
        >
          <option value="ORTOPEDIA">Ortopedia</option>
          <option value="NEUROLOGICO">Neurológico</option>
          <option value="IDOSOS">Idosos (Geriatria)</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Diagnóstico Clínico</label>
          <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis || '') + ' ' + t }))} />
        </div>
        <textarea 
          value={formData.diagnosis}
          onChange={e => setFormData({ ...formData, diagnosis: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Descreva o diagnóstico principal..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Observações Gerais</label>
          <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, observations: (prev.observations || '') + ' ' + t }))} />
        </div>
        <textarea 
          value={formData.observations}
          onChange={e => setFormData({ ...formData, observations: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Histórico relevante, alergias, etc..."
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
        <button 
          type="button"
          onClick={onCancel}
          className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
        >
          Cancelar
        </button>
        <button 
          type="submit"
          className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1"
        >
          {initialData ? 'Atualizar Paciente' : 'Salvar Paciente'}
        </button>
      </div>
    </form>
  );
};

const AssessmentDetail = ({ 
  assessment, 
  patient, 
  onEdit, 
  onDelete, 
  onCancel 
}: { 
  assessment: Omit<PhysioAssessment, 'id'> & { id?: string }, 
  patient: PhysioPatient | undefined, 
  onEdit: () => void, 
  onDelete: () => void,
  onCancel: () => void
}) => {
  return (
    <div className="space-y-8 p-1">
      {/* Header com Nome do Paciente */}
      <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-900 sticky top-0 z-10 py-2">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center border border-green-100 dark:border-green-800">
            <UserCircle size={32} className="text-green-600 dark:text-green-400" />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight">{patient?.name || 'Paciente não encontrado'}</h2>
            <p className="text-sm text-gray-500 font-bold flex items-center gap-2">
              <Calendar size={14} />
              Avaliação em {format(parseISO(assessment.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={onEdit}
            className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl hover:bg-blue-100 transition-colors border border-blue-100 dark:border-blue-800"
            title="Editar Avaliação"
          >
            <Edit2 size={20} />
          </button>
          <button 
            onClick={onDelete}
            className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl hover:bg-red-100 transition-colors border border-red-100 dark:border-red-800"
            title="Excluir Avaliação"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Identificação e Queixa */}
        <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 space-y-4">
          <h4 className="text-[10px] font-black text-green-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <Info size={12} />
            Dados Iniciais
          </h4>
          <div>
            <p className="text-xs font-black text-gray-400 uppercase mb-1">Queixa Principal</p>
            <p className="text-gray-800 dark:text-gray-200 font-bold leading-relaxed">{assessment.complaint || 'Nenhuma queixa registrada'}</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase mb-1">Risco de Queda</p>
              <span className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block",
                assessment.fallRisk === 'ALTO' ? "bg-red-100 text-red-700" :
                assessment.fallRisk === 'MEDIO' ? "bg-orange-100 text-orange-700" :
                "bg-green-100 text-green-700"
              )}>
                {assessment.fallRisk}
              </span>
            </div>
            <div>
              <p className="text-xs font-black text-gray-400 uppercase mb-1">Escala de Dor</p>
              <div className="flex items-center gap-2 text-red-600 font-black">
                <Activity size={14} />
                <span>{assessment.painScale}/10</span>
              </div>
            </div>
          </div>
        </div>

        {/* Sinais Vitais */}
        <div className="bg-gray-50 dark:bg-gray-800/40 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 space-y-4">
          <h4 className="text-[10px] font-black text-red-600 uppercase tracking-[0.2em] flex items-center gap-2">
            <Activity size={12} />
            Sinais Vitais
          </h4>
          <div className="grid grid-cols-3 gap-2">
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase">FC</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{assessment.vitals?.heartRate || '--'} <span className="text-[10px] opacity-40">bpm</span></p>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase">FR</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{assessment.vitals?.respRate || '--'} <span className="text-[10px] opacity-40">irpm</span></p>
            </div>
            <div className="text-center p-3 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
              <p className="text-[10px] font-black text-gray-400 uppercase">P.A</p>
              <p className="text-lg font-black text-gray-900 dark:text-white">{assessment.vitals?.bloodPressure || '--/--'}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Histórico e Diagnóstico */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
            <h5 className="text-xs font-black text-blue-600 uppercase mb-4 tracking-widest flex items-center gap-2">
              <ClipboardList size={14} />
              Histórico (HDA/HPP)
            </h5>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Doença Atual</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{assessment.hda || 'Sem registro'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Patológico Pregresso</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{assessment.hpp || 'Sem registro'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
            <h5 className="text-xs font-black text-orange-600 uppercase mb-4 tracking-widest flex items-center gap-2">
              <AlertCircle size={14} />
              Diagnóstico
            </h5>
            <div className="space-y-4">
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Médico</p>
                <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed italic">{assessment.medicalDiagnosis || 'Aguardando diagnóstico'}</p>
              </div>
              <div>
                <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Cinético-Funcional</p>
                <p className="text-sm text-gray-900 dark:text-white font-black leading-relaxed">{assessment.functionalDiagnosis || 'Não avaliado'}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Avaliação Física */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
          <h5 className="text-xs font-black text-purple-600 uppercase mb-4 tracking-widest flex items-center gap-2">
            <Stethoscope size={14} />
            Exame Físico & Testes
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Inspeção/Palpação</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{assessment.inspectionPalpation || 'Nenhuma observação'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Testes Específicos</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{assessment.specificTests || 'Sem testes realizados'}</p>
            </div>
          </div>
        </div>

        {/* Conduta */}
        <div className="bg-indigo-50 dark:bg-indigo-900/10 p-8 rounded-[40px] border border-indigo-100 dark:border-indigo-900/20 space-y-6">
          <h5 className="text-xs font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
            <Target size={16} />
            Plano de Conduta
          </h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Objetivos Terapêuticos</p>
              <p className="text-sm text-indigo-900 dark:text-indigo-200 font-black leading-relaxed">{assessment.treatmentObjectives || 'Sem objetivos definidos'}</p>
            </div>
            <div>
              <p className="text-[10px] font-black text-indigo-400 uppercase mb-2">Plano de Tratamento</p>
              <p className="text-sm text-indigo-800 dark:text-indigo-300 font-medium leading-relaxed">{assessment.treatmentPlan || 'Sem plano traçado'}</p>
            </div>
          </div>
        </div>

        {/* Fotos */}
        {assessment.photos && assessment.photos.length > 0 && (
          <div className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm">
            <h5 className="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest flex items-center gap-2">
              <Camera size={14} />
              Galeria de Fotos
            </h5>
            <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
              {assessment.photos.map((photo, i) => (
                <img 
                  key={i} 
                  src={photo} 
                  alt={`Avaliação ${i}`} 
                  className="w-32 h-32 object-cover rounded-2xl border border-gray-100 dark:border-gray-800 flex-shrink-0" 
                  referrerPolicy="no-referrer"
                />
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        <button 
          onClick={onCancel}
          className="w-full py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors border border-gray-100 dark:border-gray-800"
        >
          Voltar para Lista
        </button>
      </div>
    </div>
  );
};

const AssessmentForm = ({ 
  patients, 
  onSave, 
  onCancel, 
  onSavePhotos, 
  onDeleteRecord,
  initialData, 
  isDetailView,
  onEdit 
}: { 
  patients: PhysioPatient[], 
  onSave: (data: Omit<PhysioAssessment, 'id'>) => Promise<void>, 
  onCancel: () => void, 
  onSavePhotos: any, 
  onDeleteRecord?: (col: string, id: string) => Promise<void>,
  initialData?: PhysioAssessment | null, 
  isDetailView?: boolean,
  onEdit?: () => void
}) => {
  const [formData, setFormData] = useState<Omit<PhysioAssessment, 'id'> & { photos: string[] }>({
    patientId: initialData?.patientId || '',
    date: initialData?.date || new Date().toISOString(),
    complaint: initialData?.complaint || '',
    hda: initialData?.hda || (initialData as any)?.history || '',
    hpp: initialData?.hpp || initialData?.medicalHistory || '',
    complementaryExams: initialData?.complementaryExams || '',
    currentMedications: initialData?.currentMedications || '',
    vitals: initialData?.vitals || {
      heartRate: undefined,
      respRate: undefined,
      bloodPressure: ''
    },
    inspectionPalpation: initialData?.inspectionPalpation || '',
    specificTests: initialData?.specificTests || (initialData as any)?.physicalTests || '',
    medicalDiagnosis: initialData?.medicalDiagnosis || '',
    functionalDiagnosis: initialData?.functionalDiagnosis || '',
    treatmentObjectives: initialData?.treatmentObjectives || '',
    treatmentPlan: initialData?.treatmentPlan || '',
    painScale: initialData?.painScale || 0,
    motionLimitation: initialData?.motionLimitation || '',
    physicalTests: initialData?.physicalTests || '',
    fallRisk: initialData?.fallRisk || 'BAIXO',
    mobilityLevel: initialData?.mobilityLevel || '',
    independenceADLs: initialData?.independenceADLs || '',
    medicalHistory: initialData?.medicalHistory || '',
    photos: initialData?.photos || []
  });
  const [isExtracting, setIsExtracting] = useState(false);

  const handleDigitize = async (text: string) => {
    if (!text) return;
    setIsExtracting(true);
    try {
      const schemas: Record<string, string> = {
        assessment: "complaint, hda, hpp, complementaryExams, currentMedications, vitals { heartRate (number), respRate (number), bloodPressure (string) }, inspectionPalpation, specificTests, medicalDiagnosis, functionalDiagnosis, treatmentObjectives, treatmentPlan, painScale (number 0-10), motionLimitation, physicalTests, fallRisk (ALTO, MEDIO, BAIXO), mobilityLevel, independenceADLs, medicalHistory"
      };
      
      const extractedData = await extractFormData(text, schemas.assessment);
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData(prev => ({ ...prev, ...extractedData }));
      } else {
        if (text.toLowerCase().includes('dor')) {
          const match = text.match(/dor\s*(\d+)/i);
          if (match) setFormData(prev => ({ ...prev, painScale: parseInt(match[1]) }));
        }
        setFormData(prev => ({ ...prev, complaint: prev.complaint + '\n' + text }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { photos, ...data } = formData;
    await onSave(data);
    if (photos.length > 0) {
      const patient = (patients || []).find(p => p.id === formData.patientId);
      await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', 'Avaliação Fisioterapêutica', formData.complaint);
    }
  };

  if (isDetailView && initialData) {
    const patient = (patients || []).find(p => p.id === formData.patientId);
    return (
      <AssessmentDetail 
        assessment={formData} 
        patient={patient}
        onEdit={onEdit || (() => {})}
        onDelete={() => {
          if (initialData.id && onDeleteRecord) {
            onDeleteRecord('physioAssessments', initialData.id);
            onCancel();
          }
        }}
        onCancel={onCancel}
      />
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 1. Identificação */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <h4 className="text-xs font-bold text-green-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <UserIcon size={14} />
          Identificação & Data
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Paciente</label>
            <select 
              value={formData.patientId}
              onChange={e => setFormData({ ...formData, patientId: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-75"
            >
              <option value="">Selecionar Paciente...</option>
              {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data da Avaliação</label>
            <input 
              type="date" 
              value={formData.date.split('T')[0]}
              onChange={e => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-75"
            />
          </div>
        </div>
      </div>

      {/* 2. Anamnese */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <h4 className="text-xs font-bold text-blue-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <ClipboardList size={14} />
          Anamnese
        </h4>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Queixa Principal</label>
              {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, complaint: (prev.complaint || '') + ' ' + t }))} />}
            </div>
            <textarea 
              value={formData.complaint}
              onChange={e => setFormData({ ...formData, complaint: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-20 text-gray-800 dark:text-white resize-none disabled:opacity-75"
              placeholder="Descreva a queixa principal do paciente..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase">HDA (História da Doença Atual)</label>
                {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, hda: (prev.hda || '') + ' ' + t }))} />}
              </div>
              <textarea 
                value={formData.hda}
                onChange={e => setFormData({ ...formData, hda: e.target.value })}
                disabled={isDetailView}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-32 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
                placeholder="Relato sobre o quadro atual..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase">HPP (História Patológica Pregressa)</label>
                {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, hpp: (prev.hpp || '') + ' ' + t }))} />}
              </div>
              <textarea 
                value={formData.hpp}
                onChange={e => setFormData({ ...formData, hpp: e.target.value })}
                disabled={isDetailView}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-32 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
                placeholder="Comorbidades, cirurgias anteriores..."
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Exames Complementares</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, complementaryExams: (prev.complementaryExams || '') + ' ' + t }))} />
              </div>
              <textarea 
                value={formData.complementaryExams}
                onChange={e => setFormData({ ...formData, complementaryExams: e.target.value })}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm"
                placeholder="Resultados de ECG, Raio-X, exames de sangue..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Medicações em Uso</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, currentMedications: (prev.currentMedications || '') + ' ' + t }))} />
              </div>
              <textarea 
                value={formData.currentMedications}
                onChange={e => setFormData({ ...formData, currentMedications: e.target.value })}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm"
                placeholder="Nome e dosagem das medicações..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* 3. Sinais Vitais */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <h4 className="text-xs font-bold text-red-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Activity size={14} />
          Sinais Vitais
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">FC (bpm)</label>
            <input 
              type="number"
              value={formData.vitals?.heartRate || ''}
              onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, heartRate: parseInt(e.target.value) } })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-75"
              placeholder="Ex: 75"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">FR (irpm)</label>
            <input 
              type="number"
              value={formData.vitals?.respRate || ''}
              onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, respRate: parseInt(e.target.value) } })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-75"
              placeholder="Ex: 14"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-gray-400 uppercase ml-1">PA (mmHg)</label>
            <input 
              type="text"
              value={formData.vitals?.bloodPressure || ''}
              onChange={e => setFormData({ ...formData, vitals: { ...formData.vitals, bloodPressure: e.target.value } })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-75"
              placeholder="Ex: 120x80"
            />
          </div>
        </div>
      </div>

      {/* 4. Exame Físico */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Stethoscope size={14} />
          Exame Físico & Testes
        </h4>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Inspeção e Palpação</label>
              {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, inspectionPalpation: (prev.inspectionPalpation || '') + ' ' + t }))} />}
            </div>
            <textarea 
              value={formData.inspectionPalpation}
              onChange={e => setFormData({ ...formData, inspectionPalpation: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
              placeholder="Postura, trofismo, edemas, tônus, crepitações..."
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Escala de Dor (0-10)</label>
              <div className="p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl space-y-2">
                <input 
                  type="range" 
                  min="0" 
                  max="10"
                  value={formData.painScale}
                  onChange={e => setFormData({ ...formData, painScale: parseInt(e.target.value) })}
                  disabled={isDetailView}
                  className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600 disabled:opacity-50"
                />
                <div className="flex justify-between text-[10px] font-bold text-gray-400">
                  <span>Sem Dor</span>
                  <span className="text-green-600 text-sm">{formData.painScale}</span>
                  <span>Dor Máxima</span>
                </div>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Risco de Queda</label>
              <select 
                value={formData.fallRisk}
                onChange={e => setFormData({ ...formData, fallRisk: e.target.value as any })}
                disabled={isDetailView}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-75"
              >
                <option value="BAIXO">Baixo</option>
                <option value="MEDIO">Médio</option>
                <option value="ALTO">Alto</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Testes Físicos / Específicos</label>
                {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, specificTests: (prev.specificTests || '') + ' ' + t }))} />}
              </div>
              <textarea 
                value={formData.specificTests}
                onChange={e => setFormData({ ...formData, specificTests: e.target.value })}
                disabled={isDetailView}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
                placeholder="Testes de equilíbrio, força, marcha..."
              />
            </div>
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-xs font-bold text-gray-400 uppercase">Limitação de Movimento</label>
                {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, motionLimitation: (prev.motionLimitation || '') + ' ' + t }))} />}
              </div>
              <textarea 
                value={formData.motionLimitation}
                onChange={e => setFormData({ ...formData, motionLimitation: e.target.value })}
                disabled={isDetailView}
                className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
                placeholder="Restrições articulares identificadas..."
              />
            </div>
          </div>
        </div>
      </div>

      {/* 5. Diagnóstico */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <h4 className="text-xs font-bold text-orange-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <AlertCircle size={14} />
          Diagnóstico
        </h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Diagnóstico Médico</label>
              {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, medicalDiagnosis: (prev.medicalDiagnosis || '') + ' ' + t }))} />}
            </div>
            <textarea 
              value={formData.medicalDiagnosis}
              onChange={e => setFormData({ ...formData, medicalDiagnosis: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
              placeholder="Ex: AVE não especificado..."
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Diagnóstico Cinético Funcional</label>
              {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, functionalDiagnosis: (prev.functionalDiagnosis || '') + ' ' + t }))} />}
            </div>
            <textarea 
              value={formData.functionalDiagnosis}
              onChange={e => setFormData({ ...formData, functionalDiagnosis: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
              placeholder="Limitações funcionais, déficits de equilíbrio..."
            />
          </div>
        </div>
      </div>

      {/* 6. Conduta & Planejamento */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <h4 className="text-xs font-bold text-indigo-600 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Target size={14} />
          Conduta & Planejamento
        </h4>
        <div className="space-y-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Objetivos do Tratamento</label>
              {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, treatmentObjectives: (prev.treatmentObjectives || '') + ' ' + t }))} />}
            </div>
            <textarea 
              value={formData.treatmentObjectives}
              onChange={e => setFormData({ ...formData, treatmentObjectives: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
              placeholder="Ganho de força, resistência, capacidade funcional..."
            />
          </div>
          <div className="space-y-2">
            <div className="flex justify-between items-center ml-1">
              <label className="text-xs font-bold text-gray-400 uppercase">Plano de Tratamento</label>
              {!isDetailView && <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, treatmentPlan: (prev.treatmentPlan || '') + ' ' + t }))} />}
            </div>
            <textarea 
              value={formData.treatmentPlan}
              onChange={e => setFormData({ ...formData, treatmentPlan: e.target.value })}
              disabled={isDetailView}
              className="w-full p-4 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-32 text-gray-800 dark:text-white resize-none text-sm disabled:opacity-75"
              placeholder="Cinesioterapia, treino de equilíbrio, treino de marcha..."
            />
          </div>
        </div>
      </div>

      {/* Midia */}
      <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-6">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
          {!isDetailView && <DigitizeButton onDigitize={handleDigitize} />}
        </div>
        <PhotoUpload photos={formData.photos} onChange={photos => setFormData({ ...formData, photos })} disabled={isDetailView} />
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">
          {isDetailView ? 'Voltar' : 'Cancelar'}
        </button>
        {!isDetailView && (
          <button 
            type="submit"
            className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1"
          >
            {initialData ? 'Atualizar Avaliação' : 'Salvar Avaliação'}
          </button>
        )}
      </div>
    </form>
  );
};

const EvolutionForm = ({ 
  patients, 
  onSave, 
  onCancel, 
  onSavePhotos, 
  initialData, 
  showToast,
  professionals = [],
  user
}: { 
  patients: PhysioPatient[], 
  onSave: (data: Omit<PhysioEvolution, 'id'>) => Promise<void>, 
  onCancel: () => void, 
  onSavePhotos: any, 
  initialData?: PhysioEvolution | null, 
  showToast: (msg: string, type?: 'success' | 'error') => void,
  professionals?: any[],
  user?: UserType
}) => {
  const [formData, setFormData] = useState<Omit<PhysioEvolution, 'id'> & { photos: string[] }>({
    patientId: initialData?.patientId || '',
    date: initialData?.date || new Date().toISOString(),
    procedures: initialData?.procedures || '',
    evolution: initialData?.evolution || '',
    observations: initialData?.observations || '',
    painLevel: initialData?.painLevel || 0,
    photos: initialData?.photos || [],
    coWorkers: initialData?.coWorkers || []
  });
  const [isExtracting, setIsExtracting] = useState(false);
  const [profSearch, setProfSearch] = useState('');

  const handleDigitize = async (text: string) => {
    if (!text) return;
    setIsExtracting(true);
    try {
      const extractedData = await extractFormData(text, "procedures, evolution, observations, painLevel (number 0-10)");
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData(prev => ({ ...prev, ...extractedData }));
      } else {
        setFormData(prev => ({ ...prev, evolution: (prev.evolution || '') + '\n' + text }));
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsExtracting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { photos, ...data } = formData;
    await onSave(data);
    if (photos.length > 0) {
      const patient = (patients || []).find(p => p.id === formData.patientId);
      await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', 'Evolução Fisioterapêutica', formData.evolution);
    }
  };

  const handleFixGrammar = async (field: 'procedures' | 'evolution' | 'observations') => {
    if (!formData[field]) return;
    setIsExtracting(true);
    try {
      const fixed = await fixGrammar(formData[field]);
      setFormData({ ...formData, [field]: fixed });
      showToast('Texto corrigido com sucesso', 'success');
    } catch (err) {
      console.error(err);
      showToast('Erro ao corrigir texto', 'error');
    } finally {
      setIsExtracting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Paciente</label>
        <select 
          value={formData.patientId}
          onChange={e => setFormData({ ...formData, patientId: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
        >
          <option value="">Selecionar Paciente...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data</label>
          <input 
            type="date" 
            value={formData.date.split('T')[0]}
            onChange={e => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nível de Dor (0-10)</label>
          <input 
            type="number" 
            min="0" max="10"
            value={formData.painLevel}
            onChange={e => setFormData({ ...formData, painLevel: parseInt(e.target.value) })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Procedimentos Realizados</label>
          <div className="flex gap-2">
            <button 
              type="button"
              disabled={isExtracting || !formData.procedures}
              onClick={async () => {
                if (!formData.procedures) return;
                setIsExtracting(true);
                try {
                  const fixed = await fixGrammar(formData.procedures);
                  setFormData(prev => ({ ...prev, procedures: fixed }));
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
            <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, procedures: (prev.procedures || '') + ' ' + t }))} />
          </div>
        </div>
        <textarea 
          value={formData.procedures}
          onChange={e => setFormData({ ...formData, procedures: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Ex: Alongamento passivo, fortalecimento de quadríceps..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Evolução / Resposta</label>
          <div className="flex gap-2">
            <button 
              type="button"
              disabled={isExtracting || !formData.evolution}
              onClick={async () => {
                if (!formData.evolution) return;
                setIsExtracting(true);
                try {
                  const fixed = await fixGrammar(formData.evolution);
                  setFormData(prev => ({ ...prev, evolution: fixed }));
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
            <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, evolution: (prev.evolution || '') + ' ' + t }))} />
          </div>
        </div>
        <textarea 
          value={formData.evolution}
          onChange={e => setFormData({ ...formData, evolution: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Como o paciente reagiu aos exercícios?"
        />
      </div>

      <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
        <div className="flex justify-between items-center bg-transparent">
          <div>
            <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block">Co-workers / Profissionais Colaboradores</label>
            <span className="text-[10px] text-gray-400">Selecione quem participou desta ação em conjunto</span>
          </div>
          {formData.coWorkers && formData.coWorkers.length > 0 && (
            <button 
              type="button" 
              onClick={() => setFormData({ ...formData, coWorkers: [] })}
              className="text-[10px] text-red-500 font-bold uppercase tracking-wider animate-pulse"
            >
              Limpar Seleção ({formData.coWorkers.length})
            </button>
          )}
        </div>
        
        <div className="relative">
          <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-green-500 transition-all">
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
          {(professionals || [])
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
                  key={p.id || p.email}
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
                      ? "bg-blend-color-burn bg-green-500/10 dark:bg-green-950/20 border-green-400 dark:border-green-800 text-green-900 dark:text-green-300"
                      : "bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-750 text-gray-700 dark:text-gray-300"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-xs font-bold truncate">{p.name}</p>
                    <p className="text-[10px] text-gray-400 uppercase tracking-widest leading-none mt-0.5">{ROLE_LABELS[p.role] || p.role}</p>
                  </div>
                  <div className={cn(
                    "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                    isSelected ? "bg-green-500 border-green-500 text-white" : "border-gray-200 dark:border-gray-700 bg-transparent"
                  )}>
                    {isSelected && <CheckCircle2 size={12} />}
                  </div>
                </button>
              );
            })
          }
        </div>
      </div>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
          <DigitizeButton onDigitize={handleDigitize} />
        </div>
        <PhotoUpload photos={formData.photos} onChange={photos => setFormData({ ...formData, photos })} />
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">Cancelar</button>
        <button type="submit" className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all">
          {initialData ? 'Atualizar Evolução' : 'Salvar Evolução'}
        </button>
      </div>
    </form>
  );
};

const ExerciseForm = ({ onSave, onCancel, initialData }: { onSave: (data: Omit<PhysioExercise, 'id'>) => Promise<void>, onCancel: () => void, initialData?: PhysioExercise | null }) => {
  const [formData, setFormData] = useState<Omit<PhysioExercise, 'id'> & { photos: string[] }>({
    title: initialData?.title || '',
    description: initialData?.description || '',
    category: initialData?.category || 'ALONGAMENTO',
    videoUrl: initialData?.videoUrl || '',
    imageUrl: initialData?.imageUrl || '',
    photos: initialData?.photos || []
  });

  const handleDigitize = (text: string) => {
    setFormData(prev => ({ ...prev, description: prev.description + '\n' + text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { photos, ...data } = formData;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Título do Exercício</label>
        <input 
          type="text" 
          value={formData.title}
          onChange={e => setFormData({ ...formData, title: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          placeholder="Ex: Fortalecimento de Isquiotibiais"
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Categoria</label>
        <select 
          value={formData.category}
          onChange={e => setFormData({ ...formData, category: e.target.value as any })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
        >
          <option value="ALONGAMENTO">Alongamento</option>
          <option value="FORTALECIMENTO">Fortalecimento</option>
          <option value="REABILITACAO">Reabilitação</option>
          <option value="OUTRO">Outro</option>
        </select>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Descrição / Instruções</label>
        <textarea 
          value={formData.description}
          onChange={e => setFormData({ ...formData, description: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-32 text-gray-800 dark:text-white resize-none"
          placeholder="Descreva como realizar o exercício passo a passo..."
        />
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">URL da Imagem (Opcional)</label>
        <input 
          type="url" 
          value={formData.imageUrl}
          onChange={e => setFormData({ ...formData, imageUrl: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          placeholder="https://exemplo.com/imagem.jpg"
        />
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
          <DigitizeButton onDigitize={handleDigitize} />
        </div>
        <PhotoUpload photos={formData.photos} onChange={photos => setFormData({ ...formData, photos })} />
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">Cancelar</button>
        <button type="submit" className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all">
          {initialData ? 'Atualizar Exercício' : 'Salvar Exercício'}
        </button>
      </div>
    </form>
  );
};

const AppointmentForm = ({ patients, onSave, onCancel, initialData }: { patients: PhysioPatient[], onSave: (data: Omit<PhysioAppointment, 'id'>) => Promise<void>, onCancel: () => void, initialData?: PhysioAppointment | null }) => {
  const [formData, setFormData] = useState<Omit<PhysioAppointment, 'id'> & { photos: string[] }>({
    patientId: initialData?.patientId || '',
    date: initialData?.date || format(new Date(), 'yyyy-MM-dd'),
    time: initialData?.time || '08:00',
    status: initialData?.status || 'PENDENTE',
    observations: initialData?.observations || '',
    photos: initialData?.photos || []
  });

  const handleDigitize = (text: string) => {
    setFormData(prev => ({ ...prev, observations: prev.observations + '\n' + text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const { photos, ...data } = formData;
    onSave(data);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Paciente</label>
        <select 
          value={formData.patientId}
          onChange={e => setFormData({ ...formData, patientId: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
        >
          <option value="">Selecionar Paciente...</option>
          {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data</label>
          <input 
            type="date" 
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Horário</label>
          <input 
            type="time" 
            value={formData.time}
            onChange={e => setFormData({ ...formData, time: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Observações</label>
        <textarea 
          value={formData.observations}
          onChange={e => setFormData({ ...formData, observations: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Alguma observação para este agendamento?"
        />
      </div>

      <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
          <DigitizeButton onDigitize={handleDigitize} />
        </div>
        <PhotoUpload photos={formData.photos} onChange={photos => setFormData({ ...formData, photos })} />
      </div>

      <div className="flex gap-4 pt-4">
        <button type="button" onClick={onCancel} className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">Cancelar</button>
        <button type="submit" className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all">Confirmar Agendamento</button>
      </div>
    </form>
  );
};
