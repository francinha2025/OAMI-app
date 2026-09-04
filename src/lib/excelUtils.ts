import * as XLSX from 'xlsx';
import { appendAgeToName, formatTextWithAges } from './utils';

interface ExcelOptions {
  title: string;
  columns: string[];
  data: any[][];
  fileName: string;
}

export const generateModernExcel = ({
  title: rawTitle,
  columns,
  data,
  fileName
}: ExcelOptions) => {
  const title = formatTextWithAges(rawTitle);

  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Highlight patient names where column matches
  const formattedData = data.map(row => 
    row.map((cell, colIndex) => {
      const colHeader = String(columns[colIndex] || '').trim().toLowerCase();
      const cellValueRaw = String(cell || '').trim();
      
      const matchAge = appendAgeToName(cellValueRaw);
      const hasAgeAdded = matchAge !== cellValueRaw;
      
      const isPatientCol = 
        ['paciente', 'idoso', 'idoso/fluxo', 'nome do idoso', 'residente', 'nome', 'acolhido', 'paciente/idoso'].includes(colHeader) ||
        colHeader.includes('idoso') ||
        colHeader.includes('paciente') ||
        colHeader.includes('acolhido') ||
        colHeader.includes('residente') ||
        hasAgeAdded;
      
      if (isPatientCol && cellValueRaw && cellValueRaw !== 'N/A' && cellValueRaw !== 'Não informado' && cellValueRaw !== '-') {
        const cellValue = appendAgeToName(cellValueRaw);
        return `** ${cellValue.toUpperCase()} **`; // High-contrast visual highlight in Excel
      }
      return cell;
    })
  );

  // Prepare the data with headers and professional details
  const worksheetData = [
    [title],
    ["Opera Assistenza Malati Impediti (OAMI)"],
    ["CNPJ: 10.706.425/0001-74 • MA-014, Alto São Francisco, Vitória do Mearim – Maranhão"],
    ["Relatório Oficial do Sistema OAMI"],
    [],      // Spacer
    columns,  // Headers
    ...formattedData,   // Values
    [],
    [],
    ["Assinatura do Profissional:"],
    ["______________________________________________________"]
  ];

  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths (optional but nice)
  const colWidths = columns.map(() => ({ wch: 22 }));
  ws['!cols'] = colWidths;

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

  // Generate binary string and download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
