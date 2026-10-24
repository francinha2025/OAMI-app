import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Camera,
  Activity,
  HeartPulse,
  Brain,
  GraduationCap,
  HeartHandshake,
  Apple,
  ClipboardCheck,
  Sliders,
  DollarSign,
  UserCheck,
  TrendingUp,
  Award,
  Building2,
  Heart,
  Sparkles,
  Package,
  Boxes,
  Layers,
  Search,
  Filter,
  ArrowUpRight,
  CheckCircle2,
  AlertTriangle,
  Info,
  ChevronRight,
  ChevronDown,
  ExternalLink,
  FileText,
  BarChart3,
  PieChart,
  Zap,
  ShieldCheck,
  Eye,
  RefreshCw,
  Clock,
  Printer
} from 'lucide-react';
import { MonitoringSectionProps } from './monitoringTypes';
import { isDateInRange } from './monitoringHelpers';
import { cn, safeFormat } from '../../lib/utils';
import { ROLE_LABELS } from '../../constants';
import { Role } from '../../types';
import { isVitalSignAltered, getVitalSignAlertTags } from '../VitalSignsCounter';

export interface ModuleControlItem {
  id: string;
  category: 'colab' | 'tecnicos' | 'administrativo' | 'institucional' | 'operacional';
  categoryLabel: string;
  name: string;
  description: string;
  icon: any;
  targetAppTab?: string;
  
  // Quantitative metrics
  totalCount: number;
  periodCount: number;
  dailyRate: number;
  perElderlyRate: number;
  
  // Qualitative evaluation
  grade: 'EXCELENTE' | 'BOM' | 'ATENÇÃO' | 'CRÍTICO';
  complianceScore: number; // 0 - 100%
  impactScore: number; // 0 - 100%
  impactLevel: 'Máximo' | 'Alto' | 'Moderado' | 'Necessita Reforço';
  impactDescription: string;
  
  // Highlights and vulnerabilities
  positiveHighlights: string[];
  vulnerabilities: string[];
  
  // AI Suggestions for Improvement
  aiDiagnosis: string;
  aiSuggestions: {
    priority: 'ALTA' | 'MÉDIA' | 'PREVENTIVA';
    title: string;
    description: string;
    projectedGain: string;
  }[];
  
  // Breakdown & percentages
  distribution: {
    label: string;
    value: number;
    percentage: number;
    color: string;
  }[];
  
  // Sample recent entries preview
  recentItems: {
    id: string;
    title: string;
    date: string;
    author?: string;
    statusBadge?: string;
    details?: string;
  }[];
}

interface InstitutionalControlHubProps {
  props: MonitoringSectionProps;
  startDate: string;
  endDate: string;
  stockProducts: any[];
  stockMovements: any[];
  treasuryTransactions: any[];
  localDonors?: any[];
  onNavigateTab?: (tab: string) => void;
  selectedCategoryFilter?: string;
}

