import {
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  startOfYear,
  endOfYear,
  parseISO,
  isWithinInterval,
  differenceInDays,
  differenceInYears,
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  PeriodPreset,
  ManagementAlert,
  UnifiedEvolutionItem,
  ElderlyMonitoringSummary,
  MonitoringSectionProps
} from './monitoringTypes';
import { StockProduct, StockMovement, TreasuryTransaction, Elderly, PIA, VitalSigns } from '../../types';

export function getDateRangeForPreset(preset: PeriodPreset): { startDate: string; endDate: string } {
  const now = new Date();
  const formatIso = (d: Date) => format(d, 'yyyy-MM-dd');

  switch (preset) {
    case 'today':
      return {
        startDate: formatIso(startOfDay(now)),
        endDate: formatIso(endOfDay(now))
      };
    case 'week':
      return {
        startDate: formatIso(startOfWeek(now, { weekStartsOn: 1 })),
        endDate: formatIso(endOfWeek(now, { weekStartsOn: 1 }))
      };
    case 'month':
      return {
        startDate: formatIso(startOfMonth(now)),
        endDate: formatIso(endOfMonth(now))
      };
    case 'last_month': {
      const prev = subMonths(now, 1);
      return {
        startDate: formatIso(startOfMonth(prev)),
        endDate: formatIso(endOfMonth(prev))
      };
    }
    case 'year':
      return {
        startDate: formatIso(startOfYear(now)),
        endDate: formatIso(endOfYear(now))
      };
    case 'all':
      return {
        startDate: '2020-01-01',
        endDate: formatIso(endOfYear(now))
      };
    case 'custom':
    default:
      return {
        startDate: formatIso(startOfMonth(now)),
        endDate: formatIso(endOfMonth(now))
      };
  }
}

export function isDateInRange(dateStr: string | undefined | null, startDate: string, endDate: string): boolean {
  if (!dateStr) return false;
  try {
    const d = parseISO(dateStr.slice(0, 10));
    if (isNaN(d.getTime())) return false;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return isWithinInterval(d, { start: startOfDay(start), end: endOfDay(end) });
  } catch {
    return false;
  }
}

export function buildUnifiedEvolutions(props: MonitoringSectionProps): UnifiedEvolutionItem[] {
  const {
    evolutions = [],
    socialEvolutions = [],
    psychEvolutions = [],
    pedagogyEvolutions = [],
    physioEvolutions = [],
    nursingEvolutions = [],
    nutritionEvolutions = [],
    elderly = []
  } = props;

  const elderlyMap = new Map<string, string>();
  elderly.forEach(e => {
    if (e.id) elderlyMap.set(e.id, e.name);
  });

  const list: UnifiedEvolutionItem[] = [];

  (evolutions || []).forEach(e => {
    list.push({
      id: `gen-${e.id}`,
      elderlyId: e.elderlyId,
      elderlyName: elderlyMap.get(e.elderlyId) || (e as any).elderlyName || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || (e as any).professional || 'Profissional',
      professionalRole: e.professionalRole || 'Geral',
      sector: 'Geral',
      content: (e as any).notes || (e as any).evolution || e.content || '',
      photos: (e as any).photos || []
    });
  });

  (socialEvolutions || []).forEach(e => {
    const eid = e.patientId || (e as any).elderlyId || '';
    list.push({
      id: `soc-${e.id}`,
      elderlyId: eid,
      elderlyName: elderlyMap.get(eid) || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || 'Assistente Social',
      professionalRole: 'ASSISTENTE_SOCIAL',
      sector: 'Serviço Social',
      content: e.observation || (e as any).content || '',
      conduct: (e as any).conduct || '',
      photos: (e as any).photos || []
    });
  });

  (psychEvolutions || []).forEach(e => {
    const eid = e.patientId || (e as any).elderlyId || '';
    list.push({
      id: `psy-${e.id}`,
      elderlyId: eid,
      elderlyName: elderlyMap.get(eid) || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || 'Psicóloga',
      professionalRole: 'PSICOLOGA',
      sector: 'Psicologia',
      content: e.observation || (e as any).content || '',
      conduct: (e as any).intervention || (e as any).conduct || '',
      photos: (e as any).photos || []
    });
  });

  (pedagogyEvolutions || []).forEach(e => {
    const eid = e.patientId || (e as any).elderlyId || '';
    list.push({
      id: `ped-${e.id}`,
      elderlyId: eid,
      elderlyName: elderlyMap.get(eid) || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || 'Pedagoga',
      professionalRole: 'PEDAGOGA',
      sector: 'Pedagogia',
      content: e.observations || (e as any).content || '',
      conduct: (e as any).conduct || '',
      photos: (e as any).photos || []
    });
  });

  (physioEvolutions || []).forEach(e => {
    const eid = e.patientId || (e as any).elderlyId || '';
    list.push({
      id: `phy-${e.id}`,
      elderlyId: eid,
      elderlyName: elderlyMap.get(eid) || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || 'Fisioterapeuta',
      professionalRole: 'FISIOTERAPEUTA',
      sector: 'Fisioterapia',
      content: e.evolution || e.procedures || (e as any).content || '',
      conduct: e.observations || '',
      photos: (e as any).photos || []
    });
  });

  (nursingEvolutions || []).forEach(e => {
    const eid = e.patientId || (e as any).elderlyId || '';
    list.push({
      id: `nur-${e.id}`,
      elderlyId: eid,
      elderlyName: elderlyMap.get(eid) || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || 'Enfermeira',
      professionalRole: 'ENFERMEIRA',
      sector: 'Enfermagem',
      content: e.content || (e as any).evolution || '',
      conduct: (e as any).conduct || '',
      photos: (e as any).photos || []
    });
  });

  (nutritionEvolutions || []).forEach(e => {
    const eid = (e as any).elderlyId || (e as any).patientId || '';
    list.push({
      id: `nut-${e.id}`,
      elderlyId: eid,
      elderlyName: elderlyMap.get(eid) || 'Idoso não identificado',
      date: e.date,
      professional: (e as any).registeredBy || 'Nutricionista',
      professionalRole: 'NUTRICIONISTA',
      sector: 'Nutrição',
      content: (e as any).evolution || (e as any).observations || (e as any).content || '',
      conduct: (e as any).dietaryPlan || (e as any).conduct || '',
      photos: (e as any).photos || []
    });
  });

  return list.sort((a, b) => {
    const dateA = new Date(a.date || 0).getTime();
    const dateB = new Date(b.date || 0).getTime();
    return dateB - dateA;
  });
}

