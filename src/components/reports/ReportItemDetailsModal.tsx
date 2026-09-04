import React, { useState } from 'react';
import {
  X,
  Calendar,
  User,
  Tag,
  MapPin,
  FileText,
  CheckCircle2,
  Package,
  Layers,
  Image as ImageIcon,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Activity,
  Boxes,
  BookOpen,
  DollarSign
} from 'lucide-react';
import { UnifiedReportItem } from './reportsTypes';

interface Props {
  item: UnifiedReportItem | null;
  onClose: () => void;
}

export const ReportItemDetailsModal: React.FC<Props> = ({ item, onClose }) => {
  const [showRawJson, setShowRawJson] = useState(false);

  if (!item) return null;

  const categoryColorMap: Record<string, { bg: string; text: string; border: string }> = {
    PROFESSIONALS: { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
    WORKSHOPS: { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-300', border: 'border-amber-200 dark:border-amber-800' },
    TRAININGS: { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
    DIAPERS: { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
    STOCK: { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-300', border: 'border-emerald-200 dark:border-emerald-800' },
    MONITORING: { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
    TREASURY: { bg: 'bg-slate-50 dark:bg-slate-900/50', text: 'text-slate-700 dark:text-slate-300', border: 'border-slate-200 dark:border-slate-800' },
    OTHER: { bg: 'bg-gray-50 dark:bg-gray-900/50', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' }
  };

  const colors = categoryColorMap[item.category] || categoryColorMap.OTHER;

  return (
    <div
      id="report-item-modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="report-item-modal-card"
        className="bg-white dark:bg-gray-900 rounded-3xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className={`p-6 border-b border-gray-100 dark:border-gray-800 flex items-start justify-between gap-4 ${colors.bg}`}>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${colors.bg} ${colors.text} border ${colors.border}`}>
                {item.categoryLabel}
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-white/80 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-700">
                {item.sector}
              </span>
              {item.typeOrStatus && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-gray-900 text-white dark:bg-white dark:text-gray-900">
                  {item.typeOrStatus}
                </span>
              )}
            </div>
            <h3 className="text-xl font-black text-gray-900 dark:text-white pt-1">
              {item.title}
            </h3>
          </div>
          <button
            id="close-report-item-modal"
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
            title="Fechar"
          >
            <X size={20} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-sm text-gray-700 dark:text-gray-300">
          {/* Key Facts Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Calendar size={14} className="text-emerald-500" />
                Data do Registro
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {item.date ? item.date.slice(0, 10) : 'Não informada'}
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <User size={14} className="text-blue-500" />
                Profissional / Responsável
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {item.responsible || 'Não informado'}
              </p>
              {item.roleOrFunction && (
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {item.roleOrFunction}
                </p>
              )}
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Tag size={14} className="text-purple-500" />
                Acolhido / Público / Item
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {item.targetOrParticipant || 'Geral / Não aplicável'}
              </p>
              {item.participantsCount !== undefined && item.participantsCount > 0 && (
                <p className="text-xs text-purple-600 dark:text-purple-400 font-semibold">
                  {item.participantsCount} pessoa(s) participante(s)
                </p>
              )}
            </div>

            <div className="p-3.5 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase">
                <Package size={14} className="text-pink-500" />
                Quantidade / Saldo / Valor
              </div>
              <p className="font-bold text-gray-900 dark:text-white text-base">
                {item.quantityOrValue !== undefined ? String(item.quantityOrValue) : (item.typeOrStatus || 'Registro de Acompanhamento')}
              </p>
              {item.locationOrRoom && (
                <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                  <MapPin size={12} /> {item.locationOrRoom}
                </p>
              )}
            </div>
          </div>

          {/* Description / Content */}
          {item.description && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <FileText size={14} className="text-emerald-500" />
                Descrição e Registros Detalhados
              </h4>
              <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-800 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                {item.description}
              </div>
            </div>
          )}

          {/* Conduct / Outcome / 5W2H */}
          {item.conductOrOutcome && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <CheckCircle2 size={14} className="text-blue-500" />
                Conduta, Metodologia ou Desfecho
              </h4>
              <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/30 text-gray-800 dark:text-gray-200 leading-relaxed whitespace-pre-line">
                {item.conductOrOutcome}
              </div>
            </div>
          )}

          {/* Photos */}
          {item.photos && item.photos.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} className="text-amber-500" />
                Fotos do Registro ({item.photos.length})
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {item.photos.map((photoUrl, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden aspect-video bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700">
                    <img
                      src={photoUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-full h-full object-cover transition-transform group-hover:scale-105"
                      referrerPolicy="no-referrer"
                    />
                    <a
                      href={photoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white text-xs font-bold transition-opacity"
                    >
                      <ExternalLink size={16} className="mr-1" /> Ver original
                    </a>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Documents */}
          {item.documents && item.documents.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-wider">
                Documentos Anexados ({item.documents.length})
              </h4>
              <div className="space-y-2">
                {item.documents.map((doc, idx) => (
                  <div key={idx} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-200 dark:border-gray-700">
                    <span className="font-semibold text-gray-800 dark:text-gray-200 truncate">{doc.name || `Anexo ${idx + 1}`}</span>
                    {doc.url && (
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-blue-600 dark:text-blue-400 font-bold hover:underline inline-flex items-center gap-1 shrink-0"
                      >
                        <ExternalLink size={12} /> Abrir
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Collapsible Raw JSON Data - Guarantees ZERO data loss */}
          <div className="pt-2 border-t border-gray-100 dark:border-gray-800">
            <button
              onClick={() => setShowRawJson(!showRawJson)}
              className="flex items-center justify-between w-full text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 py-2"
            >
              <span>Dados Técnicos Originais do Sistema (JSON Completo)</span>
              {showRawJson ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            {showRawJson && (
              <pre className="mt-2 p-4 bg-gray-900 text-emerald-400 rounded-2xl text-[11px] overflow-x-auto max-h-60 leading-relaxed font-mono">
                {JSON.stringify(item.details, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/80 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>ID do Registro: <code className="font-mono text-[10px]">{item.id}</code></span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 dark:bg-gray-800 hover:bg-gray-300 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 font-bold rounded-xl transition-all"
          >
            Fechar Detalhes
          </button>
        </div>
      </div>
    </div>
  );
};
