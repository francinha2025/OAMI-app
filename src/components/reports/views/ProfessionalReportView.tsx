import React, { useState, useMemo } from 'react';
import {
  UserCheck,
  Search,
  Eye,
  Calendar,
  ChevronDown,
  ChevronUp,
  Tag,
  Users,
  Activity,
  FileText
} from 'lucide-react';
import { UnifiedReportItem, ProfessionalGroupedReport } from '../reportsTypes';
import { buildProfessionalGroupedReport } from '../reportsDataBuilder';

interface Props {
  items: UnifiedReportItem[];
  onSelectItem: (item: UnifiedReportItem) => void;
}

export const ProfessionalReportView: React.FC<Props> = ({
  items,
  onSelectItem
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProf, setSelectedProf] = useState<string | 'ALL'>('ALL');
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const groupedReports = useMemo(() => {
    return buildProfessionalGroupedReport(items);
  }, [items]);

  const filteredReports = useMemo(() => {
    return groupedReports.filter(rep => {
      if (selectedProf !== 'ALL' && rep.professionalName !== selectedProf) {
        return false;
      }
      if (searchTerm.trim()) {
        const lower = searchTerm.toLowerCase();
        return (
          rep.professionalName.toLowerCase().includes(lower) ||
          rep.area.toLowerCase().includes(lower)
        );
      }
      return true;
    });
  }, [groupedReports, selectedProf, searchTerm]);

  const toggleProf = (name: string) => {
    setCollapsedMap(prev => ({ ...prev, [name]: !prev[name] }));
  };

  return (
    <div id="professional-report-view-container" className="space-y-6">
      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-0.5">
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Relatório de Atuação por Profissional
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Painel individualizado com métricas de produtividade, acolhidos atendidos e histórico técnico.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-64">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar profissional..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <select
            value={selectedProf}
            onChange={e => setSelectedProf(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todos os Profissionais ({groupedReports.length})</option>
            {groupedReports.map(p => (
              <option key={p.professionalName} value={p.professionalName}>
                {p.professionalName} ({p.totalRecords} reg.)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Professional List */}
      {filteredReports.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 text-gray-400">
          <UserCheck size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm">Nenhum profissional encontrado com os filtros aplicados.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredReports.map(prof => {
            const isCollapsed = !!collapsedMap[prof.professionalName];

            return (
              <div
                key={prof.professionalName}
                id={`prof-card-${prof.professionalName.replace(/\s+/g, '-').toLowerCase()}`}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Header Card */}
                <div
                  onClick={() => toggleProf(prof.professionalName)}
                  className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/60 dark:hover:bg-gray-800/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center font-black">
                      <UserCheck size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-black text-gray-900 dark:text-white">
                          PROFISSIONAL: {prof.professionalName}
                        </h4>
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                          {prof.area}
                        </span>
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                        Período: {prof.dateRange.start || '—'} até {prof.dateRange.end || '—'}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300">
                      {prof.totalRecords} registros
                    </span>
                    <span className="text-gray-400">
                      {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                    </span>
                  </div>
                </div>

                {/* Professional Indicators (Item 7 of user spec) */}
                <div className="px-6 py-3 bg-gray-50/70 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-black block">Total de Registros</span>
                    <strong className="text-gray-900 dark:text-white text-sm font-black">{prof.totalRecords}</strong>
                  </div>

                  <div>
                    <span className="text-[10px] text-gray-400 uppercase font-black block">Acolhidos Atendidos</span>
                    <strong className="text-gray-900 dark:text-white text-sm font-black">
                      {prof.elderlyAttendedCount > 0 ? `${prof.elderlyAttendedCount} acolhidos` : 'Geral / Coletivo'}
                    </strong>
                  </div>

                  <div className="sm:col-span-2">
                    <span className="text-[10px] text-gray-400 uppercase font-black block">Tipos de Atendimento</span>
                    <div className="flex flex-wrap gap-1.5 mt-0.5">
                      {Object.entries(prof.byRecordType).map(([type, count]) => (
                        <span key={type} className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300">
                          {type}: {count}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Table with all records */}
                {!isCollapsed && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
                      <thead>
                        <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                          <th className="py-2.5 px-4 w-28 text-center">Data</th>
                          <th className="py-2.5 px-4 w-36">Tipo</th>
                          <th className="py-2.5 px-4 w-44">Acolhido / Público</th>
                          <th className="py-2.5 px-4">Resumo do Registro</th>
                          <th className="py-2.5 px-4">Conduta / Desfecho</th>
                          <th className="py-2.5 px-4 text-right print:hidden w-24">Ações</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                        {prof.records.map(rec => (
                          <tr key={rec.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                            <td className="py-2.5 px-4 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                              {rec.date ? rec.date.slice(0, 10) : '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                                {rec.recordTypeLabel || rec.typeOrStatus || rec.recordType}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-gray-900 dark:text-white truncate max-w-[180px]">
                              {rec.targetOrParticipant || '—'}
                            </td>
                            <td className="py-2.5 px-4">
                              <div className="font-semibold text-gray-900 dark:text-white text-xs">
                                {rec.title}
                              </div>
                              {rec.description && (
                                <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                  {rec.description}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-4 text-[11px] text-emerald-700 dark:text-emerald-400 font-medium line-clamp-1">
                              {rec.conductOrOutcome || '—'}
                            </td>
                            <td className="py-2.5 px-4 text-right print:hidden whitespace-nowrap">
                              <button
                                onClick={() => onSelectItem(rec)}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1 transition-all"
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
            );
          })}
        </div>
      )}
    </div>
  );
};
