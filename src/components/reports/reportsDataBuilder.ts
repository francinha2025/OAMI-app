import {
  parseISO,
  isWithinInterval,
  startOfDay,
  endOfDay,
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  subMonths,
  subDays,
  startOfYear,
  endOfYear,
  format
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  GeneralReportProps,
  UnifiedReportItem,
  GeneralReportMetrics,
  ReportCategory,
  SectorKey,
  RecordType,
  DatePreset,
  ExecutiveSummaryData,
  SectorExecutiveSummary,
  MonthlySummaryItem,
  ElderlyGroupedReport,
  ProfessionalGroupedReport,
  MonthlyStockReport,
  MonthlyStockCategoryConsumption
} from './reportsTypes';
import { Elderly, StockProduct, StockMovement, DiaperRawProduction, DiaperFinalPacking, DiaperDonation } from '../../types';

// Professional Name Normalization
// Note user directive: "A ASSISTENTE SOCIAL É A JARDELINE AMORIM , então é a mesma pessoa, a Fisioterapeuta é Lyslliê"
export function normalizeProfessionalName(name?: string, sectorOrRole?: string): string {
  if (!name || !name.trim()) {
    const s = (sectorOrRole || '').toLowerCase();
    if (s.includes('social')) return 'Jardeline Amorim';
    if (s.includes('fisio')) return 'Lyslliê';
    return 'Responsável não informado';
  }

  const clean = name.trim();
  const lower = clean.toLowerCase();

  // Serviço Social -> Jardeline Amorim
  if (
    lower.includes('jardeline') ||
    lower === 'assistente social' ||
    lower.includes('assistente social') ||
    ((sectorOrRole || '').toLowerCase().includes('social') && (lower.includes('assistente') || lower.includes('social')))
  ) {
    return 'Jardeline Amorim';
  }

  // Fisioterapia -> Lyslliê
  if (
    lower.includes('lyslli') ||
    lower.includes('lyslie') ||
    lower === 'fisioterapeuta' ||
    lower.includes('fisioterapeuta') ||
    ((sectorOrRole || '').toLowerCase().includes('fisio') && lower.includes('fisioterapeuta'))
  ) {
    return 'Lyslliê';
  }

  return clean;
}

export function getDateRangeForPreset(preset: DatePreset): { startDate: string; endDate: string } {
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
    case 'last_30_days':
      return {
        startDate: formatIso(subDays(now, 30)),
        endDate: formatIso(endOfDay(now))
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
        startDate: '2020-01-01',
        endDate: formatIso(endOfYear(now))
      };
  }
}

export function isItemInDateRange(dateStr: string | undefined | null, startDate: string, endDate: string): boolean {
  if (!dateStr) return true; // include if no explicit date so nothing is hidden
  try {
    const cleanStr = dateStr.slice(0, 10);
    const d = parseISO(cleanStr);
    if (isNaN(d.getTime())) return true;
    const start = parseISO(startDate);
    const end = parseISO(endDate);
    return isWithinInterval(d, { start: startOfDay(start), end: endOfDay(end) });
  } catch {
    return true;
  }
}

