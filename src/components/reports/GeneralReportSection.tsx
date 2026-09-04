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
  DollarSign,
  HeartHandshake,
  Clock,
  RotateCcw,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  SlidersHorizontal,
  FolderKanban,
  GraduationCap,
  Boxes,
  HelpCircle
} from 'lucide-react';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../../firebase';
import { INSTITUTION_NAME, INSTITUTION_CNPJ, INSTITUTION_ADDRESS, INSTITUTION_LOGO } from '../../constants';
import {
  GeneralReportProps,
  ReportCategory,
  DatePreset,
  UnifiedReportItem
} from './reportsTypes';
import {
  buildAllSystemRecords,
  filterSystemRecords,
  calculateReportMetrics,
  getDateRangeForPreset
} from './reportsDataBuilder';
import {
  exportGeneralReportToPDF,
  exportGeneralReportToExcel
} from './reportsExportUtils';
import { ReportItemDetailsModal } from './ReportItemDetailsModal';
import { StockProduct, StockMovement, TreasuryTransaction, Donor } from '../../types';

export const GeneralReportSection: React.FC<GeneralReportProps> = (props) => {
  // 1. Local live subscriptions for stock and treasury if not already populated
  const [localStockProducts, setLocalStockProducts] = useState<StockProduct[]>(props.stockProducts || []);
  const [localStockMovements, setLocalStockMovements] = useState<StockMovement[]>(props.stockMovements || []);
  const [localTreasuryTxs, setLocalTreasuryTxs] = useState<TreasuryTransaction[]>(props.treasuryTransactions || []);

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

  // Combined props with live local data
  const combinedProps: GeneralReportProps = useMemo(() => ({
    ...props,
    stockProducts: props.stockProducts?.length ? props.stockProducts : localStockProducts,
    stockMovements: props.stockMovements?.length ? props.stockMovements : localStockMovements,
    treasuryTransactions: props.treasuryTransactions?.length ? props.treasuryTransactions : localTreasuryTxs
  }), [props, localStockProducts, localStockMovements, localTreasuryTxs]);

  // 2. Build All System Records
  const allRecords = useMemo(() => {
    return buildAllSystemRecords(combinedProps);
  }, [combinedProps]);

  // 3. Filters State
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [startDate, setStartDate] = useState<string>('2020-01-01');
  const [endDate, setEndDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [selectedCategory, setSelectedCategory] = useState<ReportCategory>('ALL');
  const [selectedProfessional, setSelectedProfessional] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // View presentation state
  const [viewMode, setViewMode] = useState<'integrated' | 'category'>('integrated');
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [selectedItemForModal, setSelectedItemForModal] = useState<UnifiedReportItem | null>(null);
  const [isExportingPDF, setIsExportingPDF] = useState<boolean>(false);
  const [visibleItemsLimitPerCategory, setVisibleItemsLimitPerCategory] = useState<Record<string, number>>({});

  // When date preset changes, update start/end date
  const handlePresetChange = (preset: DatePreset) => {
    setDatePreset(preset);
    const range = getDateRangeForPreset(preset);
    setStartDate(range.startDate);
    setEndDate(range.endDate);
  };

  // Extract unique professionals for dropdown
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

  // Filtered records
  const filteredRecords = useMemo(() => {
    return filterSystemRecords(allRecords, {
      startDate,
      endDate,
      category: selectedCategory,
      professional: selectedProfessional,
      searchQuery
    });
  }, [allRecords, startDate, endDate, selectedCategory, selectedProfessional, searchQuery]);

  // Metrics
  const metrics = useMemo(() => {
    return calculateReportMetrics(filteredRecords);
  }, [filteredRecords]);

  // Reset filters
  const handleResetFilters = () => {
    handlePresetChange('all');
    setSelectedCategory('ALL');
    setSelectedProfessional('ALL');
    setSearchQuery('');
  };

  // Toggle Section Collapse
  const toggleSection = (cat: string) => {
    setCollapsedSections(prev => ({
      ...prev,
      [cat]: !prev[cat]
    }));
  };

  const expandAll = () => setCollapsedSections({});
  const collapseAll = () => {
    const collapsed: Record<string, boolean> = {};
    (['PROFESSIONALS', 'WORKSHOPS', 'TRAININGS', 'DIAPERS', 'STOCK', 'MONITORING', 'TREASURY', 'OTHER'] as const).forEach(k => {
      collapsed[k] = true;
    });
    setCollapsedSections(collapsed);
  };

  // Handlers for export
  const handleExportPDF = async () => {
    try {
      setIsExportingPDF(true);
      await exportGeneralReportToPDF({
        items: filteredRecords,
        metrics,
        startDate,
        endDate,
        categoryFilter: selectedCategory,
        professionalFilter: selectedProfessional,
        generatedBy: props.user?.name || 'Coordenação Geral OAMI'
      });
      props.showToast?.('Relatório Geral em PDF gerado com sucesso!', 'success');
    } catch (err: any) {
      console.error('PDF export error:', err);
      props.showToast?.(`Erro ao exportar PDF: ${err.message || 'Falha na geração'}`, 'error');
    } finally {
      setIsExportingPDF(false);
    }
  };

  const handleExportExcel = () => {
    try {
      exportGeneralReportToExcel({
        items: filteredRecords,
        metrics,
        startDate,
        endDate,
        categoryFilter: selectedCategory,
        professionalFilter: selectedProfessional,
        generatedBy: props.user?.name || 'Coordenação Geral OAMI'
      });
      props.showToast?.('Planilha Excel gerada com sucesso!', 'success');
    } catch (err: any) {
      console.error('Excel export error:', err);
      props.showToast?.(`Erro ao exportar Excel: ${err.message || 'Falha na geração'}`, 'error');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Category Configuration
  const categoryConfig: Record<Exclude<ReportCategory, 'ALL'>, {
    label: string;
    icon: any;
    color: string;
    bgHeader: string;
    borderHeader: string;
    badgeBg: string;
    badgeText: string;
  }> = {
    PROFESSIONALS: {
      label: 'Profissionais e Atendimentos',
      icon: Users,
      color: 'text-blue-600 dark:text-blue-400',
      bgHeader: 'bg-blue-50/80 dark:bg-blue-950/40',
      borderHeader: 'border-blue-200 dark:border-blue-800',
      badgeBg: 'bg-blue-100 dark:bg-blue-900/60',
      badgeText: 'text-blue-800 dark:text-blue-200'
    },
    WORKSHOPS: {
      label: 'Oficinas Terapêuticas',
      icon: FolderKanban,
      color: 'text-amber-600 dark:text-amber-400',
      bgHeader: 'bg-amber-50/80 dark:bg-amber-950/40',
      borderHeader: 'border-amber-200 dark:border-amber-800',
      badgeBg: 'bg-amber-100 dark:bg-amber-900/60',
      badgeText: 'text-amber-800 dark:text-amber-200'
    },
    TRAININGS: {
      label: 'Capacitações e Treinamentos',
      icon: GraduationCap,
      color: 'text-purple-600 dark:text-purple-400',
      bgHeader: 'bg-purple-50/80 dark:bg-purple-950/40',
      borderHeader: 'border-purple-200 dark:border-purple-800',
      badgeBg: 'bg-purple-100 dark:bg-purple-900/60',
      badgeText: 'text-purple-800 dark:text-purple-200'
    },
    DIAPERS: {
      label: 'Fabricação e Doação de Fraldas (SGPF)',
      icon: Package,
      color: 'text-pink-600 dark:text-pink-400',
      bgHeader: 'bg-pink-50/80 dark:bg-pink-950/40',
      borderHeader: 'border-pink-200 dark:border-pink-800',
      badgeBg: 'bg-pink-100 dark:bg-pink-900/60',
      badgeText: 'text-pink-800 dark:text-pink-200'
    },
    STOCK: {
      label: 'Estoque e Almoxarifado',
      icon: Boxes,
      color: 'text-emerald-600 dark:text-emerald-400',
      bgHeader: 'bg-emerald-50/80 dark:bg-emerald-950/40',
      borderHeader: 'border-emerald-200 dark:border-emerald-800',
      badgeBg: 'bg-emerald-100 dark:bg-emerald-900/60',
      badgeText: 'text-emerald-800 dark:text-emerald-200'
    },
    MONITORING: {
      label: 'Monitoramento Clínico dos Acolhidos',
      icon: Activity,
      color: 'text-teal-600 dark:text-teal-400',
      bgHeader: 'bg-teal-50/80 dark:bg-teal-950/40',
      borderHeader: 'border-teal-200 dark:border-teal-800',
      badgeBg: 'bg-teal-100 dark:bg-teal-900/60',
      badgeText: 'text-teal-800 dark:text-teal-200'
    },
    TREASURY: {
      label: 'Tesouraria, Finanças e Doações',
      icon: DollarSign,
      color: 'text-slate-600 dark:text-slate-400',
      bgHeader: 'bg-slate-50 dark:bg-slate-900/60',
      borderHeader: 'border-slate-200 dark:border-slate-800',
      badgeBg: 'bg-slate-100 dark:bg-slate-800',
      badgeText: 'text-slate-800 dark:text-slate-200'
    },
    OTHER: {
      label: 'Demais Áreas e Outros Registros',
      icon: Layers,
      color: 'text-gray-600 dark:text-gray-400',
      bgHeader: 'bg-gray-50 dark:bg-gray-900/60',
      borderHeader: 'border-gray-200 dark:border-gray-800',
      badgeBg: 'bg-gray-100 dark:bg-gray-800',
      badgeText: 'text-gray-800 dark:text-gray-200'
    }
  };

  const allCategoryKeys: Array<Exclude<ReportCategory, 'ALL'>> = [
    'PROFESSIONALS',
    'WORKSHOPS',
    'TRAININGS',
    'DIAPERS',
    'STOCK',
    'MONITORING',
    'TREASURY',
    'OTHER'
  ];

  return (
    <div id="general-report-section" className="space-y-8 pb-16 animate-in fade-in duration-300">
      {/* 1. Official Institutional Header (Print & Screen) */}
      <div className="bg-white dark:bg-gray-900 p-6 md:p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-emerald-500 via-teal-500 to-blue-500" />
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {INSTITUTION_LOGO && (
              <img
                src={INSTITUTION_LOGO}
                alt="Logo OAMI"
                className="w-16 h-16 rounded-2xl object-cover border border-gray-100 dark:border-gray-800 shadow-sm shrink-0"
              />
            )}
            <div className="space-y-1">
              <span className="text-xs font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                Sistema Integrado OAMI • Vitória do Mearim
              </span>
              <h1 className="text-2xl md:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                Relatório Geral e Integrado
              </h1>
              <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400 leading-relaxed max-w-2xl">
                {INSTITUTION_NAME} • CNPJ: {INSTITUTION_CNPJ} • {INSTITUTION_ADDRESS}
              </p>
            </div>
          </div>

          {/* Export Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5 print:hidden">
            <button
              id="export-general-report-pdf"
              onClick={handleExportPDF}
              disabled={isExportingPDF || filteredRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:opacity-50 text-white font-bold text-xs md:text-sm rounded-2xl shadow-sm transition-all shadow-rose-600/20 active:scale-95"
              title="Exportar documento oficial em PDF com timbrado institucional"
            >
              <FileText size={16} />
              {isExportingPDF ? 'Gerando PDF...' : 'Exportar PDF'}
            </button>

            <button
              id="export-general-report-excel"
              onClick={handleExportExcel}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs md:text-sm rounded-2xl shadow-sm transition-all shadow-emerald-600/20 active:scale-95"
              title="Exportar planilha Excel completa com abas por setor"
            >
              <FileSpreadsheet size={16} />
              Exportar Excel
            </button>

            <button
              id="print-general-report"
              onClick={handlePrint}
              disabled={filteredRecords.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-900 dark:bg-gray-100 hover:bg-gray-800 dark:hover:bg-white text-white dark:text-gray-900 font-bold text-xs md:text-sm rounded-2xl shadow-sm transition-all active:scale-95"
              title="Imprimir relatório geral"
            >
              <Printer size={16} />
              Imprimir
            </button>
          </div>
        </div>
      </div>

      {/* 2. Executive Dashboard (KPI Summary Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Total Geral</span>
            <Layers size={14} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-gray-900 dark:text-white">
            {metrics.totalRecords}
          </p>
          <p className="text-[10px] text-gray-400">lançamentos</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Atendimentos</span>
            <Users size={14} className="text-blue-500" />
          </div>
          <p className="text-xl font-black text-blue-600 dark:text-blue-400">
            {metrics.totalAttendances}
          </p>
          <p className="text-[10px] text-gray-400">evoluções técnicas</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Oficinas</span>
            <FolderKanban size={14} className="text-amber-500" />
          </div>
          <p className="text-xl font-black text-amber-600 dark:text-amber-400">
            {metrics.totalWorkshops}
          </p>
          <p className="text-[10px] text-gray-400">realizadas</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Capacitações</span>
            <GraduationCap size={14} className="text-purple-500" />
          </div>
          <p className="text-xl font-black text-purple-600 dark:text-purple-400">
            {metrics.totalTrainings}
          </p>
          <p className="text-[10px] text-gray-400">treinamentos</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Fraldas</span>
            <Package size={14} className="text-pink-500" />
          </div>
          <p className="text-xl font-black text-pink-600 dark:text-pink-400">
            {metrics.totalDiaperProduced}
          </p>
          <p className="text-[10px] text-gray-400">unidades cortadas</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Estoque</span>
            <Boxes size={14} className="text-emerald-500" />
          </div>
          <p className="text-xl font-black text-emerald-600 dark:text-emerald-400">
            {metrics.totalStockMovements}
          </p>
          <p className="text-[10px] text-gray-400">movimentações</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Monitoramentos</span>
            <Activity size={14} className="text-teal-500" />
          </div>
          <p className="text-xl font-black text-teal-600 dark:text-teal-400">
            {metrics.totalClinicalMonitorings}
          </p>
          <p className="text-[10px] text-gray-400">sinais & cuidados</p>
        </div>

        <div className="p-4 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-1">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-[10px] font-black uppercase tracking-wider">Profissionais</span>
            <Briefcase size={14} className="text-indigo-500" />
          </div>
          <p className="text-xl font-black text-indigo-600 dark:text-indigo-400">
            {metrics.activeProfessionalsCount}
          </p>
          <p className="text-[10px] text-gray-400">com registros</p>
        </div>
      </div>

      {/* 3. Interactive Filter Bar */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-5 print:hidden">
        {/* Top filter row: Presets & Date pickers */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Preset Buttons */}
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-1 flex items-center gap-1">
              <Calendar size={13} /> Período:
            </span>
            {(
              [
                { id: 'all', label: 'Todos os Registros' },
                { id: 'today', label: 'Hoje' },
                { id: 'week', label: 'Esta Semana' },
                { id: 'month', label: 'Este Mês' },
                { id: 'last_30_days', label: 'Últimos 30 dias' },
                { id: 'year', label: 'Este Ano' },
                { id: 'custom', label: 'Personalizado' }
              ] as const
            ).map(preset => (
              <button
                key={preset.id}
                onClick={() => handlePresetChange(preset.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  datePreset === preset.id
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/20'
                    : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200/60 dark:border-gray-700'
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          {/* Custom Date Inputs */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] font-bold text-gray-400 uppercase">De:</span>
              <input
                type="date"
                value={startDate}
                onChange={e => {
                  setDatePreset('custom');
                  setStartDate(e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 rounded-xl border border-gray-200 dark:border-gray-700">
              <span className="text-[11px] font-bold text-gray-400 uppercase">Até:</span>
              <input
                type="date"
                value={endDate}
                onChange={e => {
                  setDatePreset('custom');
                  setEndDate(e.target.value);
                }}
                className="bg-transparent text-xs font-bold text-gray-800 dark:text-gray-200 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Middle Filter Row: Category Pills */}
        <div className="space-y-2">
          <span className="text-xs font-bold text-gray-400 uppercase tracking-wider flex items-center gap-1">
            <Filter size={13} /> Filtrar por Área / Seção:
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setSelectedCategory('ALL')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                selectedCategory === 'ALL'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 shadow-sm'
                  : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
              }`}
            >
              <span>Todas as Áreas</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                {allRecords.length}
              </span>
            </button>

            {allCategoryKeys.map(catKey => {
              const cfg = categoryConfig[catKey];
              const count = allRecords.filter(r => r.category === catKey).length;
              const Icon = cfg.icon;
              return (
                <button
                  key={catKey}
                  onClick={() => setSelectedCategory(catKey)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    selectedCategory === catKey
                      ? `${cfg.badgeBg} ${cfg.badgeText} ring-2 ring-emerald-500/50 shadow-sm`
                      : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 border border-gray-200 dark:border-gray-700'
                  }`}
                >
                  <Icon size={13} />
                  <span>{cfg.label.split(' ')[0]}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/10 dark:bg-white/20">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Bottom Filter Row: Professional dropdown, Text Search, Reset */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
          <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
            {/* Professional Select */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 w-full sm:w-64">
              <Briefcase size={14} className="text-gray-400 shrink-0" />
              <select
                value={selectedProfessional}
                onChange={e => setSelectedProfessional(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none w-full"
              >
                <option value="ALL">Todos os Profissionais</option>
                {professionalOptions.map(([name, count]) => (
                  <option key={name} value={name}>
                    {name} ({count} registros)
                  </option>
                ))}
              </select>
            </div>

            {/* Universal Text Search */}
            <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-800 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 w-full sm:w-80">
              <Search size={14} className="text-gray-400 shrink-0" />
              <input
                type="text"
                placeholder="Buscar por acolhido, atividade, tema, produto..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="bg-transparent text-xs font-semibold text-gray-800 dark:text-gray-200 outline-none w-full placeholder:text-gray-400"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="text-gray-400 hover:text-gray-600 text-xs font-bold"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between w-full md:w-auto gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400 font-medium">
              Exibindo <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{filteredRecords.length}</strong> de {allRecords.length} registros
            </span>

            <button
              onClick={handleResetFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
              title="Limpar todos os filtros aplicados"
            >
              <RotateCcw size={13} /> Limpar Filtros
            </button>
          </div>
        </div>
      </div>

      {/* 4. Controls Bar (Expand/Collapse, View Layouts) */}
      <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400 print:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={expandAll}
            className="hover:text-gray-800 dark:hover:text-gray-200 font-semibold flex items-center gap-1"
          >
            <ChevronDown size={14} /> Expandir todas
          </button>
          <span>•</span>
          <button
            onClick={collapseAll}
            className="hover:text-gray-800 dark:hover:text-gray-200 font-semibold flex items-center gap-1"
          >
            <ChevronUp size={14} /> Recolher todas
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="font-semibold">Modo de Exibição:</span>
          <button
            onClick={() => setViewMode('integrated')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              viewMode === 'integrated'
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            Todas as Seções
          </button>
          <button
            onClick={() => setViewMode('category')}
            className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
              viewMode === 'category'
                ? 'bg-gray-200 dark:bg-gray-800 text-gray-900 dark:text-white'
                : 'hover:bg-gray-100 text-gray-500'
            }`}
          >
            Por Seção Ativa
          </button>
        </div>
      </div>

      {/* 5. Categorized Data Sections */}
      {filteredRecords.length === 0 ? (
        <div className="bg-white dark:bg-gray-900 p-12 text-center rounded-3xl border border-gray-100 dark:border-gray-800 space-y-3">
          <HelpCircle size={40} className="mx-auto text-gray-300 dark:text-gray-700" />
          <h3 className="text-lg font-bold text-gray-900 dark:text-white">
            Nenhum registro encontrado para os filtros selecionados
          </h3>
          <p className="text-sm text-gray-500 max-w-md mx-auto">
            Tente selecionar "Todos os Registros", remover termos de busca ou selecionar outro profissional.
          </p>
          <button
            onClick={handleResetFilters}
            className="px-4 py-2 bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-sm hover:bg-emerald-700 transition-all"
          >
            Redefinir Filtros
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {allCategoryKeys.map(catKey => {
            // If in category view mode and not active, skip
            if (viewMode === 'category' && selectedCategory !== 'ALL' && selectedCategory !== catKey) {
              return null;
            }

            const catItems = filteredRecords.filter(r => r.category === catKey);
            if (catItems.length === 0) return null;

            const cfg = categoryConfig[catKey];
            const Icon = cfg.icon;
            const isCollapsed = Boolean(collapsedSections[catKey]);
            const limit = visibleItemsLimitPerCategory[catKey] || 25;
            const displayedItems = catItems.slice(0, limit);

            return (
              <div
                key={catKey}
                id={`report-section-${catKey.toLowerCase()}`}
                className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden transition-all"
              >
                {/* Section Header Banner */}
                <div
                  onClick={() => toggleSection(catKey)}
                  className={`p-4 md:p-5 flex items-center justify-between cursor-pointer select-none border-b border-gray-100 dark:border-gray-800 ${cfg.bgHeader}`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-2xl bg-white dark:bg-gray-900 shadow-sm ${cfg.color}`}>
                      <Icon size={20} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base md:text-lg font-black text-gray-900 dark:text-white">
                          {cfg.label}
                        </h2>
                        <span className={`px-2 py-0.5 rounded-full text-xs font-black ${cfg.badgeBg} ${cfg.badgeText}`}>
                          {catItems.length} registro(s)
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {catKey === 'PROFESSIONALS' && 'Registros técnicos, acompanhamentos, condutas e planos multidisciplinares'}
                        {catKey === 'WORKSHOPS' && 'Atividades lúdicas, terapêuticas e de convivência social realizadas na OAMI'}
                        {catKey === 'TRAININGS' && 'Treinamentos internos e externos, palestras e capacitação de colaboradores'}
                        {catKey === 'DIAPERS' && 'Corte bruto, montagem, acabamento e distribuição assistencial de fraldas'}
                        {catKey === 'STOCK' && 'Entradas, saídas, catálogo de suprimentos, doações de insumos e saldos'}
                        {catKey === 'MONITORING' && 'Sinais vitais, administração de medicamentos, curativos e rotinas diárias'}
                        {catKey === 'TREASURY' && 'Receitas, despesas, doações financeiras e histórico de lançamentos'}
                        {catKey === 'OTHER' && 'Atos institucionais, presidência, engajamento familiar e voluntariado'}
                      </p>
                    </div>
                  </div>

                  <button className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 p-1.5 rounded-xl print:hidden">
                    {isCollapsed ? <ChevronDown size={20} /> : <ChevronUp size={20} />}
                  </button>
                </div>

                {/* Section Body */}
                {!isCollapsed && (
                  <div>
                    {/* Subtotal Banner */}
                    <div className="px-6 py-2.5 bg-gray-50/50 dark:bg-gray-800/40 border-b border-gray-100 dark:border-gray-800 flex flex-wrap items-center justify-between text-xs text-gray-600 dark:text-gray-300">
                      <span>
                        Subtotal da Seção: <strong className="font-bold text-gray-900 dark:text-white">{catItems.length} lançamentos</strong>
                      </span>
                      {catKey === 'DIAPERS' && (
                        <span className="font-semibold text-pink-600 dark:text-pink-400">
                          Total de unidades produzidas/cortadas no período: <strong>{metrics.totalDiaperProduced} un</strong>
                        </span>
                      )}
                      {catKey === 'STOCK' && (
                        <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                          Entradas: <strong>{metrics.totalStockInputs}</strong> • Saídas: <strong>{metrics.totalStockOutputs}</strong>
                        </span>
                      )}
                      {catKey === 'WORKSHOPS' && (
                        <span className="font-semibold text-amber-600 dark:text-amber-400">
                          Total de oficinas: <strong>{metrics.totalWorkshops}</strong> • Participantes: <strong>{metrics.totalParticipants}</strong>
                        </span>
                      )}
                    </div>

                    {/* Table */}
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-gray-700 dark:text-gray-300 border-collapse">
                        <thead>
                          <tr className="bg-gray-100/60 dark:bg-gray-800/60 text-gray-500 dark:text-gray-400 uppercase font-black tracking-wider text-[10px] border-b border-gray-100 dark:border-gray-800">
                            <th className="py-3 px-4 w-28">Data</th>
                            <th className="py-3 px-4 w-36">Setor / Área</th>
                            <th className="py-3 px-4">Atividade / Registro</th>
                            <th className="py-3 px-4 w-44">Profissional / Resp.</th>
                            <th className="py-3 px-4 w-44">Acolhido / Público / Item</th>
                            <th className="py-3 px-4 w-28 text-center">Qtd / Status</th>
                            <th className="py-3 px-4 text-right print:hidden w-24">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60">
                          {displayedItems.map(item => (
                            <tr
                              key={item.id}
                              className="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition-colors group"
                            >
                              {/* Date */}
                              <td className="py-3.5 px-4 font-mono font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                                {item.date ? item.date.slice(0, 10) : '—'}
                              </td>

                              {/* Sector */}
                              <td className="py-3.5 px-4">
                                <span className="inline-block px-2 py-0.5 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-800 dark:text-gray-200 font-bold text-[11px]">
                                  {item.sector}
                                </span>
                              </td>

                              {/* Title & Description preview */}
                              <td className="py-3.5 px-4">
                                <div className="font-bold text-gray-900 dark:text-white text-xs">
                                  {item.title}
                                </div>
                                {item.description && (
                                  <div className="text-[11px] text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">
                                    {item.description}
                                  </div>
                                )}
                              </td>

                              {/* Responsible */}
                              <td className="py-3.5 px-4">
                                <div className="font-semibold text-gray-900 dark:text-white">
                                  {item.responsible || '—'}
                                </div>
                                {item.roleOrFunction && (
                                  <div className="text-[10px] text-gray-400">
                                    {item.roleOrFunction}
                                  </div>
                                )}
                              </td>

                              {/* Target / Participant */}
                              <td className="py-3.5 px-4">
                                <div className="font-medium text-gray-800 dark:text-gray-200 truncate max-w-[180px]">
                                  {item.targetOrParticipant || '—'}
                                </div>
                              </td>

                              {/* Quantity / Status */}
                              <td className="py-3.5 px-4 text-center">
                                {item.quantityOrValue !== undefined ? (
                                  <span className="font-mono font-bold text-gray-900 dark:text-gray-100">
                                    {item.quantityOrValue}
                                  </span>
                                ) : item.typeOrStatus ? (
                                  <span className="inline-block px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300">
                                    {item.typeOrStatus}
                                  </span>
                                ) : (
                                  <span className="text-gray-400">—</span>
                                )}
                              </td>

                              {/* Actions */}
                              <td className="py-3.5 px-4 text-right print:hidden">
                                <button
                                  onClick={() => setSelectedItemForModal(item)}
                                  className="px-2.5 py-1 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold text-xs inline-flex items-center gap-1 transition-all"
                                  title="Ver ficha completa com todos os campos e anexos"
                                >
                                  <Eye size={12} /> Detalhes
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Pagination / Show More if exceeding initial limit */}
                    {catItems.length > limit && (
                      <div className="p-4 bg-gray-50/50 dark:bg-gray-800/30 text-center border-t border-gray-100 dark:border-gray-800 print:hidden">
                        <button
                          onClick={() => {
                            setVisibleItemsLimitPerCategory(prev => ({
                              ...prev,
                              [catKey]: limit + 50
                            }));
                          }}
                          className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 hover:bg-gray-50 transition-all shadow-sm"
                        >
                          Carregar mais 50 registros ({catItems.length - limit} restantes)
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* 6. Modal for Viewing Complete Record Details */}
      <ReportItemDetailsModal
        item={selectedItemForModal}
        onClose={() => setSelectedItemForModal(null)}
      />
    </div>
  );
};
