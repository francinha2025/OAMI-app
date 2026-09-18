import React, { useState, useMemo } from 'react';
import {
  User,
  Search,
  Eye,
  Calendar,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Activity,
  Brain,
  HeartHandshake,
  BookOpen,
  Apple,
  FileText
} from 'lucide-react';
import { UnifiedReportItem, ElderlyGroupedReport } from '../reportsTypes';
import { Elderly } from '../../../types';
import { buildElderlyGroupedReport } from '../reportsDataBuilder';

interface Props {
  items: UnifiedReportItem[];
  elderlyList: Elderly[];
  onSelectItem: (item: UnifiedReportItem) => void;
}

export const ElderlyReportView: React.FC<Props> = ({
  items,
  elderlyList,
  onSelectItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElderlyId, setSelectedElderlyId] = useState<string | 'ALL'>('ALL');
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const groupedReports = useMemo(() => {
    return buildElderlyGroupedReport(items, elderlyList);
  }, [items, elderlyList]);

  const filteredReports = useMemo(() => {
    return groupedReports.filter(rep => {
      if (selectedElderlyId !== 'ALL' && rep.elderlyId !== selectedElderlyId) {
        return false;
      }
      if (searchTerm.trim()) {
        return rep.elderlyName.toLowerCase().includes(searchTerm.toLowerCase());
      }
      return true;
    });
  }, [groupedReports, selectedElderlyId, searchTerm]);

  const toggleElderly = (id: string) => {
    setCollapsedMap(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSectorSection = (
    sectorTitle: string,
    records: UnifiedReportItem[],
    Icon: React.ComponentType<{ size?: number; className?: string }>,
    accentClass: string
  ) => {
    if (records.length === 0) return null;

    return (
      <div className="space-y-2 mt-4">
        <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
          <div className={`p-1 rounded-lg ${accentClass}`}>
            <Icon size={14} />
          </div>
          <span>{sectorTitle} ({records.length} registros)</span>
        </div>

        <div className="overflow-x-auto border border-gray-100 dark:border-gray-800 rounded-2xl">
          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                <th className="py-2.5 px-3 w-24 text-center">Data</th>
                <th className="py-2.5 px-3 w-40">Profissional</th>
                <th className="py-2.5 px-3 w-36">Tipo de Atendimento</th>
                <th className="py-2.5 px-3">Resumo do Atendimento</th>
                <th className="py-2.5 px-3">Conduta / Observação</th>
                <th className="py-2.5 px-3 text-right print:hidden w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {records.map(rec => (
                <tr key={rec.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                    {rec.date ? rec.date.slice(0, 10) : '—'}
                  </td>
                  <td className="py-2.5 px-3 font-bold text-gray-900 dark:text-white">
                    {rec.responsible || '—'}
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      {rec.recordTypeLabel || rec.typeOrStatus || rec.recordType}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="font-semibold text-gray-900 dark:text-white text-xs">
                      {rec.title}
                    </div>
                    {rec.description && (
                      <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                        {rec.description}
                      </div>
                    )}
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                      {rec.conductOrOutcome || '—'}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right print:hidden whitespace-nowrap">
                    <button
                      onClick={() => onSelectItem(rec)}
                      className="px-2 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1 transition-all"
                    >
                      <Eye size={11} /> Ver
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  return (
    <div id="elderly-report-view-container" className="space-y-6">
      {/* Search and Select Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Relatório Multidisciplinar por Acolhido
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Prontuário integrado agrupado pelo nome do acolhido com separação por especialidades.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          {/* Quick Search */}
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar acolhido..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Quick Select Filter */}
          <select
            value={selectedElderlyId}
            onChange={e => setSelectedElderlyId(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Acolhidos ({groupedReports.length})</option>
            {groupedReports.map(e => (
              <option key={e.elderlyId} value={e.elderlyId}>
                {e.elderlyName} ({e.totalRecords} reg.)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Elderly List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 text-gray-400">
          <User size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm">Nenhum atendimento encontrado para os filtros selecionados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReports.map(elderly => {
            const isCollapsed = !!collapsedMap[elderly.elderlyId];

            return (
              <div
                key={elderly.elderlyId}
                id={`elderly-card-${elderly.elderlyId}`}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Header */}
                <div
                  onClick={() => toggleElderly(elderly.elderlyId)}
                  className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-black">
                      <User size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-gray-900 dark:text-white">
                          ACOLHIDO: {elderly.elderlyName}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                          {elderly.totalRecords} atendimentos
                        </span>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        {elderly.sectors.nursing.length > 0 && <span>Enf: {elderly.sectors.nursing.length}</span>}
                        {elderly.sectors.physio.length > 0 && <span>• Fisio: {elderly.sectors.physio.length}</span>}
                        {elderly.sectors.psych.length > 0 && <span>• Psico: {elderly.sectors.psych.length}</span>}
                        {elderly.sectors.social.length > 0 && <span>• Social: {elderly.sectors.social.length}</span>}
                        {elderly.sectors.pedagogy.length > 0 && <span>• Pedag: {elderly.sectors.pedagogy.length}</span>}
                        {elderly.sectors.nutrition.length > 0 && <span>• Nutri: {elderly.sectors.nutrition.length}</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-gray-400">
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </div>
                </div>

                {/* Body: Sector by Sector */}
                {!isCollapsed && (
                  <div className="p-5 space-y-4">
                    {renderSectorSection('Enfermagem', elderly.sectors.nursing, Stethoscope, 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950 dark:text-emerald-300')}
                    {renderSectorSection('Fisioterapia', elderly.sectors.physio, Activity, 'bg-blue-50 text-blue-600 dark:bg-blue-950 dark:text-blue-300')}
                    {renderSectorSection('Psicologia', elderly.sectors.psych, Brain, 'bg-purple-50 text-purple-600 dark:bg-purple-950 dark:text-purple-300')}
                    {renderSectorSection('Serviço Social', elderly.sectors.social, HeartHandshake, 'bg-rose-50 text-rose-600 dark:bg-rose-950 dark:text-rose-300')}
                    {renderSectorSection('Pedagogia', elderly.sectors.pedagogy, BookOpen, 'bg-amber-50 text-amber-600 dark:bg-amber-950 dark:text-amber-300')}
                    {renderSectorSection('Nutrição', elderly.sectors.nutrition, Apple, 'bg-teal-50 text-teal-600 dark:bg-teal-950 dark:text-teal-300')}
                    {renderSectorSection('Demais Registros e Cuidados', elderly.sectors.other, FileText, 'bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
