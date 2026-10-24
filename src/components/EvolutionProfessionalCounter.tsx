import React, { useState, useMemo } from 'react';
import { 
  Users, 
  BarChart3, 
  ChevronDown, 
  ChevronUp, 
  Filter, 
  X, 
  Printer, 
  Award, 
  CheckCircle2, 
  Search,
  Sparkles,
  Layers,
  TrendingUp,
  UserCheck
} from 'lucide-react';
import { Professional, Role } from '../types';
import { ROLE_LABELS } from '../constants';
import { OFFICIAL_INSTITUTIONAL_ROSTER } from '../App';
import { generateModernPDF } from '../lib/pdfUtils';
import { format } from 'date-fns';

export interface EvolutionCounterProps {
  // Evolutions displayed in the current tab / section
  evolutions: any[];
  // Optional all evolutions (for cross-specialty comparison)
  allEvolutions?: any[];
  // List of active professionals
  professionals?: Professional[];
  // Current active professional filter, if any
  selectedProfessional?: string | null;
  // Callback when a professional is clicked to filter the list
  onSelectProfessional?: (profNameOrId: string | null) => void;
  // Sector or Tab name for context (e.g. 'Fisioterapia', 'Enfermagem', 'Psicologia')
  sectorName?: string;
  // Default open state (false by default)
  defaultOpen?: boolean;
  // Extra custom title or subtitle
  title?: string;
}

// Canonical mapping for role-to-official professional when raw text is only the role
const ROLE_TO_DEFAULT_PROF_NAME: Record<string, string> = {
  'ENFERMEIRA': 'Jordana Viero',
  'FISIOTERAPEUTA': 'Lysllie Vieira',
  'PSICOLOGA': 'Tenaelen Marinho',
  'PEDAGOGA': 'Amanda Velez',
  'ASSISTENTE_SOCIAL': 'Jardeline Amorim',
  'COORDENADORA': 'Franciara Coelho',
  'PROJETISTA': 'Rodrigo',
  'FABRICANTE_FRALDAS': 'Lucas Emanuel Barbosa',
  'PRESIDENTE': 'Maria Enilde',
  'AUXILIAR_ADMINISTRATIVO': 'Fernanda Kellen',
  'CUIDADORA': 'Vania Vieira Lima'
};

const SECTOR_TO_ROLE: Record<string, string> = {
  'Enfermagem': 'ENFERMEIRA',
  'Fisioterapia': 'FISIOTERAPEUTA',
  'Psicologia': 'PSICOLOGA',
  'Pedagogia': 'PEDAGOGA',
  'Serviço Social': 'ASSISTENTE_SOCIAL',
  'Nutrição': 'NUTRICIONISTA'
};

const ROLE_COLORS: Record<string, { bg: string; text: string; border: string; ring: string }> = {
  'ENFERMEIRA': { bg: 'bg-emerald-50 dark:bg-emerald-950/30', text: 'text-emerald-700 dark:text-emerald-400', border: 'border-emerald-200 dark:border-emerald-800', ring: 'ring-emerald-500' },
  'FISIOTERAPEUTA': { bg: 'bg-blue-50 dark:bg-blue-950/30', text: 'text-blue-700 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', ring: 'ring-blue-500' },
  'PSICOLOGA': { bg: 'bg-purple-50 dark:bg-purple-950/30', text: 'text-purple-700 dark:text-purple-400', border: 'border-purple-200 dark:border-purple-800', ring: 'ring-purple-500' },
  'PEDAGOGA': { bg: 'bg-pink-50 dark:bg-pink-950/30', text: 'text-pink-700 dark:text-pink-400', border: 'border-pink-200 dark:border-pink-800', ring: 'ring-pink-500' },
  'ASSISTENTE_SOCIAL': { bg: 'bg-amber-50 dark:bg-amber-950/30', text: 'text-amber-700 dark:text-amber-400', border: 'border-amber-200 dark:border-amber-800', ring: 'ring-amber-500' },
  'NUTRICIONISTA': { bg: 'bg-orange-50 dark:bg-orange-950/30', text: 'text-orange-700 dark:text-orange-400', border: 'border-orange-200 dark:border-orange-800', ring: 'ring-orange-500' },
  'COORDENADORA': { bg: 'bg-teal-50 dark:bg-teal-950/30', text: 'text-teal-700 dark:text-teal-400', border: 'border-teal-200 dark:border-teal-800', ring: 'ring-teal-500' },
  'DEFAULT': { bg: 'bg-gray-50 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700', ring: 'ring-gray-400' }
};

