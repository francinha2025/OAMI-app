import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Pill, Activity, 
  Bandage, ClipboardList, AlertTriangle, Calendar, 
  FileText, Settings, Plus, Search, Filter, 
  MoreVertical, ChevronRight, AlertCircle, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, 
  Download, Printer, X, Heart, Info, ArrowLeft,
  TrendingUp, UserCircle, LogOut, Moon, Sun,
  Droplets, Thermometer, Wind, Zap,
  Coffee, Bath, Move, Bed
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, isToday, parseISO, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { 
  NursingPatient, Medication, MedicationAdministration, 
  VitalSigns, DressingRecord, NursingEvolution, 
  IncidentRecord, ShiftSchedule, AVDRecord, 
  DiaperChangeRecord, User as UserType 
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface NursingSectionProps {
  user: UserType;
  patients: NursingPatient[];
  medications: Medication[];
  administrations: MedicationAdministration[];
  vitalSigns: VitalSigns[];
  dressings: DressingRecord[];
  evolutions: NursingEvolution[];
  incidents: IncidentRecord[];
  shifts: ShiftSchedule[];
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
  const [activeTab, setActiveTab] = useState<NursingTab>('dashboard');
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPatientId, setSelectedPatientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'patient' | 'medication' | 'vital' | 'dressing' | 'evolution' | 'incident' | 'shift' | 'avd' | 'diaper' | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; type: 'patient' | 'evolution' | 'incident' | 'medication' | 'vital' | 'dressing' | 'shift' | 'avd' | 'diaper' } | null>(null);
  const [editingData, setEditingData] = useState<any | null>(null);

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
    return props.patients.filter(p => 
      p.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.diagnosis?.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [props.patients, searchQuery]);

  const selectedPatient = useMemo(() => 
    props.patients.find(p => p.id === selectedPatientId), 
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
      pendingDressings: dressingsList.filter(d => d.nextChangeDate === today).length,
      alerts: alteredVitals + incidentRecords.filter(i => i.date === today).length
    };
  }, [props.patients, props.administrations, props.dressings, props.incidents, props.vitalSigns]);

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
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={props.vitalSigns.slice(0, 7).reverse()}>
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
              {props.administrations
                .filter(a => a.status === 'PENDENTE')
                .slice(0, 5)
                .map(admin => {
                  const patient = props.patients.find(p => p.id === admin.patientId);
                  const med = props.medications.find(m => m.id === admin.medicationId);
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
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <AlertCircle className="text-red-600" size={20} />
              Alertas Recentes
            </h3>
            <div className="space-y-4">
              {props.incidents.slice(0, 4).map(incident => (
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
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="w-full lg:w-64 space-y-2">
        <NavButton active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <NavButton active={activeTab === 'patients'} onClick={() => setActiveTab('patients')} icon={<Users size={20} />} label="Pacientes" />
        <NavButton active={activeTab === 'medication'} onClick={() => setActiveTab('medication')} icon={<Pill size={20} />} label="Medicação" />
        <NavButton active={activeTab === 'vitals'} onClick={() => setActiveTab('vitals')} icon={<Activity size={20} />} label="Sinais Vitais" />
        <NavButton active={activeTab === 'dressings'} onClick={() => setActiveTab('dressings')} icon={<Bandage size={20} />} label="Curativos" />
        <NavButton active={activeTab === 'evolutions'} onClick={() => setActiveTab('evolutions')} icon={<ClipboardList size={20} />} label="Evolução" />
        <NavButton active={activeTab === 'incidents'} onClick={() => setActiveTab('incidents')} icon={<AlertTriangle size={20} />} label="Alertas" />
        <NavButton active={activeTab === 'shift'} onClick={() => setActiveTab('shift')} icon={<Calendar size={20} />} label="Plantão" />
        <NavButton active={activeTab === 'reports'} onClick={() => setActiveTab('reports')} icon={<FileText size={20} />} label="Relatórios" />
        <div className="pt-4 mt-4 border-t border-gray-100 dark:border-gray-800">
          <NavButton active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} icon={<Settings size={20} />} label="Configurações" />
        </div>
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
            {activeTab === 'patients' && !selectedPatientId && <PatientsView patients={filteredPatients} onAdd={() => { setModalType('patient'); setIsModalOpen(true); }} onSelect={setSelectedPatientId} />}
            {activeTab === 'patients' && selectedPatientId && selectedPatient && (
              <PatientDetailView 
                patient={selectedPatient} 
                medications={props.medications.filter(m => m.patientId === selectedPatientId)}
                vitals={props.vitalSigns.filter(v => v.patientId === selectedPatientId)}
                onBack={() => setSelectedPatientId(null)}
                onAddMedication={() => { setModalType('medication'); setIsModalOpen(true); }}
                onAddVital={() => { setModalType('vital'); setIsModalOpen(true); }}
                onAddEvolution={() => { setModalType('evolution'); setIsModalOpen(true); }}
                onAddAVD={() => { setModalType('avd'); setIsModalOpen(true); }}
                onAddDiaper={() => { setModalType('diaper'); setIsModalOpen(true); }}
                onEditPatient={(p) => { setEditingData(p); setModalType('patient'); setIsModalOpen(true); }}
                onDeletePatient={(id) => setDeleteConfirm({ id, type: 'patient' })}
                onEditMedication={(m) => { setEditingData(m); setModalType('medication'); setIsModalOpen(true); }}
                onDeleteMedication={(id) => setDeleteConfirm({ id, type: 'medication' })}
                onEditVital={(v) => { setEditingData(v); setModalType('vital'); setIsModalOpen(true); }}
                onDeleteVital={(id) => setDeleteConfirm({ id, type: 'vital' })}
              />
            )}
            {activeTab === 'medication' && (
              <MedicationView 
                patients={props.patients}
                medications={props.medications}
                administrations={props.administrations}
                onSaveMedication={props.onSaveMedication}
                onSaveAdministration={props.onSaveAdministration}
              />
            )}
            {activeTab === 'vitals' && (
              <VitalSignsView 
                patients={props.patients}
                vitals={props.vitalSigns}
                onAdd={() => { setModalType('vital'); setIsModalOpen(true); }}
                onEdit={(v) => { setEditingData(v); setModalType('vital'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'vital' })}
              />
            )}
            {activeTab === 'dressings' && (
              <DressingsView 
                patients={props.patients}
                dressings={props.dressings}
                onAdd={() => { setModalType('dressing'); setIsModalOpen(true); }}
                onEdit={(d) => { setEditingData(d); setModalType('dressing'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'dressing' })}
              />
            )}
            {activeTab === 'evolutions' && (
              <EvolutionsView 
                patients={props.patients}
                evolutions={props.evolutions}
                onAdd={() => { setModalType('evolution'); setIsModalOpen(true); }}
                onEdit={(e) => { setEditingData(e); setModalType('evolution'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'evolution' })}
              />
            )}
            {activeTab === 'incidents' && (
              <IncidentsView 
                patients={props.patients}
                incidents={props.incidents}
                onAdd={() => { setModalType('incident'); setIsModalOpen(true); }}
                onEdit={(i) => { setEditingData(i); setModalType('incident'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'incident' })}
              />
            )}
            {activeTab === 'shift' && (
              <ShiftView 
                shifts={props.shifts}
                onAdd={() => { setModalType('shift'); setIsModalOpen(true); }}
                onEdit={(s) => { setEditingData(s); setModalType('shift'); setIsModalOpen(true); }}
                onDelete={(id) => setDeleteConfirm({ id, type: 'shift' })}
              />
            )}
            {activeTab === 'reports' && (
              <ReportsView 
                patients={props.patients}
                evolutions={props.evolutions}
                administrations={props.administrations}
                vitalSigns={props.vitalSigns}
                incidents={props.incidents}
                medications={props.medications}
              />
            )}
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
            patients={props.patients}
            medications={props.medications}
            editingData={editingData}
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

const ShiftView = ({ shifts, onAdd, onEdit, onDelete }: { 
  shifts: ShiftSchedule[], 
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
      {shifts.map(s => (
        <div key={s.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 group relative">
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
          <div className="space-y-2">
            <p className="text-xs text-gray-500 mb-2">{s.activities}</p>
            <div className="flex flex-wrap gap-2">
              {s.professionals.map((p, idx) => (
                <span key={idx} className="px-2 py-1 bg-gray-50 dark:bg-gray-800 rounded-lg text-[10px] font-bold">
                  {p}
                </span>
              ))}
            </div>
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
  const downloadPDF = (title: string, data: any[]) => {
    if (!data || data.length === 0) return;
    
    const columns = Object.keys(data[0]);
    const body = data.map(item => Object.values(item));
    
    generateModernPDF({
      title,
      subtitle: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
      columns,
      data: body,
      fileName: title.toLowerCase().replace(/\s/g, '_')
    });
  };

  const downloadDOC = (title: string, data: any[]) => {
    let content = `<h1>${title}</h1><table border="1"><tr>`;
    const keys = Object.keys(data[0] || {});
    keys.forEach(key => content += `<th>${key}</th>`);
    content += '</tr>';
    data.forEach(item => {
      content += '<tr>';
      keys.forEach(key => content += `<td>${item[key]}</td>`);
      content += '</tr>';
    });
    content += '</table>';

    const blob = new Blob([content], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s/g, '_')}.doc`;
    link.click();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Relatórios de Enfermagem</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <ReportCard 
          title="Evolução Mensal" 
          description="Resumo de todas as evoluções registradas no mês atual."
          icon={<ClipboardList className="text-blue-600" />}
          onClick={() => {
            const data = evolutions.map(e => ({
              Data: e.date,
              Paciente: patients.find(p => p.id === e.patientId)?.name || 'N/A',
              Conteúdo: e.content,
              Responsável: e.registeredBy
            }));
            downloadPDF("Relatório de Evoluções", data);
          }}
        />
        <ReportCard 
          title="Histórico de Medicação" 
          description="Relatório detalhado de administrações e intercorrências."
          icon={<Pill className="text-amber-600" />}
          onClick={() => {
            const data = administrations.map(a => ({
              Data: a.date,
              Hora: a.scheduledTime,
              Paciente: patients.find(p => p.id === a.patientId)?.name || 'N/A',
              Medicamento: medications.find(m => m.id === a.medicationId)?.name || 'N/A',
              Status: a.status
            }));
            downloadPDF("Histórico de Medicação", data);
          }}
        />
        <ReportCard 
          title="Sinais Vitais" 
          description="Relatório de monitoramento de sinais vitais."
          icon={<Activity className="text-green-600" />}
          onClick={() => {
            const data = vitalSigns.map(v => ({
              Data: v.date,
              Hora: v.time,
              Paciente: patients.find(p => p.id === v.patientId)?.name || 'N/A',
              PA: `${v.systolicBP}/${v.diastolicBP}`,
              FC: v.heartRate,
              Temp: v.temperature,
              Sat: v.saturation
            }));
            downloadPDF("Relatório de Sinais Vitais", data);
          }}
        />
        <ReportCard 
          title="Intercorrências" 
          description="Resumo de intercorrências registradas."
          icon={<AlertTriangle className="text-red-600" />}
          onClick={() => {
            const data = incidents.map(i => ({
              Data: i.date,
              Hora: i.time,
              Paciente: patients.find(p => p.id === i.patientId)?.name || 'N/A',
              Tipo: i.type,
              Descrição: i.description,
              Conduta: i.conduct
            }));
            downloadPDF("Relatório de Intercorrências", data);
          }}
        />
        <ReportCard 
          title="Download em DOC (Medicações)" 
          description="Baixar histórico de medicações em formato Word."
          icon={<FileText className="text-amber-600" />}
          onClick={() => {
            const data = administrations.map(a => ({
              Data: a.date,
              Hora: a.scheduledTime,
              Paciente: patients.find(p => p.id === a.patientId)?.name || 'N/A',
              Medicamento: medications.find(m => m.id === a.medicationId)?.name || 'N/A',
              Status: a.status
            }));
            downloadDOC("Histórico de Medicação", data);
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

const ReportCard = ({ title, description, icon, onClick }: { title: string, description: string, icon: React.ReactNode, onClick: () => void }) => (
  <button onClick={onClick} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-start gap-4 hover:border-green-200 transition-all text-left group">
    <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl group-hover:bg-green-50 transition-colors">
      {icon}
    </div>
    <div>
      <h4 className="font-bold text-gray-800 dark:text-white mb-1">{title}</h4>
      <p className="text-xs text-gray-500 leading-relaxed">{description}</p>
    </div>
  </button>
);

const NursingModal = ({ type, patients, medications, onClose, onSavePatient, onSaveMedication, onSaveAdministration, onSaveVitalSigns, onSaveDressing, onSaveEvolution, onSaveIncident, onSaveShift, onSaveAVD, onSaveDiaperChange, onSavePhotos, editingData }: {
  type: string | null,
  patients: NursingPatient[],
  medications: Medication[],
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
  editingData?: any
}) => {
  const [formData, setFormData] = useState<any>(editingData || {
    date: format(new Date(), 'yyyy-MM-dd'),
    time: format(new Date(), 'HH:mm'),
    status: 'PENDENTE',
    photos: []
  });

  const handleDigitize = (text: string) => {
    if (type === 'evolution') {
      setFormData((prev: any) => ({ ...prev, evolution: (prev.evolution || '') + '\n' + text }));
    } else if (type === 'incident') {
      setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
    } else if (type === 'dressing') {
      setFormData((prev: any) => ({ ...prev, appearance: (prev.appearance || '') + '\n' + text }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { photos, ...data } = formData;
      const id = editingData?.id;

      switch (type) {
        case 'patient': await onSavePatient(data, id); break;
        case 'medication': await onSaveMedication(data, id); break;
        case 'vital': await onSaveVitalSigns(data, id); break;
        case 'dressing': await onSaveDressing(data, id); break;
        case 'evolution': await onSaveEvolution(data, id); break;
        case 'incident': await onSaveIncident(data, id); break;
        case 'shift': await onSaveShift(data, id); break;
        case 'avd': await onSaveAVD(data, id); break;
        case 'diaper': await onSaveDiaperChange(data, id); break;
      }

      if (photos && photos.length > 0 && formData.patientId) {
        const patient = patients.find(p => p.id === formData.patientId);
        const activityType = 
          type === 'evolution' ? 'Evolução de Enfermagem' :
          type === 'dressing' ? 'Curativo' :
          type === 'incident' ? 'Intercorrência' : 'Atividade de Enfermagem';
        
        await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.evolution || formData.description || formData.appearance);
      }
      onClose();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 overflow-y-auto">
      <motion.div 
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
      >
        <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tight">
            {type === 'patient' ? `${editingData ? 'Editar' : 'Novo'} Paciente` : 
             type === 'medication' ? `${editingData ? 'Editar' : 'Nova'} Medicação` :
             type === 'vital' ? `${editingData ? 'Editar' : 'Registrar'} Sinais Vitais` :
             type === 'dressing' ? `${editingData ? 'Editar' : 'Registrar'} Curativo` :
             type === 'evolution' ? `${editingData ? 'Editar' : 'Nova'} Evolução` :
             type === 'incident' ? `${editingData ? 'Editar' : 'Registrar'} Intercorrência` :
             type === 'shift' ? `${editingData ? 'Editar' : 'Novo'} Plantão` :
             type === 'avd' ? `${editingData ? 'Editar' : 'Registrar'} AVD` : 
             `${editingData ? 'Editar' : 'Registrar'} Troca de Fralda`}
          </h3>
          <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {type !== 'patient' && type !== 'shift' && (
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Paciente</label>
              <select 
                required
                className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition-all"
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o paciente</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
          )}

          {type === 'patient' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome Completo" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
              <Input label="Idade" type="number" value={formData.age} onChange={(v) => setFormData({ ...formData, age: parseInt(v) })} />
              <Input label="Diagnóstico" value={formData.diagnosis} onChange={(v) => setFormData({ ...formData, diagnosis: v })} />
              <Input label="Comorbidades" value={formData.comorbidities} onChange={(v) => setFormData({ ...formData, comorbidities: v })} />
              <Input label="Alergias" value={formData.allergies} onChange={(v) => setFormData({ ...formData, allergies: v })} />
              <Input label="Contato Familiar" value={formData.familyContact} onChange={(v) => setFormData({ ...formData, familyContact: v })} />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Nível de Risco</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm" value={formData.riskLevel || 'BAIXO'} onChange={(e) => setFormData({ ...formData, riskLevel: e.target.value })}>
                  <option value="BAIXO">Baixo</option>
                  <option value="MEDIO">Médio</option>
                  <option value="ALTO">Alto</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Acamado?</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm" value={formData.isBedridden ? 'true' : 'false'} onChange={(e) => setFormData({ ...formData, isBedridden: e.target.value === 'true' })}>
                  <option value="false">Não</option>
                  <option value="true">Sim</option>
                </select>
              </div>
            </div>
          )}

          {type === 'medication' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Nome do Medicamento" value={formData.name} onChange={(v) => setFormData({ ...formData, name: v })} />
              <Input label="Dosagem" value={formData.dosage} onChange={(v) => setFormData({ ...formData, dosage: v })} />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Medicação</label>
                <select 
                  required
                  value={formData.type || 'CONTINUA'}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition-all"
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="CONTINUA">Contínua</option>
                  <option value="CONTROLADA">Controlada</option>
                  <option value="PONTUAL">Pontual</option>
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Via de Administração</label>
                <select 
                  required
                  value={formData.route || 'ORAL'}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition-all"
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
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Horários (separados por vírgula)</label>
                <input 
                  type="text"
                  placeholder="Ex: 08:00, 20:00"
                  value={formData.times?.join(', ') || ''}
                  onChange={(e) => setFormData({ ...formData, times: e.target.value.split(',').map((t: string) => t.trim()) })}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm"
                />
              </div>
            </div>
          )}

          {type === 'dressing' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Input label="Tipo de Lesão" value={formData.woundType} onChange={(v) => setFormData({ ...formData, woundType: v })} />
              <Input label="Localização" value={formData.location} onChange={(v) => setFormData({ ...formData, location: v })} />
              <div className="md:col-span-2 space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase">Aspecto</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, aspect: (formData.aspect || '') + ' ' + t })} />
                </div>
                <textarea 
                  value={formData.aspect || ''}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm min-h-[100px]"
                  onChange={(e) => setFormData({ ...formData, aspect: e.target.value })}
                />
              </div>
              <Input label="Próxima Troca" type="date" value={formData.nextChangeDate} onChange={(v) => setFormData({ ...formData, nextChangeDate: v })} />
            </div>
          )}

          {type === 'incident' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Intercorrência</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm" value={formData.type || 'FEBRE'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="FEBRE">Febre</option>
                  <option value="QUEDA">Queda</option>
                  <option value="MAL_ESTAR">Mal-estar</option>
                  <option value="INTERNACAO">Internação</option>
                  <option value="OUTRO">Outro</option>
                </select>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
                </div>
                <textarea 
                  value={formData.description || ''}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm min-h-[100px]"
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
              <Input label="Conduta Tomada" value={formData.conduct} onChange={(v) => setFormData({ ...formData, conduct: v })} />
            </div>
          )}

          {type === 'avd' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <AVDSelect label="Alimentação" value={formData.feeding} onChange={(v) => setFormData({ ...formData, feeding: v })} />
              <AVDSelect label="Higiene" value={formData.hygiene} onChange={(v) => setFormData({ ...formData, hygiene: v })} />
              <AVDSelect label="Vestuário" value={formData.dressing} onChange={(v) => setFormData({ ...formData, dressing: v })} />
              <AVDSelect label="Mobilidade" value={formData.mobility} onChange={(v) => setFormData({ ...formData, mobility: v })} />
            </div>
          )}

          {type === 'diaper' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Tipo de Eliminação</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm" value={formData.type || 'DIURESE'} onChange={(e) => setFormData({ ...formData, type: e.target.value })}>
                  <option value="DIURESE">Diurese</option>
                  <option value="EVACUAÇÃO">Evacuação</option>
                  <option value="AMBOS">Ambos</option>
                </select>
              </div>
              <Input label="Aspecto" value={formData.aspect} onChange={(v) => setFormData({ ...formData, aspect: v })} />
            </div>
          )}

          {type === 'shift' && (
            <div className="space-y-4">
              <Input label="Data" type="date" onChange={(v) => setFormData({ ...formData, date: v })} />
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Turno</label>
                <select className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm" onChange={(e) => setFormData({ ...formData, shift: e.target.value })}>
                  <option value="MANHÃ">Manhã</option>
                  <option value="TARDE">Tarde</option>
                  <option value="NOITE">Noite</option>
                </select>
              </div>
              <p className="text-[10px] text-gray-400 italic">* Adição de profissionais simplificada para este protótipo.</p>
            </div>
          )}

          {type === 'vital' && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <Input label="Sistólica" type="number" value={formData.systolicBP} onChange={(v) => setFormData({ ...formData, systolicBP: parseInt(v) })} />
              <Input label="Diastólica" type="number" value={formData.diastolicBP} onChange={(v) => setFormData({ ...formData, diastolicBP: parseInt(v) })} />
              <Input label="FC (bpm)" type="number" value={formData.heartRate} onChange={(v) => setFormData({ ...formData, heartRate: parseInt(v) })} />
              <Input label="Temp (°C)" type="number" step="0.1" value={formData.temperature} onChange={(v) => setFormData({ ...formData, temperature: parseFloat(v) })} />
              <Input label="Sat (%)" type="number" value={formData.saturation} onChange={(v) => setFormData({ ...formData, saturation: parseInt(v) })} />
              <Input label="Glicemia" type="number" value={formData.bloodGlucose} onChange={(v) => setFormData({ ...formData, bloodGlucose: parseInt(v) })} />
            </div>
          )}

          {type === 'evolution' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-bold text-gray-400 uppercase">Evolução</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, content: (formData.content || '') + ' ' + t })} />
                </div>
                <textarea 
                  required
                  value={formData.content || ''}
                  className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm min-h-[150px]"
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
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

      <div className="flex gap-4 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-8 py-4 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all">
              Cancelar
            </button>
            <button type="submit" className="flex-1 px-8 py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg shadow-green-100 dark:shadow-none hover:bg-green-700 transition-all">
              Salvar Registro
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

const Input = ({ label, type = "text", value, onChange, step }: { label: string, type?: string, value?: any, onChange: (v: string) => void, step?: string }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <input 
      type={type}
      step={step}
      value={value || ''}
      required
      onChange={(e) => onChange(e.target.value)}
      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm focus:ring-2 focus:ring-green-500 transition-all"
    />
  </div>
);

const AVDSelect = ({ label, value, onChange }: { label: string, value?: string, onChange: (v: string) => void }) => (
  <div className="space-y-2">
    <label className="text-xs font-bold text-gray-400 uppercase">{label}</label>
    <select 
      required
      value={value || ''}
      className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-2xl px-5 py-4 text-sm"
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Selecione...</option>
      <option value="INDEPENDENTE">Independente</option>
      <option value="DEPENDENTE PARCIAL">Dependente Parcial</option>
      <option value="DEPENDENTE TOTAL">Dependente Total</option>
    </select>
  </div>
);

const VitalSignsView = ({ patients, vitals, onAdd, onEdit, onDelete }: { 
  patients: NursingPatient[], 
  vitals: VitalSigns[], 
  onAdd: () => void,
  onEdit: (v: VitalSigns) => void,
  onDelete: (id: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Sinais Vitais</h2>
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
            {vitals.map(v => {
              const patient = patients.find(p => p.id === v.patientId);
              const isAltered = v.systolicBP > 140 || v.systolicBP < 90 || v.temperature > 37.5 || v.saturation < 92;
              return (
                <tr key={v.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/30 transition-colors">
                  <td className="px-6 py-4 font-bold">{patient?.name}</td>
                  <td className="px-6 py-4 text-gray-500">{v.date} {v.time}</td>
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

const DressingsView = ({ patients, dressings, onAdd, onEdit, onDelete }: { 
  patients: NursingPatient[], 
  dressings: DressingRecord[], 
  onAdd: () => void,
  onEdit: (d: DressingRecord) => void,
  onDelete: (id: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Controle de Curativos</h2>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Novo Curativo
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {dressings.map(d => {
        const patient = patients.find(p => p.id === d.patientId);
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

const EvolutionsView = ({ patients, evolutions, onAdd, onEdit, onDelete }: { 
  patients: NursingPatient[], 
  evolutions: NursingEvolution[], 
  onAdd: () => void,
  onEdit: (e: NursingEvolution) => void,
  onDelete: (id: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Evoluções de Enfermagem</h2>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Nova Evolução
      </button>
    </div>
    <div className="space-y-4">
      {evolutions.map(e => {
        const patient = patients.find(p => p.id === e.patientId);
        return (
          <div key={e.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-start mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 font-bold">
                  {patient?.name.charAt(0)}
                </div>
                <div>
                  <h4 className="font-bold text-gray-800 dark:text-white">{patient?.name}</h4>
                  <p className="text-xs text-gray-500">{e.date} às {e.time} • Enf. Responsável</p>
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

const IncidentsView = ({ patients, incidents, onAdd, onEdit, onDelete }: { 
  patients: NursingPatient[], 
  incidents: IncidentRecord[], 
  onAdd: () => void,
  onEdit: (i: IncidentRecord) => void,
  onDelete: (id: string) => void
}) => (
  <div className="space-y-6 animate-in fade-in duration-500">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Intercorrências e Alertas</h2>
      <button onClick={onAdd} className="flex items-center gap-2 bg-red-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-red-700 transition-all">
        <Plus size={20} />
        Registrar Alerta
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {incidents.map(i => {
        const patient = patients.find(p => p.id === i.patientId);
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
  onBack, 
  onAddMedication, 
  onAddVital, 
  onAddEvolution, 
  onAddAVD, 
  onAddDiaper, 
  onEditPatient, 
  onDeletePatient,
  onEditMedication,
  onDeleteMedication,
  onEditVital,
  onDeleteVital
}: { 
  patient: NursingPatient, 
  medications: Medication[], 
  vitals: VitalSigns[],
  onBack: () => void,
  onAddMedication: () => void,
  onAddVital: () => void,
  onAddEvolution: () => void,
  onAddAVD: () => void,
  onAddDiaper: () => void,
  onEditPatient: (patient: NursingPatient) => void,
  onDeletePatient: (id: string) => void,
  onEditMedication: (med: Medication) => void,
  onDeleteMedication: (id: string) => void,
  onEditVital: (vital: VitalSigns) => void,
  onDeleteVital: (id: string) => void
}) => (
  <div className="space-y-6 animate-in slide-in-from-right duration-500">
    <button onClick={onBack} className="flex items-center gap-2 text-gray-500 hover:text-green-600 transition-colors font-bold text-sm mb-4">
      <ArrowLeft size={18} />
      Voltar para Lista
    </button>

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
              <h2 className="text-3xl font-black text-gray-800 dark:text-white">{patient.name}</h2>
              <p className="text-gray-500 font-medium">{patient.age} anos • {patient.diagnosis}</p>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <InfoItem label="Comorbidades" value={patient.comorbidities} />
            <InfoItem label="Alergias" value={patient.allergies} color="red" />
            <InfoItem label="Risco de Queda" value={patient.fallRisk} color={patient.fallRisk === 'ALTO' ? 'red' : 'amber'} />
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
            {medications.map(med => (
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
                      {med.times.map(time => (
                        <span key={time} className="px-2 py-1 bg-white dark:bg-gray-700 rounded-lg text-[10px] font-bold text-gray-400">{time}</span>
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
                {vitals.slice(0, 5).map(v => (
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
      </div>

      <div className="space-y-6">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold mb-4">Ações Rápidas</h3>
          <div className="grid grid-cols-2 gap-3">
            <ActionButton icon={<ClipboardList size={18} />} label="Evolução" onClick={onAddEvolution} color="blue" />
            <ActionButton icon={<Coffee size={18} />} label="AVDs" onClick={onAddAVD} color="green" />
            <ActionButton icon={<Bed size={18} />} label="Fralda" onClick={onAddDiaper} color="purple" />
            <ActionButton icon={<Bandage size={18} />} label="Curativo" onClick={() => {}} color="amber" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold mb-4">Status AVDs</h3>
          <div className="space-y-4">
            <AVDIndicator icon={<Coffee size={16} />} label="Alimentação" status="Independente" color="green" />
            <AVDIndicator icon={<Bath size={16} />} label="Higiene" status="Assistida" color="amber" />
            <AVDIndicator icon={<Move size={16} />} label="Mobilidade" status="Dependente" color="red" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const MedicationView = ({ patients, medications, administrations, onSaveMedication, onSaveAdministration }: { 
  patients: NursingPatient[], 
  medications: Medication[], 
  administrations: MedicationAdministration[],
  onSaveMedication: (data: Omit<Medication, 'id'>, id?: string) => Promise<void>,
  onSaveAdministration: (data: Omit<MedicationAdministration, 'id'>) => Promise<void>
}) => {
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  
  const dailyAdmins = administrations.filter(a => a.date === selectedDate);
  const stats = {
    total: dailyAdmins.length,
    done: dailyAdmins.filter(a => a.status === 'ADMINISTRADO').length,
    pending: dailyAdmins.filter(a => a.status === 'PENDENTE').length,
    delayed: dailyAdmins.filter(a => a.status === 'ATRASADO').length
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Controle de Medicação</h2>
        <div className="flex gap-2">
          <input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl px-4 py-2 text-sm font-bold"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {dailyAdmins.length > 0 ? (
            dailyAdmins.map(admin => {
              const patient = patients.find(p => p.id === admin.patientId);
              const med = medications.find(m => m.id === admin.medicationId);
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
                      <p className="text-xs text-gray-500">{patient?.name} • {med?.route}</p>
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

const AVDIndicator = ({ icon, label, status, color }: { icon: React.ReactNode, label: string, status: string, color: string }) => (
  <div className="flex items-center justify-between">
    <div className="flex items-center gap-2">
      <div className={cn("p-2 rounded-lg bg-opacity-10", `bg-${color}-600 text-${color}-600`)}>
        {icon}
      </div>
      <span className="text-xs font-medium text-gray-600 dark:text-gray-400">{label}</span>
    </div>
    <span className={cn("text-[10px] font-bold px-2 py-1 rounded-md", 
      color === 'green' ? "bg-green-100 text-green-600" : 
      color === 'amber' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
    )}>
      {status}
    </span>
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
      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-bold transition-all",
      active 
        ? "bg-green-600 text-white shadow-lg shadow-green-100 dark:shadow-none" 
        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
    )}
  >
    {icon}
    {label}
  </button>
);

const PatientsView = ({ patients, onAdd, onSelect }: { patients: NursingPatient[], onAdd: () => void, onSelect: (id: string) => void }) => (
  <div className="space-y-6">
    <div className="flex justify-between items-center">
      <h2 className="text-2xl font-black text-gray-800 dark:text-white">Pacientes sob Cuidado</h2>
      <button onClick={onAdd} className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all">
        <Plus size={20} />
        Novo Paciente
      </button>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
      {patients.map(patient => (
        <div key={patient.id} onClick={() => onSelect(patient.id)} className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900 transition-all cursor-pointer group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 font-bold text-xl overflow-hidden">
              {patient.photoUrl ? (
                <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                patient.name.charAt(0)
              )}
            </div>
            <div>
              <h3 className="font-bold text-gray-800 dark:text-white group-hover:text-green-600 transition-colors">{patient.name}</h3>
              <p className="text-xs text-gray-500">{patient.age} anos • {patient.diagnosis}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 mb-4">
            <div className={cn("px-3 py-1 rounded-lg text-[10px] font-bold text-center", 
              patient.riskLevel === 'ALTO' ? "bg-red-100 text-red-600" : 
              patient.riskLevel === 'MEDIO' ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
            )}>
              RISCO: {patient.riskLevel}
            </div>
            <div className={cn("px-3 py-1 rounded-lg text-[10px] font-bold text-center", 
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
      ))}
    </div>
  </div>
);
