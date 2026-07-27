import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Brain, ClipboardList, 
  MessageSquare, Heart, Users2, Puzzle, Activity, 
  AlertCircle, FileText, Settings, Plus, Search, 
  Filter, MoreVertical, ChevronRight, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, Eye, 
  Download, Printer, X, Info, ArrowLeft,
  TrendingUp, UserCircle, LogOut, Moon, Sun,
  Smile, Meh, Frown, History, Lightbulb, Loader2, Zap,
  Calendar, ClipboardCheck
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  PsychPatient, PsychInitialAssessment, PsychEvolution, 
  PsychAppointment, PsychEmotionalMonitoring, PsychFamilyBond, 
  PsychActivity, PsychCognitionAssessment, PsychInterventionPlan,
  User as UserType, Elderly,
  NursingEvolution, PhysioEvolution, PedagogyEvolution, SocialEvolution, NutritionEvolution, Workshop, AppNotification, Professional
} from '../types';
import { ProductivitySection } from './ProductivitySection';
import { Award } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn, safeReplace } from '../lib/utils';
import { generateModernPDF, generateMultiSectionPDF } from '../lib/pdfUtils';
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
import { MultiPatientSelector } from './MultiPatientSelector';

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
  sendNotification?: any;
}

type PsychTab = 
  | 'dashboard' | 'patients' | 'initial' 
  | 'evolution' | 'appointments' | 'emotions' 
  | 'activities' | 'cognition' 
  | 'alerts' | 'productivity' | 'reports' | 'settings';

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
    'evolutions', 'emotions', 'initial', 'activities', 'cognition', 'plans', 'appointments'
  ]);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string, type: 'patient' | 'initial' | 'evolution' | 'appointment' | 'emotion' | 'family' | 'activity' | 'cognition' | 'plan' } | null>(null);
  const [viewingEvo, setViewingEvo] = useState<PsychEvolution | null>(null);
  const [viewingAct, setViewingAct] = useState<PsychActivity | null>(null);

  useEffect(() => {
    localStorage.setItem('oami-psychology-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (props.defaultTab) {
      setActiveTab(props.defaultTab as any);
    }
  }, [props.defaultTab]);

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

    // Filter Evolutions
    const filteredEvolutions = (evolutions || []).filter(e => {
      const matchPatient = !reportsPatientFilter || e.patientId === reportsPatientFilter || e.patientIds?.includes(reportsPatientFilter);
      return matchPatient && isDateInSelectedRange(e.date);
    });

    // Filter Emotions
    const filteredEmotions = (emotionalMonitorings || []).filter(m => {
      const matchPatient = !reportsPatientFilter || m.patientId === reportsPatientFilter || m.patientIds?.includes(reportsPatientFilter);
      return matchPatient && isDateInSelectedRange(m.date);
    });

    // Filter Activities
    const filteredActivities = (activities || []).filter(a => {
      const matchPatient = !reportsPatientFilter || (a.participants || []).includes(reportsPatientFilter) || a.patientIds?.includes(reportsPatientFilter);
      return matchPatient && isDateInSelectedRange(a.date);
    });

    // Filter Cognition
    const filteredCognitions = (cognitionAssessments || []).filter(c => {
      const matchPatient = !reportsPatientFilter || c.patientId === reportsPatientFilter || c.patientIds?.includes(reportsPatientFilter);
      return matchPatient && isDateInSelectedRange(c.date);
    });

    // Filter Initial Assessments (Avaliação Inicial)
    const filteredInitialAssessments = (initialAssessments || []).filter(a => {
      const matchPatient = !reportsPatientFilter || a.patientId === reportsPatientFilter;
      return matchPatient && isDateInSelectedRange(a.date);
    });

    // Filter Appointments
    const filteredAppointments = (appointments || []).filter(ap => {
      const matchPatient = !reportsPatientFilter || ap.patientId === reportsPatientFilter || ap.patientIds?.includes(reportsPatientFilter);
      return matchPatient && isDateInSelectedRange(ap.date);
    });

    // Filter Plans
    const filteredPlans = (interventionPlans || []).filter(ip => {
      const matchPatient = !reportsPatientFilter || ip.patientId === reportsPatientFilter || ip.patientIds?.includes(reportsPatientFilter);
      return matchPatient && isDateInSelectedRange(ip.date);
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
        
      return `Área: Psicologia | ${patientName} | Cronograma: ${period}`;
    };

    const handleGenerateIntegratedReport = async (formatType: 'pdf' | 'word') => {
      const sections = [];
      const subtitleText = getSubtitleText();

      if (reportSelectedSections.includes('evolutions') && filteredEvolutions.length > 0) {
        const columns = reportsPatientFilter 
          ? ['Data/Hora', 'Evolução / Observação', 'Conduta / Intervenção', 'Responsável']
          : ['Data', 'Idoso', 'Evolução / Observação', 'Conduta / Intervenção', 'Responsável'];
          
        const data = filteredEvolutions.map(e => {
          const p = (patients || []).find(pt => pt.id === e.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(e.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [`${dtFmt} às ${e.time || '--:--'}`, e.observation, e.intervention, e.registeredBy || 'N/A']
            : [dtFmt, name || 'Geral', e.observation, e.intervention, e.registeredBy || 'N/A'];
        });
        
        sections.push({ title: 'Evoluções Psicológicas', columns, data });
      }

      if (reportSelectedSections.includes('emotions') && filteredEmotions.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Estado Geral', 'Nível Tristeza / Ansiedade', 'Nível Solidão / Irritabilidade', 'Observações']
          : ['Data', 'Idoso', 'Estado Geral', 'Tristeza / Ansiedade', 'Solidão / Irritabilidade', 'Observações'];
          
        const data = filteredEmotions.map(m => {
          const p = (patients || []).find(pt => pt.id === m.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(m.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [dtFmt, m.wellBeing || 'NEUTRO', `Tristeza: ${m.sadness || 'NENHUM'}\nAnsiedade: ${m.anxiety || 'NENHUM'}`, `Solidão: ${m.loneliness || 'NENHUM'}\nIrritabilidade: ${m.irritability || 'NENHUM'}`, m.observations || '-']
            : [dtFmt, name || 'Geral', m.wellBeing || 'NEUTRO', `Tristeza: ${m.sadness || 'NENHUM'} / Ansiedade: ${m.anxiety || 'NENHUM'}`, `Solidão: ${m.loneliness || 'NENHUM'} / Irritabilidade: ${m.irritability || 'NENHUM'}`, m.observations || '-'];
        });
        
        sections.push({ title: 'Acompanhamento Emocional', columns, data });
      }

      if (reportSelectedSections.includes('cognition') && filteredCognitions.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Memória', 'Atenção', 'Orientação Espacial/Temporal', 'Observações']
          : ['Data', 'Idoso', 'Memória', 'Atenção', 'Orientação Espacial/Temporal', 'Observações'];
          
        const data = filteredCognitions.map(c => {
          const p = (patients || []).find(pt => pt.id === c.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(c.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [dtFmt, c.memory || 'PRESERVADO', c.attention || 'PRESERVADO', c.orientation || 'ORIENTADO', c.observations || '-']
            : [dtFmt, name || 'Geral', c.memory || 'PRESERVADO', c.attention || 'PRESERVADO', c.orientation || 'ORIENTADO', c.observations || '-'];
        });
        
        sections.push({ title: 'Avaliação Cognitiva', columns, data });
      }

      if (reportSelectedSections.includes('activities') && filteredActivities.length > 0) {
        const columns = ['Data', 'Título da Oficina', 'Tipo', 'Descrição das Atividades', 'Participantes'];
        const data = filteredActivities.map(a => {
          const parts = (a.participants || []).map(pid => {
            const pt = (patients || []).find(p => p.id === pid);
            return pt?.elderlyId ? (elderly || []).find(ed => ed.id === pt.elderlyId)?.name : pt?.name;
          }).filter(Boolean).join(', ');
          const dtFmt = format(parseISO(a.date), 'dd/MM/yyyy');
          return [dtFmt, a.title, a.type, a.description, parts || 'Nenhum'];
        });
        
        sections.push({ title: 'Oficinas e Dinâmicas em Grupo', columns, data });
      }

      if (reportSelectedSections.includes('initial') && filteredInitialAssessments.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Estado Emocional', 'Cognição', 'Humor', 'Adaptação', 'Observações / Dados Detalhados']
          : ['Data', 'Idoso', 'Estado Emocional', 'Cognição', 'Humor', 'Adaptação', 'Observações / Dados Detalhados'];
          
        const data = filteredInitialAssessments.map((a: any) => {
          const p = (patients || []).find(pt => pt.id === a.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(a.date), 'dd/MM/yyyy');
          
          const linkedEmotion = (emotionalMonitorings || []).find((m: any) => m.patientId === a.patientId && m.date === a.date);
          const wellBeing = a.wellBeing || linkedEmotion?.wellBeing;
          const sadness = a.sadness || linkedEmotion?.sadness;
          const anxiety = a.anxiety || linkedEmotion?.anxiety;
          const loneliness = a.loneliness || linkedEmotion?.loneliness;
          const irritability = a.irritability || linkedEmotion?.irritability;
          
          const linkedCognition = (cognitionAssessments || []).find((c: any) => c.patientId === a.patientId && c.date === a.date);
          const memory = a.memory || linkedCognition?.memory;
          const attention = a.attention || linkedCognition?.attention;
          const orientation = a.orientation || linkedCognition?.orientation;
          const cognitionObservations = a.cognitionObservations || linkedCognition?.observations;

          let detailsStr = a.observations || '';
          if (wellBeing || sadness || anxiety || loneliness || irritability) {
            detailsStr += `\n\nMonitoramento Emocional:\n- Bem-estar: ${wellBeing || 'NEUTRO'}\n- Tristeza: ${sadness || 'NENHUM'}\n- Ansiedade: ${anxiety || 'NENHUM'}\n- Solidão: ${loneliness || 'NENHUM'}\n- Irritabilidade: ${irritability || 'NENHUM'}`;
          }
          if (memory || attention || orientation) {
            detailsStr += `\n\nAvaliação Cognitiva:\n- Memória: ${memory || 'PRESERVADO'}\n- Atenção: ${attention || 'PRESERVADO'}\n- Orientação: ${orientation || 'PRESERVADO'}`;
            if (cognitionObservations) {
              detailsStr += `\n- Obs. Cognição: ${cognitionObservations}`;
            }
          }

          return reportsPatientFilter
            ? [dtFmt, a.emotionalState || '-', a.cognition || '-', a.mood || '-', a.adaptationLevel || '-', detailsStr || '-']
            : [dtFmt, name || 'Geral', a.emotionalState || '-', a.cognition || '-', a.mood || '-', a.adaptationLevel || '-', detailsStr || '-'];
        });
        
        sections.push({ title: 'Avaliações Iniciais (com Cognição e Humor)', columns, data });
      }

      if (reportSelectedSections.includes('appointments') && filteredAppointments.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Horário', 'Tipo de Atendimento', 'Situação', 'Observações']
          : ['Data', 'Idoso', 'Tipo de Atendimento', 'Situação', 'Observações'];
          
        const data = filteredAppointments.map(ap => {
          const p = (patients || []).find(pt => pt.id === ap.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(ap.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [dtFmt, ap.time || '--:--', ap.type || 'INDIVIDUAL', ap.status || 'REALIZADO', ap.observations || '-']
            : [dtFmt, name || 'Geral', ap.type || 'INDIVIDUAL', ap.status || 'REALIZADO', ap.observations || '-'];
        });
        
        sections.push({ title: 'Prontuário de Consultas e Agendamentos', columns, data });
      }

      if (reportSelectedSections.includes('plans') && filteredPlans.length > 0) {
        const columns = reportsPatientFilter
          ? ['Data', 'Objetivos Planejados', 'Estratégias Clínicas', 'Acompanhamento Recorrente']
          : ['Data', 'Idoso', 'Objetivos Planejados', 'Estratégias Clínicas', 'Acompanhamento Recorrente'];
          
        const data = filteredPlans.map(ip => {
          const p = (patients || []).find(pt => pt.id === ip.patientId);
          const name = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId)?.name : p?.name;
          const dtFmt = format(parseISO(ip.date), 'dd/MM/yyyy');
          return reportsPatientFilter
            ? [dtFmt, ip.objectives, ip.strategies, ip.followUp]
            : [dtFmt, name || 'Geral', ip.objectives, ip.strategies, ip.followUp];
        });
        
        sections.push({ title: 'Planos de Intervenção Terapêutica', columns, data });
      }

      if (sections.length === 0) {
        showToast('Nenhum dado selecionado ou encontrado para o período e idoso especificados', 'error');
        return;
      }

      const docTitle = reportsPatientFilter 
        ? `Prontuário Psicológico - ${patients.find(p => p.id === reportsPatientFilter)?.name}`
        : 'Relatório Consolidado de Atividades (Psicologia)';

      if (formatType === 'pdf') {
        try {
          await generateMultiSectionPDF({
            title: docTitle,
            subtitle: subtitleText,
            sections,
            fileName: `relatorio_psicologia_${format(new Date(), 'yyyy-MM-dd')}`
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
            fileName: `relatorio_psicologia_doc`
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
      filteredEmotions.length === 0 && 
      filteredCognitions.length === 0 && 
      filteredActivities.length === 0 && 
      filteredInitialAssessments.length === 0 && 
      filteredAppointments.length === 0 && 
      filteredPlans.length === 0;

    return (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white uppercase tracking-tighter">
            Gerador Inteligente de Relatórios
          </h2>
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1 max-w-2xl">
            Gere relatórios técnicos integrados de psicologia para impressão oficial. Selecione múltiplos formatos de data, idosos e escolha quais módulos do sistema incluir no documento.
          </p>
        </div>

        {/* Filters Card Grid */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-850 shadow-sm space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* 1. Patient selection */}
            <div className="space-y-2">
              <label className="text-xs font-black uppercase tracking-wider text-gray-500 dark:text-gray-400 block ml-0.5">
                Idoso / Paciente
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
                  <option value="OUTRO">OUTROS (COMUNIDADE/CUIDADOR)</option>
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
              { id: 'evolutions', title: 'Evoluções Psicológicas', desc: 'Registros diários e semanais de terapia.', icon: ClipboardList, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', count: filteredEvolutions.length },
              { id: 'emotions', title: 'Aconchego Emocional', desc: 'Evolução de humor, tristeza, ansiedade.', icon: Smile, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/20', count: filteredEmotions.length },
              { id: 'cognition', title: 'Avaliação Cognitiva', desc: 'Preservação de memória, atenção e orientação.', icon: Brain, color: 'text-pink-500', bg: 'bg-pink-50 dark:bg-pink-950/20', count: filteredCognitions.length },
              { id: 'activities', title: 'Oficinas e Oficinas de Grupo', desc: 'Encontros, dinâmicas e interação social.', icon: Users, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/20', count: filteredActivities.length },
              { id: 'initial', title: 'Avaliação Inicial', desc: 'Avaliações de saúde mental, humor e cognição.', icon: ClipboardCheck, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-950/20', count: filteredInitialAssessments.length },
              { id: 'appointments', title: 'Consultas e Sessões', desc: 'Faltas, agendamentos e atendimentos realizados.', icon: Calendar, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-950/20', count: filteredAppointments.length },
              { id: 'plans', title: 'Planos de Intervenção', desc: 'Objetivos e estratégias terapêuticas estabelecidas.', icon: CheckCircle2, color: 'text-teal-500', bg: 'bg-teal-50 dark:bg-teal-950/20', count: filteredPlans.length },
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
                      if (s === 'emotions') return filteredEmotions.length > 0;
                      if (s === 'cognition') return filteredCognitions.length > 0;
                      if (s === 'activities') return filteredActivities.length > 0;
                      if (s === 'initial') return filteredInitialAssessments.length > 0;
                      if (s === 'appointments') return filteredAppointments.length > 0;
                      if (s === 'plans') return filteredPlans.length > 0;
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

  const stats = useMemo(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    const todayAppointments = (appointments || []).filter(a => a.date === today);
    const sadPatients = (emotionalMonitorings || []).filter(m => m.date === today && m.wellBeing === 'TRISTE').length;
    const isolatedPatients = (patients || []).filter(p => p.hasVisits === false).length;

    return {
      totalPatients: (patients || []).length,
      todayAppointments: todayAppointments.length,
      sadPatients,
      isolatedPatients
    };
  }, [patients, appointments, emotionalMonitorings]);

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

  const cognitionStats = useMemo(() => {
    const total = (cognitionAssessments || []).length;
    if (total === 0) return { memory: 100, attention: 100, orientation: 100 };
    const preservedMemory = (cognitionAssessments || []).filter(c => c.memory === 'PRESERVADO').length;
    const preservedAttention = (cognitionAssessments || []).filter(c => c.attention === 'PRESERVADO').length;
    const preservedOrientation = (cognitionAssessments || []).filter(c => c.orientation === 'PRESERVADO').length;
    return {
      memory: Math.round((preservedMemory / total) * 100),
      attention: Math.round((preservedAttention / total) * 100),
      orientation: Math.round((preservedOrientation / total) * 100),
    };
  }, [cognitionAssessments]);

  const alertDetails = useMemo(() => {
    // Latest emotional monitoring for each patient
    const latestEmotionsMap: Record<string, any> = {};
    (emotionalMonitorings || []).forEach(m => {
      if (!latestEmotionsMap[m.patientId] || m.date > latestEmotionsMap[m.patientId].date) {
        latestEmotionsMap[m.patientId] = m;
      }
    });
    
    const sadSeniors = (patients || []).filter(p => {
      const emo = latestEmotionsMap[p.id];
      return emo && emo.wellBeing === 'TRISTE';
    }).map(p => {
      const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
      return { id: p.id, name: linked?.name || p.name, date: latestEmotionsMap[p.id].date };
    });

    // Isolated patients
    const isolatedSeniors = (patients || []).filter(p => p.hasVisits === false).map(p => {
      const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
      return { id: p.id, name: linked?.name || p.name };
    });

    // Compromised cognition
    const latestCognitionMap: Record<string, any> = {};
    (cognitionAssessments || []).forEach(c => {
      if (!latestCognitionMap[c.patientId] || c.date > latestCognitionMap[c.patientId].date) {
        latestCognitionMap[c.patientId] = c;
      }
    });

    const compromisedSeniors = (patients || []).filter(p => {
      const cog = latestCognitionMap[p.id];
      return cog && (cog.memory === 'COMPROMETIDO' || cog.attention === 'COMPROMETIDO' || cog.orientation === 'COMPROMETIDO');
    }).map(p => {
      const cog = latestCognitionMap[p.id];
      const items: string[] = [];
      if (cog.memory === 'COMPROMETIDO') items.push('Memória');
      if (cog.attention === 'COMPROMETIDO') items.push('Atenção');
      if (cog.orientation === 'COMPROMETIDO') items.push('Orientação');
      const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
      return { id: p.id, name: linked?.name || p.name, fields: items.join(', '), date: cog.date };
    });

    return {
      sadSeniors,
      isolatedSeniors,
      compromisedSeniors
    };
  }, [patients, emotionalMonitorings, cognitionAssessments, elderly]);

  const renderDashboard = () => (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Welcome & Quick Action Hero Banner */}
      <div className="bg-gradient-to-br from-blue-600 via-indigo-600 to-indigo-700 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-1/4 -translate-y-1/4 w-80 h-80 bg-white/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute left-0 bottom-0 -translate-x-1/4 translate-y-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
        
        <div className="relative z-10">
          <div className="max-w-2xl">
            <span className="px-3 py-1 bg-white/20 text-xs font-black tracking-widest uppercase rounded-full backdrop-blur-md">
              Setor de Psicologia
            </span>
            <h2 className="text-2xl md:text-3xl font-black mt-3 tracking-tight">
              Olá, {user.name || 'Profissional'} 👋
            </h2>
            <p className="text-sm text-blue-100/90 font-medium mt-2 leading-relaxed">
              Bem-vindo ao painel unificado de saúde mental e cognitiva. Monitore indicadores de humor, gerencie consultas, registre as oficinas de estimulação e exporte relatórios integrados.
            </p>
          </div>
        </div>
      </div>

      {/* Grid of Interactive KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:border-blue-500/30 transition-all group cursor-pointer" onClick={() => setActiveTab('patients')}>
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Users size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Residentes</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">{stats.totalPatients}</p>
            </div>
          </div>
          <div className="text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:border-violet-500/30 transition-all group cursor-pointer" onClick={() => setActiveTab('initial')}>
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-violet-50 dark:bg-violet-950/30 text-violet-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Brain size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Avaliações Iniciais</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">{(initialAssessments || []).length}</p>
            </div>
          </div>
          <div className="text-violet-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:border-emerald-500/30 transition-all group cursor-pointer" onClick={() => setActiveTab('evolution')}>
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 rounded-2xl group-hover:scale-110 transition-transform">
              <ClipboardList size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Evoluções Ativas</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">{(evolutions || []).length}</p>
            </div>
          </div>
          <div className="text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={18} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between hover:border-amber-500/30 transition-all group cursor-pointer" onClick={() => setActiveTab('cognition')}>
          <div className="flex items-center gap-4">
            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-2xl group-hover:scale-110 transition-transform">
              <Activity size={22} />
            </div>
            <div>
              <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-widest">Avaliações Cognitivas</p>
              <p className="text-2xl font-black text-gray-800 dark:text-white mt-0.5">{(cognitionAssessments || []).length}</p>
            </div>
          </div>
          <div className="text-amber-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ChevronRight size={18} />
          </div>
        </div>
      </div>

      {/* Main Grid: Bento Style (2:1 Columns) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Span (2 Columns) - Clinical Modules */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Card 1: Avaliações Iniciais de Saúde Mental */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <ClipboardCheck className="text-violet-600" size={22} />
                  Avaliações Iniciais de Saúde Mental
                </h3>
                <p className="text-xs text-gray-400 mt-1">Análise psicossocial e de adaptação dos idosos recém-ingressados.</p>
              </div>
              <button 
                onClick={() => setActiveTab('initial')}
                className="text-xs text-violet-600 dark:text-violet-400 font-extrabold hover:underline"
              >
                Ver Todas
              </button>
            </div>

            <div className="space-y-4">
              {(initialAssessments || [])
                .slice(-3)
                .reverse()
                .map((assessment: any) => {
                  const patient = (patients || []).find(p => p.id === assessment.patientId);
                  const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                  const displayName = linked?.name || patient?.name || assessment.patientId;
                  
                  return (
                    <div key={assessment.id} className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800/60 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200">{displayName}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            Realizada em {format(parseISO(assessment.date), 'dd/MM/yyyy')} por {assessment.registeredBy || 'Psicólogo'}
                          </p>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          <span className="px-2.5 py-0.5 bg-pink-50 dark:bg-pink-950/30 text-pink-600 dark:text-pink-400 text-[10px] font-black rounded-full uppercase">
                            Humor: {assessment.mood || '-'}
                          </span>
                          <span className={cn(
                            "px-2.5 py-0.5 text-[10px] font-black rounded-full uppercase",
                            assessment.cognition === 'ORIENTADO' 
                              ? "bg-green-50 dark:bg-green-950/30 text-green-600 dark:text-green-400" 
                              : "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400"
                          )}>
                            Cognição: {assessment.cognition || '-'}
                          </span>
                          <span className="px-2.5 py-0.5 bg-blue-50 dark:bg-blue-950/30 text-blue-600 dark:text-blue-400 text-[10px] font-black rounded-full uppercase">
                            Estado: {assessment.emotionalState || '-'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-2.5 bg-white dark:bg-gray-900/60 p-2.5 rounded-xl border border-gray-100 dark:border-gray-800/40 line-clamp-2 italic leading-relaxed">
                        " {assessment.observations || 'Nenhuma observação descrita.'} "
                      </p>
                    </div>
                  );
                })}
              {(initialAssessments || []).length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-gray-400 text-xs italic">Nenhuma avaliação inicial cadastrada.</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Evoluções Clínicas Recentes */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <ClipboardList className="text-emerald-600" size={22} />
                  Últimas Evoluções Clínicas
                </h3>
                <p className="text-xs text-gray-400 mt-1">Acompanhamento contínuo dos atendimentos individuais e oficinas cognitivas.</p>
              </div>
              <button 
                onClick={() => setActiveTab('evolution')}
                className="text-xs text-emerald-600 dark:text-emerald-400 font-extrabold hover:underline"
              >
                Ver Todas
              </button>
            </div>

            <div className="space-y-4">
              {(evolutions || [])
                .slice(-3)
                .reverse()
                .map((evo: any) => {
                  const isMultiPatient = evo.patientIds && evo.patientIds.length > 1;
                  const patient = (patients || []).find(p => p.id === evo.patientId);
                  const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                  const displayName = isMultiPatient 
                    ? "Evolução em Grupo"
                    : (linked?.name || patient?.name || evo.patientId);
                  
                  return (
                    <div key={evo.id} className="p-4 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800/60 rounded-2xl hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-all">
                      <div className="flex justify-between items-start flex-wrap gap-2">
                        <div>
                          <p className="text-sm font-extrabold text-gray-800 dark:text-gray-200">{displayName}</p>
                          <p className="text-[10px] text-gray-400 font-medium mt-0.5">
                            Data: {format(parseISO(evo.date), 'dd/MM/yyyy')} às {evo.time || 'N/A'} • Psicólogo: {evo.registeredBy || 'Clínico'}
                          </p>
                          {isMultiPatient && (
                            <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                              <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Idosos:</span>
                              {evo.patientIds.map((pid: string) => {
                                const p = (patients || []).find(pat => pat.id === pid);
                                const l = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId) : null;
                                return (
                                  <span key={pid} className="px-2 py-0.5 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400 text-[10px] rounded-lg font-bold shadow-xs">
                                    {l?.name || p?.name || 'N/A'}
                                  </span>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                        <div className="bg-white dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800/40">
                          <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">Comportamento & Observação</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-3 leading-relaxed">
                            {evo.observation || 'Não informado'}
                          </p>
                        </div>
                        <div className="bg-white dark:bg-gray-900/60 p-3 rounded-xl border border-gray-100 dark:border-gray-800/40">
                          <span className="text-[9px] font-black text-emerald-600 uppercase tracking-widest">Conduta & Intervenção</span>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-3 leading-relaxed">
                            {evo.intervention || 'Não informado'}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              {(evolutions || []).length === 0 && (
                <div className="text-center py-8 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                  <p className="text-gray-400 text-xs italic">Nenhuma evolução clínica registrada.</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 3: Cognição e Preservação Mental */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-5 border-b border-gray-100 dark:border-gray-800/80 pb-4">
              <div>
                <h3 className="text-lg font-black text-gray-800 dark:text-white flex items-center gap-2">
                  <Activity className="text-amber-500" size={22} />
                  Saúde Cognitiva & Rastreamento
                </h3>
                <p className="text-xs text-gray-400 mt-1">Acompanhamento de preservação cognitiva e exercícios de neuroestimulação.</p>
              </div>
              <button 
                onClick={() => setActiveTab('cognition')}
                className="text-xs text-amber-600 dark:text-amber-400 font-extrabold hover:underline"
              >
                Ver Todas
              </button>
            </div>

            {/* Circular preservation meters & Progress counters */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
              <div className="p-4 bg-blue-50/40 dark:bg-blue-950/10 rounded-2xl border border-blue-100/30">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-blue-800 dark:text-blue-300">Memória Preservada</span>
                  <span className="text-xs font-extrabold text-blue-600">{cognitionStats.memory}%</span>
                </div>
                <div className="w-full bg-gray-200/60 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${cognitionStats.memory}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Capacidade de resgate de fatos e eventos recentes.</p>
              </div>
              
              <div className="p-4 bg-emerald-50/40 dark:bg-emerald-950/10 rounded-2xl border border-emerald-100/30">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-emerald-800 dark:text-emerald-300">Atenção Preservada</span>
                  <span className="text-xs font-extrabold text-emerald-600">{cognitionStats.attention}%</span>
                </div>
                <div className="w-full bg-gray-200/60 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full transition-all" style={{ width: `${cognitionStats.attention}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Foco contínuo e habilidade de processamento.</p>
              </div>

              <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/10 rounded-2xl border border-indigo-100/30">
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-xs font-black text-indigo-800 dark:text-indigo-300">Orientação Preservada</span>
                  <span className="text-xs font-extrabold text-indigo-600">{cognitionStats.orientation}%</span>
                </div>
                <div className="w-full bg-gray-200/60 dark:bg-gray-800 h-2.5 rounded-full overflow-hidden">
                  <div className="bg-indigo-500 h-full rounded-full transition-all" style={{ width: `${cognitionStats.orientation}%` }} />
                </div>
                <p className="text-[10px] text-gray-400 mt-1">Reconhecimento espacial, temporal e pessoal.</p>
              </div>
            </div>

            {/* List of 3 recent cognition assessments */}
            <div className="space-y-3">
              <p className="text-xs font-extrabold text-gray-400 uppercase tracking-widest">Testes Cognitivos Recentes</p>
              {(cognitionAssessments || [])
                .slice(-3)
                .reverse()
                .map((cog: any) => {
                  const patient = (patients || []).find(p => p.id === cog.patientId);
                  const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                  const displayName = linked?.name || patient?.name || cog.patientId;
                  
                  return (
                    <div key={cog.id} className="p-3.5 bg-gray-50/30 dark:bg-gray-800/10 border border-gray-100 dark:border-gray-800/50 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-3">
                      <div>
                        <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200">{displayName}</p>
                        <p className="text-[10px] text-gray-400">Data do Rastreio: {format(parseISO(cog.date), 'dd/MM/yyyy')}</p>
                      </div>
                      <div className="flex gap-2">
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black rounded-lg uppercase",
                          cog.memory === 'PRESERVADO' ? "bg-green-50 text-green-600 border border-green-200/40" : "bg-red-50 text-red-600 border border-red-200/40"
                        )}>
                          Memória: {cog.memory}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black rounded-lg uppercase",
                          cog.attention === 'PRESERVADO' ? "bg-green-50 text-green-600 border border-green-200/40" : "bg-red-50 text-red-600 border border-red-200/40"
                        )}>
                          Atenção: {cog.attention}
                        </span>
                        <span className={cn(
                          "px-2 py-0.5 text-[9px] font-black rounded-lg uppercase",
                          cog.orientation === 'PRESERVADO' ? "bg-green-50 text-green-600 border border-green-200/40" : "bg-red-50 text-red-600 border border-red-200/40"
                        )}>
                          Orientação: {cog.orientation}
                        </span>
                      </div>
                    </div>
                  );
                })}
              {(cognitionAssessments || []).length === 0 && (
                <div className="text-center py-4 text-gray-400 text-xs italic">Nenhum teste de cognição cadastrado.</div>
              )}
            </div>
          </div>

        </div>

        {/* Right Span (1 Column) - Alerts, Workshops & Agenda */}
        <div className="space-y-6">
          
          {/* Card 4: Alertas e Vulnerabilidade Clínica */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 mb-4">
              <AlertCircle className="text-red-600" size={22} />
              <h3 className="text-base font-black text-gray-800 dark:text-white">
                Alertas e Pontos de Atenção
              </h3>
            </div>
            
            <div className="space-y-4">
              {/* Sad Patients list details */}
              {alertDetails.sadSeniors.length > 0 && (
                <div className="p-4 bg-red-50/50 dark:bg-red-950/10 rounded-2xl border border-red-100 dark:border-red-900/20">
                  <div className="flex gap-2 text-red-600">
                    <Frown className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Tristeza e Desânimo</p>
                      <p className="text-[11px] text-red-700 dark:text-red-300 mt-1">Identificada tristeza recente no monitoramento emocional:</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {alertDetails.sadSeniors.map(sen => (
                      <span key={sen.id} className="text-[10px] font-extrabold px-2.5 py-1 bg-red-100/50 dark:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg">
                        {sen.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Cognitive Alert details */}
              {alertDetails.compromisedSeniors.length > 0 && (
                <div className="p-4 bg-orange-50/50 dark:bg-orange-950/10 rounded-2xl border border-orange-100 dark:border-orange-900/20">
                  <div className="flex gap-2 text-orange-600">
                    <Brain className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Comprometimento Cognitivo</p>
                      <p className="text-[11px] text-orange-700 dark:text-orange-300 mt-1">Sinais detectados nos rastreios cognitivos recentes:</p>
                    </div>
                  </div>
                  <div className="mt-2.5 space-y-1.5">
                    {alertDetails.compromisedSeniors.map(sen => (
                      <div key={sen.id} className="text-[10px] font-bold text-orange-900 dark:text-orange-200">
                        • <span className="font-extrabold">{sen.name}</span>: {sen.fields}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Isolated residents list details */}
              {alertDetails.isolatedSeniors.length > 0 && (
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/10 rounded-2xl border border-amber-100 dark:border-amber-900/20">
                  <div className="flex gap-2 text-amber-600">
                    <Users className="shrink-0 mt-0.5" size={18} />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider">Isolamento Social</p>
                      <p className="text-[11px] text-amber-700 dark:text-amber-300 mt-1">Residentes com ausência ou baixo fluxo de visitas familiares:</p>
                    </div>
                  </div>
                  <div className="mt-2.5 flex flex-wrap gap-1.5">
                    {alertDetails.isolatedSeniors.map(sen => (
                      <span key={sen.id} className="text-[10px] font-extrabold px-2.5 py-1 bg-amber-100/50 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg">
                        {sen.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {alertDetails.sadSeniors.length === 0 && alertDetails.isolatedSeniors.length === 0 && alertDetails.compromisedSeniors.length === 0 && (
                <div className="flex flex-col items-center justify-center text-center py-8 bg-green-50/30 dark:bg-green-950/5 rounded-2xl border border-green-100/40">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-950 text-green-600 rounded-full flex items-center justify-center mb-2">
                    <CheckCircle2 size={22} />
                  </div>
                  <p className="text-xs font-extrabold text-green-800 dark:text-green-300">Residentes Estáveis</p>
                  <p className="text-[10px] text-gray-400 mt-1 max-w-[200px]">Nenhum sinal crítico de isolamento, desânimo ou declínio cognitivo agudo.</p>
                </div>
              )}
            </div>
          </div>

          {/* Card 5: Oficinas, Dinâmicas e Grupos */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Users2 className="text-indigo-600" size={18} />
                Oficinas de Reabilitação
              </h3>
              <button 
                onClick={() => { setEditingData(null); setModalType('activity'); setIsModalOpen(true); }}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-extrabold hover:underline"
              >
                + Registrar
              </button>
            </div>

            <div className="space-y-3">
              {(activities || []).slice(-2).reverse().map((act: any) => (
                <div key={act.id} className="p-3 bg-gray-50/50 dark:bg-gray-800/30 border border-gray-100 dark:border-gray-800 rounded-xl space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-extrabold text-indigo-950 dark:text-indigo-300">{act.title}</span>
                    <span className="text-[9px] font-bold text-gray-400 bg-gray-100 dark:bg-gray-800 px-1.5 py-0.5 rounded-full uppercase">
                      {act.type}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed">
                    {act.description}
                  </p>
                  <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                    <span>Participantes: {act.participants?.length || 0}</span>
                    <span>{format(parseISO(act.date), 'dd/MM/yyyy')}</span>
                  </div>
                </div>
              ))}
              {(activities || []).length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-4">Nenhuma oficina de grupo cadastrada.</p>
              )}
            </div>
          </div>

          {/* Card 6: Próximos Atendimentos Agenda */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-base font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Clock className="text-amber-600" size={18} />
                Agenda e Consultas
              </h3>
              <button 
                onClick={() => { setEditingData(null); setModalType('appointment'); setIsModalOpen(true); }}
                className="text-xs text-blue-600 font-bold hover:underline"
              >
                + Agendar
              </button>
            </div>

            <div className="space-y-2.5">
              {(appointments || [])
                .filter(a => a.status === 'PENDENTE')
                .slice(0, 3)
                .map(app => {
                  const patient = (patients || []).find(p => p.id === app.patientId);
                  const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                  const displayName = linked?.name || patient?.name || app.patientId;
                  
                  return (
                    <div key={app.id} className="flex items-center justify-between p-3 bg-gray-50/50 dark:bg-gray-800/20 border border-gray-100 dark:border-gray-800 rounded-xl hover:bg-gray-50 transition-all">
                      <div>
                        <p className="text-xs font-extrabold text-gray-800 dark:text-gray-200 leading-snug">{displayName}</p>
                        <p className="text-[10px] text-gray-400 font-medium">
                          {app.type} • <span className="font-extrabold text-blue-600">{app.time}</span>
                        </p>
                      </div>
                      <button 
                        onClick={() => {
                          setEditingData(app);
                          setModalType('appointment');
                          setIsModalOpen(true);
                        }}
                        className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black rounded-lg transition-colors cursor-pointer"
                      >
                        Iniciar
                      </button>
                    </div>
                  );
                })}
              {(appointments || []).filter(a => a.status === 'PENDENTE').length === 0 && (
                <p className="text-center text-xs text-gray-400 italic py-4">Nenhum atendimento individual pendente.</p>
              )}
            </div>
          </div>

          {/* Clincal wisdom card */}
          <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100/50 dark:border-indigo-900/30 rounded-3xl p-5 relative overflow-hidden">
            <div className="flex gap-3">
              <div className="p-2 bg-indigo-600 text-white rounded-xl shrink-0 h-9 w-9 flex items-center justify-center">
                <Lightbulb size={18} />
              </div>
              <div>
                <p className="text-xs font-extrabold text-indigo-900 dark:text-indigo-300 uppercase tracking-wider">Insight Clínico</p>
                <p className="text-xs text-indigo-700 dark:text-indigo-400/90 mt-1 leading-relaxed">
                  Estimular lembranças autobiográficas através de fotografias antigas e músicas da juventude fortalece a sensação de identidade e atenua sintomas de desorientação.
                </p>
              </div>
            </div>
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
          { id: 'cognition', label: 'Cognição', icon: Activity },
          { id: 'alerts', label: 'Alertas', icon: AlertCircle },
          { id: 'productivity', label: 'Painel e Colaboração', icon: Award },
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
                monitorings={emotionalMonitorings}
                cognitionAssessments={cognitionAssessments}
                filter={initialPatientFilter}
                setFilter={setInitialPatientFilter}
                onAdd={() => { setModalType('initial'); setIsModalOpen(true); }}
                onEdit={(a: any) => {
                  const linkedEmotion = (emotionalMonitorings || []).find((m: any) => m.patientId === a.patientId && m.date === a.date);
                  const linkedCognition = (cognitionAssessments || []).find((c: any) => c.patientId === a.patientId && c.date === a.date);
                  setEditingData({
                    ...a,
                    wellBeing: a.wellBeing || linkedEmotion?.wellBeing || 'NEUTRO',
                    sadness: a.sadness || linkedEmotion?.sadness || 'NENHUM',
                    anxiety: a.anxiety || linkedEmotion?.anxiety || 'NENHUM',
                    loneliness: a.loneliness || linkedEmotion?.loneliness || 'NENHUM',
                    irritability: a.irritability || linkedEmotion?.irritability || 'NENHUM',
                    memory: a.memory || linkedCognition?.memory || 'PRESERVADO',
                    attention: a.attention || linkedCognition?.attention || 'PRESERVADO',
                    orientation: a.orientation || linkedCognition?.orientation || 'PRESERVADO',
                    cognitionObservations: a.cognitionObservations || linkedCognition?.observations || ''
                  });
                  setModalType('initial');
                  setIsModalOpen(true);
                }}
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
                onView={setViewingEvo}
                showToast={showToast}
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
            {activeTab === 'productivity' && (
              <ProductivitySection
                user={props.user}
                professionals={professionals}
                nursingEvolutions={props.nursingEvolutions}
                physioEvolutions={props.physioEvolutions}
                psychEvolutions={evolutions}
                pedagogyEvolutions={props.pedagogyEvolutions}
                socialEvolutions={props.socialEvolutions}
                nutritionEvolutions={props.nutritionEvolutions}
                workshops={props.workshops}
                notifications={props.notifications}
                elderly={elderly}
                onDeleteNotification={async (id, e) => {
                  e.stopPropagation();
                  if (props.onDeleteNotification) {
                    props.onDeleteNotification(id, e);
                  }
                }}
                onSaveEvolution={props.onSaveCollaborationEvolution || (async () => {})}
                onDeleteEvolution={props.onDeleteCollaborationEvolution || (async () => {})}
                showToast={showToast}
                targetSector="Psicologia"
                targetRole="PSICOLOGA"
                psychActivities={props.psychActivities}
                pedagogyActivities={props.pedagogyActivities}
                onViewActivity={props.onViewActivity}
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
                <div className="flex items-center gap-2 text-blue-600">
                  <Brain size={24} />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detalhes da Evolução Psicológica</h3>
                </div>
                <button onClick={() => setViewingEvo(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Paciente</span>
                  <p className="text-base font-bold text-gray-800 dark:text-white">
                    {viewingEvo.patientId === 'OUTRO' 
                      ? `${viewingEvo.targetName || 'Outro'} (${viewingEvo.targetType?.replace('_', ' ') || 'Comunidade'})`
                      : viewingEvo.patientId === 'GERAL'
                        ? 'Geral'
                        : ((patients || []).find(p => p.id === viewingEvo.patientId)?.name || 'N/A')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data / Horário</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingEvo.date} às {viewingEvo.time}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Registrado Por</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingEvo.registeredBy || 'Psicólogo'}
                    </p>
                  </div>
                </div>

                {viewingEvo.reason && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Motivo do Atendimento</span>
                    <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                      {viewingEvo.reason}
                    </p>
                  </div>
                )}

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Observação Clínica</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingEvo.observation}
                  </p>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Conduta / Intervenção</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingEvo.intervention}
                  </p>
                </div>

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
                  className="px-6 py-2.5 bg-blue-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-blue-700 transition"
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
                <div className="flex items-center gap-2 text-indigo-600">
                  <Activity size={24} />
                  <h3 className="text-xl font-bold text-gray-800 dark:text-white">Detalhes da Atividade Psicossocial</h3>
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
                    <span className="text-[10px] font-black uppercase text-gray-400">Tipo de Atividade</span>
                    <p className="text-sm font-bold text-indigo-600">
                      {viewingAct.type}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingAct.date}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Registrado Por</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingAct.registeredBy || 'Psicólogo'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Descrição</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingAct.description}
                  </p>
                </div>

                {viewingAct.participants && viewingAct.participants.length > 0 && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 block mb-1">Participantes</span>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingAct.participants.map(pid => {
                        const p = (patients || []).find((pt: any) => pt.id === pid);
                        const linked = p?.elderlyId ? (elderly || []).find((ed: any) => ed.id === p.elderlyId) : null;
                        return (
                          <span key={pid} className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 rounded-lg text-xs text-gray-700 dark:text-gray-300 font-medium border border-gray-200/50 dark:border-gray-750">
                            {linked?.name || p?.name || pid}
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
                  className="px-6 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-indigo-750 transition"
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

const EmotionIndicator = ({ label, level }: { label: string, level: string }) => {
  const getColorTheme = () => {
    switch (label.toLowerCase()) {
      case 'tristeza':
        return {
          activeColor: 'bg-blue-500 dark:bg-blue-400',
          textColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/25',
          borderColor: 'border-blue-100 dark:border-blue-900/40'
        };
      case 'ansiedade':
        return {
          activeColor: 'bg-amber-500 dark:bg-amber-400',
          textColor: 'text-amber-600 dark:text-amber-400',
          bgColor: 'bg-amber-50 dark:bg-amber-950/25',
          borderColor: 'border-amber-100 dark:border-amber-900/40'
        };
      case 'solidão':
      case 'solidao':
        return {
          activeColor: 'bg-indigo-500 dark:bg-indigo-400',
          textColor: 'text-indigo-600 dark:text-indigo-400',
          bgColor: 'bg-indigo-50 dark:bg-indigo-950/25',
          borderColor: 'border-indigo-100 dark:border-indigo-900/40'
        };
      case 'irritabilidade':
        return {
          activeColor: 'bg-red-500 dark:bg-red-400',
          textColor: 'text-red-600 dark:text-red-400',
          bgColor: 'bg-red-50 dark:bg-red-950/25',
          borderColor: 'border-red-100 dark:border-red-900/40'
        };
      default:
        return {
          activeColor: 'bg-blue-500 dark:bg-blue-400',
          textColor: 'text-blue-600 dark:text-blue-400',
          bgColor: 'bg-blue-50 dark:bg-blue-950/25',
          borderColor: 'border-blue-100 dark:border-blue-900/40'
        };
    }
  };

  const theme = getColorTheme();
  const activeCount = 
    level === 'LEVE' ? 1 : 
    level === 'MODERADO' ? 2 : 
    level === 'INTENSO' ? 3 : 0;

  return (
    <div className={cn(
      "p-3 rounded-2xl border transition-all flex flex-col justify-between h-full min-h-[76px]",
      activeCount > 0 ? `${theme.bgColor} ${theme.borderColor}` : "bg-gray-50 dark:bg-gray-800/30 border-transparent"
    )}>
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
        {activeCount > 0 && (
          <span className={cn("text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase", theme.textColor, theme.bgColor)}>
            {level}
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3].map(i => {
            const isActive = i <= activeCount;
            return (
              <div 
                key={i} 
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-all",
                  isActive ? theme.activeColor : "bg-gray-200/50 dark:bg-gray-800/80"
                )}
              />
            );
          })}
        </div>
        {activeCount === 0 && (
          <p className="text-[9px] text-right font-medium text-gray-400 dark:text-gray-500">Nenhum</p>
        )}
      </div>
    </div>
  );
};

const CognitionIndicator = ({ label, status }: { label: string, status: string }) => {
  const isPreserved = status === 'PRESERVADO';
  return (
    <div className={cn(
      "p-3 rounded-2xl border transition-all flex flex-col justify-between h-full min-h-[76px]",
      isPreserved 
        ? "bg-green-50/50 dark:bg-green-950/10 border-green-100/40 dark:border-green-900/20" 
        : "bg-red-50/50 dark:bg-red-950/10 border-red-100/40 dark:border-red-900/20"
    )}>
      <div className="flex justify-between items-center mb-1.5">
        <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{label}</p>
        <span className={cn(
          "text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase",
          isPreserved ? "text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-950/20" : "text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-950/20"
        )}>
          {status || 'PRESERVADO'}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
        <div className={cn(
          "w-2 h-2 rounded-full",
          isPreserved ? "bg-green-500" : "bg-red-500"
        )} />
        <p className="text-[10px] text-gray-500 dark:text-gray-400 font-medium">
          {isPreserved ? 'Preservado' : 'Comprometido'}
        </p>
      </div>
    </div>
  );
};

const InitialAssessmentView = ({ patients, elderly, assessments, monitorings, cognitionAssessments, onAdd, onEdit, onDelete, filter, setFilter }: any) => (
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
      {(assessments || []).filter((a: any) => !filter || a.patientId === filter).map((a: PsychInitialAssessment & { targetName?: string, targetType?: string, wellBeing?: string, sadness?: string, anxiety?: string, loneliness?: string, irritability?: string, memory?: string, attention?: string, orientation?: string, cognitionObservations?: string }) => {
        const patient = (patients || []).find((p: any) => p.id === a.patientId);
        const linked = patient?.elderlyId ? (elderly || []).find((e: any) => e.id === patient.elderlyId) : null;
        const displayName = a.patientId === 'OUTRO' 
          ? `${a.targetName || 'Outro'} (${a.targetType?.replace('_', ' ') || 'Comunidade'})`
          : (linked?.name || patient?.name);

        const linkedEmotion = (monitorings || []).find((m: any) => m.patientId === a.patientId && m.date === a.date);
        const wellBeing = a.wellBeing || linkedEmotion?.wellBeing;
        const sadness = a.sadness || linkedEmotion?.sadness;
        const anxiety = a.anxiety || linkedEmotion?.anxiety;
        const loneliness = a.loneliness || linkedEmotion?.loneliness;
        const irritability = a.irritability || linkedEmotion?.irritability;

        const linkedCognition = (cognitionAssessments || []).find((c: any) => c.patientId === a.patientId && c.date === a.date);
        const memory = a.memory || linkedCognition?.memory;
        const attention = a.attention || linkedCognition?.attention;
        const orientation = a.orientation || linkedCognition?.orientation;
        const cognitionObservations = a.cognitionObservations || linkedCognition?.observations;

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
              <div className="p-3 bg-pink-50/40 dark:bg-pink-950/10 border border-pink-100/40 dark:border-pink-900/10 rounded-2xl">
                <p className="text-pink-600 dark:text-pink-400 uppercase font-bold text-[10px] tracking-wider mb-0.5">Estado Emocional</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{a.emotionalState}</p>
              </div>
              <div className="p-3 bg-red-50/40 dark:bg-red-950/10 border border-red-100/40 dark:border-red-900/10 rounded-2xl">
                <p className="text-red-600 dark:text-red-400 uppercase font-bold text-[10px] tracking-wider mb-0.5">Cognição</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{a.cognition}</p>
              </div>
              <div className="p-3 bg-green-50/40 dark:bg-green-950/10 border border-green-100/40 dark:border-green-900/10 rounded-2xl">
                <p className="text-green-600 dark:text-green-400 uppercase font-bold text-[10px] tracking-wider mb-0.5">Humor</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{a.mood}</p>
              </div>
              <div className="p-3 bg-purple-50/40 dark:bg-purple-950/10 border border-purple-100/40 dark:border-purple-900/10 rounded-2xl">
                <p className="text-purple-600 dark:text-purple-400 uppercase font-bold text-[10px] tracking-wider mb-0.5">Adaptação</p>
                <p className="font-semibold text-gray-800 dark:text-gray-200">{a.adaptationLevel}</p>
              </div>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">{a.observations}</p>

            {wellBeing && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/60 space-y-3">
                <div className="flex items-center gap-2">
                  <div className={cn(
                    "p-1.5 rounded-lg",
                    wellBeing === 'FELIZ' ? "bg-green-100 text-green-600" :
                    wellBeing === 'NEUTRO' ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
                  )}>
                    {wellBeing === 'FELIZ' ? <Smile size={14} /> : wellBeing === 'NEUTRO' ? <Meh size={14} /> : <Frown size={14} />}
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase">Aconchego Emocional ({wellBeing})</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <EmotionIndicator label="Tristeza" level={sadness || 'NENHUM'} />
                  <EmotionIndicator label="Ansiedade" level={anxiety || 'NENHUM'} />
                  <EmotionIndicator label="Solidão" level={loneliness || 'NENHUM'} />
                  <EmotionIndicator label="Irritabilidade" level={irritability || 'NENHUM'} />
                </div>
              </div>
            )}

            {memory && (
              <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700/60 space-y-3">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 bg-blue-100 text-blue-600 rounded-lg">
                    <Brain size={14} />
                  </div>
                  <span className="text-xs font-bold text-gray-500 uppercase">Avaliação Cognitiva</span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <CognitionIndicator label="Memória" status={memory || 'PRESERVADO'} />
                  <CognitionIndicator label="Atenção" status={attention || 'PRESERVADO'} />
                  <CognitionIndicator label="Orientação" status={orientation || 'PRESERVADO'} />
                </div>
                {cognitionObservations && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 pl-1">
                    <span className="font-bold">Observações:</span> {cognitionObservations}
                  </p>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  </div>
);

const EvolutionView = ({ patients, elderly, evolutions, onAdd, onEdit, onDelete, onView, filter, setFilter, showToast }: any) => {
  const [selectedEvolutionIds, setSelectedEvolutionIds] = useState<string[]>([]);

  const toggleSelectEvolution = (id: string) => {
    setSelectedEvolutionIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const handleSelectAllEvolutions = (displayed: any[]) => {
    const allIds = displayed.map(e => e.id);
    const areAllSelected = allIds.every(id => selectedEvolutionIds.includes(id));
    if (areAllSelected) {
      setSelectedEvolutionIds(prev => prev.filter(id => !allIds.includes(id)));
    } else {
      setSelectedEvolutionIds(prev => Array.from(new Set([...prev, ...allIds])));
    }
  };

  const handleDownloadSelectedEvolutions = async () => {
    if (selectedEvolutionIds.length === 0) {
      showToast('Selecione ao menos uma evolução para baixar/imprimir', 'error');
      return;
    }
    const filtered = (evolutions || []).filter((e: any) => selectedEvolutionIds.includes(e.id));
    filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const data = filtered.map(evo => {
      const patient = (patients || []).find((p: any) => p.id === evo.patientId);
      const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
      const name = evo.patientId === 'OUTRO' 
        ? `${evo.targetName || 'Outro'} (${evo.targetType?.replace('_', ' ') || 'Comunidade'})`
        : evo.patientId === 'GERAL'
          ? 'Geral'
          : (linked?.name || patient?.name || 'N/A');

      return [
        `${evo.date} ${evo.time}`,
        name,
        evo.observation,
        evo.intervention
      ];
    });

    await generateModernPDF({
      title: 'Evoluções Psicológicas Selecionadas',
      subtitle: `Documento gerado em ${format(new Date(), 'dd/MM/yyyy HH:mm')} - Total: ${filtered.length} registros`,
      columns: ['Data/Hora', 'Paciente/Destinatário', 'Observação', 'Intervenção/Conduta'],
      data,
      fileName: `evolucoes_psicologia_selecionadas_${new Date().getTime()}`,
      orientation: 'portrait'
    });
  };

  const displayedEvolutions = (evolutions || []).filter((e: any) => !filter || e.patientId === filter || e.patientIds?.includes(filter));
  const allSelected = displayedEvolutions.length > 0 && displayedEvolutions.every(e => selectedEvolutionIds.includes(e.id));
  const someSelected = displayedEvolutions.some(e => selectedEvolutionIds.includes(e.id));

  return (
    <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
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
            <option value="GERAL">Geral</option>
          </select>
        </div>
        <button onClick={onAdd} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold">
          <Plus size={18} /> Nova Evolução
        </button>
      </div>

      {/* Barra de Seleção em Lote */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <input 
            type="checkbox"
            checked={allSelected}
            ref={el => {
              if (el) {
                el.indeterminate = someSelected && !allSelected;
              }
            }}
            onChange={() => handleSelectAllEvolutions(displayedEvolutions)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"
          />
          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
            {selectedEvolutionIds.length === 0 
              ? 'Nenhuma evolução selecionada' 
              : `${selectedEvolutionIds.length} evolução(ões) selecionada(s)`}
          </span>
        </div>
        {selectedEvolutionIds.length > 0 && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSelectedEvolutionIds([])}
              className="text-xs font-bold text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 px-3 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            >
              Limpar Seleção
            </button>
            <button
              onClick={handleDownloadSelectedEvolutions}
              className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-green-700 transition-colors shadow-md"
            >
              <Printer size={14} />
              Imprimir Selecionadas
            </button>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {displayedEvolutions.map((e: PsychEvolution | any) => {
          const isMultiPatient = e.patientIds && e.patientIds.length > 1;
          const patient = (patients || []).find((p: any) => p.id === e.patientId);
          const linked = patient?.elderlyId ? (elderly || []).find((ed: any) => ed.id === patient.elderlyId) : null;
          const displayName = e.patientId === 'OUTRO' 
            ? `${e.targetName || 'Outro'} (${e.targetType?.replace('_', ' ') || 'Comunidade'})`
            : e.patientId === 'GERAL'
              ? 'Geral'
              : isMultiPatient 
                ? "Evolução em Grupo"
                : (linked?.name || patient?.name || 'N/A');
          const isSelected = selectedEvolutionIds.includes(e.id);

          return (
            <div key={e.id} className="relative pl-8 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-px before:bg-gray-100 dark:before:bg-gray-800 flex gap-4 items-start">
              <div className="pt-1 shrink-0">
                <input 
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => toggleSelectEvolution(e.id)}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 cursor-pointer"
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="absolute left-[-4px] top-2 w-2 h-2 rounded-full bg-blue-600" />
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h4 className="font-bold text-gray-800 dark:text-white">{displayName}</h4>
                    <p className="text-xs text-gray-500">{e.date} às {e.time}</p>
                    {isMultiPatient && (
                      <div className="flex flex-wrap gap-1 mt-1.5 items-center">
                        <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Idosos:</span>
                        {e.patientIds.map((pid: string) => {
                          const p = (patients || []).find(pat => pat.id === pid);
                          const l = p?.elderlyId ? (elderly || []).find(ed => ed.id === p.elderlyId) : null;
                          return (
                            <span key={pid} className="px-1.5 py-0.5 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-800/80 text-gray-600 dark:text-gray-400 text-[10px] rounded font-bold shadow-2xs">
                              {l?.name || p?.name || 'N/A'}
                            </span>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => onView(e)} className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Visualizar 👁️"><Eye size={14} /></button>
                    <button onClick={() => onEdit(e)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar ✏️"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(e.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir 🗑️"><Trash2 size={14} /></button>
                  </div>
                </div>
                <div className="space-y-2">
                  <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-blue-600">Obs:</span> {e.observation}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400"><span className="font-bold text-green-600">Intervenção:</span> {e.intervention}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

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
            <th className="pb-4">Observações</th>
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
                <td className="py-4 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate" title={app.observations || ''}>
                  {app.observations || <span className="text-gray-300 italic">Sem observações</span>}
                </td>
                <td className="py-4">
                  <div className="flex gap-2">
                    <button onClick={() => onEdit(app)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar ✏️"><Edit2 size={14} /></button>
                    <button onClick={() => onDelete(app.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir 🗑️"><Trash2 size={14} /></button>
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

const ActivitiesView = ({ patients, elderly, activities, onAdd, onEdit, onDelete, onView, filter, setFilter, professionals = [] }: any) => (
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
                  <button onClick={() => onView(act)} className="p-1 text-green-600 hover:bg-green-50 rounded-md transition-colors" title="Visualizar 👁️"><Eye size={14} /></button>
                  <button onClick={() => onEdit(act)} className="p-1 text-blue-600 hover:bg-blue-50 rounded-md transition-colors" title="Editar ✏️"><Edit2 size={14} /></button>
                  <button onClick={() => onDelete(act.id)} className="p-1 text-red-600 hover:bg-red-50 rounded-md transition-colors" title="Excluir 🗑️"><Trash2 size={14} /></button>
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
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>(editingData?.patientId ? [editingData.patientId] : []);
  const [isMulti, setIsMulti] = useState(false);

  // Sync formData when editingData changes or when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setFormData(editingData || {
        date: format(new Date(), 'yyyy-MM-dd'),
        time: format(new Date(), 'HH:mm'),
        photos: [],
        elderlyId: editingData?.elderlyId || '',
        coWorkers: editingData?.coWorkers || [],
        ...(type === 'initial' ? {
          wellBeing: 'NEUTRO',
          sadness: 'NENHUM',
          anxiety: 'NENHUM',
          loneliness: 'NENHUM',
          irritability: 'NENHUM',
          memory: 'PRESERVADO',
          attention: 'PRESERVADO',
          orientation: 'PRESERVADO',
          cognitionObservations: ''
        } : {})
      });
      setProfSearch('');
      setSelectedPatientIds(editingData?.patientId ? [editingData.patientId] : []);
      setIsMulti(false);
    }
  }, [isOpen, editingData, type]);

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

      if (isMulti && selectedPatientIds.length > 0 && !editingData && type !== 'patient') {
        const primaryPid = selectedPatientIds[0];
        const currentData = { ...data, patientId: primaryPid, patientIds: selectedPatientIds };
        await onSave(currentData, editingData?.id);

        if (photos && photos.length > 0) {
          const patient = (patients || []).find((p: any) => p.id === primaryPid);
          const activityType = 
            type === 'evolution' ? 'Evolução Psicológica' :
            type === 'activity' ? 'Atividade Psicológica' : 'Atendimento Psicológico';
          
          await onSavePhotos(photos, primaryPid, patient?.name || 'Paciente', activityType, formData.observation || formData.description);
        }
      } else {
        if (!formData.patientId && type !== 'patient') {
          alert('Por favor, selecione pelo menos um idoso!');
          return;
        }

        await onSave(data, editingData?.id);

        if (photos && photos.length > 0 && formData.patientId) {
          const patient = (patients || []).find((p: any) => p.id === formData.patientId);
          const activityType = 
            type === 'evolution' ? 'Evolução Psicológica' :
            type === 'activity' ? 'Atividade Psicológica' : 'Atendimento Psicológico';
          
          await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.observation || formData.description);
        }
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
    { value: 'OUTRO', label: 'OUTRO (Comunidade / Cuidador)' },
    { value: 'GERAL', label: 'Geral' }
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
                <div className="animate-fade-in">
                  <MultiPatientSelector 
                    patients={patientOptions.map(p => ({ id: p.value, name: p.label }))}
                    selectedIds={selectedPatientIds}
                    onChange={setSelectedPatientIds}
                    singleValue={formData.patientId || ''}
                    onSingleChange={id => setFormData({ ...formData, patientId: id })}
                    isMulti={isMulti}
                    onToggleMulti={setIsMulti}
                    accentColor="blue"
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
                
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

                <div className="border-t border-gray-100 dark:border-gray-800/80 pt-6 space-y-6">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Aconchego Emocional (Emoção Vinculada)</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <Select label="Tristeza" value={formData.sadness || 'NENHUM'} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, sadness: v })} />
                    <Select label="Ansiedade" value={formData.anxiety || 'NENHUM'} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, anxiety: v })} />
                    <Select label="Solidão" value={formData.loneliness || 'NENHUM'} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, loneliness: v })} />
                    <Select label="Irritabilidade" value={formData.irritability || 'NENHUM'} options={[{value: 'NENHUM', label: 'Nenhum'}, {value: 'LEVE', label: 'Leve'}, {value: 'MODERADO', label: 'Moderado'}, {value: 'INTENSO', label: 'Intenso'}]} onChange={(v) => setFormData({ ...formData, irritability: v })} />
                  </div>
                  <Select label="Bem-estar Geral" value={formData.wellBeing || 'NEUTRO'} options={[{value: 'FELIZ', label: 'Feliz 😊'}, {value: 'NEUTRO', label: 'Neutro 😐'}, {value: 'TRISTE', label: 'Triste 😔'}]} onChange={(v) => setFormData({ ...formData, wellBeing: v })} />
                </div>

                <div className="border-t border-gray-100 dark:border-gray-800/80 pt-6 space-y-6">
                  <h4 className="text-sm font-bold text-gray-500 uppercase tracking-wider">Avaliação Cognitiva (Cognição Vinculada)</h4>
                  <div className="grid grid-cols-3 gap-6">
                    <Select label="Memória" value={formData.memory || 'PRESERVADO'} options={[{value: 'PRESERVADO', label: 'Preservado'}, {value: 'COMPROMETIDO', label: 'Comprometido'}]} onChange={(v) => setFormData({ ...formData, memory: v })} />
                    <Select label="Atenção" value={formData.attention || 'PRESERVADO'} options={[{value: 'PRESERVADO', label: 'Preservado'}, {value: 'COMPROMETIDO', label: 'Comprometido'}]} onChange={(v) => setFormData({ ...formData, attention: v })} />
                    <Select label="Orientação" value={formData.orientation || 'PRESERVADO'} options={[{value: 'PRESERVADO', label: 'Preservado'}, {value: 'COMPROMETIDO', label: 'Comprometido'}]} onChange={(v) => setFormData({ ...formData, orientation: v })} />
                  </div>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-400 uppercase">Observações da Cognição</label>
                      <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, cognitionObservations: (formData.cognitionObservations || '') + ' ' + t })} />
                    </div>
                    <textarea 
                      rows={3}
                      value={formData.cognitionObservations || ''}
                      onChange={(e) => setFormData({ ...formData, cognitionObservations: e.target.value })}
                      className="w-full px-4 py-3 bg-gray-50 dark:bg-gray-800 border border-transparent focus:border-blue-500 rounded-2xl outline-none transition-all resize-none text-sm" 
                    />
                  </div>
                </div>
              </div>
            )}

            {type === 'evolution' && (
              <div className="space-y-6">
                <div className="animate-fade-in">
                  <MultiPatientSelector 
                    patients={patientOptions.map(p => ({ id: p.value, name: p.label }))}
                    selectedIds={selectedPatientIds}
                    onChange={setSelectedPatientIds}
                    singleValue={formData.patientId || ''}
                    onSingleChange={id => setFormData({ ...formData, patientId: id })}
                    isMulti={isMulti}
                    onToggleMulti={setIsMulti}
                    accentColor="blue"
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
                
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

            {type === 'appointment' && (
              <div className="space-y-6">
                <div className="animate-fade-in">
                  <MultiPatientSelector 
                    patients={patientOptions.map(p => ({ id: p.value, name: p.label }))}
                    selectedIds={selectedPatientIds}
                    onChange={setSelectedPatientIds}
                    singleValue={formData.patientId || ''}
                    onSingleChange={id => setFormData({ ...formData, patientId: id })}
                    isMulti={isMulti}
                    onToggleMulti={setIsMulti}
                    accentColor="blue"
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
                
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
                <div className="animate-fade-in">
                  <MultiPatientSelector 
                    patients={patientOptions.map(p => ({ id: p.value, name: p.label }))}
                    selectedIds={selectedPatientIds}
                    onChange={setSelectedPatientIds}
                    singleValue={formData.patientId || ''}
                    onSingleChange={id => setFormData({ ...formData, patientId: id })}
                    isMulti={isMulti}
                    onToggleMulti={setIsMulti}
                    accentColor="blue"
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
                
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
                <div className="animate-fade-in">
                  <MultiPatientSelector 
                    patients={patientOptions.map(p => ({ id: p.value, name: p.label }))}
                    selectedIds={selectedPatientIds}
                    onChange={setSelectedPatientIds}
                    singleValue={formData.patientId || ''}
                    onSingleChange={id => setFormData({ ...formData, patientId: id })}
                    isMulti={isMulti}
                    onToggleMulti={setIsMulti}
                    accentColor="blue"
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
                
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
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
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
                    label="Idoso(s) Selecionado(s)"
                  />
                </div>
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
