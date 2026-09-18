import React from 'react';
import {
  Activity,
  HeartHandshake,
  Sparkles,
  GraduationCap,
  Package,
  Layers,
  Users,
  CheckCircle2,
  Stethoscope,
  Brain,
  Smile,
  BookOpen,
  Apple,
  ShieldCheck,
  Building2,
  Boxes
} from 'lucide-react';
import { ExecutiveSummaryData, GeneralReportMetrics, SectorKey } from '../reportsTypes';

interface Props {
  data: ExecutiveSummaryData;
  metrics: GeneralReportMetrics;
  startDate: string;
  endDate: string;
  onSelectSector?: (key: SectorKey) => void;
}

const SECTOR_ICONS: Record<SectorKey, React.ComponentType<{ size?: number; className?: string }>> = {
  ENFERMAGEM: Stethoscope,
  FISIOTERAPIA: Activity,
  PSICOLOGIA: Brain,
  SERVICO_SOCIAL: HeartHandshake,
  PEDAGOGIA: BookOpen,
  NUTRICAO: Apple,
  EQUIPE_TECNICA: ShieldCheck,
  OFICINAS: Sparkles,
  MONITORAMENTO: Activity,
  ESTOQUE: Boxes,
  PRODUCAO_FRALDAS: Package,
  CAPACITACOES: GraduationCap,
  OUTRAS_AREAS: Building2
};

