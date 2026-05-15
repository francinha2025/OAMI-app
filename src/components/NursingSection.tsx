import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Pill, Activity, 
  Bandage, ClipboardList, AlertTriangle, Calendar, 
  FileText, Settings, Plus, Search, Filter, 
  MoreVertical, ChevronRight, AlertCircle, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, 
  Download, Printer, X, Heart, Info, ArrowLeft,
  TrendingUp, UserCircle, LogOut, Moon, Sun, Loader2,
  Droplets, Thermometer, Wind, Zap,
  Coffee, Bath, Move, Bed
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, isToday, parseISO, startOfToday, isSameDay, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeReplace } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { extractFormData, fixGrammar } from '../services/geminiService';
import { 
  NursingPatient, Medication, MedicationAdministration, 
  VitalSigns, DressingRecord, NursingEvolution, 
  IncidentRecord, ShiftSchedule, StaffMember, AVDRecord, 
  DiaperChangeRecord, User as UserType, Professional, Elderly
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface NursingSectionProps {
  user: UserType;
  elderly: Elderly[];
  patients: NursingPatient[];
  medications: Medication[];
  administrations: MedicationAdministration[];
  vitalSigns: VitalSigns[];
  dressings: DressingRecord[];
  evolutions: NursingEvolution[];
  incidents: IncidentRecord[];
  shifts: ShiftSchedule[];
  users: StaffMember[];
  professionals: Professional[];
  avds: AVDRecord[];
  diaperChanges: DiaperChangeRecord[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onSavePatient: (data: Omit<NursingPatient, 'id'>, id?: string) => Promise<void>;
  onDeletePatient: (id: string) => Promise<void>;
  onSaveMedication: (data: Omit<Medication, 'id'>, id?: string) => Promise<void>;
  onSaveAdministration: (data: Omit<MedicationAdministration, 'id'>) => Promise<void>;
  onSaveVitalSigns: (data: Omit<VitalSigns, 'id'>, id?: string) => Promise<void>;
  onSaveDressing: (data: Omit<DressingRecord, 'id'>, id?: string) => Promise<void>;
  onSaveEvolution: (data: Omit<NursingEvolution, 'id'>, id?: string) => Promise<void>;
  onSaveIncident: (data: Omit<IncidentRecord, 'id'>, id?: string) => Promise<void>;
  onSaveShift: (data: Omit<ShiftSchedule, 'id'>, id?: string) => Promise<void>;
  onSaveAVD: (data: Omit<AVDRecord, 'id'>, id?: string) => Promise<void>;
  onSaveDiaperChange: (data: Omit<DiaperChangeRecord, 'id'>, id?: string) => Promise<void>;
  onDeleteRecord: (collection: string, id: string) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  onUpdateProfile?: (data: Partial<UserType>) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

type NursingTab = 
  | 'dashboard' | 'patients' | 'medication' 
  | 'vitals' | 'dressings' | 'evolutions' 
  | 'incidents' | 'shift' | 'reports' | 'settings';

export const NursingSection = (props: NursingSectionProps) => {
  const { 
    patients, medications, administrations, vitalSigns, 
    dressings, evolutions, incidents, shifts, 
    users, professionals, avds, diaperChanges, elderly 
  } = props;
  const [activeTab, setActiveTab] = useState<NursingTab>(() => {
    const saved = localStorage.getItem('oami-nursing-tab');
    return (saved as NursingTab) || 'dashboard';
  });
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'patient' | 'medication' | 'vital' | 'dressing' | 'evolution' | 'incident' | 'shift' | 'avd' | 'diaper' | null>(null);
  const [evolutionPatientFilter, setEvolutionPatientFilter] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'patient' | 'evolution' | 'incident' | 'medication' | 'vital' | 'dressing' | 'shift' | 'avd' | 'diaper' } | null>(null);
  const [editingData, setEditingData] = useState<any | null>(null);
  const [vitalsPatientFilter, setVitalsPatientFilter] = useState('');
  const [dressingsPatientFilter, setDressingsPatientFilter] = useState('');
  const [incidentsPatientFilter, setIncidentsPatientFilter] = useState('');
  const [reportsPatientFilter, setReportsPatientFilter] = useState('');
  const [medicationsPatientFilter, setMedicationsPatientFilter] = useState('');

  useEffect(() => {
    localStorage.setItem('oami-nursing-tab', activeTab);
  }, [activeTab]);

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !props.onUpdateProfile) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      await props.onUpdateProfile!({ photoUrl: base64String });
    };
    reader.readAsDataURL(file);
  };

  const filteredPatients = useMemo(() => {
    return (props.patients || []).filter(p => 
      (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (String((p as any).diagnosis || '')).toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [props.patients, searchQuery]);

  const selectedPatient = useMemo(() => 
    (props.patients || []).find(p => p.id === selectedPatientId), 
    [props.patients, selectedPatientId]
  );

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const administrationsList = props.administrations || [];
    const vitalSignsList = props.vitalSigns || [];
    const patientsList = props.patients || [];
    const dressingsList = props.dressings || [];
    const incidentRecords = props.incidents || [];

    const todayAdmins = administrationsList.filter(a => a.date === today);
    const pendingMedications = todayAdmins.filter(a => a.status === 'PENDENTE').length;
    const alteredVitals = vitalSignsList.filter(v => 
      v.date === today && (v.systolicBP > 140 || v.systolicBP < 90 || v.temperature > 37.5)
    ).length;

    return {
      totalPatients: patientsList.length,
      pendingMeds: pendingMedications,
      pendingDressings: (dressingsList || []).filter(d => d.nextChangeDate === today).length,
      alerts: alteredVitals + (incidentRecords || []).filter(i => i.date === today).length
    };
  }, [props.patients, props.administrations, props.dressings, props.incidents, props.vitalSigns]);

  const renderReports = () => {
    const downloadReport = async (title: string, data: any[], formatType: 'pdf' | 'word') => {
      const filteredData = reportsPatientFilter 
        ? data.filter(item => {
            const patientNameValue = item.Paciente;
            const selectedPatientName = (props.patients || []).find(p => p.id === reportsPatientFilter)?.name;
            return patientNameValue === selectedPatientName;
          })
        : data;

      if (filteredData.length === 0) {
        props.showToast('Nenhum dado encontrado para o filtro selecionado', 'error');
        return;
      }

      const columns = Object.keys(filteredData[0]);
      const body = filteredData.map(item => Object.values(item));

      const subtitle = `Relatório de Enfermagem - ${format(new Date(), "dd/MM/yyyy")}${reportsPatientFilter ? ` - Paciente: ${props.patients.find(p => p.id === reportsPatientFilter)?.name}` : ''}`;

      if (formatType === 'pdf') {
        await generateModernPDF({
          title,
          subtitle,
          columns,
          data: body,
          fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
        });
      } else {
        await generateModernWord({
          title,
          subtitle,
          columns,
          data: body,
          fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
        });
      }
    };

    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Relatórios de Enfermagem</h2>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <Filter size={16} className="text-gray-400 ml-2" />
            <select 
              value={reportsPatientFilter}
              onChange={(e) => setReportsPatientFilter(e.target.value)}
              className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-400 min-w-[200px]"
            >
              <option value="">Todos os Idosos (Geral)</option>
              {props.patients.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ReportCard 
            title="Evolução Mensal" 
            description="Resumo de todas as evoluções registradas no mês atual."
            icon={<ClipboardList className="text-blue-600" />}
            onDownloadPDF={() => {
              const data = (props.evolutions || []).map(e => ({
                Data: e.date,
                Paciente: (props.patients || []).find(p => p.id === e.patientId)?.name || 'N/A',
                Conteúdo: e.content,
                Responsável: e.registeredBy
              }));
              downloadReport("Relatório de Evoluções", data, 'pdf');
            }}
            onDownloadWord={() => {
              const data = (props.evolutions || []).map(e => ({
                Data: e.date,
                Paciente: (props.patients || []).find(p => p.id === e.patientId)?.name || 'N/A',
                Conteúdo: e.content,
                Responsável: e.registeredBy
              }));
              downloadReport("Relatório de Evoluções", data, 'word');
            }}
          />
          <ReportCard 
            title="Histórico de Medicação" 
            description="Relatório detalhado de administrações e intercorrências."
            icon={<Pill className="text-amber-600" />}
            onDownloadPDF={() => {
              const data = (props.administrations || []).map(a => ({
                Data: a.date,
                Hora: a.scheduledTime,
                Paciente: (props.patients || []).find(p => p.id === a.patientId)?.name || 'N/A',
                Medicamento: (props.medications || []).find(m => m.id === a.medicationId)?.name || 'N/A',
                Status: a.status
              }));
              downloadReport("Histórico de Medicação", data, 'pdf');
            }}
            onDownloadWord={() => {
              const data = (props.administrations || []).map(a => ({
                Data: a.date,
                Hora: a.scheduledTime,
                Paciente: (props.patients || []).find(p => p.id === a.patientId)?.name || 'N/A',
                Medicamento: (props.medications || []).find(m => m.id === a.medicationId)?.name || 'N/A',
                Status: a.status
              }));
              downloadReport("Histórico de Medicação", data, 'word');
            }}
          />
          <ReportCard 
            title="Sinais Vitais" 
            description="Relatório de monitoramento de sinais vitais."
            icon={<Activity className="text-green-600" />}
            onDownloadPDF={() => {
              const data = (props.vitalSigns || []).map(v => ({
                Data: v.date,
                Hora: v.time,
                Paciente: (props.patients || []).find(p => p.id === v.patientId)?.name || 'N/A',
                PA: `${v.systolicBP}/${v.diastolicBP}`,
                FC: v.heartRate,
                Temp: v.temperature,
                Sat: v.saturation
              }));
              downloadReport("Relatório de Sinais Vitais", data, 'pdf');
            }}
            onDownloadWord={() => {
              const data = (props.vitalSigns || []).map(v => ({
                Data: v.date,
                Hora: v.time,
                Paciente: (props.patients || []).find(p => p.id === v.patientId)?.name || 'N/A',
                PA: `${v.systolicBP}/${v.diastolicBP}`,
                FC: v.heartRate,
                Temp: v.temperature,
                Sat: v.saturation
              }));
              downloadReport("Relatório de Sinais Vitais", data, 'word');
            }}
          />
          <ReportCard 
            title="Intercorrências" 
            description="Resumo de intercorrências registradas."
            icon={<AlertTriangle className="text-red-600" />}
            onDownloadPDF={() => {
              const data = (props.incidents || []).map(i => ({
                Data: i.date,
                Hora: i.time,
                Paciente: (props.patients || []).find(p => p.id === i.patientId)?.name || 'N/A',
                Tipo: i.type,
                Descrição: i.description,
                Conduta: i.conduct
              }));
              downloadReport("Relatório de Intercorrências", data, 'pdf');
            }}
            onDownloadWord={() => {
              const data = (props.incidents || []).map(i => ({
                Data: i.date,
                Hora: i.time,
                Paciente: (props.patients || []).find(p => p.id === i.patientId)?.name || 'N/A',
                Tipo: i.type,
                Descrição: i.description,
                Conduta: i.conduct
              }));
              downloadReport("Relatório de Intercorrências", data, 'word');
            }}
          />
        </div>
      </div>
    );
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
                {props.theme === 'light' ? <Sun className="text-yellow-500" /> : <Moon className="text-blue-400" />}
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">Tema do Sistema</p>
                <p className="text-xs text-gray-500">Alterne entre modo claro e escuro</p>
              </div>
            </div>
            <button 
              onClick={() => props.setTheme(props.theme === 'light' ? 'dark' : 'light')}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all"
            >
              {props.theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
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
              onClick={props.onLogout}
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
          title="Pacientes sob Cuidado" 
          value={stats.totalPatients} 
          icon={<Users className="text-blue-600" />} 
          trend="Ativos na ILPI"
          color="blue"
        />
        <StatCard 
          title="Medicações do Dia" 
          value={stats.pendingMeds} 
          icon={<Pill className="text-amber-600" />} 
          trend="Pendentes agora"
          color="amber"
        />
        <StatCard 
          title="Curativos Pendentes" 
          value={stats.pendingDressings} 
          icon={<Bandage className="text-purple-600" />} 
          trend="Para hoje"
          color="purple"
        />
        <StatCard 
          title="Alertas Críticos" 
          value={stats.alerts} 
          icon={<AlertTriangle className="text-red-600" />} 
          trend="Intercorrências hoje"
          color="red"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold flex items-center gap-2">
                <Activity className="text-green-600" size={20} />
                Monitoramento de Sinais Vitais
              </h3>
              <select className="text-xs bg-gray-50 dark:bg-gray-800 border-none rounded-lg px-3 py-1">
                <option>Últimos 7 dias</option>
                <option>Últimos 30 dias</option>
              </select>
            </div>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <AreaChart data={(props.vitalSigns || []).slice(0, 7).reverse()}>
                  <defs>
                    <linearGradient id="colorBP" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                  <XAxis dataKey="date" hide />
                  <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
                  <Tooltip 
                    contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)' }}
                  />
                  <Area type="monotone" dataKey="systolicBP" stroke="#10b981" fillOpacity={1} fill="url(#colorBP)" strokeWidth={3} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="text-amber-600" size={20} />
              Próximas Medicações
            </h3>
            <div className="space-y-3">
              {(props.administrations || [])
                .filter(a => a.status === 'PENDENTE')
                .slice(0, 5)
                .map(admin => {
                  const patient = (props.patients || []).find(p => p.id === admin.patientId);
                  const med = (props.medications || []).find(m => m.id === admin.medicationId);
                  return (
                    <div key={admin.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                          <Pill size={20} />
                        </div>
                        <div>
                          <p className="text-sm font-bold">{med?.name}</p>
                          <p className="text-xs text-gray-500">{patient?.name} • {admin.scheduledTime}</p>
                        </div>
                      </div>
                      <button className="px-3 py-1 bg-amber-600 text-white text-xs font-bold rounded-lg hover:bg-amber-700 transition-colors">
                        Checar
                      </button>
                    </div>
                  );
                })}
              {(props.administrations || []).filter(a => a.status === 'PENDENTE').length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm italic">Nenhuma medicação pendente para agora.</p>
              )}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <ClipboardList className="text-blue-600" size={20} />
              Últimas Evoluções
            </h3>
            <div className="space-y-4">
              {(props.evolutions || []).slice(0, 3).map(evo => {
                const patient = (props.patients || []).find(p => p.id === evo.patientId);
                return (
                  <div key={evo.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl group relative">
                    <div className="flex justify-between items-start mb-2">
                       <span className="text-[10px] font-bold text-blue-600 uppercase italic">{patient?.name || 'Paciente não encontrado'}</span>
                       <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                         <button onClick={() => { setEditingData(evo); setModalType('evolution'); setIsModalOpen(true); }} className="text-gray-400 hover:text-green-600"><Edit2 size={14} /></button>
                         <button onClick={() => setDeleteConfirm({ id: evo.id, type: 'evolution' })} className="text-gray-400 hover:text-red-600"><Trash2 size={14} /></button>
                       </div>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2 italic">"{evo.content}"</p>
                    <div className="flex justify-between items-center mt-2">
                       <p className="text-[10px] text-gray-400 uppercase font-bold">{evo.date} às {evo.time}</p>
                       <p className="text-[10px] text-gray-400 font-medium">Por: {evo.registeredBy}</p>
                    </div>
                  </div>
                );
              })}
              {(props.evolutions || []).length === 0 && <p className="text-center text-gray-400 py-4 text-xs italic">Sem evoluções registradas.</p>}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              Alertas Recentes
            </h3>
            <div className="space-y-4">
              {(props.incidents || []).slice(0, 4).map(incident => (
                <div key={incident.id} className="flex gap-3">
                  <div className="mt-1">
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{incident.type}</p>
                    <p className="text-xs text-gray-500 line-clamp-2">{incident.description}</p>
                    <p className="text-[10px] text-gray-400 mt-1">{incident.date} às {incident.time}</p>
                  </div>
                </div>
              ))}
              {(props.incidents || []).length === 0 && (
                <p className="text-center text-gray-400 py-4 text-sm italic">Sem intercorrências registradas.</p>
              )}
            </div>
          </div>

          <div className="bg-green-600 rounded-3xl p-6 text-white shadow-lg shadow-green-200 dark:shadow-none">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-white/20 rounded-xl">
                <Calendar size={20} />
              </div>
              <h3 className="font-bold">Plantão Atual</h3>
            </div>
            <p className="text-sm opacity-90 mb-4">Equipe responsável pelo turno da manhã:</p>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px]">EN</div>
                Enf. Maria Silva
              </div>
              <div className="flex items-center gap-2 text-sm font-medium">
                <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center text-[10px]">TE</div>
                Téc. João Santos
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar snap-x scroll-smooth sticky top-0 bg-gray-50 dark:bg-gray-950 z-10 lg:static lg:bg-transparent">
        <NavButton active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setEditingData(null); }} icon={<LayoutDashboard size={18} />} label="Dashboard" />
        <NavButton active={activeTab === 'patients'} onClick={() => { setActiveTab('patients'); setEditingData(null); }} icon={<Users size={18} />} label="Pacientes" />
        <NavButton active={activeTab === 'medication'} onClick={() => { setActiveTab('medication'); setEditingData(null); }} icon={<Pill size={18} />} label="Medicação" />
        <NavButton active={activeTab === 'vitals'} onClick={() => { setActiveTab('vitals'); setEditingData(null); }} icon={<Activity size={18} />} label="Sinais Vitais" />
        <NavButton active={activeTab === 'dressings'} onClick={() => { setActiveTab('dressings'); setEditingData(null); }} icon={<Bandage size={18} />} label="Curativos" />
        <NavButton active={activeTab === 'evolutions'} onClick={() => { setActiveTab('evolutions'); setEditingData(null); }} icon={<ClipboardList size={18} />} label="Evolução" />
        <NavButton active={activeTab === 'incidents'} onClick={() => { setActiveTab('incidents'); setEditingData(null); }} icon={<AlertTriangle size={18} />} label="Alertas" />
        <NavButton active={activeTab === 'shift'} onClick={() => { setActiveTab('shift'); setEditingData(null); }} icon={<Calendar size={18} />} label="Plantão" />
        <NavButton active={activeTab === 'reports'} onClick={() => { setActiveTab('reports'); setEditingData(null); }} icon={<FileText size={18} />} label="Relatórios" />
        <NavButton active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setEditingData(null); }} icon={<Settings size={18} />} label="Ajustes" />
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
            {activeTab === 'patients' && !selectedPatientId && <PatientsView patients={filteredPatients} elderly={elderly} onAdd={() => { setModalType('patient'); setIsModalOpen(true); }} onSelect={setSelectedPatientId} onDelete={(id) => setDeleteConfirm({ id, type: 'patient' })} />}
            {activeTab === 'patients' && selectedPatientId && selectedPatient && (
              <PatientDetailView 
                patient={selectedPatient} 
                medications={(props.medications || []).filter(m => m.patientId === selectedPatientId)}
                vitals={(props.vitalSigns || []).filter(v => v.patientId === selectedPatientId)}
                evolutions={(props.evolutions || []).filter(e => e.patientId === selectedPatientId)}
                avds={(props.avds || []).filter(a => a.patientId === selectedPatientId)}
                elderly={elderly}
                onBack={() => setSelectedPatientId(null)}
                onAddMedication={() => { setModalType('medication'); setIsModalOpen(true); }}
                onAddVital={() => { setModalType('vital'); setIsModalOpen(true); }}
                onAddEvolution={() => { setModalType('evolution'); setIsModalOpen(true); }}
                onAddAVD={() => { setModalType('avd'); setIsModalOpen(true); }}
                onAddDiaper={() => { setModalType('diaper'); setIsModalOpen(true); }}
                onAddDressing={() => { setModalType('dressing'); setIsModalOpen(true); }}
                onEditPatient={(p) => { setEditingData(p); setModalType('patient'); setIsModalOpen(true); }}
                onDeletePatient={(id) => setDeleteConfirm({ id, type: 'patient' })}
                onEditMedication={(m) => { setEditingData(m); setModalType('medication'); setIsModalOpen(true); }}
                onDeleteMedication={(id) => setDeleteConfirm({ id, type: 'medication' })}
                onEditVital={(v) => { setEditingData(v); setModalType('vital'); setIsModalOpen(true); }}
                onDeleteVital={(id) => setDeleteConfirm({ id, type: 'vital' })}
                onEditEvolution={(e) => { setEditingData(e); setModalType('evolution'); setIsModalOpen(true); }}
                onDeleteEvolution={(id) => setDeleteConfirm({ id, type: 'evolution' })}
              />
            )}
            {activeTab === 'medication' && (
              <MedicationView 
                patients={props.patients}
                medications={props.medications}
                administrations={props.administrations}
                onSaveMedication={props.onSaveMedication}
                onSaveAdministration={props.onSaveAdministration}
                onAddMedication={() => { setModalType('medication'); setIsModalOpen(true); }}
                onDeleteMedication={(id) => setDeleteConfirm({ id, type: 'medication' })}
                onEditMedication={(m) => {
                  setEditingData(m);
                  setModalType('medication');
                  setIsModalOpen(true);
                }}
                filter={medicationsPatientFilter}
                setFilter={setMedicationsPatientFilter}
              />
            )}
            {activeTab === 'vitals' && (
              <VitalSignsView 
                patients={props.patients}
                vitals={props.vitalSigns}
                filter={vitalsPatientFilter}
                setFilter={setVitalsPatientFilter}
                onAdd={() => { setModalType('vital'); setIsModalOpen(true); }}
                onEdit={(v) => { setEditingData(v); setModalType('vital'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'vital' })}
              />
            )}
            {activeTab === 'dressings' && (
              <DressingsView 
                patients={props.patients}
                dressings={props.dressings}
                filter={dressingsPatientFilter}
                setFilter={setDressingsPatientFilter}
                onAdd={() => { setModalType('dressing'); setIsModalOpen(true); }}
                onEdit={(d) => { setEditingData(d); setModalType('dressing'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'dressing' })}
              />
            )}
            {activeTab === 'evolutions' && (
              <EvolutionsView 
                patients={props.patients}
                evolutions={props.evolutions}
                filter={evolutionPatientFilter}
                setFilter={setEvolutionPatientFilter}
                onAdd={() => { setModalType('evolution'); setIsModalOpen(true); }}
                onEdit={(e) => { setEditingData(e); setModalType('evolution'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'evolution' })}
              />
            )}
            {activeTab === 'incidents' && (
              <IncidentsView 
                patients={props.patients}
                incidents={props.incidents}
                filter={incidentsPatientFilter}
                setFilter={setIncidentsPatientFilter}
                onAdd={() => { setModalType('incident'); setIsModalOpen(true); }}
                onEdit={(i) => { setEditingData(i); setModalType('incident'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'incident' })}
              />
            )}
            {activeTab === 'shift' && (
              <ShiftView 
                shifts={props.shifts}
                users={users}
                onAdd={() => { setModalType('shift'); setIsModalOpen(true); }}
                onEdit={(s) => { setEditingData(s); setModalType('shift'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'shift' })}
              />
            )}
            {activeTab === 'reports' && renderReports()}
            {activeTab === 'settings' && (
              <SettingsView 
                user={props.user}
                theme={props.theme}
                setTheme={props.setTheme}
                onLogout={props.onLogout}
                onPhotoClick={() => fileInputRef.current?.click()}
                fileInputRef={fileInputRef}
                onPhotoChange={handlePhotoChange}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
          {isModalOpen && (
            <NursingModal 
              type={modalType} 
              patients={patients}
              medications={medications}
              users={users}
              professionals={professionals}
              elderly={elderly}
              editingData={editingData}
              initialPatientId={selectedPatientId || undefined}
              showToast={props.showToast}
              user={props.user}
              onClose={() => { 
                setIsModalOpen(false); 
                setModalType(null); 
                setEditingData(null);
              }}
            onSavePatient={props.onSavePatient}
            onSaveMedication={props.onSaveMedication}
            onSaveAdministration={props.onSaveAdministration}
            onSaveVitalSigns={props.onSaveVitalSigns}
            onSaveDressing={props.onSaveDressing}
            onSaveEvolution={props.onSaveEvolution}
            onSaveIncident={props.onSaveIncident}
            onSaveShift={props.onSaveShift}
            onSaveAVD={props.onSaveAVD}
            onSaveDiaperChange={props.onSaveDiaperChange}
            onSavePhotos={props.onSavePhotos}
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
              await props.onDeletePatient(deleteConfirm.id);
              setSelectedPatientId(null);
            } else {
              const collectionMapping: { [key: string]: string } = {
                evolution: 'nursingEvolutions',
                incident: 'incidentRecords',
                medication: 'medications',
                vital: 'vitalSigns',
                dressing: 'dressingRecords',
                shift: 'shiftSchedules',
                avd: 'avdRecords',
                diaper: 'diaperChangeRecords'
              };
              const collectionName = collectionMapping[deleteConfirm.type];
              if (collectionName) {
                await props.onDeleteRecord(collectionName, deleteConfirm.id);
              }
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

// --- Sub-components ---

const ShiftView = ({ shifts, users, onAdd, onEdit, onDelete }: { 
  shifts: ShiftSchedule[], 
  users: StaffMember[],
  onAdd: () => void,
  onEdit: (s: ShiftSchedule) => void,
  onDelete: (id: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Escala de Plantão</h2>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Novo Plantão
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {(shifts || []).map(s => (
        <div key={s.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group relative flex flex-col h-full">
          <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button 
              onClick={() => onEdit(s)}
              className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
            >
              <Edit2 size={14} />
            </button>
            <button 
              onClick={() => onDelete(s.id)}
              className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
            >
              <Trash2 size={14} />
            </button>
          </div>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
              <Calendar size={20} />
            </div>
            <div>
              <h4 className="font-bold text-gray-800 dark:text-white">{s.date}</h4>
              <p className="text-xs font-bold text-green-600 uppercase">{s.shift}</p>
            </div>
          </div>
          <div className="space-y-4 flex-1">
            {s.observations && (
              <div className="p-3 bg-blue-50 dark:bg-blue-900/10 rounded-xl border border-blue-100 dark:border-blue-900/20">
                <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed italic">"{s.observations}"</p>
              </div>
            )}
            
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Enfermagem</p>
              <div className="flex flex-wrap gap-2">
                {(s.professionals || []).map((p) => (
                  <span key={p} className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold">
                    {p}
                  </span>
                ))}
              </div>
            </div>

            {(s.staffMemberIds || []).length > 0 && (
              <div className="space-y-2">
                <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Apoio (Cuidadores/Cozinha/Vigia)</p>
                <div className="flex flex-wrap gap-2">
                  {s.staffMemberIds?.map((id) => {
                    const member = users.find(m => m.id === id);
                    return (
                      <span key={id} className="px-2 py-1 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-lg text-[10px] font-bold">
                        {member?.name || 'Membro removido'}
                      </span>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  </div>
);

const ReportsView = ({ patients, evolutions, administrations, vitalSigns, incidents, medications }: { 
  patients: NursingPatient[], 
  evolutions: NursingEvolution[], 
  administrations: MedicationAdministration[],
  vitalSigns: VitalSigns[],
  incidents: IncidentRecord[],
  medications: Medication[]
}) => {
  const downloadReport = async (title: string, data: any[], formatType: 'pdf' | 'word') => {
    if (!data || data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    const body = data.map(item => Object.values(item));
    
    if (formatType === 'pdf') {
      await generateModernPDF({
        title,
        subtitle: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        columns,
        data: body,
        fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
      });
    } else {
      await generateModernWord({
        title,
        subtitle: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        columns,
        data: body,
        fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
      });
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Relatórios de Enfermagem</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard 
          title="Evolução Mensal" 
          description="Resumo de todas as evoluções registradas no mês atual."
          icon={<ClipboardList className="text-blue-600" />}
          onDownloadPDF={() => {
            const data = (evolutions || []).map(e => ({
              Data: e.date,
              Paciente: (patients || []).find(p => p.id === e.patientId)?.name || 'N/A',
              Conteúdo: e.content,
              Responsável: e.registeredBy
            }));
            downloadReport("Relatório de Evoluções", data, 'pdf');
          }}
          onDownloadWord={() => {
            const data = (evolutions || []).map(e => ({
              Data: e.date,
              Paciente: (patients || []).find(p => p.id === e.patientId)?.name || 'N/A',
              Conteúdo: e.content,
              Responsável: e.registeredBy
            }));
            downloadReport("Relatório de Evoluções", data, 'word');
          }}
        />
        <ReportCard 
          title="Histórico de Medicação" 
          description="Relatório detalhado de administrações e intercorrências."
          icon={<Pill className="text-amber-600" />}
          onDownloadPDF={() => {
            const data = (administrations || []).map(a => ({
              Data: a.date,
              Hora: a.scheduledTime,
              Paciente: (patients || []).find(p => p.id === a.patientId)?.name || 'N/A',
              Medicamento: (medications || []).find(m => m.id === a.medicationId)?.name || 'N/A',
              Status: a.status
            }));
            downloadReport("Histórico de Medicação", data, 'pdf');
          }}
          onDownloadWord={() => {
            const data = (administrations || []).map(a => ({
              Data: a.date,
              Hora: a.scheduledTime,
              Paciente: (patients || []).find(p => p.id === a.patientId)?.name || 'N/A',
              Medicamento: (medications || []).find(m => m.id === a.medicationId)?.name || 'N/A',
              Status: a.status
            }));
            downloadReport("Histórico de Medicação", data, 'word');
          }}
        />
        <ReportCard 
          title="Sinais Vitais" 
          description="Relatório de monitoramento de sinais vitais."
          icon={<Activity className="text-green-600" />}
          onDownloadPDF={() => {
            const data = (vitalSigns || []).map(v => ({
              Data: v.date,
              Hora: v.time,
              Paciente: (patients || []).find(p => p.id === v.patientId)?.name || 'N/A',
              PA: `${v.systolicBP}/${v.diastolicBP}`,
              FC: v.heartRate,
              Temp: v.temperature,
              Sat: v.saturation
            }));
            downloadReport("Relatório de Sinais Vitais", data, 'pdf');
          }}
          onDownloadWord={() => {
            const data = (vitalSigns || []).map(v => ({
              Data: v.date,
              Hora: v.time,
              Paciente: (patients || []).find(p => p.id === v.patientId)?.name || 'N/A',
              PA: `${v.systolicBP}/${v.diastolicBP}`,
              FC: v.heartRate,
              Temp: v.temperature,
              Sat: v.saturation
            }));
            downloadReport("Relatório de Sinais Vitais", data, 'word');
          }}
        />
        <ReportCard 
          title="Intercorrências" 
          description="Resumo de intercorrências registradas."
          icon={<AlertTriangle className="text-red-600" />}
          onDownloadPDF={() => {
            const data = (incidents || []).map(i => ({
              Data: i.date,
              Hora: i.time,
              Paciente: (patients || []).find(p => p.id === i.patientId)?.name || 'N/A',
              Tipo: i.type,
              Descrição: i.description,
              Conduta: i.conduct
            }));
            downloadReport("Relatório de Intercorrências", data, 'pdf');
          }}
          onDownloadWord={() => {
            const data = (incidents || []).map(i => ({
              Data: i.date,
              Hora: i.time,
              Paciente: (patients || []).find(p => p.id === i.patientId)?.name || 'N/A',
              Tipo: i.type,
              Descrição: i.description,
              Conduta: i.conduct
            }));
            downloadReport("Relatório de Intercorrências", data, 'word');
          }}
        />
      </div>
    </div>
  );
};

const SettingsView = ({ user, theme, setTheme, onLogout, onPhotoClick, fileInputRef, onPhotoChange }: { 
  user: UserType, 
  theme: 'light' | 'dark', 
  setTheme: (t: 'light' | 'dark') => void, 
  onLogout: () => void,
  onPhotoClick: () => void,
  fileInputRef: React.RefObject<HTMLInputElement>,
  onPhotoChange: (e: React.ChangeEvent<HTMLInputElement>) => void
}) => (
  <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in duration-500">
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800 text-center">
      <div className="relative inline-block group">
        <div className="w-24 h-24 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-600 font-bold text-3xl mx-auto mb-4 overflow-hidden">
          {user.photoUrl ? (
            <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            user.name.charAt(0)
          )}
        </div>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={onPhotoChange} 
          className="hidden" 
          accept="image/*" 
        />
        <button 
          onClick={onPhotoClick}
          className="absolute -bottom-2 -right-2 p-2 bg-green-600 text-white rounded-xl shadow-lg hover:bg-green-700 transition-all transform group-hover:scale-110"
        >
          <Plus size={16} />
        </button>
      </div>
      <h3 className="text-2xl font-black text-gray-800 dark:text-white">{user.name}</h3>
      <p className="text-gray-500 font-medium mb-6">Enfermeira • COREN: {user.registrationNumber || 'Não informado'}</p>
      
      <div className="grid grid-cols-2 gap-4">
        <button 
          onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
          className="flex items-center justify-center gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl font-bold text-sm hover:bg-gray-100 transition-all"
        >
          {theme === 'light' ? <Moon size={20} /> : <Sun size={20} />}
          {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
        </button>
        <button 
          onClick={onLogout}
          className="flex items-center justify-center gap-2 p-4 bg-red-50 dark:bg-red-900/10 text-red-600 rounded-2xl font-bold text-sm hover:bg-red-100 transition-all"
        >
          <LogOut size={20} />
          Sair do App
        </button>
      </div>
    </div>
  </div>
);

const ReportCard = ({ title, description, icon, onDownloadPDF, onDownloadWord }: { title: string, description: string, icon: React.ReactNode, onDownloadPDF: () => void, onDownloadWord: () => void }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-start gap-4 hover:border-green-200 transition-all text-left group">
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl group-hover:bg-green-50 transition-colors">
      {icon}
    </div>
    <div className="flex-1">
      <h4 className="font-bold text-gray-800 dark:text-white mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed mb-4">{description}</p>
      <div className="flex gap-2">
        <button 
          onClick={onDownloadPDF}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-50 text-blue-600 rounded-xl text-[10px] font-bold hover:bg-blue-100 transition-colors"
        >
          <Download size={14} />
          PDF
        </button>
        <button 
          onClick={onDownloadWord}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-green-50 text-green-600 rounded-xl text-[10px] font-bold hover:bg-green-100 transition-colors"
        >
          <FileText size={14} />
          WORD
        </button>
      </div>
    </div>
  </div>
);

const NursingModal = ({ type, patients, medications, users, professionals, elderly, onClose, onSavePatient, onSaveMedication, onSaveAdministration, onSaveVitalSigns, onSaveDressing, onSaveEvolution, onSaveIncident, onSaveShift, onSaveAVD, onSaveDiaperChange, onSavePhotos, editingData, initialPatientId, showToast, user }: {
  type: string | null,
  patients: NursingPatient[],
  medications: Medication[],
  users: StaffMember[],
  professionals: Professional[],
  elderly: Elderly[],
  onClose: () => void,
  onSavePatient: any,
  onSaveMedication: any,
  onSaveAdministration: any,
  onSaveVitalSigns: any,
  onSaveDressing: any,
  onSaveEvolution: any,
  onSaveIncident: any,
  onSaveShift: any,
  onSaveAVD: any,
  onSaveDiaperChange: any,
  onSavePhotos: any,
  editingData?: any,
  initialPatientId?: string,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  user: UserType
}) => {
  const [formData, setFormData] = useState<any>(editingData || {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    status: 'PENDENTE',
    photos: [],
    patientId: initialPatientId || '',
    elderlyId: editingData?.elderlyId || '',
    content: '',
    woundType: '',
    location: '',
    aspect: '',
    conduct: '',
    nextChangeDate: format(addDays(new Date(), 1), 'yyyy-MM-dd'),
    // Inicialização campos paciente para evitar undefined
    name: '',
    fullName: '',
    age: 0,
    diagnosis: '',
    comorbidities: '',
    allergies: '',
    fallRisk: 'BAIXO',
    riskLevel: 'BAIXO',
    careDegree: 'GRAU_1',
    familyContact: ''
  });
  const [isExtracting, setIsExtracting] = useState(false);

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
        age: age
      }));
    }
  }, [linkedElderly, type]);

  const handleDigitize = async (text: string) => {
    if (!text) return;
    setIsExtracting(true);
    try {
      const schemas: Record<string, string> = {
        patient: "name, fullName, age (number), diagnosis, comorbidities, allergies, fallRisk (BAIXO, MEDIO, ALTO), familyContact, careDegree (GRAU_1, GRAU_2, GRAU_3)",
        medication: "name, dosage, frequency, route, description, type (CONTINUA, CONTROLADA, SOS)",
        vital: "systolicBP (number), diastolicBP (number), heartRate (number), temperature (number), saturation (number), bloodGlucose (number)",
        dressing: "location, woundType, aspect, observations, nextChangeDate",
        evolution: "content",
        incident: "type, description, conduct, notes",
        avd: "feedingStatus, hygieneStatus, mobilityStatus, description",
        diaper: "type (TROCA_TOTAL, REVISAO, HIGIENE), observation"
      };
      
      const extractedData = await extractFormData(text, schemas[type] || "description, observations");
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
      } else {
        if (type === 'evolution') {
          setFormData((prev: any) => ({ ...prev, content: (prev.content || '') + '\n' + text }));
        } else if (type === 'incident') {
          setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
        } else if (type === 'dressing') {
          setFormData((prev: any) => ({ ...prev, appearance: (prev.appearance || '') + '\n' + text }));
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
      const id = editingData?.id;

      switch (type) {
        case 'patient': await onSavePatient(data, id); break;
        case 'medication': await onSaveMedication({ ...data, registeredBy: user.name }, id); break;
        case 'vital': await onSaveVitalSigns({ ...data, registeredBy: user.name }, id); break;
        case 'dressing': await onSaveDressing({ ...data, registeredBy: user.name }, id); break;
        case 'evolution': await onSaveEvolution({ ...data, registeredBy: data.registeredBy || user.name }, id); break;
        case 'incident': await onSaveIncident({ ...data, registeredBy: user.name }, id); break;
        case 'shift': await onSaveShift(data, id); break;
        case 'avd': await onSaveAVD(data, id); break;
        case 'diaper': await onSaveDiaperChange(data, id); break;
      }

      if (photos && photos.length > 0 && formData.patientId) {
        const patient = (patients || []).find(p => p.id === formData.patientId);
        const activityType = 
          type === 'evolution' ? 'Evolução de Enfermagem' :
          type === 'dressing' ? 'Curativo' :
          type === 'incident' ? 'Intercorrência' : 'Atividade de Enfermagem';
        
        await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.evolution || formData.description || formData.aspect || formData.content);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-2 sm:p-4">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 rounded-[2.5rem] max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 flex flex-col max-h-[95vh] overflow-hidden"
      >
        <div className="p-5 md:p-8 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-4">
            <div className={cn(
              "p-3 rounded-2xl hidden sm:flex",
              type === 'vital' ? "bg-red-50 text-red-600 dark:bg-red-900/30" :
              type === 'dressing' ? "bg-amber-50 text-amber-600 dark:bg-amber-900/30" :
              type === 'evolution' ? "bg-blue-50 text-blue-600 dark:bg-blue-900/30" :
              "bg-green-50 text-green-600 dark:bg-green-900/30"
            )}>
              {type === 'vital' ? <Activity size={24} /> :
               type === 'dressing' ? <Bandage size={24} /> :
               type === 'evolution' ? <ClipboardList size={24} /> :
               <Plus size={24} />}
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1 leading-none">
                {type === 'patient' ? 'Cadastro' : 
                 type === 'medication' ? 'Medicação' :
                 type === 'vital' ? 'Sinais Vitais' :
                 type === 'dressing' ? 'Curativo' :
                 type === 'evolution' ? 'Evolução' :
                 type === 'incident' ? 'Intercorrência' :
                 type === 'shift' ? 'Escala de Plantão' :
                 type === 'avd' ? 'Status AVD' : 'Troca de Fralda'}
              </p>
              <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-tight leading-none">
                {editingData ? 'Editar Registro' : 'Novo Registro'}
              </h3>
              {formData.patientId && type !== 'patient' && (
                <div className="mt-2 flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></div>
                  <p className="text-[11px] font-black text-green-600 dark:text-green-500 uppercase tracking-tight">
                    {(patients || []).find(p => p.id === formData.patientId)?.name || 'Paciente'}
                  </p>
                </div>
              )}
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="group flex flex-col items-center gap-1 p-2 focus:outline-none"
          >
            <div className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 group-hover:text-red-500 group-hover:bg-red-50 dark:group-hover:bg-red-900/20 rounded-2xl transition-all shadow-sm border border-gray-100 dark:border-gray-700">
              <X size={20} className="transition-transform group-hover:rotate-90" />
            </div>
            <span className="text-[9px] font-black text-gray-400 uppercase tracking-tighter transition-colors group-hover:text-red-500">Fechar</span>
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto p-6 md:p-10 custom-scrollbar">
          <form id="nursing-form" onSubmit={handleSubmit} className="space-y-8 pb-32">
            {type !== 'patient' && type !== 'shift' && (
            <div className="space-y-3">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Paciente</label>
              <select 
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-green-500 transition-all font-bold"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o paciente</option>
                {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {type === 'patient' && (
            <div className="space-y-6">
              <div className="space-y-3 p-4 bg-green-50 dark:bg-green-900/10 rounded-3xl border border-green-100 dark:border-green-900/30">
                <label className="text-xs font-bold text-green-600 dark:text-green-400 uppercase ml-1 flex items-center gap-2">
                  <Users size={14} />
                  Vincular ao Cadastro Geral (Idosos)
                </label>
                <select 
                  className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm focus:ring-2 focus:ring-green-500 transition-all font-bold dark:text-white"
                  value={formData.elderlyId || ''}
                  onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
                >
                  <option value="">-- Não vinculado / Novo Cadastro --</option>
                  {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
                <p className="text-[10px] text-green-600/60 ml-1 italic font-medium">Ao vincular, os dados de nome, idade e CPF serão sincronizados automaticamente da área geral.</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="md:col-span-1 lg:col-span-2">
                  <Input 
                    label="Nome Completo" 
                    value={formData.name} 
                    onChange={(v) => setFormData({ ...formData, name: v })} 
                    disabled={!!formData.elderlyId}
                  />
                </div>
                <Input 
                  label="Idade" 
                  type="number" 
                  value={formData.age} 
                  onChange={(v) => setFormData({ ...formData, age: v === '' ? 0 : parseInt(v) })} 
                  disabled={!!formData.elderlyId}
                />
              </div>
              <Input label="Diagnóstico Principal" value={formData.diagnosis} onChange={(v) => setFormData({ ...formData, diagnosis: v })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Input label="Comorbidades" value={formData.comorbidities} onChange={(v) => setFormData({ ...formData, comorbidities: v })} />
                <Input label="Alergias" value={formData.allergies} onChange={(v) => setFormData({ ...formData, allergies: v })} />
              </div>
              <Input label="Contato Familiar Principal" value={formData.familyContact} onChange={(v) => setFormData({ ...formData, familyContact: v })} />
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-gray-100 dark:border-gray-800">
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1 tracking-wider">Risco de Queda</label>
                  <select 
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-black focus:ring-4 focus:ring-green-500/10 outline-none transition-all dark:text-white appearance-none" 
                    value={formData.fallRisk || 'BAIXO'} 
                    onChange={(e) => setFormData({ ...formData, fallRisk: e.target.value, riskLevel: e.target.value })}
                  >
                    <option value="BAIXO">BAIXO</option>
                    <option value="MEDIO">MÉDIO</option>
                    <option value="ALTO">ALTO</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1 tracking-wider">Grau de Dependência</label>
                  <select 
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-black focus:ring-4 focus:ring-green-500/10 outline-none transition-all dark:text-white appearance-none" 
                    value={formData.careDegree || 'GRAU_1'} 
                    onChange={(e) => setFormData({ ...formData, careDegree: e.target.value })}
                  >
                    <option value="GRAU_1">GRAU 1</option>
                    <option value="GRAU_2">GRAU 2</option>
                    <option value="GRAU_3">GRAU 3</option>
                  </select>
                </div>
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1 tracking-wider">Acamado?</label>
                  <select 
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-black focus:ring-4 focus:ring-green-500/10 outline-none transition-all dark:text-white appearance-none" 
                    value={formData.isBedridden ? 'true' : 'false'} 
                    onChange={(e) => setFormData({ ...formData, isBedridden: e.target.value === 'true' })}
                  >
                    <option value="false">Não (Móvel)</option>
                    <option value="true">Sim (Acamado)</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {type === 'medication' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input label="Nome do Medicamento" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
              <Input label="Dosagem" value={formData.dosage} onChange={(v) => setFormData({ ...formData, dosage: v })} />
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Medicação</label>
                <select 
                  value={formData.type || 'CONTINUA'}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold focus:ring-2 focus:ring-green-500 transition-all"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="CONTINUA">Contínua</option>
                  <option value="CONTROLADA">Controlada</option>
                  <option value="PONTUAL">Pontual</option>
                </select>
              </div>
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Via de Administração</label>
                <select 
                  value={formData.route || 'ORAL'}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold focus:ring-2 focus:ring-green-500 transition-all"
                  onChange={(e) => setFormData({ ...formData, route: e.target.value })}
                >
                  <option value="ORAL">Oral</option>
                  <option value="IV">Intravenosa (IV)</option>
                  <option value="IM">Intramuscular (IM)</option>
                  <option value="SUBCUTANEA">Subcutânea</option>
                  <option value="TOPICA">Tópica</option>
                  <option value="OUTRA">Outra</option>
                </select>
              </div>
              <Input label="Frequência" value={formData.frequency} onChange={(v) => setFormData({ ...formData, frequency: v })} />
              <Input label="Data de Início" type="date" value={formData.startDate} onChange={(v) => setFormData({ ...formData, startDate: v })} />
              <Input label="Data de Término (Opcional)" type="date" value={formData.endDate} onChange={(v) => setFormData({ ...formData, endDate: v })} />
              <Input label="Período de Uso (Ex: 7 dias)" value={formData.period} onChange={(v) => setFormData({ ...formData, period: v })} />
              <Input label="Prescritor / Médico" value={formData.prescriber} onChange={(v) => setFormData({ ...formData, prescriber: v })} />
              <div className="space-y-3 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Horários (separados por vírgula)</label>
                <input 
                  type="text"
                  placeholder="Ex: 08:00, 20:00"
                  value={formData.times?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, times: e.target.value.split(',').map((t: string) => t.trim()) })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold"
                />
              </div>
            </div>
          )}

          {type === 'dressing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-50 dark:border-gray-800 pb-8">
              <Input label="Data do Procedimento" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              <Input label="Hora" type="time" value={formData.time} onChange={(v) => setFormData({ ...formData, time: v })} />
            </div>
          )}

          {type === 'dressing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <Input label="Tipo de Lesão" value={formData.woundType} onChange={(v) => setFormData({ ...formData, woundType: v })} />
              <Input label="Localização" value={formData.location} onChange={(v) => setFormData({ ...formData, location: v })} />
              <div className="md:col-span-2 space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Aspecto</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, aspect: (formData.aspect || '') + ' ' + t })} />
                </div>
                <textarea 
                  value={formData.aspect || ''}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm min-h-[120px] font-medium"
                  onChange={(e) => setFormData({ ...formData, aspect: e.target.value })}
                />
              </div>
              <Input label="Próxima Troca" type="date" value={formData.nextChangeDate} onChange={(v) => setFormData({ ...formData, nextChangeDate: v })} />
            </div>
          )}

          {type === 'incident' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-50 dark:border-gray-800 pb-8">
              <Input label="Data da Ocorrência" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              <Input label="Hora" type="time" value={formData.time} onChange={(v) => setFormData({ ...formData, time: v })} />
            </div>
          )}

          {type === 'incident' && (
            <div className="space-y-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Intercorrência</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold" value={formData.type || 'FEBRE'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="FEBRE">Febre</option>
                  <option value="QUEDA">Queda</option>
                  <option value="MAL_ESTAR">Mal-estar</option>
                  <option value="INTERNACAO">Internação</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Descrição</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
                </div>
                <textarea 
                  value={formData.description || ''}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm min-h-[120px] font-medium"
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Input label="Conduta Tomada" value={formData.conduct} onChange={(v) => setFormData({ ...formData, conduct: v })} />
            </div>
          )}

          {type === 'avd' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-50 dark:border-gray-800 pb-8">
              <Input label="Data da Avaliação" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              <Input label="Hora" type="time" value={formData.time} onChange={(v) => setFormData({ ...formData, time: v })} />
            </div>
          )}

          {type === 'avd' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <AVDSelect label="Alimentação" value={formData.feeding} onChange={(v) => setFormData({ ...formData, feeding: v })} />
              <AVDSelect label="Higiene" value={formData.hygiene} onChange={(v) => setFormData({ ...formData, hygiene: v })} />
              <AVDSelect label="Vestuário" value={formData.dressing} onChange={(v) => setFormData({ ...formData, dressing: v })} />
              <AVDSelect label="Mobilidade" value={formData.mobility} onChange={(v) => setFormData({ ...formData, mobility: v })} />
            </div>
          )}

          {type === 'diaper' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-50 dark:border-gray-800 pb-8">
              <Input label="Data do Registro" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              <Input label="Hora" type="time" value={formData.time} onChange={(v) => setFormData({ ...formData, time: v })} />
            </div>
          )}

          {type === 'diaper' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo de Eliminação</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold" value={formData.type || 'DIURESE'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="DIURESE">Diurese</option>
                  <option value="EVACUAÇÃO">Evacuação</option>
                  <option value="AMBOS">Ambos</option>
                </select>
              </div>
              <Input label="Aspecto" value={formData.aspect} onChange={(v) => setFormData({ ...formData, aspect: v })} />
            </div>
          )}

          {type === 'shift' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Data" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Turno</label>
                  <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold" value={formData.shift || 'MANHÃ'} onChange={(e) => setFormData({ ...formData, shift: e.target.value })}>
                    <option value="MANHÃ">Manhã</option>
                    <option value="TARDE">Tarde</option>
                    <option value="NOITE">Noite</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Column: Projeto Conviver */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Profissionais do Projeto Conviver</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl custom-scrollbar border border-gray-100 dark:border-gray-700">
                    {professionals.filter(p => p.status === 'ATIVO').map(p => (
                      <label key={p.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl cursor-pointer hover:ring-2 hover:ring-blue-500 border border-transparent transition-all shadow-sm">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded text-blue-600 focus:ring-blue-500"
                          checked={(formData.professionals || []).includes(p.name)}
                          onChange={(e) => {
                            const names = formData.professionals || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, professionals: [...names, p.name] });
                            } else {
                              setFormData({ ...formData, professionals: names.filter((n: string) => n !== p.name) });
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{p.name}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-black">{p.role}</span>
                        </div>
                      </label>
                    ))}
                    {professionals.filter(p => p.status === 'ATIVO').length === 0 && (
                      <p className="text-center text-xs text-gray-500 font-bold py-4 italic">Nenhum profissional disponível.</p>
                    )}
                  </div>
                </div>

                {/* Column: Instituição */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Profissionais da Instituição (Apoio)</label>
                  <div className="grid grid-cols-1 gap-2 max-h-60 overflow-y-auto p-4 bg-gray-50 dark:bg-gray-800 rounded-3xl custom-scrollbar border border-green-100 dark:border-green-900/20">
                    {users.filter(s => s.status === 'ATIVO').map(s => (
                      <label key={s.id} className="flex items-center gap-3 p-3 bg-white dark:bg-gray-900 rounded-xl cursor-pointer hover:ring-2 hover:ring-green-500 border border-transparent transition-all shadow-sm">
                        <input 
                          type="checkbox" 
                          className="w-5 h-5 rounded text-green-600 focus:ring-green-500"
                          checked={(formData.staffMemberIds || []).includes(s.id)}
                          onChange={(e) => {
                            const ids = formData.staffMemberIds || [];
                            if (e.target.checked) {
                              setFormData({ ...formData, staffMemberIds: [...ids, s.id] });
                            } else {
                              setFormData({ ...formData, staffMemberIds: ids.filter((id: string) => id !== s.id) });
                            }
                          }}
                        />
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-gray-800 dark:text-white">{s.name}</span>
                          <span className="text-[10px] text-gray-400 uppercase font-black">{safeReplace(s.role, '_', ' ')}</span>
                        </div>
                      </label>
                    ))}
                    {users.filter(s => s.status === 'ATIVO').length === 0 && (
                      <p className="text-center text-xs text-gray-500 font-bold py-4 italic">Nenhum apoio disponível.</p>
                    )}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Observações Gerais</label>
                <textarea 
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-[2rem] px-6 py-5 text-sm font-medium min-h-[120px] outline-none focus:ring-2 focus:ring-green-500 shadow-inner"
                  placeholder="Relate aqui as ocorrências e observações do turno..."
                  value={formData.observations || ''}
                  onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                />
              </div>
            </div>
          )}

          {type === 'vital' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8 border-b border-gray-50 dark:border-gray-800 pb-8">
              <Input label="Data do Registro" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
              <Input label="Hora" type="time" value={formData.time} onChange={(v) => setFormData({ ...formData, time: v })} />
            </div>
          )}

          {type === 'vital' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
              <Input label="Sistólica" type="number" value={formData.systolicBP} onChange={(v) => setFormData({ ...formData, systolicBP: parseInt(v) })} />
              <Input label="Diastólica" type="number" value={formData.diastolicBP} onChange={(v) => setFormData({ ...formData, diastolicBP: parseInt(v) })} />
              <Input label="FC (bpm)" type="number" value={formData.heartRate} onChange={(v) => setFormData({ ...formData, heartRate: parseInt(v) })} />
              <Input label="Temp (°C)" type="number" step="0.1" value={formData.temperature} onChange={(v) => setFormData({ ...formData, temperature: parseFloat(v) })} />
              <Input label="Sat (%)" type="number" value={formData.saturation} onChange={(v) => setFormData({ ...formData, saturation: parseInt(v) })} />
              <Input label="Glicemia" type="number" value={formData.bloodGlucose} onChange={(v) => setFormData({ ...formData, bloodGlucose: parseInt(v) })} />
            </div>
          )}

          {type === 'evolution' && (
            <div className="space-y-8">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <Input label="Data da Evolução" type="date" value={formData.date} onChange={(v) => setFormData({ ...formData, date: v })} />
                <Input label="Hora" type="time" value={formData.time} onChange={(v) => setFormData({ ...formData, time: v })} />
              </div>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Evolução</label>
                  <div className="flex gap-2">
                    <button 
                      type="button"
                      disabled={isExtracting || !formData.content}
                      onClick={async () => {
                        if (!formData.content) return;
                        setIsExtracting(true);
                        try {
                          const fixed = await fixGrammar(formData.content);
                          setFormData({ ...formData, content: fixed });
                          showToast('Texto corrigido com sucesso', 'success');
                        } catch (err) {
                          console.error(err);
                          showToast('Erro ao corrigir texto', 'error');
                        } finally {
                          setIsExtracting(false);
                        }
                      }}
                      className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:text-blue-700 transition-colors bg-blue-50 dark:bg-blue-900/30 px-3 py-1.5 rounded-xl disabled:opacity-50"
                    >
                      {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap size={14} />}
                      Corrigir Texto
                    </button>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, content: (formData.content || '') + ' ' + t })} />
                  </div>
                </div>
                <textarea 
                  value={formData.content || ''}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm min-h-[180px] font-medium"
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  placeholder="Descreva a evolução do paciente..."
                />
              </div>
            </div>
          )}

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
              <DigitizeButton onDigitize={handleDigitize} />
            </div>
            <PhotoUpload photos={formData.photos} onChange={photos => setFormData({ ...formData, photos })} />
          </div>

          </form>
        </div>

        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 border-t border-gray-50 dark:border-gray-800 sticky bottom-0 z-10 shrink-0">
          <div className="flex gap-4">
            <button 
              type="button" 
              onClick={onClose} 
              className="flex-1 px-8 py-5 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-black rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all uppercase tracking-tight text-sm"
            >
              Cancelar
            </button>
            <button 
              form="nursing-form"
              type="submit" 
              className="flex-1 px-8 py-5 bg-green-600 text-white font-black rounded-2xl shadow-xl shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all uppercase tracking-tight text-sm"
            >
              {editingData ? 'Salvar Edição' : 'Salvar Registro'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const Input = ({ label, type = "text", value, onChange, step, disabled }: { label: string, type?: string, value?: any, onChange: (v: string) => void, step?: string, disabled?: boolean }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">{label}</label>
    <input 
      type={type}
      step={step}
      value={value === 0 ? '0' : (value || '')}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={cn(
        "w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-6 py-5 text-sm font-bold focus:ring-4 focus:ring-green-500/10 outline-none transition-all dark:text-white",
        disabled && "opacity-50 cursor-not-allowed bg-gray-100 dark:bg-gray-700"
      )} 
    />
  </div>
);

const AVDSelect = ({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <select 
      value={value || ''}
      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione...</option>
      <option value="INDEPENDENTE">Independente (Realiza sozinho)</option>
      <option value="ASSISTIDA">Assistida (Precisa de ajuda)</option>
      <option value="DEPENDENTE">Dependente (Não realiza sozinho)</option>
    </select>
  </div>
);

const VitalSignsView = ({ patients, vitals, onAdd, onEdit, onDelete, filter, setFilter }: { 
  patients: NursingPatient[], 
  vitals: VitalSigns[], 
  onAdd: () => void,
  onEdit: (v: VitalSigns) => void,
  onDelete: (id: string) => void,
  filter: string,
  setFilter: (f: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Sinais Vitais</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Todos os Idosos</option>
          {(patients || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Novo Registro
      </button>
    </div>
    <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="bg-gray-50 dark:bg-gray-800/50">
            <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
              <th className="px-6 py-4">Paciente</th>
              <th className="px-6 py-4">Data/Hora</th>
              <th className="px-6 py-4">PA</th>
              <th className="px-6 py-4">FC</th>
              <th className="px-6 py-4">Temp</th>
              <th className="px-6 py-4">Sat</th>
              <th className="px-6 py-4">Glic</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Ações</th>
            </tr>
          </thead>
          <tbody className="text-sm divide-y divide-gray-50 dark:divide-gray-800">
            {(vitals || []).filter(v => !filter || v.patientId === filter).map(v => {
              const patient = (patients || []).find(p => p.id === v.patientId);
              const isAltered = v.systolicBP > 140 || v.systolicBP < 90 || v.temperature > 37.5 || v.saturation < 92;
              return (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold">{patient?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{(v.date || (v as any).createdAt || '').split('T')[0]} {v.time || ''}</td>
                  <td className="px-6 py-4 font-bold">{v.systolicBP}/{v.diastolicBP}</td>
                  <td className="px-6 py-4">{v.heartRate} bpm</td>
                  <td className="px-6 py-4">{v.temperature}°C</td>
                  <td className="px-6 py-4">{v.saturation}%</td>
                  <td className="px-6 py-4">{v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : '-'}</td>
                  <td className="px-6 py-4">
                    <span className={cn("px-2 py-1 rounded-lg text-[10px] font-bold", 
                      isAltered ? "bg-red-100 text-red-600" : "bg-green-100 text-green-600"
                    )}>
                      {isAltered ? 'ALTERADO' : 'NORMAL'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex gap-2">
                      <button 
                        onClick={() => onEdit(v)}
                        className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => onDelete(v.id)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

const DressingsView = ({ patients, dressings, onAdd, onEdit, onDelete, filter, setFilter }: { 
  patients: NursingPatient[], 
  dressings: DressingRecord[], 
  onAdd: () => void,
  onEdit: (d: DressingRecord) => void,
  onDelete: (id: string) => void,
  filter: string,
  setFilter: (f: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Controle de Curativos</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Todos os Idosos</option>
          {(patients || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Novo Curativo
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(dressings || []).filter(d => !filter || d.patientId === filter).map(d => {
        const patient = (patients || []).find(p => p.id === d.patientId);
        return (
          <div key={d.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4 group">
            <div className="flex justify-between items-start">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600">
                  <Bandage size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">{patient?.name}</h4>
                  <p className="text-xs text-gray-500">{d.woundType} • {d.location}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{d.date}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(d)}
                    className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDelete(d.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl text-xs text-gray-600 dark:text-gray-400">
              <p className="font-bold mb-1">Aspecto:</p>
              <p>{d.aspect}</p>
            </div>
            <div className="flex justify-between items-center pt-2">
              <div className="flex items-center gap-2 text-[10px] font-bold text-amber-600">
                <Calendar size={14} />
                Próxima Troca: {d.nextChangeDate}
              </div>
              <button className="text-xs font-bold text-green-600 hover:underline" onClick={() => onEdit(d)}>Ver Detalhes</button>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const EvolutionsView = ({ patients, evolutions, onAdd, onEdit, onDelete, filter, setFilter }: { 
  patients: NursingPatient[], 
  evolutions: NursingEvolution[], 
  onAdd: () => void,
  onEdit: (e: NursingEvolution) => void,
  onDelete: (id: string) => void,
  filter: string,
  setFilter: (f: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Evoluções de Enfermagem</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Todos os Idosos</option>
          {(patients || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Nova Evolução
      </button>
    </div>
    <div className="space-y-4">
      {(evolutions || []).filter(e => !filter || e.patientId === filter).map(e => {
        const patient = (patients || []).find(p => p.id === e.patientId);
        return (
          <div key={e.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                  {patient?.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">{patient?.name}</h4>
                  <p className="text-xs text-gray-500">{(e.date || (e as any).createdAt || '').split('T')[0]} às {e.time || '--:--'} • Enf. Responsável</p>
                </div>
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => onEdit(e)}
                  className="p-2 text-gray-400 hover:text-green-600 transition-colors"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDelete(e.id)}
                  className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{e.content}</p>
            <div className="mt-4 pt-4 border-t border-gray-50 dark:border-gray-800 flex gap-4">
              <div className="text-[10px] font-bold text-gray-400 uppercase">Registrado por: {e.registeredBy}</div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const IncidentsView = ({ patients, incidents, onAdd, onEdit, onDelete, filter, setFilter }: { 
  patients: NursingPatient[], 
  incidents: IncidentRecord[], 
  onAdd: () => void,
  onEdit: (i: IncidentRecord) => void,
  onDelete: (id: string) => void,
  filter: string,
  setFilter: (f: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <div className="flex items-center gap-4">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Intercorrências e Alertas</h2>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
        >
          <option value="">Todos os Idosos</option>
          {(patients || []).map(p => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <button onClick={onAdd} className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all">
        <Plus size={20} />
        Registrar Alerta
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {(incidents || []).filter(i => !filter || i.patientId === filter).map(i => {
        const patient = (patients || []).find(p => p.id === i.patientId);
        return (
          <div key={i.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/30 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-1 h-full bg-red-500" />
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-xl flex items-center justify-center text-red-600">
                  <AlertTriangle size={20} />
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">{patient?.name}</h4>
                  <p className="text-xs font-bold text-red-600 uppercase">{i.type}</p>
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="text-[10px] font-bold text-gray-400 uppercase">{i.date} {i.time}</span>
                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button 
                    onClick={() => onEdit(i)}
                    className="p-1.5 text-gray-400 hover:text-green-600 transition-colors"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDelete(i.id)}
                    className="p-1.5 text-gray-400 hover:text-red-600 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{i.description}</p>
            <div className="p-3 bg-red-50 dark:bg-red-900/10 rounded-2xl text-xs text-red-700 dark:text-red-400">
              <p className="font-bold mb-1">Conduta Tomada:</p>
              <p>{i.conduct}</p>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);

const PatientDetailView = ({ 
  patient, 
  medications, 
  vitals, 
  evolutions,
  avds,
  elderly,
  onBack, 
  onAddMedication, 
  onAddVital, 
  onAddEvolution, 
  onAddAVD, 
  onAddDiaper, 
  onAddDressing,
  onEditPatient, 
  onDeletePatient,
  onEditMedication,
  onDeleteMedication,
  onEditVital,
  onDeleteVital,
  onEditEvolution,
  onDeleteEvolution
}: { 
  patient: NursingPatient, 
  medications: Medication[], 
  vitals: VitalSigns[],
  evolutions: NursingEvolution[],
  avds: AVDRecord[],
  elderly: Elderly[],
  onBack: () => void,
  onAddMedication: () => void,
  onAddVital: () => void,
  onAddEvolution: () => void,
  onAddAVD: () => void,
  onAddDiaper: () => void,
  onAddDressing: () => void,
  onEditPatient: (patient: NursingPatient) => void,
  onDeletePatient: (id: string) => void,
  onEditMedication: (med: Medication) => void,
  onDeleteMedication: (id: string) => void,
  onEditVital: (vital: VitalSigns) => void,
  onDeleteVital: (id: string) => void,
  onEditEvolution: (evo: NursingEvolution) => void,
  onDeleteEvolution: (id: string) => void
}) => {
  const latestAVD = (avds || []).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  const linkedElderly = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
  const name = linkedElderly?.name || patient.name;
  let age = patient.age;
  if (linkedElderly) {
    const birthDate = parseISO(linkedElderly.birthDate);
    age = new Date().getFullYear() - birthDate.getFullYear();
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'INDEPENDENTE': return 'green';
      case 'ASSISTIDA': return 'amber';
      case 'DEPENDENTE': return 'red';
      default: return 'gray';
    }
  };

  const getStatusLabel = (status?: string) => {
    switch (status) {
      case 'INDEPENDENTE': return 'Independente (Sem ajuda)';
      case 'ASSISTIDA': return 'Assistida (Ajuda parcial)';
      case 'DEPENDENTE': return 'Dependente (Ajuda total)';
      default: return 'SEM REGISTRO';
    }
  };

  return (
  <div className="space-y-6 animate-in slide-in-from-right duration-500">
    <div className="flex justify-between items-center mb-6">
      <button 
        onClick={onBack} 
        className="flex items-center gap-3 px-5 py-2.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-500 hover:text-green-600 rounded-2xl shadow-sm transition-all group"
      >
        <ArrowLeft size={18} className="transition-transform group-hover:-translate-x-1" />
        <span className="font-bold text-sm">Voltar para Lista</span>
      </button>
      
      <button 
        onClick={onBack} 
        className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 dark:hover:bg-red-900/40 transition-all shadow-sm flex items-center gap-2 group"
        title="Fechar Detalhes"
      >
        <X size={20} className="transition-transform group-hover:rotate-90" />
        <span className="text-xs font-black uppercase tracking-tight hidden sm:inline">Fechar</span>
      </button>
    </div>

    <div className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-sm border border-gray-100 dark:border-gray-800">
      <div className="flex flex-col md:flex-row gap-8 items-start">
        <div className="w-32 h-32 bg-green-100 dark:bg-green-900/30 rounded-3xl flex items-center justify-center text-green-600 font-bold text-3xl overflow-hidden shrink-0">
          {patient.photoUrl ? (
            <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          ) : (
            patient.name.charAt(0)
          )}
        </div>
        <div className="flex-1 space-y-4">
          <div className="flex justify-between items-start">
            <div>
              <h2 className="text-3xl font-black text-gray-800 dark:text-white">{name}</h2>
              <p className="text-gray-500 font-medium">{age} anos • {patient.diagnosis}</p>
              {linkedElderly && (
                <div className="flex items-center gap-2 mt-1">
                  <span className="px-2 py-0.5 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase tracking-tighter">
                    Sincronizado com Cadastro Geral
                  </span>
                  <span className="text-[10px] text-gray-400 font-medium tracking-tight">CPF: {linkedElderly.cpf}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => onEditPatient(patient)}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-green-600 transition-all"
              >
                <Edit2 size={20} />
              </button>
              <button 
                onClick={() => onDeletePatient(patient.id)}
                className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-red-600 transition-all"
              >
                <Trash2 size={20} />
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <InfoItem label="Comorbidades" value={patient.comorbidities} />
            <InfoItem label="Alergias" value={patient.allergies} color="red" />
            <InfoItem label="Risco de Queda" value={patient.fallRisk} color={patient.fallRisk === 'ALTO' ? 'red' : patient.fallRisk === 'MEDIO' ? 'amber' : 'green'} />
            <InfoItem label="Grau" value={safeReplace(patient.careDegree || '', 'GRAU_', '')} />
            <InfoItem label="Contato Familiar" value={patient.familyContact} />
          </div>
        </div>
      </div>
    </div>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Pill className="text-amber-600" size={20} />
              Medicações Ativas
            </h3>
            <button onClick={onAddMedication} className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1">
              <Plus size={14} /> Adicionar
            </button>
          </div>
          <div className="space-y-3">
            {(medications || []).map(med => (
              <div key={med.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600">
                    <Pill size={20} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold">{med.name}</p>
                      {med.type && (
                        <span className={cn("px-2 py-0.5 rounded-lg text-[8px] font-bold", 
                          med.type === 'CONTINUA' ? "bg-blue-100 text-blue-600" : 
                          med.type === 'CONTROLADA' ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600"
                        )}>
                          {med.type}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">{med.dosage} • {med.route} • {med.frequency}</p>
                  </div>
                </div>
                  <div className="flex items-center gap-3">
                    <div className="flex gap-1">
                      {(med.times || []).map((time, i) => (
                        <span key={`${time}-${i}`} className="px-2 py-1 bg-white dark:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-400">{time}</span>
                      ))}
                    </div>
                    <div className="flex gap-1 ml-2 border-l border-gray-200 dark:border-gray-700 pl-2">
                      <button 
                        onClick={() => onEditMedication(med)}
                        className="p-1 text-gray-300 hover:text-green-600 transition-colors"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button 
                        onClick={() => onDeleteMedication(med.id)}
                        className="p-1 text-gray-300 hover:text-red-600 transition-colors"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
              </div>
            ))}
            {(medications || []).length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm italic">Nenhuma medicação cadastrada.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity className="text-green-600" size={20} />
              Últimos Sinais Vitais
            </h3>
            <button onClick={onAddVital} className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1">
              <Plus size={14} /> Registrar
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                  <th className="pb-4">Data/Hora</th>
                  <th className="pb-4">PA</th>
                  <th className="pb-4">FC</th>
                  <th className="pb-4">Temp</th>
                  <th className="pb-4">Sat</th>
                  <th className="pb-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {(vitals || []).slice(0, 5).map(v => (
                  <tr key={v.id} className="border-t border-gray-50 dark:border-gray-800 group">
                    <td className="py-3 font-medium">{v.date} {v.time}</td>
                    <td className="py-3 font-bold text-gray-800 dark:text-white">{v.systolicBP}/{v.diastolicBP}</td>
                    <td className="py-3">{v.heartRate} bpm</td>
                    <td className="py-3">{v.temperature}°C</td>
                    <td className="py-3">{v.saturation}%</td>
                    <td className="py-3 text-right">
                      <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button 
                          onClick={() => onEditVital(v)}
                          className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={() => onDeleteVital(v.id)}
                          className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {(vitals || []).length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm italic">Nenhum sinal vital registrado.</p>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <ClipboardList className="text-blue-600" size={20} />
              Histórico de Evolução
            </h3>
            <button onClick={onAddEvolution} className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1">
              <Plus size={14} /> Registrar
            </button>
          </div>
          <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
            {(evolutions || []).map(evo => (
              <div key={evo.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl space-y-2 group">
                <div className="flex justify-between items-start">
                  <span className="text-[10px] font-bold text-gray-400 uppercase">{evo.date} às {evo.time}</span>
                  <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button 
                      onClick={() => onEditEvolution(evo)}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteEvolution(evo.id)}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3">{evo.content}</p>
                <div className="text-[8px] font-bold text-gray-400 uppercase">Por: {evo.registeredBy}</div>
              </div>
            ))}
            {(evolutions || []).length === 0 && (
              <p className="text-center text-gray-400 py-8 text-sm italic">Nenhuma evolução registrada para este paciente.</p>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton icon={<ClipboardList size={18} />} label="Evolução" onClick={onAddEvolution} color="blue" />
            <ActionButton icon={<Coffee size={18} />} label="AVDs" onClick={onAddAVD} color="green" />
            <ActionButton icon={<Bed size={18} />} label="Fralda" onClick={onAddDiaper} color="purple" />
            <ActionButton icon={<Bandage size={18} />} label="Curativo" onClick={onAddDressing} color="amber" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Activity className="text-green-600" size={20} />
              Status Funcional (AVDs)
            </h3>
            <div className="flex gap-2">
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-green-500"></div>
                <span className="text-[8px] font-bold text-gray-400">IND.</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                <span className="text-[8px] font-bold text-gray-400">ASSIST.</span>
              </div>
              <div className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full bg-red-500"></div>
                <span className="text-[8px] font-bold text-gray-400">DEP.</span>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <AVDIndicator 
              icon={<Coffee size={16} />} 
              label="Alimentação" 
              status={getStatusLabel(latestAVD?.feeding)} 
              color={getStatusColor(latestAVD?.feeding)} 
              value={latestAVD?.feeding}
            />
            <AVDIndicator 
              icon={<Bath size={16} />} 
              label="Higiene" 
              status={getStatusLabel(latestAVD?.hygiene)} 
              color={getStatusColor(latestAVD?.hygiene)} 
              value={latestAVD?.hygiene}
            />
            <AVDIndicator 
              icon={<Bandage size={16} />} 
              label="Vestuário" 
              status={getStatusLabel(latestAVD?.dressing)} 
              color={getStatusColor(latestAVD?.dressing)} 
              value={latestAVD?.dressing}
            />
            <AVDIndicator 
              icon={<Move size={16} />} 
              label="Mobilidade" 
              status={getStatusLabel(latestAVD?.mobility)} 
              color={getStatusColor(latestAVD?.mobility)} 
              value={latestAVD?.mobility}
            />
          </div>
          {latestAVD?.date && (
            <p className="mt-6 text-[10px] text-gray-400 font-bold uppercase text-center bg-gray-50 dark:bg-gray-800/50 py-2 rounded-xl">
              Último registro em: {format(parseISO(latestAVD.date), "dd/MM/yyyy")}
            </p>
          )}
        </div>
      </div>
    </div>
  </div>
);
}

const MedicationView = ({ patients, medications, administrations, onSaveMedication, onSaveAdministration, onAddMedication, onDeleteMedication, onEditMedication, filter, setFilter }: { 
  patients: NursingPatient[], 
  medications: Medication[], 
  administrations: MedicationAdministration[],
  onSaveMedication: (data: Omit<Medication, 'id'>, id?: string) => Promise<void>,
  onSaveAdministration: (data: Omit<MedicationAdministration, 'id'>) => Promise<void>,
  onAddMedication: () => void,
  onDeleteMedication?: (id: string) => void,
  onEditMedication?: (m: Medication) => void,
  filter: string,
  setFilter: (f: string) => void
}) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const dailyAdmins = (administrations || []).filter(a => 
    a.date === selectedDate && (!filter || a.patientId === filter)
  );
  const stats = {
    total: dailyAdmins.length,
    done: dailyAdmins.filter(a => a.status === 'ADMINISTRADO').length,
    pending: dailyAdmins.filter(a => a.status === 'PENDENTE').length,
    delayed: dailyAdmins.filter(a => a.status === 'ATRASADO').length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white">Controle de Medicação</h2>
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[150px]"
          >
            <option value="">Todos os Idosos</option>
            {(patients || []).map(p => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-bold"
          />
          <button 
            onClick={onAddMedication}
            className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 dark:shadow-none"
          >
            <Plus size={18} />
            Novo Registro
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {dailyAdmins.length > 0 ? (
            dailyAdmins.map(admin => {
              const patient = (patients || []).find(p => p.id === admin.patientId);
              const med = (medications || []).find(m => m.id === admin.medicationId);
              return (
                <div key={admin.id} className="bg-white dark:bg-gray-900 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
                  <div className="flex items-center gap-4">
                    <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center font-bold text-lg", 
                      admin.status === 'ADMINISTRADO' ? "bg-green-100 text-green-600" : 
                      admin.status === 'ATRASADO' ? "bg-red-100 text-red-600" : "bg-amber-100 text-amber-600"
                    )}>
                      {admin.scheduledTime}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 dark:text-white">{med?.name} <span className="text-xs font-normal text-gray-400">({med?.dosage})</span></h4>
                      <p className="text-xs text-gray-500">{patient?.name} • {med?.route} {med?.period ? `• Uso: ${med.period}` : ''}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {admin.status === 'PENDENTE' ? (
                      <button 
                        onClick={() => onSaveAdministration({ ...admin, status: 'ADMINISTRADO', administeredTime: format(new Date(), 'HH:mm') })}
                        className="px-6 py-2 bg-green-600 text-white text-xs font-bold rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 dark:shadow-none"
                      >
                        Administrar
                      </button>
                    ) : (
                      <div className="flex items-center gap-2 text-green-600 font-bold text-xs">
                        <CheckCircle2 size={16} />
                        Administrado às {admin.administeredTime}
                      </div>
                    )}
                    <button className="p-2 text-gray-300 hover:text-gray-600 transition-colors">
                      <MoreVertical size={18} />
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800">
              <Pill size={48} className="mx-auto text-gray-200 mb-4" />
              <p className="text-gray-400 italic">Nenhuma medicação agendada para esta data.</p>
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4">Resumo do Dia</h3>
            <div className="space-y-4">
              <MedStat label="Total Agendado" value={dailyAdmins.length} color="blue" />
              <MedStat label="Administrados" value={dailyAdmins.filter(a => a.status === 'ADMINISTRADO').length} color="green" />
              <MedStat label="Pendentes" value={dailyAdmins.filter(a => a.status === 'PENDENTE').length} color="amber" />
              <MedStat label="Atrasados" value={dailyAdmins.filter(a => a.status === 'ATRASADO').length} color="red" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const InfoItem = ({ label, value, color }: { label: string, value: string, color?: string }) => (
  <div>
    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
    <p className={cn("text-sm font-bold", color === 'red' ? "text-red-600" : color === 'amber' ? "text-amber-600" : "text-gray-700 dark:text-gray-300")}>
      {value || 'Não informado'}
    </p>
  </div>
);

const ActionButton = ({ icon, label, onClick, color }: { icon: React.ReactNode, label: string, onClick: () => void, color: string }) => (
  <button 
    onClick={onClick}
    className={cn(
      "flex flex-col items-center justify-center p-4 rounded-2xl border transition-all gap-2",
      color === 'blue' ? "border-blue-100 bg-blue-50/30 text-blue-600 hover:bg-blue-50" :
      color === 'green' ? "border-green-100 bg-green-50/30 text-green-600 hover:bg-green-50" :
      color === 'purple' ? "border-purple-100 bg-purple-50/30 text-purple-600 hover:bg-purple-50" :
      "border-amber-100 bg-amber-50/30 text-amber-600 hover:bg-amber-50"
    )}
  >
    {icon}
    <span className="text-[10px] font-bold uppercase">{label}</span>
  </button>
);

const AVDIndicator = ({ icon, label, status, color, value }: { icon: React.ReactNode, label: string, status: string, color: string, value?: string }) => (
  <div className={cn(
    "p-4 rounded-3xl border transition-all flex flex-col gap-3 h-full",
    color === 'green' ? "bg-green-50/50 border-green-100 dark:bg-green-900/10 dark:border-green-800" :
    color === 'amber' ? "bg-amber-50/50 border-amber-100 dark:bg-amber-900/10 dark:border-amber-800" :
    color === 'red' ? "bg-red-50/50 border-red-100 dark:bg-red-900/10 dark:border-red-800" :
    "bg-gray-50 dark:bg-gray-800/50 border-gray-100 dark:border-gray-800"
  )}>
    <div className="flex items-center justify-between">
      <div className={cn("p-2.5 rounded-2xl shadow-sm", 
        color === 'green' ? "bg-green-100 text-green-600 dark:bg-green-900/30" : 
        color === 'amber' ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30" : 
        color === 'red' ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-gray-100 text-gray-400"
      )}>
        {icon}
      </div>
      <div className="flex gap-1">
        <div className={cn("w-2 h-4 rounded-full", (value === 'INDEPENDENTE' || value === 'ASSISTIDA' || value === 'DEPENDENTE') ? (color === 'green' ? 'bg-green-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500') : 'bg-gray-200 dark:bg-gray-700')}></div>
        <div className={cn("w-2 h-4 rounded-full", (value === 'ASSISTIDA' || value === 'DEPENDENTE') ? (color === 'amber' ? 'bg-amber-500' : 'bg-red-500') : 'bg-gray-200 dark:bg-gray-700')}></div>
        <div className={cn("w-2 h-4 rounded-full", value === 'DEPENDENTE' ? 'bg-red-500' : 'bg-gray-200 dark:bg-gray-700')}></div>
      </div>
    </div>
    <div className="space-y-1">
      <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
      <p className={cn("text-xs font-bold leading-tight", 
        color === 'green' ? "text-green-700 dark:text-green-400" : 
        color === 'amber' ? "text-amber-700 dark:text-amber-400" : 
        color === 'red' ? "text-red-700 dark:text-red-400" : "text-gray-400"
      )}>
        {status}
      </p>
      <p className="text-[9px] text-gray-400 font-medium italic opacity-70">
        {value === 'INDEPENDENTE' ? 'Total autonomia' : 
         value === 'ASSISTIDA' ? 'Necessita ajuda parcial' : 
         value === 'DEPENDENTE' ? 'Total dependência' : 'Não avaliado'}
      </p>
    </div>
  </div>
);

const MedStat = ({ label, value, color }: { label: string, value: number, color: string }) => (
  <div className="flex justify-between items-center">
    <span className="text-xs text-gray-500">{label}</span>
    <span className={cn("text-sm font-black", `text-${color}-600`)}>{value}</span>
  </div>
);

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center gap-4 text-red-600 dark:text-red-400">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all"
          >
            Confirmar Exclusão
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const StatCard = ({ title, value, icon, trend, color }: { title: string, value: number | string, icon: React.ReactNode, trend: string, color: string }) => (
  <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-shadow">
    <div className="flex justify-between items-start mb-4">
      <div className={cn("p-3 rounded-2xl bg-opacity-10", `bg-${color}-600`)}>
        {icon}
      </div>
      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{trend}</span>
    </div>
    <h4 className="text-2xl font-black text-gray-800 dark:text-white">{value}</h4>
    <p className="text-xs text-gray-500 mt-1">{title}</p>
  </div>
);

const NavButton = ({ active, onClick, icon, label }: { active: boolean, onClick: () => void, icon: React.ReactNode, label: string }) => (
  <button
    onClick={onClick}
    className={cn(
      "flex-shrink-0 lg:w-full flex items-center gap-3 px-6 lg:px-4 py-3 rounded-2xl text-xs font-bold transition-all whitespace-nowrap snap-start group",
      active 
        ? "bg-green-600 text-white shadow-xl shadow-green-100 dark:shadow-none" 
        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
    )}
  >
    <div className={cn("transition-transform group-hover:scale-110", active ? "text-white" : "text-gray-400 group-hover:text-green-600")}>
      {icon}
    </div>
    {label}
  </button>
);

const PatientsView = ({ patients, elderly, onAdd, onSelect, onDelete }: { patients: NursingPatient[], elderly: Elderly[], onAdd: () => void, onSelect: (id: string) => void, onDelete?: (id: string) => void }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Pacientes sob Cuidado</h2>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Novo Paciente
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {(patients || []).map(patient => {
        const linkedElderly = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
        const name = linkedElderly?.name || patient.name;
        let age = patient.age;
        if (linkedElderly) {
          const birthDate = parseISO(linkedElderly.birthDate);
          age = new Date().getFullYear() - birthDate.getFullYear();
        }

        return (
          <div key={patient.id} onClick={() => onSelect(patient.id)} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900 transition-all cursor-pointer group relative">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 font-bold text-xl overflow-hidden">
                {patient.photoUrl ? (
                  <img src={patient.photoUrl} alt={name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  name.charAt(0)
                )}
              </div>
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-green-600 transition-colors">{name}</h3>
                  {onDelete && (
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(patient.id);
                      }}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-xl transition-all"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
                <p className="text-xs text-gray-500">{age} anos • {patient.diagnosis}</p>
                {linkedElderly && (
                  <div className="mt-1">
                    <span className="px-1.5 py-0.5 bg-green-100 text-green-600 text-[8px] font-black rounded uppercase tracking-tighter">Vinculado</span>
                  </div>
                )}
                <div className="mt-2 space-y-1">
                  {patient.comorbidities && <p className="text-[10px] text-gray-400 line-clamp-1 italic">Comorbidades: {patient.comorbidities}</p>}
                  {patient.allergies && <p className="text-[10px] text-red-400 line-clamp-1 font-bold italic">Alergias: {patient.allergies}</p>}
                </div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className={cn("px-2 py-1 rounded-lg text-[9px] font-bold text-center", 
                patient.fallRisk === 'ALTO' ? "bg-red-100 text-red-600" : 
                patient.fallRisk === 'MEDIO' ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
              )}>
                QUEDA: {patient.fallRisk}
              </div>
              <div className={cn("px-2 py-1 rounded-lg text-[9px] font-bold text-center bg-gray-100 text-gray-600")}>
                GRAU {safeReplace(patient.careDegree || '1', 'GRAU_', '')}
              </div>
              <div className={cn("px-2 py-1 rounded-lg text-[9px] font-bold text-center", 
                patient.isBedridden ? "bg-purple-100 text-purple-600" : "bg-blue-100 text-blue-600"
              )}>
                {patient.isBedridden ? 'ACAMADO' : 'MÓVEL'}
              </div>
            </div>
            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-gray-800">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <AlertCircle size={14} className="text-red-400" />
                {patient.allergies || 'Sem alergias'}
              </div>
              <ChevronRight size={18} className="text-gray-300 group-hover:text-green-600 transition-all" />
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
