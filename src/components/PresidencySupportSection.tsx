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
  Archive,
  User as UserIcon,
  Tag,
  Eye,
  FileDown,
  Upload
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { PresidencySupportDocument, User } from '../types';
import { db } from '../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { generateModernPDF } from '../lib/pdfUtils';
import { generateModernWord } from '../lib/wordUtils';
import { 
  processAndStoreFile, 
  downloadAttachedDocument, 
  openAttachedDocument, 
  deleteDocumentChunks, 
  MAX_DOCUMENT_FILE_SIZE_LABEL 
} from '../lib/documentStorage';

interface PresidencySupportSectionProps {
  documents: PresidencySupportDocument[];
  user: User;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const PresidencySupportSection: React.FC<PresidencySupportSectionProps> = ({
  documents,
  user,
  showToast
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingDoc, setEditingDoc] = useState<PresidencySupportDocument | null>(null);
  const [deletingDoc, setDeletingDoc] = useState<PresidencySupportDocument | null>(null);
  const [uploadingDocStatus, setUploadingDocStatus] = useState<string | null>(null);
  const [isDocDownloading, setIsDocDownloading] = useState<string | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const [formData, setFormData] = useState({
    title: '',
    category: 'MINUTA' as 'ATA' | 'OFICIO' | 'MINUTA' | 'REGIMENTO' | 'OUTRO',
    date: new Date().toISOString().split('T')[0],
    description: '',
    url: '',
    attachmentName: '',
    attachmentSize: '',
    attachmentId: '',
    attachmentChunked: false,
    attachmentChunkCount: 0,
    status: 'EM_ELABORACAO' as 'EM_ELABORACAO' | 'APROVADO' | 'ARQUIVADO'
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDoc(null);
    setFormData({
      title: '',
      category: 'MINUTA',
      date: new Date().toISOString().split('T')[0],
      description: '',
      url: '',
      attachmentName: '',
      attachmentSize: '',
      attachmentId: '',
      attachmentChunked: false,
      attachmentChunkCount: 0,
      status: 'EM_ELABORACAO'
    });
  };

  const handleEditClick = (docItem: PresidencySupportDocument) => {
    setEditingDoc(docItem);
    setFormData({
      title: docItem.title,
      category: docItem.category,
      date: docItem.date || new Date().toISOString().split('T')[0],
      description: docItem.description || '',
      url: docItem.url || '',
      attachmentName: docItem.attachmentName || '',
      attachmentSize: docItem.attachmentSize || '',
      attachmentId: docItem.attachmentId || '',
      attachmentChunked: !!docItem.attachmentChunked,
      attachmentChunkCount: docItem.attachmentChunkCount || 0,
      status: docItem.status || 'EM_ELABORACAO'
    });
    setIsModalOpen(true);
  };

  const handleDeleteDocument = async () => {
    if (!deletingDoc) return;
    setLoading(true);
    try {
      if (deletingDoc.attachmentId && deletingDoc.attachmentChunked) {
        await deleteDocumentChunks(deletingDoc.attachmentId, deletingDoc.attachmentChunkCount);
      }
      await deleteDoc(doc(db, 'presidency_support', deletingDoc.id));
      showToast('Documento excluído com sucesso!');
      setDeletingDoc(null);
    } catch (err) {
      console.error(err);
      showToast('Erro ao excluir documento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      showToast('Por favor, preencha o título e a descrição.', 'error');
      return;
    }

    setLoading(true);
    try {
      const dataToSave = {
        title: formData.title,
        category: formData.category,
        date: formData.date,
        description: formData.description,
        url: formData.url,
        attachmentName: formData.attachmentName,
        attachmentSize: formData.attachmentSize,
        attachmentId: formData.attachmentId,
        attachmentChunked: formData.attachmentChunked,
        attachmentChunkCount: formData.attachmentChunkCount,
        status: formData.status,
        author: editingDoc ? editingDoc.author : user.name,
        createdAt: editingDoc ? editingDoc.createdAt : new Date().toISOString()
      };

      if (editingDoc) {
        await updateDoc(doc(db, 'presidency_support', editingDoc.id), dataToSave);
        showToast('Documento atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'presidency_support'), dataToSave);
        showToast('Documento cadastrado com sucesso!');
      }
      handleCloseModal();
    } catch (err) {
      console.error(err);
      showToast('Erro ao salvar documento.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleExportPDF = async () => {
    if (documents.length === 0) {
      showToast('Nenhum documento para exportar.', 'error');
      return;
    }
    setExporting(true);
    try {
      const columns = ['Título', 'Categoria', 'Data', 'Autor', 'Descrição', 'Status'];
      const data = filteredDocs.map(d => [
        d.title,
        d.category,
        d.date ? new Date(d.date + "T00:00:00").toLocaleDateString('pt-BR') : '-',
        d.author || '-',
        d.description,
        d.status === 'EM_ELABORACAO' ? 'Em Elaboração' : d.status === 'APROVADO' ? 'Aprovado' : 'Arquivado'
      ]);

      await generateModernPDF({
        title: 'Suporte à Presidência - Gestão de Documentos',
        subtitle: `Total de registros: ${filteredDocs.length} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        columns,
        data,
        fileName: 'documentos_presidencia_oami'
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
    if (documents.length === 0) {
      showToast('Nenhum documento para exportar.', 'error');
      return;
    }
    setExporting(true);
    try {
      const columns = ['Título', 'Categoria', 'Data', 'Autor', 'Descrição', 'Status'];
      const data = filteredDocs.map(d => [
        d.title,
        d.category,
        d.date ? new Date(d.date + "T00:00:00").toLocaleDateString('pt-BR') : '-',
        d.author || '-',
        d.description,
        d.status === 'EM_ELABORACAO' ? 'Em Elaboração' : d.status === 'APROVADO' ? 'Aprovado' : 'Arquivado'
      ]);

      await generateModernWord({
        title: 'Suporte à Presidência - Gestão de Documentos',
        subtitle: `Total de registros: ${filteredDocs.length} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
        columns,
        data,
        fileName: 'documentos_presidencia_oami'
      });
      showToast('Word gerado com sucesso!');
    } catch (err) {
      console.error(err);
      showToast('Erro ao exportar Word.', 'error');
    } finally {
      setExporting(false);
    }
  };

  const filteredDocs = documents.filter(d => {
    const matchesSearch = d.title.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          d.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'ALL' || d.category === categoryFilter;
    const matchesStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  return (
    <div className="space-y-6 p-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Suporte à <span className="text-amber-600">Presidência</span>
          </h2>
          <p className="text-gray-500 font-medium">Gestão centralizada de atas, minutas, ofícios e regimentos oficiais.</p>
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
              setEditingDoc(null);
              setIsModalOpen(true);
            }}
            className="bg-amber-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-lg hover:bg-amber-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} /> Novo Documento
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm flex flex-col md:flex-row gap-4">
        <div className="flex-1 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input 
            type="text" 
            placeholder="Pesquisar por título ou conteúdo..."
            className="w-full pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="flex flex-wrap gap-2.5">
          <select 
            className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white"
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
          >
            <option value="ALL">Todas Categorias</option>
            <option value="ATA">Atas</option>
            <option value="OFICIO">Ofícios</option>
            <option value="MINUTA">Minutas</option>
            <option value="REGIMENTO">Regimentos</option>
            <option value="OUTRO">Outros</option>
          </select>
          <select 
            className="px-4 py-3 bg-gray-50 dark:bg-gray-800 border-none rounded-xl text-sm outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="ALL">Todos Status</option>
            <option value="EM_ELABORACAO">Em Elaboração</option>
            <option value="APROVADO">Aprovados</option>
            <option value="ARQUIVADO">Arquivados</option>
          </select>
        </div>
      </div>

      {/* Docs Grid / Table */}
      <div className="bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50/50 dark:bg-gray-800/20 border-b border-gray-100 dark:border-gray-800">
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Documento / Título</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Categoria</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Informações</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-center">Status</th>
                <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {filteredDocs.map((docItem) => (
                <tr key={docItem.id} className="hover:bg-gray-50/50 dark:hover:bg-gray-800/10 transition-colors">
                  <td className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-3 bg-amber-50 dark:bg-amber-900/10 text-amber-600 rounded-xl mt-0.5">
                        <FileText size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-gray-800 dark:text-white line-clamp-1">{docItem.title}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 line-clamp-1 mt-0.5">{docItem.description}</p>
                        {docItem.attachmentName && (
                          <div className="flex items-center gap-1.5 mt-1 text-[11px] text-amber-700 dark:text-amber-400 font-semibold bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md w-fit">
                            <FileText size={12} />
                            <span className="truncate max-w-[180px]">{docItem.attachmentName}</span>
                            {docItem.attachmentSize && <span className="text-[10px] text-gray-400 font-normal">({docItem.attachmentSize})</span>}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="px-2.5 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 text-[10px] font-black rounded-lg uppercase tracking-wider flex items-center gap-1 w-fit">
                      <Tag size={10} /> {docItem.category}
                    </span>
                  </td>
                  <td className="p-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <p className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1.5 font-medium">
                        <Calendar size={12} className="text-gray-400" />
                        {docItem.date ? new Date(docItem.date + "T00:00:00").toLocaleDateString('pt-BR') : '-'}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1.5">
                        <UserIcon size={12} className="text-gray-400" />
                        Por: {docItem.author || '-'}
                      </p>
                    </div>
                  </td>
                  <td className="p-4 text-center whitespace-nowrap">
                    <span className={cn(
                      "px-2.5 py-1 text-[10px] font-bold rounded-full uppercase flex items-center gap-1 w-fit mx-auto",
                      docItem.status === 'APROVADO' ? 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400' :
                      docItem.status === 'EM_ELABORACAO' ? 'bg-amber-100 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400' :
                      'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                    )}>
                      {docItem.status === 'APROVADO' ? <CheckCircle size={10} /> :
                       docItem.status === 'EM_ELABORACAO' ? <Clock size={10} /> :
                       <Archive size={10} />}
                      {docItem.status === 'EM_ELABORACAO' ? 'Elaboração' : docItem.status === 'APROVADO' ? 'Aprovado' : 'Arquivado'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <div className="flex justify-end items-center gap-1.5">
                      {(docItem.attachmentId || docItem.url) && (
                        <>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                if (docItem.attachmentId) {
                                  await openAttachedDocument({
                                    id: docItem.attachmentId,
                                    name: docItem.attachmentName || docItem.title,
                                    url: docItem.url,
                                    isChunked: docItem.attachmentChunked,
                                    chunkCount: docItem.attachmentChunkCount
                                  });
                                } else if (docItem.url) {
                                  window.open(docItem.url, '_blank');
                                }
                              } catch (err: any) {
                                showToast(err.message || 'Erro ao visualizar arquivo.', 'error');
                              }
                            }}
                            className="p-1.5 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg text-blue-600 dark:text-blue-400 transition-colors flex items-center justify-center"
                            title="Visualizar documento anexo"
                          >
                            <Eye size={15} />
                          </button>
                          <button
                            type="button"
                            disabled={isDocDownloading === docItem.id}
                            onClick={async () => {
                              try {
                                setIsDocDownloading(docItem.id);
                                if (docItem.attachmentId) {
                                  await downloadAttachedDocument({
                                    id: docItem.attachmentId,
                                    name: docItem.attachmentName || `${docItem.title}.pdf`,
                                    url: docItem.url,
                                    isChunked: docItem.attachmentChunked,
                                    chunkCount: docItem.attachmentChunkCount
                                  });
                                } else if (docItem.url) {
                                  window.open(docItem.url, '_blank');
                                }
                              } catch (err: any) {
                                showToast(err.message || 'Erro ao baixar documento.', 'error');
                              } finally {
                                setIsDocDownloading(null);
                              }
                            }}
                            className="p-1.5 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg text-green-600 dark:text-green-400 transition-colors flex items-center justify-center disabled:opacity-50"
                            title="Baixar anexo"
                          >
                            {isDocDownloading === docItem.id ? (
                              <Loader2 size={15} className="animate-spin text-green-600" />
                            ) : (
                              <FileDown size={15} />
                            )}
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => handleEditClick(docItem)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => setDeletingDoc(docItem)}
                        className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-600 hover:text-red-750 transition-colors flex items-center justify-center"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-10 text-center text-gray-500 dark:text-gray-400 italic">Nenhum documento cadastrado de apoio a presidência.</td>
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
              <div className="p-6 bg-amber-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">{editingDoc ? 'Editar Documento' : 'Novo Documento Administrativo'}</h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <form onSubmit={handleSave} className="p-6 space-y-4 overflow-y-auto flex-1">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Título do Documento</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white font-medium"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                  />
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Categoria</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value as any })}
                    >
                      <option value="MINUTA">Minuta</option>
                      <option value="ATA">Ata</option>
                      <option value="OFICIO">Ofício</option>
                      <option value="REGIMENTO">Regimento Geral</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data do Atendimento/Ata</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Status do Documento</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white font-medium"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="EM_ELABORACAO">Em Elaboração</option>
                      <option value="APROVADO">Aprovado pelo Presidente</option>
                      <option value="ARQUIVADO">Arquivado / Histórico</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Link Drive/Nuvem (Opcional)</label>
                    <input 
                      type="url" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white text-xs"
                      placeholder="https://drive.google.com/..."
                      value={formData.url}
                      onChange={(e) => setFormData({ ...formData, url: e.target.value })}
                    />
                  </div>
                </div>

                {/* Anexo de Arquivo PDF (até 25MB) */}
                <div className="p-4 bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-800/40 rounded-2xl space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-900 dark:text-amber-300 uppercase">
                      Anexo Oficial (PDF, Word, etc.)
                    </label>
                    <span className="text-[10px] font-black text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950/50 px-2 py-0.5 rounded-full">
                      Limite ampliado: até {MAX_DOCUMENT_FILE_SIZE_LABEL}
                    </span>
                  </div>

                  {formData.attachmentName ? (
                    <div className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-xl border border-amber-200 dark:border-amber-900/50">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <FileText size={18} className="text-amber-600 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{formData.attachmentName}</p>
                          <p className="text-[10px] text-gray-400 font-medium">{formData.attachmentSize || 'Pronto'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          if (formData.attachmentId && formData.attachmentChunked) {
                            deleteDocumentChunks(formData.attachmentId, formData.attachmentChunkCount);
                          }
                          setFormData({
                            ...formData,
                            attachmentName: '',
                            attachmentSize: '',
                            attachmentId: '',
                            attachmentChunked: false,
                            attachmentChunkCount: 0
                          });
                        }}
                        className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                        title="Remover anexo"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ) : (
                    <div>
                      {uploadingDocStatus ? (
                        <div className="flex items-center justify-center gap-2 py-3 px-4 bg-amber-100/70 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 rounded-xl text-xs font-bold animate-pulse">
                          <Loader2 size={14} className="animate-spin" />
                          <span>{uploadingDocStatus}</span>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.txt';
                            input.onchange = async (e: any) => {
                              const file = e.target.files?.[0];
                              if (!file) return;
                              setUploadingDocStatus(`Processando ${file.name}...`);
                              try {
                                const attached = await processAndStoreFile(file, (msg) => setUploadingDocStatus(msg));
                                setFormData(prev => ({
                                  ...prev,
                                  attachmentName: attached.name,
                                  attachmentSize: attached.size,
                                  attachmentId: attached.id || '',
                                  attachmentChunked: !!attached.isChunked,
                                  attachmentChunkCount: attached.chunkCount || 0
                                }));
                                showToast(`Arquivo "${file.name}" anexado com sucesso!`);
                              } catch (err: any) {
                                console.error('Erro ao anexar documento:', err);
                                showToast(err.message || 'Erro ao processar anexo.', 'error');
                              } finally {
                                setUploadingDocStatus(null);
                              }
                            };
                            input.click();
                          }}
                          className="w-full py-2.5 bg-white dark:bg-gray-900 hover:bg-amber-100/40 dark:hover:bg-amber-950/40 border border-dashed border-amber-300 dark:border-amber-800 rounded-xl text-xs font-bold text-amber-800 dark:text-amber-300 flex items-center justify-center gap-2 transition-colors"
                        >
                          <Upload size={14} />
                          Anexar Documento PDF (até 25MB)
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Descricão / Ementa ou Conteúdo Sintético</label>
                  <textarea 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white h-28"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder="Resumo do documento, deliberações, etc."
                    required
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
                    className="flex-1 px-6 py-3 bg-amber-600 text-white font-bold rounded-xl shadow-lg hover:bg-amber-700 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {loading ? 'Salvando...' : editingDoc ? 'Salvar Alterações' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Confirmation Modal */}
      <AnimatePresence>
        {deletingDoc && (
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
                Tem certeza que deseja excluir o documento <strong className="text-gray-950 dark:text-white">"{deletingDoc.title}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeletingDoc(null)}
                  disabled={loading}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteDocument}
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