const SECTOR_ACCENTS: Record<SectorKey, { bg: string; text: string; border: string }> = {
  ENFERMAGEM: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
  FISIOTERAPIA: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  PSICOLOGIA: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  SERVICO_SOCIAL: { bg: 'bg-rose-50 dark:bg-rose-950/30', text: 'text-rose-700 dark:text-rose-300', border: 'border-rose-200 dark:border-rose-800' },
  PEDAGOGIA: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  NUTRICAO: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  EQUIPE_TECNICA: { bg: 'bg-indigo-50 dark:bg-indigo-950/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  OFICINAS: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
  MONITORAMENTO: { bg: 'bg-cyan-50 dark:bg-cyan-950/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  ESTOQUE: { bg: 'bg-lime-50 dark:bg-lime-950/30', text: 'text-lime-700 dark:text-lime-300', border: 'border-lime-200 dark:border-lime-800' },
  PRODUCAO_FRALDAS: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
  CAPACITACOES: { bg: 'bg-violet-50 dark:bg-violet-950/30', text: 'text-violet-700 dark:text-violet-300', border: 'border-violet-200 dark:border-violet-800' },
  OUTRAS_AREAS: { bg: 'bg-slate-50 dark:bg-slate-900/50', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' }
};

export const ExecutiveSummaryView: React.FC<Props> = ({
  data,
  metrics,
  startDate,
  endDate,
  onSelectSector
}) => {
  return (
    <div id="executive-summary-section" className="space-y-8 animate-in fade-in duration-200">
      {/* 1. Header Banner */}
      <div className="bg-gradient-to-r from-emerald-600 via-teal-700 to-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1.5 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-white/20 text-emerald-100">
              <CheckCircle2 size={13} /> Documento Gerencial da Casa OAMI
            </span>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight">
              RESUMO EXECUTIVO INTEGRADO
            </h2>
            <p className="text-emerald-100 text-xs sm:text-sm font-medium">
              Panorama consolidado das atividades multidisciplinares, produções, cuidados e atendimentos institucionais no período de <strong className="text-white">{startDate}</strong> até <strong className="text-white">{endDate}</strong>.
            </p>
          </div>

          <div className="flex flex-wrap sm:flex-nowrap items-center gap-3">
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">{data.totalRecords}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-200">Total de Registros</div>
            </div>
            <div className="px-5 py-3 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-center">
              <div className="text-2xl sm:text-3xl font-black text-white">{data.activeProfessionalsCount}</div>
              <div className="text-[10px] uppercase tracking-wider font-bold text-emerald-200">Profissionais Ativos</div>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Top Metric Highlights */}
      <div>
        <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500 mb-3">
          Principais Números do Período
        </h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {/* Atendimentos */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-blue-600 dark:text-blue-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Atendimentos</span>
              <Activity size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {data.totalAttendances}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Evoluções e consultas individuais</p>
          </div>

          {/* Oficinas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-amber-600 dark:text-amber-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Oficinas</span>
              <Sparkles size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {data.totalWorkshops}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">{metrics.totalParticipants} presenças registradas</p>
          </div>

          {/* Capacitações */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-purple-600 dark:text-purple-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Capacitações</span>
              <GraduationCap size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {data.totalTrainings}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Treinamentos e formações</p>
          </div>

          {/* Fraldas Produzidas */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-pink-600 dark:text-pink-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Fraldas Prod.</span>
              <Package size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {data.totalDiaperProduced} <span className="text-xs font-normal text-gray-400">un</span>
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Produção do laboratório SGPF</p>
          </div>

          {/* Movimentações de Estoque */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-emerald-600 dark:text-emerald-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Estoque</span>
              <Boxes size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {data.totalStockMovements}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Entradas e saídas de itens</p>
          </div>

          {/* Monitoramentos Clínicos */}
          <div className="p-4 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col justify-between">
            <div className="flex items-center justify-between text-teal-600 dark:text-teal-400 mb-2">
              <span className="text-[10px] font-black uppercase tracking-wider text-gray-400">Monitoramentos</span>
              <Activity size={18} />
            </div>
            <div className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white">
              {data.totalMonitorings}
            </div>
            <p className="text-[10px] text-gray-400 mt-1">Sinais, curativos, medicações</p>
          </div>
        </div>
      </div>

      {/* 3. Resumo por Área / Setor (Item 2 of user spec) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black uppercase tracking-wider text-gray-400 dark:text-gray-500">
            Resumo Operacional por Setor / Área Técnica
          </h3>
          <span className="text-xs text-gray-400">Clique no setor para filtrar ou navegar</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {data.sectors.map(sector => {
            const Icon = SECTOR_ICONS[sector.sectorKey] || Building2;
            const style = SECTOR_ACCENTS[sector.sectorKey] || SECTOR_ACCENTS.OUTRAS_AREAS;

            return (
              <div
                key={sector.sectorKey}
                onClick={() => onSelectSector && onSelectSector(sector.sectorKey)}
                className={`p-5 rounded-2xl bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all cursor-pointer group flex flex-col justify-between`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`p-2 rounded-xl ${style.bg} ${style.text}`}>
                        <Icon size={18} />
                      </div>
                      <h4 className="font-bold text-gray-900 dark:text-white text-sm group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                        {sector.name}
                      </h4>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-black bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                      {sector.recordsCount} reg.
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 my-3 p-2.5 rounded-xl bg-gray-50/70 dark:bg-gray-800/40 text-xs">
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Acolhidos Atendidos</span>
                      <strong className="text-gray-900 dark:text-white font-bold">
                        {sector.elderlyCount > 0 ? `${sector.elderlyCount} acolhidos` : 'Coletivo / Geral'}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-gray-400 block uppercase font-bold">Profissionais</span>
                      <strong className="text-gray-900 dark:text-white font-bold">
                        {sector.professionalsCount} envolvidos
                      </strong>
                    </div>
                  </div>
                </div>

                {sector.professionalsList.length > 0 && (
                  <div className="text-[11px] text-gray-500 dark:text-gray-400 truncate border-t border-gray-100 dark:border-gray-800 pt-2.5 mt-2">
                    <span className="font-bold text-gray-700 dark:text-gray-300">Equipe: </span>
                    {sector.professionalsList.slice(0, 3).join(', ')}
                    {sector.professionalsList.length > 3 && ` +${sector.professionalsList.length - 3}`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
