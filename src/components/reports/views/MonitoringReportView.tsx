import React, { useState, useMemo } from 'react';
import {
  Activity,
  Heart,
  Pill,
  Bandage,
  AlertTriangle,
  Layers,
  Search,
  Filter,
  Eye
} from 'lucide-react';
import { UnifiedReportItem } from '../reportsTypes';

interface Props {
  items: UnifiedReportItem[];
  onSelectItem: (item: UnifiedReportItem) => void;
}

export const MonitoringReportView: React.FC<Props> = ({ items, onSelectItem }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');

  const monitoringItems = useMemo(() => {
    return items.filter(i => i.sectorKey === 'MONITORAMENTO');
  }, [items]);

  // Statistical Summary
  const stats = useMemo(() => {
    let vitalSigns = 0;
    let dressings = 0;
    let medications = 0;
    let incidents = 0;
    let diaperChanges = 0;

    monitoringItems.forEach(item => {
      const title = (item.title || '').toLowerCase();
      const type = (item.recordTypeLabel || '').toLowerCase();

      if (title.includes('vital') || type.includes('vital')) vitalSigns += 1;
      else if (title.includes('curativo') || type.includes('curativo')) dressings += 1;
      else if (title.includes('medicamento') || type.includes('medicamento')) medications += 1;
      else if (title.includes('ocorrência') || type.includes('incidente')) incidents += 1;
      else if (title.includes('fralda') || type.includes('fralda')) diaperChanges += 1;
    });

    return {
      total: monitoringItems.length,
      vitalSigns,
      dressings,
      medications,
      incidents,
      diaperChanges
    };
  }, [monitoringItems]);

  const filteredItems = useMemo(() => {
    return monitoringItems.filter(i => {
      if (typeFilter !== 'ALL') {
        const title = (i.title || '').toLowerCase();
        const type = (i.recordTypeLabel || '').toLowerCase();
        if (typeFilter === 'VITALS' && !title.includes('vital') && !type.includes('vital')) return false;
        if (typeFilter === 'DRESSING' && !title.includes('curativo') && !type.includes('curativo')) return false;
        if (typeFilter === 'MEDS' && !title.includes('medicamento') && !type.includes('medicamento')) return false;
        if (typeFilter === 'INCIDENTS' && !title.includes('ocorrência') && !type.includes('incidente')) return false;
        if (typeFilter === 'DIAPERS' && !title.includes('fralda') && !type.includes('fralda')) return false;
      }

      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        return (
          i.title.toLowerCase().includes(lower) ||
          (i.targetOrParticipant || '').toLowerCase().includes(lower) ||
          (i.responsible || '').toLowerCase().includes(lower) ||
          (i.description || '').toLowerCase().includes(lower) ||
          (i.conductOrOutcome || '').toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [monitoringItems, typeFilter, searchTerm]);

  return (
    <div id="monitoring-report-view-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-cyan-100 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300">
            <Activity size={13} /> Assistência & Cuidados Diretos
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Relatório de Monitoramento Clínico dos Acolhidos
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Aferição de sinais vitais, curativos, medicações administradas, ocorrências do plantão e trocas.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-center">
          <div className="text-xl font-black text-cyan-700 dark:text-cyan-300">
            {stats.total}
          </div>
          <div className="text-[10px] uppercase font-bold text-gray-400">Registros Clínicos</div>
        </div>
      </div>

      {/* Resumo Estatístico (Item 12 requested: Com resumo estatístico) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Sinais Vitais</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white">{stats.vitalSigns}</strong>
          </div>
          <Heart size={20} className="text-rose-500" />
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Curativos</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white">{stats.dressings}</strong>
          </div>
          <Bandage size={20} className="text-amber-500" />
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Medicamentos</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white">{stats.medications}</strong>
          </div>
          <Pill size={20} className="text-purple-500" />
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Ocorrências</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white">{stats.incidents}</strong>
          </div>
          <AlertTriangle size={20} className="text-orange-500" />
        </div>

        <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex items-center justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold text-gray-400 block">Trocas de Fralda</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white">{stats.diaperChanges}</strong>
          </div>
          <Layers size={20} className="text-teal-500" />
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="relative flex-1 sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por acolhido ou profissional..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-cyan-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={typeFilter}
            onChange={e => setTypeFilter(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-cyan-500"
          >
            <option value="ALL">Todos os Tipos ({monitoringItems.length})</option>
            <option value="VITALS">Sinais Vitais ({stats.vitalSigns})</option>
            <option value="DRESSING">Curativos ({stats.dressings})</option>
            <option value="MEDS">Medicamentos ({stats.medications})</option>
            <option value="INCIDENTS">Ocorrências ({stats.incidents})</option>
            <option value="DIAPERS">Trocas de Fralda ({stats.diaperChanges})</option>
          </select>
        </div>
      </div>

      {/* Table (Item 12: DATA | TIPO | ACOLHIDO | PROFISSIONAL | RESULTADO / OBSERVAÇÃO | CONDUTA | AÇÕES) */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="p-12 text-center text-gray-400">
            <Activity size={36} className="mx-auto mb-2 opacity-40" />
            <p className="font-bold text-sm">Nenhum registro de monitoramento localizado.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                  <th className="py-3 px-4 w-28 text-center">Data</th>
                  <th className="py-3 px-4 w-36">Tipo</th>
                  <th className="py-3 px-4 w-44">Acolhido</th>
                  <th className="py-3 px-4 w-44">Profissional</th>
                  <th className="py-3 px-4">Resultado / Observação</th>
                  <th className="py-3 px-4">Conduta</th>
                  <th className="py-3 px-4 text-right print:hidden w-24">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {filteredItems.map(item => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                    {/* Data */}
                    <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                      {item.date ? item.date.slice(0, 10) : '—'}
                    </td>

                    {/* Tipo */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-cyan-50 text-cyan-800 dark:bg-cyan-950 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                        {item.recordTypeLabel || item.title}
                      </span>
                    </td>

                    {/* Acolhido */}
                    <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                      {item.targetOrParticipant || '—'}
                    </td>

                    {/* Profissional */}
                    <td className="py-3 px-4 font-medium text-gray-700 dark:text-gray-300">
                      {item.responsible || '—'}
                    </td>

                    {/* Resultado / Observação */}
                    <td className="py-3 px-4 font-mono text-gray-900 dark:text-gray-100">
                      {item.description || '—'}
                    </td>

                    {/* Conduta */}
                    <td className="py-3 px-4 text-emerald-700 dark:text-emerald-400 font-medium">
                      {item.conductOrOutcome || '—'}
                    </td>

                    {/* Ações */}
                    <td className="py-3 px-4 text-right print:hidden whitespace-nowrap">
                      <button
                        onClick={() => onSelectItem(item)}
                        className="px-2.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 dark:bg-cyan-950/40 dark:hover:bg-cyan-900/60 text-cyan-700 dark:text-cyan-300 font-bold text-xs inline-flex items-center gap-1 transition-all"
                      >
                        <Eye size={12} /> Ver
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
