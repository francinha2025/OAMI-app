import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  Trash2, 
  Edit2, 
  FileText, 
  Download, 
  Calendar, 
  X, 
  AlertTriangle, 
  Loader2,
  CheckCircle,
  Clock,
  User as UserIcon,
  Tag,
  Building2,
  Phone,
  ArrowUpRight,
  ArrowDownLeft
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { InstitutionalSupportRecord, User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';

interface InstitutionalSupportSectionProps {
  records: InstitutionalSupportRecord[];
  user: User;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const InstitutionalSupportSection: React.FC<InstitutionalSupportSectionProps> = ({
  records,
  user,
  showToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingRecord, setEditingRecord] = useState<InstitutionalSupportRecord | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<InstitutionalSupportRecord | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    title: '',
    type: 'CONTATO_EXTERNO' as 'OFICIO_RECEBIDO' | 'OFICIO_EXPEDIDO' | 'CONTATO_EXTERNO' | 'PARCERIA',
    recipientSender: '',
    date: new Date().toISOString().split('T')[0],
    description: '',
    status: 'ATIVO' as 'PENDENTE' | 'RESPONDIDO' | 'CONCLUIDO' | 'ATIVO'
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData({
      title: '',
      type: 'CONTATO_EXTERNO',
      recipientSender: '',
      date: new Date().toISOString().split('T')[0],
      description: '',
      status: 'ATIVO'
    });
  };

  const handleEditClick = (record: InstitutionalSupportRecord) => {
    setEditingRecord(record);
    setFormData({
      title: record.title,
      type: record.type,
      recipientSender: record.recipientSender || '',
      date: record.date || new Date().toISOString().split('T')[0],
      description: record.description || '',
      status: record.status || 'ATIVO'
    });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'institutional_support', deletingRecord.id));
      showToast('Registro de Apoio Institucional excluído com sucesso!');
      setDeletingRecord(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.recipientSender) {
      showToast('Por favor, preencha o título e o contato/instituição.', 'error');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        title: formData.title,
        type: formData.type,
        recipientSender: formData.recipientSender,
        date: formData.date,
        description: formData.description,
        status: formData.status,
        createdAt: editingRecord ? editingRecord.createdAt : new Date().toISOString()
      };

      if (editingRecord) {
        await updateDoc(doc(db, 'institutional_support', editingRecord.id), dataToSave);
        showToast('Registro atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'institutional_support'), dataToSave);
        showToast('Registro cadastrado com sucesso!');
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar registro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (records.length === 0) {
      showToast('Nenhum registro para exportar.', 'error');
      return;
    }
    setExporting(true);
    try {
      const columns = ['Título', 'Tipo', 'Contato/Instituição', 'Data', 'Descrição', 'Status'];
      const data = filteredRecords.map(r => [
        r.title,
        r.type === 'OFICIO_RECEBIDO' ? 'Ofício Recebido' : r.type === 'OFICIO_EXPEDIDO' ? 'Ofício Expedido' : r.type === 'PARCERIA' ? 'Parceria' : 'Contato Externo',
        r.recipientSender,
        r.date ? new Date(r.date + "T00:00:00").toLocaleDateString('pt-BR') : '-',
        r.description || '-',
        r.status
      ]);

      await generateModernPDF({
        title: 'Apoio Institucional - Contatos e Ofícios',
        subtitle: `Total de registros: ${filteredRecords.length} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        columns,
        data,
        fileName: 'apoio_institucional_oami'
      });
      showToast('PDF gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar PDF.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleExportWord = async () => {
    if (records.length === 0) {
      showToast('Nenhum registro para exportar.', 'error');
      return;
    }
    setExporting(true);
    try {
      const columns = ['Título', 'Tipo', 'Contato/Instituição', 'Data', 'Descrição', 'Status'];
      const data = filteredRecords.map(r => [
        r.title,
        r.type === 'OFICIO_RECEBIDO' ? 'Ofício Recebido' : r.type === 'OFICIO_EXPEDIDO' ? 'Ofício Expedido' : r.type === 'PARCERIA' ? 'Parceria' : 'Contato Externo',
        r.recipientSender,
        r.date ? new Date(r.date + "T00:00:00").toLocaleDateString('pt-BR') : '-',
        r.description || '-',
        r.status
      ]);

      await generateModernWord({
        title: 'Apoio Institucional - Contatos e Ofícios',
        subtitle: `Total de registros: ${filteredRecords.length} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        columns,
        data,
        fileName: 'apoio_institucional_oami'
      });
      showToast('Word gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar Word.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const filteredRecords = records.filter(r => {
    const matchesSearch = r.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          r.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          r.recipientSender.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesType = typeFilter === 'ALL' || r.type === typeFilter;
    const matchesStatus = statusFilter === 'ALL' || r.status === statusFilter;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Apoio <span className="text-indigo-600">Institucional</span>
          </h2>
          <p className="text-gray-500 font-medium">Contatos estratégicos locais, parcerias ativas e ofícios externos (expedidos/recebidos).</p>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={handleExportPDF}
            disabled={exporting}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-600 dark:text-gray-300 shadow-sm flex items-center gap-2 text-sm font-bold"
            title="Exportar PDF"
          >
            <FileText size={18} /> <span className="hidden sm:inline">PDF</span>
          </button>
          <button 
            onClick={handleExportWord}
            disabled={exporting}
            className="p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-all text-gray-600 dark:text-gray-300 shadow-sm flex items-center gap-2 text-sm font-bold"
            title="Exportar Word"
          >
            <Download size={18} /> <span className="hidden sm:inline">Word</span>
          </button>
          <button 
            onClick={() => {
              setEditingRecord(null);
              setIsModalOpen(true);
            }}
            className="bg-indigo-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Novo Registro
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por assunto, remetente, contato ou conteúdo..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <select 
            className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white"
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
          >
            <option value="ALL">Todos os Tipos</option>
            <option value="OFICIO_RECEBIDO">Ofício Recebido</option>
            <option value="OFICIO_EXPEDIDO">Ofício Expedido</option>
            <option value="CONTATO_EXTERNO">Contato Externo</option>
            <option value="PARCERIA">Parceria Institucional</option>
          </select>
          <select 
            className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos os Status</option>
            <option value="PENDENTE">Pendentes</option>
            <option value="RESPONDIDO">Respondidos</option>
            <option value="CONCLUIDO">Concluídos</option>
            <option value="ATIVO">Ativos</option>
          </select>
        </div>
      </div>

      {/* Grid or Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Assunto / Título</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Tipo</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Interlocutor/Organização</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Data</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {filteredRecords.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "p-3 rounded-xl mt-0.5",
                        record.type.startsWith('OFICIO') ? 'bg-indigo-50 dark:bg-indigo-900/10 text-indigo-600' : 'bg-teal-50 dark:bg-teal-900/10 text-teal-600'
                      )}>
                        {record.type === 'OFICIO_EXPEDIDO' ? <ArrowUpRight size={20} /> :
                         record.type === 'OFICIO_RECEBIDO' ? <ArrowDownLeft size={20} /> :
                         record.type === 'PARCERIA' ? <Building2 size={20} /> :
                         <Phone size={20} />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white line-clamp-1">{record.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{record.description}</p>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <span className="px-2 py-0.5 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[9px] font-black rounded-lg uppercase tracking-wider">
                      {record.type === 'OFICIO_RECEBIDO' ? 'Ofício Recebido' :
                       record.type === 'OFICIO_EXPEDIDO' ? 'Ofício Expedido' :
                       record.type === 'PARCERIA' ? 'Parceria' : 'Contato'}
                    </span>
                  </td>
                  <td className="p-4">
                    <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{record.recipientSender}</p>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <p className="text-xs text-gray-600 dark:text-gray-400 font-medium">
                      {record.date ? new Date(record.date + "T00:00:00").toLocaleDateString('pt-BR') : '-'}
                    </p>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase flex items-center gap-1 w-fit mx-auto",
                      record.status === 'CONCLUIDO' || record.status === 'ATIVO' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                      record.status === 'RESPONDIDO' ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400' :
                      'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400'
                    )}>
                      {record.status === 'CONCLUIDO' || record.status === 'ATIVO' ? <CheckCircle size={10} /> :
                       record.status === 'RESPONDIDO' ? <CheckCircle size={10} /> :
                       <Clock size={10} />}
                      {record.status}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-2">
                      <button
                        onClick={() => handleEditClick(record)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingRecord(record)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-600 hover:text-red-750 transition-colors flex items-center justify-center"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredRecords.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">Nenhum registro de Apoio Institucional cadastrado.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
            >
              <div className="p-6 bg-indigo-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">{editingRecord ? 'Editar Registro' : 'Novo Registro de Apoio'}</h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Assunto / Identificação do Registro</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white font-medium"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="Ex: Ofício nº 42/26, Contato com Prefeitura, Reunião sobre Emenda..."
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Tipo de Apoio</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white font-medium"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="CONTATO_EXTERNO">Contato Externo / Autoridade</option>
                      <option value="OFICIO_RECEBIDO">Ofício Recebido</option>
                      <option value="OFICIO_EXPEDIDO">Ofício Expedido</option>
                      <option value="PARCERIA">Parceria Institucional / ONG</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Interlocutor / Instituição</label>
                    <input 
                      type="text" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white"
                      placeholder="Ex: Secretaria de Saúde, Deputado Estadual, Prefeito..."
                      value={formData.recipientSender}
                      onChange={(e) => setFormData({ ...formData, recipientSender: e.target.value })}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Status do Envio/Procedimento</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white font-medium"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="PENDENTE">Pendente</option>
                      <option value="RESPONDIDO">Respondido</option>
                      <option value="CONCLUIDO">Concluído</option>
                      <option value="ATIVO">Ativo</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Conteúdo / Detalhes do Apoio ou Contato</label>
                  <textarea 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 text-gray-800 dark:text-white h-28"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Descrição sobre as demandas apresentadas ou ementa do ofício de cooperação."
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={handleCloseModal}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all font-bold"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:bg-indigo-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Salvando...' : editingRecord ? 'Salvar Alterações' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingRecord && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4 text-left"
            >
              <div className="flex items-center gap-3 text-red-600">
                <AlertTriangle size={32} />
                <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir o registro <strong className="text-gray-950 dark:text-white">"{deletingRecord.title}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeletingRecord(null)}
                  disabled={loading}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteRecord}
                  disabled={loading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2"
                >
                  {loading ? <Loader2 size={16} className="animate-spin" /> : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
