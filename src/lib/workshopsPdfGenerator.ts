import jsPDF from 'jspdf';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS, INSTITUTION_LOGO } from '../constants';
import { Workshop, Elderly, CommunityElderly, Caregiver, Professional, User } from '../types';
import { formatLocalDate } from './utils';
import { resolveCollaborator, resolveParticipant } from './collaboratorResolver';

export interface GenerateWorkshopsInstitutionalPdfOptions {
  workshops: Array<Workshop | any>;
  elderly?: Elderly[];
  communityElderly?: CommunityElderly[];
  caregivers?: Caregiver[];
  professionals?: Professional[];
  users?: User[];
  periodLabel?: string;
  startDate?: string;
  endDate?: string;
  fileName?: string;
}

/**
 * Pre-load an image safely as HTMLImageElement to obtain its aspect ratio and avoid CORS issues.
 */
function preloadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    if (!src || typeof src !== 'string') return resolve(null);
    try {
      const img = new Image();
      img.crossOrigin = 'Anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => {
        // Fallback without crossOrigin if first attempt fails
        const fallback = new Image();
        fallback.onload = () => resolve(fallback);
        fallback.onerror = () => resolve(null);
        fallback.src = src;
      };
      img.src = src;
    } catch {
      resolve(null);
    }
  });
}

/**
 * Generates the complete, redesigned Institutional PDF report for Workshops and Capacitations.
 * Zero text overlapping, structured cards, portrait A4, and official Casa OAMI letterhead.
 */
