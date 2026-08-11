import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Landmark, 
  TrendingUp, 
  PlusCircle, 
  Search, 
  Download, 
  Trash2,
  Pencil,
  FileText, 
  Printer,
  Heart,
  UserCheck,
  Sparkles,
  PieChart as PieChartIcon,
  BarChart3,
  CheckCheck,
  Package,
  ShoppingBag,
  Home,
  Tv,
  Box,
  Tag,
  Gift,
  Layers,
  Filter,
  Info,
  X
} from 'lucide-react';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc,
  getDocs
} from 'firebase/firestore';
import { db } from '../firebase';
import { TreasuryReceipt, TreasuryTransaction, User, Donor, StockProduct } from '../types';
import { DonorsSection } from './DonorsSection';
import { generateTreasuryReceiptPDF, generateTreasuryFinancialReportPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { cleanData } from '../lib/utils';
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
  initialTab?: 'overview' | 'new-revenue' | 'material-donations' | 'history' | 'reports' | 'donors';
}

const PAYMENT_METHODS = [
  { value: 'PIX', label: 'PIX' },
  { value: 'DINHEIRO', label: 'Dinheiro em Espécie' },
  { value: 'TRANSFERENCIA', label: 'Transferência Bancária / TED / DOC' },
  { value: 'CARTAO_CREDITO', label: 'Cartão de Crédito' },
  { value: 'CARTAO_DEBITO', label: 'Cartão de Débito' },
  { value: 'BOLETO', label: 'Boleto Bancário' },
  { value: 'OUTRO', label: 'Outra Forma de Contribuição' },
];

const DONATION_CATEGORIES = [
  'Doação em Dinheiro (Espécie)',
  'Doação via PIX / On-line',
  'Doação Recorrente / Sócio Mensal',
  'Doação de Empresa (Pessoa Jurídica)',
  'Doação de Pessoa Física',
  'Evento Beneficente / Campanha',
  'Convênio / Subvenção Pública',
  'Outra Contribuição'
];

const MATERIAL_CATEGORIES = [
  'Alimentos e Cestas Básicas',
  'Produtos de Limpeza',
  'Higiene Pessoal e Fraldas',
  'Móveis e Utensílios Domésticos',
  'Eletrodomésticos e Eletrônicos',
  'Outros Materiais e Insumos'
];

const MATERIAL_DESTINATIONS = [
  'Cozinha e Refeitório OAMI',
  'Acolhidos e Uso Direto',
  'Limpeza, Higiene e Sede',
  'Acompanhamento e Doação para Famílias Atendidas',
  'Almoxarifado e Estoque Geral',
  'Outro Destino Especificado'
];

const STOCK_CATEGORIES = [
  'Alimentos e Nutrição',
  'Higiene e Limpeza',
  'Fraldas e Vestuário',
  'Medicamentos',
  'Enfermagem e Médico',
  'Material de Escritório',
  'Outros'
];

const STOCK_UNITS = [
  'Unidade',
  'Pacote',
  'Caixa',
  'Litro',
  'Kg',
  'Frasco',
  'Fardo',
  'Rolo',
  'Outro'
];

const mapMaterialCategoryToStockCategory = (matCat: string): string => {
  if (!matCat) return 'Alimentos e Nutrição';
  if (matCat.includes('Aliment')) return 'Alimentos e Nutrição';
  if (matCat.includes('Limpeza')) return 'Higiene e Limpeza';
  if (matCat.includes('Higiene') || matCat.includes('Fralda')) return 'Fraldas e Vestuário';
  return 'Outros';
};

const DONATION_FINALITIES = [
  'Livre Destinação da Entidade',
  'Alimentação, Cozinha e Horta',
  'Medicamentos, Fraldas e Saúde',
  'Atividades Pedagógicas e Recreativas',
  'Manutenção Predial e Infraestrutura',
  'Apoio Operacional e Serviços',
  'Outra Finalidade Especificada'
];

const PIE_COLORS = ['#10B981', '#3B82F6', '#EC4899', '#F59E0B', '#8B5CF6', '#6366F1', '#14B8A6', '#F97316'];
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];

