import React, { useState, useEffect, useMemo } from 'react';
import {
  collection,
  onSnapshot,
  query,
  orderBy,
  limit
} from 'firebase/firestore';
import { db } from '../firebase';
import {
  LayoutDashboard,
  Users,
  HeartPulse,
  Sparkles,
  Package,
  Boxes,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileDown,
  Printer,
  Calendar,
  Filter,
  Search,
  ChevronRight,
  Eye,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileSpreadsheet,
  FileText,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  UserCheck,
  ShieldAlert,
  ClipboardList
} from 'lucide-react';
import { StockProduct, StockMovement, TreasuryTransaction, Donor, Elderly } from '../types';
import {
  MonitoringSectionProps,
  PeriodPreset,
  MonitoringTab,
  MultidisciplinarySector,
  UnifiedEvolutionItem
} from './monitoring/monitoringTypes';
import {
  getDateRangeForPreset,
  isDateInRange,
  buildUnifiedEvolutions,
  computeManagementAlerts
} from './monitoring/monitoringHelpers';
import {
  generateExecutiveMonitoringPDF,
  generateExecutiveMonitoringExcel
} from './monitoring/monitoringExports';
import { ElderlyDetailModal } from './monitoring/ElderlyDetailModal';
import { MonitoringCharts } from './monitoring/MonitoringCharts';
import { safeFormat, cn, appendAgeToName } from '../lib/utils';

