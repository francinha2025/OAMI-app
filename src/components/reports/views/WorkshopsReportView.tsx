import React, { useState } from 'react';
import {
  Sparkles,
  Users,
  Calendar,
  Eye,
  Camera,
  FileText,
  Search
} from 'lucide-react';
import { UnifiedReportItem } from '../reportsTypes';

interface Props {
  items: UnifiedReportItem[];
  onSelectItem: (item: UnifiedReportItem) => void;
}

export const WorkshopsReportView: React.FC<Props> = ({ items, onSelectItem }) => {
  const [searchTerm, setSearchTerm] = useState('');

  // Filter workshops & group activities
  const workshops = items.filter(i => i.sectorKey === 'OFICINAS' || i.recordType === 'OFICINA');

  const filtered = workshops.filter(w => {
    if (!searchTerm.trim()) return true;
    const lower = searchTerm.toLowerCase();
    return (
      w.title.toLowerCase().includes(lower) ||
      (w.responsible || '').toLowerCase().includes(lower) ||
      (w.targetOrParticipant || '').toLowerCase().includes(lower) ||
      (w.description || '').toLowerCase().includes(lower)
    );
  });

  return (
    <div id="workshops-report-view-container" className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            <Sparkles size={13} /> Atividades Coletivas & Convivência
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Oficinas Terapêuticas, Estimulação & Dinâmicas
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Registro de todas as oficinas pedagógicas, grupos de psicologia e atividades recreativas realizadas com os acolhidos.
          </p>
        </div>

        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar oficina..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Table (Item 9: DATA | ATIVIDADE | PROFISSIONAL / RESPONSÁVEL | PÚBLICO | OBJETIVO | PARTICIPANTES | AÇÕES) */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Sparkles size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">Nenhuma oficina encontrada no período selecionado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                  <th className="py-3 px-4 w-28 text-center">Data</th>
                  <th className="py-3 px-4 w-52">Atividade / Título</th>
                  <th className="py-3 px-4 w-44">Profissional / Responsável</th>
                  <th className="py-3 px-4 w-44">Público / Acolhidos</th>
                  <th className="py-3 px-4">Objetivo / Relato</th>
                  <th className="py-3 px-4 w-28 text-center">Participantes</th>
                  <th className="py-3 px-4 text-right print:hidden w-28">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filtered.map(w => (
                  <tr key={w.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    {/* Data */}
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                      {w.date ? w.date.slice(0, 10) : '—'}
                    </td>

                    {/* Atividade */}
                    <td className="py-3 px-4">
                      <div className="font-bold text-gray-900 dark:text-white text-xs">
                        {w.title}
                      </div>
                      <span className="inline-block mt-0.5 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
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
                        {w.description || w.conductOrOutcome || 'Atividade grupal e recreativa.'}
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
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
