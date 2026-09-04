import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { differenceInYears, parseISO } from 'date-fns';
import { INSTITUTION_LOGO, INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS } from '../../constants';
import { safeFormat, appendAgeToName, getElderlyAgeByName } from '../../lib/utils';
import { StockProduct, StockMovement, TreasuryTransaction, Donor } from '../../types';
import { MonitoringSectionProps, ManagementAlert } from './monitoringTypes';

interface ReportExportParams {
  props: MonitoringSectionProps;
  startDate: string;
  endDate: string;
  stockProducts: StockProduct[];
  stockMovements: StockMovement[];
  treasuryTransactions: TreasuryTransaction[];
  donors: Donor[];
  alerts: ManagementAlert[];
  metrics: {
    totalElderly: number;
    activeElderly: number;
    totalAttendances: number;
    attendancesBySector: Record<string, number>;
    totalWorkshops: number;
    totalWorkshopEngagements: number;
    diaperConsumption: number;
    diaperDailyAvg: number;
    diaperStockAutonomyDays: number;
    diaperProductionPacks: number;
    diaperDonationsPacks: number;
    totalFinancialDonations: number;
    totalMaterialDonationsValue: number;
    materialDonationsCount: number;
    stockInputs: number;
    stockOutputs: number;
    criticalStockCount: number;
  };
}