export const MonitoringSection: React.FC<MonitoringSectionProps> = (props) => {
  const {
    user,
    elderly = [],
    evolutions = [],
    pias = [],
    socialEvolutions = [],
    socialPatients = [],
    socialFamilyVisits = [],
    socialRiskSituations = [],
    socialReferrals = [],
    socialStudies = [],
    psychEvolutions = [],
    psychPatients = [],
    psychActivities = [],
    psychAppointments = [],
    psychEmotionalMonitorings = [],
    psychCognitionAssessments = [],
    pedagogyEvolutions = [],
    pedagogyPatients = [],
    pedagogyActivities = [],
    pedagogyStimulationTrackings = [],
    pedagogySocialParticipations = [],
    physioEvolutions = [],
    physioPatients = [],
    physioAssessments = [],
    physioExercises = [],
    physioAppointments = [],
    nursingEvolutions = [],
    nursingPatients = [],
    vitalSigns = [],
    dressingRecords = [],
    medicationAdministrations = [],
    incidentRecords = [],
    diaperChangeRecords = [],
    nutritionEvolutions = [],
    nutritionPatients = [],
    nutritionAnthropometries = [],
    nutritionMealPlans = [],
    workshops = [],
    professionals = [],
    users = [],
    caregivers = [],
    volunteers = [],
    donors = [],
    diaperDonations = [],
    diaperBeneficiaries = [],
    diaperRawProductions = [],
    diaperWIPProcessings = [],
    diaperFinalPackings = [],
    diaperProductionGoals = [],
    financialRecords = [],
    allPhotos = [],
    showToast
  } = props;

  // Real-time local state for Stock & Treasury collections
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [treasuryTransactions, setTreasuryTransactions] = useState<TreasuryTransaction[]>([]);
  const [localDonors, setLocalDonors] = useState<Donor[]>([]);

  // Period Filter State
  const [periodPreset, setPeriodPreset] = useState<PeriodPreset>('month');
  const [startDate, setStartDate] = useState<string>(() => getDateRangeForPreset('month').startDate);
  const [endDate, setEndDate] = useState<string>(() => getDateRangeForPreset('month').endDate);

  // Active Tab & Sub-views
  const [activeTab, setActiveTab] = useState<MonitoringTab>('overview');
  const [activeSector, setActiveSector] = useState<MultidisciplinarySector>('all');
  const [stockStatusFilter, setStockStatusFilter] = useState<'ALL' | 'LOW' | 'ZERO'>('ALL');
  const [elderlySearch, setElderlySearch] = useState<string>('');
  const [elderlyStatusFilter, setElderlyStatusFilter] = useState<string>('ATIVO');

  // Selected Elderly for Drill-down Modal
  const [selectedElderlyForModal, setSelectedElderlyForModal] = useState<Elderly | null>(null);

  // Export State
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [showReportModal, setShowReportModal] = useState<boolean>(false);

  // 1. Subscribe to Stock & Treasury collections safely
  useEffect(() => {
    const unsubProd = onSnapshot(collection(db, 'stock_products'), snapshot => {
      const prods: StockProduct[] = [];
      snapshot.forEach(doc => {
        prods.push({ id: doc.id, ...doc.data() } as StockProduct);
      });
      setStockProducts(prods);
    }, err => {
      console.warn('Stock products snapshot notice:', err.message);
    });

    const unsubMov = onSnapshot(query(collection(db, 'stock_movements'), orderBy('date', 'desc'), limit(500)), snapshot => {
      const movs: StockMovement[] = [];
      snapshot.forEach(doc => {
        movs.push({ id: doc.id, ...doc.data() } as StockMovement);
      });
      setStockMovements(movs);
    }, err => {
      console.warn('Stock movements snapshot notice:', err.message);
    });

    const unsubTreasury = onSnapshot(query(collection(db, 'treasury_transactions'), orderBy('date', 'desc'), limit(500)), snapshot => {
      const txs: TreasuryTransaction[] = [];
      snapshot.forEach(doc => {
        txs.push({ id: doc.id, ...doc.data() } as TreasuryTransaction);
      });
      setTreasuryTransactions(txs);
    }, err => {
      console.warn('Treasury transactions snapshot notice:', err.message);
    });

    const unsubDonors = onSnapshot(collection(db, 'donors'), snapshot => {
      const dns: Donor[] = [];
      snapshot.forEach(doc => {
        dns.push({ id: doc.id, ...doc.data() } as Donor);
      });
      setLocalDonors(dns);
    }, err => {
      console.warn('Donors snapshot notice:', err.message);
    });

    return () => {
      unsubProd();
      unsubMov();
      unsubTreasury();
      unsubDonors();
    };
  }, []);

  // Update dates when preset changes
  const handlePresetChange = (preset: PeriodPreset) => {
    setPeriodPreset(preset);
    if (preset !== 'custom') {
      const range = getDateRangeForPreset(preset);
      setStartDate(range.startDate);
      setEndDate(range.endDate);
    }
  };

  // 2. Unify all clinical and multidisciplinary evolutions
  const allUnifiedEvolutions = useMemo(() => {
    return buildUnifiedEvolutions(props);
  }, [props]);

  // 3. Filtered Evolutions in the selected period
  const periodUnifiedEvolutions = useMemo(() => {
    return allUnifiedEvolutions.filter(e => isDateInRange(e.date, startDate, endDate));
  }, [allUnifiedEvolutions, startDate, endDate]);

  // 4. Sector Attendance Counts in Period
  const attendancesBySector = useMemo(() => {
    const counts: Record<string, number> = {
      Enfermagem: 0,
      Fisioterapia: 0,
      Psicologia: 0,
      Pedagogia: 0,
      'Serviço Social': 0,
      Nutrição: 0,
      Geral: 0
    };

    periodUnifiedEvolutions.forEach(ev => {
      if (counts[ev.sector] !== undefined) {
        counts[ev.sector]++;
      } else {
        counts[ev.sector] = 1;
      }
    });

    return counts;
  }, [periodUnifiedEvolutions]);

  const totalAttendances = useMemo(() => {
    return Object.values(attendancesBySector).reduce((a: number, b: number) => a + b, 0);
  }, [attendancesBySector]);

  // 5. Workshops & Activities in Period
  const periodWorkshops = useMemo(() => {
    return (workshops || []).filter(w => isDateInRange(w.date, startDate, endDate));
  }, [workshops, startDate, endDate]);

  const periodPsychActivities = useMemo(() => {
    return (psychActivities || []).filter(a => isDateInRange(a.date, startDate, endDate));
  }, [psychActivities, startDate, endDate]);

  const periodPedagogyActivities = useMemo(() => {
    return (pedagogyActivities || []).filter(a => isDateInRange(a.date, startDate, endDate));
  }, [pedagogyActivities, startDate, endDate]);

  const allPeriodActivities = useMemo(() => {
    const list: any[] = [];
    periodWorkshops.forEach(w => list.push({ ...w, sector: 'Oficina Geral', source: 'Workshops' }));
    periodPsychActivities.forEach(a => list.push({ ...a, sector: 'Psicologia', source: 'Psicologia' }));
    periodPedagogyActivities.forEach(a => list.push({ ...a, sector: 'Pedagogia', source: 'Pedagogia' }));
    return list.sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime());
  }, [periodWorkshops, periodPsychActivities, periodPedagogyActivities]);

  const totalWorkshopEngagements = useMemo(() => {
    let count = 0;
    allPeriodActivities.forEach(act => {
      if (act.participants && Array.isArray(act.participants)) {
        count += act.participants.length;
      } else if (act.attendees && Array.isArray(act.attendees)) {
        count += act.attendees.length;
      } else {
        count += 1;
      }
    });
    return count;
  }, [allPeriodActivities]);

  // 6. Diaper Metrics in Period
  const periodDiaperChanges = useMemo(() => {
    return (diaperChangeRecords || []).filter(dc => isDateInRange(dc.date, startDate, endDate));
  }, [diaperChangeRecords, startDate, endDate]);

  const diaperConsumptionCount = useMemo(() => {
    return periodDiaperChanges.length;
  }, [periodDiaperChanges]);

  const diaperDailyAvg = useMemo(() => {
    const d1 = new Date(startDate);
    const d2 = new Date(endDate);
    const days = Math.max(1, Math.round((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24)) + 1);
    return diaperConsumptionCount / days;
  }, [diaperConsumptionCount, startDate, endDate]);

  const diaperFinalPacksInPeriod = useMemo(() => {
    return (diaperFinalPackings || [])
      .filter(p => isDateInRange(p.date, startDate, endDate))
      .reduce((acc, p) => acc + (p.totalPackages || 0), 0);
  }, [diaperFinalPackings, startDate, endDate]);

  const diaperDonationsPacksInPeriod = useMemo(() => {
    return (diaperDonations || [])
      .filter(d => isDateInRange(d.date, startDate, endDate))
      .reduce((acc, d) => acc + (d.quantity || 0), 0);
  }, [diaperDonations, startDate, endDate]);

  // Stock estimate for diapers
  const totalDiapersInStock = useMemo(() => {
    // Sum final packaged fraldas or estimate
    const totalPacks = (diaperFinalPackings || []).reduce((acc, p) => acc + (p.totalPackages || 0), 0);
    const totalDonated = (diaperDonations || []).reduce((acc, d) => acc + (d.quantity || 0), 0);
    const totalUsed = (diaperChangeRecords || []).length;
    const estUnits = (totalPacks * 10) + (totalDonated * 10) - totalUsed;
    return Math.max(120, estUnits);
  }, [diaperFinalPackings, diaperDonations, diaperChangeRecords]);

  const diaperStockAutonomyDays = useMemo(() => {
    const dailyRate = diaperDailyAvg > 0 ? diaperDailyAvg : 8; // fallback average 8/day
    return totalDiapersInStock / dailyRate;
  }, [totalDiapersInStock, diaperDailyAvg]);

  // 7. Stock Movements & Inventory
  const periodStockMovements = useMemo(() => {
    return stockMovements.filter(m => isDateInRange(m.date, startDate, endDate));
  }, [stockMovements, startDate, endDate]);

  const stockInputsCount = useMemo(() => {
    return periodStockMovements.filter(m => m.type === 'ENTRADA').reduce((a, b) => a + (b.quantity || 0), 0);
  }, [periodStockMovements]);

  const stockOutputsCount = useMemo(() => {
    return periodStockMovements.filter(m => m.type === 'SAIDA').reduce((a, b) => a + (b.quantity || 0), 0);
  }, [periodStockMovements]);

  const zeroStockProducts = useMemo(() => {
    return stockProducts.filter(p => p.status === 'ATIVO' && (p.quantity === 0 || p.quantity <= 0));
  }, [stockProducts]);

  const lowStockProducts = useMemo(() => {
    return stockProducts.filter(p => p.status === 'ATIVO' && p.quantity > 0 && p.quantity <= (p.minQuantity || 5));
  }, [stockProducts]);

  // 8. Treasury & Donations Metrics in Period
  const periodTreasuryTxs = useMemo(() => {
    return treasuryTransactions.filter(tx => isDateInRange(tx.date, startDate, endDate) && tx.status !== 'CANCELADO');
  }, [treasuryTransactions, startDate, endDate]);

  const periodDonationTxs = useMemo(() => {
    return periodTreasuryTxs.filter(tx => tx.isDonation || tx.category?.toLowerCase().includes('doação') || tx.category?.toLowerCase().includes('doacao'));
  }, [periodTreasuryTxs]);

  const totalFinancialDonations = useMemo(() => {
    return periodDonationTxs
      .filter(tx => tx.type === 'RECEITA' && (!tx.donationKind || tx.donationKind === 'FINANCIAL'))
      .reduce((acc, tx) => acc + (tx.amount || 0), 0);
  }, [periodDonationTxs]);

  const materialDonations = useMemo(() => {
    return periodDonationTxs.filter(tx => tx.donationKind === 'MATERIAL' || tx.materialCategory);
  }, [periodDonationTxs]);

  const totalMaterialDonationsValue = useMemo(() => {
    return materialDonations.reduce((acc, tx) => acc + (tx.estimatedValue || tx.amount || 0), 0);
  }, [materialDonations]);

  const activeDonorsCount = useMemo(() => {
    const allDns = localDonors.length > 0 ? localDonors : donors;
    return allDns.filter(d => d.status === 'ATIVO').length;
  }, [localDonors, donors]);

  // 9. Computed Management Alerts
  const managementAlerts = useMemo(() => {
    return computeManagementAlerts(props, stockProducts, diaperStockAutonomyDays, startDate, endDate);
  }, [props, stockProducts, diaperStockAutonomyDays, startDate, endDate]);

  // 10. Elderly Monitoring Overview List
  const filteredElderlyList = useMemo(() => {
    return (elderly || []).filter(e => {
      const matchesSearch = elderlySearch
        ? e.name.toLowerCase().includes(elderlySearch.toLowerCase()) ||
          (e.responsibleName && e.responsibleName.toLowerCase().includes(elderlySearch.toLowerCase()))
        : true;

      const matchesStatus = elderlyStatusFilter === 'ALL' || e.status === elderlyStatusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [elderly, elderlySearch, elderlyStatusFilter]);

  // 11. Chart Data Preparations
  const attendancesBySectorChartData = useMemo(() => {
    const colors: Record<string, string> = {
      Enfermagem: '#ef4444',
      Fisioterapia: '#3b82f6',
      Psicologia: '#10b981',
      Pedagogia: '#f59e0b',
      'Serviço Social': '#8b5cf6',
      Nutrição: '#06b6d4',
      Geral: '#6b7280'
    };

    return Object.entries(attendancesBySector).map(([sector, count]) => ({
      sector,
      count,
      fill: colors[sector] || '#10b981'
    }));
  }, [attendancesBySector]);

  const activitiesBySectorChartData = useMemo(() => {
    const counts: Record<string, number> = {
      'Oficina Geral': 0,
      Psicologia: 0,
      Pedagogia: 0
    };
    allPeriodActivities.forEach(act => {
      const sec = act.sector || 'Oficina Geral';
      counts[sec] = (counts[sec] || 0) + 1;
    });
    return Object.entries(counts).map(([sector, count]) => ({ sector, count }));
  }, [allPeriodActivities]);

  const donationsTimelineChartData = useMemo(() => {
    const map: Record<string, { amount: number; count: number }> = {};
    periodTreasuryTxs.forEach(tx => {
      const dt = tx.date ? safeFormat(tx.date, 'dd/MM') : 'Data';
      if (!map[dt]) map[dt] = { amount: 0, count: 0 };
      if (tx.type === 'RECEITA') {
        map[dt].amount += tx.amount || 0;
        map[dt].count += 1;
      }
    });
    return Object.entries(map).map(([date, data]) => ({
      date,
      amount: data.amount,
      count: data.count
    }));
  }, [periodTreasuryTxs]);

  const diapersTimelineChartData = useMemo(() => {
    const map: Record<string, { changes: number; production: number }> = {};
    periodDiaperChanges.forEach(dc => {
      const dt = dc.date ? safeFormat(dc.date, 'dd/MM') : 'Data';
      if (!map[dt]) map[dt] = { changes: 0, production: 0 };
      map[dt].changes += 1;
    });
    (diaperFinalPackings || [])
      .filter(p => isDateInRange(p.date, startDate, endDate))
      .forEach(p => {
        const dt = p.date ? safeFormat(p.date, 'dd/MM') : 'Data';
        if (!map[dt]) map[dt] = { changes: 0, production: 0 };
        map[dt].production += (p.totalPackages || 0) * 10;
      });
    return Object.entries(map).map(([date, data]) => ({
      date,
      changes: data.changes,
      production: data.production
    }));
  }, [periodDiaperChanges, diaperFinalPackings, startDate, endDate]);

  const stockMovementsChartData = useMemo(() => {
    const map: Record<string, { entries: number; exits: number }> = {};
    periodStockMovements.forEach(m => {
      const prod = stockProducts.find(p => p.id === m.productId);
      const cat = prod?.category || 'Geral';
      if (!map[cat]) map[cat] = { entries: 0, exits: 0 };
      if (m.type === 'ENTRADA') map[cat].entries += m.quantity || 0;
      if (m.type === 'SAIDA') map[cat].exits += m.quantity || 0;
    });
    return Object.entries(map).map(([category, data]) => ({
      category,
      entries: data.entries,
      exits: data.exits
    }));
  }, [periodStockMovements, stockProducts]);

  const topActiveElderlyChartData = useMemo(() => {
    const map: Record<string, { attendances: number; activities: number }> = {};
    (elderly || []).forEach(e => {
      map[e.id] = { attendances: 0, activities: 0 };
    });

    periodUnifiedEvolutions.forEach(ev => {
      if (map[ev.elderlyId]) {
        map[ev.elderlyId].attendances++;
      }
    });

    allPeriodActivities.forEach(act => {
      if (act.participants && Array.isArray(act.participants)) {
        act.participants.forEach((pid: string) => {
          if (map[pid]) map[pid].activities++;
        });
      }
    });

    return (elderly || [])
      .map(e => ({
        name: e.name.split(' ')[0] + ' ' + (e.name.split(' ')[1] || ''),
        attendances: map[e.id]?.attendances || 0,
        activities: map[e.id]?.activities || 0,
        total: (map[e.id]?.attendances || 0) + (map[e.id]?.activities || 0)
      }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [elderly, periodUnifiedEvolutions, allPeriodActivities]);

  // Export handlers
  const handleExportPDF = async () => {
    setIsExporting(true);
    try {
      await generateExecutiveMonitoringPDF({
        props,
        startDate,
        endDate,
        stockProducts,
        stockMovements,
        treasuryTransactions,
        donors: localDonors.length > 0 ? localDonors : donors,
        alerts: managementAlerts,
        metrics: {
          totalElderly: elderly.length,
          activeElderly: elderly.filter(e => e.status === 'ATIVO').length,
          totalAttendances,
          attendancesBySector,
          totalWorkshops: periodWorkshops.length,
          totalWorkshopEngagements,
          diaperConsumption: diaperConsumptionCount,
          diaperDailyAvg,
          diaperStockAutonomyDays,
          diaperProductionPacks: diaperFinalPacksInPeriod,
          diaperDonationsPacks: diaperDonationsPacksInPeriod,
          totalFinancialDonations,
          totalMaterialDonationsValue,
          materialDonationsCount: materialDonations.length,
          stockInputs: stockInputsCount,
          stockOutputs: stockOutputsCount,
          criticalStockCount: zeroStockProducts.length + lowStockProducts.length
        }
      });
      showToast('Relatório Executivo em PDF gerado com sucesso!');
    } catch (err) {
      console.error('Export PDF error:', err);
      showToast('Erro ao exportar relatório em PDF', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportExcel = () => {
    try {
      generateExecutiveMonitoringExcel({
        props,
        startDate,
        endDate,
        stockProducts,
        stockMovements,
        treasuryTransactions,
        donors: localDonors.length > 0 ? localDonors : donors,
        alerts: managementAlerts,
        metrics: {
          totalElderly: elderly.length,
          activeElderly: elderly.filter(e => e.status === 'ATIVO').length,
          totalAttendances,
          attendancesBySector,
          totalWorkshops: periodWorkshops.length,
          totalWorkshopEngagements,
          diaperConsumption: diaperConsumptionCount,
          diaperDailyAvg,
          diaperStockAutonomyDays,
          diaperProductionPacks: diaperFinalPacksInPeriod,
          diaperDonationsPacks: diaperDonationsPacksInPeriod,
          totalFinancialDonations,
          totalMaterialDonationsValue,
          materialDonationsCount: materialDonations.length,
          stockInputs: stockInputsCount,
          stockOutputs: stockOutputsCount,
          criticalStockCount: zeroStockProducts.length + lowStockProducts.length
        }
      });
      showToast('Planilha Gerencial Excel exportada com sucesso!');
    } catch (err) {
      console.error('Export Excel error:', err);
      showToast('Erro ao exportar planilha Excel', 'error');
    }
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header Card */}
      <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-3 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                Gestão Integrada ILPI
              </span>
              <span className="text-xs text-gray-400">•</span>
              <span className="text-xs font-bold text-gray-500 dark:text-gray-400">Casa OAMI</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white tracking-tight">
              Painel Gerencial e Monitoramento
            </h1>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 mt-1">
              Visão executiva unificada de atendimentos, saúde, equipe, oficinas, fraldas, estoque e tesouraria.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap self-stretch sm:self-auto">
            <button
              onClick={() => window.print()}
              className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer no-print"
              title="Imprimir Painel Atual"
            >
              <Printer size={16} />
              <span>Imprimir</span>
            </button>

            <button
              onClick={handleExportExcel}
              className="px-4 py-2.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer no-print"
              title="Exportar Planilha Excel Completa"
            >
              <FileSpreadsheet size={16} />
              <span>Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 cursor-pointer disabled:opacity-50 no-print"
            >
              <FileDown size={16} />
              <span>{isExporting ? 'Gerando Relatório...' : 'Gerar Relatório Completo (PDF)'}</span>
            </button>
          </div>
        </div>

        {/* Period Filter Bar */}
        <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-4 no-print">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-emerald-600 shrink-0" />
              <span className="text-xs font-black text-gray-700 dark:text-gray-300 uppercase tracking-wider">
                Filtro por Período:
              </span>
            </div>

            {/* Current Range Label */}
            <div className="px-3 py-1 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-600 dark:text-gray-300 flex items-center gap-2">
              <Clock size={14} className="text-emerald-600" />
              <span>Intervalo: <strong>{safeFormat(startDate, 'dd/MM/yyyy')}</strong> até <strong>{safeFormat(endDate, 'dd/MM/yyyy')}</strong></span>
            </div>
          </div>

          {/* Quick Presets */}
          <div className="flex items-center gap-2 flex-wrap">
            {[
              { id: 'today', label: 'Hoje' },
              { id: 'week', label: 'Esta Semana' },
              { id: 'month', label: 'Este Mês' },
              { id: 'last_month', label: 'Mês Anterior' },
              { id: 'year', label: 'Este Ano' },
              { id: 'all', label: 'Todo o Período' },
              { id: 'custom', label: 'Personalizado' }
            ].map(preset => {
              const isActive = periodPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  onClick={() => handlePresetChange(preset.id as PeriodPreset)}
                  className={cn(
                    'px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer',
                    isActive
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 border border-gray-200 dark:border-gray-700'
                  )}
                >
                  {preset.label}
                </button>
              );
            })}

            {/* Custom Date Pickers */}
            {periodPreset === 'custom' && (
              <div className="flex items-center gap-2 ml-auto">
                <input
                  type="date"
                  value={startDate}
                  onChange={e => setStartDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none"
                />
                <span className="text-xs text-gray-400 font-bold">até</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={e => setEndDate(e.target.value)}
                  className="px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none"
                />
              </div>
            )}
          </div>
        </div>

        {/* Management Alerts Banner (Top Insights) */}
        {managementAlerts.length > 0 && (
          <div className="p-4 bg-amber-50/80 dark:bg-amber-950/30 rounded-2xl border border-amber-200 dark:border-amber-900/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-xs uppercase tracking-wider">
                <AlertTriangle size={16} />
                <span>Painel de Atenção da Gestão ({managementAlerts.length} alertas)</span>
              </div>
              <button
                onClick={() => setActiveTab('alerts')}
                className="text-xs font-bold text-amber-700 dark:text-amber-400 hover:underline cursor-pointer flex items-center gap-1"
              >
                <span>Ver todos os alertas</span>
                <ChevronRight size={14} />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {managementAlerts.slice(0, 3).map(alert => (
                <div
                  key={alert.id}
                  className={cn(
                    'p-3 rounded-xl border text-xs space-y-1 transition-all',
                    alert.type === 'CRITICAL'
                      ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-900 dark:text-red-200'
                      : 'bg-white dark:bg-gray-800 border-amber-200 dark:border-gray-700 text-gray-800 dark:text-gray-200'
                  )}
                >
                  <p className="font-black text-xs leading-snug">{alert.title}</p>
                  <p className="text-[11px] opacity-80 line-clamp-2">{alert.description}</p>
                  {alert.actionLabel && alert.targetTab && (
                    <button
                      onClick={() => setActiveTab(alert.targetTab!)}
                      className="text-[10px] font-black uppercase text-emerald-600 dark:text-emerald-400 hover:underline pt-1 block cursor-pointer"
                    >
                      {alert.actionLabel} →
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Main Sub-Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 shrink-0 no-print">
        {[
          { id: 'overview', label: 'Painel Geral', icon: LayoutDashboard },
          { id: 'elderly', label: 'Idosos & Acolhidos', icon: Users, badge: elderly.length },
          { id: 'multidisciplinary', label: 'Multidisciplinar', icon: Activity, badge: totalAttendances },
          { id: 'activities', label: 'Atividades e Oficinas', icon: Sparkles, badge: allPeriodActivities.length },
          { id: 'diapers', label: 'Controle de Fraldas', icon: Package, badge: diaperConsumptionCount },
          { id: 'stock', label: 'Estoque Geral', icon: Boxes, badge: stockProducts.length },
          { id: 'treasury', label: 'Doações & Tesouraria', icon: DollarSign },
          { id: 'charts', label: 'Gráficos & Análise', icon: TrendingUp },
          { id: 'alerts', label: 'Alertas da Gestão', icon: AlertTriangle, badge: managementAlerts.length }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as MonitoringTab)}
              className={cn(
                'flex items-center gap-2 px-4 py-3 rounded-2xl text-xs font-black transition-all whitespace-nowrap cursor-pointer shadow-sm',
                isActive
                  ? 'bg-emerald-600 text-white shadow-emerald-600/20'
                  : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 border border-gray-100 dark:border-gray-800'
              )}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
              {tab.badge !== undefined && (
                <span
                  className={cn(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold',
                    isActive
                      ? 'bg-white/20 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                  )}
                >
                  {tab.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* ========================================================================= */}
      {/* 1. OVERVIEW DASHBOARD */}
      {/* ========================================================================= */}
      {activeTab === 'overview' && (
        <div className="space-y-8 animate-in fade-in duration-300">
          {/* Executive KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
            {/* Card 1: Elderly */}
            <div
              onClick={() => setActiveTab('elderly')}
              className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center">
                  <Users size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                  Ver Detalhes →
                </span>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Idosos Acolhidos</p>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                {elderly.filter(e => e.status === 'ATIVO').length} <span className="text-xs font-bold text-gray-400">/ {elderly.length} total</span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                {(props.elderly || []).filter(e => isDateInRange(e.entryDate, startDate, endDate)).length} acolhido(s) no período
              </p>
            </div>

            {/* Card 2: Multidisciplinary */}
            <div
              onClick={() => setActiveTab('multidisciplinary')}
              className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                  <Activity size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                  Ver Setores →
                </span>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Atendimentos no Período</p>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                {totalAttendances} <span className="text-xs font-bold text-gray-400">registros</span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                6 setores multidisciplinares ativos
              </p>
            </div>

            {/* Card 3: Diapers */}
            <div
              onClick={() => setActiveTab('diapers')}
              className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-950/60 text-purple-600 flex items-center justify-center">
                  <Package size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                  Ver Fraldas →
                </span>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Consumo de Fraldas</p>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                {diaperConsumptionCount} <span className="text-xs font-bold text-gray-400">trocas</span>
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                Autonomia estimada: <strong>{diaperStockAutonomyDays.toFixed(1)} dias</strong>
              </p>
            </div>

            {/* Card 4: Treasury / Donations */}
            <div
              onClick={() => setActiveTab('treasury')}
              className="p-5 sm:p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-emerald-300 dark:hover:border-emerald-700 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-600 flex items-center justify-center">
                  <DollarSign size={20} />
                </div>
                <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-wider group-hover:translate-x-0.5 transition-transform">
                  Ver Doações →
                </span>
              </div>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Doações no Período</p>
              <h3 className="text-2xl sm:text-3xl font-black text-gray-900 dark:text-white mt-1">
                R$ {totalFinancialDonations.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
              </h3>
              <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2">
                + {materialDonations.length} doações em bens físicos
              </p>
            </div>
          </div>

          {/* Quick Visual Grid (Charts & Recent Activity) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Multidisciplinary Breakdown */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="font-black text-gray-800 dark:text-white text-base">Atendimentos por Setor</h3>
              <div className="space-y-3">
                {Object.entries(attendancesBySector).map(([sec, count]) => {
                  const numCount = Number(count);
                  const pct = totalAttendances > 0 ? (numCount / totalAttendances) * 100 : 0;
                  return (
                    <div key={sec} className="space-y-1.5">
                      <div className="flex justify-between text-xs font-bold">
                        <span className="text-gray-600 dark:text-gray-300">{sec}</span>
                        <span className="text-gray-900 dark:text-white font-black">{numCount} registros ({pct.toFixed(0)}%)</span>
                      </div>
                      <div className="h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Diaper & Stock Summary */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h3 className="font-black text-gray-800 dark:text-white text-base">Status Operacional & Estoque</h3>
              <div className="space-y-3 text-xs">
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300 font-bold">Fraldas em Estoque (Est.)</span>
                  <span className="font-black text-gray-900 dark:text-white">{totalDiapersInStock} unidades</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300 font-bold">Média Diária de Trocas</span>
                  <span className="font-black text-gray-900 dark:text-white">{diaperDailyAvg.toFixed(1)} / dia</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300 font-bold">Entradas de Estoque no Período</span>
                  <span className="font-black text-emerald-600">+{stockInputsCount} itens</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300 font-bold">Saídas de Estoque no Período</span>
                  <span className="font-black text-red-500">-{stockOutputsCount} itens</span>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl flex justify-between items-center">
                  <span className="text-gray-600 dark:text-gray-300 font-bold">Produtos em Alerta Crítico</span>
                  <span className={cn('font-black', zeroStockProducts.length > 0 ? 'text-red-600' : 'text-gray-500')}>
                    {zeroStockProducts.length + lowStockProducts.length} itens
                  </span>
                </div>
              </div>
            </div>

            {/* Recent Evolutions Timeline */}
            <div className="p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-black text-gray-800 dark:text-white text-base">Últimas Evoluções</h3>
                <button
                  onClick={() => setActiveTab('multidisciplinary')}
                  className="text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                >
                  Ver todas
                </button>
              </div>

              <div className="space-y-3 max-h-[260px] overflow-y-auto">
                {periodUnifiedEvolutions.slice(0, 5).map(ev => (
                  <div
                    key={ev.id}
                    className="p-3 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 text-xs space-y-1"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-black text-gray-800 dark:text-white">{ev.elderlyName}</span>
                      <span className="text-[10px] font-bold text-gray-400">{safeFormat(ev.date, 'dd/MM HH:mm')}</span>
                    </div>
                    <span className="text-[10px] font-black uppercase text-emerald-600">{ev.sector}</span>
                    <p className="text-gray-600 dark:text-gray-300 line-clamp-2">{ev.content}</p>
                  </div>
                ))}
                {periodUnifiedEvolutions.length === 0 && (
                  <div className="text-center py-10 text-xs font-bold text-gray-400">
                    Nenhum registro no período selecionado.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. ELDERLY 360° MONITORING */}
      {/* ========================================================================= */}
      {activeTab === 'elderly' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Censo e Monitoramento de Idosos</h2>
              <p className="text-xs text-gray-500">Histórico unificado, atendimentos e visualização 360° do acolhido.</p>
            </div>

            {/* Search and Status Filters */}
            <div className="flex items-center gap-3 w-full sm:w-auto">
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar idoso por nome..."
                  value={elderlySearch}
                  onChange={e => setElderlySearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <select
                value={elderlyStatusFilter}
                onChange={e => setElderlyStatusFilter(e.target.value)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              >
                <option value="ALL">Todos os status</option>
                <option value="ATIVO">Ativos</option>
                <option value="INATIVO">Inativos</option>
                <option value="OBITO">Óbitos</option>
              </select>
            </div>
          </div>

          {/* Elderly Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Idoso / Acolhido</th>
                  <th className="py-3 px-4">Situação</th>
                  <th className="py-3 px-4">Idade</th>
                  <th className="py-3 px-4">Acolhimento</th>
                  <th className="py-3 px-4 text-center">Atendimentos no Período</th>
                  <th className="py-3 px-4">Última Evolução</th>
                  <th className="py-3 px-4 text-right">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 font-medium">
                {filteredElderlyList.map(e => {
                  const evs = periodUnifiedEvolutions.filter(ev => ev.elderlyId === e.id);
                  const lastEv = allUnifiedEvolutions.find(ev => ev.elderlyId === e.id);

                  return (
                    <tr key={e.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 flex items-center justify-center font-black text-xs shrink-0 overflow-hidden">
                            {e.photoUrl ? (
                              <img src={e.photoUrl} alt={e.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              e.name.slice(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 dark:text-white">{e.name}</p>
                            <p className="text-[10px] text-gray-400">Leito: {e.room || 'Principal'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={cn(
                            'px-2 py-0.5 rounded-full text-[10px] font-black uppercase',
                            e.status === 'ATIVO'
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                          )}
                        >
                          {e.status || 'ATIVO'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-700 dark:text-gray-300">
                        {e.age ? `${e.age} anos` : '-'}
                      </td>
                      <td className="py-3 px-4 text-gray-500">
                        {safeFormat(e.entryDate, 'dd/MM/yyyy')}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className={cn('px-2.5 py-1 rounded-xl text-xs font-black', evs.length > 0 ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400')}>
                          {evs.length} registros
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        {lastEv ? (
                          <div>
                            <p className="font-bold text-gray-800 dark:text-gray-200 text-[11px]">{lastEv.sector}</p>
                            <p className="text-[10px] text-gray-400">{safeFormat(lastEv.date, 'dd/MM/yyyy')}</p>
                          </div>
                        ) : (
                          <span className="text-[10px] text-gray-400 italic">Sem registros</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => setSelectedElderlyForModal(e)}
                          className="px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:hover:bg-emerald-900/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                        >
                          <Eye size={14} />
                          <span>Ver Detalhes</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. MULTIDISCIPLINARY SECTOR BREAKDOWN */}
      {/* ========================================================================= */}
      {activeTab === 'multidisciplinary' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Acompanhamento Multidisciplinar por Setor</h2>
              <p className="text-xs text-gray-500">Monitoramento detalhado de cada área técnica no período selecionado.</p>
            </div>

            {/* Sector Tabs */}
            <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
              {[
                { id: 'all', label: 'Todos os Setores' },
                { id: 'nursing', label: 'Enfermagem' },
                { id: 'physio', label: 'Fisioterapia' },
                { id: 'psych', label: 'Psicologia' },
                { id: 'pedagogy', label: 'Pedagogia' },
                { id: 'social', label: 'Serviço Social' },
                { id: 'nutrition', label: 'Nutrição' }
              ].map(sec => (
                <button
                  key={sec.id}
                  onClick={() => setActiveSector(sec.id as MultidisciplinarySector)}
                  className={cn(
                    'px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer',
                    activeSector === sec.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                  )}
                >
                  {sec.label}
                </button>
              ))}
            </div>
          </div>

          {/* Sector Specific Evolutions Table */}
          <div className="space-y-4">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">
              Registros no Período ({startDate} a {endDate})
            </h3>

            {periodUnifiedEvolutions.filter(ev => {
              if (activeSector === 'all') return true;
              if (activeSector === 'nursing') return ev.sector === 'Enfermagem';
              if (activeSector === 'physio') return ev.sector === 'Fisioterapia';
              if (activeSector === 'psych') return ev.sector === 'Psicologia';
              if (activeSector === 'pedagogy') return ev.sector === 'Pedagogia';
              if (activeSector === 'social') return ev.sector === 'Serviço Social';
              if (activeSector === 'nutrition') return ev.sector === 'Nutrição';
              return true;
            }).length > 0 ? (
              <div className="space-y-3">
                {periodUnifiedEvolutions
                  .filter(ev => {
                    if (activeSector === 'all') return true;
                    if (activeSector === 'nursing') return ev.sector === 'Enfermagem';
                    if (activeSector === 'physio') return ev.sector === 'Fisioterapia';
                    if (activeSector === 'psych') return ev.sector === 'Psicologia';
                    if (activeSector === 'pedagogy') return ev.sector === 'Pedagogia';
                    if (activeSector === 'social') return ev.sector === 'Serviço Social';
                    if (activeSector === 'nutrition') return ev.sector === 'Nutrição';
                    return true;
                  })
                  .map(ev => (
                    <div
                      key={ev.id}
                      className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row gap-4"
                    >
                      <div className="shrink-0 flex sm:flex-col items-center justify-between sm:justify-start gap-1">
                        <span className="px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                          {ev.sector}
                        </span>
                        <span className="text-[11px] font-bold text-gray-400">{safeFormat(ev.date, 'dd/MM/yyyy HH:mm')}</span>
                      </div>

                      <div className="flex-1 space-y-1.5">
                        <div className="flex justify-between items-center">
                          <h4 className="font-bold text-gray-900 dark:text-white text-sm">{ev.elderlyName}</h4>
                          <span className="text-xs text-gray-400 font-bold">Por: {ev.professional}</span>
                        </div>
                        <p className="text-xs text-gray-700 dark:text-gray-300 whitespace-pre-line leading-relaxed">
                          {ev.content}
                        </p>
                        {ev.conduct && (
                          <div className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 text-xs">
                            <span className="font-bold text-gray-500 uppercase text-[10px]">Conduta:</span>
                            <p className="text-gray-700 dark:text-gray-300 mt-0.5">{ev.conduct}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Activity className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm font-bold text-gray-500">Nenhum registro encontrado no período selecionado.</p>
                <p className="text-xs text-gray-400 mt-1">Altere o filtro de período acima para visualizar registros anteriores.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. ACTIVITIES & WORKSHOPS */}
      {/* ========================================================================= */}
      {activeTab === 'activities' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Atividades e Oficinas</h2>
            <p className="text-xs text-gray-500">Oficinas socioeducativas, estimulação cognitiva e pedagógica no período.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Sessões Realizadas</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{allPeriodActivities.length}</h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Total de Participações</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalWorkshopEngagements}</h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Média / Atividade</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">
                {allPeriodActivities.length > 0 ? (totalWorkshopEngagements / allPeriodActivities.length).toFixed(1) : 0} idosos
              </h3>
            </div>
          </div>

          <div className="space-y-3">
            {allPeriodActivities.map((act, i) => (
              <div
                key={act.id || i}
                className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded-lg text-[10px] font-black uppercase bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                      {act.sector || 'Oficina'}
                    </span>
                    <span className="text-xs text-gray-400 font-bold">{safeFormat(act.date, 'dd/MM/yyyy')}</span>
                  </div>
                  <h4 className="font-bold text-gray-900 dark:text-white text-sm">{act.title || act.name || 'Atividade'}</h4>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{act.description}</p>
                </div>
                <div className="text-right shrink-0">
                  <span className="px-3 py-1 bg-white dark:bg-gray-800 rounded-xl text-xs font-black border border-gray-200 dark:border-gray-700">
                    {act.participants?.length || act.attendees?.length || 1} participantes
                  </span>
                </div>
              </div>
            ))}
            {allPeriodActivities.length === 0 && (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <Sparkles className="mx-auto text-gray-400 mb-2" size={32} />
                <p className="text-sm font-bold text-gray-500">Nenhuma atividade registrada no período selecionado.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. DIAPER CONTROL */}
      {/* ========================================================================= */}
      {activeTab === 'diapers' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Controle e Autonomia de Fraldas</h2>
            <p className="text-xs text-gray-500">Consumo real, trocas de enfermagem, produção e autonomia de estoque.</p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Trocas no Período</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{diaperConsumptionCount}</h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Média Diária</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{diaperDailyAvg.toFixed(1)}/dia</h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Estoque Estimado</p>
              <h3 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{totalDiapersInStock} un</h3>
            </div>
            <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Autonomia Estimada</p>
              <h3 className={cn('text-2xl font-black mt-1', diaperStockAutonomyDays < 7 ? 'text-red-500' : 'text-emerald-600')}>
                {diaperStockAutonomyDays.toFixed(1)} dias
              </h3>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. GENERAL STOCK */}
      {/* ========================================================================= */}
      {activeTab === 'stock' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h2 className="text-xl font-black text-gray-900 dark:text-white">Estoque Geral de Materiais e Alimentos</h2>
              <p className="text-xs text-gray-500">Saldo atual, movimentações de entrada/saída e alertas de estoque mínimo.</p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={stockStatusFilter}
                onChange={e => setStockStatusFilter(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 outline-none cursor-pointer"
              >
                <option value="ALL">Todos os produtos ({stockProducts.length})</option>
                <option value="LOW">Estoque Baixo ({lowStockProducts.length})</option>
                <option value="ZERO">Estoque Zerado ({zeroStockProducts.length})</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Código / Produto</th>
                  <th className="py-3 px-4">Categoria</th>
                  <th className="py-3 px-4 text-center">Saldo Atual</th>
                  <th className="py-3 px-4 text-center">Estoque Mínimo</th>
                  <th className="py-3 px-4 text-right">Situação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/60 font-medium">
                {stockProducts
                  .filter(p => {
                    if (stockStatusFilter === 'LOW') return p.quantity > 0 && p.quantity <= (p.minQuantity || 5);
                    if (stockStatusFilter === 'ZERO') return p.quantity <= 0;
                    return true;
                  })
                  .map(p => {
                    const isZero = p.quantity <= 0;
                    const isLow = p.quantity > 0 && p.quantity <= (p.minQuantity || 5);

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/40 transition-colors">
                        <td className="py-3 px-4">
                          <p className="font-bold text-gray-900 dark:text-white">{p.name}</p>
                          <p className="text-[10px] text-gray-400">Cód: {p.code || p.id.slice(0, 6)}</p>
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-600 dark:text-gray-300">{p.category}</td>
                        <td className="py-3 px-4 text-center font-black text-gray-900 dark:text-white">
                          {p.quantity} {p.unit || 'un'}
                        </td>
                        <td className="py-3 px-4 text-center text-gray-500">
                          {p.minQuantity || 5} {p.unit || 'un'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span
                            className={cn(
                              'px-2.5 py-1 rounded-xl text-[10px] font-black uppercase',
                              isZero
                                ? 'bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300'
                                : isLow
                                ? 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                                : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                            )}
                          >
                            {isZero ? 'Estoque Zerado' : isLow ? 'Estoque Baixo' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 7. TREASURY & DONATIONS */}
      {/* ========================================================================= */}
      {activeTab === 'treasury' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Doações, Sócios e Tesouraria</h2>
            <p className="text-xs text-gray-500">Consolidação financeira e de bens físicos doados no período.</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Arrecadação Financeira</p>
              <h3 className="text-2xl font-black text-emerald-600 mt-1">
                R$ {totalFinancialDonations.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </h3>
            </div>
            <div className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Doações em Bens Físicos</p>
              <h3 className="text-2xl font-black text-purple-600 mt-1">
                {materialDonations.length} itens (Est: R$ {totalMaterialDonationsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
              </h3>
            </div>
            <div className="p-5 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
              <p className="text-xs font-bold text-gray-400 uppercase">Sócios & Doadores Ativos</p>
              <h3 className="text-2xl font-black text-blue-600 mt-1">{activeDonorsCount} cadastrados</h3>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 8. CHARTS */}
      {/* ========================================================================= */}
      {activeTab === 'charts' && (
        <div className="animate-in fade-in duration-300">
          <MonitoringCharts
            attendancesBySectorData={attendancesBySectorChartData}
            activitiesBySectorData={activitiesBySectorChartData}
            donationsTimelineData={donationsTimelineChartData}
            diapersTimelineData={diapersTimelineChartData}
            stockMovementsData={stockMovementsChartData}
            topActiveElderlyData={topActiveElderlyChartData}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* 9. MANAGEMENT ALERTS */}
      {/* ========================================================================= */}
      {activeTab === 'alerts' && (
        <div className="p-6 md:p-8 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6 animate-in fade-in duration-300">
          <div>
            <h2 className="text-xl font-black text-gray-900 dark:text-white">Painel de Alertas e Pendências da Gestão</h2>
            <p className="text-xs text-gray-500">Notificações automáticas calculadas com base nas coleções reais do sistema.</p>
          </div>

          <div className="space-y-4">
            {managementAlerts.map(alert => (
              <div
                key={alert.id}
                className={cn(
                  'p-5 rounded-2xl border space-y-2',
                  alert.type === 'CRITICAL'
                    ? 'bg-red-50/70 dark:bg-red-950/30 border-red-200 dark:border-red-900/60 text-red-900 dark:text-red-200'
                    : alert.type === 'WARNING'
                    ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200'
                    : 'bg-blue-50/70 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/60 text-blue-900 dark:text-blue-200'
                )}
              >
                <div className="flex items-center justify-between">
                  <span className="font-black text-sm">{alert.title}</span>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/80 dark:bg-gray-800 shadow-sm">
                    {alert.type}
                  </span>
                </div>
                <p className="text-xs opacity-90">{alert.description}</p>
                {alert.items && alert.items.length > 0 && (
                  <ul className="list-disc list-inside text-[11px] pt-1 space-y-0.5 opacity-80">
                    {alert.items.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                )}
                {alert.actionLabel && alert.targetTab && (
                  <button
                    onClick={() => setActiveTab(alert.targetTab!)}
                    className="mt-2 text-xs font-black uppercase text-emerald-700 dark:text-emerald-400 hover:underline cursor-pointer flex items-center gap-1"
                  >
                    <span>{alert.actionLabel}</span>
                    <ChevronRight size={14} />
                  </button>
                )}
              </div>
            ))}

            {managementAlerts.length === 0 && (
              <div className="text-center py-16 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={36} />
                <p className="text-base font-bold text-gray-700 dark:text-gray-300">Tudo em conformidade!</p>
                <p className="text-xs text-gray-400 mt-1">Nenhum alerta crítico ou pendência operacional detectada no período.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ELDERLY 360° DRILL DOWN MODAL */}
      {/* ========================================================================= */}
      {selectedElderlyForModal && (
        <ElderlyDetailModal
          elderly={selectedElderlyForModal}
          evolutions={allUnifiedEvolutions.filter(ev => ev.elderlyId === selectedElderlyForModal.id)}
          vitals={(vitalSigns || []).filter(v => v.patientId === selectedElderlyForModal.id)}
          pia={(pias || []).find(p => p.elderlyId === selectedElderlyForModal.id)}
          activities={allPeriodActivities.filter(a => a.participants?.includes(selectedElderlyForModal.id))}
          diaperChanges={(diaperChangeRecords || []).filter(dc => dc.elderlyId === selectedElderlyForModal.id)}
          onClose={() => setSelectedElderlyForModal(null)}
          startDate={startDate}
          endDate={endDate}
        />
      )}
    </div>
  );
};
