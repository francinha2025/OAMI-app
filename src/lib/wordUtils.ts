import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle, ImageRun } from 'docx';
import { saveAs } from 'file-saver';
import { INSTITUTION_NAME, INSTITUTION_LOGO } from '../constants';
import { appendAgeToName, formatTextWithAges } from './utils';

interface WordOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  data: any[][];
  fileName: string;
}

export const generateModernWord = async ({
  title: rawTitle,
  subtitle: rawSubtitle,
  columns,
  data,
  fileName
}: WordOptions) => {
  const title = formatTextWithAges(rawTitle);
  const subtitle = rawSubtitle ? formatTextWithAges(rawSubtitle) : undefined;
  // Try to fetch the logo for the Word document
  let logoImageRun: ImageRun | null = null;
  try {
    const response = await fetch(INSTITUTION_LOGO, {
      referrerPolicy: "no-referrer",
      cache: "force-cache"
    });
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const buffer = await response.arrayBuffer();
    logoImageRun = new ImageRun({
      data: new Uint8Array(buffer),
      transformation: {
        width: 80,
        height: 80,
      },
    } as any);
  } catch (e) {
    console.error("Error fetching logo for Word", e);
    // Silent fail for logo, better generate report without logo than fail completely
  }

  const tableHeader = new TableRow({
    children: columns.map(col => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: col, bold: true, color: 'FFFFFF' })],
        alignment: AlignmentType.CENTER
      })],
      shading: { fill: '10b981' },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 1, color: '059669' },
        bottom: { style: BorderStyle.SINGLE, size: 1, color: '059669' },
        left: { style: BorderStyle.SINGLE, size: 1, color: '059669' },
        right: { style: BorderStyle.SINGLE, size: 1, color: '059669' }
      }
    }))
  });

  const tableRows = data.map((row, rowIndex) => {
    const firstCellRaw = String(row[0] || '').trim().toUpperCase();
    const isTotalRow = firstCellRaw.includes('TOTAL') || firstCellRaw.includes('CONSOLIDADO') || firstCellRaw.includes('SOMA');

    return new TableRow({
      children: row.map((cell, colIndex) => {
        const colHeader = String(columns[colIndex] || '').trim().toLowerCase();
        const cellTextRaw = String(cell || '').trim();
        
        if (isTotalRow) {
          return new TableCell({
            children: [new Paragraph({
              children: [new TextRun({ 
                text: cellTextRaw, 
                bold: true,
                color: 'FFFFFF'
              })],
              alignment: colIndex === 0 ? AlignmentType.LEFT : AlignmentType.CENTER
            })],
            shading: { fill: '10b981' }
          });
        }

        const matchAge = appendAgeToName(cellTextRaw);
        const hasAgeAdded = matchAge !== cellTextRaw;
        
        // Check if it is a patient column using advanced detection
        const isPatientCol = 
          ['paciente', 'idoso', 'idoso/fluxo', 'nome do idoso', 'residente', 'nome', 'acolhido', 'paciente/idoso'].includes(colHeader) ||
          (colHeader.includes('idoso') && !colHeader.includes('uso') && !colHeader.includes('status')) ||
          (colHeader.includes('paciente') && !colHeader.includes('uso')) ||
          hasAgeAdded;
        
        let cellText = cellTextRaw;
        if (isPatientCol && cellText && cellText !== 'N/A' && cellText !== 'Não informado' && cellText !== '-' && !cellText.toUpperCase().includes('TOTAL')) {
          cellText = appendAgeToName(cellText);
        }

        return new TableCell({
          children: [new Paragraph({
            children: [new TextRun({ 
              text: cellText, 
              bold: isPatientCol ? true : undefined,
              color: isPatientCol ? '064e3b' : undefined // High-contrast classy deep green
            })],
            alignment: AlignmentType.LEFT
          })],
          shading: isPatientCol 
            ? { fill: 'D1FAE5' } // Emerald light highlight block
            : (rowIndex % 2 === 0 ? { fill: 'F9FAFB' } : undefined)
        });
      })
    });
  });

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeader, ...tableRows]
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        ...(logoImageRun ? [new Paragraph({
          children: [logoImageRun],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        })] : []),
        new Paragraph({
          children: [new TextRun({ text: INSTITUTION_NAME, bold: true, size: 30 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 80 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'CNPJ: 10.706.425/0001-74 • Endereço: MA-014, Alto São Francisco, Vitória do Mearim – Maranhão', size: 15, color: '666666', bold: true })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 120 }
        }),
        new Paragraph({
          children: [new TextRun({ text: 'Relatório Oficial de Atendimento', size: 18, color: '888888', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 150 }
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: title, color: '10b981', bold: true, size: 24 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        ...(subtitle ? [new Paragraph({
          children: [new TextRun({ text: subtitle, color: '666666', italics: true, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })] : []),
        new Paragraph({
          children: [new TextRun({ text: `Documento gerado pelo Sistema OAMI em: ${new Date().toLocaleString('pt-BR')}`, size: 15, color: '999999' })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 300 }
        }),
        table,
        new Paragraph({
          text: '',
          spacing: { before: 800, after: 100 }
        }),
        new Paragraph({
          children: [
            new TextRun({ text: '____________________________________________________', color: '999999' })
          ],
          alignment: AlignmentType.CENTER
        }),
        new Paragraph({
          children: [
            new TextRun({ text: 'Assinatura do Profissional', bold: true, size: 18, color: '333333' })
          ],
          alignment: AlignmentType.CENTER,
          spacing: { after: 300 }
        })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};