export const TreasurySection: React.FC<TreasurySectionProps> = ({ user, showToast, showConfirm, donors, initialTab }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'new-revenue' | 'material-donations' | 'history' | 'reports' | 'donors'>(initialTab || 'overview');
  const [materialCategoryFilter, setMaterialCategoryFilter] = useState<string>('ALL');
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
    }
  }, [donors]);

  useEffect(() => {
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
  }, []);

  // Reports Filter State
  const [reportMode, setReportMode] = useState<'DIARIO' | 'MENSAL' | 'SEMESTRAL' | 'ANUAL' | 'PERSONALIZADO'>('MENSAL');
  const [reportDayDate, setReportDayDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportYear, setReportYear] = useState<number>(new Date().getFullYear());
  const [reportMonth, setReportMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [reportSemester, setReportSemester] = useState<1 | 2>(new Date().getMonth() < 6 ? 1 : 2);
  const [reportStartDate, setReportStartDate] = useState<string>(`${new Date().getFullYear()}-01-01`);
  const [reportEndDate, setReportEndDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [reportDonorFilter, setReportDonorFilter] = useState<string>('ALL');
  const [reportTypeFilter, setReportTypeFilter] = useState<string>('ALL');

  // Firestore collections state
  const [receipts, setReceipts] = useState<TreasuryReceipt[]>([]);
  const [transactions, setTransactions] = useState<TreasuryTransaction[]>([]);
  const [stockProducts, setStockProducts] = useState<StockProduct[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [paymentFilter, setPaymentFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ATIVO' | 'CANCELADO'>('ATIVO');
  const [periodFilter, setPeriodFilter] = useState<'ALL' | 'THIS_MONTH' | 'LAST_MONTH' | 'CUSTOM'>('THIS_MONTH');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Form State - Cadastrar Doação / Receita
  const [revenueForm, setRevenueForm] = useState({
    donationKind: 'FINANCIAL' as 'FINANCIAL' | 'MATERIAL',
    selectedDonorId: '',
    date: new Date().toISOString().split('T')[0],
    amount: '',
    paymentMethod: 'PIX',
    category: DONATION_CATEGORIES[1], // Doação via PIX / On-line
    customCategory: '',
    donationType: 'EVENTUAL' as 'EVENTUAL' | 'RECORRENTE' | 'EMPRESA' | 'PESSOA_FISICA' | 'OUTRA',
    finality: DONATION_FINALITIES[0], // Livre Destinação
    materialCategory: MATERIAL_CATEGORIES[0], // Alimentos e Cestas Básicas
    itemDetails: '',
    quantityOrVolume: '',
    itemCondition: 'Novo / Lacrado',
    estimatedValue: '',
    destination: MATERIAL_DESTINATIONS[0],
    description: '',
    payerName: '',
    cpf: '',
    email: '',
    phone: '',
    observations: '',
    saveAsDonor: true,
    // Stock Integration fields
    addToStock: true,
    stockProductId: 'NEW',
    stockProductName: '',
    stockProductCategory: 'Alimentos e Nutrição',
    stockProductUnit: 'Unidade',
    stockQuantity: '1',
    stockMinQuantity: '5'
  });

  const [selectedTransaction, setSelectedTransaction] = useState<TreasuryTransaction | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Edit Transaction Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<TreasuryTransaction | null>(null);
  const [editForm, setEditForm] = useState({
    payerName: '',
    cpf: '',
    date: '',
    amount: '',
    donationKind: 'FINANCIAL' as 'FINANCIAL' | 'MATERIAL',
    materialCategory: MATERIAL_CATEGORIES[0],
    itemDetails: '',
    quantityOrVolume: '',
    itemCondition: 'Em bom estado',
    destination: MATERIAL_DESTINATIONS[0],
    category: DONATION_CATEGORIES[0],
    paymentMethod: 'PIX',
    observations: ''
  });

  // Real-time Firestore Subscriptions for Donations & Stock
  useEffect(() => {
    setLoading(true);
    
    // 1. Subscribe to treasury_receipts
    const unsubscribeReceipts = onSnapshot(
      collection(db, 'treasury_receipts'),
      (snapshot) => {
        const docs = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as TreasuryReceipt[];
        docs.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || a.date || ''));
        setReceipts(docs);
      },
      (err) => console.error("Error listening to treasury_receipts:", err)
    );

    // 2. Subscribe to treasury_transactions (Donations & Contributions)
    const unsubscribeTreasuryTx = onSnapshot(
      collection(db, 'treasury_transactions'),
      (snapshot) => {
        const docs = snapshot.docs.map(docSnap => ({ 
          id: docSnap.id, 
          ...docSnap.data() 
        })) as TreasuryTransaction[];
        
        // Filter strictly for RECEITA / Doações
        const donationsOnly = docs.filter(t => t.type === 'RECEITA' || t.isDonation !== false);
        donationsOnly.sort((a, b) => (b.createdAt || b.date || '').localeCompare(a.createdAt || b.date || ''));
        
        setTransactions(donationsOnly);
        setLoading(false);
      },
      (err) => console.error("Error listening to treasury_transactions:", err)
    );

    // 3. Subscribe to stock_products for Stock Linkage
    const unsubscribeStock = onSnapshot(
      collection(db, 'stock_products'),
      (snapshot) => {
        const list = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() })) as StockProduct[];
        list.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
        setStockProducts(list);
      },
      (err) => console.error("Error listening to stock_products:", err)
    );

    return () => {
      unsubscribeReceipts();
      unsubscribeTreasuryTx();
      unsubscribeStock();
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

  // Lista de transações desduplicada para exibição perfeita
  const uniqueTransactions = useMemo(() => {
    const seenReceipts = new Set<string>();
    const seenContent = new Set<string>();

    return transactions.filter(t => {
      if (t.receiptNumber) {
        if (seenReceipts.has(t.receiptNumber)) return false;
        seenReceipts.add(t.receiptNumber);
      }

      const payerClean = (t.payerOrFavored || '').toLowerCase().trim();
      const contentKey = `${payerClean}_${t.date}_${t.amount}_${t.category}`;
      if (seenContent.has(contentKey)) return false;
      seenContent.add(contentKey);

      return true;
    });
  }, [transactions]);

  // Função para remover registros duplicados permanentemente do Firestore
  const cleaningRef = useRef(false);
  const handleCleanDuplicates = async (silent: boolean = false) => {
    if (cleaningRef.current) return;
    cleaningRef.current = true;
    try {
      const txSnap = await getDocs(collection(db, 'treasury_transactions'));
      const recSnap = await getDocs(collection(db, 'treasury_receipts'));

      const allTxs = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));
      const allRecs = recSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      const seenReceiptNumbers = new Set<string>();
      const seenContentKeys = new Set<string>();

      const duplicateTxIdsToDelete: string[] = [];
      const duplicateRecIdsToDelete: string[] = [];

      allTxs.sort((a: any, b: any) => (a.createdAt || a.date || '').localeCompare(b.createdAt || b.date || ''));

      for (const tx of allTxs as any[]) {
        let isDuplicate = false;

        if (tx.receiptNumber) {
          if (seenReceiptNumbers.has(tx.receiptNumber)) {
            isDuplicate = true;
          } else {
            seenReceiptNumbers.add(tx.receiptNumber);
          }
        }

        const payerClean = (tx.payerOrFavored || '').toLowerCase().trim();
        const contentKey = `${payerClean}_${tx.date}_${tx.amount}_${tx.category}`;
        if (seenContentKeys.has(contentKey)) {
          isDuplicate = true;
        } else {
          seenContentKeys.add(contentKey);
        }

        if (isDuplicate) {
          duplicateTxIdsToDelete.push(tx.id);
          if (tx.receiptId) {
            duplicateRecIdsToDelete.push(tx.receiptId);
          }
        }
      }

      const recSeenNumbers = new Set<string>();
      const recSeenContent = new Set<string>();
      for (const rec of allRecs as any[]) {
        let isDup = false;
        if (rec.receiptNumber) {
          if (recSeenNumbers.has(rec.receiptNumber)) {
            isDup = true;
          } else {
            recSeenNumbers.add(rec.receiptNumber);
          }
        }
        const payerClean = (rec.payerName || '').toLowerCase().trim();
        const contentKey = `${payerClean}_${rec.date}_${rec.amount}_${rec.category}`;
        if (recSeenContent.has(contentKey)) {
          isDup = true;
        } else {
          recSeenContent.add(contentKey);
        }

        if (isDup) {
          duplicateRecIdsToDelete.push(rec.id);
        }
      }

      const uniqueTxIds = Array.from(new Set(duplicateTxIdsToDelete));
      const uniqueRecIds = Array.from(new Set(duplicateRecIdsToDelete));

      for (const txId of uniqueTxIds) {
        await deleteDoc(doc(db, 'treasury_transactions', txId));
      }
      for (const recId of uniqueRecIds) {
        await deleteDoc(doc(db, 'treasury_receipts', recId));
      }

      if (uniqueTxIds.length > 0 || uniqueRecIds.length > 0) {
        if (!silent) {
          showToast(`${uniqueTxIds.length} lançamento(s) duplicado(s) foram removidos da Tesouraria!`, 'success');
        }
      } else if (!silent) {
        showToast('Nenhum lançamento duplicado foi encontrado.', 'info');
      }
    } catch (err) {
      console.error('Erro ao limpar duplicados:', err);
      if (!silent) showToast('Erro ao limpar lançamentos duplicados.', 'error');
    } finally {
      cleaningRef.current = false;
    }
  };

  // Limpeza automática ao carregar registros duplicados no banco
  const cleanedOnceRef = useRef(false);
  useEffect(() => {
    if (transactions.length > 0 && !cleanedOnceRef.current) {
      cleanedOnceRef.current = true;
      handleCleanDuplicates(true);
    }
  }, [transactions]);

  // Filtered Transactions for History Tab
  const filteredTransactions = useMemo(() => {
    return uniqueTransactions.filter(t => {
      if (statusFilter !== 'ALL' && t.status !== statusFilter) return false;
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      if (paymentFilter !== 'ALL' && t.paymentMethod !== paymentFilter) return false;

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
  }, [uniqueTransactions, statusFilter, categoryFilter, paymentFilter, searchTerm, periodFilter, startDate, endDate]);

  // Core Metrics & Statistics for Dashboard
  const stats = useMemo(() => {
    const activeTx = uniqueTransactions.filter(t => t.status === 'ATIVO');
    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    // Total Doações (Receitas)
    const donationsTx = activeTx.filter(t => t.type === 'RECEITA');
    const totalDonations = donationsTx.reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Doações do Mês
    const monthDonations = donationsTx
      .filter(t => t.date?.startsWith(currentMonthStr))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Doações Recorrentes (Sócios Mensais)
    const recurringDonations = donationsTx
      .filter(t => t.donationType === 'RECORRENTE' || t.category.includes('Sócio') || t.category.includes('Mensalidade'))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    // Doações Eventuais (Avulsas)
    const eventualDonations = donationsTx
      .filter(t => t.donationType === 'EVENTUAL' || (!t.category.includes('Sócio') && !t.category.includes('Mensalidade')))
      .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

    const activeDonorsCount = localDonors.filter(d => d.status === 'ATIVO').length;
    const monthlyDonorsCount = localDonors.filter(d => d.status === 'ATIVO' && d.type === 'SOCIO_MENSAL').length;

    const avgDonation = donationsTx.length > 0 ? totalDonations / donationsTx.length : 0;

    return {
      totalDonations,
      monthDonations,
      recurringDonations,
      eventualDonations,
      avgDonation,
      activeDonorsCount,
      monthlyDonorsCount,
      totalReceipts: receipts.filter(r => r.status === 'ATIVO').length
    };
  }, [uniqueTransactions, receipts, localDonors]);

  // Chart Data: Monthly Donations Evolution
  const chartMonthlyData = useMemo(() => {
    const map: Record<string, { month: string; Doações: number }> = {};
    
    uniqueTransactions.filter(t => t.status === 'ATIVO' && t.type === 'RECEITA').forEach(t => {
      const monthKey = t.date.substring(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        map[monthKey] = { month: monthKey, Doações: 0 };
      }
      map[monthKey].Doações += Number(t.amount) || 0;
    });

    return Object.values(map)
      .sort((a, b) => a.month.localeCompare(b.month))
      .slice(-6)
      .map(item => ({
        ...item,
        monthLabel: item.month.split('-').reverse().join('/')
      }));
  }, [uniqueTransactions]);

  // Chart Data: Donation Category Breakdown
  const categoryBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    
    uniqueTransactions.filter(t => t.status === 'ATIVO' && t.type === 'RECEITA').forEach(t => {
      const cat = t.category || 'Outras Doações';
      map[cat] = (map[cat] || 0) + (Number(t.amount) || 0);
    });

    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [uniqueTransactions]);

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

  // Submit Revenue / Donation
  const handleSaveRevenue = async (e: React.FormEvent) => {
    e.preventDefault();
    const isMaterial = revenueForm.donationKind === 'MATERIAL';

    let amountVal = 0;
    if (isMaterial) {
      amountVal = parseFloat(revenueForm.estimatedValue) || 0;
      if (!revenueForm.payerName.trim()) {
        showToast('O nome do doador é obrigatório.', 'error');
        return;
      }
      if (!revenueForm.itemDetails.trim() && !revenueForm.materialCategory) {
        showToast('Informe a descrição dos itens ou a categoria do material.', 'error');
        return;
      }
    } else {
      amountVal = parseFloat(revenueForm.amount);
      if (isNaN(amountVal) || amountVal <= 0) {
        showToast('Por favor, informe um valor de doação válido.', 'error');
        return;
      }
      if (!revenueForm.payerName.trim()) {
        showToast('O nome do doador/pagador é obrigatório.', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      const receiptNum = nextReceiptNumber;
      const chosenCategory = isMaterial
        ? revenueForm.materialCategory
        : (revenueForm.category === 'Outra Contribuição' && revenueForm.customCategory ? revenueForm.customCategory : revenueForm.category);

      const nowIso = new Date().toISOString();

      // 1. Create Receipt Document in treasury_receipts
      const receiptDocRef = await addDoc(collection(db, 'treasury_receipts'), {
        receiptNumber: receiptNum,
        date: revenueForm.date,
        amount: amountVal,
        paymentMethod: isMaterial ? 'DOACAO_EM_BENS' : revenueForm.paymentMethod,
        category: chosenCategory,
        description: isMaterial 
          ? (revenueForm.itemDetails.trim() || `Doação de materiais: ${chosenCategory}`)
          : (revenueForm.description || `Doação de ${revenueForm.payerName.trim()} - Casa OAMI`),
        payerName: revenueForm.payerName.trim(),
        cpf: revenueForm.cpf?.trim() || null,
        registeredBy: user.name,
        observations: revenueForm.observations?.trim() || null,
        createdAt: nowIso,
        status: 'ATIVO',
        donorId: revenueForm.selectedDonorId || null,
        donationType: revenueForm.donationType,
        finality: isMaterial ? revenueForm.destination : revenueForm.finality,
        donationKind: revenueForm.donationKind,
        materialCategory: isMaterial ? revenueForm.materialCategory : null,
        itemDetails: isMaterial ? revenueForm.itemDetails.trim() : null,
        quantityOrVolume: isMaterial ? revenueForm.quantityOrVolume.trim() : null,
        itemCondition: isMaterial ? revenueForm.itemCondition : null,
        estimatedValue: isMaterial ? amountVal : null,
        destination: isMaterial ? revenueForm.destination : null
      });

      // 2. Create Transaction Document in treasury_transactions
      await addDoc(collection(db, 'treasury_transactions'), {
        type: 'RECEITA',
        receiptId: receiptDocRef.id,
        receiptNumber: receiptNum,
        date: revenueForm.date,
        amount: amountVal,
        paymentMethod: isMaterial ? 'DOACAO_EM_BENS' : revenueForm.paymentMethod,
        category: chosenCategory,
        description: isMaterial 
          ? (revenueForm.itemDetails.trim() || `Doação de materiais: ${chosenCategory}`)
          : (revenueForm.description || `Doação de ${revenueForm.payerName.trim()} - Casa OAMI`),
        payerOrFavored: revenueForm.payerName.trim(),
        cpf: revenueForm.cpf?.trim() || null,
        registeredBy: user.name,
        observations: revenueForm.observations?.trim() || null,
        createdAt: nowIso,
        status: 'ATIVO',
        donorId: revenueForm.selectedDonorId || null,
        donationType: revenueForm.donationType,
        finality: isMaterial ? revenueForm.destination : revenueForm.finality,
        isDonation: true,
        donationKind: revenueForm.donationKind,
        materialCategory: isMaterial ? revenueForm.materialCategory : null,
        itemDetails: isMaterial ? revenueForm.itemDetails.trim() : null,
        quantityOrVolume: isMaterial ? revenueForm.quantityOrVolume.trim() : null,
        itemCondition: isMaterial ? revenueForm.itemCondition : null,
        estimatedValue: isMaterial ? amountVal : null,
        destination: isMaterial ? revenueForm.destination : null
      });

      // 3. Update or Add Donor record if requested or linked
      if (revenueForm.selectedDonorId) {
        const existingDonor = localDonors.find(d => d.id === revenueForm.selectedDonorId);
        if (existingDonor) {
          const newTotal = (existingDonor.totalDonated || 0) + amountVal;
          const newCount = (existingDonor.donationCount || 0) + 1;
          await updateDoc(doc(db, 'donors', existingDonor.id), {
            totalDonated: newTotal,
            donationCount: newCount,
            lastDonationDate: revenueForm.date,
            updatedAt: nowIso
          });
        }
      } else if (revenueForm.saveAsDonor && revenueForm.payerName.trim()) {
        const newDonorData = cleanData({
          name: revenueForm.payerName.trim(),
          email: revenueForm.email.trim() || null,
          phone: revenueForm.phone.trim() || null,
          type: revenueForm.donationType === 'RECORRENTE' ? 'SOCIO_MENSAL' : 'DOADOR',
          amount: revenueForm.donationType === 'RECORRENTE' ? amountVal : 0,
          status: 'ATIVO',
          startDate: revenueForm.date,
          cpfOrCnpj: revenueForm.cpf.trim() || null,
          totalDonated: amountVal,
          donationCount: 1,
          lastDonationDate: revenueForm.date,
          createdAt: nowIso
        });
        await addDoc(collection(db, 'donors'), newDonorData);
      }

      // 3.5. Automatic Entry into Stock if requested for Material Donations
      let stockEntrySummary = '';
      if (isMaterial && revenueForm.addToStock) {
        const qtyToAdd = parseFloat(revenueForm.stockQuantity) || 1;
        if (qtyToAdd > 0) {
          if (revenueForm.stockProductId === 'NEW') {
            const prodName = revenueForm.stockProductName.trim() || revenueForm.itemDetails.trim() || revenueForm.materialCategory;
            const newProdCode = `EST-${Math.floor(100000 + Math.random() * 900000)}`;
            const newStockDoc = await addDoc(collection(db, 'stock_products'), {
              name: prodName,
              category: revenueForm.stockProductCategory || mapMaterialCategoryToStockCategory(revenueForm.materialCategory),
              code: newProdCode,
              unit: revenueForm.stockProductUnit || 'Unidade',
              quantity: qtyToAdd,
              minQuantity: parseFloat(revenueForm.stockMinQuantity) || 5,
              location: revenueForm.destination || 'Almoxarifado Geral',
              supplier: `Doador: ${revenueForm.payerName.trim()}`,
              unitPrice: amountVal > 0 && qtyToAdd > 0 ? amountVal / qtyToAdd : 0,
              status: 'ATIVO',
              createdAt: nowIso,
              updatedAt: nowIso,
              createdBy: user.name
            });

            await addDoc(collection(db, 'stock_movements'), {
              productId: newStockDoc.id,
              productName: prodName,
              productCode: newProdCode,
              type: 'ENTRADA',
              quantity: qtyToAdd,
              stockBefore: 0,
              stockAfter: qtyToAdd,
              supplier: `Doador: ${revenueForm.payerName.trim()}`,
              responsible: user.name,
              notes: `Entrada via Doação de Material (Recibo #${receiptNum}) - ${revenueForm.itemDetails || prodName}`,
              date: revenueForm.date,
              timestamp: nowIso,
              origin: 'DOACAO',
              estimatedValue: amountVal,
              donorName: revenueForm.payerName.trim(),
              financialTransactionId: receiptDocRef.id
            });
            stockEntrySummary = ` (Com entrada automática no Estoque: +${qtyToAdd} ${revenueForm.stockProductUnit || 'unidades'} em "${prodName}")`;
          } else {
            const targetProd = stockProducts.find(p => p.id === revenueForm.stockProductId);
            if (targetProd) {
              const stockBefore = targetProd.quantity || 0;
              const stockAfter = stockBefore + qtyToAdd;

              await updateDoc(doc(db, 'stock_products', targetProd.id), {
                quantity: stockAfter,
                updatedAt: nowIso
              });

              await addDoc(collection(db, 'stock_movements'), {
                productId: targetProd.id,
                productName: targetProd.name,
                productCode: targetProd.code || 'EST-000',
                type: 'ENTRADA',
                quantity: qtyToAdd,
                stockBefore: stockBefore,
                stockAfter: stockAfter,
                supplier: `Doador: ${revenueForm.payerName.trim()}`,
                responsible: user.name,
                notes: `Entrada via Doação de Material (Recibo #${receiptNum}) - ${revenueForm.itemDetails || targetProd.name}`,
                date: revenueForm.date,
                timestamp: nowIso,
                origin: 'DOACAO',
                estimatedValue: amountVal,
                donorName: revenueForm.payerName.trim(),
                financialTransactionId: receiptDocRef.id
              });
              stockEntrySummary = ` (Com entrada automática no Estoque: +${qtyToAdd} ${targetProd.unit} em "${targetProd.name}")`;
            }
          }
        }
      }

      // 4. System Log
      await logSystemEvent(
        isMaterial ? 'LANÇAMENTO DE DOAÇÃO DE MATERIAL' : 'LANÇAMENTO DE DOAÇÃO',
        isMaterial
          ? `Doação de material (${chosenCategory}) ${receiptNum} registrada para ${revenueForm.payerName.trim()}${stockEntrySummary}`
          : `Doação ${receiptNum} de R$ ${amountVal.toFixed(2)} registrada para ${revenueForm.payerName.trim()}`,
        { receiptNumber: receiptNum, amount: amountVal, donor: revenueForm.payerName.trim(), donationKind: revenueForm.donationKind }
      );

      // 5. Generate PDF Receipt
      await generateTreasuryReceiptPDF({
        receiptNumber: receiptNum,
        date: revenueForm.date,
        amount: amountVal,
        paymentMethod: isMaterial ? 'Doação em Bens/Insumos' : revenueForm.paymentMethod,
        category: chosenCategory,
        description: isMaterial ? revenueForm.itemDetails.trim() : (revenueForm.description || `Doação - Casa OAMI (${revenueForm.finality})`),
        payerName: revenueForm.payerName.trim(),
        cpf: revenueForm.cpf.trim() || undefined,
        registeredBy: user.name,
        observations: revenueForm.observations.trim() || undefined,
        donationKind: revenueForm.donationKind,
        itemDetails: revenueForm.itemDetails.trim(),
        quantityOrVolume: revenueForm.quantityOrVolume.trim(),
        itemCondition: revenueForm.itemCondition,
        destination: revenueForm.destination
      });

      showToast(`Doação ${receiptNum} registrada com sucesso e recibo PDF gerado!`, 'success');

      // Reset Form
      setRevenueForm({
        donationKind: 'FINANCIAL',
        selectedDonorId: '',
        date: new Date().toISOString().split('T')[0],
        amount: '',
        paymentMethod: 'PIX',
        category: DONATION_CATEGORIES[1],
        customCategory: '',
        donationType: 'EVENTUAL',
        finality: DONATION_FINALITIES[0],
        materialCategory: MATERIAL_CATEGORIES[0],
        itemDetails: '',
        quantityOrVolume: '',
        itemCondition: 'Novo / Lacrado',
        estimatedValue: '',
        destination: MATERIAL_DESTINATIONS[0],
        description: '',
        payerName: '',
        cpf: '',
        email: '',
        phone: '',
        observations: '',
        saveAsDonor: true,
        addToStock: true,
        stockProductId: 'NEW',
        stockProductName: '',
        stockProductCategory: 'Alimentos e Nutrição',
        stockProductUnit: 'Unidade',
        stockQuantity: '1',
        stockMinQuantity: '5'
      });

      if (isMaterial) {
        setActiveTab('material-donations');
      } else {
        setActiveTab('history');
      }
    } catch (err: any) {
      console.error("Erro ao salvar doação:", err);
      showToast(err.message || 'Erro ao registrar doação.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Delete Transaction
  const handleDeleteTransaction = (tx: TreasuryTransaction) => {
    showConfirm(
      `Deseja realmente excluir este lançamento de doação (${tx.payerOrFavored} - R$ ${Number(tx.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })})? Esta ação removerá o registro da Tesouraria.`,
      async () => {
        try {
          await deleteDoc(doc(db, 'treasury_transactions', tx.id));
          if (tx.receiptId) {
            await deleteDoc(doc(db, 'treasury_receipts', tx.receiptId));
          } else if (tx.receiptNumber) {
            const matchingReceipt = receipts.find(r => r.receiptNumber === tx.receiptNumber);
            if (matchingReceipt) {
              await deleteDoc(doc(db, 'treasury_receipts', matchingReceipt.id));
            }
          }

          await logSystemEvent(
            'EXCLUSÃO DE TRANSAÇÃO',
            `Transação de Doação (${tx.receiptNumber || tx.id}) excluída por ${user.name}.`,
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

  // Open Edit Modal
  const handleOpenEditModal = (t: TreasuryTransaction) => {
    setEditingTransaction(t);
    const isMat = t.donationKind === 'MATERIAL' || t.paymentMethod === 'DOACAO_EM_BENS';
    setEditForm({
      payerName: t.payerOrFavored || '',
      cpf: t.cpf || '',
      date: t.date || new Date().toISOString().split('T')[0],
      amount: String(t.estimatedValue || t.amount || ''),
      donationKind: isMat ? 'MATERIAL' : 'FINANCIAL',
      materialCategory: t.materialCategory || t.category || MATERIAL_CATEGORIES[0],
      itemDetails: t.itemDetails || t.description || '',
      quantityOrVolume: t.quantityOrVolume || '',
      itemCondition: t.itemCondition || 'Em bom estado',
      destination: t.destination || t.finality || MATERIAL_DESTINATIONS[0],
      category: t.category || (isMat ? 'Doações em Bens/Materiais' : DONATION_CATEGORIES[0]),
      paymentMethod: t.paymentMethod || 'PIX',
      observations: t.observations || ''
    });
    setIsEditModalOpen(true);
  };

  // Save Edited Transaction
  const handleSaveEditedTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTransaction) return;

    if (!editForm.payerName.trim()) {
      showToast('Por favor, informe o nome do doador/contribuinte.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const isMat = editForm.donationKind === 'MATERIAL';
      const amountVal = parseFloat(editForm.amount) || 0;

      const updatedData: Partial<TreasuryTransaction> = {
        payerOrFavored: editForm.payerName.trim(),
        cpf: editForm.cpf.trim() || null,
        date: editForm.date,
        amount: amountVal,
        paymentMethod: isMat ? 'DOACAO_EM_BENS' : editForm.paymentMethod,
        category: isMat ? (editForm.materialCategory || 'Doações em Bens/Materiais') : editForm.category,
        description: isMat
          ? (editForm.itemDetails.trim() || `Doação de materiais: ${editForm.materialCategory}`)
          : `Doação de ${editForm.payerName.trim()}`,
        donationKind: editForm.donationKind,
        materialCategory: isMat ? editForm.materialCategory : null,
        itemDetails: isMat ? editForm.itemDetails.trim() : null,
        quantityOrVolume: isMat ? editForm.quantityOrVolume.trim() : null,
        itemCondition: isMat ? editForm.itemCondition : null,
        estimatedValue: isMat ? amountVal : null,
        destination: isMat ? editForm.destination : null,
        finality: isMat ? editForm.destination : undefined,
        observations: editForm.observations?.trim() || null,
      };

      // 1. Update treasury_transactions
      await updateDoc(doc(db, 'treasury_transactions', editingTransaction.id), cleanData(updatedData));

      // 2. Update matching receipt if present
      if (editingTransaction.receiptId) {
        await updateDoc(doc(db, 'treasury_receipts', editingTransaction.receiptId), cleanData({
          payerName: editForm.payerName.trim(),
          cpf: editForm.cpf.trim() || null,
          date: editForm.date,
          amount: amountVal,
          paymentMethod: isMat ? 'DOACAO_EM_BENS' : editForm.paymentMethod,
          category: isMat ? (editForm.materialCategory || 'Doações em Bens/Materiais') : editForm.category,
          description: isMat ? (editForm.itemDetails.trim() || `Doação de materiais: ${editForm.materialCategory}`) : `Doação de ${editForm.payerName.trim()}`,
          donationKind: editForm.donationKind,
          materialCategory: isMat ? editForm.materialCategory : null,
          itemDetails: isMat ? editForm.itemDetails.trim() : null,
          quantityOrVolume: isMat ? editForm.quantityOrVolume.trim() : null,
          itemCondition: isMat ? editForm.itemCondition : null,
          estimatedValue: isMat ? amountVal : null,
          destination: isMat ? editForm.destination : null,
          observations: editForm.observations?.trim() || null,
        }));
      }

      await logSystemEvent(
        'EDIÇÃO DE TRANSAÇÃO',
        `Lançamento de Doação (${editingTransaction.receiptNumber || editingTransaction.id}) editado por ${user.name}.`,
        { transactionId: editingTransaction.id }
      );

      showToast('Lançamento de doação atualizado com sucesso!', 'success');
      setIsEditModalOpen(false);
      setEditingTransaction(null);
    } catch (err: any) {
      console.error('Erro ao editar doação:', err);
      showToast('Erro ao salvar alterações da doação: ' + (err.message || ''), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Download PDF for existing Receipt
  const handleDownloadPDF = async (tx: TreasuryTransaction) => {
    try {
      const isMat = tx.donationKind === 'MATERIAL' || !!tx.materialCategory;
      await generateTreasuryReceiptPDF({
        receiptNumber: tx.receiptNumber || 'REC-0000',
        date: tx.date,
        amount: Number(tx.estimatedValue || tx.amount) || 0,
        paymentMethod: isMat ? 'Doação em Bens/Insumos' : tx.paymentMethod,
        category: tx.category,
        description: tx.description,
        payerName: tx.payerOrFavored,
        cpf: tx.cpf,
        registeredBy: tx.registeredBy,
        observations: tx.observations,
        donationKind: isMat ? 'MATERIAL' : 'FINANCIAL',
        itemDetails: tx.itemDetails || tx.description,
        quantityOrVolume: tx.quantityOrVolume,
        itemCondition: tx.itemCondition,
        destination: tx.destination || tx.finality
      });
      showToast('Recibo de doação em PDF gerado com sucesso.', 'success');
    } catch (e) {
      console.error("Error downloading receipt PDF:", e);
      showToast('Erro ao gerar PDF do recibo.', 'error');
    }
  };

  // Reports Calculations & Memos
  const reportPeriodTitleString = useMemo(() => {
    if (reportMode === 'DIARIO') {
      const dayFmt = reportDayDate ? reportDayDate.split('-').reverse().join('/') : '';
      return `RELATÓRIO DIÁRIO DE DOAÇÕES - ${dayFmt}`;
    } else if (reportMode === 'MENSAL') {
      return `RELATÓRIO MENSAL DE DOAÇÕES - ${MONTH_NAMES[reportMonth - 1].toUpperCase()} / ${reportYear}`;
    } else if (reportMode === 'SEMESTRAL') {
      return `RELATÓRIO SEMESTRAL DE DOAÇÕES - ${reportSemester}º SEMESTRE DE ${reportYear}`;
    } else if (reportMode === 'ANUAL') {
      return `RELATÓRIO ANUAL DE DOAÇÕES - EXERCÍCIO DE ${reportYear}`;
    } else {
      return `RELATÓRIO DE DOAÇÕES PERSONALIZADO`;
    }
  }, [reportMode, reportDayDate, reportMonth, reportYear, reportSemester]);

  const reportPeriodSubtitleString = useMemo(() => {
    if (reportMode === 'DIARIO') {
      const dayFmt = reportDayDate ? reportDayDate.split('-').reverse().join('/') : '';
      return `Período: ${dayFmt}`;
    } else if (reportMode === 'MENSAL') {
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
  }, [reportMode, reportDayDate, reportMonth, reportYear, reportSemester, reportStartDate, reportEndDate]);

  const reportTransactions = useMemo(() => {
    return uniqueTransactions.filter(t => {
      if (t.status !== 'ATIVO') return false;
      if (!t.date) return false;

      const parts = t.date.split('-');
      if (parts.length < 3) return false;
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10);

      // Filter by period mode
      let inPeriod = true;
      if (reportMode === 'DIARIO') {
        inPeriod = t.date === reportDayDate;
      } else if (reportMode === 'MENSAL') {
        inPeriod = year === reportYear && month === reportMonth;
      } else if (reportMode === 'SEMESTRAL') {
        if (year !== reportYear) inPeriod = false;
        else inPeriod = reportSemester === 1 ? (month >= 1 && month <= 6) : (month >= 7 && month <= 12);
      } else if (reportMode === 'ANUAL') {
        inPeriod = year === reportYear;
      } else if (reportMode === 'PERSONALIZADO') {
        if (reportStartDate && t.date < reportStartDate) inPeriod = false;
        if (reportEndDate && t.date > reportEndDate) inPeriod = false;
      }

      if (!inPeriod) return false;

      // Filter by donor if specified
      if (reportDonorFilter !== 'ALL') {
        const donorObj = localDonors.find(d => d.id === reportDonorFilter);
        if (donorObj && t.payerOrFavored?.toLowerCase() !== donorObj.name.toLowerCase() && t.donorId !== donorObj.id) {
          return false;
        }
      }

      // Filter by donation type
      if (reportTypeFilter !== 'ALL') {
        if (reportTypeFilter === 'RECORRENTE' && t.donationType !== 'RECORRENTE' && !t.category.includes('Sócio')) return false;
        if (reportTypeFilter === 'EVENTUAL' && t.donationType === 'RECORRENTE') return false;
      }

      return true;
    }).sort((a, b) => a.date.localeCompare(b.date));
  }, [uniqueTransactions, reportMode, reportDayDate, reportYear, reportMonth, reportSemester, reportStartDate, reportEndDate, reportDonorFilter, reportTypeFilter, localDonors]);

  const reportTotalRevenue = useMemo(() => {
    return reportTransactions
      .filter(t => t.type === 'RECEITA')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }, [reportTransactions]);

  const reportCategoryBreakdown = useMemo(() => {
    const map: { [cat: string]: { category: string; type: 'RECEITA'; total: number; count: number } } = {};

    reportTransactions.forEach(t => {
      const key = `${t.category}`;
      if (!map[key]) {
        map[key] = { category: t.category, type: 'RECEITA', total: 0, count: 0 };
      }
      map[key].total += Number(t.amount || 0);
      map[key].count += 1;
    });

    return Object.values(map).map(item => {
      const percentage = reportTotalRevenue > 0 ? (item.total / reportTotalRevenue) * 100 : 0;
      return { ...item, percentage };
    }).sort((a, b) => b.total - a.total);
  }, [reportTransactions, reportTotalRevenue]);

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

      return {
        monthNumber: m,
        monthName: MONTH_NAMES[m - 1],
        revenue: rev,
        expense: 0,
        balance: rev
      };
    });
  }, [reportTransactions, reportMode, reportSemester]);

  // Export PDF Report
  const handleExportReportPDF = async () => {
    try {
      await generateTreasuryFinancialReportPDF({
        periodTypeLabel: reportMode,
        periodTitle: reportPeriodTitleString,
        periodSubtitle: reportPeriodSubtitleString,
        totalRevenue: reportTotalRevenue,
        totalExpenses: 0,
        netBalance: reportTotalRevenue,
        transactions: reportTransactions,
        categoryBreakdown: reportCategoryBreakdown,
        monthlyBreakdown: reportMonthlyBreakdown,
        generatedBy: user.name
      });
      showToast('Relatório oficial de doações em PDF gerado com sucesso!', 'success');
    } catch (e) {
      console.error("Erro ao gerar PDF do relatório:", e);
      showToast('Erro ao exportar PDF do relatório.', 'error');
    }
  };

  // Export Word/Excel Report
  const handleExportReportWord = async () => {
    try {
      const columns = ['Data', 'Recibo', 'Doador / Contribuinte', 'Categoria', 'Forma de Pgto', 'Valor (R$)'];
      const data = reportTransactions.map(t => [
        t.date.split('-').reverse().join('/'),
        t.receiptNumber || '-',
        t.payerOrFavored,
        t.category,
        t.paymentMethod,
        `R$ ${Number(t.amount).toFixed(2)}`
      ]);

      await generateModernWord({
        title: 'Relatório Consolidado de Doações e Captação - Casa OAMI',
        subtitle: `${reportPeriodTitleString} - Total doado: R$ ${reportTotalRevenue.toFixed(2)}`,
        columns,
        data,
        fileName: `relatorio_doacoes_oami_${reportYear}`
      });
      showToast('Relatório em Word gerado com sucesso!', 'success');
    } catch (e) {
      console.error("Erro ao exportar Word:", e);
      showToast('Erro ao gerar arquivo Word do relatório.', 'error');
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
            <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3.5 py-1 rounded-full text-emerald-200 text-xs font-bold uppercase tracking-wider mb-3 border border-emerald-400/30">
              <Heart size={14} className="text-pink-300" /> Opera Assistenza Malati Impediti (OAMI)
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Controle de Doações, Doadores e Sócios
            </h1>
            <p className="text-emerald-100/90 text-sm mt-1 max-w-2xl leading-relaxed">
              Gestão centralizada de doações em dinheiro, PIX, transferências e sócios contribuintes da Casa OAMI, com emissão oficial de recibos e prestação de contas transparente.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab('new-revenue')}
              className="bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <PlusCircle size={18} />
              Nova Doação
            </button>
            <button
              onClick={() => setActiveTab('donors')}
              className="bg-pink-600 hover:bg-pink-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Heart size={18} />
              Doadores & Sócios
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <FileText size={18} />
              Relatórios de Doações
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
          Visão Geral & Doações
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
          Cadastrar Doação / Receita
        </button>

        <button
          onClick={() => setActiveTab('material-donations')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'material-donations'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <Package size={16} className={activeTab === 'material-donations' ? 'text-white' : 'text-blue-500'} />
          Doações de Materiais & Bens
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

        <button
          onClick={() => setActiveTab('history')}
          className={`px-5 py-2.5 rounded-2xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 ${
            activeTab === 'history'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }`}
        >
          <FileText size={16} />
          Histórico de Doações ({uniqueTransactions.length})
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
          Relatórios de Doações
        </button>

        <button
          onClick={() => handleCleanDuplicates(false)}
          title="Remover lançamentos duplicados do banco de dados"
          className="px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800/40 hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-all flex items-center gap-2 ml-auto"
        >
          <Trash2 size={15} />
          Limpar Duplicados
        </button>
      </div>

      {/* OVERVIEW / DASHBOARD TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* Main Donation Metrics */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Doações Recebidas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-emerald-100 dark:border-emerald-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Total em Doações</p>
                <h3 className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
                  {stats.totalDonations.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Arrecadação acumulada da instituição</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
                <Heart size={24} className="text-pink-500" />
              </div>
            </div>

            {/* Doações do Mês */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Doações do Mês</p>
                <h3 className="text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
                  {stats.monthDonations.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Entradas no mês corrente</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
                <TrendingUp size={24} />
              </div>
            </div>

            {/* Doações Recorrentes (Sócios) */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-purple-100 dark:border-purple-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Sócios Mensais</p>
                <h3 className="text-2xl font-black text-purple-600 dark:text-purple-400 mt-1">
                  {stats.recurringDonations.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">{stats.monthlyDonorsCount} sócios ativos no cadastro</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
                <UserCheck size={24} />
              </div>
            </div>

            {/* Doações Eventuais / Avulsas */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-amber-100 dark:border-amber-900/30 flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Doações Eventuais</p>
                <h3 className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
                  {stats.eventualDonations.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </h3>
                <p className="text-[10px] text-gray-400 mt-1">Contribuições avulsas / campanhas</p>
              </div>
              <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
                <Sparkles size={24} />
              </div>
            </div>
          </div>

          {/* Secondary Institutional Indicators */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase">Total de Doadores Cadastrados</span>
                <p className="text-lg font-black text-gray-800 dark:text-white mt-0.5">{stats.activeDonorsCount} doadores / sócios ativos</p>
              </div>
              <button 
                onClick={() => setActiveTab('donors')}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Gerenciar &rarr;
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase">Recibos Oficiais Emitidos</span>
                <p className="text-lg font-black text-gray-800 dark:text-white mt-0.5">{stats.totalReceipts} recibos em PDF</p>
              </div>
              <button 
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Ver Lista &rarr;
              </button>
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700/60 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-gray-400 uppercase">Média por Doação</span>
                <p className="text-lg font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {stats.avgDonation.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
              <button 
                onClick={() => setActiveTab('new-revenue')}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Nova Doação &rarr;
              </button>
            </div>
          </div>

          {/* Recharts Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Bar Chart - Evolution of Donations */}
            <div className="lg:col-span-2 bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4 flex items-center gap-2">
                <BarChart3 className="text-emerald-600" size={18} />
                Evolução Mensal de Doações Recebidas
              </h3>

              {chartMonthlyData.length > 0 ? (
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={chartMonthlyData}>
                      <XAxis dataKey="monthLabel" stroke="#888888" fontSize={12} />
                      <YAxis stroke="#888888" fontSize={12} tickFormatter={(val) => `R$ ${val}`} />
                      <Tooltip 
                        formatter={(value: any) => [`R$ ${Number(value).toFixed(2)}`, 'Doações']} 
                        contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
                      />
                      <Legend />
                      <Bar dataKey="Doações" fill="#10B981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-16 text-center text-gray-400 text-sm">
                  Sem dados suficientes para exibir o gráfico mensal.
                </div>
              )}
            </div>

            {/* Pie Chart - Donation Category Breakdown */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
              <h3 className="font-bold text-gray-800 dark:text-white text-base mb-4 flex items-center gap-2">
                <PieChartIcon className="text-blue-600" size={18} />
                Doações por Categoria
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
                  Nenhuma categoria de doação registrada.
                </div>
              )}
            </div>
          </div>

          {/* Recent Activity Table Preview */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-bold text-gray-800 dark:text-white text-base">
                Últimas Doações e Contribuições Recebidas
              </h3>
              <button
                onClick={() => setActiveTab('history')}
                className="text-xs font-bold text-emerald-600 hover:underline flex items-center gap-1"
              >
                Ver Histórico Completo &rarr;
              </button>
            </div>

            {transactions.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Recibo</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Doador / Contribuinte</th>
                      <th className="py-3 px-4">Categoria / Destinação</th>
                      <th className="py-3 px-4">Forma Pgto</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {transactions.slice(0, 5).map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                          {t.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          + {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(t)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="Baixar Recibo PDF"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Editar Lançamento"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir Lançamento"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">
                Nenhuma doação cadastrada no momento.
              </div>
            )}
          </div>
        </div>
      )}

      {/* CADASTRAR DOAÇÃO / RECEITA TAB */}
      {activeTab === 'new-revenue' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-emerald-100 dark:border-emerald-900/30 max-w-4xl mx-auto">
          <div className="flex items-center gap-3 pb-6 mb-6 border-b border-gray-100 dark:border-gray-700">
            <div className="w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center font-bold">
              <PlusCircle size={22} />
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Registrar Nova Doação / Contribuição</h2>
              <p className="text-xs text-gray-500">
                Lançamento oficial de doação financeira ou materiais/bens com emissão de recibo numerado em PDF.
              </p>
            </div>
          </div>

          {/* Donation Kind Selector Switch */}
          <div className="mb-6 bg-emerald-50/60 dark:bg-emerald-950/20 p-2 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setRevenueForm(prev => ({ ...prev, donationKind: 'FINANCIAL' }))}
              className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                revenueForm.donationKind === 'FINANCIAL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-100/50'
              }`}
            >
              <Heart size={18} className={revenueForm.donationKind === 'FINANCIAL' ? 'text-white' : 'text-pink-500'} />
              Doação Financeira (R$, PIX, Dinheiro)
            </button>
            <button
              type="button"
              onClick={() => setRevenueForm(prev => ({ ...prev, donationKind: 'MATERIAL' }))}
              className={`py-3 px-4 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center justify-center gap-2 ${
                revenueForm.donationKind === 'MATERIAL'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-emerald-100/50'
              }`}
            >
              <Package size={18} className={revenueForm.donationKind === 'MATERIAL' ? 'text-white' : 'text-blue-500'} />
              Doação de Materiais, Bens e Insumos
            </button>
          </div>

          <form onSubmit={handleSaveRevenue} className="space-y-6">
            {/* Doador Cadastrado Dropdown */}
            {localDonors.length > 0 && (
              <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-900/40">
                <label className="block text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase mb-1">
                  Vincular a Doador / Sócio Cadastrado (Opcional)
                </label>
                <select
                  value={revenueForm.selectedDonorId}
                  onChange={(e) => {
                    const donorId = e.target.value;
                    if (donorId) {
                      const selected = localDonors.find(d => d.id === donorId);
                      if (selected) {
                        setRevenueForm(prev => ({
                          ...prev,
                          selectedDonorId: donorId,
                          payerName: selected.name,
                          cpf: selected.cpfOrCnpj || '',
                          email: selected.email || '',
                          phone: selected.phone || '',
                          donationType: selected.type === 'SOCIO_MENSAL' ? 'RECORRENTE' : 'EVENTUAL',
                          amount: selected.amount ? String(selected.amount) : prev.amount
                        }));
                      }
                    } else {
                      setRevenueForm(prev => ({
                        ...prev,
                        selectedDonorId: '',
                        payerName: '',
                        cpf: '',
                        email: '',
                        phone: ''
                      }));
                    }
                  }}
                  className="w-full bg-white dark:bg-gray-800 border border-emerald-200 dark:border-emerald-800 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                >
                  <option value="">-- Doador Avulso / Novo Doador --</option>
                  {localDonors.map(d => (
                    <option key={d.id} value={d.id}>
                      {d.name} {d.cpfOrCnpj ? `(${d.cpfOrCnpj})` : ''} - {d.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador'}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Nome do Doador */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Nome Completo do Doador / Razão Social *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Nome do doador ou empresa contribuinte"
                  value={revenueForm.payerName}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, payerName: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* CPF/CNPJ */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  CPF / CNPJ do Doador
                </label>
                <input
                  type="text"
                  placeholder="000.000.000-00"
                  value={revenueForm.cpf}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, cpf: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {/* Data da Doação */}
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Data do Recebimento *
                </label>
                <input
                  type="date"
                  required
                  value={revenueForm.date}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              {revenueForm.donationKind === 'FINANCIAL' ? (
                <>
                  {/* Valor (R$) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Valor da Doação (R$) *
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

                  {/* Forma de Pagamento */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Forma de Pagamento / Transmissão *
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
                      Categoria da Doação *
                    </label>
                    <select
                      value={revenueForm.category}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {DONATION_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Custom Category input if other selected */}
                  {revenueForm.category === 'Outra Contribuição' && (
                    <div>
                      <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                        Especifique a Categoria *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Descrição da modalidade de contribuição"
                        value={revenueForm.customCategory}
                        onChange={(e) => setRevenueForm(prev => ({ ...prev, customCategory: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      />
                    </div>
                  )}

                  {/* Modalidade / Tipo */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Modalidade do Doador
                    </label>
                    <select
                      value={revenueForm.donationType}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, donationType: e.target.value as any }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="EVENTUAL">Doação Eventual / Avulsa</option>
                      <option value="RECORRENTE">Doação Recorrente / Sócio Mensal</option>
                      <option value="EMPRESA">Empresa Parceira (PJ)</option>
                      <option value="PESSOA_FISICA">Pessoa Física (PF)</option>
                    </select>
                  </div>

                  {/* Finalidade / Destinação */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Destinação / Finalidade Preferencial
                    </label>
                    <select
                      value={revenueForm.finality}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, finality: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {DONATION_FINALITIES.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <>
                  {/* Categoria do Material */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Categoria do Material / Bem *
                    </label>
                    <select
                      value={revenueForm.materialCategory}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, materialCategory: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {MATERIAL_CATEGORIES.map(c => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>

                  {/* Estado do Item */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Estado de Conservação
                    </label>
                    <select
                      value={revenueForm.itemCondition}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, itemCondition: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      <option value="Novo / Lacrado">Novo / Lacrado</option>
                      <option value="Seminovo em ótimo estado">Seminovo em ótimo estado</option>
                      <option value="Usado em bom estado">Usado em bom estado</option>
                      <option value="Aguardando triagem/higienização">Aguardando triagem/higienização</option>
                    </select>
                  </div>

                  {/* Quantidade ou Volume */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Quantidade / Volume / Peso
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 50 kg / 10 pacotes / 1 unidade"
                      value={revenueForm.quantityOrVolume}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, quantityOrVolume: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Valor Estimado (R$) */}
                  <div>
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Valor Estimado do Bem (R$) (Opcional)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="0,00"
                      value={revenueForm.estimatedValue}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, estimatedValue: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-bold text-blue-600 focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Detalhes dos Itens */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Detalhamento dos Itens / Descrição Completa *
                    </label>
                    <textarea
                      rows={3}
                      required
                      placeholder="Ex: 10 pacotes de fraldas geriátricas G, 20 fardos de arroz 5kg, 1 mesa de jantar com 4 cadeiras"
                      value={revenueForm.itemDetails}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, itemDetails: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  {/* Destino / Setor */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Destino Interno / Setor Solicitante
                    </label>
                    <select
                      value={revenueForm.destination}
                      onChange={(e) => setRevenueForm(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {MATERIAL_DESTINATIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>

                  {/* CONEXÃO E ENTRADA AUTOMÁTICA NO ESTOQUE */}
                  <div className="sm:col-span-2 mt-3 bg-gradient-to-r from-emerald-50 to-teal-50/60 dark:from-emerald-950/30 dark:to-teal-950/20 p-4 sm:p-5 rounded-2xl border border-emerald-200 dark:border-emerald-800/60 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2.5">
                        <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-sm shrink-0">
                          <Package size={20} />
                        </div>
                        <div>
                          <h4 className="font-extrabold text-xs sm:text-sm text-gray-900 dark:text-white flex items-center gap-1.5">
                            Dar Entrada Automática no Controle de Estoque?
                          </h4>
                          <p className="text-[11px] text-gray-600 dark:text-gray-400">
                            Recomendado para doações de alimentos, produtos de limpeza, higiene pessoal, fraldas e insumos do almoxarifado.
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Radio/Button toggle */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRevenueForm(prev => ({ ...prev, addToStock: true }))}
                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                          revenueForm.addToStock
                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-emerald-50/50'
                        }`}
                      >
                        <CheckCheck size={16} />
                        Sim, dar entrada e atualizar saldo no Estoque
                      </button>

                      <button
                        type="button"
                        onClick={() => setRevenueForm(prev => ({ ...prev, addToStock: false }))}
                        className={`p-3 rounded-xl border text-left font-bold text-xs transition-all flex items-center gap-2.5 cursor-pointer ${
                          !revenueForm.addToStock
                            ? 'bg-gray-700 text-white border-gray-700 shadow-md'
                            : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        <X size={16} />
                        Não, apenas registrar doação sem alterar o Estoque
                      </button>
                    </div>

                    {/* Conditional Stock Form Fields */}
                    {revenueForm.addToStock && (
                      <div className="pt-3 border-t border-emerald-200/60 dark:border-emerald-800/40 space-y-3.5 animate-in fade-in duration-200">
                        {/* Target Product Selector */}
                        <div>
                          <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                            Vincular ao Produto do Estoque *
                          </label>
                          <select
                            value={revenueForm.stockProductId}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (val === 'NEW') {
                                setRevenueForm(prev => ({
                                  ...prev,
                                  stockProductId: 'NEW',
                                  stockProductName: prev.stockProductName || prev.itemDetails || prev.materialCategory,
                                  stockProductCategory: mapMaterialCategoryToStockCategory(prev.materialCategory)
                                }));
                              } else {
                                const selected = stockProducts.find(p => p.id === val);
                                setRevenueForm(prev => ({
                                  ...prev,
                                  stockProductId: val,
                                  stockProductName: selected ? selected.name : prev.stockProductName,
                                  stockProductUnit: selected ? selected.unit : prev.stockProductUnit,
                                  stockProductCategory: selected ? selected.category : prev.stockProductCategory
                                }));
                              }
                            }}
                            className="w-full bg-white dark:bg-gray-900 border border-emerald-300 dark:border-emerald-700 rounded-xl px-3.5 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                          >
                            <option value="NEW">➕ [ Cadastrar / Criar Novo Item no Estoque ]</option>
                            {stockProducts.length > 0 && (
                              <optgroup label="Produtos Existentes no Estoque">
                                {stockProducts.map(p => (
                                  <option key={p.id} value={p.id}>
                                    {p.name} ({p.category}) — Saldo Atual: {p.quantity} {p.unit}
                                  </option>
                                ))}
                              </optgroup>
                            )}
                          </select>
                        </div>

                        {/* New Item Details */}
                        {revenueForm.stockProductId === 'NEW' && (
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white/80 dark:bg-gray-900/80 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50">
                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                Nome do Item no Estoque *
                              </label>
                              <input
                                type="text"
                                required={revenueForm.addToStock}
                                placeholder="Ex: Fralda Geriátrica G, Arroz 5kg, Sabão em Pó"
                                value={revenueForm.stockProductName}
                                onChange={(e) => setRevenueForm(prev => ({ ...prev, stockProductName: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                Categoria no Estoque *
                              </label>
                              <select
                                value={revenueForm.stockProductCategory}
                                onChange={(e) => setRevenueForm(prev => ({ ...prev, stockProductCategory: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                              >
                                {STOCK_CATEGORIES.map(cat => (
                                  <option key={cat} value={cat}>{cat}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                Unidade de Medida *
                              </label>
                              <select
                                value={revenueForm.stockProductUnit}
                                onChange={(e) => setRevenueForm(prev => ({ ...prev, stockProductUnit: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                              >
                                {STOCK_UNITS.map(u => (
                                  <option key={u} value={u}>{u}</option>
                                ))}
                              </select>
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                                Estoque Mínimo de Alerta
                              </label>
                              <input
                                type="number"
                                min="0"
                                placeholder="5"
                                value={revenueForm.stockMinQuantity}
                                onChange={(e) => setRevenueForm(prev => ({ ...prev, stockMinQuantity: e.target.value }))}
                                className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                              />
                            </div>
                          </div>
                        )}

                        {/* Quantity to add */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                          <div>
                            <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                              Quantidade para Entrada no Estoque *
                            </label>
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              required={revenueForm.addToStock}
                              placeholder="Ex: 10"
                              value={revenueForm.stockQuantity}
                              onChange={(e) => setRevenueForm(prev => ({ ...prev, stockQuantity: e.target.value }))}
                              className="w-full bg-white dark:bg-gray-900 border border-emerald-400 dark:border-emerald-600 rounded-xl px-3.5 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                            />
                          </div>

                          <div className="p-2.5 bg-emerald-100/70 dark:bg-emerald-900/40 rounded-xl border border-emerald-300 dark:border-emerald-800/60 text-[11px] text-emerald-900 dark:text-emerald-200 font-medium leading-tight">
                            ℹ️ O saldo deste produto no Almoxarifado será incrementado em <strong>+{revenueForm.stockQuantity || '0'} {revenueForm.stockProductUnit || 'unidade(s)'}</strong>.
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Save as donor checkbox if not selected from dropdown */}
            {!revenueForm.selectedDonorId && (
              <div className="flex items-center gap-2 bg-gray-50 dark:bg-gray-900 p-3.5 rounded-xl border border-gray-200 dark:border-gray-700">
                <input
                  type="checkbox"
                  id="saveAsDonor"
                  checked={revenueForm.saveAsDonor}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, saveAsDonor: e.target.checked }))}
                  className="w-4 h-4 text-emerald-600 rounded border-gray-300 focus:ring-emerald-500"
                />
                <label htmlFor="saveAsDonor" className="text-xs font-bold text-gray-700 dark:text-gray-300 cursor-pointer">
                  Salvar automaticamente no Cadastro de Doadores e Sócios (OAMI) para manter histórico
                </label>
              </div>
            )}

            {/* Descrição Adicional */}
            {revenueForm.donationKind === 'FINANCIAL' && (
              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Descrição Detalhada / Justificativa
                </label>
                <textarea
                  rows={2}
                  placeholder="Especificação da doação ou observação no recibo"
                  value={revenueForm.description}
                  onChange={(e) => setRevenueForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-3.5 py-2.5 text-sm font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>
            )}

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
                  Observações Internas
                </label>
                <input
                  type="text"
                  placeholder="Anotações para controle interno"
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
                {submitting ? 'Registrando...' : (revenueForm.donationKind === 'MATERIAL' ? 'Salvar Doação de Material e Emitir Comprovante PDF' : 'Salvar Doação e Emitir Recibo PDF')}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* DOAÇÕES DE MATERIAIS, BENS E INSUMOS TAB */}
      {activeTab === 'material-donations' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <Package className="text-blue-600" size={22} />
                Controle de Doações Físicas, Materiais e Bens (OAMI)
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Gestão de doações de alimentos, produtos de limpeza, higiene pessoal, móveis, eletrodomésticos e outros insumos.
              </p>
            </div>

            <button
              onClick={() => {
                setRevenueForm(prev => ({ ...prev, donationKind: 'MATERIAL' }));
                setActiveTab('new-revenue');
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2 self-start md:self-auto"
            >
              <PlusCircle size={18} />
              Cadastrar Doação de Material
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setMaterialCategoryFilter('ALL')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                materialCategoryFilter === 'ALL'
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
              }`}
            >
              Todas as Categorias ({uniqueTransactions.filter(t => t.donationKind === 'MATERIAL' || !!t.materialCategory).length})
            </button>

            {MATERIAL_CATEGORIES.map(cat => {
              const count = uniqueTransactions.filter(t => (t.donationKind === 'MATERIAL' || !!t.materialCategory) && (t.category === cat || t.materialCategory === cat)).length;
              return (
                <button
                  key={cat}
                  onClick={() => setMaterialCategoryFilter(cat)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                    materialCategoryFilter === cat
                      ? 'bg-blue-600 text-white shadow-sm'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-200'
                  }`}
                >
                  {cat} ({count})
                </button>
              );
            })}
          </div>

          {/* Material Donations Table */}
          {(() => {
            const materialList = uniqueTransactions.filter(t => {
              const isMat = t.donationKind === 'MATERIAL' || !!t.materialCategory || t.paymentMethod === 'DOACAO_EM_BENS';
              if (!isMat) return false;
              if (materialCategoryFilter !== 'ALL' && t.category !== materialCategoryFilter && t.materialCategory !== materialCategoryFilter) {
                return false;
              }
              if (searchTerm) {
                const term = searchTerm.toLowerCase();
                const matchName = t.payerOrFavored?.toLowerCase().includes(term);
                const matchDesc = (t.itemDetails || t.description || '').toLowerCase().includes(term);
                const matchCat = (t.category || '').toLowerCase().includes(term);
                if (!matchName && !matchDesc && !matchCat) return false;
              }
              return true;
            });

            return materialList.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Recibo #</th>
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Doador</th>
                      <th className="py-3 px-4">Categoria</th>
                      <th className="py-3 px-4">Detalhamento dos Itens</th>
                      <th className="py-3 px-4">Qtd / Volume</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4 text-right">Valor Est.</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {materialList.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 font-mono font-bold text-blue-600 dark:text-blue-400">
                          {t.receiptNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {t.date.split('-').reverse().join('/')}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800 dark:text-white">
                          {t.payerOrFavored}
                          {t.cpf && <span className="block text-[10px] text-gray-400 font-normal">{t.cpf}</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                            {t.materialCategory || t.category}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-gray-700 dark:text-gray-300 max-w-xs truncate" title={t.itemDetails || t.description}>
                          {t.itemDetails || t.description}
                        </td>
                        <td className="py-3 px-4 font-medium text-gray-600 dark:text-gray-400">
                          {t.quantityOrVolume || '-'}
                        </td>
                        <td className="py-3 px-4 text-gray-500">
                          {t.itemCondition || 'Em bom estado'}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                          {Number(t.estimatedValue || t.amount) > 0 
                            ? Number(t.estimatedValue || t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                            : 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(t)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-lg transition-colors"
                            title="Baixar Comprovante em PDF"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Editar Lançamento"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir Lançamento"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-gray-400 text-sm bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <Package size={36} className="mx-auto mb-2 text-gray-300" />
                Nenhuma doação de material ou bem cadastrada nesta categoria.
              </div>
            );
          })()}
        </div>
      )}

      {/* HISTÓRICO DE DOAÇÕES TAB */}
      {activeTab === 'history' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white flex items-center gap-2">
                <FileText className="text-emerald-600" size={20} />
                Histórico de Doações e Contribuições
              </h2>
              <p className="text-xs text-gray-500">Consulta e busca detalhada de todas as entradas de doações registradas.</p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400">Total: {filteredTransactions.length} doações</span>
            </div>
          </div>

          {/* Search and Filters Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 bg-gray-50 dark:bg-gray-900 p-4 rounded-2xl border border-gray-200 dark:border-gray-700">
            {/* Search */}
            <div className="relative">
              <Search size={16} className="absolute left-3.5 top-3 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar doador, recibo ou categoria..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Payment Filter */}
            <div>
              <select
                value={paymentFilter}
                onChange={(e) => setPaymentFilter(e.target.value)}
                className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ALL">Todas as Formas de Pgto</option>
                {PAYMENT_METHODS.map(m => (
                  <option key={m.value} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>

            {/* Period Filter */}
            <div>
              <select
                value={periodFilter}
                onChange={(e) => setPeriodFilter(e.target.value as any)}
                className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="THIS_MONTH">Este Mês</option>
                <option value="LAST_MONTH">Mês Anterior</option>
                <option value="ALL">Todo o Histórico</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {filteredTransactions.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                    <th className="py-3 px-4">Recibo</th>
                    <th className="py-3 px-4">Data</th>
                    <th className="py-3 px-4">Doador / Contribuinte</th>
                    <th className="py-3 px-4">Categoria / Destinação</th>
                    <th className="py-3 px-4">Forma Pgto</th>
                    <th className="py-3 px-4 text-right">Valor</th>
                    <th className="py-3 px-4 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                  {filteredTransactions.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 dark:text-emerald-400">
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
                      <td className="py-3.5 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                        + {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </td>
                      <td className="py-3.5 px-4 text-center flex items-center justify-center gap-2">
                        <button
                          onClick={() => handleDownloadPDF(t)}
                          className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                          title="Baixar Recibo PDF"
                        >
                          <Printer size={16} />
                        </button>
                        <button
                          onClick={() => handleOpenEditModal(t)}
                          className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                          title="Editar Lançamento"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(t)}
                          className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                          title="Excluir Lançamento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="py-12 text-center text-gray-400 text-sm">
              Nenhuma doação encontrada com os filtros selecionados.
            </div>
          )}
        </div>
      )}

      {/* RELATÓRIOS DE DOAÇÕES TAB */}
      {activeTab === 'reports' && (
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-6 sm:p-8 shadow-sm border border-gray-100 dark:border-gray-700/60 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-gray-100 dark:border-gray-700">
            <div>
              <div className="inline-flex items-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full text-emerald-800 dark:text-emerald-300 text-xs font-bold uppercase mb-2">
                <FileText size={14} /> Relatório Oficial de Prestação de Contas
              </div>
              <h2 className="text-xl font-black text-gray-800 dark:text-white">Relatório de Doações e Captação de Recursos (Casa OAMI)</h2>
              <p className="text-xs text-gray-500 mt-0.5">Emissão de demonstrativo consolidado de doações por período, doador e finalidade para prestação de contas institucional.</p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportReportPDF}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <Download size={16} /> Exportar PDF
              </button>
              <button
                onClick={handleExportReportWord}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
              >
                <FileText size={16} /> Exportar Word
              </button>
            </div>
          </div>

          {/* Filter & Periodicity Bar for Reports */}
          <div className="bg-gray-50 dark:bg-gray-900/60 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-gray-700 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <span className="text-xs font-extrabold text-gray-700 dark:text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                <Landmark size={15} className="text-emerald-600" />
                1. Periodicidade do Relatório para Download:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  { id: 'DIARIO', label: 'Diário' },
                  { id: 'MENSAL', label: 'Mensal' },
                  { id: 'SEMESTRAL', label: 'Semestral' },
                  { id: 'ANUAL', label: 'Anual' },
                  { id: 'PERSONALIZADO', label: 'Personalizado' },
                ].map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setReportMode(p.id as any)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                      reportMode === p.id
                        ? 'bg-emerald-600 text-white shadow-md'
                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Dynamic Controls Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-gray-200 dark:border-gray-800">
              {reportMode === 'DIARIO' && (
                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Data Específica</label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      value={reportDayDate}
                      onChange={(e) => setReportDayDate(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                    <button
                      type="button"
                      onClick={() => setReportDayDate(new Date().toISOString().split('T')[0])}
                      className="px-3 py-2 bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-300 rounded-xl text-xs font-bold hover:bg-emerald-200 transition-colors whitespace-nowrap"
                    >
                      Hoje
                    </button>
                  </div>
                </div>
              )}

              {reportMode === 'MENSAL' && (
                <>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Mês</label>
                    <select
                      value={reportMonth}
                      onChange={(e) => setReportMonth(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      {MONTH_NAMES.map((m, idx) => (
                        <option key={idx + 1} value={idx + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ano</label>
                    <input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
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
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value={1}>1º Semestre (Janeiro a Junho)</option>
                      <option value={2}>2º Semestre (Julho a Dezembro)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ano</label>
                    <input
                      type="number"
                      value={reportYear}
                      onChange={(e) => setReportYear(Number(e.target.value))}
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              {reportMode === 'ANUAL' && (
                <div>
                  <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Ano do Exercício</label>
                  <input
                    type="number"
                    value={reportYear}
                    onChange={(e) => setReportYear(Number(e.target.value))}
                    className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                  />
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
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Data Final</label>
                    <input
                      type="date"
                      value={reportEndDate}
                      onChange={(e) => setReportEndDate(e.target.value)}
                      className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Filtro por Doador</label>
                <select
                  value={reportDonorFilter}
                  onChange={(e) => setReportDonorFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Todos os Doadores e Sócios</option>
                  {localDonors.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-gray-500 uppercase mb-1">Tipo de Doação</label>
                <select
                  value={reportTypeFilter}
                  onChange={(e) => setReportTypeFilter(e.target.value)}
                  className="w-full py-2 px-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="ALL">Todas as Doações</option>
                  <option value="RECORRENTE">Apenas Sócios / Recorrentes</option>
                  <option value="EVENTUAL">Apenas Doações Eventuais</option>
                </select>
              </div>
            </div>
          </div>

          {/* Consolidated Executive Summary Banner */}
          <div className="bg-gradient-to-br from-emerald-900 to-teal-900 text-white p-6 rounded-2xl shadow-md border border-emerald-700/60 space-y-4">
            <div className="flex items-center justify-between border-b border-emerald-700/60 pb-3">
              <div>
                <span className="text-xs font-bold uppercase text-emerald-300 tracking-wider">Total Consolidado de Doações</span>
                <h3 className="text-xl font-black text-white mt-0.5">{reportPeriodTitleString}</h3>
                <p className="text-xs text-emerald-200/80">{reportPeriodSubtitleString}</p>
              </div>
              <div className="text-right">
                <span className="text-xs font-bold text-emerald-300 uppercase">Valor Total Arrecadado</span>
                <p className="text-3xl font-black text-emerald-300">
                  {reportTotalRevenue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-emerald-200 uppercase">Quantidade de Contribuições</span>
                <p className="text-lg font-black text-white mt-0.5">{reportTransactions.length} doações registradas</p>
              </div>
              <div className="bg-white/10 backdrop-blur-md p-3.5 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-emerald-200 uppercase">Média por Doação</span>
                <p className="text-lg font-black text-white mt-0.5">
                  {reportTransactions.length > 0
                    ? (reportTotalRevenue / reportTransactions.length).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                    : 'R$ 0,00'}
                </p>
              </div>
            </div>
          </div>

          {/* Breakdown Table for Report */}
          <div className="space-y-3">
            <h3 className="font-bold text-gray-800 dark:text-white text-sm">
              Demonstrativo de Doações no Período Selecionado
            </h3>

            {reportTransactions.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-gray-100 dark:border-gray-700">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-gray-900 border-b border-gray-100 dark:border-gray-700 text-[11px] font-bold text-gray-400 uppercase tracking-wider">
                      <th className="py-3 px-4">Data</th>
                      <th className="py-3 px-4">Recibo</th>
                      <th className="py-3 px-4">Doador / Contribuinte</th>
                      <th className="py-3 px-4">Categoria / Destinação</th>
                      <th className="py-3 px-4">Forma Pgto</th>
                      <th className="py-3 px-4 text-right">Valor</th>
                      <th className="py-3 px-4 text-center">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800 text-xs">
                    {reportTransactions.map(t => (
                      <tr key={t.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30">
                        <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                          {t.date.split('-').reverse().join('/')}
                        </td>
                        <td className="py-3 px-4 font-mono font-bold text-emerald-700 dark:text-emerald-400">
                          {t.receiptNumber || '-'}
                        </td>
                        <td className="py-3 px-4 font-bold text-gray-800 dark:text-white">
                          {t.payerOrFavored}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                          {t.category} {t.finality ? `(${t.finality})` : ''}
                        </td>
                        <td className="py-3 px-4 text-gray-500 dark:text-gray-400">
                          {t.paymentMethod}
                        </td>
                        <td className="py-3 px-4 text-right font-black text-emerald-600 dark:text-emerald-400">
                          + {Number(t.amount).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </td>
                        <td className="py-3 px-4 text-center flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleDownloadPDF(t)}
                            className="p-1.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-lg transition-colors"
                            title="Baixar Recibo PDF"
                          >
                            <Printer size={16} />
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/40 rounded-lg transition-colors"
                            title="Editar Lançamento"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(t)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                            title="Excluir Lançamento"
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-8 text-center text-gray-400 text-sm">
                Nenhuma doação registrada no período selecionado.
              </div>
            )}
          </div>
        </div>
      )}

      {/* DOADORES E SÓCIOS TAB */}
      {activeTab === 'donors' && (
        <DonorsSection donors={localDonors} showToast={showToast} user={user} />
      )}

      {/* MODAL: EDIT DONATION TRANSACTION */}
      {isEditModalOpen && editingTransaction && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[90] flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 dark:border-gray-800 my-auto max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-5 sm:p-6 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex justify-between items-center shrink-0 sticky top-0 z-10 shadow-sm">
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Pencil size={20} className="text-amber-300" />
                  Editar Lançamento de Doação
                </h3>
                <p className="text-xs text-emerald-100 mt-0.5">
                  Recibo: {editingTransaction.receiptNumber || 'N/A'}
                </p>
              </div>
              <button 
                type="button" 
                onClick={() => { setIsEditModalOpen(false); setEditingTransaction(null); }} 
                className="p-2 hover:bg-white/20 bg-white/10 rounded-full transition-colors cursor-pointer shrink-0 ml-2" 
                title="Fechar"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEditedTransaction} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1 custom-scrollbar text-xs">
              
              {/* Type toggle indicator */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 rounded-2xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-between">
                <span className="font-bold text-emerald-800 dark:text-emerald-300">Tipo de Doação:</span>
                <span className="px-3 py-1 rounded-full font-black bg-emerald-600 text-white text-[11px]">
                  {editForm.donationKind === 'MATERIAL' ? '📦 Doação Física / Material / Bens' : '💰 Doação Financeira'}
                </span>
              </div>

              {/* Doador e CPF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Nome do Doador / Contribuinte *
                  </label>
                  <input
                    type="text"
                    required
                    value={editForm.payerName}
                    onChange={(e) => setEditForm(prev => ({ ...prev, payerName: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    CPF / CNPJ
                  </label>
                  <input
                    type="text"
                    value={editForm.cpf}
                    onChange={(e) => setEditForm(prev => ({ ...prev, cpf: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Data e Valor/Valor Estimado */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    Data do Recebimento *
                  </label>
                  <input
                    type="date"
                    required
                    value={editForm.date}
                    onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                    {editForm.donationKind === 'MATERIAL' ? 'Valor Estimado (R$)' : 'Valor Recebido (R$) *'}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={editForm.amount}
                    onChange={(e) => setEditForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-bold text-emerald-600 dark:text-emerald-400 focus:ring-2 focus:ring-emerald-500 outline-none"
                  />
                </div>
              </div>

              {/* Specific fields for Material Donations */}
              {editForm.donationKind === 'MATERIAL' ? (
                <>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                        Categoria do Material *
                      </label>
                      <select
                        value={editForm.materialCategory}
                        onChange={(e) => setEditForm(prev => ({ ...prev, materialCategory: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        {MATERIAL_CATEGORIES.map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                        Estado de Conservação
                      </label>
                      <select
                        value={editForm.itemCondition}
                        onChange={(e) => setEditForm(prev => ({ ...prev, itemCondition: e.target.value }))}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                      >
                        <option value="Novo / Lacrado">Novo / Lacrado</option>
                        <option value="Em bom estado">Em bom estado</option>
                        <option value="Usado - Funcionando">Usado - Funcionando</option>
                        <option value="Necessita pequeno reparo">Necessita pequeno reparo</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Quantidade / Volume / Descrição Resumida
                    </label>
                    <input
                      type="text"
                      placeholder="Ex: 5 pacotes de 1kg / 1 geladeira Consul"
                      value={editForm.quantityOrVolume}
                      onChange={(e) => setEditForm(prev => ({ ...prev, quantityOrVolume: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Detalhamento dos Itens doados
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Descreva os itens recebidos..."
                      value={editForm.itemDetails}
                      onChange={(e) => setEditForm(prev => ({ ...prev, itemDetails: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Destino / Local de Armazenamento
                    </label>
                    <select
                      value={editForm.destination}
                      onChange={(e) => setEditForm(prev => ({ ...prev, destination: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {MATERIAL_DESTINATIONS.map(d => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                </>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Forma de Pagamento
                    </label>
                    <select
                      value={editForm.paymentMethod}
                      onChange={(e) => setEditForm(prev => ({ ...prev, paymentMethod: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {PAYMENT_METHODS.map(m => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                      Categoria
                    </label>
                    <select
                      value={editForm.category}
                      onChange={(e) => setEditForm(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                    >
                      {DONATION_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-gray-700 dark:text-gray-300 uppercase mb-1">
                  Observações Internas
                </label>
                <input
                  type="text"
                  placeholder="Observações complementares..."
                  value={editForm.observations}
                  onChange={(e) => setEditForm(prev => ({ ...prev, observations: e.target.value }))}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl px-3 py-2 text-xs font-medium focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-gray-100 dark:border-gray-800">
                <button
                  type="button"
                  onClick={() => { setIsEditModalOpen(false); setEditingTransaction(null); }}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  <CheckCheck size={16} />
                  {submitting ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
};
