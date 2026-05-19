import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { INSTITUTION_LOGO, INSTITUTION_NAME } from '../constants';

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
  title,
  subtitle,
  columns,
  data,
  fileName,
  institutionName = INSTITUTION_NAME,
  institutionLogo = INSTITUTION_LOGO,
  orientation = 'portrait'
}: PDFOptions) => {
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
    doc.setFontSize(16);
    doc.setTextColor(50, 50, 50);
    doc.text(institutionName, hasLogo ? 50 : 14, 28);
    
    // Unidade text
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Relatório Oficial de Atendimento', hasLogo ? 50 : 14, 34);

    // Report Title
    doc.setFontSize(18);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(title, hasLogo ? 50 : 14, 44);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
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
    margin: { top: 55, bottom: 20 },
    didDrawPage: (data: any) => {
      // Add header on each page
      // Note: we can't easily know total pages here, so we'll do it after
    }
  });

  // Add Headers and Footers to all pages
  const totalPages = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeader(doc, i);
    addFooter(doc, i, totalPages);
  }

  doc.save(`${fileName}.pdf`);
};