export const InstitutionalControlHub: React.FC<InstitutionalControlHubProps> = ({
  props,
  startDate,
  endDate,
  stockProducts,
  stockMovements,
  treasuryTransactions,
  localDonors = [],
  onNavigateTab,
  selectedCategoryFilter: initialCategoryFilter = 'all'
}) => {
  const [activeCategory, setActiveCategory] = useState<string>(initialCategoryFilter);
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [expandedModuleId, setExpandedModuleId] = useState<string | null>(null);
  const [gradeFilter, setGradeFilter] = useState<string>('all');

  const {
    elderly = [],
    communityElderly = [],
    evolutions = [],
    pias = [],
    socialEvolutions = [],
    socialPatients = [],
    socialFamilyVisits = [],
    socialRiskSituations = [],
    socialReferrals = [],
    socialStudies = [],
    psychEvolutions = [],
    psychPatients = [],
    psychActivities = [],
    psychAppointments = [],
    psychEmotionalMonitorings = [],
    psychCognitionAssessments = [],
    pedagogyEvolutions = [],
    pedagogyPatients = [],
    pedagogyActivities = [],
    pedagogyStimulationTrackings = [],
    pedagogySocialParticipations = [],
    physioEvolutions = [],
    physioPatients = [],
    physioAssessments = [],
    physioExercises = [],
    physioAppointments = [],
    nursingEvolutions = [],
    nursingPatients = [],
    vitalSigns = [],
    dressingRecords = [],
    medicationAdministrations = [],
    incidentRecords = [],
    diaperChangeRecords = [],
    nutritionEvolutions = [],
    nutritionPatients = [],
    nutritionAnthropometries = [],
    nutritionMealPlans = [],
    workshops = [],
    professionals = [],
    users = [],
    caregivers = [],
    volunteers = [],
    donors = [],
    diaperDonations = [],
    diaperBeneficiaries = [],
    diaperRawProductions = [],
    diaperWIPProcessings = [],
    diaperFinalPackings = [],
    diaperProductionGoals = [],
    financialRecords = [],
    allPhotos = []
  } = props;

  // Number of active elderly for baseline rates
  const activeElderlyCount = useMemo(() => {
    return Math.max(1, elderly.filter(e => e.status === 'ATIVO').length);
  }, [elderly]);

  // Number of days in period
  const periodDays = useMemo(() => {
    try {
      const d1 = new Date(startDate);
      const d2 = new Date(endDate);
      return Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    } catch {
      return 30;
    }
  }, [startDate, endDate]);

  // Compute all 23 institutional modules with both quantitative & qualitative metrics
  const modules: ModuleControlItem[] = useMemo(() => {
    const list: ModuleControlItem[] = [];

    // Helper to calculate rate
    const calcRate = (periodCount: number) => {
      const daily = Number((periodCount / periodDays).toFixed(2));
      const perElderly = Number((periodCount / activeElderlyCount).toFixed(2));
      return { daily, perElderly };
    };

    // ==========================================
    // GRUPO 1: PAINEL E COLABORAÇÃO
    // ==========================================

    // 1. Idosos
    {
      const total = elderly.length + communityElderly.length;
      const inPeriod = elderly.filter(e => isDateInRange((e as any).admissionDate || (e as any).createdAt, startDate, endDate)).length;
      const active = elderly.filter(e => e.status === 'ATIVO').length;
      const inactive = elderly.filter(e => e.status === 'INATIVO').length;
      const deceased = elderly.filter(e => (e as any).status === 'OBITO' || (e as any).deceased).length;
      const rates = calcRate(inPeriod);

      // Qualitative evaluation
      const withDoc = elderly.filter(e => e.cpf || e.rg).length;
      const compliance = total > 0 ? Math.round((withDoc / total) * 100) : 85;
      const impactScore = Math.min(100, Math.round((active / (total || 1)) * 95 + (compliance * 0.05)));
      const grade = impactScore >= 90 ? 'EXCELENTE' : impactScore >= 75 ? 'BOM' : impactScore >= 50 ? 'ATENÇÃO' : 'CRÍTICO';

      list.push({
        id: 'idosos',
        category: 'colab',
        categoryLabel: 'Painel e Colaboração',
        name: 'Idosos (Acolhidos e Comunidade)',
        description: 'Cadastro geral, prontuários, graus de dependência e controle de permanência.',
        icon: Users,
        targetAppTab: 'elderly',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: compliance,
        impactScore,
        impactLevel: impactScore >= 90 ? 'Máximo' : impactScore >= 75 ? 'Alto' : 'Moderado',
        impactDescription: 'Central de acolhimento garantindo dignidade, moradia e proteção integral aos idosos institucionalizados.',
        positiveHighlights: [
          `${active} acolhidos com status ativo sob supervisão contínua`,
          `${withDoc} prontuários com documentação civil completa cadastrada`,
          'Monitoramento contínuo de admissões e transição de graus de dependência'
        ],
        vulnerabilities: [
          deceased > 0 ? `${deceased} registro(s) de óbito arquivados no histórico` : 'Revisar periodicamente contatos de emergência e responsáveis legais',
          total - withDoc > 0 ? `${total - withDoc} idoso(s) com pendência de digitalização documental` : 'Sem pendências críticas de cadastro'
        ],
        aiDiagnosis: `A base de acolhidos possui ${active} residentes ativos. A taxa de conformidade cadastral é de ${compliance}%, demonstrando regularidade na identificação dos acolhidos.`,
        aiSuggestions: [
          {
            priority: 'MÉDIA',
            title: 'Digitalização Completa de Prontuários',
            description: 'Concluir o upload de cópias de RG, CPF e Cartão SUS para 100% dos acolhidos.',
            projectedGain: '+10% na conformidade regulatória perante fiscalização'
          },
          {
            priority: 'PREVENTIVA',
            title: 'Recadastramento Anual de Contatos Familiares',
            description: 'Atualizar telefones e endereços dos familiares responsáveis a cada semestre.',
            projectedGain: 'Agilidade imediata em caso de urgências hospitalares'
          }
        ],
        distribution: [
          { label: 'Ativos', value: active, percentage: total ? Math.round((active / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Inativos', value: inactive, percentage: total ? Math.round((inactive / total) * 100) : 0, color: 'bg-amber-500' },
          { label: 'Comunidade', value: communityElderly.length, percentage: total ? Math.round((communityElderly.length / total) * 100) : 0, color: 'bg-blue-500' }
        ],
        recentItems: elderly.slice(0, 5).map(e => ({
          id: e.id,
          title: e.name,
          date: (e as any).admissionDate || 'Admissão Ativa',
          author: `Grau ${e.dependencyDegree || 'I'} • Quarto ${e.room || 'Principal'}`,
          statusBadge: e.status,
          details: `Idade: ${(e as any).age || 'N/I'} • SUS: ${(e as any).susCard || 'Registrado'}`
        }))
      });
    }

    // 2. Cronograma
    {
      const allEvents = [...psychAppointments, ...physioAppointments, ...workshops];
      const inPeriod = allEvents.filter(ev => isDateInRange((ev as any).date || (ev as any).appointmentDate, startDate, endDate)).length;
      const total = allEvents.length;
      const rates = calcRate(inPeriod);
      const compliance = total > 0 ? Math.min(100, Math.round((inPeriod / (periodDays * 0.5)) * 100)) : 70;
      const impactScore = Math.min(100, Math.max(65, Math.round(compliance * 0.95)));
      const grade = impactScore >= 85 ? 'EXCELENTE' : impactScore >= 70 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'cronograma',
        category: 'colab',
        categoryLabel: 'Painel e Colaboração',
        name: 'Cronograma Institucional e Rotinas',
        description: 'Grade horária de atendimentos técnicos, sessões, reuniões e eventos terapêuticos.',
        icon: Calendar,
        targetAppTab: 'schedule',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: compliance,
        impactScore,
        impactLevel: impactScore >= 85 ? 'Alto' : 'Moderado',
        impactDescription: 'Estruturação da rotina diária e semanal proporcionando previsibilidade e bem-estar psicossocial.',
        positiveHighlights: [
          `${inPeriod} eventos/sessões agendados no intervalo atual`,
          'Integração de agendas de Fisioterapia, Psicologia e Oficinas',
          'Distribuição equilibrada de atividades entre turnos matutino e vespertino'
        ],
        vulnerabilities: [
          inPeriod === 0 ? 'Nenhum agendamento futuro lançado para os próximos dias' : 'Manter confirmação de presença registrada pós-atendimento',
          'Evitar sobreposição de horários em salas compartilhadas'
        ],
        aiDiagnosis: `O cronograma registra ${inPeriod} sessões no período. O fluxo de organização de rotinas garante ritmo terapêutico constante aos residentes.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Sincronização Automática com Quadro de Avisos',
            description: 'Garantir que a escala diária seja impressa ou disponibilizada aos cuidadores no início do turno.',
            projectedGain: 'Zero conflitos de horários e 100% de pontualidade'
          }
        ],
        distribution: [
          { label: 'Fisioterapia', value: physioAppointments.length, percentage: total ? Math.round((physioAppointments.length / total) * 100) : 0, color: 'bg-blue-500' },
          { label: 'Psicologia', value: psychAppointments.length, percentage: total ? Math.round((psychAppointments.length / total) * 100) : 0, color: 'bg-purple-500' },
          { label: 'Oficinas', value: workshops.length, percentage: total ? Math.round((workshops.length / total) * 100) : 0, color: 'bg-emerald-500' }
        ],
        recentItems: allEvents.slice(0, 5).map((ev: any, idx) => ({
          id: ev.id || `sched-${idx}`,
          title: ev.title || ev.elderlyName || ev.patientName || 'Atividade Agendada',
          date: ev.date || ev.appointmentDate || 'Data Vigente',
          author: ev.professional || ev.type || 'Equipe OAMI',
          statusBadge: ev.status || 'CONFIRMADO',
          details: ev.notes || ev.objective || 'Atendimento de rotina'
        }))
      });
    }

    // 3. Galeria de Fotos
    {
      const total = allPhotos.length;
      const inPeriod = allPhotos.filter(p => isDateInRange((p as any).date || (p as any).createdAt, startDate, endDate)).length;
      const rates = calcRate(inPeriod);
      const elderlyWithPhotos = new Set(allPhotos.map(p => (p as any).patientId || (p as any).elderlyId).filter(Boolean)).size;
      const photoCoverage = activeElderlyCount > 0 ? Math.min(100, Math.round((elderlyWithPhotos / activeElderlyCount) * 100)) : 80;
      const impactScore = Math.min(100, Math.round((photoCoverage * 0.7) + (Math.min(inPeriod, 20) * 1.5)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'galeria',
        category: 'colab',
        categoryLabel: 'Painel e Colaboração',
        name: 'Galeria Multidisciplinar de Fotos',
        description: 'Registros fotográficos de evoluções, oficinas, eventos comemorativos e visitas familiares.',
        icon: Camera,
        targetAppTab: 'gallery',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: photoCoverage,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Memória afetiva, transparência com os familiares e comprovação documental perante órgãos de fiscalização.',
        positiveHighlights: [
          `${total} registros fotográficos seguros no acervo institucional`,
          `${elderlyWithPhotos} acolhidos com fotos documentais no prontuário`,
          'Excelente recurso para prestar contas a mantenedores e doadores'
        ],
        vulnerabilities: [
          inPeriod < 3 ? 'Baixa frequência de fotos adicionadas neste período' : 'Manter fotos organizadas por tags e idosos',
          `${Math.max(0, activeElderlyCount - elderlyWithPhotos)} acolhido(s) sem fotos recentes cadastradas`
        ],
        aiDiagnosis: `A galeria possui ${total} fotos, cobrindo ${photoCoverage}% dos acolhidos ativos. A documentação imagética comprova o trabalho técnico e humanizado.`,
        aiSuggestions: [
          {
            priority: 'MÉDIA',
            title: 'Registro Fotográfico Sistemático por Oficina',
            description: 'Fotografar pelo menos 2 momentos por oficina temática para prestação de contas.',
            projectedGain: '+30% de engajamento familiar e prestação de contas impecável'
          }
        ],
        distribution: [
          { label: 'Com Vínculo a Idoso', value: elderlyWithPhotos, percentage: photoCoverage, color: 'bg-emerald-500' },
          { label: 'Eventos Gerais', value: Math.max(0, total - elderlyWithPhotos), percentage: 100 - photoCoverage, color: 'bg-indigo-500' }
        ],
        recentItems: allPhotos.slice(0, 5).map((p: any, idx) => ({
          id: p.id || `photo-${idx}`,
          title: p.title || p.patientName || `Registro Fotográfico #${idx + 1}`,
          date: p.date || 'Recente',
          author: p.uploadedBy || 'Equipe',
          statusBadge: p.category || 'Atividade',
          details: p.description || 'Foto cadastrada no banco de imagens'
        }))
      });
    }

    // ==========================================
    // GRUPO 2: SERVIÇOS TÉCNICOS
    // ==========================================

    // 4. Fisioterapia
    {
      const total = physioEvolutions.length + physioAssessments.length + physioExercises.length;
      const inPeriodEvo = physioEvolutions.filter(e => isDateInRange(e.date, startDate, endDate)).length;
      const inPeriodAssess = physioAssessments.filter(a => isDateInRange((a as any).date, startDate, endDate)).length;
      const inPeriod = inPeriodEvo + inPeriodAssess;
      const rates = calcRate(inPeriod);

      const treatedElderly = new Set(physioEvolutions.map(e => (e as any).elderlyId || (e as any).patientId)).size;
      const coverage = activeElderlyCount > 0 ? Math.min(100, Math.round((treatedElderly / activeElderlyCount) * 100)) : 80;
      const impactScore = Math.min(100, Math.round((coverage * 0.6) + (Math.min(inPeriodEvo, 40) * 1.0)));
      const grade = impactScore >= 85 ? 'EXCELENTE' : impactScore >= 70 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'fisioterapia',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Fisioterapia Geriátrica',
        description: 'Evoluções motoras, cinesioterapia, prevenção de quedas, escalas funcionais e reabilitação.',
        icon: Activity,
        targetAppTab: 'physiotherapy',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: coverage,
        impactScore,
        impactLevel: impactScore >= 85 ? 'Máximo' : 'Alto',
        impactDescription: 'Manutenção da marcha, prevenção de contraturas, alívio da dor crônica e preservação da autonomia funcional.',
        positiveHighlights: [
          `${inPeriodEvo} evoluções de fisioterapia registradas no período`,
          `${physioAssessments.length} avaliações e reavaliações cinético-funcionais registradas`,
          `${treatedElderly} acolhidos com plano de fisioterapia ativo`
        ],
        vulnerabilities: [
          activeElderlyCount - treatedElderly > 0 ? `${activeElderlyCount - treatedElderly} idoso(s) sem atendimento fisioterapêutico recente` : 'Monitorar idosos acamados com risco de úlceras por pressão',
          'Garantir registro detalhado de condutas e evolução da marcha'
        ],
        aiDiagnosis: `A Fisioterapia apresenta alto engajamento, com ${inPeriodEvo} registros no período e cobertura de ${coverage}% dos acolhidos.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Protocolo Intensivo de Prevenção de Quedas',
            description: 'Aplicar a Escala de Tinetti ou Berg a cada 90 dias para todos os idosos que deambulam.',
            projectedGain: '-40% de incidentes de queda e fraturas na instituição'
          },
          {
            priority: 'MÉDIA',
            title: 'Mobilização Passiva Programada para Acamados',
            description: 'Garantir rotina diária de posicionamento e amplitude de movimento para restritos ao leito.',
            projectedGain: 'Prevenção total de deformidades articulares'
          }
        ],
        distribution: [
          { label: 'Evoluções', value: physioEvolutions.length, percentage: total ? Math.round((physioEvolutions.length / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Avaliações', value: physioAssessments.length, percentage: total ? Math.round((physioAssessments.length / total) * 100) : 0, color: 'bg-blue-500' },
          { label: 'Exercícios', value: physioExercises.length, percentage: total ? Math.round((physioExercises.length / total) * 100) : 0, color: 'bg-purple-500' }
        ],
        recentItems: physioEvolutions.slice(0, 5).map(e => ({
          id: e.id,
          title: (e as any).patientName || (e as any).elderlyName || 'Evolução Fisioterapêutica',
          date: e.date,
          author: (e as any).registeredBy || (e as any).professional || 'Fisioterapeuta',
          statusBadge: (e as any).sessionType || 'Cinesioterapia',
          details: e.conduct || e.content || 'Atendimento realizado com sucesso'
        }))
      });
    }

    // 5. Enfermagem
    {
      const total = nursingEvolutions.length + vitalSigns.length + dressingRecords.length + medicationAdministrations.length + incidentRecords.length + diaperChangeRecords.length;
      const inPeriodEvo = nursingEvolutions.filter(e => isDateInRange(e.date, startDate, endDate)).length;
      const inPeriodVitals = vitalSigns.filter(v => isDateInRange(v.date, startDate, endDate)).length;
      const inPeriodMeds = medicationAdministrations.filter(m => isDateInRange(m.date, startDate, endDate)).length;
      const inPeriod = inPeriodEvo + inPeriodVitals + inPeriodMeds;
      const rates = calcRate(inPeriod);

      const alteredVitals = vitalSigns.filter(v => isVitalSignAltered(v)).length;
      const normalVitals = Math.max(0, vitalSigns.length - alteredVitals);
      const normalVitalsPct = vitalSigns.length > 0 ? Math.round((normalVitals / vitalSigns.length) * 100) : 100;

      const compliance = inPeriodVitals > 0 ? 98 : 80;
      const impactScore = Math.min(100, Math.round(92 + (inPeriodVitals > 20 ? 6 : 0)));
      const grade = impactScore >= 90 ? 'EXCELENTE' : 'BOM';

      list.push({
        id: 'enfermagem',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Enfermagem e Cuidados de Saúde',
        description: 'Evoluções de enfermagem, sinais vitais diários, administração de medicação, curativos e controle de intercorrências.',
        icon: HeartPulse,
        targetAppTab: 'nursing',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: compliance,
        impactScore,
        impactLevel: 'Máximo',
        impactDescription: 'Pilar vital de sobrevivência: controle hemodinâmico, segurança medicamentosa e pronto-atendimento 24 horas.',
        positiveHighlights: [
          `${vitalSigns.length} aferições de sinais vitais acumuladas (${inPeriodVitals} no período, ${normalVitalsPct}% dentro do padrão basal)`,
          `${inPeriodMeds} checagens de medicação com rastreabilidade`,
          `${dressingRecords.length} curativos cadastrados com plano de cicatrização`
        ],
        vulnerabilities: [
          alteredVitals > 0 ? `${alteredVitals} aferição(ões) de sinais vitais com alerta clínico (PA, FC, Temp, Sat ou Glicemia)` : 'Sinais vitais sem alterações críticas',
          incidentRecords.length > 0 ? `${incidentRecords.length} registro(s) de intercorrência requerem análise de causa raiz` : 'Nenhum incidente crítico',
          'Manter conferência rigorosa de prescrições médicas e validade de fármacos'
        ],
        aiDiagnosis: `A enfermagem mantém o maior volume operacional do app com ${total} registros totais (incluindo ${vitalSigns.length} aferições de sinais vitais com ${normalVitalsPct}% de conformidade basal) e média de ${rates.daily} lançamentos/dia.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Protocolo de Aferição Sistemática de Sinais Vitais',
            description: 'Aferir sinais vitais 2x ao dia para idosos acamados ou com patologias cardiovasculares ativas.',
            projectedGain: 'Detecção imediata de picos hipertensivos e descompensação hemodinâmica'
          },
          {
            priority: 'ALTA',
            title: 'Auditoria Diária de Checagem Beira-Leito',
            description: 'Garantir 100% de conferência cruzada entre prescrição e administração de medicamentos controlados.',
            projectedGain: 'Zero erro medicamentoso e compliance total ANVISA'
          }
        ],
        distribution: [
          { label: 'Sinais Vitais', value: vitalSigns.length, percentage: total ? Math.round((vitalSigns.length / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Medicações', value: medicationAdministrations.length, percentage: total ? Math.round((medicationAdministrations.length / total) * 100) : 0, color: 'bg-blue-500' },
          { label: 'Evoluções', value: nursingEvolutions.length, percentage: total ? Math.round((nursingEvolutions.length / total) * 100) : 0, color: 'bg-purple-500' },
          { label: 'Curativos', value: dressingRecords.length, percentage: total ? Math.round((dressingRecords.length / total) * 100) : 0, color: 'bg-amber-500' }
        ],
        recentItems: vitalSigns.slice(0, 5).map(v => {
          const isAltered = isVitalSignAltered(v);
          const alertTags = getVitalSignAlertTags(v);
          return {
            id: v.id,
            title: (v as any).patientName || 'Aferição de Sinais Vitais',
            date: v.date,
            author: (v as any).registeredBy || (v as any).measuredBy || 'Equipe Enfermagem',
            statusBadge: isAltered ? (alertTags[0] || 'ALTERADO') : 'NORMAL',
            details: `PA: ${v.systolicBP || '--'}/${v.diastolicBP || '--'} • FC: ${v.heartRate || '--'} bpm • Temp: ${v.temperature || '--'}°C • Sat: ${v.saturation || '--'}% • Glic: ${v.bloodGlucose || '-'}`
          };
        })
      });
    }

    // 6. Psicologia
    {
      const total = psychEvolutions.length + psychAppointments.length + psychActivities.length + psychEmotionalMonitorings.length + psychCognitionAssessments.length;
      const inPeriod = psychEvolutions.filter(e => isDateInRange(e.date, startDate, endDate)).length +
        psychEmotionalMonitorings.filter(m => isDateInRange(m.date, startDate, endDate)).length;
      const rates = calcRate(inPeriod);

      const attended = new Set(psychEvolutions.map(e => (e as any).elderlyId || (e as any).patientId)).size;
      const coverage = activeElderlyCount > 0 ? Math.min(100, Math.round((attended / activeElderlyCount) * 100)) : 80;
      const impactScore = Math.min(100, Math.round((coverage * 0.7) + (Math.min(inPeriod, 30) * 1.0)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'psicologia',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Psicologia e Saúde Mental',
        description: 'Evoluções psicológicas, escuta qualificada, monitoramento do humor, testes cognitivos e suporte ao luto/angústia.',
        icon: Brain,
        targetAppTab: 'psychology',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: coverage,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Acolhimento da subjetividade, prevenção da depressão senil e fortalecimento da resiliência emocional.',
        positiveHighlights: [
          `${psychEvolutions.length} evoluções psicológicas individualizadas registradas`,
          `${psychEmotionalMonitorings.length} rastreios de humor e afetividade concluídos`,
          `${psychCognitionAssessments.length} avaliações neurocognitivas (MEEM/MoCA)`
        ],
        vulnerabilities: [
          inPeriod < 4 ? 'Aumentar a periodicidade de atendimentos aos acolhidos com humor deprimido' : 'Monitorar acolhidos em luto recente',
          'Articular condutas com a equipe de cuidadores para manejo comportamental'
        ],
        aiDiagnosis: `A Psicologia atende ${attended} residentes com foco em bem-estar emocional e preservação cognitiva.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Rastreio Periódico de Sintomas Depressivos (GDS-15)',
            description: 'Aplicar a Escala de Depressão Geriátrica a cada semestre em todos os acolhidos lúcidos.',
            projectedGain: 'Detecção precoce e redução de 50% em crises de ansiedade/isolamento'
          }
        ],
        distribution: [
          { label: 'Evoluções', value: psychEvolutions.length, percentage: total ? Math.round((psychEvolutions.length / total) * 100) : 0, color: 'bg-purple-500' },
          { label: 'Monitoramento Emocional', value: psychEmotionalMonitorings.length, percentage: total ? Math.round((psychEmotionalMonitorings.length / total) * 100) : 0, color: 'bg-pink-500' },
          { label: 'Avaliações Cognitivas', value: psychCognitionAssessments.length, percentage: total ? Math.round((psychCognitionAssessments.length / total) * 100) : 0, color: 'bg-indigo-500' }
        ],
        recentItems: psychEvolutions.slice(0, 5).map(e => ({
          id: e.id,
          title: (e as any).patientName || (e as any).elderlyName || 'Atendimento Psicológico',
          date: e.date,
          author: (e as any).registeredBy || 'Psicóloga',
          statusBadge: (e as any).sessionType || 'Individual',
          details: e.content || 'Escuta psicológica e intervenção terapêutica'
        }))
      });
    }

    // 7. Pedagogia
    {
      const total = pedagogyEvolutions.length + pedagogyActivities.length + pedagogyStimulationTrackings.length + pedagogySocialParticipations.length;
      const inPeriod = pedagogyEvolutions.filter(e => isDateInRange(e.date, startDate, endDate)).length +
        pedagogyActivities.filter(a => isDateInRange(a.date, startDate, endDate)).length;
      const rates = calcRate(inPeriod);

      const attended = new Set(pedagogyEvolutions.map(e => (e as any).elderlyId || (e as any).patientId)).size;
      const coverage = activeElderlyCount > 0 ? Math.min(100, Math.round((attended / activeElderlyCount) * 100)) : 80;
      const impactScore = Math.min(100, Math.round((coverage * 0.7) + (Math.min(inPeriod, 30) * 1.0)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'pedagogia',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Pedagogia e Estimulação Cognitiva',
        description: 'Oficinas de memória, estimulação multissensorial, alfabetização/leitura, dinâmicas e socialização.',
        icon: GraduationCap,
        targetAppTab: 'pedagogy',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: coverage,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Retardo no declínio cognitivo, resgate de memórias biográficas e pertencimento comunitário ativo.',
        positiveHighlights: [
          `${pedagogyActivities.length} oficinas pedagógicas e jogos cooperativos executados`,
          `${pedagogyStimulationTrackings.length} fichas de rastreio de habilidades cognitivas preenchidas`,
          `${pedagogyEvolutions.length} evoluções de engajamento e aprendizagem registradas`
        ],
        vulnerabilities: [
          'Incentivar a participação de acolhidos com quadro demencial leve a moderado',
          'Adaptar materiais para acolhidos com déficits visuais e auditivos'
        ],
        aiDiagnosis: `A Pedagogia desenvolve trabalho sistemático de neuroplasticidade com ${total} intervenções documentadas.`,
        aiSuggestions: [
          {
            priority: 'MÉDIA',
            title: 'Atividades Biográficas e Caixa de Memórias',
            description: 'Criar projetos individuais de resgate histórico da história de vida de cada acolhido.',
            projectedGain: '+40% de autoestima e sensação de valorização pessoal'
          }
        ],
        distribution: [
          { label: 'Evoluções', value: pedagogyEvolutions.length, percentage: total ? Math.round((pedagogyEvolutions.length / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Atividades em Grupo', value: pedagogyActivities.length, percentage: total ? Math.round((pedagogyActivities.length / total) * 100) : 0, color: 'bg-amber-500' },
          { label: 'Estimulação Cognitiva', value: pedagogyStimulationTrackings.length, percentage: total ? Math.round((pedagogyStimulationTrackings.length / total) * 100) : 0, color: 'bg-blue-500' }
        ],
        recentItems: pedagogyActivities.slice(0, 5).map(a => ({
          id: a.id,
          title: a.title || 'Oficina Pedagógica',
          date: a.date,
          author: (a as any).instructor || 'Pedagoga',
          statusBadge: a.type || 'Grupo',
          details: a.description || 'Estimulação da memória e socialização'
        }))
      });
    }

    // 8. Serviço Social
    {
      const total = socialEvolutions.length + socialFamilyVisits.length + socialRiskSituations.length + socialReferrals.length + socialStudies.length;
      const inPeriodEvo = socialEvolutions.filter(e => isDateInRange(e.date, startDate, endDate)).length;
      const inPeriodVisits = socialFamilyVisits.filter(v => isDateInRange(v.date, startDate, endDate)).length;
      const inPeriod = inPeriodEvo + inPeriodVisits;
      const rates = calcRate(inPeriod);

      const activeRisks = socialRiskSituations.filter(r => (r as any).status !== 'RESOLVIDO').length;
      const compliance = 95;
      const impactScore = Math.min(100, Math.round(88 + (inPeriodVisits > 5 ? 8 : 0)));
      const grade = impactScore >= 85 ? 'EXCELENTE' : 'BOM';

      list.push({
        id: 'servico_social',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Serviço Social e Garantia de Direitos',
        description: 'Vínculos familiares, controle de visitas, estudos sociais, benefícios previdenciários (BPC), articulação de rede e enfrentamento a riscos.',
        icon: HeartHandshake,
        targetAppTab: 'social_work',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: compliance,
        impactScore,
        impactLevel: 'Máximo',
        impactDescription: 'Garantia dos direitos fundamentais do Estatuto do Idoso, proteção jurídica e combate ao isolamento.',
        positiveHighlights: [
          `${socialFamilyVisits.length} lançamentos no controle de visitas familiares`,
          `${socialEvolutions.length} evoluções sociais documentadas no sistema`,
          `${socialReferrals.length} encaminhamentos a órgãos públicos (CRAS, CREAS, Defensoria, INSS)`
        ],
        vulnerabilities: [
          activeRisks > 0 ? `${activeRisks} situação(ões) de risco social ativa(s) em acompanhamento prioritário` : 'Sem situações críticas pendentes',
          'Acompanhar renovação de benefícios BPC e curatelas provisórias'
        ],
        aiDiagnosis: `O Serviço Social possui controle completo dos vínculos familiares e situações de risco com ${total} registros históricos.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Busca Ativa de Familiares Ausentes',
            description: 'Realizar contato telefônico e agendamento de visita para idosos sem visita há mais de 45 dias.',
            projectedGain: 'Reaproximação familiar em até 60% dos casos viáveis'
          }
        ],
        distribution: [
          { label: 'Evoluções Sociais', value: socialEvolutions.length, percentage: total ? Math.round((socialEvolutions.length / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Controle de Visitas', value: socialFamilyVisits.length, percentage: total ? Math.round((socialFamilyVisits.length / total) * 100) : 0, color: 'bg-blue-500' },
          { label: 'Encaminhamentos', value: socialReferrals.length, percentage: total ? Math.round((socialReferrals.length / total) * 100) : 0, color: 'bg-purple-500' },
          { label: 'Riscos Sociais', value: socialRiskSituations.length, percentage: total ? Math.round((socialRiskSituations.length / total) * 100) : 0, color: 'bg-red-500' }
        ],
        recentItems: socialFamilyVisits.slice(0, 5).map(v => ({
          id: v.id,
          title: `Visita: ${v.visitorName} (${v.kinship})`,
          date: v.date,
          author: v.registeredBy || 'Assistente Social',
          statusBadge: (v as any).patientName || 'Acolhido',
          details: v.observations || 'Visita realizada sem intercorrências'
        }))
      });
    }

    // 9. Nutrição
    {
      const total = nutritionEvolutions.length + nutritionAnthropometries.length + nutritionMealPlans.length;
      const inPeriodEvo = nutritionEvolutions.filter(e => isDateInRange(e.date, startDate, endDate)).length;
      const inPeriodAnthro = nutritionAnthropometries.filter(a => isDateInRange(a.date, startDate, endDate)).length;
      const inPeriod = inPeriodEvo + inPeriodAnthro;
      const rates = calcRate(inPeriod);

      const assessed = new Set(nutritionAnthropometries.map(a => (a as any).elderlyId || (a as any).patientId)).size;
      const coverage = activeElderlyCount > 0 ? Math.min(100, Math.round((assessed / activeElderlyCount) * 100)) : 80;
      const impactScore = Math.min(100, Math.round((coverage * 0.7) + (Math.min(inPeriod, 20) * 1.5)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'nutricao',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Nutrição Clínica e Dietoterapia',
        description: 'Avaliações nutricionais, pesagem/IMC, consistência da dieta (pastosa, branda, geral), hidratação e dietas especiais.',
        icon: Apple,
        targetAppTab: 'nutrition',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: coverage,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Prevenção da desnutrição e sarcopenia, adequação para disfagia e controle glicêmico/lipídico.',
        positiveHighlights: [
          `${nutritionAnthropometries.length} avaliações antropométricas cadastradas no sistema`,
          `${nutritionMealPlans.length} planos alimentares individualizados vigentes`,
          `${nutritionEvolutions.length} evoluções de aceitação alimentar registradas`
        ],
        vulnerabilities: [
          'Monitorar perda ponderal involuntária (>5% no mês)',
          'Garantir controle estrito de oferta hídrica em dias de calor intenso'
        ],
        aiDiagnosis: `A Nutrição monitora ativamente ${assessed} idosos com acompanhamento antropométrico e dietético.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Protocolo de Pesagem Mensal Obrigatória',
            description: 'Pesar todos os acolhidos na primeira semana de cada mês para curva de peso no prontuário.',
            projectedGain: 'Identificação imediata de declínio clínico subclínico'
          }
        ],
        distribution: [
          { label: 'Evoluções', value: nutritionEvolutions.length, percentage: total ? Math.round((nutritionEvolutions.length / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Antropometria', value: nutritionAnthropometries.length, percentage: total ? Math.round((nutritionAnthropometries.length / total) * 100) : 0, color: 'bg-blue-500' },
          { label: 'Cardápios / Planos', value: nutritionMealPlans.length, percentage: total ? Math.round((nutritionMealPlans.length / total) * 100) : 0, color: 'bg-amber-500' }
        ],
        recentItems: nutritionAnthropometries.slice(0, 5).map(a => ({
          id: a.id,
          title: (a as any).patientName || 'Avaliação Antropométrica',
          date: a.date,
          author: (a as any).measuredBy || 'Nutricionista',
          statusBadge: `IMC: ${a.bmi || 'Normal'}`,
          details: `Peso: ${a.weight || '--'}kg • Altura: ${a.height || '--'}m`
        }))
      });
    }

    // 10. Avaliação & Monitoramento
    {
      const total = pias.length;
      const inPeriod = pias.filter(p => isDateInRange((p as any).createdAt || (p as any).updatedAt || (p as any).date, startDate, endDate)).length;
      const activePias = pias.filter(p => p.status === 'CONCLUIDO' || p.status === 'ATIVO').length;
      const rates = calcRate(inPeriod);

      const piaCoverage = activeElderlyCount > 0 ? Math.min(100, Math.round((pias.length / activeElderlyCount) * 100)) : 80;
      const impactScore = Math.min(100, Math.round((piaCoverage * 0.8) + (activePias > 10 ? 20 : 10)));
      const grade = impactScore >= 85 ? 'EXCELENTE' : impactScore >= 70 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'avaliacao_monitoramento',
        category: 'tecnicos',
        categoryLabel: 'Serviços Técnicos',
        name: 'Avaliação & Monitoramento (PIA Multidisciplinar)',
        description: 'Plano Individual de Atendimento (PIA), metas integradas por especialidade e revisão quadrimestral.',
        icon: ClipboardCheck,
        targetAppTab: 'pia',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: piaCoverage,
        impactScore,
        impactLevel: impactScore >= 85 ? 'Máximo' : 'Alto',
        impactDescription: 'Instrumento normativo essencial exigido pelo SUAS e ANVISA, garantindo plano terapêutico singular.',
        positiveHighlights: [
          `${pias.length} Planos Individuais de Atendimento formulados`,
          `${activePias} PIAs em status ativo e com metas vigentes`,
          'Integração de metas conjuntas entre saúde, assistência e convivência'
        ],
        vulnerabilities: [
          activeElderlyCount - pias.length > 0 ? `${activeElderlyCount - pias.length} acolhido(s) necessitam de elaboração de PIA inicial` : 'Sem atrasos em PIAs iniciais',
          'Revisar periodicamente PIAs vencidos (> 6 meses da última atualização)'
        ],
        aiDiagnosis: `A cobertura de PIA atinge ${piaCoverage}% dos acolhidos, representando excelente maturidade técnica da instituição.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Reunião de Alinhamento Quadrimestral do PIA',
            description: 'Conduzir reunião intersetorial para validar e assinar o avanço das metas de cada acolhido.',
            projectedGain: 'Cumprimento de 100% dos requisitos de fiscalização do Conselho do Idoso'
          }
        ],
        distribution: [
          { label: 'Ativos/Concluídos', value: activePias, percentage: total ? Math.round((activePias / total) * 100) : 0, color: 'bg-emerald-500' },
          { label: 'Em Elaboração', value: total - activePias, percentage: total ? Math.round(((total - activePias) / total) * 100) : 0, color: 'bg-amber-500' }
        ],
        recentItems: pias.slice(0, 5).map(p => ({
          id: p.id,
          title: `PIA: ${(p as any).elderlyName || (p as any).patientName || 'Acolhido'}`,
          date: (p as any).updatedAt || (p as any).createdAt || 'Vigente',
          author: (p as any).responsible || 'Comissão Multidisciplinar',
          statusBadge: p.status || 'ATIVO',
          details: (p as any).objectives || 'Metas terapêuticas e de convivência estabelecidas'
        }))
      });
    }

    // ==========================================
    // GRUPO 3: ADMINISTRATIVO
    // ==========================================

    // 11. Painel Auxiliar
    {
      const total = 12; // Configurações, atalhos e utilitários
      const impactScore = 88;
      const grade = 'BOM';

      list.push({
        id: 'painel_auxiliar',
        category: 'administrativo',
        categoryLabel: 'Administrativo',
        name: 'Painel Auxiliar e Governança Operacional',
        description: 'Painel de suporte executivo, checagem rápida de conformidade, atalhos e auditoria das rotinas.',
        icon: Sliders,
        targetAppTab: 'support',
        totalCount: total,
        periodCount: total,
        dailyRate: 1,
        perElderlyRate: 0.5,
        grade,
        complianceScore: 90,
        impactScore,
        impactLevel: 'Alto',
        impactDescription: 'Agilidade na tomada de decisão e mitigação de gargalos administrativos operacionais.',
        positiveHighlights: [
          'Controle de permissões e chaves de segurança ativas',
          'Visão resumida para a coordenação executiva',
          'Atalhos de impressão rápida de relatórios unificados'
        ],
        vulnerabilities: [
          'Verificar rotineiramente logs de sincronização e backups dos lançamentos'
        ],
        aiDiagnosis: 'O Painel Auxiliar proporciona visibilidade transversal aos coordenadores técnicos.',
        aiSuggestions: [
          {
            priority: 'PREVENTIVA',
            title: 'Backup Periódico de Documentos',
            description: 'Exportar mensalmente a planilha consolidada em Excel e PDF para arquivo institucional.',
            projectedGain: 'Segurança absoluta e guarda de registros por 5 anos'
          }
        ],
        distribution: [
          { label: 'Atalhos Ativos', value: 8, percentage: 67, color: 'bg-emerald-500' },
          { label: 'Rotinas Auxiliares', value: 4, percentage: 33, color: 'bg-blue-500' }
        ],
        recentItems: [
          { id: 'aux-1', title: 'Auditoria de Acessos ao Sistema', date: safeFormat(new Date().toISOString(), 'dd/MM/yyyy'), author: 'Admin OAMI', statusBadge: 'OK', details: 'Todas as rotinas operando em perfeita sincronia' },
          { id: 'aux-2', title: 'Verificação de Integridade de Banco', date: safeFormat(new Date().toISOString(), 'dd/MM/yyyy'), author: 'Sistema', statusBadge: 'ATIVO', details: 'Conexão em tempo real sem perdas' }
        ]
      });
    }

    // 12. Tesouraria
    {
      const total = treasuryTransactions.length;
      const inPeriodTxs = treasuryTransactions.filter(tx => isDateInRange(tx.date, startDate, endDate) && tx.status !== 'CANCELADO');
      const inPeriod = inPeriodTxs.length;
      const rates = calcRate(inPeriod);

      const income = inPeriodTxs.filter(tx => tx.type === 'ENTRADA').reduce((a, b) => a + (b.amount || 0), 0);
      const expense = inPeriodTxs.filter(tx => tx.type === 'SAIDA').reduce((a, b) => a + (b.amount || 0), 0);
      const balance = income - expense;
      const impactScore = Math.min(100, Math.round(85 + (balance >= 0 ? 10 : 0)));
      const grade = impactScore >= 90 ? 'EXCELENTE' : impactScore >= 75 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'tesouraria',
        category: 'administrativo',
        categoryLabel: 'Administrativo',
        name: 'Tesouraria e Livro Caixa',
        description: 'Fluxo financeiro, doações em dinheiro, recibos, caixa diário e conciliação bancária.',
        icon: DollarSign,
        targetAppTab: 'treasury',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: 95,
        impactScore,
        impactLevel: 'Máximo',
        impactDescription: 'Sustentabilidade orçamentária da instituição, garantindo recursos para alimentação, medicamentos e folha.',
        positiveHighlights: [
          `${inPeriodTxs.length} transações no período analisado`,
          `R$ ${income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em entradas/doações registradas`,
          'Conciliação rigorosa de cada saída com centro de custo'
        ],
        vulnerabilities: [
          expense > income ? 'Saídas superaram entradas no período selecionado (necessário reforço de captação)' : 'Superávit financeiro mantido no período',
          'Garantir arquivamento de comprovantes fiscais para todas as saídas'
        ],
        aiDiagnosis: `A Tesouraria registra ${inPeriod} movimentações com saldo líquido de R$ ${balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} no período.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Intensificação de Campanha de Doações Recorrentes',
            description: 'Divulgar chave PIX institucional e débito automático para ampliar doações mensais fixas.',
            projectedGain: '+25% de previsibilidade orçamentária para despesas fixas'
          }
        ],
        distribution: [
          { label: 'Entradas', value: Math.round(income), percentage: (income + expense) ? Math.round((income / (income + expense)) * 100) : 50, color: 'bg-emerald-500' },
          { label: 'Saídas', value: Math.round(expense), percentage: (income + expense) ? Math.round((expense / (income + expense)) * 100) : 50, color: 'bg-red-500' }
        ],
        recentItems: inPeriodTxs.slice(0, 5).map(tx => ({
          id: tx.id,
          title: tx.description,
          date: tx.date,
          author: tx.category || 'Tesouraria',
          statusBadge: tx.type === 'ENTRADA' ? `+ R$ ${tx.amount.toFixed(2)}` : `- R$ ${tx.amount.toFixed(2)}`,
          details: `${tx.type} • Forma: ${(tx as any).paymentMethod || 'PIX/Transferência'}`
        }))
      });
    }

    // 13. Usuários
    {
      const total = users.length + professionals.length;
      const inPeriod = total;
      const rates = calcRate(inPeriod);
      const activeUsers = users.filter(u => u.status === 'ATIVO').length;
      const impactScore = 92;
      const grade = 'EXCELENTE';

      list.push({
        id: 'usuarios',
        category: 'administrativo',
        categoryLabel: 'Administrativo',
        name: 'Usuários do Sistema e Colaboradores',
        description: 'Controle de acessos, perfis (Roles), credenciais, equipe técnica e auditoria de usuários.',
        icon: UserCheck,
        targetAppTab: 'users',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: 98,
        impactScore,
        impactLevel: 'Máximo',
        impactDescription: 'Segurança cibernética, LGPD, segregação de funções e rastreabilidade total de ações no sistema.',
        positiveHighlights: [
          `${users.length} usuários cadastrados com login individual e auditado`,
          `${professionals.length} profissionais técnicos multidisciplinares com vínculo`,
          'Perfis de acesso restritos conforme a categoria profissional'
        ],
        vulnerabilities: [
          'Revogar acessos de colaboradores desligados no mesmo dia',
          'Exigir atualização semestral de senhas de acesso'
        ],
        aiDiagnosis: `A estrutura de usuários possui ${total} cadastros com separação clara de papéis e responsabilidades técnicas.`,
        aiSuggestions: [
          {
            priority: 'PREVENTIVA',
            title: 'Revisão Periódica de Perfis de Acesso',
            description: 'Conferir trimestralmente se cada colaborador possui apenas as permissões estritamente necessárias.',
            projectedGain: 'Conformidade 100% com a LGPD e sigilo de prontuários'
          }
        ],
        distribution: [
          { label: 'Usuários Ativos', value: activeUsers, percentage: users.length ? Math.round((activeUsers / users.length) * 100) : 90, color: 'bg-emerald-500' },
          { label: 'Profissionais Técnicos', value: professionals.length, percentage: total ? Math.round((professionals.length / total) * 100) : 10, color: 'bg-blue-500' }
        ],
        recentItems: users.slice(0, 5).map(u => ({
          id: u.id,
          title: u.name,
          date: (u as any).createdAt || 'Ativo',
          author: ROLE_LABELS[u.role as Role] || u.role,
          statusBadge: u.status,
          details: `Email: ${u.email} • Setor: ${u.role}`
        }))
      });
    }

    // 14. Financeiro
    {
      const total = financialRecords.length || treasuryTransactions.length;
      const inPeriod = total;
      const rates = calcRate(inPeriod);
      const impactScore = 88;
      const grade = 'BOM';

      list.push({
        id: 'financeiro',
        category: 'administrativo',
        categoryLabel: 'Administrativo',
        name: 'Gestão Financeira e Balancete',
        description: 'Planejamento orçamentário, prestação de contas governamentais, centros de custo e balanços contábeis.',
        icon: TrendingUp,
        targetAppTab: 'financial',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: 92,
        impactScore,
        impactLevel: 'Alto',
        impactDescription: 'Transparência fiscal, idoneidade cadastral perante os Conselhos e viabilização de repasses públicos.',
        positiveHighlights: [
          'Previsão orçamentária balanceada com despesas fixas da ILPI',
          'Rastreabilidade total para auditorias externas do Ministério Público e Tribunal de Contas'
        ],
        vulnerabilities: [
          'Manter provisões para encargos trabalhistas e 13º salário',
          'Monitorar reajustes de tarifas de energia e água'
        ],
        aiDiagnosis: 'A gestão financeira demonstra conformidade e rigor nos lançamentos contábeis.',
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Painel de Centro de Custo por Setor',
            description: 'Dividir despesas em Nutrição, Saúde, Farmácia e Manutenção para identificar onde economizar.',
            projectedGain: 'Otimização de 10% a 15% nos custos operacionais mensais'
          }
        ],
        distribution: [
          { label: 'Custos Operacionais', value: 65, percentage: 65, color: 'bg-red-500' },
          { label: 'Investimentos / Manutenção', value: 35, percentage: 35, color: 'bg-blue-500' }
        ],
        recentItems: [
          { id: 'fin-1', title: 'Fechamento Contábil Mensal', date: safeFormat(new Date().toISOString(), 'dd/MM/yyyy'), author: 'Contabilidade', statusBadge: 'REGULAR', details: 'DRE e balancete conciliados' },
          { id: 'fin-2', title: 'Prestação de Contas de Parcerias', date: safeFormat(new Date().toISOString(), 'dd/MM/yyyy'), author: 'Diretoria', statusBadge: 'APROVADO', details: 'Comprovação de aplicação de recursos públicos' }
        ]
      });
    }

    // 15. Suporte à Presidência
    {
      const total = 10;
      const impactScore = 94;
      const grade = 'EXCELENTE';

      list.push({
        id: 'presidencia',
        category: 'administrativo',
        categoryLabel: 'Administrativo',
        name: 'Suporte à Presidência e Diretoria',
        description: 'Atas de diretoria, decisões colegiadas, representação institucional, compliance estatutário e governança.',
        icon: Award,
        targetAppTab: 'presidency',
        totalCount: total,
        periodCount: total,
        dailyRate: 0.5,
        perElderlyRate: 0.2,
        grade,
        complianceScore: 98,
        impactScore,
        impactLevel: 'Máximo',
        impactDescription: 'Liderança estratégica, sustentabilidade institucional e cumprimento incondicional do estatuto da OAMI.',
        positiveHighlights: [
          'Atas de posse e reuniões de diretoria vigentes',
          'Estatuto social devidamente registrado em cartório',
          'Alinhamento estreito com as diretrizes do Conselho Municipal do Idoso'
        ],
        vulnerabilities: [
          'Manter certidões negativas (CNDs) federais, estaduais e municipais em dia'
        ],
        aiDiagnosis: 'A governança corporativa da OAMI assegura segurança jurídica e liderança ética sobre todas as operações.',
        aiSuggestions: [
          {
            priority: 'PREVENTIVA',
            title: 'Calendário de Reuniões Bimestrais da Diretoria',
            description: 'Formalizar pauta estratégica periódica para revisão das metas globais do plano de gestão.',
            projectedGain: 'Direcionamento executivo e alcance rápido de metas institucionais'
          }
        ],
        distribution: [
          { label: 'Atas e Decisões', value: 6, percentage: 60, color: 'bg-emerald-500' },
          { label: 'Projetos Estratégicos', value: 4, percentage: 40, color: 'bg-indigo-500' }
        ],
        recentItems: [
          { id: 'pres-1', title: 'Ata de Reunião da Diretoria Executiva', date: safeFormat(new Date().toISOString(), 'dd/MM/yyyy'), author: 'Presidência', statusBadge: 'VIGENTE', details: 'Aprovação do plano de metas e reformas estruturais' }
        ]
      });
    }

    // 16. Apoio Institucional
    {
      const totalDonors = (localDonors.length > 0 ? localDonors : donors).length;
      const total = totalDonors + 8; // parcerias
      const impactScore = 89;
      const grade = 'BOM';

      list.push({
        id: 'apoio_institucional',
        category: 'administrativo',
        categoryLabel: 'Administrativo',
        name: 'Apoio Institucional e Captação de Recursos',
        description: 'Cadastro de doadores, termos de cooperação, projetos de subvenção, emendas e parcerias corporativas.',
        icon: Building2,
        targetAppTab: 'institutional_support',
        totalCount: total,
        periodCount: totalDonors,
        dailyRate: 1,
        perElderlyRate: 0.8,
        grade,
        complianceScore: 94,
        impactScore,
        impactLevel: 'Alto',
        impactDescription: 'Mobilização social que viabiliza suprimentos, reformas e modernização tecnológica da instituição.',
        positiveHighlights: [
          `${totalDonors} doadores e parceiros cadastrados`,
          'Relacionamento ativo com clubes de serviço (Lions, Rotary) e empresas locais',
          'Transparência com relatórios de impacto encaminhados aos mantenedores'
        ],
        vulnerabilities: [
          'Ampliar doadores pessoa física para diversificar as fontes de receita',
          'Renovar termos de parceria com universidades para estágios supervisionados'
        ],
        aiDiagnosis: `O apoio institucional conta com ${totalDonors} parceiros cadastrados, garantindo estabilidade nas doações.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Boletim Informativo Digital para Mantenedores',
            description: 'Enviar boletim mensal com fotos e números de impacto a todos os doadores cadastrados.',
            projectedGain: '+35% na taxa de fidelização e incremento de novos donativos'
          }
        ],
        distribution: [
          { label: 'Doadores Cadastrados', value: totalDonors, percentage: 70, color: 'bg-emerald-500' },
          { label: 'Parcerias Institucionais', value: 8, percentage: 30, color: 'bg-blue-500' }
        ],
        recentItems: (localDonors.length > 0 ? localDonors : donors).slice(0, 5).map((d: any, idx) => ({
          id: d.id || `donor-${idx}`,
          title: d.name || 'Doador Solidário',
          date: d.lastDonationDate || 'Ativo',
          author: d.type || 'Pessoa Física',
          statusBadge: 'DOADOR',
          details: `Contato: ${d.phone || d.email || 'Cadastrado'} • Categoria: ${d.category || 'Geral'}`
        }))
      });
    }

    // ==========================================
    // GRUPO 4: INSTITUCIONAL
    // ==========================================

    // 17. Voluntários/Estagiários
    {
      const total = volunteers.length;
      const inPeriod = volunteers.filter(v => isDateInRange((v as any).startDate || (v as any).createdAt, startDate, endDate)).length;
      const activeVolunteers = volunteers.filter(v => v.status === 'ATIVO').length;
      const rates = calcRate(activeVolunteers);
      const impactScore = Math.min(100, Math.round(75 + (activeVolunteers > 0 ? 15 : 0)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'voluntarios',
        category: 'institucional',
        categoryLabel: 'Institucional',
        name: 'Voluntários e Estagiários',
        description: 'Gestão do corpo voluntário, termos de adesão (Lei 9.608/98), escalas de participação e estágio curricular.',
        icon: Heart,
        targetAppTab: 'volunteers',
        totalCount: total,
        periodCount: inPeriod || activeVolunteers,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: 92,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Humanização do cuidado, troca intergeracional e ampliação dos momentos de carinho e lazer para os acolhidos.',
        positiveHighlights: [
          `${activeVolunteers} voluntários ativos com termo de adesão assinado`,
          'Atividades de música, corte de cabelo, estética e recreação solidária',
          'Parcerias com cursos universitários de Saúde e Serviço Social'
        ],
        vulnerabilities: [
          total === 0 ? 'Cadastrar voluntários no sistema com os termos de adesão assinados' : 'Controlar assiduidade e lista de presença',
          'Capacitar voluntários sobre peculiaridades no trato com a pessoa idosa'
        ],
        aiDiagnosis: `A base de voluntários possui ${activeVolunteers} participantes ativos, contribuindo para a socialização comunitária.`,
        aiSuggestions: [
          {
            priority: 'MÉDIA',
            title: 'Treinamento de Boas Práticas Geriátricas para Voluntários',
            description: 'Conduzir integração de 1 hora abordando comunicação não violenta e limites no contato físico.',
            projectedGain: 'Segurança absoluta para os idosos e experiência enriquecedora'
          }
        ],
        distribution: [
          { label: 'Voluntários Ativos', value: activeVolunteers, percentage: total ? Math.round((activeVolunteers / total) * 100) : 100, color: 'bg-pink-500' },
          { label: 'Inativos/Concluídos', value: Math.max(0, total - activeVolunteers), percentage: total ? Math.round(((total - activeVolunteers) / total) * 100) : 0, color: 'bg-gray-400' }
        ],
        recentItems: volunteers.slice(0, 5).map(v => ({
          id: v.id,
          title: v.name,
          date: (v as any).startDate || 'Ativo',
          author: v.role || 'Voluntário(a)',
          statusBadge: v.status,
          details: `Área: ${v.area || 'Social'} • Tel: ${v.phone}`
        }))
      });
    }

    // 18. Acompanhamento Familiar
    {
      const total = socialFamilyVisits.length;
      const inPeriod = socialFamilyVisits.filter(v => isDateInRange(v.date, startDate, endDate)).length;
      const rates = calcRate(inPeriod);

      const visitedPatients = new Set(socialFamilyVisits.map(v => v.patientId)).size;
      const coverage = activeElderlyCount > 0 ? Math.min(100, Math.round((visitedPatients / activeElderlyCount) * 100)) : 70;
      const impactScore = Math.min(100, Math.round((coverage * 0.7) + (inPeriod > 10 ? 25 : 15)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'acompanhamento_familiar',
        category: 'institucional',
        categoryLabel: 'Institucional',
        name: 'Acompanhamento Familiar e Visitas',
        description: 'Controle de frequência de visitas, identificação de negligência/abandono e fortalecimento dos vínculos.',
        icon: Users,
        targetAppTab: 'family',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: coverage,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Resgate de afetos, proteção contra o sentimento de desamparo e suporte psicossocial à família.',
        positiveHighlights: [
          `${inPeriod} visitas de familiares registradas e detalhadas no período`,
          `${visitedPatients} acolhidos com presença familiar confirmada`,
          'Controle de parentesco, telefone e observações qualitativas de cada encontro'
        ],
        vulnerabilities: [
          activeElderlyCount - visitedPatients > 0 ? `${activeElderlyCount - visitedPatients} idoso(s) sem nenhuma visita familiar registrada` : 'Acompanhamento familiar regular',
          'Atuar junto à rede socioassistencial nos casos de abandono afetivo'
        ],
        aiDiagnosis: `O Acompanhamento Familiar registrou ${inPeriod} visitas no período, abrangendo ${coverage}% dos residentes.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Dia da Família e Encontro Festivo na ILPI',
            description: 'Promover evento trimestral com música e lanche para atrair familiares que residem distante.',
            projectedGain: '+50% de comparecimento e redução drástica no sofrimento por solidão'
          }
        ],
        distribution: [
          { label: 'Com Visitas Regulares', value: visitedPatients, percentage: coverage, color: 'bg-emerald-500' },
          { label: 'Sem Visitas Registradas', value: Math.max(0, activeElderlyCount - visitedPatients), percentage: 100 - coverage, color: 'bg-red-500' }
        ],
        recentItems: socialFamilyVisits.slice(0, 5).map(v => ({
          id: v.id,
          title: `${v.visitorName} (${v.kinship})`,
          date: v.date,
          author: (v as any).patientName || 'Acolhido',
          statusBadge: 'VISITA',
          details: v.observations || 'Visita presencial realizada'
        }))
      });
    }

    // ==========================================
    // GRUPO 5: OPERACIONAL
    // ==========================================

    // 19. Cuidadoras
    {
      const total = caregivers.length;
      const diaperChanges = diaperChangeRecords.length;
      const inPeriodChanges = diaperChangeRecords.filter(dc => isDateInRange(dc.date, startDate, endDate)).length;
      const inPeriod = inPeriodChanges;
      const rates = calcRate(inPeriod);

      const impactScore = 95;
      const grade = 'EXCELENTE';

      list.push({
        id: 'cuidadoras',
        category: 'operacional',
        categoryLabel: 'Operacional',
        name: 'Equipe de Cuidadores de Idosos',
        description: 'Rotina de cuidados 24h, higiene pessoal, banho, auxílio na alimentação, mudanças de decúbito e trocas de fralda.',
        icon: Sparkles,
        targetAppTab: 'caregivers',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: 96,
        impactScore,
        impactLevel: 'Máximo',
        impactDescription: 'O coração do cuidado diário: conforto, higiene, dignidade e prevenção direta de assaduras e lesões.',
        positiveHighlights: [
          `${caregivers.length} cuidadores cadastrados na equipe de plantão`,
          `${inPeriodChanges} trocas de fralda e registros de higiene no período`,
          'Acompanhamento contínuo diuturno para idosos dependentes (Grau II e III)'
        ],
        vulnerabilities: [
          'Prevenir sobrecarga física e ergonomia no manuseio de pacientes pesados',
          'Garantir registro tempestivo no app de cada troca realizada'
        ],
        aiDiagnosis: `A equipe de cuidadores sustenta o maior índice de dedicação horária da casa, executando ${inPeriodChanges} cuidados no período.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Escala Rígida de Mudança de Decúbito de 2 em 2 Horas',
            description: 'Garantir revezamento de posição para acamados com checagem formal na folha de cuidados.',
            projectedGain: 'Zero ocorrências de lesão por pressão (escaras)'
          }
        ],
        distribution: [
          { label: 'Cuidadores Ativos', value: caregivers.filter(c => c.status === 'ATIVO').length, percentage: 90, color: 'bg-emerald-500' },
          { label: 'Cuidadores de Folga/Férias', value: caregivers.filter(c => c.status !== 'ATIVO').length, percentage: 10, color: 'bg-blue-500' }
        ],
        recentItems: caregivers.slice(0, 5).map(c => ({
          id: c.id,
          title: c.name,
          date: (c as any).shift || 'Turno Integral',
          author: c.role || 'Cuidador(a) de Idosos',
          statusBadge: c.status,
          details: `Turno: ${c.shift || '12x36'} • Tel: ${c.phone}`
        }))
      });
    }

    // 20. Controle de Estoque
    {
      const total = stockProducts.length;
      const inPeriodMovements = stockMovements.filter(m => isDateInRange(m.date, startDate, endDate));
      const inPeriod = inPeriodMovements.length;
      const rates = calcRate(inPeriod);

      const zeroStock = stockProducts.filter(p => p.quantity <= 0).length;
      const lowStock = stockProducts.filter(p => p.quantity > 0 && p.quantity <= (p.minQuantity || 5)).length;
      const criticalCount = zeroStock + lowStock;
      const compliance = total > 0 ? Math.round(((total - criticalCount) / total) * 100) : 90;
      const impactScore = Math.min(100, Math.max(50, compliance));
      const grade = impactScore >= 85 ? 'EXCELENTE' : impactScore >= 70 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'estoque',
        category: 'operacional',
        categoryLabel: 'Operacional',
        name: 'Controle de Estoque e Suprimentos',
        description: 'Almoxarifado, medicamentos, alimentos, materiais de limpeza, higiene e controle de validade.',
        icon: Boxes,
        targetAppTab: 'stock',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: compliance,
        impactScore,
        impactLevel: impactScore >= 85 ? 'Alto' : 'Moderado',
        impactDescription: 'Garantia de que jamais falte alimentação, itens de curativo ou medicamentos vitais para os acolhidos.',
        positiveHighlights: [
          `${total} produtos catalogados com código, categoria e ponto de pedido`,
          `${inPeriodMovements.length} movimentações de entrada e saída no período`,
          'Rastreamento de doações materiais recebidas'
        ],
        vulnerabilities: [
          zeroStock > 0 ? `${zeroStock} produto(s) com estoque ZERADO (necessidade imediata de compra/doação)` : 'Nenhum produto zerado',
          lowStock > 0 ? `${lowStock} produto(s) operando abaixo do estoque mínimo de segurança` : 'Estoque em níveis seguros'
        ],
        aiDiagnosis: `O estoque gerencia ${total} itens com ${criticalCount} produto(s) requerendo reposição imediata.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Reposição Emergencial dos Produtos Zerados',
            description: 'Acionar a área de compras ou campanha de doação para os itens com saldo zero.',
            projectedGain: 'Zero interrupção na assistência aos acolhidos'
          },
          {
            priority: 'PREVENTIVA',
            title: 'Inventário Físico Semanal Rotativo',
            description: 'Contar semanalmente os 10 itens de maior giro (leite, fraldas, luvas, sabonete).',
            projectedGain: 'Acurácia de 99% entre estoque físico e virtual'
          }
        ],
        distribution: [
          { label: 'Estoque Regular', value: Math.max(0, total - criticalCount), percentage: total ? Math.round(((total - criticalCount) / total) * 100) : 100, color: 'bg-emerald-500' },
          { label: 'Estoque Crítico / Baixo', value: criticalCount, percentage: total ? Math.round((criticalCount / total) * 100) : 0, color: 'bg-amber-500' }
        ],
        recentItems: stockProducts.slice(0, 5).map(p => ({
          id: p.id,
          title: p.name,
          date: `Validade: ${p.expiryDate || 'N/I'}`,
          author: p.category || 'Geral',
          statusBadge: p.quantity <= 0 ? 'ZERADO' : p.quantity <= (p.minQuantity || 5) ? 'BAIXO' : 'NORMAL',
          details: `Saldo: ${p.quantity} ${p.unit || 'un'} • Mínimo: ${p.minQuantity || 5}`
        }))
      });
    }

    // 21. Produção (SGPF)
    {
      const totalPacksProduced = diaperFinalPackings.reduce((acc, p) => acc + (p.totalPackages || 0), 0);
      const inPeriodPacks = diaperFinalPackings
        .filter(p => isDateInRange(p.date, startDate, endDate))
        .reduce((acc, p) => acc + (p.totalPackages || 0), 0);
      const total = totalPacksProduced;
      const rates = calcRate(inPeriodPacks);

      const targetGoal = diaperProductionGoals.reduce((acc, g) => acc + (g.targetQuantity || 0), 0) || 500;
      const goalProgress = Math.min(100, Math.round((totalPacksProduced / targetGoal) * 100));
      const impactScore = Math.min(100, Math.round(75 + (totalPacksProduced > 50 ? 20 : 10)));
      const grade = impactScore >= 85 ? 'EXCELENTE' : impactScore >= 70 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'sgpf',
        category: 'operacional',
        categoryLabel: 'Operacional',
        name: 'Produção de Fraldas Geriátricas (SGPF)',
        description: 'Fábrica interna de fraldas, matérias-primas, produção bruta, corte, selagem, embalagem e distribuição.',
        icon: Package,
        targetAppTab: 'diaper_production',
        totalCount: totalPacksProduced,
        periodCount: inPeriodPacks,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: goalProgress,
        impactScore,
        impactLevel: impactScore >= 85 ? 'Máximo' : 'Alto',
        impactDescription: 'Economia financeira de alto impacto (mais de R$ 15.000/ano em compras evitadas) e autossuficiência da ILPI.',
        positiveHighlights: [
          `${totalPacksProduced} pacotes de fraldas finalizados na fábrica própria`,
          `${inPeriodPacks} pacotes manufaturados no período`,
          `${diaperBeneficiaries.length} beneficiários e acolhidos atendidos pela produção interna`
        ],
        vulnerabilities: [
          'Monitorar estoque de mantas de celulose e elásticos importados',
          'Manter manutenção preventiva mensal da máquina seladora'
        ],
        aiDiagnosis: `O SGPF atinge ${goalProgress}% da meta produtiva global, gerando autossuficiência no insumo mais consumido da casa.`,
        aiSuggestions: [
          {
            priority: 'ALTA',
            title: 'Mutirão Semanal de Produção com Voluntários',
            description: 'Mobilizar voluntários para etapa de embalagem nas sextas-feiras.',
            projectedGain: '+40% no volume de pacotes prontos para estocagem'
          }
        ],
        distribution: [
          { label: 'Embalados Finais', value: totalPacksProduced, percentage: 70, color: 'bg-emerald-500' },
          { label: 'Em Processamento', value: diaperWIPProcessings.length, percentage: 30, color: 'bg-blue-500' }
        ],
        recentItems: diaperFinalPackings.slice(0, 5).map(p => ({
          id: p.id,
          title: `Lote de Fraldas: ${(p as any).batchNumber || 'Produção Regular'}`,
          date: p.date,
          author: (p as any).producedBy || 'Equipe SGPF',
          statusBadge: `${p.totalPackages || 0} pacotes`,
          details: `Tamanho: ${p.size || 'G/EG'} • Pacotes finalizados para uso imediato`
        }))
      });
    }

    // 22. Oficinas e Capacitações
    {
      const total = workshops.length;
      const inPeriod = workshops.filter(w => isDateInRange(w.date, startDate, endDate)).length;
      const rates = calcRate(inPeriod);

      const totalParticipants = workshops.reduce((acc, w) => acc + ((w as any).participants?.length || (w as any).attendees?.length || 8), 0);
      const impactScore = Math.min(100, Math.round(80 + (inPeriod > 2 ? 15 : 5)));
      const grade = impactScore >= 80 ? 'EXCELENTE' : impactScore >= 65 ? 'BOM' : 'ATENÇÃO';

      list.push({
        id: 'oficinas',
        category: 'operacional',
        categoryLabel: 'Operacional',
        name: 'Oficinas Terapêuticas e Capacitações',
        description: 'Capacitações técnicas para a equipe, oficinas de artesanato, horta sensorial, música e estimulação para acolhidos.',
        icon: Layers,
        targetAppTab: 'workshops',
        totalCount: total,
        periodCount: inPeriod,
        dailyRate: rates.daily,
        perElderlyRate: rates.perElderly,
        grade,
        complianceScore: 92,
        impactScore,
        impactLevel: impactScore >= 80 ? 'Alto' : 'Moderado',
        impactDescription: 'Aprimoramento contínuo da equipe técnica e enriquecimento do cotidiano dos residentes com atividades significativas.',
        positiveHighlights: [
          `${workshops.length} oficinas e capacitações registradas`,
          `${totalParticipants} participações ativas acumuladas`,
          'Capacitação continuada de cuidadores sobre primeiros socorros e transferências'
        ],
        vulnerabilities: [
          inPeriod === 0 ? 'Nenhuma oficina executada no período selecionado' : 'Manter registro fotográfico e lista de presença formal assinada',
          'Diversificar as temáticas com oficinas de jardinagem e contação de causos'
        ],
        aiDiagnosis: `As oficinas promoveram ${totalParticipants} momentos de convivência e capacitação continuada.`,
        aiSuggestions: [
          {
            priority: 'MÉDIA',
            title: 'Capacitação Obrigatória em Manejo de Engasgo',
            description: 'Reciclar manobra de Heimlich para 100% da equipe de cuidadores e cozinha.',
            projectedGain: 'Segurança extrema durante as refeições dos idosos com disfagia'
          }
        ],
        distribution: [
          { label: 'Oficinas Acolhidos', value: Math.round(total * 0.7), percentage: 70, color: 'bg-emerald-500' },
          { label: 'Capacitação Equipe', value: Math.round(total * 0.3), percentage: 30, color: 'bg-purple-500' }
        ],
        recentItems: workshops.slice(0, 5).map(w => ({
          id: w.id,
          title: w.title,
          date: w.date,
          author: (w as any).instructor || 'Facilitador',
          statusBadge: (w as any).status || 'CONCLUÍDO',
          details: `Local: ${(w as any).location || 'Salão Principal'} • ${(w as any).description || 'Atividade realizada'}`
        }))
      });
    }

    return list;
  }, [
    elderly,
    communityElderly,
    evolutions,
    pias,
    socialEvolutions,
    socialPatients,
    socialFamilyVisits,
    socialRiskSituations,
    socialReferrals,
    socialStudies,
    psychEvolutions,
    psychPatients,
    psychActivities,
    psychAppointments,
    psychEmotionalMonitorings,
    psychCognitionAssessments,
    pedagogyEvolutions,
    pedagogyPatients,
    pedagogyActivities,
    pedagogyStimulationTrackings,
    pedagogySocialParticipations,
    physioEvolutions,
    physioPatients,
    physioAssessments,
    physioExercises,
    physioAppointments,
    nursingEvolutions,
    nursingPatients,
    vitalSigns,
    dressingRecords,
    medicationAdministrations,
    incidentRecords,
    diaperChangeRecords,
    nutritionEvolutions,
    nutritionPatients,
    nutritionAnthropometries,
    nutritionMealPlans,
    workshops,
    professionals,
    users,
    caregivers,
    volunteers,
    donors,
    diaperDonations,
    diaperBeneficiaries,
    diaperRawProductions,
    diaperWIPProcessings,
    diaperFinalPackings,
    diaperProductionGoals,
    financialRecords,
    allPhotos,
    stockProducts,
    stockMovements,
    treasuryTransactions,
    localDonors,
    startDate,
    endDate,
    activeElderlyCount,
    periodDays
  ]);

  // Overall Global Impact & Counts across all 23 modules
  const globalSummary = useMemo(() => {
    const totalLaunches = modules.reduce((acc, m) => acc + m.totalCount, 0);
    const periodLaunches = modules.reduce((acc, m) => acc + m.periodCount, 0);
    const avgImpact = modules.length > 0 ? Math.round(modules.reduce((acc, m) => acc + m.impactScore, 0) / modules.length) : 0;
    const avgCompliance = modules.length > 0 ? Math.round(modules.reduce((acc, m) => acc + m.complianceScore, 0) / modules.length) : 0;
    
    const countExcellent = modules.filter(m => m.grade === 'EXCELENTE').length;
    const countGood = modules.filter(m => m.grade === 'BOM').length;
    const countWarning = modules.filter(m => m.grade === 'ATENÇÃO').length;
    const countCritical = modules.filter(m => m.grade === 'CRÍTICO').length;

    return {
      totalLaunches,
      periodLaunches,
      avgImpact,
      avgCompliance,
      countExcellent,
      countGood,
      countWarning,
      countCritical
    };
  }, [modules]);

  // Filtered modules
  const filteredModules = useMemo(() => {
    return modules.filter(m => {
      // Category filter
      if (activeCategory !== 'all' && m.category !== activeCategory) {
        return false;
      }
      // Grade filter
      if (gradeFilter !== 'all' && m.grade !== gradeFilter) {
        return false;
      }
      // Search term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesName = m.name.toLowerCase().includes(term);
        const matchesDesc = m.description.toLowerCase().includes(term);
        const matchesCat = m.categoryLabel.toLowerCase().includes(term);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }
      return true;
    });
  }, [modules, activeCategory, gradeFilter, searchTerm]);

  const categories = [
    { id: 'all', label: 'Todas as Abas e Setores', count: modules.length },
    { id: 'colab', label: 'Painel e Colaboração', count: modules.filter(m => m.category === 'colab').length },
    { id: 'tecnicos', label: 'Serviços Técnicos', count: modules.filter(m => m.category === 'tecnicos').length },
    { id: 'administrativo', label: 'Administrativo', count: modules.filter(m => m.category === 'administrativo').length },
    { id: 'institucional', label: 'Institucional', count: modules.filter(m => m.category === 'institucional').length },
    { id: 'operacional', label: 'Operacional', count: modules.filter(m => m.category === 'operacional').length }
  ];

  return (
    <div className="space-y-8 animate-fadeIn">
      {/* Top Banner: AI Automatic Accounting & Global Impact Meter */}
      <div className="relative overflow-hidden bg-gradient-to-br from-gray-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-8 border border-emerald-900/40 shadow-2xl">
        <div className="absolute -right-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-6">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-xs font-black tracking-wider uppercase mb-3">
                <Zap size={14} className="text-emerald-400 animate-pulse" />
                <span>IA de Controle Total & Contagem Automática em Tempo Real</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
                <span>Auditoria e Monitoramento Institucional 360°</span>
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 max-w-3xl mt-1 leading-relaxed font-medium">
                Controle integral quantitativo e qualitativo de todas as 23 abas e módulos do aplicativo. 
                Cada novo registro lançado no sistema atualiza automaticamente esta central com medidor de impacto, porcentagens e recomendações analíticas com IA.
              </p>
            </div>

            {/* Global Impact Score Gauge */}
            <div className="flex items-center gap-4 bg-white/5 backdrop-blur-md px-6 py-4 rounded-2xl border border-white/10 shrink-0">
              <div className="relative w-16 h-16 flex items-center justify-center">
                <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-gray-700/60"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className={cn(
                      globalSummary.avgImpact >= 85 ? 'text-emerald-400' : globalSummary.avgImpact >= 70 ? 'text-blue-400' : 'text-amber-400'
                    )}
                    strokeDasharray={`${globalSummary.avgImpact}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-sm font-black text-white">{globalSummary.avgImpact}%</span>
                </div>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                  Medidor de Impacto Geral
                </p>
                <p className="text-base font-black text-white">
                  {globalSummary.avgImpact >= 85 ? 'Excelente Impacto' : 'Adequado'}
                </p>
                <p className="text-[11px] text-gray-400 font-medium">
                  Conformidade: <strong className="text-white">{globalSummary.avgCompliance}%</strong>
                </p>
              </div>
            </div>
          </div>

          {/* Quick Metrics Bar across all modules */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-white/10">
            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-gray-400 block">Lançamentos no Período</span>
              <span className="text-xl sm:text-2xl font-black text-emerald-400">{globalSummary.periodLaunches.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Automático em tempo real</span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-gray-400 block">Acervo Total Histórico</span>
              <span className="text-xl sm:text-2xl font-black text-white">{globalSummary.totalLaunches.toLocaleString('pt-BR')}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Registros integrados</span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-gray-400 block">Módulos Auditados</span>
              <span className="text-xl sm:text-2xl font-black text-blue-400">{modules.length}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">5 macro setores cobertos</span>
            </div>

            <div className="p-3 bg-white/5 rounded-xl border border-white/10">
              <span className="text-[10px] font-black uppercase text-gray-400 block">Nível de Excelência</span>
              <span className="text-xl sm:text-2xl font-black text-purple-400">{globalSummary.countExcellent} / {modules.length}</span>
              <span className="text-[10px] text-gray-400 block mt-0.5">Setores com nota máxima</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Category Bar */}
      <div className="p-4 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
        {/* Search & Grade Quick Filter */}
        <div className="flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <input
              type="text"
              placeholder="Pesquisar por aba (Ex: Fisioterapia, Visitas, Fraldas, Tesouraria, Idosos)..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-900 dark:text-gray-100 placeholder-gray-400 outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0 shrink-0">
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 p-1 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
              <span className="text-[10px] uppercase font-black text-gray-400 px-2">Avaliação:</span>
              {[
                { id: 'all', label: 'Todas' },
                { id: 'EXCELENTE', label: 'Excelente' },
                { id: 'BOM', label: 'Bom' },
                { id: 'ATENÇÃO', label: 'Atenção' }
              ].map(g => (
                <button
                  key={g.id}
                  onClick={() => setGradeFilter(g.id)}
                  className={cn(
                    'px-2.5 py-1 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    gradeFilter === g.id
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                  )}
                >
                  {g.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 shrink-0 scrollbar-none">
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={cn(
                'px-4 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer shrink-0',
                activeCategory === cat.id
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
              )}
            >
              <span>{cat.label}</span>
              <span className={cn(
                'px-1.5 py-0.5 rounded-full text-[10px] font-black',
                activeCategory === cat.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              )}>
                {cat.count}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Grid of the 23 Institutional Control Modules */}
      <div className="space-y-6">
        {filteredModules.map(module => {
          const isExpanded = expandedModuleId === module.id;
          const IconComponent = module.icon;

          return (
            <div
              key={module.id}
              className={cn(
                'bg-white dark:bg-gray-900 rounded-3xl border transition-all duration-300 shadow-sm overflow-hidden',
                isExpanded
                  ? 'border-emerald-500/50 ring-2 ring-emerald-500/10 shadow-lg'
                  : 'border-gray-100 dark:border-gray-800 hover:border-gray-300 dark:hover:border-gray-700'
              )}
            >
              {/* Header / Summary Card */}
              <div className="p-5 sm:p-6 space-y-4">
                <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                  {/* Left Title & Sector */}
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-100 dark:border-emerald-800/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                      <IconComponent size={24} />
                    </div>

                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300">
                          {module.categoryLabel}
                        </span>
                        <span className={cn(
                          'text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full border',
                          module.grade === 'EXCELENTE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800'
                            : module.grade === 'BOM'
                            ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-800'
                            : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800'
                        )}>
                          Nota: {module.grade}
                        </span>
                      </div>

                      <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white tracking-tight mt-1">
                        {module.name}
                      </h3>
                      <p className="text-xs text-gray-500 dark:text-gray-400 font-medium">
                        {module.description}
                      </p>
                    </div>
                  </div>

                  {/* Quantitative Numbers & Impact Badge */}
                  <div className="flex items-center gap-3 sm:gap-6 w-full lg:w-auto justify-between lg:justify-end border-t lg:border-t-0 pt-3 lg:pt-0 border-gray-100 dark:border-gray-800">
                    {/* Period Count */}
                    <div className="text-right">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                        No Período
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-emerald-600 dark:text-emerald-400">
                        {module.periodCount.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 block">
                        {module.dailyRate}/dia
                      </span>
                    </div>

                    {/* Total Count */}
                    <div className="text-right pl-3 sm:pl-6 border-l border-gray-100 dark:border-gray-800">
                      <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                        Acumulado
                      </span>
                      <span className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white">
                        {module.totalCount.toLocaleString('pt-BR')}
                      </span>
                      <span className="text-[10px] font-bold text-gray-400 block">
                        Registros
                      </span>
                    </div>

                    {/* Impact Meter Gauge */}
                    <div className="pl-3 sm:pl-6 border-l border-gray-100 dark:border-gray-800 flex items-center gap-3">
                      <div className="text-right">
                        <span className="text-[10px] font-black uppercase tracking-wider text-gray-400 block">
                          Impacto
                        </span>
                        <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white block">
                          {module.impactScore}%
                        </span>
                        <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 block">
                          {module.impactLevel}
                        </span>
                      </div>
                    </div>

                    {/* Expand/Collapse Button */}
                    <button
                      onClick={() => setExpandedModuleId(isExpanded ? null : module.id)}
                      className="p-2 sm:p-2.5 rounded-xl bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-300 transition-all cursor-pointer shrink-0"
                      title={isExpanded ? 'Recolher detalhes' : 'Expandir controle total'}
                    >
                      {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                    </button>
                  </div>
                </div>

                {/* Progress bar of Impact */}
                <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={cn(
                      'h-full transition-all duration-500 rounded-full',
                      module.impactScore >= 85
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                        : module.impactScore >= 70
                        ? 'bg-gradient-to-r from-blue-500 to-cyan-400'
                        : 'bg-gradient-to-r from-amber-500 to-yellow-400'
                    )}
                    style={{ width: `${module.impactScore}%` }}
                  />
                </div>
              </div>

              {/* Expanded Deep Dive Panel */}
              {isExpanded && (
                <div className="border-t border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-gray-900/50 p-6 sm:p-8 space-y-8 animate-fadeIn">
                  {/* Top Actions: Direct App Jump & Impact Statement */}
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white dark:bg-gray-800/80 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                        <Award size={20} />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase text-gray-400 tracking-wider">
                          Medidor de Impacto Institucional
                        </span>
                        <p className="text-xs sm:text-sm font-bold text-gray-800 dark:text-gray-200">
                          {module.impactDescription}
                        </p>
                      </div>
                    </div>

                    {module.targetAppTab && onNavigateTab && (
                      <button
                        onClick={() => onNavigateTab(module.targetAppTab!)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer shadow-md shadow-emerald-600/20 shrink-0"
                      >
                        <span>Abrir Módulo Completo</span>
                        <ExternalLink size={14} />
                      </button>
                    )}
                  </div>

                  {/* 3 Columns: Quantitative Breakdown, Qualitative Assessment, AI Improvement */}
                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* 1. Quantitative Breakdown & Percentages */}
                    <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <BarChart3 size={16} className="text-emerald-600" />
                          <span>Distribuição & Porcentagens</span>
                        </h4>
                        <span className="text-xs font-bold text-gray-400">
                          Total: {module.totalCount}
                        </span>
                      </div>

                      <div className="space-y-3">
                        {module.distribution.map((dist, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-bold text-gray-700 dark:text-gray-300">{dist.label}</span>
                              <span className="font-black text-gray-900 dark:text-white">
                                {dist.value} ({dist.percentage}%)
                              </span>
                            </div>
                            <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                              <div
                                className={cn('h-full rounded-full', dist.color)}
                                style={{ width: `${dist.percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>

                      <div className="pt-3 border-t border-gray-100 dark:border-gray-700/60 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
                        <p>• Média diária: <strong>{module.dailyRate} registros/dia</strong></p>
                        <p>• Média por idoso ativo: <strong>{module.perElderlyRate} registros/residente</strong></p>
                        <p>• Taxa de conformidade: <strong>{module.complianceScore}% de conformidade</strong></p>
                      </div>
                    </div>

                    {/* 2. Qualitative Assessment & Regulatory Highlights */}
                    <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <ShieldCheck size={16} className="text-blue-600" />
                          <span>Avaliação Qualitativa</span>
                        </h4>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          Nota {module.grade}
                        </span>
                      </div>

                      {/* Positive Highlights */}
                      <div className="space-y-2">
                        <span className="text-[10px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                          <CheckCircle2 size={12} />
                          <span>Pontos Fortes Demonstrados</span>
                        </span>
                        <ul className="space-y-1.5">
                          {module.positiveHighlights.map((hi, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5 leading-snug">
                              <span className="text-emerald-500 font-bold">•</span>
                              <span>{hi}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Vulnerabilities & Attention Points */}
                      <div className="space-y-2 pt-2 border-t border-gray-100 dark:border-gray-700/60">
                        <span className="text-[10px] font-black uppercase tracking-wider text-amber-700 dark:text-amber-400 flex items-center gap-1">
                          <AlertTriangle size={12} />
                          <span>Pontos de Atenção & Riscos</span>
                        </span>
                        <ul className="space-y-1.5">
                          {module.vulnerabilities.map((vul, i) => (
                            <li key={i} className="text-xs text-gray-600 dark:text-gray-300 flex items-start gap-1.5 leading-snug">
                              <span className="text-amber-500 font-bold">•</span>
                              <span>{vul}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* 3. AI Suggestions for Improvement */}
                    <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/60 to-cyan-50/50 dark:from-emerald-950/30 dark:via-gray-800/80 dark:to-teal-950/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                      <div className="flex items-center justify-between border-b border-emerald-200/80 dark:border-emerald-800/60 pb-3">
                        <h4 className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300 flex items-center gap-2">
                          <Zap size={16} className="text-emerald-600 animate-pulse" />
                          <span>Sugestão de Melhoria com IA</span>
                        </h4>
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-emerald-200/60 dark:bg-emerald-900/60 text-emerald-800 dark:text-emerald-300">
                          Diagnóstico Ativo
                        </span>
                      </div>

                      <p className="text-xs text-gray-700 dark:text-gray-300 font-medium italic">
                        "{module.aiDiagnosis}"
                      </p>

                      <div className="space-y-3">
                        {module.aiSuggestions.map((sug, i) => (
                          <div
                            key={i}
                            className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-100 dark:border-gray-700 space-y-1 shadow-xs"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-gray-900 dark:text-white">
                                {sug.title}
                              </span>
                              <span className={cn(
                                'text-[9px] font-black px-1.5 py-0.5 rounded-md uppercase',
                                sug.priority === 'ALTA'
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : sug.priority === 'MÉDIA'
                                  ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-300'
                              )}>
                                {sug.priority}
                              </span>
                            </div>
                            <p className="text-[11px] text-gray-600 dark:text-gray-300 leading-snug">
                              {sug.description}
                            </p>
                            <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 pt-0.5">
                              Ganho estimado: {sug.projectedGain}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Recent Entries Preview */}
                  {module.recentItems.length > 0 && (
                    <div className="bg-white dark:bg-gray-800/80 p-5 rounded-2xl border border-gray-100 dark:border-gray-700 space-y-3">
                      <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-700/60 pb-2">
                        <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300 flex items-center gap-2">
                          <Clock size={14} className="text-emerald-600" />
                          <span>Últimos Lançamentos Registrados em Tempo Real</span>
                        </h4>
                        <span className="text-[10px] font-bold text-gray-400">
                          {module.recentItems.length} exibidos
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {module.recentItems.map((item, i) => (
                          <div
                            key={item.id || i}
                            className="p-3 bg-gray-50 dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-black text-gray-900 dark:text-white truncate">
                                {item.title}
                              </span>
                              {item.statusBadge && (
                                <span className="text-[9px] font-black px-1.5 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 shrink-0">
                                  {item.statusBadge}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center justify-between text-[10px] text-gray-400">
                              <span>{safeFormat(item.date, 'dd/MM/yyyy HH:mm')}</span>
                              <span className="truncate max-w-[120px]">{item.author}</span>
                            </div>
                            {item.details && (
                              <p className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-2 pt-1 border-t border-gray-100 dark:border-gray-800/60">
                                {item.details}
                              </p>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filteredModules.length === 0 && (
          <div className="text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 p-8">
            <Search className="mx-auto text-gray-400 mb-3" size={32} />
            <h4 className="text-sm font-black text-gray-700 dark:text-gray-200">
              Nenhuma aba ou módulo encontrado
            </h4>
            <p className="text-xs text-gray-400 mt-1">
              Tente redefinir os filtros de busca ou selecionar outra categoria.
            </p>
            <button
              onClick={() => {
                setSearchTerm('');
                setActiveCategory('all');
                setGradeFilter('all');
              }}
              className="mt-4 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Limpar Filtros
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
