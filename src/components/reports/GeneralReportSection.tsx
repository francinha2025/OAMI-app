import React, { useState, useMemo, useEffect } from 'react';
import {
  FileText,
  FileSpreadsheet,
  Printer,
  Calendar,
  Filter,
  Search,
  Users,
  Briefcase,
  Layers,
  Sparkles,
  Package,
  Activity,
  HeartHandshake,
  RotateCcw,
  CheckCircle2,
  Boxes,
  Stethoscope,
  Brain,
  BookOpen,
  Apple,
  ShieldCheck,
  Building2,
  GraduationCap,
  Award,
  TrendingUp,
  Download,
  Loader2
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS, INSTITUTION_LOGO } from '../../constants';
import {
  GeneralReportProps,
  DatePreset,
  UnifiedReportItem,
  SectorKey,
  RecordType
} from './reportsTypes';
import {
  buildAllSystemRecords,
  filterUnifiedRecords,
  calculateReportMetrics,
  getDateRangeForPreset,
  buildExecutiveSummaryData
} from './reportsDataBuilder';
import {
  exportGeneralReportToPDF,
  exportGeneralReportToExcel
} from './reportsExportUtils';
import { ReportItemDetailsModal } from './ReportItemDetailsModal';
import { ExecutiveSummaryView } from './views/ExecutiveSummaryView';
import { SectorReportView } from './views/SectorReportView';
import { ElderlyReportView } from './views/ElderlyReportView';
import { ProfessionalReportView } from './views/ProfessionalReportView';
import { MonthlyReportView } from './views/MonthlyReportView';
import { WorkshopsReportView } from './views/WorkshopsReportView';
import { StockReportView } from './views/StockReportView';
import { DiaperProductionReportView } from './views/DiaperProductionReportView';
import { MonitoringReportView } from './views/MonitoringReportView';
import { IndicatorsAndChartsView } from './views/IndicatorsAndChartsView';
import { 
  StockProduct, 
  StockMovement, 
  TreasuryTransaction, 
  NursingEvolution,
  PhysioEvolution,
  PsychEvolution,
  PedagogyEvolution,
  PedagogyActivity,
  SocialEvolution,
  Workshop
} from '../../types';

