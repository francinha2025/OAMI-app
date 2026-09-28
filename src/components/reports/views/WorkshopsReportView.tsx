import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  Calendar,
  Eye,
  Camera,
  FileText,
  Search,
  FileDown,
  Loader2,
  BookOpen,
  GraduationCap
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { UnifiedReportItem } from '../reportsTypes';
import { formatLocalDate } from '../../../lib/utils';
import { generateWorkshopsInstitutionalPdf } from '../../../lib/workshopsPdfGenerator';

interface Props {
  items: UnifiedReportItem[];
  startDate?: string;
  endDate?: string;
  elderly?: any[];
  communityElderly?: any[];
  caregivers?: any[];
  professionals?: any[];
  users?: any[];
  onSelectItem: (item: UnifiedReportItem) => void;
}

export const WorkshopsReportView: React.FC<Props> = ({
  items,
  startDate,
  endDate,
  elderly = [],
  communityElderly = [],
  caregivers = [],
  professionals = [],
  users = [],
  onSelectItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'OFICINA' | 'CAPACITACAO'>('ALL');
  const [isExportingPDF, setIsExportingPDF] = useState(false);

  // Filter both workshops and capacitações / group activities
  const allWorkshopsAndTrainings = items.filter(
    i => i.sectorKey === 'OFICINAS' || i.recordType === 'OFICINA' ||
         i.sectorKey === 'CAPACITACOES' || i.recordType === 'CAPACITACAO'
  );

  const totalCount = allWorkshopsAndTrainings.length;
  const workshopsCount = allWorkshopsAndTrainings.filter(i => i.sectorKey === 'OFICINAS' || i.recordType === 'OFICINA').length;
  const trainingsCount = allWorkshopsAndTrainings.filter(i => i.sectorKey === 'CAPACITACOES' || i.recordType === 'CAPACITACAO').length;

  const filtered = allWorkshopsAndTrainings.filter(w => {
    const isTraining = w.recordType === 'CAPACITACAO' || w.sectorKey === 'CAPACITACOES';
    if (filterType === 'OFICINA' && isTraining) return false;
    if (filterType === 'CAPACITACAO' && !isTraining) return false;

    if (!searchTerm.trim()) return true;
    const lower = searchTerm.toLowerCase();
    return (
      w.title.toLowerCase().includes(lower) ||
      (w.responsible || '').toLowerCase().includes(lower) ||
      (w.targetOrParticipant || '').toLowerCase().includes(lower) ||
      (w.description || '').toLowerCase().includes(lower) ||
      (w.conductOrOutcome || '').toLowerCase().includes(lower)
    );
  });

  const handleExportPDF = async () => {
    if (filtered.length === 0) return;
    setIsExportingPDF(true);
    try {
      await generateWorkshopsInstitutionalPdf({
        workshops: filtered,
        elderly,
        communityElderly,
        caregivers,
        professionals,
        users,
        startDate,
        endDate,
        periodLabel: startDate && endDate ? `${startDate} até ${endDate}` : undefined,
        fileName: `relatorio_oficinas_capacitacoes_${format(new Date(), 'yyyyMMdd_HHmm')}.pdf`
      });
    } catch (err) {
      console.error('Erro ao gerar PDF de oficinas:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  return (
    <div id="workshops-report-view-container" className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <BookOpen size={13} /> Oficinas & Capacitações
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Oficinas e Capacitações
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Registro consolidado de todas as oficinas terapêuticas, atividades recreativas em grupo e capacitações profissionais da Casa OAMI.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto">
          {/* Search Input */}
          <div className="relative flex-1 sm:w-64 min-w-[200px]">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título, facilitador..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />
          </div>

          {/* Download PDF Button */}
          <button
            onClick={handleExportPDF}
            disabled={isExportingPDF || filtered.length === 0}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs inline-flex items-center gap-2 shadow-sm transition-all disabled:opacity-50"
            title="Baixar Relatório em PDF"
          >
            {isExportingPDF ? <Loader2 size={14} className="animate-spin" /> : <FileDown size={14} />}
            Baixar Relatório em PDF
          </button>
        </div>
      </div>

      {/* Filter Tabs / Pills */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilterType('ALL')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'ALL'
              ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <span>Todos</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-black">
            {totalCount}
          </span>
        </button>

        <button
          onClick={() => setFilterType('OFICINA')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'OFICINA'
              ? 'bg-amber-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <Sparkles size={13} />
          <span>Oficinas</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-black">
            {workshopsCount}
          </span>
        </button>

        <button
          onClick={() => setFilterType('CAPACITACAO')}
          className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
            filterType === 'CAPACITACAO'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
          }`}
        >
          <GraduationCap size={13} />
          <span>Capacitações</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20 font-black">
            {trainingsCount}
          </span>
        </button>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <BookOpen size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">Nenhuma oficina ou capacitação encontrada no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                  <th className="py-3 px-4 w-28 text-center">Data</th>
                  <th className="py-3 px-4 w-28 text-center">Tipo</th>
                  <th className="py-3 px-4 w-52">Atividade / Título</th>
                  <th className="py-3 px-4 w-44">Profissional / Facilitador</th>
                  <th className="py-3 px-4 w-44">Público / Acolhidos</th>
                  <th className="py-3 px-4">Objetivo / Relato</th>
                  <th className="py-3 px-4 w-28 text-center">Participantes</th>
                  <th className="py-3 px-4 text-right print:hidden w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filtered.map(w => {
                  const isTraining = w.recordType === 'CAPACITACAO' || w.sectorKey === 'CAPACITACOES';

                  return (
                    <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      {/* Data */}
                      <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                        {w.date ? formatLocalDate(w.date) : '—'}
                      </td>

                      {/* Tipo */}
                      <td className="py-3 px-4 text-center whitespace-nowrap">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                          isTraining
                            ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                            : 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                        }`}>
                          {isTraining ? <GraduationCap size={11} /> : <Sparkles size={11} />}
                          {isTraining ? 'Capacitação' : 'Oficina'}
                        </span>
                      </td>

                      {/* Atividade */}
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900 dark:text-white text-xs">
                          {w.title}
                        </div>
                        <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300">
                          {w.sector}
                        </span>
                      </td>

                      {/* Profissional / Responsável */}
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {w.responsible || '—'}
                      </td>

                      {/* Público */}
                      <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                        <div className="truncate max-w-[170px]" title={w.targetOrParticipant}>
                          {w.targetOrParticipant || 'Acolhidos OAMI'}
                        </div>
                      </td>

                      {/* Objetivo / Relato */}
                      <td className="py-3 px-4">
                        <div className="text-gray-600 dark:text-gray-400 line-clamp-2">
                          {w.description || w.conductOrOutcome || 'Atividade institucional registrada.'}
                        </div>
                        {w.conductOrOutcome && w.description && (
                          <div className="text-[10px] text-amber-700 dark:text-amber-400 font-semibold line-clamp-1 mt-0.5">
                            {w.conductOrOutcome}
                          </div>
                        )}
                      </td>

                      {/* Participantes */}
                      <td className="py-3 px-4 text-center">
                        <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 inline-flex items-center gap-1">
                          <Users size={12} /> {w.participantsCount || 1}
                        </span>
                      </td>

                      {/* Ações */}
                      <td className="py-3 px-4 text-right print:hidden whitespace-nowrap">
                        <button
                          onClick={() => onSelectItem(w)}
                          className="px-2.5 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs inline-flex items-center gap-1 transition-all border border-amber-200 dark:border-amber-800"
                          title="Ver fotos, anexos e detalhes completos"
                        >
                          <Eye size={12} /> Ver Ficha
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
