import React, { useState, useMemo, useEffect } from 'react';
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
  X,
  Eye,
  Activity,
  Info,
  Printer
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO, differenceInYears } from 'date-fns';
import { 
  NutritionPatient, 
  NutritionEvolution, 
  NutritionAnthropometry, 
  NutritionMealPlan, 
  User as UserType,
  Elderly,
  NursingEvolution, PhysioEvolution, PsychEvolution, PedagogyEvolution, SocialEvolution, Workshop, AppNotification, Professional
} from '../types';
import { cn, safeReplace } from '../lib/utils';
import { ProductivitySection } from './ProductivitySection';
import { MultiPatientSelector } from './MultiPatientSelector';
import { Award } from 'lucide-react';
import { ROLE_LABELS } from '../constants';
import { generateModernPDF, generateMultiSectionPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';

interface NutritionSectionProps {
  user: UserType;
  elderly: Elderly[];
  patients: NutritionPatient[];
  evolutions: NutritionEvolution[];
  anthropometries: NutritionAnthropometry[];
  mealPlans: NutritionMealPlan[];
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

export const NutritionSection: React.FC<NutritionSectionProps> = (props) => {
  const {
    user,
    elderly,
    patients,
    evolutions,
    anthropometries,
    mealPlans,
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
    onDeleteCollaborationEvolution,
    showToast,
    onSavePatient,
    onSaveEvolution,
    onSaveAnthropometry,
    onSaveMealPlan,
    onDeleteRecord,
    onSavePhotos,
  } = props;
  const [activeTab, setActiveTab] = useState<'dashboard' | 'patients' | 'evolutions' | 'assessments' | 'mealPlans' | 'productivity' | 'reports'>('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('');
  const [reportsPatientFilter, setReportsPatientFilter] = useState('');
  
  // Integrated report states
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
    'evolutions', 'anthropometries', 'mealPlans'
  ]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState<any>(null);
  const [modalType, setModalType] = useState<'profile' | 'evolution' | 'assessment' | 'mealPlan'>('profile');
  const [localFormData, setLocalFormData] = useState<any>({});
  const [profSearch, setProfSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; collection: string; label: string } | null>(null);
  const [viewingEvo, setViewingEvo] = useState<any | null>(null);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [isMulti, setIsMulti] = useState(false);

  useEffect(() => {
    if (props.defaultTab) {
      setActiveTab(props.defaultTab as any);
    }
  }, [props.defaultTab]);

  // Sincronização automática com Cadastro Geral
  const linkedElderly = useMemo(() => 
    localFormData.elderlyId ? (elderly || []).find(e => e.id === localFormData.elderlyId) : null,
  [localFormData.elderlyId, elderly]);

  useEffect(() => {
    if (linkedElderly && modalType === 'profile') {
      const birthDate = linkedElderly.birthDate;
      const age = birthDate ? differenceInYears(new Date(), parseISO(birthDate)) : 0;
      
      setLocalFormData((prev: any) => ({
        ...prev,
        name: linkedElderly.name,
        age: age,
        comorbidities: linkedElderly.diseases || prev.comorbidities,
        allergies: linkedElderly.allergies ? linkedElderly.allergies.split(',').map(a => a.trim()).filter(a => a) : prev.allergies
      }));
    }
  }, [linkedElderly, modalType]);

  // Filtered Data
  const filteredPatients = patients.filter(p => {
    const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
    const name = linked?.name || p.name;
    return name.toLowerCase().includes(searchTerm.toLowerCase());
  });

  const filteredEvolutions = useMemo(() => {
    return evolutions
      .filter(e => {
        const patient = patients.find(p => p.elderlyId === e.patientId || p.id === e.patientId);
        const nameMatch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const patientMatch = !patientFilter || e.patientId === patientFilter || e.patientIds?.includes(patientFilter);
        return nameMatch && patientMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evolutions, patients, searchTerm, patientFilter]);

  const filteredAnthropometries = useMemo(() => {
    return anthropometries
      .filter(a => {
        const patient = patients.find(p => p.elderlyId === a.patientId || p.id === a.patientId);
        const nameMatch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const patientMatch = !patientFilter || a.patientId === patientFilter || a.patientIds?.includes(patientFilter);
        return nameMatch && patientMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [anthropometries, patients, searchTerm, patientFilter]);

  const filteredMealPlans = useMemo(() => {
    return mealPlans
      .filter(m => {
        const patient = patients.find(p => p.elderlyId === m.patientId || p.id === m.patientId);
        const nameMatch = patient?.name.toLowerCase().includes(searchTerm.toLowerCase());
        const patientMatch = !patientFilter || m.patientId === patientFilter || m.patientIds?.includes(patientFilter);
        return nameMatch && patientMatch;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [mealPlans, patients, searchTerm, patientFilter]);

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

    // Filtered lists based on reportsPatientFilter
    const matchedPatients = (patients || []).filter(p => {
      const pId = p.elderlyId || p.id;
      return !reportsPatientFilter || pId === reportsPatientFilter;
    });

    const isPatientInList = (pId: string) => {
      return matchedPatients.some(p => (p.elderlyId || p.id) === pId);
    };

    // Filtered Evolutions
    const filteredEvolutions = (evolutions || []).filter(e => {
      return isPatientInList(e.patientId) && isDateInSelectedRange(e.date);
    });

    // Filtered Anthropometries
    const filteredAnthropometries = (anthropometries || []).filter(as => {
      return isPatientInList(as.patientId) && isDateInSelectedRange(as.date);
    });

    // Filtered Meal Plans
    const filteredMealPlans = (mealPlans || []).filter(m => {
      return isPatientInList(m.patientId) && isDateInSelectedRange(m.date);
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
        ? `Idoso: ${(patients || []).find(p => (p.elderlyId || p.id) === reportsPatientFilter)?.name}` 
        : 'Todos os Idosos (Geral)';
        
      return `Área: Nutricional | ${patientName} | Cronograma: ${period}`;
    };

    const handleGenerateIntegratedReport = async (formatType: 'pdf' | 'word') => {
      const sections = [];
      const subtitleText = getSubtitleText();

      if (reportSelectedSections.includes('evolutions') && filteredEvolutions.length > 0) {
        const columns = reportsPatientFilter 
          ? ['Data', 'Aceitabilidade Alimentar', 'Hidratação', 'Conduta / Observação', 'Responsável']
          : ['Data', 'Idoso', 'Aceitabilidade Alimentar', 'Hidratação', 'Conduta / Observação', 'Responsável'];
          
        const data = filteredEvolutions.map(e => {
          const p = (patients || []).find(pt => (pt.elderlyId || pt.id) === e.patientId);
          const name = p?.name || 'N/A';
          const dtFmt = format(parseISO(e.date), 'dd/MM/yyyy');
          const conductObs = `Conduta: ${e.conduct || '-'}\nObs: ${e.observations || '-'}`;
          return reportsPatientFilter
            ? [dtFmt, e.acceptance || 'BOA', e.hydrationLevel || 'BOM', conductObs, e.registeredBy || 'CRN']
            : [dtFmt, name, e.acceptance || 'BOA', e.hydrationLevel || 'BOM', conductObs, e.registeredBy || 'CRN'];
        });
        
        sections.push({ title: 'Evoluções Nutricionais', columns, data });
      }

      if (reportSelectedSections.includes('anthropometries') && filteredAnthropometries.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Peso (kg)', 'Altura (m)', 'IMC', 'Status Nutricional', 'Circunferências (Braço / Panturrilha)']
          : ['Data', 'Idoso', 'Peso (kg)', 'Altura (m)', 'IMC', 'Status Nutricional', 'Circunferências (Braço / Panturrilha)'];
          
        const data = filteredAnthropometries.map(an => {
          const p = (patients || []).find(pt => (pt.elderlyId || pt.id) === an.patientId);
          const name = p?.name || 'N/A';
          const dtFmt = format(parseISO(an.date), 'dd/MM/yyyy');
          const circs = `Br: ${an.armCircumference !== undefined ? `${an.armCircumference}cm` : '-'} | Pa: ${an.calfCircumference !== undefined ? `${an.calfCircumference}cm` : '-'}`;
          return reportsPatientFilter
            ? [dtFmt, String(an.weight), String(an.height), String(an.bmi), an.nutritionalStatus || '-', circs]
            : [dtFmt, name, String(an.weight), String(an.height), String(an.bmi), an.nutritionalStatus || '-', circs];
        });
        
        sections.push({ title: 'Acompanhamento Antropométrico', columns, data });
      }

      if (reportSelectedSections.includes('mealPlans') && filteredMealPlans.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Plano Alimentar (Resumo)', 'Prescrições / Recomendações', 'Nutricionista']
          : ['Data', 'Idoso', 'Plano Alimentar (Resumo)', 'Prescrições / Recomendações', 'Nutricionista'];
          
        const data = filteredMealPlans.map(m => {
          const p = (patients || []).find(pt => (pt.elderlyId || pt.id) === m.patientId);
          const name = p?.name || 'N/A';
          const dtFmt = format(parseISO(m.date), 'dd/MM/yyyy');
          const mealsRes = `Café: ${m.breakfast}\nAlmoço: ${m.lunch}\nLanche: ${m.afternoonSnack}\nJantar: ${m.dinner}`;
          return reportsPatientFilter
            ? [dtFmt, mealsRes, m.recommendations || '-', m.registeredBy || 'CRN']
            : [dtFmt, name, mealsRes, m.recommendations || '-', m.registeredBy || 'CRN'];
        });
        
        sections.push({ title: 'Planos Alimentares Cadastrados', columns, data });
      }

      if (sections.length === 0) {
        showToast('Nenhum dado selecionado ou encontrado para o período e idoso especificados', 'error');
        return;
      }

      const docTitle = reportsPatientFilter 
        ? `Prontuário Nutricional - ${patients.find(p => (p.elderlyId || p.id) === reportsPatientFilter)?.name}`
        : 'Relatório Consolidado de Atividades (Nutrição)';

      if (formatType === 'pdf') {
        try {
          await generateMultiSectionPDF({
            title: docTitle,
            subtitle: subtitleText,
            sections,
            fileName: `relatorio_nutri_${format(new Date(), 'yyyy-MM-dd')}`
          });
          showToast('Relatório em PDF gerado com sucesso!', 'success');
        } catch (e) {
          console.error(e);
          showToast('Erro ao exportar o PDF', 'error');
        }
      } else {
        try {
          const mergedColumns = ['Categoria', 'Data/Período', 'Paciente/Idoso', 'Descrição / Registro'];
          const mergedData: any[][] = [];

          sections.forEach(sec => {
            sec.data.forEach(row => {
              if (reportsPatientFilter) {
                const targetName = patients.find(p => (p.elderlyId || p.id) === reportsPatientFilter)?.name || 'N/A';
                mergedData.push([
                  sec.title,
                  row[0],
                  targetName,
                  row.slice(1).join(' | ')
                ]);
              } else {
                mergedData.push([
                  sec.title,
                  row[0],
                  row[1] || 'Geral',
                  row.slice(2).join(' | ')
                ]);
              }
            });
          });

          await generateModernWord({
            title: docTitle,
            subtitle: subtitleText,
            columns: mergedColumns,
            data: mergedData,
            fileName: `relatorio_nutri_doc`
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
      filteredAnthropometries.length === 0 && 
      filteredMealPlans.length === 0;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
            Gerador Inteligente de Relatórios
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Gere relatórios técnicos integrados de nutrição para consulta e prontuário. Selecione múltiplos formatos de data, idosos e escolha quais módulos do sistema incluir no documento final.
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
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-850 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
                <Filter size={16} className="text-gray-400 shrink-0" />
                <select 
                  value={reportsPatientFilter}
                  onChange={(e) => setReportsPatientFilter(e.target.value)}
                  className="w-full text-xs font-black bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white outline-none"
                >
                  <option value="">TODOS OS IDOSOS (GERAL)</option>
                  {patients.map(p => {
                    return (
                      <option key={p.id} value={p.elderlyId || p.id}>{(p.name || '').toUpperCase()}</option>
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
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-850 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
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
                  className="w-full text-xs font-bold bg-gray-50 dark:bg-gray-850 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none"
                />
              )}

              {reportFilterType === 'year' && (
                <div className="bg-gray-50 dark:bg-gray-850 px-4 py-3 rounded-2xl border border-gray-100 dark:border-gray-700">
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
                    className="w-full text-xs font-black bg-gray-50 dark:bg-gray-855 px-3 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white outline-none"
                  >
                    <option value="1">1º SEMESTRE (JAN - JUN)</option>
                    <option value="2">2º SEMESTRE (JUL - DEZ)</option>
                  </select>

                  <select
                    value={reportSelectedYear}
                    onChange={(e) => setReportSelectedYear(e.target.value)}
                    className="w-full text-xs font-black bg-gray-50 dark:bg-gray-855 px-3 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white outline-none"
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
                    className="w-full text-[10px] font-bold bg-gray-50 dark:bg-gray-855 px-2 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none"
                  />
                  <input 
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full text-[10px] font-bold bg-gray-50 dark:bg-gray-855 px-2 py-3 rounded-2xl border border-gray-100 dark:border-gray-700 text-gray-800 dark:text-white focus:outline-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section categories toggles with badges of found records */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-855 shadow-sm space-y-4">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Seções do Sistema a Incluir no Relatório
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {[
              { id: 'evolutions', title: 'Evoluções Nutricionais', desc: 'Registros de hidratação, aceitação e observações.', icon: Activity, color: 'text-emerald-500', count: filteredEvolutions.length },
              { id: 'anthropometries', title: 'Medições Antropométricas', desc: 'Controle de evolução de peso, altura e IMC.', icon: ClipboardList, color: 'text-blue-500', count: filteredAnthropometries.length },
              { id: 'mealPlans', title: 'Dieta e Planos Alimentares', desc: 'Refeições fracionadas e condutas prescritas.', icon: Utensils, color: 'text-orange-500', count: filteredMealPlans.length },
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
        <div className="bg-gray-50 dark:bg-gray-900/20 p-6 rounded-3xl border border-dashed border-gray-250 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-start gap-3">
            <div className="p-3 bg-emerald-100 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0 mt-0.5">
              <Info size={20} />
            </div>
            <div>
              <p className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-tight">
                Configuração Prona para Impressão
              </p>
              <p className="text-[11px] leading-relaxed font-semibold text-gray-500 dark:text-gray-400 mt-0.5">
                {hasNoRecords 
                  ? "Atenção: Não há registros cadastrados para os filtros selecionados. Cadastre evoluções ou mude as datas para habilitar relatórios."
                  : `Seu relatório integrará ${reportSelectedSections.filter(s => {
                      if (s === 'evolutions') return filteredEvolutions.length > 0;
                      if (s === 'anthropometries') return filteredAnthropometries.length > 0;
                      if (s === 'mealPlans') return filteredMealPlans.length > 0;
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
                  : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-205 dark:shadow-none"
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
                  : "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-205 dark:shadow-none"
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
        <button 
          onClick={() => handleOpenModal('profile')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-orange-600 text-white rounded-2xl font-bold hover:bg-orange-700 transition-all shadow-lg shadow-orange-100 dark:shadow-none"
        >
          <Plus size={20} /> Novo Perfil Nutricional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredPatients.map(p => {
          const linkedElderly = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
          const name = linkedElderly?.name || p.name;

          return (
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
                    onClick={() => handleOpenModal('profile', p)}
                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 rounded-xl transition-colors"
                  >
                    <Edit2 size={16} />
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1 mb-3">
                <h4 className="text-xl font-black text-gray-900 dark:text-white leading-tight">{name}</h4>
                {linkedElderly && (
                  <span className="w-fit px-2 py-0.5 bg-orange-100 text-orange-700 text-[8px] font-black uppercase rounded tracking-widest border border-orange-200">Vinculado ao Cadastro Geral</span>
                )}
              </div>
              
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
        )})}
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
          const displayName = e.patientIds && e.patientIds.length > 1
            ? e.patientIds.map(pid => patients.find(p => p.id === pid)?.name).filter(Boolean).join(', ')
            : (patient?.name || 'N/A');
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
                    <h4 className="font-bold text-gray-900 dark:text-white uppercase tracking-tight">{displayName}</h4>
                    <p className="text-xs text-gray-500 flex items-center gap-1"><Calendar size={12} /> {format(parseISO(e.date), 'dd/MM/yyyy')} {e.time && `às ${e.time}`}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => setViewingEvo(e)}
                    className="p-2 text-gray-400 hover:text-green-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    title="Visualizar 👁️"
                  >
                    <Eye size={16} />
                  </button>
                  <button 
                    onClick={() => { setEditingRecord(e); setModalType('evolution'); setIsModalOpen(true); }}
                    className="p-2 text-gray-400 hover:text-blue-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    title="Editar ✏️"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ id: e.id, collection: 'nutritionEvolutions', label: `Evolução de ${patient?.name}` })}
                    className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 dark:bg-gray-800 rounded-xl"
                    title="Excluir 🗑️"
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
          const displayName = a.patientIds && a.patientIds.length > 1
            ? a.patientIds.map(pid => patients.find(p => p.id === pid)?.name).filter(Boolean).join(', ')
            : (patient?.name || 'N/A');
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
                    <h4 className="font-bold text-gray-900 dark:text-white">{displayName}</h4>
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
          const displayName = m.patientIds && m.patientIds.length > 1
            ? m.patientIds.map(pid => patients.find(p => p.id === pid)?.name).filter(Boolean).join(', ')
            : (patient?.name || 'N/A');
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
                    <h4 className="text-xl font-black text-gray-800 dark:text-white uppercase tracking-tight">{displayName}</h4>
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

  const handleOpenModal = (type: any, record: any = null) => {
    setModalType(type);
    setEditingRecord(record);
    if (record) {
      setLocalFormData(record);
      setSelectedPatientIds(record.patientId ? [record.patientId] : []);
    } else {
      setLocalFormData({
        date: new Date().toISOString().split('T')[0],
        patientId: patientFilter || '',
        registeredBy: user.name
      });
      setSelectedPatientIds(patientFilter ? [patientFilter] : []);
    }
    setIsMulti(false);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isMulti && selectedPatientIds.length > 1 && !editingRecord && modalType !== 'profile') {
      const primaryPid = selectedPatientIds[0];
      const itemData = { ...localFormData, patientId: primaryPid, patientIds: selectedPatientIds };
      if (modalType === 'evolution') await onSaveEvolution(itemData);
      else if (modalType === 'assessment') await onSaveAnthropometry(itemData);
      else if (modalType === 'mealPlan') await onSaveMealPlan(itemData);
    } else {
      const finalPid = selectedPatientIds[0] || localFormData.patientId;
      const finalData = { ...localFormData, patientId: finalPid, patientIds: [finalPid] };
      if (modalType === 'profile') await onSavePatient(localFormData);
      else if (modalType === 'evolution') await onSaveEvolution(finalData);
      else if (modalType === 'assessment') await onSaveAnthropometry(finalData);
      else if (modalType === 'mealPlan') await onSaveMealPlan(finalData);
    }
    setIsModalOpen(false);
    setSelectedPatientIds([]);
    setIsMulti(false);
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
          { id: 'productivity', label: 'Painel e Colaboração', icon: Award },
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
        {activeTab === 'productivity' && (
          <ProductivitySection
            user={user}
            professionals={professionals}
            nursingEvolutions={nursingEvolutions}
            physioEvolutions={physioEvolutions}
            psychEvolutions={psychEvolutions}
            pedagogyEvolutions={pedagogyEvolutions}
            socialEvolutions={socialEvolutions}
            nutritionEvolutions={evolutions}
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
            targetSector="Nutrição"
            targetRole="NUTRICIONISTA"
            psychActivities={props.psychActivities}
            pedagogyActivities={props.pedagogyActivities}
            onViewActivity={props.onViewActivity}
          />
        )}
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
                {modalType === 'profile' && (
                  <div className="space-y-3 p-6 bg-orange-50 dark:bg-orange-900/10 rounded-[32px] border border-orange-100 dark:border-orange-800/30 transition-all mb-4">
                    <label className="text-[10px] font-black text-orange-600 dark:text-orange-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                      <Users size={14} />
                      Vincular ao Cadastro Geral (Idosos)
                    </label>
                    <select 
                      className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-orange-500 transition-all font-bold dark:text-white"
                      value={localFormData.elderlyId || ''}
                      onChange={(e) => setLocalFormData({ ...localFormData, elderlyId: e.target.value })}
                    >
                      <option value="">-- Não vinculado / Novo Perfil --</option>
                      {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                    </select>
                    <p className="text-[10px] text-orange-600/60 ml-1 italic font-medium">Sincroniza nome e idade.</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Acolhido</label>
                    {modalType === 'profile' ? (
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold disabled:opacity-50"
                        value={localFormData.name || ''}
                        onChange={e => setLocalFormData({...localFormData, name: e.target.value})}
                        disabled={!!localFormData.elderlyId}
                      />
                    ) : (
                      <div className="animate-fade-in">
                        <MultiPatientSelector 
                          patients={(patients || []).map(p => {
                            const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                            return { id: p.elderlyId || p.id, name: linked?.name || p.name };
                          })}
                          selectedIds={selectedPatientIds}
                          onChange={setSelectedPatientIds}
                          singleValue={localFormData.patientId || localFormData.id || ''}
                          onSingleChange={id => setLocalFormData({ ...localFormData, patientId: id })}
                          isMulti={isMulti}
                          onToggleMulti={setIsMulti}
                          accentColor="orange"
                          label=""
                        />
                      </div>
                    )}
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

                    <div className="space-y-4 border-t border-gray-100 dark:border-gray-800 pt-6">
                      <div className="flex justify-between items-center bg-transparent">
                        <div>
                          <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Co-workers / Profissionais Colaboradores</label>
                          <span className="text-[10px] text-gray-400">Selecione quem participou desta ação em conjunto</span>
                        </div>
                        {localFormData.coWorkers && localFormData.coWorkers.length > 0 && (
                          <button 
                            type="button" 
                            onClick={() => setLocalFormData({ ...localFormData, coWorkers: [] })}
                            className="text-[10px] text-red-500 font-bold uppercase tracking-wider animate-pulse"
                          >
                            Limpar Seleção ({localFormData.coWorkers.length})
                          </button>
                        )}
                      </div>
                      
                      <div className="relative">
                        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-transparent focus-within:border-orange-500 transition-all">
                          <Search size={16} className="text-gray-400" />
                          <input 
                            type="text"
                            placeholder="Buscar profissional por nome ou cargo..."
                            value={profSearch}
                            onChange={(e) => setProfSearch(e.target.value)}
                            className="bg-transparent text-sm w-full outline-none text-gray-800 dark:text-white"
                          />
                          {profSearch && (
                            <button type="button" onClick={() => setProfSearch('')} className="text-gray-400 hover:text-gray-655">
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
                            const isSelected = (localFormData.coWorkers || []).includes(p.id) || (localFormData.coWorkers || []).includes(p.email);
                            return (
                              <button
                                key={p.id || p.email}
                                type="button"
                                onClick={() => {
                                  const list = localFormData.coWorkers || [];
                                  const identifier = p.id || p.email;
                                  if (isSelected) {
                                    setLocalFormData({ ...localFormData, coWorkers: list.filter((item: string) => item !== p.id && item !== p.email) });
                                  } else {
                                    setLocalFormData({ ...localFormData, coWorkers: [...list, identifier] });
                                  }
                                }}
                                className={cn(
                                  "flex items-center justify-between p-3 rounded-2xl border border-transparent text-left transition-all",
                                  isSelected 
                                    ? "bg-blend-color-burn bg-orange-550/10 dark:bg-orange-950/20 border-orange-400 dark:border-orange-800 text-orange-900 dark:text-orange-300"
                                    : "bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-750 text-gray-750 dark:text-gray-250"
                                )}
                              >
                                <div className="min-w-0">
                                  <p className="text-xs font-bold truncate text-gray-900 dark:text-gray-100">{p.name}</p>
                                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mt-0.5">{ROLE_LABELS[p.role] || p.role}</p>
                                </div>
                                <div className={cn(
                                  "w-5 h-5 rounded-lg border flex items-center justify-center transition-all shrink-0",
                                  isSelected ? "bg-orange-500 border-orange-500 text-white" : "border-gray-200 dark:border-gray-700 bg-transparent"
                                )}>
                                  {isSelected && <CheckCircle2 size={12} />}
                                </div>
                              </button>
                            );
                          })
                        }
                      </div>
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
                  <>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Idade</label>
                      <input 
                        type="number"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-bold disabled:opacity-50"
                        value={localFormData.age || ''}
                        onChange={e => setLocalFormData({...localFormData, age: parseInt(e.target.value)})}
                        disabled={!!localFormData.elderlyId}
                      />
                    </div>
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
                  <div className="space-y-4">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-2">Doenças / Comorbidades</label>
                      <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-orange-500 text-sm font-medium h-20"
                        value={localFormData.comorbidities || ''}
                        onChange={e => setLocalFormData({...localFormData, comorbidities: e.target.value})}
                        placeholder="Ex: Diabetes, Hipertensão..."
                      />
                    </div>
                  </div>
                  </>
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

        {viewingEvo && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-lg w-full space-y-6 max-h-[85vh] overflow-y-auto text-left"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2 text-orange-600">
                  <Apple size={24} />
                  <h3 className="text-xl font-bold text-gray-850 dark:text-white">Detalhes da Evolução Nutricional</h3>
                </div>
                <button onClick={() => setViewingEvo(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Idoso / Paciente</span>
                  <p className="text-base font-bold text-gray-800 dark:text-white">
                    {((patients || []).find(p => p.id === viewingEvo.patientId)?.name || 'N/A')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data e Hora</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {format(parseISO(viewingEvo.date), 'dd/MM/yyyy')} {viewingEvo.time && `às ${viewingEvo.time}`}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Registrado Por</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingEvo.registeredBy || 'Nutricionista'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Apetite</span>
                    <p className="text-sm font-bold text-orange-600 uppercase">
                      {viewingEvo.appetite || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Hidratação</span>
                    <p className="text-sm font-bold text-blue-650 uppercase">
                      {viewingEvo.hydration || 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 bg-gray-50 dark:bg-gray-805 p-3 rounded-xl border border-gray-100 text-center">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Mastigação</span>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {viewingEvo.chewing || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Deglutição</span>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {viewingEvo.swallowing || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Ingestão</span>
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                      {viewingEvo.intake || 'N/A'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Evolução Clínica</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingEvo.evolution || viewingEvo.observation}
                  </p>
                </div>

                {viewingEvo.conduct && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Conduta / Planejamento</span>
                    <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                      {viewingEvo.conduct}
                    </p>
                  </div>
                )}

                {viewingEvo.coWorkers && viewingEvo.coWorkers.length > 0 && (
                  <div className="pt-3 border-t border-gray-105 dark:border-gray-850">
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
                  className="px-6 py-2.5 bg-orange-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-orange-700 transition"
                >
                  Fechar
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {deleteConfirm && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[90] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full space-y-6 text-center shadow-2xl"
            >
              <div className="w-16 h-16 bg-red-50 dark:bg-red-950/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mx-auto">
                <Trash2 size={32} />
              </div>
              <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Confirmar Exclusão</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  Tem certeza que deseja apagar o registro de <strong className="text-gray-700 dark:text-gray-300">"{deleteConfirm.label}"</strong>? Esta ação é de exclusão permanente.
                </p>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeleteConfirm(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-205 text-gray-700 dark:text-gray-300 text-sm font-bold rounded-xl transition"
                >
                  Cancelar
                </button>
                <button 
                  onClick={async () => {
                    try {
                      await onDeleteRecord(deleteConfirm.collection, deleteConfirm.id);
                      showToast("Sucesso", "Registro excluído com sucesso.");
                    } catch (e: any) {
                      showToast("Erro", "Falha ao excluir.");
                    } finally {
                      setDeleteConfirm(null);
                    }
                  }}
                  className="flex-1 py-3 bg-red-650 hover:bg-red-750 text-white text-sm font-bold rounded-xl shadow-lg transition"
                >
                  Confirmar Exclusão
                </button>
              </div>
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
