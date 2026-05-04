import React, { useState, useMemo, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Package, 
  Scissors, 
  Truck, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  User,
  Plus,
  Trash2,
  ChevronRight,
  Target,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Search,
  Filter,
  Activity,
  Loader2
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  LineChart, 
  Line, 
  AreaChart, 
  Area,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import { format, startOfMonth, endOfMonth, isWithinInterval, parseISO, subMonths, eachDayOfInterval } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn, safeReplace } from '../lib/utils';
import { 
  User as UserType, 
  DiaperRawProduction, 
  DiaperWIPProcessing, 
  DiaperFinalPacking, 
  DiaperProductionGoal 
} from '../types';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { generateModernExcel } from '../lib/excelUtils';
import { FileText, FileDown, Table as TableIcon } from 'lucide-react';

interface DiaperProductionSectionProps {
  user: UserType;
  rawProductions: DiaperRawProduction[];
  wipProcessings: DiaperWIPProcessing[];
  finalPackings: DiaperFinalPacking[];
  goals: DiaperProductionGoal[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type TabType = 'raw' | 'wip' | 'final' | 'dashboard';

export const DiaperProductionSection: React.FC<DiaperProductionSectionProps> = ({
  user,
  rawProductions,
  wipProcessings,
  finalPackings,
  goals,
  showToast
}) => {
  const [activeTab, setActiveTab] = useState<TabType>(() => {
    const saved = localStorage.getItem('oami-diaper-tab');
    return (saved as TabType) || 'dashboard';
  });
  useEffect(() => {
    localStorage.setItem('oami-diaper-tab', activeTab);
  }, [activeTab]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [exporting, setExporting] = useState(false);

  // Form States
  const [rawForm, setRawForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    quantity: '',
    operator: user.name,
    shift: 'MANHA' as DiaperRawProduction['shift'],
    observations: ''
  });

  const [wipForm, setWipForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    quantityIn: '',
    quantityOut: '',
    wasteReason: '',
    operator: user.name,
    observations: ''
  });

  const [finalForm, setFinalForm] = useState({
    date: format(new Date(), 'yyyy-MM-dd'),
    quantityPackaged: '',
    packageType: 'TAMANHO_UNICO' as DiaperFinalPacking['packageType'],
    operator: user.name,
    batchNumber: `BAT-${format(new Date(), 'yyyyMMdd')}`,
    observations: ''
  });

  const [goalForm, setGoalForm] = useState({
    month: format(new Date(), 'yyyy-MM'),
    targetQuantity: '',
    notes: ''
  });

  // Calculations for Dashboard
  const dashboardData = useMemo(() => {
    const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
    const monthEnd = endOfMonth(monthStart);

    const filteredRaw = rawProductions.filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }));
    const filteredWip = wipProcessings.filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }));
    const filteredFinal = finalPackings.filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }));
    const currentGoal = goals.find(g => g.month === selectedMonth);

    const totalRaw = filteredRaw.reduce((acc, p) => acc + p.quantity, 0);
    const totalWipIn = filteredWip.reduce((acc, p) => acc + p.quantityIn, 0);
    const totalWipOut = filteredWip.reduce((acc, p) => acc + p.quantityOut, 0);
    const totalFinal = filteredFinal.reduce((acc, p) => acc + p.quantityPackaged, 0);

    const wipLoss = totalWipIn - totalWipOut;
    const lossRate = totalWipIn > 0 ? (wipLoss / totalWipIn) * 100 : 0;
    const efficiency = totalRaw > 0 ? (totalFinal / totalRaw) * 100 : 0;
    
    // Daily breakdown for line chart
    const days = eachDayOfInterval({ start: monthStart, end: monthEnd });
    const dailyData = days.map(day => {
      const dStr = format(day, 'yyyy-MM-dd');
      const raw = filteredRaw.filter(p => p.date === dStr).reduce((acc, p) => acc + p.quantity, 0);
      const wip = filteredWip.filter(p => p.date === dStr).reduce((acc, p) => acc + p.quantityOut, 0);
      const final = filteredFinal.filter(p => p.date === dStr).reduce((acc, p) => acc + p.quantityPackaged, 0);
      return {
        name: format(day, 'dd/MM'),
        producaoBruta: raw,
        processamento: wip,
        embalagem: final
      };
    }).filter(d => d.producaoBruta > 0 || d.processamento > 0 || d.embalagem > 0);

    // Productivity by Package Type
    const packageTypes: Record<string, number> = {};
    filteredFinal.forEach(p => {
      packageTypes[p.packageType] = (packageTypes[p.packageType] || 0) + p.quantityPackaged;
    });
    const pieData = Object.entries(packageTypes).map(([name, value]) => ({ name, value }));

    return {
      totalRaw,
      totalWipOut,
      totalFinal,
      wipLoss,
      lossRate,
      efficiency,
      goal: currentGoal?.targetQuantity || 0,
      dailyData,
      pieData
    };
  }, [rawProductions, wipProcessings, finalPackings, goals, selectedMonth]);

  // Handlers
  const handleSaveRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...rawForm,
        quantity: parseInt(rawForm.quantity) || 0,
        createdAt: new Date().toISOString()
      };
      
      await addDoc(collection(db, 'diaperRawProductions'), payload);
      showToast('Produção bruta registrada com sucesso!');
      setIsModalOpen(false);
      setRawForm({ ...rawForm, quantity: '', observations: '' });
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar produção', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveWip = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const inVal = parseInt(wipForm.quantityIn) || 0;
      const outVal = parseInt(wipForm.quantityOut) || 0;

      const payload = {
        ...wipForm,
        quantityIn: inVal,
        quantityOut: outVal,
        wasteAmount: Math.max(0, inVal - outVal),
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'diaperWIPProcessings'), payload);
      showToast('Processamento WIP registrado com sucesso!');
      setIsModalOpen(false);
      setWipForm({ ...wipForm, quantityIn: '', quantityOut: '', wasteReason: '', observations: '' });
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar processamento', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...finalForm,
        quantityPackaged: parseInt(finalForm.quantityPackaged) || 0,
        createdAt: new Date().toISOString()
      };

      await addDoc(collection(db, 'diaperFinalPackings'), payload);
      showToast('Embalagem finalizada com sucesso!');
      setIsModalOpen(false);
      setFinalForm({ ...finalForm, quantityPackaged: '', observations: '', batchNumber: `BAT-${format(new Date(), 'yyyyMMdd')}` });
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar embalagem', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...goalForm,
        targetQuantity: parseInt(goalForm.targetQuantity) || 0,
        updatedAt: new Date().toISOString()
      };

      const existingGoal = goals.find(g => g.month === goalForm.month);
      if (existingGoal) {
        await updateDoc(doc(db, 'diaperProductionGoals', existingGoal.id), payload);
      } else {
        await addDoc(collection(db, 'diaperProductionGoals'), payload);
      }
      showToast('Meta mensal atualizada!');
      setIsModalOpen(false);
    } catch (err: any) {
      showToast('Erro ao salvar meta', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type: 'pdf' | 'word' | 'excel') => {
    setExporting(true);
    try {
      const monthStart = startOfMonth(parseISO(`${selectedMonth}-01`));
      const monthEnd = endOfMonth(monthStart);
      const monthLabel = format(monthStart, 'MMMM yyyy', { locale: ptBR });

      // Prepare data for the reports - Final Packings is usually what's delivered
      const data = finalPackings
        .filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }))
        .sort((a, b) => b.date.localeCompare(a.date))
        .map(p => [
          format(parseISO(p.date), 'dd/MM/yyyy'),
          p.batchNumber,
          safeReplace(p.packageType, '_', ' '),
          p.quantityPackaged,
          p.operator
        ]);

      const columns = ['Data', 'Lote', 'Tipo', 'Qtd', 'Operador'];
      const title = `Relatório de Produção - ${monthLabel}`;
      const fileName = `producao_fraldas_${selectedMonth}`;

      if (type === 'pdf') {
        await generateModernPDF({ title, columns, data, fileName, subtitle: `Resumo Mensal de Produção Finalizada` });
      } else if (type === 'word') {
        await generateModernWord({ title, columns, data, fileName, subtitle: `Resumo Mensal de Produção Finalizada` });
      } else if (type === 'excel') {
        generateModernExcel({ title, columns, data, fileName });
      }
      
      showToast(`Relatório exportado com sucesso (${type.toUpperCase()})!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar relatório', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleDeleteRecord = async (id: string, coll: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este registro?')) return;
    try {
      await deleteDoc(doc(db, coll, id));
      showToast('Registro excluído com sucesso');
    } catch (err) {
      showToast('Erro ao excluir registro', 'error');
    }
  };

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const renderRawTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Registro de Produção Bruta</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Atividade diária de costura e montagem primária.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200 dark:shadow-none"
        >
          <Plus size={20} />
          Nova Entrada
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(rawProductions || []).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Package size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma produção registrada.</p>
          </div>
        ) : (
          (rawProductions || []).map(record => (
            <div key={record.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
                  <Scissors size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-800 dark:text-white">{record.quantity} un.</span>
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 text-[10px] font-bold rounded uppercase">
                      {record.shift}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Calendar size={12} /> {format(parseISO(record.date), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <User size={12} /> {record.operator}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteRecord(record.id, 'diaperRawProductions')}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderWipTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Evolução de Processamento (WIP)</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Corte, ajuste de bordas e preparação de núcleo.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 dark:shadow-none"
        >
          <Plus size={20} />
          Registrar Evolução
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(wipProcessings || []).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Activity size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Nenhum processamento registrado.</p>
          </div>
        ) : (
          (wipProcessings || []).map(record => (
            <div key={record.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400">
                  <Activity size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-800 dark:text-white">{record.quantityOut} / {record.quantityIn} un.</span>
                    {record.wasteAmount > 0 && (
                      <span className="px-2 py-0.5 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-[10px] font-bold rounded uppercase flex items-center gap-1">
                        <AlertTriangle size={10} /> -{record.wasteAmount} Perda
                      </span>
                    )}
                  </div>
                  {record.wasteReason && (
                    <p className="text-xs text-red-500 font-medium mt-1 italic">Motivo: {record.wasteReason}</p>
                  )}
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Calendar size={12} /> {format(parseISO(record.date), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <User size={12} /> {record.operator}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteRecord(record.id, 'diaperWIPProcessings')}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderFinalTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div>
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Finalização e Embalagem</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Saída pronta para estoque e rastreabilidade por lote.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-amber-600 text-white px-6 py-3 rounded-xl font-bold hover:bg-amber-700 transition-all shadow-lg shadow-amber-200 dark:shadow-none"
        >
          <Plus size={20} />
          Registrar Saída
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {(finalPackings || []).length === 0 ? (
          <div className="text-center py-12 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
            <Truck size={48} className="mx-auto text-gray-300 dark:text-gray-600 mb-4" />
            <p className="text-gray-500 dark:text-gray-400">Nenhuma embalagem registrada.</p>
          </div>
        ) : (
          (finalPackings || []).map(record => (
            <div key={record.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between group">
              <div className="flex items-center gap-6">
                <div className="w-12 h-12 bg-amber-100 dark:bg-amber-900/30 rounded-xl flex items-center justify-center text-amber-600 dark:text-amber-400">
                  <CheckCircle2 size={24} />
                </div>
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-lg font-black text-gray-800 dark:text-white">{record.quantityPackaged} un.</span>
                    <span className="px-2 py-0.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 text-[10px] font-bold rounded uppercase">
                      {safeReplace(record.packageType, '_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-amber-600 font-bold bg-amber-50 dark:bg-amber-900/20 px-2 rounded-md">Lote: {record.batchNumber}</span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <Calendar size={12} /> {format(parseISO(record.date), 'dd/MM/yyyy')}
                    </span>
                    <span className="text-xs text-gray-400 font-medium flex items-center gap-1">
                      <User size={12} /> {record.operator}
                    </span>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDeleteRecord(record.id, 'diaperFinalPackings')}
                className="p-2 text-gray-400 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );

  const renderDashboardTab = () => {
    const { totalRaw, totalFinal, wipLoss, lossRate, efficiency, goal, dailyData, pieData } = dashboardData;
    const isGoalMet = totalFinal >= goal;
    const goalProgress = goal > 0 ? (totalFinal / goal) * 100 : 0;

    return (
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
        {/* Filtro de Mês */}
        <div className="flex items-center justify-between bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white">Relatório Mensal</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">Análise de desempenho e perdas da fábrica.</p>
          </div>
          <div className="flex gap-4">
            <input 
              type="month" 
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 px-4 py-2 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 outline-none focus:ring-2 focus:ring-green-500"
            />
            <div className="flex items-center gap-1 bg-gray-50 dark:bg-gray-800 p-1 rounded-xl border border-gray-100 dark:border-gray-700">
               <button 
                onClick={() => handleExport('pdf')}
                disabled={exporting}
                title="Exportar PDF"
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-red-500 transition-all disabled:opacity-50"
               >
                 <FileText size={18} />
               </button>
               <button 
                onClick={() => handleExport('word')}
                disabled={exporting}
                title="Exportar Word"
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-blue-500 transition-all disabled:opacity-50"
               >
                 <FileDown size={18} />
               </button>
               <button 
                onClick={() => handleExport('excel')}
                disabled={exporting}
                title="Exportar Excel"
                className="p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg text-green-600 transition-all disabled:opacity-50"
               >
                 <TableIcon size={18} />
               </button>
            </div>
            <button 
              onClick={() => {
                setGoalForm({ ...goalForm, month: selectedMonth });
                setIsModalOpen(true);
              }}
              className="px-6 py-2 bg-green-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all flex items-center gap-2"
            >
              <Target size={18} />
              Ajustar Meta
            </button>
          </div>
        </div>

        {/* KPIs Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-2xl">
                <Scissors size={24} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Produção Bruta</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalRaw}<span className="text-xs text-gray-400 ml-1">unidades</span></p>
            <p className="text-xs text-gray-500 mt-2">Volume total costurado/montado</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-2xl">
                <Truck size={24} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Embalado</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{totalFinal}<span className="text-xs text-gray-400 ml-1">unidades</span></p>
            <p className="text-xs text-gray-500 mt-2">Pronto para entrega/consumo</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl">
                <AlertTriangle size={24} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Perdas de WIP</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{wipLoss}<span className="text-xs text-red-500 ml-1">({lossRate.toFixed(1)}%)</span></p>
            <p className="text-xs text-gray-500 mt-2">Volume descartado por defeito</p>
          </div>

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Target size={24} />
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Meta Mensal</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{goal}<span className="text-xs text-gray-400 ml-1">un</span></p>
            <p className={cn("text-xs font-bold mt-2 flex items-center gap-1", isGoalMet ? "text-green-600" : "text-amber-600")}>
              {isGoalMet ? <CheckCircle2 size={12} /> : <AlertTriangle size={12} />}
              {goalProgress.toFixed(1)}% atingido
            </p>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Daily Evolution */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 h-[450px]">
             <div className="flex items-center justify-between mb-8">
                <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <TrendingUp size={20} className="text-green-600" />
                  Evolução de Fluxo Diário
                </h4>
             </div>
             <div style={{ width: '100%', height: 300 }}>
               <ResponsiveContainer width="100%" height="85%" minWidth={0}>
               <AreaChart data={dailyData}>
                 <defs>
                   <linearGradient id="colorRaw" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                   </linearGradient>
                   <linearGradient id="colorFinal" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                     <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                   </linearGradient>
                 </defs>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                 <XAxis dataKey="name" fontSize={10} axisLine={false} tickLine={false} />
                 <YAxis fontSize={10} axisLine={false} tickLine={false} />
                 <Tooltip 
                   contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                 />
                 <Area type="monotone" dataKey="producaoBruta" stroke="#10b981" fillOpacity={1} fill="url(#colorRaw)" name="Bruta" strokeWidth={3} />
                 <Area type="monotone" dataKey="embalagem" stroke="#3b82f6" fillOpacity={1} fill="url(#colorFinal)" name="Final" strokeWidth={3} />
               </AreaChart>
             </ResponsiveContainer>
           </div>
          </div>

          {/* Package Type Breakdown */}
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 h-[450px]">
            <h4 className="font-bold text-gray-800 dark:text-white mb-8 flex items-center gap-2">
              <Package size={20} className="text-amber-600" />
              Mix de Produção (Tipos)
            </h4>
            <div style={{ width: '100%', height: 300 }}>
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend verticalAlign="bottom" height={36}/>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Eficiência Geral</p>
                <p className="text-xl font-bold text-green-600">{efficiency.toFixed(1)}%</p>
              </div>
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">Perda Acumulada</p>
                <p className="text-xl font-bold text-red-600">{wipLoss} un.</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderModalForm = () => {
    switch (activeTab) {
      case 'raw':
        return (
          <form onSubmit={handleSaveRaw} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Data da Atividade</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                  value={rawForm.date}
                  onChange={e => setRawForm({...rawForm, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase">Turno</label>
                <select 
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500"
                  value={rawForm.shift}
                  onChange={e => setRawForm({...rawForm, shift: e.target.value as any})}
                >
                  <option value="MANHA">Manhã</option>
                  <option value="TARDE">Tarde</option>
                  <option value="INTEGRAL">Integral</option>
                </select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Quantidade Costurada</label>
              <input 
                type="number"
                placeholder="Ex: 500"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-2xl font-black"
                value={rawForm.quantity}
                onChange={e => setRawForm({...rawForm, quantity: e.target.value})}
              />
              <p className="text-[10px] text-amber-600 font-bold">Importante: Registre apenas o total produzido no dia selecionado.</p>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Observações</label>
              <textarea 
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                value={rawForm.observations}
                onChange={e => setRawForm({...rawForm, observations: e.target.value})}
              />
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Confirmar Produção
              </button>
            </div>
          </form>
        );
      case 'wip':
        return (
          <form onSubmit={handleSaveWip} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-400 uppercase">Data do Processamento</label>
              <input 
                type="date"
                className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                value={wipForm.date}
                onChange={e => setWipForm({...wipForm, date: e.target.value})}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Entrada (Bruto)</label>
                <input 
                  type="number"
                  placeholder="Ex: 500"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={wipForm.quantityIn}
                  onChange={e => setWipForm({...wipForm, quantityIn: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Saída (Pronto)</label>
                <input 
                  type="number"
                  placeholder="Ex: 480"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  value={wipForm.quantityOut}
                  onChange={e => setWipForm({...wipForm, quantityOut: e.target.value})}
                />
              </div>
            </div>
            {parseInt(wipForm.quantityIn) - parseInt(wipForm.quantityOut) > 0 && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <label className="text-xs font-bold text-red-500 uppercase flex items-center gap-1">
                  <AlertTriangle size={12} /> Motivo do Descarte (Obrigatório)
                </label>
                <select 
                  className="w-full p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-2xl outline-none focus:ring-2 focus:ring-red-500"
                  value={wipForm.wasteReason}
                  onChange={e => setWipForm({...wipForm, wasteReason: e.target.value})}
                >
                  <option value="">Selecione o motivo...</option>
                  <option value="DEFEITO_COSTURA">Defeito de Costura</option>
                  <option value="ERRO_CORTE">Erro de Corte</option>
                  <option value="MATERIAL_DANIFICADO">Material Danificado</option>
                  <option value="OUTROS">Outros</option>
                </select>
              </div>
            )}
            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-xl hover:bg-blue-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Finalizar Processamento
              </button>
            </div>
          </form>
        );
      case 'final':
        return (
          <form onSubmit={handleSaveFinal} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Data da Embalagem</label>
                <input 
                  type="date"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500"
                  value={finalForm.date}
                  onChange={e => setFinalForm({...finalForm, date: e.target.value})}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Lote (Auto)</label>
                <input 
                  readOnly
                  className="w-full p-4 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none cursor-not-allowed opacity-70"
                  value={finalForm.batchNumber}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Tipo de Fralda</label>
                <div className="w-full p-4 bg-gray-100 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl text-gray-500 font-bold">
                  Tamanho Único
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Qtd de Fraldas</label>
                <input 
                  type="number"
                  placeholder="Ex: 1000"
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-amber-500 font-black"
                  value={finalForm.quantityPackaged}
                  onChange={e => setFinalForm({...finalForm, quantityPackaged: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4 pt-4">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-amber-600 text-white rounded-2xl font-bold shadow-xl hover:bg-amber-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Concluir Embalagem
              </button>
            </div>
          </form>
        );
      case 'dashboard':
        return (
          <form onSubmit={handleSaveGoal} className="space-y-6">
            <h4 className="text-center font-bold text-gray-700 dark:text-gray-300">Ajustar Meta Mensal - {format(parseISO(`${selectedMonth}-01`), 'MMMM/yyyy', { locale: ptBR })}</h4>
            <div className="space-y-2">
              <label className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Quantidade Objetivada (Fraldas Finalizadas)</label>
              <input 
                type="number"
                placeholder="Ex: 15000"
                className="w-full p-6 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-3xl outline-none focus:ring-2 focus:ring-green-500 text-4xl font-black text-center"
                value={goalForm.targetQuantity}
                onChange={e => setGoalForm({...goalForm, targetQuantity: e.target.value})}
              />
            </div>
            <div className="flex gap-4 pt-6">
              <button 
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-2xl hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="flex-[2] py-4 bg-green-600 text-white rounded-2xl font-bold shadow-xl hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                Salvar Nova Meta
              </button>
            </div>
          </form>
        );
      default: return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-20">
      {/* Header com Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-center bg-white dark:bg-gray-900 p-2 md:p-4 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 backdrop-blur-md sticky top-0 z-30">
        <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl w-full md:w-auto">
          {[
            { id: 'dashboard', label: 'Balanço', icon: BarChart3 },
            { id: 'raw', label: 'Bruta', icon: Scissors },
            { id: 'wip', label: 'Processo', icon: Activity },
            { id: 'final', label: 'Embalagem', icon: Truck }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex-1 md:flex-none flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all",
                activeTab === tab.id 
                  ? "bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm" 
                  : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              <tab.icon size={18} />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>
        
        <div className="hidden md:flex items-center gap-4 px-4">
          <div className="text-right">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Status da Produção</p>
            <p className="text-xs font-bold text-green-600 flex items-center gap-1 justify-end">
              <CheckCircle2 size={12} /> Operacional
            </p>
          </div>
          <div className="w-10 h-10 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400">
            <Package size={20} />
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           exit={{ opacity: 0, y: -20 }}
           transition={{ duration: 0.2 }}
        >
          {activeTab === 'raw' && renderRawTab()}
          {activeTab === 'wip' && renderWipTab()}
          {activeTab === 'final' && renderFinalTab()}
          {activeTab === 'dashboard' && renderDashboardTab()}
        </motion.div>
      </AnimatePresence>

      {/* Modal Genérico para CRUD */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-2 md:p-4 bg-black/60 backdrop-blur-sm" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-[32px] md:rounded-[40px] shadow-2xl w-full max-w-lg max-h-[95vh] md:max-h-[90vh] overflow-hidden flex flex-col relative"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-5 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 sticky top-0 z-20">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 rounded-full bg-green-600 animate-pulse" />
                    <span className="text-[10px] font-black text-green-600 uppercase tracking-widest">Produção</span>
                  </div>
                  <h3 className="text-xl md:text-2xl font-black text-gray-800 dark:text-white">
                    {activeTab === 'raw' ? 'Entrada de Produção' : 
                     activeTab === 'wip' ? 'Registro de Processo' : 
                     activeTab === 'final' ? 'Saída de Lote' : 'Definir Meta'}
                  </h3>
                </div>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="p-2 md:p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl text-gray-400 hover:text-gray-600 dark:hover:text-white transition-all hover:rotate-90"
                >
                  <Plus size={24} className="rotate-45" />
                </button>
              </div>

              <div className="p-5 md:p-8 overflow-y-auto flex-1">
                {renderModalForm()}
                
                <p className="text-[10px] text-center text-gray-400 mt-8 font-bold uppercase tracking-widest">
                  Sistema SGPF - Rastreabilidade Garantida
                </p>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
