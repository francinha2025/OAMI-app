import * as XLSX from 'xlsx';

interface ExcelOptions {
  title: string;
  columns: string[];
  data: any[][];
  fileName: string;
}

export const generateModernExcel = ({
  title,
  columns,
  data,
  fileName
}: ExcelOptions) => {
  // Create a new workbook
  const wb = XLSX.utils.book_new();

  // Prepare the data with headers
  const worksheetData = [
    [title], // Optional title row
    [],      // Spacer
    columns,  // Headers
    ...data   // Values
  ];

  // Create a worksheet
  const ws = XLSX.utils.aoa_to_sheet(worksheetData);

  // Set column widths (optional but nice)
  const colWidths = columns.map(() => ({ wch: 20 }));
  ws['!cols'] = colWidths;

  // Append worksheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Relatório');

  // Generate binary string and download
  XLSX.writeFile(wb, `${fileName}.xlsx`);
};