export async function generateWorkshopsInstitutionalPdf({
  workshops: rawWorkshops,
  elderly = [],
  communityElderly = [],
  caregivers = [],
  professionals = [],
  users = [],
  periodLabel,
  startDate,
  endDate,
  fileName
}: GenerateWorkshopsInstitutionalPdfOptions): Promise<void> {
  // Normalize workshops array
  const workshops: Workshop[] = (rawWorkshops || []).map((w: any) => {
    const raw = w.details || w;
    return {
      id: String(raw.id || w.id || Math.random()),
      title: String(raw.title || w.title || 'Atividade Institucional').trim(),
      date: String(raw.date || (w as any).date || raw.when || '').trim(),
      description: String(raw.description || raw.what || raw.how || '').trim(),
      type: (raw.type || (w.recordType === 'CAPACITACAO' || w.sectorKey === 'CAPACITACOES' ? 'CAPACITACAO' : 'OFICINA')) as 'OFICINA' | 'CAPACITACAO',
      what: String(raw.what || raw.description || '').trim(),
      why: String(raw.why || raw.objective || raw.justification || '').trim(),
      where: String(raw.where || raw.location || raw.room || 'Sede OAMI').trim(),
      when: String(raw.when || (raw.date ? formatLocalDate(raw.date) : '')).trim(),
      who: String(raw.who || raw.responsible || raw.registeredBy || w.responsible || 'Equipe OAMI').trim(),
      how: String(raw.how || raw.methodology || raw.description || '').trim(),
      howMuch: String(raw.howMuch || raw.cost || raw.budget || '').trim(),
      status: String(raw.status || (raw.completed ? 'Concluída' : 'Realizada')).trim(),
      participants: Array.isArray(raw.participants) ? raw.participants : (Array.isArray(w.participants) ? w.participants : []),
      coWorkers: Array.isArray(raw.coWorkers) ? raw.coWorkers : (Array.isArray(w.coWorkers) ? w.coWorkers : []),
      photos: Array.isArray(raw.photos) ? raw.photos : (Array.isArray(w.photos) ? w.photos : []),
      documents: Array.isArray(raw.documents) ? raw.documents : (Array.isArray(w.documents) ? w.documents : [])
    };
  });

  // Sort workshops descending by date
  workshops.sort((a, b) => {
    const da = a.date || '';
    const db = b.date || '';
    return db.localeCompare(da);
  });

  // Metrics
  const totalActivities = workshops.length;
  const totalWorkshops = workshops.filter(w => w.type === 'OFICINA').length;
  const totalTrainings = workshops.filter(w => w.type === 'CAPACITACAO').length;
  const totalParticipants = workshops.reduce((sum, w) => sum + (w.participants?.length || 0), 0);

  // Initialize jsPDF A4 portrait
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = 210;
  const pageHeight = 297;
  const marginX = 16;
  const contentWidth = pageWidth - marginX * 2; // 178mm
  const maxY = 275; // safe bottom limit for content before footer

  // Pre-load OAMI Logo
  const logoImg = await preloadImage(INSTITUTION_LOGO);

  // Pre-load photos of all workshops in parallel
  const preloadedPhotosMap = new Map<string, HTMLImageElement | null>();
  const photoUrlsToLoad = new Set<string>();
  workshops.forEach(w => {
    (w.photos || []).forEach(p => {
      if (p && typeof p === 'string') photoUrlsToLoad.add(p);
    });
  });

  await Promise.all(
    Array.from(photoUrlsToLoad).map(async (url) => {
      const img = await preloadImage(url);
      preloadedPhotosMap.set(url, img);
    })
  );

  // State tracker: page 1 starts cleanly below the header and KPI box
  let currentY = 54;

  // Helper: check space and break page
  const ensureSpace = (neededHeight: number) => {
    if (currentY + neededHeight > maxY) {
      doc.addPage();
      currentY = 28; // subsequent pages start cleanly below repeating header
    }
  };

  // Helper: draw section banner within an activity card
  const drawSubSectionHeader = (title: string, iconSymbol = '■') => {
    ensureSpace(13);
    doc.setFillColor(241, 245, 249); // slate 100
    doc.roundedRect(marginX, currentY, contentWidth, 7, 1.5, 1.5, 'F');
    
    // Accent left stripe
    doc.setFillColor(4, 120, 87); // Emerald 700
    doc.roundedRect(marginX, currentY, 2.5, 7, 1, 1, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(30, 41, 59); // slate 800
    doc.text(`${iconSymbol}  ${title}`, marginX + 6, currentY + 4.8);
    currentY += 10;
  };

  // ─────────────────────────────────────────────────────────────
  // RENDER EACH ACTIVITY IN INSTITUTIONAL CARD FORMAT
  // ─────────────────────────────────────────────────────────────
  for (let index = 0; index < workshops.length; index++) {
    const w = workshops[index];
    const isTraining = w.type === 'CAPACITACAO';

    // 1. PAGE BREAK CHECK FOR START OF ACTIVITY
    // Ensure we don't start an activity if there isn't enough space for:
    // Badge + Title + Meta Box + 5W2H header + first item (~65mm)
    ensureSpace(65);

    // Activity Card Top Accent Line
    if (isTraining) {
      doc.setFillColor(124, 58, 237); // violet 600
    } else {
      doc.setFillColor(5, 150, 105); // emerald 600
    }
    doc.rect(marginX, currentY, contentWidth, 2, 'F');
    currentY += 5;

    // Type Badge Pill
    const badgeText = isTraining ? 'CAPACITAÇÃO PROFISSIONAL' : 'OFICINA TERAPÊUTICA';
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const badgeWidth = doc.getTextWidth(badgeText) + 8;
    
    if (isTraining) {
      doc.setFillColor(245, 243, 255); // violet 50
      doc.setDrawColor(221, 214, 254); // violet 200
      doc.setTextColor(109, 40, 217); // violet 700
    } else {
      doc.setFillColor(236, 253, 245); // emerald 50
      doc.setDrawColor(167, 243, 208); // emerald 200
      doc.setTextColor(4, 120, 87); // emerald 700
    }
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, badgeWidth, 5.5, 2, 2, 'FD');
    doc.text(badgeText, marginX + 4, currentY + 4);

    // Activity Index Tag (e.g. "Atividade 1 de 9")
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184); // slate 400
    const indexTag = `Atividade ${index + 1} de ${workshops.length}`;
    doc.text(indexTag, marginX + contentWidth, currentY + 4, { align: 'right' });
    currentY += 9;

    // Title (Large, Bold, Legible - 13pt)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(15, 23, 42); // slate 900
    const titleLines = doc.splitTextToSize(w.title || 'Atividade sem Título', contentWidth);
    doc.text(titleLines, marginX, currentY + 4);
    currentY += titleLines.length * 5.8 + 3;

    // ─────────────────────────────────────────────────────────────
    // META BOX (Data, Responsável, Participantes, Status)
    // ─────────────────────────────────────────────────────────────
    const formattedDate = w.date ? formatLocalDate(w.date, "dd 'de' MMMM 'de' yyyy") : (w.when || 'Data não informada');
    const respClean = w.who || 'Não informado';
    const statusClean = (w as any).status || 'Realizada';
    const participantsClean = `${w.participants?.length || 0} pessoa(s)`;

    // Specific non-colliding column widths: 42mm + 50mm + 43mm + 43mm = 178mm
    const col1W = 42;
    const col2W = 50;
    const col3W = 43;
    const col4W = 43;

    const col1X = marginX;
    const col2X = marginX + col1W;
    const col3X = col2X + col2W;
    const col4X = col3X + col3W;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    const dateLines = doc.splitTextToSize(formattedDate, col1W - 4);
    const respLines = doc.splitTextToSize(respClean, col2W - 4);
    const partLines = doc.splitTextToSize(participantsClean, col3W - 4);
    const statusLines = doc.splitTextToSize(statusClean, col4W - 4);

    const maxMetaLines = Math.max(dateLines.length, respLines.length, partLines.length, statusLines.length, 1);
    const metaBoxHeight = 8 + maxMetaLines * 4.4 + 2;

    ensureSpace(metaBoxHeight + 5);

    doc.setFillColor(248, 250, 252); // slate 50
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(0.3);
    doc.roundedRect(marginX, currentY, contentWidth, metaBoxHeight, 2, 2, 'FD');

    // Labels row
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(100, 116, 139);
    doc.text('DATA DO EVENTO', col1X + 3, currentY + 4.5);
    doc.text('RESPONSÁVEL / FACILITADOR', col2X + 3, currentY + 4.5);
    doc.text('PARTICIPANTES', col3X + 3, currentY + 4.5);
    doc.text('STATUS DA AÇÃO', col4X + 3, currentY + 4.5);

    // Values rows (never colliding)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(15, 23, 42);
    doc.text(dateLines, col1X + 3, currentY + 9);
    doc.text(respLines, col2X + 3, currentY + 9);
    doc.text(partLines, col3X + 3, currentY + 9);

    doc.setTextColor(4, 120, 87); // Emerald dark for status
    doc.text(statusLines, col4X + 3, currentY + 9);

    currentY += metaBoxHeight + 6;

    // ─────────────────────────────────────────────────────────────
    // 2. INFORMAÇÕES 5W2H (Clear 2-line structure, NO OVERLAPPING)
    // ─────────────────────────────────────────────────────────────
    drawSubSectionHeader('INFORMAÇÕES 5W2H');

    const items5W2H = [
      { label: 'WHAT / O QUE (O que será feito):', val: w.what || w.description || 'Não informado' },
      { label: 'WHY / POR QUÊ (Justificativa e Objetivos):', val: w.why || 'Não informado' },
      { label: 'WHO / QUEM (Responsável / Equipe executora):', val: w.who || 'Não informado' },
      { label: 'WHERE / ONDE (Local de realização):', val: w.where || 'Sede da Casa OAMI' },
      { label: 'WHEN / QUANDO (Data, horário e frequência):', val: w.when || formattedDate },
      { label: 'HOW / COMO (Metodologia e forma de execução):', val: w.how || w.description || 'Não informado' },
      { label: 'HOW MUCH / QUANTO (Recursos, custos e materiais):', val: w.howMuch || 'Não informado' },
    ];

    for (const item of items5W2H) {
      const labelText = item.label;

      // Wrap value text
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      const textLines = doc.splitTextToSize(item.val, contentWidth - 10);

      // Height calculation with clear separation:
      // Top padding 3mm + Label 4.5mm + Gap 1.5mm + Content lines + Bottom padding 3mm
      const labelH = 4.5;
      const contentH = textLines.length * 4.5;
      const itemHeight = 3 + labelH + 1.5 + contentH + 3;

      ensureSpace(itemHeight + 2);

      // Background card
      doc.setFillColor(250, 250, 252);
      doc.setDrawColor(230, 235, 242);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, currentY, contentWidth, itemHeight, 1.5, 1.5, 'FD');

      // Left green vertical indicator line
      doc.setFillColor(5, 150, 105);
      doc.rect(marginX, currentY, 2, itemHeight, 'F');

      // Draw Label on Line 1 in Bold Emerald
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.text(labelText, marginX + 5, currentY + 5);

      // Draw Value lines on Line 2+ (indented and below the label, ZERO OVERLAP)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(30, 41, 59); // Slate 800
      doc.text(textLines, marginX + 5, currentY + 5 + labelH + 1.5);

      currentY += itemHeight + 2.5;
    }
    currentY += 2;

    // ─────────────────────────────────────────────────────────────
    // 3. DETALHAMENTO DA AÇÃO
    // ─────────────────────────────────────────────────────────────
    const detalhamentoText = w.description || w.how || w.what || 'Não informado';
    drawSubSectionHeader('DETALHAMENTO DA AÇÃO');

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(30, 41, 59);

    // Split paragraphs preserving linebreaks
    const paragraphs = detalhamentoText.split('\n');
    for (const p of paragraphs) {
      const trimmed = p.trim();
      if (!trimmed) {
        currentY += 2;
        continue;
      }
      const lines = doc.splitTextToSize(trimmed, contentWidth - 4);
      for (const line of lines) {
        ensureSpace(6);
        doc.text(line, marginX + 3, currentY + 4);
        currentY += 4.8;
      }
      currentY += 1.5;
    }
    currentY += 3;

    // ─────────────────────────────────────────────────────────────
    // 4. PARTICIPANTES (Clean two-column layout with no collisions)
    // ─────────────────────────────────────────────────────────────
    const participantList = (w.participants || []).map(pid => 
      resolveParticipant(pid, elderly, communityElderly, caregivers)
    );

    drawSubSectionHeader(`PARTICIPANTES (Total: ${participantList.length} pessoa${participantList.length === 1 ? '' : 's'})`);

    if (participantList.length === 0) {
      ensureSpace(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text('Nenhum participante nominal registrado para esta atividade.', marginX + 3, currentY + 4);
      currentY += 8;
    } else {
      // 2 columns with wrapped text per column
      const colWPart = (contentWidth - 6) / 2;

      for (let i = 0; i < participantList.length; i += 2) {
        const p1 = participantList[i];
        const p2 = participantList[i + 1];

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);

        const p1Lines = p1 ? doc.splitTextToSize(`• ${p1.name} (${p1.profile})`, colWPart - 4) : [];
        const p2Lines = p2 ? doc.splitTextToSize(`• ${p2.name} (${p2.profile})`, colWPart - 4) : [];

        const rowHeight = Math.max(p1Lines.length, p2Lines.length, 1) * 4.4 + 1.5;
        ensureSpace(rowHeight + 2);

        if (p1) {
          doc.setTextColor(15, 23, 42);
          doc.text(p1Lines, marginX + 3, currentY + 3.8);
        }

        if (p2) {
          doc.setTextColor(15, 23, 42);
          doc.text(p2Lines, marginX + colWPart + 6, currentY + 3.8);
        }

        currentY += rowHeight;
      }
      currentY += 3;
    }

    // ─────────────────────────────────────────────────────────────
    // 5. COLABORADORES DA AÇÃO (Clean 2-line cards, NO OVERLAPPING)
    // ─────────────────────────────────────────────────────────────
    const rawCoWorkers = w.coWorkers || [];
    const resolvedCoWorkers = rawCoWorkers.map(id => resolveCollaborator(id, professionals, users));

    drawSubSectionHeader(`COLABORADORES DA AÇÃO (Equipe Multidisciplinar: ${resolvedCoWorkers.length})`);

    if (resolvedCoWorkers.length === 0) {
      ensureSpace(8);
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Atividade conduzida diretamente pelo facilitador responsável (${w.who || 'Equipe'}).`, marginX + 3, currentY + 4);
      currentY += 8;
    } else {
      for (const cw of resolvedCoWorkers) {
        const cardHeight = 11;
        ensureSpace(cardHeight + 2);

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.setLineWidth(0.3);
        doc.roundedRect(marginX + 2, currentY, contentWidth - 4, cardHeight, 1.5, 1.5, 'FD');

        // Line 1: Collaborator Name
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(15, 23, 42);
        doc.text(`• ${cw.name}`, marginX + 5, currentY + 4.5);

        // Line 2: Role and Institution (never colliding with line 1)
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(4, 120, 87); // Emerald 700
        doc.text(`Função / Cargo: ${cw.role} (${cw.institution})`, marginX + 8, currentY + 8.8);

        currentY += cardHeight + 2.5;
      }
      currentY += 2;
    }

    // ─────────────────────────────────────────────────────────────
    // 6. REGISTRO FOTOGRÁFICO
    // ─────────────────────────────────────────────────────────────
    const validPhotos = (w.photos || []).filter(p => typeof p === 'string' && p.length > 0);

    if (validPhotos.length > 0) {
      drawSubSectionHeader(`REGISTRO FOTOGRÁFICO (${validPhotos.length} foto${validPhotos.length === 1 ? '' : 's'} anexada${validPhotos.length === 1 ? '' : 's'})`, '📷');

      // Grid of 3 photos per row (or 2 if only 2)
      const photosPerRow = validPhotos.length === 2 ? 2 : 3;
      const photoGap = 4;
      const photoWidth = (contentWidth - photoGap * (photosPerRow - 1)) / photosPerRow;
      const photoHeight = photosPerRow === 2 ? 55 : 40; // Maintain pleasant ~4:3 aspect ratio

      for (let i = 0; i < validPhotos.length; i += photosPerRow) {
        ensureSpace(photoHeight + 6);
        const rowPhotos = validPhotos.slice(i, i + photosPerRow);

        for (let j = 0; j < rowPhotos.length; j++) {
          const photoUrl = rowPhotos[j];
          const px = marginX + j * (photoWidth + photoGap);
          const py = currentY;

          // Placeholder background box
          doc.setFillColor(241, 245, 249);
          doc.setDrawColor(203, 213, 225);
          doc.setLineWidth(0.3);
          doc.roundedRect(px, py, photoWidth, photoHeight, 2, 2, 'FD');

          const loadedImg = preloadedPhotosMap.get(photoUrl);
          if (loadedImg) {
            try {
              // Calculate natural aspect ratio
              const natW = loadedImg.naturalWidth || loadedImg.width || 4;
              const natH = loadedImg.naturalHeight || loadedImg.height || 3;
              const natRatio = natW / natH;
              const boxRatio = photoWidth / photoHeight;

              let drawW = photoWidth;
              let drawH = photoHeight;
              let drawX = px;
              let drawY = py;

              if (natRatio > boxRatio) {
                // Image is wider than box
                drawH = photoWidth / natRatio;
                drawY = py + (photoHeight - drawH) / 2;
              } else {
                // Image is taller than box
                drawW = photoHeight * natRatio;
                drawX = px + (photoWidth - drawW) / 2;
              }

              doc.addImage(loadedImg, 'JPEG', drawX + 0.5, drawY + 0.5, drawW - 1, drawH - 1);
            } catch (err) {
              console.warn('Erro ao desenhar imagem no PDF:', err);
              doc.setFont('helvetica', 'italic');
              doc.setFontSize(7);
              doc.setTextColor(148, 163, 184);
              doc.text('[Imagem Anexada]', px + photoWidth / 2, py + photoHeight / 2, { align: 'center' });
            }
          } else {
            doc.setFont('helvetica', 'italic');
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text('[Imagem Registrada]', px + photoWidth / 2, py + photoHeight / 2, { align: 'center' });
          }
        }

        currentY += photoHeight + 5;
      }
      currentY += 2;
    }

    // Bottom spacing and card divider between activities
    ensureSpace(12);
    doc.setDrawColor(226, 232, 240); // slate 200
    doc.setLineWidth(0.4);
    doc.line(marginX, currentY + 3, marginX + contentWidth, currentY + 3);
    currentY += 10;
  }

  // ─────────────────────────────────────────────────────────────
  // SIGNATURE SECTION ON LAST PAGE
  // ─────────────────────────────────────────────────────────────
  ensureSpace(34);
  currentY += 8;

  const sigStartX = pageWidth / 2 - 45;
  const sigEndX = pageWidth / 2 + 45;

  doc.setDrawColor(100, 116, 139); // slate 500
  doc.setLineWidth(0.5);
  doc.line(sigStartX, currentY + 12, sigEndX, currentY + 12);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(15, 23, 42);
  doc.text('Assinatura do Profissional Responsável', pageWidth / 2, currentY + 17, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.setTextColor(100, 116, 139);
  doc.text('Casa OAMI — Opera Assistenza Malati Impediti', pageWidth / 2, currentY + 21, { align: 'center' });

  // ─────────────────────────────────────────────────────────────
  // STAMP HEADERS & FOOTERS ON ALL PAGES
  // ─────────────────────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  const emissionDateStr = format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR });
  const periodTextStr = startDate && endDate ? `${startDate} até ${endDate}` : (periodLabel || 'Histórico Geral');

  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);

    // ──────────────── PAGE 1: FULL INSTITUTIONAL HEADER ────────────────
    if (i === 1) {
      // Top Emerald accent bar
      doc.setFillColor(5, 150, 105); // Emerald 600
      doc.rect(marginX, 8, contentWidth, 2.5, 'F');

      let textStartX = marginX;
      if (logoImg) {
        try {
          doc.addImage(logoImg, 'JPEG', marginX, 13, 16, 16);
          textStartX = marginX + 20;
        } catch {
          textStartX = marginX;
        }
      }

      // Institution Name
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // slate 900
      doc.text(INSTITUTION_NAME, textStartX, 17);

      // CNPJ & Address
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(100, 116, 139);
      doc.text(`CNPJ: ${INSTITUTION_CNPJ} • ${INSTITUTION_ADDRESS}`, textStartX, 21.5);
      doc.text('SGPF OAMI — Relatório Oficial de Gestão e Atendimento', textStartX, 25.5);

      // Title
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.text('RELATÓRIO DE OFICINAS E CAPACITAÇÕES', textStartX, 31);

      // Right-aligned Metadata (on 2 distinct lines to never collide with left text)
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Período: ${periodTextStr}`, marginX + contentWidth, 16, { align: 'right' });
      doc.text(`Emissão: ${emissionDateStr}`, marginX + contentWidth, 20.5, { align: 'right' });

      // KPI & Filter Summary Box (Y = 35 to 49)
      doc.setFillColor(248, 250, 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.roundedRect(marginX, 35, contentWidth, 14, 2, 2, 'FD');

      const kpiColW = contentWidth / 4;

      // Col 1: Total Atividades
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('TOTAL DE ATIVIDADES', marginX + 4, 39.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalActivities}`, marginX + 4, 45.5);

      // Col 2: Oficinas
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('OFICINAS TERAPÊUTICAS', marginX + kpiColW + 4, 39.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(5, 150, 105);
      doc.text(`${totalWorkshops}`, marginX + kpiColW + 4, 45.5);

      // Col 3: Capacitações
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('CAPACITAÇÕES TÉCNICAS', marginX + kpiColW * 2 + 4, 39.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(124, 58, 237);
      doc.text(`${totalTrainings}`, marginX + kpiColW * 2 + 4, 45.5);

      // Col 4: Participantes Totais
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor(100, 116, 139);
      doc.text('PARTICIPANTES REGISTRADOS', marginX + kpiColW * 3 + 4, 39.5);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(15, 23, 42);
      doc.text(`${totalParticipants} pessoas`, marginX + kpiColW * 3 + 4, 45.5);
    } else {
      // ──────────────── PAGE 2+: REPEATING DISCREET HEADER ────────────────
      doc.setFillColor(5, 150, 105);
      doc.rect(marginX, 8, contentWidth, 1.5, 'F');

      let textStartX = marginX;
      if (logoImg) {
        try {
          doc.addImage(logoImg, 'JPEG', marginX, 11, 10, 10);
          textStartX = marginX + 13;
        } catch {
          textStartX = marginX;
        }
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(15, 23, 42);
      doc.text(INSTITUTION_NAME, textStartX, 15);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(4, 120, 87);
      doc.text(`RELATÓRIO DE OFICINAS E CAPACITAÇÕES • ${periodTextStr}`, textStartX, 19.5);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor(148, 163, 184);
      doc.text(`Emitido em ${emissionDateStr}`, marginX + contentWidth, 15, { align: 'right' });

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(marginX, 23, marginX + contentWidth, 23);
    }

    // ──────────────── FOOTER ON EVERY PAGE ────────────────
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.3);
    doc.line(marginX, 283, marginX + contentWidth, 283);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Documento gerado pelo Sistema OAMI • Data e hora da emissão: ${emissionDateStr} • Autenticidade Institucional`,
      marginX,
      288
    );

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor(100, 116, 139);
    doc.text(`Página ${i} de ${totalPages}`, marginX + contentWidth, 288, { align: 'right' });
  }

  // Save PDF file
  const safeName = fileName || `Relatorio_Oficinas_Capacitacoes_OAMI_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`;
  doc.save(safeName);
}
