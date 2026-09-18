import React, { useMemo } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Activity,
  Users,
  Award,
  Sparkles,
  Package,
  Boxes,
  GraduationCap,
  HeartHandshake
} from 'lucide-react';
import { UnifiedReportItem, GeneralReportMetrics } from '../reportsTypes';
import { StockProduct, StockMovement, DiaperDonation } from '../../../types';

interface Props {
  items: UnifiedReportItem[];
  metrics: GeneralReportMetrics;
  stockProducts?: StockProduct[];
  stockMovements?: StockMovement[];
  diaperDonations?: DiaperDonation[];
}

const PALETTE = [
  '#10b981', // emerald
  '#3b82f6', // blue
  '#a855f7', // purple
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#06b6d4', // cyan
  '#84cc16', // lime
  '#ec4899', // pink
  '#6366f1', // indigo
  '#64748b'  // slate
];

export const IndicatorsAndChartsView: React.FC<Props> = ({
  items,
  metrics,
  stockProducts = [],
  stockMovements = [],
  diaperDonations = []
}) => {
  // 14. INDICADORES DO PERÍODO
  // 1. Total de atendimentos por setor
  const sectorCounts = useMemo(() => {
    return Object.entries(metrics.sectorCounts)
      .map(([sector, count]) => ({ sector, count: Number(count) || 0 }))
      .sort((a, b) => b.count - a.count);
  }, [metrics.sectorCounts]);

  // 2. Acolhidos mais atendidos
  const topElderly = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      if (item.targetOrParticipant && !item.targetOrParticipant.includes('Turno') && !item.targetOrParticipant.includes('Item')) {
        map.set(item.targetOrParticipant, (map.get(item.targetOrParticipant) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [items]);

  // 3. Profissionais com mais registros
  const topProfessionals = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(item => {
      if (item.responsible && item.responsible !== 'Responsável não informado') {
        map.set(item.responsible, (map.get(item.responsible) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [items]);

  // 9. Produto mais consumido
  const topConsumedProduct = useMemo(() => {
    const map = new Map<string, { quantity: number; unit: string }>();
    stockMovements
      .filter(m => m.type === 'SAIDA')
      .forEach(m => {
        const name = m.productName || 'Produto';
        const current = map.get(name) || { quantity: 0, unit: 'un' };
        current.quantity += (m.quantity || 0);
        map.set(name, current);
      });

    const list = Array.from(map.entries())
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.quantity - a.quantity);

    return list[0] || { name: 'Sem saídas no período', quantity: 0, unit: 'un' };
  }, [stockMovements]);

  // 15. GRÁFICOS
  // Gráfico 1: Atendimentos por setor (barras)
  const chartSectorData = useMemo(() => {
    return sectorCounts.slice(0, 8).map(s => ({
      name: s.sector.length > 15 ? s.sector.slice(0, 13) + '...' : s.sector,
      fullName: s.sector,
      registros: s.count
    }));
  }, [sectorCounts]);

  // Gráfico 2: Evolução mensal dos atendimentos (linha)
  const chartMonthlyEvolution = useMemo(() => {
    const map = new Map<string, number>();
    items.forEach(i => {
      if (i.date) {
        const m = i.date.slice(0, 7);
        map.set(m, (map.get(m) || 0) + 1);
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, total]) => ({
        mes: month,
        atendimentos: total
      }));
  }, [items]);

  // Gráfico 3: Distribuição por profissional (pizza)
  const chartProfDistribution = useMemo(() => {
    return topProfessionals.map((p, idx) => ({
      name: p.name,
      value: p.count,
      color: PALETTE[idx % PALETTE.length]
    }));
  }, [topProfessionals]);

  // Gráfico 4: Produção mensal de fraldas (barras)
  const chartDiaperMonthly = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => i.sectorKey === 'PRODUCAO_FRALDAS' && i.recordType === 'PRODUCAO').forEach(i => {
      if (i.date) {
        const m = i.date.slice(0, 7);
        const qty = typeof i.quantityOrValue === 'number' ? i.quantityOrValue : parseInt(String(i.quantityOrValue || 0), 10) || 0;
        map.set(m, (map.get(m) || 0) + qty);
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, fraldas]) => ({
        mes: month,
        fraldas
      }));
  }, [items]);

  // Gráfico 5: Participação em oficinas ao longo dos meses
  const chartWorkshopsMonthly = useMemo(() => {
    const map = new Map<string, number>();
    items.filter(i => i.sectorKey === 'OFICINAS').forEach(i => {
      if (i.date) {
        const m = i.date.slice(0, 7);
        map.set(m, (map.get(m) || 0) + (i.participantsCount || 1));
      }
    });
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, participantes]) => ({
        mes: month,
        participantes
      }));
  }, [items]);

  return (
    <div id="indicators-and-charts-container" className="space-y-8">
      {/* 14. INDICADORES DO PERÍODO (10 indicators) */}
      <div className="space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
            <Award size={13} /> Painel Gerencial de Indicadores
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            10 Indicadores Consolidados do Período
          </h3>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {/* 1. Atendimentos Individuais */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">1. Atendimentos</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white block mt-1">{metrics.totalAttendances}</strong>
            <span className="text-[10px] text-gray-400">Evoluções individuais</span>
          </div>

          {/* 2. Acolhido Mais Atendido */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">2. Mais Atendido</span>
            <strong className="text-sm font-black text-gray-900 dark:text-white block mt-1 truncate" title={topElderly[0]?.name}>
              {topElderly[0]?.name || '—'}
            </strong>
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
              {topElderly[0]?.count ? `${topElderly[0]?.count} atendimentos` : 'Sem registros'}
            </span>
          </div>

          {/* 3. Profissional com Mais Registros */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">3. Mais Lançamentos</span>
            <strong className="text-sm font-black text-gray-900 dark:text-white block mt-1 truncate" title={topProfessionals[0]?.name}>
              {topProfessionals[0]?.name || '—'}
            </strong>
            <span className="text-[10px] text-blue-600 dark:text-blue-400 font-bold">
              {topProfessionals[0]?.count ? `${topProfessionals[0]?.count} registros` : 'Sem registros'}
            </span>
          </div>

          {/* 4. Total de Oficinas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">4. Oficinas Realizadas</span>
            <strong className="text-2xl font-black text-amber-600 dark:text-amber-400 block mt-1">{metrics.totalWorkshops}</strong>
            <span className="text-[10px] text-gray-400">Sessões coletivas</span>
          </div>

          {/* 5. Total de Participantes em Oficinas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">5. Participantes Oficinas</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white block mt-1">{metrics.totalParticipants}</strong>
            <span className="text-[10px] text-gray-400">Presenças totais</span>
          </div>

          {/* 6. Total de Fraldas Produzidas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">6. Fraldas Produzidas</span>
            <strong className="text-2xl font-black text-pink-600 dark:text-pink-400 block mt-1">{metrics.totalDiaperProduced}</strong>
            <span className="text-[10px] text-gray-400">Unidades SGPF</span>
          </div>

          {/* 7. Total de Fraldas Distribuídas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">7. Fraldas Doadas</span>
            <strong className="text-2xl font-black text-gray-900 dark:text-white block mt-1">{metrics.totalDiaperDistributed}</strong>
            <span className="text-[10px] text-gray-400">Doações realizadas</span>
          </div>

          {/* 8. Total de Movimentações de Estoque */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">8. Mov. de Estoque</span>
            <strong className="text-2xl font-black text-emerald-600 dark:text-emerald-400 block mt-1">{metrics.totalStockMovements}</strong>
            <span className="text-[10px] text-gray-400">Entradas e saídas</span>
          </div>

          {/* 9. Produto Mais Consumido */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">9. Mais Consumido</span>
            <strong className="text-sm font-black text-gray-900 dark:text-white block mt-1 truncate" title={topConsumedProduct.name}>
              {topConsumedProduct.name}
            </strong>
            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">
              {topConsumedProduct.quantity > 0 ? `${topConsumedProduct.quantity} ${topConsumedProduct.unit}` : 'Sem consumo'}
            </span>
          </div>

          {/* 10. Total de Capacitações Realizadas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">10. Capacitações</span>
            <strong className="text-2xl font-black text-purple-600 dark:text-purple-400 block mt-1">{metrics.totalTrainings}</strong>
            <span className="text-[10px] text-gray-400">Formações técnicas</span>
          </div>
        </div>
      </div>

      {/* 15. OS 5 GRÁFICOS GERENCIAIS */}
      <div className="space-y-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
            <TrendingUp size={13} /> Visualização Analítica
          </span>
          <h3 className="text-xl font-black text-gray-900 dark:text-white mt-1">
            Gráficos Gerenciais do Período
          </h3>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico 1: Atendimentos por setor (barras) */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              1. Atendimentos por Setor / Área Técnica
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartSectorData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="name" tick={{ fontSize: 9 }} angle={-25} textAnchor="end" interval={0} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="registros" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 2: Evolução mensal dos atendimentos (linha) */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              2. Evolução Mensal dos Registros
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartMonthlyEvolution} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Line type="monotone" dataKey="atendimentos" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 3: Distribuição por Profissional (pizza / barras) */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              3. Distribuição dos Atendimentos por Profissional
            </h4>
            <div className="h-64 w-full flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartProfDistribution}
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    dataKey="value"
                    label={({ name, percent }) => `${name.slice(0, 10)} (${((percent || 0) * 100).toFixed(0)}%)`}
                    labelLine={false}
                  >
                    {chartProfDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 4: Produção mensal de fraldas (barras) */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              4. Produção Mensal de Fraldas (Unidades)
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartDiaperMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="fraldas" fill="#ec4899" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Gráfico 5: Participação em oficinas ao longo dos meses */}
          <div className="lg:col-span-2 bg-white dark:bg-gray-900 rounded-3xl p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-3">
            <h4 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
              5. Participação de Acolhidos em Oficinas ao Longo dos Meses
            </h4>
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartWorkshopsMonthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.15} />
                  <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="participantes" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
