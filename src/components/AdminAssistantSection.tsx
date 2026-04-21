import React, { useState } from 'react';
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
  ClipboardList
} from 'lucide-react';
import { motion } from 'framer-motion';
import { cn } from '../lib/utils';
import { 
  Elderly, 
  FinancialRecord, 
  User, 
  CalendarEvent, 
  Volunteer,
  Caregiver
} from '../types';

interface AdminAssistantSectionProps {
  user: User;
  elderly: Elderly[];
  financialRecords: FinancialRecord[];
  events: CalendarEvent[];
  volunteers: Volunteer[];
  caregivers: Caregiver[];
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
  onNavigate,
  showToast
}) => {
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);

  const quickStats = [
    { label: 'Total Idosos', value: (elderly || []).length, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Eventos/Mes', value: (events || []).length, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Voluntários', value: (volunteers || []).length, icon: Briefcase, color: 'text-emerald-600', bg: 'bg-emerald-50' },
    { label: 'Profissionais', value: 12, icon: Settings, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  const quickActions = [
    { title: 'Gestão de Idosos', desc: 'Acesso rápido ao cadastro e prontuários.', tab: 'elderly', icon: Users, color: 'bg-blue-600' },
    { title: 'Fluxo de Caixa', desc: 'Lançamentos financeiros e balanços.', tab: 'financial', icon: DollarSign, color: 'bg-green-600' },
    { title: 'Escala e Cronograma', desc: 'Organização de turnos e atividades.', tab: 'schedule', icon: Calendar, color: 'bg-purple-600' },
    { title: 'Relatórios Mensais', desc: 'Emissão e conferência de dados.', tab: 'reports', icon: FileText, color: 'bg-orange-600' },
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
            key={i}
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
                key={i}
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
          <h3 className="text-lg font-black text-gray-900 dark:text-white flex items-center gap-2">
            <AlertCircle size={20} className="text-amber-500" /> Lembretes do RH/Admin
          </h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 rounded-2xl">
              <p className="text-xs font-bold text-amber-800 dark:text-amber-400 uppercase mb-2">Financeiro</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Revisar balancete mensal para prestação de contas da próxima semana.</p>
            </div>
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-2xl">
              <p className="text-xs font-bold text-blue-800 dark:text-blue-400 uppercase mb-2">Profissionais</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Conferir vencimento de registros de 3 estagiários de serviço social.</p>
            </div>
            <div className="p-4 bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800 rounded-2xl">
              <p className="text-xs font-bold text-purple-800 dark:text-purple-400 uppercase mb-2">Institucional</p>
              <p className="text-sm text-gray-700 dark:text-gray-300 font-medium">Atualizar galeria de fotos oficial para o site institucional.</p>
            </div>
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