export function buildAllSystemRecords(props: GeneralReportProps): UnifiedReportItem[] {
  const items: UnifiedReportItem[] = [];

  // Comprehensive Lookup map for elderly and patient names
  const elderlyMap = new Map<string, string>();
  (props.elderly || []).forEach(e => {
    if (e.id) elderlyMap.set(e.id, e.name);
  });
  (props.nursingPatients || []).forEach(p => {
    if (p.id) elderlyMap.set(p.id, p.name || (p.elderlyId && elderlyMap.get(p.elderlyId)) || 'Acolhido(a)');
    if (p.elderlyId && p.name && !elderlyMap.has(p.elderlyId)) elderlyMap.set(p.elderlyId, p.name);
  });
  (props.physioPatients || []).forEach(p => {
    if (p.id) elderlyMap.set(p.id, p.name || (p.elderlyId && elderlyMap.get(p.elderlyId)) || 'Acolhido(a)');
    if (p.elderlyId && p.name && !elderlyMap.has(p.elderlyId)) elderlyMap.set(p.elderlyId, p.name);
  });
  (props.psychPatients || []).forEach(p => {
    if (p.id) elderlyMap.set(p.id, p.name || (p.elderlyId && elderlyMap.get(p.elderlyId)) || 'Acolhido(a)');
    if (p.elderlyId && p.name && !elderlyMap.has(p.elderlyId)) elderlyMap.set(p.elderlyId, p.name);
  });
  (props.pedagogyPatients || []).forEach(p => {
    if (p.id) elderlyMap.set(p.id, p.name || (p.elderlyId && elderlyMap.get(p.elderlyId)) || 'Acolhido(a)');
    if (p.elderlyId && p.name && !elderlyMap.has(p.elderlyId)) elderlyMap.set(p.elderlyId, p.name);
  });
  (props.socialPatients || []).forEach(p => {
    if (p.id) elderlyMap.set(p.id, p.name || (p.elderlyId && elderlyMap.get(p.elderlyId)) || 'Acolhido(a)');
    if (p.elderlyId && p.name && !elderlyMap.has(p.elderlyId)) elderlyMap.set(p.elderlyId, p.name);
  });
  (props.nutritionPatients || []).forEach(p => {
    if (p.id) elderlyMap.set(p.id, p.name || (p.elderlyId && elderlyMap.get(p.elderlyId)) || 'Acolhido(a)');
    if (p.elderlyId && p.name && !elderlyMap.has(p.elderlyId)) elderlyMap.set(p.elderlyId, p.name);
  });
  (props.communityElderly || []).forEach(e => {
    if (e.id && e.name) elderlyMap.set(e.id, e.name);
  });

  const getElderlyName = (id?: string, fallbackName?: string) => {
    if (id && elderlyMap.has(id)) return elderlyMap.get(id)!;
    if (fallbackName && fallbackName.trim()) return fallbackName.trim();
    if (id) {
      const match = (props.elderly || []).find(e => e.id === id);
      if (match) return match.name;
    }
    return fallbackName || 'Acolhido(a)';
  };

  // 1. PROFISSIONAIS & EVOLUÇÕES MULTIDISCIPLINARES
  // 1.1 Evoluções Gerais
  (props.evolutions || []).forEach(ev => {
    const rawResp = (ev as any).registeredBy || (ev as any).professional || 'Equipe Multidisciplinar';
    const sectorRole = ev.professionalRole || 'Geral';
    const resp = normalizeProfessionalName(rawResp, sectorRole);
    let sKey: SectorKey = 'OUTRAS_AREAS';
    let sName = 'Geral';

    const roleLower = (ev.professionalRole || '').toLowerCase();
    if (roleLower.includes('enferm')) { sKey = 'ENFERMAGEM'; sName = 'Enfermagem'; }
    else if (roleLower.includes('fisio')) { sKey = 'FISIOTERAPIA'; sName = 'Fisioterapia'; }
    else if (roleLower.includes('psico')) { sKey = 'PSICOLOGIA'; sName = 'Psicologia'; }
    else if (roleLower.includes('social')) { sKey = 'SERVICO_SOCIAL'; sName = 'Serviço Social'; }
    else if (roleLower.includes('pedag')) { sKey = 'PEDAGOGIA'; sName = 'Pedagogia'; }
    else if (roleLower.includes('nutri')) { sKey = 'NUTRICAO'; sName = 'Nutrição'; }

    items.push({
      id: `gen-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: sKey,
      sector: sName,
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução Multidisciplinar',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Multidisciplinar',
      responsible: resp,
      roleOrFunction: ev.professionalRole || 'Multidisciplinar',
      elderlyId: ev.elderlyId,
      targetOrParticipant: getElderlyName(ev.elderlyId, (ev as any).elderlyName),
      description: (ev as any).notes || (ev as any).evolution || ev.content || '',
      conductOrOutcome: (ev as any).conduct || (ev as any).plan || '',
      details: ev,
      photos: (ev as any).photos || []
    });
  });

  // 1.2 Enfermagem (Evoluções Reais de Enfermagem)
  (props.nursingEvolutions || []).forEach(ev => {
    const elderlyTarget = getElderlyName(ev.patientId, (ev as any).elderlyName || (ev as any).patientName);
    const conduct = (ev as any).coWorkers && (ev as any).coWorkers.length > 0 
      ? `Equipe de Apoio: ${(ev as any).coWorkers.join(', ')}` 
      : '';
    const resp = normalizeProfessionalName((ev as any).registeredBy, 'Enfermagem');

    items.push({
      id: `nur-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'ENFERMAGEM',
      sector: 'Enfermagem',
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução de Enfermagem',
      date: ev.date ? ((ev as any).time ? `${ev.date.slice(0, 10)}T${(ev as any).time}` : ev.date) : new Date().toISOString(),
      title: 'Evolução de Enfermagem',
      responsible: resp,
      roleOrFunction: 'Enfermagem',
      elderlyId: ev.patientId,
      targetOrParticipant: elderlyTarget,
      description: ev.content || 'Evolução de enfermagem registrada no prontuário.',
      conductOrOutcome: conduct,
      details: ev,
      photos: ev.photos || []
    });
  });

  // 1.3 Fisioterapia (Evoluções, Exercícios e Avaliações)
  (props.physioEvolutions || []).forEach(ev => {
    const target = (ev.patientIds && ev.patientIds.length > 1)
      ? ev.patientIds.map(id => getElderlyName(id)).join(', ')
      : getElderlyName(ev.patientId, (ev as any).patientName);

    const descParts = [
      ev.evolution ? `Evolução: ${ev.evolution}` : '',
      ev.procedures ? `Procedimentos: ${ev.procedures}` : '',
      ev.painLevel !== undefined ? `Escala de Dor: ${ev.painLevel}/10` : ''
    ].filter(Boolean);

    const outcomeParts = [
      ev.observations || '',
      (ev as any).coWorkers?.length ? `Equipe / Apoio: ${(ev as any).coWorkers.join(', ')}` : ''
    ].filter(Boolean);

    const resp = normalizeProfessionalName(ev.registeredBy, 'Fisioterapia');

    items.push({
      id: `phy-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'FISIOTERAPIA',
      sector: 'Fisioterapia',
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução Fisioterapêutica',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Fisioterapêutica',
      responsible: resp,
      roleOrFunction: 'Fisioterapeuta',
      elderlyId: ev.patientId || (ev.patientIds && ev.patientIds[0]),
      targetOrParticipant: target,
      description: descParts.join(' • ') || ev.evolution || ev.procedures || 'Atendimento e exercícios de fisioterapia realizados.',
      conductOrOutcome: outcomeParts.join(' • '),
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.physioExercises || []).forEach(ex => {
    const resp = normalizeProfessionalName((ex as any).registeredBy, 'Fisioterapia');
    items.push({
      id: `phy-ex-${ex.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'FISIOTERAPIA',
      sector: 'Fisioterapia',
      recordType: 'ATENDIMENTO',
      recordTypeLabel: 'Exercício / Cinesioterapia',
      date: (ex as any).date || (ex as any).createdAt || new Date().toISOString(),
      title: `Exercício Fisioterapêutico: ${ex.title || 'Cinesioterapia'}`,
      responsible: resp,
      roleOrFunction: 'Fisioterapeuta',
      elderlyId: (ex as any).patientId,
      targetOrParticipant: getElderlyName((ex as any).patientId, (ex as any).patientName),
      description: ex.description || 'Exercício fisioterapêutico prescrito e executado.',
      details: ex
    });
  });

  (props.physioAssessments || []).forEach(ass => {
    const resp = normalizeProfessionalName((ass as any).registeredBy, 'Fisioterapia');
    items.push({
      id: `phy-ass-${ass.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'FISIOTERAPIA',
      sector: 'Fisioterapia',
      recordType: 'AVALIACAO',
      recordTypeLabel: 'Avaliação Fisioterapêutica',
      date: ass.date || new Date().toISOString(),
      title: 'Avaliação Fisioterapêutica Funcional',
      responsible: resp,
      roleOrFunction: 'Fisioterapeuta',
      elderlyId: ass.patientId,
      targetOrParticipant: getElderlyName(ass.patientId, (ass as any).patientName),
      description: `Diagnóstico Funcional: ${ass.functionalDiagnosis || 'Em avaliação'} • Grau de Mobilidade: ${ass.mobilityLevel || 'N/A'}`,
      conductOrOutcome: ass.treatmentPlan || '',
      details: ass
    });
  });

  // 1.4 Psicologia (Evoluções e Dinâmicas)
  (props.psychEvolutions || []).forEach(ev => {
    const target = ev.targetName || (ev.patientIds && ev.patientIds.length > 1
      ? ev.patientIds.map(id => getElderlyName(id)).join(', ')
      : getElderlyName(ev.patientId, (ev as any).patientName));

    const outcome = [
      ev.intervention ? `Intervenção / Conduta: ${ev.intervention}` : '',
      (ev as any).coWorkers?.length ? `Apoio: ${(ev as any).coWorkers.join(', ')}` : ''
    ].filter(Boolean).join(' • ');

    const resp = normalizeProfessionalName(ev.registeredBy, 'Psicologia');

    items.push({
      id: `psy-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'PSICOLOGIA',
      sector: 'Psicologia',
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução Psicológica',
      date: ev.date ? ((ev as any).time ? `${ev.date.slice(0, 10)}T${(ev as any).time}` : ev.date) : new Date().toISOString(),
      title: 'Evolução Psicológica',
      responsible: resp,
      roleOrFunction: 'Psicologia',
      elderlyId: ev.patientId || (ev.patientIds && ev.patientIds[0]),
      targetOrParticipant: target,
      description: ev.observation || 'Atendimento e escuta psicológica realizada.',
      conductOrOutcome: outcome,
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.psychActivities || []).forEach(act => {
    const participantsNames = (act.participants && act.participants.length > 0)
      ? act.participants.map(pId => getElderlyName(pId)).join(', ')
      : 'Grupo de Acolhidos';

    const resp = normalizeProfessionalName(act.registeredBy, 'Psicologia');

    items.push({
      id: `psy-act-${act.id || Math.random()}`,
      category: 'WORKSHOPS',
      categoryLabel: 'Oficinas',
      sectorKey: 'OFICINAS',
      sector: 'Psicologia (Dinâmicas & Grupos)',
      recordType: 'OFICINA',
      recordTypeLabel: 'Oficina / Dinâmica Psicológica',
      date: act.date || new Date().toISOString(),
      title: `Atividade Psicológica: ${act.title || 'Sessão Grupal'}`,
      responsible: resp,
      roleOrFunction: 'Psicologia',
      targetOrParticipant: participantsNames,
      participantsCount: act.participants ? act.participants.length : 1,
      typeOrStatus: (act as any).type || 'OFICINA PSICOLÓGICA',
      description: act.description || 'Dinâmica e suporte emocional grupal com acolhidos.',
      conductOrOutcome: (act as any).coWorkers?.length ? `Co-facilitadores: ${(act as any).coWorkers.join(', ')}` : '',
      details: act,
      photos: act.photos || []
    });
  });

  // 1.5 Pedagogia (Evoluções, Oficinas, Estimulação, Participação)
  (props.pedagogyEvolutions || []).forEach(ev => {
    const descParts = [
      ev.activityTitle ? `Atividade: ${ev.activityTitle}` : '',
      ev.participation ? `Participação: ${ev.participation}` : '',
      ev.response ? `Resposta / Desenvolvimento: ${ev.response}` : ''
    ].filter(Boolean);

    const resp = normalizeProfessionalName(ev.registeredBy, 'Pedagogia');

    items.push({
      id: `ped-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'PEDAGOGIA',
      sector: 'Pedagogia',
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução Pedagógica',
      date: ev.date ? ((ev as any).time ? `${ev.date.slice(0, 10)}T${(ev as any).time}` : ev.date) : new Date().toISOString(),
      title: `Evolução Pedagógica${ev.activityTitle ? `: ${ev.activityTitle}` : ''}`,
      responsible: resp,
      roleOrFunction: 'Pedagogia',
      elderlyId: ev.patientId,
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).patientName),
      description: descParts.join(' • ') || 'Acompanhamento pedagógico e estimulação cognitiva individualizada.',
      conductOrOutcome: ev.observations ? `Observações: ${ev.observations}` : '',
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.pedagogyActivities || []).forEach(act => {
    const participantsNames = (act.participants && act.participants.length > 0)
      ? act.participants.map(pId => getElderlyName(pId))
      : [];
    const count = participantsNames.length;
    const target = count > 0 
      ? `${count} participante(s): ${participantsNames.slice(0, 5).join(', ')}${count > 5 ? '...' : ''}` 
      : 'Grupo de Acolhidos OAMI';

    const outcomeParts = [
      (act as any).time ? `Horário: ${(act as any).time}` : '',
      (act as any).coWorkers?.length ? `Equipe / Apoio: ${(act as any).coWorkers.join(', ')}` : '',
      count > 0 ? `Participantes: ${participantsNames.join(', ')}` : ''
    ].filter(Boolean);

    const resp = normalizeProfessionalName(act.registeredBy, 'Pedagogia');

    items.push({
      id: `ped-act-${act.id || Math.random()}`,
      category: 'WORKSHOPS',
      categoryLabel: 'Oficinas',
      sectorKey: 'OFICINAS',
      sector: 'Pedagogia (Oficinas & Estimulação)',
      recordType: 'OFICINA',
      recordTypeLabel: 'Oficina Pedagógica',
      date: act.date ? ((act as any).time ? `${act.date.slice(0, 10)}T${(act as any).time}` : act.date) : new Date().toISOString(),
      title: `Oficina Pedagógica: ${act.title || 'Estimulação Cognitiva'}${act.type ? ` (${act.type})` : ''}`,
      responsible: resp,
      roleOrFunction: 'Pedagogia',
      targetOrParticipant: target,
      participantsCount: count || 1,
      typeOrStatus: act.type || 'OFICINA PEDAGÓGICA',
      description: act.description || `Oficina pedagógica e estimulação cognitiva/motora realizada pela Pedagoga (${act.type || 'Cognitiva'}).`,
      conductOrOutcome: outcomeParts.join(' • '),
      details: act,
      photos: act.photos || []
    });
  });

  (props.pedagogyStimulationTrackings || []).forEach(tr => {
    const resp = normalizeProfessionalName((tr as any).registeredBy, 'Pedagogia');
    items.push({
      id: `ped-stim-${tr.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'PEDAGOGIA',
      sector: 'Pedagogia',
      recordType: 'AVALIACAO',
      recordTypeLabel: 'Acompanhamento de Estimulação',
      date: tr.date || new Date().toISOString(),
      title: 'Acompanhamento de Estimulação Cognitiva',
      responsible: resp,
      roleOrFunction: 'Pedagogia',
      elderlyId: (tr as any).patientId,
      targetOrParticipant: getElderlyName((tr as any).patientId, (tr as any).patientName),
      description: `Escores (0-10) — Memória: ${tr.memoryScore ?? '--'} • Atenção: ${tr.attentionScore ?? '--'} • Raciocínio: ${tr.reasoningScore ?? '--'} • Linguagem: ${tr.languageScore ?? '--'}`,
      conductOrOutcome: tr.observations || '',
      details: tr
    });
  });

  (props.pedagogySocialParticipations || []).forEach(sp => {
    const resp = normalizeProfessionalName((sp as any).registeredBy, 'Pedagogia');
    items.push({
      id: `ped-soc-${sp.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'PEDAGOGIA',
      sector: 'Pedagogia',
      recordType: 'AVALIACAO',
      recordTypeLabel: 'Participação Social',
      date: sp.date || new Date().toISOString(),
      title: 'Avaliação de Participação Social e Interação',
      responsible: resp,
      roleOrFunction: 'Pedagogia',
      elderlyId: (sp as any).patientId,
      targetOrParticipant: getElderlyName((sp as any).patientId, (sp as any).patientName),
      description: `Nível de Interação: ${sp.interactionLevel || 'MÉDIO'} • Comunicativo: ${sp.isCommunicative ? 'Sim' : 'Não'} • Isolamento: ${sp.isIsolated ? 'Sim' : 'Não'}`,
      conductOrOutcome: sp.observations || '',
      details: sp
    });
  });

  // 1.6 Serviço Social (Evoluções, Visitas e Encaminhamentos)
  (props.socialEvolutions || []).forEach(ev => {
    const target = (ev.patientIds && ev.patientIds.length > 1)
      ? ev.patientIds.map(id => getElderlyName(id)).join(', ')
      : getElderlyName(ev.patientId || '', (ev as any).patientName);

    const descParts = [
      ev.serviceType ? `Tipo de Atendimento: ${ev.serviceType}` : '',
      ev.observation ? `Relato Técnico: ${ev.observation}` : '',
      ev.textPlan ? `Plano de Ação: ${ev.textPlan}` : ''
    ].filter(Boolean);

    const outcome = [
      ev.conduct || '',
      (ev as any).coWorkers?.length ? `Equipe de Apoio: ${(ev as any).coWorkers.join(', ')}` : ''
    ].filter(Boolean).join(' • ');

    const resp = normalizeProfessionalName(ev.registeredBy, 'Serviço Social');

    items.push({
      id: `soc-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'SERVICO_SOCIAL',
      sector: 'Serviço Social',
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução Socioassistencial',
      date: ev.date || new Date().toISOString(),
      title: `Evolução Social${ev.serviceType ? `: ${ev.serviceType}` : ''}`,
      responsible: resp,
      roleOrFunction: 'Assistente Social',
      elderlyId: ev.patientId || (ev.patientIds && ev.patientIds[0]),
      targetOrParticipant: target,
      description: descParts.join(' • ') || ev.observation || ev.serviceType || 'Atendimento socioassistencial realizado.',
      conductOrOutcome: outcome,
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.socialFamilyVisits || []).forEach(vis => {
    const resp = normalizeProfessionalName(vis.registeredBy, 'Serviço Social');
    items.push({
      id: `soc-vis-${vis.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'SERVICO_SOCIAL',
      sector: 'Serviço Social',
      recordType: 'VISITA',
      recordTypeLabel: 'Visita Familiar / Domiciliar',
      date: vis.date || new Date().toISOString(),
      title: 'Visita Familiar / Domiciliar',
      responsible: resp,
      roleOrFunction: 'Assistente Social',
      elderlyId: vis.patientId,
      targetOrParticipant: getElderlyName(vis.patientId, (vis as any).patientName),
      description: `Familiar: ${vis.visitorName || 'Familiar'} (${vis.kinship || 'Parentesco não inf.'}) • Detalhes: ${vis.observations || 'Sem observações'}`,
      details: vis
    });
  });

  (props.socialReferrals || []).forEach(ref => {
    const resp = normalizeProfessionalName(ref.registeredBy, 'Serviço Social');
    items.push({
      id: `soc-ref-${ref.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'SERVICO_SOCIAL',
      sector: 'Serviço Social',
      recordType: 'ATENDIMENTO',
      recordTypeLabel: 'Encaminhamento Social',
      date: ref.date || new Date().toISOString(),
      title: `Encaminhamento Social: ${ref.destination || 'Rede Socioassistencial'}`,
      responsible: resp,
      roleOrFunction: 'Assistente Social',
      elderlyId: ref.patientId,
      targetOrParticipant: getElderlyName(ref.patientId, (ref as any).patientName),
      description: `Descrição: ${ref.description || 'Encaminhamento técnico'} • Status: ${ref.status || 'Ativo'}`,
      details: ref
    });
  });

  // 1.7 Nutrição
  (props.nutritionEvolutions || []).forEach(ev => {
    const resp = normalizeProfessionalName(ev.registeredBy, 'Nutrição');
    items.push({
      id: `nut-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'NUTRICAO',
      sector: 'Nutrição',
      recordType: 'EVOLUCAO',
      recordTypeLabel: 'Evolução Nutricional',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Nutricional',
      responsible: resp,
      roleOrFunction: 'Nutricionista',
      elderlyId: ev.patientId,
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).patientName),
      description: ev.observations || 'Acompanhamento nutricional, consumo e aceitação alimentar.',
      conductOrOutcome: ev.conduct || '',
      details: ev,
      photos: ev.photos || []
    });
  });

  // 1.8 Equipe Técnica / Coordenação (PIAs)
  (props.pias || []).forEach(pia => {
    const resp = normalizeProfessionalName(pia.responsible, 'Coordenação');
    items.push({
      id: `pia-${pia.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sectorKey: 'EQUIPE_TECNICA',
      sector: 'Coordenação / Equipe Técnica',
      recordType: 'AVALIACAO',
      recordTypeLabel: 'Plano Individual de Atendimento (PIA)',
      date: pia.date || (pia as any).createdAt || new Date().toISOString(),
      title: 'Plano Individual de Atendimento (PIA)',
      responsible: resp,
      roleOrFunction: 'Equipe Técnica Multidisciplinar',
      elderlyId: pia.elderlyId,
      targetOrParticipant: getElderlyName(pia.elderlyId, (pia as any).elderlyName),
      description: `Objetivos e Metas: ${pia.objectives || 'Plano de Acolhimento Humanizado'}`,
      details: pia
    });
  });

  // 2. OFICINAS & CAPACITAÇÕES
  (props.workshops || []).forEach(w => {
    const isTraining = w.type === 'CAPACITACAO';
    const participantsList = Array.isArray(w.participants) ? w.participants : [];
    const count = participantsList.length;
    const resp = normalizeProfessionalName(w.who || w.registeredBy, isTraining ? 'Capacitações' : 'Oficinas');

    items.push({
      id: `ws-${w.id || Math.random()}`,
      category: isTraining ? 'TRAININGS' : 'WORKSHOPS',
      categoryLabel: isTraining ? 'Capacitações' : 'Oficinas',
      sectorKey: isTraining ? 'CAPACITACOES' : 'OFICINAS',
      sector: isTraining ? 'Capacitações Profissionais' : 'Oficinas Terapêuticas',
      recordType: isTraining ? 'CAPACITACAO' : 'OFICINA',
      recordTypeLabel: isTraining ? 'Capacitação Profissional' : 'Oficina Terapêutica / Recreativa',
      date: w.date || (w as any).when || new Date().toISOString(),
      title: w.title || (isTraining ? 'Capacitação Institucional' : 'Oficina OAMI'),
      responsible: resp,
      roleOrFunction: isTraining ? 'Palestrante / Facilitador' : 'Oficineiro / Responsável',
      targetOrParticipant: count > 0 ? `${count} participante(s): ${participantsList.slice(0, 3).join(', ')}${count > 3 ? '...' : ''}` : 'Público Geral',
      participantsCount: count,
      typeOrStatus: isTraining ? 'CAPACITAÇÃO' : 'OFICINA',
      description: w.description || w.what || '',
      conductOrOutcome: [
        w.why ? `Objetivo: ${w.why}` : '',
        w.how ? `Metodologia: ${w.how}` : '',
        w.where ? `Local: ${w.where}` : '',
        w.howMuch ? `Investimento: ${w.howMuch}` : ''
      ].filter(Boolean).join(' • '),
      locationOrRoom: w.where || 'Sede OAMI',
      details: w,
      photos: w.photos || [],
      documents: w.documents || []
    });
  });

  // 3. FABRICAÇÃO E DISTRIBUIÇÃO DE FRALDAS (SGPF)
  (props.diaperRawProductions || []).forEach(raw => {
    const resp = normalizeProfessionalName(raw.operator, 'Produção de Fraldas');
    items.push({
      id: `raw-${raw.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sectorKey: 'PRODUCAO_FRALDAS',
      sector: 'Produção de Fraldas (SGPF)',
      recordType: 'PRODUCAO',
      recordTypeLabel: 'Corte Bruto de Fraldas',
      date: raw.date || new Date().toISOString(),
      title: `Corte Bruto de Fraldas`,
      responsible: resp,
      roleOrFunction: 'Operador SGPF',
      targetOrParticipant: `Turno ${raw.shift || 'Integral'}`,
      quantityOrValue: raw.quantity || 0,
      typeOrStatus: 'CORTE BRUTO',
      description: `Produção de ${raw.quantity || 0} unidades brutas cortadas.`,
      conductOrOutcome: raw.observations || '',
      details: raw
    });
  });

  (props.diaperWIPProcessings || []).forEach(wip => {
    const resp = normalizeProfessionalName(wip.operator, 'Produção de Fraldas');
    items.push({
      id: `wip-${wip.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sectorKey: 'PRODUCAO_FRALDAS',
      sector: 'Produção de Fraldas (SGPF)',
      recordType: 'PRODUCAO',
      recordTypeLabel: 'Processamento Intermediário',
      date: wip.date || new Date().toISOString(),
      title: `Processamento WIP de Fraldas`,
      responsible: resp,
      roleOrFunction: 'Operador SGPF',
      targetOrParticipant: `Entrada: ${wip.quantityIn} • Saída: ${wip.quantityOut}`,
      quantityOrValue: wip.quantityOut || wip.quantityIn || 0,
      typeOrStatus: 'PROCESSAMENTO',
      description: `Entrada: ${wip.quantityIn} un. Saída: ${wip.quantityOut} un. Perda: ${wip.wasteAmount} un (${wip.wasteReason || 'Ajuste de máquina'}).`,
      conductOrOutcome: wip.observations || '',
      details: wip
    });
  });

  (props.diaperFinalPackings || []).forEach(finalItem => {
    const resp = normalizeProfessionalName(finalItem.operator, 'Produção de Fraldas');
    items.push({
      id: `final-${finalItem.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sectorKey: 'PRODUCAO_FRALDAS',
      sector: 'Produção de Fraldas (SGPF)',
      recordType: 'PRODUCAO',
      recordTypeLabel: 'Produto Embalado',
      date: finalItem.date || finalItem.createdAt || new Date().toISOString(),
      title: `Fraldas Embaladas: ${finalItem.quantityPackaged || 0} pacotes (${finalItem.packageType || 'Geral'})`,
      responsible: resp,
      roleOrFunction: 'Operador SGPF',
      targetOrParticipant: `Lote ${finalItem.batchNumber || 'Pronto'}`,
      quantityOrValue: finalItem.quantityPackaged || 0,
      typeOrStatus: 'PRODUTO ACABADO',
      description: `${finalItem.quantityPackaged || 0} pacotes embalados (${finalItem.packageType || 'Tamanho Único'}). Lote: ${finalItem.batchNumber || 'N/A'}.`,
      conductOrOutcome: finalItem.observations || '',
      details: finalItem
    });
  });

  (props.diaperDonations || []).forEach(don => {
    const resp = normalizeProfessionalName(don.registeredBy, 'Produção de Fraldas');
    items.push({
      id: `diap-don-${don.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sectorKey: 'PRODUCAO_FRALDAS',
      sector: 'Distribuição de Fraldas',
      recordType: 'ATENDIMENTO',
      recordTypeLabel: 'Doação / Saída de Fraldas',
      date: don.date || don.createdAt || new Date().toISOString(),
      title: `Doação/Distribuição de Fraldas (${don.size || 'Geral'})`,
      responsible: resp,
      roleOrFunction: 'Distribuição / SGPF',
      targetOrParticipant: don.beneficiaryName || 'Beneficiário OAMI',
      quantityOrValue: don.quantity || 0,
      typeOrStatus: 'SAÍDA / DOAÇÃO',
      description: `Entrega de ${don.quantity || 0} unidades/pacotes de fraldas tam. ${don.size || 'Geral'}.`,
      conductOrOutcome: don.observations || '',
      details: don
    });
  });

  // 4. ESTOQUE & ALMOXARIFADO
  (props.stockMovements || []).forEach(mov => {
    const resp = normalizeProfessionalName(mov.responsible, 'Estoque');
    items.push({
      id: `stk-mov-${mov.id || Math.random()}`,
      category: 'STOCK',
      categoryLabel: 'Estoque',
      sectorKey: 'ESTOQUE',
      sector: 'Estoque & Almoxarifado',
      recordType: 'ESTOQUE',
      recordTypeLabel: mov.type === 'ENTRADA' ? 'Entrada no Estoque' : 'Saída do Estoque',
      date: mov.date || mov.timestamp || new Date().toISOString(),
      title: `${mov.type === 'ENTRADA' ? 'Entrada no Estoque' : 'Saída do Estoque'}: ${mov.productName || 'Item'}`,
      responsible: resp,
      roleOrFunction: 'Almoxarife / Controle de Estoque',
      targetOrParticipant: `${mov.productName || 'Item'} (${mov.productCode || 'Cód: N/A'})`,
      quantityOrValue: mov.quantity || 0,
      typeOrStatus: mov.type || 'MOVIMENTAÇÃO',
      description: `Quantidade: ${mov.quantity || 0}. Motivo: ${mov.reason || 'Operacional'}. Saldo Resultante: ${mov.stockAfter ?? 'N/A'}.`,
      conductOrOutcome: [
        mov.supplier ? `Fornecedor: ${mov.supplier}` : '',
        mov.destination ? `Destino: ${mov.destination}` : '',
        mov.notes ? `Obs: ${mov.notes}` : ''
      ].filter(Boolean).join(' • '),
      details: mov
    });
  });

  // 5. MONITORAMENTO CLÍNICO & CUIDADOS
  // 5.1 Sinais Vitais
  (props.vitalSigns || []).forEach(vs => {
    const resp = normalizeProfessionalName(vs.registeredBy, 'Enfermagem');
    items.push({
      id: `vs-${vs.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sectorKey: 'MONITORAMENTO',
      sector: 'Monitoramento Clínico',
      recordType: 'MONITORAMENTO',
      recordTypeLabel: 'Sinais Vitais',
      date: vs.date || new Date().toISOString(),
      title: 'Aferição de Sinais Vitais',
      responsible: resp,
      roleOrFunction: 'Cuidados Clínicos / Enfermagem',
      elderlyId: vs.patientId,
      targetOrParticipant: getElderlyName(vs.patientId, (vs as any).elderlyName),
      description: `PA: ${vs.systolicBP || '--'}/${vs.diastolicBP || '--'} mmHg • FC: ${vs.heartRate || '--'} bpm • Temp: ${vs.temperature || '--'} °C • Glicemia: ${vs.bloodGlucose ?? '--'} mg/dL • SatO2: ${vs.saturation || '--'}%`,
      conductOrOutcome: `Aferido às ${vs.time || '--'}`,
      details: vs
    });
  });

  // 5.2 Curativos
  (props.dressingRecords || []).forEach(dr => {
    const resp = normalizeProfessionalName(dr.registeredBy, 'Enfermagem');
    items.push({
      id: `dr-${dr.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sectorKey: 'MONITORAMENTO',
      sector: 'Monitoramento Clínico',
      recordType: 'MONITORAMENTO',
      recordTypeLabel: 'Curativo / Tratamento de Lesão',
      date: dr.date || new Date().toISOString(),
      title: `Curativo: ${dr.location || 'Lesão'}`,
      responsible: resp,
      roleOrFunction: 'Enfermagem',
      elderlyId: dr.patientId,
      targetOrParticipant: getElderlyName(dr.patientId, (dr as any).elderlyName),
      description: `Localização: ${dr.location || 'Corpo'} • Tipo de Lesão: ${dr.woundType || 'Padrão'} • Aspecto: ${dr.aspect || 'Em cicatrização'} • Próx. troca: ${dr.nextChangeDate || '--'}`,
      conductOrOutcome: dr.conduct || '',
      details: dr,
      photos: dr.photos || []
    });
  });

  // 5.3 Medicamentos
  (props.medicationAdministrations || []).forEach(med => {
    const resp = normalizeProfessionalName(med.administeredBy, 'Enfermagem');
    items.push({
      id: `med-${med.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sectorKey: 'MONITORAMENTO',
      sector: 'Monitoramento Clínico',
      recordType: 'MONITORAMENTO',
      recordTypeLabel: 'Administração de Medicamentos',
      date: med.date || new Date().toISOString(),
      title: `Administração de Medicamento`,
      responsible: resp,
      roleOrFunction: 'Enfermagem / Cuidador',
      elderlyId: med.patientId,
      targetOrParticipant: getElderlyName(med.patientId, (med as any).elderlyName),
      description: `Horário Agendado: ${med.scheduledTime || '--'} • Horário Real: ${med.administeredTime || '--'} • Status: ${med.status}`,
      conductOrOutcome: med.observations || (med.status === 'ADMINISTRADO' ? 'Administrado com sucesso' : med.status),
      details: med
    });
  });

  // 5.4 Ocorrências e Incidentes
  (props.incidentRecords || []).forEach(inc => {
    const resp = normalizeProfessionalName(inc.registeredBy, 'Equipe de Cuidados');
    items.push({
      id: `inc-${inc.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sectorKey: 'MONITORAMENTO',
      sector: 'Monitoramento Clínico',
      recordType: 'MONITORAMENTO',
      recordTypeLabel: 'Ocorrência / Incidente',
      date: inc.date || new Date().toISOString(),
      title: `Ocorrência: ${inc.type || 'Incidente'}`,
      responsible: resp,
      roleOrFunction: 'Plantão de Cuidados',
      elderlyId: inc.patientId,
      targetOrParticipant: getElderlyName(inc.patientId, (inc as any).elderlyName),
      description: inc.description || 'Registro de incidente durante o plantão',
      conductOrOutcome: inc.conduct || 'Conduta registrada',
      details: inc,
      photos: inc.photos || []
    });
  });

  // 5.5 Trocas de Fralda
  (props.diaperChangeRecords || []).forEach(dc => {
    const resp = normalizeProfessionalName(dc.registeredBy, 'Cuidador');
    items.push({
      id: `dc-${dc.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sectorKey: 'MONITORAMENTO',
      sector: 'Monitoramento Clínico',
      recordType: 'MONITORAMENTO',
      recordTypeLabel: 'Troca de Fralda & Higiene',
      date: dc.date || new Date().toISOString(),
      title: `Troca de Fralda`,
      responsible: resp,
      roleOrFunction: 'Cuidador de Idosos',
      elderlyId: dc.patientId,
      targetOrParticipant: getElderlyName(dc.patientId, (dc as any).elderlyName),
      description: `Horário: ${dc.time || '--'} • Aspecto: ${dc.aspect || 'NORMAL'}`,
      conductOrOutcome: dc.observations || '',
      details: dc
    });
  });

  // 6. TESOURARIA & DOAÇÕES
  (props.treasuryTransactions || []).forEach(tx => {
    const resp = normalizeProfessionalName(tx.registeredBy, 'Tesouraria');
    items.push({
      id: `tx-${tx.id || Math.random()}`,
      category: 'TREASURY',
      categoryLabel: 'Tesouraria',
      sectorKey: 'OUTRAS_AREAS',
      sector: 'Tesouraria & Finanças',
      recordType: 'OUTRO',
      recordTypeLabel: tx.type === 'RECEITA' ? 'Receita Financeira' : 'Despesa Financeira',
      date: tx.date || new Date().toISOString(),
      title: `${tx.type === 'RECEITA' ? 'Receita / Entrada' : 'Despesa / Saída'}: ${tx.category || 'Operacional'}`,
      responsible: resp,
      roleOrFunction: 'Tesouraria',
      targetOrParticipant: tx.payerOrFavored || tx.paymentMethod || 'Tesouraria OAMI',
      quantityOrValue: tx.amount ? `R$ ${Number(tx.amount).toFixed(2)}` : 'R$ 0,00',
      typeOrStatus: tx.type || 'FINANCEIRO',
      description: tx.description || 'Lançamento financeiro institucional',
      conductOrOutcome: `Forma de Pagamento: ${tx.paymentMethod || 'PIX/Dinheiro'}`,
      details: tx
    });
  });

  (props.financialRecords || []).forEach(fin => {
    const resp = normalizeProfessionalName((fin as any).registeredBy || (fin as any).createdBy, 'Tesouraria');
    items.push({
      id: `fin-${fin.id || Math.random()}`,
      category: 'TREASURY',
      categoryLabel: 'Tesouraria',
      sectorKey: 'OUTRAS_AREAS',
      sector: 'Gestão Financeira',
      recordType: 'OUTRO',
      recordTypeLabel: 'Documento Financeiro',
      date: fin.date || new Date().toISOString(),
      title: `Registro Financeiro: ${fin.description || 'Movimentação'}`,
      responsible: resp,
      roleOrFunction: 'Tesouraria',
      targetOrParticipant: fin.category || 'Geral',
      quantityOrValue: fin.amount ? `R$ ${Number(fin.amount).toFixed(2)}` : 'R$ 0,00',
      typeOrStatus: fin.type || 'FINANCEIRO',
      description: fin.description || 'Lançamento de receitas ou despesas da Casa OAMI.',
      conductOrOutcome: `Categoria: ${fin.category || 'Operacional'}`,
      details: fin
    });
  });

  // 7. DEMAIS ÁREAS INSTITUCIONAIS
  (props.presidencyDocs || []).forEach(doc => {
    items.push({
      id: `pres-${doc.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Outros',
      sectorKey: 'OUTRAS_AREAS',
      sector: 'Presidência e Atos Oficiais',
      recordType: 'OUTRO',
      recordTypeLabel: 'Ato Institucional / Presidência',
      date: doc.date || doc.createdAt || new Date().toISOString(),
      title: `Documento da Presidência: ${doc.title || 'Ato Oficial'}`,
      responsible: normalizeProfessionalName(doc.author, 'Presidência'),
      roleOrFunction: 'Presidência / Diretoria',
      targetOrParticipant: doc.category || 'Institucional',
      description: doc.description || 'Documento oficial emitido pela Presidência da Casa OAMI.',
      details: doc
    });
  });

  (props.familyEngagements || []).forEach(fam => {
    items.push({
      id: `fam-${fam.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Outros',
      sectorKey: 'OUTRAS_AREAS',
      sector: 'Engajamento Familiar',
      recordType: 'VISITA',
      recordTypeLabel: 'Contato Familiar',
      date: fam.date || new Date().toISOString(),
      title: `Acompanhamento Familiar: ${fam.type || 'Contato'}`,
      responsible: 'Serviço Social',
      roleOrFunction: 'Equipe Técnica / Social',
      elderlyId: fam.elderlyId,
      targetOrParticipant: getElderlyName(fam.elderlyId),
      description: fam.summary || 'Acompanhamento de vínculos familiares com acolhido.',
      details: fam
    });
  });

  (props.institutionalRecords || []).forEach(inst => {
    items.push({
      id: `inst-${inst.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Outros',
      sectorKey: 'OUTRAS_AREAS',
      sector: 'Atos Institucionais',
      recordType: 'REUNIAO',
      recordTypeLabel: 'Ato Institucional',
      date: inst.date || new Date().toISOString(),
      title: inst.title || 'Registro Institucional',
      responsible: 'Coordenação Geral',
      roleOrFunction: 'Coordenação Geral',
      targetOrParticipant: inst.recipientSender || 'Institucional OAMI',
      description: inst.description || 'Ato ou registro institucional da Casa OAMI.',
      details: inst
    });
  });

  // Sort descending by date
  items.sort((a, b) => {
    const da = a.date ? new Date(a.date).getTime() : 0;
    const db = b.date ? new Date(b.date).getTime() : 0;
    return db - da;
  });

  return items;
}

export function filterUnifiedRecords(
  records: UnifiedReportItem[],
  filters: {
    startDate: string;
    endDate: string;
    sectorKey?: SectorKey | 'ALL';
    professional?: string;
    elderlyId?: string;
    recordType?: RecordType | 'ALL';
    searchQuery?: string;
  }
): UnifiedReportItem[] {
  const { startDate, endDate, sectorKey, professional, elderlyId, recordType, searchQuery } = filters;
  const searchLower = (searchQuery || '').trim().toLowerCase();

  return records.filter(item => {
    // 1. Date Range
    if (!isItemInDateRange(item.date, startDate, endDate)) {
      return false;
    }

    // 2. Sector Filter
    if (sectorKey && sectorKey !== 'ALL' && item.sectorKey !== sectorKey) {
      return false;
    }

    // 3. Professional Filter
    if (professional && professional !== 'ALL') {
      const resp = (item.responsible || '').toLowerCase();
      if (!resp.includes(professional.toLowerCase())) {
        return false;
      }
    }

    // 4. Elderly Filter
    if (elderlyId && elderlyId !== 'ALL') {
      if (item.elderlyId !== elderlyId) {
        // also check if elderly name is mentioned in target
        const target = (item.targetOrParticipant || '').toLowerCase();
        if (!target.includes(elderlyId.toLowerCase())) {
          return false;
        }
      }
    }

    // 5. Record Type Filter
    if (recordType && recordType !== 'ALL' && item.recordType !== recordType) {
      return false;
    }

    // 6. Text Search
    if (searchLower) {
      const matchTitle = (item.title || '').toLowerCase().includes(searchLower);
      const matchResponsible = (item.responsible || '').toLowerCase().includes(searchLower);
      const matchTarget = (item.targetOrParticipant || '').toLowerCase().includes(searchLower);
      const matchSector = (item.sector || '').toLowerCase().includes(searchLower);
      const matchDesc = (item.description || '').toLowerCase().includes(searchLower);
      const matchConduct = (item.conductOrOutcome || '').toLowerCase().includes(searchLower);

      if (!matchTitle && !matchResponsible && !matchTarget && !matchSector && !matchDesc && !matchConduct) {
        return false;
      }
    }

    return true;
  });
}

// Retain compatibility alias
export const filterSystemRecords = (
  records: UnifiedReportItem[],
  filters: {
    startDate: string;
    endDate: string;
    category: ReportCategory;
    professional: string;
    searchQuery: string;
  }
) => {
  return filterUnifiedRecords(records, {
    startDate: filters.startDate,
    endDate: filters.endDate,
    professional: filters.professional,
    searchQuery: filters.searchQuery
  });
};

export function calculateReportMetrics(records: UnifiedReportItem[]): GeneralReportMetrics {
  const categoryCounts: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};
  const recordTypeCounts: Record<string, number> = {};
  const uniqueProfessionals = new Set<string>();

  let totalAttendances = 0;
  let totalParticipants = 0;
  let totalWorkshops = 0;
  let totalTrainings = 0;
  let totalDiaperProduced = 0;
  let totalDiaperDistributed = 0;
  let totalStockMovements = 0;
  let totalStockInputs = 0;
  let totalStockOutputs = 0;
  let totalClinicalMonitorings = 0;
  let totalTreasuryTransactions = 0;
  let totalDonationsValue = 0;
  let totalAssessments = 0;
  let totalGroupActivities = 0;

  records.forEach(item => {
    // Categories & Sectors
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    sectorCounts[item.sector] = (sectorCounts[item.sector] || 0) + 1;
    recordTypeCounts[item.recordType] = (recordTypeCounts[item.recordType] || 0) + 1;

    // Professionals
    if (item.responsible && item.responsible !== 'Responsável não informado') {
      uniqueProfessionals.add(item.responsible.trim());
    }

    // Granular metrics
    if (item.recordType === 'EVOLUCAO' || item.recordType === 'ATENDIMENTO' || item.recordType === 'VISITA') {
      totalAttendances += 1;
    }
    if (item.recordType === 'AVALIACAO') {
      totalAssessments += 1;
    }
    if (item.recordType === 'OFICINA') {
      totalWorkshops += 1;
      totalGroupActivities += 1;
      totalParticipants += (item.participantsCount || 1);
    }
    if (item.recordType === 'CAPACITACAO') {
      totalTrainings += 1;
      totalParticipants += (item.participantsCount || 1);
    }
    if (item.category === 'DIAPERS') {
      const qty = typeof item.quantityOrValue === 'number' ? item.quantityOrValue : parseInt(String(item.quantityOrValue || 0), 10) || 0;
      if (item.typeOrStatus === 'SAÍDA / DOAÇÃO') {
        totalDiaperDistributed += qty;
      } else {
        totalDiaperProduced += qty;
      }
    }
    if (item.category === 'STOCK') {
      totalStockMovements += 1;
      const qty = typeof item.quantityOrValue === 'number' ? item.quantityOrValue : parseFloat(String(item.quantityOrValue || 0)) || 0;
      if (item.typeOrStatus === 'ENTRADA') {
        totalStockInputs += qty;
      } else if (item.typeOrStatus === 'SAIDA') {
        totalStockOutputs += qty;
      }
    }
    if (item.category === 'MONITORING') {
      totalClinicalMonitorings += 1;
    }
    if (item.category === 'TREASURY') {
      totalTreasuryTransactions += 1;
      if (typeof item.quantityOrValue === 'string' && item.quantityOrValue.includes('R$')) {
        const val = parseFloat(item.quantityOrValue.replace('R$', '').trim().replace(',', '.')) || 0;
        totalDonationsValue += val;
      }
    }
  });

  return {
    totalRecords: records.length,
    totalAttendances,
    totalGroupActivities,
    totalWorkshops,
    totalAssessments,
    totalClinicalMonitorings,
    totalStockMovements,
    totalStockInputs,
    totalStockOutputs,
    totalDiaperProduced,
    totalDiaperDistributed,
    totalTrainings,
    activeProfessionalsCount: uniqueProfessionals.size,
    totalParticipants,
    totalTreasuryTransactions,
    totalDonationsValue,
    categoryCounts,
    sectorCounts,
    recordTypeCounts
  };
}

// Executive Summary Builder
export function buildExecutiveSummaryData(records: UnifiedReportItem[]): ExecutiveSummaryData {
  const metrics = calculateReportMetrics(records);

  // Define sectors to summarize
  const sectorConfigs: Array<{ key: SectorKey; name: string }> = [
    { key: 'ENFERMAGEM', name: 'Enfermagem' },
    { key: 'FISIOTERAPIA', name: 'Fisioterapia' },
    { key: 'PSICOLOGIA', name: 'Psicologia' },
    { key: 'SERVICO_SOCIAL', name: 'Serviço Social' },
    { key: 'PEDAGOGIA', name: 'Pedagogia' },
    { key: 'NUTRICAO', name: 'Nutrição' },
    { key: 'EQUIPE_TECNICA', name: 'Coordenação / Equipe Técnica' },
    { key: 'OFICINAS', name: 'Oficinas e Atividades Coletivas' },
    { key: 'MONITORAMENTO', name: 'Monitoramento Clínico' },
    { key: 'ESTOQUE', name: 'Estoque & Almoxarifado' },
    { key: 'PRODUCAO_FRALDAS', name: 'Produção de Fraldas' },
    { key: 'CAPACITACOES', name: 'Capacitações Profissionais' },
    { key: 'OUTRAS_AREAS', name: 'Demais Áreas Institucionais' }
  ];

  const sectors: SectorExecutiveSummary[] = sectorConfigs.map(cfg => {
    const sectorItems = records.filter(r => r.sectorKey === cfg.key);
    const profsSet = new Set<string>();
    const elderlySet = new Set<string>();

    sectorItems.forEach(item => {
      if (item.responsible && item.responsible !== 'Responsável não informado') {
        profsSet.add(item.responsible);
      }
      if (item.elderlyId) {
        elderlySet.add(item.elderlyId);
      } else if (item.targetOrParticipant && !item.targetOrParticipant.includes('Turno') && !item.targetOrParticipant.includes('Item')) {
        elderlySet.add(item.targetOrParticipant);
      }
    });

    return {
      sectorKey: cfg.key,
      name: cfg.name,
      recordsCount: sectorItems.length,
      elderlyCount: elderlySet.size,
      professionalsCount: profsSet.size,
      professionalsList: Array.from(profsSet)
    };
  });

  return {
    totalRecords: metrics.totalRecords,
    totalAttendances: metrics.totalAttendances,
    totalWorkshops: metrics.totalWorkshops,
    totalTrainings: metrics.totalTrainings,
    totalDiaperProduced: metrics.totalDiaperProduced,
    totalStockMovements: metrics.totalStockMovements,
    totalMonitorings: metrics.totalClinicalMonitorings,
    totalAssessments: metrics.totalAssessments,
    totalGroupActivities: metrics.totalGroupActivities,
    activeProfessionalsCount: metrics.activeProfessionalsCount,
    sectors
  };
}

// Grouped by Elderly Builder (Item 6)
export function buildElderlyGroupedReport(records: UnifiedReportItem[], elderlyList: Elderly[]): ElderlyGroupedReport[] {
  const map = new Map<string, ElderlyGroupedReport>();

  elderlyList.forEach(e => {
    map.set(e.id, {
      elderlyId: e.id,
      elderlyName: e.name,
      totalRecords: 0,
      sectors: {
        nursing: [],
        physio: [],
        psych: [],
        social: [],
        pedagogy: [],
        nutrition: [],
        other: []
      }
    });
  });

  records.forEach(item => {
    if (!item.elderlyId) {
      // Check if target name matches any elderly
      const match = elderlyList.find(e => item.targetOrParticipant && e.name.toLowerCase().includes(item.targetOrParticipant.toLowerCase()));
      if (match) {
        item.elderlyId = match.id;
      }
    }

    if (item.elderlyId) {
      if (!map.has(item.elderlyId)) {
        map.set(item.elderlyId, {
          elderlyId: item.elderlyId,
          elderlyName: item.targetOrParticipant || 'Acolhido(a)',
          totalRecords: 0,
          sectors: {
            nursing: [],
            physio: [],
            psych: [],
            social: [],
            pedagogy: [],
            nutrition: [],
            other: []
          }
        });
      }

      const entry = map.get(item.elderlyId)!;
      entry.totalRecords += 1;

      switch (item.sectorKey) {
        case 'ENFERMAGEM':
          entry.sectors.nursing.push(item);
          break;
        case 'FISIOTERAPIA':
          entry.sectors.physio.push(item);
          break;
        case 'PSICOLOGIA':
          entry.sectors.psych.push(item);
          break;
        case 'SERVICO_SOCIAL':
          entry.sectors.social.push(item);
          break;
        case 'PEDAGOGIA':
          entry.sectors.pedagogy.push(item);
          break;
        case 'NUTRICAO':
          entry.sectors.nutrition.push(item);
          break;
        default:
          entry.sectors.other.push(item);
          break;
      }
    }
  });

  // Filter out elderly with 0 records unless they are active, sort by totalRecords descending
  return Array.from(map.values())
    .filter(e => e.totalRecords > 0)
    .sort((a, b) => b.totalRecords - a.totalRecords);
}

// Grouped by Professional Builder (Item 7)
export function buildProfessionalGroupedReport(records: UnifiedReportItem[]): ProfessionalGroupedReport[] {
  const map = new Map<string, {
    records: UnifiedReportItem[];
    area: string;
    elderlySet: Set<string>;
    dates: string[];
    byType: Record<string, number>;
  }>();

  records.forEach(item => {
    const profName = item.responsible || 'Responsável não informado';
    if (!map.has(profName)) {
      map.set(profName, {
        records: [],
        area: item.sector,
        elderlySet: new Set<string>(),
        dates: [],
        byType: {}
      });
    }

    const entry = map.get(profName)!;
    entry.records.push(item);
    if (item.targetOrParticipant) {
      entry.elderlySet.add(item.targetOrParticipant);
    }
    if (item.date) {
      entry.dates.push(item.date.slice(0, 10));
    }
    const typeKey = item.recordTypeLabel || item.recordType;
    entry.byType[typeKey] = (entry.byType[typeKey] || 0) + 1;
  });

  const result: ProfessionalGroupedReport[] = [];

  map.forEach((val, name) => {
    val.dates.sort();
    result.push({
      professionalName: name,
      area: val.area,
      totalRecords: val.records.length,
      byRecordType: val.byType,
      elderlyAttended: Array.from(val.elderlySet),
      elderlyAttendedCount: val.elderlySet.size,
      dateRange: {
        start: val.dates[0] || '',
        end: val.dates[val.dates.length - 1] || ''
      },
      records: val.records
    });
  });

  return result.sort((a, b) => b.totalRecords - a.totalRecords);
}

// Monthly Grouped Report Builder (Item 8)
export function buildMonthlyReportData(records: UnifiedReportItem[]): MonthlySummaryItem[] {
  const monthMap = new Map<string, {
    totalRecords: number;
    nursingRecords: number;
    physioRecords: number;
    psychRecords: number;
    socialRecords: number;
    pedagogyRecords: number;
    nutritionRecords: number;
    workshopsCount: number;
    monitoringsCount: number;
    stockMovementsCount: number;
    diaperProducedCount: number;
    trainingsCount: number;
  }>();

  records.forEach(item => {
    if (!item.date) return;
    const monthKey = item.date.slice(0, 7); // YYYY-MM
    if (!monthMap.has(monthKey)) {
      monthMap.set(monthKey, {
        totalRecords: 0,
        nursingRecords: 0,
        physioRecords: 0,
        psychRecords: 0,
        socialRecords: 0,
        pedagogyRecords: 0,
        nutritionRecords: 0,
        workshopsCount: 0,
        monitoringsCount: 0,
        stockMovementsCount: 0,
        diaperProducedCount: 0,
        trainingsCount: 0
      });
    }

    const d = monthMap.get(monthKey)!;
    d.totalRecords += 1;

    switch (item.sectorKey) {
      case 'ENFERMAGEM': d.nursingRecords += 1; break;
      case 'FISIOTERAPIA': d.physioRecords += 1; break;
      case 'PSICOLOGIA': d.psychRecords += 1; break;
      case 'SERVICO_SOCIAL': d.socialRecords += 1; break;
      case 'PEDAGOGIA': d.pedagogyRecords += 1; break;
      case 'NUTRICAO': d.nutritionRecords += 1; break;
      case 'OFICINAS': d.workshopsCount += 1; break;
      case 'MONITORAMENTO': d.monitoringsCount += 1; break;
      case 'ESTOQUE': d.stockMovementsCount += 1; break;
      case 'PRODUCAO_FRALDAS': {
        const qty = typeof item.quantityOrValue === 'number' ? item.quantityOrValue : parseInt(String(item.quantityOrValue || 0), 10) || 0;
        d.diaperProducedCount += qty;
        break;
      }
      case 'CAPACITACOES': d.trainingsCount += 1; break;
    }
  });

  // Sort keys ascending for comparison, then format
  const sortedKeys = Array.from(monthMap.keys()).sort();

  const items: MonthlySummaryItem[] = sortedKeys.map((key, idx) => {
    const data = monthMap.get(key)!;
    let deltaRecordsPercent: number | undefined = undefined;
    let deltaRecordsAbsolute: number | undefined = undefined;

    if (idx > 0) {
      const prevKey = sortedKeys[idx - 1];
      const prevTotal = monthMap.get(prevKey)!.totalRecords;
      deltaRecordsAbsolute = data.totalRecords - prevTotal;
      if (prevTotal > 0) {
        deltaRecordsPercent = Math.round(((data.totalRecords - prevTotal) / prevTotal) * 100);
      }
    }

    // Label
    let label = key;
    try {
      const [year, month] = key.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      label = format(d, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
    } catch {
      label = key;
    }

    return {
      monthKey: key,
      monthLabel: label,
      ...data,
      deltaRecordsPercent,
      deltaRecordsAbsolute
    };
  });

  // Return in descending order (latest month first)
  return items.reverse();
}

// Monthly Stock Consumption Aggregator (Item 10)
// Group products by month and category, summing same products!
export function buildMonthlyStockConsumption(
  movements: StockMovement[],
  products: StockProduct[]
): MonthlyStockReport[] {
  // Map of productId to category and unit
  const productMeta = new Map<string, { category: string; unit: string; name: string }>();
  products.forEach(p => {
    productMeta.set(p.id, {
      category: p.category || 'GERAL',
      unit: p.unit || 'un',
      name: p.name
    });
    if (p.name) {
      productMeta.set(p.name.toLowerCase().trim(), {
        category: p.category || 'GERAL',
        unit: p.unit || 'un',
        name: p.name
      });
    }
  });

  // Structure: monthKey -> category -> productName -> { totalQuantity, unit }
  const monthData = new Map<string, Map<string, Map<string, { totalQuantity: number; unit: string }>>>();

  movements.forEach(m => {
    if (!m.date && !m.timestamp) return;
    const dateStr = (m.date || m.timestamp).slice(0, 7); // YYYY-MM
    const type = m.type; // SAIDA is consumption

    // Only count exits / consumption
    if (type !== 'SAIDA') return;

    if (!monthData.has(dateStr)) {
      monthData.set(dateStr, new Map());
    }

    const catMap = monthData.get(dateStr)!;
    const meta = (m.productId && productMeta.get(m.productId)) ||
      (m.productName && productMeta.get(m.productName.toLowerCase().trim())) || {
        category: 'OUTROS',
        unit: 'un',
        name: m.productName || 'Produto'
      };

    const catKey = (meta.category || 'OUTROS').toUpperCase();
    if (!catMap.has(catKey)) {
      catMap.set(catKey, new Map());
    }

    const prodMap = catMap.get(catKey)!;
    const prodName = meta.name || m.productName || 'Produto';
    const current = prodMap.get(prodName) || { totalQuantity: 0, unit: meta.unit || 'un' };
    current.totalQuantity += (m.quantity || 0);
    prodMap.set(prodName, current);
  });

  const reports: MonthlyStockReport[] = [];

  monthData.forEach((catMap, monthKey) => {
    let monthLabel = monthKey;
    try {
      const [year, month] = monthKey.split('-');
      const d = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
      monthLabel = format(d, "MMMM 'de' yyyy", { locale: ptBR }).toUpperCase();
    } catch {
      monthLabel = monthKey;
    }

    const categories: MonthlyStockCategoryConsumption[] = [];

    catMap.forEach((prodMap, category) => {
      const productsList: Array<{ productName: string; unit: string; totalQuantity: number }> = [];
      prodMap.forEach((val, productName) => {
        productsList.push({
          productName,
          unit: val.unit,
          totalQuantity: val.totalQuantity
        });
      });

      productsList.sort((a, b) => b.totalQuantity - a.totalQuantity);
      categories.push({ category, products: productsList });
    });

    categories.sort((a, b) => a.category.localeCompare(b.category));
    reports.push({
      monthKey,
      monthLabel,
      categories
    });
  });

  return reports.sort((a, b) => b.monthKey.localeCompare(a.monthKey));
}