export const GeneralReportSection: React.FC<GeneralReportProps> = (props) => {
  // 1. Live Fallback Subscriptions to ensure full live data if not supplied via props
  const [localStockProducts, setLocalStockProducts] = useState<StockProduct[]>(props.stockProducts || []);
  const [localStockMovements, setLocalStockMovements] = useState<StockMovement[]>(props.stockMovements || []);
  const [localTreasuryTxs, setLocalTreasuryTxs] = useState<TreasuryTransaction[]>(props.treasuryTransactions || []);
  const [localNursingEvolutions, setLocalNursingEvolutions] = useState<NursingEvolution[]>(props.nursingEvolutions || []);
  const [localPhysioEvolutions, setLocalPhysioEvolutions] = useState<PhysioEvolution[]>(props.physioEvolutions || []);
  const [localPsychEvolutions, setLocalPsychEvolutions] = useState<PsychEvolution[]>(props.psychEvolutions || []);
  const [localPedagogyEvolutions, setLocalPedagogyEvolutions] = useState<PedagogyEvolution[]>(props.pedagogyEvolutions || []);
  const [localPedagogyActivities, setLocalPedagogyActivities] = useState<PedagogyActivity[]>(props.pedagogyActivities || []);
  const [localSocialEvolutions, setLocalSocialEvolutions] = useState<SocialEvolution[]>(props.socialEvolutions || []);
  const [localWorkshops, setLocalWorkshops] = useState<Workshop[]>(props.workshops || []);

  useEffect(() => {
    if (!props.stockMovements || props.stockMovements.length === 0) {
      const unsubMov = onSnapshot(query(collection(db, 'stock_movements'), orderBy('date', 'desc'), limit(1000)), snap => {
        const movs: StockMovement[] = [];
        snap.forEach(d => movs.push({ id: d.id, ...d.data() } as StockMovement));
        setLocalStockMovements(movs);
      }, err => console.warn('Stock mov snapshot error:', err));
      return () => unsubMov();
    }
  }, [props.stockMovements]);

  useEffect(() => {
    if (!props.stockProducts || props.stockProducts.length === 0) {
      const unsubProd = onSnapshot(collection(db, 'stock_products'), snap => {
        const prods: StockProduct[] = [];
        snap.forEach(d => prods.push({ id: d.id, ...d.data() } as StockProduct));
        setLocalStockProducts(prods);
      }, err => console.warn('Stock prod snapshot error:', err));
      return () => unsubProd();
    }
  }, [props.stockProducts]);

  useEffect(() => {
    if (!props.treasuryTransactions || props.treasuryTransactions.length === 0) {
      const unsubTx = onSnapshot(query(collection(db, 'treasury_transactions'), orderBy('date', 'desc'), limit(1000)), snap => {
        const txs: TreasuryTransaction[] = [];
        snap.forEach(d => txs.push({ id: d.id, ...d.data() } as TreasuryTransaction));
        setLocalTreasuryTxs(txs);
      }, err => console.warn('Treasury snapshot error:', err));
      return () => unsubTx();
    }
  }, [props.treasuryTransactions]);

  useEffect(() => {
    if (!props.nursingEvolutions || props.nursingEvolutions.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'nursingEvolutions'), orderBy('date', 'desc'), limit(500)), snap => {
        setLocalNursingEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() } as NursingEvolution)));
      }, err => console.warn('nursingEvolutions snapshot error:', err));
      return () => unsub();
    }
  }, [props.nursingEvolutions]);

  useEffect(() => {
    if (!props.physioEvolutions || props.physioEvolutions.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'physioEvolutions'), orderBy('date', 'desc'), limit(500)), snap => {
        setLocalPhysioEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PhysioEvolution)));
      }, err => console.warn('physioEvolutions snapshot error:', err));
      return () => unsub();
    }
  }, [props.physioEvolutions]);

  useEffect(() => {
    if (!props.psychEvolutions || props.psychEvolutions.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'psychEvolutions'), orderBy('date', 'desc'), limit(500)), snap => {
        setLocalPsychEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PsychEvolution)));
      }, err => console.warn('psychEvolutions snapshot error:', err));
      return () => unsub();
    }
  }, [props.psychEvolutions]);

  useEffect(() => {
    if (!props.pedagogyEvolutions || props.pedagogyEvolutions.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'pedagogyEvolutions'), orderBy('date', 'desc'), limit(500)), snap => {
        setLocalPedagogyEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() } as PedagogyEvolution)));
      }, err => console.warn('pedagogyEvolutions snapshot error:', err));
      return () => unsub();
    }
  }, [props.pedagogyEvolutions]);

  useEffect(() => {
    if (!props.pedagogyActivities || props.pedagogyActivities.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'pedagogyActivities'), orderBy('date', 'desc'), limit(300)), snap => {
        setLocalPedagogyActivities(snap.docs.map(d => ({ id: d.id, ...d.data() } as PedagogyActivity)));
      }, err => console.warn('pedagogyActivities snapshot error:', err));
      return () => unsub();
    }
  }, [props.pedagogyActivities]);

  useEffect(() => {
    if (!props.socialEvolutions || props.socialEvolutions.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'socialEvolutions'), orderBy('date', 'desc'), limit(500)), snap => {
        setLocalSocialEvolutions(snap.docs.map(d => ({ id: d.id, ...d.data() } as SocialEvolution)));
      }, err => console.warn('socialEvolutions snapshot error:', err));
      return () => unsub();
    }
  }, [props.socialEvolutions]);

  useEffect(() => {
    if (!props.workshops || props.workshops.length === 0) {
      const unsub = onSnapshot(query(collection(db, 'workshops'), orderBy('date', 'desc'), limit(300)), snap => {
        setLocalWorkshops(snap.docs.map(d => ({ id: d.id, ...d.data() } as Workshop)));
      }, err => console.warn('workshops snapshot error:', err));
      return () => unsub();
    }
  }, [props.workshops]);

  // Combined Props with live state
  const combinedProps: GeneralReportProps = useMemo(() => ({
    ...props,
    stockProducts: props.stockProducts?.length ? props.stockProducts : localStockProducts,
    stockMovements: props.stockMovements?.length ? props.stockMovements : localStockMovements,
    treasuryTransactions: props.treasuryTransactions?.length ? props.treasuryTransactions : localTreasuryTxs,
    nursingEvolutions: props.nursingEvolutions?.length ? props.nursingEvolutions : localNursingEvolutions,
    physioEvolutions: props.physioEvolutions?.length ? props.physioEvolutions : localPhysioEvolutions,
    psychEvolutions: props.psychEvolutions?.length ? props.psychEvolutions : localPsychEvolutions,
    pedagogyEvolutions: props.pedagogyEvolutions?.length ? props.pedagogyEvolutions : localPedagogyEvolutions,
    pedagogyActivities: props.pedagogyActivities?.length ? props.pedagogyActivities : localPedagogyActivities,
    socialEvolutions: props.socialEvolutions?.length ? props.socialEvolutions : localSocialEvolutions,
    workshops: props.workshops?.length ? props.workshops : localWorkshops
  }), [
    props,
    localStockProducts,
    localStockMovements,
    localTreasuryTxs,
    localNursingEvolutions,
    localPhysioEvolutions,
    localPsychEvolutions,
    localPedagogyEvolutions,
    localPedagogyActivities,
    localSocialEvolutions,
    localWorkshops
  ]);

  // 2. Build All System Records
  const allRecords = useMemo(() => {
    return buildAllSystemRecords(combinedProps);
  }, [combinedProps]);

  // 3. Navigation Tabs State
  type ActiveTab =
    | 'executive'
    | 'sectors'
    | 'elderly'
    | 'professional'
    | 'monthly'
    | 'workshops'
    | 'stock'
    | 'diapers'
    | 'monitoring'
    | 'indicators';

  const [activeTab, setActiveTab] = useState<ActiveTab>('executive');

  // 4. Filters State (Item 1: Período, Setor, Profissional, Acolhido, Tipo)
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedSector, setSelectedSector] = useState<SectorKey | 'ALL'>('ALL');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('ALL');
  const [selectedElderly, setSelectedElderly] = useState<string>('ALL');
  const [selectedRecordType, setSelectedRecordType] = useState<RecordType | 'ALL'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Modal and Export State
  const [selectedItemForModal, setSelectedItemForModal] = useState<UnifiedReportItem | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);

  // Handle Preset Change
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const range = getDateRangeForPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  // Unique Professionals
  const professionalOptions = useMemo(() => {
    const map = new Map<string, number>();
    allRecords.forEach(r => {
      if (r.responsible && r.responsible !== 'Responsável não informado') {
        const name = r.responsible.trim();
        map.set(name, (map.get(name) || 0) + 1);
      }
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [allRecords]);

  // Unique Elderly
  const elderlyOptions = useMemo(() => {
    const map = new Map<string, { id: string; name: string; count: number }>();
    allRecords.forEach(r => {
      if (r.elderlyId && r.targetOrParticipant) {
        const current = map.get(r.elderlyId) || { id: r.elderlyId, name: r.targetOrParticipant, count: 0 };
        current.count += 1;
        map.set(r.elderlyId, current);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [allRecords]);

  // Filtered Records
  const filteredRecords = useMemo(() => {
    return filterUnifiedRecords(allRecords, {
      startDate,
      endDate,
      sectorKey: selectedSector,
      professional: selectedProfessional,
      elderlyId: selectedElderly,
      recordType: selectedRecordType,
      searchQuery
    });
  }, [
    allRecords,
    startDate,
    endDate,
    selectedSector,
    selectedProfessional,
    selectedElderly,
    selectedRecordType,
    searchQuery
  ]);

  // General Metrics
  const metrics = useMemo(() => {
    return calculateReportMetrics(filteredRecords);
  }, [filteredRecords]);

  // Executive Summary Data
  const executiveData = useMemo(() => {
    return buildExecutiveSummaryData(filteredRecords);
  }, [filteredRecords]);

  // Reset Filters
  const handleResetFilters = () => {
    handlePresetChange('all');
    setSelectedSector('ALL');
    setSelectedProfessional('ALL');
    setSelectedElderly('ALL');
    setSelectedRecordType('ALL');
    setSearchQuery('');
  };

  // PDF Export
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportGeneralReportToPDF({
        items: filteredRecords,
        metrics,
        startDate,
        endDate,
        sectorFilter: selectedSector,
        professionalFilter: selectedProfessional !== 'ALL' ? selectedProfessional : undefined,
        elderlyFilter: selectedElderly !== 'ALL' ? selectedElderly : undefined,
        recordTypeFilter: selectedRecordType,
        generatedBy: 'Coordenação Geral OAMI'
      });
    } catch (err) {
      console.error('Erro ao gerar PDF institucional:', err);
    } finally {
      setIsExportingPDF(false);
    }
  };

  // Excel Export (16 sheets)
  const handleExportExcel = () => {
    try {
      exportGeneralReportToExcel({
        items: filteredRecords,
        metrics,
        startDate,
        endDate,
        sectorFilter: selectedSector,
        professionalFilter: selectedProfessional !== 'ALL' ? selectedProfessional : undefined,
        stockProducts: combinedProps.stockProducts,
        stockMovements: combinedProps.stockMovements
      });
    } catch (err) {
      console.error('Erro ao exportar Excel:', err);
    }
  };

  return (
    <div id="oami-general-report-root" className="space-y-6 pb-20">
      {/* 1. CABEÇALHO DO RELATÓRIO (Item 1 do pedido) */}
      <header
        id="report-institutional-header"
        className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden"
      >
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-6">
          {/* Institution Info */}
          <div className="flex items-start gap-4">
            {INSTITUTION_LOGO && (
              <img
                src={INSTITUTION_LOGO}
                alt="Logo OAMI"
                className="w-16 h-16 sm:w-20 sm:h-20 object-contain rounded-2xl p-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 shadow-sm shrink-0"
              />
            )}
            <div className="space-y-1">
              <span className="text-[11px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Sistema de Gestão Assistencial
              </span>
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                {INSTITUTION_NAME}
              </h1>
              <h2 className="text-sm font-black text-emerald-700 dark:text-emerald-300">
                RELATÓRIO GERAL E INTEGRADO — DOCUMENTO GERENCIAL
              </h2>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                CNPJ: {INSTITUTION_CNPJ} • {INSTITUTION_ADDRESS}
              </p>
              <div className="text-xs text-gray-700 dark:text-gray-300 pt-1 font-semibold">
                Período selecionado: <strong className="text-gray-900 dark:text-white">{startDate}</strong> → <strong className="text-gray-900 dark:text-white">{endDate}</strong>
              </div>
            </div>
          </div>

          {/* Action Buttons (PDF, Excel, Print) */}
          <div className="flex flex-wrap items-center gap-2 print:hidden self-start">
            <button
              onClick={handleExportPDF}
              disabled={isExportingPDF}
              className="px-4 py-2.5 rounded-2xl font-black text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm flex items-center gap-2 transition-all disabled:opacity-50"
              title="Exportar Relatório Geral Institucional em PDF"
            >
              {isExportingPDF ? <Loader2 size={16} className="animate-spin" /> : <FileText size={16} />}
              Exportar PDF Institucional
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 rounded-2xl font-black text-xs bg-slate-800 hover:bg-slate-900 dark:bg-gray-800 dark:hover:bg-gray-700 text-white shadow-sm flex items-center gap-2 transition-all"
              title="Exportar Planilha Completa em 16 Abas"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel (16 Abas)
            </button>

            <button
              onClick={() => window.print()}
              className="p-2.5 rounded-2xl text-xs bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 transition-all border border-gray-200 dark:border-gray-700"
              title="Imprimir visualização atual"
            >
              <Printer size={16} />
            </button>
          </div>
        </div>

        {/* Resumo Geral com Indicadores do Cabeçalho (Item 1) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 pt-6 mt-6 border-t border-gray-100 dark:border-gray-800">
          {/* Total Registros */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Total Registros</span>
            <strong className="text-lg sm:text-xl font-black text-gray-900 dark:text-white">{metrics.totalRecords}</strong>
          </div>

          {/* Atendimentos */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Atendimentos</span>
            <strong className="text-lg sm:text-xl font-black text-blue-600 dark:text-blue-400">{metrics.totalAttendances}</strong>
          </div>

          {/* Oficinas */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Oficinas</span>
            <strong className="text-lg sm:text-xl font-black text-amber-600 dark:text-amber-400">{metrics.totalWorkshops}</strong>
          </div>

          {/* Capacitações */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Capacitações</span>
            <strong className="text-lg sm:text-xl font-black text-purple-600 dark:text-purple-400">{metrics.totalTrainings}</strong>
          </div>

          {/* Fraldas Produzidas */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Fraldas Prod.</span>
            <strong className="text-lg sm:text-xl font-black text-pink-600 dark:text-pink-400">{metrics.totalDiaperProduced}</strong>
          </div>

          {/* Mov. Estoque */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Mov. Estoque</span>
            <strong className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400">{metrics.totalStockMovements}</strong>
          </div>

          {/* Monitoramentos */}
          <div className="p-3 rounded-2xl bg-gray-50/80 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 text-center col-span-2 sm:col-span-2 lg:col-span-1">
            <span className="text-[10px] text-gray-400 font-bold uppercase block">Monitoramentos</span>
            <strong className="text-lg sm:text-xl font-black text-teal-600 dark:text-teal-400">{metrics.totalClinicalMonitorings}</strong>
          </div>
        </div>
      </header>

      {/* 2. BARRA DE FILTROS INSTITUCIONAIS (Item 1: Período, Setor, Profissional, Acolhido, Tipo) */}
      <section
        id="report-filter-bar"
        className="bg-white dark:bg-gray-900 rounded-3xl p-5 sm:p-6 border border-gray-100 dark:border-gray-800 shadow-sm space-y-4 print:hidden"
      >
        {/* Date Presets Row */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div className="flex items-center gap-2 text-xs font-black uppercase tracking-wider text-gray-500">
            <Calendar size={14} className="text-emerald-500" />
            <span>Período Rápido:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'last_30_days', label: 'Últimos 30 Dias' },
              { id: 'last_month', label: 'Mês Anterior' },
              { id: 'year', label: 'Este Ano' },
              { id: 'all', label: 'Todo o Histórico' }
            ].map(p => (
              <button
                key={p.id}
                onClick={() => handlePresetChange(p.id as DatePreset)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  datePreset === p.id
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {/* Granular Filters Grid: Custom Dates, Setor, Profissional, Acolhido, Tipo */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 text-xs">
          {/* Data Inicial */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Data Inicial</label>
            <input
              type="date"
              value={startDate}
              onChange={e => {
                setDatePreset('custom');
                setStartDate(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Data Final */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Data Final</label>
            <input
              type="date"
              value={endDate}
              onChange={e => {
                setDatePreset('custom');
                setEndDate(e.target.value);
              }}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Filtro: Setor / Área */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Setor / Área</label>
            <select
              value={selectedSector}
              onChange={e => setSelectedSector(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos os Setores</option>
              <option value="ENFERMAGEM">1. Enfermagem</option>
              <option value="FISIOTERAPIA">2. Fisioterapia</option>
              <option value="PSICOLOGIA">3. Psicologia</option>
              <option value="SERVICO_SOCIAL">4. Serviço Social</option>
              <option value="PEDAGOGIA">5. Pedagogia</option>
              <option value="NUTRICAO">6. Nutrição</option>
              <option value="EQUIPE_TECNICA">7. Equipe Técnica (PIAs)</option>
              <option value="OUTRAS_AREAS">8. Demais Áreas</option>
              <option value="OFICINAS">9. Oficinas Coletivas</option>
              <option value="MONITORAMENTO">10. Monitoramento Clínico</option>
              <option value="ESTOQUE">11. Estoque & Almoxarifado</option>
              <option value="PRODUCAO_FRALDAS">12. Produção de Fraldas</option>
              <option value="CAPACITACOES">13. Capacitações</option>
            </select>
          </div>

          {/* Filtro: Profissional */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Profissional</label>
            <select
              value={selectedProfessional}
              onChange={e => setSelectedProfessional(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos os Profissionais ({professionalOptions.length})</option>
              {professionalOptions.map(([name, count]) => (
                <option key={name} value={name}>
                  {name} ({count} reg.)
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Acolhido */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Acolhido</label>
            <select
              value={selectedElderly}
              onChange={e => setSelectedElderly(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos os Acolhidos ({elderlyOptions.length})</option>
              {elderlyOptions.map(e => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.count} reg.)
                </option>
              ))}
            </select>
          </div>

          {/* Filtro: Tipo de Registro */}
          <div>
            <label className="text-[10px] font-bold uppercase text-gray-400 block mb-1">Tipo de Registro</label>
            <select
              value={selectedRecordType}
              onChange={e => setSelectedRecordType(e.target.value as any)}
              className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="ALL">Todos os Tipos</option>
              <option value="EVOLUCAO">Evoluções</option>
              <option value="ATENDIMENTO">Atendimentos Individuais</option>
              <option value="AVALIACAO">Avaliações / PIAs</option>
              <option value="VISITA">Visitas Familiares</option>
              <option value="OFICINA">Oficinas / Dinâmicas</option>
              <option value="CAPACITACAO">Capacitações</option>
              <option value="PRODUCAO">Produção de Fraldas</option>
              <option value="ESTOQUE">Estoque</option>
              <option value="MONITORAMENTO">Monitoramento Clínico</option>
              <option value="OUTRO">Outros</option>
            </select>
          </div>
        </div>

        {/* Text Search & Reset Filters */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
          <div className="relative flex-1 sm:max-w-md">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por termo, conduta, descrição ou título..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl text-xs bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-500 dark:text-gray-400">
              <strong className="text-gray-900 dark:text-white font-black">{filteredRecords.length}</strong> registros filtrados
            </span>
            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center gap-1.5 transition-all"
            >
              <RotateCcw size={13} /> Limpar Filtros
            </button>
          </div>
        </div>
      </section>

      {/* 3. NAVEGAÇÃO POR ABAS DO RELATÓRIO INSTITUCIONAL */}
      <nav
        id="report-navigation-tabs"
        className="flex items-center gap-1.5 overflow-x-auto pb-1 border-b border-gray-200 dark:border-gray-800 text-xs font-bold print:hidden"
      >
        {[
          { id: 'executive', label: 'Resumo Executivo', icon: CheckCircle2 },
          { id: 'sectors', label: 'Relatório por Setor', icon: Layers },
          { id: 'elderly', label: 'Por Acolhido', icon: Users },
          { id: 'professional', label: 'Por Profissional', icon: Briefcase },
          { id: 'monthly', label: 'Relatório Mensal', icon: Calendar },
          { id: 'workshops', label: 'Oficinas & Dinâmicas', icon: Sparkles },
          { id: 'stock', label: 'Estoque & Consumo', icon: Boxes },
          { id: 'diapers', label: 'Fábrica de Fraldas', icon: Package },
          { id: 'monitoring', label: 'Monitoramento Clínico', icon: Activity },
          { id: 'indicators', label: 'Indicadores & Gráficos', icon: Award }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTab)}
              className={`px-4 py-2.5 rounded-2xl whitespace-nowrap flex items-center gap-2 transition-all shrink-0 ${
                isActive
                  ? 'bg-emerald-600 text-white shadow-sm font-black'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <Icon size={15} />
              {tab.label}
            </button>
          );
        })}
      </nav>

      {/* 4. CONTEÚDO DA ABA SELECIONADA */}
      <main id="report-tab-content">
        {activeTab === 'executive' && (
          <ExecutiveSummaryView
            data={executiveData}
            metrics={metrics}
            startDate={startDate}
            endDate={endDate}
            onSelectSector={(sectorKey) => {
              setSelectedSector(sectorKey);
              setActiveTab('sectors');
            }}
          />
        )}

        {activeTab === 'sectors' && (
          <SectorReportView
            items={filteredRecords}
            startDate={startDate}
            endDate={endDate}
            onSelectItem={(item) => setSelectedItemForModal(item)}
          />
        )}

        {activeTab === 'elderly' && (
          <ElderlyReportView
            items={filteredRecords}
            elderlyList={combinedProps.elderly || []}
            onSelectItem={(item) => setSelectedItemForModal(item)}
          />
        )}

        {activeTab === 'professional' && (
          <ProfessionalReportView
            items={filteredRecords}
            onSelectItem={(item) => setSelectedItemForModal(item)}
          />
        )}

        {activeTab === 'monthly' && (
          <MonthlyReportView items={filteredRecords} />
        )}

        {activeTab === 'workshops' && (
          <WorkshopsReportView
            items={filteredRecords}
            onSelectItem={(item) => setSelectedItemForModal(item)}
          />
        )}

        {activeTab === 'stock' && (
          <StockReportView
            products={combinedProps.stockProducts || []}
            movements={combinedProps.stockMovements || []}
            startDate={startDate}
            endDate={endDate}
          />
        )}

        {activeTab === 'diapers' && (
          <DiaperProductionReportView
            items={filteredRecords}
            rawProductions={combinedProps.diaperRawProductions || []}
            finalPackings={combinedProps.diaperFinalPackings || []}
            donations={combinedProps.diaperDonations || []}
          />
        )}

        {activeTab === 'monitoring' && (
          <MonitoringReportView
            items={filteredRecords}
            onSelectItem={(item) => setSelectedItemForModal(item)}
          />
        )}

        {activeTab === 'indicators' && (
          <IndicatorsAndChartsView
            items={filteredRecords}
            metrics={metrics}
            stockProducts={combinedProps.stockProducts || []}
            stockMovements={combinedProps.stockMovements || []}
            diaperDonations={combinedProps.diaperDonations || []}
          />
        )}
      </main>

      {/* 5. MODAL "VER REGISTRO COMPLETO" (Sem alterar nenhum dado existente) */}
      {selectedItemForModal && (
        <ReportItemDetailsModal
          item={selectedItemForModal}
          onClose={() => setSelectedItemForModal(null)}
        />
      )}
    </div>
  );
};
