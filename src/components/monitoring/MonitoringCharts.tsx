import React from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  CartesianGrid
} from 'recharts';
import { Activity, Sparkles, DollarSign, Package, TrendingUp, Users } from 'lucide-react';

interface MonitoringChartsProps {
  attendancesBySectorData: { sector: string; count: number; fill: string }[];
  activitiesBySectorData: { sector: string; count: number }[];
  donationsTimelineData: { date: string; amount: number; count: number }[];
  diapersTimelineData: { date: string; changes: number; production: number }[];
  stockMovementsData: { category: string; entries: number; exits: number }[];
  topActiveElderlyData: { name: string; attendances: number; activities: number }[];
}

export const MonitoringCharts: React.FC<MonitoringChartsProps> = ({
  attendancesBySectorData,
  activitiesBySectorData,
  donationsTimelineData,
  diapersTimelineData,
  stockMovementsData,
  topActiveElderlyData
}) => {
  return (
    <div className="space-y-8">
      {/* ROW 1: Attendances & Activities */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Attendances by Sector */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 flex items-center justify-center">
                <Activity size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Atendimentos por Setor Multidisciplinar</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            {attendancesBySectorData.length > 0 && attendancesBySectorData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendancesBySectorData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="sector" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" name="Atendimentos" radius={[6, 6, 0, 0]}>
                    {attendancesBySectorData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhum atendimento registrado no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Activities by Sector */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-100 dark:bg-amber-900/40 text-amber-600 flex items-center justify-center">
                <Sparkles size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Atividades e Oficinas Realizadas</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            {activitiesBySectorData.length > 0 && activitiesBySectorData.some(d => d.count > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={activitiesBySectorData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="sector" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Bar dataKey="count" name="Sessões" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhuma atividade ou oficina no período.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 2: Donations & Diapers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Donations Timeline */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Evolução de Arrecadações e Doações (R$)</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            {donationsTimelineData.length > 0 && donationsTimelineData.some(d => d.amount > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={donationsTimelineData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="donationGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={val => `R$ ${val}`} />
                  <Tooltip
                    formatter={(value: any) => [`R$ ${Number(value || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, 'Arrecadação']}
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#donationGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhum registro financeiro de doações no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Diaper Consumption vs Production */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-purple-100 dark:bg-purple-900/40 text-purple-600 flex items-center justify-center">
                <Package size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Fraldas: Consumo (Trocas) x Produção</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            {diapersTimelineData.length > 0 && diapersTimelineData.some(d => d.changes > 0 || d.production > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={diapersTimelineData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="changes" name="Trocas Realizadas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="production" name="Produção / Entrada" fill="#06b6d4" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhum registro de trocas ou produção de fraldas no período.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ROW 3: Stock Movement & Top Active Elderly */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Stock Movements by Category */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-teal-100 dark:bg-teal-900/40 text-teal-600 flex items-center justify-center">
                <TrendingUp size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Movimentação de Estoque: Entradas x Saídas</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            {stockMovementsData.length > 0 && stockMovementsData.some(d => d.entries > 0 || d.exits > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stockMovementsData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="category" angle={-25} textAnchor="end" interval={0} tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '8px' }} />
                  <Bar dataKey="entries" name="Entradas (Qtd)" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="exits" name="Saídas (Qtd)" fill="#ef4444" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhuma movimentação de estoque registrada no período selecionado.
              </div>
            )}
          </div>
        </div>

        {/* Top Active Elderly */}
        <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 dark:bg-indigo-900/40 text-indigo-600 flex items-center justify-center">
                <Users size={18} />
              </div>
              <h3 className="font-bold text-gray-800 dark:text-white text-base">Top Idosos com Maior Engajamento / Atendimentos</h3>
            </div>
          </div>
          <div className="h-64 w-full">
            {topActiveElderlyData.length > 0 && topActiveElderlyData.some(d => d.attendances > 0 || d.activities > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topActiveElderlyData} layout="vertical" margin={{ top: 5, right: 20, left: 40, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis type="number" tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={80} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#1f2937',
                      borderRadius: '12px',
                      border: 'none',
                      color: '#fff',
                      fontSize: '12px'
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="attendances" name="Atendimentos Técnicos" fill="#6366f1" radius={[0, 4, 4, 0]} />
                  <Bar dataKey="activities" name="Oficinas e Atividades" fill="#f59e0b" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs font-bold text-gray-400">
                Nenhum dado de atendimento no período para compor ranking.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
