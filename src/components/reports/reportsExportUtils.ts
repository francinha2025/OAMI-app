import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS, INSTITUTION_LOGO } from '../../constants';
import {
  UnifiedReportItem,
  GeneralReportMetrics,
  SectorKey,
  RecordType
} from './reportsTypes';
import { buildExecutiveSummaryData, buildMonthlyStockConsumption } from './reportsDataBuilder';
import { StockProduct, StockMovement } from '../../types';

interface ExportParams {
  items: UnifiedReportItem[];
  metrics: GeneralReportMetrics;
  startDate: string;
  endDate: string;
  sectorFilter?: SectorKey | 'ALL';
  professionalFilter?: string;
  elderlyFilter?: string;
  recordTypeFilter?: RecordType | 'ALL';
  generatedBy?: string;
  stockProducts?: StockProduct[];
  stockMovements?: StockMovement[];
}

const SECTOR_ORDER: Array<{ key: SectorKey; title: string }> = [
  { key: 'ENFERMAGEM', title: '1. ENFERMAGEM' },
  { key: 'FISIOTERAPIA', title: '2. FISIOTERAPIA' },
  { key: 'PSICOLOGIA', title: '3. PSICOLOGIA' },
  { key: 'SERVICO_SOCIAL', title: '4. SERVIÇO SOCIAL' },
  { key: 'PEDAGOGIA', title: '5. PEDAGOGIA' },
  { key: 'NUTRICAO', title: '6. NUTRIÇÃO' },
  { key: 'EQUIPE_TECNICA', title: '7. COORDENAÇÃO & EQUIPE TÉCNICA (PIAs)' },
  { key: 'OFICINAS', title: '8. OFICINAS E ATIVIDADES COLETIVAS' },
  { key: 'MONITORAMENTO', title: '9. MONITORAMENTO CLÍNICO E CUIDADOS' },
  { key: 'ESTOQUE', title: '10. CONTROLE DE ESTOQUE E ALMOXARIFADO' },
  { key: 'PRODUCAO_FRALDAS', title: '11. PRODUÇÃO E DISTRIBUIÇÃO DE FRALDAS (SGPF)' },
  { key: 'CAPACITACOES', title: '12. CAPACITAÇÕES E FORMAÇÕES PROFISSIONAIS' },
  { key: 'OUTRAS_AREAS', title: '13. DEMAIS ÁREAS INSTITUCIONAIS' }
];

