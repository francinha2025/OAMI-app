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
  Loader2,
  Edit2,
  Phone,
  MapPin,
  Users,
  IdCard
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
  DiaperProductionGoal,
  DiaperDonation,
  DiaperBeneficiary
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
  donations: DiaperDonation[];
  beneficiaries: DiaperBeneficiary[];
  goals: DiaperProductionGoal[];
  onSaveDonation: (data: Partial<DiaperDonation>) => Promise<void>;
  onSaveBeneficiary: (data: Partial<DiaperBeneficiary>) => Promise<void>;
  onSaveRaw: (data: Partial<DiaperRawProduction>) => Promise<void>;
  onSaveWip: (data: Partial<DiaperWIPProcessing>) => Promise<void>;
  onSaveFinal: (data: Partial<DiaperFinalPacking>) => Promise<void>;
  onSaveGoal: (data: Partial<DiaperProductionGoal>) => Promise<void>;
  onDeleteRecord: (collection: string, id: string) => Promise<void>;
  showToast: (msg: string, type?: 'success' | 'error') => void;
}

type TabType = 'raw' | 'wip' | 'final' | 'dashboard' | 'donations' | 'beneficiaries';

export const DiaperProductionSection: React.FC<DiaperProductionSectionProps> = ({
  user,
  rawProductions,
  wipProcessings,
  finalPackings,
  donations,
  beneficiaries,
  goals,
  onSaveDonation,
  onSaveBeneficiary,
  onSaveRaw,
  onSaveWip,
  onSaveFinal,
  onSaveGoal,
  onDeleteRecord,
  showToast
}: DiaperProductionSectionProps) => {
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

  const [donationForm, setDonationForm] = useState({
    beneficiaryId: '',
    beneficiaryName: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    quantity: '',
    observations: ''
  });

  const [beneficiaryForm, setBeneficiaryForm] = useState({
    name: '',
    phone: '',
    address: '',
    document: '',
    rg: '',
    birthDate: '',
    gender: 'M' as 'M' | 'F' | 'OUTRO',
    observations: '',
    familyContact: '',
    diaperSize: 'G' as 'P' | 'M' | 'G' | 'GG' | 'XG' | 'XXG',
    needsEvolution: false,
    status: 'ATIVO' as 'ATIVO' | 'INATIVO'
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [modalType, setModalType] = useState<string>('');

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
      goalId: currentGoal?.id || null,
      dailyData,
      pieData
    };
  }, [rawProductions, wipProcessings, finalPackings, goals, selectedMonth]);

  const handleEditRaw = (record: DiaperRawProduction) => {
    setRawForm({
      date: record.date,
      quantity: record.quantity.toString(),
      operator: record.operator,
      shift: record.shift,
      observations: record.observations || ''
    });
    setEditingId(record.id);
    setIsModalOpen(true);
  };

  const handleEditWip = (record: DiaperWIPProcessing) => {
    setWipForm({
      date: record.date,
      quantityIn: record.quantityIn.toString(),
      quantityOut: record.quantityOut.toString(),
      wasteReason: record.wasteReason || '',
      operator: record.operator,
      observations: record.observations || ''
    });
    setEditingId(record.id);
    setIsModalOpen(true);
  };

  const handleEditFinal = (record: DiaperFinalPacking) => {
    setFinalForm({
      date: record.date,
      quantityPackaged: record.quantityPackaged.toString(),
      packageType: record.packageType,
      operator: record.operator,
      batchNumber: record.batchNumber,
      observations: record.observations || ''
    });
    setEditingId(record.id);
    setIsModalOpen(true);
  };

  const handleEditDonation = (record: DiaperDonation) => {
    setDonationForm({
      beneficiaryId: record.beneficiaryId,
      beneficiaryName: record.beneficiaryName,
      date: record.date,
      quantity: record.quantity.toString(),
      observations: record.observations || ''
    });
    setEditingId(record.id);
    setModalType('donations');
    setIsModalOpen(true);
  };

  // Handlers
  const handleSaveRaw = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        ...rawForm,
        quantity: parseInt(rawForm.quantity) || 0,
        updatedAt: new Date().toISOString()
      };
      
      if (editingId) {
        payload.id = editingId;
      } else {
        payload.createdAt = new Date().toISOString();
      }

      await onSaveRaw(payload);
      setIsModalOpen(false);
      setRawForm({ ...rawForm, quantity: '', observations: '' });
      setEditingId(null);
    } catch (err: any) {
      // Error handled by parent
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

      const payload: any = {
        ...wipForm,
        quantityIn: inVal,
        quantityOut: outVal,
        wasteAmount: Math.max(0, inVal - outVal),
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        payload.id = editingId;
      } else {
        payload.createdAt = new Date().toISOString();
      }

      await onSaveWip(payload);
      setIsModalOpen(false);
      setWipForm({ ...wipForm, quantityIn: '', quantityOut: '', wasteReason: '', observations: '' });
      setEditingId(null);
    } catch (err: any) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDonation = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        ...donationForm,
        quantity: parseInt(donationForm.quantity) || 0,
        updatedAt: new Date().toISOString()
      };
      
      if (editingId) {
        payload.id = editingId;
      } else {
        payload.createdAt = new Date().toISOString();
      }

      await onSaveDonation(payload);
      showToast(editingId ? 'Doação atualizada!' : 'Doação registrada com sucesso!');
      setIsModalOpen(false);
      setDonationForm({ ...donationForm, quantity: '', observations: '', beneficiaryId: '', beneficiaryName: '' });
      setEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao registrar doação', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...beneficiaryForm,
        createdAt: new Date().toISOString()
      };
      
      if (editingId) {
        await onSaveBeneficiary({ ...payload, id: editingId });
        showToast('Beneficiário atualizado com sucesso!');
      } else {
        await onSaveBeneficiary(payload);
        showToast('Beneficiário cadastrado com sucesso!');
      }
      setIsModalOpen(false);
      setBeneficiaryForm({
        name: '',
        phone: '',
        address: '',
        document: '',
        rg: '',
        birthDate: '',
        gender: 'M',
        observations: '',
        familyContact: '',
        diaperSize: 'G',
        needsEvolution: false,
        status: 'ATIVO'
      });
      setEditingId(null);
    } catch (err: any) {
      showToast(err.message || 'Erro ao salvar beneficiário', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveFinal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        ...finalForm,
        quantityPackaged: parseInt(finalForm.quantityPackaged) || 0,
        updatedAt: new Date().toISOString()
      };

      if (editingId) {
        payload.id = editingId;
      } else {
        payload.createdAt = new Date().toISOString();
      }

      await onSaveFinal(payload);
      setIsModalOpen(false);
      setFinalForm({ ...finalForm, quantityPackaged: '', observations: '', batchNumber: `BAT-${format(new Date(), 'yyyyMMdd')}` });
      setEditingId(null);
    } catch (err: any) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload: any = {
        ...goalForm,
        targetQuantity: parseInt(goalForm.targetQuantity) || 0,
        updatedAt: new Date().toISOString()
      };

      const existingGoal = goals.find(g => g.month === goalForm.month);
      if (existingGoal) {
        payload.id = existingGoal.id;
      }

      await onSaveGoal(payload);
      setIsModalOpen(false);
    } catch (err: any) {
      // Error handled by parent
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

      const { totalRaw, totalFinal, wipLoss, lossRate, efficiency, goal } = dashboardData;

      // 1. Prepare Summary Rows
      const summaryData = [
        ['---', 'RESUMO EXECUTIVO DO PERÍODO', '---', '---', '---'],
        ['Indicador', 'Valor Nominal', 'Percentual', 'Meta', 'Status'],
        ['Produção Bruta Total', `${totalRaw} un`, '-', '-', 'OK'],
        ['Produção Finalizada', `${totalFinal} un`, `${efficiency.toFixed(1)}%`, `${goal} un`, totalFinal >= goal ? 'META ATINGIDA' : 'EM ANDAMENTO'],
        ['Perda em Processamento', `${wipLoss} un`, `${lossRate.toFixed(1)}%`, '< 5%', lossRate > 5 ? 'ATENÇÃO' : 'NORMAL'],
        ['---', '---', '---', '---', '---'],
        ['', '', '', '', ''],
      ];

      // 2. Prepare Detailed Activity Log
      const filteredRaw = rawProductions
        .filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }))
        .map(p => ({
          date: p.date,
          activity: 'PRODUÇÃO BRUTA',
          details: `Turno: ${p.shift}`,
          qty: p.quantity,
          resp: p.operator
        }));

      const filteredWip = wipProcessings
        .filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }))
        .flatMap(p => [
          {
            date: p.date,
            activity: 'PROCESSAMENTO (WIP)',
            details: `Saída Processada`,
            qty: p.quantityOut,
            resp: p.operator
          },
          ...(p.wasteAmount > 0 ? [{
            date: p.date,
            activity: 'PERDA REGISTRADA',
            details: `Motivo: ${p.wasteReason || 'Não informado'}`,
            qty: -p.wasteAmount,
            resp: p.operator
          }] : [])
        ]);

      const filteredFinal = finalPackings
        .filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }))
        .map(p => ({
          date: p.date,
          activity: 'EMBALAGEM FINAL',
          details: `Lote: ${p.batchNumber} (${safeReplace(p.packageType, '_', ' ')})`,
          qty: p.quantityPackaged,
          resp: p.operator
        }));

      const filteredDonations = (donations || [])
        .filter(p => isWithinInterval(parseISO(p.date), { start: monthStart, end: monthEnd }))
        .map(p => ({
          date: p.date,
          activity: 'DOAÇÃO',
          details: `Beneficiário: ${p.beneficiaryName}`,
          qty: -p.quantity,
          resp: 'Assistente Social'
        }));

      // Combine and Sort by Date
      const combinedActivities = [...filteredRaw, ...filteredWip, ...filteredFinal, ...filteredDonations]
        .sort((a, b) => a.date.localeCompare(b.date))
        .map(a => [
          format(parseISO(a.date), 'dd/MM/yyyy'),
          a.activity,
          a.details,
          a.qty.toString(),
          a.resp
        ]);

      const columns = ['Data', 'Atividade', 'Detalhes / Observações', 'Qtd', 'Operador/Destino'];
      const data = [...summaryData, ...combinedActivities];
      const title = `Relatório Detalhado de Produção de Fraldas - ${monthLabel}`;
      const fileName = `producao_detalhada_fraldas_${selectedMonth}`;

      if (type === 'pdf') {
        await generateModernPDF({ 
          title, 
          columns, 
          data, 
          fileName, 
          subtitle: `Consolidado de Fluxo: Bruta -> Processada -> Embalada -> Doadas`,
          orientation: 'landscape' 
        });
      } else if (type === 'word') {
        await generateModernWord({ title, columns, data, fileName, subtitle: `Relatório detalhado de fluxo de produção` });
      } else if (type === 'excel') {
        generateModernExcel({ title, columns, data, fileName });
      }
      
      showToast(`Relatório detalhado exportado com sucesso (${type.toUpperCase()})!`);
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar relatório detalhado', 'error');
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
          onClick={() => {
            setEditingId(null);
            setRawForm({
              date: format(new Date(), 'yyyy-MM-dd'),
              quantity: '',
              operator: user.name,
              shift: 'MANHA',
              observations: ''
            });
            setIsModalOpen(true);
          }}
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditRaw(record)}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  title="Editar Registro"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDeleteRecord('diaperRawProductions', record.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Excluir Registro"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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
          onClick={() => {
            setEditingId(null);
            setWipForm({
              date: format(new Date(), 'yyyy-MM-dd'),
              quantityIn: '',
              quantityOut: '',
              wasteReason: '',
              operator: user.name,
              observations: ''
            });
            setIsModalOpen(true);
          }}
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditWip(record)}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  title="Editar Registro"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDeleteRecord('diaperWIPProcessings', record.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Excluir Registro"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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
          onClick={() => {
            setEditingId(null);
            setFinalForm({
              date: format(new Date(), 'yyyy-MM-dd'),
              quantityPackaged: '',
              packageType: 'TAMANHO_UNICO',
              operator: user.name,
              batchNumber: `BAT-${format(new Date(), 'yyyyMMdd')}`,
              observations: ''
            });
            setIsModalOpen(true);
          }}
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
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEditFinal(record)}
                  className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                  title="Editar Registro"
                >
                  <Edit2 size={18} />
                </button>
                <button 
                  onClick={() => onDeleteRecord('diaperFinalPackings', record.id)}
                  className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                  title="Excluir Registro"
                >
                  <Trash2 size={18} />
                </button>
              </div>
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

          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative">
            <div className="flex items-center justify-between mb-4">
              <div className="p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-2xl">
                <Target size={24} />
              </div>
              <div className="flex items-center gap-1">
                {dashboardData.goalId && (
                  <>
                    <button 
                      onClick={() => {
                        const g = goals.find(x => x.id === dashboardData.goalId);
                        if (g) {
                          setGoalForm({ month: g.month, targetQuantity: g.targetQuantity.toString(), notes: g.notes || '' });
                          setModalType('goals');
                          setIsModalOpen(true);
                        }
                      }}
                      className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"
                      title="Editar Meta"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button 
                      onClick={() => onDeleteRecord('diaperProductionGoals', dashboardData.goalId!)}
                      className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                      title="Excluir Meta"
                    >
                      <Trash2 size={14} />
                    </button>
                  </>
                )}
              </div>
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Meta Mensal</span>
            </div>
            <p className="text-3xl font-black text-gray-900 dark:text-white">{dashboardData.goal}<span className="text-xs text-gray-400 ml-1">un</span></p>
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

  const renderDonationsTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Doações Realizadas</h2>
          <p className="text-sm text-gray-500 font-bold">Registro de saída de fraldas para beneficiários externos</p>
        </div>
        <button
          onClick={() => { 
            setEditingId(null); 
            setDonationForm({
              beneficiaryId: '',
              beneficiaryName: '',
              date: format(new Date(), 'yyyy-MM-dd'),
              quantity: '',
              observations: ''
            });
            setModalType('donations' as any); 
            setIsModalOpen(true); 
          }}
          className="flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-2xl font-bold hover:bg-blue-700 shadow-lg shadow-blue-100 transition-all"
        >
          <Plus size={20} />
          Nova Doação
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(donations || []).slice().sort((a, b) => b.date.localeCompare(a.date)).map((donation) => (
          <div key={donation.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 flex gap-2">
              <button 
                onClick={() => handleEditDonation(donation)}
                className="p-2 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                title="Editar Doação"
              >
                <Edit2 size={16} />
              </button>
              <button 
                onClick={() => onDeleteRecord('diaperDonations', donation.id)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                title="Excluir Doação"
              >
                <Trash2 size={16} />
              </button>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center text-blue-600">
                <Truck size={24} />
              </div>
              <div>
                <h4 className="font-black text-gray-800 dark:text-white uppercase tracking-tight leading-tight">{donation.beneficiaryName}</h4>
                <p className="text-xs text-gray-500 font-bold">{format(parseISO(donation.date), 'dd/MM/yyyy')}</p>
              </div>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase">
                {donation.quantity} Fraldas
              </span>
              <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">
                U
              </span>
            </div>
            {donation.observations && (
              <p className="text-xs text-gray-500 italic line-clamp-2">"{donation.observations}"</p>
            )}
          </div>
        ))}
        {(donations || []).length === 0 && (
          <div className="col-span-full py-12 bg-white dark:bg-gray-900 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center text-gray-400">
             <Truck size={48} className="mb-4 opacity-20" />
             <p className="font-bold">Nenhuma doação registrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );

  const renderBeneficiariesTab = () => (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-black text-gray-800 dark:text-white uppercase tracking-tighter">Cadastro de Beneficiários</h2>
          <p className="text-sm text-gray-500 font-bold">Gestão das famílias e pessoas atendidas pelas doações</p>
        </div>
        <button
          onClick={() => { setModalType('beneficiaries' as any); setEditingId(null); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-2xl font-bold hover:bg-green-700 shadow-lg shadow-green-100 transition-all"
        >
          <Plus size={20} />
          Novo Beneficiário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(beneficiaries || []).map((beneficiary) => (
          <div key={beneficiary.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:border-green-100 transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className="w-14 h-14 bg-green-50 dark:bg-green-900/20 rounded-2xl flex items-center justify-center text-green-600">
                <User size={28} />
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => { setEditingId(beneficiary.id); setBeneficiaryForm({...beneficiary}); setModalType('beneficiaries' as any); setIsModalOpen(true); }}
                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                >
                  <Edit2 size={16} />
                </button>
                <button 
                  onClick={() => onDeleteRecord('diaperBeneficiaries', beneficiary.id)}
                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            
            <h4 className="text-lg font-black text-gray-800 dark:text-white uppercase tracking-tight mb-1">{beneficiary.name}</h4>
            <div className="space-y-2 mb-4">
              {beneficiary.document && (
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest flex items-center gap-2">
                  <IdCard size={12} className="text-blue-500" /> CPF: {beneficiary.document}
                </p>
              )}
              <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                <Phone size={12} className="text-green-500" /> {beneficiary.phone || 'Sem telefone'}
              </p>
              <p className="text-xs text-gray-500 font-bold flex items-center gap-2">
                <MapPin size={12} className="text-green-500" /> <span className="truncate">{beneficiary.address || 'Sem endereço'}</span>
              </p>
            </div>

            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-50 dark:border-gray-800">
              {beneficiary.diaperSize && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-lg text-[10px] font-black uppercase">
                  TAM: {beneficiary.diaperSize}
                </span>
              )}
              <span className={cn(
                "px-2 py-1 rounded-lg text-[10px] font-black uppercase",
                beneficiary.status === 'ATIVO' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
              )}>
                {beneficiary.status}
              </span>
              {beneficiary.needsEvolution && (
                <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-lg text-[10px] font-black uppercase flex items-center gap-1">
                  <Activity size={10} /> Multi
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

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
      case 'donations':
        return (
          <form onSubmit={handleSaveDonation} className="space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Beneficiário</label>
                <select
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                  value={donationForm.beneficiaryId}
                  onChange={e => setDonationForm({...donationForm, beneficiaryId: e.target.value})}
                  required
                >
                  <option value="">Selecione o beneficiário...</option>
                  {(beneficiaries || []).filter(b => b.status === 'ATIVO').map(b => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Data</label>
                  <input
                    type="date"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={donationForm.date}
                    onChange={e => setDonationForm({...donationForm, date: e.target.value})}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Quantidade</label>
                  <input
                    type="number"
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500"
                    value={donationForm.quantity}
                    onChange={e => setDonationForm({...donationForm, quantity: e.target.value})}
                    placeholder="Ex: 30"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Observações</label>
                <textarea
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 h-24"
                  value={donationForm.observations}
                  onChange={e => setDonationForm({...donationForm, observations: e.target.value})}
                />
              </div>
            </div>
            <div className="flex gap-4">
              <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 font-bold rounded-2xl">Cancelar</button>
              <button type="submit" disabled={loading} className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2">
                {loading && <Loader2 className="animate-spin" size={18} />}
                Confirmar Doação
              </button>
            </div>
          </form>
        );
      case 'beneficiaries':
        return (
          <form onSubmit={handleSaveBeneficiary} className="space-y-6 text-gray-900 dark:text-gray-100">
            <div className="space-y-6">
              {/* Informações Pessoais */}
              <div className="bg-white dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 space-y-4">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Informações Pessoais</h5>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Nome Completo</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                      value={beneficiaryForm.name}
                      onChange={e => setBeneficiaryForm({...beneficiaryForm, name: e.target.value})}
                      placeholder="Ex: João da Silva"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Data de Nascimento</label>
                      <input
                        type="date"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                        value={beneficiaryForm.birthDate}
                        onChange={e => setBeneficiaryForm({...beneficiaryForm, birthDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Gênero</label>
                      <select
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                        value={beneficiaryForm.gender}
                        onChange={e => setBeneficiaryForm({...beneficiaryForm, gender: e.target.value as any})}
                      >
                        <option value="M">Masculino</option>
                        <option value="F">Feminino</option>
                        <option value="OUTRO">Outro</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Documentação */}
              <div className="bg-white dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 space-y-4">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Documentação</h5>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">CPF</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                      value={beneficiaryForm.document}
                      onChange={e => setBeneficiaryForm({...beneficiaryForm, document: e.target.value})}
                      placeholder="000.000.000-00"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">RG</label>
                    <input
                      type="text"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                      value={beneficiaryForm.rg}
                      onChange={e => setBeneficiaryForm({...beneficiaryForm, rg: e.target.value})}
                      placeholder="Nº da Identidade"
                    />
                  </div>
                </div>
              </div>

              {/* Contato e Endereço */}
              <div className="bg-white dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 space-y-4">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Contato e Logística</h5>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Telefone Principal</label>
                      <input
                        type="tel"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                        value={beneficiaryForm.phone}
                        onChange={e => setBeneficiaryForm({...beneficiaryForm, phone: e.target.value})}
                        placeholder="(00) 00000-0000"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Contato Familiar</label>
                      <input
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                        value={beneficiaryForm.familyContact}
                        onChange={e => setBeneficiaryForm({...beneficiaryForm, familyContact: e.target.value})}
                        placeholder="Nome / Telefone"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Endereço Residencial</label>
                    <textarea
                      placeholder="Rua, Número, Bairro, Ponto de Referência..."
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-medium h-24"
                      value={beneficiaryForm.address}
                      onChange={e => setBeneficiaryForm({...beneficiaryForm, address: e.target.value})}
                    />
                  </div>
                </div>
              </div>

              {/* Necessidades Operacionais */}
              <div className="bg-white dark:bg-gray-800/50 p-6 rounded-[2rem] border border-gray-100 dark:border-gray-700 space-y-4">
                <h5 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-2">Necessidades Operacionais</h5>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Tamanho da Fralda</label>
                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
                      {['P', 'M', 'G', 'GG', 'XG', 'XXG'].map(size => (
                        <button
                          key={size}
                          type="button"
                          onClick={() => setBeneficiaryForm({...beneficiaryForm, diaperSize: size as any})}
                          className={cn(
                            "py-3 rounded-xl text-sm font-black border-2 transition-all",
                            beneficiaryForm.diaperSize === size 
                              ? "bg-green-600 border-green-600 text-white shadow-lg shadow-green-200 dark:shadow-none" 
                              : "bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-400"
                          )}
                        >
                          {size}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-500 uppercase tracking-widest">Observações Socioassistenciais</label>
                    <textarea
                      placeholder="Descreva a situação de vulnerabilidade, frequência de doação necessária, etc."
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-medium h-32"
                      value={beneficiaryForm.observations}
                      onChange={e => setBeneficiaryForm({...beneficiaryForm, observations: e.target.value})}
                    />
                  </div>
                  <div className="flex items-center gap-3 p-5 bg-green-50 dark:bg-green-900/10 rounded-[1.5rem] border border-green-100 dark:border-green-900/20">
                    <div className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        id="needsEvolution"
                        className="sr-only peer"
                        checked={beneficiaryForm.needsEvolution}
                        onChange={e => setBeneficiaryForm({...beneficiaryForm, needsEvolution: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600"></div>
                    </div>
                    <label htmlFor="needsEvolution" className="text-xs font-black text-green-800 dark:text-green-300 uppercase tracking-tight">
                      Habilitar Acompanhamento Multidisciplinar
                    </label>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-4 pt-4">
              <button 
                type="button" 
                onClick={() => setIsModalOpen(false)} 
                className="flex-1 py-5 bg-gray-100 dark:bg-gray-800 text-gray-500 font-black rounded-[1.5rem] hover:bg-gray-200 transition-all active:scale-95"
              >
                Cancelar
              </button>
              <button 
                type="submit" 
                disabled={loading} 
                className="flex-[2] py-5 bg-green-600 text-white rounded-[1.5rem] font-black shadow-xl shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="animate-spin" size={18} />}
                {editingId ? 'Atualizar Cadastro' : 'Finalizar Cadastro'}
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
        <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl w-full md:w-auto overflow-x-auto no-scrollbar">
          {[
            { id: 'dashboard', label: 'Balanço', icon: BarChart3 },
            { id: 'raw', label: 'Bruta', icon: Scissors },
            { id: 'wip', label: 'Processo', icon: Activity },
            { id: 'final', label: 'Embalagem', icon: Truck },
            { id: 'donations', label: 'Doações', icon: Package },
            { id: 'beneficiaries', label: 'Beneficiários', icon: Users }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={cn(
                "flex-1 md:flex-none flex items-center gap-2 px-4 py-3 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
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
          {activeTab === 'donations' && renderDonationsTab()}
          {activeTab === 'beneficiaries' && renderBeneficiariesTab()}
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
                     activeTab === 'final' ? 'Saída de Lote' : 
                     activeTab === 'donations' ? 'Lançar Doação' : 
                     activeTab === 'beneficiaries' ? (editingId ? 'Editar Beneficiário' : 'Novo Beneficiário') : 
                     'Definir Meta'}
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
