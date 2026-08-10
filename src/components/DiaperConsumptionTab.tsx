import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Heart, 
  Calendar, 
  Users, 
  Package, 
  BarChart3, 
  TrendingUp, 
  AlertCircle, 
  CheckCircle2, 
  Search, 
  Filter, 
  Edit3, 
  Plus, 
  Minus, 
  FileText, 
  FileDown, 
  Table as TableIcon, 
  RefreshCw, 
  UserCheck, 
  UserX, 
  ShieldCheck, 
  Layers,
  Clock,
  Sparkles,
  Info,
  ArrowUpRight,
  ArrowDownRight,
  AlertTriangle,
  Trash2,
  History,
  PlusCircle,
  PackagePlus,
  Box,
  TrendingDown,
  X
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  Legend, 
  Cell
} from 'recharts';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, doc, onSnapshot, setDoc, deleteDoc, addDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { 
  Elderly, 
  ElderlyDiaperUsage, 
  User as UserType, 
  DiaperFinalPacking,
  DiaperConsumptionLog,
  DiaperStockEntry,
  DiaperDonation
} from '../types';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { generateModernExcel } from '../lib/excelUtils';
import { cn } from '../lib/utils';
import { INSTITUTION_NAME } from '../constants';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

interface DiaperConsumptionTabProps {
  user: UserType;
  elderly?: Elderly[];
  finalPackings?: DiaperFinalPacking[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

const DIAPERS_PER_PACKAGE = 14;
const DIAPER_SIZE = "Tamanho Único";

export const DiaperConsumptionTab: React.FC<DiaperConsumptionTabProps> = ({
  user,
  elderly = [],
  finalPackings = [],
  showToast
}) => {
  const getTodayString = () => new Date().toISOString().split('T')[0];
  const getYesterdayString = () => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split('T')[0];
  };
  const getDaysAgoString = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    return d.toISOString().split('T')[0];
  };
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  };

  // Firestore sync state
  const [usageMap, setUsageMap] = useState<Record<string, ElderlyDiaperUsage>>({});
  const [dailyLogs, setDailyLogs] = useState<DiaperConsumptionLog[]>([]);
  const [stockEntries, setStockEntries] = useState<DiaperStockEntry[]>([]);
  const [donationsList, setDonationsList] = useState<DiaperDonation[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters & UI states
  const [searchQuery, setSearchQuery] = useState('');
  const [filterUsage, setFilterUsage] = useState<'ALL' | 'USERS' | 'NON_USERS'>('ALL');
  const [activeSection, setActiveSection] = useState<'STOCK' | 'GRID' | 'HISTORY'>('GRID');

  // Per-elderly chosen date & quantity for consumption log
  const [selectedDates, setSelectedDates] = useState<Record<string, string>>({});
  const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});

  // History tab filters
  const [historyDateFilter, setHistoryDateFilter] = useState('');
  const [historyElderlyFilter, setHistoryElderlyFilter] = useState('');

  const applyGlobalDate = (dateStr: string) => {
    const newMap: Record<string, string> = {};
    filteredElderly.forEach(item => {
      newMap[item.elderly.id] = dateStr;
    });
    setSelectedDates(prev => ({ ...prev, ...newMap }));
    showToast(`Data ${formatDateBR(dateStr)} aplicada para todos os idosos da lista!`, 'success');
  };

  // Modal state for editing or logging daily consumption
  const [editingUsage, setEditingUsage] = useState<{
    elderlyId: string;
    elderlyName: string;
    usesDiapers: boolean;
    diapersPerDay: number;
    date: string;
    notes: string;
  } | null>(null);

  // Modal state for manual stock entry
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockForm, setStockForm] = useState({
    date: getTodayString(),
    quantity: 140, // default 10 packages = 140 units
    unitType: 'PACOTES' as 'UNIDADES' | 'PACOTES',
    origin: 'DOACAO' as 'DOACAO' | 'PRODUCAO_EXTRA' | 'COMPRA' | 'AJUSTE_INVENTARIO',
    notes: ''
  });

  // Modal state for institutional report generation by period
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportPeriod, setReportPeriod] = useState<'DIARIO' | 'MENSAL' | 'SEMESTRAL' | 'ANUAL'>('MENSAL');
  const [reportDate, setReportDate] = useState(getTodayString());
  const [reportMonth, setReportMonth] = useState(getTodayString().slice(0, 7)); // 'YYYY-MM'
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [reportSemester, setReportSemester] = useState<'1' | '2'>(new Date().getMonth() < 6 ? '1' : '2');
  const [reportUserFilter, setReportUserFilter] = useState<'USERS_ONLY' | 'ALL_ACTIVE' | 'ALL'>('USERS_ONLY');

  // Real-time Firestore sync
  useEffect(() => {
    let unsubs: (() => void)[] = [];

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      // Clear previous listeners
      unsubs.forEach(unsub => unsub());
      unsubs = [];

      if (!authUser) {
        setLoading(false);
        return;
      }

      // 1. Sync Elderly Base Usage Preferences
      const usageRef = collection(db, 'diaper_elderly_usage');
      const unsubUsage = onSnapshot(usageRef, (snapshot) => {
        const map: Record<string, ElderlyDiaperUsage> = {};
        snapshot.forEach((docSnap) => {
          const data = docSnap.data() as ElderlyDiaperUsage;
          map[docSnap.id] = { ...data, id: docSnap.id };
        });
        setUsageMap(map);
      }, (error) => {
        console.error("Erro ao carregar preferências de uso de fraldas:", error);
        handleFirestoreError(error, OperationType.LIST, 'diaper_elderly_usage');
      });
      unsubs.push(unsubUsage);

      // 2. Sync Daily Consumption Logs
      const logsRef = collection(db, 'diaper_daily_consumption_logs');
      const unsubLogs = onSnapshot(logsRef, (snapshot) => {
        const list: DiaperConsumptionLog[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as DiaperConsumptionLog);
        });
        // Sort newest first
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setDailyLogs(list);
      }, (error) => {
        console.error("Erro ao carregar histórico de consumo de fraldas:", error);
        handleFirestoreError(error, OperationType.LIST, 'diaper_daily_consumption_logs');
      });
      unsubs.push(unsubLogs);

      // 3. Sync Manual Stock Entries
      const stockRef = collection(db, 'diaper_stock_entries');
      const unsubStock = onSnapshot(stockRef, (snapshot) => {
        const list: DiaperStockEntry[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as DiaperStockEntry);
        });
        list.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        setStockEntries(list);
      }, (error) => {
        console.error("Erro ao carregar entradas manuais de estoque:", error);
        handleFirestoreError(error, OperationType.LIST, 'diaper_stock_entries');
      });
      unsubs.push(unsubStock);

      // 4. Sync Diaper Donations
      const donationsRef = collection(db, 'diaperDonations');
      const unsubDonations = onSnapshot(donationsRef, (snapshot) => {
        const list: DiaperDonation[] = [];
        snapshot.forEach((docSnap) => {
          list.push({ id: docSnap.id, ...docSnap.data() } as DiaperDonation);
        });
        setDonationsList(list);
        setLoading(false);
      }, (error) => {
        console.error("Erro ao carregar doações de fraldas:", error);
        setLoading(false);
      });
      unsubs.push(unsubDonations);
    });

    return () => {
      unsubs.forEach(unsub => unsub());
      unsubscribeAuth();
    };
  }, []);

  // Filter institutionalized active elderly residents
  const activeElderlyList = useMemo(() => {
    return elderly.filter(e => e.status !== 'INATIVO');
  }, [elderly]);

  // Combined data with usage configurations and recent log info (Contagem real a partir do lançamento)
  const elderlyConsumptionData = useMemo(() => {
    return elderly.map((e) => {
      const saved = usageMap[e.id];
      const logsForElderly = dailyLogs.filter(l => l.elderlyId === e.id);
      const sortedLogs = [...logsForElderly].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      const latestLog = sortedLogs[0];

      let usesDiapers = true;
      let diapersPerDay = 0;

      if (latestLog && typeof latestLog.quantity === 'number') {
        diapersPerDay = latestLog.quantity;
        usesDiapers = diapersPerDay > 0;
      } else if (saved) {
        usesDiapers = saved.usesDiapers;
        diapersPerDay = usesDiapers ? (saved.diapersPerDay ?? 0) : 0;
      } else {
        // Se ainda não houve lançamento e nem cadastro salvo, idoso não usa fraldas por padrão (0)
        usesDiapers = false;
        diapersPerDay = 0;
      }

      const notes = saved?.notes || latestLog?.notes || '';
      const lastLoggedDate = latestLog?.date || saved?.lastLoggedDate || '';

      const daily = usesDiapers ? diapersPerDay : 0;
      const weekly = daily * 7;
      const monthly = daily * 30;
      const semestral = daily * 180;
      const annual = daily * 365;

      const monthlyPacks = Math.ceil(monthly / DIAPERS_PER_PACKAGE);
      const semestralPacks = Math.ceil(semestral / DIAPERS_PER_PACKAGE);
      const annualPacks = Math.ceil(annual / DIAPERS_PER_PACKAGE);

      const totalLoggedDiapers = logsForElderly.reduce((acc, l) => acc + (l.quantity || 0), 0);

      return {
        elderly: e,
        usesDiapers,
        diapersPerDay: daily,
        weekly,
        monthly,
        semestral,
        annual,
        monthlyPacks,
        semestralPacks,
        annualPacks,
        notes,
        lastLoggedDate,
        totalLoggedDiapers,
        logsCount: logsForElderly.length,
        savedRecord: saved
      };
    });
  }, [elderly, usageMap, dailyLogs]);

  // Filtered list for UI display
  const filteredElderly = useMemo(() => {
    return elderlyConsumptionData.filter(item => {
      const matchesSearch = item.elderly.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (item.elderly.fullName && item.elderly.fullName.toLowerCase().includes(searchQuery.toLowerCase()));
      
      if (filterUsage === 'USERS') return matchesSearch && item.usesDiapers;
      if (filterUsage === 'NON_USERS') return matchesSearch && !item.usesDiapers;
      return matchesSearch;
    });
  }, [elderlyConsumptionData, searchQuery, filterUsage]);

  // Comprehensive Inventory & Stock Calculations (Integrado: Produção + Entradas - Consumo - Doações)
  const stockSummary = useMemo(() => {
    // 1. Total Entradas: Final Packings (Fábrica) + Manual Stock Entries
    const totalPackagedFromFactory = finalPackings.reduce((acc, item) => acc + (item.quantityPackaged || 0), 0);
    const totalManualStockEntries = stockEntries.reduce((acc, entry) => acc + (entry.quantity || 0), 0);
    const totalEntradas = totalPackagedFromFactory + totalManualStockEntries;
    const totalEntradasPacotes = Math.floor(totalEntradas / DIAPERS_PER_PACKAGE);

    // 2. Total Saídas
    // Saídas 1: Logs de consumo dos idosos
    const totalSaidasLogs = dailyLogs.reduce((acc, log) => acc + (log.quantity || 0), 0);
    // Saídas 2: Doações realizadas
    const totalDonationsGiven = donationsList.reduce((acc, d) => acc + (d.quantity || 0), 0);
    
    const totalSaidasConsumo = totalSaidasLogs;
    const totalSaidasGeral = totalSaidasLogs + totalDonationsGiven;
    const totalSaidasPacotes = Math.ceil(totalSaidasGeral / DIAPERS_PER_PACKAGE);

    // 3. Saldo Atual
    const saldoAtualUnidades = Math.max(0, totalEntradas - totalSaidasGeral);
    const saldoAtualPacotes = Math.floor(saldoAtualUnidades / DIAPERS_PER_PACKAGE);

    // Demanda Diária Atual da Instituição (Calculada a partir dos lançamentos/cadastros dos Idosos Ativos)
    const dailyDiapersDemand = elderlyConsumptionData.reduce((acc, curr) => 
      curr.elderly.status !== 'INATIVO' ? acc + curr.diapersPerDay : acc, 0);

    // Autonomia em dias
    const daysOfAutonomyNum = dailyDiapersDemand > 0 ? (saldoAtualUnidades / dailyDiapersDemand) : 999;
    const daysOfAutonomy = dailyDiapersDemand > 0 ? daysOfAutonomyNum.toFixed(1) : '∞';

    // 4. Alerta de Estoque Baixo (Threshold = 7 dias de consumo ou menos de 140 fraldas)
    const safetyThresholdUnidades = Math.max(140, dailyDiapersDemand * 7);
    const isLowStock = saldoAtualUnidades < safetyThresholdUnidades || daysOfAutonomyNum <= 7;

    return {
      totalPackagedFromFactory,
      totalManualStockEntries,
      totalEntradas,
      totalEntradasPacotes,
      totalSaidasConsumo,
      totalDonationsGiven,
      totalSaidasGeral,
      totalSaidasPacotes,
      saldoAtualUnidades,
      saldoAtualPacotes,
      dailyDiapersDemand,
      daysOfAutonomyNum,
      daysOfAutonomy,
      safetyThresholdUnidades,
      isLowStock
    };
  }, [finalPackings, stockEntries, dailyLogs, donationsList, elderlyConsumptionData]);

  // Aggregate stats across institution
  const totals = useMemo(() => {
    const totalActive = activeElderlyList.length;
    const usersCount = elderlyConsumptionData.filter(i => i.elderly.status !== 'INATIVO' && i.usesDiapers).length;
    const nonUsersCount = totalActive - usersCount;

    const dailyDiapers = stockSummary.dailyDiapersDemand;
    const weeklyDiapers = dailyDiapers * 7;
    const monthlyDiapers = dailyDiapers * 30;
    const semestralDiapers = dailyDiapers * 180;
    const annualDiapers = dailyDiapers * 365;

    const dailyPacksExact = dailyDiapers / DIAPERS_PER_PACKAGE;
    const dailyPacksCeil = Math.ceil(dailyPacksExact);
    const weeklyPacksCeil = Math.ceil(weeklyDiapers / DIAPERS_PER_PACKAGE);
    const monthlyPacksCeil = Math.ceil(monthlyDiapers / DIAPERS_PER_PACKAGE);
    const semestralPacksCeil = Math.ceil(semestralDiapers / DIAPERS_PER_PACKAGE);
    const annualPacksCeil = Math.ceil(annualDiapers / DIAPERS_PER_PACKAGE);

    return {
      totalActive,
      usersCount,
      nonUsersCount,
      dailyDiapers,
      dailyPacksExact,
      dailyPacksCeil,
      weeklyDiapers,
      weeklyPacksCeil,
      monthlyDiapers,
      monthlyPacksCeil,
      semestralDiapers,
      semestralPacksCeil,
      annualDiapers,
      annualPacksCeil
    };
  }, [activeElderlyList, elderlyConsumptionData, stockSummary]);

  // Function to register daily consumption for a specific date
  const handleRegisterDailyConsumption = async (
    elderlyId: string, 
    elderlyName: string, 
    usesDiapers: boolean, 
    diapersCount: number, 
    chosenDate: string,
    notes?: string
  ) => {
    const consumptionDate = chosenDate || getTodayString();
    const qty = usesDiapers ? Math.max(0, diapersCount) : 0;

    try {
      // 1. Log in diaper_daily_consumption_logs
      const logDocId = `${elderlyId}_${consumptionDate}`;
      const logRef = doc(db, 'diaper_daily_consumption_logs', logDocId);
      await setDoc(logRef, {
        elderlyId,
        elderlyName,
        date: consumptionDate,
        quantity: qty,
        usesDiapers,
        notes: notes || '',
        createdAt: new Date().toISOString(),
        createdBy: user.name || user.email
      }, { merge: true });

      // 2. Update base usage preferences in diaper_elderly_usage
      const usageRef = doc(db, 'diaper_elderly_usage', elderlyId);
      await setDoc(usageRef, {
        elderlyId,
        elderlyName,
        usesDiapers,
        diapersPerDay: qty,
        size: DIAPER_SIZE,
        notes: notes || '',
        lastLoggedDate: consumptionDate,
        updatedAt: new Date().toISOString(),
        updatedBy: user.name || user.email
      }, { merge: true });

      const dateFmt = consumptionDate.split('-').reverse().join('/');
      showToast(`Consumo de ${qty} fraldas registrado para ${elderlyName} em ${dateFmt}!`, 'success');
    } catch (err) {
      console.error("Erro ao registrar consumo do idoso:", err);
      handleFirestoreError(err, OperationType.WRITE, 'diaper_daily_consumption_logs');
      showToast("Erro ao salvar lançamento de consumo", "error");
    }
  };

  // Quick adjust in grid card
  const handleQuickAdjust = (elderlyId: string, currentUses: boolean, currentCount: number, delta: number) => {
    const newCount = Math.max(0, (selectedQuantities[elderlyId] ?? currentCount) + delta);
    setSelectedQuantities(prev => ({ ...prev, [elderlyId]: newCount }));
  };

  // Submit manual stock entry (Entrada de Estoque)
  const handleSaveStockEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (stockForm.quantity <= 0) {
      showToast("A quantidade da entrada deve ser maior que zero", "error");
      return;
    }

    try {
      const units = stockForm.unitType === 'PACOTES' 
        ? stockForm.quantity * DIAPERS_PER_PACKAGE 
        : stockForm.quantity;

      const newRef = doc(collection(db, 'diaper_stock_entries'));
      await setDoc(newRef, {
        date: stockForm.date || getTodayString(),
        quantity: units,
        origin: stockForm.origin,
        notes: stockForm.notes || '',
        createdAt: new Date().toISOString(),
        createdBy: user.name || user.email
      });

      setIsStockModalOpen(false);
      setStockForm({
        date: getTodayString(),
        quantity: 140,
        unitType: 'PACOTES',
        origin: 'DOACAO',
        notes: ''
      });
      showToast(`Entrada de ${units} fraldas registrada no estoque com sucesso!`, 'success');
    } catch (err) {
      console.error("Erro ao registrar entrada no estoque:", err);
      handleFirestoreError(err, OperationType.WRITE, 'diaper_stock_entries');
      showToast("Erro ao registrar entrada de estoque", "error");
    }
  };

  // Delete a consumption log entry from history
  const handleDeleteLog = async (logId: string) => {
    try {
      await deleteDoc(doc(db, 'diaper_daily_consumption_logs', logId));
      showToast("Lançamento de consumo removido com sucesso!", "success");
    } catch (err) {
      console.error("Erro ao excluir lançamento:", err);
      handleFirestoreError(err, OperationType.DELETE, 'diaper_daily_consumption_logs');
      showToast("Erro ao excluir lançamento de consumo", "error");
    }
  };

  // Export function supporting Diário, Mensal, Semestral, and Anual views with OAMI Timbrado
  const handleGenerateReport = (formatType: 'pdf' | 'excel' | 'word') => {
    // 1. Determine period title, subtitle, multiplier, and date labels
    let periodTitle = '';
    let periodLabel = '';
    let daysMultiplier = 30;

    if (reportPeriod === 'DIARIO') {
      const dateFmt = reportDate ? reportDate.split('-').reverse().join('/') : formatDateBR(getTodayString());
      periodTitle = `Relatório Diário de Consumo e Demanda de Fraldas Geriátricas`;
      periodLabel = `Data: ${dateFmt} (1 Dia)`;
      daysMultiplier = 1;
    } else if (reportPeriod === 'MENSAL') {
      const parts = reportMonth ? reportMonth.split('-') : getTodayString().split('-');
      const y = parts[0] || '2026';
      const m = parts[1] || '08';
      const monthNames = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
      const monthIndex = parseInt(m, 10) - 1;
      const mName = monthNames[monthIndex] || m;
      periodTitle = `Relatório Mensal de Consumo e Demanda de Fraldas Geriátricas`;
      periodLabel = `Mês: ${mName}/${y} (30 Dias)`;
      daysMultiplier = 30;
    } else if (reportPeriod === 'SEMESTRAL') {
      periodTitle = `Relatório Semestral de Consumo e Demanda de Fraldas Geriátricas`;
      periodLabel = `${reportSemester}º Semestre de ${reportYear} (180 Dias)`;
      daysMultiplier = 180;
    } else {
      periodTitle = `Relatório Anual de Consumo e Demanda de Fraldas Geriátricas`;
      periodLabel = `Ano de ${reportYear} (365 Dias)`;
      daysMultiplier = 365;
    }

    // 2. Filter elderly data
    let listToExport = elderlyConsumptionData;
    if (reportUserFilter === 'USERS_ONLY') {
      listToExport = listToExport.filter(item => item.usesDiapers && item.diapersPerDay > 0);
    } else if (reportUserFilter === 'ALL_ACTIVE') {
      listToExport = listToExport.filter(item => item.elderly.status !== 'INATIVO');
    }

    // Sort alphabetically by elderly name
    listToExport = [...listToExport].sort((a, b) => a.elderly.name.localeCompare(b.elderly.name, 'pt-BR'));

    // 3. Columns depending on period
    let columns: string[] = [];
    if (reportPeriod === 'DIARIO') {
      columns = ['Idoso', 'Status', 'Usa Fralda', 'Diário (un)', 'Pacotes/Dia', 'Lançado no Dia', 'Último Registro', 'Observações'];
    } else if (reportPeriod === 'MENSAL') {
      columns = ['Idoso', 'Status', 'Usa Fralda', 'Diário (un)', 'Demanda Mensal (un)', 'Pacotes/Mês (14un)', 'Histórico no Mês', 'Último Registro', 'Observações'];
    } else if (reportPeriod === 'SEMESTRAL') {
      columns = ['Idoso', 'Status', 'Usa Fralda', 'Diário (un)', 'Mensal (un)', 'Demanda Semestral (un)', 'Pacotes/Semestre', 'Último Registro', 'Observações'];
    } else {
      columns = ['Idoso', 'Status', 'Usa Fralda', 'Diário (un)', 'Mensal (un)', 'Demanda Anual (un)', 'Pacotes/Ano (14un)', 'Último Registro', 'Observações'];
    }

    // Calculate sum metrics for filtered list
    let totalDailyUnits = 0;
    let totalPeriodUnits = 0;
    let totalPeriodPacks = 0;
    let totalPeriodLogged = 0;

    // 4. Data rows
    const dataRows = listToExport.map(item => {
      const dailyUn = item.usesDiapers ? item.diapersPerDay : 0;
      const periodUn = dailyUn * daysMultiplier;
      const periodPacks = Math.ceil(periodUn / DIAPERS_PER_PACKAGE);

      totalDailyUnits += dailyUn;
      totalPeriodUnits += periodUn;
      totalPeriodPacks += periodPacks;

      // Check logged units in dailyLogs for this elderly in range
      let loggedUnits = 0;
      if (reportPeriod === 'DIARIO') {
        const matchingLogs = dailyLogs.filter(l => l.elderlyId === item.elderly.id && l.date === reportDate);
        loggedUnits = matchingLogs.reduce((acc, l) => acc + (l.quantity || 0), 0);
      } else if (reportPeriod === 'MENSAL') {
        const matchingLogs = dailyLogs.filter(l => l.elderlyId === item.elderly.id && l.date && l.date.startsWith(reportMonth));
        loggedUnits = matchingLogs.reduce((acc, l) => acc + (l.quantity || 0), 0);
      } else if (reportPeriod === 'SEMESTRAL') {
        const yearStr = String(reportYear);
        const matchingLogs = dailyLogs.filter(l => {
          if (l.elderlyId !== item.elderly.id || !l.date || !l.date.startsWith(yearStr)) return false;
          const monthNum = parseInt(l.date.split('-')[1], 10);
          return reportSemester === '1' ? (monthNum >= 1 && monthNum <= 6) : (monthNum >= 7 && monthNum <= 12);
        });
        loggedUnits = matchingLogs.reduce((acc, l) => acc + (l.quantity || 0), 0);
      } else {
        const yearStr = String(reportYear);
        const matchingLogs = dailyLogs.filter(l => l.elderlyId === item.elderly.id && l.date && l.date.startsWith(yearStr));
        loggedUnits = matchingLogs.reduce((acc, l) => acc + (l.quantity || 0), 0);
      }

      totalPeriodLogged += loggedUnits;

      const lastDate = item.lastLoggedDate ? item.lastLoggedDate.split('-').reverse().join('/') : '-';
      const obs = item.notes || '-';

      if (reportPeriod === 'DIARIO') {
        return [
          item.elderly.name,
          item.elderly.status || 'ATIVO',
          item.usesDiapers ? 'SIM' : 'NÃO',
          `${dailyUn} un`,
          `${(dailyUn / DIAPERS_PER_PACKAGE).toFixed(2)} pac`,
          loggedUnits > 0 ? `${loggedUnits} un` : '0 un',
          lastDate,
          obs
        ];
      } else if (reportPeriod === 'MENSAL') {
        return [
          item.elderly.name,
          item.elderly.status || 'ATIVO',
          item.usesDiapers ? 'SIM' : 'NÃO',
          `${dailyUn} un`,
          `${periodUn} un`,
          `${periodPacks} pacotes`,
          `${loggedUnits} un`,
          lastDate,
          obs
        ];
      } else if (reportPeriod === 'SEMESTRAL') {
        return [
          item.elderly.name,
          item.elderly.status || 'ATIVO',
          item.usesDiapers ? 'SIM' : 'NÃO',
          `${dailyUn} un`,
          `${dailyUn * 30} un`,
          `${periodUn} un`,
          `${periodPacks} pacotes`,
          lastDate,
          obs
        ];
      } else {
        return [
          item.elderly.name,
          item.elderly.status || 'ATIVO',
          item.usesDiapers ? 'SIM' : 'NÃO',
          `${dailyUn} un`,
          `${dailyUn * 30} un`,
          `${periodUn} un`,
          `${periodPacks} pacotes`,
          lastDate,
          obs
        ];
      }
    });

    // Totals row at bottom
    const totalRow = [
      'TOTAL CONSOLIDADO',
      `${listToExport.length} idosos`,
      `${listToExport.filter(i => i.usesDiapers).length} usam`,
      `${totalDailyUnits} un/dia`,
      `${totalPeriodUnits} un`,
      `${totalPeriodPacks} pacotes`,
      `${totalPeriodLogged} un lançadas`,
      '-',
      `Demanda calculada (${daysMultiplier}d)`
    ];

    dataRows.push(totalRow);

    // 5. Official Header & Timbrado Summary
    const summaryLines = [
      `RELATÓRIO INSTITUCIONAL DE CONSUMO E ESTOQUE DE FRALDAS GERIÁTRICAS`,
      `• Período do Relatório: ${periodLabel} | Embalagem Padrão: 14 fraldas/pacote`,
      `• Saldo Atual em Estoque: ${stockSummary.saldoAtualUnidades} fraldas (${stockSummary.saldoAtualPacotes} pacotes de 14 un) — ${stockSummary.isLowStock ? 'ALERTA DE ESTOQUE CRÍTICO' : 'ESTOQUE EM NÍVEL ADEQUADO'}`,
      `• Autonomia Estimada do Estoque: ~${stockSummary.daysOfAutonomy} Dias de uso contínuo`,
      `• Movimentação no Período: Entradas: ${stockSummary.totalEntradas} un | Saídas: ${stockSummary.totalSaidasGeral} un`,
      `• Cobertura de Acompanhamento: ${totals.usersCount} idosos atendidos de ${totals.totalActive} idosos ativos`,
      `• Demanda Consolidada no Período (${daysMultiplier} dias): ${totalPeriodUnits.toLocaleString('pt-BR')} fraldas (~${totalPeriodPacks.toLocaleString('pt-BR')} pacotes fechados)`
    ].join('\n');

    const fileName = `oami_relatorio_fraldas_${reportPeriod.toLowerCase()}_${new Date().toISOString().split('T')[0]}`;

    if (formatType === 'pdf') {
      generateModernPDF({
        title: periodTitle,
        subtitle: summaryLines,
        columns,
        data: dataRows,
        fileName,
        institutionName: INSTITUTION_NAME
      });
      showToast(`Relatório PDF (${reportPeriod}) baixado com sucesso!`, 'success');
    } else if (formatType === 'word') {
      generateModernWord({
        title: periodTitle,
        subtitle: summaryLines,
        columns,
        data: dataRows,
        fileName
      });
      showToast(`Documento Word (${reportPeriod}) baixado com sucesso!`, 'success');
    } else if (formatType === 'excel') {
      generateModernExcel({
        title: `${periodTitle} - ${periodLabel}`,
        columns,
        data: dataRows,
        fileName
      });
      showToast(`Planilha Excel (${reportPeriod}) baixada com sucesso!`, 'success');
    }

    setIsReportModalOpen(false);
  };

  // Recharts Data
  const periodChartData = [
    { period: 'Dia (1d)', fraldas: totals.dailyDiapers, pacotes: totals.dailyPacksCeil },
    { period: 'Semana (7d)', fraldas: totals.weeklyDiapers, pacotes: totals.weeklyPacksCeil },
    { period: 'Mês (30d)', fraldas: totals.monthlyDiapers, pacotes: totals.monthlyPacksCeil },
    { period: 'Semestre (180d)', fraldas: totals.semestralDiapers, pacotes: totals.semestralPacksCeil },
    { period: 'Ano (365d)', fraldas: totals.annualDiapers, pacotes: totals.annualPacksCeil },
  ];

  const topConsumersChartData = useMemo(() => {
    return elderlyConsumptionData
      .filter(i => i.usesDiapers && i.diapersPerDay > 0)
      .sort((a, b) => b.diapersPerDay - a.diapersPerDay)
      .slice(0, 8)
      .map(i => ({
        name: i.elderly.name.split(' ')[0] + ' ' + (i.elderly.name.split(' ')[1] || ''),
        diario: i.diapersPerDay,
        mensal: i.monthly,
        pacotesMes: i.monthlyPacks
      }));
  }, [elderlyConsumptionData]);

  // Filtered daily logs for history section
  const filteredDailyLogs = useMemo(() => {
    return dailyLogs.filter(log => {
      const matchDate = !historyDateFilter || log.date === historyDateFilter;
      const matchElderly = !historyElderlyFilter || log.elderlyName.toLowerCase().includes(historyElderlyFilter.toLowerCase());
      return matchDate && matchElderly;
    });
  }, [dailyLogs, historyDateFilter, historyElderlyFilter]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 space-y-4">
        <RefreshCw className="w-8 h-8 text-green-600 animate-spin" />
        <p className="text-sm font-semibold text-gray-500">Carregando dados de consumo e estoque de fraldas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner Principal com Ações e Exportação */}
      <div className="bg-gradient-to-r from-emerald-900 via-green-800 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-white/5 rounded-full blur-2xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row justify-between lg:items-center gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-500/20 backdrop-blur-md rounded-full text-green-200 text-xs font-bold uppercase tracking-wider">
              <Sparkles size={14} className="text-green-300 animate-pulse" />
              SGPF • Módulo de Consumo e Estoque Integrado
            </div>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight">
              Consumo e Controle de Fraldas pelos Idosos
            </h2>
            <p className="text-green-100 text-sm md:text-base leading-relaxed">
              Monitore a demanda diária por data de uso, registre saídas de consumo, controle entradas e acompanhe o saldo atual do estoque com alertas em tempo real.
            </p>

            <div className="flex flex-wrap items-center gap-3 pt-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold text-white backdrop-blur-sm border border-white/10">
                <ShieldCheck size={14} className="text-green-400" />
                Especificação: <strong className="text-green-200 ml-1">{DIAPER_SIZE}</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold text-white backdrop-blur-sm border border-white/10">
                <Package size={14} className="text-emerald-400" />
                Embalagem: <strong className="text-emerald-200 ml-1">{DIAPERS_PER_PACKAGE} un/pacote</strong>
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-white/10 rounded-xl text-xs font-semibold text-white backdrop-blur-sm border border-white/10">
                <Users size={14} className="text-teal-300" />
                Atendidos: <strong className="text-teal-200 ml-1">{totals.usersCount} de {totals.totalActive} idosos</strong>
              </span>
            </div>
          </div>

          <div className="flex flex-wrap lg:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => setIsStockModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-500 hover:bg-emerald-400 text-gray-900 rounded-2xl font-black text-xs transition-all shadow-lg active:scale-95 border border-emerald-300"
            >
              <PackagePlus size={18} />
              + Lançar Entrada de Estoque
            </button>

            <button
              onClick={() => setIsReportModalOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-white/20 hover:bg-white/30 text-white rounded-2xl font-black text-xs transition-all shadow-md active:scale-95 border border-white/30 backdrop-blur-md"
            >
              <FileText size={18} className="text-emerald-300" />
              <span>Gerar Relatório Oficial (Diário, Mensal, Semestral, Anual)</span>
            </button>
          </div>
        </div>
      </div>

      {/* BANNER DE ALERTA DE ESTOQUE BAIXO (SE APLICÁVEL) */}
      {stockSummary.isLowStock && (
        <motion.div
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden border-2 border-red-300/40"
        >
          <div className="absolute right-0 top-0 -mt-8 -mr-8 w-48 h-48 bg-white/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-5 relative z-10">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-2xl bg-white text-red-600 flex items-center justify-center shrink-0 shadow-lg animate-pulse">
                <AlertTriangle size={32} />
              </div>
              <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 bg-black/20 rounded-full text-[10px] font-black uppercase tracking-wider text-amber-200">
                  ⚠️ ALERTA DE ESTOQUE DE FRALDAS EM NÍVEL CRÍTICO
                </div>
                <h3 className="text-xl font-black">
                  Saldo de Estoque Baixo: Apenas {stockSummary.saldoAtualUnidades} fraldas ({stockSummary.saldoAtualPacotes} pacotes)
                </h3>
                <p className="text-xs text-rose-100 max-w-2xl">
                  Com a demanda atual de <strong>{totals.dailyDiapers} fraldas/dia</strong>, a autonomia estimada é de apenas <strong className="underline text-white font-black">{stockSummary.daysOfAutonomy} dias</strong>. Recomenda-se providenciar novas entradas ou lote de produção urgente.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 shrink-0">
              <button
                onClick={() => setIsStockModalOpen(true)}
                className="px-4 py-2.5 bg-white text-red-700 hover:bg-red-50 rounded-xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center gap-2"
              >
                <PlusCircle size={16} /> Reabastecer Estoque
              </button>
            </div>
          </div>
        </motion.div>
      )}

      {/* SEÇÃO PRINCIPAL DE INTEGRAÇÃO COM ESTOQUE (ENTRADA, SAÍDA, SALDO ATUAL, ALERTA) */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
          <div>
            <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest block">Painel Integrado</span>
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Box className="text-emerald-600" size={20} />
              Controle Geral de Estoque de Fraldas Geriátricas
            </h3>
          </div>

          <button
            onClick={() => setIsStockModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900 rounded-xl text-xs font-bold transition-all border border-emerald-200 dark:border-emerald-800"
          >
            <PackagePlus size={16} />
            + Nova Entrada de Estoque
          </button>
        </div>

        {/* Grid de 4 Pilares do Estoque */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Pilar 1: ENTRADA */}
          <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-5 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 relative overflow-hidden space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider block">1. Entrada Total</span>
                <h4 className="text-2xl font-black text-emerald-900 dark:text-emerald-100 mt-1">
                  {stockSummary.totalEntradas.toLocaleString('pt-BR')} <span className="text-xs font-medium text-emerald-600">un</span>
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ArrowUpRight size={22} />
              </div>
            </div>

            <div className="space-y-1 text-xs text-emerald-800 dark:text-emerald-300 pt-2 border-t border-emerald-200/50 dark:border-emerald-900/40">
              <div className="flex justify-between">
                <span>Fábrica (Embalados):</span>
                <strong>{stockSummary.totalPackagedFromFactory} un</strong>
              </div>
              <div className="flex justify-between">
                <span>Entradas / Doações:</span>
                <strong>{stockSummary.totalManualStockEntries} un</strong>
              </div>
              <div className="flex justify-between font-bold pt-1 text-emerald-900 dark:text-emerald-200">
                <span>Pacotes de 14 un:</span>
                <span>{stockSummary.totalEntradasPacotes} pacotes</span>
              </div>
            </div>
          </div>

          {/* Pilar 2: SAÍDA (CONSUMO + DOAÇÕES) */}
          <div className="bg-rose-50/50 dark:bg-rose-950/20 p-5 rounded-2xl border border-rose-200/60 dark:border-rose-800/40 relative overflow-hidden space-y-3">
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-rose-700 dark:text-rose-400 uppercase tracking-wider block">2. Total de Saídas</span>
                <h4 className="text-2xl font-black text-rose-900 dark:text-rose-100 mt-1">
                  {stockSummary.totalSaidasGeral.toLocaleString('pt-BR')} <span className="text-xs font-medium text-rose-600">un</span>
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <ArrowDownRight size={22} />
              </div>
            </div>

            <div className="space-y-1 text-xs text-rose-800 dark:text-rose-300 pt-2 border-t border-rose-200/50 dark:border-rose-900/40">
              <div className="flex justify-between">
                <span>Consumo dos Idosos:</span>
                <strong>{stockSummary.totalSaidasConsumo} un</strong>
              </div>
              <div className="flex justify-between">
                <span>Doações Entregues:</span>
                <strong>{stockSummary.totalDonationsGiven} un</strong>
              </div>
              <div className="flex justify-between">
                <span>Demanda Diária Atual:</span>
                <strong>{totals.dailyDiapers} un/dia</strong>
              </div>
              <div className="flex justify-between font-bold pt-1 text-rose-900 dark:text-rose-200">
                <span>Pacotes Baixados:</span>
                <span>~ {stockSummary.totalSaidasPacotes} pacotes</span>
              </div>
            </div>
          </div>

          {/* Pilar 3: SALDO ATUAL */}
          <div className={cn(
            "p-5 rounded-2xl border relative overflow-hidden space-y-3 transition-colors",
            stockSummary.isLowStock 
              ? "bg-amber-50/70 dark:bg-amber-950/30 border-amber-300 dark:border-amber-800"
              : "bg-blue-50/50 dark:bg-blue-950/20 border-blue-200/60 dark:border-blue-800/40"
          )}>
            <div className="flex justify-between items-start">
              <div>
                <span className="text-[10px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wider block">3. Saldo Atual em Estoque</span>
                <h4 className="text-2xl font-black text-blue-900 dark:text-blue-100 mt-1">
                  {stockSummary.saldoAtualUnidades.toLocaleString('pt-BR')} <span className="text-xs font-medium text-blue-600">un</span>
                </h4>
              </div>
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <Package size={22} />
              </div>
            </div>

            <div className="space-y-1 text-xs text-blue-800 dark:text-blue-300 pt-2 border-t border-blue-200/50 dark:border-blue-900/40">
              <div className="flex justify-between">
                <span>Pacotes Fechados:</span>
                <strong>{stockSummary.saldoAtualPacotes} pacotes</strong>
              </div>
              <div className="flex justify-between">
                <span>Autonomia Estimada:</span>
                <strong className={cn(stockSummary.isLowStock ? "text-red-600 font-black" : "text-emerald-600")}>
                  ~ {stockSummary.daysOfAutonomy} dias
                </strong>
              </div>
              <div className="flex justify-between font-bold pt-1 text-blue-900 dark:text-blue-200">
                <span>Meta Mensal (30d):</span>
                <span>{totals.monthlyDiapers} un</span>
              </div>
            </div>
          </div>

          {/* Pilar 4: ALERTA DE ESTOQUE BAIXO */}
          <div className={cn(
            "p-5 rounded-2xl border relative overflow-hidden space-y-3 flex flex-col justify-between",
            stockSummary.isLowStock 
              ? "bg-red-500 text-white border-red-600 shadow-md" 
              : "bg-emerald-600 text-white border-emerald-700 shadow-md"
          )}>
            <div>
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider opacity-90">4. Status do Estoque</span>
                {stockSummary.isLowStock ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
              </div>
              <h4 className="text-lg font-black tracking-tight">
                {stockSummary.isLowStock ? "ALERTA DE ESTOQUE BAIXO" : "ESTOQUE REGULAR"}
              </h4>
              <p className="text-xs opacity-90 mt-1 leading-tight">
                {stockSummary.isLowStock 
                  ? `Estoque abaixo da margem de segurança (${stockSummary.safetyThresholdUnidades} un). Providencie reposição.` 
                  : `Estoque suficiente para aproximadamente ${stockSummary.daysOfAutonomy} dias de uso.`
                }
              </p>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setIsStockModalOpen(true)}
                className="w-full py-2 bg-white text-gray-900 hover:bg-gray-100 rounded-xl text-xs font-black transition-all shadow-xs flex items-center justify-center gap-1.5"
              >
                <PlusCircle size={14} />
                {stockSummary.isLowStock ? "Reabastecer Agora" : "Adicionar Entrada"}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* TABS DE NAVEGAÇÃO INTERNA DO MÓDULO */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-gray-100 dark:bg-gray-800/80 p-1.5 rounded-2xl">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveSection('GRID')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'GRID'
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <Heart size={16} />
            Fraldas por Idoso e Seleção de Data
          </button>
          <button
            onClick={() => setActiveSection('HISTORY')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'HISTORY'
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <History size={16} />
            Histórico de Lançamentos ({dailyLogs.length})
          </button>
          <button
            onClick={() => setActiveSection('STOCK')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2",
              activeSection === 'STOCK'
                ? "bg-white dark:bg-gray-900 text-emerald-600 dark:text-emerald-400 shadow-xs"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white"
            )}
          >
            <BarChart3 size={16} />
            Gráficos e Projeções
          </button>
        </div>

        <div className="text-xs font-bold text-gray-500 dark:text-gray-400 px-3">
          Demanda Atual: <span className="text-emerald-600 dark:text-emerald-400 font-black">{totals.dailyDiapers} fraldas/dia</span>
        </div>
      </div>

      {/* SEÇÃO 1: CONFIGURAÇÃO DE FRALDAS POR IDOSO E SELEÇÃO DE DATA */}
      {activeSection === 'GRID' && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-5">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Heart className="text-red-500" size={20} />
                Lançamento Diário de Fraldas por Idoso
              </h3>
              <p className="text-xs text-gray-500">
                Selecione o dia específico e informe a quantidade de fraldas consumidas. O lançamento dará saída automática no estoque.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              {/* Campo de Busca */}
              <div className="relative flex-1 sm:w-64">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar idoso por nome..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                />
              </div>

              {/* Filtro Usam Fralda */}
              <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setFilterUsage('ALL')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all", filterUsage === 'ALL' ? "bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
                >
                  Todos ({elderlyConsumptionData.length})
                </button>
                <button
                  onClick={() => setFilterUsage('USERS')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all flex items-center gap-1", filterUsage === 'USERS' ? "bg-white dark:bg-gray-700 text-emerald-600 dark:text-emerald-400 shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
                >
                  <UserCheck size={14} /> Usam ({totals.usersCount})
                </button>
                <button
                  onClick={() => setFilterUsage('NON_USERS')}
                  className={cn("px-3 py-1.5 rounded-lg transition-all flex items-center gap-1", filterUsage === 'NON_USERS' ? "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 shadow-xs" : "text-gray-500 hover:text-gray-900 dark:hover:text-white")}
                >
                  <UserX size={14} /> Não Usam ({totals.nonUsersCount})
                </button>
              </div>
            </div>
          </div>

          {/* Barra de Aplicador Rápido de Datas Anteriores em Lote */}
          <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/60 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-3">
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs font-black text-emerald-900 dark:text-emerald-200">
                <Calendar size={15} className="text-emerald-600 dark:text-emerald-400" />
                <span>Aplicar Data de Lançamento para Todos (Datas Anteriores / Retroativas):</span>
              </div>
              <p className="text-[11px] text-emerald-700 dark:text-emerald-300">
                Selecione uma data específica para aplicar automaticamente a todos os idosos exibidos abaixo.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto">
              <button
                type="button"
                onClick={() => applyGlobalDate(getTodayString())}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold transition-all shadow-xs"
              >
                Hoje ({formatDateBR(getTodayString())})
              </button>
              <button
                type="button"
                onClick={() => applyGlobalDate(getYesterdayString())}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold transition-all shadow-xs"
              >
                Ontem ({formatDateBR(getYesterdayString())})
              </button>
              <button
                type="button"
                onClick={() => applyGlobalDate(getDaysAgoString(2))}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold transition-all shadow-xs"
              >
                Anteontem ({formatDateBR(getDaysAgoString(2))})
              </button>
              <button
                type="button"
                onClick={() => applyGlobalDate(getDaysAgoString(3))}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold transition-all shadow-xs"
              >
                Há 3 dias
              </button>
              <button
                type="button"
                onClick={() => applyGlobalDate(getDaysAgoString(7))}
                className="px-2.5 py-1 bg-white dark:bg-gray-900 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 rounded-xl text-[11px] font-bold transition-all shadow-xs"
              >
                Há 7 dias
              </button>
            </div>
          </div>

          {/* Grid de Cards dos Idosos */}
          {filteredElderly.length === 0 ? (
            <div className="text-center py-12 space-y-3">
              <Users size={40} className="mx-auto text-gray-300 dark:text-gray-600" />
              <p className="text-sm font-semibold text-gray-500">Nenhum idoso encontrado para os filtros selecionados.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {filteredElderly.map((item) => {
                const { elderly: e, usesDiapers, diapersPerDay, monthly, monthlyPacks, notes, lastLoggedDate, logsCount, savedRecord } = item;
                
                // Controlled local date & quantity for this card
                const currentDateInput = selectedDates[e.id] || getTodayString();
                const currentQtyInput = selectedQuantities[e.id] ?? diapersPerDay;

                return (
                  <div 
                    key={e.id}
                    className={cn(
                      "p-5 rounded-3xl border transition-all space-y-4 flex flex-col justify-between relative shadow-xs",
                      usesDiapers 
                        ? "bg-white dark:bg-gray-900 border-emerald-200 dark:border-emerald-800/60 hover:border-emerald-400" 
                        : "bg-gray-50/60 dark:bg-gray-800/30 border-gray-200 dark:border-gray-800 opacity-80"
                    )}
                  >
                    <div className="space-y-3">
                      {/* Cabeçalho do Card */}
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center text-sm font-black overflow-hidden shrink-0 border border-emerald-200/50">
                            {e.photoUrl ? (
                              <img src={e.photoUrl} alt={e.name} className="w-full h-full object-cover" />
                            ) : (
                              e.name.substring(0, 2).toUpperCase()
                            )}
                          </div>
                          <div>
                            <h4 className="text-sm font-bold text-gray-900 dark:text-white line-clamp-1">
                              {e.name}
                            </h4>
                            <span className={cn(
                              "text-[10px] font-bold px-2 py-0.5 rounded-md inline-block mt-0.5",
                              e.status === 'INATIVO' 
                                ? "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300"
                                : "bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"
                            )}>
                              {e.status === 'INATIVO' ? 'Inativo' : 'Institucionalizado'}
                            </span>
                          </div>
                        </div>

                        {/* Botão de Toggle de Uso (Sim / Não) */}
                        <div className="flex items-center gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-xl shrink-0">
                          <button
                            type="button"
                            onClick={() => {
                              handleRegisterDailyConsumption(e.id, e.name, true, currentQtyInput > 0 ? currentQtyInput : 4, currentDateInput, notes);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1",
                              usesDiapers 
                                ? "bg-emerald-600 text-white shadow-xs" 
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <UserCheck size={12} /> Sim
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              handleRegisterDailyConsumption(e.id, e.name, false, 0, currentDateInput, notes);
                            }}
                            className={cn(
                              "px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1",
                              !usesDiapers 
                                ? "bg-red-600 text-white shadow-xs" 
                                : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
                            )}
                          >
                            <UserX size={12} /> Não
                          </button>
                        </div>
                      </div>

                      {/* Controles e Seleção da Data de Uso */}
                      {usesDiapers ? (
                        <div className="bg-emerald-50/60 dark:bg-emerald-950/30 p-3.5 rounded-2xl border border-emerald-100 dark:border-emerald-800/40 space-y-3">
                          
                          {/* Seletor do Dia do Consumo com Atalhos de Datas Anteriores */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center">
                              <label className="text-[11px] font-bold text-gray-700 dark:text-gray-300 flex items-center gap-1.5">
                                <Calendar size={13} className="text-emerald-600" />
                                Dia do Consumo:
                              </label>
                              {currentDateInput < getTodayString() && (
                                <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-0.5">
                                  <Clock size={10} /> Retroativo
                                </span>
                              )}
                            </div>

                            {/* Atalhos para datas passadas */}
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setSelectedDates(prev => ({ ...prev, [e.id]: getTodayString() }))}
                                className={cn(
                                  "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                                  currentDateInput === getTodayString()
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-emerald-50"
                                )}
                              >
                                Hoje
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDates(prev => ({ ...prev, [e.id]: getYesterdayString() }))}
                                className={cn(
                                  "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                                  currentDateInput === getYesterdayString()
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-emerald-50"
                                )}
                              >
                                Ontem
                              </button>
                              <button
                                type="button"
                                onClick={() => setSelectedDates(prev => ({ ...prev, [e.id]: getDaysAgoString(2) }))}
                                className={cn(
                                  "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                                  currentDateInput === getDaysAgoString(2)
                                    ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                                    : "bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-emerald-50"
                                )}
                              >
                                Anteontem
                              </button>
                            </div>

                            {/* Input tipo data para qualquer dia anterior */}
                            <input
                              type="date"
                              value={currentDateInput}
                              onChange={evt => {
                                const val = evt.target.value;
                                setSelectedDates(prev => ({ ...prev, [e.id]: val }));
                              }}
                              className="w-full px-3 py-1.5 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                            />
                          </div>

                          {/* Ajuste do Total de Fraldas Utilizadas no Dia */}
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-xs font-bold text-gray-700 dark:text-gray-300">Total de Fraldas Usadas:</span>
                            <div className="flex items-center gap-1.5 bg-white dark:bg-gray-900 border border-emerald-200 dark:border-emerald-800 rounded-xl p-1 shadow-xs">
                              <button
                                onClick={() => handleQuickAdjust(e.id, usesDiapers, currentQtyInput, -1)}
                                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-100 flex items-center justify-center transition-colors font-bold"
                              >
                                <Minus size={14} />
                              </button>
                              <span className="w-8 text-center text-sm font-black text-emerald-600 dark:text-emerald-400">
                                {currentQtyInput}
                              </span>
                              <button
                                onClick={() => handleQuickAdjust(e.id, usesDiapers, currentQtyInput, 1)}
                                className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-emerald-100 flex items-center justify-center transition-colors font-bold"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Botão de Lançar Consumo para a Data */}
                          <button
                            type="button"
                            onClick={() => handleRegisterDailyConsumption(e.id, e.name, usesDiapers, currentQtyInput, currentDateInput, notes)}
                            className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black shadow-xs transition-all active:scale-95 flex items-center justify-center gap-1.5"
                          >
                            <CheckCircle2 size={14} />
                            Registrar Consumo ({currentDateInput.split('-').reverse().join('/')})
                          </button>

                          {/* Informações Resumidas do Idoso (Exibidas apenas após registrar/completar com dados reais) */}
                          {(logsCount > 0 || (savedRecord && typeof savedRecord.diapersPerDay === 'number' && savedRecord.diapersPerDay > 0)) && monthly > 0 && (
                            <div className="grid grid-cols-2 gap-2 text-center pt-2 border-t border-emerald-100 dark:border-emerald-900/40 text-[11px]">
                              <div>
                                <span className="text-gray-400 block text-[9px] uppercase font-bold">Consumo Mensal</span>
                                <strong className="text-gray-800 dark:text-gray-200 font-bold">{monthly} fraldas</strong>
                              </div>
                              <div>
                                <span className="text-gray-400 block text-[9px] uppercase font-bold">Pacotes/Mês</span>
                                <strong className="text-emerald-600 dark:text-emerald-400 font-bold">{monthlyPacks} pacotes</strong>
                              </div>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="p-4 bg-gray-100/70 dark:bg-gray-800/50 rounded-2xl text-center text-xs text-gray-400 italic">
                          Idoso não faz uso diário de fraldas geriátricas.
                        </div>
                      )}

                      {/* Observações e Última Data Lançada */}
                      {lastLoggedDate && (
                        <div className="text-[10px] text-gray-500 font-bold flex items-center gap-1 bg-gray-50 dark:bg-gray-800/60 p-2 rounded-xl">
                          <Clock size={12} className="text-emerald-600" />
                          Último Lançamento: {lastLoggedDate.split('-').reverse().join('/')}
                        </div>
                      )}
                      {notes && (
                        <p className="text-xs text-gray-500 italic bg-gray-50 dark:bg-gray-800/80 p-2 rounded-xl line-clamp-2">
                          "{notes}"
                        </p>
                      )}
                    </div>

                    {/* Botão de Edição Detalhada */}
                    <div className="pt-2 border-t border-gray-100 dark:border-gray-800/80 flex justify-end">
                      <button
                        onClick={() => setEditingUsage({
                          elderlyId: e.id,
                          elderlyName: e.name,
                          usesDiapers,
                          diapersPerDay: currentQtyInput,
                          date: currentDateInput,
                          notes
                        })}
                        className="text-xs font-bold text-gray-500 hover:text-emerald-600 dark:text-gray-400 dark:hover:text-emerald-400 flex items-center gap-1 transition-colors"
                      >
                        <Edit3 size={14} /> Editar Detalhes
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 2: HISTÓRICO DE LANÇAMENTOS DE CONSUMO POR DATA */}
      {activeSection === 'HISTORY' && (
        <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-6">
          <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <History className="text-emerald-600" size={20} />
                Histórico de Lançamentos Diários de Consumo
              </h3>
              <p className="text-xs text-gray-500">
                Registro detalhado de saídas de fraldas associadas a cada idoso por data escolhida.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-gray-500">Filtrar Data:</span>
                <input
                  type="date"
                  value={historyDateFilter}
                  onChange={e => setHistoryDateFilter(e.target.value)}
                  className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                />
                {historyDateFilter && (
                  <button onClick={() => setHistoryDateFilter('')} className="text-xs text-red-500 font-bold">
                    Limpar
                  </button>
                )}
              </div>

              <input
                type="text"
                placeholder="Buscar por idoso..."
                value={historyElderlyFilter}
                onChange={e => setHistoryElderlyFilter(e.target.value)}
                className="px-3 py-1.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
              />
            </div>
          </div>

          {filteredDailyLogs.length === 0 ? (
            <div className="text-center py-12 space-y-3 text-gray-400">
              <History size={36} className="mx-auto text-gray-300" />
              <p className="text-sm font-semibold">Nenhum lançamento de consumo encontrado no histórico.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Data do Consumo</th>
                    <th className="py-3 px-4">Idoso Institucionalizado</th>
                    <th className="py-3 px-4">Quantidade Usada</th>
                    <th className="py-3 px-4">Equiv. Pacotes</th>
                    <th className="py-3 px-4">Registrado Por</th>
                    <th className="py-3 px-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  {filteredDailyLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                      <td className="py-3.5 px-4 font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-2">
                        <Calendar size={14} />
                        {log.date ? log.date.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white">
                        {log.elderlyName}
                      </td>
                      <td className="py-3.5 px-4 font-black text-rose-600 dark:text-rose-400">
                        {log.quantity} fraldas
                      </td>
                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400">
                        {(log.quantity / DIAPERS_PER_PACKAGE).toFixed(2)} pacotes
                      </td>
                      <td className="py-3.5 px-4 text-xs text-gray-500">
                        {log.createdBy || 'Sistema'}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <button
                          onClick={() => handleDeleteLog(log.id)}
                          className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-lg transition-colors"
                          title="Excluir Lançamento"
                        >
                          <Trash2 size={14} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* SEÇÃO 3: GRÁFICOS E PROJEÇÕES DE ESTOQUE */}
      {activeSection === 'STOCK' && (
        <div className="space-y-6">
          {/* Tabela de Projeções Detalhadas */}
          <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 p-6 shadow-sm space-y-6">
            <div>
              <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
                <TableIcon className="text-green-600" size={20} />
                Projeção Detalhada por Período de Consumo
              </h3>
              <p className="text-xs text-gray-500">
                Estimativas baseadas na demanda diária de {totals.dailyDiapers} fraldas/dia para os {totals.usersCount} idosos atendidos.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-gray-800 text-gray-400 text-[11px] font-bold uppercase tracking-wider">
                    <th className="py-3 px-4">Período</th>
                    <th className="py-3 px-4">Dias</th>
                    <th className="py-3 px-4">Demanda Fraldas</th>
                    <th className="py-3 px-4">Pacotes Fechados</th>
                    <th className="py-3 px-4">Média / Idoso</th>
                    <th className="py-3 px-4">Produção Recomendada</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 font-medium">
                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Diário (1d)
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">1 dia</td>
                    <td className="py-3.5 px-4 font-black text-emerald-600">{totals.dailyDiapers} un</td>
                    <td className="py-3.5 px-4 font-bold">{totals.dailyPacksCeil} pacotes</td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {totals.usersCount > 0 ? (totals.dailyDiapers / totals.usersCount).toFixed(1) : 0} un
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300 rounded-lg text-xs font-bold">
                        {totals.dailyPacksCeil} pac/dia
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-teal-500" /> Semanal (7d)
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">7 dias</td>
                    <td className="py-3.5 px-4 font-black text-teal-600">{totals.weeklyDiapers.toLocaleString('pt-BR')} un</td>
                    <td className="py-3.5 px-4 font-bold">{totals.weeklyPacksCeil} pacotes</td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {totals.usersCount > 0 ? ((totals.dailyDiapers * 7) / totals.usersCount).toFixed(0) : 0} un
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-teal-50 text-teal-700 dark:bg-teal-950 dark:text-teal-300 rounded-lg text-xs font-bold">
                        {totals.weeklyPacksCeil} pac/semana
                      </span>
                    </td>
                  </tr>

                  <tr className="hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                    <td className="py-3.5 px-4 font-bold text-gray-900 dark:text-white flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-500" /> Mensal (30d)
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">30 dias</td>
                    <td className="py-3.5 px-4 font-black text-blue-600">{totals.monthlyDiapers.toLocaleString('pt-BR')} un</td>
                    <td className="py-3.5 px-4 font-bold">{totals.monthlyPacksCeil} pacotes</td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {totals.usersCount > 0 ? ((totals.dailyDiapers * 30) / totals.usersCount).toFixed(0) : 0} un
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="px-2.5 py-1 bg-blue-50 text-blue-700 dark:bg-blue-950 dark:text-blue-300 rounded-lg text-xs font-bold">
                        {totals.monthlyPacksCeil} pac/mês
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Gráficos em Visualização Dupla */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <BarChart3 className="text-emerald-600" size={18} />
                Projeção de Consumo por Período
              </h4>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={periodChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="period" tick={{ fontSize: 11 }} />
                    <YAxis yAxisId="left" orientation="left" stroke="#059669" tick={{ fontSize: 10 }} />
                    <YAxis yAxisId="right" orientation="right" stroke="#6366F1" tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="fraldas" name="Total Fraldas" fill="#059669" radius={[6, 6, 0, 0]} />
                    <Bar yAxisId="right" dataKey="pacotes" name="Pacotes (14 un)" fill="#6366F1" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-4">
              <h4 className="text-base font-black text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="text-teal-600" size={18} />
                Maiores Consumidores Diários
              </h4>
              {topConsumersChartData.length > 0 ? (
                <div className="h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart layout="vertical" data={topConsumersChartData} margin={{ top: 5, right: 20, left: 30, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E5E7EB" />
                      <XAxis type="number" tick={{ fontSize: 10 }} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
                      <Tooltip formatter={(val: any) => [`${val} fraldas / dia`, 'Consumo Diário']} />
                      <Bar dataKey="diario" fill="#0D9488" radius={[0, 6, 6, 0]}>
                        {topConsumersChartData.map((_, idx) => (
                          <Cell key={idx} fill={['#059669', '#0D9488', '#2563EB', '#4F46E5', '#7C3AED', '#DB2777'][idx % 6]} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-64 flex items-center justify-center text-gray-400 text-xs">
                  Nenhum idoso configurado.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL 1: LANÇAR ENTRADA DE ESTOQUE (DOAÇÃO / PRODUÇÃO / COMPRA) */}
      <AnimatePresence>
        {isStockModalOpen && (
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen" onClick={() => setIsStockModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md my-auto border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-20 shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest">Integração de Estoque</span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    Registrar Entrada de Fraldas
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsStockModalOpen(false)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-950/50 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors flex items-center justify-center shrink-0 border border-transparent hover:border-red-200"
                  title="Fechar Janela"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                <form onSubmit={handleSaveStockEntry} className="space-y-4">
                  {/* Data da Entrada */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Data da Entrada:</label>
                    <input
                      type="date"
                      required
                      value={stockForm.date}
                      onChange={e => setStockForm(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                    />
                  </div>

                  {/* Origem da Entrada */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Origem / Motivo da Entrada:</label>
                    <select
                      value={stockForm.origin}
                      onChange={e => setStockForm(prev => ({ ...prev, origin: e.target.value as any }))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                    >
                      <option value="DOACAO">Doação Recebida (Externa)</option>
                      <option value="PRODUCAO_EXTRA">Lote de Produção Extra</option>
                      <option value="COMPRA">Aquisição / Compra Institucional</option>
                      <option value="AJUSTE_INVENTARIO">Ajuste de Inventário / Saldo Inicial</option>
                    </select>
                  </div>

                  {/* Tipo de Unidade e Quantidade */}
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Quantidade Recebida:</label>
                      <div className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-lg text-[10px] font-bold">
                        <button
                          type="button"
                          onClick={() => setStockForm(prev => ({ ...prev, unitType: 'PACOTES' }))}
                          className={cn("px-2.5 py-1 rounded-md transition-all", stockForm.unitType === 'PACOTES' ? "bg-emerald-600 text-white" : "text-gray-500")}
                        >
                          Pacotes (14 un)
                        </button>
                        <button
                          type="button"
                          onClick={() => setStockForm(prev => ({ ...prev, unitType: 'UNIDADES' }))}
                          className={cn("px-2.5 py-1 rounded-md transition-all", stockForm.unitType === 'UNIDADES' ? "bg-emerald-600 text-white" : "text-gray-500")}
                        >
                          Unidades
                        </button>
                      </div>
                    </div>

                    <input
                      type="number"
                      min="1"
                      required
                      value={stockForm.quantity}
                      onChange={e => setStockForm(prev => ({ ...prev, quantity: parseInt(e.target.value) || 0 }))}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-black text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                    />

                    <p className="text-[11px] text-gray-400 italic">
                      {stockForm.unitType === 'PACOTES' 
                        ? `Equivale a ${(stockForm.quantity * DIAPERS_PER_PACKAGE)} fraldas individuais adicionadas ao saldo.`
                        : `Equivale a ~${Math.floor(stockForm.quantity / DIAPERS_PER_PACKAGE)} pacotes completos de 14 un.`
                      }
                    </p>
                  </div>

                  {/* Observações */}
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Observações / Detalhes:</label>
                    <textarea
                      rows={2}
                      placeholder="Ex: Doação entregue pela comunidade, nota fiscal #102..."
                      value={stockForm.notes}
                      onChange={e => setStockForm(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                    />
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button
                      type="button"
                      onClick={() => setIsStockModalOpen(false)}
                      className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                    >
                      Salvar Entrada
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 2: EDITAR DETALHES DE CONSUMO DO IDOSO */}
      <AnimatePresence>
        {editingUsage && (
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen" onClick={() => setEditingUsage(null)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md my-auto border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-20 shrink-0">
                <div>
                  <span className="text-[10px] font-bold text-green-600 uppercase tracking-widest">Configuração do Idoso</span>
                  <h3 className="text-lg font-black text-gray-900 dark:text-white">
                    {editingUsage.elderlyName}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingUsage(null)}
                  className="p-2 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-950/50 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors flex items-center justify-center shrink-0 border border-transparent hover:border-red-200"
                  title="Fechar Janela"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-4 sm:p-6 overflow-y-auto space-y-4 flex-1">
                {/* Switch Usa Fraldas */}
                <div className="flex flex-col space-y-2 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200">O idoso usa fralda?</span>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingUsage(prev => prev ? { ...prev, usesDiapers: true, diapersPerDay: prev.diapersPerDay > 0 ? prev.diapersPerDay : 4 } : null)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border",
                        editingUsage.usesDiapers ? "bg-emerald-600 text-white border-emerald-600" : "bg-white dark:bg-gray-900 text-gray-600 border-gray-200"
                      )}
                    >
                      <UserCheck size={14} /> Sim (Usa Fralda)
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUsage(prev => prev ? { ...prev, usesDiapers: false, diapersPerDay: 0 } : null)}
                      className={cn(
                        "flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 border",
                        !editingUsage.usesDiapers ? "bg-red-600 text-white border-red-600" : "bg-white dark:bg-gray-900 text-gray-600 border-gray-200"
                      )}
                    >
                      <UserX size={14} /> Não Usa
                    </button>
                  </div>
                </div>

                {/* Seleção do Dia do Consumo com Atalhos de Datas Anteriores */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Data de Uso do Consumo:</label>
                    {editingUsage.date && editingUsage.date < getTodayString() && (
                      <span className="px-1.5 py-0.5 bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 rounded-md text-[9px] font-black uppercase tracking-wider inline-flex items-center gap-0.5">
                        <Clock size={10} /> Data Retroativa
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setEditingUsage(prev => prev ? { ...prev, date: getTodayString() } : null)}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                        editingUsage.date === getTodayString() ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      Hoje
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUsage(prev => prev ? { ...prev, date: getYesterdayString() } : null)}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                        editingUsage.date === getYesterdayString() ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      Ontem
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUsage(prev => prev ? { ...prev, date: getDaysAgoString(2) } : null)}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                        editingUsage.date === getDaysAgoString(2) ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      Anteontem
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingUsage(prev => prev ? { ...prev, date: getDaysAgoString(7) } : null)}
                      className={cn(
                        "flex-1 py-1 rounded-lg text-[10px] font-bold border transition-all text-center",
                        editingUsage.date === getDaysAgoString(7) ? "bg-emerald-600 text-white border-emerald-600" : "bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                      )}
                    >
                      Há 7d
                    </button>
                  </div>

                  <input
                    type="date"
                    value={editingUsage.date || getTodayString()}
                    onChange={e => setEditingUsage(prev => prev ? { ...prev, date: e.target.value } : null)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                  />
                </div>

                {/* Fraldas Consumidas no Dia */}
                {editingUsage.usesDiapers && (
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Fraldas Consumidas no Dia:</label>
                    <input
                      type="number"
                      min="1"
                      max="20"
                      value={editingUsage.diapersPerDay}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 0;
                        setEditingUsage(prev => prev ? { ...prev, diapersPerDay: val } : null);
                      }}
                      className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-green-500"
                    />
                  </div>
                )}

                {/* Observações */}
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Observações:</label>
                  <textarea
                    rows={2}
                    placeholder="Reforço noturno, trocas de medicação..."
                    value={editingUsage.notes}
                    onChange={e => setEditingUsage(prev => prev ? { ...prev, notes: e.target.value } : null)}
                    className="w-full px-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs text-gray-800 dark:text-white"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUsage(null)}
                    className="flex-1 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 rounded-xl text-xs font-bold"
                  >
                    Cancelar
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      handleRegisterDailyConsumption(
                        editingUsage.elderlyId,
                        editingUsage.elderlyName,
                        editingUsage.usesDiapers,
                        editingUsage.diapersPerDay,
                        editingUsage.date,
                        editingUsage.notes
                      );
                      setEditingUsage(null);
                    }}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95"
                  >
                    Salvar Lançamento
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* MODAL 3: GERAR RELATÓRIO INSTITUCIONAL DE CONSUMO POR PERÍODO (DIÁRIO, MENSAL, SEMESTRAL, ANUAL) */}
      <AnimatePresence>
        {isReportModalOpen && (
          <div className="fixed inset-0 z-[70] overflow-y-auto bg-black/60 backdrop-blur-sm p-3 sm:p-6 flex items-center justify-center min-h-screen" onClick={() => setIsReportModalOpen(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.98, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.98, y: 10 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-xl my-auto border border-gray-100 dark:border-gray-800 overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              {/* Header Fixo/Sticky no Topo */}
              <div className="p-4 sm:p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-start bg-white dark:bg-gray-900 sticky top-0 z-20 shrink-0">
                <div className="pr-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-wider mb-1">
                    <ShieldCheck size={12} /> Relatório Oficial OAMI
                  </div>
                  <h3 className="text-lg sm:text-xl font-black text-gray-900 dark:text-white flex items-center gap-2">
                    <FileText className="text-emerald-600 shrink-0" size={22} />
                    Relatório de Consumo de Fraldas
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Escolha o período e o formato para baixar o relatório institucional.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="p-2.5 rounded-full bg-gray-100 dark:bg-gray-800 hover:bg-red-100 dark:hover:bg-red-950/50 text-gray-600 hover:text-red-600 dark:text-gray-300 dark:hover:text-red-400 transition-colors flex items-center justify-center shrink-0 border border-transparent hover:border-red-200"
                  title="Fechar Janela"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Corpo de Conteúdo Rolável */}
              <div className="p-4 sm:p-6 overflow-y-auto space-y-5 flex-1">
                {/* Seleção do Período */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    1. Selecione a Visão Temporal do Relatório:
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <button
                      type="button"
                      onClick={() => setReportPeriod('DIARIO')}
                      className={cn(
                        "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                        reportPeriod === 'DIARIO'
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md font-black"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-bold"
                      )}
                    >
                      <Calendar size={18} />
                      <span className="text-xs">Diário</span>
                      <span className="text-[9px] opacity-80">(1 Dia)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportPeriod('MENSAL')}
                      className={cn(
                        "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                        reportPeriod === 'MENSAL'
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md font-black"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-bold"
                      )}
                    >
                      <Box size={18} />
                      <span className="text-xs">Mensal</span>
                      <span className="text-[9px] opacity-80">(30 Dias)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportPeriod('SEMESTRAL')}
                      className={cn(
                        "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                        reportPeriod === 'SEMESTRAL'
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md font-black"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-bold"
                      )}
                    >
                      <BarChart3 size={18} />
                      <span className="text-xs">Semestral</span>
                      <span className="text-[9px] opacity-80">(180 Dias)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setReportPeriod('ANUAL')}
                      className={cn(
                        "p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1",
                        reportPeriod === 'ANUAL'
                          ? "bg-emerald-600 text-white border-emerald-600 shadow-md font-black"
                          : "bg-gray-50 dark:bg-gray-800/60 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100 font-bold"
                      )}
                    >
                      <TrendingUp size={18} />
                      <span className="text-xs">Anual</span>
                      <span className="text-[9px] opacity-80">(365 Dias)</span>
                    </button>
                  </div>
                </div>

                {/* Parâmetros do Período Selecionado */}
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                  <span className="text-[11px] font-black text-emerald-800 dark:text-emerald-300 uppercase tracking-wider block">
                    2. Parâmetros da Data / Referência:
                  </span>

                  {reportPeriod === 'DIARIO' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Data do Relatório:</label>
                      <input
                        type="date"
                        value={reportDate}
                        onChange={e => setReportDate(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {reportPeriod === 'MENSAL' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Mês / Ano de Referência:</label>
                      <input
                        type="month"
                        value={reportMonth}
                        onChange={e => setReportMonth(e.target.value)}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  )}

                  {reportPeriod === 'SEMESTRAL' && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Ano:</label>
                        <select
                          value={reportYear}
                          onChange={e => setReportYear(parseInt(e.target.value, 10))}
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                        >
                          <option value={2026}>2026</option>
                          <option value={2025}>2025</option>
                          <option value={2024}>2024</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Semestre:</label>
                        <select
                          value={reportSemester}
                          onChange={e => setReportSemester(e.target.value as '1' | '2')}
                          className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                        >
                          <option value="1">1º Semestre (Jan - Jun)</option>
                          <option value="2">2º Semestre (Jul - Dez)</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {reportPeriod === 'ANUAL' && (
                    <div className="space-y-1">
                      <label className="text-xs font-bold text-gray-700 dark:text-gray-300">Ano de Referência:</label>
                      <select
                        value={reportYear}
                        onChange={e => setReportYear(parseInt(e.target.value, 10))}
                        className="w-full px-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white"
                      >
                        <option value={2026}>2026</option>
                        <option value={2025}>2025</option>
                        <option value={2024}>2024</option>
                      </select>
                    </div>
                  )}

                  {/* Filtro de Público */}
                  <div className="pt-1">
                    <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block mb-1">
                      Filtro de Idosos no Relatório:
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      <button
                        type="button"
                        onClick={() => setReportUserFilter('USERS_ONLY')}
                        className={cn(
                          "py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center",
                          reportUserFilter === 'USERS_ONLY'
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        Apenas usam fraldas ({totals.usersCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportUserFilter('ALL_ACTIVE')}
                        className={cn(
                          "py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center",
                          reportUserFilter === 'ALL_ACTIVE'
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        Ativos ({totals.totalActive})
                      </button>
                      <button
                        type="button"
                        onClick={() => setReportUserFilter('ALL')}
                        className={cn(
                          "py-1.5 px-2 rounded-xl text-[11px] font-bold border transition-all text-center",
                          reportUserFilter === 'ALL'
                            ? "bg-emerald-600 text-white border-emerald-600"
                            : "bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700"
                        )}
                      >
                        Todos ({elderlyConsumptionData.length})
                      </button>
                    </div>
                  </div>
                </div>

                {/* Card de Prévia dos Totais */}
                <div className="p-3.5 bg-slate-900 text-white rounded-2xl flex items-center justify-between">
                  <div>
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Demanda do Período Escolhido</span>
                    <span className="text-lg font-black text-emerald-400">
                      {(totals.dailyDiapers * (reportPeriod === 'DIARIO' ? 1 : reportPeriod === 'MENSAL' ? 30 : reportPeriod === 'SEMESTRAL' ? 180 : 365)).toLocaleString('pt-BR')} fraldas
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-slate-400 font-bold uppercase block">Pacotes de 14 un</span>
                    <span className="text-sm font-black text-teal-300">
                      {Math.ceil((totals.dailyDiapers * (reportPeriod === 'DIARIO' ? 1 : reportPeriod === 'MENSAL' ? 30 : reportPeriod === 'SEMESTRAL' ? 180 : 365)) / DIAPERS_PER_PACKAGE).toLocaleString('pt-BR')} pacotes
                    </span>
                  </div>
                </div>

                {/* Botões de Download por Formato */}
                <div className="space-y-2 pt-1">
                  <label className="text-xs font-bold text-gray-700 dark:text-gray-300 block">
                    3. Baixar em Formato Oficial:
                  </label>
                  <div className="grid grid-cols-3 gap-2 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => handleGenerateReport('pdf')}
                      className="py-3 px-2 sm:px-3 bg-red-600 hover:bg-red-700 text-white rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <FileText size={16} /> PDF Oficial
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateReport('word')}
                      className="py-3 px-2 sm:px-3 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <FileDown size={16} /> Word (.docx)
                    </button>
                    <button
                      type="button"
                      onClick={() => handleGenerateReport('excel')}
                      className="py-3 px-2 sm:px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                    >
                      <TableIcon size={16} /> Excel (.xlsx)
                    </button>
                  </div>
                </div>

                {/* Botão para Fechar no Rodapé */}
                <div className="pt-2 border-t border-gray-100 dark:border-gray-800 flex justify-end">
                  <button
                    type="button"
                    onClick={() => setIsReportModalOpen(false)}
                    className="w-full sm:w-auto px-6 py-2.5 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-2xl text-xs transition-colors flex items-center justify-center gap-2"
                  >
                    <X size={16} /> Fechar
                  </button>
                </div>

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
