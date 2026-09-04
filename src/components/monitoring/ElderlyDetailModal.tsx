import React, { useState } from 'react';
import {
  X,
  User,
  Calendar,
  Phone,
  HeartPulse,
  Activity,
  ClipboardList,
  Sparkles,
  Printer,
  FileText,
  AlertTriangle,
  Clock,
  Tag,
  Smile,
  ShieldCheck,
  Package
} from 'lucide-react';
import { Elderly, PIA, VitalSigns, DiaperChangeRecord } from '../../types';
import { UnifiedEvolutionItem } from './monitoringTypes';
import { safeFormat, cn, getElderlyAgeByName } from '../../lib/utils';
import { differenceInYears, parseISO } from 'date-fns';

interface ElderlyDetailModalProps {
  elderly: Elderly | null;
  evolutions: UnifiedEvolutionItem[];
  vitals: VitalSigns[];
  pia?: PIA;
  activities: any[];
  diaperChanges: DiaperChangeRecord[];
  onClose: () => void;
  startDate: string;
  endDate: string;
}

export const ElderlyDetailModal: React.FC<ElderlyDetailModalProps> = ({
  elderly,
  evolutions,
  vitals,
  pia,
  activities,
  diaperChanges,
  onClose,
  startDate,
  endDate
}) => {
  const [activeTab, setActiveTab] = useState<'evolutions' | 'vitals' | 'pia' | 'activities' | 'diapers'>('evolutions');
  const [sectorFilter, setSectorFilter] = useState<string>('ALL');

  if (!elderly) return null;

  const filteredEvolutions = evolutions.filter(ev => {
    if (sectorFilter === 'ALL') return true;
    return ev.sector === sectorFilter;
  });

  const handlePrintDossier = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-2 sm:p-4 overflow-y-auto animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-5xl max-h-[92vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden my-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-green-700 via-emerald-800 to-teal-900 text-white flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 relative shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-white/10 border-2 border-white/20 overflow-hidden shrink-0 flex items-center justify-center">
              {elderly.photoUrl ? (
                <img
                  src={elderly.photoUrl}
                  alt={elderly.name}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <User size={32} className="text-white/80" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight">{elderly.name}</h2>
                <span
                  className={cn(
                    'px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider',
                    elderly.status === 'ATIVO'
                      ? 'bg-emerald-400/20 text-emerald-200 border border-emerald-400/30'
                      : 'bg-amber-400/20 text-amber-200 border border-amber-400/30'
                  )}
                >
                  {elderly.status || 'ATIVO'}
                </span>
              </div>
              <p className="text-xs text-emerald-100 mt-1 flex items-center gap-3 flex-wrap">
                <span>{(() => {
                  const age = getElderlyAgeByName(elderly.name) || (elderly.birthDate ? differenceInYears(new Date(), parseISO(elderly.birthDate)) : null);
                  return age ? `${age} anos` : 'Idade não informada';
                })()}</span>
                <span>•</span>
                <span>Acolhimento: {safeFormat(elderly.entryDate, 'dd/MM/yyyy')}</span>
                <span>•</span>
                <span>Quarto/Leito: {(elderly as any).room || (elderly as any).roomNumber || 'Principal'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={handlePrintDossier}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer no-print"
              title="Imprimir Dossier do Idoso"
            >
              <Printer size={16} />
              <span className="hidden sm:inline">Imprimir</span>
            </button>
            <button
              onClick={onClose}
              className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all cursor-pointer no-print"
              title="Fechar"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Sub-Navigation Tabs */}
        <div className="flex items-center gap-2 p-3 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800 overflow-x-auto shrink-0 no-print">
          {[
            { id: 'evolutions', label: 'Evoluções Multidisciplinares', count: filteredEvolutions.length, icon: Activity },
            { id: 'vitals', label: 'Sinais Vitais', count: vitals.length, icon: HeartPulse },
            { id: 'pia', label: 'Plano de Atendimento (PIA)', count: pia ? 1 : 0, icon: ClipboardList },
            { id: 'activities', label: 'Atividades e Oficinas', count: activities.length, icon: Sparkles },
            { id: 'diapers', label: 'Controle de Fraldas', count: diaperChanges.length, icon: Package }
          ].map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-black transition-all whitespace-nowrap cursor-pointer',
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                )}
              >
                <Icon size={14} />
                <span>{tab.label}</span>
                <span
                  className={cn(
                    'px-1.5 py-0.2 rounded-full text-[10px]',
                    isActive ? 'bg-white/20 text-white' : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300'
                  )}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-6">
          {/* TAB: EVOLUTIONS */}
          {activeTab === 'evolutions' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-bold text-gray-800 dark:text-white">Linha do Tempo Multidisciplinar</h3>
                  <p className="text-xs text-gray-500">Evoluções registradas pela equipe técnica</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-gray-500">Filtrar Setor:</span>
                  <select
                    value={sectorFilter}
                    onChange={e => setSectorFilter(e.target.value)}
                    className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none"
                  >
                    <option value="ALL">Todos os setores</option>
                    <option value="Enfermagem">Enfermagem</option>
                    <option value="Fisioterapia">Fisioterapia</option>
                    <option value="Psicologia">Psicologia</option>
                    <option value="Pedagogia">Pedagogia</option>
                    <option value="Serviço Social">Serviço Social</option>
                    <option value="Nutrição">Nutrição</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
              </div>

              {filteredEvolutions.length > 0 ? (
                <div className="space-y-3">
                  {filteredEvolutions.map(ev => (
                    <div
                      key={ev.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4"
                    >
                      <div className="shrink-0 flex sm:flex-col items-center justify-between sm:justify-start gap-2">
                        <span
                          className={cn(
                            'px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider',
                            ev.sector === 'Enfermagem'
                              ? 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300'
                              : ev.sector === 'Fisioterapia'
                              ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                              : ev.sector === 'Psicologia'
                              ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                              : ev.sector === 'Pedagogia'
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : ev.sector === 'Serviço Social'
                              ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                              : ev.sector === 'Nutrição'
                              ? 'bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                          )}
                        >
                          {ev.sector}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">{safeFormat(ev.date, 'dd/MM/yy HH:mm')}</span>
                      </div>

                      <div className="flex-1 space-y-2">
                        <p className="text-xs font-bold text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                          {ev.content}
                        </p>
                        {ev.conduct && (
                          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs">
                            <span className="font-bold text-gray-500 dark:text-gray-400 uppercase text-[10px]">
                              Conduta / Encaminhamento:
                            </span>
                            <p className="text-gray-700 dark:text-gray-300 mt-0.5">{ev.conduct}</p>
                          </div>
                        )}
                        <p className="text-[10px] text-gray-400 font-medium">
                          Registrado por: <span className="font-bold text-gray-600 dark:text-gray-300">{ev.professional}</span>
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Activity className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-500">Nenhuma evolução encontrada para os critérios selecionados.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: VITALS */}
          {activeTab === 'vitals' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 dark:text-white">Histórico de Sinais Vitais</h3>
              {vitals.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {vitals.map((v, i) => (
                    <div
                      key={v.id || i}
                      className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-3"
                    >
                      <div className="flex justify-between items-center text-xs font-bold text-gray-500">
                        <span>{safeFormat(v.date, 'dd/MM/yyyy')}</span>
                        <span>{v.time || '--:--'}</span>
                      </div>
                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl">
                          <span className="text-[9px] uppercase text-gray-400 font-bold block">PA</span>
                          <span className="text-xs font-black text-gray-800 dark:text-white">
                            {v.systolicBP}/{v.diastolicBP}
                          </span>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl">
                          <span className="text-[9px] uppercase text-gray-400 font-bold block">Temp</span>
                          <span className="text-xs font-black text-gray-800 dark:text-white">{v.temperature}°C</span>
                        </div>
                        <div className="p-2 bg-white dark:bg-gray-800 rounded-xl">
                          <span className="text-[9px] uppercase text-gray-400 font-bold block">Sat</span>
                          <span className="text-xs font-black text-gray-800 dark:text-white">{v.saturation}%</span>
                        </div>
                      </div>
                      {v.notes && <p className="text-[11px] text-gray-600 dark:text-gray-400 italic">Obs: {v.notes}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <HeartPulse className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-500">Nenhum registro de sinal vital cadastrado.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: PIA */}
          {activeTab === 'pia' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 dark:text-white">Plano Individual de Atendimento (PIA)</h3>
              {pia ? (
                <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-100 dark:border-gray-800 space-y-4">
                  <div className="flex justify-between items-center">
                    <span
                      className={cn(
                        'px-3 py-1 rounded-xl text-xs font-black uppercase',
                        pia.status === 'CONCLUIDO'
                          ? 'bg-green-100 text-green-700'
                          : pia.status === 'EM_ANDAMENTO'
                          ? 'bg-blue-100 text-blue-700'
                          : 'bg-amber-100 text-amber-700'
                      )}
                    >
                      {pia.status || 'EM ANDAMENTO'}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">Data: {safeFormat(pia.date, 'dd/MM/yyyy')}</span>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Objetivos Gerais</h4>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-line">
                        {pia.objectives || 'Nenhum objetivo especificado.'}
                      </p>
                    </div>

                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ações e Metas Multidisciplinares</h4>
                      <p className="text-sm text-gray-800 dark:text-gray-200 mt-1 whitespace-pre-line">
                        {pia.actions || 'Nenhuma ação cadastrada.'}
                      </p>
                    </div>

                    {pia.evaluationNotes && (
                      <div>
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider">Parecer de Avaliação</h4>
                        <p className="text-sm text-gray-800 dark:text-gray-200 mt-1">{pia.evaluationNotes}</p>
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <ClipboardList className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-500">Nenhum PIA cadastrado para este idoso.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: ACTIVITIES */}
          {activeTab === 'activities' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 dark:text-white">Atividades e Oficinas Participadas</h3>
              {activities.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {activities.map((act, i) => (
                    <div
                      key={act.id || i}
                      className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2"
                    >
                      <div className="flex justify-between items-center text-xs font-bold">
                        <span className="text-emerald-600 uppercase tracking-wider">{act.type || 'Oficina'}</span>
                        <span className="text-gray-400">{safeFormat(act.date, 'dd/MM/yyyy')}</span>
                      </div>
                      <h4 className="font-bold text-sm text-gray-800 dark:text-white">{act.title || act.name || 'Atividade'}</h4>
                      <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{act.description}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Sparkles className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-500">Nenhuma participação registrada em oficinas no período.</p>
                </div>
              )}
            </div>
          )}

          {/* TAB: DIAPERS */}
          {activeTab === 'diapers' && (
            <div className="space-y-4">
              <h3 className="font-bold text-gray-800 dark:text-white">Controle de Fraldas do Idoso</h3>
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 flex justify-between items-center">
                <div>
                  <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300">Total de Trocas Registradas</p>
                  <p className="text-2xl font-black text-emerald-900 dark:text-emerald-100">{diaperChanges.length} trocas</p>
                </div>
              </div>

              {diaperChanges.length > 0 ? (
                <div className="space-y-2">
                  {diaperChanges.slice(0, 15).map((dc, i) => (
                    <div
                      key={dc.id || i}
                      className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800 flex justify-between items-center text-xs"
                    >
                      <div>
                        <span className="font-bold text-gray-800 dark:text-gray-200">{safeFormat(dc.date, 'dd/MM/yyyy')}</span>
                        <span className="text-gray-400 ml-2">{dc.time || '--:--'}</span>
                      </div>
                      <span className="font-bold text-emerald-600">Troca Concluída</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                  <Package className="mx-auto text-gray-400 mb-2" size={32} />
                  <p className="text-sm font-bold text-gray-500">Nenhum registro de troca de fraldas cadastrado.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
