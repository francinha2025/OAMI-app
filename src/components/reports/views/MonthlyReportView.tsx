import React, { useMemo } from 'react';
import {
  Calendar,
  TrendingUp,
  TrendingDown,
  Minus,
  Activity,
  Sparkles,
  Package,
  Boxes,
  Stethoscope,
  Brain,
  HeartHandshake,
  BookOpen,
  Apple
} from 'lucide-react';
import { UnifiedReportItem, MonthlySummaryItem } from '../reportsTypes';
import { buildMonthlyReportData } from '../reportsDataBuilder';

interface Props {
  items: UnifiedReportItem[];
}

export const MonthlyReportView: React.FC<Props> = ({ items }) => {
  const monthlyData = useMemo(() => {
    return buildMonthlyReportData(items);
  }, [items]);

  return (
    <div id="monthly-report-view-container" className="space-y-6">
      {/* Header */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Calendar size={13} /> Evolução Histórica da Casa OAMI
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Relatório Mensal Integrado & Comparativo
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Demonstrativo analítico mensal com comparativo de evolução percentual em relação ao período anterior.
          </p>
        </div>

        <div className="px-4 py-2 rounded-2xl bg-gray-50 dark:bg-gray-800 text-xs font-bold text-gray-700 dark:text-gray-300">
          {monthlyData.length} meses computados
        </div>
      </div>

      {/* Monthly Cards List */}
      {monthlyData.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 text-gray-400">
          <Calendar size={36} className="mx-auto mb-2 opacity-40" />
          <p className="font-bold text-sm">Nenhum dado mensal registrado no período selecionado.</p>
        </div>
      ) : (
        <div className="space-y-5">
          {monthlyData.map(month => {
            const hasDelta = month.deltaRecordsPercent !== undefined;
            const isPositive = (month.deltaRecordsAbsolute || 0) > 0;
            const isNegative = (month.deltaRecordsAbsolute || 0) < 0;

            return (
              <div
                key={month.monthKey}
                id={`month-card-${month.monthKey}`}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Month Title & Comparison Banner */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 bg-gray-50/50 dark:bg-gray-800/30">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                      <Calendar size={20} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        {month.monthLabel}
                      </h4>
                      <span className="text-xs font-semibold text-gray-500 dark:text-gray-400">
                        Referência: {month.monthKey}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {hasDelta && (
                      <div className={`px-3 py-1.5 rounded-2xl text-xs font-black flex items-center gap-1.5 ${
                        isPositive 
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800' 
                          : isNegative 
                            ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-400 border border-rose-200 dark:border-rose-800'
                            : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}>
                        {isPositive ? <TrendingUp size={14} /> : isNegative ? <TrendingDown size={14} /> : <Minus size={14} />}
                        <span>
                          {isPositive ? '+' : ''}{month.deltaRecordsPercent}% em relação ao mês anterior ({isPositive ? '+' : ''}{month.deltaRecordsAbsolute} reg.)
                        </span>
                      </div>
                    )}

                    <div className="px-4 py-1.5 rounded-2xl bg-gray-900 text-white dark:bg-white dark:text-gray-900 text-xs font-black">
                      {month.totalRecords} registros totais
                    </div>
                  </div>
                </div>

                {/* Indicators Grid */}
                <div className="p-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 text-xs">
                  {/* Enfermagem */}
                  <div className="p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/40">
                    <div className="flex items-center justify-between text-emerald-700 dark:text-emerald-400 font-bold mb-1">
                      <span>Enfermagem</span>
                      <Stethoscope size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.nursingRecords} <span className="text-xs font-normal text-gray-400">atend.</span>
                    </div>
                  </div>

                  {/* Fisioterapia */}
                  <div className="p-3.5 rounded-2xl bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40">
                    <div className="flex items-center justify-between text-blue-700 dark:text-blue-400 font-bold mb-1">
                      <span>Fisioterapia</span>
                      <Activity size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.physioRecords} <span className="text-xs font-normal text-gray-400">atend.</span>
                    </div>
                  </div>

                  {/* Psicologia */}
                  <div className="p-3.5 rounded-2xl bg-purple-50/60 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40">
                    <div className="flex items-center justify-between text-purple-700 dark:text-purple-400 font-bold mb-1">
                      <span>Psicologia</span>
                      <Brain size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.psychRecords} <span className="text-xs font-normal text-gray-400">atend.</span>
                    </div>
                  </div>

                  {/* Serviço Social */}
                  <div className="p-3.5 rounded-2xl bg-rose-50/60 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/40">
                    <div className="flex items-center justify-between text-rose-700 dark:text-rose-400 font-bold mb-1">
                      <span>Serviço Social</span>
                      <HeartHandshake size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.socialRecords} <span className="text-xs font-normal text-gray-400">atend.</span>
                    </div>
                  </div>

                  {/* Pedagogia */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold mb-1">
                      <span>Pedagogia</span>
                      <BookOpen size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.pedagogyRecords} <span className="text-xs font-normal text-gray-400">atend.</span>
                    </div>
                  </div>

                  {/* Nutrição */}
                  <div className="p-3.5 rounded-2xl bg-teal-50/60 dark:bg-teal-950/20 border border-teal-100 dark:border-teal-900/40">
                    <div className="flex items-center justify-between text-teal-700 dark:text-teal-400 font-bold mb-1">
                      <span>Nutrição</span>
                      <Apple size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.nutritionRecords} <span className="text-xs font-normal text-gray-400">atend.</span>
                    </div>
                  </div>

                  {/* Oficinas Realizadas */}
                  <div className="p-3.5 rounded-2xl bg-amber-50/60 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/40">
                    <div className="flex items-center justify-between text-amber-700 dark:text-amber-400 font-bold mb-1">
                      <span>Oficinas</span>
                      <Sparkles size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.workshopsCount} <span className="text-xs font-normal text-gray-400">sessões</span>
                    </div>
                  </div>

                  {/* Monitoramentos Clínicos */}
                  <div className="p-3.5 rounded-2xl bg-cyan-50/60 dark:bg-cyan-950/20 border border-cyan-100 dark:border-cyan-900/40">
                    <div className="flex items-center justify-between text-cyan-700 dark:text-cyan-400 font-bold mb-1">
                      <span>Monitoramentos</span>
                      <Activity size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.monitoringsCount} <span className="text-xs font-normal text-gray-400">registros</span>
                    </div>
                  </div>

                  {/* Movimentações de Estoque */}
                  <div className="p-3.5 rounded-2xl bg-lime-50/60 dark:bg-lime-950/20 border border-lime-100 dark:border-lime-900/40">
                    <div className="flex items-center justify-between text-lime-700 dark:text-lime-400 font-bold mb-1">
                      <span>Estoque</span>
                      <Boxes size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.stockMovementsCount} <span className="text-xs font-normal text-gray-400">movim.</span>
                    </div>
                  </div>

                  {/* Produção de Fraldas */}
                  <div className="p-3.5 rounded-2xl bg-pink-50/60 dark:bg-pink-950/20 border border-pink-100 dark:border-pink-900/40">
                    <div className="flex items-center justify-between text-pink-700 dark:text-pink-400 font-bold mb-1">
                      <span>Produção Fraldas</span>
                      <Package size={15} />
                    </div>
                    <div className="text-xl font-black text-gray-900 dark:text-white">
                      {month.diaperProducedCount} <span className="text-xs font-normal text-gray-400">un</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
