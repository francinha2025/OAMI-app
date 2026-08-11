import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INSTITUTION_LOGO, INSTITUTION_NAME } from '../constants';
import { appendAgeToName, formatTextWithAges } from './utils';

interface PDFOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  data: any[][];
  fileName: string;
  institutionName?: string;
  institutionLogo?: string; // Base64 or URL
  orientation?: 'portrait' | 'landscape';
}

export const generateModernPDF = async ({
  title: rawTitle,
  subtitle: rawSubtitle,
  columns,
  data,
  fileName,
  institutionName = INSTITUTION_NAME,
  institutionLogo = INSTITUTION_LOGO,
  orientation = 'portrait'
}: PDFOptions) => {
  const title = formatTextWithAges(rawTitle);
  const subtitle = rawSubtitle ? formatTextWithAges(rawSubtitle) : undefined;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryGreen: [number, number, number] = [16, 185, 129]; // #10b981
  const secondaryGreen: [number, number, number] = [5, 150, 105]; // #059669
  const lightGray: [number, number, number] = [249, 250, 251];

  // Pre-load logo to avoid jspdf URL issues
  let logoData: string | ArrayBuffer | null = null;
  if (institutionLogo) {
    try {
      const response = await fetch(institutionLogo, {
        referrerPolicy: "no-referrer",
        cache: "force-cache"
      });
      if (response.ok) {
        logoData = await response.arrayBuffer();
      }
    } catch (e) {
      console.error("Error pre-loading logo", e);
    }
  }

  // Header Letterhead Function (Drawn on every page top)
  const drawLetterhead = (doc: jsPDF) => {
    // Top Green Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Institution Logo
    const hasLogo = !!logoData;
    if (logoData) {
      try {
        doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 15, 22, 22);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    const startX = hasLogo ? 40 : 14;

    // Institution Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(institutionName, startX, 20);
    
    // CNPJ & Endereço
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: 10.706.425/0001-74 • MA-014, Alto São Francisco, Vitória do Mearim – Maranhão`, startX, 25);
    doc.text(`SGPF OAMI • Relatório Oficial de Gestão e Atendimento`, startX, 29);

    // Horizontal Line Separator
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pageWidth - 14, 35);
  };

  // Footer Function
  const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    
    const footerText = `Documento gerado pelo Sistema OAMI em ${new Date().toLocaleString('pt-BR')} • Autenticidade Institucional`;
    doc.text(footerText, 14, pageHeight - 10);
    
    const pageText = `Página ${pageNum} de ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - textWidth, pageHeight - 10);
    
    // Bottom Green Accent
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(14, pageHeight - 5, pageWidth - 28, 0.5, 'F');
  };

  // Render Title and Subtitle ON PAGE 1 ONLY before table
  let startY = 42;

  // Draw Document Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text(title, 14, startY);
  startY += 5;

  // Draw Subtitle Box if provided
  if (subtitle) {
    const rawSubtitleLines = subtitle.split('\n').filter(l => l.trim().length > 0);
    let wrappedLines: string[] = [];
    
    rawSubtitleLines.forEach(line => {
      const split = doc.splitTextToSize(line.trim(), pageWidth - 36);
      wrappedLines = wrappedLines.concat(split);
    });

    const lineHeight = 4.2;
    const boxPadding = 4;
    const boxHeight = (wrappedLines.length * lineHeight) + (boxPadding * 2);

    // Draw Rounded Summary Box
    doc.setFillColor(240, 253, 244); // Light Emerald Background
    doc.setDrawColor(187, 247, 208); // Emerald Border
    doc.roundedRect(14, startY, pageWidth - 28, boxHeight, 3, 3, 'FD');

    // Print text lines inside box
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    let textY = startY + boxPadding + 3.5;
    wrappedLines.forEach(wLine => {
      if (wLine.includes('•') || wLine.startsWith('INSTITUIÇÃO') || wLine.startsWith('ENDEREÇO') || wLine.startsWith('RELATÓRIO')) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(wLine, 18, textY);
      textY += lineHeight;
    });

    startY += boxHeight + 6;
  } else {
    startY += 3;
  }

  // Generate Table
  autoTable(doc, {
    startY,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: {
      fillColor: primaryGreen,
      textColor: [255, 255, 255],
      fontSize: 9.5,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [51, 65, 85]
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    margin: { top: 38, bottom: 22, left: 14, right: 14 },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body') {
        const firstCellStr = String(hookData.row.cells[0]?.raw || '').trim().toUpperCase();
        const isTotalRow = firstCellStr.includes('TOTAL') || firstCellStr.includes('CONSOLIDADO') || firstCellStr.includes('SOMA');

        // Highlight Consolidated Total Row prominently
        if (isTotalRow) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.fillColor = [16, 185, 129]; // Prominent Emerald Green
          hookData.cell.styles.textColor = [255, 255, 255]; // Pure White text
          hookData.cell.styles.fontSize = 9.5;
          if (hookData.column.index === 0) {
            hookData.cell.styles.halign = 'left';
          } else {
            hookData.cell.styles.halign = 'center';
          }
          return;
        }

        const headerText = String(hookData.column.raw || hookData.column.title || '').trim().toLowerCase();
        const rawVal = String(hookData.cell.raw || '').trim();
        
        const isPatientCol = 
          ['paciente', 'idoso', 'idoso/fluxo', 'nome do idoso', 'residente', 'nome', 'acolhido', 'paciente/idoso'].includes(headerText) ||
          (headerText.includes('idoso') && !headerText.includes('uso') && !headerText.includes('status')) ||
          (headerText.includes('paciente') && !headerText.includes('uso'));
        
        if (isPatientCol) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = [6, 78, 59]; // Dark emerald text
          hookData.cell.styles.fillColor = [209, 250, 229]; // Light emerald background
          hookData.cell.styles.fontSize = 9;
          
          if (rawVal && rawVal !== 'N/A' && rawVal !== 'Não informado' && rawVal !== '-' && !rawVal.toUpperCase().includes('TOTAL')) {
            hookData.cell.text = [appendAgeToName(rawVal)];
          }
        }
      }
    }
  });

  // Space for signature of the professional
  const finalY = (doc as any).lastAutoTable?.finalY || startY;
  let signatureY = finalY + 12;
  const signatureSpaceNeeded = 25;

  if (signatureY + signatureSpaceNeeded > pageHeight - 18) {
    doc.addPage();
    signatureY = 48;
  }

  // Draw Signature Line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  const startX = (pageWidth / 2) - 45;
  const endX = (pageWidth / 2) + 45;
  doc.line(startX, signatureY + 10, endX, signatureY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Assinatura do Profissional Responsável', pageWidth / 2, signatureY + 15, { align: 'center' });

  // Add Headers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawLetterhead(doc);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`${fileName}.pdf`);
};

