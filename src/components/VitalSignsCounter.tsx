import React, { useState, useMemo } from 'react';
import {
  Activity,
  HeartPulse,
  Heart,
  Calendar,
  Thermometer,
  Droplets,
  Wind,
  AlertTriangle,
  CheckCircle2,
  Filter,
  X,
  Printer,
  Search,
  ChevronDown,
  ChevronUp,
  TrendingUp,
  UserCheck,
  Users,
  Award,
  Sparkles,
  Clock,
  ShieldAlert,
  BarChart3,
  Flame,
  ArrowDownRight,
  ArrowUpRight
} from 'lucide-react';
import { VitalSigns, NursingPatient, Elderly, Professional, Role } from '../types';
import { ROLE_LABELS } from '../constants';
import { OFFICIAL_INSTITUTIONAL_ROSTER } from '../App';
import { generateModernPDF } from '../lib/pdfUtils';
import { format, parseISO, isSameMonth, isSameWeek, isToday } from 'date-fns';
import { cn } from '../lib/utils';

export interface VitalSignsCounterProps {
  vitals: VitalSigns[];
  patients?: NursingPatient[];
  elderly?: Elderly[];
  professionals?: Professional[];
  selectedProfessional?: string | null;
  onSelectProfessional?: (profName: string | null) => void;
  selectedPatientId?: string | null;
  onSelectPatient?: (patientId: string | null) => void;
  selectedStatus?: 'ALL' | 'ALTERED' | 'NORMAL' | null;
  onSelectStatus?: (status: 'ALL' | 'ALTERED' | 'NORMAL' | null) => void;
  selectedSpecificAlert?: string | null;
  onSelectSpecificAlert?: (alertType: string | null) => void;
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

export function isVitalSignAltered(v: VitalSigns): boolean {
  if (!v) return false;
  const isBP = (v.systolicBP > 140 || v.systolicBP < 90 || v.diastolicBP > 90 || (v.diastolicBP > 0 && v.diastolicBP < 60));
  const isHR = (v.heartRate > 100 || v.heartRate < 60);
  const isTemp = (v.temperature > 37.5 || v.temperature < 35.5);
  const isSat = (v.saturation < 92);
  const isGlucose = v.bloodGlucose ? (v.bloodGlucose > 180 || v.bloodGlucose < 70) : false;
  return isBP || isHR || isTemp || isSat || isGlucose;
}

export function getVitalSignAlertTags(v: VitalSigns): string[] {
  const tags: string[] = [];
  if (!v) return tags;

  if (v.systolicBP > 140 || v.diastolicBP > 90) tags.push('Hipertensão');
  else if (v.systolicBP < 90 && v.systolicBP > 0) tags.push('Hipotensão');

  if (v.heartRate > 100) tags.push('Taquicardia');
  else if (v.heartRate < 60 && v.heartRate > 0) tags.push('Bradicardia');

  if (v.temperature > 37.5) tags.push('Febre / Febrícula');
  else if (v.temperature < 35.5 && v.temperature > 0) tags.push('Hipotermia');

  if (v.saturation < 92 && v.saturation > 0) tags.push('Dessaturação (<92%)');

  if (v.bloodGlucose) {
    if (v.bloodGlucose > 180) tags.push('Hiperglicemia (>180)');
    else if (v.bloodGlucose < 70) tags.push('Hipoglicemia (<70)');
  }

  return tags;
}

export function matchesVitalSignToProfessional(
  vital: VitalSigns,
  prof: { id?: string; uid?: string; name: string; role?: string; email?: string }
): boolean {
  if (!vital || !prof) return false;

  const normProfName = normalize(prof.name);
  const normProfId = normalize(prof.id);
  const normProfUid = normalize(prof.uid);
  const normProfEmail = normalize(prof.email);

  const authorRaw = vital.registeredBy || '';
  const normAuthor = normalize(authorRaw);

  if (!normAuthor) {
    // If no author recorded, historically default to Enfermeira (Jordana Viero)
    if (prof.role === 'ENFERMEIRA' || normProfName.includes('jordana')) {
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

  // If author was recorded purely as role (e.g. "Enfermeira", "Cuidadora", "Técnica")
  if (prof.role) {
    const roleLabel = normalize(ROLE_LABELS[prof.role as Role] || prof.role);
    if (normAuthor === roleLabel || normAuthor.includes(roleLabel)) {
      if (prof.role === 'ENFERMEIRA' && (normProfName.includes('jordana') || !normProfName)) {
        return true;
      }
      if (prof.role === 'CUIDADORA' && (normProfName.includes('vania') || !normProfName)) {
        return true;
      }
      if (prof.role === 'COORDENADORA' && normProfName.includes('franciara')) {
        return true;
      }
    }
  }

  return false;
}

export const VitalSignsCounter: React.FC<VitalSignsCounterProps> = ({
  vitals = [],
  patients = [],
  elderly = [],
  professionals = [],
  selectedProfessional = null,
  onSelectProfessional,
  selectedPatientId = null,
  onSelectPatient,
  selectedStatus = null,
  onSelectStatus,
  selectedSpecificAlert = null,
  onSelectSpecificAlert,
  defaultOpen = false
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [activeTab, setActiveTab] = useState<'professional' | 'status' | 'patient' | 'period'>('professional');
  const [searchTerm, setSearchTerm] = useState('');

  // Merged official institutional roster with active professionals
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
    const totalVitals = vitals.length;
    const now = new Date();

    let thisMonthCount = 0;
    let thisWeekCount = 0;
    let todayCount = 0;
    let alteredCount = 0;
    let normalCount = 0;

    let bpAlertsCount = 0;
    let hrAlertsCount = 0;
    let tempAlertsCount = 0;
    let satAlertsCount = 0;
    let glucoseAlertsCount = 0;

    let sumSys = 0;
    let sumDia = 0;
    let sumHR = 0;
    let sumTemp = 0;
    let sumSat = 0;
    let validSys = 0;
    let validDia = 0;
    let validHR = 0;
    let validTemp = 0;
    let validSat = 0;

    const monitoredPatientSet = new Set<string>();

    vitals.forEach(v => {
      if (v.patientId) monitoredPatientSet.add(v.patientId);
      if ((v as any).patientIds && Array.isArray((v as any).patientIds)) {
        (v as any).patientIds.forEach((pid: string) => monitoredPatientSet.add(pid));
      }

      const altered = isVitalSignAltered(v);
      if (altered) alteredCount++;
      else normalCount++;

      // Specific clinical counts
      if (v.systolicBP > 140 || v.diastolicBP > 90 || (v.systolicBP < 90 && v.systolicBP > 0)) bpAlertsCount++;
      if (v.heartRate > 100 || (v.heartRate < 60 && v.heartRate > 0)) hrAlertsCount++;
      if (v.temperature > 37.5 || (v.temperature < 35.5 && v.temperature > 0)) tempAlertsCount++;
      if (v.saturation < 92 && v.saturation > 0) satAlertsCount++;
      if (v.bloodGlucose && (v.bloodGlucose > 180 || v.bloodGlucose < 70)) glucoseAlertsCount++;

      // Running averages
      if (v.systolicBP > 0) { sumSys += v.systolicBP; validSys++; }
      if (v.diastolicBP > 0) { sumDia += v.diastolicBP; validDia++; }
      if (v.heartRate > 0) { sumHR += v.heartRate; validHR++; }
      if (v.temperature > 0) { sumTemp += v.temperature; validTemp++; }
      if (v.saturation > 0) { sumSat += v.saturation; validSat++; }

      if (v.date) {
        try {
          const d = parseISO(v.date.substring(0, 10));
          if (isToday(d)) todayCount++;
          if (isSameWeek(d, now, { weekStartsOn: 0 })) thisWeekCount++;
          if (isSameMonth(d, now)) thisMonthCount++;
        } catch {
          // ignore
        }
      }
    });

    const alteredPercentage = totalVitals > 0 ? Math.round((alteredCount / totalVitals) * 100) : 0;
    const normalPercentage = totalVitals > 0 ? Math.round((normalCount / totalVitals) * 100) : 0;

    return {
      totalVitals,
      monitoredPatientsCount: monitoredPatientSet.size,
      todayCount,
      thisWeekCount,
      thisMonthCount,
      alteredCount,
      normalCount,
      alteredPercentage,
      normalPercentage,
      bpAlertsCount,
      hrAlertsCount,
      tempAlertsCount,
      satAlertsCount,
      glucoseAlertsCount,
      avgSys: validSys > 0 ? Math.round(sumSys / validSys) : 120,
      avgDia: validDia > 0 ? Math.round(sumDia / validDia) : 80,
      avgHR: validHR > 0 ? Math.round(sumHR / validHR) : 75,
      avgTemp: validTemp > 0 ? Number((sumTemp / validTemp).toFixed(1)) : 36.5,
      avgSat: validSat > 0 ? Number((sumSat / validSat).toFixed(1)) : 96.5
    };
  }, [vitals]);

  // 1. Professional counts (who measured / registered vital signs)
  const professionalStats = useMemo(() => {
    const totalVitals = vitals.length;

    const stats = mergedProfessionals.map(prof => {
      let count = 0;
      let altered = 0;

      vitals.forEach(v => {
        if (matchesVitalSignToProfessional(v, prof)) {
          count++;
          if (isVitalSignAltered(v)) altered++;
        }
      });

      const percentage = totalVitals > 0 ? Math.round((count / totalVitals) * 100) : 0;
      return {
        prof,
        name: prof.name,
        role: prof.role || 'ENFERMEIRA',
        roleLabel: ROLE_LABELS[prof.role as Role] || prof.role || 'Enfermeira',
        count,
        altered,
        percentage
      };
    });

    // Detect any other authors not in merged list
    const knownNames = new Set<string>(stats.map(s => normalize(s.name)));
    const otherMap = new Map<string, { count: number; altered: number }>();

    vitals.forEach(v => {
      const author = (v.registeredBy || '').trim();
      if (!author) return;
      const norm = normalize(author);
      const isKnown = Array.from(knownNames).some((kn: string) => norm.includes(kn) || kn.includes(norm));
      if (!isKnown) {
        const existing = otherMap.get(author) || { count: 0, altered: 0 };
        existing.count++;
        if (isVitalSignAltered(v)) existing.altered++;
        otherMap.set(author, existing);
      }
    });

    const otherItems = Array.from(otherMap.entries()).map(([name, data]) => {
      const percentage = totalVitals > 0 ? Math.round((data.count / totalVitals) * 100) : 0;
      return {
        prof: { name, role: 'ENFERMEIRA' } as any,
        name,
        role: 'ENFERMEIRA',
        roleLabel: 'Equipe de Enfermagem',
        count: data.count,
        altered: data.altered,
        percentage
      };
    });

    const allStats = [...stats, ...otherItems];
    allStats.sort((a, b) => b.count - a.count);
    return allStats;
  }, [vitals, mergedProfessionals]);

  // 2. Patient / Elderly counts
  const patientStats = useMemo(() => {
    const totalVitals = vitals.length;
    const map = new Map<string, {
      patientId: string;
      name: string;
      count: number;
      alteredCount: number;
      lastDate: string;
      lastTime?: string;
      lastBP?: string;
      lastHR?: number;
      lastTemp?: number;
      lastSat?: number;
      lastGlucose?: number;
      lastStatus?: 'ALTERED' | 'NORMAL';
    }>();

    vitals.forEach(v => {
      const pid = v.patientId || 'nao-informado';
      const patient = (patients || []).find(p => p.id === pid);
      const linkedElderly = patient?.elderlyId ? (elderly || []).find(e => e.id === patient.elderlyId) : null;
      const patientName = linkedElderly?.name || patient?.name || (v as any).patientName || 'Idoso não identificado';

      const existing = map.get(pid) || {
        patientId: pid,
        name: patientName,
        count: 0,
        alteredCount: 0,
        lastDate: v.date || '',
        lastTime: v.time,
        lastBP: `${v.systolicBP}/${v.diastolicBP}`,
        lastHR: v.heartRate,
        lastTemp: v.temperature,
        lastSat: v.saturation,
        lastGlucose: v.bloodGlucose,
        lastStatus: isVitalSignAltered(v) ? 'ALTERED' : 'NORMAL'
      };

      existing.count++;
      if (isVitalSignAltered(v)) existing.alteredCount++;

      // Keep most recent vital sign
      if (v.date && (!existing.lastDate || v.date >= existing.lastDate)) {
        existing.lastDate = v.date;
        existing.lastTime = v.time;
        existing.lastBP = `${v.systolicBP}/${v.diastolicBP}`;
        existing.lastHR = v.heartRate;
        existing.lastTemp = v.temperature;
        existing.lastSat = v.saturation;
        existing.lastGlucose = v.bloodGlucose;
        existing.lastStatus = isVitalSignAltered(v) ? 'ALTERED' : 'NORMAL';
      }

      map.set(pid, existing);
    });

    const items = Array.from(map.values()).map(item => {
      const percentage = totalVitals > 0 ? Math.round((item.count / totalVitals) * 100) : 0;
      return {
        ...item,
        percentage
      };
    });

    items.sort((a, b) => b.count - a.count);
    return items;
  }, [vitals, patients, elderly]);

  // Export PDF Report
  const handleExportPDF = async () => {
    const tableData = vitals.map((v, idx) => {
      const pat = (patients || []).find(p => p.id === v.patientId);
      const lk = pat?.elderlyId ? (elderly || []).find(e => e.id === pat.elderlyId) : null;
      const patientName = (v as any).patientIds && (v as any).patientIds.length > 1
        ? (v as any).patientIds.map((pid: string) => (patients || []).find(p => p.id === pid)?.name).filter(Boolean).join(', ')
        : (lk?.name || pat?.name || (v as any).patientName || 'N/A');

      const dateStr = v.date ? v.date.substring(0, 10).split('-').reverse().join('/') : '--/--/----';
      const timeStr = v.time || '--:--';
      const isAltered = isVitalSignAltered(v);
      const alerts = getVitalSignAlertTags(v).join('; ') || 'Dentro dos padrões';

      return [
        String(idx + 1),
        `${dateStr} ${timeStr}`,
        patientName,
        `${v.systolicBP}/${v.diastolicBP} mmHg`,
        `${v.heartRate} bpm`,
        `${v.temperature}°C`,
        `${v.saturation}%`,
        v.bloodGlucose ? `${v.bloodGlucose} mg/dL` : '-',
        isAltered ? 'ALTERADO' : 'NORMAL',
        v.registeredBy || 'Enfermagem OAMI',
        alerts
      ];
    });

    await generateModernPDF({
      title: 'Contagem e Relatório dos Lançamentos de Sinais Vitais',
      subtitle: `Enfermagem OAMI | Total de Aferições: ${vitals.length} | Acolhidos Monitorados: ${metrics.monitoredPatientsCount} | Normais: ${metrics.normalCount} (${metrics.normalPercentage}%) | Alteradas: ${metrics.alteredCount} (${metrics.alteredPercentage}%) | Emitido em ${format(new Date(), 'dd/MM/yyyy HH:mm')}`,
      columns: ['#', 'Data/Hora', 'Acolhido', 'PA', 'FC', 'Temp', 'SatO2', 'Glic', 'Status', 'Responsável', 'Diagnóstico/Alertas'],
      data: tableData,
      fileName: `relatorio_sinais_vitais_oami_${Date.now()}`,
      orientation: 'landscape'
    });
  };

  const isAnyFilterActive = Boolean(selectedProfessional || selectedPatientId || (selectedStatus && selectedStatus !== 'ALL') || selectedSpecificAlert);

  const handleClearAllFilters = () => {
    if (onSelectProfessional) onSelectProfessional(null);
    if (onSelectPatient) onSelectPatient(null);
    if (onSelectStatus) onSelectStatus(null);
    if (onSelectSpecificAlert) onSelectSpecificAlert(null);
    setSearchTerm('');
  };

  return (
    <div className="w-full space-y-3 font-sans">
      {/* Botão de Ativação / Faixa de Resumo */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-gradient-to-r from-red-50 via-rose-50 to-pink-50 dark:from-red-950/20 dark:via-rose-950/20 dark:to-pink-950/20 rounded-2xl border border-red-200 dark:border-red-800/40 shadow-sm transition-all">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-2xl bg-red-600 text-white flex items-center justify-center shadow-md shadow-red-600/20 shrink-0">
            <HeartPulse size={20} className="animate-pulse" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-red-950 dark:text-red-300">
                Contagem dos Lançamentos de Sinais Vitais
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-black bg-red-600 text-white shadow-xs">
                {metrics.totalVitals} aferição(ões)
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-white dark:bg-gray-800 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800">
                {metrics.monitoredPatientsCount} idoso(s) monitorado(s)
              </span>
              {metrics.alteredCount > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold bg-amber-500 text-white">
                  <AlertTriangle size={12} />
                  {metrics.alteredCount} alteração(ões) ({metrics.alteredPercentage}%)
                </span>
              )}
              {isAnyFilterActive && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-purple-600 text-white animate-pulse">
                  <Filter size={11} />
                  Filtro Ativo
                </span>
              )}
            </div>
            <p className="text-[11px] text-gray-500 dark:text-gray-400 font-medium mt-0.5">
              Hoje: <strong className="text-red-600 dark:text-red-400">{metrics.todayCount}</strong> • 
              Esta Semana: <strong className="text-gray-700 dark:text-gray-300">{metrics.thisWeekCount}</strong> • 
              No Mês: <strong className="text-gray-700 dark:text-gray-300">{metrics.thisMonthCount}</strong> • 
              Médias: <strong>PA {metrics.avgSys}/{metrics.avgDia}</strong> | <strong>FC {metrics.avgHR} bpm</strong> | <strong>Temp {metrics.avgTemp}°C</strong> | <strong>Sat {metrics.avgSat}%</strong>
            </p>
          </div>
        </div>

        {/* Ações da Barra */}
        <div className="flex items-center gap-2">
          {isAnyFilterActive && (
            <button
              onClick={handleClearAllFilters}
              className="px-3 py-1.5 text-xs font-bold text-red-700 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
              title="Limpar todos os filtros aplicados"
            >
              <X size={14} />
              <span>Limpar Filtros</span>
            </button>
          )}

          <button
            onClick={handleExportPDF}
            className="px-3.5 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800/60 rounded-xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
            title="Exportar Relatório Completo de Sinais Vitais em PDF"
          >
            <Printer size={15} />
            <span className="hidden sm:inline">Exportar PDF</span>
          </button>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-all flex items-center gap-2 shadow-md shadow-red-600/20 cursor-pointer"
          >
            <BarChart3 size={15} />
            <span>{isOpen ? 'Recolher Contadores' : 'Contagem Detalhada'}</span>
            {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>
      </div>

      {/* Painel Expansível com Visão Detalhada */}
      {isOpen && (
        <div className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-md space-y-6 animate-fadeIn">
          {/* Navegação entre Abas do Contador */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
              {[
                { id: 'professional', label: 'Por Profissional', icon: UserCheck, count: professionalStats.length },
                { id: 'status', label: 'Por Status Clínico', icon: ShieldAlert, count: metrics.alteredCount },
                { id: 'patient', label: 'Por Idoso Acolhido', icon: Users, count: patientStats.length },
                { id: 'period', label: 'Visão Temporal e Médias', icon: Clock }
              ].map(tab => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={cn(
                      'px-3.5 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer',
                      isActive
                        ? 'bg-red-600 text-white shadow-sm shadow-red-600/20'
                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    )}
                  >
                    <Icon size={14} />
                    <span>{tab.label}</span>
                    {tab.count !== undefined && (
                      <span className={cn(
                        'px-1.5 py-0.2 rounded-full text-[10px] font-black',
                        isActive ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                      )}>
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Busca Rápida */}
            <div className="relative min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
              <input
                type="text"
                placeholder="Buscar por profissional ou idoso..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-gray-200 placeholder-gray-400 outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          </div>

          {/* 1. ABA: POR PROFISSIONAL */}
          {activeTab === 'professional' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Lançamentos de Sinais Vitais por Profissional
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    Clique em um profissional para filtrar as aferições correspondentes na tabela.
                  </p>
                </div>
                {selectedProfessional && (
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    Filtrado por: <strong>{selectedProfessional}</strong>
                    <button onClick={() => onSelectProfessional && onSelectProfessional(null)} className="ml-1 text-gray-400 hover:text-red-500 cursor-pointer">
                      <X size={14} />
                    </button>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {professionalStats
                  .filter(st => !searchTerm || st.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(st => {
                    const isSelected = selectedProfessional && (
                      normalize(selectedProfessional) === normalize(st.name) ||
                      normalize(selectedProfessional) === normalize(st.prof.id)
                    );

                    return (
                      <div
                        key={st.name}
                        onClick={() => {
                          if (onSelectProfessional) {
                            onSelectProfessional(isSelected ? null : st.name);
                          }
                        }}
                        className={cn(
                          'p-4 rounded-2xl border transition-all cursor-pointer space-y-2 relative group',
                          isSelected
                            ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20 shadow-sm'
                            : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-red-300 dark:hover:border-red-700'
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 font-black text-sm flex items-center justify-center shrink-0">
                              {st.name.charAt(0)}
                            </div>
                            <div>
                              <p className="text-xs font-black text-gray-900 dark:text-white leading-tight">
                                {st.name}
                              </p>
                              <span className="text-[10px] font-bold text-gray-500 dark:text-gray-400 block">
                                {st.roleLabel}
                              </span>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="text-base font-black text-red-600 dark:text-red-400 block">
                              {st.count}
                            </span>
                            <span className="text-[10px] text-gray-400 font-bold">
                              {st.percentage}% do total
                            </span>
                          </div>
                        </div>

                        {/* Barra de Progresso */}
                        <div className="w-full bg-gray-100 dark:bg-gray-700 h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-red-600 h-full rounded-full transition-all duration-500"
                            style={{ width: `${st.percentage}%` }}
                          />
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                          <span>{st.altered} alteração(ões) detectada(s)</span>
                          <span className="font-bold text-red-600 dark:text-red-400 group-hover:underline">
                            {isSelected ? 'Remover Filtro' : 'Filtrar Lançamentos →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 2. ABA: POR STATUS CLÍNICO E ALERTAS */}
          {activeTab === 'status' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Triagem e Classificação Clínica dos Lançamentos
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Monitore os níveis hemodinâmicos e clique nos cartões para filtrar os casos alterados.
                </p>
              </div>

              {/* Status Macro Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Normais */}
                <div
                  onClick={() => onSelectStatus && onSelectStatus(selectedStatus === 'NORMAL' ? null : 'NORMAL')}
                  className={cn(
                    'p-5 rounded-2xl border transition-all cursor-pointer space-y-2',
                    selectedStatus === 'NORMAL'
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-emerald-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600">
                        <CheckCircle2 size={18} />
                      </div>
                      <span className="text-xs font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">
                        Sinais Vitais Normais
                      </span>
                    </div>
                    <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                      {metrics.normalCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Aferições com pressão arterial, pulso, temperatura e oximetria dentro da faixa basal ideal.
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${metrics.normalPercentage}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-emerald-600 block text-right">
                    {metrics.normalPercentage}% do total de lançamentos
                  </span>
                </div>

                {/* Alterados */}
                <div
                  onClick={() => onSelectStatus && onSelectStatus(selectedStatus === 'ALTERED' ? null : 'ALTERED')}
                  className={cn(
                    'p-5 rounded-2xl border transition-all cursor-pointer space-y-2',
                    selectedStatus === 'ALTERED'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 hover:border-red-300'
                  )}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="p-2 rounded-xl bg-red-100 dark:bg-red-950/60 text-red-600">
                        <AlertTriangle size={18} />
                      </div>
                      <span className="text-xs font-black text-red-800 dark:text-red-300 uppercase tracking-wider">
                        Sinais Vitais Alterados (Atenção)
                      </span>
                    </div>
                    <span className="text-2xl font-black text-red-600 dark:text-red-400">
                      {metrics.alteredCount}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Registros que apresentaram desvios clínicos significativos e necessitam de conduta técnica de enfermagem.
                  </p>
                  <div className="w-full bg-gray-100 dark:bg-gray-700 h-2 rounded-full overflow-hidden">
                    <div className="bg-red-500 h-full rounded-full" style={{ width: `${metrics.alteredPercentage}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-red-600 block text-right">
                    {metrics.alteredPercentage}% do total de lançamentos
                  </span>
                </div>
              </div>

              {/* Sub-indicadores de Alerta Clínico */}
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 pt-2">
                {/* 1. PA */}
                <div
                  onClick={() => onSelectSpecificAlert && onSelectSpecificAlert(selectedSpecificAlert === 'PA' ? null : 'PA')}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer text-center space-y-1',
                    selectedSpecificAlert === 'PA'
                      ? 'bg-red-100 dark:bg-red-950/60 border-red-500 ring-2 ring-red-500/20'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-red-300'
                  )}
                >
                  <Activity size={18} className="mx-auto text-red-600 mb-1" />
                  <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 block">
                    PA Alterada
                  </span>
                  <span className="text-xl font-black text-red-600 dark:text-red-400 block">
                    {metrics.bpAlertsCount}
                  </span>
                  <span className="text-[9px] text-gray-400 block">&gt;140/90 ou &lt;90</span>
                </div>

                {/* 2. FC */}
                <div
                  onClick={() => onSelectSpecificAlert && onSelectSpecificAlert(selectedSpecificAlert === 'FC' ? null : 'FC')}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer text-center space-y-1',
                    selectedSpecificAlert === 'FC'
                      ? 'bg-rose-100 dark:bg-rose-950/60 border-rose-500 ring-2 ring-rose-500/20'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-rose-300'
                  )}
                >
                  <Heart size={18} className="mx-auto text-rose-600 mb-1" />
                  <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 block">
                    FC Alterada
                  </span>
                  <span className="text-xl font-black text-rose-600 dark:text-rose-400 block">
                    {metrics.hrAlertsCount}
                  </span>
                  <span className="text-[9px] text-gray-400 block">&gt;100 ou &lt;60 bpm</span>
                </div>

                {/* 3. Temp */}
                <div
                  onClick={() => onSelectSpecificAlert && onSelectSpecificAlert(selectedSpecificAlert === 'TEMP' ? null : 'TEMP')}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer text-center space-y-1',
                    selectedSpecificAlert === 'TEMP'
                      ? 'bg-amber-100 dark:bg-amber-950/60 border-amber-500 ring-2 ring-amber-500/20'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-amber-300'
                  )}
                >
                  <Thermometer size={18} className="mx-auto text-amber-600 mb-1" />
                  <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 block">
                    Temp Alterada
                  </span>
                  <span className="text-xl font-black text-amber-600 dark:text-amber-400 block">
                    {metrics.tempAlertsCount}
                  </span>
                  <span className="text-[9px] text-gray-400 block">&gt;37.5°C ou &lt;35.5</span>
                </div>

                {/* 4. SatO2 */}
                <div
                  onClick={() => onSelectSpecificAlert && onSelectSpecificAlert(selectedSpecificAlert === 'SAT' ? null : 'SAT')}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer text-center space-y-1',
                    selectedSpecificAlert === 'SAT'
                      ? 'bg-blue-100 dark:bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/20'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-blue-300'
                  )}
                >
                  <Wind size={18} className="mx-auto text-blue-600 mb-1" />
                  <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 block">
                    Dessaturação
                  </span>
                  <span className="text-xl font-black text-blue-600 dark:text-blue-400 block">
                    {metrics.satAlertsCount}
                  </span>
                  <span className="text-[9px] text-gray-400 block">&lt;92% SatO2</span>
                </div>

                {/* 5. Glicemia */}
                <div
                  onClick={() => onSelectSpecificAlert && onSelectSpecificAlert(selectedSpecificAlert === 'GLUCOSE' ? null : 'GLUCOSE')}
                  className={cn(
                    'p-3.5 rounded-2xl border transition-all cursor-pointer text-center space-y-1',
                    selectedSpecificAlert === 'GLUCOSE'
                      ? 'bg-purple-100 dark:bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/20'
                      : 'bg-gray-50 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 hover:border-purple-300'
                  )}
                >
                  <Droplets size={18} className="mx-auto text-purple-600 mb-1" />
                  <span className="text-[10px] font-black uppercase text-gray-600 dark:text-gray-300 block">
                    Glicemia
                  </span>
                  <span className="text-xl font-black text-purple-600 dark:text-purple-400 block">
                    {metrics.glucoseAlertsCount}
                  </span>
                  <span className="text-[9px] text-gray-400 block">&gt;180 ou &lt;70 mg/dL</span>
                </div>
              </div>
            </div>
          )}

          {/* 3. ABA: POR IDOSO ACOLHIDO */}
          {activeTab === 'patient' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                    Contagem e Histórico por Idoso Acolhido
                  </h4>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {patientStats.length} idosos com aferições registradas. Clique em um idoso para filtrar.
                  </p>
                </div>
                {selectedPatientId && (
                  <span className="text-xs font-bold text-red-600 dark:text-red-400 flex items-center gap-1">
                    Filtrado por idoso
                    <button onClick={() => onSelectPatient && onSelectPatient(null)} className="ml-1 text-gray-400 hover:text-red-500 cursor-pointer">
                      <X size={14} />
                    </button>
                  </span>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {patientStats
                  .filter(ps => !searchTerm || ps.name.toLowerCase().includes(searchTerm.toLowerCase()))
                  .map(ps => {
                    const isSelected = selectedPatientId === ps.patientId;
                    return (
                      <div
                        key={ps.patientId}
                        onClick={() => onSelectPatient && onSelectPatient(isSelected ? null : ps.patientId)}
                        className={cn(
                          'p-4 rounded-2xl border transition-all cursor-pointer space-y-2',
                          isSelected
                            ? 'bg-red-50/80 dark:bg-red-950/40 border-red-500 ring-2 ring-red-500/20'
                            : 'bg-white dark:bg-gray-800/80 border-gray-200 dark:border-gray-700 hover:border-red-300'
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <h5 className="text-xs font-black text-gray-900 dark:text-white line-clamp-1">
                              {ps.name}
                            </h5>
                            <span className="text-[10px] text-gray-400">
                              Última: {ps.lastDate ? ps.lastDate.substring(0, 10).split('-').reverse().join('/') : '--/--'} {ps.lastTime || ''}
                            </span>
                          </div>
                          <span className={cn(
                            'px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0',
                            ps.lastStatus === 'ALTERED' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                          )}>
                            {ps.count} aferições
                          </span>
                        </div>

                        {/* Últimos parâmetros coletados */}
                        <div className="p-2.5 bg-gray-50 dark:bg-gray-900/60 rounded-xl text-[11px] grid grid-cols-3 gap-1 font-bold text-gray-600 dark:text-gray-300">
                          <div>PA: <strong className="text-gray-900 dark:text-white">{ps.lastBP}</strong></div>
                          <div>FC: <strong className="text-gray-900 dark:text-white">{ps.lastHR} bpm</strong></div>
                          <div>Temp: <strong className="text-gray-900 dark:text-white">{ps.lastTemp}°C</strong></div>
                        </div>

                        <div className="flex justify-between items-center text-[10px] text-gray-400 pt-1">
                          <span>{ps.alteredCount} registros com alteração</span>
                          <span className="font-bold text-red-600 dark:text-red-400">
                            {isSelected ? 'Remover Filtro' : 'Filtrar Este Idoso →'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}

          {/* 4. ABA: VISÃO TEMPORAL E MÉDIAS */}
          {activeTab === 'period' && (
            <div className="space-y-4">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-700 dark:text-gray-300">
                  Visão Temporal e Médias Consolidadas
                </h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">
                  Acompanhamento quantitativo consolidado dos sinais vitais da ILPI.
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">Hoje</span>
                  <span className="text-2xl font-black text-red-600 dark:text-red-400 block mt-1">
                    {metrics.todayCount}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">Lançamentos</span>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">Esta Semana</span>
                  <span className="text-2xl font-black text-rose-600 dark:text-rose-400 block mt-1">
                    {metrics.thisWeekCount}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">Lançamentos</span>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">No Mês</span>
                  <span className="text-2xl font-black text-purple-600 dark:text-purple-400 block mt-1">
                    {metrics.thisMonthCount}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">Lançamentos</span>
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-100 dark:border-gray-700 text-center">
                  <span className="text-[10px] font-black uppercase text-gray-400 block">Total Histórico</span>
                  <span className="text-2xl font-black text-gray-900 dark:text-white block mt-1">
                    {metrics.totalVitals}
                  </span>
                  <span className="text-[10px] text-gray-400 font-bold">Aferições</span>
                </div>
              </div>

              {/* Médias Clínicas dos Acolhidos */}
              <div className="p-5 bg-gradient-to-r from-red-50/50 to-rose-50/50 dark:from-red-950/20 dark:to-rose-950/20 rounded-2xl border border-red-200/60 dark:border-red-900/40 space-y-3">
                <span className="text-xs font-black uppercase tracking-wider text-red-950 dark:text-red-300 block">
                  Médias Globais Coletadas da População Residente
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 block font-bold">PA Média</span>
                    <strong className="text-sm font-black text-gray-900 dark:text-white">{metrics.avgSys}/{metrics.avgDia} mmHg</strong>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 block font-bold">FC Média</span>
                    <strong className="text-sm font-black text-gray-900 dark:text-white">{metrics.avgHR} bpm</strong>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 block font-bold">Temperatura</span>
                    <strong className="text-sm font-black text-gray-900 dark:text-white">{metrics.avgTemp}°C</strong>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 block font-bold">Oximetria</span>
                    <strong className="text-sm font-black text-gray-900 dark:text-white">{metrics.avgSat}% SatO2</strong>
                  </div>
                  <div className="p-3 bg-white dark:bg-gray-800 rounded-xl text-center border border-gray-100 dark:border-gray-700">
                    <span className="text-[10px] text-gray-400 block font-bold">Cobertura</span>
                    <strong className="text-sm font-black text-emerald-600 dark:text-emerald-400">{metrics.monitoredPatientsCount} idosos</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
