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
}

export const generateModernPDF = ({
  title,
  subtitle,
  columns,
  data,
  fileName,
  institutionName = INSTITUTION_NAME,
  institutionLogo = INSTITUTION_LOGO
}: PDFOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;

  // Colors
  const primaryGreen: [number, number, number] = [16, 185, 129]; // #10b981
  const secondaryGreen: [number, number, number] = [5, 150, 105]; // #059669
  const lightGray: [number, number, number] = [249, 250, 251];

  // Header Function
  const addHeader = (doc: jsPDF, pageNum: number) => {
    // Top Green Bar
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(0, 0, pageWidth, 15, 'F');

    // Institution Logo/Letterhead placeholder
    if (institutionLogo) {
      try {
        doc.addImage(institutionLogo, 'PNG', 14, 20, 40, 20);
      } catch (e) {
        console.error("Error adding logo to PDF", e);
      }
    }

    // Institution Name
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text(institutionName, institutionLogo ? 60 : 14, 28);

    // Report Title
    doc.setFontSize(18);
    doc.setTextColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.text(title, institutionLogo ? 60 : 14, 38);

    if (subtitle) {
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      doc.text(subtitle, institutionLogo ? 60 : 14, 44);
    }

    // Horizontal Line
    doc.setDrawColor(230, 230, 230);
    doc.line(14, 50, pageWidth - 14, 50);
  };

  // Footer Function
  const addFooter = (doc: jsPDF, pageNum: number, totalPages: number) => {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(150, 150, 150);
    
    const footerText = `Gerado em: ${new Date().toLocaleString('pt-BR')}`;
    doc.text(footerText, 14, pageHeight - 10);
    
    const pageText = `Página ${pageNum} de ${totalPages}`;
    const textWidth = doc.getTextWidth(pageText);
    doc.text(pageText, pageWidth - 14 - textWidth, pageHeight - 10);
    
    // Bottom Green Accent
    doc.setFillColor(primaryGreen[0], primaryGreen[1], primaryGreen[2]);
    doc.rect(pageWidth - 40, pageHeight - 2, 40, 2, 'F');
  };

  // Generate Table
  autoTable(doc, {
    startY: 55,
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
