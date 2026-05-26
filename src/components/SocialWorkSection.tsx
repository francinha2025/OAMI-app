import React, { useState, useMemo, useEffect } from 'react';
import { 
  LayoutDashboard, Users, Heart, FileText, 
  Scale, BookOpen, ClipboardList, Share2,
  Calendar, AlertTriangle, Receipt, Settings,
  Plus, Search, Filter, MoreVertical, ChevronRight,
  CheckCircle2, Clock, Phone, User as UserIcon,
  Trash2, Edit2, Eye, Download, Printer, X, Info, Check,
  ArrowLeft, TrendingUp, UserCircle, LogOut,
  Moon, Sun, Smile, Meh, Frown, History,
  Lightbulb, Target, Star, ShieldAlert, Loader2, Zap,
  Home, MapPin, Briefcase, DollarSign, Activity,
  FileCheck, FileWarning, FileX, Landmark
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
  AreaChart, Area, LineChart, Line
} from 'recharts';
import { format, isToday, parseISO, startOfToday, isSameDay, subMonths, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeReplace } from '../lib/utils';
import { ROLE_LABELS } from '../constants';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { extractFormData, fixGrammar } from '../services/geminiService';
import { 
  User as UserType,
  SocialPatient, SocialFamilyTie, SocialDocumentation,
  SocialLegalSituation, SocialStudy, SocialEvolution,
  SocialReferral, SocialFamilyVisit, SocialRiskSituation,
  PIA, Elderly,
  NursingEvolution, PhysioEvolution, PsychEvolution, PedagogyEvolution, NutritionEvolution, Workshop, AppNotification, Professional
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';
import { ProductivitySection } from './ProductivitySection';
import { MultiPatientSelector } from './MultiPatientSelector';
import { Award } from 'lucide-react';

interface SocialWorkSectionProps {
  user: UserType;
  elderly: Elderly[];
  patients: SocialPatient[];
  familyTies: SocialFamilyTie[];
  documentations: SocialDocumentation[];
  legalSituations: SocialLegalSituation[];
  socialStudies: SocialStudy[];
  professionals?: Professional[];
  evolutions: SocialEvolution[];
  referrals: SocialReferral[];
  familyVisits: SocialFamilyVisit[];
  riskSituations: SocialRiskSituation[];
  pias: PIA[];
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
  onDeleteRecord: (collectionName: string, id: string) => Promise<void>;
  onDeletePatient: (id: string) => Promise<void>;
  onUpdateProfile?: (data: Partial<UserType>) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

type TabType = 
  | 'dashboard' | 'profile' | 'family' | 'docs' 
  | 'legal' | 'study' | 'evolution' | 'referrals' 
  | 'visits' | 'risk' | 'benefits' | 'productivity' | 'reports' | 'settings' | 'pia';

const safeFormat = (dateStr: string | undefined | null, formatStr: string, fallback = '--/--') => {
  if (!dateStr) return fallback;
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatStr, { locale: ptBR });
  } catch (e) {
    return fallback;
  }
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

export const SocialWorkSection: React.FC<SocialWorkSectionProps> = (props) => {
  const {
    user,
    elderly,
    patients,
    familyTies,
    documentations,
    legalSituations,
    socialStudies,
    professionals = [],
    evolutions,
    referrals,
    familyVisits,
    riskSituations,
    pias,
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
    onDeleteRecord,
    onDeletePatient,
    onUpdateProfile,
    showToast,
    theme,
    setTheme,
    onLogout
  } = props;
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('oami-social-tab');
    if (saved === 'visits') return 'family';
    if (saved === 'legal') return 'docs';
    return (saved as TabType) || 'dashboard';
  });
  const [familySubTab, setFamilySubTab] = useState<'ties' | 'visits'>(() => {
    const saved = localStorage.getItem('oami-social-family-subtab');
    return (saved as 'ties' | 'visits') || 'ties';
  });

  useEffect(() => {
    localStorage.setItem('oami-social-family-subtab', familySubTab);
  }, [familySubTab]);

  const [docsSubTab, setDocsSubTab] = useState<'docs' | 'legal'>(() => {
    const saved = localStorage.getItem('oami-social-docs-subtab');
    return (saved as 'docs' | 'legal') || 'docs';
  });

  useEffect(() => {
    localStorage.setItem('oami-social-docs-subtab', docsSubTab);
  }, [docsSubTab]);

  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [editingData, setEditingData] = useState<any>(null);
  const [selectedPatient, setSelectedPatient] = useState<SocialPatient | null>(null);
  const [formData, setFormData] = useState<any>({});
  const [isExtracting, setIsExtracting] = useState(false);
  const [selectedPatientIds, setSelectedPatientIds] = useState<string[]>([]);
  const [isMulti, setIsMulti] = useState(false);
  const [evolutionPatientFilter, setEvolutionPatientFilter] = useState('');
  const [profSearch, setProfSearch] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; collection: string; label: string } | null>(null);
  const [viewingEvo, setViewingEvo] = useState<any | null>(null);

  // States for Editable table & multi-select deletion in Documentation & Visit Control tabs
  const [selectedDocIds, setSelectedDocIds] = useState<string[]>([]);
  const [selectedVisitIds, setSelectedVisitIds] = useState<string[]>([]);
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [inlineDocForm, setInlineDocForm] = useState<any>({});
  const [inlineVisitForm, setInlineVisitForm] = useState<any>({});
  const [isAddingDoc, setIsAddingDoc] = useState(false);
  const [isAddingVisit, setIsAddingVisit] = useState(false);
  const [newDocForm, setNewDocForm] = useState<any>({
    patientId: '',
    rg: 'PENDENTE',
    cpf: 'PENDENTE',
    sus: 'PENDENTE',
    birthCertificate: 'PENDENTE',
    addressProof: 'PENDENTE',
    observations: ''
  });
  const [newVisitForm, setNewVisitForm] = useState<any>({
    patientId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    visitorName: '',
    kinship: '',
    observations: ''
  });

  // Sincronização automática com Cadastro Geral
  const linkedElderly = useMemo(() => 
    formData.elderlyId ? (elderly || []).find(e => e.id === formData.elderlyId) : null,
  [formData.elderlyId, elderly]);

  useEffect(() => {
    if (linkedElderly) {
      if (modalType === 'patient' || modalType === 'profile' || activeTab === 'profile') {
        setFormData((prev: any) => ({
          ...prev,
          name: linkedElderly.name,
          birthDate: linkedElderly.birthDate,
          cpf: linkedElderly.cpf,
          entryDate: linkedElderly.entryDate,
          schooling: linkedElderly.schooling || prev.schooling,
          previousProfession: linkedElderly.lastProfession || prev.previousProfession,
          address: linkedElderly.address || prev.address,
          phone: linkedElderly.phone || prev.phone,
          responsibleName: linkedElderly.responsibleName || prev.responsibleName,
          responsiblePhone: linkedElderly.responsiblePhone || prev.responsiblePhone
        }));
      } else if (modalType === 'pia') {
        setFormData((prev: any) => ({
          ...prev,
          healthStatus: linkedElderly.diagnoses || prev.healthStatus,
          medications: linkedElderly.medications || prev.medications,
          mobilityStatus: linkedElderly.physicalLimitations || prev.mobilityStatus
        }));
      }
    }
  }, [linkedElderly, modalType, activeTab]);

  const [familyPatientFilter, setFamilyPatientFilter] = useState('');
  const [docsPatientFilter, setDocsPatientFilter] = useState('');
  const [legalPatientFilter, setLegalPatientFilter] = useState('');
  const [studyPatientFilter, setStudyPatientFilter] = useState('');
  const [referralPatientFilter, setReferralPatientFilter] = useState('');
  const [reportsPatientFilter, setReportsPatientFilter] = useState('');
  const [visitPatientFilter, setVisitPatientFilter] = useState('');
  const [riskPatientFilter, setRiskPatientFilter] = useState('');
  const [piaPatientFilter, setPiaPatientFilter] = useState('');

  const [reportStartDate, setReportStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [reportEndDate, setReportEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));

  const handleDownloadBulkEvolutions = async () => {
    let filtered = (evolutions || []).filter(e => {
      const date = e.date ? e.date.split('T')[0] : '';
      return date >= reportStartDate && date <= reportEndDate;
    });

    if (reportsPatientFilter) {
      filtered = filtered.filter(e => e.patientId === reportsPatientFilter);
    }

    if (filtered.length === 0) {
      showToast('Nenhuma evolução encontrada no período selecionado', 'error');
      return;
    }

    // Sort by date ascending
    filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const data = filtered.map(evo => {
      const patient = (patients || []).find(p => p.id === evo.patientId);
      const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
      const name = linked?.name || patient?.name || 'Geral/Coletivo';
      
      return [
        safeFormat(evo.date, 'dd/MM/yy HH:mm'),
        name,
        evo.serviceType || '-',
        `${evo.observation || ''}\n\nConduta: ${evo.conduct || ''}`
      ];
    });

    const patientName = reportsPatientFilter ? patients.find(p => p.id === reportsPatientFilter)?.name : 'Todos';

    await generateModernPDF({
      title: 'Relatório Consolidado de Evoluções',
      subtitle: `Período: ${safeFormat(reportStartDate, 'dd/MM/yy')} a ${safeFormat(reportEndDate, 'dd/MM/yy')} - Idoso: ${patientName}`,
      columns: ['Data/Hora', 'Idoso', 'Tipo', 'Detalhamento Técnico'],
      data: data,
      fileName: `relatorio_evolucoes_${reportStartDate}_a_${reportEndDate}`,
      orientation: 'landscape'
    });
  };

  const handleDownloadAllFilteredEvolutions = async () => {
    let filtered = (evolutions || []).filter(e => {
      if (evolutionPatientFilter === 'GENERAL') return !e.patientId;
      return !evolutionPatientFilter || e.patientId === evolutionPatientFilter;
    });

    if (filtered.length === 0) {
      showToast('Nenhuma evolução encontrada para o filtro selecionado', 'error');
      return;
    }

    filtered.sort((a, b) => (a.date || '').localeCompare(b.date || ''));

    const data = filtered.map(evo => {
      const patient = (patients || []).find(p => p.id === evo.patientId);
      const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
      const name = linked?.name || patient?.name || 'Fluxo de Atendimento Geral';
      
      return [
        safeFormat(evo.date, 'dd/MM/yy HH:mm'),
        name,
        evo.serviceType || '-',
        `${evo.observation || ''}\n\nConduta: ${evo.conduct || ''}`
      ];
    });

    const patientName = evolutionPatientFilter 
      ? (evolutionPatientFilter === 'GENERAL' ? 'Fluxo Geral' : patients.find(p => p.id === evolutionPatientFilter)?.name) 
      : 'Todos';

    await generateModernPDF({
      title: 'Consolidado de Evoluções Sociais',
      subtitle: `Filtro atual: ${patientName} - Total: ${filtered.length} registros`,
      columns: ['Data/Hora', 'Idoso/Fluxo', 'Tipo', 'Detalhamento (Obs/Conduta)'],
      data: data,
      fileName: `evolucoes_sociais_${new Date().getTime()}`,
      orientation: 'landscape'
    });
  };

  const handleDownloadEvolution = async (evolution: SocialEvolution) => {
    const patient = (patients || []).find(p => p.id === evolution.patientId);
    const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
    const name = linked?.name || patient?.name || 'Fluxo de Atendimento Geral';
    
    const data = [
      ['DADOS DO ATENDIMENTO', ''],
      ['Assistido', name],
      ['Data/Hora', safeFormat(evolution.date, "dd/MM/yyyy 'às' HH:mm")],
      ['Tipo de Serviço', evolution.serviceType || 'Não especificado'],
      ['Registrado por', evolution.registeredBy || user.name],
      ['', ''],
      ['DETALHAMENTO TÉCNICO', ''],
      ['Relato da Observação', evolution.observation || 'Nenhuma observação registrada'],
      ['Conduta Tomada', evolution.conduct || 'Nenhuma conduta registrada'],
      ['Situação Identificada', evolution.observation?.length > 100 ? 'Análise Detalhada em Anexo' : 'Registro Direto']
    ];

    await generateModernPDF({
      title: 'Relatório de Evolução Social',
      subtitle: `Registro de Atendimento e Acompanhamento - ${name}`,
      columns: ['Indicador/Campo', 'Descrição do Atendimento'],
      data: data,
      fileName: `evolucao_detalhada_${name.toLowerCase().replace(/\s/g, '_')}_${evolution.id.substring(0, 5)}`
    });
  };

  const handleDownloadPIA = async (pia: PIA) => {
    const patient = (patients || []).find(p => p.id === pia.elderlyId);
    const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
    const name = linked?.name || patient?.name || 'Idoso não encontrado';

    const data = [
      ['DADOS DE IDENTIFICAÇÃO', ''],
      ['Idoso', name],
      ['Data de Registro', safeFormat(pia.date, 'dd/MM/yyyy')],
      ['Status do Plano', safeReplace(pia.status, '_', ' ') || 'EM ANDAMENTO'],
      ['Responsável Técnico', pia.responsible || 'Assistente Social'],
      ['', ''],
      ['SITUAÇÃO SOCIOECONÔMICA', ''],
      ['Possui BPC', pia.hasBPC ? 'Sim' : 'Não'],
      ['Possui Aposentadoria', pia.hasPension ? 'Sim' : 'Não'],
      ['Tem Empréstimos', pia.hasLoans ? 'Sim' : 'Não'],
      ['Detalhes Empréstimo', pia.loanDetails || 'NADA CONSTA'],
      ['Possui Imóvel', pia.hasProperty ? 'Sim' : 'Não'],
      ['Renda Mensal', `R$ ${Number(pia.monthlyIncome || 0).toLocaleString('pt-BR')}`],
      ['', ''],
      ['RELAÇÕES FAMILIARES', ''],
      ['Vínculo Familiar', pia.familyInvolvement || 'MÉDIO'],
      ['Observações Família', pia.familyObservations || 'Não informado'],
      ['', ''],
      ['SAÚDE E BEM-ESTAR', ''],
      ['Estado de Saúde', pia.healthStatus || 'Não informado'],
      ['Medicamentos', pia.medications || 'Não informado'],
      ['Mobilidade', pia.mobilityStatus || 'Não informado'],
      ['', ''],
      ['PLANEJAMENTO TÉCNICO', ''],
      ['Objetivos Estratégicos', pia.objectives || 'Sem objetivos descritos'],
      ['Ações Propostas', pia.actions || 'Sem ações propostas'],
      ['Outras Observações', pia.observations || 'Nenhuma observação adicional']
    ];

    await generateModernPDF({
      title: 'Plano Individual de Atendimento (PIA)',
      subtitle: `Ficha Cadastral Social e Plano de Metas Completo - ${name}`,
      columns: ['Campo/Área', 'Detalhamento Técnico'],
      data: data,
      fileName: `pia_detalhado_${name.toLowerCase().replace(/\s/g, '_')}_${pia.id ? pia.id.substring(0, 5) : 'new'}`
    });
  };

  const handleDownloadPatientProfile = async (patient: SocialPatient) => {
    const linked = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
    const name = linked?.name || patient.name;
    const birthDate = linked?.birthDate || patient.birthDate;
    
    // Get related records for a full profile
    const patientFamily = (familyTies || []).find(f => f.patientId === patient.id);
    const patientDocs = (documentations || []).find(d => d.patientId === patient.id);
    const patientLegal = (legalSituations || []).find(l => l.patientId === patient.id);

    const data = [
      ['NOME', name],
      ['DATA NASC.', safeFormat(birthDate, 'dd/MM/yyyy')],
      ['CPF', linked?.cpf || 'N/A'],
      ['NATURALIDADE', patient.naturalness || 'N/A'],
      ['ESTADO CIVIL', patient.maritalStatus || 'N/A'],
      ['ESCOLARIDADE', patient.schooling || 'N/A'],
      ['PROFISSÃO', patient.previousProfession || 'N/A'],
      ['RENDA', `R$ ${Number(patient.income || 0).toLocaleString('pt-BR')}`],
      ['STATUS BENEFÍCIO', patient.benefitStatus || 'N/A'],
      ['EMPRÉSTIMOS', patient.hasLoans ? 'SIM' : 'NÃO'],
      ['---', '---'],
      ['DOCUMENTAÇÃO', 'Status'],
      ['RG', patientDocs?.rg || 'N/A'],
      ['CPF (SIT.)', patientDocs?.cpf || 'N/A'],
      ['SUS', patientDocs?.sus || 'N/A'],
      ['CERTIDÃO', patientDocs?.birthCertificate || 'N/A'],
      ['---', '---'],
      ['FAMÍLIA', 'Status'],
      ['POSSUI FAMÍLIA', patientFamily?.hasFamily ? 'SIM' : 'NÃO'],
      ['RISCO ABANDONO', patientFamily?.abandonmentRisk ? 'SIM' : 'NÃO'],
      ['MEMBROS', (patientFamily?.members || []).map(m => `${m.name} (${m.kinship})`).join('; ') || 'NADA CONSTA'],
      ['---', '---'],
      ['SITUAÇÃO LEGAL', 'Status'],
      ['INTERDITADO', patientLegal?.isInterdicted ? 'SIM' : 'NÃO'],
      ['CURADOR', patientLegal?.curatorName || 'N/A']
    ];

    await generateModernPDF({
      title: 'Prontuário Social Individual',
      subtitle: `Ficha Cadastral Detalhada - ${name}`,
      columns: ['Campo', 'Informação'],
      data: data,
      fileName: `prontuario_${name.toLowerCase().replace(/\s/g, '_')}`
    });
  };

  const handleDownloadFamilyBondReport = async (patient: SocialPatient) => {
    const linked = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
    const name = linked?.name || patient.name;
    
    const patientFamily = (familyTies || []).find(f => f.patientId === patient.id);
    const patientVisits = (familyVisits || []).filter(v => v.patientId === patient.id).sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const birthDate = linked?.birthDate || patient.birthDate;
    const age = birthDate ? differenceInYears(new Date(), parseISO(birthDate)) : 'N/A';

    const section1 = [
      ['DADOS DO IDOSO', ''],
      ['NOME', name],
      ['IDADE', String(age)],
      ['VÍNCULO FAMILIAR', patientFamily?.hasFamily ? 'POSSUI FAMÍLIA' : 'NÃO POSSUI FAMÍLIA'],
      ['RISCO DE ABANDONO', patientFamily?.abandonmentRisk ? 'SIM - ALTO RISCO' : 'NÃO IDENTIFICADO'],
      ['FREQ. DE VISITAS', (patientFamily?.members || []).map(m => `${m.name}: ${m.visitFrequency}`).join('; ') || 'N/A'],
      ['---', '---']
    ];

    const section2 = [
      ['MAIS PRÓXIMOS', 'GRAU / CONTATO'],
      ...(patientFamily?.members || []).map(m => [m.name, `${m.kinship} - ${m.phone || 'N/A'}`]),
      ['---', '---']
    ];

    const section3 = [
      ['HISTÓRICO DE VISITAS RECEBIDAS', ''],
      ['Data', 'Visitante / Observação'],
      ...patientVisits.map(v => [
        safeFormat(v.date, 'dd/MM/yyyy'),
        `${v.visitorName} (${v.kinship})\n${v.observations || ''}`
      ])
    ];

    if (patientVisits.length === 0) {
      section3.push(['NADA CONSTA', 'Nenhum registro de visita encontrado no sistema.']);
    }

    const data = [...section1, ...section2, ...section3];

    await generateModernPDF({
      title: 'Relatório de Vínculo Familiar e Histórico de Visitas',
      subtitle: `Avaliação de Relacionamento e Contatos - ${name}`,
      columns: ['Atributo / Data', 'Detalhamento Técnico'],
      data: data,
      fileName: `vinculo_familiar_${name.toLowerCase().replace(/\s/g, '_')}`,
      orientation: 'portrait'
    });
  };

  const handleDownloadSocialStudy = async (study: SocialStudy) => {
    const patient = (patients || []).find(p => p.id === study.patientId);
    const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
    const name = linked?.name || patient?.name || 'Idoso não encontrado';

    const data = [
      ['Idoso', name],
      ['Data', safeFormat(study.date, 'dd/MM/yyyy')],
      ['Histór. de Vida', study.lifeHistory || 'Não informado'],
      ['Condições Sociais', study.socialConditions || 'Não informado'],
      ['Motivo da Inst.', study.institutionalizationReason || 'Não informado'],
      ['Parecer Técnico', study.technicalOpinion || 'Não informado']
    ];

    await generateModernPDF({
      title: 'Estudo Social Técnico',
      subtitle: `Avaliação Socioeconômica - ${name}`,
      columns: ['Campo', 'Detalhamento'],
      data: data,
      fileName: `estudo_social_${name.toLowerCase().replace(/\s/g, '_')}_${study.id.substring(0, 5)}`
    });
  };

  const handleDownloadSocialReport = async (patient: SocialPatient) => {
    const linked = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
    const name = linked?.name || patient.name;
    
    const patientEvolutions = (evolutions || []).filter(e => e.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 10);
    const patientReferrals = (referrals || []).filter(r => r.patientId === patient.id).sort((a, b) => b.date.localeCompare(a.date));

    const section1 = [
      ['DADOS DE IDENTIFICAÇÃO', ''],
      ['NOME', name],
      ['CPF', linked?.cpf || 'N/A'],
      ['DATA ENTRADA', safeFormat(linked?.entryDate || patient.createdAt, 'dd/MM/yyyy')],
      ['---', '---']
    ];

    const section2 = [
      ['EVOLUÇÕES RECENTES', 'TIPO / DESCRIÇÃO'],
      ...patientEvolutions.map(e => [
        safeFormat(e.date, 'dd/MM/yy'),
        `${e.serviceType || 'Atendimento'}: ${e.observation || ''}`
      ]),
      ['---', '---']
    ];

    const section3 = [
      ['ENCAMINHAMENTOS', 'DESTINO / STATUS'],
      ...patientReferrals.map(r => [
        safeFormat(r.date, 'dd/MM/yy'),
        `${r.destination}: ${r.status}`
      ])
    ];

    const data = [...section1, ...section2, ...section3];

    await generateModernPDF({
      title: 'Relatório Social Individual',
      subtitle: `Histórico Consolidado - ${name}`,
      columns: ['Atributo / Data', 'Detalhamento'],
      data: data,
      fileName: `relatorio_social_${name.toLowerCase().replace(/\s/g, '_')}`
    });
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const familyTiesList = familyTies || [];
    const documentationsList = documentations || [];
    const referralsList = referrals || [];
    const familyVisitsList = familyVisits || [];
    const patientsList = patients || [];
    const piasList = pias || [];

    const noFamily = familyTiesList.filter(f => f && (!f.hasFamily || f.abandonmentRisk)).length;
    const pendingDocs = documentationsList.filter(d => 
      d && (d.rg === 'PENDENTE' || d.cpf === 'PENDENTE' || d.sus === 'PENDENTE' ||
      d.rg === 'INEXISTENTE' || d.cpf === 'INEXISTENTE' || d.sus === 'INEXISTENTE')
    ).length;
    const activeReferrals = referralsList.filter(r => r && r.status === 'EM_ANDAMENTO').length;
    const upcomingVisits = familyVisitsList.filter(v => v && v.date && parseISO(v.date) >= startOfToday()).length;
    const activePias = piasList.filter(p => p && p.status === 'EM_ANDAMENTO').length;

    return {
      totalPatients: patientsList.length,
      noFamily,
      pendingDocs,
      activeReferrals,
      upcomingVisits,
      activePias
    };
  }, [patients, familyTies, documentations, referrals, familyVisits, pias]);

  const filteredPatients = (patients || []).filter(p => 
    (p.name || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  const openModal = (type: string, initialData: any = {}) => {
    setModalType(type);
    setFormData(initialData);
    setIsModalOpen(true);
    setSelectedPatient(null);
    setSelectedPatientIds(initialData.patientId ? [initialData.patientId] : []);
    setIsMulti(false);
  };

  useEffect(() => {
    localStorage.setItem('oami-social-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    if (props.defaultTab) {
      setActiveTab(props.defaultTab as any);
    }
  }, [props.defaultTab]);

  const handleDigitize = async (text: string) => {
    const type = modalType || activeTab;
    if (!text) return;

    setIsExtracting(true);
    try {
      const schemas: Record<string, string> = {
        patient: "name, age (number), birthDate, gender, currentAddress, city, previousProfession",
        study: "lifeHistory, socialConditions, institutionalizationReason, technicalOpinion",
        evolution: "description, observation, conduct",
        visit: "visitorName, relationship, date, description",
        risk: "description, complexity (ALTA, MEDIA, BAIXA)",
        documentation: "rg, cpf, sus, voterID, birthCertificate (all status: POSSUI, PENDENTE, INEXISTENTE), observations"
      };

      const extractedData = await extractFormData(text, schemas[type] || "description, observations");
      
      if (extractedData && Object.keys(extractedData).length > 0) {
        setFormData((prev: any) => ({ ...prev, ...extractedData }));
      } else {
        if (type === 'evolution') {
          setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
        } else if (type === 'docs' || type === 'documentation') {
          setFormData((prev: any) => ({ ...prev, observations: (prev.observations || '') + '\n' + text }));
        } else if (type === 'study') {
          setFormData((prev: any) => ({ ...prev, socialStudy: (prev.socialStudy || '') + '\n' + text }));
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
    try {
      const type = modalType || activeTab;
      const { photos, ...data } = formData;
      const id = formData.id;
      
      const targetPid = selectedPatientIds[0] || formData.patientId;
      const finalData = { 
        ...data, 
        patientId: targetPid, 
        patientIds: selectedPatientIds.length > 0 ? selectedPatientIds : (targetPid ? [targetPid] : []) 
      };

      switch (type) {
        case 'patient':
        case 'profile':
          await onSavePatient(data, id);
          break;
        case 'family':
          await onSaveFamilyTie(finalData, id);
          break;
        case 'docs':
          await onSaveDocumentation(finalData, id);
          break;
        case 'legal':
          await onSaveLegalSituation(finalData, id);
          break;
        case 'study':
          await onSaveSocialStudy({ ...finalData, date: finalData.date || new Date().toISOString() }, id);
          break;
        case 'evolution':
          await onSaveEvolution({ ...finalData, date: finalData.date || new Date().toISOString() }, id);
          break;
        case 'referral':
        case 'referrals':
          await onSaveReferral({ ...finalData, date: finalData.date || new Date().toISOString() }, id);
          break;
        case 'visit':
        case 'visits':
          await onSaveFamilyVisit({ ...finalData, date: finalData.date || new Date().toISOString() }, id);
          break;
        case 'risk':
          await onSaveRiskSituation({ ...finalData, date: finalData.date || new Date().toISOString() }, id);
          break;
        case 'pia':
          await onSavePIA({ ...finalData, date: finalData.date || new Date().toISOString(), responsible: finalData.responsible || user.name }, id);
          break;
      }

      if (photos && photos.length > 0 && targetPid) {
        const patient = (patients || []).find(p => p.id === targetPid);
        const activityType = 
          type === 'evolution' ? 'Evolução Social' :
          type === 'docs' ? 'Documentação Social' :
          type === 'study' ? 'Estudo Social' : 'Atendimento Social';
        
        await onSavePhotos(photos, targetPid, patient?.name || 'Paciente', activityType, formData.description || formData.observations || formData.socialStudy);
      }

      setIsModalOpen(false);
      setModalType('');
      setFormData({});
      setSelectedPatientIds([]);
      setIsMulti(false);
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
      const count = (evolutions || []).filter(e => e.date && String(e.date).startsWith(date)).length;
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
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-black mt-1 text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
        <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
          <Zap className="w-5 h-5 text-yellow-500" />
          Ações Rápidas
        </h3>
        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => openModal('evolution')}
            className="flex items-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none font-bold active:scale-95"
          >
            <Activity className="w-5 h-5" />
            Registrar Fluxo de Atendimento Geral
          </button>
          <button
            onClick={() => openModal('patient')}
            className="flex items-center gap-2 px-4 py-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-lg shadow-green-100 dark:shadow-none font-bold active:scale-95"
          >
            <Plus className="w-5 h-5" />
            Novo Cadastro Social
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Evolução de Atendimentos
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <AreaChart data={evolutionChartData}>
                <defs>
                  <linearGradient id="colorEvolution" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(str) => safeFormat(str, 'dd/MM')} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="count" stroke="#3b82f6" fillOpacity={1} fill="url(#colorEvolution)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            <ShieldAlert className="w-5 h-5 text-red-600" />
            Situações de Risco por Tipo
          </h3>
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
            <Clock className="w-5 h-5 text-blue-600" />
            Encaminhamentos Recentes
          </h3>
          <div className="space-y-4">
            {(referrals || []).slice(-5).map((referral, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    <Share2 className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 dark:text-white">{referral.destination}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">{referral.description}</p>
                  </div>
                </div>
                <span className={cn(
                  "px-3 py-1 rounded-full text-xs font-bold uppercase",
                  referral.status === 'CONCLUIDO' ? "bg-green-100 text-green-700" :
                  referral.status === 'EM_ANDAMENTO' ? "bg-blue-100 text-blue-700" :
                  "bg-red-100 text-red-700"
                )}>
                  {safeReplace(referral.status, '_', ' ') || 'PENDENTE'}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-gray-900 dark:text-white mb-4 flex items-center gap-2 uppercase tracking-tight">
            <FileWarning className="w-5 h-5 text-orange-600" />
            Alertas Críticos
          </h3>
          <div className="space-y-3">
            {stats.noFamily > 0 && (
              <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-red-900 dark:text-red-300">{stats.noFamily} idosos sem vínculo familiar</p>
                  <p className="text-xs text-red-700 dark:text-red-400 font-bold">Risco de abandono identificado.</p>
                </div>
              </div>
            )}
            {stats.pendingDocs > 0 && (
              <div className="p-3 bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-900/30 rounded-xl flex items-start gap-3">
                <FileX className="w-5 h-5 text-orange-600 dark:text-orange-400 mt-0.5" />
                <div>
                  <p className="text-sm font-black text-orange-900 dark:text-orange-300">{stats.pendingDocs} pendências documentais</p>
                  <p className="text-xs text-orange-700 dark:text-orange-400 font-bold">Regularização necessária para benefícios.</p>
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
            <div className="space-y-3 p-6 bg-blue-50 dark:bg-blue-900/10 rounded-[32px] border border-blue-100 dark:border-blue-800/30 transition-all">
              <label className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest ml-1 flex items-center gap-2">
                <Users size={14} />
                Vincular ao Cadastro Geral (Idosos)
              </label>
              <select 
                className="w-full bg-white dark:bg-gray-800 border-none rounded-2xl px-6 py-4 text-sm focus:ring-2 focus:ring-blue-500 transition-all font-bold dark:text-white"
                value={formData.elderlyId || ''}
                onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
              >
                <option value="">-- Não vinculado / Novo Cadastro --</option>
                {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
              <p className="text-[10px] text-blue-600/60 ml-1 italic font-medium">Sincroniza nome, data de nascimento, CPF e data de entrada.</p>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="col-span-2">
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Nome Completo</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium disabled:opacity-50"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  disabled={!!formData.elderlyId}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Data de Nascimento</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium disabled:opacity-50"
                  value={formData.birthDate || ''}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  disabled={!!formData.elderlyId}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Naturalidade</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
                  value={formData.naturalness || ''}
                  onChange={(e) => setFormData({ ...formData, naturalness: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-gray-700 dark:text-gray-300 mb-1">Estado Civil</label>
                <select
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-medium"
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
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Escolaridade</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  value={formData.schooling || ''}
                  onChange={(e) => setFormData({ ...formData, schooling: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Profissão Anterior</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  value={formData.previousProfession || ''}
                  onChange={(e) => setFormData({ ...formData, previousProfession: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Renda (R$)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  value={formData.income === undefined || isNaN(formData.income) ? '' : formData.income}
                  onChange={(e) => setFormData({ ...formData, income: e.target.value === '' ? 0 : parseFloat(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Status do Benefício</label>
                <select
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  value={formData.benefitStatus || ''}
                  onChange={(e) => setFormData({ ...formData, benefitStatus: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="SUSPENSO">Suspenso</option>
                  <option value="NAO_POSSUI">Não Possui</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Acompanhamento INSS</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  value={formData.inssMonitoring || ''}
                  onChange={(e) => setFormData({ ...formData, inssMonitoring: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Última Atu. CadÚnico</label>
                <input
                  type="date"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                  value={formData.cadUnicoUpdateDate || ''}
                  onChange={(e) => setFormData({ ...formData, cadUnicoUpdateDate: e.target.value })}
                />
              </div>
              <div className="col-span-2 space-y-4 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Telefone de Contato</label>
                    <input
                      type="tel"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="(00) 0 0000-0000"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Responsável Legal</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                      value={formData.responsibleName || ''}
                      onChange={(e) => setFormData({ ...formData, responsibleName: e.target.value })}
                      placeholder="Nome do Responsável"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Tel. Responsável</label>
                    <input
                      type="tel"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                      value={formData.responsiblePhone || ''}
                      onChange={(e) => setFormData({ ...formData, responsiblePhone: e.target.value })}
                      placeholder="(00) 0 0000-0000"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Endereço de Origem</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                      value={formData.address || ''}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Rua, Número, Bairro, Cidade"
                    />
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={formData.hasLoans || false}
                  onChange={(e) => setFormData({ ...formData, hasLoans: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Possui Empréstimos</label>
              </div>
              <div className="flex items-center gap-2 mt-4">
                <input
                  type="checkbox"
                  checked={formData.isFamilyComplementing || false}
                  onChange={(e) => setFormData({ ...formData, isFamilyComplementing: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700">Família Complementa</label>
              </div>
              {formData.hasLoans && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Detalhes Empréstimos</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                    value={formData.loanDetails || ''}
                    onChange={(e) => setFormData({ ...formData, loanDetails: e.target.value })}
                  />
                </div>
              )}
              {formData.isFamilyComplementing && (
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 mb-1 uppercase tracking-wider">Detalhes Complemento Familiar</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-800 dark:text-white"
                    value={formData.familyComplementDetails || ''}
                    onChange={(e) => setFormData({ ...formData, familyComplementDetails: e.target.value })}
                  />
                </div>
              )}
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
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Data do Atendimento</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-200 rounded-lg"
                value={formData.date || format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Atendimento</label>
              <input
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
                className="w-full p-2 border border-gray-200 rounded-lg h-24 font-bold"
                value={formData.observation || ''}
                onChange={(e) => setFormData({ ...formData, observation: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700">Conduta / Encaminhamentos</label>
                <div className="flex gap-2">
                  <button 
                    type="button"
                    disabled={isExtracting || !formData.conduct}
                    onClick={async () => {
                      if (!formData.conduct) return;
                      setIsExtracting(true);
                      try {
                        const fixed = await fixGrammar(formData.conduct);
                        setFormData({ ...formData, conduct: fixed });
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
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, conduct: (formData.conduct || '') + ' ' + t })} />
                </div>
              </div>
              <textarea
                className="w-full p-2 border border-gray-200 rounded-lg h-24 font-bold"
                value={formData.conduct || ''}
                onChange={(e) => setFormData({ ...formData, conduct: e.target.value })}
              />
            </div>

            <div className="space-y-4 border-t border-gray-150 dark:border-gray-800 pt-6 text-gray-900 dark:text-gray-100">
              <div className="flex justify-between items-center text-gray-800 dark:text-gray-200">
                <div>
                  <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider block">Co-workers / Profissionais Colaboradores</label>
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
                            ? "bg-blend-color-burn bg-blue-500/10 dark:bg-blue-950/20 border-blue-400 dark:border-blue-800 text-blue-900 dark:text-blue-300"
                            : "bg-white dark:bg-gray-850 hover:bg-gray-50 dark:hover:bg-gray-800 border-gray-100 dark:border-gray-750 text-gray-750 dark:text-gray-250"
                        )}
                      >
                        <div className="min-w-0">
                          <p className="text-xs font-bold truncate text-gray-900 dark:text-gray-100">{p.name}</p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-widest leading-none mt-0.5">{ROLE_LABELS[p.role] || p.role}</p>
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
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
              <select
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
                <div className="flex gap-2">
                  <button 
                    type="button"
                    disabled={isExtracting || !formData.description}
                    onClick={() => handleFixGrammar('description')}
                    className="flex items-center gap-1 text-[10px] font-bold text-green-600 hover:text-green-700 transition-colors bg-green-50 px-2 py-1 rounded-lg"
                  >
                    {isExtracting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Zap size={14} />}
                    Corrigir
                  </button>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
                </div>
              </div>
              <textarea
                className="w-full p-2 border border-gray-200 rounded-lg h-24"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
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
          <form onSubmit={handleSave} className="p-6 space-y-4 text-gray-800 dark:text-gray-100 bg-white dark:bg-gray-900">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Data da Visita (Selecione para data retroativa)</label>
              <input
                type="date"
                className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
                value={formData.date ? formData.date.substring(0, 10) : format(new Date(), 'yyyy-MM-dd')}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Nome do Visitante</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
                value={formData.visitorName || ''}
                onChange={(e) => setFormData({ ...formData, visitorName: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Parentesco</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg"
                value={formData.kinship || ''}
                onChange={(e) => setFormData({ ...formData, kinship: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações da Visita</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg h-24"
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

            <button type="submit" className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold transition-colors">
              {formData.id ? 'Atualizar Visita' : 'Registrar Visita'}
            </button>
          </form>
        );
      case 'risk':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4">
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Risco</label>
              <select
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
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Idoso</label>
                <select
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={formData.elderlyId || ''}
                  onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
                >
                  <option value="">Selecione o idoso</option>
                  {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Status</label>
                <select
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
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
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  onChange={(e) => setFormData({ ...formData, hasBPC: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui BPC</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasPension || false}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  onChange={(e) => setFormData({ ...formData, hasPension: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui Aposentadoria</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasLoans || false}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  onChange={(e) => setFormData({ ...formData, hasLoans: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui Empréstimos</label>
              </div>
              <div className="flex items-center gap-2 mt-6">
                <input
                  type="checkbox"
                  checked={formData.hasProperty || false}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded"
                  onChange={(e) => setFormData({ ...formData, hasProperty: e.target.checked })}
                />
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui Imóvel</label>
              </div>
              {formData.hasLoans && (
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Detalhes dos Empréstimos</label>
                  <input
                    type="text"
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    placeholder="Ex: Banco, Valor, Parcelas..."
                    value={formData.loanDetails || ''}
                    onChange={(e) => setFormData({ ...formData, loanDetails: e.target.value })}
                  />
                </div>
              )}
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Renda Mensal (R$)</label>
                <input
                  type="number"
                  className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                  value={formData.monthlyIncome || ''}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: parseFloat(e.target.value) })}
                />
              </div>

              <div className="col-span-2 space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   <Heart size={16} className="text-pink-500" />
                   Relações Familiares
                </h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Envolvimento Familiar</label>
                  <select
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    value={formData.familyInvolvement || 'MEDIO'}
                    onChange={(e) => setFormData({ ...formData, familyInvolvement: e.target.value })}
                  >
                    <option value="ALTO">Alto</option>
                    <option value="MEDIO">Médio</option>
                    <option value="BAIXO">Baixo</option>
                    <option value="NENHUM">Nenhum</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Observações da Família</label>
                  <textarea
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-20"
                    placeholder="Detalhes sobre visitas, contatos, conflitos..."
                    value={formData.familyObservations || ''}
                    onChange={(e) => setFormData({ ...formData, familyObservations: e.target.value })}
                  />
                </div>
              </div>

              <div className="col-span-2 space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   <Activity size={16} className="text-green-500" />
                   Saúde e Mobilidade
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Estado de Saúde</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={formData.healthStatus || ''}
                      onChange={(e) => setFormData({ ...formData, healthStatus: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobilidade</label>
                    <input
                      type="text"
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                      value={formData.mobilityStatus || ''}
                      onChange={(e) => setFormData({ ...formData, mobilityStatus: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Medicamentos em Uso</label>
                    <textarea
                      className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-20"
                      value={formData.medications || ''}
                      onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="col-span-2 space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                   <CheckCircle2 size={16} className="text-blue-500" />
                   Planejamento Ténico
                </h4>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Objetivos do Plano</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, objectives: (formData.objectives || '') + ' ' + t })} />
                  </div>
                  <textarea
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-24"
                    value={formData.objectives || ''}
                    onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Ações Propostas</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, actions: (formData.actions || '') + ' ' + t })} />
                  </div>
                  <textarea
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-24"
                    value={formData.actions || ''}
                    onChange={(e) => setFormData({ ...formData, actions: e.target.value })}
                  />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Observações Adicionais</label>
                    <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
                  </div>
                  <textarea
                    className="w-full p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 h-24"
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  />
                </div>
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
              <div className="col-span-2 animate-fade-in">
                <MultiPatientSelector 
                  patients={(patients || []).map(p => {
                    const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                    return { id: p.id, name: linked?.name || p.name };
                  })}
                  selectedIds={selectedPatientIds}
                  onChange={setSelectedPatientIds}
                  singleValue={formData.patientId || ''}
                  onSingleChange={id => setFormData({ ...formData, patientId: id })}
                  isMulti={isMulti}
                  onToggleMulti={setIsMulti}
                  accentColor="blue"
                  label="Idoso(s) Vinculado(s)"
                />
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
                <h4 className="font-bold text-gray-900 dark:text-white">Membros da Família</h4>
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
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
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
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Status da Situação</label>
                <input
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
            <div className="animate-fade-in">
              <MultiPatientSelector 
                patients={(patients || []).map(p => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return { id: p.id, name: linked?.name || p.name };
                })}
                selectedIds={selectedPatientIds}
                onChange={setSelectedPatientIds}
                singleValue={formData.patientId || ''}
                onSingleChange={id => setFormData({ ...formData, patientId: id })}
                isMulti={isMulti}
                onToggleMulti={setIsMulti}
                accentColor="blue"
                label="Idoso(s) Vinculado(s)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Título do Estudo</label>
              <input
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

  const renderDocumentationOnly = () => {
    const tableDocs = (documentations || []).filter(d => !docsPatientFilter || d.patientId === docsPatientFilter);
    const allSelected = tableDocs.length > 0 && tableDocs.every(d => selectedDocIds.includes(d.id));
    const someSelected = tableDocs.some(d => selectedDocIds.includes(d.id)) && !allSelected;

    const handleSelectAll = (checked: boolean) => {
      if (checked) {
        const toAdd = tableDocs.map(d => d.id);
        setSelectedDocIds(prev => Array.from(new Set([...prev, ...toAdd])));
      } else {
        const toRemove = tableDocs.map(d => d.id);
        setSelectedDocIds(prev => prev.filter(id => !toRemove.includes(id)));
      }
    };

    const handleSelectOne = (id: string, checked: boolean) => {
      if (checked) {
        setSelectedDocIds(prev => [...prev, id]);
      } else {
        setSelectedDocIds(prev => prev.filter(item => item !== id));
      }
    };

    const handleStartEdit = (doc: any) => {
      setEditingDocId(doc.id);
      setInlineDocForm({ ...doc });
    };

    const handleBulkDeleteDocs = async () => {
      const selectedInCurrentView = selectedDocIds.filter(id => (documentations || []).some(d => d.id === id));
      if (selectedInCurrentView.length === 0) return;
      if (window.confirm(`Deseja realmente excluir os ${selectedInCurrentView.length} registros de documentos selecionados?`)) {
        try {
          for (const id of selectedInCurrentView) {
            await onDeleteRecord('socialDocumentations', id);
          }
          showToast(`${selectedInCurrentView.length} registros de documentos excluídos com sucesso!`, 'success');
          setSelectedDocIds(prev => prev.filter(id => !selectedInCurrentView.includes(id)));
        } catch (err) {
          console.error(err);
          showToast('Erro ao excluir registros em lote', 'error');
        }
      }
    };

    const handleInlineSaveDoc = async (id: string) => {
      if (!inlineDocForm.patientId) {
        showToast('Idoso inválido', 'error');
        return;
      }
      try {
        await onSaveDocumentation(inlineDocForm, id);
        setEditingDocId(null);
        setInlineDocForm({});
        showToast('Documentos atualizados com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao atualizar documentos', 'error');
      }
    };

    const handleInlineAddDoc = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!newDocForm.patientId) {
        showToast('Selecione o idoso para os documentos', 'error');
        return;
      }
      try {
        await onSaveDocumentation(newDocForm);
        setIsAddingDoc(false);
        setNewDocForm({
          patientId: '',
          rg: 'PENDENTE',
          cpf: 'PENDENTE',
          sus: 'PENDENTE',
          birthCertificate: 'PENDENTE',
          addressProof: 'PENDENTE',
          observations: ''
        });
        showToast('Novos documentos cadastrados com sucesso!', 'success');
      } catch (err) {
        console.error(err);
        showToast('Erro ao cadastrar documentos', 'error');
      }
    };

    const getStatusBadge = (status: string) => (
      <span className={cn(
        "px-2 py-1 rounded-lg text-[10px] font-black uppercase tracking-tight border block text-center",
        status === 'COMPLETO' ? "bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800/40" :
        status === 'PENDENTE' ? "bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800/40" :
        "bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border-rose-200 dark:border-rose-800/40"
      )}>
        {status === 'COMPLETO' ? 'Completo' : status === 'PENDENTE' ? 'Pendente' : 'Inexistente'}
      </span>
    );

    return (
      <div className="space-y-6">
        {/* Bulk action strip */}
        {selectedDocIds.length > 0 && (
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 bg-gray-900 text-white rounded-3xl shadow-xl dark:bg-gray-950 border border-gray-800"
          >
            <div className="flex items-center gap-3">
              <div className="p-3 bg-red-600/20 text-red-400 rounded-2xl">
                <ShieldAlert className="w-6 h-6" />
              </div>
              <div>
                <p className="text-sm font-black uppercase tracking-widest text-red-400">Ações em Lote Ativas</p>
                <p className="text-xs text-gray-400">{selectedDocIds.length} {selectedDocIds.length === 1 ? 'registro selecionado' : 'registros selecionados'}</p>
              </div>
            </div>
            <div className="flex w-full sm:w-auto justify-end gap-2">
              <button
                type="button"
                onClick={() => setSelectedDocIds([])}
                className="px-4 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-900 rounded-xl transition-all"
              >
                Limpar Seleção
              </button>
              <button
                type="button"
                onClick={handleBulkDeleteDocs}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-900/30"
              >
                <Trash2 className="w-4 h-4" />
                Excluir Selecionados
              </button>
            </div>
          </motion.div>
        )}

        {/* Inline documentation adder */}
        <AnimatePresence>
          {isAddingDoc && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="bg-gradient-to-r from-blue-50/50 to-indigo-50/50 dark:from-gray-800/40 dark:to-gray-900/30 p-6 rounded-[32px] border border-blue-100 dark:border-gray-800 space-y-4 mb-4">
                <div className="flex items-center justify-between border-b border-blue-100/80 dark:border-gray-800 pb-3">
                  <h4 className="text-sm font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-2">
                    <Plus className="w-5 h-5 text-blue-600" />
                    Registrar controle de documentos
                  </h4>
                  <button 
                    type="button" 
                    onClick={() => setIsAddingDoc(false)}
                    className="p-1 px-3 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 font-bold rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                  >
                    Fechar
                  </button>
                </div>
                
                <form onSubmit={handleInlineAddDoc} className="space-y-4">
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Idoso Beneficiado *</label>
                      <select
                        required
                        value={newDocForm.patientId}
                        onChange={(e) => setNewDocForm({ ...newDocForm, patientId: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                      >
                        <option value="">Selecione o idoso</option>
                        {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                      </select>
                    </div>
                    <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-5 gap-2">
                      {[
                        { key: 'rg', label: 'RG' },
                        { key: 'cpf', label: 'CPF' },
                        { key: 'sus', label: 'SUS' },
                        { key: 'birthCertificate', label: 'Certidão' },
                        { key: 'addressProof', label: 'Comprovante' }
                      ].map(field => (
                        <div key={field.key}>
                          <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">{field.label}</label>
                          <select
                            value={newDocForm[field.key] || 'PENDENTE'}
                            onChange={(e) => setNewDocForm({ ...newDocForm, [field.key]: e.target.value })}
                            className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            <option value="COMPLETO">COMPLETO</option>
                            <option value="PENDENTE">PENDENTE</option>
                            <option value="INEXISTENTE">INEXISTENTE</option>
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Observações da Ficha de Documentos</label>
                    <textarea
                      value={newDocForm.observations || ''}
                      onChange={(e) => setNewDocForm({ ...newDocForm, observations: e.target.value })}
                      placeholder="Identifique detalhes de pendências, prazos para correção ou numerações de vias..."
                      className="w-full text-xs p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl h-20 resize-none font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-blue-100/50 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingDoc(false)}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-blue-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-blue-700 transition-all shadow-md shadow-blue-100 dark:shadow-none"
                    >
                      Salvar Cadastro
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Master documents list table */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800/80 overflow-hidden shadow-sm transition-all">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead className="bg-[#FAF9F6] dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                <tr>
                  <th className="p-4 pl-6 w-12 text-center">
                    <input 
                      type="checkbox"
                      checked={allSelected}
                      ref={el => {
                        if (el) {
                          el.indeterminate = someSelected;
                        }
                      }}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                    />
                  </th>
                  <th className="px-5 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest w-64">Idoso</th>
                  <th className="px-3 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest text-center w-32">RG</th>
                  <th className="px-3 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest text-center w-32">CPF</th>
                  <th className="px-3 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest text-center w-32">SUS</th>
                  <th className="px-3 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest text-center w-32">Certidão</th>
                  <th className="px-3 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest text-center w-32">Comprovante</th>
                  <th className="px-5 py-4 text-xs font-black text-gray-650 dark:text-gray-400 uppercase tracking-widest">Observações</th>
                  <th className="px-6 py-4 text-xs font-black text-gray-550 dark:text-gray-400 uppercase tracking-widest text-right w-36">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {tableDocs.map((doc) => {
                  const patient = (patients || []).find(p => p.id === doc.patientId);
                  const isEditing = editingDocId === doc.id;

                  return (
                    <tr 
                      key={doc.id} 
                      className={cn(
                        "hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
                        isEditing && "bg-blue-50/50 dark:bg-blue-950/20",
                        selectedDocIds.includes(doc.id) && "bg-red-50/20 dark:bg-red-950/10 font-bold"
                      )}
                    >
                      {/* Checkbox column */}
                      <td className="p-4 pl-6 w-12 text-center">
                        <input 
                          type="checkbox"
                          checked={selectedDocIds.includes(doc.id)}
                          onChange={(e) => handleSelectOne(doc.id, e.target.checked)}
                          className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                        />
                      </td>

                      {/* Patient Name / Dropdown */}
                      <td className="px-5 py-4 font-black text-gray-900 dark:text-white capitalize">
                        {isEditing ? (
                          <select
                            value={inlineDocForm.patientId || ''}
                            onChange={(e) => setInlineDocForm({ ...inlineDocForm, patientId: e.target.value })}
                            className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold w-full focus:ring-2 focus:ring-blue-500 outline-none"
                          >
                            {(patients || []).map(p => (
                              <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                            ))}
                          </select>
                        ) : (
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-900/30 font-black text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs tracking-tighter shrink-0 border border-blue-100 dark:border-none">
                              {patient?.name?.slice(0, 2).toUpperCase() || 'ID'}
                            </div>
                            <span className="text-gray-900 dark:text-white truncate font-bold text-sm tracking-tight">{patient?.name || 'Não identificado'}</span>
                          </div>
                        )}
                      </td>

                      {/* Five status cells */}
                      {['rg', 'cpf', 'sus', 'birthCertificate', 'addressProof'].map((field) => (
                        <td key={field} className="px-3 py-4 text-center">
                          {isEditing ? (
                            <select
                              value={inlineDocForm[field] || 'PENDENTE'}
                              onChange={(e) => setInlineDocForm({ ...inlineDocForm, [field]: e.target.value })}
                              className="text-[11px] p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 font-bold text-gray-800 dark:text-gray-100 w-full focus:ring-2 focus:ring-blue-500 outline-none"
                            >
                              <option value="COMPLETO">COMPLETO</option>
                              <option value="PENDENTE">PENDENTE</option>
                              <option value="INEXISTENTE">INEXISTENTE</option>
                            </select>
                          ) : (
                            getStatusBadge(doc[field as keyof SocialDocumentation] as string || 'PENDENTE')
                          )}
                        </td>
                      ))}

                      {/* Observations cell */}
                      <td className="px-5 py-4">
                        {isEditing ? (
                          <input
                            type="text"
                            value={inlineDocForm.observations || ''}
                            onChange={(e) => setInlineDocForm({ ...inlineDocForm, observations: e.target.value })}
                            className="text-xs p-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-800 dark:text-white font-bold focus:ring-2 focus:ring-blue-500 outline-none"
                          />
                        ) : (
                          <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-xs truncate" title={doc.observations}>
                            {doc.observations || '--'}
                          </p>
                        )}
                      </td>

                      {/* Actions cell */}
                      <td className="px-6 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          {isEditing ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleInlineSaveDoc(doc.id)}
                                className="p-2 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-xl transition-all shadow-sm border border-green-100 dark:border-none"
                                title="Salvar"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingDocId(null);
                                  setInlineDocForm({});
                                }}
                                className="p-2 text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all"
                                title="Cancelar"
                              >
                                <X className="w-4 h-4" />
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => handleStartEdit(doc)}
                                className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                title="Editar instantaneamente"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  if (window.confirm(`Deseja realmente excluir a documentação de ${patient?.name}?`)) {
                                    onDeleteRecord('socialDocumentations', doc.id);
                                    showToast('Registro de documentos deletado.', 'success');
                                  }
                                }}
                                className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                title="Excluir"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}

                {tableDocs.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-6 py-16 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <FileText className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                        <p className="text-sm text-gray-400 dark:text-gray-500 font-bold italic">Nenhum registro de documento filtrado.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  };

  const renderDocumentationAndLegal = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setDocsSubTab('docs')}
            className={cn(
              "flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
              docsSubTab === 'docs'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <FileText className="w-4 h-4 text-blue-500" />
            Controle de Documentação
          </button>
          <button
            onClick={() => setDocsSubTab('legal')}
            className={cn(
              "flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
              docsSubTab === 'legal'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Scale className="w-4 h-4 text-purple-500" />
            Situação Legal
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {docsSubTab === 'docs' ? (
            <>
              <select
                value={docsPatientFilter}
                onChange={(e) => setDocsPatientFilter(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Filtrar p/ Idoso</option>
                {(patients || []).map((p: any) => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return (
                    <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
                  );
                })}
              </select>
              <button
                onClick={() => setIsAddingDoc(!isAddingDoc)}
                className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 dark:shadow-none font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                {isAddingDoc ? 'Fechar Formulário' : 'Novo Controle de Doc'}
              </button>
            </>
          ) : (
            <>
              <select
                value={legalPatientFilter}
                onChange={(e) => setLegalPatientFilter(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Filtrar p/ Idoso</option>
                {(patients || []).map((p: any) => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return (
                    <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
                  );
                })}
              </select>
              <button
                onClick={() => openModal('legal')}
                className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100 dark:shadow-none font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                Nova Situação
              </button>
            </>
          )}
        </div>
      </div>

      {docsSubTab === 'docs' ? renderDocumentationOnly() : renderLegalSituationOnly()}
    </div>
  );

  const renderFamilyTies = () => (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-900 p-4 rounded-3xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-4 items-center justify-between shadow-sm">
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-2xl w-full md:w-auto">
          <button
            onClick={() => setFamilySubTab('ties')}
            className={cn(
              "flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
              familySubTab === 'ties'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Heart className="w-4 h-4 text-pink-500" />
            Vínculo Familiar
          </button>
          <button
            onClick={() => setFamilySubTab('visits')}
            className={cn(
              "flex-1 md:flex-initial px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2",
              familySubTab === 'visits'
                ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm"
                : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            )}
          >
            <Calendar className="w-4 h-4 text-green-500" />
            Controle de Visitas
          </button>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          {familySubTab === 'ties' ? (
            <>
              <select
                value={familyPatientFilter}
                onChange={(e) => setFamilyPatientFilter(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Filtrar p/ Idoso</option>
                {(patients || []).map((p: any) => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return (
                    <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
                  );
                })}
              </select>
              <button
                onClick={() => openModal('family')}
                className="flex items-center gap-2 px-5 py-2.5 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors shadow-lg shadow-pink-100 dark:shadow-none font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                Novo Vínculo
              </button>
            </>
          ) : (
            <>
              <select
                value={visitPatientFilter}
                onChange={(e) => setVisitPatientFilter(e.target.value)}
                className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
              >
                <option value="">Filtrar p/ Idoso</option>
                {(patients || []).map((p: any) => {
                  const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
                  return (
                    <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
                  );
                })}
              </select>
              <button
                onClick={() => setIsAddingVisit(!isAddingVisit)}
                className="flex items-center gap-2 px-5 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 dark:shadow-none font-bold text-xs"
              >
                <Plus className="w-4 h-4" />
                {isAddingVisit ? 'Fechar Formulário' : 'Registrar Visita'}
              </button>
            </>
          )}
        </div>
      </div>

      {familySubTab === 'ties' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {(familyTies || []).filter(t => !familyPatientFilter || t.patientId === familyPatientFilter || t.patientIds?.includes(familyPatientFilter)).map((tie) => {
            const patient = (patients || []).find(p => p.id === tie.patientId);
            const displayName = tie.patientIds && tie.patientIds.length > 1
              ? tie.patientIds.map(pid => {
                  const pat = (patients || []).find(p => p.id === pid);
                  const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
                  return lk?.name || pat?.name;
                }).filter(Boolean).join(', ')
              : (patient?.name || 'Não cadastrado');
            return (
              <div key={tie.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                      <Heart className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{displayName}</h4>
                      <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">{tie.hasFamily ? 'Possui Família' : 'Sem Vínculo Familiar'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {tie.abandonmentRisk && (
                      <span className="px-3 py-1 bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400 rounded-full text-xs font-black uppercase flex items-center gap-1 border border-red-200 dark:border-red-800">
                        <AlertTriangle className="w-3 h-3" />
                        Risco
                      </span>
                    )}
                    <button
                      onClick={() => openModal('family', tie)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteRecord('socialFamilyTies', tie.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {(tie.members || []).map((member) => (
                    <div key={member.id} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl flex items-center justify-between border border-gray-100 dark:border-gray-700">
                      <div>
                        <p className="text-sm font-black text-gray-900 dark:text-white capitalize">{member.name} ({member.kinship})</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold">{member.phone}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] font-black text-gray-400 uppercase">Visitas</p>
                        <p className="text-xs font-black text-gray-700 dark:text-gray-300 capitalize">{member.visitFrequency?.toLowerCase()}</p>
                      </div>
                    </div>
                  ))}
                  {(!tie.members || tie.members.length === 0) && (
                    <p className="text-xs text-gray-400 dark:text-gray-500 italic text-center py-2">Nenhum membro familiar cadastrado nesta estrutura.</p>
                  )}
                  {tie.observations && (
                    <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400 font-medium">
                      <strong>Obs:</strong> {tie.observations}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          {((familyTies || []).filter(t => !familyPatientFilter || t.patientId === familyPatientFilter || t.patientIds?.includes(familyPatientFilter)).length === 0) && (
            <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-400 dark:text-gray-500 font-bold">Nenhum vínculo familiar registrado para os filtros selecionados.</p>
            </div>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          {/* Bulk action strip for Visits */}
          {selectedVisitIds.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col sm:flex-row gap-4 items-center justify-between p-5 bg-gray-900 text-white rounded-3xl shadow-xl dark:bg-gray-950 border border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div className="p-3 bg-red-600/20 text-red-400 rounded-2xl">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-widest text-red-400">Ações em Lote Ativas</p>
                  <p className="text-xs text-gray-400">{selectedVisitIds.length} {selectedVisitIds.length === 1 ? 'visita selecionada' : 'visitas selecionadas'}</p>
                </div>
              </div>
              <div className="flex w-full sm:w-auto justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedVisitIds([])}
                  className="px-4 py-2.5 text-xs font-black uppercase tracking-wider hover:bg-gray-800 dark:hover:bg-gray-900 rounded-xl transition-all"
                >
                  Limpar Seleção
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    const selectedCurrentView = selectedVisitIds.filter(id => (familyVisits || []).some(v => v.id === id));
                    if (selectedCurrentView.length === 0) return;
                    if (window.confirm(`Deseja realmente excluir os ${selectedCurrentView.length} registros de visitas selecionados?`)) {
                      try {
                        for (const id of selectedCurrentView) {
                          await onDeleteRecord('socialFamilyVisits', id);
                        }
                        showToast(`${selectedCurrentView.length} registros de visitas excluídos com sucesso!`, 'success');
                        setSelectedVisitIds(prev => prev.filter(id => !selectedCurrentView.includes(id)));
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao realizar a exclusão das visitas', 'error');
                      }
                    }
                  }}
                  className="px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-widest rounded-xl transition-all flex items-center gap-2 shadow-lg shadow-red-900/30"
                >
                  <Trash2 className="w-4 h-4" />
                  Excluir Selecionados
                </button>
              </div>
            </motion.div>
          )}

          {/* Inline visit adder */}
          <AnimatePresence>
            {isAddingVisit && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-gray-800/40 dark:to-gray-900/30 p-6 rounded-[32px] border border-green-100 dark:border-gray-800 space-y-4 mb-4">
                  <div className="flex items-center justify-between border-b border-green-100/80 dark:border-gray-800 pb-3">
                    <h4 className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-2">
                      <Plus className="w-5 h-5 text-green-600" />
                      Registrar Nova Visita Familiar
                    </h4>
                    <button 
                      type="button" 
                      onClick={() => setIsAddingVisit(false)}
                      className="p-1 px-3 text-xs bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 font-bold rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                    >
                      Fechar
                    </button>
                  </div>
                  
                  <form 
                    onSubmit={async (e) => {
                      e.preventDefault();
                      if (!newVisitForm.patientId) {
                        showToast('Selecione o idoso para a visita', 'error');
                        return;
                      }
                      if (!newVisitForm.visitorName) {
                        showToast('Preencha o nome do visitante', 'error');
                        return;
                      }
                      try {
                        const data = {
                          ...newVisitForm,
                          date: newVisitForm.date || new Date().toISOString()
                        };
                        await onSaveFamilyVisit(data);
                        setIsAddingVisit(false);
                        setNewVisitForm({
                          patientId: '',
                          date: format(new Date(), 'yyyy-MM-dd'),
                          visitorName: '',
                          kinship: '',
                          observations: ''
                        });
                        showToast('Registro de visita cadastrado com sucesso!', 'success');
                      } catch (err) {
                        console.error(err);
                        showToast('Erro ao cadastrar visita', 'error');
                      }
                    }} 
                    className="space-y-4"
                  >
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Idoso Visitado *</label>
                        <select
                          required
                          value={newVisitForm.patientId}
                          onChange={(e) => setNewVisitForm({ ...newVisitForm, patientId: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                        >
                          <option value="">Selecione o idoso</option>
                          {(patients || []).map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Data da Visita *</label>
                        <input
                          type="date"
                          required
                          value={newVisitForm.date}
                          onChange={(e) => setNewVisitForm({ ...newVisitForm, date: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Nome do Visitante *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Maria de Souza"
                          value={newVisitForm.visitorName}
                          onChange={(e) => setNewVisitForm({ ...newVisitForm, visitorName: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Parentesco / Relação *</label>
                        <input
                          type="text"
                          required
                          placeholder="Ex: Filho(a), Sobrinho(a)"
                          value={newVisitForm.kinship}
                          onChange={(e) => setNewVisitForm({ ...newVisitForm, kinship: e.target.value })}
                          className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Observações e Relato da Visita</label>
                      <textarea
                        value={newVisitForm.observations || ''}
                        onChange={(e) => setNewVisitForm({ ...newVisitForm, observations: e.target.value })}
                        placeholder="Quais foram as reações do idoso, assuntos tratados na visita ou necessidades identificadas..."
                        className="w-full text-xs p-3 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl h-20 resize-none font-medium focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-green-100/50 dark:border-gray-800">
                      <button
                        type="button"
                        onClick={() => setIsAddingVisit(false)}
                        className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                      >
                        Cancelar
                      </button>
                      <button
                        type="submit"
                        className="px-5 py-2 bg-green-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100 dark:shadow-none"
                      >
                        Salvar Registro de Visita
                      </button>
                    </div>
                  </form>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Master visits list table */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead className="bg-[#FAF9F6] dark:bg-gray-800 border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="p-4 pl-6 w-12 text-center">
                      <input 
                        type="checkbox"
                        checked={(familyVisits || []).filter(v => !visitPatientFilter || v.patientId === visitPatientFilter).length > 0 && (familyVisits || []).filter(v => !visitPatientFilter || v.patientId === visitPatientFilter).every(v => selectedVisitIds.includes(v.id))}
                        onChange={(e) => {
                          const tableVisits = (familyVisits || []).filter(v => !visitPatientFilter || v.patientId === visitPatientFilter);
                          if (e.target.checked) {
                            const toAdd = tableVisits.map(v => v.id);
                            setSelectedVisitIds(prev => Array.from(new Set([...prev, ...toAdd])));
                          } else {
                            const toRemove = tableVisits.map(v => v.id);
                            setSelectedVisitIds(prev => prev.filter(id => !toRemove.includes(id)));
                          }
                        }}
                        className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                      />
                    </th>
                    <th className="px-5 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-36">Data</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-64">Idoso</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Visitante</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest w-40">Parentesco</th>
                    <th className="px-5 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest">Observações</th>
                    <th className="px-6 py-4 text-xs font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest text-right w-36">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(familyVisits || []).filter(v => !visitPatientFilter || v.patientId === visitPatientFilter || v.patientIds?.includes(visitPatientFilter)).map((visit) => {
                    const patient = (patients || []).find(p => p.id === visit.patientId);
                    const isEditing = editingVisitId === visit.id;

                    return (
                      <tr 
                        key={visit.id} 
                        className={cn(
                          "hover:bg-gray-50/50 dark:hover:bg-gray-800/30 transition-colors",
                          isEditing && "bg-blue-50/50 dark:bg-blue-950/20",
                          selectedVisitIds.includes(visit.id) && "bg-red-50/20 dark:bg-red-950/10 font-bold"
                        )}
                      >
                        {/* Checkbox column */}
                        <td className="p-4 pl-6 w-12 text-center">
                          <input 
                            type="checkbox"
                            checked={selectedVisitIds.includes(visit.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedVisitIds(prev => [...prev, visit.id]);
                              } else {
                                setSelectedVisitIds(prev => prev.filter(item => item !== visit.id));
                              }
                            }}
                            className="w-4 h-4 rounded border-gray-300 dark:border-gray-700 text-blue-600 focus:ring-blue-500 cursor-pointer"
                          />
                        </td>

                        {/* Date column */}
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-400 font-bold tracking-tighter">
                          {isEditing ? (
                            <input
                              type="date"
                              required
                              value={inlineVisitForm.date ? inlineVisitForm.date.substring(0, 10) : ''}
                              onChange={(e) => setInlineVisitForm({ ...inlineVisitForm, date: e.target.value })}
                              className="text-xs p-2 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white font-bold w-full focus:ring-2 focus:ring-green-500 outline-none"
                            />
                          ) : (
                            <div className="flex items-center gap-2">
                              <Calendar className="w-3.5 h-3.5 text-gray-400" />
                              <span>{safeFormat(visit.date, 'dd/MM/yyyy')}</span>
                            </div>
                          )}
                        </td>

                        {/* Patient column */}
                        <td className="px-5 py-4 font-black text-gray-900 dark:text-white uppercase tracking-tight capitalize">
                          {isEditing ? (
                            <select
                              value={inlineVisitForm.patientId || ''}
                              onChange={(e) => setInlineVisitForm({ ...inlineVisitForm, patientId: e.target.value })}
                              className="text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold w-full focus:ring-2 focus:ring-green-500 outline-none"
                            >
                              {(patients || []).map(p => (
                                <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-gray-900 dark:text-white truncate font-bold text-sm tracking-tight">
                              {visit.patientIds && visit.patientIds.length > 1
                                ? visit.patientIds.map(pid => {
                                    const pat = (patients || []).find(p => p.id === pid);
                                    const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
                                    return lk?.name || pat?.name;
                                  }).filter(Boolean).join(', ')
                                : (patient?.name || 'Não identificado')}
                            </span>
                          )}
                        </td>

                        {/* Visitor Name column */}
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 font-bold capitalize">
                          {isEditing ? (
                            <input
                              type="text"
                              required
                              value={inlineVisitForm.visitorName || ''}
                              onChange={(e) => setInlineVisitForm({ ...inlineVisitForm, visitorName: e.target.value })}
                              className="text-xs p-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                            />
                          ) : (
                            <span>{visit.visitorName}</span>
                          )}
                        </td>

                        {/* Kinship column */}
                        <td className="px-5 py-4 text-sm text-gray-600 dark:text-gray-300 capitalize">
                          {isEditing ? (
                            <input
                              type="text"
                              required
                              value={inlineVisitForm.kinship || ''}
                              onChange={(e) => setInlineVisitForm({ ...inlineVisitForm, kinship: e.target.value })}
                              className="text-xs p-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                            />
                          ) : (
                            <span>{visit.kinship}</span>
                          )}
                        </td>

                        {/* Observations column */}
                        <td className="px-5 py-4">
                          {isEditing ? (
                            <input
                              type="text"
                              value={inlineVisitForm.observations || ''}
                              onChange={(e) => setInlineVisitForm({ ...inlineVisitForm, observations: e.target.value })}
                              className="text-xs p-2.5 w-full rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-850 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                            />
                          ) : (
                            <p className="text-xs text-gray-500 dark:text-gray-400 font-medium max-w-xs truncate" title={visit.observations}>
                              {visit.observations || '--'}
                            </p>
                          )}
                        </td>

                        {/* Actions column */}
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (!inlineVisitForm.patientId || !inlineVisitForm.visitorName) {
                                      showToast('Campos obrigatórios não preenchidos!', 'error');
                                      return;
                                    }
                                    try {
                                      await onSaveFamilyVisit(inlineVisitForm, visit.id);
                                      setEditingVisitId(null);
                                      setInlineVisitForm({});
                                      showToast('Visita familiar atualizada com sucesso!', 'success');
                                    } catch (err) {
                                      console.error(err);
                                      showToast('Erro ao atualizar a visita', 'error');
                                    }
                                  }}
                                  className="p-2 text-green-600 bg-green-50 hover:bg-green-100 dark:bg-green-900/20 dark:hover:bg-green-900/40 rounded-xl transition-all shadow-sm border border-green-100 dark:border-none"
                                  title="Salvar"
                                >
                                  <Check className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVisitId(null);
                                    setInlineVisitForm({});
                                  }}
                                  className="p-2 text-gray-500 bg-gray-50 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-700 rounded-xl transition-all"
                                  title="Cancelar"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingVisitId(visit.id);
                                    setInlineVisitForm({ ...visit });
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                  title="Editar instantaneamente"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (window.confirm(`Deseja realmente excluir a visita de ${visit.visitorName}?`)) {
                                      onDeleteRecord('socialFamilyVisits', visit.id);
                                      showToast('Visita excluída com sucesso!', 'success');
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                  title="Excluir"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}

                  {((familyVisits || []).filter(v => !visitPatientFilter || v.patientId === visitPatientFilter).length === 0) && (
                    <tr>
                      <td colSpan={7} className="px-6 py-16 text-center">
                        <div className="flex flex-col items-center justify-center space-y-2">
                          <Calendar className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                          <p className="text-sm text-gray-400 dark:text-gray-500 font-bold italic">Nenhum registro de visita filtrado.</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderLegalSituationOnly = () => (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {(legalSituations || []).filter(l => !legalPatientFilter || l.patientId === legalPatientFilter).map((legal) => {
        const patient = (patients || []).find(p => p.id === legal.patientId);
        return (
          <div key={legal.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                  <Scale className="w-6 h-6 text-purple-500" />
                </div>
                <div>
                  <h4 className="font-bold text-gray-900 dark:text-white capitalize tracking-tight">{patient?.name}</h4>
                  <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">Status: {legal.situationStatus}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase border",
                  legal.isInterdicted ? "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800" : "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800"
                )}>
                  {legal.isInterdicted ? 'Interditado' : 'Não Interditado'}
                </span>
                <button
                  onClick={() => openModal('legal', legal)}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  title="Editar"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDeleteRecord('socialLegalSituations', legal.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Excluir"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-widest">Curador</p>
                <p className="font-black text-gray-700 dark:text-gray-300 capitalize">{legal.curatorName || 'Não possui'}</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-1 tracking-widest">Processo</p>
                <p className="font-black text-gray-700 dark:text-gray-300">{legal.processNumber || 'N/A'}</p>
              </div>
            </div>
          </div>
        );
      })}
      {((legalSituations || []).filter(l => !legalPatientFilter || l.patientId === legalPatientFilter).length === 0) && (
        <div className="col-span-full py-12 text-center bg-gray-50 dark:bg-gray-800/20 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
          <p className="text-sm text-gray-400 dark:text-gray-500 font-bold">Nenhuma situação legal registrada para os filtros selecionados.</p>
        </div>
      )}
    </div>
  );

  const renderPatients = () => {
    if (selectedPatient) {
      const patientFamily = (familyTies || []).find(f => f.patientId === selectedPatient.id);
      const patientDocs = (documentations || []).find(d => d.patientId === selectedPatient.id);
      const patientLegal = (legalSituations || []).find(l => l.patientId === selectedPatient.id);
      const patientStudy = (socialStudies || []).find(s => s.patientId === selectedPatient.id);
      const patientEvolutions = (evolutions || []).filter(e => e.patientId === selectedPatient.id);
      const linkedElderly = selectedPatient.elderlyId ? (elderly || []).find(e => e.id === selectedPatient.elderlyId) : null;
      const name = linkedElderly?.name || selectedPatient.name;
      const birthDate = linkedElderly?.birthDate || selectedPatient.birthDate;
      const age = birthDate ? (new Date().getFullYear() - new Date(birthDate).getFullYear()) : 0;
      const photoUrl = linkedElderly?.photo || selectedPatient.photoUrl;

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
                  {photoUrl ? (
                    <img src={photoUrl} alt={name || selectedPatient.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-16 h-16 text-blue-400 mt-6 mx-auto" />
                  )}
                </div>
                <div className="flex flex-col items-center gap-1 mb-2">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">{name || selectedPatient.name}</h3>
                  {linkedElderly && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase rounded tracking-widest border border-blue-200">Vinculado ao Cadastro Geral</span>
                  )}
                </div>
                <button
                  onClick={() => handleDownloadPatientProfile(selectedPatient)}
                  className="w-full mb-4 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all font-bold text-xs"
                >
                  <Download size={16} />
                  Baixar Ficha Cadastral Social
                </button>
                <p className="text-sm text-gray-500 mb-4">{safeFormat(birthDate, 'dd/MM/yyyy')} ({age} anos)</p>
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
                <h4 className="font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                  <Info className="w-5 h-5 text-blue-600" />
                  Informações Básicas
                </h4>
                <div className="space-y-4 text-sm">
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Naturalidade</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedPatient.naturalness}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Escolaridade</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedPatient.schooling}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Profissão</span>
                    <span className="font-bold text-gray-900 dark:text-white">{selectedPatient.previousProfession}</span>
                  </div>
                  <div className="flex justify-between py-2 border-b border-gray-50">
                    <span className="text-gray-500">Renda Mensal</span>
                    <span className="font-bold text-green-600">R$ {Number(selectedPatient.income || 0).toLocaleString()}</span>
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
                            {(patientFamily.members || []).map(m => (
                              <div key={m.id} className="p-3 bg-gray-50 rounded-xl border border-gray-100">
                                <p className="font-bold text-gray-900 dark:text-white">{m.name} ({m.kinship})</p>
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
                        <span className="text-xs text-gray-400 dark:text-gray-500 font-bold">{safeFormat(evo.date, 'dd/MM/yyyy')}</span>
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
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar idoso..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none text-gray-900 dark:text-white font-black"
          />
        </div>
        <button
          onClick={() => openModal('patient')}
          className="flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 dark:shadow-none active:scale-95"
        >
          <Plus className="w-5 h-5" />
          <span className="font-bold">Novo Cadastro Social</span>
        </button>
      </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => {
            const linkedElderly = patient.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
            const name = linkedElderly?.name || patient.name;
            const birthDate = linkedElderly?.birthDate || patient.birthDate;

            return (
              <motion.div
                key={patient.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer group relative"
                onClick={() => setSelectedPatient(patient)}
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-4">
                      <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-100 group-hover:border-blue-300 transition-colors">
                        {(() => {
                          const photoUrl = linkedElderly?.photo || patient.photoUrl;
                          return photoUrl ? (
                            <img src={photoUrl} alt={name} className="w-full h-full object-cover" />
                          ) : (
                            <UserIcon className="w-8 h-8 text-blue-400" />
                          );
                        })()}
                      </div>
                      <div className="max-w-[120px]">
                        <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight truncate">{name}</h4>
                        <p className="text-sm text-gray-500 dark:text-gray-400 font-bold">{safeFormat(birthDate, 'dd/MM/yyyy')}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <div className={cn(
                        "px-2 py-1 rounded-full text-[10px] font-black uppercase tracking-wider",
                        patient.benefitStatus === 'ATIVO' ? "bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400" :
                        patient.benefitStatus === 'SUSPENSO' ? "bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400" :
                        "bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-400"
                      )}>
                        {safeReplace(patient.benefitStatus, '_', ' ') || 'ATIVO'}
                      </div>
                      {linkedElderly && (
                        <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[8px] font-black uppercase rounded">Vinculado</span>
                      )}
                    </div>
                  </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    <MapPin className="w-4 h-4 text-blue-500 dark:text-blue-400" />
                    <span>{patient.naturalness}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400 font-medium">
                    <DollarSign className="w-4 h-4 text-green-500 dark:text-green-400" />
                    <span>R$ {Number(patient.income || 0).toLocaleString()} ({(Array.isArray(patient.benefits) ? patient.benefits.join(', ') : 'Nenhum')})</span>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button 
                    onClick={() => setSelectedPatient(patient)}
                    className="flex-1 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-sm font-black hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors uppercase tracking-widest"
                  >
                    Ver Prontuário Social
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownloadPatientProfile(patient);
                    }}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                    title="Baixar Ficha"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDeletePatient(patient.id);
                    }}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </motion.div>
          )
        })}
        </div>
      </div>
    );
  };

  const renderSocialStudy = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Estudo Social</h3>
          <select
            value={studyPatientFilter}
            onChange={(e) => setStudyPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Filtrar p/ Idoso</option>
            {(patients || []).map((p: any) => {
              const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
              return (
                <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
              );
            })}
          </select>
        </div>
        <button
          onClick={() => openModal('study')}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-100 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Novo Estudo
        </button>
      </div>

      <div className="space-y-6">
        {(socialStudies || []).filter(s => !studyPatientFilter || s.patientId === studyPatientFilter || s.patientIds?.includes(studyPatientFilter)).map((study) => {
          const patient = (patients || []).find(p => p.id === study.patientId);
          return (
            <div key={study.id} className="bg-white dark:bg-gray-900 p-8 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm transition-all hover:shadow-md">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-blue-50 dark:bg-blue-900/30 flex items-center justify-center">
                    <BookOpen className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div>
                    <h4 className="text-lg font-bold text-gray-900 dark:text-white uppercase tracking-tight capitalize">
                      {study.patientIds && study.patientIds.length > 1
                        ? study.patientIds.map(pid => {
                            const pat = (patients || []).find(p => p.id === pid);
                            const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
                            return lk?.name || pat?.name;
                          }).filter(Boolean).join(', ')
                        : (() => {
                            const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
                            return linked?.name || patient?.name || 'Não cadastrado';
                          })()}
                    </h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-0.5">Realizado em {safeFormat(study.date, 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openModal('study', study)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDownloadSocialStudy(study)}
                    className="p-2 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    title="Baixar Estudo Social"
                  >
                    <Download className="w-5 h-5 text-blue-600" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord('socialStudies', study.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
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
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Evolução Social</h3>
          <select
            value={evolutionPatientFilter}
            onChange={(e) => setEvolutionPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Ver Todas</option>
            <option value="GENERAL">Fluxo de Atendimento Geral</option>
            {(patients || []).map((p: any) => {
              const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
              return (
                <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
              );
            })}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadAllFilteredEvolutions}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold shadow-lg shadow-green-100 dark:shadow-none"
            title="Baixar todas as evoluções filtradas"
          >
            <Download size={18} />
            Baixar Tudo
          </button>
          <button
            onClick={() => openModal('evolution')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors font-bold shadow-lg shadow-blue-100 dark:shadow-none"
          >
            <Activity className="w-5 h-5" />
            Fluxo Geral
          </button>
          <button
            onClick={() => openModal('evolution')}
            className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition-colors font-bold shadow-lg shadow-gray-100 dark:shadow-none"
          >
            <Plus className="w-5 h-5" />
            Nova Evolução (Idoso)
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 overflow-hidden shadow-sm">
        <div className="divide-y divide-gray-100 dark:divide-gray-800">
          {(evolutions || []).filter(e => {
            if (evolutionPatientFilter === 'GENERAL') return !e.patientId;
            return !evolutionPatientFilter || e.patientId === evolutionPatientFilter || e.patientIds?.includes(evolutionPatientFilter);
          }).map((evolution) => {
            const patient = (patients || []).find(p => p.id === evolution.patientId);
            const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
            const displayName = !evolution.patientId 
              ? 'Fluxo de Atendimento Geral'
              : (evolution.patientIds && evolution.patientIds.length > 1
                  ? evolution.patientIds.map(pid => {
                      const pat = (patients || []).find(p => p.id === pid);
                      const lk = pat?.elderlyId ? (elderly || []).find(ed => ed.id === pat.elderlyId) : null;
                      return lk?.name || pat?.name;
                    }).filter(Boolean).join(', ')
                  : (linked?.name || patient?.name || 'Idoso não encontrado'));
            
            return (
              <div key={evolution.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-10 h-10 rounded-full flex items-center justify-center",
                      !evolution.patientId ? "bg-blue-100 dark:bg-blue-900/30" : "bg-gray-100 dark:bg-gray-800"
                    )}>
                      {!evolution.patientId ? (
                        <Activity className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                      ) : (
                        <ClipboardList className="w-5 h-5 text-gray-500 dark:text-gray-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900 dark:text-white">{displayName}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{safeFormat(evolution.date, "dd 'de' MMMM 'às' HH:mm")}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 flex-wrap md:flex-nowrap justify-end">
                    <span className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold uppercase mr-1">
                      {evolution.serviceType}
                    </span>
                    <button
                      onClick={() => setViewingEvo(evolution)}
                      className="p-2 text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-xl transition-colors shrink-0"
                      title="Visualizar 👁️"
                    >
                      <Eye className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDownloadEvolution(evolution)}
                      className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors shrink-0"
                      title="Baixar PDF 📥"
                    >
                      <Download className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => openModal('evolution', evolution)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors shrink-0"
                      title="Editar ✏️"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => setDeleteConfirm({ id: evolution.id, collection: 'socialEvolutions', label: 'Evolução do Serviço Social' })}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shrink-0"
                      title="Excluir 🗑️"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
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
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Encaminhamentos</h3>
          <select
            value={referralPatientFilter}
            onChange={(e) => setReferralPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Filtrar p/ Idoso</option>
            {(patients || []).map((p: any) => {
              const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
              return (
                <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
              );
            })}
          </select>
        </div>
        <button
          onClick={() => openModal('referrals')}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-xl hover:bg-purple-700 transition-colors shadow-lg shadow-purple-100 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Novo Encaminhamento
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(referrals || []).filter(r => !referralPatientFilter || r.patientId === referralPatientFilter || r.patientIds?.includes(referralPatientFilter)).map((referral) => {
          const patient = (patients || []).find(p => p.id === referral.patientId);
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
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase border",
                    referral.status === 'CONCLUIDO' ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800" :
                    referral.status === 'EM_ANDAMENTO' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800"
                  )}>
                    {safeReplace(referral.status, '_', ' ') || 'PENDENTE'}
                  </span>
                  <button
                    onClick={() => openModal('referrals', referral)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord('socialReferrals', referral.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>
              
              <h4 className="font-bold text-gray-900 dark:text-white mb-1 uppercase tracking-tight">{referral.destination}</h4>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4 font-black capitalize">
                {referral.patientIds && referral.patientIds.length > 1
                  ? referral.patientIds.map(pid => {
                      const pat = (patients || []).find(p => p.id === pid);
                      const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
                      return lk?.name || pat?.name;
                    }).filter(Boolean).join(', ')
                  : (patient?.name || 'Não cadastrado')}
              </p>
              
              <div className="flex-1 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl mb-4 border border-gray-100 dark:border-gray-700">
                <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-3 font-medium leading-relaxed">{referral.description}</p>
              </div>

              <div className="flex items-center justify-between text-xs text-gray-400 dark:text-gray-500 border-t border-gray-100 dark:border-gray-700 pt-3 mt-auto">
                <span className="font-black uppercase tracking-widest">{safeFormat(referral.date, 'dd/MM/yyyy')}</span>
                <button 
                  onClick={() => openModal('referrals', referral)}
                  className="text-blue-600 dark:text-blue-400 font-black hover:underline uppercase tracking-tighter"
                >
                  Ver Detalhes
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderRiskSituations = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Situações de Risco</h3>
          <select
            value={riskPatientFilter}
            onChange={(e) => setRiskPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Filtrar p/ Idoso</option>
            {(patients || []).map((p: any) => {
              const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
              return (
                <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
              );
            })}
          </select>
        </div>
        <button
          onClick={() => openModal('risk')}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors shadow-lg shadow-red-100 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Registrar Risco
        </button>
      </div>

      <div className="space-y-4">
        {(riskSituations || []).filter(r => !riskPatientFilter || r.patientId === riskPatientFilter || r.patientIds?.includes(riskPatientFilter)).map((risk) => {
          const patient = (patients || []).find(p => p.id === risk.patientId);
          return (
            <div key={risk.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border-l-4 border-l-red-500 shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-xl">
                    <AlertTriangle className="w-6 h-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-900 dark:text-white capitalize text-lg">
                      {risk.patientIds && risk.patientIds.length > 1
                        ? risk.patientIds.map(pid => {
                            const pat = (patients || []).find(p => p.id === pid);
                            const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
                            return lk?.name || pat?.name;
                          }).filter(Boolean).join(', ')
                        : (patient?.name || 'Não cadastrado')}
                    </h4>
                    <p className="text-sm font-black text-red-600 dark:text-red-400 uppercase tracking-widest">{risk.type}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      "px-3 py-1 rounded-full text-xs font-black uppercase border",
                      risk.severity === 'ALTA' ? "bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-400 border-red-100 dark:border-red-800" :
                      risk.severity === 'MEDIA' ? "bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800" :
                      "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800"
                    )}>
                      Gravidade {risk.severity}
                    </span>
                    <button
                      onClick={() => openModal('risk', risk)}
                      className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                      title="Editar"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => onDeleteRecord('socialRisks', risk.id)}
                      className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                      title="Excluir"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  <span className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase tracking-widest">{safeFormat(risk.date, 'dd/MM/yyyy')}</span>
                </div>
              </div>
              <p className="text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700 font-medium leading-relaxed">{risk.description}</p>
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 dark:border-gray-700 pt-3">
                <span className="text-xs font-black text-gray-400 uppercase tracking-tighter">Status: <span className="text-gray-700 dark:text-gray-300">{safeReplace(risk.status, '_', ' ') || 'EM ANÁLISE'}</span></span>
                <button 
                  onClick={() => openModal('risk', risk)}
                  className="text-blue-600 dark:text-blue-400 text-sm font-black hover:underline uppercase tracking-tighter"
                >
                  Atualizar Acompanhamento
                </button>
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
        <div className="flex items-center gap-4">
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Plano Individual de Atendimento (PIA)</h3>
          <select
            value={piaPatientFilter}
            onChange={(e) => setPiaPatientFilter(e.target.value)}
            className="text-xs p-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 font-bold focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
          >
            <option value="">Filtrar p/ Idoso</option>
            {(patients || []).map((p: any) => {
              const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
              return (
                <option key={p.id} value={p.id}>{linked?.name || p.name}</option>
              );
            })}
          </select>
        </div>
        <button
          onClick={() => openModal('pia')}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors shadow-lg shadow-green-100 dark:shadow-none font-bold"
        >
          <Plus className="w-5 h-5" />
          Novo PIA
        </button>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {(pias || []).filter(p => !piaPatientFilter || p.elderlyId === piaPatientFilter).map((pia) => {
          if (!pia || !pia.id) return null;
          const patient = (patients || []).find(p => p.id === pia.elderlyId);
          return (
            <div key={pia.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <ClipboardList className="w-6 h-6 text-green-600 dark:text-green-400" />
                  </div>
                  <div>
                    <h4 className="font-black text-gray-900 dark:text-white text-lg capitalize">{patient?.name || 'Idoso não encontrado'}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 font-bold mt-0.5">Data: {safeFormat(pia.date, 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase border",
                    pia.status === 'CONCLUIDO' ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-100 dark:border-green-800" :
                    pia.status === 'EM_ANDAMENTO' ? "bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-100 dark:border-blue-800" :
                    "bg-orange-50 dark:bg-orange-900/20 text-orange-700 dark:text-orange-400 border-orange-100 dark:border-orange-800"
                  )}>
                    {safeReplace(pia.status, '_', ' ') || 'EM_ANDAMENTO'}
                  </span>
                  <button 
                    onClick={() => openModal('pia', pia)}
                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                    title="Editar"
                  >
                    <Edit2 className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => handleDownloadPIA(pia)}
                    className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                    title="Baixar PIA"
                  >
                    <Download className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => onDeleteRecord('socialPIAs', pia.id)}
                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                    title="Excluir"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Situação Financeira</p>
                  <div className="space-y-1">
                    <p className="text-sm flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-bold">BPC:</span>
                      <span className="font-black text-gray-900 dark:text-white uppercase text-[10px]">{pia.hasBPC ? 'Sim' : 'Não'}</span>
                    </p>
                    <p className="text-sm flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-bold">Aposentadoria:</span>
                      <span className="font-black text-gray-900 dark:text-white uppercase text-[10px]">{pia.hasPension ? 'Sim' : 'Não'}</span>
                    </p>
                    <p className="text-sm flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-bold">Renda:</span>
                      <span className="font-black text-gray-900 dark:text-white">R$ {Number(pia.monthlyIncome || 0).toLocaleString('pt-BR')}</span>
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Vínculo Familiar</p>
                  <div className="space-y-1">
                    <p className="text-sm flex items-center justify-between">
                      <span className="text-gray-500 dark:text-gray-400 font-bold">Envolvimento:</span>
                      <span className="font-black text-gray-900 dark:text-white uppercase text-[10px]">{pia.familyInvolvement || 'MÉDIO'}</span>
                    </p>
                  </div>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700">
                  <p className="text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase mb-2 tracking-widest">Responsável</p>
                  <p className="text-sm font-black text-gray-700 dark:text-gray-300 capitalize">{pia.responsible || 'Coordenadora'}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <h5 className="text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Objetivos</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{pia.objectives || 'Sem objetivos descritos'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-xl border border-gray-100 dark:border-gray-700">
                  <h5 className="text-xs font-black text-gray-400 uppercase mb-2 tracking-widest">Ações</h5>
                  <p className="text-sm text-gray-700 dark:text-gray-300 font-medium leading-relaxed">{pia.actions || 'Sem ações propostas'}</p>
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
        <h3 className="text-xl font-bold text-gray-900 dark:text-white uppercase tracking-tighter">Gerenciamento de Benefícios e Renda</h3>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {patients.map((patient) => (
          <div key={patient.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-green-50 dark:bg-green-900/20 flex items-center justify-center border border-green-100 dark:border-green-800">
                  <Receipt className="w-7 h-7 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{patient.name}</h4>
                  <p className="text-xs text-gray-500 font-bold">Renda: <span className="text-green-600">R$ {Number(patient.income || 0).toLocaleString()}</span></p>
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openModal('patient', patient)}
                  className="p-3 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-2xl transition-colors border border-transparent hover:border-blue-100"
                  title="Editar Benefícios"
                >
                  <Edit2 className="w-5 h-5" />
                </button>
                <button
                  onClick={() => onDeletePatient(patient.id)}
                  className="p-3 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors"
                  title="Excluir Idoso"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Status do Benefício</p>
                <span className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-black uppercase inline-block",
                  patient.benefitStatus === 'ATIVO' ? "bg-green-100 text-green-700" :
                  patient.benefitStatus === 'SUSPENSO' ? "bg-red-100 text-red-700" :
                  "bg-gray-100 text-gray-700"
                )}>
                  {safeReplace(patient.benefitStatus, '_', ' ')}
                </span>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Acompanhamento INSS</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{patient.inssMonitoring || 'Não registrado'}</p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">CadÚnico</p>
                <p className="text-xs font-bold text-gray-700 dark:text-gray-300">
                  {patient.cadUnicoUpdateDate ? `Atu: ${format(parseISO(patient.cadUnicoUpdateDate), 'dd/MM/yy')}` : 'Não atualizado'}
                </p>
              </div>

              <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Empréstimos</p>
                <div className="flex items-center gap-2">
                  <span className={cn(
                    "w-2 h-2 rounded-full",
                    patient.hasLoans ? "bg-red-500" : "bg-green-500"
                  )} />
                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{patient.hasLoans ? 'Sim' : 'Não'}</p>
                </div>
              </div>
            </div>

            {patient.isFamilyComplementing && (
              <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/20">
                <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase mb-1">Complemento Familiar</p>
                <p className="text-xs font-bold text-blue-800 dark:text-blue-200">{patient.familyComplementDetails || 'Família auxilia no sustento/medicação.'}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => {
    const prepareReportData = () => {
      if ((patients || []).length === 0) return null;
      
      let filtered = (patients || []);
      if (reportsPatientFilter) {
        filtered = filtered.filter(p => p.id === reportsPatientFilter);
      }

      return filtered.map(p => {
        const patientEvolutions = (evolutions || []).filter(e => e.patientId === p.id);
        const patientReferrals = (referrals || []).filter(r => r.patientId === p.id);
        const age = p.birthDate ? differenceInYears(new Date(), parseISO(p.birthDate)) : 'N/A';
        return [
          p.name,
          String(age),
          String(patientEvolutions.length),
          String(patientReferrals.length),
          p.status
        ];
      });
    };

    const handleGeneratePDF = async (title: string) => {
      // Find the specific patient if a filter is active
      const patient = reportsPatientFilter ? patients.find(p => p.id === reportsPatientFilter) : null;
      
      if (title === 'Prontuário Social Individual') {
        if (patient) {
          await handleDownloadPatientProfile(patient);
        } else {
          showToast('Selecione um idoso no filtro acima para gerar o prontuário individual', 'error');
        }
        return;
      }

      if (title === 'Relatório Social Individual') {
        if (patient) {
          await handleDownloadSocialReport(patient);
        } else {
          showToast('Selecione um idoso no filtro acima para gerar o relatório individual', 'error');
        }
        return;
      }

      if (title === 'Estudo Social Técnico') {
        if (patient) {
          const study = socialStudies.find(s => s.patientId === patient.id);
          if (study) {
            await handleDownloadSocialStudy(study);
          } else {
            showToast('Nenhum estudo social encontrado para este idoso', 'error');
          }
        } else {
          showToast('Selecione um idoso no filtro acima para gerar o estudo social individual', 'error');
        }
        return;
      }

      if (title === 'Plano Individual - PIA') {
        if (patient) {
          const pia = pias.find(p => p.elderlyId === patient.id);
          if (pia) {
            await handleDownloadPIA(pia);
          } else {
            showToast('Nenhum PIA encontrado para este idoso', 'error');
          }
        } else {
          showToast('Selecione um idoso no filtro acima para gerar o PIA individual', 'error');
        }
        return;
      }

      if (title === 'Relatório de Vínculo Familiar') {
        if (patient) {
          await handleDownloadFamilyBondReport(patient);
        } else {
          showToast('Selecione um idoso no filtro acima para gerar o relatório de vínculo', 'error');
        }
        return;
      }

      const data = prepareReportData();
      if (!data) return;

      const subtitle = `Relatório de Serviço Social - ${format(new Date(), "dd/MM/yyyy")}${reportsPatientFilter ? ` - Paciente: ${patients.find(p => p.id === reportsPatientFilter)?.name}` : ''}`;

      await generateModernPDF({
        title,
        subtitle,
        columns: ['Paciente', 'Idade', 'Evoluções', 'Encaminhamentos', 'Status'],
        data,
        fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
      });
    };

    const handleGenerateWord = async (title: string) => {
      const data = prepareReportData();
      if (!data) return;

      const subtitle = `Relatório de Serviço Social - ${format(new Date(), "dd/MM/yyyy")}${reportsPatientFilter ? ` - Paciente: ${patients.find(p => p.id === reportsPatientFilter)?.name}` : ''}`;

      await generateModernWord({
        title,
        subtitle,
        columns: ['Paciente', 'Idade', 'Evoluções', 'Encaminhamentos', 'Status'],
        data,
        fileName: safeReplace(title.toLowerCase(), /\s/g, '_')
      });
    };

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-8 rounded-[40px] text-white shadow-xl shadow-blue-100 dark:shadow-none mb-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h3 className="text-2xl font-black uppercase tracking-tight mb-2">Central de Relatórios</h3>
              <p className="text-blue-100 font-medium">Gere documentos técnicos e relatórios gerenciais do Serviço Social</p>
            </div>
            <div className="flex flex-col gap-2 bg-white/10 p-4 rounded-3xl backdrop-blur-md border border-white/20">
              <label className="text-[10px] font-black uppercase tracking-widest text-blue-100 ml-1">Filtrar por Idoso</label>
              <div className="flex items-center gap-3 bg-white dark:bg-gray-900 px-4 py-2 rounded-2xl">
                <Filter size={16} className="text-gray-400" />
                <select 
                  value={reportsPatientFilter}
                  onChange={(e) => setReportsPatientFilter(e.target.value)}
                  className="text-xs font-bold bg-transparent border-none focus:ring-0 text-gray-800 dark:text-white min-w-[200px] outline-none"
                >
                  <option value="">TODOS OS IDOSOS (GERAL)</option>
                  {patients.map(p => (
                    <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-8 rounded-[40px] border border-gray-100 dark:border-gray-800 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-end gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                  <History size={24} />
                </div>
                <div>
                  <h4 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Extração de Evoluções em Lote</h4>
                  <p className="text-sm text-gray-500">Baixe todas as evoluções detalhadas de um período específico.</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Inicial</label>
                  <input 
                    type="date" 
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Data Final</label>
                  <input 
                    type="date" 
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="w-full bg-gray-50 dark:bg-gray-800 border-none rounded-xl px-4 py-3 text-sm font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                  />
                </div>
              </div>
            </div>
            <button 
              onClick={handleDownloadBulkEvolutions}
              className="flex items-center justify-center gap-3 px-8 py-4 bg-green-600 text-white rounded-[32px] font-black uppercase tracking-widest text-xs hover:bg-green-700 active:scale-95 transition-all shadow-xl shadow-green-100 dark:shadow-none h-[52px]"
            >
              <Download size={18} />
              Baixar Evoluções Detalhadas
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {[
            { title: 'Prontuário Social Individual', desc: 'Ficha detalhada com todos os dados cadastrais e sociais.', icon: Users, color: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400' },
            { title: 'Relatório Social Individual', desc: 'Histórico consolidado, encaminhamentos e evolução do idoso.', icon: FileText, color: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' },
            { title: 'Plano Individual - PIA', desc: 'Plano Individual de Atendimento detalhado para impressão.', icon: ClipboardList, color: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400' },
            { title: 'Estudo Social Técnico', desc: 'Análise aprofundada para fins judiciais ou de rede.', icon: BookOpen, color: 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400' },
            { title: 'Relatório Conselhos/MP', desc: 'Documento padronizado para órgãos de fiscalização.', icon: Scale, color: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400' },
            { title: 'Relatório de Vínculo Familiar', desc: 'Histórico de visitas e contatos com a família.', icon: Heart, color: 'bg-pink-50 dark:bg-pink-900/30 text-pink-600 dark:text-pink-400' },
          ].map((report, i) => (
            <motion.div 
              key={i} 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white dark:bg-gray-900 p-6 rounded-[32px] border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-xl transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start gap-4 mb-6">
                  <div className={cn("p-4 rounded-2xl transition-colors", report.color)}>
                    <report.icon className="w-8 h-8" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-black text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors uppercase tracking-tight text-lg">{report.title}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 font-medium leading-relaxed">{report.desc}</p>
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-4">
                <button 
                  onClick={() => handleGeneratePDF(report.title)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Gerar PDF
                </button>
                <button 
                  onClick={() => handleGenerateWord(report.title)}
                  className="flex-1 flex items-center justify-center gap-2 py-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-green-100 transition-colors"
                >
                  <FileCheck className="w-4 h-4" />
                  Gerar Word
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 lg:gap-8">
      <aside className="w-full lg:w-64 flex lg:flex-col overflow-x-auto lg:overflow-y-auto lg:overflow-x-visible pb-4 lg:pb-0 gap-2 -mx-4 px-4 md:mx-0 md:px-0 custom-scrollbar snap-x scroll-smooth sticky top-0 bg-gray-50 dark:bg-gray-950 z-10 lg:static lg:bg-transparent">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'profile', label: 'Perfil do Idoso', icon: Users },
          { id: 'pia', label: 'PIA', icon: ClipboardList },
          { id: 'family', label: 'Vínculos e Visitas', icon: Heart },
          { id: 'docs', label: 'Doc. e Situação Legal', icon: FileText },
          { id: 'study', label: 'Estudo Social', icon: BookOpen },
          { id: 'evolution', label: 'Evolução', icon: ClipboardList },
          { id: 'referrals', label: 'Encaminhamentos', icon: Share2 },
          { id: 'risk', label: 'Situações de Risco', icon: ShieldAlert },
          { id: 'benefits', label: 'Benefícios', icon: Receipt },
          { id: 'productivity', label: 'Painel e Colaboração', icon: Award },
          { id: 'reports', label: 'Relatórios', icon: FileCheck },
          { id: 'settings', label: 'Configurações', icon: Settings },
        ].map((tab) => (
          <NavButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => {
              setActiveTab(tab.id as TabType);
              setFormData({});
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
            {activeTab === 'profile' && renderPatients()}
            {activeTab === 'pia' && renderPIA()}
            {activeTab === 'family' && renderFamilyTies()}
            {activeTab === 'docs' && renderDocumentationAndLegal()}
            {activeTab === 'study' && renderSocialStudy()}
            {activeTab === 'evolution' && renderEvolution()}
            {activeTab === 'referrals' && renderReferrals()}
            {activeTab === 'risk' && renderRiskSituations()}
            {activeTab === 'benefits' && renderBenefits()}
            {activeTab === 'productivity' && (
              <ProductivitySection
                user={user}
                professionals={professionals}
                nursingEvolutions={nursingEvolutions}
                physioEvolutions={physioEvolutions}
                psychEvolutions={psychEvolutions}
                pedagogyEvolutions={pedagogyEvolutions}
                socialEvolutions={evolutions}
                nutritionEvolutions={nutritionEvolutions}
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
                targetSector="Serviço Social"
                targetRole="ASSISTENTE_SOCIAL"
                psychActivities={props.psychActivities}
                pedagogyActivities={props.pedagogyActivities}
                onViewActivity={props.onViewActivity}
              />
            )}
            {activeTab === 'reports' && renderReports()}
          </motion.div>
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/50 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-xl w-full max-w-2xl max-h-[95vh] md:max-h-[90vh] overflow-hidden border dark:border-gray-800 flex flex-col"
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900 sticky top-0 z-10 font-black">
                <h3 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  {modalType === 'patient' || modalType === 'profile' ? 'Novo Cadastro de Idoso' : 
                   modalType === 'evolution' ? 'Nova Evolução Social' :
                   modalType === 'referral' ? 'Novo Encaminhamento' :
                   (modalType === 'visit' || modalType === 'visits') ? (formData.id ? 'Editar Registro de Visita' : 'Novo Registro de Visita') :
                   modalType === 'risk' ? 'Nova Situação de Risco' :
                   modalType === 'study' ? 'Novo Estudo Social' :
                   modalType === 'legal' ? 'Nova Situação Legal' :
                   modalType === 'family' ? 'Novo Vínculo Familiar' :
                   modalType === 'docs' ? 'Atualização de Documentos' :
                   modalType || activeTab}
                  {isExtracting && (
                    <span className="flex items-center gap-1 text-[10px] bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 px-2 py-0.5 rounded-full animate-pulse capitalize">
                      <Loader2 className="w-3 h-3 animate-spin" />
                      Salvando...
                    </span>
                  )}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X size={20} className="text-gray-900 dark:text-gray-100" />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto">
                {renderModalContent()}
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
                <div className="flex items-center gap-2 text-indigo-600">
                  <Scale size={24} />
                  <h3 className="text-xl font-bold text-gray-850 dark:text-white">Detalhes da Evolução Social</h3>
                </div>
                <button onClick={() => setViewingEvo(null)} className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">
                  <X size={20} className="text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Idoso</span>
                  <p className="text-base font-bold text-gray-800 dark:text-white">
                    {((patients || []).find(p => p.id === viewingEvo.patientId)?.name || 'N/A')}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Data / Horário</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingEvo.date} {viewingEvo.time ? ` às ${viewingEvo.time}` : ''}
                    </p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Registrado Por</span>
                    <p className="text-sm text-gray-800 dark:text-white font-medium">
                      {viewingEvo.registeredBy || 'Assistente Social'}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Tipo de Atendimento</span>
                    <p className="text-sm font-bold text-indigo-600 uppercase">
                      {viewingEvo.serviceType || 'Geral'}
                    </p>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-black uppercase text-gray-400">Descrição / Observação</span>
                  <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                    {viewingEvo.observation || viewingEvo.description}
                  </p>
                </div>

                {viewingEvo.conduct && (
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400">Conduta / Providência</span>
                    <p className="text-sm text-gray-755 dark:text-gray-350 leading-relaxed mt-1">
                      {viewingEvo.conduct}
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
                  className="px-6 py-2.5 bg-indigo-600 text-white font-black text-sm rounded-xl shadow-lg hover:bg-indigo-755 transition"
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
                  Tem certeza que deseja apagar o registro de <strong className="text-gray-700 dark:text-gray-300">"{deleteConfirm.label}"</strong>? Esta ação é definitiva e não pode ser desfeita.
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
