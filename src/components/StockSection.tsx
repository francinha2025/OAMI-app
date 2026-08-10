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
  UserCheck,
  Gift,
  ShoppingBag,
  Eye,
  CreditCard,
  Ban,
  Check,
  ExternalLink,
  Receipt,
  Trash2,
  Pencil
} from 'lucide-react';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  setDoc,
  deleteDoc,
  doc, 
  onSnapshot, 
  query, 
  orderBy, 
  serverTimestamp 
} from 'firebase/firestore';
import { cleanData } from '../lib/utils';
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
  const [movementOriginFilter, setMovementOriginFilter] = useState<'TODOS' | 'COMPRA_TODAS' | 'COMPRA_DEDUZIDA' | 'COMPRA_NAO_DEDUZIDA' | 'DOACAO'>('TODOS');

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null);

  const [isMovementModalOpen, setIsMovementModalOpen] = useState(false);
  const [movementType, setMovementType] = useState<'ENTRADA' | 'SAIDA'>('ENTRADA');
  const [selectedProductForMovement, setSelectedProductForMovement] = useState<StockProduct | null>(null);
  const [selectedMovementForDetails, setSelectedMovementForDetails] = useState<StockMovement | null>(null);
  const [isSubmittingMovement, setIsSubmittingMovement] = useState(false);

  // Edit Movement Modal State
  const [isEditMovementModalOpen, setIsEditMovementModalOpen] = useState(false);
  const [editingMovement, setEditingMovement] = useState<StockMovement | null>(null);
  const [isSubmittingEditMovement, setIsSubmittingEditMovement] = useState(false);
  const [editMovementForm, setEditMovementForm] = useState({
    quantity: 1,
    date: new Date().toISOString().split('T')[0],
    notes: '',
    entryOrigin: 'COMPRA' as 'COMPRA' | 'DOACAO',
    supplier: '',
    invoiceNumber: '',
    unitPrice: '',
    totalPrice: '',
    deductFromTreasury: true,
    donorName: '',
    estimatedValue: '',
    destination: '',
    reason: 'Consumo Interno'
  });

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
    date: new Date().toISOString().split('T')[0],
    // Treasury & Entry Origin Integration
    entryOrigin: 'COMPRA' as 'COMPRA' | 'DOACAO',
    unitPrice: '',
    totalPrice: '',
    invoiceNumber: '',
    deductFromTreasury: true,
    donorName: '',
    estimatedValue: ''
  });

  // Alert Editing State
  const [isAlertsManagerOpen, setIsAlertsManagerOpen] = useState(false);
  const [alertFilterCategory, setAlertFilterCategory] = useState<'ALL_ALERTS' | 'LOW' | 'ZERO' | 'EXPIRED' | 'ALL_PRODUCTS'>('ALL_ALERTS');
  const [editingMinQuantityId, setEditingMinQuantityId] = useState<string | null>(null);
  const [tempMinQuantity, setTempMinQuantity] = useState<number>(0);
  const [savingMinId, setSavingMinId] = useState<string | null>(null);

  // Quick Update Stock Minimum (Alert)
  const handleUpdateMinQuantity = async (productId: string, newMin: number) => {
    setSavingMinId(productId);
    try {
      const val = Math.max(0, Number(newMin) || 0);
      await updateDoc(doc(db, 'stock_products', productId), {
        minQuantity: val,
        updatedAt: new Date().toISOString()
      });
      const prod = products.find(p => p.id === productId);
      await logAudit('ALTERACAO_ESTOQUE_MINIMO', `Estoque mínimo do produto "${prod?.name || productId}" alterado para ${val}.`);
      showToast('Estoque Mínimo (Alerta) atualizado com sucesso!', 'success');
      setEditingMinQuantityId(null);
    } catch (err) {
      console.error("Erro ao atualizar estoque mínimo:", err);
      showToast('Erro ao atualizar estoque mínimo de alerta.', 'error');
    } finally {
      setSavingMinId(null);
    }
  };

  // Quick Update Expiration Date
  const handleUpdateExpirationDate = async (productId: string, newDate: string) => {
    try {
      await updateDoc(doc(db, 'stock_products', productId), {
        expirationDate: newDate || null,
        updatedAt: new Date().toISOString()
      });
      const prod = products.find(p => p.id === productId);
      await logAudit('ALTERACAO_VALIDADE_PRODUTO', `Data de validade do produto "${prod?.name || productId}" alterada para ${newDate || 'Nenhuma'}.`);
      showToast('Data de validade atualizada com sucesso!', 'success');
    } catch (err) {
      console.error("Erro ao atualizar data de validade:", err);
      showToast('Erro ao atualizar data de validade.', 'error');
    }
  };

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

  // Displayed Products for the Alert Manager
  const displayedAlertProducts = useMemo(() => {
    if (alertFilterCategory === 'LOW') return lowStockList;
    if (alertFilterCategory === 'ZERO') return outOfStockList;
    if (alertFilterCategory === 'EXPIRED') return [...expiredList, ...nearExpiryList];
    if (alertFilterCategory === 'ALL_PRODUCTS') return activeProducts;
    // Default 'ALL_ALERTS'
    const combined = [...outOfStockList, ...lowStockList, ...expiredList, ...nearExpiryList];
    return Array.from(new Map(combined.map(p => [p.id, p])).values());
  }, [alertFilterCategory, lowStockList, outOfStockList, expiredList, nearExpiryList, activeProducts]);

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

      if (movementOriginFilter === 'COMPRA_TODAS' && m.origin !== 'COMPRA') return false;
      if (movementOriginFilter === 'COMPRA_DEDUZIDA' && (m.origin !== 'COMPRA' || m.deductFromTreasury !== true)) return false;
      if (movementOriginFilter === 'COMPRA_NAO_DEDUZIDA' && (m.origin !== 'COMPRA' || m.deductFromTreasury === true)) return false;
      if (movementOriginFilter === 'DOACAO' && m.origin !== 'DOACAO') return false;

      if (movementSearch.trim()) {
        const term = movementSearch.toLowerCase();
        return (
          m.productName.toLowerCase().includes(term) ||
          m.productCode.toLowerCase().includes(term) ||
          m.responsible.toLowerCase().includes(term) ||
          (m.destination && m.destination.toLowerCase().includes(term)) ||
          (m.supplier && m.supplier.toLowerCase().includes(term)) ||
          (m.donorName && m.donorName.toLowerCase().includes(term)) ||
          (m.invoiceNumber && m.invoiceNumber.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [movements, movementTypeFilter, movementOriginFilter, movementSearch]);

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

    const initialUnitPrice = targetProd && targetProd.unitPrice ? String(targetProd.unitPrice) : '';

    setMovementForm({
      productId: targetProd ? targetProd.id : '',
      quantity: 1,
      supplier: targetProd ? (targetProd.supplier || '') : '',
      destination: '',
      reason: 'Consumo Interno',
      notes: '',
      date: new Date().toISOString().split('T')[0],
      entryOrigin: 'COMPRA',
      unitPrice: initialUnitPrice,
      totalPrice: initialUnitPrice,
      invoiceNumber: '',
      deductFromTreasury: true,
      donorName: '',
      estimatedValue: ''
    });

    setIsMovementModalOpen(true);
  };

  // Handle Product Selection change in Movement Modal
  const handleMovementProductSelect = (productId: string) => {
    const found = products.find(p => p.id === productId) || null;
    setSelectedProductForMovement(found);
    const foundPrice = found && found.unitPrice ? String(found.unitPrice) : '';
    setMovementForm(prev => ({
      ...prev,
      productId,
      supplier: found ? (found.supplier || '') : prev.supplier,
      unitPrice: foundPrice,
      totalPrice: foundPrice ? String(Number(foundPrice) * prev.quantity) : ''
    }));
  };

  // Save Movement (Entrada / Saída) with Treasury Synchronization
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

    setIsSubmittingMovement(true);

    try {
      const newStock = movementType === 'ENTRADA' ? currentQty + qty : currentQty - qty;
      const movementDocRef = doc(collection(db, 'stock_movements'));
      const movementId = movementDocRef.id;

      if (movementType === 'ENTRADA') {
        if (movementForm.entryOrigin === 'COMPRA') {
          const uPrice = Number(movementForm.unitPrice) || 0;
          const tPrice = Number(movementForm.totalPrice) || (uPrice * qty);
          const deductBool = movementForm.deductFromTreasury;
          const supplierText = movementForm.supplier.trim();
          const invoiceNumText = movementForm.invoiceNumber.trim();

          let financialId: string | null = null;

          if (deductBool) {
            // Create corresponding expense in Treasury (financial collection)
            const financialRef = doc(collection(db, 'financial'));
            financialId = financialRef.id;

            const financialPayload = cleanData({
              id: financialId,
              date: movementForm.date,
              description: `Compra de Estoque – ${selectedProductForMovement.name}`,
              amount: tPrice,
              type: 'DESPESA',
              category: 'ESTOQUE',
              originModule: 'STOCK',
              stockMovementId: movementId,
              stockProductId: selectedProductForMovement.id,
              stockProductName: selectedProductForMovement.name,
              stockQuantity: qty,
              supplier: supplierText || 'Não informado',
              invoiceNumber: invoiceNumText || null,
              createdAt: new Date().toISOString(),
              createdBy: user.name
            });

            await setDoc(financialRef, financialPayload);
          }

          const movementRecord = cleanData({
            id: movementId,
            productId: selectedProductForMovement.id,
            productName: selectedProductForMovement.name,
            productCode: selectedProductForMovement.code,
            type: 'ENTRADA',
            quantity: qty,
            stockBefore: currentQty,
            stockAfter: newStock,
            supplier: supplierText || null,
            responsible: user.name,
            notes: deductBool
              ? (movementForm.notes.trim() || null)
              : `${movementForm.notes.trim() ? movementForm.notes.trim() + ' • ' : ''}[Não descontar do saldo da entidade]`,
            date: movementForm.date,
            timestamp: new Date().toISOString(),
            origin: 'COMPRA',
            unitPrice: uPrice,
            totalPrice: tPrice,
            invoiceNumber: invoiceNumText || null,
            deductFromTreasury: deductBool,
            financialTransactionId: financialId
          });

          await setDoc(movementDocRef, movementRecord);

          // Update stock_products quantity and unit price/supplier
          await updateDoc(doc(db, 'stock_products', selectedProductForMovement.id), {
            quantity: newStock,
            unitPrice: uPrice > 0 ? uPrice : (selectedProductForMovement.unitPrice || 0),
            supplier: supplierText || selectedProductForMovement.supplier,
            updatedAt: new Date().toISOString()
          });

          const auditMsg = deductBool
            ? `Entrada de estoque (COMPRA) com desconto na Tesouraria (R$ ${tPrice.toFixed(2)}): +${qty} ${selectedProductForMovement.unit}(s) de "${selectedProductForMovement.name}". Novo saldo: ${newStock}.`
            : `Entrada de estoque (COMPRA - NÃO DESCONTADA): +${qty} ${selectedProductForMovement.unit}(s) de "${selectedProductForMovement.name}". Novo saldo: ${newStock}.`;

          await logAudit('ENTRADA_ESTOQUE_COMPRA', auditMsg);
          showToast(`Entrada por Compra (${deductBool ? 'Descontada da Tesouraria' : 'Não descontada'}) registrada com sucesso!`, 'success');

        } else {
          // DOACAO
          const donor = movementForm.donorName.trim();
          const estVal = Number(movementForm.estimatedValue) || 0;

          const movementRecord = cleanData({
            id: movementId,
            productId: selectedProductForMovement.id,
            productName: selectedProductForMovement.name,
            productCode: selectedProductForMovement.code,
            type: 'ENTRADA',
            quantity: qty,
            stockBefore: currentQty,
            stockAfter: newStock,
            supplier: donor ? `Doador: ${donor}` : 'Doação',
            responsible: user.name,
            notes: movementForm.notes.trim() || null,
            date: movementForm.date,
            timestamp: new Date().toISOString(),
            origin: 'DOACAO',
            donorName: donor || null,
            estimatedValue: estVal > 0 ? estVal : null,
            deductFromTreasury: false
          });

          await setDoc(movementDocRef, movementRecord);

          await updateDoc(doc(db, 'stock_products', selectedProductForMovement.id), {
            quantity: newStock,
            updatedAt: new Date().toISOString()
          });

          await logAudit('ENTRADA_ESTOQUE_DOACAO', `Entrada de estoque (DOAÇÃO): +${qty} ${selectedProductForMovement.unit}(s) de "${selectedProductForMovement.name}". Novo saldo: ${newStock}.`);
          showToast('Entrada por Doação registrada com sucesso!', 'success');
        }
      } else {
        // SAIDA
        const movementRecord = cleanData({
          id: movementId,
          productId: selectedProductForMovement.id,
          productName: selectedProductForMovement.name,
          productCode: selectedProductForMovement.code,
          type: 'SAIDA',
          quantity: qty,
          stockBefore: currentQty,
          stockAfter: newStock,
          destination: movementForm.destination.trim(),
          reason: movementForm.reason.trim(),
          responsible: user.name,
          notes: movementForm.notes.trim() || null,
          date: movementForm.date,
          timestamp: new Date().toISOString()
        });

        await setDoc(movementDocRef, movementRecord);

        await updateDoc(doc(db, 'stock_products', selectedProductForMovement.id), {
          quantity: newStock,
          updatedAt: new Date().toISOString()
        });

        await logAudit('SAIDA_ESTOQUE', `Saída de estoque: -${qty} ${selectedProductForMovement.unit}(s) de "${selectedProductForMovement.name}" para "${movementForm.destination}". Novo saldo: ${newStock}.`);
        showToast('Saída de Estoque registrada com sucesso!', 'success');
      }

      setIsMovementModalOpen(false);
    } catch (err) {
      console.error("Erro ao registrar movimentação:", err);
      showToast('Erro ao registrar movimentação no banco de dados.', 'error');
    } finally {
      setIsSubmittingMovement(false);
    }
  };

  // Open Edit Movement Modal
  const handleOpenEditMovementModal = (movement: StockMovement) => {
    setEditingMovement(movement);
    const isEntrada = movement.type === 'ENTRADA';
    const origin = (movement.origin as 'COMPRA' | 'DOACAO') || (isEntrada ? 'COMPRA' : 'COMPRA');
    const uPrice = movement.unitPrice !== undefined && movement.unitPrice !== null ? String(movement.unitPrice) : '';
    const tPrice = movement.totalPrice !== undefined && movement.totalPrice !== null ? String(movement.totalPrice) : '';
    const estVal = movement.estimatedValue !== undefined && movement.estimatedValue !== null ? String(movement.estimatedValue) : '';

    setEditMovementForm({
      quantity: movement.quantity || 1,
      date: movement.date || new Date().toISOString().split('T')[0],
      notes: movement.notes || '',
      entryOrigin: origin,
      supplier: movement.supplier || '',
      invoiceNumber: movement.invoiceNumber || '',
      unitPrice: uPrice,
      totalPrice: tPrice,
      deductFromTreasury: movement.deductFromTreasury !== undefined ? movement.deductFromTreasury : true,
      donorName: movement.donorName || (origin === 'DOACAO' && movement.supplier ? movement.supplier.replace('Doador: ', '') : ''),
      estimatedValue: estVal,
      destination: movement.destination || '',
      reason: movement.reason || 'Consumo Interno'
    });
    setIsEditMovementModalOpen(true);
  };

  // Save Edited Movement (Entrada / Saída) with Stock & Treasury Synchronization
  const handleSaveEditedMovement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMovement) return;

    const newQty = Number(editMovementForm.quantity);
    if (!newQty || newQty <= 0) {
      showToast('A quantidade deve ser maior que zero.', 'error');
      return;
    }

    const isEntrada = editingMovement.type === 'ENTRADA';
    const prod = products.find(p => p.id === editingMovement.productId);
    const currentProductQty = prod ? prod.quantity : 0;
    const oldQty = editingMovement.quantity || 0;

    // Calculate new stock
    let newProductStock = currentProductQty;
    if (isEntrada) {
      const delta = newQty - oldQty;
      newProductStock = currentProductQty + delta;
    } else {
      const delta = newQty - oldQty;
      newProductStock = currentProductQty - delta;
    }

    if (newProductStock < 0) {
      showToast(`Não é possível salvar: o saldo do estoque ficaria negativo (${newProductStock}).`, 'error');
      return;
    }

    setIsSubmittingEditMovement(true);

    try {
      let finalFinancialId = editingMovement.financialTransactionId || null;

      if (isEntrada) {
        if (editMovementForm.entryOrigin === 'COMPRA') {
          const uPrice = Number(editMovementForm.unitPrice) || 0;
          const tPrice = Number(editMovementForm.totalPrice) || (uPrice * newQty);
          const deductBool = editMovementForm.deductFromTreasury;
          const supplierText = editMovementForm.supplier.trim();
          const invoiceNumText = editMovementForm.invoiceNumber.trim();

          if (deductBool) {
            if (finalFinancialId) {
              // Update existing financial transaction in Treasury
              await updateDoc(doc(db, 'financial', finalFinancialId), cleanData({
                amount: tPrice,
                date: editMovementForm.date,
                description: `Compra de Estoque – ${editingMovement.productName}`,
                supplier: supplierText || 'Não informado',
                invoiceNumber: invoiceNumText || null,
                stockQuantity: newQty,
                updatedAt: new Date().toISOString()
              }));
            } else {
              // Create new financial transaction in Treasury
              const financialRef = doc(collection(db, 'financial'));
              finalFinancialId = financialRef.id;

              const financialPayload = cleanData({
                id: finalFinancialId,
                date: editMovementForm.date,
                description: `Compra de Estoque – ${editingMovement.productName}`,
                amount: tPrice,
                type: 'DESPESA',
                category: 'ESTOQUE',
                originModule: 'STOCK',
                stockMovementId: editingMovement.id,
                stockProductId: editingMovement.productId,
                stockProductName: editingMovement.productName,
                stockQuantity: newQty,
                supplier: supplierText || 'Não informado',
                invoiceNumber: invoiceNumText || null,
                createdAt: new Date().toISOString(),
                createdBy: user.name
              });

              await setDoc(financialRef, financialPayload);
            }
          } else {
            // Not deducted from treasury -> if there was a financial record previously, remove it
            if (finalFinancialId) {
              try {
                await deleteDoc(doc(db, 'financial', finalFinancialId));
              } catch (delFinErr) {
                console.warn("Transação financeira não encontrada para exclusão:", delFinErr);
              }
              finalFinancialId = null;
            }
          }

          // Update movement doc
          const movementUpdatePayload = cleanData({
            quantity: newQty,
            stockAfter: newProductStock,
            date: editMovementForm.date,
            supplier: supplierText || null,
            invoiceNumber: invoiceNumText || null,
            unitPrice: uPrice,
            totalPrice: tPrice,
            deductFromTreasury: deductBool,
            financialTransactionId: finalFinancialId,
            origin: 'COMPRA',
            donorName: null,
            estimatedValue: null,
            notes: editMovementForm.notes.trim() || null,
            updatedAt: new Date().toISOString(),
            updatedBy: user.name
          });

          await updateDoc(doc(db, 'stock_movements', editingMovement.id), movementUpdatePayload);

          // Update stock_products quantity and price/supplier
          await updateDoc(doc(db, 'stock_products', editingMovement.productId), cleanData({
            quantity: newProductStock,
            unitPrice: uPrice > 0 ? uPrice : (prod?.unitPrice || 0),
            supplier: supplierText || prod?.supplier,
            updatedAt: new Date().toISOString()
          }));

          await logAudit('EDICAO_ENTRADA_COMPRA', `Entrada de Estoque editada (${editingMovement.productName}): Qtd ${oldQty} -> ${newQty}, Saldo ${currentProductQty} -> ${newProductStock}, Valor R$ ${tPrice.toFixed(2)}.`);
          showToast('Entrada por Compra atualizada com sucesso!', 'success');

        } else {
          // DOACAO
          const donor = editMovementForm.donorName.trim();
          const estVal = Number(editMovementForm.estimatedValue) || 0;

          // If there was a financial record previously, delete it
          if (finalFinancialId) {
            try {
              await deleteDoc(doc(db, 'financial', finalFinancialId));
            } catch (delFinErr) {
              console.warn("Transação financeira não encontrada:", delFinErr);
            }
            finalFinancialId = null;
          }

          const movementUpdatePayload = cleanData({
            quantity: newQty,
            stockAfter: newProductStock,
            date: editMovementForm.date,
            origin: 'DOACAO',
            supplier: donor ? `Doador: ${donor}` : 'Doação',
            donorName: donor || null,
            estimatedValue: estVal > 0 ? estVal : null,
            unitPrice: null,
            totalPrice: null,
            invoiceNumber: null,
            deductFromTreasury: false,
            financialTransactionId: null,
            notes: editMovementForm.notes.trim() || null,
            updatedAt: new Date().toISOString(),
            updatedBy: user.name
          });

          await updateDoc(doc(db, 'stock_movements', editingMovement.id), movementUpdatePayload);

          await updateDoc(doc(db, 'stock_products', editingMovement.productId), {
            quantity: newProductStock,
            updatedAt: new Date().toISOString()
          });

          await logAudit('EDICAO_ENTRADA_DOACAO', `Entrada por Doação editada (${editingMovement.productName}): Qtd ${oldQty} -> ${newQty}, Saldo ${currentProductQty} -> ${newProductStock}.`);
          showToast('Entrada por Doação atualizada com sucesso!', 'success');
        }
      } else {
        // SAIDA
        const dest = editMovementForm.destination.trim();
        const reas = editMovementForm.reason.trim();

        const movementUpdatePayload = cleanData({
          quantity: newQty,
          stockAfter: newProductStock,
          date: editMovementForm.date,
          destination: dest || null,
          reason: reas || null,
          notes: editMovementForm.notes.trim() || null,
          updatedAt: new Date().toISOString(),
          updatedBy: user.name
        });

        await updateDoc(doc(db, 'stock_movements', editingMovement.id), movementUpdatePayload);

        await updateDoc(doc(db, 'stock_products', editingMovement.productId), {
          quantity: newProductStock,
          updatedAt: new Date().toISOString()
        });

        await logAudit('EDICAO_SAIDA_ESTOQUE', `Movimentação de Saída editada (${editingMovement.productName}): Qtd ${oldQty} -> ${newQty}, Saldo ${currentProductQty} -> ${newProductStock}.`);
        showToast('Saída de Estoque atualizada com sucesso!', 'success');
      }

      setIsEditMovementModalOpen(false);
      setEditingMovement(null);
    } catch (err) {
      console.error("Erro ao salvar edição da movimentação:", err);
      showToast('Erro ao atualizar a movimentação no banco de dados.', 'error');
    } finally {
      setIsSubmittingEditMovement(false);
    }
  };

  // Delete Movement (Rollback Stock & Financial Linkage)
  const handleDeleteMovement = (movement: StockMovement) => {
    const isEntrada = movement.type === 'ENTRADA';
    const confirmMessage = isEntrada
      ? `Deseja realmente excluir a entrada de ${movement.quantity} un de "${movement.productName}"?\n\n` +
        `• O saldo do estoque será estornado (-${movement.quantity} un).\n` +
        (movement.deductFromTreasury ? `• O lançamento correspondente na Tesouraria será excluído automaticamente.\n` : '') +
        `Esta ação não pode ser desfeita.`
      : `Deseja realmente excluir a saída de ${movement.quantity} un de "${movement.productName}"?\n\n` +
        `• O saldo do estoque será restaurado (+${movement.quantity} un).\n` +
        `Esta ação não pode ser desfeita.`;

    showConfirm(confirmMessage, async () => {
      try {
        const prod = products.find(p => p.id === movement.productId);
        const currentStock = prod ? prod.quantity : 0;
        const restoredStock = isEntrada
          ? Math.max(0, currentStock - movement.quantity)
          : currentStock + movement.quantity;

        // 1. Delete linked financial record if deducted from treasury
        if (isEntrada && movement.deductFromTreasury && movement.financialTransactionId) {
          try {
            await deleteDoc(doc(db, 'financial', movement.financialTransactionId));
          } catch (finErr) {
            console.warn("Transação financeira não encontrada ou já excluída:", finErr);
          }
        }

        // 2. Delete movement record
        await deleteDoc(doc(db, 'stock_movements', movement.id));

        // 3. Update stock_products quantity
        await updateDoc(doc(db, 'stock_products', movement.productId), {
          quantity: restoredStock,
          updatedAt: new Date().toISOString()
        });

        // 4. Close details modal if opened with this movement
        if (selectedMovementForDetails?.id === movement.id) {
          setSelectedMovementForDetails(null);
        }

        const auditMsg = isEntrada
          ? `Movimentação de Entrada excluída: estornado -${movement.quantity} un de "${movement.productName}". Novo saldo: ${restoredStock}.`
          : `Movimentação de Saída excluída: restaurado +${movement.quantity} un de "${movement.productName}". Novo saldo: ${restoredStock}.`;

        await logAudit('EXCLUSAO_MOVIMENTACAO_ESTOQUE', auditMsg);
        showToast('Movimentação excluída e saldo de estoque estornado com sucesso!', 'success');
      } catch (err) {
        console.error("Erro ao excluir movimentação:", err);
        showToast('Erro ao excluir a movimentação do estoque.', 'error');
      }
    });
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
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-extrabold text-sm">
                  <AlertTriangle size={20} className="text-amber-600 animate-pulse" />
                  Alertas Críticos de Estoque que Necessitam Atenção
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setIsAlertsManagerOpen(!isAlertsManagerOpen)}
                    className="px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Edit size={14} />
                    {isAlertsManagerOpen ? 'Ocultar Edição' : 'Editar Alertas Mínimos'}
                  </button>
                  <span className="text-xs font-bold text-amber-700 bg-amber-100 dark:bg-amber-900/60 px-3 py-1 rounded-full">
                    {(lowStockList.length + outOfStockList.length + expiredList.length + nearExpiryList.length)} Ocorrências
                  </span>
                </div>
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

          {/* QUICK ALERTS EDITOR CONTROL BAR WHEN NO CRITICAL BANNER IS SHOWN */}
          {(lowStockList.length === 0 && outOfStockList.length === 0 && expiredList.length === 0 && nearExpiryList.length === 0) && (
            <div className="flex items-center justify-between bg-white dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
              <div className="flex items-center gap-2 text-xs font-bold text-gray-700 dark:text-gray-300">
                <AlertTriangle size={16} className="text-amber-500" />
                <span>Nenhum alerta crítico ativo no momento. Você pode editar os parâmetros de estoque mínimo a qualquer momento.</span>
              </div>
              <button
                onClick={() => setIsAlertsManagerOpen(!isAlertsManagerOpen)}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs rounded-xl transition-all shadow-sm flex items-center gap-1.5"
              >
                <Edit size={14} />
                {isAlertsManagerOpen ? 'Ocultar Edição' : 'Editar Alertas Mínimos'}
              </button>
            </div>
          )}

          {/* EDITABLE ALERTS MANAGEMENT PANEL */}
          {isAlertsManagerOpen && (
            <div className="bg-white dark:bg-gray-800 border-2 border-amber-300 dark:border-amber-700/60 rounded-3xl p-6 shadow-md space-y-5 animate-in fade-in duration-200">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-gray-100 dark:border-gray-700/60 pb-4">
                <div>
                  <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 font-black text-base">
                    <Edit size={18} className="text-amber-600" />
                    Gerenciador de Alertas e Limites de Estoque Mínimo
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Edite diretamente a quantidade de estoque mínimo (alerta) e validades dos produtos para personalizar as notificações do sistema.
                  </p>
                </div>
                <button
                  onClick={() => setIsAlertsManagerOpen(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 self-start sm:self-auto"
                  title="Fechar Painel"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Filter Tabs */}
              <div className="flex flex-wrap items-center gap-2">
                {[
                  { id: 'ALL_ALERTS', label: 'Todos em Alerta', count: lowStockList.length + outOfStockList.length + expiredList.length + nearExpiryList.length },
                  { id: 'LOW', label: 'Abaixo do Mínimo', count: lowStockList.length },
                  { id: 'ZERO', label: 'Estoque Zerado', count: outOfStockList.length },
                  { id: 'EXPIRED', label: 'Vencidos / Próx. Vencimento', count: expiredList.length + nearExpiryList.length },
                  { id: 'ALL_PRODUCTS', label: 'Todos os Produtos', count: activeProducts.length },
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setAlertFilterCategory(tab.id as any)}
                    className={`px-3 py-1.5 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 border ${
                      alertFilterCategory === tab.id
                        ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
                        : 'bg-gray-50 dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <span>{tab.label}</span>
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-black ${
                      alertFilterCategory === tab.id ? 'bg-white/20 text-white' : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                    }`}>
                      {tab.count}
                    </span>
                  </button>
                ))}
              </div>

              {/* Products Table for Alert Editing */}
              <div className="overflow-x-auto rounded-2xl border border-gray-200 dark:border-gray-700">
                <table className="w-full text-left text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-800/80 text-gray-500 font-extrabold uppercase border-b border-gray-200 dark:border-gray-700">
                    <tr>
                      <th className="py-3 px-4">Produto</th>
                      <th className="py-3 px-4 text-center">Saldo Atual</th>
                      <th className="py-3 px-4 text-center">Estoque Mínimo (Alerta)</th>
                      <th className="py-3 px-4 text-center">Data de Validade</th>
                      <th className="py-3 px-4 text-center">Status</th>
                      <th className="py-3 px-4 text-right">Ações Rápidas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                    {displayedAlertProducts.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="py-8 text-center text-gray-400 font-medium">
                          Nenhum produto encontrado nesta categoria de alerta.
                        </td>
                      </tr>
                    ) : (
                      displayedAlertProducts.map(p => {
                        const isLow = p.quantity < p.minQuantity && p.quantity > 0;
                        const isZero = p.quantity === 0;
                        const isExpired = p.expirationDate && p.expirationDate < todayStr;
                        const isNearExpiry = p.expirationDate && p.expirationDate >= todayStr && p.expirationDate <= in30DaysStr;

                        return (
                          <tr key={p.id} className="hover:bg-amber-50/30 dark:hover:bg-amber-950/20 transition-colors">
                            <td className="py-3 px-4">
                              <div className="font-bold text-gray-900 dark:text-white text-sm">{p.name}</div>
                              <div className="text-[10px] text-gray-400 font-mono">{p.code} • {p.category}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span className={`px-2.5 py-1 rounded-lg font-black text-xs ${
                                isZero ? 'bg-rose-100 text-rose-700' : isLow ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                              }`}>
                                {p.quantity} {p.unit}s
                              </span>
                            </td>
                            {/* Editable Min Quantity */}
                            <td className="py-3 px-4 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <input
                                  type="number"
                                  min="0"
                                  defaultValue={p.minQuantity}
                                  onBlur={(e) => {
                                    const val = Number(e.target.value);
                                    if (val !== p.minQuantity) {
                                      handleUpdateMinQuantity(p.id, val);
                                    }
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleUpdateMinQuantity(p.id, Number((e.target as HTMLInputElement).value));
                                    }
                                  }}
                                  className="w-20 p-1.5 text-center bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl font-black text-xs focus:ring-2 focus:ring-amber-500 text-gray-900 dark:text-white"
                                  title="Altere o valor e pressione Enter para salvar o alerta de estoque mínimo"
                                />
                                <span className="text-[10px] text-gray-400 font-semibold">{p.unit}</span>
                              </div>
                            </td>
                            {/* Editable Expiration Date */}
                            <td className="py-3 px-4 text-center">
                              <input
                                type="date"
                                defaultValue={p.expirationDate || ''}
                                onChange={(e) => handleUpdateExpirationDate(p.id, e.target.value)}
                                className="p-1.5 bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded-xl font-bold text-xs text-gray-800 dark:text-white focus:ring-2 focus:ring-amber-500"
                                title="Altere para atualizar a data de validade monitorada"
                              />
                            </td>
                            {/* Alert Status Badge */}
                            <td className="py-3 px-4 text-center">
                              {isZero ? (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 font-extrabold text-[10px] rounded-full">Zerado</span>
                              ) : isLow ? (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 font-extrabold text-[10px] rounded-full">Abaixo do Mínimo</span>
                              ) : isExpired ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-extrabold text-[10px] rounded-full">Vencido</span>
                              ) : isNearExpiry ? (
                                <span className="px-2 py-0.5 bg-orange-100 text-orange-800 font-extrabold text-[10px] rounded-full">Vence em Breve</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-extrabold text-[10px] rounded-full">Estoque OK</span>
                              )}
                            </td>
                            {/* Quick Actions */}
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  onClick={() => handleOpenMovementModal(p, 'ENTRADA')}
                                  className="p-1.5 bg-emerald-100 text-emerald-700 hover:bg-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1"
                                  title="Adicionar Entrada no Estoque"
                                >
                                  <Plus size={14} /> Entrada
                                </button>
                                <button
                                  onClick={() => handleOpenEditModal(p)}
                                  className="p-1.5 bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-colors"
                                  title="Editar Produto"
                                >
                                  <Edit size={14} />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
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
                          {editingMinQuantityId === p.id ? (
                            <div className="flex items-center justify-center gap-1">
                              <input
                                type="number"
                                min="0"
                                value={tempMinQuantity}
                                onChange={(e) => setTempMinQuantity(Number(e.target.value))}
                                className="w-16 p-1 text-center bg-white dark:bg-gray-800 border border-emerald-500 rounded-lg text-xs font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                                autoFocus
                              />
                              <button
                                onClick={() => handleUpdateMinQuantity(p.id, tempMinQuantity)}
                                disabled={savingMinId === p.id}
                                className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                                title="Salvar Estoque Mínimo"
                              >
                                <CheckCircle2 size={14} />
                              </button>
                              <button
                                onClick={() => setEditingMinQuantityId(null)}
                                className="p-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-300 transition-colors"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => {
                                setEditingMinQuantityId(p.id);
                                setTempMinQuantity(p.minQuantity);
                              }}
                              className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 hover:text-emerald-700 dark:hover:text-emerald-300 border border-transparent hover:border-emerald-200 dark:hover:border-emerald-800 transition-all group"
                              title="Clique para editar o estoque mínimo de alerta deste produto"
                            >
                              <span>{p.minQuantity}</span>
                              <Edit size={12} className="text-gray-400 group-hover:text-emerald-600 transition-colors" />
                            </button>
                          )}
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
          <div className="bg-white dark:bg-gray-800 p-5 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative flex-1 w-full">
              <Search className="absolute left-3.5 top-3 text-gray-400" size={18} />
              <input
                type="text"
                placeholder="Pesquisar por produto, código, responsável, doador, NF ou fornecedor..."
                value={movementSearch}
                onChange={(e) => setMovementSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              <select
                value={movementTypeFilter}
                onChange={(e) => setMovementTypeFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TODOS">Todos os Tipos</option>
                <option value="ENTRADA">Apenas Entradas (+)</option>
                <option value="SAIDA">Apenas Saídas (-)</option>
              </select>

              <select
                value={movementOriginFilter}
                onChange={(e) => setMovementOriginFilter(e.target.value as any)}
                className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl px-3 py-2.5 text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="TODOS">Todas as Origens</option>
                <option value="COMPRA_TODAS">🛒 Apenas Compras (Geral)</option>
                <option value="COMPRA_DEDUZIDA">💳 Compras Descontadas da Tesouraria</option>
                <option value="COMPRA_NAO_DEDUZIDA">🚫 Compras NÃO Descontadas</option>
                <option value="DOACAO">🎁 Apenas Doações</option>
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
                    <th className="py-3.5 px-4">Origem / Integração</th>
                    <th className="py-3.5 px-4">Código / Produto</th>
                    <th className="py-3.5 px-4 text-center">Qtd Movimentada</th>
                    <th className="py-3.5 px-4 text-center">Saldo Ant.</th>
                    <th className="py-3.5 px-4 text-center">Saldo Pós</th>
                    <th className="py-3.5 px-4">Destino / Fornecedor / Doador</th>
                    <th className="py-3.5 px-4">Responsável</th>
                    <th className="py-3.5 px-4 text-center">Ação</th>
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
                        {m.type === 'ENTRADA' ? (
                          <div className="flex flex-col gap-1">
                            {m.origin === 'DOACAO' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-purple-100 text-purple-800 dark:bg-purple-950/60 dark:text-purple-300 w-fit">
                                <Gift size={12} /> Doação
                              </span>
                            ) : m.origin === 'COMPRA' ? (
                              <>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 w-fit">
                                  <ShoppingBag size={12} /> Compra
                                </span>
                                {m.deductFromTreasury ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 w-fit" title="Descontado do saldo da Tesouraria">
                                    <CreditCard size={10} /> Descontado Tesouraria
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 w-fit" title="Não descontado da Tesouraria">
                                    <Ban size={10} /> Não descontado
                                  </span>
                                )}
                              </>
                            ) : (
                              <span className="text-gray-400 italic text-[10px]">Entrada padrão</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[10px]">Saída de Estoque</span>
                        )}
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
                            {m.origin === 'DOACAO' ? (
                              <>
                                <span className="text-[10px] text-purple-600 dark:text-purple-400 block font-bold uppercase">Doador</span>
                                {m.donorName || m.supplier || 'Anônimo'}
                              </>
                            ) : (
                              <>
                                <span className="text-[10px] text-gray-400 block uppercase">Fornecedor</span>
                                {m.supplier || 'Não informado'}
                                {m.invoiceNumber && (
                                  <span className="text-[10px] text-gray-500 block">NF: {m.invoiceNumber}</span>
                                )}
                              </>
                            )}
                          </div>
                        ) : (
                          <div>
                            <span className="text-[10px] text-gray-400 block uppercase">Destino: {m.destination || 'N/I'}</span>
                            <span className="text-[10px] text-amber-600 dark:text-amber-400 block">Motivo: {m.reason || 'N/I'}</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3.5 px-4 text-gray-700 dark:text-gray-300 font-bold">
                        {m.responsible}
                      </td>

                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-1.5 flex-wrap">
                          <button
                            onClick={() => setSelectedMovementForDetails(m)}
                            className="p-1.5 bg-gray-100 hover:bg-emerald-50 dark:bg-gray-700 dark:hover:bg-emerald-950/50 text-gray-600 hover:text-emerald-600 dark:text-gray-300 rounded-xl transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                            title="Ver Detalhes e Vínculo Financeiro"
                          >
                            <Eye size={14} /> Detalhes
                          </button>
                          <button
                            onClick={() => handleOpenEditMovementModal(m)}
                            className="p-1.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/50 dark:hover:bg-blue-900/60 text-blue-700 dark:text-blue-300 rounded-xl transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                            title={m.type === 'ENTRADA' ? "Editar Entrada de Estoque" : "Editar Movimentação de Saída"}
                          >
                            <Pencil size={14} /> Editar
                          </button>
                          <button
                            onClick={() => handleDeleteMovement(m)}
                            className="p-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 rounded-xl transition-colors inline-flex items-center gap-1 text-[11px] font-bold"
                            title={m.type === 'ENTRADA' ? "Excluir Entrada e Estornar Saldo" : "Excluir Saída e Restaurar Saldo"}
                          >
                            <Trash2 size={14} /> Excluir
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}

                  {filteredMovements.length === 0 && (
                    <tr>
                      <td colSpan={10} className="py-12 text-center text-gray-400 italic">
                        Nenhuma movimentação localizada no histórico com os filtros selecionados.
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
                  onChange={(e) => {
                    const q = Number(e.target.value) || 1;
                    const uPrice = Number(movementForm.unitPrice) || 0;
                    setMovementForm({
                      ...movementForm,
                      quantity: q,
                      totalPrice: uPrice > 0 ? String((uPrice * q).toFixed(2)) : movementForm.totalPrice
                    });
                  }}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              {/* Conditional fields for ENTRADA */}
              {movementType === 'ENTRADA' && (
                <div className="space-y-4 pt-2 border-t border-gray-100 dark:border-gray-800">
                  
                  {/* Question 1: Qual é a origem deste produto? */}
                  <div>
                    <label className="block text-xs font-black text-gray-700 dark:text-gray-300 uppercase mb-2 flex items-center gap-1.5">
                      <Package size={14} className="text-emerald-600" />
                      Qual é a origem deste produto? *
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setMovementForm(prev => ({ ...prev, entryOrigin: 'COMPRA' }))}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          movementForm.entryOrigin === 'COMPRA'
                            ? 'bg-emerald-50 dark:bg-emerald-950/60 border-emerald-500 text-emerald-800 dark:text-emerald-300 shadow-sm ring-2 ring-emerald-500/30'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <ShoppingBag size={16} className={movementForm.entryOrigin === 'COMPRA' ? 'text-emerald-600' : 'text-gray-400'} />
                        Compra
                      </button>

                      <button
                        type="button"
                        onClick={() => setMovementForm(prev => ({ ...prev, entryOrigin: 'DOACAO', deductFromTreasury: false }))}
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          movementForm.entryOrigin === 'DOACAO'
                            ? 'bg-purple-50 dark:bg-purple-950/60 border-purple-500 text-purple-800 dark:text-purple-300 shadow-sm ring-2 ring-purple-500/30'
                            : 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-100'
                        }`}
                      >
                        <Gift size={16} className={movementForm.entryOrigin === 'DOACAO' ? 'text-purple-600' : 'text-gray-400'} />
                        Doação
                      </button>
                    </div>
                  </div>

                  {/* IF COMPRA */}
                  {movementForm.entryOrigin === 'COMPRA' && (
                    <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/40 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Fornecedor / Loja *
                          </label>
                          <input
                            type="text"
                            required
                            placeholder="Ex: Farmácia Central, Mercado X"
                            value={movementForm.supplier}
                            onChange={(e) => setMovementForm({ ...movementForm, supplier: e.target.value })}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Nº da Nota / Recibo
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: NF-123456 (opcional)"
                            value={movementForm.invoiceNumber}
                            onChange={(e) => setMovementForm({ ...movementForm, invoiceNumber: e.target.value })}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Valor Unitário (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00"
                            value={movementForm.unitPrice}
                            onChange={(e) => {
                              const uPrice = e.target.value;
                              const qty = Number(movementForm.quantity) || 1;
                              const calculatedTotal = uPrice !== '' ? String((Number(uPrice) * qty).toFixed(2)) : '';
                              setMovementForm({ ...movementForm, unitPrice: uPrice, totalPrice: calculatedTotal });
                            }}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Valor Total (R$) *
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            required
                            placeholder="0,00"
                            value={movementForm.totalPrice}
                            onChange={(e) => setMovementForm({ ...movementForm, totalPrice: e.target.value })}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-extrabold text-emerald-700 dark:text-emerald-300 outline-none focus:ring-2 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Question 2: Descontar da Tesouraria? */}
                      <div className="pt-2">
                        <label className="block text-xs font-black text-gray-800 dark:text-white uppercase mb-2">
                          Esta compra deve ser descontada do saldo da entidade? *
                        </label>
                        <div className="space-y-2">
                          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            movementForm.deductFromTreasury
                              ? 'bg-emerald-100/70 dark:bg-emerald-900/40 border-emerald-500 ring-2 ring-emerald-500/20'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}>
                            <input
                              type="radio"
                              name="deductFromTreasury"
                              checked={movementForm.deductFromTreasury === true}
                              onChange={() => setMovementForm({ ...movementForm, deductFromTreasury: true })}
                              className="mt-0.5 text-emerald-600 focus:ring-emerald-500"
                            />
                            <div>
                              <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                <CreditCard size={14} className="text-emerald-600" />
                                Sim, descontar da Tesouraria
                              </span>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                                Cria automaticamente uma despesa na Tesouraria vinculada a este produto, reduzindo o saldo financeiro da entidade.
                              </p>
                            </div>
                          </label>

                          <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                            !movementForm.deductFromTreasury
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500 ring-2 ring-amber-500/20'
                              : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700'
                          }`}>
                            <input
                              type="radio"
                              name="deductFromTreasury"
                              checked={movementForm.deductFromTreasury === false}
                              onChange={() => setMovementForm({ ...movementForm, deductFromTreasury: false })}
                              className="mt-0.5 text-amber-600 focus:ring-amber-500"
                            />
                            <div>
                              <span className="font-extrabold text-xs text-gray-900 dark:text-white flex items-center gap-1.5">
                                <Ban size={14} className="text-amber-600" />
                                Não, não descontar da Tesouraria
                              </span>
                              <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5">
                                Registra a entrada no Estoque sem alterar o saldo da Tesouraria (útil para compras por parceiros ou recursos diretos).
                              </p>
                            </div>
                          </label>
                        </div>
                      </div>

                    </div>
                  )}

                  {/* IF DOACAO */}
                  {movementForm.entryOrigin === 'DOACAO' && (
                    <div className="p-4 bg-purple-50/50 dark:bg-purple-950/20 rounded-2xl border border-purple-100 dark:border-purple-900/40 space-y-3">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Nome do Doador / Empresa
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: João Silva, Supermercado Y (opcional)"
                            value={movementForm.donorName}
                            onChange={(e) => setMovementForm({ ...movementForm, donorName: e.target.value })}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-gray-600 dark:text-gray-300 uppercase mb-1">
                            Valor Estimado da Doação (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0,00 (opcional para inventário)"
                            value={movementForm.estimatedValue}
                            onChange={(e) => setMovementForm({ ...movementForm, estimatedValue: e.target.value })}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>

                      <div className="p-3 bg-purple-100/60 dark:bg-purple-900/40 rounded-xl text-[11px] text-purple-900 dark:text-purple-200 flex items-center gap-2">
                        <Gift size={16} className="shrink-0 text-purple-600" />
                        <span>
                          <strong>Registro de Doação:</strong> O saldo do produto no estoque será incrementado e o histórico armazenado. <strong>NENHUMA despesa será criada na Tesouraria.</strong>
                        </span>
                      </div>
                    </div>
                  )}

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
                  disabled={isSubmittingMovement}
                  className={`flex-1 px-5 py-3 font-bold rounded-2xl text-xs shadow-md transition-colors text-white flex items-center justify-center gap-2 ${
                    movementType === 'ENTRADA' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
                  } ${isSubmittingMovement ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                  {isSubmittingMovement ? 'Registrando...' : `Confirmar ${movementType === 'ENTRADA' ? 'Entrada' : 'Saída'}`}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

      {/* MODAL: MOVEMENT DETAILS & FINANCIAL LINKAGE */}
      {selectedMovementForDetails && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-md w-full border border-gray-100 dark:border-gray-800 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 bg-gradient-to-r from-slate-800 to-gray-900 text-white flex justify-between items-center">
              <div>
                <h3 className="text-base font-black flex items-center gap-2">
                  <FileText size={18} className="text-emerald-400" />
                  Detalhes da Movimentação
                </h3>
                <p className="text-xs text-gray-300 mt-0.5">Código: {selectedMovementForDetails.id}</p>
              </div>
              <button onClick={() => setSelectedMovementForDetails(null)} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-2xl space-y-1">
                <p className="font-extrabold text-sm text-gray-900 dark:text-white">{selectedMovementForDetails.productName}</p>
                <p className="text-gray-500">Código do Produto: {selectedMovementForDetails.productCode}</p>
                <div className="pt-2 flex items-center justify-between">
                  <span className="font-bold text-gray-500 uppercase">Tipo:</span>
                  <span className={`px-2 py-0.5 rounded-full font-black text-[10px] ${
                    selectedMovementForDetails.type === 'ENTRADA' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                  }`}>
                    {selectedMovementForDetails.type} ({selectedMovementForDetails.quantity} un)
                  </span>
                </div>
              </div>

              {selectedMovementForDetails.type === 'ENTRADA' && (
                <div className="p-4 rounded-2xl border space-y-2.5 bg-gray-50/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700">
                  <p className="font-bold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                    <Package size={14} className="text-emerald-600" /> Origem da Entrada:
                  </p>
                  
                  {selectedMovementForDetails.origin === 'COMPRA' ? (
                    <div className="space-y-1.5 pl-2 border-l-2 border-blue-500">
                      <p className="font-extrabold text-blue-700 dark:text-blue-400 flex items-center gap-1">
                        <ShoppingBag size={14} /> Compra de Produto
                      </p>
                      <p><strong>Fornecedor:</strong> {selectedMovementForDetails.supplier || 'Não informado'}</p>
                      {selectedMovementForDetails.invoiceNumber && <p><strong>Nº da Nota:</strong> {selectedMovementForDetails.invoiceNumber}</p>}
                      {selectedMovementForDetails.totalPrice ? <p><strong>Valor Total:</strong> R$ {Number(selectedMovementForDetails.totalPrice).toFixed(2)}</p> : null}
                      
                      <div className="pt-2">
                        {selectedMovementForDetails.deductFromTreasury ? (
                          <div className="p-2.5 bg-emerald-100 dark:bg-emerald-950/60 rounded-xl text-emerald-900 dark:text-emerald-200 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <CreditCard size={14} /> Descontado da Tesouraria
                            </p>
                            <p className="text-[10px]">Lançamento automático de despesa em Finanças / Tesouraria.</p>
                            {selectedMovementForDetails.financialTransactionId && (
                              <p className="text-[10px] font-mono text-emerald-800 dark:text-emerald-300">ID Financeiro: {selectedMovementForDetails.financialTransactionId}</p>
                            )}
                          </div>
                        ) : (
                          <div className="p-2.5 bg-amber-100 dark:bg-amber-950/60 rounded-xl text-amber-900 dark:text-amber-200 space-y-1">
                            <p className="font-bold flex items-center gap-1">
                              <Ban size={14} /> Não descontado da Tesouraria
                            </p>
                            <p className="text-[10px]">Entrada no estoque efetuada sem alterar o saldo da Tesouraria.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  ) : selectedMovementForDetails.origin === 'DOACAO' ? (
                    <div className="space-y-1.5 pl-2 border-l-2 border-purple-500">
                      <p className="font-extrabold text-purple-700 dark:text-purple-400 flex items-center gap-1">
                        <Gift size={14} /> Doação de Terceiros
                      </p>
                      <p><strong>Doador:</strong> {selectedMovementForDetails.donorName || selectedMovementForDetails.supplier || 'Anônimo'}</p>
                      {selectedMovementForDetails.estimatedValue ? <p><strong>Valor Estimado:</strong> R$ {Number(selectedMovementForDetails.estimatedValue).toFixed(2)}</p> : null}
                    </div>
                  ) : (
                    <p className="text-gray-500">Entrada de estoque convencional.</p>
                  )}
                </div>
              )}

              {selectedMovementForDetails.type === 'SAIDA' && (
                <div className="p-4 rounded-2xl border space-y-2 bg-gray-50/50 dark:bg-gray-800/40 border-gray-200 dark:border-gray-700">
                  <p><strong>Destino:</strong> {selectedMovementForDetails.destination || 'Não informado'}</p>
                  <p><strong>Motivo:</strong> {selectedMovementForDetails.reason || 'Não informado'}</p>
                </div>
              )}

              <div className="space-y-1 pt-2 border-t border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400">
                <p><strong>Data da Movimentação:</strong> {selectedMovementForDetails.date}</p>
                <p><strong>Registrado Por:</strong> {selectedMovementForDetails.responsible}</p>
                {selectedMovementForDetails.notes && <p><strong>Observações:</strong> {selectedMovementForDetails.notes}</p>}
              </div>

              <div className="pt-3 border-t border-gray-100 dark:border-gray-800 flex items-center gap-2">
                <button
                  onClick={() => {
                    const m = selectedMovementForDetails;
                    setSelectedMovementForDetails(null);
                    handleOpenEditMovementModal(m);
                  }}
                  className="flex-1 py-2.5 bg-blue-50 hover:bg-blue-100 dark:bg-blue-950/60 dark:hover:bg-blue-900/70 text-blue-700 dark:text-blue-300 font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Pencil size={14} /> Editar
                </button>
                <button
                  onClick={() => {
                    const m = selectedMovementForDetails;
                    handleDeleteMovement(m);
                  }}
                  className="flex-1 py-2.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/60 dark:hover:bg-rose-900/70 text-rose-700 dark:text-rose-300 font-bold rounded-2xl transition-colors flex items-center justify-center gap-1.5 text-xs"
                >
                  <Trash2 size={14} /> Excluir
                </button>
                <button
                  onClick={() => setSelectedMovementForDetails(null)}
                  className="px-4 py-2.5 bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-800 dark:text-white font-bold rounded-2xl transition-colors text-xs"
                >
                  Fechar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDIT MOVEMENT (ENTRADA / SAÍDA) */}
      {isEditMovementModalOpen && editingMovement && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl max-w-lg w-full border border-gray-100 dark:border-gray-800 my-8 overflow-hidden animate-in zoom-in-95 duration-200">
            
            {/* Header */}
            <div className={`p-6 text-white flex justify-between items-center ${
              editingMovement.type === 'ENTRADA' ? 'bg-gradient-to-r from-blue-700 to-indigo-800' : 'bg-gradient-to-r from-rose-700 to-red-800'
            }`}>
              <div>
                <h3 className="text-lg font-black flex items-center gap-2">
                  <Pencil size={20} />
                  {editingMovement.type === 'ENTRADA' ? 'Editar Entrada de Estoque' : 'Editar Saída de Estoque'}
                </h3>
                <p className="text-xs text-blue-100 mt-0.5">
                  Item: <span className="font-bold underline">{editingMovement.productName}</span> ({editingMovement.productCode})
                </p>
              </div>
              <button 
                onClick={() => {
                  setIsEditMovementModalOpen(false);
                  setEditingMovement(null);
                }} 
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSaveEditedMovement} className="p-6 space-y-4 text-xs">
              
              {/* Product Info Banner */}
              <div className="p-3 bg-slate-50 dark:bg-gray-800/60 rounded-2xl border border-slate-200 dark:border-gray-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Saldo Atual no Estoque</span>
                  <span className="text-sm font-black text-gray-800 dark:text-gray-100">
                    {products.find(p => p.id === editingMovement.productId)?.quantity ?? editingMovement.stockAfter} un
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-gray-400 uppercase font-bold block">Qtd Original Desta Movimentação</span>
                  <span className={`text-sm font-black ${editingMovement.type === 'ENTRADA' ? 'text-emerald-600' : 'text-rose-600'}`}>
                    {editingMovement.type === 'ENTRADA' ? '+' : '-'}{editingMovement.quantity} un
                  </span>
                </div>
              </div>

              {/* Data & Quantidade */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    Data da Movimentação *
                  </label>
                  <input
                    type="date"
                    required
                    value={editMovementForm.date}
                    onChange={e => setEditMovementForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                    Nova Quantidade *
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={editMovementForm.quantity}
                    onChange={e => {
                      const val = Number(e.target.value);
                      setEditMovementForm(prev => {
                        const u = Number(prev.unitPrice) || 0;
                        return {
                          ...prev,
                          quantity: val,
                          totalPrice: u > 0 ? String(u * val) : prev.totalPrice
                        };
                      });
                    }}
                    className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-black text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {/* ENTRADA SPECIFIC FIELDS */}
              {editingMovement.type === 'ENTRADA' && (
                <div className="p-4 bg-blue-50/50 dark:bg-blue-950/20 rounded-2xl border border-blue-100 dark:border-blue-900/40 space-y-3">
                  
                  <div>
                    <label className="block text-blue-900 dark:text-blue-300 font-extrabold mb-1.5">
                      Origem da Entrada
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setEditMovementForm(prev => ({ ...prev, entryOrigin: 'COMPRA' }))}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                          editMovementForm.entryOrigin === 'COMPRA'
                            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <ShoppingBag size={14} /> Compra
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditMovementForm(prev => ({ ...prev, entryOrigin: 'DOACAO' }))}
                        className={`p-2.5 rounded-xl border flex items-center justify-center gap-2 font-bold text-xs transition-all ${
                          editMovementForm.entryOrigin === 'DOACAO'
                            ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <Gift size={14} /> Doação
                      </button>
                    </div>
                  </div>

                  {editMovementForm.entryOrigin === 'COMPRA' ? (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Fornecedor
                          </label>
                          <input
                            type="text"
                            placeholder="Nome da empresa/fornecedor"
                            value={editMovementForm.supplier}
                            onChange={e => setEditMovementForm(prev => ({ ...prev, supplier: e.target.value }))}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Nº da Nota Fiscal
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: NF-12345"
                            value={editMovementForm.invoiceNumber}
                            onChange={e => setEditMovementForm(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Valor Unitário (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={editMovementForm.unitPrice}
                            onChange={e => {
                              const uVal = e.target.value;
                              const numU = Number(uVal) || 0;
                              const qtyVal = Number(editMovementForm.quantity) || 1;
                              setEditMovementForm(prev => ({
                                ...prev,
                                unitPrice: uVal,
                                totalPrice: numU > 0 ? (numU * qtyVal).toFixed(2) : prev.totalPrice
                              }));
                            }}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Valor Total da Compra (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={editMovementForm.totalPrice}
                            onChange={e => setEditMovementForm(prev => ({ ...prev, totalPrice: e.target.value }))}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-bold text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>

                      {/* Tesouraria Toggle */}
                      <div className="p-3 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 flex items-center justify-between">
                        <div>
                          <p className="font-extrabold text-gray-800 dark:text-gray-200 flex items-center gap-1.5">
                            <CreditCard size={14} className="text-emerald-600" />
                            Debitar da Tesouraria
                          </p>
                          <p className="text-[10px] text-gray-500">
                            {editMovementForm.deductFromTreasury 
                              ? 'Lançamento de despesa será sincronizado no financeiro.' 
                              : 'Não afeta o saldo financeiro da entidade.'}
                          </p>
                        </div>
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editMovementForm.deductFromTreasury}
                            onChange={e => setEditMovementForm(prev => ({ ...prev, deductFromTreasury: e.target.checked }))}
                            className="sr-only peer"
                          />
                          <div className="w-10 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all dark:border-gray-600 peer-checked:bg-emerald-600"></div>
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-3 pt-1">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Nome do Doador
                          </label>
                          <input
                            type="text"
                            placeholder="Ex: Empresa Parceira, Voluntário..."
                            value={editMovementForm.donorName}
                            onChange={e => setEditMovementForm(prev => ({ ...prev, donorName: e.target.value }))}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                        <div>
                          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                            Valor Estimado (R$)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={editMovementForm.estimatedValue}
                            onChange={e => setEditMovementForm(prev => ({ ...prev, estimatedValue: e.target.value }))}
                            className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-purple-500"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              )}

              {/* SAÍDA SPECIFIC FIELDS */}
              {editingMovement.type === 'SAIDA' && (
                <div className="p-4 bg-rose-50/50 dark:bg-rose-950/20 rounded-2xl border border-rose-100 dark:border-rose-900/40 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                        Destino / Setor *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Ala Feminina, Cozinha..."
                        value={editMovementForm.destination}
                        onChange={e => setEditMovementForm(prev => ({ ...prev, destination: e.target.value }))}
                        className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                    <div>
                      <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                        Motivo da Saída *
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Consumo Diário, Higiene..."
                        value={editMovementForm.reason}
                        onChange={e => setEditMovementForm(prev => ({ ...prev, reason: e.target.value }))}
                        className="w-full p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-semibold text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-rose-500"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Observações */}
              <div>
                <label className="block text-gray-700 dark:text-gray-300 font-bold mb-1">
                  Observações
                </label>
                <textarea
                  rows={2}
                  placeholder="Informações complementares sobre esta alteração..."
                  value={editMovementForm.notes}
                  onChange={e => setEditMovementForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2.5 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl text-xs font-medium text-gray-800 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsEditMovementModalOpen(false);
                    setEditingMovement(null);
                  }}
                  className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 font-bold rounded-2xl text-xs hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingEditMovement}
                  className="flex-1 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl text-xs shadow-md transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isSubmittingEditMovement ? 'Salvando...' : 'Salvar Alterações'}
                </button>
              </div>

            </form>

          </div>
        </div>
      )}

    </div>
  );
};
