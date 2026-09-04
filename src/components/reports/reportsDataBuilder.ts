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
  DatePreset
} from './reportsTypes';

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

  // Lookup map for elderly names
  const elderlyMap = new Map<string, string>();
  (props.elderly || []).forEach(e => {
    if (e.id) elderlyMap.set(e.id, e.name);
  });

  const getElderlyName = (id?: string, fallbackName?: string) => {
    if (!id && !fallbackName) return 'Acolhido(a) não identificado(a)';
    if (id && elderlyMap.has(id)) return elderlyMap.get(id)!;
    return fallbackName || 'Acolhido(a)';
  };

  // 1. PROFISSIONAIS & EVOLUÇÕES MULTIDISCIPLINARES
  // 1.1 Evoluções Gerais
  (props.evolutions || []).forEach(ev => {
    items.push({
      id: `gen-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Geral',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Multidisciplinar Geral',
      responsible: (ev as any).registeredBy || (ev as any).professional || 'Equipe Multidisciplinar',
      roleOrFunction: ev.professionalRole || 'Geral',
      targetOrParticipant: getElderlyName(ev.elderlyId, (ev as any).elderlyName),
      description: (ev as any).notes || (ev as any).evolution || ev.content || '',
      conductOrOutcome: (ev as any).conduct || (ev as any).plan || '',
      details: ev,
      photos: (ev as any).photos || []
    });
  });

  // 1.2 Enfermagem
  (props.nursingEvolutions || []).forEach(ev => {
    items.push({
      id: `nur-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Enfermagem',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução de Enfermagem',
      responsible: (ev as any).registeredBy || 'Enfermeiro(a)',
      roleOrFunction: 'Enfermagem',
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).elderlyName),
      description: ev.content || '',
      conductOrOutcome: '',
      details: ev,
      photos: ev.photos || []
    });
  });

  // 1.3 Fisioterapia
  (props.physioEvolutions || []).forEach(ev => {
    items.push({
      id: `phy-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Fisioterapia',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Fisioterapêutica',
      responsible: ev.registeredBy || 'Fisioterapeuta',
      roleOrFunction: 'Fisioterapeuta',
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).patientName),
      description: ev.evolution || ev.procedures || '',
      conductOrOutcome: ev.observations || '',
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.physioExercises || []).forEach(ex => {
    items.push({
      id: `phy-ex-${ex.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Fisioterapia',
      date: (ex as any).date || (ex as any).createdAt || new Date().toISOString(),
      title: `Exercício Fisioterapêutico: ${ex.title || 'Atividade'}`,
      responsible: (ex as any).registeredBy || 'Fisioterapeuta',
      roleOrFunction: 'Fisioterapeuta',
      targetOrParticipant: getElderlyName((ex as any).patientId, (ex as any).patientName),
      description: ex.description || '',
      details: ex
    });
  });

  (props.physioAssessments || []).forEach(ass => {
    items.push({
      id: `phy-ass-${ass.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Fisioterapia',
      date: ass.date || new Date().toISOString(),
      title: 'Avaliação Fisioterapêutica Inicial/Periódica',
      responsible: (ass as any).registeredBy || 'Fisioterapeuta',
      roleOrFunction: 'Fisioterapeuta',
      targetOrParticipant: getElderlyName(ass.patientId, (ass as any).patientName),
      description: `Diagnóstico Funcional: ${ass.functionalDiagnosis || 'Em avaliação'} • Grau de Mobilidade: ${ass.mobilityLevel || 'N/A'}`,
      conductOrOutcome: ass.treatmentPlan || '',
      details: ass
    });
  });

  // 1.4 Psicologia
  (props.psychEvolutions || []).forEach(ev => {
    items.push({
      id: `psy-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Psicologia',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Psicológica',
      responsible: ev.registeredBy || 'Psicólogo(a)',
      roleOrFunction: 'Psicologia',
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).patientName),
      description: ev.observation || '',
      conductOrOutcome: ev.intervention || '',
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.psychActivities || []).forEach(act => {
    items.push({
      id: `psy-act-${act.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Psicologia',
      date: act.date || new Date().toISOString(),
      title: `Atividade Psicológica: ${act.title || 'Sessão'}`,
      responsible: act.registeredBy || 'Psicólogo(a)',
      roleOrFunction: 'Psicologia',
      targetOrParticipant: (act.participants && act.participants.length > 0) ? act.participants.join(', ') : 'Grupo de Acolhidos',
      participantsCount: act.participants ? act.participants.length : 1,
      description: act.description || '',
      details: act,
      photos: act.photos || []
    });
  });

  // 1.5 Pedagogia
  (props.pedagogyEvolutions || []).forEach(ev => {
    items.push({
      id: `ped-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Pedagogia',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Pedagógica',
      responsible: ev.registeredBy || 'Pedagogo(a)',
      roleOrFunction: 'Pedagogia',
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).patientName),
      description: `Atividade: ${ev.activityTitle || ''} • Resposta: ${ev.response || ''}`,
      conductOrOutcome: ev.observations || '',
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.pedagogyActivities || []).forEach(act => {
    items.push({
      id: `ped-act-${act.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Pedagogia',
      date: act.date || new Date().toISOString(),
      title: `Atividade Pedagógica: ${act.title || 'Estimulação'}`,
      responsible: act.registeredBy || 'Pedagogo(a)',
      roleOrFunction: 'Pedagogia',
      targetOrParticipant: (act.participants && act.participants.length > 0) ? act.participants.join(', ') : 'Acolhidos',
      participantsCount: act.participants ? act.participants.length : 1,
      description: act.description || '',
      details: act,
      photos: act.photos || []
    });
  });

  // 1.6 Serviço Social
  (props.socialEvolutions || []).forEach(ev => {
    items.push({
      id: `soc-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Serviço Social',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Social',
      responsible: ev.registeredBy || 'Assistente Social',
      roleOrFunction: 'Serviço Social',
      targetOrParticipant: getElderlyName(ev.patientId || '', (ev as any).patientName),
      description: ev.observation || ev.serviceType || '',
      conductOrOutcome: ev.conduct || '',
      details: ev,
      photos: ev.photos || []
    });
  });

  (props.socialFamilyVisits || []).forEach(vis => {
    items.push({
      id: `soc-vis-${vis.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Serviço Social',
      date: vis.date || new Date().toISOString(),
      title: 'Visita Familiar / Domiciliar',
      responsible: vis.registeredBy || 'Assistente Social',
      roleOrFunction: 'Serviço Social',
      targetOrParticipant: getElderlyName(vis.patientId, (vis as any).patientName),
      description: `Familiar: ${vis.visitorName || 'Familiar'} (${vis.kinship || 'Parentesco não inf.'}) • Detalhes: ${vis.observations || 'Sem observações'}`,
      details: vis
    });
  });

  (props.socialReferrals || []).forEach(ref => {
    items.push({
      id: `soc-ref-${ref.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Serviço Social',
      date: ref.date || new Date().toISOString(),
      title: `Encaminhamento Social: ${ref.destination || 'Rede Socioassistencial'}`,
      responsible: ref.registeredBy || 'Assistente Social',
      roleOrFunction: 'Serviço Social',
      targetOrParticipant: getElderlyName(ref.patientId, (ref as any).patientName),
      description: `Descrição: ${ref.description || 'Encaminhamento técnico'} • Status: ${ref.status || 'Ativo'}`,
      details: ref
    });
  });

  // 1.7 Nutrição
  (props.nutritionEvolutions || []).forEach(ev => {
    items.push({
      id: `nut-ev-${ev.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Nutrição',
      date: ev.date || new Date().toISOString(),
      title: 'Evolução Nutricional',
      responsible: ev.registeredBy || 'Nutricionista',
      roleOrFunction: 'Nutricionista',
      targetOrParticipant: getElderlyName(ev.patientId, (ev as any).patientName),
      description: ev.observations || '',
      conductOrOutcome: ev.conduct || '',
      details: ev,
      photos: ev.photos || []
    });
  });

  // 1.8 Planos Individuais de Atendimento (PIA)
  (props.pias || []).forEach(pia => {
    items.push({
      id: `pia-${pia.id || Math.random()}`,
      category: 'PROFESSIONALS',
      categoryLabel: 'Profissionais',
      sector: 'Equipe Técnica',
      date: pia.date || (pia as any).createdAt || new Date().toISOString(),
      title: 'Plano Individual de Atendimento (PIA)',
      responsible: pia.responsible || 'Comissão Multidisciplinar',
      roleOrFunction: 'Equipe Técnica',
      targetOrParticipant: getElderlyName(pia.elderlyId, (pia as any).elderlyName),
      description: `Objetivos e Metas: ${pia.objectives || 'Plano de Acolhimento Humanizado'}`,
      details: pia
    });
  });

  // 2. OFICINAS & 3. CAPACITAÇÕES
  (props.workshops || []).forEach(w => {
    const isTraining = w.type === 'CAPACITACAO';
    const participantsList = Array.isArray(w.participants) ? w.participants : [];
    const count = participantsList.length;

    items.push({
      id: `ws-${w.id || Math.random()}`,
      category: isTraining ? 'TRAININGS' : 'WORKSHOPS',
      categoryLabel: isTraining ? 'Capacitações' : 'Oficinas',
      sector: isTraining ? 'Capacitação Profissional' : 'Oficinas Terapêuticas',
      date: w.date || (w as any).when || new Date().toISOString(),
      title: w.title || (isTraining ? 'Capacitação Institucional' : 'Oficina OAMI'),
      responsible: w.who || w.registeredBy || 'Responsável não informado',
      roleOrFunction: isTraining ? 'Palestrante / Facilitador' : 'Oficineiro / Responsável',
      targetOrParticipant: count > 0 ? `${count} participante(s): ${participantsList.slice(0, 3).join(', ')}${count > 3 ? '...' : ''}` : 'Público Geral',
      participantsCount: count,
      typeOrStatus: isTraining ? 'CAPACITAÇÃO' : 'OFICINA',
      description: w.description || w.what || '',
      conductOrOutcome: [
        w.why ? `Por quê: ${w.why}` : '',
        w.how ? `Como: ${w.how}` : '',
        w.where ? `Local: ${w.where}` : '',
        w.howMuch ? `Investimento: ${w.howMuch}` : ''
      ].filter(Boolean).join(' • '),
      locationOrRoom: w.where || 'Sede OAMI',
      details: w,
      photos: w.photos || [],
      documents: w.documents || []
    });
  });

  // 4. FABRICAÇÃO DE FRALDAS (SGPF)
  // 4.1 Produção Bruta / Corte
  (props.diaperRawProductions || []).forEach(raw => {
    items.push({
      id: `raw-${raw.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sector: 'Produção (Corte Bruto)',
      date: raw.date || new Date().toISOString(),
      title: `Corte Bruto de Fraldas`,
      responsible: raw.operator || 'Operador SGPF',
      roleOrFunction: 'Fabricante de Fraldas',
      targetOrParticipant: `Turno ${raw.shift || 'Integral'}`,
      quantityOrValue: raw.quantity || 0,
      typeOrStatus: 'CORTE BRUTO',
      description: `Produção de ${raw.quantity || 0} unidades brutas.`,
      conductOrOutcome: raw.observations || '',
      details: raw
    });
  });

  // 4.2 Processamento Intermediário (WIP)
  (props.diaperWIPProcessings || []).forEach(wip => {
    items.push({
      id: `wip-${wip.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sector: 'Produção (Intermediária)',
      date: wip.date || new Date().toISOString(),
      title: `Processamento WIP de Fraldas`,
      responsible: wip.operator || 'Operador SGPF',
      roleOrFunction: 'Fabricante de Fraldas',
      targetOrParticipant: `Entrada: ${wip.quantityIn} • Saída: ${wip.quantityOut}`,
      quantityOrValue: wip.quantityOut || wip.quantityIn || 0,
      typeOrStatus: 'PROCESSAMENTO',
      description: `Entrada: ${wip.quantityIn} un. Saída: ${wip.quantityOut} un. Perda: ${wip.wasteAmount} un (${wip.wasteReason || 'Ajuste de máquina'}).`,
      conductOrOutcome: wip.observations || '',
      details: wip
    });
  });

  // 4.3 Empacotamento Final
  (props.diaperFinalPackings || []).forEach(finalItem => {
    items.push({
      id: `final-${finalItem.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sector: 'Produção (Empacotamento)',
      date: finalItem.date || finalItem.createdAt || new Date().toISOString(),
      title: `Fraldas Embaladas: ${finalItem.quantityPackaged || 0} pacotes (${finalItem.packageType || 'Geral'})`,
      responsible: finalItem.operator || 'Operador SGPF',
      roleOrFunction: 'Fabricante de Fraldas',
      targetOrParticipant: `Lote ${finalItem.batchNumber || 'Pronto'}`,
      quantityOrValue: finalItem.quantityPackaged || 0,
      typeOrStatus: 'PRODUTO ACABADO',
      description: `${finalItem.quantityPackaged || 0} pacotes embalados (${finalItem.packageType || 'Tamanho Único'}). Lote: ${finalItem.batchNumber || 'N/A'}.`,
      conductOrOutcome: finalItem.observations || '',
      details: finalItem
    });
  });

  // 4.4 Doações / Saídas de Fraldas
  (props.diaperDonations || []).forEach(don => {
    items.push({
      id: `diap-don-${don.id || Math.random()}`,
      category: 'DIAPERS',
      categoryLabel: 'Fabricação de Fraldas',
      sector: 'Distribuição / Doação',
      date: don.date || don.createdAt || new Date().toISOString(),
      title: `Doação/Distribuição de Fraldas (${don.size || 'Geral'})`,
      responsible: don.registeredBy || 'Coordenação / SGPF',
      roleOrFunction: 'Distribuição',
      targetOrParticipant: don.beneficiaryName || 'Beneficiário OAMI',
      quantityOrValue: don.quantity || 0,
      typeOrStatus: 'SAÍDA / DOAÇÃO',
      description: `Entrega de ${don.quantity || 0} unidades/pacotes de fraldas tam. ${don.size || 'Geral'}.`,
      conductOrOutcome: don.observations || '',
      details: don
    });
  });

  // 5. ESTOQUE & ALMOXARIFADO
  (props.stockMovements || []).forEach(mov => {
    items.push({
      id: `stk-mov-${mov.id || Math.random()}`,
      category: 'STOCK',
      categoryLabel: 'Estoque',
      sector: 'Almoxarifado & Farmácia',
      date: mov.date || mov.timestamp || new Date().toISOString(),
      title: `${mov.type === 'ENTRADA' ? 'Entrada no Estoque' : 'Saída do Estoque'}: ${mov.productName || 'Item'}`,
      responsible: mov.responsible || 'Almoxarife / Responsável',
      roleOrFunction: 'Controle de Estoque',
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

  // 6. MONITORAMENTO CLÍNICO & CUIDADOS
  // 6.1 Sinais Vitais
  (props.vitalSigns || []).forEach(vs => {
    items.push({
      id: `vs-${vs.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sector: 'Sinais Vitais',
      date: vs.date || new Date().toISOString(),
      title: 'Aferição de Sinais Vitais',
      responsible: vs.registeredBy || 'Enfermagem/Cuidador',
      roleOrFunction: 'Cuidados Clínicos',
      targetOrParticipant: getElderlyName(vs.patientId, (vs as any).elderlyName),
      description: `PA: ${vs.systolicBP || '--'}/${vs.diastolicBP || '--'} mmHg • FC: ${vs.heartRate || '--'} bpm • Temp: ${vs.temperature || '--'} °C • Glicemia: ${vs.bloodGlucose ?? '--'} mg/dL • SatO2: ${vs.saturation || '--'}%`,
      conductOrOutcome: `Aferido às ${vs.time || '--'}`,
      details: vs
    });
  });

  // 6.2 Curativos
  (props.dressingRecords || []).forEach(dr => {
    items.push({
      id: `dr-${dr.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sector: 'Curativos e Lesões',
      date: dr.date || new Date().toISOString(),
      title: `Curativo: ${dr.location || 'Lesão'}`,
      responsible: dr.registeredBy || 'Enfermagem',
      roleOrFunction: 'Enfermagem',
      targetOrParticipant: getElderlyName(dr.patientId, (dr as any).elderlyName),
      description: `Localização: ${dr.location || 'Corpo'} • Tipo de Lesão: ${dr.woundType || 'Padrão'} • Aspecto: ${dr.aspect || 'Em cicatrização'} • Próx. troca: ${dr.nextChangeDate || '--'}`,
      conductOrOutcome: dr.conduct || '',
      details: dr,
      photos: dr.photos || []
    });
  });

  // 6.3 Administração de Medicamentos
  (props.medicationAdministrations || []).forEach(med => {
    items.push({
      id: `med-${med.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sector: 'Administração de Medicamentos',
      date: med.date || new Date().toISOString(),
      title: `Administração de Medicamento`,
      responsible: med.administeredBy || 'Enfermagem/Cuidador',
      roleOrFunction: 'Enfermagem',
      targetOrParticipant: getElderlyName(med.patientId, (med as any).elderlyName),
      description: `Horário Agendado: ${med.scheduledTime || '--'} • Horário Real: ${med.administeredTime || '--'} • Status: ${med.status}`,
      conductOrOutcome: med.observations || (med.status === 'ADMINISTRADO' ? 'Administrado com sucesso' : med.status),
      details: med
    });
  });

  // 6.4 Ocorrências e Incidentes
  (props.incidentRecords || []).forEach(inc => {
    items.push({
      id: `inc-${inc.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sector: 'Ocorrências & Incidentes',
      date: inc.date || new Date().toISOString(),
      title: `Ocorrência: ${inc.type || 'Incidente'}`,
      responsible: inc.registeredBy || 'Plantão',
      roleOrFunction: 'Equipe de Cuidados',
      targetOrParticipant: getElderlyName(inc.patientId, (inc as any).elderlyName),
      description: inc.description || 'Registro de incidente durante o plantão',
      conductOrOutcome: inc.conduct || 'Conduta registrada',
      details: inc,
      photos: inc.photos || []
    });
  });

  // 6.5 Trocas de Fralda
  (props.diaperChangeRecords || []).forEach(dc => {
    items.push({
      id: `dc-${dc.id || Math.random()}`,
      category: 'MONITORING',
      categoryLabel: 'Monitoramento',
      sector: 'Trocas de Fralda & Higiene',
      date: dc.date || new Date().toISOString(),
      title: `Troca de Fralda`,
      responsible: dc.registeredBy || 'Cuidador(a)',
      roleOrFunction: 'Cuidador de Idosos',
      targetOrParticipant: getElderlyName(dc.patientId, (dc as any).elderlyName),
      description: `Horário: ${dc.time || '--'} • Aspecto: ${dc.aspect || 'NORMAL'}`,
      conductOrOutcome: dc.observations || '',
      details: dc
    });
  });

  // 7. TESOURARIA & DOAÇÕES
  (props.treasuryTransactions || []).forEach(tx => {
    items.push({
      id: `tx-${tx.id || Math.random()}`,
      category: 'TREASURY',
      categoryLabel: 'Tesouraria',
      sector: 'Tesouraria & Finanças',
      date: tx.date || new Date().toISOString(),
      title: `${tx.type === 'RECEITA' ? 'Receita / Entrada' : 'Despesa / Saída'}: ${tx.category || 'Operacional'}`,
      responsible: tx.registeredBy || 'Tesoureiro(a)',
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
    items.push({
      id: `fin-${fin.id || Math.random()}`,
      category: 'TREASURY',
      categoryLabel: 'Tesouraria',
      sector: 'Gestão Financeira',
      date: fin.date || new Date().toISOString(),
      title: `${fin.type === 'RECEITA' ? 'Receita' : 'Despesa'}: ${fin.category || 'Geral'}`,
      responsible: fin.createdBy || 'Financeiro',
      roleOrFunction: 'Financeiro',
      targetOrParticipant: fin.description || 'Registro Contábil',
      quantityOrValue: `R$ ${Number(fin.amount || 0).toFixed(2)}`,
      typeOrStatus: fin.type === 'RECEITA' ? 'RECEITA' : 'DESPESA',
      description: fin.description || '',
      details: fin
    });
  });

  // 8. DEMAIS ÁREAS DO SISTEMA (Apoio Institucional, Presidência, Família, Voluntários, Outros)
  (props.presidencyDocs || []).forEach(docItem => {
    items.push({
      id: `pres-doc-${docItem.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Demais Áreas',
      sector: 'Presidência',
      date: docItem.date || docItem.createdAt || new Date().toISOString(),
      title: `Doc. Presidência: ${docItem.title || 'Ofício / Ata'}`,
      responsible: docItem.author || 'Presidência OAMI',
      roleOrFunction: 'Presidência',
      targetOrParticipant: `Categoria: ${docItem.category || 'Institucional'}`,
      typeOrStatus: docItem.status || 'DOCUMENTO',
      description: docItem.description || '',
      details: docItem,
      documents: docItem.url ? [{ name: docItem.title, url: docItem.url }] : []
    });
  });

  (props.institutionalRecords || []).forEach(inst => {
    items.push({
      id: `inst-rec-${inst.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Demais Áreas',
      sector: 'Apoio Institucional',
      date: inst.date || inst.createdAt || new Date().toISOString(),
      title: `Apoio Institucional: ${inst.title || 'Ação'}`,
      responsible: 'Coordenação / Apoio Institucional',
      roleOrFunction: 'Apoio Institucional',
      targetOrParticipant: inst.recipientSender || 'Comunidade / Entidade',
      description: inst.description || '',
      details: inst
    });
  });

  (props.familyEngagements || []).forEach(fe => {
    items.push({
      id: `fe-${fe.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Demais Áreas',
      sector: 'Acompanhamento Familiar',
      date: fe.date || new Date().toISOString(),
      title: `Engajamento Familiar: ${fe.type || 'Contato'}`,
      responsible: 'Serviço Social',
      roleOrFunction: 'Acompanhamento Familiar',
      targetOrParticipant: getElderlyName(fe.elderlyId, (fe as any).elderlyName),
      description: fe.summary || 'Registro de vínculo com a família',
      details: fe
    });
  });

  (props.volunteers || []).forEach(vol => {
    items.push({
      id: `vol-${vol.id || Math.random()}`,
      category: 'OTHER',
      categoryLabel: 'Demais Áreas',
      sector: 'Voluntariado',
      date: vol.startDate || vol.createdAt || new Date().toISOString(),
      title: `${vol.type === 'ESTAGIARIO' ? 'Estagiário(a)' : 'Voluntário(a)'}: ${vol.name}`,
      responsible: 'Coordenação de Voluntários',
      roleOrFunction: 'Voluntariado',
      targetOrParticipant: vol.name,
      description: `Atividades: ${vol.activities || 'Geral'} • Status: ${vol.status || 'Ativo'} • CPF: ${vol.cpf || '--'}`,
      details: vol
    });
  });

  // Sort descending by date
  items.sort((a, b) => {
    const dateA = a.date ? new Date(a.date).getTime() : 0;
    const dateB = b.date ? new Date(b.date).getTime() : 0;
    return dateB - dateA;
  });

  return items;
}

export function filterSystemRecords(
  records: UnifiedReportItem[],
  filters: {
    startDate: string;
    endDate: string;
    category: ReportCategory;
    professional: string;
    searchQuery: string;
  }
): UnifiedReportItem[] {
  const { startDate, endDate, category, professional, searchQuery } = filters;
  const searchLower = searchQuery.trim().toLowerCase();

  return records.filter(item => {
    // 1. Date Range
    if (!isItemInDateRange(item.date, startDate, endDate)) {
      return false;
    }

    // 2. Category Filter
    if (category !== 'ALL' && item.category !== category) {
      return false;
    }

    // 3. Professional Filter
    if (professional && professional !== 'ALL') {
      const resp = (item.responsible || '').toLowerCase();
      if (!resp.includes(professional.toLowerCase())) {
        return false;
      }
    }

    // 4. Text Search
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

export function calculateReportMetrics(records: UnifiedReportItem[]): GeneralReportMetrics {
  const categoryCounts: Record<string, number> = {};
  const sectorCounts: Record<string, number> = {};
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

  records.forEach(item => {
    // Categories
    categoryCounts[item.category] = (categoryCounts[item.category] || 0) + 1;
    // Sectors
    sectorCounts[item.sector] = (sectorCounts[item.sector] || 0) + 1;

    // Professionals
    if (item.responsible && item.responsible !== 'Responsável não informado') {
      uniqueProfessionals.add(item.responsible.trim());
    }

    // Granular metrics
    if (item.category === 'PROFESSIONALS') {
      totalAttendances += 1;
    } else if (item.category === 'WORKSHOPS') {
      totalWorkshops += 1;
      totalParticipants += (item.participantsCount || 1);
    } else if (item.category === 'TRAININGS') {
      totalTrainings += 1;
      totalParticipants += (item.participantsCount || 1);
    } else if (item.category === 'DIAPERS') {
      const qty = typeof item.quantityOrValue === 'number' ? item.quantityOrValue : parseInt(String(item.quantityOrValue || 0), 10) || 0;
      if (item.typeOrStatus === 'SAÍDA / DOAÇÃO') {
        totalDiaperDistributed += qty;
      } else {
        totalDiaperProduced += qty;
      }
    } else if (item.category === 'STOCK') {
      totalStockMovements += 1;
      const qty = typeof item.quantityOrValue === 'number' ? item.quantityOrValue : parseFloat(String(item.quantityOrValue || 0)) || 0;
      if (item.typeOrStatus === 'ENTRADA') {
        totalStockInputs += qty;
      } else if (item.typeOrStatus === 'SAIDA') {
        totalStockOutputs += qty;
      }
    } else if (item.category === 'MONITORING') {
      totalClinicalMonitorings += 1;
    } else if (item.category === 'TREASURY') {
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
    totalParticipants,
    totalWorkshops,
    totalTrainings,
    totalDiaperProduced,
    totalDiaperDistributed,
    totalStockMovements,
    totalStockInputs,
    totalStockOutputs,
    totalClinicalMonitorings,
    totalTreasuryTransactions,
    totalDonationsValue,
    activeProfessionalsCount: uniqueProfessionals.size,
    categoryCounts,
    sectorCounts
  };
}