export async function generateExecutiveMonitoringPDF({
  props,
  startDate,
  endDate,
  stockProducts,
  stockMovements,
  treasuryTransactions,
  alerts,
  metrics
}: ReportExportParams): Promise<void> {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryGreen: [number, number, number] = [16, 185, 129];
  const darkSlate: [number, number, number] = [30, 41, 59];

  // Try pre-loading logo
  let logoData: string | ArrayBuffer | null = null;
  if (INSTITUTION_LOGO) {
    try {
      const response = await fetch(INSTITUTION_LOGO, {
        referrerPolicy: 'no-referrer',
        cache: 'force-cache'
      });
      if (response.ok) {
        logoData = await response.arrayBuffer();
      }
    } catch (e) {
      console.warn('Could not load logo for PDF', e);
    }
  }

  const drawHeader = (doc: jsPDF) => {
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 10, 'F');

    if (logoData) {
      try {
        doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 14, 18, 18);
      } catch (e) {}
    }

    const startX = logoData ? 36 : 14;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
    doc.text(INSTITUTION_NAME, startX, 19);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: ${INSTITUTION_CNPJ} • ${INSTITUTION_ADDRESS}`, startX, 24);
    doc.text(`Relatório Gerencial Integrado • Período: ${safeFormat(startDate, 'dd/MM/yyyy')} a ${safeFormat(endDate, 'dd/MM/yyyy')}`, startX, 29);

    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, 34, pageWidth - 14, 34);
  };

  // First page header
  drawHeader(doc);

  let currentY = 40;

  // Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(16, 185, 129);
  doc.text('PAINEL GERENCIAL INTEGRADO E MONITORAMENTO', 14, currentY);
  currentY += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(`Consolidação Executiva da Casa OAMI • Emissão em ${safeFormat(new Date().toISOString(), "dd/MM/yyyy 'às' HH:mm")}`, 14, currentY);
  currentY += 8;

  // 1. RESUMO EXECUTIVO (TABELA SÍNTESE)
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('1. RESUMO EXECUTIVO INSTITUCIONAL', 14, currentY);
  currentY += 3;

  const summaryRows = [
    ['Total de Idosos Cadastrados / Ativos', `${metrics.totalElderly} cadastrados (${metrics.activeElderly} ativos)`],
    ['Total de Atendimentos Multidisciplinares no Período', `${metrics.totalAttendances} atendimentos`],
    ['Enfermagem (Evoluções & Cuidados)', `${metrics.attendancesBySector['Enfermagem'] || 0} registros`],
    ['Fisioterapia (Atendimentos & Evoluções)', `${metrics.attendancesBySector['Fisioterapia'] || 0} registros`],
    ['Psicologia (Atendimentos & Sessões)', `${metrics.attendancesBySector['Psicologia'] || 0} registros`],
    ['Pedagogia (Estimulação & Atividades)', `${metrics.attendancesBySector['Pedagogia'] || 0} registros`],
    ['Serviço Social (Acompanhamentos & Visitas)', `${metrics.attendancesBySector['Serviço Social'] || 0} registros`],
    ['Nutrição (Avaliações & Dietas)', `${metrics.attendancesBySector['Nutrição'] || 0} registros`],
    ['Oficinas e Atividades Coletivas', `${metrics.totalWorkshops} oficinas (${metrics.totalWorkshopEngagements} participações)`],
    ['Consumo de Fraldas no Período', `${metrics.diaperConsumption} unidades (Média: ${metrics.diaperDailyAvg.toFixed(1)}/dia)`],
    ['Autonomia Estimada do Estoque de Fraldas', `${metrics.diaperStockAutonomyDays.toFixed(1)} dias`],
    ['Produção / Doações de Fraldas Recebidas', `${metrics.diaperProductionPacks} pct produzidos / ${metrics.diaperDonationsPacks} pct doados`],
    ['Arrecadação Financeira de Doações', `R$ ${metrics.totalFinancialDonations.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`],
    ['Doações em Bens / Materiais Físicos', `${metrics.materialDonationsCount} itens (Est: R$ ${metrics.totalMaterialDonationsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`],
    ['Movimentação de Estoque Geral', `${metrics.stockInputs} entradas / ${metrics.stockOutputs} saídas (${metrics.criticalStockCount} itens críticos)`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Indicador Institucional', 'Resultado Consolidado no Período']],
    body: summaryRows,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { fontStyle: 'bold', cellWidth: 90 }, 1: { cellWidth: 90 } },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 2. CENSO E MONITORAMENTO DOS IDOSOS
  if (currentY > pageHeight - 40) {
    doc.addPage();
    drawHeader(doc);
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('2. CENSO E MONITORAMENTO DOS IDOSOS', 14, currentY);
  currentY += 3;

  const elderlyRows = (props.elderly || []).map(e => {
    const calculatedAge = getElderlyAgeByName(e.name) || (e.birthDate ? differenceInYears(new Date(), parseISO(e.birthDate)) : null);
    return [
      appendAgeToName(e.name),
      e.status || 'ATIVO',
      calculatedAge ? `${calculatedAge} anos` : '-',
      safeFormat(e.entryDate, 'dd/MM/yyyy'),
      (e as any).room || (e as any).roomNumber || 'Principal'
    ];
  });

  autoTable(doc, {
    startY: currentY,
    head: [['Nome do Idoso', 'Situação', 'Idade', 'Data Acolhimento', 'Leito/Quarto']],
    body: elderlyRows.slice(0, 35),
    theme: 'striped',
    styles: { fontSize: 7.5, cellPadding: 1.8 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 3. ATENDIMENTO MULTIDISCIPLINAR POR SETOR
  if (currentY > pageHeight - 40) {
    doc.addPage();
    drawHeader(doc);
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('3. DESEMPENHO MULTIDISCIPLINAR POR SETOR', 14, currentY);
  currentY += 3;

  const sectorBreakdownRows = [
    ['Enfermagem', `${metrics.attendancesBySector['Enfermagem'] || 0} evoluções`, `${props.vitalSigns?.length || 0} sinais vitais`, `${props.dressingRecords?.length || 0} curativos`, `${props.incidentRecords?.length || 0} intercorrências`],
    ['Fisioterapia', `${metrics.attendancesBySector['Fisioterapia'] || 0} evoluções`, `${props.physioAssessments?.length || 0} avaliações`, `${props.physioExercises?.length || 0} exercícios`, `${props.physioAppointments?.length || 0} atendimentos`],
    ['Psicologia', `${metrics.attendancesBySector['Psicologia'] || 0} evoluções`, `${props.psychActivities?.length || 0} atividades`, `${props.psychEmotionalMonitorings?.length || 0} monitoramentos`, `${props.psychAppointments?.length || 0} consultas`],
    ['Pedagogia', `${metrics.attendancesBySector['Pedagogia'] || 0} evoluções`, `${props.pedagogyActivities?.length || 0} oficinas`, `${props.pedagogyStimulationTrackings?.length || 0} estimulações`, `${props.pedagogySocialParticipations?.length || 0} participações`],
    ['Serviço Social', `${metrics.attendancesBySector['Serviço Social'] || 0} evoluções`, `${props.socialFamilyVisits?.length || 0} visitas`, `${props.socialRiskSituations?.length || 0} riscos`, `${props.socialReferrals?.length || 0} encaminhamentos`],
    ['Nutrição', `${metrics.attendancesBySector['Nutrição'] || 0} evoluções`, `${props.nutritionAnthropometries?.length || 0} antropometrias`, `${props.nutritionMealPlans?.length || 0} planos`, `${props.nutritionPatients?.length || 0} acompanhados`],
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Setor Técnico', 'Evoluções / Atend.', 'Indicador Específico 1', 'Indicador Específico 2', 'Indicador Específico 3']],
    body: sectorBreakdownRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 4. ESTOQUE DE FRALDAS E GERAL
  if (currentY > pageHeight - 40) {
    doc.addPage();
    drawHeader(doc);
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('4. CONTROLE DE FRALDAS E ESTOQUE GERAL', 14, currentY);
  currentY += 3;

  const stockRows = [
    ['Fraldas - Consumo no Período', `${metrics.diaperConsumption} unidades`],
    ['Fraldas - Autonomia Estimada', `${metrics.diaperStockAutonomyDays.toFixed(1)} dias de estoque`],
    ['Fraldas - Produção & Entrada', `${metrics.diaperProductionPacks} pacotes produzidos / ${metrics.diaperDonationsPacks} pacotes doados`],
    ['Estoque Geral - Entradas no Período', `${metrics.stockInputs} itens movimentados`],
    ['Estoque Geral - Saídas no Período', `${metrics.stockOutputs} itens baixados`],
    ['Estoque Geral - Produtos em Alerta Crítico', `${metrics.criticalStockCount} produtos com estoque baixo ou zerado`]
  ];

  autoTable(doc, {
    startY: currentY,
    head: [['Controle Operacional', 'Status / Quantidade']],
    body: stockRows,
    theme: 'striped',
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontStyle: 'bold' },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 8;

  // 5. ALERTAS GERENCIAIS E PARECER CONCLUSIVO
  if (currentY > pageHeight - 50) {
    doc.addPage();
    drawHeader(doc);
    currentY = 40;
  }

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(darkSlate[0], darkSlate[1], darkSlate[2]);
  doc.text('5. ALERTAS GERENCIAIS E PARECER TÉCNICO', 14, currentY);
  currentY += 3;

  const alertRows = alerts.length > 0
    ? alerts.map(a => [a.type, a.title, a.description])
    : [['OK', 'Sem Pendências Críticas', 'Todos os setores e estoques encontram-se dentro dos parâmetros normais no período.']];

  autoTable(doc, {
    startY: currentY,
    head: [['Severidade', 'Alerta / Ponto de Atenção', 'Detalhamento do Parecer']],
    body: alertRows,
    theme: 'grid',
    styles: { fontSize: 7.5, cellPadding: 2 },
    headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: { 0: { cellWidth: 25, fontStyle: 'bold' }, 1: { cellWidth: 65, fontStyle: 'bold' }, 2: { cellWidth: 90 } },
    margin: { left: 14, right: 14 }
  });

  currentY = (doc as any).lastAutoTable.finalY + 14;

  // Signature lines
  if (currentY > pageHeight - 35) {
    doc.addPage();
    drawHeader(doc);
    currentY = 40;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(100, 116, 139);

  const colWidth = (pageWidth - 28) / 2;
  doc.text('____________________________________________________', 14, currentY);
  doc.text('Coordenação Geral / Diretoria - Casa OAMI', 14, currentY + 4);

  doc.text('____________________________________________________', 14 + colWidth, currentY);
  doc.text('Responsável Técnico / Emissor do Relatório', 14 + colWidth, currentY + 4);

  // Save PDF
  doc.save(`relatorio_gerencial_oami_${startDate}_a_${endDate}.pdf`);
}

export function generateExecutiveMonitoringExcel({
  props,
  startDate,
  endDate,
  stockProducts,
  stockMovements,
  treasuryTransactions,
  alerts,
  metrics
}: ReportExportParams): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: Resumo Geral
  const summaryData = [
    ['INSTITUIÇÃO OAMI - GESTÃO ILPI'],
    ['PAINEL GERENCIAL INTEGRADO - RELATÓRIO EXECUTIVO'],
    [`Período de Análise: ${startDate} a ${endDate}`],
    [`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')}`],
    [],
    ['INDICADOR', 'VALOR CONSOLIDADO'],
    ['Total de Idosos Cadastrados', metrics.totalElderly],
    ['Idosos Ativos', metrics.activeElderly],
    ['Total de Atendimentos Multidisciplinares', metrics.totalAttendances],
    ['Atendimentos - Enfermagem', metrics.attendancesBySector['Enfermagem'] || 0],
    ['Atendimentos - Fisioterapia', metrics.attendancesBySector['Fisioterapia'] || 0],
    ['Atendimentos - Psicologia', metrics.attendancesBySector['Psicologia'] || 0],
    ['Atendimentos - Pedagogia', metrics.attendancesBySector['Pedagogia'] || 0],
    ['Atendimentos - Serviço Social', metrics.attendancesBySector['Serviço Social'] || 0],
    ['Atendimentos - Nutrição', metrics.attendancesBySector['Nutrição'] || 0],
    ['Oficinas Realizadas', metrics.totalWorkshops],
    ['Participações em Atividades', metrics.totalWorkshopEngagements],
    ['Fraldas - Consumo no Período', metrics.diaperConsumption],
    ['Fraldas - Média Diária', metrics.diaperDailyAvg],
    ['Fraldas - Autonomia (Dias)', metrics.diaperStockAutonomyDays],
    ['Fraldas - Produção (Pacotes)', metrics.diaperProductionPacks],
    ['Doações Financeiras (R$)', metrics.totalFinancialDonations],
    ['Doações em Bens Físicos (Qtd)', metrics.materialDonationsCount],
    ['Doações em Bens Físicos (Valor Est. R$)', metrics.totalMaterialDonationsValue],
    ['Estoque - Entradas', metrics.stockInputs],
    ['Estoque - Saídas', metrics.stockOutputs],
    ['Estoque - Produtos Críticos', metrics.criticalStockCount],
  ];

  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Executivo');

  // Sheet 2: Idosos
  const elderlyHeader = ['Nome', 'Situação', 'Idade', 'Data Acolhimento', 'Quarto/Leito', 'Responsável'];
  const elderlyData = (props.elderly || []).map(e => {
    const calculatedAge = getElderlyAgeByName(e.name) || (e.birthDate ? differenceInYears(new Date(), parseISO(e.birthDate)) : '');
    return [
      appendAgeToName(e.name),
      e.status || 'ATIVO',
      calculatedAge || '',
      e.entryDate || '',
      (e as any).room || (e as any).roomNumber || '',
      e.responsibleName || ''
    ];
  });
  const wsElderly = XLSX.utils.aoa_to_sheet([elderlyHeader, ...elderlyData]);
  XLSX.utils.book_append_sheet(wb, wsElderly, 'Censo de Idosos');

  // Sheet 3: Estoque
  const stockHeader = ['Código', 'Produto', 'Categoria', 'Quantidade Atual', 'Estoque Mínimo', 'Unidade', 'Status'];
  const stockData = stockProducts.map(p => [
    p.code || '',
    p.name,
    p.category,
    p.quantity,
    p.minQuantity,
    p.unit,
    p.quantity <= 0 ? 'ZERADO' : p.quantity <= p.minQuantity ? 'BAIXO' : 'NORMAL'
  ]);
  const wsStock = XLSX.utils.aoa_to_sheet([stockHeader, ...stockData]);
  XLSX.utils.book_append_sheet(wb, wsStock, 'Estoque Geral');

  // Save Excel file
  XLSX.writeFile(wb, `relatorio_gerencial_oami_${startDate}_a_${endDate}.xlsx`);
}