export async function exportGeneralReportToPDF({
  items,
  metrics,
  startDate,
  endDate,
  sectorFilter,
  professionalFilter,
  elderlyFilter,
  recordTypeFilter,
  generatedBy
}: ExportParams): Promise<void> {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Load logo safely if possible
  let logoImg: HTMLImageElement | null = null;
  if (INSTITUTION_LOGO) {
    try {
      logoImg = await new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = INSTITUTION_LOGO;
      });
    } catch {
      logoImg = null;
    }
  }

  // Draw Header function
  const drawHeader = (startY = 8) => {
    // Top banner accent line
    doc.setFillColor(16, 185, 129); // emerald 500
    doc.rect(14, startY, pageWidth - 28, 2, 'F');

    let textStartX = 14;
    if (logoImg) {
      try {
        doc.addImage(logoImg, 'JPEG', 14, startY + 4, 16, 16);
        textStartX = 34;
      } catch (e) {
        textStartX = 14;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(17, 24, 39);
    doc.text(INSTITUTION_NAME, textStartX, startY + 7);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: ${INSTITUTION_CNPJ} • ${INSTITUTION_ADDRESS}`, textStartX, startY + 11.5);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(4, 120, 87); // Emerald dark
    doc.text('RELATÓRIO GERAL E INTEGRADO', textStartX, startY + 16.5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    const filterInfo = `Período: ${startDate} até ${endDate} • Setor: ${sectorFilter && sectorFilter !== 'ALL' ? sectorFilter : 'Todos'} • Profissional: ${professionalFilter || 'Todos'} • Acolhido: ${elderlyFilter || 'Todos'} • Tipo: ${recordTypeFilter && recordTypeFilter !== 'ALL' ? recordTypeFilter : 'Todos'} • Total: ${items.length} registros`;
    doc.text(filterInfo, textStartX, startY + 21);

    // Generation timestamp right aligned
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    const nowStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Emitido em: ${nowStr}${generatedBy ? ` por ${generatedBy}` : ''}`, pageWidth - 14, startY + 7, { align: 'right' });

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, startY + 24, pageWidth - 14, startY + 24);
  };

  // 1. First Page: Header + Executive Summary
  drawHeader(8);

  // Executive Summary Title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(17, 24, 39);
  doc.text('RESUMO EXECUTIVO DO PERÍODO', 14, 38);

  // Key Indicators Table
  autoTable(doc, {
    startY: 42,
    head: [[
      'Total Registros',
      'Atendimentos',
      'Atividades Coletivas',
      'Oficinas',
      'Avaliações',
      'Monitoramentos',
      'Mov. Estoque',
      'Fraldas Prod.',
      'Capacitações',
      'Profissionais'
    ]],
    body: [[
      metrics.totalRecords.toString(),
      metrics.totalAttendances.toString(),
      metrics.totalGroupActivities.toString(),
      metrics.totalWorkshops.toString(),
      metrics.totalAssessments.toString(),
      metrics.totalClinicalMonitorings.toString(),
      metrics.totalStockMovements.toString(),
      `${metrics.totalDiaperProduced} un`,
      metrics.totalTrainings.toString(),
      metrics.activeProfessionalsCount.toString()
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      halign: 'center',
      cellPadding: 2.5
    },
    bodyStyles: {
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [17, 24, 39],
      cellPadding: 3
    }
  });

  // Sector Breakdown Table in Executive Summary
  const execData = buildExecutiveSummaryData(items);
  const sectorSummaryRows = execData.sectors
    .filter(s => s.recordsCount > 0)
    .map(s => [
      s.name,
      s.recordsCount.toString(),
      s.elderlyCount > 0 ? `${s.elderlyCount} acolhido(s)` : 'Geral / Coletivo',
      s.professionalsCount.toString(),
      s.professionalsList.slice(0, 3).join(', ') + (s.professionalsList.length > 3 ? '...' : '') || 'Equipe'
    ]);

  autoTable(doc, {
    startY: (doc as any).lastAutoTable.finalY + 6,
    head: [['Área / Setor', 'Qtd Registros', 'Acolhidos Atendidos', 'Profissionais Envolvidos', 'Equipe / Responsáveis']],
    body: sectorSummaryRows.length > 0 ? sectorSummaryRows : [['Nenhum registro encontrado no período selecionado', '', '', '', '']],
    theme: 'striped',
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: 255,
      fontSize: 8,
      fontStyle: 'bold',
      cellPadding: 2
    },
    bodyStyles: {
      fontSize: 7.5,
      cellPadding: 2
    },
    columnStyles: {
      0: { cellWidth: 55, fontStyle: 'bold' },
      1: { cellWidth: 25, halign: 'center' },
      2: { cellWidth: 40 },
      3: { cellWidth: 35, halign: 'center' },
      4: { cellWidth: 'auto' }
    }
  });

  // 2. Section by Section Table Details
  SECTOR_ORDER.forEach(({ key, title }) => {
    const sectorItems = items.filter(i => i.sectorKey === key);
    if (sectorItems.length === 0) return;

    // Collect sector summary
    const profsSet = new Set<string>();
    const elderlySet = new Set<string>();
    sectorItems.forEach(i => {
      if (i.responsible && i.responsible !== 'Responsável não informado') profsSet.add(i.responsible);
      if (i.elderlyId) elderlySet.add(i.elderlyId);
    });

    const profsListStr = Array.from(profsSet).join(', ') || 'Equipe Institucional';
    const elderlyCountStr = elderlySet.size > 0 ? `${elderlySet.size} acolhidos` : 'Atendimento Coletivo';

    // Check if new page needed
    const currentY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 50;
    if (currentY > pageHeight - 45) {
      doc.addPage();
      drawHeader(8);
    }

    const nextY = ((doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY : 40) + 7;

    // Sector Title & Meta Banner
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 64, 175);
    doc.text(title, 14, nextY);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Total: ${sectorItems.length} registros • Profissionais: ${profsListStr} • Acolhidos: ${elderlyCountStr} • Período: ${startDate} a ${endDate}`, 14, nextY + 4);

    // Build Table Rows: DATA | TIPO DE ATENDIMENTO | PROFISSIONAL | ACOLHIDO | RESUMO DO REGISTRO
    const tableRows = sectorItems.map(item => {
      const dateStr = item.date ? item.date.slice(0, 10) : '—';
      const typeStr = item.recordTypeLabel || item.typeOrStatus || item.recordType;
      const respStr = item.responsible || '—';
      const targetStr = item.targetOrParticipant || '—';
      
      // Clean, concise summary (not giant text, but informative)
      let summaryStr = item.title;
      if (item.description) {
        const cleanDesc = item.description.replace(/\n+/g, ' ').trim();
        summaryStr += ` — ${cleanDesc.length > 120 ? cleanDesc.slice(0, 120) + '...' : cleanDesc}`;
      }
      if (item.conductOrOutcome) {
        const cleanCond = item.conductOrOutcome.replace(/\n+/g, ' ').trim();
        summaryStr += ` [Conduta: ${cleanCond.length > 80 ? cleanCond.slice(0, 80) + '...' : cleanCond}]`;
      }

      return [dateStr, typeStr, respStr, targetStr, summaryStr];
    });

    autoTable(doc, {
      startY: nextY + 6,
      head: [['Data', 'Tipo de Atendimento', 'Profissional / Resp.', 'Acolhido / Público', 'Resumo do Registro']],
      body: tableRows,
      theme: 'striped',
      headStyles: {
        fillColor: [241, 245, 249],
        textColor: [51, 65, 85],
        fontSize: 7.5,
        fontStyle: 'bold',
        cellPadding: 2
      },
      bodyStyles: {
        fontSize: 7,
        cellPadding: 2.5,
        valign: 'middle'
      },
      columnStyles: {
        0: { cellWidth: 22, halign: 'center', fontStyle: 'bold' },
        1: { cellWidth: 40, fontStyle: 'bold' },
        2: { cellWidth: 40 },
        3: { cellWidth: 42 },
        4: { cellWidth: 'auto' }
      }
    });
  });

  // Add Page Numbers and Footer on ALL pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);

    // Footer divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(14, pageHeight - 10, pageWidth - 14, pageHeight - 10);

    // Footer text
    doc.text(
      `${INSTITUTION_NAME} • Documento Gerencial Integrado • Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`,
      14,
      pageHeight - 6
    );
    doc.text(
      `Página ${i} de ${totalPages}`,
      pageWidth - 14,
      pageHeight - 6,
      { align: 'right' }
    );
  }

  // Save PDF file
  const safeStart = startDate.replace(/[^0-9]/g, '');
  const safeEnd = endDate.replace(/[^0-9]/g, '');
  const fileName = `Relatorio_Geral_OAMI_${safeStart}_a_${safeEnd}.pdf`;
  doc.save(fileName);
}

export function exportGeneralReportToExcel({
  items,
  metrics,
  startDate,
  endDate,
  stockProducts,
  stockMovements
}: ExportParams): void {
  const wb = XLSX.utils.book_new();

  // 1. Aba: Resumo Executivo
  const summaryData = [
    ['CASA OAMI - OPERA ASSISTENZA MALATI IMPEDITI'],
    ['RELATÓRIO GERAL E INTEGRADO - RESUMO EXECUTIVO'],
    [`Período de Referência: ${startDate} até ${endDate}`],
    [`Data de Emissão: ${format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })}`],
    [],
    ['INDICADOR INSTITUCIONAL', 'VALOR / QUANTIDADE'],
    ['Total de Registros no Período', metrics.totalRecords],
    ['Total de Atendimentos Individuais', metrics.totalAttendances],
    ['Total de Atividades Coletivas', metrics.totalGroupActivities],
    ['Total de Oficinas Terapêuticas', metrics.totalWorkshops],
    ['Total de Avaliações Especializadas', metrics.totalAssessments],
    ['Total de Monitoramentos Clínicos', metrics.totalClinicalMonitorings],
    ['Total de Movimentações de Estoque', metrics.totalStockMovements],
    ['Total de Fraldas Produzidas (Unidades)', metrics.totalDiaperProduced],
    ['Total de Capacitações Realizadas', metrics.totalTrainings],
    ['Profissionais Ativos com Lançamentos', metrics.activeProfessionalsCount],
    [],
    ['DETALHAMENTO POR SETOR', 'REGISTROS NO PERÍODO'],
    ...Object.entries(metrics.sectorCounts).map(([sector, count]) => [sector, count])
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Executivo');

  // 2. Aba: Indicadores
  const indicatorsData = [
    ['Métrica', 'Contagem'],
    ['Total de Registros', metrics.totalRecords],
    ['Atendimentos Multidisciplinares', metrics.totalAttendances],
    ['Atividades Coletivas', metrics.totalGroupActivities],
    ['Oficinas', metrics.totalWorkshops],
    ['Avaliações', metrics.totalAssessments],
    ['Monitoramentos Clínicos', metrics.totalClinicalMonitorings],
    ['Movimentações de Estoque', metrics.totalStockMovements],
    ['Entradas de Estoque', metrics.totalStockInputs],
    ['Saídas de Estoque', metrics.totalStockOutputs],
    ['Fraldas Produzidas (un)', metrics.totalDiaperProduced],
    ['Fraldas Doadas/Distribuídas', metrics.totalDiaperDistributed],
    ['Capacitações', metrics.totalTrainings],
    ['Profissionais Únicos', metrics.activeProfessionalsCount],
    ['Participações Totais em Oficinas', metrics.totalParticipants],
    ['Transações de Tesouraria', metrics.totalTreasuryTransactions],
    ['Total Doações (R$)', metrics.totalDonationsValue]
  ];
  const wsIndicators = XLSX.utils.aoa_to_sheet(indicatorsData);
  XLSX.utils.book_append_sheet(wb, wsIndicators, 'Indicadores');

  // Helper for generic sector sheets
  const addSectorSheet = (sheetName: string, sectorKey: SectorKey) => {
    const subset = items.filter(i => i.sectorKey === sectorKey);
    if (subset.length === 0) return;

    const rows = subset.map(item => [
      item.date ? item.date.slice(0, 10) : '',
      item.recordTypeLabel || item.typeOrStatus || item.recordType,
      item.responsible,
      item.targetOrParticipant || '',
      item.title,
      item.description || '',
      item.conductOrOutcome || ''
    ]);

    const header = [
      'Data',
      'Tipo de Atendimento',
      'Profissional Responsável',
      'Acolhido / Participante',
      'Título / Atividade',
      'Resumo / Descrição',
      'Conduta / Observação'
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  // 3. Aba: Atendimentos (All evolutions and consults)
  const attendancesSubset = items.filter(i => i.recordType === 'EVOLUCAO' || i.recordType === 'ATENDIMENTO');
  if (attendancesSubset.length > 0) {
    const rows = attendancesSubset.map(item => [
      item.date ? item.date.slice(0, 10) : '',
      item.sector,
      item.recordTypeLabel || item.recordType,
      item.responsible,
      item.targetOrParticipant || '',
      item.title,
      item.description || '',
      item.conductOrOutcome || ''
    ]);
    const header = ['Data', 'Setor', 'Tipo', 'Profissional', 'Acolhido', 'Título', 'Descrição', 'Conduta'];
    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, 'Atendimentos');
  }

  // 4. Enfermagem
  addSectorSheet('Enfermagem', 'ENFERMAGEM');

  // 5. Fisioterapia
  addSectorSheet('Fisioterapia', 'FISIOTERAPIA');

  // 6. Psicologia
  addSectorSheet('Psicologia', 'PSICOLOGIA');

  // 7. Serviço Social
  addSectorSheet('Serviço Social', 'SERVICO_SOCIAL');

  // 8. Pedagogia
  addSectorSheet('Pedagogia', 'PEDAGOGIA');

  // 9. Nutrição
  addSectorSheet('Nutrição', 'NUTRICAO');

  // 10. Outras Áreas
  addSectorSheet('Outras Áreas', 'OUTRAS_AREAS');

  // 11. Oficinas
  addSectorSheet('Oficinas', 'OFICINAS');

  // 12. Monitoramentos
  addSectorSheet('Monitoramentos', 'MONITORAMENTO');

  // 13. Estoque
  addSectorSheet('Estoque', 'ESTOQUE');

  // 14. Consumo Mensal (Agrupando produtos iguais dentro do mesmo mês e somando suas quantidades)
  if (stockMovements && stockProducts) {
    const consumptionReports = buildMonthlyStockConsumption(stockMovements, stockProducts);
    const consumptionRows: any[] = [
      ['Mês de Referência', 'Categoria', 'Produto', 'Quantidade Consumida', 'Unidade']
    ];

    consumptionReports.forEach(rep => {
      rep.categories.forEach(cat => {
        cat.products.forEach(p => {
          consumptionRows.push([
            rep.monthLabel,
            cat.category,
            p.productName,
            p.totalQuantity,
            p.unit
          ]);
        });
      });
    });

    const wsConsumption = XLSX.utils.aoa_to_sheet(consumptionRows);
    XLSX.utils.book_append_sheet(wb, wsConsumption, 'Consumo Mensal');
  }

  // 15. Produção de Fraldas
  addSectorSheet('Produção de Fraldas', 'PRODUCAO_FRALDAS');

  // 16. Capacitações
  addSectorSheet('Capacitações', 'CAPACITACOES');

  // Download Excel file
  const safeStart = startDate.replace(/[^0-9]/g, '');
  const safeEnd = endDate.replace(/[^0-9]/g, '');
  const fileName = `Relatorio_Geral_OAMI_${safeStart}_a_${safeEnd}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
