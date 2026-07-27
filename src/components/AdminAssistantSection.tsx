import React, { useState, useEffect } from 'react';
import { 
  Users, 
  DollarSign, 
  FileText, 
  Calendar, 
  Settings, 
  TrendingUp, 
  Briefcase,
  AlertCircle,
  Plus,
  ArrowRight,
  ClipboardList,
  CheckCircle2,
  Circle,
  Trash2,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import { 
  Elderly, 
  FinancialRecord, 
  User, 
  CalendarEvent, 
  Volunteer,
  Caregiver,
  AdminReminder
} from '../types';
import { db } from '../firebase';
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';

interface AdminAssistantSectionProps {
  user: User;
  elderly: Elderly[];
  financialRecords: FinancialRecord[];
  events: CalendarEvent[];
  volunteers: Volunteer[];
  caregivers: Caregiver[];
  adminUsers: User[];
  onNavigate: (tab: string) => void;
  showToast: (message: string, type?: 'success' | 'error') => void;
}

export const AdminAssistantSection: React.FC<AdminAssistantSectionProps> = ({
  user,
  elderly,
  financialRecords,
  events,
  volunteers,
  caregivers,
  adminUsers,
  onNavigate,
  showToast
}) => {
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [reminders, setReminders] = useState<AdminReminder[]>([]);
  const [isAddingReminder, setIsAddingReminder] = useState(false);
  const [newReminderText, setNewReminderText] = useState('');
  const [newReminderCategory, setNewReminderCategory] = useState('Financeiro');

  useEffect(() => {
    const q = query(collection(db, 'adminReminders'), orderBy('createdAt', 'asc'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const items: AdminReminder[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as AdminReminder));
      
      if (items.length === 0) {
        const defaultReminders = [
          { category: 'Financeiro', text: 'Revisar balancete mensal para prestação de contas da próxima semana.', completed: false, createdAt: new Date().toISOString() },
          { category: 'Profissionais', text: 'Conferir vencimento de registros de 3 estagiários de serviço social.', completed: false, createdAt: new Date(Date.now() + 1000).toISOString() },
          { category: 'Institucional', text: 'Atualizar galeria de fotos oficial para o site institucional.', completed: false, createdAt: new Date(Date.now() + 2000).toISOString() },
          { category: 'RH/Controle', text: 'Conferir folha de ponto dos cuidadores do turno da noite.', completed: false, createdAt: new Date(Date.now() + 3000).toISOString() },
          { category: 'Estoque', text: 'Revisar inventário de fraldas geriátricas e insumos recebidos.', completed: false, createdAt: new Date(Date.now() + 4000).toISOString() },
          { category: 'Secretaria', text: 'Organizar minutas da última reunião da diretoria para assinatura do Presidente.', completed: false, createdAt: new Date(Date.now() + 5000).toISOString() }
        ];
        
        for (const rem of defaultReminders) {
          await addDoc(collection(db, 'adminReminders'), rem);
        }
      } else {
        setReminders(items);
      }
    });
    return () => unsubscribe();
  }, []);

  const handleToggleReminder = async (reminder: AdminReminder) => {
    if (!reminder.id) return;
    try {
      await updateDoc(doc(db, 'adminReminders', reminder.id), {
        completed: !reminder.completed
      });
      showToast(reminder.completed ? 'Lembrete reaberto!' : 'Lembrete concluído!', 'success');
    } catch (err) {
      showToast('Erro ao atualizar lembrete', 'error');
    }
  };

  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newReminderText.trim()) return;
    try {
      await addDoc(collection(db, 'adminReminders'), {
        category: newReminderCategory,
        text: newReminderText.trim(),
        completed: false,
        createdAt: new Date().toISOString()
      });
      setNewReminderText('');
      setIsAddingReminder(false);
      showToast('Lembrete adicionado!', 'success');
    } catch (err) {
      showToast('Erro ao adicionar lembrete', 'error');
    }
  };

  const handleDeleteReminder = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'adminReminders', id));
      showToast('Lembrete removido!', 'success');
    } catch (err) {
      showToast('Erro ao remover lembrete', 'error');
    }
  };

  const quickStats = [
    { label: 'Total Idosos', value: (elderly || []).length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Eventos/Mes', value: (events || []).length, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Voluntários', value: (volunteers || []).length, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Profissionais', value: (caregivers || []).length + (volunteers || []).length + (adminUsers || []).filter(u => u.id !== 'system').length, icon: Settings, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const quickActions = [
    { title: 'Gestão de Idosos', desc: 'Acesso rápido ao cadastro e prontuários.', tab: 'elderly', icon: Users, color: 'bg-blue-600' },
    { title: 'Fluxo de Caixa', desc: 'Lançamentos financeiros e balanços.', tab: 'financial', icon: DollarSign, color: 'bg-green-600' },
    { title: 'Escala e Cronograma', desc: 'Organização de turnos e atividades.', tab: 'schedule', icon: Calendar, color: 'bg-purple-600' },
    { title: 'Relatórios Mensais', desc: 'Emissão e conferência de dados.', tab: 'reports', icon: FileText, color: 'bg-orange-600' },
    { title: 'Gestão de Funcionários', desc: 'Controle de cuidadores e serviços.', tab: 'staff', icon: Briefcase, color: 'bg-teal-600' },
    { title: 'Suporte a Presidência', desc: 'Gestão de documentos e minutas.', tab: 'presidency_support', icon: ClipboardList, color: 'bg-amber-600' },
    { title: 'Apoio Institucional', desc: 'Contatos e ofícios externos.', tab: 'institutional_support', icon: Briefcase, color: 'bg-indigo-600' },
  ];

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
            Área <span className="text-green-600">Admin. Auxiliar</span>
          </h2>
          <p className="text-gray-500 font-medium">Suporte estratégico à Presidência e Coordenação.</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 rounded-xl text-xs font-bold border border-green-100 dark:border-green-800 flex items-center gap-2">
            <TrendingUp size={14} /> Atividade Normal
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {quickStats.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center mb-4", stat.bg, stat.color)}>
              <stat.icon size={20} />
            </div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stat.label}</p>
            <h4 className="text-2xl font-black text-gray-900 dark:text-white mt-1">{stat.value}</h4>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Quick Access Area */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <Plus size={20} className="text-green-600" /> Ações Rápidas
            </h3>
          </div>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {quickActions.map((action, i) => (
              <button
                key={action.title}
                onClick={() => onNavigate(action.tab)}
                className="group p-6 bg-white dark:bg-gray-900 rounded-3xl border border-gray-100 dark:border-gray-800 hover:border-green-500 dark:hover:border-green-600 hover:shadow-xl hover:shadow-green-500/5 transition-all text-left"
              >
                <div className={cn("inline-flex p-3 rounded-2xl text-white mb-4 group-hover:scale-110 transition-transform", action.color)}>
                  <action.icon size={24} />
                </div>
                <h4 className="font-black text-gray-900 dark:text-white mb-1">{action.title}</h4>
                <p className="text-sm text-gray-500">{action.desc}</p>
              </button>
            ))}
          </div>

          <div className="bg-gradient-to-br from-green-600 to-green-700 p-8 rounded-[2.5rem] text-white overflow-hidden relative group">
            <div className="absolute right-0 top-0 p-12 opacity-10 group-hover:scale-110 transition-transform">
              <TrendingUp size={120} />
            </div>
            <div className="relative">
              <h3 className="text-2xl font-black mb-2">Monitoramento de Fluxo</h3>
              <p className="text-green-50 font-medium max-w-sm mb-6">
                Acompanhe em tempo real a saúde financeira e operacional de todos os setores integrados.
              </p>
              <button 
                onClick={() => onNavigate('dashboard')}
                className="bg-white text-green-700 px-6 py-3 rounded-xl font-black text-sm flex items-center gap-2 hover:bg-green-50 transition-colors shadow-lg"
              >
                Ver Dashboard Completo <ArrowRight size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Alerts / Tasks */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
              <AlertCircle size={20} className="text-amber-500" /> Lembretes do RH/Admin
            </h3>
            
            <button
              onClick={() => setIsAddingReminder(!isAddingReminder)}
              className="p-1.5 bg-green-50 dark:bg-green-950/40 text-green-700 dark:text-green-400 rounded-lg hover:bg-green-100 transition-colors flex items-center justify-center"
              title="Adicionar Lembrete"
            >
              {isAddingReminder ? <X size={16} /> : <Plus size={16} />}
            </button>
          </div>

          <AnimatePresence mode="popLayout">
            {isAddingReminder && (
              <motion.form
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                onSubmit={handleAddReminder}
                className="p-4 bg-gray-50 dark:bg-gray-800/60 border border-gray-150 dark:border-gray-700 rounded-2xl space-y-3 shadow-inner"
              >
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Categoria</label>
                  <select
                    value={newReminderCategory}
                    onChange={(e) => setNewReminderCategory(e.target.value)}
                    className="w-full text-xs font-bold p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-lg text-gray-700 dark:text-gray-300"
                  >
                    <option value="Financeiro">Financeiro</option>
                    <option value="Profissionais">Profissionais</option>
                    <option value="Institucional">Institucional</option>
                    <option value="RH/Controle">RH/Controle</option>
                    <option value="Estoque">Estoque</option>
                    <option value="Secretaria">Secretaria</option>
                    <option value="Geral">Geral</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase mb-1">Lembrete</label>
                  <textarea
                    rows={2}
                    value={newReminderText}
                    onChange={(e) => setNewReminderText(e.target.value)}
                    placeholder="Digite o lembrete..."
                    className="w-full text-xs font-medium p-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-850 rounded-lg text-gray-700 dark:text-gray-300 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-green-500"
                  />
                </div>
                <div className="flex justify-end gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsAddingReminder(false)}
                    className="px-2.5 py-1 text-[10px] font-black text-gray-500 hover:text-gray-700 uppercase"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-3 py-1 bg-green-600 hover:bg-green-700 text-white text-[10px] font-black rounded-lg uppercase transition-colors"
                  >
                    Salvar
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
          
          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {reminders.map((reminder) => {
              const colors = (() => {
                switch (reminder.category) {
                  case 'Financeiro': return { bg: 'bg-amber-50/50 dark:bg-amber-950/10', border: 'border-amber-100/40 dark:border-amber-900/20', text: 'text-amber-800 dark:text-amber-400' };
                  case 'Profissionais': return { bg: 'bg-blue-50/50 dark:bg-blue-950/10', border: 'border-blue-100/40 dark:border-blue-900/20', text: 'text-blue-800 dark:text-blue-400' };
                  case 'Institucional': return { bg: 'bg-purple-50/50 dark:bg-purple-950/10', border: 'border-purple-100/40 dark:border-purple-900/20', text: 'text-purple-800 dark:text-purple-400' };
                  case 'RH/Controle': return { bg: 'bg-emerald-50/50 dark:bg-emerald-950/10', border: 'border-emerald-100/40 dark:border-emerald-900/20', text: 'text-emerald-800 dark:text-emerald-400' };
                  case 'Estoque': return { bg: 'bg-orange-50/50 dark:bg-orange-950/10', border: 'border-orange-100/40 dark:border-orange-900/20', text: 'text-orange-800 dark:text-orange-400' };
                  case 'Secretaria': return { bg: 'bg-teal-50/50 dark:bg-teal-950/10', border: 'border-teal-100/40 dark:border-teal-900/20', text: 'text-teal-800 dark:text-teal-400' };
                  default: return { bg: 'bg-gray-50/50 dark:bg-gray-900/10', border: 'border-gray-150/40 dark:border-gray-850/20', text: 'text-gray-700 dark:text-gray-400' };
                }
              })();

              return (
                <div
                  key={reminder.id}
                  className={cn(
                    "p-4 border rounded-2xl transition-all relative group flex items-start gap-3",
                    colors.bg,
                    colors.border,
                    reminder.completed && "opacity-60 bg-gray-50/20 dark:bg-gray-900/5"
                  )}
                >
                  <button
                    onClick={() => handleToggleReminder(reminder)}
                    className="mt-0.5 text-gray-400 hover:text-green-600 dark:text-gray-600 dark:hover:text-green-400 transition-colors shrink-0"
                  >
                    {reminder.completed ? (
                      <CheckCircle2 size={16} className="text-green-600 dark:text-green-400" />
                    ) : (
                      <Circle size={16} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className={cn("text-[9px] font-black uppercase tracking-wider mb-1", colors.text)}>
                      {reminder.category}
                    </p>
                    <p className={cn(
                      "text-xs text-gray-700 dark:text-gray-300 font-medium leading-relaxed",
                      reminder.completed && "line-through text-gray-400 dark:text-gray-500"
                    )}>
                      {reminder.text}
                    </p>
                  </div>

                  {reminder.id && (
                    <button
                      onClick={() => handleDeleteReminder(reminder.id!)}
                      className="opacity-0 group-hover:opacity-100 p-1 hover:bg-red-50 dark:hover:bg-red-950/20 text-gray-400 hover:text-red-600 rounded-lg transition-all shrink-0"
                      title="Excluir"
                    >
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              );
            })}

            {reminders.length === 0 && (
              <p className="text-xs text-gray-400 italic text-center py-6">Nenhum lembrete cadastrado.</p>
            )}
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={() => onNavigate('settings')}
              className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors group"
            >
              <div className="flex items-center gap-3">
                <Settings className="text-gray-400 group-hover:rotate-45 transition-transform" />
                <span className="font-bold text-gray-700 dark:text-gray-300">Configurações Gerais</span>
              </div>
              <ArrowRight size={18} className="text-gray-300" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
