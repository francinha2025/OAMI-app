import React, { useState, useMemo } from 'react';
import { 
  LayoutDashboard, Users, Brain, ClipboardList, 
  Palette, Music, Gamepad2, BookOpen, Users2,
  AlertCircle, FileText, Settings, Plus, Search, 
  Filter, MoreVertical, ChevronRight, CheckCircle2, 
  Clock, Phone, User as UserIcon, Trash2, Edit2, 
  Download, Printer, X, Info, ArrowLeft,
  TrendingUp, UserCircle, LogOut, Moon, Sun,
  Smile, Meh, Frown, History, Lightbulb,
  Calendar, Target, Star, Share2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, LineChart as ReLineChart, Line,
  PieChart, Pie, Cell, AreaChart, Area
} from 'recharts';
import { format, isToday, parseISO, startOfToday, isSameDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { generateModernPDF } from '../lib/pdfUtils';
import { 
  PedagogyPatient, PedagogyInitialAssessment, PedagogyEvolution, 
  PedagogyActivity, PedagogyStimulationTracking, PedagogySocialParticipation, 
  PedagogyIndividualPlan, PedagogyLifeHistory,
  User as UserType 
} from '../types';
import { PhotoUpload } from './PhotoUpload';
import { DigitizeButton } from './DigitizeButton';
import { VoiceTranscriptionButton } from './VoiceTranscriptionButton';

interface PedagogySectionProps {
  user: UserType;
  patients: PedagogyPatient[];
  assessments: PedagogyInitialAssessment[];
  evolutions: PedagogyEvolution[];
  activities: PedagogyActivity[];
  stimulationTrackings: PedagogyStimulationTracking[];
  socialParticipations: PedagogySocialParticipation[];
  individualPlans: PedagogyIndividualPlan[];
  lifeHistories: PedagogyLifeHistory[];
  onSavePatient: (data: Partial<PedagogyPatient>) => Promise<void>;
  onSaveAssessment: (data: Partial<PedagogyInitialAssessment>) => Promise<void>;
  onSaveEvolution: (data: Partial<PedagogyEvolution>) => Promise<void>;
  onSaveActivity: (data: Partial<PedagogyActivity>) => Promise<void>;
  onSaveStimulation: (data: Partial<PedagogyStimulationTracking>) => Promise<void>;
  onSaveSocial: (data: Partial<PedagogySocialParticipation>) => Promise<void>;
  onSavePlan: (data: Partial<PedagogyIndividualPlan>) => Promise<void>;
  onSaveLifeHistory: (data: Partial<PedagogyLifeHistory>) => Promise<void>;
  onSavePhotos: (photos: string[], patientId: string, patientName: string, activityType: string, description?: string) => Promise<void>;
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
  onLogout: () => void;
}

type TabType = 'dashboard' | 'residents' | 'activities' | 'monitoring' | 'reports' | 'settings';

const NavButton: React.FC<{ active: boolean, onClick: () => void, icon: any, label: string }> = ({ active, onClick, icon: Icon, label }) => (
  <button
    onClick={onClick}
    className={cn(
      "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-sm font-black transition-all",
      active 
        ? "bg-green-600 text-white shadow-lg shadow-green-100 dark:shadow-none" 
        : "text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 dark:text-gray-400"
    )}
  >
    <Icon className="w-5 h-5" />
    {label}
  </button>
);

export const PedagogySection: React.FC<PedagogySectionProps> = ({
  user,
  patients,
  assessments,
  evolutions,
  activities,
  stimulationTrackings,
  socialParticipations,
  individualPlans,
  lifeHistories,
  onSavePatient,
  onSaveAssessment,
  onSaveEvolution,
  onSaveActivity,
  onSaveStimulation,
  onSaveSocial,
  onSavePlan,
  onSaveLifeHistory,
  onSavePhotos,
  theme,
  setTheme,
  onLogout
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [residentSubTab, setResidentSubTab] = useState<'profile' | 'history' | 'assessment' | 'plan'>('profile');
  const [searchTerm, setSearchTerm] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<string>('');
  const [selectedPatient, setSelectedPatient] = useState<PedagogyPatient | null>(null);
  const [formData, setFormData] = useState<any>({});

  const handleDigitize = (text: string) => {
    const type = modalType || activeTab;
    if (type === 'evolution') {
      setFormData((prev: any) => ({ ...prev, evolution: (prev.evolution || '') + '\n' + text }));
    } else if (type === 'activity' || type === 'activities') {
      setFormData((prev: any) => ({ ...prev, description: (prev.description || '') + '\n' + text }));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const type = modalType || activeTab;
      const { photos, ...data } = formData;
      switch (type) {
        case 'patient':
        case 'residents':
          await onSavePatient(data);
          break;
        case 'assessment':
          await onSaveAssessment({ ...data, date: new Date().toISOString() });
          break;
        case 'evolution':
          await onSaveEvolution({ ...data, date: new Date().toISOString() });
          break;
        case 'activity':
        case 'activities':
          await onSaveActivity({ ...data, date: new Date().toISOString() });
          break;
        case 'stimulation':
          await onSaveStimulation({ ...data, date: new Date().toISOString() });
          break;
        case 'social':
          await onSaveSocial({ ...data, date: new Date().toISOString() });
          break;
        case 'plan':
          await onSavePlan({ ...data, date: new Date().toISOString() });
          break;
        case 'history':
          await onSaveLifeHistory({ ...data, date: new Date().toISOString() });
          break;
      }

      if (photos && photos.length > 0 && formData.patientId) {
        const patient = patients.find(p => p.id === formData.patientId);
        const activityType = 
          type === 'evolution' ? 'Evolução Pedagógica' :
          type === 'activity' || type === 'activities' ? 'Atividade Pedagógica' : 'Atendimento Pedagógico';
        
        await onSavePhotos(photos, formData.patientId, patient?.name || 'Paciente', activityType, formData.evolution || formData.description);
      }

      setIsModalOpen(false);
      setModalType('');
      setFormData({});
    } catch (err) {
      console.error(err);
    }
  };

  const openModal = (type: string, initialData: any = {}) => {
    setModalType(type);
    setFormData(initialData);
    setIsModalOpen(true);
  };

  const renderModalContent = () => {
    const type = modalType || activeTab;
    switch (type) {
      case 'patient':
      case 'residents':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-black text-black mb-1">Nome Completo</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Idade</label>
                <input
                  required
                  type="number"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.age || ''}
                  onChange={(e) => setFormData({ ...formData, age: parseInt(e.target.value) })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Escolaridade</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.schooling || ''}
                  onChange={(e) => setFormData({ ...formData, schooling: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ANALFABETO">Analfabeto</option>
                  <option value="FUNDAMENTAL_INCOMPLETO">Fundamental Incompleto</option>
                  <option value="FUNDAMENTAL_COMPLETO">Fundamental Completo</option>
                  <option value="MEDIO_COMPLETO">Médio Completo</option>
                  <option value="SUPERIOR_COMPLETO">Superior Completo</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Profissão Anterior</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.previousProfession || ''}
                  onChange={(e) => setFormData({ ...formData, previousProfession: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Nível de Alfabetização</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.literacyLevel || ''}
                  onChange={(e) => setFormData({ ...formData, literacyLevel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALFABETIZADO">Alfabetizado</option>
                  <option value="ANALFABETO">Analfabeto</option>
                  <option value="FUNCIONAL">Alfabetizado Funcional</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Nível Cognitivo</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.cognitiveLevel || ''}
                  onChange={(e) => setFormData({ ...formData, cognitiveLevel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-black text-black mb-1">Interesses (separados por vírgula)</label>
                <input
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-bold"
                  value={formData.interestsStr || ''}
                  onChange={(e) => setFormData({ ...formData, interestsStr: e.target.value, interests: e.target.value.split(',').map(s => s.trim()) })}
                />
              </div>
              <div className="col-span-2">
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-black text-black">Limitações Cognitivas</label>
                  <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, cognitiveLimitations: (formData.cognitiveLimitations || '') + ' ' + t })} />
                </div>
                <textarea
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-bold h-20"
                  value={formData.cognitiveLimitations || ''}
                  onChange={(e) => setFormData({ ...formData, cognitiveLimitations: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Cadastro
            </button>
          </form>
        );
      case 'assessment':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-black dark:text-gray-100">
            <div>
              <label className="block text-sm font-black text-black mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {['memory', 'attention', 'language', 'comprehension', 'orientation', 'praxis', 'gnosis'].map((field) => (
                <div key={field}>
                  <label className="block text-sm font-black text-black mb-1 capitalize">
                    {field === 'praxis' ? 'Praxia' : field === 'gnosis' ? 'Gnosia' : field === 'comprehension' ? 'Compreensão' : field === 'orientation' ? 'Orientação' : field === 'memory' ? 'Memória' : field === 'attention' ? 'Atenção' : 'Linguagem'}
                  </label>
                  <select
                    required
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                    value={formData[field] || ''}
                    onChange={(e) => setFormData({ ...formData, [field]: e.target.value })}
                  >
                    <option value="">Selecione</option>
                    <option value="PRESERVADO">Preservado</option>
                    <option value="LEVE_COMPROMETIMENTO">Leve Comprometimento</option>
                    <option value="COMPROMETIDO">Comprometido</option>
                  </select>
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Observações</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Avaliação
            </button>
          </form>
        );
      case 'evolution':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-black dark:text-gray-100">
            <div>
              <label className="block text-sm font-black text-black mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-black text-black mb-1">Título da Atividade</label>
              <input
                required
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.activityTitle || ''}
                onChange={(e) => setFormData({ ...formData, activityTitle: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-black mb-1">Participação</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.participation || ''}
                  onChange={(e) => setFormData({ ...formData, participation: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ATIVO">Ativo</option>
                  <option value="PASSIVO">Passivo</option>
                  <option value="RECUSOU">Recusou</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Humor</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.mood || ''}
                  onChange={(e) => setFormData({ ...formData, mood: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALEGRE">Alegre</option>
                  <option value="CALMO">Calmo</option>
                  <option value="TRISTE">Triste</option>
                  <option value="AGITADO">Agitado</option>
                </select>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Resposta à Atividade</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, response: (formData.response || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.response || ''}
                onChange={(e) => setFormData({ ...formData, response: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-purple-600 text-white rounded-xl font-bold hover:bg-purple-700">
              Salvar Evolução
            </button>
          </form>
        );
      case 'activity':
      case 'activities':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-black dark:text-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="block text-sm font-black text-black mb-1">Título da Atividade</label>
                <input
                  required
                  type="text"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.title || ''}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Data</label>
                <input
                  required
                  type="date"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.date || ''}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Horário</label>
                <input
                  required
                  type="time"
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.time || ''}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-black text-black mb-1">Tipo</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.type || ''}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="MEMORIA">Memória</option>
                  <option value="PINTURA">Pintura</option>
                  <option value="MUSICA">Música</option>
                  <option value="JOGOS">Jogos</option>
                  <option value="LEITURA">Leitura</option>
                </select>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-black text-black uppercase">Participantes</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl max-h-48 overflow-y-auto border border-gray-200 dark:border-gray-700">
                {(patients || []).map((p: any) => (
                  <label key={p.id} className="flex items-center gap-2 text-sm p-2 hover:bg-white dark:hover:bg-gray-700 rounded-xl cursor-pointer transition-colors border border-transparent hover:border-gray-200 dark:hover:border-gray-600">
                    <input 
                      type="checkbox" 
                      value={p.id}
                      checked={(formData.participants || []).includes(p.id)}
                      onChange={(e) => {
                        const current = formData.participants || [];
                        if (e.target.checked) setFormData({ ...formData, participants: [...current, p.id] });
                        else setFormData({ ...formData, participants: current.filter((id: string) => id !== p.id) });
                      }}
                      className="w-4 h-4 rounded text-pink-600 border-gray-300 focus:ring-pink-500"
                    />
                    <span className="truncate text-black dark:text-gray-200 font-black">{p.name}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Descrição/Objetivo</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, description: (formData.description || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.description || ''}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-pink-600 text-white rounded-xl font-bold hover:bg-pink-700">
              Criar Atividade
            </button>
          </form>
        );
      case 'stimulation':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-black dark:text-gray-100">
            <div>
              <label className="block text-sm font-black text-black mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {[
                { field: 'memoryScore', label: 'Memória' },
                { field: 'attentionScore', label: 'Atenção' },
                { field: 'reasoningScore', label: 'Raciocínio' },
                { field: 'languageScore', label: 'Linguagem' }
              ].map((item) => (
                <div key={item.field}>
                  <label className="block text-sm font-black text-black mb-1">{item.label}</label>
                  <input
                    required
                    type="number"
                    min="0"
                    max="10"
                    className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                    value={formData[item.field] || ''}
                    onChange={(e) => setFormData({ ...formData, [item.field]: parseInt(e.target.value) })}
                  />
                </div>
              ))}
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Observações</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Estimulação
            </button>
          </form>
        );
      case 'social':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-black dark:text-gray-100">
            <div>
              <label className="block text-sm font-black text-black mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-black text-black mb-1">Nível de Interação</label>
                <select
                  required
                  className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                  value={formData.interactionLevel || ''}
                  onChange={(e) => setFormData({ ...formData, interactionLevel: e.target.value })}
                >
                  <option value="">Selecione</option>
                  <option value="ALTO">Alto</option>
                  <option value="MEDIO">Médio</option>
                  <option value="BAIXO">Baixo</option>
                </select>
              </div>
              <div className="space-y-2 pt-6">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isIsolated"
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded"
                    checked={formData.isIsolated || false}
                    onChange={(e) => setFormData({ ...formData, isIsolated: e.target.checked })}
                  />
                  <label htmlFor="isIsolated" className="text-sm font-black text-black leading-none">Está Isolado?</label>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isCommunicative"
                    className="w-4 h-4 text-pink-600 border-gray-300 rounded"
                    checked={formData.isCommunicative || false}
                    onChange={(e) => setFormData({ ...formData, isCommunicative: e.target.checked })}
                  />
                  <label htmlFor="isCommunicative" className="text-sm font-black text-black leading-none">É Comunicativo?</label>
                </div>
              </div>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Observações Sociais</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, observations: (formData.observations || '') + ' ' + t })} />
              </div>
              <textarea
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.observations || ''}
                onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700">
              Salvar Registro Social
            </button>
          </form>
        );
      case 'plan':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 text-black dark:text-gray-100">
            <div>
              <label className="block text-sm font-black text-black mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Objetivos Pedagógicos</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, objectives: (formData.objectives || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.objectives || ''}
                onChange={(e) => setFormData({ ...formData, objectives: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Estratégias de Intervenção</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, strategies: (formData.strategies || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.strategies || ''}
                onChange={(e) => setFormData({ ...formData, strategies: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-black text-black mb-1">Atividades Indicadas (separadas por vírgula)</label>
              <input
                required
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.indicatedActivitiesStr || ''}
                onChange={(e) => setFormData({ ...formData, indicatedActivitiesStr: e.target.value, indicatedActivities: e.target.value.split(',').map(s => s.trim()) })}
              />
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700">
              Salvar Plano
            </button>
          </form>
        );
      case 'history':
        return (
          <form onSubmit={handleSave} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto text-black dark:text-gray-100">
            <div>
              <label className="block text-sm font-black text-black mb-1">Idoso</label>
              <select
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                value={formData.patientId || ''}
                onChange={(e) => setFormData({ ...formData, patientId: e.target.value })}
              >
                <option value="">Selecione o idoso</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Principais Lembranças</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, memories: (formData.memories || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.memories || ''}
                onChange={(e) => setFormData({ ...formData, memories: e.target.value })}
              />
            </div>
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-sm font-black text-black">Histórias Marcantes</label>
                <VoiceTranscriptionButton onTranscribe={(t) => setFormData({ ...formData, stories: (formData.stories || '') + ' ' + t })} />
              </div>
              <textarea
                required
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black h-24"
                value={formData.stories || ''}
                onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-sm font-black text-black mb-1">URLs das Fotos (separadas por vírgula)</label>
              <input
                type="text"
                className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                placeholder="https://exemplo.com/foto1.jpg, ..."
                value={formData.photosStr || ''}
                onChange={(e) => setFormData({ ...formData, photosStr: e.target.value, photos: e.target.value.split(',').map(s => s.trim()) })}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-black text-black">Linha do Tempo</h4>
                <button
                  type="button"
                  onClick={() => {
                    const timeline = formData.timelineEvents || [];
                    setFormData({
                      ...formData,
                      timelineEvents: [...timeline, { date: '', event: '' }]
                    });
                  }}
                  className="text-xs bg-orange-50 dark:bg-orange-950 text-orange-600 dark:text-orange-400 px-2 py-1 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900 font-black"
                >
                  + Adicionar Evento
                </button>
              </div>
              {(formData.timelineEvents || []).map((event: any, index: number) => (
                <div key={index} className="grid grid-cols-3 gap-2 items-end bg-gray-50 dark:bg-gray-800 p-3 rounded-xl border border-gray-200 dark:border-gray-700">
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-black uppercase mb-1">Data/Ano</label>
                    <input
                      type="text"
                      className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                      placeholder="Ex: 1950"
                      value={event.date}
                      onChange={(e) => {
                        const newTimeline = [...formData.timelineEvents];
                        newTimeline[index].date = e.target.value;
                        setFormData({ ...formData, timelineEvents: newTimeline });
                      }}
                    />
                  </div>
                  <div className="col-span-1">
                    <label className="block text-[10px] font-black text-black uppercase mb-1">Evento</label>
                    <input
                      type="text"
                      className="w-full p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-800 text-black dark:text-white font-black"
                      placeholder="Ex: Casamento"
                      value={event.event}
                      onChange={(e) => {
                        const newTimeline = [...formData.timelineEvents];
                        newTimeline[index].event = e.target.value;
                        setFormData({ ...formData, timelineEvents: newTimeline });
                      }}
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newTimeline = formData.timelineEvents.filter((_: any, i: number) => i !== index);
                      setFormData({ ...formData, timelineEvents: newTimeline });
                    }}
                    className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="space-y-4 pt-4 border-t border-gray-100 dark:border-gray-800">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-400 uppercase ml-1">Digitalização e Fotos</label>
                <DigitizeButton onDigitize={handleDigitize} />
              </div>
              <PhotoUpload photos={formData.photos || []} onChange={photos => setFormData({ ...formData, photos })} />
            </div>

            <button type="submit" className="w-full py-3 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700">
              Salvar História de Vida
            </button>
          </form>
        );
      default:
        return null;
    }
  };

  // Dashboard Stats
  const stats = useMemo(() => {
    const patientsList = patients || [];
    const activitiesList = activities || [];
    const socialParticipationsList = socialParticipations || [];
    const evolutionsList = evolutions || [];
    const individualPlansList = individualPlans || [];

    const today = format(new Date(), 'yyyy-MM-dd');
    const activitiesToday = activitiesList.filter(a => a.date === today);
    const lowParticipation = socialParticipationsList.filter(s => s.interactionLevel === 'BAIXO' && isToday(parseISO(s.date)));
    
    const patientsWithEvolutionToday = new Set(
      evolutionsList
        .filter(e => isToday(parseISO(e.date)))
        .map(e => e.patientId)
    ).size;
    
    return {
      totalPatients: patientsList.length,
      activitiesToday: activitiesToday.length,
      lowParticipation: lowParticipation.length,
      noParticipation: Math.max(0, patientsList.length - patientsWithEvolutionToday),
      activePlans: individualPlansList.length
    };
  }, [patients, activities, socialParticipations, individualPlans, evolutions]);

  const filteredPatients = patients.filter(p => 
    p.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderSettings = () => (
    <div className="max-w-2xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
          <Settings className="text-blue-600" size={24} />
          Configurações do Sistema
        </h3>
        
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                {theme === 'light' ? <Sun className="text-yellow-500" /> : <Moon className="text-blue-400" />}
              </div>
              <div>
                <p className="font-bold text-gray-800 dark:text-white">Tema do Sistema</p>
                <p className="text-xs text-gray-500">Alterne entre modo claro e escuro</p>
              </div>
            </div>
            <button 
              onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
              className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all"
            >
              {theme === 'light' ? 'Modo Escuro' : 'Modo Claro'}
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/10 rounded-2xl border border-red-100 dark:border-red-900/20">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                <LogOut className="text-red-500" />
              </div>
              <div>
                <p className="font-bold text-red-600 dark:text-red-400">Sair da Conta</p>
                <p className="text-xs text-red-500/60">Encerre sua sessão atual</p>
              </div>
            </div>
            <button 
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-bold hover:bg-red-700 transition-all shadow-lg shadow-red-200 dark:shadow-none"
            >
              Sair Agora
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {[
          { label: 'Idosos Acompanhados', value: stats.totalPatients, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Atividades Hoje', value: stats.activitiesToday, icon: Calendar, color: 'text-purple-600', bg: 'bg-purple-50' },
          { label: 'Sem Participação', value: stats.noParticipation, icon: AlertCircle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Baixa Participação', value: stats.lowParticipation, icon: AlertCircle, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Planos Ativos', value: stats.activePlans, icon: ClipboardList, color: 'text-green-600', bg: 'bg-green-50' },
        ].map((stat, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-black text-black">{stat.label}</p>
                <p className="text-2xl font-black mt-1 text-black dark:text-white">{stat.value}</p>
              </div>
              <div className={cn("p-3 rounded-xl", stat.bg)}>
                <stat.icon className={cn("w-6 h-6", stat.color)} />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Participation Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-black dark:text-white mb-6 flex items-center gap-2 uppercase tracking-tight">
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
            Evolução de Participação
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={socialParticipations.slice(-7)}>
                <defs>
                  <linearGradient id="colorParticipation" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                <XAxis dataKey="date" tickFormatter={(str) => format(parseISO(str), 'dd/MM')} />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="interactionLevel" stroke="#3b82f6" fillOpacity={1} fill="url(#colorParticipation)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cognitive Levels Chart */}
        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-black text-black dark:text-white mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            Nível Cognitivo Geral
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Alto', value: (patients || []).filter(p => p.cognitiveLevel === 'ALTO').length },
                    { name: 'Médio', value: (patients || []).filter(p => p.cognitiveLevel === 'MEDIO').length },
                    { name: 'Baixo', value: (patients || []).filter(p => p.cognitiveLevel === 'BAIXO').length },
                  ]}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Today's Activities */}
      <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
        <h3 className="text-lg font-black text-black dark:text-white mb-4 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-blue-600" />
          Atividades do Dia
        </h3>
        <div className="space-y-4">
          {(activities || []).filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).length > 0 ? (
            activities.filter(a => a.date === format(new Date(), 'yyyy-MM-dd')).map((activity, i) => (
              <div key={i} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
                <div className="flex items-center gap-4">
                  <div className="p-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-100 dark:border-gray-700">
                    {activity.type === 'MEMORIA' && <Brain className="w-5 h-5 text-purple-600" />}
                    {activity.type === 'PINTURA' && <Palette className="w-5 h-5 text-pink-600" />}
                    {activity.type === 'MUSICA' && <Music className="w-5 h-5 text-blue-600" />}
                    {activity.type === 'JOGOS' && <Gamepad2 className="w-5 h-5 text-green-600" />}
                    {activity.type === 'LEITURA' && <BookOpen className="w-5 h-5 text-orange-600" />}
                  </div>
                  <div>
                    <p className="font-black text-black dark:text-white">{activity.title}</p>
                    <p className="text-sm text-black dark:text-gray-400 font-black">
                      {activity.time} • {(activity.participants || []).length} participantes
                    </p>
                  </div>
                </div>
                <button className="text-blue-600 dark:text-blue-400 hover:text-blue-700 font-bold text-sm">Ver Detalhes</button>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-3 opacity-20" />
              <p>Nenhuma atividade agendada para hoje.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderResidents = () => {
    if (selectedPatient) {
      const history = lifeHistories.find(h => h.patientId === selectedPatient.id);
      const assessment = assessments.find(a => a.patientId === selectedPatient.id);
      const plan = individualPlans.find(p => p.patientId === selectedPatient.id);

      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <button 
              onClick={() => setSelectedPatient(null)}
              className="flex items-center gap-2 text-gray-900 hover:text-black font-bold"
            >
              <ArrowLeft className="w-5 h-5 font-bold" />
              Voltar para Lista
            </button>
            <button 
              onClick={() => setSelectedPatient(null)}
              className="p-2 bg-gray-100 hover:bg-gray-200 rounded-full transition-colors"
              title="Fechar"
            >
              <X className="w-6 h-6 text-gray-900" />
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden">
            <div className="p-8 bg-gradient-to-r from-blue-700 to-blue-800 text-white shadow-lg">
              <div className="flex items-center gap-6">
                <div className="w-24 h-24 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center border-4 border-white/30 overflow-hidden shadow-inner">
                  {selectedPatient.photoUrl ? (
                    <img src={selectedPatient.photoUrl} alt={selectedPatient.name} className="w-full h-full object-cover" />
                  ) : (
                    <UserIcon className="w-12 h-12 text-white" />
                  )}
                </div>
                <div>
                  <h2 className="text-3xl font-black">{selectedPatient.name}</h2>
                  <p className="text-blue-50 font-bold mt-1">{selectedPatient.age} anos • {selectedPatient.schooling}</p>
                  <div className="flex gap-2 mt-4">
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider border border-white/20">
                      Cognitivo: {selectedPatient.cognitiveLevel}
                    </span>
                    <span className="px-3 py-1 bg-white/20 rounded-full text-xs font-black uppercase tracking-wider border border-white/20">
                      {selectedPatient.literacyLevel.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            </div>

          <div className="flex border-b border-gray-200 dark:border-gray-800 px-8 bg-gray-50/50 dark:bg-gray-900/50 overflow-x-auto">
            {[
              { id: 'profile', label: 'Perfil & Interesses', icon: UserCircle },
              { id: 'history', label: 'História de Vida', icon: History },
              { id: 'assessment', label: 'Avaliação Inicial', icon: Brain },
              { id: 'plan', label: 'Plano (PPI)', icon: Target },
            ].map((sub) => (
              <button
                key={sub.id}
                onClick={() => setResidentSubTab(sub.id as any)}
                className={cn(
                  "flex items-center gap-2 px-6 py-4 text-sm font-black transition-all border-b-2 whitespace-nowrap",
                  residentSubTab === sub.id 
                    ? "border-blue-600 text-blue-900 dark:text-blue-400 bg-white dark:bg-gray-900" 
                    : "border-transparent text-gray-950 dark:text-gray-400 hover:text-black dark:hover:text-gray-200"
                )}
              >
                  <sub.icon className="w-4 h-4" />
                  {sub.label}
                </button>
              ))}
            </div>

            <div className="p-8">
              {residentSubTab === 'profile' && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  <div className="space-y-6">
                    <div>
                      <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-3">Profissão Anterior</h4>
                      <p className="text-black dark:text-gray-100 font-bold">{selectedPatient.previousProfession || 'Não informada'}</p>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-3">Interesses</h4>
                      <div className="flex flex-wrap gap-2">
                        {(selectedPatient.interests || []).map((interest, i) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/40 text-black dark:text-blue-300 rounded-full text-xs font-bold border border-blue-100 dark:border-blue-800">
                            {interest}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-black dark:text-white uppercase tracking-wider mb-3">Preferência de Rotina</h4>
                      <span className="px-3 py-1 bg-purple-50 dark:bg-purple-900/40 text-black dark:text-purple-300 rounded-full text-xs font-bold uppercase border border-purple-100 dark:border-purple-800">
                        {selectedPatient.routinePreference}
                      </span>
                    </div>
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-black uppercase tracking-wider mb-3">Limitações Cognitivas</h4>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                      <p className="text-black dark:text-gray-200 font-bold leading-relaxed">{selectedPatient.cognitiveLimitations || 'Nenhuma limitação registrada.'}</p>
                    </div>
                    <button 
                      onClick={() => openModal('patient', selectedPatient)}
                      className="mt-6 flex items-center gap-2 text-black hover:text-blue-700 font-black text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar Perfil Educacional
                    </button>
                  </div>
                </div>
              )}

              {residentSubTab === 'history' && (
                history ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                    <div className="space-y-8">
                      <div>
                        <h5 className="text-sm font-black text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                          <Lightbulb className="w-4 h-4" />
                          Principais Lembranças
                        </h5>
                        <p className="text-black leading-relaxed italic font-bold">"{history.memories}"</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-black text-black uppercase tracking-wider mb-4 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Histórias Marcantes
                        </h5>
                        <p className="text-black leading-relaxed font-bold">{history.stories}</p>
                      </div>
                      <button 
                        onClick={() => openModal('history', history)}
                        className="flex items-center gap-2 text-orange-600 hover:text-orange-700 font-bold text-sm"
                      >
                        <Edit2 className="w-4 h-4" />
                        Editar História
                      </button>
                    </div>

                    <div className="relative pl-8 border-l-2 border-black">
                      <h5 className="text-sm font-black text-black uppercase tracking-wider mb-6">Linha do Tempo</h5>
                      <div className="space-y-8">
                        {history.timelineEvents.map((event, i) => (
                          <div key={i} className="relative">
                            <div className="absolute -left-[33px] top-1 w-4 h-4 rounded-full bg-black border-4 border-white shadow-sm" />
                            <p className="text-xs font-black text-black mb-1">{event.date}</p>
                            <p className="text-sm text-black font-bold">{event.event}</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <History className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-black font-bold">Nenhuma história de vida registrada para este idoso.</p>
                    <button 
                      onClick={() => openModal('history', { patientId: selectedPatient.id })}
                      className="mt-4 px-6 py-2 bg-orange-600 text-white rounded-xl font-bold hover:bg-orange-700"
                    >
                      Registrar História
                    </button>
                  </div>
                )
              )}

              {residentSubTab === 'assessment' && (
                assessment ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <ScoreCard label="Memória" score={assessment.memory === 'PRESERVADO' ? 10 : assessment.memory === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                      <ScoreCard label="Atenção" score={assessment.attention === 'PRESERVADO' ? 10 : assessment.attention === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                      <ScoreCard label="Linguagem" score={assessment.language === 'PRESERVADO' ? 10 : assessment.language === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                      <ScoreCard label="Orientação" score={assessment.orientation === 'PRESERVADO' ? 10 : assessment.orientation === 'LEVE_COMPROMETIMENTO' ? 6 : 2} />
                    </div>
                    <div className="p-6 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
                      <h5 className="text-sm font-bold text-gray-400 uppercase mb-3">Observações da Avaliação</h5>
                      <p className="text-gray-600 dark:text-gray-300">{assessment.observations || 'Sem observações adicionais.'}</p>
                    </div>
                    <button 
                      onClick={() => openModal('assessment', assessment)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Refazer Avaliação
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Brain className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-black font-bold">Nenhuma avaliação cognitiva inicial realizada.</p>
                    <button 
                      onClick={() => openModal('assessment', { patientId: selectedPatient.id })}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                    >
                      Realizar Avaliação
                    </button>
                  </div>
                )
              )}

              {residentSubTab === 'plan' && (
                plan ? (
                  <div className="space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      <div>
                        <h5 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">Objetivos Pedagógicos</h5>
                        <p className="text-gray-600 leading-relaxed">{plan.objectives}</p>
                      </div>
                      <div>
                        <h5 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">Estratégias</h5>
                        <p className="text-gray-600 leading-relaxed">{plan.strategies}</p>
                      </div>
                    </div>
                    <div>
                      <h5 className="text-sm font-bold text-blue-600 uppercase tracking-wider mb-4">Atividades Indicadas</h5>
                      <div className="flex flex-wrap gap-2">
                        {plan.indicatedActivities.map((act, i) => (
                          <span key={i} className="px-4 py-2 bg-blue-50 text-blue-600 rounded-xl text-sm font-bold">
                            {act}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button 
                      onClick={() => openModal('plan', plan)}
                      className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-bold text-sm"
                    >
                      <Edit2 className="w-4 h-4" />
                      Atualizar Plano
                    </button>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Target className="w-16 h-16 text-gray-200 mx-auto mb-4" />
                    <p className="text-black font-bold">Nenhum plano pedagógico individual (PPI) definido.</p>
                    <button 
                      onClick={() => openModal('plan', { patientId: selectedPatient.id })}
                      className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700"
                    >
                      Criar Plano
                    </button>
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar idoso..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-black dark:text-white"
            />
          </div>
          <button
            onClick={() => openModal('patient')}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Novo Cadastro Educacional
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPatients.map((patient) => (
            <motion.div
              key={patient.id}
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setSelectedPatient(patient)}
            >
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 rounded-full bg-blue-50 flex items-center justify-center overflow-hidden border-2 border-blue-100">
                      {patient.photoUrl ? (
                        <img src={patient.photoUrl} alt={patient.name} className="w-full h-full object-cover" />
                      ) : (
                        <UserIcon className="w-8 h-8 text-blue-400" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-black dark:text-white">{patient.name}</h4>
                      <p className="text-sm text-black dark:text-gray-300 font-black">{patient.age} anos • {patient.schooling}</p>
                    </div>
                  </div>
                  <div className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-black uppercase border",
                    patient.cognitiveLevel === 'ALTO' ? "bg-green-50 text-green-700 border-green-100" :
                    patient.cognitiveLevel === 'MEDIO' ? "bg-yellow-50 text-yellow-700 border-yellow-100" :
                    "bg-red-50 text-red-700 border-red-100"
                  )}>
                    {patient.cognitiveLevel}
                  </div>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex items-center gap-2 text-sm text-black dark:text-gray-200 font-black">
                    <BookOpen className="w-4 h-4 text-blue-500" />
                    <span>{patient.literacyLevel.replace('_', ' ')}</span>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-black dark:text-gray-200 font-black">
                    <Star className="w-4 h-4 text-yellow-500" />
                    <span className="truncate">{(patient.interests || []).join(', ')}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    className="flex-1 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg text-sm font-black hover:bg-blue-100 transition-colors"
                  >
                    Ver Prontuário Pedagógico
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    );
  };

  const renderActivitiesTab = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-black dark:text-white">Oficinas & Atividades</h3>
        <button
          onClick={() => openModal('activity')}
          className="flex items-center gap-2 px-4 py-2 bg-pink-600 text-white rounded-xl hover:bg-pink-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Nova Oficina
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <h4 className="text-sm font-black text-black uppercase tracking-wider">Próximas Oficinas</h4>
          <div className="grid grid-cols-1 gap-4">
            {(activities || []).map((activity) => (
              <div key={activity.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-pink-50 dark:bg-pink-900/20 flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-pink-500" />
                    </div>
                    <div>
                      <h5 className="font-black text-black dark:text-white">{activity.title}</h5>
                      <p className="text-sm text-black dark:text-gray-400 font-black">
                        {format(parseISO(activity.date), 'dd/MM/yyyy')} às {activity.time}
                      </p>
                    </div>
                  </div>
                  <span className="px-3 py-1 bg-pink-50 dark:bg-pink-900/40 text-pink-600 dark:text-pink-400 rounded-full text-xs font-black uppercase border border-pink-100 dark:border-pink-800">
                    {activity.type}
                  </span>
                </div>
                <p className="text-sm text-black dark:text-gray-300 mb-4 font-black leading-relaxed">{activity.description}</p>
                <button 
                  onClick={() => openModal('evolution', { activityTitle: activity.title })}
                  className="w-full py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400 rounded-lg text-sm font-bold hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors border border-purple-100 dark:border-purple-800"
                >
                  Registrar Participação (Evolução)
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Evoluções Recentes</h4>
        <div className="space-y-3">
          {(evolutions || []).slice().sort((a, b) => b.date.localeCompare(a.date)).slice(0, 8).map((evolution) => {
            const patient = (patients || []).find(p => p.id === evolution.patientId);
            return (
              <div key={evolution.id} className="bg-white dark:bg-gray-900 p-4 rounded-xl border border-gray-200 dark:border-gray-800 flex items-center justify-between hover:shadow-sm transition-shadow">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
                    {patient?.photoUrl ? <img src={patient.photoUrl} alt="" className="w-full h-full object-cover" /> : <UserIcon className="w-5 h-5 text-gray-400 m-2.5" />}
                  </div>
                  <div>
                    <p className="text-sm font-black text-black dark:text-white">{patient?.name}</p>
                    <p className="text-[11px] text-black dark:text-gray-400 font-black">{evolution.activityTitle}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className={cn(
                    "text-[10px] font-black px-2 py-0.5 rounded-full uppercase border",
                    evolution.participation === 'ATIVO' ? "bg-green-50 text-green-700 border-green-100" : "bg-yellow-50 text-yellow-700 border-yellow-100"
                  )}>
                    {evolution.participation}
                  </span>
                  <p className="text-[10px] text-black dark:text-gray-400 mt-1 font-black">{format(parseISO(evolution.date), 'dd/MM HH:mm')}</p>
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </div>
    </div>
  );

  const renderMonitoring = () => (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-black text-black dark:text-white">Acompanhamento de Progresso</h3>
        <div className="flex gap-2">
          <button
            onClick={() => openModal('stimulation')}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Nova Estimulação
          </button>
          <button
            onClick={() => openModal('social')}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors"
          >
            <Plus className="w-5 h-5" />
            Registro Social
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-black text-black mb-6 flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-500" />
            Estimulação Cognitiva (Média)
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={[
                { name: 'Memória', value: (stimulationTrackings || []).reduce((acc, curr) => acc + curr.memoryScore, 0) / ((stimulationTrackings || []).length || 1) },
                { name: 'Atenção', value: (stimulationTrackings || []).reduce((acc, curr) => acc + curr.attentionScore, 0) / ((stimulationTrackings || []).length || 1) },
                { name: 'Raciocínio', value: (stimulationTrackings || []).reduce((acc, curr) => acc + curr.reasoningScore, 0) / ((stimulationTrackings || []).length || 1) },
                { name: 'Linguagem', value: (stimulationTrackings || []).reduce((acc, curr) => acc + curr.languageScore, 0) / ((stimulationTrackings || []).length || 1) },
              ]}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" tick={{fill: 'black', fontWeight: 'bold'}} />
                <YAxis domain={[0, 10]} tick={{fill: 'black', fontWeight: 'bold'}} />
                <Tooltip />
                <Bar dataKey="value" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white p-8 rounded-3xl border border-gray-100 shadow-sm">
          <h4 className="text-lg font-black text-black mb-6 flex items-center gap-2">
            <Users2 className="w-5 h-5 text-green-500" />
            Interação Social
          </h4>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={[
                    { name: 'Alta', value: (socialParticipations || []).filter(s => s.interactionLevel === 'ALTO').length },
                    { name: 'Média', value: (socialParticipations || []).filter(s => s.interactionLevel === 'MEDIO').length },
                    { name: 'Baixa', value: (socialParticipations || []).filter(s => s.interactionLevel === 'BAIXO').length },
                  ]}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  <Cell fill="#10B981" />
                  <Cell fill="#F59E0B" />
                  <Cell fill="#EF4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-6 mt-4">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-green-500" />
              <span className="text-xs font-bold text-gray-500">Alta</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-yellow-500" />
              <span className="text-xs font-bold text-gray-500">Média</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-xs font-bold text-gray-500">Baixa</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      <aside className="w-full lg:w-64 space-y-2">
        {[
          { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
          { id: 'residents', label: 'Residentes', icon: Users },
          { id: 'activities', label: 'Oficinas', icon: Palette },
          { id: 'monitoring', label: 'Monitoramento', icon: TrendingUp },
          { id: 'reports', label: 'Relatórios', icon: FileText },
          { id: 'settings', label: 'Configurações', icon: Settings },
        ].map((tab) => (
          <NavButton
            key={tab.id}
            active={activeTab === tab.id}
            onClick={() => setActiveTab(tab.id as TabType)}
            icon={tab.icon}
            label={tab.label}
          />
        ))}
      </aside>

      <div className="flex-1 min-w-0">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'dashboard' && renderDashboard()}
            {activeTab === 'settings' && renderSettings()}
            {activeTab === 'residents' && renderResidents()}
            {activeTab === 'activities' && renderActivitiesTab()}
            {activeTab === 'monitoring' && renderMonitoring()}
            {activeTab === 'reports' && (
              <div className="bg-white dark:bg-gray-900 p-12 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 text-center">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Módulo de Relatórios</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  Gere relatórios pedagógicos completos, acompanhamento de evolução cognitiva e participação social em PDF.
                </p>
                <button 
                  onClick={() => {
                    if ((patients || []).length === 0) return;
                    const data = patients.map(p => {
                      const patientEvolutions = evolutions.filter(e => e.patientId === p.id);
                      return [p.name, p.age, patientEvolutions.length, p.status];
                    });
                    generateModernPDF({
                      title: 'Relatório Pedagógico Geral',
                      subtitle: `Acompanhamento Pedagógico - ${format(new Date(), "dd/MM/yyyy")}`,
                      columns: ['Residente', 'Idade', 'Evoluções', 'Status'],
                      data,
                      fileName: 'relatorio_pedagogico_geral'
                    });
                  }}
                  className="mt-6 px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors"
                >
                  Gerar Relatório Geral
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl overflow-hidden shadow-2xl border border-transparent dark:border-gray-800 transition-all">
            <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
              <h3 className="text-xl font-bold text-gray-900 dark:text-white">Novo Registro Pedagógico</h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                <X className="w-6 h-6 text-gray-900 dark:text-gray-100" />
              </button>
            </div>
            {renderModalContent()}
          </div>
        </div>
      )}
    </div>
  );
};

const StatusBadge: React.FC<{ status: string }> = ({ status }) => {
  const colors = {
    'PRESERVADO': 'bg-green-100 text-green-700',
    'LEVE_COMPROMETIMENTO': 'bg-yellow-100 text-yellow-700',
    'COMPROMETIDO': 'bg-red-100 text-red-700'
  };
  return (
    <span className={cn("px-2 py-1 rounded-full text-[10px] font-bold uppercase", colors[status as keyof typeof colors])}>
      {status.replace('_', ' ')}
    </span>
  );
};

const ScoreCard: React.FC<{ label: string, score: number }> = ({ label, score }) => (
  <div className="p-4 bg-gray-50 rounded-xl">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs font-bold text-gray-500 uppercase">{label}</span>
      <span className="text-lg font-bold text-blue-600">{score}/10</span>
    </div>
    <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
      <div 
        className="h-full bg-blue-500 transition-all duration-500" 
        style={{ width: `${score * 10}%` }}
      />
    </div>
  </div>
);
