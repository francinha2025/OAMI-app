import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserCircle, 
  Calendar, 
  FileText, 
  TrendingUp, 
  Settings, 
  LogOut, 
  Heart, 
  Stethoscope, 
  Brain, 
  BookOpen, 
  Activity, 
  Shield, 
  Image as ImageIcon,
  DollarSign,
  Info,
  ChevronRight,
  Plus,
  Search,
  Bell,
  Menu,
  X,
  CheckCircle2,
  Clock,
  AlertCircle,
  FileDown,
  Trash2,
  Edit2,
  Sparkles,
  Package,
  Upload,
  Camera,
  MessageSquare,
  Gift
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  addMonths, 
  subMonths,
  parseISO,
  isToday,
  addDays,
  getYear,
  getMonth
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  Cell,
  PieChart,
  Pie
} from 'recharts';
import { cn } from './lib/utils';
import { Role, User, Elderly, EvolutionRecord, FinancialRecord, PIA, Donor, DiaperDonation, DiaperStock, DiaperProductionLog, FinancialDocument, CalendarEvent } from './types';
import { MOCK_USERS, ROLE_LABELS } from './constants';
import { GoogleGenAI } from "@google/genai";
import { db, auth } from './firebase';
import { 
  collection, 
  onSnapshot, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  query, 
  orderBy, 
  setDoc,
  getDoc,
  getDocs
} from 'firebase/firestore';
import { 
  signInWithPopup,
  onAuthStateChanged,
  signOut
} from 'firebase/auth';
import { googleProvider } from './firebase';

// --- Error Handling ---
enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  // In a real app, we might show a toast or notification here
}

// --- AI Assistant Component ---

const AIAssistant = ({ user }: { user: User }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string }[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: input,
        config: {
          systemInstruction: `Você é um assistente de IA especializado para a OAMI (Instituição de Longa Permanência para Idosos em Vitória do Mearim). 
          Você ajuda profissionais como Assistentes Sociais, Psicólogos, Enfermeiros, etc. 
          Você auxilia na elaboração de relatórios, tira dúvidas sobre legislação (Estatuto do Idoso, SUAS), e fornece orientações técnicas.
          O usuário atual é ${user.name} com o cargo de ${ROLE_LABELS[user.role]}.
          Seja profissional, empático e preciso.`,
        },
      });

      const aiMsg = { role: 'ai' as const, content: response.text || "Desculpe, não consegui processar sua solicitação." };
      setMessages(prev => [...prev, aiMsg]);
    } catch (error) {
      console.error("AI Error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "Ocorreu um erro ao consultar a IA. Verifique sua conexão ou tente novamente mais tarde." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-green-700 transition-all z-50 group"
      >
        <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
        <span className="absolute right-full mr-4 bg-white text-green-800 px-3 py-1 rounded-lg text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
          Assistente OAMI IA
        </span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-24 right-6 w-96 h-[500px] bg-white rounded-3xl shadow-2xl border border-green-100 flex flex-col z-50 overflow-hidden"
          >
            <div className="p-4 bg-green-600 text-white flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Sparkles size={18} />
                <h3 className="font-bold">Assistente OAMI IA</h3>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-green-700 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} />
                  </div>
                  <p className="text-sm text-gray-500 font-medium px-4">
                    Olá, {user.name}! Como posso ajudar você hoje com seus relatórios ou dúvidas técnicas?
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                  <div className={cn(
                    "max-w-[80%] p-3 rounded-2xl text-sm",
                    msg.role === 'user' 
                      ? "bg-green-600 text-white rounded-tr-none shadow-md" 
                      : "bg-white text-gray-800 border border-green-100 rounded-tl-none shadow-sm"
                  )}>
                    {msg.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none border border-green-100 shadow-sm flex gap-1">
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1 }} className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                    <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-1.5 h-1.5 bg-green-400 rounded-full" />
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-green-50 bg-white">
              <div className="flex gap-2">
                <input 
                  type="text" 
                  placeholder="Digite sua dúvida ou peça um relatório..."
                  className="flex-1 p-2 bg-gray-50 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                />
                <button 
                  onClick={handleSend}
                  disabled={loading}
                  className="p-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors disabled:opacity-50"
                >
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// --- Mock Data ---
const MOCK_ELDERLY: Elderly[] = [
  { id: '1', name: 'Maria Silva', birthDate: '1940-05-15', entryDate: '2022-01-10', status: 'ATIVO' },
  { id: '2', name: 'João Pereira', birthDate: '1935-08-22', entryDate: '2021-11-05', status: 'ATIVO' },
  { id: '3', name: 'Francisca Oliveira', birthDate: '1942-12-01', entryDate: '2023-03-15', status: 'ATIVO' },
  { id: '4', name: 'Antônio Santos', birthDate: '1938-02-28', entryDate: '2020-06-20', status: 'ATIVO' },
];

const MOCK_EVOLUTIONS: EvolutionRecord[] = [
  { id: '1', elderlyId: '1', professionalId: '3', professionalRole: 'ASSISTENTE_SOCIAL', date: '2024-03-20', content: 'Realizada visita domiciliar para acompanhamento familiar. Vínculo fortalecido.', type: 'VISITA_DOMICILIAR' },
  { id: '2', elderlyId: '1', professionalId: '4', professionalRole: 'PSICOLOGA', date: '2024-03-21', content: 'Sessão individual focada em luto e adaptação. Paciente receptiva.', type: 'INDIVIDUAL' },
  { id: '3', elderlyId: '2', professionalId: '6', professionalRole: 'ENFERMEIRA', date: '2024-03-22', content: 'Curativo realizado em membro inferior direito. Sem sinais de infecção.', type: 'INDIVIDUAL' },
];

const MOCK_FINANCIAL: FinancialRecord[] = [
  { id: '1', date: '2024-03-01', description: 'Doação Pessoa Física', amount: 1500, type: 'RECEITA', category: 'DOACAO' },
  { id: '2', date: '2024-03-05', description: 'Compra de Medicamentos', amount: 850, type: 'DESPESA', category: 'SAUDE' },
  { id: '3', date: '2024-03-10', description: 'Manutenção Predial', amount: 1200, type: 'DESPESA', category: 'MANUTENCAO' },
];

// --- Components ---

