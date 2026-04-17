import React, { useState, useMemo } from 'react';
import { 
  Search, Filter, Calendar, User, 
  Image as ImageIcon, Grid, List, 
  Download, Trash2, X, ChevronRight,
  Clock, Tag, Briefcase, Plus, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { GalleryItem, Role, Elderly, User as UserType } from '../types';
import { ROLE_LABELS } from '../constants';
import { PhotoUpload } from './PhotoUpload';

interface GlobalGalleryProps {
  items: GalleryItem[];
  onDelete?: (id: string) => void;
  onDownload?: (item: GalleryItem) => void;
  onSavePhotos?: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string, category?: GalleryItem['category']) => Promise<void>;
  patients?: Elderly[];
  user?: UserType;
  showToast?: (msg: string, type?: 'success' | 'error') => void;
}

export const GlobalGallery: React.FC<GlobalGalleryProps> = ({ 
  items, 
  onDelete, 
  onDownload,
  onSavePhotos,
  patients = [],
  user,
  showToast
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<Role | 'ALL'>('ALL');
  const [selectedItem, setSelectedItem] = useState<GalleryItem | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedCategory, setSelectedCategory] = useState<GalleryItem['category'] | 'ALL'>('ALL');
  
  // Add Photo Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newPhotos, setNewPhotos] = useState<string[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [activityType, setActivityType] = useState('');
  const [description, setDescription] = useState('');
  const [newCategory, setNewCategory] = useState<GalleryItem['category']>('MULTIDISCIPLINAR');
  const [isSaving, setIsSaving] = useState(false);

  const filteredItems = useMemo(() => {
    return (items || []).filter(item => {
      const matchesSearch = 
        item.patientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.professionalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.activityType?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.description?.toLowerCase().includes(searchTerm.toLowerCase()) || false);
      
      const matchesRole = selectedRole === 'ALL' || item.professionalRole === selectedRole;
      const matchesCategory = selectedCategory === 'ALL' || item.category === selectedCategory;
      
      return matchesSearch && matchesRole && matchesCategory;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [items, searchTerm, selectedRole, selectedCategory]);

  const groupedItems = useMemo(() => {
    const groups: { [key: string]: GalleryItem[] } = {};
    filteredItems.forEach(item => {
      const date = item.date.split('T')[0];
      if (!groups[date]) groups[date] = [];
      groups[date].push(item);
    });
    return groups;
  }, [filteredItems]);

  const handleSaveNewPhotos = async () => {
    if (!onSavePhotos || !showToast || !user) return;
    
    const isInstitutional = newCategory !== 'MULTIDISCIPLINAR';
    
    if (newPhotos.length === 0 || (!selectedPatientId && !isInstitutional) || !activityType) {
      showToast('Preencha todos os campos obrigatórios e adicione ao menos uma foto.', 'error');
      return;
    }

    const patient = patients.find(p => p.id === selectedPatientId);
    const patientName = patient?.name || '';

    setIsSaving(true);
    try {
      await onSavePhotos(newPhotos, selectedPatientId, patientName, activityType, description, newCategory);
      showToast('Fotos adicionadas com sucesso!', 'success');
      setIsAddModalOpen(false);
      setNewPhotos([]);
      setSelectedPatientId('');
      setActivityType('');
      setDescription('');
      setNewCategory('MULTIDISCIPLINAR');
    } catch (err) {
      showToast('Erro ao salvar fotos.', 'error');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header & Filters */}
      <div className="flex flex-col gap-6 bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div className="flex-1 w-full">
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
              <input 
                type="text"
                placeholder="Buscar por idoso, profissional ou atividade..."
                className="w-full pl-12 pr-4 py-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white transition-all"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4 w-full md:w-auto">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-2 px-6 py-4 bg-green-600 text-white font-bold rounded-2xl hover:bg-green-700 transition-all shadow-lg shadow-green-200 dark:shadow-none whitespace-nowrap"
            >
              <Plus size={20} />
              Adicionar Fotos
            </button>

            <div className="flex bg-gray-50 dark:bg-gray-800 p-1 rounded-2xl">
              <button 
                onClick={() => setViewMode('grid')}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  viewMode === 'grid' ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm" : "text-gray-400"
                )}
              >
                <Grid size={20} />
              </button>
              <button 
                onClick={() => setViewMode('list')}
                className={cn(
                  "p-3 rounded-xl transition-all",
                  viewMode === 'list' ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm" : "text-gray-400"
                )}
              >
                <List size={20} />
              </button>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedCategory('ALL')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              selectedCategory === 'ALL' 
                ? "bg-green-600 text-white shadow-md shadow-green-100" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
            )}
          >
            Todos os Tipos
          </button>
          <button 
            onClick={() => setSelectedCategory('MULTIDISCIPLINAR')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              selectedCategory === 'MULTIDISCIPLINAR' 
                ? "bg-green-600 text-white shadow-md shadow-green-100" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
            )}
          >
            Multidisciplinar
          </button>
          <button 
            onClick={() => setSelectedCategory('OFICINA')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              selectedCategory === 'OFICINA' 
                ? "bg-green-600 text-white shadow-md shadow-green-100" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
            )}
          >
            Oficinas
          </button>
          <button 
            onClick={() => setSelectedCategory('REUNIAO')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              selectedCategory === 'REUNIAO' 
                ? "bg-green-600 text-white shadow-md shadow-green-100" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
            )}
          >
            Reuniões
          </button>
          <button 
            onClick={() => setSelectedCategory('OUTROS')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              selectedCategory === 'OUTROS' 
                ? "bg-green-600 text-white shadow-md shadow-green-100" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
            )}
          >
            Outros
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          <button 
            onClick={() => setSelectedRole('ALL')}
            className={cn(
              "px-4 py-2 rounded-xl text-xs font-bold transition-all",
              selectedRole === 'ALL' 
                ? "bg-green-600 text-white shadow-md shadow-green-100" 
                : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
            )}
          >
            Todas as Áreas
          </button>
          {(Object.keys(ROLE_LABELS) as Role[]).map((role) => (
            <button 
              key={role}
              onClick={() => setSelectedRole(role)}
              className={cn(
                "px-4 py-2 rounded-xl text-xs font-bold transition-all",
                selectedRole === role 
                  ? "bg-green-600 text-white shadow-md shadow-green-100" 
                  : "bg-gray-50 dark:bg-gray-800 text-gray-500 hover:bg-gray-100"
              )}
            >
              {ROLE_LABELS[role]}
            </button>
          ))}
        </div>
      </div>

      {/* Gallery Content */}
      <div className="space-y-12">
        {(Object.entries(groupedItems) as [string, GalleryItem[]][]).map(([date, dayItems]) => (
          <div key={date} className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
              <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <Calendar size={14} />
                {format(parseISO(date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
              </h3>
              <div className="h-px flex-1 bg-gray-100 dark:bg-gray-800" />
            </div>

            {viewMode === 'grid' ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                {dayItems.map((item) => (
                  <motion.div
                    layoutId={item.id}
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="group flex flex-col bg-white dark:bg-gray-900 rounded-[32px] overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all border border-gray-100 dark:border-gray-800"
                  >
                    <div className="relative aspect-square overflow-hidden">
                      <img 
                        src={item.url} 
                        alt={item.activityType} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        referrerPolicy="no-referrer"
                      />
                      <div className="absolute top-3 right-3 px-2 py-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm rounded-lg text-[8px] font-bold text-green-600 uppercase shadow-sm">
                        {item.category !== 'MULTIDISCIPLINAR' ? item.category : ROLE_LABELS[item.professionalRole]}
                      </div>
                    </div>
                    
                    <div className="p-4 space-y-1.5 flex-1 flex flex-col">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black text-green-600 uppercase truncate">
                          {item.category === 'MULTIDISCIPLINAR' ? item.patientName : item.category}
                        </p>
                        <span className="text-[8px] text-gray-400 font-bold whitespace-nowrap">
                          {format(parseISO(item.date), 'HH:mm')}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-gray-800 dark:text-white truncate">
                        {item.activityType}
                      </h4>
                      {item.description && (
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2 leading-relaxed italic">
                          "{item.description}"
                        </p>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {dayItems.map((item) => (
                  <div 
                    key={item.id}
                    onClick={() => setSelectedItem(item)}
                    className="flex items-center gap-6 p-4 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900/30 transition-all cursor-pointer group"
                  >
                    <div className="w-20 h-20 rounded-2xl overflow-hidden flex-shrink-0">
                      <img src={item.url} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="px-2 py-0.5 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 text-[10px] font-bold rounded-md uppercase">
                          {ROLE_LABELS[item.professionalRole]}
                        </span>
                        <span className="text-[10px] text-gray-400 font-medium">
                          {format(parseISO(item.date), 'HH:mm')}
                        </span>
                      </div>
                      <h4 className="font-bold text-gray-800 dark:text-white truncate">{item.patientName || item.category}</h4>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{item.activityType}</p>
                      {item.description && (
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 line-clamp-2 italic leading-relaxed">
                          "{item.description}"
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-gray-400 group-hover:text-green-600 transition-colors">
                      <div className="text-right hidden md:block">
                        <p className="text-xs font-bold text-gray-700 dark:text-gray-300">{item.professionalName}</p>
                        <p className="text-[10px]">Responsável</p>
                      </div>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        {filteredItems.length === 0 && (
          <div className="py-20 text-center space-y-4">
            <div className="w-24 h-24 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto text-gray-300 dark:text-gray-700">
              <ImageIcon size={48} />
            </div>
            <div className="max-w-xs mx-auto">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">Nenhuma foto encontrada</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                Tente ajustar seus filtros ou realize novos registros nas áreas multidisciplinares.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Add Photo Modal */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="bg-white dark:bg-gray-900 w-full max-w-2xl rounded-[32px] overflow-hidden shadow-2xl"
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
                <h3 className="text-xl font-black text-gray-800 dark:text-white">Adicionar Fotos à Galeria</h3>
                <button onClick={() => setIsAddModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-all">
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6 max-h-[70vh] overflow-y-auto">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Categoria do Registro</label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {(['MULTIDISCIPLINAR', 'OFICINA', 'REUNIAO', 'OUTROS'] as const).map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setNewCategory(cat)}
                        className={cn(
                          "py-3 px-2 rounded-2xl text-[10px] font-bold transition-all border-2",
                          newCategory === cat
                            ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-600"
                            : "bg-gray-50 dark:bg-gray-800 border-transparent text-gray-400 hover:bg-gray-100"
                        )}
                      >
                        {cat === 'MULTIDISCIPLINAR' ? 'Multidisciplinar' : cat === 'OFICINA' ? 'Oficina' : cat === 'REUNIAO' ? 'Reunião' : 'Outros'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {newCategory === 'MULTIDISCIPLINAR' && (
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Idoso Relacionado</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-bold"
                        value={selectedPatientId}
                        onChange={(e) => setSelectedPatientId(e.target.value)}
                      >
                        <option value="">Selecione o Idoso</option>
                        {patients.map(p => (
                          <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  <div className={cn("space-y-2", newCategory !== 'MULTIDISCIPLINAR' && "md:col-span-2")}>
                    <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">
                      {newCategory === 'OFICINA' ? 'Nome da Oficina' : newCategory === 'REUNIAO' ? 'Pauta da Reunião' : 'Tipo de Atividade'}
                    </label>
                    <input 
                      type="text"
                      placeholder={newCategory === 'OFICINA' ? "Ex: Oficina de Artes" : newCategory === 'REUNIAO' ? "Ex: Reunião de Equipe" : "Ex: Passeio, Evento..."}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-bold"
                      value={activityType}
                      onChange={(e) => setActivityType(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-gray-400 uppercase ml-1">Descrição (Opcional)</label>
                  <textarea 
                    placeholder="Detalhes sobre o registro..."
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-sm font-medium h-24 resize-none"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <PhotoUpload 
                  photos={newPhotos}
                  onChange={setNewPhotos}
                  maxPhotos={10}
                />
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 flex justify-end gap-3">
                <button 
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-6 py-3 text-sm font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSaveNewPhotos}
                  disabled={isSaving || newPhotos.length === 0}
                  className="px-8 py-3 bg-green-600 text-white text-sm font-bold rounded-xl hover:bg-green-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isSaving ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} />}
                  Salvar Fotos
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedItem && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/95 backdrop-blur-md" onClick={() => setSelectedItem(null)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative w-full max-w-5xl bg-white dark:bg-gray-900 rounded-[40px] overflow-hidden shadow-2xl flex flex-col md:flex-row h-full max-h-[800px]"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex-1 bg-black relative flex items-center justify-center">
                <img 
                  src={selectedItem.url} 
                  alt={selectedItem.activityType} 
                  className="w-full h-full object-contain"
                  referrerPolicy="no-referrer"
                />
                <button 
                  onClick={() => setSelectedItem(null)}
                  className="absolute top-6 left-6 p-3 bg-black/50 text-white rounded-full hover:bg-black/70 transition-all backdrop-blur-md"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="w-full md:w-[350px] p-8 flex flex-col bg-white dark:bg-gray-900 border-l border-gray-100 dark:border-gray-800">
                <div className="space-y-8 flex-1 overflow-y-auto pr-2">
                  <div>
                    <h3 className="text-2xl font-black text-gray-900 dark:text-white leading-tight">
                      {selectedItem.activityType}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                      {format(parseISO(selectedItem.date), "dd 'de' MMMM 'de' yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>

                  <div className="space-y-6">
                    <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                      <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                        <Tag size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Categoria</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedItem.category || 'Multidisciplinar'}</p>
                      </div>
                    </div>

                    {selectedItem.patientName && (
                      <div className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 flex items-center justify-center text-green-600 dark:text-green-400">
                          <User size={24} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Idoso</p>
                          <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedItem.patientName}</p>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center gap-4 p-4 bg-blue-50 dark:bg-blue-900/30 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                        <Briefcase size={24} />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Profissional</p>
                        <p className="text-sm font-bold text-gray-800 dark:text-white">{selectedItem.professionalName}</p>
                        <p className="text-[10px] font-medium text-blue-600 uppercase">{ROLE_LABELS[selectedItem.professionalRole]}</p>
                      </div>
                    </div>

                    {selectedItem.description && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase px-1">Descrição / Observações</p>
                        <div className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-700/50">
                          <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed italic">
                            "{selectedItem.description}"
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="pt-8 grid grid-cols-2 gap-4">
                  <button 
                    onClick={() => onDownload?.(selectedItem)}
                    className="flex items-center justify-center gap-2 py-4 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 font-bold rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    <Download size={20} />
                    Baixar
                  </button>
                  <button 
                    onClick={() => {
                      onDelete?.(selectedItem.id);
                      setSelectedItem(null);
                    }}
                    className="flex items-center justify-center gap-2 py-4 bg-red-50 text-red-600 font-bold rounded-2xl hover:bg-red-100 transition-all"
                  >
                    <Trash2 size={20} />
                    Excluir
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
