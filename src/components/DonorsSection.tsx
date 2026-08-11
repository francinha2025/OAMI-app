import React, { useState } from 'react';
import { 
  Heart, 
  Plus, 
  X, 
  Edit2, 
  Trash2, 
  DollarSign, 
  FileDown, 
  FileText,
  RefreshCw,
  CheckCircle2
} from 'lucide-react';
import { AnimatePresence, motion } from 'motion/react';
import { doc, deleteDoc, addDoc, collection, updateDoc, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Donor, User } from '../types';
import { cleanData, cn } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { format } from 'date-fns';

interface DonorsSectionProps {
  donors: Donor[];
  showToast: (message: string, type?: 'success' | 'error' | 'info') => void;
  user?: User;
}

export const DonorsSection: React.FC<DonorsSectionProps> = ({ donors, showToast, user }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [deletingDonor, setDeletingDonor] = useState<Donor | null>(null);

  // Modal para lançamento rápido de doação de doador existente
  const [donationModalDonor, setDonationModalDonor] = useState<Donor | null>(null);
  const [donationForm, setDonationForm] = useState({
    date: new Date().toISOString().split('T')[0],
    amount: 0,
    paymentMethod: 'PIX',
    finality: 'MANUTENCAO_GERAL',
    observations: ''
  });

  // Formulário do Doador
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    cpfOrCnpj: '',
    type: 'DOADOR' as 'DOADOR' | 'SOCIO_MENSAL',
    amount: 0,
    paymentMethod: 'PIX',
    status: 'ATIVO' as 'ATIVO' | 'INATIVO',
    startDate: new Date().toISOString().split('T')[0],
    registerInTreasury: true
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDonor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      cpfOrCnpj: '',
      type: 'DOADOR',
      amount: 0,
      paymentMethod: 'PIX',
      status: 'ATIVO',
      startDate: new Date().toISOString().split('T')[0],
      registerInTreasury: true
    });
  };

  const handleEditClick = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      name: donor.name,
      email: donor.email || '',
      phone: donor.phone || '',
      cpfOrCnpj: (donor as any).cpfOrCnpj || '',
      type: donor.type,
      amount: donor.amount || 0,
      paymentMethod: 'PIX',
      status: donor.status || 'ATIVO',
      startDate: donor.startDate || new Date().toISOString().split('T')[0],
      registerInTreasury: true
    });
    setIsModalOpen(true);
  };

  const handleDeleteDonor = async () => {
    if (!deletingDonor) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'donors', deletingDonor.id));
      showToast('Cadastro de doador/sócio excluído com sucesso!', 'success');
      setDeletingDonor(null);
    } catch (err) {
      console.error('Erro ao excluir doador:', err);
      showToast('Erro ao excluir cadastro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Gerador sequencial do número do recibo oficial
  const generateNextReceiptNumber = async (): Promise<string> => {
    try {
      const receiptsSnap = await getDocs(collection(db, 'treasury_receipts'));
      let maxNum = 0;
      receiptsSnap.forEach(docSnap => {
        const data = docSnap.data();
        if (data.receiptNumber) {
          const matches = data.receiptNumber.match(/\d+/);
          if (matches) {
            const num = parseInt(matches[0], 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
          }
        }
      });
      const nextNum = maxNum + 1;
      return `REC-${nextNum.toString().padStart(4, '0')}`;
    } catch (err) {
      console.error('Erro ao gerar número de recibo:', err);
      return `REC-${Math.floor(1000 + Math.random() * 9000)}`;
    }
  };

  // Registra a doação no módulo Tesouraria (Visão Geral e Histórico)
  const launchTreasuryDonationForDonor = async (params: {
    donorId: string;
    donorName: string;
    donorCpf?: string | null;
    amount: number;
    date: string;
    paymentMethod: string;
    donationType: 'RECORRENTE' | 'EVENTUAL';
    finality?: string;
    observations?: string;
  }) => {
    const receiptNum = await generateNextReceiptNumber();
    const nowIso = new Date().toISOString();
    const category = params.donationType === 'RECORRENTE' ? 'Sócio Contribuinte / Mensalidade' : 'Doação Eventual / Diversas';

    // 1. Recibo em treasury_receipts
    const receiptDocRef = await addDoc(collection(db, 'treasury_receipts'), {
      receiptNumber: receiptNum,
      date: params.date,
      amount: params.amount,
      paymentMethod: params.paymentMethod || 'PIX',
      category,
      description: `Doação/Contribuição de ${params.donorName.trim()} - Casa OAMI`,
      payerName: params.donorName.trim(),
      cpf: params.donorCpf || null,
      registeredBy: user?.name || 'Tesouraria',
      observations: params.observations || 'Lançado do módulo Doadores e Sócios',
      createdAt: nowIso,
      status: 'ATIVO',
      donorId: params.donorId,
      donationType: params.donationType,
      finality: params.finality || 'MANUTENCAO_GERAL'
    });

    // 2. Transação em treasury_transactions (Visão geral e histórico)
    await addDoc(collection(db, 'treasury_transactions'), {
      type: 'RECEITA',
      receiptId: receiptDocRef.id,
      receiptNumber: receiptNum,
      date: params.date,
      amount: params.amount,
      paymentMethod: params.paymentMethod || 'PIX',
      category,
      description: `Doação/Contribuição de ${params.donorName.trim()} - Casa OAMI`,
      payerOrFavored: params.donorName.trim(),
      cpf: params.donorCpf || null,
      registeredBy: user?.name || 'Tesouraria',
      observations: params.observations || 'Lançado do módulo Doadores e Sócios',
      createdAt: nowIso,
      status: 'ATIVO',
      donorId: params.donorId,
      donationType: params.donationType,
      finality: params.finality || 'MANUTENCAO_GERAL',
      isDonation: true
    });

    // 3. Atualizar totais do doador
    const donorSnap = donors.find(d => d.id === params.donorId);
    const prevTotal = (donorSnap as any)?.totalDonated || 0;
    const prevCount = (donorSnap as any)?.donationCount || 0;

    await updateDoc(doc(db, 'donors', params.donorId), {
      totalDonated: prevTotal + params.amount,
      donationCount: prevCount + 1,
      lastDonationDate: params.date,
      updatedAt: nowIso
    });
  };

  // Sincronizar todas as doações cadastradas em Doadores que não estão no histórico (Acionado apenas por botão manual)
  const handleSyncExistingDonors = async () => {
    setSyncing(true);
    try {
      const txSnap = await getDocs(collection(db, 'treasury_transactions'));
      const existingTxs = txSnap.docs.map(d => ({ id: d.id, ...d.data() }));

      let createdCount = 0;
      for (const donor of donors) {
        if (donor.status === 'INATIVO') continue;
        const donorAmount = Number(donor.amount || (donor as any).totalDonated || 0);
        if (donorAmount <= 0) continue;

        // Verifica se já tem transação na tesouraria para este doador
        const hasTx = existingTxs.some((tx: any) => 
          tx.donorId === donor.id || 
          (tx.payerOrFavored && tx.payerOrFavored.toLowerCase().trim() === donor.name.toLowerCase().trim())
        );

        if (!hasTx) {
          const receiptNum = await generateNextReceiptNumber();
          const nowIso = new Date().toISOString();
          const txDate = donor.startDate || (donor as any).lastDonationDate || nowIso.split('T')[0];
          const category = donor.type === 'SOCIO_MENSAL' ? 'Sócio Contribuinte / Mensalidade' : 'Doação Eventual / Diversas';

          const receiptDocRef = await addDoc(collection(db, 'treasury_receipts'), {
            receiptNumber: receiptNum,
            date: txDate,
            amount: donorAmount,
            paymentMethod: 'PIX',
            category,
            description: `Doação/Contribuição de ${donor.name.trim()} - Casa OAMI`,
            payerName: donor.name.trim(),
            cpf: (donor as any).cpfOrCnpj || null,
            registeredBy: user?.name || 'Tesouraria',
            observations: 'Sincronizado do cadastro de Doadores',
            createdAt: nowIso,
            status: 'ATIVO',
            donorId: donor.id,
            donationType: donor.type === 'SOCIO_MENSAL' ? 'RECORRENTE' : 'EVENTUAL',
            finality: 'MANUTENCAO_GERAL'
          });

          await addDoc(collection(db, 'treasury_transactions'), {
            type: 'RECEITA',
            receiptId: receiptDocRef.id,
            receiptNumber: receiptNum,
            date: txDate,
            amount: donorAmount,
            paymentMethod: 'PIX',
            category,
            description: `Doação/Contribuição de ${donor.name.trim()} - Casa OAMI`,
            payerOrFavored: donor.name.trim(),
            cpf: (donor as any).cpfOrCnpj || null,
            registeredBy: user?.name || 'Tesouraria',
            observations: 'Sincronizado do cadastro de Doadores',
            createdAt: nowIso,
            status: 'ATIVO',
            donorId: donor.id,
            donationType: donor.type === 'SOCIO_MENSAL' ? 'RECORRENTE' : 'EVENTUAL',
            finality: 'MANUTENCAO_GERAL',
            isDonation: true
          });

          await updateDoc(doc(db, 'donors', donor.id), {
            totalDonated: donorAmount,
            donationCount: Math.max(1, (donor as any).donationCount || 1),
            lastDonationDate: txDate,
            updatedAt: nowIso
          });

          existingTxs.push({
            donorId: donor.id,
            payerOrFavored: donor.name.trim()
          } as any);

          createdCount++;
        }
      }

      if (createdCount > 0) {
        showToast(`${createdCount} doação(ões) de doadores foram sincronizadas para a Visão Geral e Histórico!`, 'success');
      } else {
        showToast('Todas as doações dos doadores já estão presentes no histórico e visão geral!', 'info');
      }
    } catch (err) {
      console.error('Erro ao sincronizar doações:', err);
      showToast('Erro ao sincronizar doações.', 'error');
    } finally {
      setSyncing(false);
    }
  };

  // Submeter modal de lançamento avulso de doação para um doador
  const handleRegisterDonationFromModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!donationModalDonor) return;
    const amountVal = Number(donationForm.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Por favor, informe um valor válido.', 'error');
      return;
    }

    setLoading(true);
    try {
      await launchTreasuryDonationForDonor({
        donorId: donationModalDonor.id,
        donorName: donationModalDonor.name,
        donorCpf: (donationModalDonor as any).cpfOrCnpj || null,
        amount: amountVal,
        date: donationForm.date,
        paymentMethod: donationForm.paymentMethod,
        donationType: donationModalDonor.type === 'SOCIO_MENSAL' ? 'RECORRENTE' : 'EVENTUAL',
        finality: donationForm.finality,
        observations: donationForm.observations
      });

      showToast(`Doação de R$ ${amountVal.toFixed(2)} de ${donationModalDonor.name} registrada no Histórico e Visão Geral!`, 'success');
      setDonationModalDonor(null);
    } catch (err) {
      console.error('Erro ao lançar doação:', err);
      showToast('Erro ao registrar doação para o doador.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'Tipo', 'E-mail', 'Telefone', 'Valor Mensal', 'Status'];
      const data = donors.map(d => [
        d.name,
        d.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador',
        d.email || '-',
        d.phone || '-',
        d.amount ? `R$ ${d.amount}` : '-',
        d.status
      ]);

      await generateModernPDF({
        title: 'Lista de Doadores e Sócios',
        subtitle: `Total de registros: ${donors.length} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: 'lista_doadores_oami'
      });
      showToast('PDF gerado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar PDF.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'Tipo', 'E-mail', 'Telefone', 'Valor Mensal', 'Status'];
      const data = donors.map(d => [
        d.name,
        d.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador',
        d.email || '-',
        d.phone || '-',
        d.amount ? `R$ ${d.amount}` : '-',
        d.status
      ]);

      await generateModernWord({
        title: 'Lista de Doadores e Sócios',
        subtitle: `Total de registros: ${donors.length} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: 'lista_doadores_oami'
      });
      showToast('Word gerado com sucesso!', 'success');
    } catch (e) {
      console.error(e);
      showToast('Erro ao exportar Word.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      showToast('Por favor, preencha o nome completo.', 'error');
      return;
    }

    setLoading(true);
    try {
      const amountVal = Number(formData.amount) || 0;
      const nowIso = new Date().toISOString();

      if (editingDonor) {
        const cleanedDonor = cleanData({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpfOrCnpj: formData.cpfOrCnpj || null,
          type: formData.type,
          amount: amountVal,
          status: formData.status,
          startDate: formData.startDate,
          createdAt: editingDonor.createdAt || nowIso,
          updatedAt: nowIso
        });

        await updateDoc(doc(db, 'donors', editingDonor.id), cleanedDonor);

        // Sempre sincroniza automaticamente se houver valor financeiro
        if (amountVal > 0) {
          await launchTreasuryDonationForDonor({
            donorId: editingDonor.id,
            donorName: formData.name.trim(),
            donorCpf: formData.cpfOrCnpj || null,
            amount: amountVal,
            date: formData.startDate,
            paymentMethod: formData.paymentMethod,
            donationType: formData.type === 'SOCIO_MENSAL' ? 'RECORRENTE' : 'EVENTUAL'
          });
        }

        showToast('Cadastro de doador/sócio atualizado e sincronizado com a Tesouraria!', 'success');
      } else {
        const cleanedDonor = cleanData({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          cpfOrCnpj: formData.cpfOrCnpj || null,
          type: formData.type,
          amount: amountVal,
          status: formData.status,
          startDate: formData.startDate,
          totalDonated: amountVal > 0 ? amountVal : 0,
          donationCount: amountVal > 0 ? 1 : 0,
          lastDonationDate: amountVal > 0 ? formData.startDate : null,
          createdAt: nowIso
        });

        const docRef = await addDoc(collection(db, 'donors'), cleanedDonor);

        // Sempre lança na Tesouraria (Visão Geral e Histórico) se for doação financeira (> 0)
        if (amountVal > 0) {
          await launchTreasuryDonationForDonor({
            donorId: docRef.id,
            donorName: formData.name.trim(),
            donorCpf: formData.cpfOrCnpj || null,
            amount: amountVal,
            date: formData.startDate,
            paymentMethod: formData.paymentMethod,
            donationType: formData.type === 'SOCIO_MENSAL' ? 'RECORRENTE' : 'EVENTUAL'
          });
        }

        showToast('Cadastro realizado! Doação sincronizada automaticamente na Visão Geral e no Histórico.', 'success');
      }
      handleCloseModal();
    } catch (err) {
      console.error('Erro ao salvar doador:', err);
      showToast('Erro ao salvar cadastro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cálculos automáticos de soma por categoria e total geral
  const totalMensal = donors
    .filter(d => d.type === 'SOCIO_MENSAL')
    .reduce((acc, d) => acc + (d.amount || 0), 0);

  const totalEventual = donors
    .filter(d => d.type === 'DOADOR')
    .reduce((acc, d) => acc + (d.amount || 0), 0);

  const totalGeral = totalMensal + totalEventual;

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header Banner e Controles */}
      <div className="bg-gradient-to-r from-emerald-700 via-teal-700 to-emerald-800 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-emerald-600/30 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 bg-emerald-500/20 backdrop-blur-md px-3 py-1 rounded-full text-emerald-100 text-xs font-bold uppercase tracking-wider mb-2 border border-emerald-400/30">
            <Heart size={14} className="text-pink-300" /> Casa OAMI • Doadores e Sócios
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white">Controle de Doadores e Sócios (OAMI)</h2>
          <p className="text-emerald-100/90 text-sm mt-1 max-w-xl">
            Acompanhamento, histórico de contribuições e gestão de doadores eventuais e sócios mensais da instituição com sincronização automática na Tesouraria.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button 
            onClick={handleSyncExistingDonors}
            disabled={syncing || donors.length === 0}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
            title="Sincronizar todas as doações dos doadores para aparecerem no Histórico e Visão Geral"
          >
            <RefreshCw size={18} className={syncing ? 'animate-spin' : ''} />
            Sincronizar no Histórico
          </button>
          <button 
            onClick={handleExportPDF}
            disabled={exporting || donors.length === 0}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
            title="Exportar PDF"
          >
            <FileDown size={18} /> PDF
          </button>
          <button 
            onClick={handleExportWord}
            disabled={exporting || donors.length === 0}
            className="p-3 bg-white/10 hover:bg-white/20 text-white rounded-2xl transition-all disabled:opacity-50 flex items-center gap-2 text-xs font-bold"
            title="Exportar Word"
          >
            <FileText size={18} /> Word
          </button>
          <button 
            onClick={() => {
              setEditingDonor(null);
              setIsModalOpen(true);
            }}
            className="bg-white text-emerald-800 px-5 py-3 rounded-2xl text-xs sm:text-sm font-black shadow-lg hover:bg-emerald-50 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Cadastro
          </button>
        </div>
      </div>

      {/* Modal de Cadastro / Edição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden border border-gray-100 dark:border-gray-800 max-h-[90vh] flex flex-col"
            >
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center shrink-0">
                <h3 className="text-xl font-bold flex items-center gap-2">
                  <Heart size={20} className="text-pink-300" />
                  {editingDonor ? 'Editar Doador/Sócio' : 'Novo Doador/Sócio'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="p-6 sm:p-8 space-y-4 overflow-y-auto">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">E-mail (Opcional)</label>
                    <input 
                      type="email" 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Telefone (Opcional)</label>
                    <input 
                      type="tel" 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">CPF / CNPJ (Opcional)</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white"
                      value={formData.cpfOrCnpj}
                      onChange={(e) => setFormData({ ...formData, cpfOrCnpj: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Tipo</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="DOADOR">Doador Eventual</option>
                      <option value="SOCIO_MENSAL">Sócio Mensal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Valor da Contribuição (R$)</label>
                    <input 
                      type="number" 
                      step="0.01"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Forma de Pagamento</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    >
                      <option value="PIX">PIX</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="TRANSFERENCIA">Transferência Bancária</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="BOLETO">Boleto Bancário</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Status</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Data de Início / Lançamento</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>

                  <div className="col-span-2 bg-emerald-50 dark:bg-emerald-950/40 p-4 rounded-2xl border border-emerald-200/60 dark:border-emerald-800/40 flex items-center gap-3">
                    <CheckCircle2 size={22} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-emerald-900 dark:text-emerald-200">
                        Sincronização Automática com a Tesouraria
                      </p>
                      <p className="text-[11px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                        Toda doação financeira cadastrada é lançada automaticamente na Visão Geral das Doações e no Histórico da Tesouraria com geração de recibo oficial.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : editingDonor ? 'Salvar Alterações' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal para Lançamento de Doação Avulsa/Mensal de Doador Existente */}
      <AnimatePresence>
        {donationModalDonor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-100 dark:border-gray-800"
            >
              <div className="p-6 bg-emerald-600 text-white flex justify-between items-center">
                <div>
                  <h3 className="text-lg font-bold flex items-center gap-2">
                    <DollarSign size={20} className="text-emerald-200" />
                    Lançar Contribuição
                  </h3>
                  <p className="text-xs text-emerald-100 font-medium mt-0.5">
                    {donationModalDonor.name}
                  </p>
                </div>
                <button onClick={() => setDonationModalDonor(null)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegisterDonationFromModal} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Valor Recebido (R$)</label>
                  <input 
                    type="number" 
                    step="0.01"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-black text-lg"
                    value={donationForm.amount}
                    onChange={(e) => setDonationForm({ ...donationForm, amount: parseFloat(e.target.value) || 0 })}
                    required
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Data do Recebimento</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold"
                      value={donationForm.date}
                      onChange={(e) => setDonationForm({ ...donationForm, date: e.target.value })}
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Forma de Pagamento</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold text-xs"
                      value={donationForm.paymentMethod}
                      onChange={(e) => setDonationForm({ ...donationForm, paymentMethod: e.target.value })}
                    >
                      <option value="PIX">PIX</option>
                      <option value="DINHEIRO">Dinheiro</option>
                      <option value="TRANSFERENCIA">Transferência Bancária</option>
                      <option value="CARTAO_CREDITO">Cartão de Crédito</option>
                      <option value="BOLETO">Boleto Bancário</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Destinação / Finalidade</label>
                  <select 
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white font-bold text-xs"
                    value={donationForm.finality}
                    onChange={(e) => setDonationForm({ ...donationForm, finality: e.target.value })}
                  >
                    <option value="MANUTENCAO_GERAL">Manutenção Geral da Casa OAMI</option>
                    <option value="ACOLHIMENTO_CRIANCAS">Acolhimento e Assistência às Crianças</option>
                    <option value="PRODUCAO_FRALDAS">Fábrica de Fraldas</option>
                    <option value="OUTRA">Outras Destinações</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase mb-2">Observações (Opcional)</label>
                  <input 
                    type="text"
                    placeholder="Ex: Ref. ao mês de Agosto"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 text-gray-800 dark:text-white text-xs"
                    value={donationForm.observations}
                    onChange={(e) => setDonationForm({ ...donationForm, observations: e.target.value })}
                  />
                </div>

                <div className="pt-3 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setDonationModalDonor(null)}
                    className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold text-xs"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-4 py-3 bg-emerald-600 text-white font-black rounded-xl shadow-lg hover:bg-emerald-700 transition-all disabled:opacity-50 text-xs flex items-center justify-center gap-1.5"
                  >
                    <CheckCircle2 size={16} />
                    {loading ? 'Lançando...' : 'Confirmar e Lançar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal de Confirmação de Exclusão */}
      <AnimatePresence>
        {deletingDonor && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800 space-y-4"
            >
              <h3 className="text-lg font-black text-gray-900 dark:text-white">Confirmar Exclusão</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                Tem certeza que deseja excluir o doador <strong>{deletingDonor.name}</strong>? Esta ação não poderá ser desfeita.
              </p>
              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setDeletingDonor(null)}
                  className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-600 dark:text-gray-300"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleDeleteDonor}
                  disabled={loading}
                  className="px-4 py-2 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700 transition-colors shadow-md"
                >
                  {loading ? 'Excluindo...' : 'Sim, Excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Tabela de Doadores */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-800/80 border-b border-gray-100 dark:border-gray-800">
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Nome</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Contato</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Valor Cadastrado</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
              {(donors || []).map((donor, idx) => (
                <tr key={`${donor.id || 'donor'}-${idx}`} className="hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors">
                  <td className="p-4">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">{donor.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      Desde {donor.startDate ? new Date(donor.startDate + "T00:00:00").toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </td>
                  <td className="p-4">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase",
                      donor.type === 'SOCIO_MENSAL' ? 'bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300' : 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300'
                    )}>
                      {donor.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador'}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-xs text-gray-600 dark:text-gray-400">{donor.email || '-'}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{donor.phone || '-'}</p>
                  </td>
                  <td className="p-4 text-right">
                    <p className="text-sm font-bold text-gray-800 dark:text-white">
                      {donor.amount ? `R$ ${donor.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : '-'}
                    </p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-black rounded-full uppercase",
                      donor.status === 'ATIVO' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-rose-100 dark:bg-rose-950 text-rose-700 dark:text-rose-300'
                    )}>
                      {donor.status || 'ATIVO'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      <button
                        onClick={() => {
                          setDonationModalDonor(donor);
                          setDonationForm({
                            date: new Date().toISOString().split('T')[0],
                            amount: donor.amount || 0,
                            paymentMethod: 'PIX',
                            finality: 'MANUTENCAO_GERAL',
                            observations: ''
                          });
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 dark:hover:bg-emerald-900/60 rounded-xl text-emerald-700 dark:text-emerald-300 font-bold text-xs transition-colors flex items-center gap-1 border border-emerald-200/50 dark:border-emerald-800/40"
                        title="Lançar doação/contribuição no Histórico e Visão Geral da Tesouraria"
                      >
                        <DollarSign size={14} />
                        <span>Lançar Doação</span>
                      </button>
                      <button
                        onClick={() => handleEditClick(donor)}
                        className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg text-blue-600 dark:text-blue-400 transition-colors"
                        title="Editar Doador"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button
                        onClick={() => setDeletingDonor(donor)}
                        className="p-1.5 hover:bg-rose-50 dark:hover:bg-rose-900/30 rounded-lg text-rose-600 dark:text-rose-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {donors.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">
                    Nenhum doador ou sócio cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Seção de Resumo de Doações com Cálculos Automáticos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/50 dark:bg-blue-950/20 p-6 rounded-3xl border border-blue-100/50 dark:border-blue-900/30 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600/80 dark:text-blue-400 uppercase tracking-wider mb-1">Arrecadação Mensal (Sócios)</p>
            <h3 className="text-2xl font-black text-blue-900 dark:text-blue-100">
              R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-blue-600 dark:text-blue-400 font-medium mt-1">
              {donors.filter(d => d.type === 'SOCIO_MENSAL').length} sócios mensais ativos
            </p>
          </div>
          <div className="p-4 bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400 rounded-2xl shrink-0">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/30 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600/80 dark:text-emerald-400 uppercase tracking-wider mb-1">Doações Eventuais</p>
            <h3 className="text-2xl font-black text-emerald-900 dark:text-emerald-100">
              R$ {totalEventual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium mt-1">
              {donors.filter(d => d.type === 'DOADOR').length} doadores eventuais
            </p>
          </div>
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 rounded-2xl shrink-0">
            <Heart size={24} />
          </div>
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-950/20 p-6 rounded-3xl border border-purple-100/50 dark:border-purple-900/30 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-600/80 dark:text-purple-400 uppercase tracking-wider mb-1">Total Estimado Arrecadado</p>
            <h3 className="text-2xl font-black text-purple-900 dark:text-purple-100">
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-purple-600 dark:text-purple-400 font-medium mt-1">
              {donors.length} doadores/sócios no total
            </p>
          </div>
          <div className="p-4 bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400 rounded-2xl shrink-0">
            <DollarSign size={24} />
          </div>
        </div>
      </div>
    </div>
  );
};
