import React from 'react';
import { 
  X, Calendar, Clock, User as UserIcon, Users, AlertTriangle, 
  Package, CheckCircle2, Download, ShieldCheck, HeartHandshake, Mic, Camera,
  Edit3, Trash2
} from 'lucide-react';
import { CaregiverShiftReport } from '../../types';
import { generateCaregiverShiftPdf } from './caregiverPdfGenerator';
import { formatShiftName, formatShiftStatus, formatDiaperCount } from './caregiverUtils';

interface CaregiverShiftDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CaregiverShiftReport | null;
  onEdit?: (report: CaregiverShiftReport) => void;
  onDelete?: (report: CaregiverShiftReport) => void;
}

export const CaregiverShiftDetailsModal: React.FC<CaregiverShiftDetailsModalProps> = ({
  isOpen,
  onClose,
  report,
  onEdit,
  onDelete
}) => {
  if (!isOpen || !report) return null;

  const handleDownloadPdf = () => {
    generateCaregiverShiftPdf(report);
  };

  const getStatusBadge = () => {
    switch (report.status) {
      case 'TRANQUILO':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300">
            <CheckCircle2 size={14} /> PLANTÃO TRANQUILO
          </span>
        );
      case 'COM_OCORRENCIAS':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
            <AlertTriangle size={14} /> COM OCORRÊNCIAS
          </span>
        );
      case 'INTERCORRENCIA':
        return (
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-300">
            <AlertTriangle size={14} /> TEVE INTERCORRÊNCIA
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] max-w-2xl w-full p-6 sm:p-8 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-6 my-auto">
        
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 flex items-center justify-center font-bold">
              <HeartHandshake size={26} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xl font-black text-gray-900 dark:text-white">
                  Detalhes do Plantão
                </h3>
                {getStatusBadge()}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Registro oficial de passagem de plantão da equipe de cuidadoras
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Corpo do Conteúdo */}
        <div className="space-y-5 max-h-[70vh] overflow-y-auto pr-1">
          {/* Identificação */}
          <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <span className="font-bold text-gray-400 block uppercase text-[10px]">Data e Turno</span>
              <p className="font-black text-gray-800 dark:text-gray-200 text-sm flex items-center gap-1.5 mt-0.5">
                <Calendar size={14} className="text-emerald-600" />
                {report.date} • Turno {formatShiftName(report.shift)}
              </p>
              <p className="text-gray-500 text-[11px] flex items-center gap-1 mt-0.5">
                <Clock size={12} /> {report.startTime || '07:00'} às {report.endTime || '19:00'}
              </p>
            </div>

            <div>
              <span className="font-bold text-gray-400 block uppercase text-[10px]">Cuidadora Responsável</span>
              <p className="font-black text-gray-800 dark:text-gray-200 text-sm flex items-center gap-1.5 mt-0.5">
                <UserIcon size={14} className="text-emerald-600" />
                {report.caregiverName || report.createdByName}
              </p>
              <p className="text-gray-500 text-[11px] mt-0.5">
                Registrado em: {report.createdAt ? new Date(report.createdAt).toLocaleString('pt-BR') : '—'}
              </p>
            </div>

            {/* Equipe */}
            <div className="sm:col-span-2 pt-2 border-t border-gray-200 dark:border-gray-700">
              <span className="font-bold text-gray-400 block uppercase text-[10px]">Equipe no Plantão</span>
              <div className="flex flex-wrap gap-1.5 mt-1">
                {report.teamMembers && report.teamMembers.length > 0 ? (
                  report.teamMembers.map((tm, idx) => (
                    <span 
                      key={idx}
                      className="px-2.5 py-1 rounded-lg bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold text-xs border border-gray-200 dark:border-gray-600 flex items-center gap-1"
                    >
                      <Users size={12} className="text-emerald-600" /> {tm.name}
                    </span>
                  ))
                ) : (
                  <span className="text-gray-400 text-xs italic">Nenhum outro profissional registrado (plantão individual).</span>
                )}
              </div>
            </div>
          </div>

          {/* Relato Geral */}
          <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-2">
            <h4 className="text-xs font-black text-emerald-900 dark:text-emerald-300 uppercase tracking-wider">
              Relato Geral do Plantão
            </h4>
            <p className="text-xs text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-wrap">
              {report.generalNotes || 'Nenhuma anotação geral registrada no encerramento deste turno.'}
            </p>

            {report.audioTranscript && (
              <div className="mt-3 p-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <Mic size={12} /> Transcrição de Áudio (Ditado):
                </span>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{report.audioTranscript}"
                </p>
              </div>
            )}

            {report.photoTranscript && (
              <div className="mt-2 p-3 bg-white dark:bg-gray-900 rounded-xl border border-emerald-200 dark:border-emerald-800 text-xs space-y-1">
                <span className="font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <Camera size={12} /> Anotação Digitalizada do Caderno:
                </span>
                <p className="text-gray-700 dark:text-gray-300 italic">
                  "{report.photoTranscript}"
                </p>
              </div>
            )}
          </div>

          {/* Observações sobre os Acolhidos */}
          <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 space-y-3">
            <h4 className="text-xs font-black text-gray-800 dark:text-gray-200 uppercase tracking-wider flex items-center justify-between">
              <span>Observações sobre os Acolhidos</span>
              <span className="px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[10px] text-gray-600 dark:text-gray-400 font-bold">
                {report.residentNotes?.length || 0} {(report.residentNotes?.length || 0) === 1 ? 'acolhido' : 'acolhidos'}
              </span>
            </h4>

            {report.residentNotes && report.residentNotes.length > 0 ? (
              <div className="space-y-2.5">
                {report.residentNotes.map((res, i) => (
                  <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-750 text-xs space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-gray-900 dark:text-white">
                        {res.elderlyName}
                      </span>
                    </div>

                    {res.statusTags && res.statusTags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {res.statusTags.map((tag, tIdx) => (
                          <span key={tIdx} className="px-2 py-0.5 rounded-md bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 font-bold text-[10px]">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {res.observation && (
                      <p className="text-gray-600 dark:text-gray-300 text-xs pt-1">
                        {res.observation}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Nenhuma observação individual de acolhido registrada.
              </p>
            )}
          </div>

          {/* Intercorrências */}
          <div className="p-4 bg-red-50/40 dark:bg-red-950/20 rounded-2xl border border-red-100 dark:border-red-900/40 space-y-3">
            <h4 className="text-xs font-black text-red-900 dark:text-red-300 uppercase tracking-wider flex items-center justify-between">
              <span>Intercorrências no Plantão</span>
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/50 text-[10px] text-red-800 dark:text-red-300 font-bold">
                {report.incidents?.length || 0} {(report.incidents?.length || 0) === 1 ? 'registrada' : 'registradas'}
              </span>
            </h4>

            {report.incidents && report.incidents.length > 0 ? (
              <div className="space-y-2">
                {report.incidents.map((inc, i) => (
                  <div key={i} className="p-3 bg-white dark:bg-gray-900 rounded-xl border border-red-200 dark:border-red-900/50 text-xs space-y-1.5">
                    <div className="flex items-center justify-between font-black text-red-700 dark:text-red-400">
                      <span>⚠️ {inc.elderlyName}</span>
                      <span className="text-[11px] text-gray-400">{inc.time || 'Horário não informado'}</span>
                    </div>
                    <p className="text-gray-700 dark:text-gray-300">
                      <strong>Ocorrência:</strong> {inc.description}
                    </p>
                    {inc.actionTaken && (
                      <p className="text-gray-600 dark:text-gray-400">
                        <strong>Conduta / Providência:</strong> {inc.actionTaken}
                      </p>
                    )}
                    {inc.notifiedPeople && inc.notifiedPeople.length > 0 && (
                      <p className="text-[10px] text-gray-400 italic">
                        Comunicado a: {inc.notifiedPeople.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Nenhuma intercorrência clínica registrada neste plantão.
              </p>
            )}
          </div>

          {/* Fraldas Utilizadas */}
          <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
            <h4 className="text-xs font-black text-blue-900 dark:text-blue-300 uppercase tracking-wider flex items-center justify-between">
              <span>Fraldas Utilizadas no Turno</span>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-[10px] text-blue-800 dark:text-blue-300 font-bold">
                Total: {formatDiaperCount(report.totalDiapersCount || 0)}
              </span>
            </h4>

            {report.diapersUsed && report.diapersUsed.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {report.diapersUsed.map((d, i) => (
                  <div key={i} className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-blue-200 dark:border-blue-800 flex items-center justify-between text-xs">
                    <div>
                      <p className="font-bold text-gray-800 dark:text-gray-200">{d.elderlyName}</p>
                      <p className="text-[10px] text-gray-400">Tamanho {d.size}{d.time ? ` • ${d.time}` : ''}</p>
                    </div>
                    <span className="px-2 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-black text-xs">
                      {formatDiaperCount(d.quantity)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-gray-400 italic">
                Nenhuma troca de fralda lançada neste relatório.
              </p>
            )}
          </div>
        </div>

        {/* Rodapé e Ações */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800">
          <div className="text-[11px] text-gray-400 flex items-center gap-1.5">
            <ShieldCheck size={14} className="text-emerald-600" />
            Documento com validade institucional e rastreabilidade SGPF Casa OAMI
          </div>

          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-end">
            {onEdit && (
              <button
                type="button"
                onClick={() => {
                  onEdit(report);
                  onClose();
                }}
                className="px-4 py-3 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:hover:bg-amber-900/50 dark:text-amber-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                title="Editar este plantão"
              >
                <Edit3 size={15} /> Editar
              </button>
            )}

            {onDelete && (
              <button
                type="button"
                onClick={() => {
                  onDelete(report);
                  onClose();
                }}
                className="px-4 py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-700 dark:bg-red-950/40 dark:hover:bg-red-900/50 dark:text-red-300 font-black text-xs flex items-center justify-center gap-1.5 transition-all active:scale-95"
                title="Apagar este plantão"
              >
                <Trash2 size={15} /> Apagar
              </button>
            )}

            <button
              type="button"
              onClick={handleDownloadPdf}
              className="flex-1 sm:flex-none px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-emerald-600/20 active:scale-95 transition-all"
            >
              <Download size={15} /> Baixar PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-3 rounded-2xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs active:scale-95 transition-all"
            >
              Fechar
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
