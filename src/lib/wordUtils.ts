import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { INSTITUTION_NAME } from '../constants';

interface WordOptions {
  title: string;
  subtitle?: string;
  columns: string[];
  data: any[][];
  fileName: string;
}

export const generateModernWord = async ({
  title,
  subtitle,
  columns,
  data,
  fileName
}: WordOptions) => {
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

  const tableRows = data.map((row, rowIndex) => new TableRow({
    children: row.map(cell => new TableCell({
      children: [new Paragraph({
        children: [new TextRun({ text: String(cell || '') })],
        alignment: AlignmentType.LEFT
      })],
      shading: rowIndex % 2 === 0 ? { fill: 'F9FAFB' } : undefined
    }))
  }));

  const table = new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [tableHeader, ...tableRows]
  });

  const doc = new Document({
    sections: [{
      properties: {},
      children: [
        new Paragraph({
          children: [new TextRun({ text: INSTITUTION_NAME, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          heading: HeadingLevel.HEADING_1,
          children: [new TextRun({ text: title, color: '10b981', bold: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 100 }
        }),
        ...(subtitle ? [new Paragraph({
          children: [new TextRun({ text: subtitle, color: '666666', italics: true })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        })] : []),
        new Paragraph({
          children: [new TextRun({ text: `Gerado em: ${new Date().toLocaleString('pt-BR')}`, size: 16, color: '999999' })],
          alignment: AlignmentType.RIGHT,
          spacing: { after: 400 }
        }),
        table
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `${fileName}.docx`);
};
