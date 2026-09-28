import React from 'react';
import { X, Calendar, Clock, User, Users, AlertTriangle, Package, CheckCircle2, BookOpen } from 'lucide-react';
import { CaregiverShiftReport } from '../../types';
import { formatShiftName, formatShiftStatus, formatDiaperCount } from './caregiverUtils';

interface PreviousShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: CaregiverShiftReport | null;
}

export const PreviousShiftModal: React.FC<PreviousShiftModalProps> = ({
  isOpen,
  onClose,
  report
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-900 rounded-[2.5rem] max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-800 space-y-5 my-auto">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3">
          <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-bold">
            <BookOpen size={22} />
            <h3 className="text-lg font-black">Plantão Anterior</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-full hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {!report ? (
          <div className="text-center py-10 space-y-3">
            <div className="w-16 h-16 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
              <BookOpen size={28} />
            </div>
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">
              Nenhum plantão anterior finalizado foi encontrado.
            </p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Assim que uma colega finalizar um turno, as informações mais importantes da passagem de plantão aparecerão aqui para você.
            </p>
          </div>
        ) : (
          <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
            {/* Cartão de Identificação */}
            <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="font-bold text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                  <Calendar size={14} /> {report.date} • Turno {formatShiftName(report.shift)}
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                  report.status === 'TRANQUILO' ? 'bg-emerald-100 text-emerald-800' :
                  report.status === 'COM_OCORRENCIAS' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-800'
                }`}>
                  {formatShiftStatus(report.status)}
                </span>
              </div>

              <div className="text-xs text-gray-700 dark:text-gray-300">
                <span className="font-bold block">Cuidadora Responsável: {report.caregiverName}</span>
                {report.teamMembers && report.teamMembers.length > 0 && (
                  <span className="text-[11px] text-gray-500 block mt-0.5">
                    Equipe no plantão: {report.teamMembers.map(m => m.name).join(', ')}
                  </span>
                )}
              </div>
            </div>

            {/* Relato Geral */}
            <div className="space-y-1">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                Relato do Plantão
              </label>
              <div className="p-3.5 bg-gray-50 dark:bg-gray-800 rounded-2xl text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap leading-relaxed">
                {report.generalNotes || 'Nenhum relato geral foi digitado no encerramento deste turno.'}
              </div>
            </div>

            {/* Intercorrências */}
            {report.incidents && report.incidents.length > 0 && (
              <div className="p-4 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900/50 rounded-2xl space-y-2">
                <div className="flex items-center gap-1.5 text-red-700 dark:text-red-400 font-black text-xs uppercase tracking-wider">
                  <AlertTriangle size={15} />
                  <span>Intercorrências importantes para o seu turno ({report.incidents.length}):</span>
                </div>

                <div className="space-y-2">
                  {report.incidents.map((inc, i) => (
                    <div key={i} className="p-2.5 bg-white dark:bg-gray-900 rounded-xl border border-red-100 dark:border-red-900 text-xs">
                      <span className="font-black text-red-700 dark:text-red-300 block">{inc.elderlyName} ({inc.time || 'Horário não informado'})</span>
                      <p className="text-gray-700 dark:text-gray-200 font-medium">{inc.description}</p>
                      {inc.actionTaken && (
                        <p className="text-gray-500 text-[10px] mt-0.5">Conduta adotada: {inc.actionTaken}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Observações dos Acolhidos */}
            {report.residentNotes && report.residentNotes.length > 0 && (
              <div className="space-y-2">
                <label className="text-[10px] font-black text-gray-400 uppercase tracking-wider block">
                  Observações sobre os Acolhidos ({report.residentNotes.length})
                </label>
                <div className="space-y-1.5">
                  {report.residentNotes.map((note, i) => (
                    <div key={i} className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl text-xs">
                      <span className="font-bold text-gray-900 dark:text-white block">{note.elderlyName}</span>
                      {note.observation && <p className="text-gray-600 dark:text-gray-300 mt-0.5">{note.observation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Fraldas Utilizadas */}
            {report.diapersUsed && report.diapersUsed.length > 0 && (
              <div className="p-3 bg-blue-50/60 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/40 rounded-xl text-xs space-y-1">
                <span className="font-bold text-blue-800 dark:text-blue-300 block flex items-center gap-1">
                  <Package size={14} /> Fraldas utilizadas pela equipe anterior: {formatDiaperCount(report.totalDiapersCount || report.diapersUsed.reduce((acc, d) => acc + d.quantity, 0))}.
                </span>
              </div>
            )}
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full py-3.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 text-gray-800 dark:text-gray-200 rounded-2xl font-black text-sm transition-all"
        >
          Fechar
        </button>
      </div>
    </div>
  );
};