interface MultiSectionPDFOptions {
  title: string;
  subtitle?: string;
  sections: {
    title: string;
    columns: string[];
    data: any[][];
  }[];
  fileName: string;
  institutionName?: string;
  institutionLogo?: string;
  orientation?: 'portrait' | 'landscape';
}

export const generateMultiSectionPDF = async ({
  title: rawTitle,
  subtitle: rawSubtitle,
  sections,
  fileName,
  institutionName = INSTITUTION_NAME,
  institutionLogo = INSTITUTION_LOGO,
  orientation = 'portrait'
}: MultiSectionPDFOptions) => {
  const title = formatTextWithAges(rawTitle);
  const subtitle = rawSubtitle ? formatTextWithAges(rawSubtitle) : undefined;

  const doc = new jsPDF({
    orientation,
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryGreen: [number, number, number] = [16, 185, 129]; // #10b981
  const secondaryGreen: [number, number, number] = [5, 150, 105]; // #059669
  const lightGray: [number, number, number] = [249, 250, 251];

  // Pre-load logo to avoid jspdf URL issues
  let logoData: string | ArrayBuffer | null = null;
  if (institutionLogo) {
    try {
      const response = await fetch(institutionLogo, {
        referrerPolicy: "no-referrer",
        cache: "force-cache"
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      logoData = await response.arrayBuffer();
    } catch (e) {
      console.error("Error pre-loading logo", e);
    }
  }

  // Header Letterhead Function
  const drawLetterhead = (doc: jsPDF) => {
    // Top Green Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 12, 'F');

    // Institution Logo
    const hasLogo = !!logoData;
    if (logoData) {
      try {
        doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 15, 22, 22);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    const startX = hasLogo ? 40 : 14;

    // Institution Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(30, 41, 59);
    doc.text(institutionName, startX, 20);
    
    // CNPJ & Endereço
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: 10.706.425/0001-74 • MA-014, Alto São Francisco, Vitória do Mearim – Maranhão`, startX, 25);
    doc.text(`SGPF OAMI • Relatório Oficial Multissetorial`, startX, 29);

    // Horizontal Line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(14, 35, pageWidth - 14, 35);
  };

  // Footer Function
  const drawFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    
    const footerText = `Documento gerado pelo Sistema OAMI em ${new Date().toLocaleString('pt-BR')} • Autenticidade Institucional`;
    doc.text(footerText, 14, pageHeight - 10);
    
    const pageText = `Página ${pageNum} de ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - textWidth, pageHeight - 10);
    
    // Bottom Green Accent
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(14, pageHeight - 5, pageWidth - 28, 0.5, 'F');
  };

  let currentY = 42;

  // Render Title and Subtitle Box on Page 1 Only
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.text(title, 14, currentY);
  currentY += 5;

  if (subtitle) {
    const rawSubtitleLines = subtitle.split('\n').filter(l => l.trim().length > 0);
    let wrappedLines: string[] = [];
    
    rawSubtitleLines.forEach(line => {
      const split = doc.splitTextToSize(line.trim(), pageWidth - 36);
      wrappedLines = wrappedLines.concat(split);
    });

    const lineHeight = 4.2;
    const boxPadding = 4;
    const boxHeight = (wrappedLines.length * lineHeight) + (boxPadding * 2);

    doc.setFillColor(240, 253, 244);
    doc.setDrawColor(187, 247, 208);
    doc.roundedRect(14, currentY, pageWidth - 28, boxHeight, 3, 3, 'FD');

    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);

    let textY = currentY + boxPadding + 3.5;
    wrappedLines.forEach(wLine => {
      if (wLine.includes('•') || wLine.startsWith('INSTITUIÇÃO') || wLine.startsWith('ENDEREÇO') || wLine.startsWith('RELATÓRIO')) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(wLine, 18, textY);
      textY += lineHeight;
    });

    currentY += boxHeight + 8;
  } else {
    currentY += 3;
  }

  // Print out sections sequence
  for (const section of sections) {
    if (section.data.length === 0) continue;

    if (currentY + 25 > pageHeight - 20) {
      doc.addPage();
      currentY = 42;
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(section.title.toUpperCase(), 14, currentY + 4);

    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setLineWidth(0.3);
    doc.line(14, currentY + 6, pageWidth - 14, currentY + 6);

    currentY += 9;

    autoTable(doc, {
      startY: currentY,
      head: [section.columns],
      body: section.data,
      theme: 'striped',
      headStyles: {
        fillColor: primaryGreen,
        textColor: [255, 255, 255],
        fontSize: 9,
        fontStyle: 'bold',
        halign: 'center'
      },
      bodyStyles: {
        fontSize: 8,
        textColor: [51, 65, 85]
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      margin: { top: 38, bottom: 22, left: 14, right: 14 },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          const firstCellStr = String(hookData.row.cells[0]?.raw || '').trim().toUpperCase();
          const isTotalRow = firstCellStr.includes('TOTAL') || firstCellStr.includes('CONSOLIDADO') || firstCellStr.includes('SOMA');

          if (isTotalRow) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.fillColor = [16, 185, 129];
            hookData.cell.styles.textColor = [255, 255, 255];
            hookData.cell.styles.fontSize = 9;
            return;
          }

          const headerText = String(hookData.column.raw || hookData.column.title || '').trim().toLowerCase();
          const rawVal = String(hookData.cell.raw || '').trim();
          
          const isPatientCol = 
            ['paciente', 'idoso', 'idoso/fluxo', 'nome do idoso', 'residente', 'nome', 'acolhido', 'paciente/idoso'].includes(headerText) ||
            (headerText.includes('idoso') && !headerText.includes('uso') && !headerText.includes('status')) ||
            (headerText.includes('paciente') && !headerText.includes('uso'));
          
          if (isPatientCol) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [6, 78, 59];
            hookData.cell.styles.fillColor = [209, 250, 229];
            hookData.cell.styles.fontSize = 8.5;
            
            if (rawVal && rawVal !== 'N/A' && rawVal !== 'Não informado' && rawVal !== '-' && !rawVal.toUpperCase().includes('TOTAL')) {
              hookData.cell.text = [appendAgeToName(rawVal)];
            }
          }
        }
      }
    });

    const finalTableY = (doc as any).lastAutoTable?.finalY;
    if (finalTableY) {
      currentY = finalTableY + 8;
    } else {
      currentY += 15;
    }
  }

  // Signature section
  let signatureY = currentY + 10;
  const signatureSpaceNeeded = 25;

  if (signatureY + signatureSpaceNeeded > pageHeight - 18) {
    doc.addPage();
    signatureY = 48;
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  const startX = (pageWidth / 2) - 45;
  const endX = (pageWidth / 2) + 45;
  doc.line(startX, signatureY + 10, endX, signatureY + 10);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Assinatura do Profissional Responsável', pageWidth / 2, signatureY + 15, { align: 'center' });

  // Add Headers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawLetterhead(doc);
    drawFooter(doc, i, totalPages);
  }

  doc.save(`${fileName}.pdf`);
};

export interface TreasuryReceiptPDFOptions {
  receiptNumber: string;
  date: string;
  amount: number;
  paymentMethod: string;
  category: string;
  description: string;
  payerName: string;
  cpf?: string;
  registeredBy: string;
  observations?: string;
  institutionName?: string;
  institutionLogo?: string;
  donationKind?: 'FINANCIAL' | 'MATERIAL';
  itemDetails?: string;
  quantityOrVolume?: string;
  itemCondition?: string;
  destination?: string;
}

export const generateTreasuryReceiptPDF = async ({
  receiptNumber,
  date,
  amount,
  paymentMethod,
  category,
  description,
  payerName,
  cpf,
  registeredBy,
  observations,
  institutionName = INSTITUTION_NAME,
  institutionLogo = INSTITUTION_LOGO,
  donationKind = 'FINANCIAL',
  itemDetails,
  quantityOrVolume,
  itemCondition,
  destination
}: TreasuryReceiptPDFOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  const isMaterial = donationKind === 'MATERIAL';

  // Colors
  const primaryGreen: [number, number, number] = isMaterial ? [14, 116, 144] : [16, 185, 129]; // #0e7490 for material, #10b981 for financial
  const darkGreen: [number, number, number] = isMaterial ? [21, 94, 117] : [6, 95, 70];

  // Pre-load logo
  let logoData: string | ArrayBuffer | null = null;
  if (institutionLogo) {
    try {
      const response = await fetch(institutionLogo, {
        referrerPolicy: "no-referrer",
        cache: "force-cache"
      });
      if (response.ok) {
        logoData = await response.arrayBuffer();
      }
    } catch (e) {
      console.error("Error pre-loading logo for receipt PDF", e);
    }
  }

  // Top Bar
  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(0, 0, pageWidth, 12, 'F');

  // Header Logo
  const hasLogo = !!logoData;
  if (logoData) {
    try {
      doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 16, 28, 28);
    } catch (e) {
      console.error("Error drawing logo in receipt PDF", e);
    }
  }

  // Header Text
  const startX = hasLogo ? 48 : 14;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(30, 41, 59);
  doc.text(institutionName, startX, 22);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('CNPJ: 10.706.425/0001-74', startX, 27);
  doc.text('Endereço: MA-014, Alto São Francisco, Vitória do Mearim - Maranhão', startX, 31);
  doc.text('MÓDULO DE TESOURARIA E GESTÃO FINANCEIRA INSTITUCIONAL', startX, 35);

  // Line separator
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(14, 48, pageWidth - 14, 48);

  // Receipt Title & Number Box
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(14, 52, pageWidth - 28, 22, 3, 3, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.setTextColor(darkGreen[0], darkGreen[1], darkGreen[2]);
  const receiptTitle = isMaterial 
    ? `RECIBO OFICIAL DE DOAÇÃO EM BENS / MATERIAIS Nº ${receiptNumber}`
    : `RECIBO OFICIAL DE RECEITA Nº ${receiptNumber}`;
  doc.text(receiptTitle, 20, 66);

  const formattedAmount = amount > 0 
    ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) + (isMaterial ? ' (Est.)' : '')
    : (isMaterial ? 'Doação Física' : 'R$ 0,00');

  doc.setFontSize(14);
  doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  const amountTextWidth = doc.getTextWidth(formattedAmount);
  doc.text(formattedAmount, pageWidth - 20 - amountTextWidth, 66);

  // Declarative Body Box
  doc.setDrawColor(203, 213, 225);
  doc.setFillColor(255, 255, 255);
  doc.roundedRect(14, 80, pageWidth - 28, 45, 3, 3, 'FD');

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.setTextColor(51, 65, 85);

  let formattedDate = date;
  try {
    const parts = date.split('-');
    if (parts.length === 3) {
      formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
  } catch (e) {
    // keep as is
  }

  const receiptBodyText = isMaterial
    ? `Recebemos de ${payerName.toUpperCase()}${cpf ? `, portador(a) do CPF/CNPJ nº ${cpf}` : ''}, a doação em bens/materiais na categoria "${category}", contendo: "${itemDetails || description || 'Itens diversos'}", para destinação em "${destination || 'Uso Geral OAMI'}", recebido em ${formattedDate}.`
    : `Recebemos de ${payerName.toUpperCase()}${cpf ? `, portador(a) do CPF nº ${cpf}` : ''}, a quantia de ${formattedAmount}, referente a "${description || category}", recebido via ${paymentMethod} no dia ${formattedDate}.`;

  const splitText = doc.splitTextToSize(receiptBodyText, pageWidth - 40);
  doc.text(splitText, 20, 92);

  // Structured Information Table
  const tableBody = isMaterial ? [
    ['Nº do Recibo', receiptNumber],
    ['Data de Recebimento', formattedDate],
    ['Doador / Contribuinte', `${payerName}${cpf ? ` (CPF: ${cpf})` : ''}`],
    ['Categoria do Material', category],
    ['Itens / Detalhamento', itemDetails || description || 'Não informado'],
    ['Quantidade / Volume', quantityOrVolume || 'Não informada'],
    ['Estado de Conservação', itemCondition || 'Bom estado'],
    ['Valor Estimado (R$)', amount > 0 ? amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }) : 'Sem valoração financeira'],
    ['Destino / Finalidade', destination || 'Atendimento aos acolhidos OAMI'],
    ['Responsável pelo Recebimento', registeredBy],
    ['Observações', observations || 'Nenhuma observação informada.'],
  ] : [
    ['Nº do Recibo', receiptNumber],
    ['Data de Emissão', formattedDate],
    ['Pagador / Doador', `${payerName}${cpf ? ` (CPF: ${cpf})` : ''}`],
    ['Valor Recebido', formattedAmount],
    ['Forma de Pagamento', paymentMethod],
    ['Categoria', category],
    ['Descrição', description || 'Não informada'],
    ['Responsável pelo Lançamento', registeredBy],
    ['Observações', observations || 'Nenhuma observação informada.'],
  ];

  autoTable(doc, {
    startY: 132,
    head: [['Item', 'Detalhamento da Operação']],
    body: tableBody,
    theme: 'grid',
    headStyles: {
      fillColor: primaryGreen,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'left'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [51, 65, 85]
    },
    columnStyles: {
      0: { fontStyle: 'bold', cellWidth: 50, fillColor: [248, 250, 252] },
      1: { cellWidth: 'auto' }
    },
    margin: { left: 14, right: 14 }
  });

  const finalY = (doc as any).lastAutoTable?.finalY || 200;

  // Signature Block
  const signatureY = Math.max(finalY + 25, 220);

  doc.setDrawColor(148, 163, 184);
  doc.setLineWidth(0.5);
  const lineStart = (pageWidth / 2) - 45;
  const lineEnd = (pageWidth / 2) + 45;
  doc.line(lineStart, signatureY, lineEnd, signatureY);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 41, 59);
  doc.text(registeredBy, pageWidth / 2, signatureY + 6, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Tesouraria / Responsável OAMI', pageWidth / 2, signatureY + 11, { align: 'center' });

  // Footer
  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'italic');
  doc.setTextColor(148, 163, 184);
  const footerStr = `Recibo gerado automaticamente pelo Módulo de Tesouraria OAMI em ${new Date().toLocaleString('pt-BR')} • Autenticidade Registrada`;
  doc.text(footerStr, 14, pageHeight - 10);

  doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
  doc.rect(14, pageHeight - 5, pageWidth - 28, 0.5, 'F');

  doc.save(`Recibo_${receiptNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`);
};

