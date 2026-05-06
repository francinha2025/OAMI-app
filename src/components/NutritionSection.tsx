import React, { useState, useMemo } from 'react';
import { 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Users,
  ClipboardList, 
  Scale, 
  Utensils, 
  CalendarDays,
  FileText,
  AlertCircle,
  MoreVertical,
  Edit2,
  Trash2,
  ChevronRight,
  TrendingUp,
  Apple,
  Droplets,
  Clock,
  LayoutDashboard,
  CheckCircle2,
  History,
  Download,
  Share2,
  Camera,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { 
  NutritionPatient, 
  NutritionEvolution, 
  NutritionAnthropometry, 
  NutritionMealPlan, 
  User as UserType 
} from '../types';
import { cn, safeReplace } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';

interface NutritionSectionProps {
  user: UserType;
  patients: NutritionPatient[];
  evolutions: NutritionEvolution[];
  anthropometries: NutritionAnthropometry[];
  mealPlans: NutritionMealPlan[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  onSavePatient: (data: Partial<NutritionPatient>) => Promise<void>;
  onSaveEvolution: (data: Partial<NutritionEvolution>) => Promise<void>;
  onSaveAnthropometry: (data: Partial<NutritionAnthropometry>) => Promise<void>;
  onSaveMealPlan: (data: Partial<NutritionMealPlan>) => Promise<void>;
  onDeleteRecord: (collectionName: string, id: string) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description: string, category: any) => Promise<void>;
  onUpdateProfile: (data: any) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

export const NutritionSection: React.FC<NutritionSectionProps> = ({
  user,
  patients,
  evolutions,
  anthropometries,
  mealPlans,
  showToast,
  onSavePatient,
  onSaveEvolution,
  onSaveAnthropometry,
  onSaveMealPlan,
  onDeleteRecord,
  onSavePhotos,
}) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'evolutions' | 'assessments' | 'mealPlans' | 'reports'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [reportsPatientFilter, setReportsPatientFilter] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);

  // Filtered Data
  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredEvolutions = useMemo(() => {
    return evolutions
      .filter(e => {
        const patient = patients.find(p => p.elderlyId === e.patientId || p.id === e.patientId);
        const nameMatch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const patientMatch = !patientFilter || e.patientId === patientFilter;
        return nameMatch && patientMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evolutions, patients, searchTerm, patientFilter]);

  const filteredAnthropometries = useMemo(() => {
    return anthropometries
      .filter(a => {
        const patient = patients.find(p => p.elderlyId === a.patientId || p.id === a.patientId);
        const nameMatch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const patientMatch = !patientFilter || a.patientId === patientFilter;
        return nameMatch && patientMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [anthropometries, patients, searchTerm, patientFilter]);

  const filteredMealPlans = useMemo(() => {
    return mealPlans
      .filter(m => {
        const patient = patients.find(p => p.elderlyId === m.patientId || p.id === m.patientId);
        const nameMatch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const patientMatch = !patientFilter || m.patientId === patientFilter;
        return nameMatch && patientMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mealPlans, patients, searchTerm, patientFilter]);

  const renderReports = () => {
    const downloadReport = async (title: string, formatType: 'pdf' | 'word') => {
      if ((patients || []).length === 0) return;

      let filteredPatients = (patients || []);
      if (reportsPatientFilter) {
        filteredPatients = filteredPatients.filter(p => (p.elderlyId || p.id) === reportsPatientFilter);
      }

      const data = filteredPatients.map((p: any) => {
        const patientEvolutions = (evolutions || []).filter((e: any) => e.patientId === (p.elderlyId || p.id));
        const lastWeight = (anthropometries || [])
          .filter(a => a.patientId === (p.elderlyId || p.id))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
          
        return [
          p.name,
          p.dietType || 'N/A',
          p.consistency || 'N/A',
          lastWeight ? `${lastWeight.weight}kg (IMC: ${lastWeight.bmi})` : 'N/A',
          patientEvolutions.length
        ];
      });

      const subtitle = `Relatório de Nutrição - ${format(new Date(), "dd/MM/yyyy")}${reportsPatientFilter ? ` - Paciente: ${patients.find(p => (p.elderlyId || p.id) === reportsPatientFilter)?.name}` : ''}`;

      if (formatType === 'pdf') {
        await generateModernPDF({
          title,
          subtitle,
          columns: ['Paciente', 'Dieta', 'Consistência', 'Último Peso/IMC', 'Evoluções'],
          data,
          fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
        });
      } else {
        await generateModernWord({
          title,
          subtitle,
          columns: ['Paciente', 'Dieta', 'Consistência', 'Último Peso/IMC', 'Evoluções'],
          data,
          fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
        });
      }
    };

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4">
          <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Relatórios de Nutrição</h2>
          <div className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
            <Filter size={16} className="text-gray-400 ml-2" />
            <select 
              value={reportsPatientFilter}
              onChange={(e) => setReportsPatientFilter(e.target.value)}
              className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-600 dark:text-gray-400 min-w-[200px]"
            >
              <option value="">Todos os Idosos (Geral)</option>
              {patients.map(p => (
                <option key={p.id} value={p.elderlyId || p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <ReportCard 
            title="Relatório Nutricional" 
            description="Gere um relatório detalhado do estado nutricional dos idosos." 
            icon={<FileText className="text-blue-600" />} 
            onDownloadPDF={() => downloadReport('Relatório Nutricional Geral', 'pdf')}
            onDownloadWord={() => downloadReport('Relatório Nutricional Geral', 'word')}
          />
          <ReportCard 
            title="Acompanhamento de Peso" 
            description="Histórico de evolução ponderal e IMC dos últimos meses." 
            icon={<TrendingUp className="text-green-600" />} 
            onDownloadPDF={() => downloadReport('Acompanhamento Ponderal', 'pdf')}
            onDownloadWord={() => downloadReport('Acompanhamento Ponderal', 'word')}
          />
          <ReportCard 
            title="Prescrições Dietéticas" 
            description="Relatório de tipos de dieta e consistências por idoso." 
            icon={<Utensils className="text-orange-600" />} 
            onDownloadPDF={() => downloadReport('Relatório de Dietas', 'pdf')}
            onDownloadWord={() => downloadReport('Relatório de Dietas', 'word')}
          />
        </div>
      </div>
    );
  };

  const renderDashboard = () => {
    const totalPatients = patients.length;
    const highRiskCount = patients.filter(p => p.riskLevel === 'ALTO').length;
    const enteralCount = patients.filter(p => p.dietType === 'ENTERAL').length;
    const averageBmi = anthropometries.length > 0 
      ? (anthropometries.reduce((acc, curr) => acc + (curr.bmi || 0), 0) / anthropometries.length).toFixed(1)
      : 'N/A';

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-orange-100 dark:border-orange-900/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-orange-100 dark:bg-orange-900/30 text-orange-600 rounded-2xl">
                <Users size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Acolhidos</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{totalPatients}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-2xl">
                <AlertCircle size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Risco Nutricional</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{highRiskCount}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-blue-900/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-2xl">
                <Apple size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">Dieta Enteral</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{enteralCount}</h3>
              </div>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-green-100 dark:border-green-900/30">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                <Scale size={24} />
              </div>
              <div>
                <p className="text-sm font-bold text-gray-500 uppercase">IMC Médio</p>
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{averageBmi}</h3>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <History size={20} className="text-orange-500" />
              Últimas Evoluções
            </h3>
            <div className="space-y-4">
              {evolutions.slice(0, 5).map(e => {
                const patient = patients.find(p => p.id === e.patientId || p.elderlyId === e.patientId);
                return (
                  <div key={e.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{patient?.name || 'Desconhecido'}</p>
                      <p className="text-xs text-gray-500">{format(parseISO(e.date), 'dd/MM/yyyy')}</p>
                    </div>
                    <span className={cn(
                      "text-[10px] font-black px-2 py-1 rounded-full",
                      e.acceptance === 'BOA' ? "bg-green-100 text-green-700" :
                      e.acceptance === 'REGULAR' ? "bg-yellow-100 text-yellow-700" :
                      "bg-red-100 text-red-700"
                    )}>
                      {e.acceptance}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-blue-500" />
              Status Nutricional
            </h3>
            <div className="space-y-4">
              {anthropometries.slice(0, 5).map(a => {
                const patient = patients.find(p => p.id === a.patientId || p.elderlyId === a.patientId);
                return (
                  <div key={a.id} className="flex justify-between items-center p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors">
                    <div>
                      <p className="font-bold text-gray-900 dark:text-white">{patient?.name || 'Desconhecido'}</p>
                      <p className="text-xs text-gray-500">IMC: {a.bmi.toFixed(1)}</p>
                    </div>
                    <span className="text-[10px] font-black px-2 py-1 bg-blue-100 text-blue-700 rounded-full">
                      {a.nutritionalStatus}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderPatients = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Buscar por nome do acolhido..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(p => (
          <motion.div 
            key={p.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 group relative"
          >
            <div className="flex justify-between items-start mb-4">
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900/20 rounded-3xl flex items-center justify-center text-orange-500">
                <User size={32} />
              </div>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setEditingRecord(p); setIsModalOpen(true); }}
                  className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors"
                >
                  <Edit2 size={16} />
                </button>
              </div>
            </div>

            <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight mb-2">{p.name}</h4>
            
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className="text-[10px] font-black px-2 py-1 bg-orange-100 text-orange-700 rounded-full uppercase tracking-wider">{p.dietType}</span>
                <span className="text-[10px] font-black px-2 py-1 bg-blue-100 text-blue-700 rounded-full uppercase tracking-wider">{p.consistency}</span>
                <span className={cn(
                  "text-[10px] font-black px-2 py-1 rounded-full uppercase tracking-wider",
                  p.riskLevel === 'ALTO' ? "bg-red-100 text-red-700" :
                  p.riskLevel === 'MEDIO' ? "bg-yellow-100 text-yellow-700" :
                  "bg-green-100 text-green-700"
                )}>
                  Risco: {p.riskLevel}
                </span>
              </div>

              {p.allergies && p.allergies.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1">Alergias</p>
                  <div className="flex flex-wrap gap-1">
                    {p.allergies.map((a, i) => (
                      <span key={i} className="text-[10px] font-medium px-2 py-0.5 bg-red-50 text-red-600 rounded-md">{a}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderEvolutions = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Filtrar por nome ou conteúdo..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium appearance-none"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
          >
            <option value="">Todos os Idosos</option>
            {patients.map(p => (
              <option key={p.id} value={p.elderlyId || p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { setEditingRecord(null); setModalType('evolution'); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 dark:shadow-none"
        >
          <Plus size={20} /> Nova Evolução
        </button>
      </div>

      <div className="space-y-4">
        {filteredEvolutions.map(e => {
          const patient = patients.find(p => p.elderlyId === e.patientId || p.id === e.patientId);
          return (
            <motion.div 
              key={e.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 group"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 dark:bg-orange-900/30 rounded-2xl flex items-center justify-center text-orange-600">
                    <ClipboardList size={24} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{patient?.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> {format(parseISO(e.date), 'dd/MM/yyyy')} {e.time && `às ${e.time}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingRecord(e); setModalType('evolution'); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteRecord('nutritionEvolutions', e.id)}
                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Utensils size={10} /> Aceitação Alimentar</p>
                  <p className="text-xs font-black text-gray-700 dark:text-gray-300">{e.acceptance}</p>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-bold text-gray-400 uppercase mb-1 flex items-center gap-1"><Droplets size={10} /> Hidratação</p>
                  <p className="text-xs font-black text-gray-700 dark:text-gray-300">{e.hydrationLevel}</p>
                </div>
              </div>

              <div className="mt-4 p-4 bg-orange-50/50 dark:bg-orange-900/10 rounded-2xl border border-orange-100/50 dark:border-orange-900/20">
                <p className="text-[10px] font-bold text-orange-400 uppercase mb-2">Observações e Conduta</p>
                <div className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {e.observations}
                </div>
                {e.conduct && (
                  <div className="mt-2 pt-2 border-t border-orange-100/50 dark:border-orange-900/20">
                    <p className="text-[10px] font-bold text-orange-400 uppercase">Conduta:</p>
                    <p className="text-sm text-gray-700 dark:text-gray-300 italic">{e.conduct}</p>
                  </div>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderAssessments = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Filtrar por nome ou conteúdo..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium appearance-none"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
          >
            <option value="">Todos os Idosos</option>
            {patients.map(p => (
              <option key={p.id} value={p.elderlyId || p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { setEditingRecord(null); setModalType('assessment'); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none"
        >
          <Scale size={20} /> Novo Peso/IMC
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredAnthropometries.map(a => {
          const patient = patients.find(p => p.elderlyId === a.patientId || p.id === a.patientId);
          return (
            <motion.div 
              key={a.id}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative group"
            >
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-xl">
                    <Scale size={20} />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white">{patient?.name}</h4>
                    <p className="text-[10px] text-gray-500 uppercase tracking-tighter">{format(parseISO(a.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="flex gap-1">
                  <button 
                    onClick={() => { setEditingRecord(a); setModalType('assessment'); setIsModalOpen(true); }}
                    className="p-1.5 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => onDeleteRecord('nutritionAnthropometries', a.id)}
                    className="p-1.5 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-lg"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">Peso</p>
                  <p className="text-xl font-black text-blue-600">{a.weight}kg</p>
                </div>
                <div className="text-center p-3 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter">IMC</p>
                  <p className="text-xl font-black text-blue-600">{a.bmi.toFixed(1)}</p>
                </div>
              </div>

              <div className="flex justify-between items-center text-[10px] font-black uppercase">
                <span className="text-gray-400">Status Nutricional</span>
                <span className={cn(
                  "px-2 py-0.5 rounded-full",
                  a.nutritionalStatus === 'EUTROFICO' ? "bg-green-100 text-green-700" :
                  "bg-orange-100 text-orange-700"
                )}>
                  {a.nutritionalStatus}
                </span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const renderMealPlans = () => (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input 
            type="text" 
            placeholder="Filtrar por nome ou conteúdo..." 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full md:w-64 relative">
          <Filter className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <select 
            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium appearance-none"
            value={patientFilter}
            onChange={(e) => setPatientFilter(e.target.value)}
          >
            <option value="">Todos os Idosos</option>
            {patients.map(p => (
              <option key={p.id} value={p.elderlyId || p.id}>{p.name}</option>
            ))}
          </select>
        </div>
        <button 
          onClick={() => { setEditingRecord(null); setModalType('mealPlan'); setIsModalOpen(true); }}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-100 dark:shadow-none"
        >
          <CalendarDays size={20} /> Novo Plano Alimentar
        </button>
      </div>

      <div className="space-y-6">
        {filteredMealPlans.map(m => {
          const patient = patients.find(p => p.elderlyId === m.patientId || p.id === m.patientId);
          return (
            <motion.div 
              key={m.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 relative group"
            >
              <div className="flex justify-between items-center mb-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 rounded-2xl">
                    <Apple size={24} />
                  </div>
                  <div>
                    <h4 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">{patient?.name}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Clock size={12} /> Prescrito em {format(parseISO(m.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => { setEditingRecord(m); setModalType('mealPlan'); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => onDeleteRecord('nutritionMealPlans', m.id)}
                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[
                  { label: 'Café da Manhã', val: m.breakfast },
                  { label: 'Lanche da Manhã', val: m.morningSnack },
                  { label: 'Almoço', val: m.lunch },
                  { label: 'Lanche da Tarde', val: m.afternoonSnack },
                  { label: 'Jantar', val: m.dinner },
                  { label: 'Ceia', val: m.supper }
                ].map((meal, idx) => meal.val && (
                  <div key={idx} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border border-gray-100 dark:border-gray-700">
                    <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2">{meal.label}</p>
                    <p className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed italic">{meal.val}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 p-6 bg-green-50/50 dark:bg-green-900/10 rounded-3xl border border-green-100/50">
                <p className="text-[10px] font-black text-green-600 uppercase tracking-widest mb-2 flex items-center gap-2">
                  <CheckCircle2 size={12} /> Recomendações Adicionais
                </p>
                <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  {m.recommendations}
                </p>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );

  const [modalType, setModalType] = useState<'profile' | 'evolution' | 'assessment' | 'mealPlan'>('profile');
  const [localFormData, setLocalFormData] = useState<any>({});

  const handleOpenModal = (type: any, record: any = null) => {
    setModalType(type);
    setEditingRecord(record);
    if (record) {
      setLocalFormData(record);
    } else {
      setLocalFormData({
        date: new Date().toISOString().split('T')[0],
        patientId: patientFilter || '',
        registeredBy: user.name
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'profile') await onSavePatient(localFormData);
    else if (modalType === 'evolution') await onSaveEvolution(localFormData);
    else if (modalType === 'assessment') await onSaveAnthropometry(localFormData);
    else if (modalType === 'mealPlan') await onSaveMealPlan(localFormData);
    setIsModalOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-gray-950/50 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-tight uppercase tracking-tighter">
            Setor de <span className="text-orange-600">Nutrição</span>
          </h1>
          <p className="text-gray-500 font-bold font-mono text-xs uppercase tracking-widest mt-1">Gestão Alimentar & Antropometria</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 mb-8 bg-white dark:bg-gray-900 p-2 rounded-[2rem] shadow-sm border border-gray-100 dark:border-gray-800 w-fit no-print">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'patients', label: 'Perfis Nutricionais', icon: User },
          { id: 'evolutions', label: 'Evoluções', icon: ClipboardList },
          { id: 'assessments', label: 'Peso/IMC', icon: Scale },
          { id: 'mealPlans', label: 'Planos Alimentares', icon: Utensils },
          { id: 'reports', label: 'Relatórios', icon: FileText }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id as any); setSearchTerm(''); setPatientFilter(''); }}
            className={cn(
              "flex items-center gap-2 px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-wider transition-all",
              activeTab === tab.id 
                ? "bg-orange-600 text-white shadow-lg shadow-orange-100 dark:shadow-none translate-y-[-2px]" 
                : "text-gray-400 hover:text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/10"
            )}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Content Area */}
      <div className="space-y-8">
        {activeTab === 'dashboard' && renderDashboard()}
        {activeTab === 'patients' && renderPatients()}
        {activeTab === 'evolutions' && renderEvolutions()}
        {activeTab === 'assessments' && renderAssessments()}
        {activeTab === 'mealPlans' && renderMealPlans()}
        {activeTab === 'reports' && renderReports()}
      </div>

      {/* Modal - Simplificado para o exemplo */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 max-w-2xl w-full shadow-2xl relative my-8"
            >
              <button 
                onClick={() => setIsModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-gray-600 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              
              <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-6 uppercase tracking-tighter">
                {editingRecord ? 'Editar' : 'Novo'} {
                  modalType === 'profile' ? 'Perfil Nutricional' :
                  modalType === 'evolution' ? 'Registro de Evolução' :
                  modalType === 'assessment' ? 'Registro de Peso/IMC' :
                  'Plano Alimentar'
                }
              </h2>

              <form onSubmit={handleSave} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Acolhido</label>
                    <select 
                      required
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                      value={localFormData.patientId || localFormData.id}
                      onChange={e => setLocalFormData({...localFormData, patientId: e.target.value})}
                    >
                      <option value="">Selecione...</option>
                      {patients.map(p => (
                        <option key={p.id} value={p.elderlyId || p.id}>{p.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Data</label>
                    <input 
                      type="date"
                      required
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                      value={localFormData.date || ''}
                      onChange={e => setLocalFormData({...localFormData, date: e.target.value})}
                    />
                  </div>
                </div>

                {modalType === 'evolution' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Aceitação</label>
                        <select 
                          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                          value={localFormData.acceptance}
                          onChange={e => setLocalFormData({...localFormData, acceptance: e.target.value})}
                        >
                          <option value="BOA">BOA</option>
                          <option value="REGULAR">REGULAR</option>
                          <option value="RUIM">RUIM</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Hidratação</label>
                        <select 
                          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                          value={localFormData.hydrationLevel}
                          onChange={e => setLocalFormData({...localFormData, hydrationLevel: e.target.value})}
                        >
                          <option value="BOM">BOM</option>
                          <option value="MODERADO">MODERADO</option>
                          <option value="BAIXO">BAIXO</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Aceitação e Conduta</label>
                      <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium h-32"
                        value={localFormData.observations}
                        onChange={e => setLocalFormData({...localFormData, observations: e.target.value})}
                      />
                    </div>
                  </>
                )}

                {modalType === 'assessment' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Peso (kg)</label>
                      <input 
                        type="number" step="0.1"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        value={localFormData.weight || ''}
                        onChange={e => {
                          const w = parseFloat(e.target.value);
                          const h = localFormData.height || 1.6; // Valor padrão se não houver
                          setLocalFormData({...localFormData, weight: w, bmi: w / (h * h)});
                        }}
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Altura (m)</label>
                      <input 
                        type="number" step="0.01"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-bold"
                        value={localFormData.height || ''}
                        onChange={e => {
                          const h = parseFloat(e.target.value);
                          const w = localFormData.weight || 0;
                          setLocalFormData({...localFormData, height: h, bmi: w / (h * h)});
                        }}
                      />
                    </div>
                  </div>
                )}

                {modalType === 'mealPlan' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-[40vh] overflow-y-auto p-2">
                    {['breakfast', 'morningSnack', 'lunch', 'afternoonSnack', 'dinner', 'supper'].map(f => (
                      <div key={f}>
                        <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">{f}</label>
                        <input 
                          type="text"
                          className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium"
                          value={localFormData[f] || ''}
                          onChange={e => setLocalFormData({...localFormData, [f]: e.target.value})}
                        />
                      </div>
                    ))}
                    <div className="col-span-full">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Recomendações</label>
                      <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium h-24"
                        value={localFormData.recommendations}
                        onChange={e => setLocalFormData({...localFormData, recommendations: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                {modalType === 'profile' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Tipo de Dieta</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                        value={localFormData.dietType}
                        onChange={e => setLocalFormData({...localFormData, dietType: e.target.value})}
                      >
                        <option value="LIVRE">LIVRE</option>
                        <option value="BRANDA">BRANDA</option>
                        <option value="PASTOSA">PASTOSA</option>
                        <option value="LIQUIDA">LIQUIDA</option>
                        <option value="ENTERAL">ENTERAL</option>
                        <option value="DIABETICA">DIABETICA</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Consistência</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold"
                        value={localFormData.consistency}
                        onChange={e => setLocalFormData({...localFormData, consistency: e.target.value})}
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="ESPESSADA">ESPESSADA</option>
                        <option value="RESTRITA">RESTRITA</option>
                      </select>
                    </div>
                  </div>
                )}

                <button 
                  type="submit"
                  className="w-full py-4 bg-orange-600 text-white font-black rounded-2xl shadow-xl hover:bg-orange-700 transition-all uppercase tracking-widest text-sm"
                >
                  Confirmar e Salvar Registro
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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
