import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS, INSTITUTION_LOGO } from '../../constants';
import { CaregiverShiftReport } from '../../types';
import { formatShiftName, formatShiftStatus, formatDiaperCount } from './caregiverUtils';

export const generateCaregiverShiftPdf = (report: CaregiverShiftReport) => {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginLeft = 15;
  const marginRight = 15;
  const contentWidth = pageWidth - marginLeft - marginRight;
  const startY = 15;
  const bottomMargin = 20;

  let currentY = startY;

  // Cabeçalho Institucional
  const drawHeader = () => {
    // Linha de realce verde no topo
    doc.setFillColor(34, 197, 94);
    doc.rect(marginLeft, currentY, contentWidth, 3, 'F');
    currentY += 7;

    // Logotipo e Dados da Casa OAMI
    if (INSTITUTION_LOGO) {
      try {
        doc.addImage(INSTITUTION_LOGO, 'PNG', marginLeft, currentY, 20, 20);
      } catch (e) {
        // Fallback silencioso
      }
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(20, 83, 45);
    doc.text(INSTITUTION_NAME, marginLeft + 24, currentY + 5);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(`CNPJ: ${INSTITUTION_CNPJ} • ${INSTITUTION_ADDRESS}`, marginLeft + 24, currentY + 10);
    doc.text('SGPF OAMI — Relatório Oficial de Passagem de Plantão da Equipe de Cuidadoras', marginLeft + 24, currentY + 15);

    currentY += 22;

    // Divisor horizontal
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.5);
    doc.line(marginLeft, currentY, marginLeft + contentWidth, currentY);
    currentY += 7;
  };

  // Rodapé Oficial com Paginação
  const drawFooter = (pageNum: number, totalPages: number) => {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(148, 163, 184);

    const footerText = `Registro emitido em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} — Casa OAMI ILPI`;
    doc.text(footerText, marginLeft, pageHeight - 10);

    const pageText = `Página ${pageNum} de ${totalPages}`;
    doc.text(pageText, pageWidth - marginRight - doc.getTextWidth(pageText), pageHeight - 10);
  };

  drawHeader();

  // Banner do Título do Documento
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(marginLeft, currentY, contentWidth, 14, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10.5);
  doc.setTextColor(15, 23, 42);
  doc.text('RELATÓRIO DE PASSAGEM DE PLANTÃO — CUIDADORAS', marginLeft + 5, currentY + 9);

  // Distintivo de Status
  const statusColor = 
    report.status === 'TRANQUILO' ? [16, 185, 129] :
    report.status === 'COM_OCORRENCIAS' ? [245, 158, 11] : [239, 68, 68];
  const statusLabel = 
    report.status === 'TRANQUILO' ? 'PLANTÃO TRANQUILO' :
    report.status === 'COM_OCORRENCIAS' ? 'COM OCORRÊNCIAS' : 'INTERCORRÊNCIA';

  doc.setFillColor(statusColor[0], statusColor[1], statusColor[2]);
  doc.roundedRect(pageWidth - marginRight - 50, currentY + 3, 46, 8, 2, 2, 'F');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7);
  doc.setTextColor(255, 255, 255);
  doc.text(statusLabel, pageWidth - marginRight - 48 + (44 - doc.getTextWidth(statusLabel)) / 2, currentY + 8);

  currentY += 18;

  // Grade de Metadados
  doc.setFillColor(241, 245, 249);
  doc.roundedRect(marginLeft, currentY, contentWidth, 22, 2, 2, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('DATA:', marginLeft + 4, currentY + 6);
  doc.text('TURNO / HORÁRIO:', marginLeft + 48, currentY + 6);
  doc.text('RESPONSÁVEL:', marginLeft + 115, currentY + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  doc.text(report.date || '—', marginLeft + 4, currentY + 12);
  
  const shiftText = `${formatShiftName(report.shift)} (${report.startTime || '07:00'} às ${report.endTime || '19:00'})`;
  doc.text(shiftText, marginLeft + 48, currentY + 12);
  doc.text(report.caregiverName || report.createdByName || '—', marginLeft + 115, currentY + 12);

  // Equipe
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(71, 85, 105);
  doc.text('EQUIPE NO PLANTÃO:', marginLeft + 4, currentY + 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const teamText = report.teamMembers && report.teamMembers.length > 0
    ? report.teamMembers.map(m => m.name).join(', ')
    : 'Apenas a cuidadora responsável (plantão individual)';
  doc.text(teamText, marginLeft + 40, currentY + 18);

  currentY += 27;

  // Verificação de Quebra de Página
  const checkPageBreak = (neededHeight: number) => {
    if (currentY + neededHeight > pageHeight - bottomMargin) {
      doc.addPage();
      currentY = startY;
      drawHeader();
    }
  };

  // Seção 1: Relato Geral do Plantão
  checkPageBreak(30);
  doc.setFillColor(236, 253, 245);
  doc.setDrawColor(167, 243, 208);
  doc.roundedRect(marginLeft, currentY, contentWidth, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(6, 78, 59);
  doc.text('1. RELATO GERAL DO PLANTÃO', marginLeft + 4, currentY + 5);
  currentY += 10;

  const notesText = report.generalNotes?.trim() || 'Nenhuma anotação geral registrada no encerramento deste turno.';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 41, 59);
  const splitNotes = doc.splitTextToSize(notesText, contentWidth - 8);
  
  checkPageBreak(splitNotes.length * 4.5 + 8);
  doc.text(splitNotes, marginLeft + 4, currentY);
  currentY += splitNotes.length * 4.5 + 8;

  // Transcrições se existirem
  if (report.audioTranscript) {
    checkPageBreak(20);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text('Transcrição de Áudio Registrada:', marginLeft + 4, currentY);
    currentY += 4;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(71, 85, 105);
    const splitAudio = doc.splitTextToSize(`"${report.audioTranscript}"`, contentWidth - 8);
    checkPageBreak(splitAudio.length * 4);
    doc.text(splitAudio, marginLeft + 4, currentY);
    currentY += splitAudio.length * 4 + 6;
  }

  // Seção 2: Observações Específicas de Acolhidos
  checkPageBreak(25);
  doc.setFillColor(240, 253, 244);
  doc.setDrawColor(187, 247, 208);
  doc.roundedRect(marginLeft, currentY, contentWidth, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(20, 83, 45);
  doc.text(`2. OBSERVAÇÕES ESPECÍFICAS DE ACOLHIDOS (${report.residentNotes?.length || 0})`, marginLeft + 4, currentY + 5);
  currentY += 10;

  if (!report.residentNotes || report.residentNotes.length === 0) {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhum acolhido com intercorrência ou observação individual anotada.', marginLeft + 4, currentY);
    currentY += 8;
  } else {
    report.residentNotes.forEach((res) => {
      checkPageBreak(20);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${res.elderlyName}:`, marginLeft + 4, currentY);

      if (res.statusTags && res.statusTags.length > 0) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(5, 150, 105);
        doc.text(`[${res.statusTags.join(', ')}]`, marginLeft + 10 + doc.getTextWidth(`• ${res.elderlyName}:`), currentY);
      }
      currentY += 4.5;

      if (res.observation) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);
        const splitObs = doc.splitTextToSize(res.observation, contentWidth - 12);
        checkPageBreak(splitObs.length * 4);
        doc.text(splitObs, marginLeft + 8, currentY);
        currentY += splitObs.length * 4 + 4;
      }
    });
  }

  // Seção 3: Intercorrências e Condutas Tomadas
  checkPageBreak(25);
  doc.setFillColor(254, 242, 242);
  doc.setDrawColor(254, 202, 202);
  doc.roundedRect(marginLeft, currentY, contentWidth, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(153, 27, 27);
  doc.text(`3. INTERCORRÊNCIAS / ACONTECIMENTOS CLÍNICOS (${report.incidents?.length || 0})`, marginLeft + 4, currentY + 5);
  currentY += 10;

  if (!report.incidents || report.incidents.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma intercorrência clínica registrada neste plantão.', marginLeft + 4, currentY);
    currentY += 8;
  } else {
    report.incidents.forEach((inc) => {
      checkPageBreak(25);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(185, 28, 28);
      doc.text(`⚠️ ${inc.elderlyName} (${inc.time || 'Horário não informado'}):`, marginLeft + 4, currentY);
      currentY += 4.5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(30, 41, 59);
      const splitDesc = doc.splitTextToSize(`Ocorrência: ${inc.description}`, contentWidth - 10);
      doc.text(splitDesc, marginLeft + 6, currentY);
      currentY += splitDesc.length * 4 + 2;

      if (inc.actionTaken) {
        const splitAct = doc.splitTextToSize(`Conduta Adotada: ${inc.actionTaken}`, contentWidth - 10);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(71, 85, 105);
        doc.text(splitAct, marginLeft + 6, currentY);
        currentY += splitAct.length * 4 + 2;
      }

      if (inc.notifiedPeople && inc.notifiedPeople.length > 0) {
        doc.setFont('helvetica', 'italic');
        doc.setFontSize(7.5);
        doc.setTextColor(148, 163, 184);
        doc.text(`Comunicado a: ${inc.notifiedPeople.join(', ')}`, marginLeft + 6, currentY);
        currentY += 4;
      }
      currentY += 3;
    });
  }

  // Seção 4: Fraldas Utilizadas
  checkPageBreak(25);
  doc.setFillColor(239, 246, 255);
  doc.setDrawColor(191, 219, 254);
  doc.roundedRect(marginLeft, currentY, contentWidth, 7, 1.5, 1.5, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(30, 64, 175);
  doc.text(`4. FRALDAS UTILIZADAS NO PLANTÃO (Total: ${formatDiaperCount(report.totalDiapersCount || 0)})`, marginLeft + 4, currentY + 5);
  currentY += 10;

  if (!report.diapersUsed || report.diapersUsed.length === 0) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text('Nenhuma troca de fralda lançada neste relatório de plantão.', marginLeft + 4, currentY);
    currentY += 8;
  } else {
    report.diapersUsed.forEach((item) => {
      checkPageBreak(8);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(15, 23, 42);
      doc.text(`• ${item.elderlyName}:`, marginLeft + 4, currentY);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(71, 85, 105);
      const diaperDesc = `${formatDiaperCount(item.quantity)} (Tamanho ${item.size})${item.time ? ' às ' + item.time : ''}`;
      doc.text(diaperDesc, marginLeft + 10 + doc.getTextWidth(`• ${item.elderlyName}:`), currentY);
      currentY += 5;
    });
  }

  // Seção 5: Assinatura e Encerramento
  checkPageBreak(35);
  currentY += 8;
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.line(marginLeft + 20, currentY + 15, marginLeft + contentWidth - 20, currentY + 15);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(15, 23, 42);
  const signName = report.caregiverName || report.createdByName || 'Cuidadora Responsável';
  doc.text(signName, marginLeft + (contentWidth - doc.getTextWidth(signName)) / 2, currentY + 20);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  const signRole = 'Cuidadora de Idosos — Casa OAMI ILPI';
  doc.text(signRole, marginLeft + (contentWidth - doc.getTextWidth(signRole)) / 2, currentY + 24);

  // Paginação em todas as páginas
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    drawFooter(i, totalPages);
  }

  // Nome do Arquivo Seguro e em Português
  const safeDate = report.date?.replace(/[^0-9]/g, '-') || 'plantao';
  const fileName = `OAMI_Plantao_Cuidadora_${safeDate}_${report.shift}.pdf`;
  doc.save(fileName);
};
