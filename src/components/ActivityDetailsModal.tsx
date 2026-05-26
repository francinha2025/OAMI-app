import React from 'react';
import { X, Calendar, User, Users, Clipboard, Briefcase, FileText, Sparkles, Smile, MessageSquare, ClipboardList } from 'lucide-react';
import { Professional, Elderly } from '../types';

interface ActivityDetailsModalProps {
  activity: {
    id: string;
    type: string;
    title: string;
    date: string;
    isCreator: boolean;
    sector: string;
    coWorkers: string[];
    registeredBy: string;
    rawItem: any;
  } | null;
  onClose: () => void;
  professionals: Professional[];
  elderly: Elderly[];
  users: any[];
}

export const ActivityDetailsModal: React.FC<ActivityDetailsModalProps> = ({
  activity,
  onClose,
  professionals,
  elderly,
  users,
}) => {
  if (!activity) return null;

  const { title, type, date, isCreator, sector, coWorkers, registeredBy, rawItem } = activity;

  // Resolve creator display name
  const creatorUser = users.find(u => u.id === registeredBy || u.email === registeredBy) 
    || professionals.find(p => p.id === registeredBy || p.email === registeredBy || p.name === registeredBy);
  const creatorName = creatorUser ? creatorUser.name : registeredBy;

  // Resolve patient details
  const patientId = rawItem.patientId || rawItem.elderlyId || rawItem. elderlyId;
  const patient = elderly.find(e => e.id === patientId);

  // Parse list of patients for group activities
  const linkedElderlyIds: string[] = rawItem.elderlyIds || rawItem.patientsIds || [];
  const linkedPatients = elderly.filter(e => linkedElderlyIds.includes(e.id));

  // Determine label details from different records
  const evolutionText = rawItem.evolution || rawItem.description || rawItem.content || rawItem.procedures || '';
  const conductText = rawItem.conduct || rawItem.conducts || rawItem.observations || rawItem.objectives || rawItem.objectivesTarget || '';
  const recommendations = rawItem.recommendations || rawItem.materials || rawItem.methodology || '';
  const attachments: string[] = rawItem.photos || rawItem.images || rawItem.attachments || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in" id="activity-detail-overlay">
      <div 
        className="relative w-full max-w-xl bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[90vh]"
        id="activity-detail-card"
      >
        {/* Header decoration */}
        <div className={`p-6 text-white flex items-center justify-between ${
          sector === 'Psicologia' ? 'bg-gradient-to-r from-indigo-600 to-purple-600' :
          sector === 'Pedagogia' ? 'bg-gradient-to-r from-orange-500 to-amber-500' :
          'bg-gradient-to-r from-emerald-600 to-teal-600'
        }`}>
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded-full border border-white/25">
              {sector}
            </span>
            <h3 className="text-lg font-bold mt-1 line-clamp-1">{title}</h3>
            <p className="text-xs text-white/80 font-medium">{type}</p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 hover:bg-white/15 active:scale-95 rounded-full text-white transition-all"
            aria-label="Close"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5 text-gray-700 dark:text-gray-300">
          
          {/* Metadata Grid */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-850 p-4 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="space-y-1">
              <span className="text-[8.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Estágio</span>
              <div className="flex items-center gap-1.5 text-xs font-semibold text-gray-800 dark:text-text-gray-250">
                <Calendar size={13} className="text-gray-400" />
                {new Date(date).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="space-y-1">
              <span className="text-[8.5px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">Seu papel</span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                isCreator 
                  ? 'bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400 border border-emerald-200/50 dark:border-emerald-800/30' 
                  : 'bg-blue-100 dark:bg-blue-950/40 text-blue-800 dark:text-blue-400 border border-blue-200/50 dark:border-blue-800/30'
              }`}>
                {isCreator ? 'Responsável Direto' : 'Colaborador Marcado'}
              </span>
            </div>
          </div>

          {/* Envolved professionals */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} className="text-gray-400" /> Profissionais do Atendimento
            </h4>
            <div className="space-y-2 bg-gray-50/50 dark:bg-gray-850/50 p-3 rounded-2xl border border-gray-100/50 dark:border-gray-800/50">
              <div className="flex items-center gap-2">
                <User size={13} className="text-blue-500" />
                <span className="text-xs text-gray-500">Responsável Principal:</span>
                <span className="text-xs font-bold text-gray-800 dark:text-gray-250">{creatorName}</span>
              </div>
              {coWorkers && coWorkers.length > 0 && (
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex items-start gap-2">
                  <Users size={13} className="text-green-500 mt-0.5" />
                  <div className="space-y-1">
                    <span className="text-xs text-gray-500 block">Outros Profissionais Marcados:</span>
                    <div className="flex flex-wrap gap-1.5">
                      {coWorkers.map((cwId) => {
                        const prof = professionals.find(p => p.id === cwId || p.email === cwId || p.name === cwId);
                        return (
                          <span key={cwId} className="px-2 py-0.5 bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-400 text-[10px] font-semibold rounded-lg border border-green-150/50 dark:border-green-900/30">
                            {prof?.name || cwId}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Patient Details (if individual evolution / attendance) */}
          {patient && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Smile size={14} className="text-gray-400" /> Idoso Atendido
              </h4>
              <div className="flex items-center gap-3 p-3 bg-gray-50/50 dark:bg-gray-850/50 border border-gray-100/50 dark:border-gray-800/50 rounded-2xl">
                {patient.photoUrl ? (
                  <img src={patient.photoUrl} alt={patient.name} className="w-10 h-10 rounded-full object-cover border border-gray-100 dark:border-gray-800" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 font-bold flex items-center justify-center text-sm border border-blue-100/30">
                    {patient.name?.charAt(0)}
                  </div>
                )}
                <div>
                  <span className="text-xs font-bold text-gray-850 dark:text-gray-200 block">{patient.name}</span>
                  <p className="text-[10px] text-gray-400">Prontuário individual sincronizado para a equipe</p>
                </div>
              </div>
            </div>
          )}

          {/* Linked Patients list for group workshops/activities */}
          {linkedPatients.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Smile size={14} className="text-gray-400" /> Participantes ({linkedPatients.length})
              </h4>
              <div className="flex flex-wrap gap-1.5 p-3 bg-gray-50/50 dark:bg-gray-850/50 border border-gray-100/50 dark:border-gray-800/50 rounded-2xl max-h-24 overflow-y-auto">
                {linkedPatients.map(p => (
                  <span key={p.id} className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-[10px] font-medium rounded-lg">
                    {p.name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Evolution / Detailed Content */}
          {evolutionText && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-gray-400" /> Descrição / Evolução
              </h4>
              <div className="p-4 bg-gray-50/30 dark:bg-gray-850/30 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap max-h-40 overflow-y-auto">
                {evolutionText}
              </div>
            </div>
          )}

          {/* Conduct / Goals */}
          {conductText && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <ClipboardList size={14} className="text-gray-400" /> Conduta / Objetivos
              </h4>
              <div className="p-4 bg-gray-50/30 dark:bg-gray-850/30 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {conductText}
              </div>
            </div>
          )}

          {/* Recommendations, Materials or Methodology */}
          {recommendations && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles size={14} className="text-gray-400" /> Recomendações / Recursos / Metodologia
              </h4>
              <div className="p-4 bg-gray-50/30 dark:bg-gray-850/30 border border-gray-100 dark:border-gray-800 rounded-2xl text-xs leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">
                {recommendations}
              </div>
            </div>
          )}

          {/* Attachments / Photos / Annexes */}
          {attachments && attachments.length > 0 && (
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                <FileText size={14} className="text-gray-400" /> Anexos / Fotos ({attachments.length})
              </h4>
              <div className="grid grid-cols-3 gap-2 p-3 bg-gray-50/50 dark:bg-gray-850/50 border border-gray-100/50 dark:border-gray-800/50 rounded-2xl">
                {attachments.map((photo, idx) => (
                  <a href={photo} target="_blank" rel="noopener noreferrer" key={idx} className="block group relative aspect-video rounded-xl overflow-hidden border border-gray-255 dark:border-gray-700">
                    <img src={photo} alt={`Anexo ${idx + 1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                    <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                      Ampliar
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 dark:bg-gray-950 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-5 py-2.5 bg-gray-200 hover:bg-gray-300 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-200 text-xs font-bold rounded-xl transition-all"
          >
            Fechar Visualização
          </button>
        </div>
      </div>
    </div>
  );
};