const ConfirmationModal = ({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title, 
  message 
}: { 
  isOpen: boolean; 
  onClose: () => void; 
  onConfirm: () => void; 
  title: string; 
  message: string;
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center gap-4 text-red-600">
          <div className="p-3 bg-red-100 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <p className="text-gray-600 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 text-gray-600 font-bold rounded-xl hover:bg-gray-200 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 transition-all"
          >
            Confirmar Exclusão
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Logo = ({ className }: { className?: string }) => (
  <svg 
    viewBox="0 0 400 400" 
    className={cn("w-full h-full object-contain", className)} 
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      {/* Main 3D Body Gradient */}
      <radialGradient id="heartBody4D" cx="40%" cy="35%" r="70%" fx="30%" fy="30%">
        <stop offset="0%" stopColor="#39FF14" /> {/* Neon Green */}
        <stop offset="60%" stopColor="#00D100" />
        <stop offset="100%" stopColor="#006400" /> {/* Dark Green Rim */}
      </radialGradient>
      
      {/* Top Glossy Highlight */}
      <linearGradient id="topGloss" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stopColor="white" stopOpacity="0.8" />
        <stop offset="100%" stopColor="white" stopOpacity="0" />
      </linearGradient>

      {/* Drop Shadow Filter */}
      <filter id="dropShadow4D" x="-20%" y="-20%" width="150%" height="150%">
        <feGaussianBlur in="SourceAlpha" stdDeviation="8" />
        <feOffset dx="12" dy="12" result="offsetblur" />
        <feComponentTransfer>
          <feFuncA type="linear" slope="0.4" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    {/* Tilted Group to match the image */}
    <g transform="rotate(-12 200 200)" filter="url(#dropShadow4D)">
      {/* Base Heart Shape with Bevel Effect - More rounded top */}
      <path 
        d="M200 370 C120 330 20 240 20 130 C20 30 110 10 160 10 C195 10 200 75 200 75 C200 75 205 10 240 10 C290 10 380 30 380 130 C380 240 280 330 200 370 Z" 
        fill="url(#heartBody4D)"
      />

      {/* Primary Glossy Highlight (Top Left) - Adjusted for new shape */}
      <path 
        d="M145 35 C100 35 60 70 60 120 C60 135 70 145 85 145 C100 145 110 135 110 120 C110 90 125 70 145 70 C160 70 170 60 170 45 C170 35 160 35 145 35 Z" 
        fill="url(#topGloss)"
      />

      {/* Secondary Soft Highlight (Right Side) */}
      <ellipse 
        cx="280" cy="120" rx="40" ry="25" 
        fill="white" fillOpacity="0.15" 
        transform="rotate(20 280 120)"
      />

      {/* Bottom Edge Reflection */}
      <path 
        d="M100 280 C130 310 170 335 200 345 C230 335 270 310 300 280" 
        fill="none" 
        stroke="white" 
        strokeWidth="4" 
        strokeLinecap="round" 
        strokeOpacity="0.2"
      />

      {/* Inner Depth Shadow */}
      <path 
        d="M200 90 C200 90 210 50 240 50 C280 50 340 80 340 130 C340 200 280 270 200 320" 
        fill="none" 
        stroke="black" 
        strokeWidth="10" 
        strokeOpacity="0.1" 
        strokeLinecap="round"
      />
    </g>
  </svg>
);

const Login = ({ onGoogleLogin, onCompleteProfile, needsProfile }: { 
  onGoogleLogin: () => void, 
  onCompleteProfile: (role: Role) => void,
  needsProfile: boolean 
}) => {
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [error, setError] = useState('');

  if (needsProfile) {
    return (
      <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-green-100"
        >
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-xl font-bold text-green-800">Complete seu Perfil</h2>
            <p className="text-gray-500 text-sm text-center mt-2">Selecione seu cargo para acessar o sistema.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Área Profissional</label>
              <select 
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value as Role)}
              >
                <option value="">Selecione sua área...</option>
                {Object.entries(ROLE_LABELS).map(([role, label]) => (
                  <option key={role} value={role}>{label}</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => selectedRole && onCompleteProfile(selectedRole as Role)}
              disabled={!selectedRole}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg shadow-md transition-colors disabled:opacity-50"
            >
              Finalizar Cadastro
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-green-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md border border-green-100"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-24 h-24 bg-white rounded-full flex items-center justify-center mb-4 shadow-lg p-2 border border-green-100">
            <Logo />
          </div>
          <h1 className="text-2xl font-bold text-green-800">OAMI - Vitória do Mearim</h1>
          <p className="text-green-600 text-sm">Sistema de Gestão ILPI</p>
        </div>

        <div className="space-y-6">
          <p className="text-center text-gray-600 text-sm">Acesse o sistema utilizando sua conta institucional ou pessoal vinculada.</p>
          
          <button 
            onClick={onGoogleLogin}
            className="w-full bg-white hover:bg-gray-50 text-gray-700 font-bold py-3 px-4 rounded-lg border border-gray-300 shadow-sm transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-2 text-gray-400">Acesso Restrito</span></div>
          </div>

          <p className="text-[10px] text-center text-gray-400">
            Ao entrar, você concorda com os termos de uso e privacidade da instituição.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

const Sidebar = ({ user, activeTab, setActiveTab, onLogout, onOpenProfile }: { 
  user: User, 
  activeTab: string, 
  setActiveTab: (tab: string) => void,
  onLogout: () => void,
  onOpenProfile: () => void
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'elderly', label: 'Idosos', icon: Users, roles: ['ANY'] },
    { id: 'professional', label: 'Área Profissional', icon: UserCircle, roles: ['ASSISTENTE_SOCIAL', 'PSICOLOGA', 'PEDAGOGA', 'ENFERMEIRA', 'FISIOTERAPEUTA', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, roles: ['PRESIDENTE'] },
    { id: 'institutional', label: 'Institucional', icon: Info, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'schedule', label: 'Cronograma', icon: Calendar, roles: ['ANY'] },
    { id: 'volunteers', label: 'Voluntários/Estagiários', icon: BookOpen, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PROJETISTA'] },
    { id: 'family', label: 'Acompanhamento Familiar', icon: Users, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PSICOLOGA', 'PROJETISTA'] },
    { id: 'donors', label: 'Doadores e Sócios', icon: Heart, roles: ['PRESIDENTE'] },
    { id: 'diaperDonations', label: 'Doação de Fraldas', icon: Gift, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PRESIDENTE', 'PROJETISTA'] },
    { id: 'diaperFactory', label: 'Fábrica de Fraldas', icon: Package, roles: ['FABRICANTE_FRALDAS', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'workshops', label: 'Oficinas e Capacitações', icon: BookOpen, roles: ['ANY'] },
    { id: 'monitoring', label: 'Monitoramento e Avaliação', icon: Activity, roles: ['COORDENADORA', 'PROJETISTA'] },
    { id: 'gallery', label: 'Galeria de Fotos', icon: ImageIcon, roles: ['ANY'] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.includes('ANY') || item.roles.includes(user.role)
  );

  return (
    <div className="w-64 bg-white border-r border-green-100 flex flex-col h-screen sticky top-0">
      <div className="p-6 border-b border-green-50">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm p-1 border border-green-100">
            <Logo />
          </div>
          <div>
            <h2 className="font-bold text-green-800 leading-tight">OAMI</h2>
            <p className="text-xs text-green-600">Vitória do Mearim</p>
          </div>
        </div>
        <button 
          onClick={onOpenProfile}
          className="w-full bg-green-50 p-3 rounded-lg hover:bg-green-100 transition-colors text-left group"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg overflow-hidden bg-green-200 flex-shrink-0">
              {user.photoUrl ? (
                <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-green-700 font-bold text-xs">
                  {user.name.charAt(0)}
                </div>
              )}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-green-800 truncate group-hover:text-green-900">{user.name}</p>
              <p className="text-[10px] text-green-600 uppercase tracking-wider truncate">{ROLE_LABELS[user.role]}</p>
            </div>
          </div>
        </button>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {filteredItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
              activeTab === item.id 
                ? "bg-green-600 text-white shadow-md shadow-green-200" 
                : "text-gray-600 hover:bg-green-50 hover:text-green-700"
            )}
          >
            <item.icon size={18} />
            {item.label}
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-green-50">
        <button 
          onClick={onLogout}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 hover:bg-red-50 transition-all"
        >
          <LogOut size={18} />
          Sair do Sistema
        </button>
      </div>
    </div>
  );
};

const DashboardSection = ({ elderly, evolutions, user, events }: { elderly: Elderly[], evolutions: EvolutionRecord[], user: User, events: CalendarEvent[] }) => {
  const data = [
    { name: 'Jan', atendimentos: 45, saude: 30 },
    { name: 'Fev', atendimentos: 52, saude: 35 },
    { name: 'Mar', atendimentos: 48, saude: 40 },
    { name: 'Abr', atendimentos: 61, saude: 38 },
  ];

  const stats = [
    { label: 'Total de Idosos', value: elderly.length.toString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Evoluções/Mês', value: evolutions.length.toString(), icon: Activity, color: 'bg-green-500' },
    { label: 'Voluntários Ativos', value: '12', icon: Heart, color: 'bg-red-500' },
  ];

  if (user.role === 'PRESIDENTE') {
    stats.push({ label: 'Saldo Mensal', value: 'R$ 4.250', icon: DollarSign, color: 'bg-yellow-500' });
  }

  const upcomingEvents = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Combine with holidays
    const holidays = BRAZIL_HOLIDAYS
      .filter(h => parseISO(h.date) >= today)
      .map(h => ({ ...h, type: 'FERIADO' as const, id: h.date }));

    return [...events, ...holidays]
      .filter(ev => parseISO(ev.date) >= today)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 4);
  }, [events]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center gap-4"
          >
            <div className={cn("p-3 rounded-xl text-white shadow-lg", stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={20} />
            Evolução de Atendimentos
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
                />
                <Line type="monotone" dataKey="atendimentos" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="saude" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Calendar className="text-green-600" size={20} />
            Próximos Eventos
          </h3>
          <div className="space-y-4">
            {upcomingEvents.length > 0 ? upcomingEvents.map((ev, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 transition-colors border border-transparent hover:border-gray-100">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-green-50 rounded-xl text-green-700">
                  <span className="text-[10px] font-bold uppercase">{format(parseISO(ev.date), 'MMM', { locale: ptBR })}</span>
                  <span className="text-lg font-bold leading-none">{format(parseISO(ev.date), 'dd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800 text-sm truncate">{ev.title}</h4>
                  <p className="text-[10px] text-gray-400 font-bold uppercase">{ev.type}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Sem eventos próximos</p>
              </div>
            )}
          </div>
          <button className="w-full mt-6 py-2 text-xs font-bold text-green-600 hover:bg-green-50 rounded-xl transition-colors">
            Ver Cronograma Completo
          </button>
        </div>
      </div>
    </div>
  );
};

const ElderlySection = ({ elderly }: { elderly: Elderly[] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElderly, setSelectedElderly] = useState<Elderly | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'EVOLUCAO' | 'PIA'; id: string } | null>(null);

  const filtered = elderly.filter(e => e.name.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <ConfirmationModal 
        isOpen={deleteConfirm?.isOpen || false}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => {
          // Logic to delete
          console.log(`Deleting ${deleteConfirm?.type} with id ${deleteConfirm?.id}`);
        }}
        title={deleteConfirm?.type === 'PIA' ? 'Excluir PIA' : 'Excluir Evolução'}
        message={deleteConfirm?.type === 'PIA' 
          ? 'Tem certeza que deseja excluir este Plano Individual de Atendimento? Esta ação não pode ser desfeita.' 
          : 'Tem certeza que deseja excluir este registro de evolução profissional?'}
      />
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800">Acompanhamento de Idosos</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <input 
              type="text"
              placeholder="Buscar idoso..."
              className="pl-10 pr-4 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-green-500 outline-none w-full md:w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all" title="Exportar Lista em PDF">
              <FileDown size={18} />
              PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all" title="Exportar Lista em DOC">
              <FileDown size={18} />
              DOC
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.map((elderly) => (
          <motion.div 
            key={elderly.id}
            layoutId={elderly.id}
            onClick={() => setSelectedElderly(elderly)}
            className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center text-green-600 font-bold text-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                {elderly.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-gray-800">{elderly.name}</h4>
                <p className="text-sm text-gray-500">Entrada: {new Date(elderly.entryDate).toLocaleDateString('pt-BR')}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full uppercase">
                  {elderly.status}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {selectedElderly && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setSelectedElderly(null)}
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-green-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {selectedElderly.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800">{selectedElderly.name}</h2>
                      <p className="text-gray-500">Nascimento: {new Date(selectedElderly.birthDate).toLocaleDateString('pt-BR')}</p>
                      <div className="flex gap-2 mt-3">
                        <span className="px-3 py-1 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">PIA ATIVO</span>
                        <span className="px-3 py-1 bg-green-100 text-green-700 text-xs font-bold rounded-full">ESTÁVEL</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedElderly(null)} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
                    <X size={24} className="text-gray-400" />
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <section>
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <FileText className="text-green-600" size={20} />
                        Plano Individual de Atendimento (PIA)
                      </h3>
                      <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Situação Financeira</p>
                            <div className="flex flex-wrap gap-2">
                              <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded">BPC ATIVO</span>
                              <span className="px-2 py-1 bg-blue-100 text-blue-700 text-[10px] font-bold rounded">APOSENTADO</span>
                              <span className="px-2 py-1 bg-red-100 text-red-700 text-[10px] font-bold rounded">EMPRÉSTIMO</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Vínculo Familiar</p>
                            <span className="px-2 py-1 bg-purple-100 text-purple-700 text-[10px] font-bold rounded uppercase">MÉDIO ENVOLVIMENTO</span>
                          </div>
                        </div>
                        <div className="space-y-4">
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Objetivos</p>
                            <p className="text-gray-700">Promover a autonomia nas atividades de vida diária e fortalecer vínculos familiares através de visitas mensais.</p>
                          </div>
                          <div>
                            <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Ações Estratégicas</p>
                            <ul className="list-disc list-inside text-gray-700 space-y-1">
                              <li>Fisioterapia motora 2x por semana</li>
                              <li>Acompanhamento psicológico quinzenal</li>
                              <li>Oficina de memória às quartas-feiras</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-600" size={20} />
                        Evolução Profissional Recente
                      </h3>
                      <div className="space-y-4">
                        {MOCK_EVOLUTIONS.filter(ev => ev.elderlyId === selectedElderly.id).map(ev => (
                          <div key={ev.id} className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm group">
                            <div className="flex justify-between items-center mb-2">
                              <span className="text-xs font-bold text-green-600 uppercase">{ROLE_LABELS[ev.professionalRole]}</span>
                              <div className="flex items-center gap-3">
                                <span className="text-xs text-gray-400">{new Date(ev.date).toLocaleDateString('pt-BR')}</span>
                                <button 
                                  onClick={() => setDeleteConfirm({ isOpen: true, type: 'EVOLUCAO', id: ev.id })}
                                  className="p-1 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                            <p className="text-sm text-gray-700">{ev.content}</p>
                          </div>
                        ))}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-green-50 p-6 rounded-2xl border border-green-100">
                      <h4 className="font-bold text-green-800 mb-4">Informações de Saúde</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Tipo Sanguíneo</span>
                          <span className="font-bold text-green-800">O+</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Alergias</span>
                          <span className="font-bold text-red-600">Dipirona</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600">Medicação</span>
                          <span className="font-bold text-green-800">Contínua (3)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 p-6 rounded-2xl border border-blue-100">
                      <h4 className="font-bold text-blue-800 mb-4">Contatos de Emergência</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-blue-600">Filho: Carlos Silva</p>
                          <p className="text-sm font-bold text-blue-800">(98) 98877-6655</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600">Filha: Ana Silva</p>
                          <p className="text-sm font-bold text-blue-800">(98) 99911-2233</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const PIAForm = ({ user, elderly }: { user: User, elderly: Elderly[] }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <ConfirmationModal 
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        onConfirm={() => {
          // Logic to delete PIA
          console.log('Deleting PIA');
        }}
        title="Excluir PIA"
        message="Tem certeza que deseja excluir este Plano Individual de Atendimento? Esta ação não pode ser desfeita e removerá todos os dados socioeconômicos e de saúde registrados para este período."
      />
      <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800">Novo Plano Individual de Atendimento (PIA)</h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
              <FileDown size={18} />
              Exportar PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
              <FileDown size={18} />
              Exportar DOC
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700">Idoso Selecionado</label>
            <select className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500">
              <option>Selecione o Idoso...</option>
              {elderly.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700">Data do Plano</label>
            <input type="date" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
          </div>
        </div>

        {/* Situação Financeira */}
        <section className="space-y-6 pt-6 border-t border-gray-50">
          <h4 className="font-bold text-green-800 flex items-center gap-2">
            <DollarSign size={18} />
            Situação Socioeconômica e Financeira
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input type="checkbox" className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
              <span className="text-sm font-medium text-gray-700">Possui BPC?</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input type="checkbox" className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
              <span className="text-sm font-medium text-gray-700">Possui Aposentadoria?</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl border border-gray-100">
              <input type="checkbox" className="w-5 h-5 text-green-600 rounded focus:ring-green-500" />
              <span className="text-sm font-medium text-gray-700">Possui Imóvel Próprio?</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Renda Mensal (R$)</label>
              <input type="number" placeholder="0,00" className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600">Possui Empréstimos? Detalhe:</label>
              <input type="text" placeholder="Ex: Consignado, 24 parcelas..." className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
        </section>

        {/* Acompanhamento Familiar */}
        <section className="space-y-6 pt-6 border-t border-gray-50">
          <h4 className="font-bold text-blue-800 flex items-center gap-2">
            <Users size={18} />
            Acompanhamento Familiar
          </h4>
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-600">Nível de Envolvimento da Família</label>
            <div className="flex gap-4">
              {['ALTO', 'MÉDIO', 'BAIXO', 'NENHUM'].map(level => (
                <label key={level} className="flex-1 flex items-center justify-center p-3 border border-gray-200 rounded-xl cursor-pointer hover:bg-blue-50 hover:border-blue-200 transition-all">
                  <input type="radio" name="family" className="hidden" />
                  <span className="text-xs font-bold text-gray-600">{level}</span>
                </label>
              ))}
            </div>
            <textarea 
              placeholder="Observações sobre a dinâmica familiar e visitas..."
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-24"
            />
          </div>
        </section>

        {/* Saúde e Bem-estar */}
        <section className="space-y-6 pt-6 border-t border-gray-50">
          <h4 className="font-bold text-red-800 flex items-center gap-2">
            <Activity size={18} />
            Saúde e Bem-estar
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <textarea 
              placeholder="Estado Geral de Saúde..."
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 h-24"
            />
            <textarea 
              placeholder="Medicações em uso e dosagens..."
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500 h-24"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600">Mobilidade e Autonomia</label>
            <input type="text" placeholder="Ex: Deambula com auxílio de andador..." className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-red-500" />
          </div>
        </section>

        {/* Objetivos e Ações */}
        <section className="space-y-6 pt-6 border-t border-gray-50">
          <h4 className="font-bold text-gray-800 flex items-center gap-2">
            <FileText size={18} />
            Plano de Ação e Objetivos
          </h4>
          <div className="space-y-4">
            <textarea 
              placeholder="Objetivos do atendimento para o próximo trimestre..."
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24"
            />
            <textarea 
              placeholder="Ações estratégicas a serem desenvolvidas pela equipe..."
              className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24"
            />
          </div>
        </section>

        <div className="pt-8 flex gap-4">
          <button className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1">
            Salvar Plano Individual de Atendimento (PIA)
          </button>
          <button 
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-6 bg-red-50 text-red-600 font-bold py-4 rounded-2xl border border-red-100 hover:bg-red-100 transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </div>
    </div>
  );
};

const ProfessionalArea = ({ elderly, evolutions, user }: { elderly: Elderly[], evolutions: EvolutionRecord[], user: User }) => {
  const [activeSubTab, setActiveSubTab] = useState<'evolucao' | 'pia' | 'visitas'>('evolucao');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string } | null>(null);

  const filteredEvolutions = evolutions.filter(ev => ev.professionalRole === user.role);

  return (
    <div className="space-y-8">
      <ConfirmationModal 
        isOpen={deleteConfirm?.isOpen || false}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await deleteDoc(doc(db, 'evolutions', deleteConfirm.id));
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `evolutions/${deleteConfirm.id}`);
            }
          }
        }}
        title="Excluir Registro de Evolução"
        message="Tem certeza que deseja excluir este registro de evolução técnica? Esta ação não pode ser desfeita."
      />
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-600 rounded-2xl text-white shadow-lg">
              <UserCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800">Área da {ROLE_LABELS[user.role]}</h2>
              <p className="text-gray-500">Registro de atividades e acompanhamento técnico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button className="p-3 bg-gray-50 text-gray-400 hover:text-green-600 rounded-xl transition-all" title="Exportar Relatório Mensal">
              <FileDown size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 border-b border-gray-100 mb-8">
          {[
            { id: 'evolucao', label: 'Evolução Profissional', icon: Activity },
            { id: 'pia', label: 'Gestão de PIA', icon: FileText },
            { id: 'visitas', label: 'Visitas/Atendimentos', icon: Calendar },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveSubTab(tab.id as any)}
              className={cn(
                "pb-4 px-2 text-sm font-bold transition-all flex items-center gap-2",
                activeSubTab === tab.id 
                  ? "text-green-600 border-b-2 border-green-600" 
                  : "text-gray-400 hover:text-gray-600"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeSubTab === 'pia' ? (
          <PIAForm user={user} elderly={elderly} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800">Novo Registro de Evolução</h3>
                  <div className="flex gap-2">
                    <button className="text-xs font-bold text-green-600 hover:underline flex items-center gap-1">
                      <FileDown size={14} />
                      Modelo DOC
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <select className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500">
                    <option>Selecione o Idoso...</option>
                    {elderly.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <div className="flex gap-4">
                    <select className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500">
                      <option>Tipo de Atendimento</option>
                      <option>Individual</option>
                      <option>Grupo</option>
                      <option>Visita Domiciliar</option>
                    </select>
                    <input type="date" className="flex-1 p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500" />
                  </div>
                  <textarea 
                    placeholder="Descreva a evolução técnica..."
                    className="w-full p-4 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-32"
                  />
                  <button className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-colors">
                    Salvar Registro
                  </button>
                </div>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h3 className="font-bold text-gray-800 mb-6">Registros Recentes</h3>
                <div className="space-y-4">
                  {filteredEvolutions.map(ev => (
                    <div key={ev.id} className="p-4 bg-gray-50 rounded-xl border border-gray-100 group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-gray-400 uppercase">
                            {elderly.find(e => e.id === ev.elderlyId)?.name || 'Desconhecido'}
                          </p>
                          <p className="text-[10px] text-gray-400">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button 
                          onClick={() => setDeleteConfirm({ isOpen: true, id: ev.id })}
                          className="p-1.5 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">{ev.content}</p>
                    </div>
                  ))}
                  {filteredEvolutions.length === 0 && (
                    <p className="text-center text-gray-400 italic py-8">Nenhum registro encontrado no banco de dados.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800 flex items-center gap-2">
                    <Bell className="text-orange-500" size={18} />
                    Pendências de Revisão
                  </h4>
                  <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-bold rounded-full">
                    3 Pendentes
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { name: 'Maria Silva', task: 'Revisão PIA Trimestral', due: 'Atrasado (2 dias)', status: 'OVERDUE' },
                    { name: 'João Pereira', task: 'Relatório de Visita', due: 'Hoje', status: 'TODAY' },
                    { name: 'Francisca Oliveira', task: 'Evolução Semanal', due: 'Amanhã', status: 'UPCOMING' },
                  ].map((p, i) => (
                    <div 
                      key={i} 
                      className={cn(
                        "p-3 rounded-xl border transition-all hover:shadow-sm",
                        p.status === 'OVERDUE' ? "bg-red-50 border-red-100" : 
                        p.status === 'TODAY' ? "bg-orange-50 border-orange-100" : 
                        "bg-blue-50 border-blue-100"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn(
                          "text-xs font-bold",
                          p.status === 'OVERDUE' ? "text-red-800" : 
                          p.status === 'TODAY' ? "text-orange-800" : 
                          "text-blue-800"
                        )}>{p.name}</p>
                        {p.status === 'OVERDUE' && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                      </div>
                      <p className={cn(
                        "text-xs",
                        p.status === 'OVERDUE' ? "text-red-600" : 
                        p.status === 'TODAY' ? "text-orange-600" : 
                        "text-blue-600"
                      )}>{p.task}</p>
                      <div className="flex items-center gap-1 mt-2">
                        <Clock size={10} className={p.status === 'OVERDUE' ? "text-red-400" : "text-gray-400"} />
                        <p className={cn(
                          "text-[10px] font-bold",
                          p.status === 'OVERDUE' ? "text-red-500" : 
                          p.status === 'TODAY' ? "text-orange-500" : 
                          "text-blue-500"
                        )}>{p.due}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-2 text-xs font-bold text-gray-500 hover:text-gray-700 transition-colors border-t border-gray-50 pt-4">
                  Ver todas as pendências
                </button>
              </div>

              <div className="bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
                <h4 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" size={18} />
                  Metas do Mês
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Atendimentos Individuais</span>
                      <span className="font-bold text-green-600">12/15</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full w-[80%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500">Visitas Domiciliares</span>
                      <span className="font-bold text-blue-600">4/5</span>
                    </div>
                    <div className="w-full bg-gray-100 h-2 rounded-full overflow-hidden">
                      <div className="bg-blue-500 h-full w-[80%]" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const FinancialSection = ({ financialRecords }: { financialRecords?: any[] }) => {
  const records = financialRecords || [];
  const chartData = [
    { month: 'Nov', receitas: 12500, despesas: 10200 },
    { month: 'Dez', receitas: 14800, despesas: 11500 },
    { month: 'Jan', receitas: 13200, despesas: 10800 },
    { month: 'Fev', receitas: 15100, despesas: 12100 },
    { month: 'Mar', receitas: 15420, despesas: 11170 },
    { month: 'Abr', receitas: 16000, despesas: 11800 },
  ];

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={24} />
            Fluxo de Caixa - Últimos 6 Meses
          </h3>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
              <FileDown size={18} />
              Relatório PDF
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
              <FileDown size={18} />
              Relatório DOC
            </button>
          </div>
        </div>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f9fafb' }} contentStyle={{ borderRadius: '12px', border: 'none' }} />
              <Bar dataKey="receitas" name="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} />
              <Bar dataKey="despesas" name="Despesas" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800">Gestão Financeira</h2>
            <div className="flex gap-2">
              <button className="flex items-center gap-2 bg-gray-100 text-gray-600 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
                <FileDown size={18} />
                Exportar PDF
              </button>
              <button className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors">
                <Plus size={18} />
                Novo Lançamento
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100">
                  <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Data</th>
                  <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Descrição</th>
                  <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider">Categoria</th>
                  <th className="pb-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {records.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 text-sm text-gray-600">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-4 text-sm font-medium text-gray-800">{item.description}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-[10px] font-bold rounded-full uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className={cn(
                      "py-4 text-sm font-bold text-right",
                      item.type === 'RECEITA' ? "text-green-600" : "text-red-600"
                    )}>
                      {item.type === 'RECEITA' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 italic">Nenhum registro financeiro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Camera size={20} className="text-green-600" />
              Digitalização de Documentos
            </h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer group">
                <Upload className="mx-auto text-gray-400 group-hover:text-green-600 mb-2" size={32} />
                <p className="text-sm text-gray-500">Clique ou arraste Notas Fiscais e Fotos de Documentos</p>
                <p className="text-[10px] text-gray-400 mt-1">Formatos aceitos: JPG, PNG, PDF (Máx 10MB)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <ImageIcon size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">NF_00123.jpg</p>
                    <p className="text-[10px] text-gray-400">2.4 MB</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                    <ImageIcon size={18} className="text-gray-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 truncate">RECIBO_ALUGUEL.png</p>
                    <p className="text-[10px] text-gray-400">1.1 MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-6">Resumo do Mês</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 text-green-600 rounded-xl">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Receitas</p>
                  <p className="text-xl font-bold text-green-600">R$ 15.420</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 text-red-600 rounded-xl">
                  <TrendingUp size={20} className="rotate-180" />
                </div>
                <div>
                  <p className="text-xs text-gray-500">Despesas</p>
                  <p className="text-xl font-bold text-red-600">R$ 11.170</p>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-100">
                <p className="text-xs text-gray-500 mb-1">Saldo Projetado</p>
                <p className="text-3xl font-bold text-gray-800">R$ 4.250</p>
              </div>
            </div>
          </div>

          <div className="bg-green-600 p-8 rounded-3xl shadow-lg text-white">
            <h3 className="font-bold mb-4">Prestação de Contas</h3>
            <p className="text-sm text-green-100 mb-6">Gere relatórios automáticos para transparência institucional.</p>
            <button className="w-full bg-white text-green-600 font-bold py-3 rounded-xl shadow-md hover:bg-green-50 transition-colors">
              Exportar PDF
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DonorsSection = ({ donors }: { donors: Donor[] }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'DOADOR' as 'DOADOR' | 'SOCIO_MENSAL',
    amount: 0,
    status: 'ATIVO' as 'ATIVO' | 'INATIVO',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'donors'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({
        name: '',
        email: '',
        phone: '',
        type: 'DOADOR',
        amount: 0,
        status: 'ATIVO',
        startDate: new Date().toISOString().split('T')[0]
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'donors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Cadastro de Doadores e Sócios</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Novo Cadastro
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Doador/Sócio</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="p-8 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail</label>
                    <input 
                      type="email" 
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Telefone</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tipo</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="DOADOR">Doador Eventual</option>
                      <option value="SOCIO_MENSAL">Sócio Mensal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Valor (R$)</label>
                    <input 
                      type="number" 
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Cadastrar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Nome</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Tipo</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Contato</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Valor Mensal</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {donors.map((donor) => (
              <tr key={donor.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4">
                  <p className="text-sm font-bold text-gray-800">{donor.name}</p>
                  <p className="text-xs text-gray-400">Desde {new Date(donor.startDate).toLocaleDateString('pt-BR')}</p>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    donor.type === 'SOCIO_MENSAL' ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
                  )}>
                    {donor.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador'}
                  </span>
                </td>
                <td className="p-4">
                  <p className="text-xs text-gray-600">{donor.email}</p>
                  <p className="text-xs text-gray-600">{donor.phone}</p>
                </td>
                <td className="p-4 text-right">
                  <p className="text-sm font-bold text-gray-800">{donor.amount ? `R$ ${donor.amount}` : '-'}</p>
                </td>
                <td className="p-4 text-center">
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-[10px] font-bold rounded-full">
                    {donor.status}
                  </span>
                </td>
              </tr>
            ))}
            {donors.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 italic">Nenhum doador cadastrado no banco de dados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DiaperDonationSection = ({ donations, stock, user }: { donations: DiaperDonation[], stock: DiaperStock | null, user: User }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    beneficiaryName: '',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    observations: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beneficiaryName || formData.quantity <= 0) return;
    
    setLoading(true);
    try {
      // 1. Add donation record
      await addDoc(collection(db, 'diaperDonations'), {
        ...formData,
        size: 'TAMANHO_UNICO',
        registeredBy: user.name,
        createdAt: new Date().toISOString()
      });

      // 2. Update stock
      const currentQty = stock?.quantity || 0;
      await setDoc(doc(db, 'diaperStock', 'current'), {
        quantity: Math.max(0, currentQty - formData.quantity),
        lastUpdate: new Date().toISOString(),
        updatedBy: user.name
      }, { merge: true });

      setIsModalOpen(false);
      setFormData({
        beneficiaryName: '',
        quantity: 0,
        date: new Date().toISOString().split('T')[0],
        observations: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'diaperDonations');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Doação de Fraldas para a Comunidade</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
        >
          <Plus size={18} />
          Registrar Doação
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Registrar Doação</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="p-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome do Beneficiário</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Quantidade (un)</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Data</label>
                    <input 
                      type="date" 
                      required
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Observações</label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Confirmar'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex items-center justify-between max-w-md">
        <div>
          <p className="text-xs font-bold text-gray-400 uppercase">Estoque Total (Tamanho Único)</p>
          <p className="text-3xl font-bold text-gray-800">{stock?.quantity || 0} <span className="text-sm font-normal text-gray-400">unidades</span></p>
        </div>
        <div className="p-4 bg-blue-50 text-blue-600 rounded-2xl">
          <Package size={32} />
        </div>
      </div>

      <div className="bg-white rounded-3xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b border-gray-50">
          <h3 className="font-bold text-gray-800">Histórico de Doações</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 border-b border-gray-100">
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Beneficiário</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Data</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase text-right">Quantidade</th>
              <th className="p-4 text-xs font-bold text-gray-400 uppercase">Registrado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {donations.map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="p-4 text-sm font-bold text-gray-800">{d.beneficiaryName}</td>
                <td className="p-4 text-sm text-gray-600">{new Date(d.date).toLocaleDateString('pt-BR')}</td>
                <td className="p-4 text-sm font-bold text-right">{d.quantity} un</td>
                <td className="p-4 text-xs text-gray-500">{d.registeredBy}</td>
              </tr>
            ))}
            {donations.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500 italic">Nenhuma doação registrada.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const DiaperFactorySection = ({ stock, logs, user }: { stock: DiaperStock | null, logs: DiaperProductionLog[], user: User }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'PRODUCTION' | 'STOCK_OUT'>('PRODUCTION');
  const [quantity, setQuantity] = useState(0);
  const [observations, setObservations] = useState('');
  const [loading, setLoading] = useState(false);
  const [editingLog, setEditingLog] = useState<DiaperProductionLog | null>(null);
  const [deletingLog, setDeletingLog] = useState<DiaperProductionLog | null>(null);

  const currentStock = stock || { id: 'current', quantity: 0, lastUpdate: new Date().toISOString(), updatedBy: 'Sistema' };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;

    setLoading(true);
    try {
      const currentQty = currentStock.quantity;
      let newQty = currentQty;

      if (editingLog) {
        const oldEffect = editingLog.type === 'PRODUCTION' ? editingLog.quantity : -editingLog.quantity;
        const baseQty = currentQty - oldEffect;
        const newEffect = modalType === 'PRODUCTION' ? quantity : -quantity;
        newQty = baseQty + newEffect;

        await updateDoc(doc(db, 'diaperProductionLogs', editingLog.id), {
          quantity,
          type: modalType,
          observations,
          date: new Date().toISOString()
        });
      } else {
        const effect = modalType === 'PRODUCTION' ? quantity : -quantity;
        newQty = currentQty + effect;

        await addDoc(collection(db, 'diaperProductionLogs'), {
          quantity,
          type: modalType,
          observations,
          registeredBy: user.name,
          date: new Date().toISOString()
        });
      }

      await setDoc(doc(db, 'diaperStock', 'current'), {
        quantity: Math.max(0, newQty),
        lastUpdate: new Date().toISOString(),
        updatedBy: user.name
      }, { merge: true });

      setIsModalOpen(false);
      setQuantity(0);
      setObservations('');
      setEditingLog(null);
    } catch (err) {
      handleFirestoreError(err, editingLog ? OperationType.UPDATE : OperationType.CREATE, 'diaperProductionLogs');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (log: DiaperProductionLog) => {
    setEditingLog(log);
    setQuantity(log.quantity);
    setModalType(log.type);
    setObservations(log.observations || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (log: DiaperProductionLog) => {
    setLoading(true);
    try {
      const effect = log.type === 'PRODUCTION' ? log.quantity : -log.quantity;
      const newQty = currentStock.quantity - effect;

      await deleteDoc(doc(db, 'diaperProductionLogs', log.id));
      await setDoc(doc(db, 'diaperStock', 'current'), {
        quantity: Math.max(0, newQty),
        lastUpdate: new Date().toISOString(),
        updatedBy: user.name
      }, { merge: true });
      setDeletingLog(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, 'diaperProductionLogs');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Fábrica de Fraldas - Controle de Produção</h2>
        <div className="flex gap-2">
          <button 
            onClick={() => { setEditingLog(null); setModalType('PRODUCTION'); setQuantity(0); setObservations(''); setIsModalOpen(true); }}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Registrar Produção
          </button>
          <button 
            onClick={() => { setEditingLog(null); setModalType('STOCK_OUT'); setQuantity(0); setObservations(''); setIsModalOpen(true); }}
            className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-red-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} className="rotate-45" />
            Saída de Estoque
          </button>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
            <div className={cn(
              "p-6 text-white flex justify-between items-center",
              modalType === 'PRODUCTION' ? "bg-blue-600" : "bg-red-600"
            )}>
              <h3 className="text-xl font-bold">
                {editingLog ? 'Editar Registro' : (modalType === 'PRODUCTION' ? 'Registrar Produção' : 'Saída de Estoque')}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Quantidade (unidades)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Ex: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Observações</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                  placeholder="Opcional..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className={cn(
                    "flex-1 px-4 py-3 rounded-xl font-bold text-white shadow-lg transition-all disabled:opacity-50",
                    modalType === 'PRODUCTION' ? "bg-blue-600 hover:bg-blue-700" : "bg-red-600 hover:bg-red-700"
                  )}
                >
                  {loading ? 'Salvando...' : 'Confirmar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deletingLog && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800">Confirmar Exclusão</h3>
              <p className="text-gray-500">Tem certeza que deseja excluir este registro? O estoque será ajustado automaticamente.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingLog(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 font-bold text-gray-600 hover:bg-gray-50 transition-all"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDelete(deletingLog)}
                disabled={loading}
                className="flex-1 px-4 py-3 rounded-xl bg-red-600 font-bold text-white shadow-lg hover:bg-red-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Excluindo...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center font-bold text-xl">
              TU
            </div>
            <span className="text-[10px] font-bold text-gray-400 uppercase">Estoque Atual (Tamanho Único)</span>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800">{currentStock.quantity} <span className="text-sm font-normal text-gray-400">unidades</span></p>
            <p className="text-[10px] text-gray-400 mt-2 italic">Última atualização: {new Date(currentStock.lastUpdate).toLocaleDateString('pt-BR')} por {currentStock.updatedBy}</p>
          </div>
          <div className="w-full bg-gray-100 h-3 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${Math.min((currentStock.quantity / 2000) * 100, 100)}%` }} />
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 flex flex-col justify-center">
          <h4 className="font-bold text-gray-800 mb-2">Destinação da Produção</h4>
          <p className="text-sm text-gray-500 mb-4">As fraldas produzidas atendem tanto aos idosos institucionalizados quanto às doações para a comunidade.</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-100 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[100%]" />
            </div>
            <span className="text-sm font-bold text-blue-600">100% Ativo</span>
          </div>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-6">Histórico de Movimentação</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100">
                <th className="pb-4">Data</th>
                <th className="pb-4">Tipo</th>
                <th className="pb-4">Qtd</th>
                <th className="pb-4">Responsável</th>
                <th className="pb-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {logs.map((log) => (
                <tr key={log.id} className="text-sm text-gray-600 hover:bg-gray-50 transition-colors">
                  <td className="py-4 font-medium">
                    {new Date(log.date).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="py-4">
                    <span className={cn(
                      "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                      log.type === 'PRODUCTION' ? "bg-blue-100 text-blue-600" : "bg-red-100 text-red-600"
                    )}>
                      {log.type === 'PRODUCTION' ? 'Produção' : 'Saída'}
                    </span>
                  </td>
                  <td className="py-4 font-bold">{log.quantity} un</td>
                  <td className="py-4 text-xs">{log.registeredBy}</td>
                  <td className="py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => handleEdit(log)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={16} />
                      </button>
                      <button 
                        onClick={() => setDeletingLog(log)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400 italic">
                    Nenhum registro encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <h3 className="font-bold text-gray-800 mb-6">Relatório de Produção Semanal</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={[
              { day: 'Seg', prod: logs.filter(l => l.type === 'PRODUCTION' && new Date(l.date).getDay() === 1).reduce((acc, curr) => acc + curr.quantity, 0) || 120 },
              { day: 'Ter', prod: logs.filter(l => l.type === 'PRODUCTION' && new Date(l.date).getDay() === 2).reduce((acc, curr) => acc + curr.quantity, 0) || 150 },
              { day: 'Qua', prod: logs.filter(l => l.type === 'PRODUCTION' && new Date(l.date).getDay() === 3).reduce((acc, curr) => acc + curr.quantity, 0) || 100 },
              { day: 'Qui', prod: logs.filter(l => l.type === 'PRODUCTION' && new Date(l.date).getDay() === 4).reduce((acc, curr) => acc + curr.quantity, 0) || 180 },
              { day: 'Sex', prod: logs.filter(l => l.type === 'PRODUCTION' && new Date(l.date).getDay() === 5).reduce((acc, curr) => acc + curr.quantity, 0) || 140 },
            ]}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
              <XAxis dataKey="day" axisLine={false} tickLine={false} />
              <YAxis axisLine={false} tickLine={false} />
              <Tooltip cursor={{ fill: '#f9fafb' }} />
              <Bar dataKey="prod" name="Produção (un)" fill="#3b82f6" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

const InstitutionalSection = () => {
  return (
    <div className="max-w-4xl mx-auto space-y-12">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-green-800">OAMI</h2>
        <p className="text-green-600 font-medium">Instituição de Longa Permanência para Idosos</p>
        <div className="w-24 h-1 bg-green-600 mx-auto rounded-full" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Missão', content: 'Proporcionar acolhimento humanizado e digno aos idosos de Vitória do Mearim.', icon: Heart, color: 'text-red-500' },
          { title: 'Visão', content: 'Ser referência regional em cuidados gerontológicos e inclusão social.', icon: TrendingUp, color: 'text-blue-500' },
          { title: 'Valores', content: 'Respeito, Ética, Transparência, Afeto e Profissionalismo.', icon: Shield, color: 'text-green-500' },
        ].map((item, i) => (
          <div key={i} className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100 text-center space-y-4">
            <div className={cn("mx-auto p-4 rounded-2xl bg-gray-50 w-fit", item.color)}>
              <item.icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800">{item.title}</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{item.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-white p-10 rounded-3xl shadow-sm border border-gray-100 space-y-6">
        <h3 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
          <Info className="text-green-600" />
          Nossa História
        </h3>
        <div className="prose prose-green max-w-none text-gray-600 leading-relaxed">
          <p>
            Fundada com o propósito de suprir a carência de espaços adequados para o cuidado da pessoa idosa em Vitória do Mearim, a OAMI nasceu da união de esforços da comunidade e profissionais comprometidos com a causa gerontológica.
          </p>
          <p>
            Ao longo dos anos, evoluímos de um pequeno abrigo para uma instituição estruturada, contando hoje com uma equipe multidisciplinar completa que atende às necessidades físicas, emocionais e sociais de nossos residentes.
          </p>
        </div>
      </div>
    </div>
  );
};

const VolunteersSection = () => {
  const volunteers = [
    { id: '1', name: 'Ana Souza', type: 'VOLUNTARIO', startDate: '2024-01-15', activities: 'Oficina de Artesanato' },
    { id: '2', name: 'Pedro Lima', type: 'ESTAGIARIO', startDate: '2024-02-01', activities: 'Auxílio Fisioterapia' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Voluntários e Estagiários</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors">
          Novo Cadastro
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {volunteers.map((v) => (
          <div key={v.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className={cn("p-3 rounded-xl text-white", v.type === 'VOLUNTARIO' ? 'bg-blue-500' : 'bg-purple-500')}>
              <BookOpen size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800">{v.name}</h4>
                <span className="text-[10px] font-bold px-2 py-1 bg-gray-100 rounded-full uppercase text-gray-500">{v.type}</span>
              </div>
              <p className="text-sm text-gray-500 mt-1">Início: {new Date(v.startDate).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm text-gray-700 mt-3 font-medium">Atividades: {v.activities}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const FamilySection = () => {
  const engagements = [
    { id: '1', elderly: 'Maria Silva', date: '2024-03-18', type: 'VISITA', summary: 'Filho Carlos trouxe itens de higiene e passou a tarde.' },
    { id: '2', elderly: 'João Pereira', date: '2024-03-19', type: 'CONTATO_TELEFONICO', summary: 'Filha Ana ligou para saber sobre a saúde do pai.' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Acompanhamento Familiar</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors">
          Registrar Contato
        </button>
      </div>

      <div className="space-y-4">
        {engagements.map((e) => (
          <div key={e.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-start gap-4">
            <div className="p-3 bg-green-50 text-green-600 rounded-xl">
              <Users size={24} />
            </div>
            <div className="flex-1">
              <div className="flex justify-between items-start">
                <h4 className="font-bold text-gray-800">{e.elderly}</h4>
                <span className="text-[10px] font-bold px-2 py-1 bg-green-100 text-green-700 rounded-full uppercase">{e.type}</span>
              </div>
              <p className="text-xs text-gray-400 mt-1">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
              <p className="text-sm text-gray-700 mt-3">{e.summary}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const BRAZIL_HOLIDAYS = [
  { date: '2026-01-01', title: 'Confraternização Universal' },
  { date: '2026-02-17', title: 'Carnaval' },
  { date: '2026-04-03', title: 'Sexta-feira Santa' },
  { date: '2026-04-21', title: 'Tiradentes' },
  { date: '2026-05-01', title: 'Dia do Trabalho' },
  { date: '2026-06-04', title: 'Corpus Christi' },
  { date: '2026-09-07', title: 'Independência do Brasil' },
  { date: '2026-10-12', title: 'Nossa Senhora Aparecida' },
  { date: '2026-11-02', title: 'Finados' },
  { date: '2026-11-15', title: 'Proclamação da República' },
  { date: '2026-12-25', title: 'Natal' },
];

const ScheduleSection = ({ events, user }: { events: CalendarEvent[], user: User }) => {
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<'MONTH' | 'YEAR'>('MONTH');
  
  const [formData, setFormData] = useState({
    title: '',
    type: 'COMPROMISSO' as CalendarEvent['type'],
    description: '',
    time: '',
    location: ''
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({
    start: startDate,
    end: endDate,
  });

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'calendarEvents'), {
        ...formData,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdBy: user.name,
        createdAt: new Date().toISOString()
      });
      setIsModalOpen(false);
      setFormData({
        title: '',
        type: 'COMPROMISSO',
        description: '',
        time: '',
        location: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'calendarEvents');
    } finally {
      setLoading(false);
    }
  };

  const getEventsForDate = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd');
    const dayEvents = events.filter(ev => ev.date === dateStr);
    const holiday = BRAZIL_HOLIDAYS.find(h => h.date === dateStr);
    
    return {
      events: dayEvents,
      holiday: holiday
    };
  };

  const renderMonth = (monthDate: Date) => {
    const mStart = startOfMonth(monthDate);
    const mEnd = endOfMonth(mStart);
    const sDate = startOfWeek(mStart);
    const eDate = endOfWeek(mEnd);
    const days = eachDayOfInterval({ start: sDate, end: eDate });

    return (
      <div className="grid grid-cols-7 gap-px bg-gray-200 border border-gray-200 rounded-xl overflow-hidden">
        {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
          <div key={d} className="bg-gray-50 p-2 text-center text-[10px] font-bold text-gray-400 uppercase">
            {d}
          </div>
        ))}
        {days.map((day, i) => {
          const { events: dayEvents, holiday } = getEventsForDate(day);
          const isCurrentMonth = isSameMonth(day, mStart);
          const isSelected = isSameDay(day, selectedDate);
          const isTodayDate = isToday(day);

          return (
            <div 
              key={i}
              onClick={() => {
                setSelectedDate(day);
                if (viewMode === 'YEAR') setViewMode('MONTH');
              }}
              className={`
                min-h-[80px] p-2 bg-white cursor-pointer transition-all hover:bg-green-50
                ${!isCurrentMonth ? 'opacity-30' : ''}
                ${isSelected ? 'ring-2 ring-green-500 ring-inset z-10' : ''}
              `}
            >
              <div className="flex justify-between items-start">
                <span className={`
                  text-sm font-bold 
                  ${isTodayDate ? 'bg-green-600 text-white w-6 h-6 flex items-center justify-center rounded-full' : 'text-gray-700'}
                `}>
                  {format(day, 'd')}
                </span>
                {holiday && <div className="w-2 h-2 bg-red-400 rounded-full" title={holiday.title} />}
              </div>
              <div className="mt-1 space-y-1">
                {dayEvents.slice(0, 2).map((ev, idx) => (
                  <div key={idx} className="text-[9px] p-1 bg-green-100 text-green-800 rounded truncate font-medium">
                    {ev.title}
                  </div>
                ))}
                {dayEvents.length > 2 && (
                  <div className="text-[9px] text-gray-400 font-bold">+{dayEvents.length - 2} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Cronograma e Calendário</h2>
          <p className="text-gray-500 text-sm">Gestão de compromissos e eventos institucionais</p>
        </div>
        <div className="flex gap-3">
          <div className="bg-white p-1 rounded-xl border border-gray-200 flex shadow-sm">
            <button 
              onClick={() => setViewMode('MONTH')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'MONTH' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Mensal
            </button>
            <button 
              onClick={() => setViewMode('YEAR')}
              className={`px-4 py-2 rounded-lg text-xs font-bold transition-all ${viewMode === 'YEAR' ? 'bg-green-600 text-white' : 'text-gray-500 hover:bg-gray-50'}`}
            >
              Anual
            </button>
          </div>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Evento
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-bold text-gray-800">
                {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
              </h3>
              <div className="flex gap-2">
                <button onClick={() => setCurrentMonth(subMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={20} className="rotate-180" />
                </button>
                <button onClick={() => setCurrentMonth(new Date())} className="px-3 py-1 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                  Hoje
                </button>
                <button onClick={() => setCurrentMonth(addMonths(currentMonth, 1))} className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <ChevronRight size={20} />
                </button>
              </div>
            </div>

            {viewMode === 'MONTH' ? (
              renderMonth(currentMonth)
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
                {Array.from({ length: 12 }).map((_, i) => {
                  const monthDate = new Date(getYear(currentMonth), i, 1);
                  return (
                    <div key={i} className="space-y-3">
                      <h4 className="text-sm font-bold text-gray-700 capitalize">
                        {format(monthDate, 'MMMM', { locale: ptBR })}
                      </h4>
                      <div className="scale-75 origin-top-left">
                        {renderMonth(monthDate)}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100">
            <h3 className="text-lg font-bold text-gray-800 mb-6 flex items-center gap-2">
              <Clock size={20} className="text-green-600" />
              Agenda para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            
            <div className="space-y-4">
              {getEventsForDate(selectedDate).holiday && (
                <div className="p-4 bg-red-50 border border-red-100 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center text-red-600">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-400 uppercase">Feriado</p>
                    <p className="font-bold text-red-800">{getEventsForDate(selectedDate).holiday?.title}</p>
                  </div>
                </div>
              )}

              {getEventsForDate(selectedDate).events.length > 0 ? (
                getEventsForDate(selectedDate).events.map((ev, i) => (
                  <div key={i} className="p-4 bg-gray-50 border border-gray-100 rounded-2xl hover:bg-green-50 hover:border-green-100 transition-all group">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 bg-white rounded-full uppercase text-gray-400 group-hover:text-green-600">
                        {ev.type}
                      </span>
                      {ev.time && <span className="text-xs font-bold text-gray-500">{ev.time}</span>}
                    </div>
                    <h4 className="font-bold text-gray-800">{ev.title}</h4>
                    {ev.description && <p className="text-xs text-gray-500 mt-1">{ev.description}</p>}
                    {ev.location && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400">
                        <Info size={12} />
                        {ev.location}
                      </div>
                    )}
                  </div>
                ))
              ) : !getEventsForDate(selectedDate).holiday && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
                    <Calendar size={32} />
                  </div>
                  <p className="text-gray-400 text-sm font-medium">Nenhum compromisso para este dia</p>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-green-600 text-xs font-bold hover:underline"
                  >
                    + Adicionar Evento
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-900 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
            <div className="relative z-10">
              <h3 className="font-bold mb-2">Próximos Feriados</h3>
              <div className="space-y-3 mt-4">
                {BRAZIL_HOLIDAYS
                  .filter(h => parseISO(h.date) >= new Date())
                  .slice(0, 3)
                  .map((h, i) => (
                    <div key={i} className="flex justify-between items-center text-sm">
                      <span className="opacity-70">{format(parseISO(h.date), "dd/MM")}</span>
                      <span className="font-medium">{h.title}</span>
                    </div>
                  ))}
              </div>
            </div>
            <Sparkles className="absolute -right-4 -bottom-4 text-white/10 w-24 h-24" />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Evento</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="p-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Título do Evento</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Tipo</label>
                    <select 
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="COMPROMISSO">Compromisso</option>
                      <option value="REUNIAO">Reunião</option>
                      <option value="OFICINA">Oficina</option>
                      <option value="ROTINA">Rotina</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Horário</label>
                    <input 
                      type="time" 
                      className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Local</label>
                  <input 
                    type="text" 
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Descrição</label>
                  <textarea 
                    className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Evento'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const GallerySection = () => {
  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Galeria de Fotos</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors">
          Upload de Fotos
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="aspect-square bg-gray-200 rounded-2xl overflow-hidden group relative cursor-pointer">
            <img 
              src={`https://picsum.photos/seed/oami-${i}/400/400`} 
              alt="Gallery" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
              <ImageIcon className="text-white" size={32} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const WorkshopsSection = () => {
  const workshops = [
    { id: '1', title: 'Capacitação em Primeiros Socorros', date: '2024-04-10', type: 'PROFISSIONAL', description: 'Treinamento obrigatório para toda a equipe técnica.' },
    { id: '2', title: 'Oficina de Musicoterapia', date: '2024-04-12', type: 'IDOSOS', description: 'Atividade lúdica para estímulo cognitivo dos residentes.' },
  ];

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Oficinas e Capacitações</h2>
        <button className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors">
          Agendar Atividade
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workshops.map((w) => (
          <div key={w.id} className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 space-y-4">
            <div className="flex justify-between items-start">
              <div className={cn("px-3 py-1 rounded-full text-[10px] font-bold uppercase", w.type === 'PROFISSIONAL' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700')}>
                {w.type}
              </div>
              <span className="text-xs text-gray-400">{new Date(w.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <h4 className="font-bold text-gray-800 text-lg">{w.title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{w.description}</p>
            <button className="text-green-600 text-sm font-bold hover:underline">Ver detalhes</button>
          </div>
        ))}
      </div>
    </div>
  );
};

const MonitoringSection = ({ elderly }: { elderly: Elderly[] }) => {
  const [selectedElderlyId, setSelectedElderlyId] = useState<string>('');

  const individualTrendData = [
    { month: 'Jan', saude: 75, atividades: 60, bemEstar: 80 },
    { month: 'Fev', saude: 80, atividades: 75, bemEstar: 85 },
    { month: 'Mar', saude: 78, atividades: 90, bemEstar: 82 },
    { month: 'Abr', saude: 85, atividades: 85, bemEstar: 90 },
  ];

  const selectedElderly = elderly.find(e => e.id === selectedElderlyId);

  return (
    <div className="space-y-8">
      <div className="bg-white p-8 rounded-3xl shadow-sm border border-gray-100">
        <div className="flex justify-between items-center mb-8">
          <h2 className="text-2xl font-bold text-gray-800">Monitoramento e Avaliação de Impacto</h2>
          <div className="flex gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-200 transition-all">
              <FileDown size={18} />
              Relatório PDF
            </button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {[
            { label: 'Qualidade do Atendimento', value: '94%', trend: '+2%' },
            { label: 'Adesão aos PIAs', value: '88%', trend: '+5%' },
            { label: 'Satisfação Familiar', value: '4.8/5', trend: 'Estável' },
          ].map((m, i) => (
            <div key={i} className="p-6 bg-gray-50 rounded-2xl border border-gray-100">
              <p className="text-xs font-bold text-gray-400 uppercase mb-2">{m.label}</p>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-gray-800">{m.value}</span>
                <span className="text-xs font-bold text-green-600">{m.trend}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Evolução Individual */}
        <div className="space-y-6 mb-12 pt-8 border-t border-gray-50">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <Activity className="text-blue-600" size={24} />
              Evolução Individual por Idoso
            </h3>
            <select 
              className="p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64"
              value={selectedElderlyId}
              onChange={(e) => setSelectedElderlyId(e.target.value)}
            >
              <option value="">Selecione um idoso...</option>
              {MOCK_ELDERLY.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>

          {selectedElderly ? (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="grid grid-cols-1 lg:grid-cols-2 gap-8"
            >
              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="font-bold text-gray-700 mb-6">Tendência de Saúde e Bem-estar - {selectedElderly.name}</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={individualTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip contentStyle={{ borderRadius: '12px', border: 'none' }} />
                      <Line type="monotone" dataKey="saude" name="Saúde" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4 }} />
                      <Line type="monotone" dataKey="bemEstar" name="Bem-estar" stroke="#10b981" strokeWidth={3} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h4 className="font-bold text-gray-700 mb-6">Participação em Atividades - {selectedElderly.name}</h4>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={individualTrendData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
                      <XAxis dataKey="month" axisLine={false} tickLine={false} />
                      <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                      <Tooltip cursor={{ fill: '#f3f4f6' }} />
                      <Bar dataKey="atividades" name="% Participação" fill="#6366f1" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.div>
          ) : (
            <div className="p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center text-gray-400">
              Selecione um idoso acima para visualizar os gráficos de evolução individual.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <h3 className="font-bold text-gray-800">Relatórios de Desempenho por Profissional</h3>
          <div className="space-y-4">
            {Object.entries(ROLE_LABELS).filter(([r]) => r !== 'PRESIDENTE' && r !== 'COORDENADORA' && r !== 'PROJETISTA').map(([role, label]) => (
              <div key={role} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-sm transition-all">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center text-green-600">
                    <UserCircle size={20} />
                  </div>
                  <span className="font-medium text-gray-700">{label}</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <p className="text-[10px] text-gray-400 uppercase font-bold">Evoluções</p>
                    <p className="text-sm font-bold text-gray-800">24/30</p>
                  </div>
                  <button className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors">
                    <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const ProfileModal = ({ user, onClose, onUpdate }: { user: User, onClose: () => void, onUpdate: (updatedUser: User) => void }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    photoUrl: user.photoUrl || '',
    registrationNumber: user.registrationNumber || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onUpdate({ ...user, ...formData });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
      >
        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-green-600 text-white">
          <h3 className="text-xl font-bold">Meu Perfil Profissional</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          <div className="flex flex-col items-center gap-4">
            <div className="relative group">
              <div className="w-24 h-24 rounded-2xl bg-gray-100 border-2 border-green-100 overflow-hidden flex items-center justify-center">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <UserCircle size={48} className="text-gray-300" />
                )}
              </div>
              <label className="absolute bottom-1 right-1 p-2 bg-green-600 text-white rounded-lg shadow-lg cursor-pointer hover:bg-green-700 transition-colors">
                <Camera size={16} />
                <input 
                  type="text" 
                  className="hidden" 
                  placeholder="URL da Foto"
                  onChange={(e) => {
                    const url = prompt('Insira a URL da sua foto de perfil:');
                    if (url) setFormData({ ...formData, photoUrl: url });
                  }}
                />
              </label>
            </div>
            <p className="text-xs text-gray-400">Clique no ícone para alterar a foto (URL)</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome Completo</label>
              <input 
                type="text" 
                required
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Registro Profissional (CRM, COREN, etc.)</label>
              <input 
                type="text" 
                placeholder="Ex: COREN-MA 123.456"
                className="w-full p-3 border border-gray-200 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                value={formData.registrationNumber}
                onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cargo/Função</label>
              <input 
                type="text" 
                disabled
                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-500 cursor-not-allowed"
                value={ROLE_LABELS[user.role]}
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-200 text-gray-600 font-bold rounded-xl hover:bg-gray-50 transition-all"
            >
              Cancelar
            </button>
            <button 
              type="submit"
              className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 hover:bg-green-700 transition-all"
            >
              Salvar Alterações
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);

  // Real-time data states
  const [elderly, setElderly] = useState<Elderly[]>([]);
  const [evolutions, setEvolutions] = useState<EvolutionRecord[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [diaperDonations, setDiaperDonations] = useState<DiaperDonation[]>([]);
  const [diaperStock, setDiaperStock] = useState<DiaperStock | null>(null);
  const [diaperProductionLogs, setDiaperProductionLogs] = useState<DiaperProductionLog[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'users', firebaseUser.uid);
        getDoc(userDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
            setNeedsProfile(false);
          } else {
            setNeedsProfile(true);
          }
        }).catch(err => {
          console.error("Error fetching user profile:", err);
          setNeedsProfile(true);
        });
      } else {
        setUser(null);
        setNeedsProfile(false);
      }
      setIsAuthReady(true);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!isAuthReady || !user) return;

    // Listen to Elderly
    const qElderly = query(collection(db, 'elderly'), orderBy('name'));
    const unsubElderly = onSnapshot(qElderly, (snapshot) => {
      setElderly(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Elderly)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'elderly'));

    // Listen to Evolutions
    const qEvolutions = query(collection(db, 'evolutions'), orderBy('date', 'desc'));
    const unsubEvolutions = onSnapshot(qEvolutions, (snapshot) => {
      setEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvolutionRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'evolutions'));

    // Listen to Donors
    const qDonors = query(collection(db, 'donors'), orderBy('name'));
    const unsubDonors = onSnapshot(qDonors, (snapshot) => {
      setDonors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'donors'));

    // Listen to Diaper Donations
    const qDiaperDonations = query(collection(db, 'diaperDonations'), orderBy('date', 'desc'));
    const unsubDiaperDonations = onSnapshot(qDiaperDonations, (snapshot) => {
      setDiaperDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperDonation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperDonations'));

    // Listen to Diaper Stock
    const unsubStock = onSnapshot(doc(db, 'diaperStock', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setDiaperStock({ id: docSnap.id, ...docSnap.data() } as DiaperStock);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'diaperStock/current'));

    // Listen to Diaper Production Logs
    const qProductionLogs = query(collection(db, 'diaperProductionLogs'), orderBy('date', 'desc'));
    const unsubProductionLogs = onSnapshot(qProductionLogs, (snapshot) => {
      setDiaperProductionLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperProductionLog)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperProductionLogs'));

    // Listen to Calendar Events
    const qEvents = query(collection(db, 'calendarEvents'), orderBy('date'));
    const unsubEvents = onSnapshot(qEvents, (snapshot) => {
      setCalendarEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'calendarEvents'));

    return () => {
      unsubElderly();
      unsubEvolutions();
      unsubDonors();
      unsubDiaperDonations();
      unsubStock();
      unsubProductionLogs();
      unsubEvents();
    };
  }, [isAuthReady, user]);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Google Login Error:", error);
    }
  };

  const handleCompleteProfile = async (role: Role) => {
    if (!auth.currentUser) return;
    
    const newUser: User = {
      id: auth.currentUser.uid,
      name: auth.currentUser.displayName || 'Usuário',
      role: role,
      photoUrl: auth.currentUser.photoURL || '',
    };

    try {
      await setDoc(doc(db, 'users', auth.currentUser.uid), {
        name: newUser.name,
        role: newUser.role,
        photoUrl: newUser.photoUrl,
        registrationNumber: ''
      }, { merge: true });
      
      setUser(newUser);
      setNeedsProfile(false);
    } catch (error) {
      console.error("Error saving profile:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUser(null);
      setActiveTab('dashboard');
    } catch (error) {
      console.error("Logout Error:", error);
    }
  };

  if (!isAuthReady) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-green-50">
        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-green-600">
          <Activity size={48} />
        </motion.div>
      </div>
    );
  }

  if (!user || needsProfile) {
    return (
      <Login 
        onGoogleLogin={handleGoogleLogin} 
        onCompleteProfile={handleCompleteProfile}
        needsProfile={needsProfile}
      />
    );
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <DashboardSection elderly={elderly} evolutions={evolutions} user={user} events={calendarEvents} />;
      case 'elderly': return <ElderlySection elderly={elderly} />;
      case 'professional': return <ProfessionalArea elderly={elderly} evolutions={evolutions} user={user} />;
      case 'financial': return <FinancialSection />;
      case 'institutional': return <InstitutionalSection />;
      case 'volunteers': return <VolunteersSection />;
      case 'family': return <FamilySection />;
      case 'schedule': return <ScheduleSection events={calendarEvents} user={user} />;
      case 'workshops': return <WorkshopsSection />;
      case 'monitoring': return <MonitoringSection elderly={elderly} />;
      case 'gallery': return <GallerySection />;
      case 'donors': return <DonorsSection donors={donors} />;
      case 'diaperDonations': return <DiaperDonationSection donations={diaperDonations} stock={diaperStock} user={user} />;
      case 'diaperFactory': return <DiaperFactorySection stock={diaperStock} logs={diaperProductionLogs} user={user} />;
      default: return (
        <div className="flex flex-col items-center justify-center h-[60vh] text-gray-400 space-y-4">
          <AlertCircle size={64} />
          <p className="text-xl font-medium">Área em Desenvolvimento</p>
          <p className="text-sm">Esta funcionalidade estará disponível em breve.</p>
        </div>
      );
    }
  };

  return (
    <div className="flex min-h-screen bg-gray-50 font-sans text-gray-900">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        onOpenProfile={() => setIsProfileOpen(true)}
      />
      
      <main className="flex-1 p-8 overflow-y-auto">
        <header className="flex justify-between items-center mb-12">
          <div>
            <h1 className="text-3xl font-bold text-gray-800 tracking-tight">
              {activeTab === 'dashboard' ? 'Visão Geral' : 
               activeTab === 'elderly' ? 'Gestão de Idosos' : 
               activeTab === 'professional' ? 'Área Técnica' : 
               activeTab === 'financial' ? 'Financeiro' : 
               activeTab === 'donors' ? 'Doadores e Sócios' :
               activeTab === 'diaperDonations' ? 'Doação de Fraldas' :
               activeTab === 'diaperFactory' ? 'Fábrica de Fraldas' : 'Institucional'}
            </h1>
            <p className="text-gray-500 mt-1">Bem-vindo ao sistema OAMI, {user.name.split(' ')[0]}.</p>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-3 bg-white rounded-2xl shadow-sm border border-gray-100 text-gray-400 hover:text-green-600 transition-colors relative">
              <Bell size={20} />
              <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white" />
            </button>
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 bg-white p-2 pr-4 rounded-2xl shadow-sm border border-gray-100 hover:border-green-200 transition-all group"
            >
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-green-600 font-bold overflow-hidden">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-gray-800 leading-none group-hover:text-green-600 transition-colors">{user.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-gray-400 uppercase">{ROLE_LABELS[user.role]}</p>
                  {user.registrationNumber && (
                    <p className="text-[10px] text-green-600 font-bold border-l border-gray-200 pl-2">{user.registrationNumber}</p>
                  )}
                </div>
              </div>
            </button>
          </div>
        </header>

        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            transition={{ duration: 0.2 }}
          >
            {renderContent()}
          </motion.div>
        </AnimatePresence>
      </main>

      <AIAssistant user={user} />

      {isProfileOpen && (
        <ProfileModal 
          user={user} 
          onClose={() => setIsProfileOpen(false)} 
          onUpdate={(updatedUser) => setUser(updatedUser)}
        />
      )}
    </div>
  );
}
