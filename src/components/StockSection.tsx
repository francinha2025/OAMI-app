import React, { useState, useEffect, useMemo } from 'react';
import { 
  Package, 
  Plus, 
  Search, 
  Filter, 
  AlertTriangle, 
  AlertCircle, 
  Clock, 
  TrendingUp, 
  TrendingDown, 
  ArrowUpRight, 
  ArrowDownLeft, 
  BarChart3, 
  FileText, 
  Download, 
  Printer, 
  Edit, 
  CheckCircle2, 
  XCircle, 
  RefreshCw, 
  DollarSign, 
  Layers, 
  MapPin, 
  Truck, 
  ShieldAlert, 
  Boxes, 
  History,
  FileSpreadsheet,
  X,
  Calendar,
  UserCheck
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  PieChart, 
  Pie, 
  Cell, 
  Legend 
} from 'recharts';
import { db } from '../firebase';
import { StockProduct, StockMovement, User } from '../types';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { handleFirestoreError, OperationType } from '../lib/firestoreErrors';

interface StockSectionProps {
  user: User;
  showToast: (message: string, type: 'success' | 'error' | 'info' | 'warning') => void;
  showConfirm: (message: string, onConfirm: () => void) => void;
}

const CATEGORIES = [
  'Medicamentos',
  'Higiene e Limpeza',
  'Alimentos e Nutrição',
  'Material de Escritório',
  'Enfermagem e Médico',
  'Fraldas e Vestuário',
  'Outros'
];

const UNITS = [
  'Unidade',
  'Caixa',
  'Pacote',
  'Litro',
  'Kg',
  'Frasco',
  'Rolo',
  'Par',
  'Resma',
  'Grama',
  'Outro'
];

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

