import React, { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Eye,
  Users,
  Calendar,
  Layers,
  Sparkles,
  Stethoscope,
  Activity,
  Brain,
  HeartHandshake,
  BookOpen,
  Apple,
  ShieldCheck,
  Building2,
  Boxes,
  Package,
  GraduationCap
} from 'lucide-react';
import { UnifiedReportItem, SectorKey } from '../reportsTypes';

interface Props {
  items: UnifiedReportItem[];
  startDate: string;
  endDate: string;
  onSelectItem: (item: UnifiedReportItem) => void;
}

interface SectorConfig {
  key: SectorKey;
  title: string;
  subtitle: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  accentColor: string;
}

const SECTOR_CONFIGS: SectorConfig[] = [
  {
    key: 'ENFERMAGEM',
    title: '1. ENFERMAGEM',
    subtitle: 'Evoluções de enfermagem, assistência diária e cuidados clínicos aos acolhidos',
    icon: Stethoscope,
    accentColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
  },
  {
    key: 'FISIOTERAPIA',
    title: '2. FISIOTERAPIA',
    subtitle: 'Evoluções fisioterapêuticas, cinesioterapia, reabilitação motora e avaliações',
    icon: Activity,
    accentColor: 'text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-800'
  },
  {
    key: 'PSICOLOGIA',
    title: '3. PSICOLOGIA',
    subtitle: 'Evoluções psicológicas, escuta individual, suporte emocional e acolhimento',
    icon: Brain,
    accentColor: 'text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/30 border-purple-200 dark:border-purple-800'
  },
  {
    key: 'SERVICO_SOCIAL',
    title: '4. SERVIÇO SOCIAL',
    subtitle: 'Evoluções socioassistenciais, visitas familiares, encaminhamentos e garantia de direitos',
    icon: HeartHandshake,
    accentColor: 'text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800'
  },
  {
    key: 'PEDAGOGIA',
    title: '5. PEDAGOGIA',
    subtitle: 'Evoluções pedagógicas, estimulação cognitiva, acompanhamento e interação social',
    icon: BookOpen,
    accentColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  },
  {
    key: 'NUTRICAO',
    title: '6. NUTRIÇÃO',
    subtitle: 'Evoluções nutricionais, acompanhamento dietético e consumo alimentar',
    icon: Apple,
    accentColor: 'text-teal-600 dark:text-teal-400 bg-teal-50 dark:bg-teal-950/30 border-teal-200 dark:border-teal-800'
  },
  {
    key: 'EQUIPE_TECNICA',
    title: '7. COORDENAÇÃO & EQUIPE TÉCNICA (PIAs)',
    subtitle: 'Planos Individuais de Atendimento, deliberações multidisciplinares e metas de cuidado',
    icon: ShieldCheck,
    accentColor: 'text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-800'
  },
  {
    key: 'OUTRAS_AREAS',
    title: '8. DEMAIS ÁREAS INSTITUCIONAIS',
    subtitle: 'Atos oficiais da presidência, gestão financeira/doações e engajamento comunitário',
    icon: Building2,
    accentColor: 'text-slate-600 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800'
  },
  {
    key: 'OFICINAS',
    title: '9. OFICINAS E ATIVIDADES COLETIVAS',
    subtitle: 'Oficinas pedagógicas, dinâmicas psicológicas, atividades lúdicas e recreativas em grupo',
    icon: Sparkles,
    accentColor: 'text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
  },
  {
    key: 'MONITORAMENTO',
    title: '10. MONITORAMENTOS CLÍNICOS E CUIDADOS',
    subtitle: 'Sinais vitais (PA, glicemia, saturação), curativos, administração de medicamentos e trocas',
    icon: Activity,
    accentColor: 'text-cyan-600 dark:text-cyan-400 bg-cyan-50 dark:bg-cyan-950/30 border-cyan-200 dark:border-cyan-800'
  },
  {
    key: 'ESTOQUE',
    title: '11. CONTROLE DE ESTOQUE E ALMOXARIFADO',
    subtitle: 'Entradas, saídas operacionais, baixas de consumo e histórico de movimentações',
    icon: Boxes,
    accentColor: 'text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800'
  },
  {
    key: 'PRODUCAO_FRALDAS',
    title: '12. PRODUÇÃO DE FRALDAS (SGPF)',
    subtitle: 'Corte bruto, processamento intermediário, produtos acabados e doações de fraldas',
    icon: Package,
    accentColor: 'text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/30 border-pink-200 dark:border-pink-800'
  },
  {
    key: 'CAPACITACOES',
    title: '13. CAPACITAÇÕES E FORMAÇÕES PROFISSIONAIS',
    subtitle: 'Treinamentos, palestras institucionais e workshops técnicos para a equipe OAMI',
    icon: GraduationCap,
    accentColor: 'text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-950/30 border-violet-200 dark:border-violet-800'
  }
];

