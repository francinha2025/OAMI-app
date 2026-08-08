import React, { useState, useEffect, useMemo } from 'react';
import { 
  Landmark, 
  TrendingUp, 
  TrendingDown, 
  Wallet, 
  Receipt, 
  PlusCircle, 
  MinusCircle, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  XCircle, 
  Trash2,
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  FileText, 
  User as UserIcon, 
  CreditCard, 
  Tag, 
  Paperclip, 
  X,
  PieChart as PieChartIcon,
  BarChart3,
  RefreshCw,
  Printer,
  Heart
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  query, 
  orderBy 
} from 'firebase/firestore';
import { db } from '../firebase';
import { TreasuryReceipt, TreasuryExpense, TreasuryTransaction, User, Donor } from '../types';
import { DonorsSection } from './DonorsSection';
import { generateTreasuryReceiptPDF, generateTreasuryFinancialReportPDF } from '../lib/pdfUtils';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell 
} from 'recharts';

interface TreasurySectionProps {
  user: User;
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
  donors?: Donor[];
  initialTab?: 'overview' | 'new-revenue' | 'new-expense' | 'history' | 'reports' | 'donors';
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro em Espécie' },
  { value: 'TRANSFERENCIA', label: 'Transferência / TED / DOC' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto Bancário' },
  { value: 'OUTRO', label: 'Outra Forma' },
];

const REVENUE_CATEGORIES = [
  'Doação Física',
  'Doação On-line / PIX',
  'Mensalidade / Anuidade',
  'Evento Beneficente',
  'Convênio / Subvenção Pública',
  'Venda de Produtos / Brechó',
  'Rendimento de Aplicação',
  'Outras Receitas'
];

const EXPENSE_CATEGORIES = [
  'Pessoal / Salários e Encargos',
  'Material de Consumo / Limpeza',
  'Alimentação / Horta / Cozinha',
  'Medicamentos e Insumos de Saúde',
  'Manutenção Predial e Equipamentos',
  'Utilidades (Água, Luz, Telefone, Internet)',
  'Serviços de Terceiros / Contabilidade',
  'Impostos, Taxas e Tarifas Bancárias',
  'Outras Despesas'
];

const PIE_COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EC4899', '#8B5CF6', '#6366F1', '#14B8A6', '#F97316'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const TreasurySection: React.FC<TreasurySectionProps> = ({ user, showToast, showConfirm, donors, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'new-revenue' | 'new-expense' | 'history' | 'reports' | 'donors'>(initialTab || 'overview');
  const [localDonors, setLocalDonors] = useState<Donor[]>(donors || []);

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab);
    }
  }, [initialTab]);

  // Sync donors from props or Firestore subscription
  useEffect(() => {
    if (donors && donors.length > 0) {
      setLocalDonors(donors);
      return;
    }
    const unsub = onSnapshot(collection(db, 'donors'), (snapshot) => {
      const list: Donor[] = [];
      snapshot.forEach((docSnap) => {
        list.push({ id: docSnap.id, ...docSnap.data() } as Donor);
      });
      setLocalDonors(list);
    }, (error) => {
      console.error("Erro ao carregar doadores na tesouraria:", error);
    });
    return () => unsub();
  }, [donors]);

  // Reports Filter State
  const [reportMode, setReportMode] = useState<'MENSAL' | 'SEMESTRAL' | 'ANUAL' | 'PERSONALIZADO'>('MENSAL');
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [reportSemester, setReportSemester] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);
  const [reportStartDate, setReportStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);

  // Firestore collections state
  const [receipts, setReceipts] = useState<TreasuryReceipt[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'RECEITA' | 'DESPESA'>('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'CANCELADO'>('ATIVO');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State - Receita
  const [revenueForm, setRevenueForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'PIX',
    category: REVENUE_CATEGORIES[0],
    customCategory: '',
    description: '',
    payerName: '',
    cpf: '',
    observations: ''
  });

  // Form State - Despesa
  const [expenseForm, setExpenseForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: '',
    category: EXPENSE_CATEGORIES[0],
    customCategory: '',
    favored: '',
    paymentMethod: 'PIX',
    description: '',
    receiptUrl: '',
    observations: ''
  });

  // Selected Item for Detail / Receipt Viewer Modal
  const [selectedTransaction, setSelectedTransaction] = useState<TreasuryTransaction | null>(null);
  const [viewingReceiptTransaction, setViewingReceiptTransaction] = useState<TreasuryTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Generate a Blob URL for PDF receipt preview (prevents Edge/browser data: iframe security blocks)
  const pdfBlobUrl = useMemo(() => {
    if (!viewingReceiptTransaction?.receiptUrl) return null;
    const url = viewingReceiptTransaction.receiptUrl;
    const isPdf = url.startsWith('data:application/pdf') || url.toLowerCase().includes('.pdf');
    if (!isPdf) return null;

    try {
      if (url.startsWith('data:')) {
        const parts = url.split(',');
        if (parts.length >= 2) {
          const mimeMatch = parts[0].match(/:(.*?);/);
          const mime = mimeMatch ? mimeMatch[1] : 'application/pdf';
          const binary = atob(parts[1]);
          const array = new Uint8Array(binary.length);
          for (let i = 0; i < binary.length; i++) {
            array[i] = binary.charCodeAt(i);
          }
          const blob = new Blob([array], { type: mime });
          return URL.createObjectURL(blob);
        }
      }
      return url;
    } catch (err) {
      console.error("Erro ao converter PDF em Blob URL:", err);
      return null;
    }
  }, [viewingReceiptTransaction]);

  // Clean up Blob URL when viewing receipt changes or component unmounts
  useEffect(() => {
    return () => {
      if (pdfBlobUrl && pdfBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(pdfBlobUrl);
      }
    };
  }, [pdfBlobUrl]);

  // Real-time Firestore Subscriptions
  useEffect(() => {
    setLoading(true);
    
    // Subscribe to treasury_receipts
    const unsubscribeReceipts = onSnapshot(
      collection(db, 'treasury_receipts'),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TreasuryReceipt[];
        docs.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
        setReceipts(docs);
      },
      (err) => {
        console.error("Error listening to treasury_receipts:", err);
      }
    );

    // Subscribe to treasury_transactions
    const unsubscribeTransactions = onSnapshot(
      collection(db, 'treasury_transactions'),
      (snapshot) => {
        const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as TreasuryTransaction[];
        docs.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
        setTransactions(docs);
        setLoading(false);
      },
      (err) => {
        console.error("Error listening to treasury_transactions:", err);
        setLoading(false);
      }
    );

    return () => {
      unsubscribeReceipts();
      unsubscribeTransactions();
    };
  }, []);

  // Calculate Next Sequential Receipt Number
  const nextReceiptNumber = useMemo(() => {
    if (receipts.length === 0) return 'REC-0001';
    
    let maxNum = 0;
    receipts.forEach(r => {
      if (r.receiptNumber) {
        const matches = r.receiptNumber.match(/\d+/);
        if (matches) {
          const num = parseInt(matches[0], 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });

    return `REC-${String(maxNum + 1).padStart(4, '0')}`;
  }, [receipts]);

  // Filtered Transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // Type Filter
      if (typeFilter !== 'ALL' && t.type !== typeFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;

      // Category Filter
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;

      // Payment Filter
      if (paymentFilter !== 'ALL' && t.paymentMethod !== paymentFilter) return false;

      // Search Term
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchesPayer = t.payerOrFavored?.toLowerCase().includes(term);
        const matchesDesc = t.description?.toLowerCase().includes(term);
        const matchesReceipt = t.receiptNumber?.toLowerCase().includes(term);
        const matchesCategory = t.category?.toLowerCase().includes(term);
        if (!matchesPayer && !matchesDesc && !matchesReceipt && !matchesCategory) {
          return false;
        }
      }

      // Period Filter
      if (periodFilter === 'THIS_MONTH') {
        const now = new Date();
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!t.date.startsWith(monthStr)) return false;
      } else if (periodFilter === 'LAST_MONTH') {
        const now = new Date();
        now.setMonth(now.getMonth() - 1);
        const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
        if (!t.date.startsWith(monthStr)) return false;
      } else if (periodFilter === 'CUSTOM') {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
      }

      return true;
    });
  }, [transactions, typeFilter, statusFilter, categoryFilter, paymentFilter, searchTerm, periodFilter, startDate, endDate]);

  // Financial Summaries (Active Transactions only)
  const stats = useMemo(() => {
    const activeTx = transactions.filter(t => t.status === 'ATIVO');
    
    const totalReceitas = activeTx
      .filter(t => t.type === 'RECEITA')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const totalDespesas = activeTx
      .filter(t => t.type === 'DESPESA')
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const saldo = totalReceitas - totalDespesas;

    const totalRecibos = receipts.filter(r => r.status === 'ATIVO').length;

    return {
      totalReceitas,
      totalDespesas,
      saldo,
      totalRecibos
    };
  }, [transactions, receipts]);

  // Chart Data: Monthly Comparison
  const chartMonthlyData = useMemo(() => {
    const map: Record<string, { month: string; Receitas: number; Despesas: number }> = {};
    
    transactions.filter(t => t.status === 'ATIVO').forEach(t => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, Receitas: 0, Despesas: 0 };
      }
      if (t.type === 'RECEITA') {
        map[monthKey].Receitas += Number(t.amount) || 0;
      } else {
        map[monthKey].Despesas += Number(t.amount) || 0;
      }
    });

    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(item => ({
        ...item,
        monthLabel: item.month.split('-').reverse().join('/')
      }));
  }, [transactions]);

  // Chart Data: Category Breakdown (Receitas & Despesas)
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    
    transactions.filter(t => t.status === 'ATIVO').forEach(t => {
      const cat = t.category || 'Outros';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [transactions]);

  // Helper function to log system events
  const logSystemEvent = async (action: string, description: string, details?: any) => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        timestamp: new Date().toISOString(),
        action,
        module: 'TESOURARIA',
        description,
        userId: user.id || 'N/A',
        userName: user.name || 'Usuário',
        details: details || {}
      });
    } catch (err) {
      console.error("Error writing to system_logs:", err);
    }
  };

  // Submit Revenue (Lançar Receita)
  const handleSaveRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!revenueForm.amount || parseFloat(revenueForm.amount) <= 0) {
      showToast('Por favor, informe um valor válido.', 'error');
      return;
    }
    if (!revenueForm.payerName.trim()) {
      showToast('O nome do pagador é obrigatório.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const receiptNum = nextReceiptNumber;
      const amountVal = parseFloat(revenueForm.amount);
      const chosenCategory = revenueForm.category === 'Outras Receitas' && revenueForm.customCategory 
        ? revenueForm.customCategory 
        : revenueForm.category;

      const nowIso = new Date().toISOString();

      // 1. Create Receipt Document in treasury_receipts
      const receiptDocRef = await addDoc(collection(db, 'treasury_receipts'), {
        receiptNumber: receiptNum,
        date: revenueForm.date,
        amount: amountVal,
        paymentMethod: revenueForm.paymentMethod,
        category: chosenCategory,
        description: revenueForm.description || chosenCategory,
        payerName: revenueForm.payerName.trim(),
        cpf: revenueForm.cpf?.trim() || null,
        registeredBy: user.name,
        observations: revenueForm.observations?.trim() || null,
        createdAt: nowIso,
        status: 'ATIVO'
      });
      console.log("✅ Recibo salvo:", receiptDocRef.id);
      // 2. Create Transaction Document in treasury_transactions
      const transactionRef = await addDoc(collection(db, 'treasury_transactions'), {
        type: 'RECEITA',
        receiptId: receiptDocRef.id,
        receiptNumber: receiptNum,
        date: revenueForm.date,
        amount: amountVal,
        paymentMethod: revenueForm.paymentMethod,
        category: chosenCategory,
        description: revenueForm.description || chosenCategory,
        payerOrFavored: revenueForm.payerName.trim(),
        cpf: revenueForm.cpf?.trim() || null,
        registeredBy: user.name,
        observations: revenueForm.observations?.trim() || null,
        createdAt: nowIso,
        status: 'ATIVO'
      });
console.log("✅ Transação salva:", transactionRef.id);
      // 3. Register System Log
      await logSystemEvent(
        'LANÇAMENTO DE RECEITA',
        `Receita ${receiptNum} no valor de R$ ${amountVal.toFixed(2)} lançada para ${revenueForm.payerName}`,
        { receiptNumber: receiptNum, amount: amountVal, payer: revenueForm.payerName }
      );

      // Offer PDF download
      await generateTreasuryReceiptPDF({
        receiptNumber: receiptNum,
        date: revenueForm.date,
        amount: amountVal,
        paymentMethod: revenueForm.paymentMethod,
        category: chosenCategory,
        description: revenueForm.description || chosenCategory,
        payerName: revenueForm.payerName.trim(),
        cpf: revenueForm.cpf.trim() || undefined,
        registeredBy: user.name,
        observations: revenueForm.observations.trim() || undefined
      });

      showToast(`Receita ${receiptNum} salva e recibo em PDF gerado com sucesso!`, 'success');

      // Reset Form
      setRevenueForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'PIX',
        category: REVENUE_CATEGORIES[0],
        customCategory: '',
        description: '',
        payerName: '',
        cpf: '',
        observations: ''
      });

      setActiveTab('history');
   } catch (err: any) {
  console.error("ERRO COMPLETO:", err);
  console.error("Código:", err.code);
  console.error("Mensagem:", err.message);

  showToast(err.message, 'error');
} 
  };

  // Submit Expense (Lançar Despesa)
  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!expenseForm.amount || parseFloat(expenseForm.amount) <= 0) {
      showToast('Por favor, informe um valor válido.', 'error');
      return;
    }
    if (!expenseForm.favored.trim()) {
      showToast('O nome do favorecido é obrigatório.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const amountVal = parseFloat(expenseForm.amount);
      const chosenCategory = expenseForm.category === 'Outras Despesas' && expenseForm.customCategory 
        ? expenseForm.customCategory 
        : expenseForm.category;

      const nowIso = new Date().toISOString();

      // 1. Create Transaction Document in treasury_transactions
      await addDoc(collection(db, 'treasury_transactions'), {
        type: 'DESPESA',
        date: expenseForm.date,
        amount: amountVal,
        paymentMethod: expenseForm.paymentMethod,
        category: chosenCategory,
        description: expenseForm.description.trim(),
        payerOrFavored: expenseForm.favored.trim(),
        receiptUrl: expenseForm.receiptUrl || null,
        registeredBy: user.name,
        observations: expenseForm.observations?.trim() || null,
        createdAt: nowIso,
        status: 'ATIVO'
      });

      // 2. Register System Log
      await logSystemEvent(
        'LANÇAMENTO DE DESPESA',
        `Despesa no valor de R$ ${amountVal.toFixed(2)} lançada para ${expenseForm.favored}`,
        { amount: amountVal, favored: expenseForm.favored }
      );

      showToast('Despesa registrada com sucesso!', 'success');

      // Reset Form
      setExpenseForm({
        date: new Date().toISOString().split('T')[0],
        amount: '',
        category: EXPENSE_CATEGORIES[0],
        customCategory: '',
        favored: '',
        paymentMethod: 'PIX',
        description: '',
        receiptUrl: '',
        observations: ''
      });

      setActiveTab('history');
    } catch (err) {
      console.error("Error saving expense:", err);
      showToast('Erro ao salvar despesa. Tente novamente.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Receipt Upload Image
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        showToast('O arquivo deve ter no máximo 5MB.', 'error');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setExpenseForm(prev => ({ ...prev, receiptUrl: reader.result as string }));
        showToast('Comprovante anexado com sucesso.', 'info');
      };
      reader.readAsDataURL(file);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = (tx: TreasuryTransaction) => {
    showConfirm(
      `Deseja realmente excluir este lançamento de ${tx.type === 'RECEITA' ? 'receita' : 'despesa'} (${tx.payerOrFavored} - R$ ${Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})? Esta ação excluirá permanentemente o lançamento da Tesouraria.`,
      async () => {
        try {
          // Delete from treasury_transactions
          await deleteDoc(doc(db, 'treasury_transactions', tx.id));

          // If Receita, also delete matching document in treasury_receipts
          if (tx.receiptId) {
            await deleteDoc(doc(db, 'treasury_receipts', tx.receiptId));
          }

          // System Log
          await logSystemEvent(
            'EXCLUSÃO DE TRANSAÇÃO',
            `Transação ${tx.type} (${tx.receiptNumber || tx.id}) excluída por ${user.name}.`,
            { transactionId: tx.id }
          );

          showToast('Lançamento excluído com sucesso.', 'success');
          if (selectedTransaction?.id === tx.id) {
            setSelectedTransaction(null);
          }
        } catch (err) {
          console.error("Error deleting transaction:", err);
          showToast('Erro ao excluir lançamento.', 'error');
        }
      }
    );
  };

  // Download PDF for existing Receipt
  const handleDownloadPDF = async (tx: TreasuryTransaction) => {
    try {
      await generateTreasuryReceiptPDF({
        receiptNumber: tx.receiptNumber || 'REC-0000',
        date: tx.date,
        amount: tx.amount,
        paymentMethod: tx.paymentMethod,
        category: tx.category,
        description: tx.description,
        payerName: tx.payerOrFavored,
        cpf: tx.cpf,
        registeredBy: tx.registeredBy,
        observations: tx.observations
      });
      showToast('Recibo PDF gerado com sucesso.', 'success');
    } catch (e) {
      console.error("Error downloading receipt PDF:", e);
      showToast('Erro ao gerar PDF do recibo.', 'error');
    }
  };

  // Reports Calculations & Memos
  const reportPeriodTitleString = useMemo(() => {
    if (reportMode === 'MENSAL') {
      return `RELATÓRIO FINANCEIRO MENSAL - ${MONTH_NAMES[reportMonth - 1].toUpperCase()} / ${reportYear}`;
    } else if (reportMode === 'SEMESTRAL') {
      return `RELATÓRIO FINANCEIRO SEMESTRAL - ${reportSemester}º SEMESTRE DE ${reportYear}`;
    } else if (reportMode === 'ANUAL') {
      return `RELATÓRIO FINANCEIRO ANUAL - EXERCÍCIO DE ${reportYear}`;
    } else {
      return `RELATÓRIO FINANCEIRO PERSONALIZADO`;
    }
  }, [reportMode, reportMonth, reportYear, reportSemester]);

  const reportPeriodSubtitleString = useMemo(() => {
    if (reportMode === 'MENSAL') {
      const lastDay = new Date(reportYear, reportMonth, 0).getDate();
      return `Período: 01/${reportMonth.toString().padStart(2, '0')}/${reportYear} a ${lastDay.toString().padStart(2, '0')}/${reportMonth.toString().padStart(2, '0')}/${reportYear}`;
    } else if (reportMode === 'SEMESTRAL') {
      return reportSemester === 1 
        ? `Período: 01/01/${reportYear} a 30/06/${reportYear}`
        : `Período: 01/07/${reportYear} a 31/12/${reportYear}`;
    } else if (reportMode === 'ANUAL') {
      return `Período: 01/01/${reportYear} a 31/12/${reportYear}`;
    } else {
      const startFmt = reportStartDate ? reportStartDate.split('-').reverse().join('/') : '01/01/2026';
      const endFmt = reportEndDate ? reportEndDate.split('-').reverse().join('/') : '31/12/2026';
      return `Período: ${startFmt} a ${endFmt}`;
    }
  }, [reportMode, reportMonth, reportYear, reportSemester, reportStartDate, reportEndDate]);

  const reportTransactions = useMemo(() => {
    return transactions.filter(t => {
      if (t.status !== 'ATIVO') return false;
      if (!t.date) return false;

      const parts = t.date.split('-');
      if (parts.length < 3) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);

      if (reportMode === 'MENSAL') {
        return year === reportYear && month === reportMonth;
      } else if (reportMode === 'SEMESTRAL') {
        if (year !== reportYear) return false;
        return reportSemester === 1 ? (month >= 1 && month <= 6) : (month >= 7 && month <= 12);
      } else if (reportMode === 'ANUAL') {
        return year === reportYear;
      } else if (reportMode === 'PERSONALIZADO') {
        if (reportStartDate && t.date < reportStartDate) return false;
        if (reportEndDate && t.date > reportEndDate) return false;
        return true;
      }
      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [transactions, reportMode, reportYear, reportMonth, reportSemester, reportStartDate, reportEndDate]);

  const reportTotalRevenue = useMemo(() => {
    return reportTransactions
      .filter(t => t.type === 'RECEITA')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [reportTransactions]);

  const reportTotalExpenses = useMemo(() => {
    return reportTransactions
      .filter(t => t.type === 'DESPESA')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [reportTransactions]);

  const reportNetBalance = reportTotalRevenue - reportTotalExpenses;

  const reportCategoryBreakdown = useMemo(() => {
    const map: { [cat: string]: { category: string; type: 'RECEITA' | 'DESPESA'; total: number; count: number } } = {};

    reportTransactions.forEach(t => {
      const key = `${t.type}_${t.category}`;
      if (!map[key]) {
        map[key] = { category: t.category, type: t.type, total: 0, count: 0 };
      }
      map[key].total += Number(t.amount || 0);
      map[key].count += 1;
    });

    return Object.values(map).map(item => {
      const subtotal = item.type === 'RECEITA' ? reportTotalRevenue : reportTotalExpenses;
      const percentage = subtotal > 0 ? (item.total / subtotal) * 100 : 0;
      return { ...item, percentage };
    }).sort((a, b) => b.total - a.total);
  }, [reportTransactions, reportTotalRevenue, reportTotalExpenses]);

  const reportMonthlyBreakdown = useMemo(() => {
    if (reportMode !== 'SEMESTRAL' && reportMode !== 'ANUAL') return [];

    const monthIndices = reportMode === 'SEMESTRAL'
      ? (reportSemester === 1 ? [1, 2, 3, 4, 5, 6] : [7, 8, 9, 10, 11, 12])
      : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

    return monthIndices.map(m => {
      const mtxs = reportTransactions.filter(t => {
        const parts = t.date.split('-');
        return parseInt(parts[1], 10) === m;
      });

      const rev = mtxs.filter(t => t.type === 'RECEITA').reduce((s, t) => s + Number(t.amount || 0), 0);
      const exp = mtxs.filter(t => t.type === 'DESPESA').reduce((s, t) => s + Number(t.amount || 0), 0);

      return {
        monthLabel: `${MONTH_NAMES[m - 1]} / ${reportYear}`,
        revenue: rev,
        expense: exp,
        balance: rev - exp
      };
    });
  }, [reportTransactions, reportMode, reportSemester, reportYear]);

  const handleDownloadFinancialReportPDF = async () => {
    try {
      let periodTitleStr = '';
      let periodSubtitleStr = '';

      if (reportMode === 'MENSAL') {
        periodTitleStr = `${MONTH_NAMES[reportMonth - 1].toUpperCase()} DE ${reportYear}`;
        const lastDay = new Date(reportYear, reportMonth, 0).getDate();
        periodSubtitleStr = `Período: 01/${reportMonth.toString().padStart(2, '0')}/${reportYear} a ${lastDay.toString().padStart(2, '0')}/${reportMonth.toString().padStart(2, '0')}/${reportYear}`;
      } else if (reportMode === 'SEMESTRAL') {
        periodTitleStr = `${reportSemester}º SEMESTRE DE ${reportYear}`;
        periodSubtitleStr = reportSemester === 1 ? `Período: 01/01/${reportYear} a 30/06/${reportYear}` : `Período: 01/07/${reportYear} a 31/12/${reportYear}`;
      } else if (reportMode === 'ANUAL') {
        periodTitleStr = `EXERCÍCIO DE ${reportYear}`;
        periodSubtitleStr = `Período: 01/01/${reportYear} a 31/12/${reportYear}`;
      } else {
        periodTitleStr = `PERÍODO PERSONALIZADO`;
        periodSubtitleStr = `Período: ${reportStartDate.split('-').reverse().join('/')} a ${reportEndDate.split('-').reverse().join('/')}`;
      }

      await generateTreasuryFinancialReportPDF({
        periodTypeLabel: `RELATÓRIO FINANCEIRO ${reportMode}`,
        periodTitle: periodTitleStr,
        periodSubtitle: periodSubtitleStr,
        totalRevenue: reportTotalRevenue,
        totalExpenses: reportTotalExpenses,
        netBalance: reportNetBalance,
        transactions: reportTransactions,
        categoryBreakdown: reportCategoryBreakdown,
        monthlyBreakdown: reportMonthlyBreakdown,
        generatedBy: user.name
      });

      showToast('Relatório financeiro em PDF baixado com sucesso!', 'success');
    } catch (err) {
      console.error('Erro ao gerar relatório em PDF:', err);
      showToast('Erro ao gerar PDF do relatório financeiro.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-800 via-teal-800 to-emerald-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-700/50 relative overflow-hidden">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-6 opacity-10 pointer-events-none">
          <Landmark size={280} />
        </div>
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-400/30">
              <Landmark size={14} /> Módulo Oficial de Tesouraria
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Gestão Financeira e Controle de Caixa
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-2xl leading-relaxed">
              Lançamento de receitas, cadastro de despesas com comprovantes, emissão oficial de recibos em PDF e auditoria transparente do caixa.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('reports')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <FileText size={18} />
              Relatórios Financeiros
            </button>
            <button
              onClick={() => setActiveTab('new-revenue')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle size={18} />
              Nova Receita
            </button>
            <button
              onClick={() => setActiveTab('new-expense')}
              className="bg-rose-600 hover:bg-rose-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <MinusCircle size={18} />
              Nova Despesa
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-gray-200 dark:border-gray-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <BarChart3 size={16} />
          Visão Geral & Dashboard
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'reports'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FileText size={16} />
          Relatórios Financeiros
        </button>

        <button
          onClick={() => setActiveTab('new-revenue')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'new-revenue'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <PlusCircle size={16} className="text-emerald-500" />
          Cadastrar Receita
        </button>

        <button
          onClick={() => setActiveTab('new-expense')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'new-expense'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <MinusCircle size={16} className="text-rose-500" />
          Cadastrar Despesa
        </button>

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FileText size={16} />
          Histórico de Transações ({transactions.length})
        </button>

        <button
          onClick={() => setActiveTab('donors')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'donors'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Heart size={16} className={activeTab === 'donors' ? 'text-white' : 'text-pink-500'} />
          Doadores e Sócios ({localDonors.length})
        </button>
      </div>

      {/* OVERVIEW / DASHBOARD TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Receitas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Receitas</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.totalReceitas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Lançamentos de entrada ativos</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Total Despesas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-rose-100 dark:border-rose-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total de Despesas</p>
                <h3 className="text-2xl font-black text-rose-600 dark:text-rose-400 mt-1">
                  {stats.totalDespesas.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Saídas pagas ou registradas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
                <TrendingDown size={24} />
              </div>
            </div>

            {/* Saldo Atual */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Saldo em Caixa</p>
                <h3 className={`text-2xl font-black mt-1 ${stats.saldo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-rose-600'}`}>
                  {stats.saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Receitas líquidas menos despesas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <Wallet size={24} />
              </div>
            </div>

            {/* Total Recibos */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Recibos Emitidos</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {stats.totalRecibos}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Documentos com timbrado oficial</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                <Receipt size={24} />
              </div>
            </div>
          </div>

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - Comparison */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4 flex items-center gap-2">
                <BarChart3 className="text-emerald-600" size={18} />
                Evolução Mensal de Receitas vs Despesas
              </h3>

              {chartMonthlyData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartMonthlyData}>
                      <XAxis dataKey="monthLabel" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
                      <Tooltip 
                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, '']} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                      <Bar dataKey="Receitas" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="Despesas" fill="#EF4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 text-sm">
                  Sem dados suficientes para exibir o gráfico mensal.
                </div>
              )}
            </div>

            {/* Pie Chart - Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4 flex items-center gap-2">
                <PieChartIcon className="text-blue-600" size={18} />
                Distribuição por Categoria
              </h3>

              {categoryBreakdown.length > 0 ? (
                <div className="h-72 w-full flex items-center justify-center">
                 <ResponsiveContainer width="100%" height={280}> 
                    <PieChart>
                      <Pie
                        data={categoryBreakdown}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={40}
                        paddingAngle={4}
                      >
                        {categoryBreakdown.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Valor']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 text-sm">
                  Nenhuma categoria registrada.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Table Preview */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-white text-base">
                Últimas Transações Lançadas
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Ver Histórico Completo &rarr;
              </button>
            </div>

            {transactions.slice(0, 5).length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Tipo</th>
                      <th className="py-3 px-4">Recibo</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Pagador / Favorecido</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {transactions.slice(0, 5).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                            t.type === 'RECEITA' 
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' 
                              : 'bg-rose-50 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400'
                          }`}>
                            {t.type === 'RECEITA' ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-gray-600 dark:text-gray-300">
                          {t.receiptNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {t.date.split('-').reverse().join('/')}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800 dark:text-white">
                          {t.payerOrFavored}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                          {t.category}
                        </td>
                        <td className={`py-3 px-4 text-right font-black ${
                          t.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'RECEITA' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">
                Nenhuma transação lançada até o momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CADASTRAR RECEITA TAB */}
      {activeTab === 'new-revenue' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 dark:border-emerald-900/30 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pb-6 mb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
              <PlusCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Cadastrar Nova Receita</h2>
              <p className="text-xs text-gray-500">Lançamento oficial de entrada de recursos com emissão sequencial de recibo.</p>
            </div>
          </div>

          <form onSubmit={handleSaveRevenue} className="space-y-6">
            {/* Automatic Receipt Banner */}
            <div className="bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 p-4 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Receipt className="text-emerald-600" size={24} />
                <div>
                  <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider">Número do Recibo Automático</span>
                  <p className="text-lg font-black text-emerald-900 dark:text-emerald-200">{nextReceiptNumber}</p>
                </div>
              </div>
              <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-900/50 px-3 py-1 rounded-full">
                Sequencial Automatizado
              </span>
            </div>

            {/* Vincular Doador / Sócio Cadastrado */}
            {localDonors.length > 0 && (
              <div className="bg-emerald-50/80 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/80 space-y-2">
                <label className="text-xs font-bold text-emerald-900 dark:text-emerald-200 flex items-center gap-2">
                  <Heart size={16} className="text-pink-500" />
                  Vincular Doador / Sócio Cadastrado (Preenchimento Rápido):
                </label>
                <select
                  className="w-full bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3.5 py-2.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  onChange={(e) => {
                    const donorId = e.target.value;
                    if (!donorId) return;
                    const d = localDonors.find(item => item.id === donorId);
                    if (d) {
                      setRevenueForm(prev => ({
                        ...prev,
                        payerName: d.name,
                        amount: d.amount ? String(d.amount) : prev.amount,
                        category: d.type === 'SOCIO_MENSAL' ? 'Mensalidade / Anuidade' : 'Doação Física',
                        description: `Contribuição de ${d.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador'}: ${d.name}`
                      }));
                      showToast(`Dados de ${d.name} preenchidos na receita!`, 'info');
                    }
                  }}
                >
                  <option value="">-- Selecione para preencher os dados do doador/sócio --</option>
                  {localDonors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador Eventual'}) {d.amount ? `- R$ ${d.amount.toFixed(2)}` : ''}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Data de Recebimento *
                </label>
                <input
                  type="date"
                  required
                  value={revenueForm.date}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={revenueForm.amount}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Pagador */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Nome do Pagador / Doador *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome completo da pessoa ou empresa"
                  value={revenueForm.payerName}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, payerName: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* CPF / CNPJ */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  CPF ou CNPJ (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={revenueForm.cpf}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, cpf: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Forma de Pagamento *
                </label>
                <select
                  value={revenueForm.paymentMethod}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Categoria da Receita *
                </label>
                <select
                  value={revenueForm.category}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  {REVENUE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Category input if 'Outras Receitas' */}
            {revenueForm.category === 'Outras Receitas' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Especifique a Categoria
                </label>
                <input
                  type="text"
                  placeholder="Nome personalizado da categoria"
                  value={revenueForm.customCategory}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, customCategory: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Descrição detalhada
              </label>
              <textarea
                rows={2}
                placeholder="Breve especificação da receita ou finalidade do valor"
                value={revenueForm.description}
                onChange={(e) => setRevenueForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
              />
            </div>

            {/* Responsável (Readonly) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Responsável pelo Lançamento
                </label>
                <input
                  type="text"
                  disabled
                  value={user.name}
                  className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                />
              </div>

              {/* Observações */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Observações Adicionais
                </label>
                <input
                  type="text"
                  placeholder="Anotações internas"
                  value={revenueForm.observations}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <Printer size={16} />
                {submitting ? 'Salvando...' : 'Salvar Receita e Gerar Recibo PDF'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* CADASTRAR DESPESA TAB */}
      {activeTab === 'new-expense' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-rose-100 dark:border-rose-900/30 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pb-6 mb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-2xl bg-rose-100 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center font-bold">
              <MinusCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Cadastrar Nova Despesa</h2>
              <p className="text-xs text-gray-500">Lançamento de saídas financeiras, compras e pagamento a fornecedores.</p>
            </div>
          </div>

          <form onSubmit={handleSaveExpense} className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Data */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Data do Pagamento / Vencimento *
                </label>
                <input
                  type="date"
                  required
                  value={expenseForm.date}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Valor */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Valor (R$) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  placeholder="0,00"
                  value={expenseForm.amount}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-rose-600 focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Favorecido */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Favorecido / Fornecedor *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Razão Social ou Nome do beneficiário"
                  value={expenseForm.favored}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, favored: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>

              {/* Forma de Pagamento */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Forma de Pagamento *
                </label>
                <select
                  value={expenseForm.paymentMethod}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  {PAYMENT_METHODS.map(m => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>

              {/* Categoria */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Categoria da Despesa *
                </label>
                <select
                  value={expenseForm.category}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                >
                  {EXPENSE_CATEGORIES.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Custom Category input if 'Outras Despesas' */}
            {expenseForm.category === 'Outras Despesas' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Especifique a Categoria
                </label>
                <input
                  type="text"
                  placeholder="Nome personalizado da categoria"
                  value={expenseForm.customCategory}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, customCategory: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            )}

            {/* Descrição */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Descrição da Despesa / Nota Fiscal *
              </label>
              <textarea
                rows={2}
                required
                placeholder="Detalhe os produtos ou serviços adquiridos"
                value={expenseForm.description}
                onChange={(e) => setExpenseForm(prev => ({ ...prev, description: e.target.value }))}
                className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
              />
            </div>

            {/* Upload do Comprovante (Opcional) */}
            <div>
              <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                Comprovante / Anexo (Opcional)
              </label>
              <div className="flex items-center gap-4">
                <label className="cursor-pointer bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 px-4 py-2.5 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-200 transition-colors flex items-center gap-2">
                  <Paperclip size={16} />
                  Anexar Foto ou PDF
                  <input type="file" accept="image/*,.pdf" onChange={handleFileUpload} className="hidden" />
                </label>

                {expenseForm.receiptUrl && (
                  <div className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                    <CheckCircle2 size={16} /> Comprovante Anexado
                    <button
                      type="button"
                      onClick={() => setExpenseForm(prev => ({ ...prev, receiptUrl: '' }))}
                      className="text-gray-400 hover:text-rose-600 ml-2"
                    >
                      <X size={14} />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Responsável */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Responsável pelo Lançamento
                </label>
                <input
                  type="text"
                  disabled
                  value={user.name}
                  className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 text-gray-500 rounded-xl px-3.5 py-2.5 text-sm font-bold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Observações
                </label>
                <input
                  type="text"
                  placeholder="Anotações internas"
                  value={expenseForm.observations}
                  onChange={(e) => setExpenseForm(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="pt-4 flex justify-end gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setActiveTab('overview')}
                className="px-5 py-2.5 rounded-xl border border-gray-300 dark:border-gray-700 font-bold text-xs text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-6 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 disabled:opacity-50"
              >
                <CheckCircle2 size={16} />
                {submitting ? 'Salvando...' : 'Salvar Despesa'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* HISTÓRICO COMPLETO TAB */}
      {activeTab === 'history' && (
        <div className="space-y-4">
          {/* Filters Bar */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative flex-1">
                <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por pagador, recibo, favorecido ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Type Filter */}
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="ALL">Todos os Tipos</option>
                <option value="RECEITA">Apenas Receitas</option>
                <option value="DESPESA">Apenas Despesas</option>
              </select>

              {/* Status Filter */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="ATIVO">Lançamentos Ativos</option>
                <option value="ALL">Todos os Lançamentos</option>
              </select>

              {/* Period Filter */}
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold"
              >
                <option value="THIS_MONTH">Este Mês</option>
                <option value="LAST_MONTH">Mês Anterior</option>
                <option value="ALL">Todo o Período</option>
                <option value="CUSTOM">Personalizado</option>
              </select>
            </div>

            {/* Custom Date Range if selected */}
            {periodFilter === 'CUSTOM' && (
              <div className="flex items-center gap-3 pt-2 border-t border-gray-100 dark:border-gray-800">
                <span className="text-xs font-bold text-gray-500">De:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                />
                <span className="text-xs font-bold text-gray-500">Até:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-1.5 text-xs font-medium"
                />
              </div>
            )}
          </div>

          {/* Transactions Table */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            {filteredTransactions.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Status</th>
                      <th className="py-3.5 px-4">Tipo</th>
                      <th className="py-3.5 px-4">Recibo</th>
                      <th className="py-3.5 px-4">Data</th>
                      <th className="py-3.5 px-4">Pagador / Favorecido</th>
                      <th className="py-3.5 px-4">Categoria</th>
                      <th className="py-3.5 px-4">Pagamento</th>
                      <th className="py-3.5 px-4 text-right">Valor</th>
                      <th className="py-3.5 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {filteredTransactions.map(t => (
                      <tr 
                        key={t.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors"
                      >
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            t.status === 'ATIVO' 
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300' 
                              : 'bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 font-bold ${
                            t.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'
                          }`}>
                            {t.type === 'RECEITA' ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                            {t.type}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono font-bold text-gray-700 dark:text-gray-300">
                          {t.receiptNumber || '-'}
                        </td>
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300">
                          {t.date.split('-').reverse().join('/')}
                        </td>
                        <td className="py-3.5 px-4 font-bold text-gray-800 dark:text-white">
                          {t.payerOrFavored}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                          {t.category}
                        </td>
                        <td className="py-3.5 px-4 text-gray-500 dark:text-gray-400">
                          {t.paymentMethod}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-black ${
                          t.type === 'RECEITA' ? 'text-emerald-600' : 'text-rose-600'
                        }`}>
                          {t.type === 'RECEITA' ? '+' : '-'} {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <div className="flex items-center justify-center gap-1">
                            {/* View Detail Modal */}
                            <button
                              onClick={() => setSelectedTransaction(t)}
                              title="Visualizar Detalhes"
                              className="p-1.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"
                            >
                              <Eye size={16} />
                            </button>

                            {/* View Receipt Attachment Modal */}
                            {t.receiptUrl && (
                              <button
                                onClick={() => setViewingReceiptTransaction(t)}
                                title="Visualizar Comprovante"
                                className="p-1.5 hover:bg-blue-100 text-blue-600 dark:hover:bg-blue-900/40 dark:text-blue-400 rounded-lg transition-colors"
                              >
                                <Paperclip size={16} />
                              </button>
                            )}

                            {/* PDF Button for Receita */}
                            {t.type === 'RECEITA' && t.status === 'ATIVO' && (
                              <button
                                onClick={() => handleDownloadPDF(t)}
                                title="Baixar PDF do Recibo"
                                className="p-1.5 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors"
                              >
                                <Printer size={16} />
                              </button>
                            )}

                            {/* Delete Button */}
                            <button
                              onClick={() => handleDeleteTransaction(t)}
                              title="Excluir Lançamento"
                              className="p-1.5 hover:bg-rose-100 text-rose-600 dark:hover:bg-rose-900/40 dark:text-rose-400 rounded-lg transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-16 text-center text-gray-400 text-sm">
                Nenhum lançamento localizado com os filtros selecionados.
              </div>
            )}
          </div>
        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          {/* Report Selector Header */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-2.5 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                  <FileText size={22} />
                </span>
                <div>
                  <h2 className="text-xl font-black text-gray-800 dark:text-white">
                    Relatórios Financeiros Oficiais
                  </h2>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecione a periodicidade (Mensal, Semestral ou Anual) para emissão de balanço e prestação de contas.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 w-full md:w-auto">
              <button
                type="button"
                onClick={handleDownloadFinancialReportPDF}
                className="flex-1 md:flex-none px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center justify-center gap-2"
              >
                <Download size={18} />
                Baixar Relatório (PDF)
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="flex-1 md:flex-none px-4 py-2.5 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center justify-center gap-2"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>
          </div>

          {/* Filter & Period Selector Panel */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <label className="block text-xs font-extrabold uppercase tracking-wider text-gray-500">
              Tipo de Relatório
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setReportMode('MENSAL')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  reportMode === 'MENSAL'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Calendar size={15} /> Relatório Mensal
              </button>

              <button
                type="button"
                onClick={() => setReportMode('SEMESTRAL')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  reportMode === 'SEMESTRAL'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <BarChart3 size={15} /> Relatório Semestral
              </button>

              <button
                type="button"
                onClick={() => setReportMode('ANUAL')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  reportMode === 'ANUAL'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Landmark size={15} /> Relatório Anual
              </button>

              <button
                type="button"
                onClick={() => setReportMode('PERSONALIZADO')}
                className={`px-4 py-2.5 rounded-2xl text-xs font-bold transition-all flex items-center gap-2 ${
                  reportMode === 'PERSONALIZADO'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                <Filter size={15} /> Período Personalizado
              </button>
            </div>

            {/* Dynamic Controls based on Report Mode */}
            <div className="pt-4 border-t border-gray-100 dark:border-gray-700 flex flex-wrap items-center gap-4">
              {reportMode === 'MENSAL' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Mês de Referência</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={idx} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ano</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {reportMode === 'SEMESTRAL' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Semestre</label>
                    <select
                      value={reportSemester}
                      onChange={(e) => setReportSemester(Number(e.target.value) as 1 | 2)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={1}>1º Semestre (Jan a Jun)</option>
                      <option value={2}>2º Semestre (Jul a Dez)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ano</label>
                    <select
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {[2024, 2025, 2026, 2027, 2028].map(y => (
                        <option key={y} value={y}>{y}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {reportMode === 'ANUAL' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ano Exercício</label>
                  <select
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {[2024, 2025, 2026, 2027, 2028].map(y => (
                      <option key={y} value={y}>{y}</option>
                    ))}
                  </select>
                </div>
              )}

              {reportMode === 'PERSONALIZADO' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Data Inicial</label>
                    <input
                      type="date"
                      value={reportStartDate}
                      onChange={(e) => setReportStartDate(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Data Final</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}
            </div>
          </div>

          {/* MODERN VISUAL REPORT DISPLAY CARD */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-lg border border-gray-200 dark:border-gray-700 space-y-8 print:p-0 print:border-none print:shadow-none">
            
            {/* Header Letterhead */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center pb-6 border-b border-gray-200 dark:border-gray-700 gap-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50 dark:bg-emerald-900/40 dark:text-emerald-400 px-3 py-1 rounded-full border border-emerald-200 dark:border-emerald-800/40">
                  RELATÓRIO OFICIAL DE TESOURARIA
                </span>
                <h1 className="text-2xl font-black text-gray-900 dark:text-white mt-2">
                  {reportPeriodTitleString}
                </h1>
                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mt-1">
                  {reportPeriodSubtitleString}
                </p>
              </div>
              <div className="text-left sm:text-right">
                <p className="text-xs font-bold text-gray-800 dark:text-gray-200">
                  OBRA DE ASSISTÊNCIA AO IDOSO (OAMI)
                </p>
                <p className="text-[11px] text-gray-400">CNPJ: 10.706.425/0001-74</p>
                <p className="text-[10px] text-gray-400 mt-1">Lançamentos Processados: {reportTransactions.length}</p>
              </div>
            </div>

            {/* KPI Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Receitas */}
              <div className="bg-emerald-50/60 dark:bg-emerald-900/20 p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase">Receitas Totais</span>
                  <TrendingUp className="text-emerald-600 dark:text-emerald-400" size={18} />
                </div>
                <p className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
                  {reportTotalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 mt-1">
                  Entradas no período
                </p>
              </div>

              {/* Despesas */}
              <div className="bg-rose-50/60 dark:bg-rose-900/20 p-5 rounded-2xl border border-rose-200 dark:border-rose-800/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-300 uppercase">Despesas Totais</span>
                  <TrendingDown className="text-rose-600 dark:text-rose-400" size={18} />
                </div>
                <p className="text-2xl font-black text-rose-700 dark:text-rose-400">
                  {reportTotalExpenses.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] text-rose-600/80 dark:text-rose-400/80 mt-1">
                  Saídas no período
                </p>
              </div>

              {/* Saldo Líquido */}
              <div className={`p-5 rounded-2xl border ${
                reportNetBalance >= 0 
                  ? 'bg-blue-50/60 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800/50' 
                  : 'bg-amber-50/60 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800/50'
              }`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-gray-700 dark:text-gray-200 uppercase">Balanço do Período</span>
                  <Wallet className={reportNetBalance >= 0 ? "text-blue-600" : "text-amber-600"} size={18} />
                </div>
                <p className={`text-2xl font-black ${reportNetBalance >= 0 ? 'text-blue-700 dark:text-blue-400' : 'text-amber-700 dark:text-amber-400'}`}>
                  {reportNetBalance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
                <p className="text-[10px] text-gray-500 mt-1">
                  {reportNetBalance >= 0 ? '✓ Resultado Positivo (Superávit)' : '⚠️ Resultado Negativo (Déficit)'}
                </p>
              </div>
            </div>

            {/* Monthly Breakdown for Semestral & Anual */}
            {(reportMode === 'SEMESTRAL' || reportMode === 'ANUAL') && reportMonthlyBreakdown.length > 0 && (
              <div className="space-y-3">
                <h3 className="font-extrabold text-sm text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                  <BarChart3 size={16} className="text-emerald-600" />
                  Evolução Mês a Mês do Período
                </h3>

                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="py-3 px-4">Mês / Ano</th>
                        <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">Receitas</th>
                        <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">Despesas</th>
                        <th className="py-3 px-4 text-right">Resultado do Mês</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reportMonthlyBreakdown.map((mb, i) => (
                        <tr key={i} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                          <td className="py-2.5 px-4 font-bold text-gray-800 dark:text-gray-200">{mb.monthLabel}</td>
                          <td className="py-2.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                            {mb.revenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className="py-2.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                            {mb.expense.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                          <td className={`py-2.5 px-4 text-right font-bold ${
                            mb.balance >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-400'
                          }`}>
                            {mb.balance.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Category Breakdown Progress Bars */}
            <div className="space-y-4">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <PieChartIcon size={16} className="text-emerald-600" />
                Distribuição por Categoria
              </h3>

              {reportCategoryBreakdown.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {reportCategoryBreakdown.map((catItem, idx) => (
                    <div key={idx} className="bg-gray-50 dark:bg-gray-900/60 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 space-y-2">
                      <div className="flex justify-between items-center text-xs">
                        <div className="flex items-center gap-1.5 font-bold text-gray-800 dark:text-white">
                          <span className={`w-2 h-2 rounded-full ${catItem.type === 'RECEITA' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                          {catItem.category}
                        </div>
                        <span className="font-extrabold text-gray-900 dark:text-white">
                          {catItem.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div 
                          className={`h-full ${catItem.type === 'RECEITA' ? 'bg-emerald-500' : 'bg-rose-500'}`}
                          style={{ width: `${Math.min(catItem.percentage, 100)}%` }}
                        />
                      </div>

                      <div className="flex justify-between text-[10px] text-gray-400">
                        <span>{catItem.count} {catItem.count === 1 ? 'operação' : 'operações'}</span>
                        <span>{catItem.percentage.toFixed(1)}% do total</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400 italic">Nenhum lançamento no período selecionado.</p>
              )}
            </div>

            {/* Itemized Transactions Table */}
            <div className="space-y-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <h3 className="font-extrabold text-sm text-gray-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                <FileText size={16} className="text-emerald-600" />
                Extrato Detalhado do Período ({reportTransactions.length} registros)
              </h3>

              {reportTransactions.length > 0 ? (
                <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-600 dark:text-gray-300 font-bold border-b border-gray-200 dark:border-gray-700">
                      <tr>
                        <th className="py-3 px-4">Data</th>
                        <th className="py-3 px-4">Tipo</th>
                        <th className="py-3 px-4">Categoria</th>
                        <th className="py-3 px-4">Pagador / Favorecido</th>
                        <th className="py-3 px-4">Pagamento</th>
                        <th className="py-3 px-4 text-right">Valor</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                      {reportTransactions.map((tx) => {
                        let formattedDate = tx.date;
                        try {
                          const parts = tx.date.split('-');
                          if (parts.length === 3) formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;
                        } catch (e) {}

                        return (
                          <tr key={tx.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/20">
                            <td className="py-2.5 px-4 font-bold text-gray-700 dark:text-gray-300">{formattedDate}</td>
                            <td className="py-2.5 px-4">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                tx.type === 'RECEITA' 
                                  ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' 
                                  : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              }`}>
                                {tx.type}
                              </span>
                            </td>
                            <td className="py-2.5 px-4 text-gray-600 dark:text-gray-300 font-medium">{tx.category}</td>
                            <td className="py-2.5 px-4 text-gray-800 dark:text-gray-200 font-bold">{tx.payerOrFavored}</td>
                            <td className="py-2.5 px-4 text-gray-500 dark:text-gray-400">{tx.paymentMethod}</td>
                            <td className={`py-2.5 px-4 text-right font-black ${
                              tx.type === 'RECEITA' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'
                            }`}>
                              {tx.type === 'RECEITA' ? '+' : '-'} {Number(tx.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="py-12 text-center text-gray-400 text-xs">
                  Nenhum registro localizado para os parâmetros de período informados.
                </div>
              )}
            </div>

            {/* Footer Audit Seal */}
            <div className="pt-6 border-t border-gray-100 dark:border-gray-700/60 flex flex-col sm:flex-row justify-between items-center gap-3 text-[11px] text-gray-400">
              <div>
                Relatório gerado digitalmente em <strong>{new Date().toLocaleString('pt-BR')}</strong> por <strong>{user.name}</strong>
              </div>
              <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-bold">
                <CheckCircle2 size={14} /> Autenticidade Registrada na Tesouraria OAMI
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DETAIL MODAL */}
      {selectedTransaction && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <h3 className="font-black text-gray-800 dark:text-white text-lg flex items-center gap-2">
                <Receipt className="text-emerald-600" size={20} />
                Detalhes da Transação
              </h3>
              <button 
                onClick={() => setSelectedTransaction(null)}
                className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400"
              >
                <X size={20} />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between bg-gray-50 dark:bg-gray-900 p-3 rounded-2xl">
                <span className="font-bold text-gray-400 uppercase">Status</span>
                <span className={`font-bold ${selectedTransaction.status === 'ATIVO' ? 'text-emerald-600' : 'text-rose-600'}`}>
                  {selectedTransaction.status}
                </span>
              </div>

              {selectedTransaction.receiptNumber && (
                <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                  <span className="font-bold text-gray-400 uppercase">Recibo Nº</span>
                  <span className="font-mono font-bold text-gray-800 dark:text-white">{selectedTransaction.receiptNumber}</span>
                </div>
              )}

              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="font-bold text-gray-400 uppercase">Tipo</span>
                <span className="font-bold">{selectedTransaction.type}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="font-bold text-gray-400 uppercase">Valor</span>
                <span className="font-black text-sm text-emerald-600">
                  {Number(selectedTransaction.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
              </div>

              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="font-bold text-gray-400 uppercase">Data</span>
                <span>{selectedTransaction.date.split('-').reverse().join('/')}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="font-bold text-gray-400 uppercase">Pagador / Favorecido</span>
                <span className="font-bold">{selectedTransaction.payerOrFavored}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="font-bold text-gray-400 uppercase">Forma de Pagamento</span>
                <span>{selectedTransaction.paymentMethod}</span>
              </div>

              <div className="flex justify-between border-b border-gray-100 dark:border-gray-800 pb-2">
                <span className="font-bold text-gray-400 uppercase">Categoria</span>
                <span>{selectedTransaction.category}</span>
              </div>

              <div>
                <span className="font-bold text-gray-400 uppercase block mb-1">Descrição</span>
                <p className="bg-gray-50 dark:bg-gray-900 p-2.5 rounded-xl text-gray-700 dark:text-gray-300">
                  {selectedTransaction.description}
                </p>
              </div>

              {selectedTransaction.receiptUrl && (
                <div>
                  <span className="font-bold text-gray-400 uppercase block mb-1">Comprovante Anexado</span>
                  <button
                    type="button"
                    onClick={() => setViewingReceiptTransaction(selectedTransaction)}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                  >
                    <Paperclip size={14} /> Visualizar Comprovante
                  </button>
                </div>
              )}

              <div className="pt-2 text-[10px] text-gray-400 border-t border-gray-100 dark:border-gray-800">
                Lançado por <span className="font-bold">{selectedTransaction.registeredBy}</span> em {new Date(selectedTransaction.createdAt).toLocaleString('pt-BR')}
              </div>
            </div>

            <div className="pt-3 flex justify-end gap-2 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  const tx = selectedTransaction;
                  setSelectedTransaction(null);
                  handleDeleteTransaction(tx);
                }}
                className="px-4 py-2 bg-rose-100 dark:bg-rose-900/40 hover:bg-rose-200 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <Trash2 size={14} /> Excluir Lançamento
              </button>
              {selectedTransaction.type === 'RECEITA' && selectedTransaction.status === 'ATIVO' && (
                <button
                  onClick={() => handleDownloadPDF(selectedTransaction)}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Printer size={14} /> Baixar Recibo PDF
                </button>
              )}
              <button
                onClick={() => setSelectedTransaction(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-xl font-bold text-xs"
              >
                Fechar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* RECEIPT VIEWER MODAL */}
      {viewingReceiptTransaction && viewingReceiptTransaction.receiptUrl && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-gray-800 rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 dark:border-gray-700 flex flex-col max-h-[90vh] space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                  <Paperclip size={20} />
                </div>
                <div>
                  <h3 className="font-black text-gray-800 dark:text-white text-base sm:text-lg">
                    Comprovante da Despesa
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {viewingReceiptTransaction.payerOrFavored} • {Number(viewingReceiptTransaction.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setViewingReceiptTransaction(null)}
                className="p-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            {/* Viewer Body */}
            <div className="flex-1 overflow-auto flex items-center justify-center bg-gray-50 dark:bg-gray-900/50 p-3 sm:p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 min-h-[280px] max-h-[60vh]">
              {viewingReceiptTransaction.receiptUrl.startsWith('data:application/pdf') || viewingReceiptTransaction.receiptUrl.toLowerCase().includes('.pdf') ? (
                <div className="w-full h-full flex flex-col items-center justify-center">
                  {pdfBlobUrl ? (
                    <object
                      data={pdfBlobUrl}
                      type="application/pdf"
                      className="w-full h-[52vh] rounded-xl border border-gray-200 dark:border-gray-700"
                    >
                      <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-md my-auto">
                        <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                          <FileText size={24} />
                        </div>
                        <h4 className="font-bold text-gray-800 dark:text-white text-base mb-1">Comprovante em PDF</h4>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                          O seu navegador impede a exibição interna do PDF. Você pode baixar o arquivo e visualizar diretamente no seu dispositivo.
                        </p>
                        <button
                          type="button"
                          onClick={() => {
                            const url = pdfBlobUrl || viewingReceiptTransaction.receiptUrl!;
                            const fileName = `comprovante_${viewingReceiptTransaction.receiptNumber || viewingReceiptTransaction.id}_${viewingReceiptTransaction.date}.pdf`;
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = fileName;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                        >
                          <Download size={16} /> Baixar PDF
                        </button>
                      </div>
                    </object>
                  ) : (
                    <div className="flex flex-col items-center justify-center p-8 text-center bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm max-w-md my-auto">
                      <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-3">
                        <FileText size={24} />
                      </div>
                      <h4 className="font-bold text-gray-800 dark:text-white text-base mb-1">Comprovante em PDF</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mb-4 leading-relaxed">
                        O arquivo PDF está pronto para ser baixado.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          const url = viewingReceiptTransaction.receiptUrl!;
                          const fileName = `comprovante_${viewingReceiptTransaction.receiptNumber || viewingReceiptTransaction.id}_${viewingReceiptTransaction.date}.pdf`;
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = fileName;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                        }}
                        className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
                      >
                        <Download size={16} /> Baixar PDF
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <img
                  src={viewingReceiptTransaction.receiptUrl}
                  alt="Comprovante da Despesa"
                  className="max-h-[55vh] w-auto max-w-full object-contain rounded-xl shadow-sm"
                />
              )}
            </div>

            {/* Actions Footer */}
            <div className="pt-2 flex justify-end items-center gap-3 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => {
                  const url = pdfBlobUrl || viewingReceiptTransaction.receiptUrl!;
                  const isPdf = viewingReceiptTransaction.receiptUrl.startsWith('data:application/pdf') || viewingReceiptTransaction.receiptUrl.toLowerCase().includes('.pdf');
                  const ext = isPdf ? 'pdf' : 'png';
                  const fileName = `comprovante_${viewingReceiptTransaction.receiptNumber || viewingReceiptTransaction.id}_${viewingReceiptTransaction.date}.${ext}`;

                  const link = document.createElement('a');
                  link.href = url;
                  link.download = fileName;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Download size={16} /> Baixar
              </button>
              <button
                type="button"
                onClick={() => setViewingReceiptTransaction(null)}
                className="px-5 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 font-bold text-xs rounded-xl transition-all"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
      {/* DOADORES E SÓCIOS TAB */}
      {activeTab === 'donors' && (
        <DonorsSection donors={localDonors} showToast={showToast} />
      )}
    </div>
  );
};