export const StockSection: React.FC<StockSectionProps> = ({ user, showToast, showConfirm }) => {
  // Check Access Role
  const allowedRoles = ['PRESIDENTE', 'COORDENADORA', 'TESOUREIRA', 'TESOURARIA', 'AUXILIAR_ADMINISTRATIVO'];
  const hasAccess = allowedRoles.includes(user.role);

  if (!hasAccess) {
    return (
      <div className="max-w-4xl mx-auto my-12 p-8 bg-white dark:bg-gray-800 rounded-3xl shadow-lg border border-red-100 dark:border-red-900/30 text-center space-y-4">
        <div className="w-16 h-16 bg-red-100 dark:bg-red-900/40 text-red-600 dark:text-red-400 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert size={32} />
        </div>
        <h2 className="text-2xl font-black text-gray-800 dark:text-white">Acesso Restrito ao Controle de Estoque</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
          Este módulo é restrito para os perfis de Presidente, Coordenadora, Tesouraria e Auxiliar Administrativo.
        </p>
      </div>
    );
  }

  // State Management
  const [activeTab, setActiveTab] = useState<'dashboard' | 'products' | 'movements' | 'reports'>('dashboard');

  const [products, setProducts] = useState<StockProduct[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TODAS');
  const [selectedStatus, setSelectedStatus] = useState<'TODOS' | 'ATIVO' | 'INATIVO'>('ATIVO');
  const [quickFilter, setQuickFilter] = useState<'ALL' | 'LOW' | 'EXPIRED' | 'NEAR' | 'ZERO'>('ALL');

  // Movement History Filters
  const [movementSearch, setMovementSearch] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState<'TODOS' | 'ENTRADA' | 'SAIDA'>('TODOS');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<StockProduct | null>(null);

  // Form State - Product
  const [productForm, setProductForm] = useState({
    name: '',
    category: CATEGORIES[0],
    unit: UNITS[0],
    minQuantity: 10,
    location: 'Almoxarifado Central',
    supplier: '',
    unitPrice: '',
    expirationDate: '',
    batchNumber: '',
    notes: ''
  });

  // Form State - Movement
  const [movementForm, setMovementForm] = useState({
    productId: '',
    quantity: 1,
    supplier: '',
    destination: '',
    reason: 'Consumo Interno',
    notes: '',
    date: new Date().toISOString().split('T')[0]
  });

  // Reports Filter State
  const [reportType, setReportType] = useState<'INVENTORY' | 'LOW_STOCK' | 'EXPIRED' | 'MOVEMENTS'>('INVENTORY');
  const [reportStartDate, setReportStartDate] = useState(`${new Date().getFullYear()}-01-01`);
  const [reportEndDate, setReportEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Real-time Listeners
  useEffect(() => {
    const unsubscribeProd = onSnapshot(collection(db, 'stock_products'), (snapshot) => {
      const list: StockProduct[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StockProduct));
      list.sort((a, b) => (b.createdAt || a.name || '').localeCompare(a.createdAt || b.name || ''));
      setProducts(list);
      setLoading(false);
    }, (err) => {
      console.error("Erro ao carregar produtos do estoque:", err);
      handleFirestoreError(err, OperationType.LIST, 'stock_products');
      setLoading(false);
    });

    const unsubscribeMov = onSnapshot(collection(db, 'stock_movements'), (snapshot) => {
      const list: StockMovement[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as StockMovement));
      list.sort((a, b) => (b.timestamp || b.date || '').localeCompare(a.timestamp || a.date || ''));
      setMovements(list);
    }, (err) => {
      console.error("Erro ao carregar movimentações do estoque:", err);
      handleFirestoreError(err, OperationType.LIST, 'stock_movements');
    });

    return () => {
      unsubscribeProd();
      unsubscribeMov();
    };
  }, []);

  // System Audit Logger
  const logAudit = async (action: string, details: string) => {
    try {
      await addDoc(collection(db, 'system_logs'), {
        user: user.name,
        role: user.role,
        action,
        module: 'CONTROLE_DE_ESTOQUE',
        details,
        timestamp: new Date().toISOString()
      });
    } catch (err) {
      console.error("Erro ao registrar auditoria em system_logs:", err);
    }
  };

  // Date helper functions
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const in30DaysStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split('T')[0];
  }, []);

  // Calculated Analytics & Indicators
  const activeProducts = useMemo(() => products.filter(p => p.status === 'ATIVO'), [products]);

  const lowStockList = useMemo(() => {
    return activeProducts.filter(p => p.quantity < p.minQuantity && p.quantity > 0);
  }, [activeProducts]);

  const outOfStockList = useMemo(() => {
    return activeProducts.filter(p => p.quantity === 0);
  }, [activeProducts]);

  const expiredList = useMemo(() => {
    return activeProducts.filter(p => p.expirationDate && p.expirationDate < todayStr && p.quantity > 0);
  }, [activeProducts]);

  const nearExpiryList = useMemo(() => {
    return activeProducts.filter(p => p.expirationDate && p.expirationDate >= todayStr && p.expirationDate <= in30DaysStr && p.quantity > 0);
  }, [activeProducts, todayStr, in30DaysStr]);

  const totalEstimatedValue = useMemo(() => {
    return activeProducts.reduce((sum, p) => sum + (p.quantity * (p.unitPrice || 0)), 0);
  }, [activeProducts]);

  // Category Distribution for Recharts
  const categoryChartData = useMemo(() => {
    const map: { [key: string]: number } = {};
    activeProducts.forEach(p => {
      map[p.category] = (map[p.category] || 0) + p.quantity;
    });
    return Object.keys(map).map(cat => ({
      name: cat,
      value: map[cat]
    }));
  }, [activeProducts]);

  // Movements Summary Chart Data (Last 6 Months)
  const movementsChartData = useMemo(() => {
    const map: { [key: string]: { month: string; entradas: number; salidas: number } } = {};
    movements.forEach(m => {
      if (!m.date) return;
      const monthKey = m.date.substring(0, 7); // YYYY-MM
      if (!map[monthKey]) {
        const [year, month] = monthKey.split('-');
        map[monthKey] = {
          month: `${month}/${year}`,
          entradas: 0,
          salidas: 0
        };
      }
      if (m.type === 'ENTRADA') map[monthKey].entradas += Number(m.quantity || 0);
      if (m.type === 'SAIDA') map[monthKey].salidas += Number(m.quantity || 0);
    });
    return Object.keys(map).sort().slice(-6).map(k => map[k]);
  }, [movements]);

  // Filtered Products List
  const filteredProducts = useMemo(() => {
    return products.filter(p => {
      // Status Filter
      if (selectedStatus !== 'TODOS' && p.status !== selectedStatus) return false;

      // Category Filter
      if (selectedCategory !== 'TODAS' && p.category !== selectedCategory) return false;

      // Quick Alerts Filter
      if (quickFilter === 'LOW' && !(p.quantity < p.minQuantity && p.quantity > 0)) return false;
      if (quickFilter === 'ZERO' && p.quantity !== 0) return false;
      if (quickFilter === 'EXPIRED' && !(p.expirationDate && p.expirationDate < todayStr && p.quantity > 0)) return false;
      if (quickFilter === 'NEAR' && !(p.expirationDate && p.expirationDate >= todayStr && p.expirationDate <= in30DaysStr && p.quantity > 0)) return false;

      // Search Query
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const nameMatch = p.name.toLowerCase().includes(term);
        const codeMatch = p.code.toLowerCase().includes(term);
        const categoryMatch = p.category.toLowerCase().includes(term);
        const supplierMatch = p.supplier ? p.supplier.toLowerCase().includes(term) : false;
        return nameMatch || codeMatch || categoryMatch || supplierMatch;
      }

      return true;
    });
  }, [products, selectedStatus, selectedCategory, quickFilter, searchTerm, todayStr, in30DaysStr]);

  // Filtered Movements
  const filteredMovements = useMemo(() => {
    return movements.filter(m => {
      if (movementTypeFilter !== 'TODOS' && m.type !== movementTypeFilter) return false;
      if (movementSearch.trim()) {
        const term = movementSearch.toLowerCase();
        return (
          m.productName.toLowerCase().includes(term) ||
          m.productCode.toLowerCase().includes(term) ||
          m.responsible.toLowerCase().includes(term) ||
          (m.destination && m.destination.toLowerCase().includes(term)) ||
          (m.supplier && m.supplier.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [movements, movementTypeFilter, movementSearch]);

  // Open Create Product Modal
  const handleOpenCreateModal = () => {
    setEditingProduct(null);
    setProductForm({
      name: '',
      category: CATEGORIES[0],
      unit: UNITS[0],
      minQuantity: 10,
      location: 'Almoxarifado Central',
      supplier: '',
      unitPrice: '',
      expirationDate: '',
      batchNumber: '',
      notes: ''
    });
    setIsProductModalOpen(true);
  };

  // Open Edit Product Modal
  const handleOpenEditModal = (prod: StockProduct) => {
    setEditingProduct(prod);
    setProductForm({
      name: prod.name,
      category: prod.category,
      unit: prod.unit,
      minQuantity: prod.minQuantity,
      location: prod.location,
      supplier: prod.supplier || '',
      unitPrice: prod.unitPrice !== undefined ? String(prod.unitPrice) : '',
      expirationDate: prod.expirationDate || '',
      batchNumber: prod.batchNumber || '',
      notes: prod.notes || ''
    });
    setIsProductModalOpen(true);
  };

  // Save Product (Create / Update)
  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!productForm.name.trim()) {
      showToast('O nome do produto é obrigatório.', 'error');
      return;
    }

    try {
      if (editingProduct) {
        // Update
        const updatedData = {
          name: productForm.name.trim(),
          category: productForm.category,
          unit: productForm.unit,
          minQuantity: Number(productForm.minQuantity) || 0,
          location: productForm.location.trim(),
          supplier: productForm.supplier.trim(),
          unitPrice: productForm.unitPrice ? Number(productForm.unitPrice) : 0,
          expirationDate: productForm.expirationDate || null,
          batchNumber: productForm.batchNumber.trim() || null,
          notes: productForm.notes.trim() || null,
          updatedAt: new Date().toISOString()
        };

        await updateDoc(doc(db, 'stock_products', editingProduct.id), updatedData);
        await logAudit('ALTERACAO_PRODUTO', `Produto "${editingProduct.name}" (Cód: ${editingProduct.code}) alterado.`);
        showToast('Produto atualizado com sucesso!', 'success');
      } else {
        // Create
        const autoCode = `EST-${Math.floor(1000 + Math.random() * 9000)}`;
        const newProduct = {
          name: productForm.name.trim(),
          category: productForm.category,
          code: autoCode,
          unit: productForm.unit,
          quantity: 0, // Starts at zero until entry is registered
          minQuantity: Number(productForm.minQuantity) || 0,
          location: productForm.location.trim(),
          supplier: productForm.supplier.trim(),
          unitPrice: productForm.unitPrice ? Number(productForm.unitPrice) : 0,
          expirationDate: productForm.expirationDate || null,
          batchNumber: productForm.batchNumber.trim() || null,
          notes: productForm.notes.trim() || null,
          status: 'ATIVO' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          createdBy: user.name
        };

        await addDoc(collection(db, 'stock_products'), newProduct);
        await logAudit('CADASTRO_PRODUTO', `Novo produto cadastrado: "${newProduct.name}" (Cód: ${autoCode}).`);
        showToast(`Produto "${newProduct.name}" cadastrado com sucesso!`, 'success');
      }

      setIsProductModalOpen(false);
    } catch (err) {
      console.error("Erro ao salvar produto:", err);
      showToast('Erro ao salvar produto no banco de dados.', 'error');
    }
  };

  // Toggle Status (Logical Delete / Reactivate)
  const handleToggleProductStatus = (prod: StockProduct) => {
    const isActivating = prod.status === 'INATIVO';
    const actionText = isActivating ? 'reativar' : 'inativar';

    showConfirm(`Deseja realmente ${actionText} o produto "${prod.name}"?`, async () => {
      try {
        const newStatus = isActivating ? 'ATIVO' : 'INATIVO';
        await updateDoc(doc(db, 'stock_products', prod.id), {
          status: newStatus,
          updatedAt: new Date().toISOString()
        });

        const auditAction = isActivating ? 'REATIVACAO_PRODUTO' : 'EXCLUSAO_LOGICA_PRODUTO';
        await logAudit(auditAction, `Produto "${prod.name}" (Cód: ${prod.code}) foi ${isActivating ? 'reativado' : 'inativado'}.`);
        showToast(`Produto ${isActivating ? 'reativado' : 'inativado'} com sucesso!`, 'success');
      } catch (err) {
        console.error(`Erro ao ${actionText} produto:`, err);
        showToast(`Erro ao ${actionText} produto.`, 'error');
      }
    });
  };

  // Open Movement Modal
  const handleOpenMovementModal = (prod?: StockProduct, type: 'ENTRADA' | 'SAIDA' = 'ENTRADA') => {
    setMovementType(type);
    const targetProd = prod || (activeProducts.length > 0 ? activeProducts[0] : null);
    setSelectedProductForMovement(targetProd);

    setMovementForm({
      productId: targetProd ? targetProd.id : '',
      quantity: 1,
      supplier: targetProd ? (targetProd.supplier || '') : '',
      destination: '',
      reason: 'Consumo Interno',
      notes: '',
      date: new Date().toISOString().split('T')[0]
    });

    setIsMovementModalOpen(true);
  };

  // Handle Product Selection change in Movement Modal
  const handleMovementProductSelect = (productId: string) => {
    const found = products.find(p => p.id === productId) || null;
    setSelectedProductForMovement(found);
    setMovementForm(prev => ({
      ...prev,
      productId,
      supplier: found ? (found.supplier || '') : prev.supplier
    }));
  };

  // Save Movement (Entrada / Saída)
  const handleSaveMovement = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedProductForMovement) {
      showToast('Selecione um produto válido.', 'error');
      return;
    }

    const qty = Number(movementForm.quantity);
    if (!qty || qty <= 0) {
      showToast('Informe uma quantidade válida superior a 0.', 'error');
      return;
    }

    const currentQty = selectedProductForMovement.quantity;

    // Safety check for exit: NEVER allow negative stock!
    if (movementType === 'SAIDA' && qty > currentQty) {
      showToast(`A quantidade de saída (${qty}) excede o estoque disponível (${currentQty}). Operação cancelada!`, 'error');
      return;
    }

    const newStock = movementType === 'ENTRADA' ? currentQty + qty : currentQty - qty;

    try {
      // 1. Update product stock quantity
      await updateDoc(doc(db, 'stock_products', selectedProductForMovement.id), {
        quantity: newStock,
        updatedAt: new Date().toISOString()
      });

      // 2. Add movement record
      const movementRecord = {
        productId: selectedProductForMovement.id,
        productName: selectedProductForMovement.name,
        productCode: selectedProductForMovement.code,
        type: movementType,
        quantity: qty,
        stockBefore: currentQty,
        stockAfter: newStock,
        supplier: movementType === 'ENTRADA' ? movementForm.supplier.trim() : null,
        destination: movementType === 'SAIDA' ? movementForm.destination.trim() : null,
        reason: movementType === 'SAIDA' ? movementForm.reason.trim() : null,
        responsible: user.name,
        notes: movementForm.notes.trim() || null,
        date: movementForm.date,
        timestamp: new Date().toISOString()
      };

      await addDoc(collection(db, 'stock_movements'), movementRecord);

      // 3. Log audit
      const auditMsg = movementType === 'ENTRADA'
        ? `Entrada de estoque: +${qty} ${selectedProductForMovement.unit}(s) de "${selectedProductForMovement.name}". Novo saldo: ${newStock}.`
        : `Saída de estoque: -${qty} ${selectedProductForMovement.unit}(s) de "${selectedProductForMovement.name}" para "${movementForm.destination}". Novo saldo: ${newStock}.`;

      await logAudit(movementType === 'ENTRADA' ? 'ENTRADA_ESTOQUE' : 'SAIDA_ESTOQUE', auditMsg);

      showToast(`Movimentação de ${movementType === 'ENTRADA' ? 'Entrada' : 'Saída'} registrada com sucesso!`, 'success');
      setIsMovementModalOpen(false);
    } catch (err) {
      console.error("Erro ao registrar movimentação:", err);
      showToast('Erro ao registrar movimentação no banco de dados.', 'error');
    }
  };

  // Generate Reports in PDF or Word
  const handleExportReportPDF = async () => {
    try {
      let title = '';
      let subtitle = '';
      let columns: string[] = [];
      let data: any[][] = [];

      if (reportType === 'INVENTORY') {
        title = 'Relatório de Inventário Geral de Estoque';
        subtitle = `Emissão: ${new Date().toLocaleDateString('pt-BR')} por ${user.name}`;
        columns = ['Código', 'Produto', 'Categoria', 'Unid.', 'Local', 'Saldo', 'Mínimo', 'Val. Unit', 'Total Est.'];
        data = activeProducts.map(p => [
          p.code,
          p.name,
          p.category,
          p.unit,
          p.location,
          p.quantity,
          p.minQuantity,
          (p.unitPrice || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }),
          (p.quantity * (p.unitPrice || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]);
      } else if (reportType === 'LOW_STOCK') {
        title = 'Relatório de Produtos com Estoque Baixo / Crítico';
        subtitle = `Produtos que necessitam reposição emergencial. Emissão: ${new Date().toLocaleDateString('pt-BR')}`;
        columns = ['Código', 'Produto', 'Categoria', 'Saldo Atual', 'Estoque Mínimo', 'Fornecedor', 'Local'];
        data = [...lowStockList, ...outOfStockList].map(p => [
          p.code,
          p.name,
          p.category,
          p.quantity === 0 ? 'ZERADO (0)' : p.quantity,
          p.minQuantity,
          p.supplier || 'Não inf.',
          p.location
        ]);
      } else if (reportType === 'EXPIRED') {
        title = 'Relatório de Produtos Vencidos ou Próximos do Vencimento';
        subtitle = `Validades monitoradas. Emissão: ${new Date().toLocaleDateString('pt-BR')}`;
        columns = ['Código', 'Produto', 'Categoria', 'Lote', 'Validade', 'Saldo', 'Status Validade'];
        data = [...expiredList, ...nearExpiryList].map(p => {
          const isExp = p.expirationDate && p.expirationDate < todayStr;
          return [
            p.code,
            p.name,
            p.category,
            p.batchNumber || 'N/A',
            p.expirationDate ? p.expirationDate.split('-').reverse().join('/') : 'N/A',
            p.quantity,
            isExp ? '❌ VENCIDO' : '⚠️ PRÓXIMO DO VENCIMENTO'
          ];
        });
      } else if (reportType === 'MOVEMENTS') {
        title = 'Relatório de Movimentações de Estoque';
        subtitle = `Período: ${reportStartDate.split('-').reverse().join('/')} a ${reportEndDate.split('-').reverse().join('/')}`;
        columns = ['Data', 'Tipo', 'Código', 'Produto', 'Qtd', 'Saldo Ant.', 'Saldo Pós', 'Destino/Fornecedor', 'Responsável'];
        
        const periodMovements = movements.filter(m => {
          if (!m.date) return false;
          return m.date >= reportStartDate && m.date <= reportEndDate;
        });

        data = periodMovements.map(m => [
          m.date.split('-').reverse().join('/'),
          m.type,
          m.productCode,
          m.productName,
          m.type === 'ENTRADA' ? `+${m.quantity}` : `-${m.quantity}`,
          m.stockBefore,
          m.stockAfter,
          m.type === 'ENTRADA' ? (m.supplier || 'N/I') : (m.destination || 'N/I'),
          m.responsible
        ]);
      }

      await generateModernPDF({
        title,
        subtitle,
        columns,
        data,
        fileName: `Relatorio_Estoque_${reportType}_${new Date().toISOString().substring(0, 10)}.pdf`,
        orientation: 'landscape'
      });

      showToast('Relatório em PDF gerado com sucesso!', 'success');
    } catch (err) {
      console.error("Erro ao gerar PDF:", err);
      showToast('Erro ao exportar PDF.', 'error');
    }
  };

  const handleExportReportWord = async () => {
    try {
      let title = '';
      let subtitle = '';
      let columns: string[] = [];
      let data: any[][] = [];

      if (reportType === 'INVENTORY') {
        title = 'Relatório de Inventário Geral de Estoque';
        subtitle = `Emissão: ${new Date().toLocaleDateString('pt-BR')} por ${user.name}`;
        columns = ['Código', 'Produto', 'Categoria', 'Unid.', 'Local', 'Saldo', 'Mínimo', 'Total Est.'];
        data = activeProducts.map(p => [
          p.code,
          p.name,
          p.category,
          p.unit,
          p.location,
          p.quantity,
          p.minQuantity,
          (p.quantity * (p.unitPrice || 0)).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
        ]);
      } else if (reportType === 'LOW_STOCK') {
        title = 'Relatório de Produtos com Estoque Baixo';
        subtitle = `Emissão: ${new Date().toLocaleDateString('pt-BR')}`;
        columns = ['Código', 'Produto', 'Categoria', 'Saldo', 'Mínimo', 'Fornecedor'];
        data = [...lowStockList, ...outOfStockList].map(p => [
          p.code,
          p.name,
          p.category,
          p.quantity,
          p.minQuantity,
          p.supplier || 'N/I'
        ]);
      } else if (reportType === 'EXPIRED') {
        title = 'Relatório de Validades do Estoque';
        subtitle = `Emissão: ${new Date().toLocaleDateString('pt-BR')}`;
        columns = ['Código', 'Produto', 'Lote', 'Validade', 'Saldo', 'Status'];
        data = [...expiredList, ...nearExpiryList].map(p => [
          p.code,
          p.name,
          p.batchNumber || 'N/I',
          p.expirationDate ? p.expirationDate.split('-').reverse().join('/') : 'N/I',
          p.quantity,
          p.expirationDate && p.expirationDate < todayStr ? 'VENCIDO' : 'PRÓXIMO VENCIMENTO'
        ]);
      } else {
        title = 'Relatório de Movimentações de Estoque';
        subtitle = `Período: ${reportStartDate.split('-').reverse().join('/')} a ${reportEndDate.split('-').reverse().join('/')}`;
        columns = ['Data', 'Tipo', 'Código', 'Produto', 'Qtd', 'Responsável'];
        
        const periodMovements = movements.filter(m => m.date >= reportStartDate && m.date <= reportEndDate);
        data = periodMovements.map(m => [
          m.date.split('-').reverse().join('/'),
          m.type,
          m.productCode,
          m.productName,
          m.quantity,
          m.responsible
        ]);
      }

      await generateModernWord({
        title,
        subtitle,
        columns,
        data,
        fileName: `Relatorio_Estoque_${reportType}_${new Date().toISOString().substring(0, 10)}.docx`
      });

      showToast('Relatório em Word (.docx) gerado com sucesso!', 'success');
    } catch (err) {
      console.error("Erro ao gerar Word:", err);
      showToast('Erro ao exportar arquivo Word.', 'error');
    }
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-700 via-emerald-600 to-teal-700 dark:from-emerald-900 dark:to-teal-900 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 opacity-10 pointer-events-none p-6">
          <Boxes size={220} />
        </div>

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 text-emerald-200 text-xs font-bold uppercase tracking-widest mb-1">
              <Boxes size={16} /> Módulo Oficial de Gestão
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Controle de Estoque e Almoxarifado</h1>
            <p className="text-emerald-100 text-xs sm:text-sm mt-1 max-w-2xl font-medium">
              Gestão de materiais, insumos, medicamentos e doações com controle rígido de lote, validade e movimentações.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleOpenMovementModal(undefined, 'ENTRADA')}
              className="bg-white text-emerald-800 hover:bg-emerald-50 px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <ArrowDownLeft size={18} className="text-emerald-600" />
              Entrada de Insumos
            </button>
            <button
              onClick={() => handleOpenMovementModal(undefined, 'SAIDA')}
              className="bg-emerald-800/80 hover:bg-emerald-900 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md border border-emerald-500/30 transition-all flex items-center gap-2"
            >
              <ArrowUpRight size={18} className="text-amber-300" />
              Saída de Insumos
            </button>
            <button
              onClick={handleOpenCreateModal}
              className="bg-emerald-500 hover:bg-emerald-400 text-white px-4 py-2.5 rounded-2xl font-bold text-xs sm:text-sm shadow-md transition-all flex items-center gap-2"
            >
              <Plus size={18} />
              Novo Produto
            </button>
          </div>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 p-1 bg-gray-100 dark:bg-gray-800/80 rounded-2xl w-fit overflow-x-auto max-w-full">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'dashboard'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <BarChart3 size={16} /> Visão Geral & Indicadores
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <Package size={16} /> Catálogo de Produtos ({activeProducts.length})
        </button>

        <button
          onClick={() => setActiveTab('movements')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'movements'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <History size={16} /> Histórico de Movimentações ({movements.length})
        </button>

        <button
          onClick={() => setActiveTab('reports')}
          className={`px-5 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'reports'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
          }`}
        >
          <FileText size={16} /> Relatórios & Inventário
        </button>
      </div>

      {/* DASHBOARD TAB */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* CRITICAL ALERTS BANNER */}
          {(lowStockList.length > 0 || outOfStockList.length > 0 || expiredList.length > 0 || nearExpiryList.length > 0) && (
            <div className="bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 rounded-3xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold text-sm">
                  <AlertTriangle size={20} className="text-amber-600 animate-pulse" />
                  Alertas Críticos de Estoque que Necessitam Atenção
                </div>
                <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-full">
                  {(lowStockList.length + outOfStockList.length + expiredList.length + nearExpiryList.length)} Ocorrências
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                {outOfStockList.length > 0 && (
                  <button 
                    onClick={() => { setQuickFilter('ZERO'); setActiveTab('products'); }}
                    className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-rose-200 dark:border-rose-900 text-left hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase text-rose-600">Estoque Zerado</p>
                      <p className="text-lg font-black text-rose-700 dark:text-rose-400">{outOfStockList.length} itens</p>
                    </div>
                    <XCircle className="text-rose-500" size={22} />
                  </button>
                )}

                {lowStockList.length > 0 && (
                  <button 
                    onClick={() => { setQuickFilter('LOW'); setActiveTab('products'); }}
                    className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-amber-200 dark:border-amber-900 text-left hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase text-amber-600">Abaixo do Mínimo</p>
                      <p className="text-lg font-black text-amber-700 dark:text-amber-400">{lowStockList.length} itens</p>
                    </div>
                    <AlertTriangle className="text-amber-500" size={22} />
                  </button>
                )}

                {expiredList.length > 0 && (
                  <button 
                    onClick={() => { setQuickFilter('EXPIRED'); setActiveTab('products'); }}
                    className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-red-200 dark:border-red-900 text-left hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase text-red-600">Produtos Vencidos</p>
                      <p className="text-lg font-black text-red-700 dark:text-red-400">{expiredList.length} itens</p>
                    </div>
                    <ShieldAlert className="text-red-500" size={22} />
                  </button>
                )}

                {nearExpiryList.length > 0 && (
                  <button 
                    onClick={() => { setQuickFilter('NEAR'); setActiveTab('products'); }}
                    className="p-3 bg-white dark:bg-gray-900 rounded-2xl border border-orange-200 dark:border-orange-900 text-left hover:shadow-md transition-all flex items-center justify-between"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase text-orange-600">Vence em 30 Dias</p>
                      <p className="text-lg font-black text-orange-700 dark:text-orange-400">{nearExpiryList.length} itens</p>
                    </div>
                    <Clock className="text-orange-500" size={22} />
                  </button>
                )}
              </div>
            </div>
          )}

          {/* KPI METRIC CARDS */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            
            {/* Total Active Products */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Total de Itens</span>
                <span className="p-2 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <Package size={18} />
                </span>
              </div>
              <p className="text-2xl font-black text-gray-900 dark:text-white">{activeProducts.length}</p>
              <p className="text-[11px] text-gray-400">Cadastrados e ativos</p>
            </div>

            {/* Total Estimated Stock Value */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-gray-500 uppercase tracking-wider">Valor Estimado</span>
                <span className="p-2 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-xl">
                  <DollarSign size={18} />
                </span>
              </div>
              <p className="text-2xl font-black text-blue-600 dark:text-blue-400">
                {totalEstimatedValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <p className="text-[11px] text-gray-400">Patrimônio em estoque</p>
            </div>

            {/* Low Stock Count */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Estoque Baixo</span>
                <span className="p-2 bg-amber-100 dark:bg-amber-900/40 text-amber-600 rounded-xl">
                  <AlertTriangle size={18} />
                </span>
              </div>
              <p className="text-2xl font-black text-amber-600 dark:text-amber-400">{lowStockList.length}</p>
              <p className="text-[11px] text-gray-400">Abaixo da cota mínima</p>
            </div>

            {/* Expired Products */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-rose-600 dark:text-rose-400 uppercase tracking-wider">Vencidos</span>
                <span className="p-2 bg-rose-100 dark:bg-rose-900/40 text-rose-600 rounded-xl">
                  <XCircle size={18} />
                </span>
              </div>
              <p className="text-2xl font-black text-rose-600 dark:text-rose-400">{expiredList.length}</p>
              <p className="text-[11px] text-gray-400">Validade expirada</p>
            </div>

            {/* Near Expiry */}
            <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-orange-600 dark:text-orange-400 uppercase tracking-wider">Próximo Venc.</span>
                <span className="p-2 bg-orange-100 dark:bg-orange-900/40 text-orange-600 rounded-xl">
                  <Clock size={18} />
                </span>
              </div>
              <p className="text-2xl font-black text-orange-600 dark:text-orange-400">{nearExpiryList.length}</p>
              <p className="text-[11px] text-gray-400">Vencimento nos prox 30 dias</p>
            </div>

          </div>

          {/* CHARTS GRID */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            
            {/* Category Breakdown Chart */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-gray-800 dark:text-white flex items-center gap-2">
                  <Layers size={18} className="text-emerald-600" />
                  Distribuição por Categoria
                </h3>
                <span className="text-xs text-gray-400">Unidades Totais</span>
              </div>

              {categoryChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={categoryChartData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        innerRadius={45}
                        paddingAngle={4}
                        label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                      >
                        {categoryChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: any) => [`${value} unidades`, 'Quantidade']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-20 text-center text-gray-400 text-xs italic">
                  Nenhum produto cadastrado para gerar o gráfico.
                </div>
              )}
            </div>

            {/* Monthly Movements Comparison */}
            <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-extrabold text-base text-gray-800 dark:text-white flex items-center gap-2">
                  <BarChart3 size={18} className="text-emerald-600" />
                  Fluxo de Entradas e Saídas Recentes
                </h3>
                <span className="text-xs text-gray-400">Últimos meses</span>
              </div>

              {movementsChartData.length > 0 ? (
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={movementsChartData}>
                      <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="entradas" name="Entradas (+)" fill="#10B981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="salidas" name="Saídas (-)" fill="#EF4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="py-20 text-center text-gray-400 text-xs italic">
                  Nenhuma movimentação registrada para exibir histórico.
                </div>
              )}
            </div>

          </div>

          {/* RECENT MOVEMENTS TABLE SUMMARY */}
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-extrabold text-base text-gray-800 dark:text-white flex items-center gap-2">
                <History size={18} className="text-emerald-600" />
                Últimas Movimentações no Estoque
              </h3>
              <button
                onClick={() => setActiveTab('movements')}
                className="text-xs font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
              >
                Ver Todas <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/60 text-gray-500 font-bold uppercase border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3 px-4">Data/Hora</th>
                    <th className="py-3 px-4">Tipo</th>
                    <th className="py-3 px-4">Produto</th>
                    <th className="py-3 px-4">Quantidade</th>
                    <th className="py-3 px-4">Destino / Fornecedor</th>
                    <th className="py-3 px-4">Responsável</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {movements.slice(0, 5).map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30">
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300 font-medium">
                        {m.date ? m.date.split('-').reverse().join('/') : '-'}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          m.type === 'ENTRADA'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {m.type}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-800 dark:text-white">
                        {m.productName} <span className="text-[10px] font-normal text-gray-400">({m.productCode})</span>
                      </td>
                      <td className="py-3 px-4 font-black">
                        {m.type === 'ENTRADA' ? '+' : '-'}{m.quantity}
                      </td>
                      <td className="py-3 px-4 text-gray-600 dark:text-gray-300">
                        {m.type === 'ENTRADA' ? (m.supplier || '—') : (m.destination || '—')}
                      </td>
                      <td className="py-3 px-4 text-gray-500 font-medium">{m.responsible}</td>
                    </tr>
                  ))}

                  {movements.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-gray-400 italic">
                        Nenhuma movimentação registrada recentemente.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* PRODUCTS TAB */}
      {activeTab === 'products' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* SEARCH & FILTERS BAR */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
            
            {/* Search input */}
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por nome, código, categoria ou fornecedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TODAS">Todas Categorias</option>
                {CATEGORIES.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>

              {/* Status Filter */}
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="ATIVO">Status: Ativos</option>
                <option value="INATIVO">Status: Inativos</option>
                <option value="TODOS">Status: Todos</option>
              </select>

              {/* Add Product Button */}
              <button
                onClick={handleOpenCreateModal}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Novo Produto
              </button>
            </div>
          </div>

          {/* QUICK ALERTS FILTER CHIPS */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">Filtros Rápidos:</span>
            
            <button
              onClick={() => setQuickFilter('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                quickFilter === 'ALL'
                  ? 'bg-gray-800 text-white dark:bg-white dark:text-gray-900'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 hover:bg-gray-100'
              }`}
            >
              Todos os Produtos
            </button>

            <button
              onClick={() => setQuickFilter('LOW')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                quickFilter === 'LOW'
                  ? 'bg-amber-500 text-white'
                  : 'bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 hover:bg-amber-100'
              }`}
            >
              <AlertTriangle size={14} /> Estoque Baixo ({lowStockList.length})
            </button>

            <button
              onClick={() => setQuickFilter('ZERO')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                quickFilter === 'ZERO'
                  ? 'bg-rose-600 text-white'
                  : 'bg-rose-50 dark:bg-rose-900/30 text-rose-700 dark:text-rose-300 hover:bg-rose-100'
              }`}
            >
              <XCircle size={14} /> Sem Estoque ({outOfStockList.length})
            </button>

            <button
              onClick={() => setQuickFilter('EXPIRED')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                quickFilter === 'EXPIRED'
                  ? 'bg-red-600 text-white'
                  : 'bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 hover:bg-red-100'
              }`}
            >
              <ShieldAlert size={14} /> Vencidos ({expiredList.length})
            </button>

            <button
              onClick={() => setQuickFilter('NEAR')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
                quickFilter === 'NEAR'
                  ? 'bg-orange-500 text-white'
                  : 'bg-orange-50 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300 hover:bg-orange-100'
              }`}
            >
              <Clock size={14} /> Prox. Vencimento ({nearExpiryList.length})
            </button>
          </div>

          {/* PRODUCTS TABLE LIST */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 font-bold uppercase border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3.5 px-4">Código / Produto</th>
                    <th className="py-3.5 px-4">Categoria</th>
                    <th className="py-3.5 px-4">Localização</th>
                    <th className="py-3.5 px-4 text-center">Saldo Atual</th>
                    <th className="py-3.5 px-4 text-center">Estoque Mínimo</th>
                    <th className="py-3.5 px-4">Fornecedor</th>
                    <th className="py-3.5 px-4">Validade / Lote</th>
                    <th className="py-3.5 px-4 text-center">Status</th>
                    <th className="py-3.5 px-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredProducts.map(p => {
                    const isLow = p.quantity < p.minQuantity && p.quantity > 0;
                    const isZero = p.quantity === 0;
                    const isExpired = p.expirationDate && p.expirationDate < todayStr;
                    const isNearExpiry = p.expirationDate && p.expirationDate >= todayStr && p.expirationDate <= in30DaysStr;

                    return (
                      <tr key={p.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                        
                        {/* Name & Code */}
                        <td className="py-3.5 px-4">
                          <div className="font-extrabold text-gray-900 dark:text-white text-sm">{p.name}</div>
                          <div className="text-[10px] text-gray-400 font-mono flex items-center gap-2 mt-0.5">
                            <span className="bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">{p.code}</span>
                            <span>{p.unit}</span>
                          </div>
                        </td>

                        {/* Category */}
                        <td className="py-3.5 px-4 font-semibold text-gray-700 dark:text-gray-300">
                          {p.category}
                        </td>

                        {/* Location */}
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          <div className="flex items-center gap-1">
                            <MapPin size={12} className="text-gray-400" />
                            {p.location}
                          </div>
                        </td>

                        {/* Quantity */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-3 py-1 rounded-xl font-black text-xs ${
                            isZero
                              ? 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                              : isLow
                              ? 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300'
                              : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                          }`}>
                            {p.quantity} {p.unit}s
                          </span>
                        </td>

                        {/* Min Quantity */}
                        <td className="py-3.5 px-4 text-center font-bold text-gray-500">
                          {p.minQuantity}
                        </td>

                        {/* Supplier */}
                        <td className="py-3.5 px-4 text-gray-600 dark:text-gray-400 font-medium">
                          {p.supplier || '—'}
                        </td>

                        {/* Expiration & Batch */}
                        <td className="py-3.5 px-4">
                          {p.expirationDate ? (
                            <div>
                              <span className={`font-bold text-[11px] ${
                                isExpired
                                  ? 'text-red-600 dark:text-red-400'
                                  : isNearExpiry
                                  ? 'text-orange-600 dark:text-orange-400'
                                  : 'text-gray-700 dark:text-gray-300'
                              }`}>
                                {p.expirationDate.split('-').reverse().join('/')}
                              </span>
                              {p.batchNumber && (
                                <div className="text-[10px] text-gray-400">Lote: {p.batchNumber}</div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">Não aplicável</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 text-center">
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                            p.status === 'ATIVO'
                              ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300'
                              : 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                          }`}>
                            {p.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            
                            {/* Entrada rápida */}
                            <button
                              onClick={() => handleOpenMovementModal(p, 'ENTRADA')}
                              title="Registrar Entrada"
                              className="p-1.5 bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 rounded-xl hover:bg-emerald-100 transition-colors"
                            >
                              <ArrowDownLeft size={16} />
                            </button>

                            {/* Saída rápida */}
                            <button
                              onClick={() => handleOpenMovementModal(p, 'SAIDA')}
                              title="Registrar Saída"
                              className="p-1.5 bg-rose-50 dark:bg-rose-900/30 text-rose-600 rounded-xl hover:bg-rose-100 transition-colors"
                            >
                              <ArrowUpRight size={16} />
                            </button>

                            {/* Editar */}
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Editar Produto"
                              className="p-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors"
                            >
                              <Edit size={16} />
                            </button>

                            {/* Inativar / Reativar */}
                            <button
                              onClick={() => handleToggleProductStatus(p)}
                              title={p.status === 'ATIVO' ? 'Inativar Produto' : 'Reativar Produto'}
                              className={`p-1.5 rounded-xl transition-colors ${
                                p.status === 'ATIVO'
                                  ? 'bg-gray-100 dark:bg-gray-700 text-gray-500 hover:bg-gray-200'
                                  : 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 hover:bg-emerald-200'
                              }`}
                            >
                              {p.status === 'ATIVO' ? <XCircle size={16} /> : <RefreshCw size={16} />}
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}

                  {filteredProducts.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                        Nenhum produto encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* MOVEMENTS TAB */}
      {activeTab === 'movements' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          {/* SEARCH & FILTER FOR MOVEMENTS */}
          <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por produto, código, responsável ou destino..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-4 py-2.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="ENTRADA">Apenas Entradas (+)</option>
                <option value="SAIDA">Apenas Saídas (-)</option>
              </select>

              <button
                onClick={() => handleOpenMovementModal(undefined, 'ENTRADA')}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-2xl font-bold text-xs shadow-md transition-all flex items-center gap-2"
              >
                <Plus size={16} /> Nova Movimentação
              </button>
            </div>
          </div>

          {/* MOVEMENTS HISTORY TABLE */}
          <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-gray-50 dark:bg-gray-900/80 text-gray-500 font-bold uppercase border-b border-gray-100 dark:border-gray-700">
                  <tr>
                    <th className="py-3.5 px-4">Data</th>
                    <th className="py-3.5 px-4 text-center">Tipo</th>
                    <th className="py-3.5 px-4">Código / Produto</th>
                    <th className="py-3.5 px-4 text-center">Qtd Movimentada</th>
                    <th className="py-3.5 px-4 text-center">Saldo Ant.</th>
                    <th className="py-3.5 px-4 text-center">Saldo Pós</th>
                    <th className="py-3.5 px-4">Destino / Fornecedor / Motivo</th>
                    <th className="py-3.5 px-4">Responsável</th>
                    <th className="py-3.5 px-4">Observação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {filteredMovements.map(m => (
                    <tr key={m.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-700/30 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-gray-700 dark:text-gray-300">
                        {m.date ? m.date.split('-').reverse().join('/') : '-'}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-black ${
                          m.type === 'ENTRADA'
                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300'
                            : 'bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300'
                        }`}>
                          {m.type}
                        </span>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-extrabold text-gray-900 dark:text-white">{m.productName}</div>
                        <div className="text-[10px] text-gray-400">{m.productCode}</div>
                      </td>

                      <td className="py-3.5 px-4 text-center font-black text-sm">
                        <span className={m.type === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}>
                          {m.type === 'ENTRADA' ? '+' : '-'}{m.quantity}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center text-gray-500 font-medium">
                        {m.stockBefore}
                      </td>

                      <td className="py-3.5 px-4 text-center font-extrabold text-gray-800 dark:text-gray-200">
                        {m.stockAfter}
                      </td>

                      <td className="py-3.5 px-4 text-gray-600 dark:text-gray-300 font-medium">
                        {m.type === 'ENTRADA' ? (
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase">Fornecedor</span>
                            {m.supplier || 'Não informado'}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase">Destino: {m.destination || 'N/I'}</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400">Motivo: {m.reason || 'N/I'}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-bold">
                        {m.responsible}
                      </td>

                      <td className="py-3.5 px-4 text-gray-400 italic text-[11px] max-w-xs truncate">
                        {m.notes || '—'}
                      </td>
                    </tr>
                  ))}

                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-12 text-center text-gray-400 italic">
                        Nenhuma movimentação localizada no histórico.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}

      {/* REPORTS TAB */}
      {activeTab === 'reports' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 space-y-6">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl">
                <FileText size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-gray-900 dark:text-white">Gerador de Relatórios e Inventário</h2>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  Emita relatórios detalhados do estoque em formatos PDF ou Word (.docx) para fiscalização e auditoria.
                </p>
              </div>
            </div>

            {/* REPORT TYPE SELECTOR */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <button
                onClick={() => setReportType('INVENTORY')}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  reportType === 'INVENTORY'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <Boxes className="text-emerald-600 mb-2" size={24} />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Inventário Completo</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Lista todos os produtos ativos, localização, saldos e valores estimados.</p>
              </button>

              <button
                onClick={() => setReportType('LOW_STOCK')}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  reportType === 'LOW_STOCK'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <AlertTriangle className="text-amber-500 mb-2" size={24} />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Estoque Baixo & Zerado</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Foco nos produtos que necessitam de compras e reposição imediata.</p>
              </button>

              <button
                onClick={() => setReportType('EXPIRED')}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  reportType === 'EXPIRED'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <Clock className="text-rose-500 mb-2" size={24} />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Validade e Lotes</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Produtos com data de validade expirada ou próximos do vencimento.</p>
              </button>

              <button
                onClick={() => setReportType('MOVEMENTS')}
                className={`p-5 rounded-2xl border text-left transition-all ${
                  reportType === 'MOVEMENTS'
                    ? 'bg-emerald-50 dark:bg-emerald-900/30 border-emerald-500 ring-2 ring-emerald-500/20'
                    : 'bg-gray-50 dark:bg-gray-900 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                }`}
              >
                <History className="text-blue-500 mb-2" size={24} />
                <h4 className="font-extrabold text-sm text-gray-900 dark:text-white">Movimentações por Período</h4>
                <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-1">Histórico de entradas e saídas em um intervalo de datas.</p>
              </button>

            </div>

            {/* DATE RANGE FILTER FOR MOVEMENTS REPORT */}
            {reportType === 'MOVEMENTS' && (
              <div className="p-4 bg-gray-50 dark:bg-gray-900 rounded-2xl flex flex-wrap items-center gap-4 border border-gray-200 dark:border-gray-700">
                <span className="text-xs font-bold text-gray-600 dark:text-gray-300">Filtrar Período:</span>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Data Inicial</label>
                  <input
                    type="date"
                    value={reportStartDate}
                    onChange={(e) => setReportStartDate(e.target.value)}
                    className="p-2 bg-white dark:bg-gray-800 border rounded-xl text-xs font-bold"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-gray-400 uppercase">Data Final</label>
                  <input
                    type="date"
                    value={reportEndDate}
                    onChange={(e) => setReportEndDate(e.target.value)}
                    className="p-2 bg-white dark:bg-gray-800 border rounded-xl text-xs font-bold"
                  />
                </div>
              </div>
            )}

            {/* EXPORT ACTION BUTTONS */}
            <div className="flex flex-wrap gap-3 pt-4 border-t border-gray-100 dark:border-gray-700">
              <button
                onClick={handleExportReportPDF}
                className="px-6 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <Download size={18} />
                Exportar em PDF
              </button>

              <button
                onClick={handleExportReportWord}
                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs sm:text-sm rounded-2xl shadow-md transition-all flex items-center gap-2"
              >
                <FileSpreadsheet size={18} />
                Exportar em Word (.docx)
              </button>

              <button
                onClick={() => window.print()}
                className="px-5 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 text-gray-700 dark:text-gray-200 font-bold text-xs sm:text-sm rounded-2xl transition-all flex items-center gap-2"
              >
                <Printer size={18} />
                Imprimir
              </button>
            </div>

          </div>

        </div>
      )}

      {/* MODAL: REGISTER / EDIT PRODUCT */}
      {isProductModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-2xl w-full border border-gray-100 dark:border-gray-800 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className="p-6 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex justify-between items-center">
              <div>
                <h3 className="text-lg font-black">{editingProduct ? 'Editar Produto' : 'Cadastrar Novo Produto'}</h3>
                <p className="text-xs text-emerald-100 mt-0.5">Preencha as informações do item para o catálogo de estoque</p>
              </div>
              <button onClick={() => setIsProductModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="p-6 space-y-4">
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Nome do Produto *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Paracetamol 500mg, Sabonete Líquido, etc."
                    value={productForm.name}
                    onChange={(e) => setProductForm({ ...productForm, name: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Categoria *</label>
                  <select
                    value={productForm.category}
                    onChange={(e) => setProductForm({ ...productForm, category: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {CATEGORIES.map(c => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Unidade de Medida *</label>
                  <select
                    value={productForm.unit}
                    onChange={(e) => setProductForm({ ...productForm, unit: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    {UNITS.map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Estoque Mínimo (Alerta) *</label>
                  <input
                    type="number"
                    min="0"
                    required
                    value={productForm.minQuantity}
                    onChange={(e) => setProductForm({ ...productForm, minQuantity: Number(e.target.value) })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Local de Armazenamento *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Almoxarifado Central, Prateleira B3"
                    value={productForm.location}
                    onChange={(e) => setProductForm({ ...productForm, location: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fornecedor Principal</label>
                  <input
                    type="text"
                    placeholder="Ex: Farmácia X, Distribuidora Y"
                    value={productForm.supplier}
                    onChange={(e) => setProductForm({ ...productForm, supplier: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Valor Unitário Estimado (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    value={productForm.unitPrice}
                    onChange={(e) => setProductForm({ ...productForm, unitPrice: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data de Validade (Se houver)</label>
                  <input
                    type="date"
                    value={productForm.expirationDate}
                    onChange={(e) => setProductForm({ ...productForm, expirationDate: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Número do Lote (Se houver)</label>
                  <input
                    type="text"
                    placeholder="Ex: LOTE-2026-X"
                    value={productForm.batchNumber}
                    onChange={(e) => setProductForm({ ...productForm, batchNumber: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações</label>
                  <textarea
                    rows={2}
                    placeholder="Outras informações ou instruções específicas..."
                    value={productForm.notes}
                    onChange={(e) => setProductForm({ ...productForm, notes: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsProductModalOpen(false)}
                  className="flex-1 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 px-5 py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-2xl text-xs shadow-md transition-colors"
                >
                  {editingProduct ? 'Salvar Alterações' : 'Cadastrar Produto'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: REGISTER MOVEMENT (ENTRADA / SAÍDA) */}
      {isMovementModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 dark:border-gray-800 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            
            <div className={`p-6 text-white flex justify-between items-center ${
              movementType === 'ENTRADA' ? 'bg-gradient-to-r from-emerald-600 to-teal-600' : 'bg-gradient-to-r from-rose-600 to-red-600'
            }`}>
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  {movementType === 'ENTRADA' ? <ArrowDownLeft size={22} /> : <ArrowUpRight size={22} />}
                  Registrar {movementType === 'ENTRADA' ? 'Entrada no Estoque (+)' : 'Saída do Estoque (-)'}
                </h3>
                <p className="text-xs opacity-90 mt-0.5">
                  Atualização automática do saldo e histórico do almoxarifado
                </p>
              </div>
              <button onClick={() => setIsMovementModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveMovement} className="p-6 space-y-4">
              
              {/* Select Product */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Selecione o Produto *</label>
                <select
                  required
                  value={movementForm.productId}
                  onChange={(e) => handleMovementProductSelect(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Escolha um produto --</option>
                  {activeProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.code}) — Saldo Atual: {p.quantity} {p.unit}s
                    </option>
                  ))}
                </select>
              </div>

              {selectedProductForMovement && (
                <div className="p-3 bg-gray-50 dark:bg-gray-800/60 rounded-2xl border border-gray-200 dark:border-gray-700 text-xs flex justify-between items-center">
                  <div>
                    <p className="font-bold text-gray-800 dark:text-white">{selectedProductForMovement.name}</p>
                    <p className="text-[10px] text-gray-400">Categoria: {selectedProductForMovement.category} | Local: {selectedProductForMovement.location}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-gray-400 uppercase block font-bold">Saldo Atual</span>
                    <span className="font-black text-sm text-emerald-600 dark:text-emerald-400">
                      {selectedProductForMovement.quantity} {selectedProductForMovement.unit}s
                    </span>
                  </div>
                </div>
              )}

              {/* Quantity */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Quantidade Movimentada *</label>
                <input
                  type="number"
                  min="1"
                  max={movementType === 'SAIDA' && selectedProductForMovement ? selectedProductForMovement.quantity : undefined}
                  required
                  value={movementForm.quantity}
                  onChange={(e) => setMovementForm({ ...movementForm, quantity: Number(e.target.value) })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Conditional fields for ENTRADA */}
              {movementType === 'ENTRADA' && (
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Fornecedor / Origem</label>
                  <input
                    type="text"
                    placeholder="Ex: Distribuidora X, Doação, etc."
                    value={movementForm.supplier}
                    onChange={(e) => setMovementForm({ ...movementForm, supplier: e.target.value })}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              )}

              {/* Conditional fields for SAIDA */}
              {movementType === 'SAIDA' && (
                <>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Destino (Setor, Profissional ou Idoso) *</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Enfermaria, Cozinha, Idoso João Silva"
                      value={movementForm.destination}
                      onChange={(e) => setMovementForm({ ...movementForm, destination: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Motivo da Saída *</label>
                    <select
                      value={movementForm.reason}
                      onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                    >
                      <option value="Consumo Interno">Consumo Interno</option>
                      <option value="Atendimento de Rotina">Atendimento de Rotina</option>
                      <option value="Descarte por Validade">Descarte por Validade Expirada</option>
                      <option value="Descarte por Avaria">Descarte por Avaria / Dano</option>
                      <option value="Transferência de Setor">Transferência de Setor</option>
                      <option value="Outro">Outro Motivo</option>
                    </select>
                  </div>
                </>
              )}

              {/* Date */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Data da Movimentação *</label>
                <input
                  type="date"
                  required
                  value={movementForm.date}
                  onChange={(e) => setMovementForm({ ...movementForm, date: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Responsible */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Responsável pelo Registro</label>
                <input
                  type="text"
                  disabled
                  value={user.name}
                  className="w-full p-3 bg-gray-100 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-500 cursor-not-allowed"
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Observações Gerais</label>
                <textarea
                  rows={2}
                  placeholder="Justificativas ou notas adicionais..."
                  value={movementForm.notes}
                  onChange={(e) => setMovementForm({ ...movementForm, notes: e.target.value })}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Submit / Cancel Buttons */}
              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsMovementModalOpen(false)}
                  className="flex-1 px-5 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className={`flex-1 px-5 py-3 font-bold rounded-2xl text-xs shadow-md transition-colors text-white ${
                    movementType === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  }`}
                >
                  Confirmar {movementType === 'ENTRADA' ? 'Entrada' : 'Saída'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
