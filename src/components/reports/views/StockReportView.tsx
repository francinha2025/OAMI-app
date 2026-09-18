import React, { useState, useMemo } from 'react';
import {
  Boxes,
  Calendar,
  Layers,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingDown,
  Search,
  Filter,
  PackageCheck
} from 'lucide-react';
import { StockProduct, StockMovement } from '../../../types';
import { MonthlyStockReport } from '../reportsTypes';
import { buildMonthlyStockConsumption } from '../reportsDataBuilder';

interface Props {
  products: StockProduct[];
  movements: StockMovement[];
  startDate: string;
  endDate: string;
}

export const StockReportView: React.FC<Props> = ({
  products,
  movements,
  startDate,
  endDate
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'consumption' | 'overview'>('consumption');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');

  // Build Monthly Consumption Data
  const monthlyConsumptionReports = useMemo(() => {
    return buildMonthlyStockConsumption(movements, products);
  }, [movements, products]);

  // Build Overview Table Data
  const overviewData = useMemo(() => {
    return products.map(prod => {
      const prodMovements = movements.filter(m => m.productId === prod.id || m.productName === prod.name);
      let entries = 0;
      let exits = 0;
      let returns = 0;

      prodMovements.forEach(m => {
        if (m.type === 'ENTRADA') entries += (m.quantity || 0);
        else if (m.type === 'SAIDA') exits += (m.quantity || 0);
        else if (m.type === 'DEVOLUCAO') returns += (m.quantity || 0);
      });

      return {
        id: prod.id,
        name: prod.name,
        category: prod.category || 'GERAL',
        unit: prod.unit || 'un',
        currentStock: prod.currentStock ?? (entries - exits + returns),
        entries,
        exits,
        returns
      };
    });
  }, [products, movements]);

  // Unique categories for filter
  const categoriesList = useMemo(() => {
    const set = new Set<string>();
    products.forEach(p => {
      if (p.category) set.add(p.category.toUpperCase());
    });
    return Array.from(set).sort();
  }, [products]);

  // Filtered Monthly Consumption
  const filteredMonthly = useMemo(() => {
    return monthlyConsumptionReports.map(month => {
      const filteredCategories = month.categories
        .filter(cat => {
          if (selectedCategory !== 'ALL' && cat.category !== selectedCategory) {
            return false;
          }
          return true;
        })
        .map(cat => {
          const filteredProds = cat.products.filter(p => {
            if (!searchTerm.trim()) return true;
            return p.productName.toLowerCase().includes(searchTerm.toLowerCase());
          });
          return {
            ...cat,
            products: filteredProds
          };
        })
        .filter(cat => cat.products.length > 0);

      return {
        ...month,
        categories: filteredCategories
      };
    }).filter(m => m.categories.length > 0);
  }, [monthlyConsumptionReports, selectedCategory, searchTerm]);

  return (
    <div id="stock-report-view-container" className="space-y-6">
      {/* Header with Sub-tab switcher */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <Boxes size={13} /> Gestão de Almoxarifado & Insumos
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Relatório de Estoque & Consumo Mensal
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Demonstrativo de consumo consolidado por mês e categoria, com soma de produtos e saldos.
          </p>
        </div>

        {/* Sub-tab Pills */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-gray-100 dark:bg-gray-800 self-start md:self-auto">
          <button
            onClick={() => setActiveSubTab('consumption')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'consumption'
                ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Consumo Mensal Consolidado
          </button>
          <button
            onClick={() => setActiveSubTab('overview')}
            className={`px-4 py-2 rounded-xl text-xs font-black transition-all ${
              activeSubTab === 'overview'
                ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
            }`}
          >
            Saldos & Movimentações
          </button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
        <div className="relative flex-1 sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar produto no estoque..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter size={14} className="text-gray-400" />
          <select
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value)}
            className="px-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">Todas as Categorias</option>
            {categoriesList.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
      </div>

      {/* 1. Sub-Tab: CONSUMO MENSAL (Item 10 requested explicitly) */}
      {activeSubTab === 'consumption' && (
        <div className="space-y-6 animate-in fade-in duration-150">
          {filteredMonthly.length === 0 ? (
            <div className="bg-white dark:bg-gray-900 rounded-3xl p-12 text-center border border-gray-100 dark:border-gray-800 text-gray-400">
              <Boxes size={36} className="mx-auto mb-2 opacity-40" />
              <p className="font-bold text-sm">Nenhum consumo registrado para os filtros informados.</p>
            </div>
          ) : (
            filteredMonthly.map(month => (
              <div
                key={month.monthKey}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
              >
                {/* Month Title Header */}
                <div className="p-5 border-b border-gray-100 dark:border-gray-800 bg-emerald-50/40 dark:bg-emerald-950/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-black">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <h4 className="text-base font-black text-gray-900 dark:text-white">
                        {month.monthLabel}
                      </h4>
                      <span className="text-xs text-emerald-700 dark:text-emerald-400 font-bold">
                        Consumo Consolidado de Insumos e Materiais
                      </span>
                    </div>
                  </div>

                  <span className="px-3 py-1 rounded-full text-xs font-black bg-white dark:bg-gray-800 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                    {month.categories.reduce((acc, c) => acc + c.products.length, 0)} itens consumidos
                  </span>
                </div>

                {/* Categories & Products Grouped List */}
                <div className="p-6 space-y-6">
                  {month.categories.map(cat => (
                    <div key={cat.category} className="space-y-2.5">
                      <div className="flex items-center gap-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
                        <h5 className="font-black text-xs uppercase tracking-wider text-gray-800 dark:text-gray-200">
                          {cat.category}
                        </h5>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {cat.products.map(p => (
                          <div
                            key={p.productName}
                            className="p-3.5 rounded-2xl bg-gray-50/70 dark:bg-gray-800/40 border border-gray-100 dark:border-gray-800 flex items-center justify-between"
                          >
                            <div>
                              <div className="font-bold text-gray-900 dark:text-white text-xs">
                                {p.productName}
                              </div>
                              <span className="text-[10px] text-gray-400 uppercase font-semibold">
                                Unidade: {p.unit}
                              </span>
                            </div>
                            <div className="text-right">
                              <span className="text-sm font-black text-emerald-700 dark:text-emerald-400">
                                {p.totalQuantity}
                              </span>
                              <span className="text-[11px] font-bold text-gray-500 ml-1">
                                {p.unit}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* 2. Sub-Tab: SALDOS & MOVIMENTAÇÕES GERAIS */}
      {activeSubTab === 'overview' && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden animate-in fade-in duration-150">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-800/60 text-gray-400 dark:text-gray-500 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                  <th className="py-3 px-4 w-48">Produto</th>
                  <th className="py-3 px-4 w-36">Categoria</th>
                  <th className="py-3 px-4 text-center w-28">Entradas (+)</th>
                  <th className="py-3 px-4 text-center w-28">Saídas / Consumo (-)</th>
                  <th className="py-3 px-4 text-center w-28">Devoluções</th>
                  <th className="py-3 px-4 text-center w-28">Saldo Atual</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                {overviewData
                  .filter(p => {
                    if (selectedCategory !== 'ALL' && p.category.toUpperCase() !== selectedCategory) return false;
                    if (searchTerm.trim()) return p.name.toLowerCase().includes(searchTerm.toLowerCase());
                    return true;
                  })
                  .map(p => (
                    <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        {p.name}
                      </td>
                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 rounded-lg text-[10px] font-bold bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                          {p.category}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-emerald-600 dark:text-emerald-400">
                        {p.entries > 0 ? `+${p.entries} ${p.unit}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-rose-600 dark:text-rose-400">
                        {p.exits > 0 ? `-${p.exits} ${p.unit}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-bold text-blue-600 dark:text-blue-400">
                        {p.returns > 0 ? `${p.returns} ${p.unit}` : '—'}
                      </td>
                      <td className="py-3 px-4 text-center font-black text-gray-900 dark:text-white">
                        {p.currentStock} {p.unit}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
