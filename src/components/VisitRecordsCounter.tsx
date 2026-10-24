import React, { useState, useMemo } from 'react';
import {
  Users,
  Calendar,
  Heart,
  Filter,
  X,
  Printer,
  Sparkles,
  BarChart3,
  TrendingUp,
  Search,
  ChevronDown,
  ChevronUp,
  Award,
  CheckCircle2,
  Clock,
  UserCheck,
  Building2,
  Tag
} from 'lucide-react';
import { SocialFamilyVisit, SocialPatient, Elderly, Professional, Role } from '../types';
import { ROLE_LABELS } from '../constants';
import { OFFICIAL_INSTITUTIONAL_ROSTER } from '../App';
import { generateModernPDF } from '../lib/pdfUtils';
import { format, parseISO, isSameMonth, isSameWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface VisitRecordsCounterProps {
  visits: SocialFamilyVisit[];
  patients?: SocialPatient[];
  elderly?: Elderly[];
  professionals?: Professional[];
  selectedProfessional?: string | null;
  onSelectProfessional?: (profName: string | null) => void;
  selectedPatientId?: string | null;
  onSelectPatient?: (patientId: string | null) => void;
  selectedKinship?: string | null;
  onSelectKinship?: (kinship: string | null) => void;
  defaultOpen?: boolean;
}

function normalize(str: any): string {
  if (!str) return '';
  return String(str)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

export function matchesVisitToProfessional(
  visit: SocialFamilyVisit,
  prof: { id?: string; uid?: string; name: string; role?: string; email?: string }
): boolean {
  if (!visit || !prof) return false;

  const normProfName = normalize(prof.name);
  const normProfId = normalize(prof.id);
  const normProfUid = normalize(prof.uid);
  const normProfEmail = normalize(prof.email);

  const authorRaw = visit.registeredBy || '';
  const normAuthor = normalize(authorRaw);

  if (!normAuthor) {
    // If no author recorded, historically attributed to Assistente Social (Jardeline Amorim)
    if (prof.role === 'ASSISTENTE_SOCIAL' || normProfName.includes('jardeline')) {
      return true;
    }
    return false;
  }

  if (
    (normProfName && normAuthor.includes(normProfName)) ||
    (normProfName && normProfName.includes(normAuthor)) ||
    (normProfId && normAuthor === normProfId) ||
    (normProfUid && normAuthor === normProfUid) ||
    (normProfEmail && normAuthor === normProfEmail)
  ) {
    return true;
  }

  // If author was recorded purely as role (e.g. "Assistente Social", "Coordenadora")
  if (prof.role) {
    const roleLabel = normalize(ROLE_LABELS[prof.role as Role] || prof.role);
    if (normAuthor === roleLabel || normAuthor.includes(roleLabel)) {
      if (prof.role === 'ASSISTENTE_SOCIAL' && (normProfName.includes('jardeline') || !normProfName)) {
        return true;
      }
      if (prof.role === 'COORDENADORA' && normProfName.includes('franciara')) {
        return true;
      }
    }
  }

  return false;
}

export const VisitRecordsCounter: React.FC<VisitRecordsCounterProps> = ({
  visits = [],
  patients = [],
  elderly = [],
  professionals = [],
  selectedProfessional = null,
  onSelectProfessional,
  selectedPatientId = null,
  onSelectPatient,
  selectedKinship = null,
  onSelectKinship,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'professional' | 'patient' | 'kinship' | 'period'>('professional');
  const [searchTerm, setSearchTerm] = useState('');

  // Merge full institutional roster with any dynamic professionals
  const mergedProfessionals = useMemo(() => {
    const map = new Map<string, Professional>();
    OFFICIAL_INSTITUTIONAL_ROSTER.forEach(p => {
      map.set(normalize(p.name), p);
    });
    (professionals || []).forEach(p => {
      if (p && p.name) {
        const key = normalize(p.name);
        if (!map.has(key)) {
          map.set(key, p);
        } else {
          map.set(key, { ...map.get(key)!, ...p });
        }
      }
    });
    return Array.from(map.values());
  }, [professionals]);

  // Overall counts and temporal breakdown
  const metrics = useMemo(() => {
    const totalVisits = visits.length;
    const now = new Date();

    let thisMonthCount = 0;
    let thisWeekCount = 0;
    let todayCount = 0;

    const visitedPatientIdSet = new Set<string>();

    visits.forEach(v => {
      if (v.patientId) visitedPatientIdSet.add(v.patientId);
      if (v.patientIds && Array.isArray(v.patientIds)) {
        v.patientIds.forEach(pid => visitedPatientIdSet.add(pid));
      }

      if (v.date) {
        try {
          const d = parseISO(v.date.substring(0, 10));
          if (isToday(d)) todayCount++;
          if (isSameWeek(d, now, { weekStartsOn: 0 })) thisWeekCount++;
          if (isSameMonth(d, now)) thisMonthCount++;
        } catch {
          // Ignore invalid dates
        }
      }
    });

    return {
      totalVisits,
      visitedPatientsCount: visitedPatientIdSet.size,
      thisMonthCount,
      thisWeekCount,
      todayCount
    };
  }, [visits]);

  // 1. Professional counts (who registered the visits)
  const professionalStats = useMemo(() => {
    const totalVisits = visits.length;

    const stats = mergedProfessionals.map(prof => {
      let count = 0;
      visits.forEach(v => {
        if (matchesVisitToProfessional(v, prof)) {
          count++;
        }
      });

      const percentage = totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0;
      return {
        prof,
        name: prof.name,
        role: prof.role || 'ASSISTENTE_SOCIAL',
        roleLabel: ROLE_LABELS[prof.role as Role] || prof.role || 'Assistente Social',
        count,
        percentage
      };
    });

    // Detect any other unregistered authors in visits
    const knownNames = new Set(stats.map(s => normalize(s.name)));
    const unregisteredMap = new Map<string, number>();

    visits.forEach(v => {
      const author = v.registeredBy;
      if (author && typeof author === 'string') {
        const norm = normalize(author);
        const isMatched = stats.some(s => matchesVisitToProfessional(v, s.prof));
        if (!isMatched && norm.length > 2 && !knownNames.has(norm)) {
          unregisteredMap.set(author, (unregisteredMap.get(author) || 0) + 1);
        }
      }
    });

    const unregisteredStats = Array.from(unregisteredMap.entries()).map(([rawAuthor, count]) => {
      const percentage = totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0;
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
        roleLabel: 'Registro Geral / Equipe',
        count,
        percentage
      };
    });

    const allCombined = [...stats, ...unregisteredStats];
    allCombined.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name);
    });

    return {
      items: allCombined,
      activeProfessionalsCount: allCombined.filter(s => s.count > 0).length
    };
  }, [mergedProfessionals, visits]);

  // 2. Patient counts (who received visits)
  const patientStats = useMemo(() => {
    const totalVisits = visits.length;
    const map = new Map<string, { patientName: string; count: number; lastVisit?: string }>();

    // Seed with all current patients
    (patients || []).forEach(p => {
      const linked = p.elderlyId ? (elderly || []).find(e => e.id === p.elderlyId) : null;
      const displayName = linked?.name || p.name || 'Não identificado';
      map.set(p.id, { patientName: displayName, count: 0, lastVisit: undefined });
    });

    // Count visits per patient
    visits.forEach(v => {
      const pids: string[] = v.patientIds && Array.isArray(v.patientIds) && v.patientIds.length > 0
        ? v.patientIds
        : (v.patientId ? [v.patientId] : []);

      pids.forEach(pid => {
        if (!map.has(pid)) {
          const patient = (patients || []).find(p => p.id === pid);
          const linked = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
          const displayName = linked?.name || patient?.name || 'Não cadastrado';
          map.set(pid, { patientName: displayName, count: 0, lastVisit: undefined });
        }
        const record = map.get(pid)!;
        record.count++;
        if (!record.lastVisit || (v.date && v.date > record.lastVisit)) {
          record.lastVisit = v.date;
        }
      });
    });

    const items = Array.from(map.entries()).map(([patientId, data]) => {
      const percentage = totalVisits > 0 ? Math.round((data.count / totalVisits) * 100) : 0;
      return {
        patientId,
        patientName: data.patientName,
        count: data.count,
        lastVisit: data.lastVisit,
        percentage
      };
    });

    items.sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.patientName.localeCompare(b.patientName);
    });

    return items;
  }, [visits, patients, elderly]);

  // 3. Kinship / Relationship counts
  const kinshipStats = useMemo(() => {
    const totalVisits = visits.length;
    const map = new Map<string, number>();

    visits.forEach(v => {
      const raw = (v.kinship || 'Não Informado').trim();
      const capitalized = raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
      map.set(capitalized, (map.get(capitalized) || 0) + 1);
    });

    const items = Array.from(map.entries()).map(([kinship, count]) => {
      const percentage = totalVisits > 0 ? Math.round((count / totalVisits) * 100) : 0;
      return {
        kinship,
        count,
        percentage
      };
    });

    items.sort((a, b) => b.count - a.count);
    return items;
  }, [visits]);

  // PDF Export
  const handleExportPDF = async () => {
    const tableData = visits.map((v, idx) => {
      const pat = (patients || []).find(p => p.id === v.patientId);
      const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
      const patientName = v.patientIds && v.patientIds.length > 1
        ? v.patientIds.map(pid => (patients || []).find(p => p.id === pid)?.name).filter(Boolean).join(', ')
        : (lk?.name || pat?.name || 'N/A');

      const dateStr = v.date ? v.date.substring(0, 10).split('-').reverse().join('/') : '--/--/----';

      return [
        String(idx + 1),
        dateStr,
        patientName,
        v.visitorName || 'N/A',
        v.kinship || 'N/A',
        v.registeredBy || 'Assistente Social',
        v.observations || ''
      ];
    });

    await generateModernPDF({
      title: 'Contagem e Relatório dos Lançamentos do Controle de Visitas',
      subtitle: `Serviço Social - OAMI | Total de Lançamentos: ${visits.length} | Idosos Atendidos: ${metrics.visitedPatientsCount} | Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      columns: ['#', 'Data', 'Idoso Acolhido', 'Visitante', 'Parentesco', 'Registrado Por', 'Observações / Relato'],
      data: tableData,
      fileName: `relatorio_controle_visitas_oami_${Date.now()}`,
      orientation: 'landscape'
    });
  };

  const isAnyFilterActive = Boolean(selectedProfessional || selectedPatientId || selectedKinship);

  const handleClearAllFilters = () => {
    if (onSelectProfessional) onSelectProfessional(null);
    if (onSelectPatient) onSelectPatient(null);
    if (onSelectKinship) onSelectKinship(null);
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Botão de Ativação / Faixa de Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-emerald-50 via-green-50 to-teal-50 dark:from-emerald-950/20 dark:via-green-950/20 dark:to-teal-950/20 rounded-2xl border border-emerald-200 dark:border-emerald-800/40 shadow-sm transition-all">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20 shrink-0">
            <Calendar size={20} />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-950 dark:text-emerald-300">
                Contagem dos Lançamentos de Visitas
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-emerald-600 text-white shadow-xs">
                {metrics.totalVisits} visita(s)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-gray-800 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                {metrics.visitedPatientsCount} idoso(s) visitado(s)
              </span>
              {isAnyFilterActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white animate-pulse">
                  <Filter size={10} /> Filtro Ativo
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-600 dark:text-gray-400 font-medium mt-0.5">
              Controle quantitativo de visitas familiares, profissionais que registraram e idosos visitados ({metrics.thisMonthCount} neste mês)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isAnyFilterActive && (
            <button
              onClick={handleClearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-amber-800 dark:text-amber-300 bg-amber-100 dark:bg-amber-900/40 hover:bg-amber-200 dark:hover:bg-amber-900/60 rounded-xl transition-colors border border-amber-200 dark:border-amber-800"
              title="Limpar todos os filtros da listagem de visitas"
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
            <BarChart3 size={15} />
            <span>{isOpen ? 'Ocultar Contagem' : 'Ver Contagem das Visitas'}</span>
            {isOpen ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
          </button>
        </div>
      </div>

      {/* Painel Expansível de Contagem Detalhada */}
      {isOpen && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl p-5 md:p-6 border border-emerald-100 dark:border-emerald-900/40 shadow-lg space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
          {/* Cabeçalho */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-800">
            <div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                <h4 className="text-base font-black text-gray-900 dark:text-white">
                  Contagem dos Lançamentos do Controle de Visitas — Serviço Social
                </h4>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                Acompanhe o volume de registros por profissional, acolhidos visitados e grau de parentesco dos visitantes. Clique em qualquer card para filtrar a tabela instantaneamente.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
                title="Exportar relatório completo em PDF"
              >
                <Printer size={14} />
                Exportar Relatório PDF
              </button>
            </div>
          </div>

          {/* Cards de Métricas Principais */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-2xl border border-emerald-100 dark:border-emerald-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800 dark:text-emerald-300">Total Visitas</span>
                <Calendar size={14} className="text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-900 dark:text-white">{metrics.totalVisits}</div>
              <p className="text-[10px] text-emerald-700/80 dark:text-emerald-400 mt-0.5 font-medium">Lançamentos registrados</p>
            </div>

            <div className="p-3.5 bg-blue-50 dark:bg-blue-950/30 rounded-2xl border border-blue-100 dark:border-blue-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-blue-800 dark:text-blue-300">Idosos Atendidos</span>
                <Heart size={14} className="text-blue-600" />
              </div>
              <div className="text-2xl font-black text-blue-900 dark:text-white">{metrics.visitedPatientsCount}</div>
              <p className="text-[10px] text-blue-700/80 dark:text-blue-400 mt-0.5 font-medium">Acolhidos com visita</p>
            </div>

            <div className="p-3.5 bg-purple-50 dark:bg-purple-950/30 rounded-2xl border border-purple-100 dark:border-purple-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-purple-800 dark:text-purple-300">Profissionais</span>
                <UserCheck size={14} className="text-purple-600" />
              </div>
              <div className="text-2xl font-black text-purple-900 dark:text-white">{professionalStats.activeProfessionalsCount}</div>
              <p className="text-[10px] text-purple-700/80 dark:text-purple-400 mt-0.5 font-medium">Com lançamentos</p>
            </div>

            <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 rounded-2xl border border-amber-100 dark:border-amber-800/40">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-amber-800 dark:text-amber-300">Neste Mês</span>
                <Clock size={14} className="text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-900 dark:text-white">{metrics.thisMonthCount}</div>
              <p className="text-[10px] text-amber-700/80 dark:text-amber-400 mt-0.5 font-medium">{metrics.thisWeekCount} nesta semana</p>
            </div>
          </div>

          {/* Abas Internas da Contagem */}
          <div className="flex items-center justify-between border-b border-gray-100 dark:border-gray-800 pb-3 gap-2">
            <div className="flex items-center gap-1.5 overflow-x-auto">
              <button
                onClick={() => setActiveTab('professional')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'professional'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Users size={14} />
                Por Profissional ({professionalStats.items.filter(i => i.count > 0).length})
              </button>

              <button
                onClick={() => setActiveTab('patient')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'patient'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Heart size={14} />
                Por Idoso Acolhido ({patientStats.filter(i => i.count > 0).length})
              </button>

              <button
                onClick={() => setActiveTab('kinship')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-1.5 ${
                  activeTab === 'kinship'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Tag size={14} />
                Por Grau de Parentesco ({kinshipStats.length})
              </button>
            </div>

            <div className="relative w-48 sm:w-64 shrink-0">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Filtrar por nome..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Conteúdo da Aba 1: Por Profissional */}
          {activeTab === 'professional' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {professionalStats.items
                .filter(item => {
                  if (!searchTerm.trim()) return true;
                  const term = normalize(searchTerm);
                  return normalize(item.name).includes(term) || normalize(item.roleLabel).includes(term);
                })
                .map((item, idx) => {
                  const isSelected = selectedProfessional && normalize(selectedProfessional) === normalize(item.name);
                  const isZero = item.count === 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectProfessional && onSelectProfessional(isSelected ? null : item.name)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer relative ${
                        isSelected
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 dark:border-emerald-600 ring-2 ring-emerald-500 shadow-md'
                          : isZero
                          ? 'bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 hover:border-gray-200 opacity-60 hover:opacity-100'
                          : 'bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-800 hover:border-emerald-300 dark:hover:border-emerald-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300'
                          }`}>
                            {item.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                              {item.name}
                            </h5>
                            <span className="inline-block text-[10px] font-bold text-gray-500 dark:text-gray-400 truncate">
                              {item.roleLabel}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className={`text-base font-black ${
                            isSelected ? 'text-emerald-700 dark:text-emerald-300' : 'text-gray-900 dark:text-white'
                          }`}>
                            {item.count}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 block -mt-1">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>

                      {/* Barra de Progresso */}
                      <div className="w-full bg-gray-100 dark:bg-gray-700/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        <span>Lançamentos no controle</span>
                        <span className="font-bold text-emerald-600 dark:text-emerald-400">
                          {isSelected ? '✓ Filtro Ativo' : 'Clique p/ filtrar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Conteúdo da Aba 2: Por Idoso Acolhido */}
          {activeTab === 'patient' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {patientStats
                .filter(item => {
                  if (!searchTerm.trim()) return true;
                  return normalize(item.patientName).includes(normalize(searchTerm));
                })
                .map((item, idx) => {
                  const isSelected = selectedPatientId === item.patientId;
                  const isZero = item.count === 0;

                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectPatient && onSelectPatient(isSelected ? null : item.patientId)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-blue-50 dark:bg-blue-950/40 border-blue-500 dark:border-blue-600 ring-2 ring-blue-500 shadow-md'
                          : isZero
                          ? 'bg-gray-50/60 dark:bg-gray-800/30 border-gray-100 dark:border-gray-800 opacity-60 hover:opacity-100'
                          : 'bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs shrink-0 ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300'
                          }`}>
                            {item.patientName.charAt(0).toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <h5 className="text-xs font-black text-gray-900 dark:text-white truncate">
                              {item.patientName}
                            </h5>
                            <span className="text-[10px] text-gray-400 block truncate">
                              {item.lastVisit ? `Última: ${item.lastVisit.substring(0, 10).split('-').reverse().join('/')}` : 'Sem visita recente'}
                            </span>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="text-base font-black text-gray-900 dark:text-white">
                            {item.count}
                          </span>
                          <span className="text-[10px] font-bold text-gray-400 block -mt-1">
                            {item.percentage}%
                          </span>
                        </div>
                      </div>

                      <div className="w-full bg-gray-100 dark:bg-gray-700/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-blue-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        <span>{item.count === 1 ? '1 visita recebida' : `${item.count} visitas recebidas`}</span>
                        <span className="font-bold text-blue-600 dark:text-blue-400">
                          {isSelected ? '✓ Filtro Ativo' : 'Filtrar idoso'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Conteúdo da Aba 3: Por Grau de Parentesco */}
          {activeTab === 'kinship' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {kinshipStats
                .filter(item => {
                  if (!searchTerm.trim()) return true;
                  return normalize(item.kinship).includes(normalize(searchTerm));
                })
                .map((item, idx) => {
                  const isSelected = selectedKinship && normalize(selectedKinship) === normalize(item.kinship);

                  return (
                    <div
                      key={idx}
                      onClick={() => onSelectKinship && onSelectKinship(isSelected ? null : item.kinship)}
                      className={`group p-4 rounded-2xl border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-purple-50 dark:bg-purple-950/40 border-purple-500 dark:border-purple-600 ring-2 ring-purple-500 shadow-md'
                          : 'bg-white dark:bg-gray-850 border-gray-100 dark:border-gray-800 hover:border-purple-300 dark:hover:border-purple-700 hover:shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-black text-gray-900 dark:text-white capitalize truncate">
                          {item.kinship}
                        </span>
                        <span className="text-sm font-black text-purple-700 dark:text-purple-300">
                          {item.count}
                        </span>
                      </div>

                      <div className="w-full bg-gray-100 dark:bg-gray-700/60 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-purple-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 dark:text-gray-400 mt-2 font-medium">
                        <span>{item.percentage}% das visitas</span>
                        <span className="font-bold text-purple-600 dark:text-purple-400">
                          {isSelected ? '✓ Filtro Ativo' : 'Filtrar parentesco'}
                        </span>
                      </div>
                    </div>
                  );
                })}
            </div>
          )}

          {/* Rodapé Informativo */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-gray-100 dark:border-gray-800 text-xs text-gray-500 dark:text-gray-400">
            <div className="flex items-center gap-3">
              <span>Total de visitas: <strong className="text-gray-800 dark:text-gray-200">{metrics.totalVisits}</strong></span>
              <span>•</span>
              <span>Idosos visitados: <strong className="text-gray-800 dark:text-gray-200">{metrics.visitedPatientsCount}</strong></span>
              <span>•</span>
              <span>Profissionais lançadoras: <strong className="text-gray-800 dark:text-gray-200">{professionalStats.activeProfessionalsCount}</strong></span>
            </div>

            {isAnyFilterActive && (
              <div className="flex items-center gap-2">
                <span className="text-amber-700 dark:text-amber-400 font-bold text-[11px]">
                  Filtro aplicado na listagem abaixo
                </span>
                <button
                  onClick={handleClearAllFilters}
                  className="text-xs font-bold text-red-600 dark:text-red-400 hover:underline"
                >
                  Limpar Todos
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitRecordsCounter;
