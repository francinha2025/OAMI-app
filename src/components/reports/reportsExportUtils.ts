import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS, INSTITUTION_LOGO } from '../../constants';
import { UnifiedReportItem, GeneralReportMetrics, ReportCategory } from './reportsTypes';

interface ExportParams {
  items: UnifiedReportItem[];
  metrics: GeneralReportMetrics;
  startDate: string;
  endDate: string;
  categoryFilter: ReportCategory;
  professionalFilter: string;
  generatedBy?: string;
}

const CATEGORY_COLORS: Record<string, [number, number, number]> = {
  PROFESSIONALS: [30, 64, 175],   // Navy blue #1e40af
  WORKSHOPS: [217, 119, 6],       // Amber #d97706
  TRAININGS: [124, 58, 237],      // Violet #7c3aed
  DIAPERS: [219, 39, 119],        // Pink #db2777
  STOCK: [5, 150, 105],           // Emerald #059669
  MONITORING: [13, 148, 136],     // Teal #0d9488
  TREASURY: [71, 85, 105],        // Slate #475569
  OTHER: [100, 116, 139]          // Gray #64748b
};

const CATEGORY_TITLES: Record<string, string> = {
  PROFESSIONALS: '1. ATENDIMENTOS E REGISTROS PROFISSIONAIS',
  WORKSHOPS: '2. OFICINAS TERAPÊUTICAS E RECREATIVAS',
  TRAININGS: '3. CAPACITAÇÕES E FORMAÇÕES PROFISSIONAIS',
  DIAPERS: '4. FABRICAÇÃO E DISTRIBUIÇÃO DE FRALDAS (SGPF)',
  STOCK: '5. CONTROLE DE ESTOQUE E ALMOXARIFADO',
  MONITORING: '6. MONITORAMENTO CLÍNICO E CUIDADOS DOS ACOLHIDOS',
  TREASURY: '7. TESOURARIA, FINANÇAS E DOAÇÕES',
  OTHER: '8. DEMAIS ÁREAS INSTITUCIONAIS E OUTROS REGISTROS'
};