export function computeManagementAlerts(
  props: MonitoringSectionProps,
  stockProducts: StockProduct[],
  diaperDaysAutonomy: number,
  startDate: string,
  endDate: string
): ManagementAlert[] {
  const alerts: ManagementAlert[] = [];
  const elderlyMap = new Map<string, string>();
  (props.elderly || []).forEach(e => {
    if (e.id) elderlyMap.set(e.id, e.name);
  });

  // 1. Critical Stock (Quantity 0 or <= minQuantity)
  const zeroStock = stockProducts.filter(p => p.status === 'ATIVO' && (p.quantity === 0 || p.quantity <= 0));
  const lowStock = stockProducts.filter(p => p.status === 'ATIVO' && p.quantity > 0 && p.quantity <= (p.minQuantity || 5));

  if (zeroStock.length > 0) {
    alerts.push({
      id: 'alert-zero-stock',
      type: 'CRITICAL',
      category: 'STOCK',
      title: `${zeroStock.length} produto(s) com estoque ZERADO`,
      description: `Itens críticos sem estoque: ${zeroStock.map(p => p.name).slice(0, 4).join(', ')}${zeroStock.length > 4 ? ` e mais ${zeroStock.length - 4}` : ''}.`,
      count: zeroStock.length,
      items: zeroStock.map(p => `${p.name} (Saldo: ${p.quantity} ${p.unit || 'un'})`),
      actionLabel: 'Ver Estoque',
      targetTab: 'stock'
    });
  }

  if (lowStock.length > 0) {
    alerts.push({
      id: 'alert-low-stock',
      type: 'WARNING',
      category: 'STOCK',
      title: `${lowStock.length} produto(s) abaixo do estoque mínimo`,
      description: `Produtos com necessidade de reposição: ${lowStock.map(p => p.name).slice(0, 4).join(', ')}.`,
      count: lowStock.length,
      items: lowStock.map(p => `${p.name} (Saldo: ${p.quantity} / Mín: ${p.minQuantity || 5})`),
      actionLabel: 'Ver Estoque',
      targetTab: 'stock'
    });
  }

  // 2. Diaper Autonomy
  if (diaperDaysAutonomy > 0 && diaperDaysAutonomy < 7) {
    alerts.push({
      id: 'alert-diaper-autonomy',
      type: diaperDaysAutonomy <= 3 ? 'CRITICAL' : 'WARNING',
      category: 'DIAPERS',
      title: `Estoque de fraldas com autonomia para apenas ${diaperDaysAutonomy.toFixed(1)} dias`,
      description: 'O ritmo de consumo diário indica risco iminente de desabastecimento de fraldas. Recomenda-se acionar doações ou produção.',
      actionLabel: 'Ver Fraldas',
      targetTab: 'diapers'
    });
  }

  // 3. Active elderly without evolutions or care in the last 15-30 days
  const unifiedEvolutions = buildUnifiedEvolutions(props);
  const now = new Date();
  const activeElderly = (props.elderly || []).filter(e => e.status === 'ATIVO');
  const neglectedElderly: string[] = [];

  activeElderly.forEach(e => {
    const lastEvo = unifiedEvolutions.find(ev => ev.elderlyId === e.id);
    if (!lastEvo) {
      neglectedElderly.push(`${e.name} (Sem nenhum registro no sistema)`);
    } else {
      const evoDate = parseISO(lastEvo.date);
      if (!isNaN(evoDate.getTime()) && differenceInDays(now, evoDate) > 20) {
        neglectedElderly.push(`${e.name} (Último registro há ${differenceInDays(now, evoDate)} dias)`);
      }
    }
  });

  if (neglectedElderly.length > 0) {
    alerts.push({
      id: 'alert-elderly-no-records',
      type: 'WARNING',
      category: 'ELDERLY',
      title: `${neglectedElderly.length} idoso(s) ativo(s) sem evolução recente (> 20 dias)`,
      description: 'Idosos acolhidos que necessitam de avaliação multidisciplinar atualizada.',
      count: neglectedElderly.length,
      items: neglectedElderly.slice(0, 8),
      actionLabel: 'Ver Idosos',
      targetTab: 'elderly'
    });
  }

  // 4. Incident records in period (falls, injuries)
  const periodIncidents = (props.incidentRecords || []).filter(inc => isDateInRange(inc.date, startDate, endDate));
  if (periodIncidents.length > 0) {
    alerts.push({
      id: 'alert-incidents',
      type: 'CRITICAL',
      category: 'INCIDENT',
      title: `${periodIncidents.length} intercorrência(s) / incidente(s) no período`,
      description: `Registros de enfermagem no período selecionado: ${periodIncidents.map(i => i.type || 'Intercorrência').slice(0, 3).join(', ')}.`,
      count: periodIncidents.length,
      items: periodIncidents.map(i => {
        const pName = (i as any).patientName || elderlyMap.get(i.patientId) || 'Idoso';
        return `${pName} - ${i.type || 'Incidente'} (${i.date}): ${i.description?.slice(0, 60) || ''}`;
      }),
      actionLabel: 'Ver Enfermagem',
      targetTab: 'multidisciplinary'
    });
  }

  // 5. Active Social Risks
  const activeRisks = (props.socialRiskSituations || []).filter(r => (r as any).status !== 'RESOLVIDO');
  if (activeRisks.length > 0) {
    alerts.push({
      id: 'alert-social-risks',
      type: 'WARNING',
      category: 'SOCIAL_RISK',
      title: `${activeRisks.length} situação(ões) de risco social em acompanhamento`,
      description: 'Demandas sociais ativas que requerem monitoramento do Serviço Social.',
      count: activeRisks.length,
      items: activeRisks.map(r => `${(r as any).elderlyName || (r as any).patientName || 'Idoso'} - ${(r as any).riskType || r.type || 'Risco Social'}: ${r.description?.slice(0, 60) || ''}`),
      actionLabel: 'Ver Serviço Social',
      targetTab: 'multidisciplinary'
    });
  }

  // 6. PIAs to review
  const piasToReview = (props.pias || []).filter(p => p.status === 'REVISAR' || p.status === 'EM_ANDAMENTO');
  if (piasToReview.length > 0) {
    alerts.push({
      id: 'alert-pias-review',
      type: 'INFO',
      category: 'PIA',
      title: `${piasToReview.length} Plano(s) Individual(is) de Atendimento (PIA) em andamento / revisão`,
      description: 'PIAs cadastrados com acompanhamento aberto pela equipe técnica.',
      count: piasToReview.length,
      actionLabel: 'Ver PIAs',
      targetTab: 'multidisciplinary'
    });
  }

  return alerts;
}
