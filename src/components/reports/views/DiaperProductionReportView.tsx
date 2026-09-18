import React, { useMemo } from 'react';
import {
  Package,
  Layers,
  Calendar,
  User,
  Activity,
  ArrowUpRight,
  Sparkles
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { DiaperRawProduction, DiaperFinalPacking, DiaperDonation } from '../../../types';
import { UnifiedReportItem } from '../reportsTypes';

interface Props {
  items: UnifiedReportItem[];
  rawProductions?: DiaperRawProduction[];
  finalPackings?: DiaperFinalPacking[];
  donations?: DiaperDonation[];
}

export const DiaperProductionReportView: React.FC<Props> = ({
  items,
  rawProductions = [],
  finalPackings = [],
  donations = []
}) => {
  const diaperItems = useMemo(() => {
    return items.filter(i => i.sectorKey === 'PRODUCAO_FRALDAS');
  }, [items]);

  // Production Metrics
  const stats = useMemo(() => {
    let totalProduced = 0;
    let totalDistributed = 0;
    const bySize: Record<string, number> = {};
    const byMonth: Record<string, number> = {};

    finalPackings.forEach(fp => {
      const qty = fp.quantityPackaged || 0;
      totalProduced += qty;
      const size = (fp.packageType || 'Tamanho Único').toUpperCase();
      bySize[size] = (bySize[size] || 0) + qty;

      if (fp.date || fp.createdAt) {
        const m = (fp.date || fp.createdAt).slice(0, 7);
        byMonth[m] = (byMonth[m] || 0) + qty;
      }
    });

    // Also include raw productions if finalPackings is empty
    if (finalPackings.length === 0) {
      rawProductions.forEach(rp => {
        const qty = rp.quantity || 0;
        totalProduced += qty;
        bySize['CORTE BRUTO'] = (bySize['CORTE BRUTO'] || 0) + qty;
        if (rp.date) {
          const m = rp.date.slice(0, 7);
          byMonth[m] = (byMonth[m] || 0) + qty;
        }
      });
    }

    donations.forEach(don => {
      totalDistributed += (don.quantity || 0);
    });

    return {
      totalProduced,
      totalDistributed,
      bySize,
      byMonth
    };
  }, [finalPackings, rawProductions, donations]);

  // Chart Data
  const chartData = useMemo(() => {
    return Object.entries(stats.byMonth)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, quantity]) => ({
        month,
        quantity
      }));
  }, [stats.byMonth]);

  return (
    <div id="diaper-production-report-view-container" className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-pink-100 text-pink-800 dark:bg-pink-950 dark:text-pink-300">
            <Package size={13} /> SGPF — Fábrica OAMI
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Relatório de Fabricação & Distribuição de Fraldas
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Controle de cortes, lotes embalados por tamanho e entregas a acolhidos e famílias.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-4 py-2 rounded-2xl bg-pink-50 dark:bg-pink-950/40 border border-pink-200 dark:border-pink-800 text-center">
            <div className="text-xl font-black text-pink-700 dark:text-pink-300">
              {stats.totalProduced} un
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Total Produzido</div>
          </div>
          <div className="px-4 py-2 rounded-2xl bg-gray-50 dark:bg-gray-800 text-center">
            <div className="text-xl font-black text-gray-900 dark:text-white">
              {stats.totalDistributed} un
            </div>
            <div className="text-[10px] uppercase font-bold text-gray-400">Distribuídas</div>
          </div>
        </div>
      </div>

      {/* Production by Size & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* By Size / Model */}
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Produção por Tamanho / Modelo
          </h4>

          {Object.keys(stats.bySize).length === 0 ? (
            <p className="text-xs text-gray-400 italic">Sem dados detalhados por modelo.</p>
          ) : (
            <div className="space-y-2.5">
              {Object.entries(stats.bySize).map(([size, qty]) => (
                <div key={size} className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/40 flex items-center justify-between">
                  <span className="font-bold text-xs text-gray-800 dark:text-gray-200">{size}</span>
                  <strong className="text-sm font-black text-pink-600 dark:text-pink-400">{qty} pacotes/un</strong>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Monthly Production Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
          <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Evolução da Produção Mensal (Unidades)
          </h4>

          {chartData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-gray-400">
              Sem dados suficientes para exibição do gráfico mensal.
            </div>
          ) : (
            <div className="h-48 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="quantity" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      {/* Table: DATA | OPERADOR / RESPONSÁVEL | TIPO DE PRODUÇÃO | QUANTIDADE | OBSERVAÇÕES */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
          <h4 className="text-sm font-black uppercase tracking-wider text-gray-900 dark:text-white">
            Histórico Analítico de Fabricação e Saídas
          </h4>
          <span className="text-xs text-gray-400 font-bold">{diaperItems.length} registros</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                <th className="py-3 px-4 w-28 text-center">Data</th>
                <th className="py-3 px-4 w-44">Operador / Responsável</th>
                <th className="py-3 px-4 w-44">Tipo de Produção</th>
                <th className="py-3 px-4 text-center w-28">Quantidade</th>
                <th className="py-3 px-4">Observações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
              {diaperItems.map(item => (
                <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                  <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                    {item.date ? item.date.slice(0, 10) : '—'}
                  </td>
                  <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                    {item.responsible || '—'}
                  </td>
                  <td className="py-3 px-4">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-pink-50 text-pink-700 dark:bg-pink-950 dark:text-pink-300 border border-pink-200 dark:border-pink-800">
                      {item.recordTypeLabel || item.typeOrStatus}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-center font-black text-pink-600 dark:text-pink-400 text-sm">
                    {item.quantityOrValue ? `${item.quantityOrValue} un` : '—'}
                  </td>
                  <td className="py-3 px-4 text-gray-600 dark:text-gray-400">
                    {item.description || item.conductOrOutcome || '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