export async function exportGeneralReportToPDF({
  items,
  metrics,
  startDate,
  endDate,
  categoryFilter,
  professionalFilter,
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
  const drawHeader = (startY = 10) => {
    // Top banner accent line
    doc.setFillColor(16, 185, 129); // emerald 500
    doc.rect(14, startY, pageWidth - 28, 2, 'F');

    let textStartX = 14;
    if (logoImg) {
      try {
        doc.addImage(logoImg, 'JPEG', 14, startY + 4, 18, 18);
        textStartX = 36;
      } catch (e) {
        textStartX = 14;
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(17, 24, 39);
    doc.text(INSTITUTION_NAME, textStartX, startY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: ${INSTITUTION_CNPJ} • ${INSTITUTION_ADDRESS}`, textStartX, startY + 13);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor(4, 120, 87); // Emerald dark
    doc.text('RELATÓRIO GERAL E INTEGRADO DO SISTEMA OAMI', textStartX, startY + 18);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(75, 85, 99);
    const filterInfo = `Período: ${startDate} até ${endDate} • Categoria: ${categoryFilter === 'ALL' ? 'Todas as Áreas' : categoryFilter} • Profissional: ${professionalFilter || 'Todos'} • Total de Registros: ${items.length}`;
    doc.text(filterInfo, textStartX, startY + 22);

    // Generation timestamp right aligned
    doc.setFontSize(7);
    doc.setTextColor(156, 163, 175);
    const nowStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
    doc.text(`Emitido em: ${nowStr}${generatedBy ? ` por ${generatedBy}` : ''}`, pageWidth - 14, startY + 8, { align: 'right' });

    // Divider line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(14, startY + 25, pageWidth - 14, startY + 25);
  };

  // 1. First Page Header
  drawHeader(8);

  // 2. Executive Metrics Summary Box
  autoTable(doc, {
    startY: 36,
    head: [[
      'Total de Registros',
      'Atendimentos Técnicos',
      'Oficinas Realizadas',
      'Capacitações',
      'Fraldas Produzidas',
      'Movimentações Estoque',
      'Monitoramentos',
      'Profissionais Ativos'
    ]],
    body: [[
      metrics.totalRecords.toString(),
      metrics.totalAttendances.toString(),
      metrics.totalWorkshops.toString(),
      metrics.totalTrainings.toString(),
      `${metrics.totalDiaperProduced} un`,
      metrics.totalStockMovements.toString(),
      metrics.totalClinicalMonitorings.toString(),
      metrics.activeProfessionalsCount.toString()
    ]],
    theme: 'grid',
    headStyles: {
      fillColor: [16, 185, 129],
      textColor: [255, 255, 255],
      fontSize: 7.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8.5,
      fontStyle: 'bold',
      halign: 'center',
      textColor: [30, 41, 59]
    },
    margin: { left: 14, right: 14 }
  });

  let currentY = (doc as any).lastAutoTable.finalY + 8;

  // Group items by category to render categorized sections
  const categoriesPresent: Array<Exclude<ReportCategory, 'ALL'>> = [
    'PROFESSIONALS',
    'WORKSHOPS',
    'TRAININGS',
    'DIAPERS',
    'STOCK',
    'MONITORING',
    'TREASURY',
    'OTHER'
  ];

  for (const cat of categoriesPresent) {
    const catItems = items.filter(i => i.category === cat);
    if (catItems.length === 0) continue;

    // Check if we need a new page
    if (currentY > pageHeight - 45) {
      doc.addPage();
      drawHeader(8);
      currentY = 38;
    }

    const color = CATEGORY_COLORS[cat] || [71, 85, 105];
    const sectionTitle = `${CATEGORY_TITLES[cat] || cat} (${catItems.length} registros)`;

    // Section Title Banner
    doc.setFillColor(color[0], color[1], color[2]);
    doc.roundedRect(14, currentY, pageWidth - 28, 6.5, 1, 1, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(255, 255, 255);
    doc.text(sectionTitle, 17, currentY + 4.5);

    currentY += 8;

    // Build table rows
    const tableBody = catItems.map(item => [
      item.date ? item.date.slice(0, 10) : '—',
      item.sector || 'Geral',
      item.title || 'Sem título',
      item.responsible || '—',
      item.targetOrParticipant || '—',
      item.quantityOrValue !== undefined ? String(item.quantityOrValue) : (item.typeOrStatus || '—'),
      item.description ? (item.description.length > 120 ? `${item.description.slice(0, 120)}...` : item.description) : (item.conductOrOutcome || '—')
    ]);

    autoTable(doc, {
      startY: currentY,
      head: [['Data', 'Setor / Área', 'Atividade / Título', 'Responsável', 'Acolhido / Público / Item', 'Qtd / Status', 'Observações / Conduta']],
      body: tableBody,
      theme: 'striped',
      headStyles: {
        fillColor: [color[0], color[1], color[2]],
        textColor: [255, 255, 255],
        fontSize: 7,
        fontStyle: 'bold'
      },
      bodyStyles: {
        fontSize: 6.5,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 20 }, // Data
        1: { cellWidth: 32 }, // Setor
        2: { cellWidth: 46 }, // Título
        3: { cellWidth: 36 }, // Responsável
        4: { cellWidth: 42 }, // Acolhido / Item
        5: { cellWidth: 24, halign: 'center' }, // Qtd / Status
        6: { cellWidth: 'auto' } // Obs
      },
      margin: { left: 14, right: 14 },
      didDrawPage: (data) => {
        // Footer with page number
        const pageNum = doc.internal.pages.length - 1;
        doc.setFontSize(6.5);
        doc.setTextColor(156, 163, 175);
        doc.text(
          `Opera Assistenza Malati Impediti (OAMI) • Vitória do Mearim/MA • Página ${data.pageNumber}`,
          pageWidth / 2,
          pageHeight - 6,
          { align: 'center' }
        );
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 8;
  }

  // Save the PDF
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
  categoryFilter,
  professionalFilter
}: ExportParams): void {
  const wb = XLSX.utils.book_new();

  // 1. Resumo Executivo Sheet
  const summaryData = [
    ['OPERA ASSISTENZA MALATI IMPEDITI (OAMI)'],
    [`CNPJ: ${INSTITUTION_CNPJ} • ${INSTITUTION_ADDRESS}`],
    ['RELATÓRIO GERAL E INTEGRADO DO SISTEMA OAMI'],
    [],
    ['Parâmetros do Relatório'],
    ['Período Inicial', startDate],
    ['Período Final', endDate],
    ['Categoria Selecionada', categoryFilter === 'ALL' ? 'Todas as Áreas' : categoryFilter],
    ['Profissional Selecionado', professionalFilter || 'Todos'],
    ['Data de Emissão', format(new Date(), 'dd/MM/yyyy HH:mm', { locale: ptBR })],
    [],
    ['Indicadores Consolidados', 'Quantidade'],
    ['Total de Lançamentos', metrics.totalRecords],
    ['Atendimentos Técnicos / Evoluções', metrics.totalAttendances],
    ['Participantes Impactados (Total)', metrics.totalParticipants],
    ['Oficinas Realizadas', metrics.totalWorkshops],
    ['Capacitações Realizadas', metrics.totalTrainings],
    ['Fraldas Produzidas (Unidades)', metrics.totalDiaperProduced],
    ['Fraldas Distribuídas / Doações', metrics.totalDiaperDistributed],
    ['Movimentações de Estoque (Total)', metrics.totalStockMovements],
    ['Entradas de Estoque', metrics.totalStockInputs],
    ['Saídas de Estoque', metrics.totalStockOutputs],
    ['Monitoramentos Clínicos e Cuidados', metrics.totalClinicalMonitorings],
    ['Transações de Tesouraria / Finanças', metrics.totalTreasuryTransactions],
    ['Profissionais Ativos com Registros', metrics.activeProfessionalsCount],
    [],
    ['Detalhamento por Setor', 'Lançamentos'],
    ...Object.entries(metrics.sectorCounts).map(([sector, count]) => [sector, count])
  ];
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

  // 2. Todos os Registros Sheet (Comprehensive single table)
  const allRecordsHeader = [
    'Data',
    'Categoria',
    'Setor / Área',
    'Atividade / Título',
    'Profissional Responsável',
    'Função / Cargo',
    'Acolhido / Participante / Produto',
    'Quantidade / Valor',
    'Tipo / Status',
    'Descrição / Detalhes',
    'Conduta / 5W2H / Desfecho',
    'Localização'
  ];

  const allRecordsRows = items.map(item => [
    item.date ? item.date.slice(0, 10) : '',
    item.categoryLabel,
    item.sector,
    item.title,
    item.responsible,
    item.roleOrFunction || '',
    item.targetOrParticipant || '',
    item.quantityOrValue !== undefined ? String(item.quantityOrValue) : '',
    item.typeOrStatus || '',
    item.description || '',
    item.conductOrOutcome || '',
    item.locationOrRoom || ''
  ]);

  const wsAll = XLSX.utils.aoa_to_sheet([allRecordsHeader, ...allRecordsRows]);
  XLSX.utils.book_append_sheet(wb, wsAll, 'Todos os Registros');

  // 3. Category Specific Sheets
  const addCategorySheet = (sheetName: string, catKey: Exclude<ReportCategory, 'ALL'>) => {
    const subset = items.filter(i => i.category === catKey);
    if (subset.length === 0) return;

    const rows = subset.map(item => [
      item.date ? item.date.slice(0, 10) : '',
      item.sector,
      item.title,
      item.responsible,
      item.targetOrParticipant || '',
      item.quantityOrValue !== undefined ? String(item.quantityOrValue) : '',
      item.typeOrStatus || '',
      item.description || '',
      item.conductOrOutcome || ''
    ]);

    const header = [
      'Data',
      'Setor',
      'Título / Atividade',
      'Responsável',
      'Acolhido / Público / Item',
      'Qtd / Valor',
      'Status / Tipo',
      'Descrição',
      'Conduta / Observações'
    ];

    const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  };

  addCategorySheet('Profissionais', 'PROFESSIONALS');
  addCategorySheet('Oficinas', 'WORKSHOPS');
  addCategorySheet('Capacitações', 'TRAININGS');
  addCategorySheet('Produção Fraldas', 'DIAPERS');
  addCategorySheet('Estoque', 'STOCK');
  addCategorySheet('Monitoramento', 'MONITORING');
  addCategorySheet('Tesouraria', 'TREASURY');
  addCategorySheet('Demais Áreas', 'OTHER');

  // Download Excel
  const safeStart = startDate.replace(/[^0-9]/g, '');
  const safeEnd = endDate.replace(/[^0-9]/g, '');
  const fileName = `Relatorio_Geral_OAMI_${safeStart}_a_${safeEnd}.xlsx`;
  XLSX.writeFile(wb, fileName);
}