/**
 * Normalizes string for fuzzy/case-insensitive matching
 */
function normalize(str: any): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

/**
 * Checks whether an evolution matches a given professional (either as author or co-worker)
 */
export function matchesEvolutionToProfessional(evo: any, prof: { id?: string; uid?: string; name: string; role?: string; email?: string }): { isDirect: boolean; isCoWorker: boolean } {
  if (!evo || !prof) return { isDirect: false, isCoWorker: false };

  const normProfName = normalize(prof.name);
  const normProfId = normalize(prof.id);
  const normProfUid = normalize(prof.uid);
  const normProfEmail = normalize(prof.email);

  // 1. Direct author extraction
  const authorRaw = evo.registeredBy || evo.author || evo.creatorIdOrName || evo.professional || evo.professionalName || evo.userId || '';
  const normAuthor = normalize(authorRaw);

  let isDirect = false;

  if (normAuthor) {
    if (
      (normProfName && normAuthor.includes(normProfName)) ||
      (normProfName && normProfName.includes(normAuthor)) ||
      (normProfId && normAuthor === normProfId) ||
      (normProfUid && normAuthor === normProfUid) ||
      (normProfEmail && normAuthor === normProfEmail)
    ) {
      isDirect = true;
    }
  }

  // If author was recorded purely as role (e.g. "Enfermeira", "Fisioterapeuta")
  if (!isDirect && normAuthor && prof.role) {
    const defaultName = ROLE_TO_DEFAULT_PROF_NAME[prof.role];
    if (defaultName && normalize(defaultName) === normProfName) {
      const roleLabel = normalize(ROLE_LABELS[prof.role as Role] || prof.role);
      if (normAuthor === roleLabel || normAuthor.includes(roleLabel)) {
        isDirect = true;
      }
    }
  }

  // Fallback for Physio if registeredBy was not stored: attribute to Physio lead (Lysllie Vieira)
  if (!isDirect && !normAuthor && evo.procedures !== undefined && prof.role === 'FISIOTERAPEUTA') {
    if (normProfName.includes('lysslie') || normProfName.includes('fisioterapeuta')) {
      isDirect = true;
    }
  }

  // 2. Co-workers / Co-participantes matching
  let isCoWorker = false;
  const coWorkersList: string[] = Array.isArray(evo.coWorkers) ? evo.coWorkers : [];

  for (const cw of coWorkersList) {
    const normCw = normalize(cw);
    if (!normCw) continue;
    if (
      (normProfName && normCw.includes(normProfName)) ||
      (normProfName && normProfName.includes(normCw)) ||
      (normProfId && normCw === normProfId) ||
      (normProfUid && normCw === normProfUid) ||
      (normProfEmail && normCw === normProfEmail)
    ) {
      isCoWorker = true;
      break;
    }
    // Also match role alias in coWorkers
    if (prof.role) {
      const roleLabel = normalize(ROLE_LABELS[prof.role as Role] || prof.role);
      if (normCw === roleLabel || normCw === normalize(prof.role)) {
        isCoWorker = true;
        break;
      }
    }
  }

  return { isDirect, isCoWorker };
}

