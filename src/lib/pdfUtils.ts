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
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      logoData = await response.arrayBuffer();
    } catch (e) {
      console.error("Error pre-loading logo", e);
    }
  }

  // Header Function
  const addHeader = (doc: jsPDF, pageNum: number) => {
    // Top Green Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 15, 'F');

    // Institution Logo/Letterhead placeholder
    const hasLogo = !!logoData;
    if (logoData) {
      try {
        // Larger logo for "Official" look
        doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 18, 30, 30);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    // Institution Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text(institutionName, hasLogo ? 50 : 14, 24);
    
    // CNPJ & Endereço
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(`CNPJ: 10.706.425/0001-74`, hasLogo ? 50 : 14, 29);
    doc.text(`Endereço: MA-014, Alto São Francisco, Vitória do Mearim - Maranhão`, hasLogo ? 50 : 14, 33);
    
    // Unidade text
    doc.setFontSize(8);
    doc.text('Relatório Oficial de Atendimento', hasLogo ? 50 : 14, 38);

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(title, hasLogo ? 50 : 14, 45);

    if (subtitle) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(subtitle, hasLogo ? 50 : 14, 50);
    }

    // Horizontal Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 54, pageWidth - 14, 54);
  };

  // Footer Function
  const addFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    
    const footerText = `Documento gerado pelo Sistema OAMI em ${new Date().toLocaleString('pt-BR')}`;
    doc.text(footerText, 14, pageHeight - 10);
    
    const pageText = `Página ${pageNum} de ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - textWidth, pageHeight - 10);
    
    // Bottom Green Accent
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(14, pageHeight - 5, pageWidth - 28, 0.5, 'F');
  };

  // Generate Table
  autoTable(doc, {
    startY: 60,
    head: [columns],
    body: data,
    theme: 'striped',
    headStyles: {
      fillColor: primaryGreen,
      textColor: [255, 255, 255],
      fontSize: 10,
      fontStyle: 'bold',
      halign: 'center'
    },
    bodyStyles: {
      fontSize: 9,
      textColor: [60, 60, 60]
    },
    alternateRowStyles: {
      fillColor: lightGray
    },
    margin: { top: 55, bottom: 25 },
    didParseCell: (hookData: any) => {
      if (hookData.section === 'body') {
        const headerText = String(hookData.column.raw || hookData.column.title || '').trim().toLowerCase();
        const rawVal = String(hookData.cell.raw || '').trim();
        
        // Let's check both column name and registry to accurately find the patient name
        const matchAge = appendAgeToName(rawVal);
        const hasAgeAdded = matchAge !== rawVal; // If age can be resolved, it's definitely a patient
        
        const isPatientCol = 
          ['paciente', 'idoso', 'idoso/fluxo', 'nome do idoso', 'residente', 'nome', 'acolhido', 'paciente/idoso'].includes(headerText) ||
          headerText.includes('idoso') ||
          headerText.includes('paciente') ||
          headerText.includes('acolhido') ||
          headerText.includes('residente') ||
          hasAgeAdded;
        
        if (isPatientCol) {
          hookData.cell.styles.fontStyle = 'bold';
          hookData.cell.styles.textColor = [6, 78, 59]; // Dark emerald text for extremely clean read
          hookData.cell.styles.fillColor = [209, 250, 229]; // Light elegant background
          hookData.cell.styles.fontSize = 9.5; // Slightly larger to highlight
          
          if (rawVal && rawVal !== 'N/A' && rawVal !== 'Não informado' && rawVal !== '-') {
            hookData.cell.text = [appendAgeToName(rawVal)];
          }
        }
      }
    }
  });

  // Space for signature of the professional
  const finalY = (doc as any).lastAutoTable?.finalY || 60;
  let signatureY = finalY + 15;
  const signatureSpaceNeeded = 30;

  if (signatureY + signatureSpaceNeeded > pageHeight - 20) {
    doc.addPage();
    signatureY = 60; // start nicely below header limits
  }

  // Draw Signature Line
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  const startX = (pageWidth / 2) - 45;
  const endX = (pageWidth / 2) + 45;
  doc.line(startX, signatureY + 12, endX, signatureY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Assinatura do Profissional', pageWidth / 2, signatureY + 17, { align: 'center' });

  // Add Headers and Footers to all pages (including any extra page added for signature)
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i);
    addFooter(doc, i, totalPages);
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

  // Header Function
  const addHeader = (doc: jsPDF, pageNum: number) => {
    // Top Green Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 15, 'F');

    // Institution Logo/Letterhead placeholder
    const hasLogo = !!logoData;
    if (logoData) {
      try {
        doc.addImage(new Uint8Array(logoData as ArrayBuffer), 'PNG', 14, 18, 30, 30);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    // Institution Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(40, 40, 40);
    doc.text(institutionName, hasLogo ? 50 : 14, 24);
    
    // CNPJ & Endereço
    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(110, 110, 110);
    doc.text(`CNPJ: 10.706.425/0001-74`, hasLogo ? 50 : 14, 29);
    doc.text(`Endereço: MA-014, Alto São Francisco, Vitória do Mearim - Maranhão`, hasLogo ? 50 : 14, 33);
    
    // Unidade text
    doc.setFontSize(8);
    doc.text('Relatório Oficial de Atendimento Integrado', hasLogo ? 50 : 14, 38);

    // Report Title
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(title, hasLogo ? 50 : 14, 45);

    if (subtitle) {
      doc.setFontSize(8.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(120, 120, 120);
      doc.text(subtitle, hasLogo ? 50 : 14, 50);
    }

    // Horizontal Line
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.5);
    doc.line(14, 54, pageWidth - 14, 54);
  };

  // Footer Function
  const addFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    
    const footerText = `Documento gerado pelo Sistema OAMI em ${new Date().toLocaleString('pt-BR')}`;
    doc.text(footerText, 14, pageHeight - 10);
    
    const pageText = `Página ${pageNum} de ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - textWidth, pageHeight - 10);
    
    // Bottom Green Accent
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(14, pageHeight - 5, pageWidth - 28, 0.5, 'F');
  };

  let currentY = 58;

  // Let's print out sections sequence
  for (const section of sections) {
    if (section.data.length === 0) continue; // skip empty tables

    // Calculate space needed for section header (approx 15mm)
    if (currentY + 25 > pageHeight - 25) {
      doc.addPage();
      currentY = 58;
    }

    // Draw section header title
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(section.title.toUpperCase(), 14, currentY + 5);

    // Draw secondary underline under title
    doc.setDrawColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.setLineWidth(0.3);
    doc.line(14, currentY + 7, pageWidth - 14, currentY + 7);

    currentY += 10;

    // Output autoTable for this section
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
        textColor: [60, 60, 60]
      },
      alternateRowStyles: {
        fillColor: lightGray
      },
      margin: { top: 55, bottom: 25 },
      didParseCell: (hookData: any) => {
        if (hookData.section === 'body') {
          const headerText = String(hookData.column.raw || hookData.column.title || '').trim().toLowerCase();
          const rawVal = String(hookData.cell.raw || '').trim();
          
          const matchAge = appendAgeToName(rawVal);
          const hasAgeAdded = matchAge !== rawVal;
          
          const isPatientCol = 
            ['paciente', 'idoso', 'idoso/fluxo', 'nome do idoso', 'residente', 'nome', 'acolhido', 'paciente/idoso'].includes(headerText) ||
            headerText.includes('idoso') ||
            headerText.includes('paciente') ||
            headerText.includes('acolhido') ||
            headerText.includes('residente') ||
            hasAgeAdded;
          
          if (isPatientCol) {
            hookData.cell.styles.fontStyle = 'bold';
            hookData.cell.styles.textColor = [6, 78, 59];
            hookData.cell.styles.fillColor = [209, 250, 229];
            hookData.cell.styles.fontSize = 8.5;
            
            if (rawVal && rawVal !== 'N/A' && rawVal !== 'Não informado' && rawVal !== '-') {
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
  const signatureSpaceNeeded = 30;

  if (signatureY + signatureSpaceNeeded > pageHeight - 20) {
    doc.addPage();
    signatureY = 60;
  }

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  const startX = (pageWidth / 2) - 45;
  const endX = (pageWidth / 2) + 45;
  doc.line(startX, signatureY + 12, endX, signatureY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(60, 60, 60);
  doc.text('Assinatura do Profissional', pageWidth / 2, signatureY + 17, { align: 'center' });

  // Add Headers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`${fileName}.pdf`);
};