export interface FinancialReportPDFOptions {
  periodTypeLabel: string;
  periodTitle: string;
  periodSubtitle: string;
  totalRevenue: number;
  totalExpenses: number;
  netBalance: number;
  transactions: {
    date: string;
    type: 'RECEITA' | 'DESPESA';
    category: string;
    payerOrFavored: string;
    paymentMethod: string;
    amount: number;
    receiptNumber?: string;
  }[];
  categoryBreakdown: {
    category: string;
    type: 'RECEITA' | 'DESPESA';
    total: number;
    count: number;
    percentage: number;
  }[];
  monthlyBreakdown?: {
    monthLabel: string;
    revenue: number;
    expense: number;
    balance: number;
  }[];
  generatedBy: string;
}

export const generateTreasuryFinancialReportPDF = async ({
  periodTypeLabel,
  periodTitle,
  periodSubtitle,
  totalRevenue,
  totalExpenses,
  netBalance,
  transactions,
  categoryBreakdown,
  monthlyBreakdown,
  generatedBy,
}: FinancialReportPDFOptions) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryGreen: [number, number, number] = [16, 185, 129]; // #10b981
  const darkSlate: [number, number, number] = [30, 41, 59];
  const roseRed: [number, number, number] = [225, 29, 72];
  const emeraldGreen: [number, number, number] = [5, 150, 105];

  // Pre-load logo
  let logoData: string | ArrayBuffer | null = null;
  if (INSTITUTION_LOGO) {
    try {
      const response = await fetch(INSTITUTION_LOGO, { referrerPolicy: "no-referrer", cache: "force-cache" });
      if (response.ok) logoData = await response.arrayBuffer();
    } catch (e) {
      console.error("Error pre-loading logo", e);
    }
  }

  // Header Bar
  doc.setFillColor(...primaryGreen);
  doc.rect(0, 0, pageWidth, 12, 'F');

  if (logoData) {
    try {
      doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 16, 26, 26);
    } catch (e) {
      console.error("Error adding logo", e);
    }
  }

  const hasLogo = !!logoData;
  const startX = hasLogo ? 45 : 14;

  // Institution Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(...darkSlate);
  doc.text(INSTITUTION_NAME, startX, 22);

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text('CNPJ: 10.706.425/0001-74 • MA-014, Alto São Francisco, Vitória do Mearim - MA', startX, 27);
  doc.text('Departamento de Tesouraria e Gestão Financeira', startX, 31);

  // Report Main Title
  doc.setFontSize(13);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...primaryGreen);
  doc.text(`${periodTypeLabel} - ${periodTitle}`, startX, 38);

  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  doc.text(periodSubtitle, startX, 43);

  // Line
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.4);
  doc.line(14, 47, pageWidth - 14, 47);

  // Executive Summary Cards (Draw 3 Boxes)
  const boxWidth = (pageWidth - 28 - 8) / 3;
  const boxY = 51;
  const boxHeight = 22;

  // Card 1: Receitas
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(14, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...emeraldGreen);
  doc.text('TOTAL RECEITAS (+)', 18, boxY + 6);

  doc.setFontSize(11);
  doc.text(`R$ ${totalRevenue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18, boxY + 15);

  // Card 2: Despesas
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(14 + boxWidth + 4, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...roseRed);
  doc.text('TOTAL DESPESAS (-)', 18 + boxWidth + 4, boxY + 6);

  doc.setFontSize(11);
  doc.text(`R$ ${totalExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18 + boxWidth + 4, boxY + 15);

  // Card 3: Saldo Líquido
  const isPositive = netBalance >= 0;
  doc.setFillColor(isPositive ? 236 : 254, isPositive ? 253 : 242, isPositive ? 245 : 242);
  doc.setDrawColor(isPositive ? 167 : 254, isPositive ? 243 : 202, isPositive ? 208 : 202);
  doc.roundedRect(14 + (boxWidth + 4) * 2, boxY, boxWidth, boxHeight, 2, 2, 'FD');

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(isPositive ? emeraldGreen[0] : roseRed[0], isPositive ? emeraldGreen[1] : roseRed[1], isPositive ? emeraldGreen[2] : roseRed[2]);
  doc.text('RESULTADO LÍQUIDO', 18 + (boxWidth + 4) * 2, boxY + 6);

  doc.setFontSize(11);
  doc.text(`R$ ${netBalance.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 18 + (boxWidth + 4) * 2, boxY + 15);

  let currentY = boxY + boxHeight + 8;

  // Monthly breakdown if available (for semester / annual)
  if (monthlyBreakdown && monthlyBreakdown.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('Evolução Mensal do Período', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Mês / Período', 'Receitas (R$)', 'Despesas (R$)', 'Saldo do Mês (R$)']],
      body: monthlyBreakdown.map(m => [
        m.monthLabel,
        m.revenue.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        m.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        m.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ]),
      theme: 'grid',
      headStyles: { fillColor: primaryGreen, textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right', fontStyle: 'bold' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;
  }

  // Category Breakdown Table
  if (categoryBreakdown && categoryBreakdown.length > 0) {
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...darkSlate);
    doc.text('Resumo Por Categoria', 14, currentY);

    autoTable(doc, {
      startY: currentY + 3,
      head: [['Tipo', 'Categoria', 'Qtd. Lançamentos', 'Total (R$)', '% do Subtotal']],
      body: categoryBreakdown.map(c => [
        c.type,
        c.category,
        c.count.toString(),
        c.total.toLocaleString('pt-BR', { minimumFractionDigits: 2 }),
        `${c.percentage.toFixed(1)}%`
      ]),
      theme: 'striped',
      headStyles: { fillColor: [51, 65, 85], textColor: [255, 255, 255], fontSize: 8.5, fontStyle: 'bold' },
      bodyStyles: { fontSize: 8, textColor: [51, 65, 85] },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 25 },
        2: { halign: 'center' },
        3: { halign: 'right', fontStyle: 'bold' },
        4: { halign: 'right' }
      },
      margin: { left: 14, right: 14 }
    });

    currentY = (doc as any).lastAutoTable?.finalY + 8;
  }

  // Transactions List Table
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...darkSlate);
  doc.text(`Lista de Lançamentos (${transactions.length} registros)`, 14, currentY);

  autoTable(doc, {
    startY: currentY + 3,
    head: [['Data', 'Tipo', 'Categoria', 'Pagador / Favorecido', 'Pagamento', 'Valor (R$)']],
    body: transactions.map(t => {
      let formattedDate = t.date;
      try {
        const parts = t.date.split('-');
        if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
      } catch (e) {}

      return [
        formattedDate,
        t.type,
        t.category,
        t.payerOrFavored,
        t.paymentMethod,
        (t.type === 'RECEITA' ? '+ ' : '- ') + Number(t.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })
      ];
    }),
    theme: 'grid',
    headStyles: { fillColor: primaryGreen, textColor: [255, 255, 255], fontSize: 8, fontStyle: 'bold' },
    bodyStyles: { fontSize: 7.5, textColor: [51, 65, 85] },
    columnStyles: {
      0: { cellWidth: 20 },
      1: { cellWidth: 20, fontStyle: 'bold' },
      2: { cellWidth: 35 },
      3: { cellWidth: 'auto' },
      4: { cellWidth: 22 },
      5: { cellWidth: 30, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (hookData) => {
      if (hookData.section === 'body' && hookData.column.index === 5) {
        const rawVal = hookData.cell.raw as string;
        if (rawVal.startsWith('+')) {
          hookData.cell.styles.textColor = [5, 150, 105];
        } else if (rawVal.startsWith('-')) {
          hookData.cell.styles.textColor = [225, 29, 72];
        }
      }
    },
    margin: { left: 14, right: 14, bottom: 25 }
  });

  // Footer & Page Numbers
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(148, 163, 184);
    
    const footerText = `Relatório Financeiro OAMI • Gerado por ${generatedBy} em ${new Date().toLocaleString('pt-BR')}`;
    doc.text(footerText, 14, pageHeight - 10);

    const pageText = `Página ${i} de ${totalPages}`;
    doc.text(pageText, pageWidth - 14 - doc.getTextWidth(pageText), pageHeight - 10);

    doc.setFillColor(...primaryGreen);
    doc.rect(14, pageHeight - 5, pageWidth - 28, 0.5, 'F');
  }

  const cleanFileName = `Relatorio_Financeiro_${periodTypeLabel.replace(/\s+/g, '_')}_${periodTitle.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
  doc.save(cleanFileName);
};
