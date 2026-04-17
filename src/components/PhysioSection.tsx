import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Users, ClipboardList, LineChart, 
  Dumbbell, Calendar, FileText, Settings, 
  Plus, Search, Filter, MoreVertical, 
  ChevronRight, AlertCircle, CheckCircle2, 
  Clock, MapPin, Phone, Mail, 
  User as UserIcon, Camera, Trash2, Edit2, 
  Download, Printer, Share2, X,
  Heart, Shield, Info, ArrowLeft,
  Star, MessageSquare, Bell,
  Stethoscope, Activity, TrendingUp,
  UserCircle, LogOut, Moon, Sun
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line,
  PieChart, Pie, Cell
} from 'recharts';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { PhysioPatient, PhysioAssessment, PhysioEvolution, PhysioExercise, PhysioAppointment, User as UserType } from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface PhysioSectionProps {
  user: UserType;
  patients: PhysioPatient[];
  assessments: PhysioAssessment[];
  evolutions: PhysioEvolution[];
  exercises: PhysioExercise[];
  appointments: PhysioAppointment[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onSavePatient: (data: Omit<PhysioPatient, 'id'>, id?: string) => Promise<void>;
  onDeletePatient: (id: string) => Promise<void>;
  onSaveAssessment: (data: Omit<PhysioAssessment, 'id'>, id?: string) => Promise<void>;
  onSaveEvolution: (data: Omit<PhysioEvolution, 'id'>, id?: string) => Promise<void>;
  onSaveExercise: (data: Omit<PhysioExercise, 'id'>, id?: string) => Promise<void>;
  onSaveAppointment: (data: Omit<PhysioAppointment, 'id'>, id?: string) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  onUpdateProfile?: (data: Partial<UserType>) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

export const PhysioSection = ({ 
  user, 
  patients, 
  assessments, 
  evolutions, 
  exercises, 
  appointments,
  showToast,
  onSavePatient,
  onDeletePatient,
  onSaveAssessment,
  onSaveEvolution,
  onSaveExercise,
  onSaveAppointment,
  onSavePhotos,
  theme,
  setTheme,
  onLogout,
  onUpdateProfile
}: PhysioSectionProps) => {
  const [activeSubTab, setActiveSubTab] = useState('dashboard');
  const [isPatientModalOpen, setIsPatientModalOpen] = useState(false);
  const [isAssessmentModalOpen, setIsAssessmentModalOpen] = useState(false);
  const [isEvolutionModalOpen, setIsEvolutionModalOpen] = useState(false);
  const [isExerciseModalOpen, setIsExerciseModalOpen] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [isAppointmentModalOpen, setIsAppointmentModalOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PhysioPatient | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [reportPatientId, setReportPatientId] = useState('');
  const [reportMonth, setReportMonth] = useState(format(new Date(), 'yyyy-MM'));

  const filteredPatients = useMemo(() => {
    return patients.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [patients, searchQuery]);

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

  const handleGeneratePatientPDF = () => {
    if (!reportPatientId) {
      showToast('Selecione um paciente para gerar o prontuário', 'error');
      return;
    }

    const patient = patients.find(p => p.id === reportPatientId);
    if (!patient) return;

    const patientAssessments = assessments.filter(a => a.patientId === reportPatientId);
    const patientEvolutions = evolutions.filter(e => e.patientId === reportPatientId);

    const data = [
      ['Nome', patient.name],
      ['Idade', patient.age],
      ['Diagnóstico', patient.diagnosis],
      ['Categoria', patient.category],
      ['', ''],
      ['AVALIAÇÕES', ''],
      ...patientAssessments.map(a => [format(parseISO(a.date), 'dd/MM/yyyy'), a.complaint]),
      ['', ''],
      ['EVOLUÇÕES', ''],
      ...patientEvolutions.map(e => [format(parseISO(e.date), 'dd/MM/yyyy'), e.evolution])
    ];

    generateModernPDF({
      title: `Prontuário de Fisioterapia - ${patient.name}`,
      subtitle: `Documento gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      columns: ['Campo/Data', 'Descrição/Informação'],
      data,
      fileName: `prontuario_${patient.name.toLowerCase().replace(/\s/g, '_')}`
    });
  };

  const handleGenerateActivityPDF = () => {
    const [year, month] = reportMonth.split('-');
    const monthEvolutions = evolutions.filter(e => {
      const date = parseISO(e.date);
      return date.getFullYear() === parseInt(year) && date.getMonth() === parseInt(month) - 1;
    });

    const data = monthEvolutions.map(e => {
      const patient = patients.find(p => p.id === e.patientId);
      return [
        format(parseISO(e.date), 'dd/MM/yyyy'),
        patient?.name || 'N/A',
        e.procedures,
        e.evolution
      ];
    });

    generateModernPDF({
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
    const todayAppointments = appointmentsList.filter(a => a.date === today);
    const pendingEvolutions = todayAppointments.filter(a => a.status === 'ATENDIDO' && !evolutionsList.some(e => e.patientId === a.patientId && e.date === today)).length;
    
    return {
      totalPatients: patientsList.length,
      todayAppointments: todayAppointments.length,
      pendingEvolutions,
      highPainAlerts: assessmentsList.filter(a => a.painScale >= 7).length
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
      
      const count = evolutions.filter(e => e.date.startsWith(dateStr)).length;
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
    <div className="flex flex-col lg:flex-row gap-8 min-h-[80vh]">
      {/* Internal Navigation */}
      <div className="lg:w-64 flex-shrink-0 space-y-2">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveSubTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
              activeSubTab === item.id 
                ? "bg-green-600 text-white shadow-lg shadow-green-200 dark:shadow-none" 
                : "text-gray-500 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-gray-800"
            )}
          >
            <item.icon size={20} />
            {item.label}
          </button>
        ))}
      </div>

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
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
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
                {filteredPatients.map((patient) => (
                  <div key={patient.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900/30 transition-all group">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center text-green-600 dark:text-green-400 overflow-hidden">
                          {patient.photoUrl ? (
                            <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon size={28} />
                          )}
                        </div>
                        <div>
                          <h4 className="font-bold text-gray-800 dark:text-white group-hover:text-green-600 transition-colors">{patient.name}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400">{patient.age} anos • {patient.category}</p>
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
                ))}
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
                  <p className="text-gray-500 dark:text-gray-400">Avaliação física e funcional completa</p>
                </div>
                <button 
                  onClick={() => setIsAssessmentModalOpen(true)}
                  className="bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
                >
                  <Plus size={20} />
                  Iniciar Avaliação
                </button>
              </div>

              <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                      <th className="p-6">Paciente</th>
                      <th className="p-6">Data</th>
                      <th className="p-6">Escala de Dor</th>
                      <th className="p-6">Risco de Queda</th>
                      <th className="p-6 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                    {assessments.map((a) => {
                      const patient = patients.find(p => p.id === a.patientId);
                      return (
                        <tr key={a.id} className="text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                          <td className="p-6 font-bold text-gray-800 dark:text-white">{patient?.name || 'N/A'}</td>
                          <td className="p-6">{format(parseISO(a.date), 'dd/MM/yyyy')}</td>
                          <td className="p-6">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold",
                              a.painScale >= 7 ? "bg-red-100 text-red-600" : a.painScale >= 4 ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                            )}>
                              {a.painScale}/10
                            </span>
                          </td>
                          <td className="p-6">
                            <span className={cn(
                              "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                              a.fallRisk === 'ALTO' ? "bg-red-100 text-red-600" : a.fallRisk === 'MEDIO' ? "bg-orange-100 text-orange-600" : "bg-green-100 text-green-600"
                            )}>
                              {a.fallRisk || 'N/A'}
                            </span>
                          </td>
                          <td className="p-6 text-right">
                            <button className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                              <FileText size={16} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
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
                  <p className="text-gray-500 dark:text-gray-400">Registro diário de sessões e progresso</p>
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
                {evolutions.map((e) => {
                  const patient = patients.find(p => p.id === e.patientId);
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
                    const patient = patients.find(p => p.id === a.patientId);
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
                    <button 
                      onClick={handleGeneratePatientPDF}
                      className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-blue-700 transition-all"
                    >
                      <Download size={20} />
                      Gerar PDF
                    </button>
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
                      <button 
                        onClick={handleGenerateActivityPDF}
                        className="w-full flex items-center justify-center gap-2 bg-green-600 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-green-700 transition-all"
                      >
                        <Printer size={20} />
                        Gerar PDF
                      </button>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsPatientModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white">
                <h3 className="text-xl font-bold">{selectedPatient ? 'Editar Paciente' : 'Novo Paciente'}</h3>
                <button onClick={() => setIsPatientModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-8">
                <PatientForm 
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAssessmentModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white">
                <h3 className="text-xl font-bold">Nova Avaliação</h3>
                <button onClick={() => setIsAssessmentModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-8">
                <AssessmentForm 
                  patients={patients}
                  onSave={async (data) => {
                    await onSaveAssessment(data);
                    setIsAssessmentModalOpen(false);
                  }}
                  onCancel={() => setIsAssessmentModalOpen(false)}
                  onSavePhotos={onSavePhotos}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isEvolutionModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsEvolutionModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white">
                <h3 className="text-xl font-bold">Nova Evolução</h3>
                <button onClick={() => setIsEvolutionModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-8">
                <EvolutionForm 
                  patients={patients}
                  onSave={async (data) => {
                    await onSaveEvolution(data);
                    setIsEvolutionModalOpen(false);
                  }}
                  onCancel={() => setIsEvolutionModalOpen(false)}
                  onSavePhotos={onSavePhotos}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isExerciseModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsExerciseModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white">
                <h3 className="text-xl font-bold">Novo Exercício</h3>
                <button onClick={() => setIsExerciseModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-8">
                <ExerciseForm 
                  onSave={async (data) => {
                    await onSaveExercise(data);
                    setIsExerciseModalOpen(false);
                  }}
                  onCancel={() => setIsExerciseModalOpen(false)}
                />
              </div>
            </motion.div>
          </div>
        )}

        {isAppointmentModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsAppointmentModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white">
                <h3 className="text-xl font-bold">Agendar Sessão</h3>
                <button onClick={() => setIsAppointmentModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-8">
                <AppointmentForm 
                  patients={patients}
                  onSave={async (data) => {
                    await onSaveAppointment(data);
                    setIsAppointmentModalOpen(false);
                  }}
                  onCancel={() => setIsAppointmentModalOpen(false)}
                />
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

const PatientForm = ({ initialData, onSave, onCancel }: { initialData: PhysioPatient | null, onSave: (data: Omit<PhysioPatient, 'id'>) => Promise<void>, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Omit<PhysioPatient, 'id'>>({
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

  const handleDigitize = (text: string) => {
    setFormData(prev => ({ ...prev, diagnosis: (prev.diagnosis || '') + '\n' + text }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
        <input 
          type="text" 
          required
          value={formData.name}
          onChange={e => setFormData({ ...formData, name: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          placeholder="Ex: Maria Oliveira"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Idade</label>
          <input 
            type="number" 
            required
            value={formData.age || ''}
            onChange={e => setFormData({ ...formData, age: parseInt(e.target.value) })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Telefone</label>
          <input 
            type="text" 
            required
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
          required
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

const AssessmentForm = ({ patients, onSave, onCancel, onSavePhotos }: { patients: PhysioPatient[], onSave: (data: Omit<PhysioAssessment, 'id'>) => Promise<void>, onCancel: () => void, onSavePhotos: any }) => {
  const [formData, setFormData] = useState<Omit<PhysioAssessment, 'id'> & { photos: string[] }>({
    patientId: '',
    date: new Date().toISOString(),
    complaint: '',
    history: '',
    painScale: 0,
    motionLimitation: '',
    physicalTests: '',
    fallRisk: 'BAIXO',
    mobilityLevel: '',
    independenceADLs: '',
    medicalHistory: '',
    photos: []
  });

  const handleDigitize = (text: string) => {
    // Simple heuristic to fill fields based on OCR text
    if (text.toLowerCase().includes('dor')) {
      const match = text.match(/dor\s*(\d+)/i);
      if (match) setFormData(prev => ({ ...prev, painScale: parseInt(match[1]) }));
    }
    setFormData(prev => ({ ...prev, complaint: prev.complaint + '\n' + text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { photos, ...data } = formData;
    await onSave(data);
    if (photos.length > 0) {
      const patient = patients.find(p => p.id === formData.patientId);
      await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', 'Avaliação Fisioterapêutica', formData.complaint);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Paciente</label>
          <select 
            required
            value={formData.patientId}
            onChange={e => setFormData({ ...formData, patientId: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          >
            <option value="">Selecionar Paciente...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data da Avaliação</label>
          <input 
            type="date" 
            required
            value={formData.date.split('T')[0]}
            onChange={e => setFormData({ ...formData, date: new Date(e.target.value).toISOString() })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Queixa Principal</label>
          <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, complaint: (prev.complaint || '') + ' ' + t }))} />
        </div>
        <textarea 
          required
          value={formData.complaint}
          onChange={e => setFormData({ ...formData, complaint: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-20 text-gray-800 dark:text-white resize-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Escala de Dor (0-10)</label>
          <input 
            type="range" 
            min="0" 
            max="10"
            value={formData.painScale}
            onChange={e => setFormData({ ...formData, painScale: parseInt(e.target.value) })}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-green-600"
          />
          <div className="flex justify-between text-[10px] font-bold text-gray-400">
            <span>Sem Dor</span>
            <span className="text-green-600 text-sm">{formData.painScale}</span>
            <span>Dor Máxima</span>
          </div>
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Risco de Queda</label>
          <select 
            value={formData.fallRisk}
            onChange={e => setFormData({ ...formData, fallRisk: e.target.value as any })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
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
            <label className="text-xs font-bold text-gray-400 uppercase">Limitação de Movimento</label>
            <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, motionLimitation: (prev.motionLimitation || '') + ' ' + t }))} />
          </div>
          <textarea 
            value={formData.motionLimitation}
            onChange={e => setFormData({ ...formData, motionLimitation: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-20 text-gray-800 dark:text-white resize-none"
          />
        </div>
        <div className="space-y-2">
          <div className="flex justify-between items-center ml-1">
            <label className="text-xs font-bold text-gray-400 uppercase">Testes Físicos</label>
            <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, physicalTests: (prev.physicalTests || '') + ' ' + t }))} />
          </div>
          <textarea 
            value={formData.physicalTests}
            onChange={e => setFormData({ ...formData, physicalTests: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-20 text-gray-800 dark:text-white resize-none"
          />
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
        <button type="submit" className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all">Salvar Avaliação</button>
      </div>
    </form>
  );
};

const EvolutionForm = ({ patients, onSave, onCancel, onSavePhotos }: { patients: PhysioPatient[], onSave: (data: Omit<PhysioEvolution, 'id'>) => Promise<void>, onCancel: () => void, onSavePhotos: any }) => {
  const [formData, setFormData] = useState<Omit<PhysioEvolution, 'id'> & { photos: string[] }>({
    patientId: '',
    date: new Date().toISOString(),
    procedures: '',
    evolution: '',
    observations: '',
    painLevel: 0,
    photos: []
  });

  const handleDigitize = (text: string) => {
    setFormData(prev => ({ ...prev, evolution: prev.evolution + '\n' + text }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const { photos, ...data } = formData;
    await onSave(data);
    if (photos.length > 0) {
      const patient = patients.find(p => p.id === formData.patientId);
      await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', 'Evolução Fisioterapêutica', formData.evolution);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <label className="text-xs font-bold text-gray-400 uppercase ml-1">Paciente</label>
        <select 
          required
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
            required
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
          <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, procedures: (prev.procedures || '') + ' ' + t }))} />
        </div>
        <textarea 
          required
          value={formData.procedures}
          onChange={e => setFormData({ ...formData, procedures: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Ex: Alongamento passivo, fortalecimento de quadríceps..."
        />
      </div>
      <div className="space-y-2">
        <div className="flex justify-between items-center ml-1">
          <label className="text-xs font-bold text-gray-400 uppercase">Evolução / Resposta</label>
          <VoiceTranscriptionButton onTranscribe={(t) => setFormData(prev => ({ ...prev, evolution: (prev.evolution || '') + ' ' + t }))} />
        </div>
        <textarea 
          required
          value={formData.evolution}
          onChange={e => setFormData({ ...formData, evolution: e.target.value })}
          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-24 text-gray-800 dark:text-white resize-none"
          placeholder="Como o paciente reagiu aos exercícios?"
        />
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
        <button type="submit" className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all">Salvar Evolução</button>
      </div>
    </form>
  );
};

const ExerciseForm = ({ onSave, onCancel }: { onSave: (data: Omit<PhysioExercise, 'id'>) => Promise<void>, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Omit<PhysioExercise, 'id'> & { photos: string[] }>({
    title: '',
    description: '',
    category: 'ALONGAMENTO',
    videoUrl: '',
    imageUrl: '',
    photos: []
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
          required
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
          required
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
        <button type="submit" className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all">Salvar Exercício</button>
      </div>
    </form>
  );
};

const AppointmentForm = ({ patients, onSave, onCancel }: { patients: PhysioPatient[], onSave: (data: Omit<PhysioAppointment, 'id'>) => Promise<void>, onCancel: () => void }) => {
  const [formData, setFormData] = useState<Omit<PhysioAppointment, 'id'> & { photos: string[] }>({
    patientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '08:00',
    status: 'PENDENTE',
    observations: '',
    photos: []
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
          required
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
            required
            value={formData.date}
            onChange={e => setFormData({ ...formData, date: e.target.value })}
            className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-bold text-gray-400 uppercase ml-1">Horário</label>
          <input 
            type="time" 
            required
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