export const EvolutionProfessionalCounter: React.FC<EvolutionCounterProps> = ({
  evolutions = [],
  allEvolutions,
  professionals = [],
  selectedProfessional = null,
  onSelectProfessional,
  sectorName = 'Evolução',
  defaultOpen = false,
  title
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [scope, setScope] = useState<'current' | 'all'>('current');
  const [searchTerm, setSearchTerm] = useState('');

  // Merge full institutional roster with any dynamic professionals
  const mergedProfessionals = useMemo(() => {
    const map = new Map<string, Professional>();
    // First seed official institutional roster
    OFFICIAL_INSTITUTIONAL_ROSTER.forEach(p => {
      map.set(normalize(p.name), p);
    });
    // Add passed professionals
    (professionals || []).forEach(p => {
      if (p && p.name) {
        const key = normalize(p.name);
        if (!map.has(key)) {
          map.set(key, p);
        } else {
          // Merge properties
          map.set(key, { ...map.get(key)!, ...p });
        }
      }
    });
    return Array.from(map.values());
  }, [professionals]);

  // Choose which set of evolutions to count
  const activeEvolutions = useMemo(() => {
    if (scope === 'all' && allEvolutions && allEvolutions.length > 0) {
      return allEvolutions;
    }
    return evolutions || [];
  }, [scope, allEvolutions, evolutions]);

  // Compute counts for all professionals
  const professionalStats = useMemo(() => {
    const totalEvolutionsCount = activeEvolutions.length;

    const stats = mergedProfessionals.map(prof => {
      let directCount = 0;
      let coWorkerCount = 0;

      activeEvolutions.forEach(evo => {
        const { isDirect, isCoWorker } = matchesEvolutionToProfessional(evo, prof);
        if (isDirect) directCount++;
        else if (isCoWorker) coWorkerCount++;
      });

      const totalCount = directCount + coWorkerCount;
      const percentage = totalEvolutionsCount > 0 ? Math.round((totalCount / totalEvolutionsCount) * 100) : 0;

      return {
        prof,
        name: prof.name,
        role: prof.role || 'Colaborador',
        roleLabel: ROLE_LABELS[prof.role as Role] || prof.role || 'Profissional',
        directCount,
        coWorkerCount,
        totalCount,
        percentage
      };
    });

    // Also detect any authors not in roster (e.g. historical entries)
    const knownNames = new Set(stats.map(s => normalize(s.name)));
    const unregisteredAuthorsMap = new Map<string, number>();

    activeEvolutions.forEach(evo => {
      const author = evo.registeredBy || evo.author || evo.creatorIdOrName || evo.professional || evo.professionalName;
      if (author && typeof author === 'string') {
        const norm = normalize(author);
        // If not matched to any existing professional
        const isMatched = stats.some(s => {
          const { isDirect } = matchesEvolutionToProfessional(evo, s.prof);
          return isDirect;
        });
        if (!isMatched && norm.length > 2 && !knownNames.has(norm)) {
          unregisteredAuthorsMap.set(author, (unregisteredAuthorsMap.get(author) || 0) + 1);
        }
      }
    });

    const unregisteredStats = Array.from(unregisteredAuthorsMap.entries()).map(([rawAuthor, count]) => {
      const percentage = totalEvolutionsCount > 0 ? Math.round((count / totalEvolutionsCount) * 100) : 0;
      return {
        prof: {
          id: `unreg-${rawAuthor}`,
          name: rawAuthor,
          role: 'ADMIN' as Role,
          status: 'ATIVO' as const,
          admissionDate: '',
          createdAt: ''
        },
        name: rawAuthor,
        role: 'Colaborador',
        roleLabel: 'Colaborador / Registro Externo',
        directCount: count,
        coWorkerCount: 0,
        totalCount: count,
        percentage
      };
    });

    const allCombinedStats = [...stats, ...unregisteredStats];

    // Sort: professionals with records first (descending by totalCount), then by name
    allCombinedStats.sort((a, b) => {
      if (b.totalCount !== a.totalCount) {
        return b.totalCount - a.totalCount;
      }
      return a.name.localeCompare(b.name);
    });

    return {
      items: allCombinedStats,
      totalEvolutions: totalEvolutionsCount,
      activeProfessionalsCount: allCombinedStats.filter(s => s.totalCount > 0).length
    };
  }, [mergedProfessionals, activeEvolutions]);

  // Filtered by search
  const filteredStats = useMemo(() => {
    if (!searchTerm.trim()) return professionalStats.items;
    const term = normalize(searchTerm);
    return professionalStats.items.filter(s => 
      normalize(s.name).includes(term) || normalize(s.roleLabel).includes(term)
    );
  }, [professionalStats.items, searchTerm]);

  // Export summary PDF
  const handleExportSummaryPdf = async () => {
    const tableData = professionalStats.items.map((item, idx) => [
      String(idx + 1),
      item.name,
      item.roleLabel,
      String(item.directCount),
      String(item.coWorkerCount),
      String(item.totalCount),
      `${item.percentage}%`
    ]);

    await generateModernPDF({
      title: `Contagem de Lançamentos de Evoluções - ${sectorName}`,
      subtitle: `Relatório emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')} | Total de Evoluções: ${professionalStats.totalEvolutions} | Profissionais com Lançamentos: ${professionalStats.activeProfessionalsCount}`,
      columns: ['#', 'Profissional', 'Cargo / Especialidade', 'Lançamentos Diretos', 'Em Conjunto', 'Total Lançamentos', 'Participação (%)'],
      data: tableData,
      fileName: `contagem_evolucoes_${normalize(sectorName)}_${Date.now()}`,
      orientation: 'portrait'
    });
  };

  const handleToggleProfFilter = (profName: string) => {
    if (!onSelectProfessional) return;
    if (selectedProfessional && normalize(selectedProfessional) === normalize(profName)) {
      onSelectProfessional(null); // Clear filter
    } else {
      onSelectProfessional(profName); // Apply filter
    }
  };

  const isCurrentFilterActive = Boolean(selectedProfessional);

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Barra de Ação / Botão de Ativação da Contagem */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-gradient-to-r from-emerald-50 via-teal-50 to-blue-50 dark:from-emerald-950/20 dark:via-teal-950/20 dark:to-blue-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 shadow-sm transition-all">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
            <BarChart3 size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-900 dark:text-emerald-300">
                Contagem de Lançamentos
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black bg-emerald-600 text-white shadow-xs">
                {professionalStats.totalEvolutions} evolução(ões)
              </span>
              {isCurrentFilterActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse">
                  <Filter size={10} /> Filtro: {selectedProfessional}
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium">
              Acompanhamento de registros da equipe multidisciplinar ({professionalStats.activeProfessionalsCount} profissionais ativas)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isCurrentFilterActive && onSelectProfessional && (
            <button
              onClick={() => onSelectProfessional(null)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl transition-colors border border-amber-200 dark:border-amber-800"
              title="Remover filtro e exibir todas as evoluções"
            >
              <X size={13} />
              Limpar Filtro
            </button>
          )}

          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm ${
              isOpen 
                ? 'bg-emerald-700 text-white shadow-emerald-700/20' 
                : 'bg-white dark:bg-gray-900 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100/60 dark:hover:bg-gray-800 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            <Users size={15} />
            <span>{isOpen ? 'Ocultar Contagem' : 'Ver Contagem das Profissionais'}</span>
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Painel Expansível de Contagem dos Lançamentos */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 md:p-6 border border-emerald-100 dark:border-emerald-900/40 shadow-lg space-y-5 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Cabeçalho do Painel */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-base font-black text-gray-900 dark:text-white">
                  {title || `Lançamentos por Profissional — ${sectorName}`}
                </h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Clique no card de qualquer profissional para filtrar a lista e visualizar apenas os lançamentos feitos por ela.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {allEvolutions && allEvolutions.length > 0 && (
                <div className="flex items-center bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold">
                  <button
                    onClick={() => setScope('current')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      scope === 'current'
                        ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    Nesta Aba ({evolutions.length})
                  </button>
                  <button
                    onClick={() => setScope('all')}
                    className={`px-3 py-1.5 rounded-lg transition-all ${
                      scope === 'all'
                        ? 'bg-white dark:bg-gray-900 text-emerald-700 dark:text-emerald-300 shadow-xs'
                        : 'text-gray-600 dark:text-gray-400 hover:text-gray-900'
                    }`}
                  >
                    Geral Multidisciplinar ({allEvolutions.length})
                  </button>
                </div>
              )}

              <button
                onClick={handleExportSummaryPdf}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl text-xs font-bold transition-colors border border-gray-200 dark:border-gray-700 shadow-xs"
                title="Imprimir relatório da contagem"
              >
                <Printer size={14} />
                Imprimir Contagem
              </button>
            </div>
          </div>

          {/* Barra de Busca de Profissional */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por profissional ou cargo..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-xs bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-4 text-xs font-medium text-gray-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                Lançamento Direto
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block" />
                Em Conjunto (Co-participante)
              </span>
            </div>
          </div>

          {/* Grid de Cards de Todas as Profissionais */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredStats.map((item) => {
              const colors = ROLE_COLORS[item.role] || ROLE_COLORS.DEFAULT;
              const isSelected = selectedProfessional && normalize(selectedProfessional) === normalize(item.name);
              const initials = item.name.split(' ').map(n => n[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

              return (
                <div
                  key={item.name}
                  onClick={() => handleToggleProfFilter(item.name)}
                  className={`group relative p-4 rounded-2xl border transition-all cursor-pointer ${
                    isSelected
                      ? `bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-500 ring-2 ring-emerald-500 shadow-md`
                      : `${colors.bg} ${colors.border} hover:border-emerald-400 dark:hover:border-emerald-600 hover:shadow-md`
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm shrink-0 border ${
                        isSelected 
                          ? 'bg-emerald-600 text-white border-emerald-700' 
                          : `${colors.bg} ${colors.text} ${colors.border}`
                      }`}>
                        {initials || <Users size={16} />}
                      </div>
                      <div className="min-w-0">
                        <h5 className="font-extrabold text-xs text-gray-900 dark:text-white truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors">
                          {item.name}
                        </h5>
                        <p className={`text-[10px] font-bold uppercase tracking-wider truncate ${colors.text}`}>
                          {item.roleLabel}
                        </p>
                      </div>
                    </div>

                    {isSelected ? (
                      <span className="p-1 rounded-full bg-emerald-600 text-white shrink-0" title="Filtro Ativo">
                        <CheckCircle2 size={14} />
                      </span>
                    ) : (
                      <span className="text-[10px] font-extrabold text-gray-400 dark:text-gray-500 shrink-0">
                        {item.percentage}%
                      </span>
                    )}
                  </div>

                  {/* Número de Lançamentos */}
                  <div className="flex items-baseline justify-between mt-2 pt-2 border-t border-black/5 dark:border-white/5">
                    <div>
                      <span className="text-2xl font-black text-gray-900 dark:text-white">
                        {item.totalCount}
                      </span>
                      <span className="text-[11px] font-bold text-gray-500 dark:text-gray-400 ml-1.5">
                        {item.totalCount === 1 ? 'lançamento' : 'lançamentos'}
                      </span>
                    </div>

                    {item.coWorkerCount > 0 && (
                      <span className="text-[10px] text-gray-500 dark:text-gray-400 font-medium" title={`${item.directCount} direto(s) + ${item.coWorkerCount} em equipe`}>
                        {item.directCount} dir. + {item.coWorkerCount} conj.
                      </span>
                    )}
                  </div>

                  {/* Barra de Progresso Visual */}
                  <div className="w-full bg-black/5 dark:bg-white/5 h-1.5 rounded-full mt-2.5 overflow-hidden">
                    <div 
                      className="bg-emerald-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, Math.max(item.totalCount > 0 ? 5 : 0, item.percentage))}%` }}
                    />
                  </div>

                  <div className="mt-2.5 flex items-center justify-between text-[10px] font-bold text-gray-400 dark:text-gray-500">
                    <span>
                      {isSelected ? '✓ Filtrando evoluções' : 'Clique para filtrar'}
                    </span>
                    <Filter size={10} className={isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'opacity-0 group-hover:opacity-100 transition-opacity'} />
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStats.length === 0 && (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-xs">
              Nenhuma profissional encontrada para o termo "{searchTerm}".
            </div>
          )}

          {/* Rodapé com Estatísticas Globais */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-4">
              <span>
                <strong>Total Geral:</strong> {professionalStats.totalEvolutions} evoluções
              </span>
              <span>
                <strong>Profissionais Ativas:</strong> {professionalStats.activeProfessionalsCount} de {professionalStats.items.length}
              </span>
            </div>

            {selectedProfessional && onSelectProfessional && (
              <button
                onClick={() => onSelectProfessional(null)}
                className="text-emerald-700 dark:text-emerald-400 font-extrabold hover:underline"
              >
                Voltar a exibir todos os lançamentos
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