export const SectorReportView: React.FC<Props> = ({
  items,
  startDate,
  endDate,
  onSelectItem
}) => {
  const [collapsedMap, setCollapsedMap] = useState<Record<string, boolean>>({});

  const toggleSector = (key: string) => {
    setCollapsedMap(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const collapseAll = () => {
    const all: Record<string, boolean> = {};
    SECTOR_CONFIGS.forEach(c => { all[c.key] = true; });
    setCollapsedMap(all);
  };

  const expandAll = () => {
    setCollapsedMap({});
  };

  return (
    <div id="sector-report-view-container" className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h3 className="text-sm font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
            Relatório Organizado por Setor e Área Técnica
          </h3>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Apresentação sequencial institucional sem mistura cronológica dos setores.
          </p>
        </div>

        <div className="flex items-center gap-2 print:hidden">
          <button
            onClick={expandAll}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all"
          >
            Expandir Todos
          </button>
          <button
            onClick={collapseAll}
            className="px-3 py-1.5 rounded-xl text-xs font-bold bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all"
          >
            Recolher Todos
          </button>
        </div>
      </div>

      {/* Sectors in Strict User-Requested Order */}
      <div className="space-y-6">
        {SECTOR_CONFIGS.map(cfg => {
          const sectorItems = items.filter(i => i.sectorKey === cfg.key);
          if (sectorItems.length === 0) return null;

          const isCollapsed = !!collapsedMap[cfg.key];
          const Icon = cfg.icon;

          // Collect mini-summary facts
          const profsSet = new Set<string>();
          const elderlySet = new Set<string>();
          sectorItems.forEach(i => {
            if (i.responsible && i.responsible !== 'Responsável não informado') {
              profsSet.add(i.responsible);
            }
            if (i.elderlyId) {
              elderlySet.add(i.elderlyId);
            } else if (i.targetOrParticipant && !i.targetOrParticipant.includes('Turno') && !i.targetOrParticipant.includes('Item')) {
              elderlySet.add(i.targetOrParticipant);
            }
          });

          const profsList = Array.from(profsSet);

          return (
            <div
              key={cfg.key}
              id={`sector-card-${cfg.key.toLowerCase()}`}
              className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden"
            >
              {/* Sector Header / Clickable Accordion Header */}
              <div
                onClick={() => toggleSector(cfg.key)}
                className="p-5 sm:p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between gap-4 cursor-pointer hover:bg-gray-50/70 dark:hover:bg-gray-800/40 transition-colors"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`p-2.5 rounded-2xl border ${cfg.accentColor}`}>
                    <Icon size={22} />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-base sm:text-lg font-black text-gray-900 dark:text-white">
                        {cfg.title}
                      </h4>
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                        {sectorItems.length} registros
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5 line-clamp-1">
                      {cfg.subtitle}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 print:hidden">
                  <span className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl">
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </span>
                </div>
              </div>

              {/* Sector Mini-Summary Banner (Item 4 of user spec) */}
              <div className="px-6 py-3 bg-gray-50/70 dark:bg-gray-800/30 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between gap-4 text-xs">
                <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-gray-300">
                  <span>
                    <strong className="font-bold text-gray-900 dark:text-white">SETOR:</strong> {cfg.title.replace(/^[0-9]+\.\s*/, '')}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="font-bold text-gray-900 dark:text-white">Total de Registros:</strong> {sectorItems.length}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="font-bold text-gray-900 dark:text-white">Acolhidos Atendidos:</strong> {elderlySet.size > 0 ? `${elderlySet.size} acolhidos` : 'Geral / Coletivo'}
                  </span>
                  <span>•</span>
                  <span>
                    <strong className="font-bold text-gray-900 dark:text-white">Período:</strong> {startDate} a {endDate}
                  </span>
                </div>

                {profsList.length > 0 && (
                  <div className="text-gray-600 dark:text-gray-300">
                    <strong className="font-bold text-gray-900 dark:text-white">Profissionais:</strong> {profsList.join(', ')}
                  </div>
                )}
              </div>

              {/* Table (Item 4: DATA | TIPO DE ATENDIMENTO | PROFISSIONAL | ACOLHIDO | RESUMO DO REGISTRO | AÇÕES) */}
              {!isCollapsed && (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
                    <thead>
                      <tr className="bg-gray-100/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                        <th className="py-3 px-4 w-28 text-center">Data</th>
                        <th className="py-3 px-4 w-44">Tipo de Atendimento</th>
                        <th className="py-3 px-4 w-48">Profissional / Resp.</th>
                        <th className="py-3 px-4 w-48">Acolhido / Público</th>
                        <th className="py-3 px-4">Resumo do Registro</th>
                        <th className="py-3 px-4 text-right print:hidden w-28">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                      {sectorItems.map(item => (
                        <tr
                          key={item.id}
                          className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                        >
                          {/* Data */}
                          <td className="py-3 px-4 font-mono font-bold text-gray-900 dark:text-gray-100 whitespace-nowrap text-center">
                            {item.date ? item.date.slice(0, 10) : '—'}
                          </td>

                          {/* Tipo de Atendimento */}
                          <td className="py-3 px-4">
                            <span className="inline-block px-2.5 py-0.5 rounded-lg font-bold text-[11px] bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200">
                              {item.recordTypeLabel || item.typeOrStatus || item.recordType}
                            </span>
                          </td>

                          {/* Profissional */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white">
                              {item.responsible || '—'}
                            </div>
                            {item.roleOrFunction && (
                              <div className="text-[10px] text-gray-400">
                                {item.roleOrFunction}
                              </div>
                            )}
                          </td>

                          {/* Acolhido */}
                          <td className="py-3 px-4">
                            <div className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                              {item.targetOrParticipant || '—'}
                            </div>
                          </td>

                          {/* Resumo do Registro (clean, concise) */}
                          <td className="py-3 px-4">
                            <div className="font-bold text-gray-900 dark:text-white text-xs">
                              {item.title}
                            </div>
                            {item.description && (
                              <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                {item.description}
                              </div>
                            )}
                            {item.conductOrOutcome && (
                              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 line-clamp-1 mt-0.5">
                                Conduta: {item.conductOrOutcome}
                              </div>
                            )}
                          </td>

                          {/* Botão Ver Registro Completo */}
                          <td className="py-3 px-4 text-right print:hidden whitespace-nowrap">
                            <button
                              onClick={() => onSelectItem(item)}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs inline-flex items-center gap-1 transition-all border border-emerald-200 dark:border-emerald-800"
                              title="Ver ficha completa do atendimento sem alterações"
                            >
                              <Eye size={12} /> Ver Completo
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
    </div>
  );
};
