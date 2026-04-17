import React, { useState, useMemo, useEffect, useRef } from 'react';
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
  BellOff,
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
  Gift,
  Sun,
  Moon,
  Briefcase,
  ClipboardList,
  LayoutDashboard,
  HeartPulse,
  Save,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  MoreVertical
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
import { TranscriptionButton } from './components/TranscriptionButton';
import { Role, User, Elderly, EvolutionRecord, FinancialRecord, PIA, Donor, DiaperDonation, DiaperStock, DiaperProductionLog, FinancialDocument, CalendarEvent, Volunteer, CommunityElderly, Workshop, Caregiver, Professional, PhysioPatient, PhysioAssessment, PhysioEvolution, PhysioExercise, PhysioAppointment, NursingPatient, Medication, MedicationAdministration, VitalSigns, DressingRecord, NursingEvolution, IncidentRecord, ShiftSchedule, AVDRecord, DiaperChangeRecord, PsychPatient, PsychInitialAssessment, PsychEvolution, PsychAppointment, PsychEmotionalMonitoring, PsychFamilyBond, PsychActivity, PsychCognitionAssessment, PsychInterventionPlan, PedagogyPatient, PedagogyInitialAssessment, PedagogyEvolution, PedagogyActivity, PedagogyStimulationTracking, PedagogySocialParticipation, PedagogyIndividualPlan, PedagogyLifeHistory, SocialPatient, SocialFamilyTie, SocialDocumentation, SocialLegalSituation, SocialStudy, SocialEvolution, SocialReferral, SocialFamilyVisit, SocialRiskSituation, GalleryItem, InstitutionalInfo, FamilyEngagement } from './types';
import { MOCK_USERS, ROLE_LABELS, MOCK_GALLERY } from './constants';
import { generateModernPDF } from './lib/pdfUtils';
import { processSmartIA, AISmartCommandResult } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { db, auth } from './firebase';
import { PhysioSection } from './components/PhysioSection';
import { NursingSection } from './components/NursingSection';
import { PsychologySection } from './components/PsychologySection';
import { PedagogySection } from './components/PedagogySection';
import { SocialWorkSection } from './components/SocialWorkSection';
import { GlobalGallery } from './components/GlobalGallery';
import { DigitizeButton } from './components/DigitizeButton';
import { CameraModal } from './components/CameraModal';
import { PhotoUpload } from './components/PhotoUpload';
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
  signOut,
  updateEmail,
  deleteUser
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

const AIAssistant = ({ user, elderly, onCommandParsed }: { user: User, elderly: Elderly[], onCommandParsed: (result: AISmartCommandResult) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'ai', content: string, command?: AISmartCommandResult }[]>([
    { role: 'ai', content: "Olá! Sou o assistente OAMI IA. Posso processar relatos de evolução, oficinas, reuniões e anexos. Como posso ajudar hoje?" }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [showAttachments, setShowAttachments] = useState(false);
  const [isProcessingMedia, setIsProcessingMedia] = useState(false);
  const recognitionRef = useRef<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = false;
      recognitionRef.current.interimResults = false;
      recognitionRef.current.lang = 'pt-BR';

      recognitionRef.current.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setInput(prev => prev ? prev + ' ' + transcript : transcript);
        setIsListening(false);
      };

      recognitionRef.current.onerror = (event: any) => {
        console.error("Speech Recognition Error:", event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      setIsListening(true);
      recognitionRef.current?.start();
    }
  };

  const processMedia = async (base64Data: string, mimeType: string) => {
    setIsProcessingMedia(true);
    setLoading(true);
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        console.error("Erro: GEMINI_API_KEY não configurada.");
        setMessages(prev => [...prev, { role: 'ai', content: "⚠️ Erro: IA não configurada (API Key ausente)." }]);
        return;
      }
      const ai = new GoogleGenAI({ apiKey });
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: [
          {
            parts: [
              { text: "Analise esta imagem que pode ser um documento institucional, relatório ou foto de atividade em uma ILPI. Transcreva qualquer texto relevante e descreva o que está acontecendo se for uma foto de atividade. Retorne um texto que possa ser usado para criar um registro evolutivo ou de atividade logo em seguida." },
              { inlineData: { data: base64Data, mimeType } }
            ]
          }
        ]
      });

      const extractedText = response.text;
      if (extractedText) {
        setInput(extractedText);
        setMessages(prev => [...prev, { role: 'ai', content: "📄 Texto extraído do anexo/câmera. Você pode revisar e enviar agora para processamento inteligente." }]);
      }
    } catch (error) {
      console.error("Media processing error:", error);
    } finally {
      setIsProcessingMedia(false);
      setLoading(false);
      setShowAttachments(false);
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64Data = (reader.result as string).split(',')[1];
      processMedia(base64Data, file.type);
    };
    reader.readAsDataURL(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    
    const userMsg = { role: 'user' as const, content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const userProfile = `${user.name} - ${ROLE_LABELS[user.role]}`;
      const parsed = await processSmartIA(input, userProfile);
      
      let aiContent = "";
      let potentialCommand: AISmartCommandResult | undefined = undefined;

      if (parsed && parsed.isCommand && parsed.confidence > 0.4 && parsed.recordType) {
        aiContent = `Entendido! Identifiquei um registro de ${parsed.recordType.replace('_', ' ')}. Deseja salvar estas informações?`;
        
        if (parsed.patientNameHint) {
          const searchName = parsed.patientNameHint.toLowerCase().trim();
          const match = elderly.find(e => 
            e.name.toLowerCase().includes(searchName) ||
            searchName.includes(e.name.toLowerCase()) ||
            e.name.toLowerCase().split(' ')[0] === searchName
          );
          if (match) {
            parsed.patientId = match.id;
            aiContent = `Identifiquei um registro de ${parsed.recordType.replace('_', ' ')} para **${match.name}**. Deseja salvar?`;
          }
        }
        potentialCommand = parsed;
      } else {
        aiContent = parsed?.chatResponse || "Desculpe, não consegui processar sua solicitação.";
      }

      setMessages(prev => [...prev, { role: 'ai', content: aiContent, command: potentialCommand }]);
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
        onClick={() => setIsOpen(!isOpen)}
        title={isOpen ? "Fechar Chat" : "Abrir Assistente IA"}
        className="fixed bottom-6 right-6 w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-green-700 transition-all z-[60] group"
      >
        {isOpen ? (
          <X size={28} className="animate-in zoom-in duration-300" />
        ) : (
          <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
        )}
        {!isOpen && (
          <span className="absolute right-full mr-4 bg-white dark:bg-gray-900 text-green-800 dark:text-green-400 px-3 py-1 rounded-lg text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
            Assistente OAMI Smart IA
          </span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40"
            />
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-green-100 dark:border-green-900/30 flex flex-col z-50 overflow-hidden"
            >
            <div className="p-4 bg-green-600 text-white flex justify-between items-center shadow-lg">
              <div className="flex items-center gap-2">
                <Sparkles size={18} className="animate-pulse" />
                <div>
                  <h3 className="font-bold text-sm">Assistente OAMI Smart IA</h3>
                  <p className="text-[10px] text-green-100">Pronto para lançar informações</p>
                </div>
              </div>
              <button onClick={() => setIsOpen(false)} className="hover:bg-green-700 p-1 rounded-lg transition-colors">
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
              {messages.length === 0 && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Sparkles size={32} />
                  </div>
                  <p className="text-sm text-gray-800 dark:text-white font-bold mb-2">Olá, {user.name}!</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 px-6 leading-relaxed">
                    Você pode lançar evoluções, oficinas ou reuniões apenas descrevendo o que aconteceu. 
                    Eu preencho os campos automaticamente!
                  </p>
                </div>
              )}
              {messages.map((msg, i) => (
                <div key={i} className={cn("flex flex-col", msg.role === 'user' ? "items-end" : "items-start")}>
                  <div className={cn(
                    "max-w-[85%] p-3 rounded-2xl text-sm mb-1",
                    msg.role === 'user' 
                      ? "bg-green-600 text-white rounded-tr-none shadow-md font-medium" 
                      : "bg-white dark:bg-gray-800 text-gray-800 dark:text-white border border-green-100 dark:border-green-900/30 rounded-tl-none shadow-sm"
                  )}>
                    {msg.content}
                  </div>
                  
                  {msg.command && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 w-full bg-white dark:bg-gray-800 border border-green-200 dark:border-green-900/50 rounded-2xl p-4 shadow-lg"
                    >
                      <div className="flex items-center gap-2 mb-3 border-b border-gray-100 dark:border-gray-700 pb-2">
                        <Save className="w-4 h-4 text-green-600" />
                        <span className="text-xs font-black text-gray-800 dark:text-white uppercase tracking-wider">
                          Confirmar Lançamento
                        </span>
                      </div>
                      
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between">
                          <span className="text-[10px] font-bold text-gray-400 uppercase">Tipo</span>
                          <span className="text-[10px] font-black text-green-600 bg-green-50 dark:bg-green-900/30 px-2 py-0.5 rounded-full">{msg.command.recordType}</span>
                        </div>
                        {msg.command.patientNameHint && (
                          <div className="flex justify-between">
                            <span className="text-[10px] font-bold text-gray-400 uppercase">Acolhido</span>
                            <span className="text-[10px] font-black text-blue-600 dark:text-blue-400">{msg.command.patientNameHint}</span>
                          </div>
                        )}
                        <div className="p-2 bg-gray-50 dark:bg-gray-900/50 rounded-lg border border-gray-100 dark:border-gray-800">
                          <div className="space-y-1.5">
                            {Object.entries(msg.command.data || {}).map(([key, value]) => {
                              if (!value || key === 'patientId' || key === 'date' || key === 'patientName') return null;
                              return (
                                <div key={key} className="flex flex-col border-b border-gray-100 dark:border-gray-800 last:border-0 pb-1 last:pb-0">
                                  <span className="text-[8px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-tighter">{key}</span>
                                  <span className="text-[10px] text-gray-700 dark:text-gray-300 font-medium leading-tight line-clamp-2">
                                    {typeof value === 'string' ? value : Array.isArray(value) ? value.join(', ') : JSON.stringify(value)}
                                  </span>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>

                      <button 
                        onClick={() => {
                          onCommandParsed(msg.command!);
                          setMessages(prev => [...prev, { role: 'ai', content: "✅ Registro salvo com sucesso no banco de dados!" }]);
                        }}
                        className="w-full py-2 bg-green-600 hover:bg-green-700 text-white text-xs font-black rounded-xl shadow-md transition-all flex items-center justify-center gap-2"
                      >
                        <CheckCircle2 size={16} />
                        Confirmar e Salvar
                      </button>
                    </motion.div>
                  )}
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="bg-white dark:bg-gray-800 p-3 rounded-2xl rounded-tl-none border border-green-100 dark:border-green-900/30 shadow-sm flex gap-1 items-center">
                    <Loader2 size={14} className="animate-spin text-green-600" />
                    <span className="text-[10px] font-bold text-gray-400">Processando informações...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 border-t border-green-50 dark:border-gray-800 bg-white dark:bg-gray-900 relative">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
              />
              
              <CameraModal 
                isOpen={isCameraOpen}
                onClose={() => setIsCameraOpen(false)}
                onCapture={(base64) => processMedia(base64, 'image/jpeg')}
              />

              <AnimatePresence>
                {showAttachments && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.9 }}
                    className="absolute bottom-full left-4 mb-2 bg-white dark:bg-gray-800 rounded-2xl shadow-2xl border border-gray-100 dark:border-gray-700 p-2 flex gap-2 z-[60]"
                  >
                    <button 
                      onClick={() => setIsCameraOpen(true)}
                      className="p-3 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-colors flex flex-col items-center gap-1"
                    >
                      <Camera size={20} />
                      <span className="text-[10px] font-bold">Câmera</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl hover:bg-purple-100 transition-colors flex flex-col items-center gap-1"
                    >
                      <ImageIcon size={20} />
                      <span className="text-[10px] font-bold">Foto</span>
                    </button>
                    <button 
                      onClick={() => fileInputRef.current?.click()}
                      className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 transition-colors flex flex-col items-center gap-1"
                    >
                      <FileText size={20} />
                      <span className="text-[10px] font-bold">Documento</span>
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>

              <div className="flex gap-2 items-center">
                <button 
                  onClick={() => setShowAttachments(!showAttachments)}
                  className={cn(
                    "p-2 rounded-xl transition-all",
                    showAttachments ? "bg-green-100 text-green-700" : "bg-gray-50 dark:bg-gray-800 text-gray-400 hover:text-green-600"
                  )}
                >
                  <Plus size={20} />
                </button>

                <div className="flex-1 relative">
                  <input 
                    type="text" 
                    placeholder={isListening ? "Ouvindo..." : "Relate aqui..."}
                    className={cn(
                      "w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-medium pr-10",
                      isListening && "ring-2 ring-red-500 animate-pulse"
                    )}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button 
                    onClick={toggleListening}
                    className={cn(
                      "absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors",
                      isListening ? "text-red-500 bg-red-50 dark:bg-red-900/20" : "text-gray-400 hover:text-green-600"
                    )}
                  >
                    {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                  </button>
                </div>

                <button 
                  onClick={handleSend}
                  disabled={loading || isProcessingMedia}
                  className="p-3 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-all shadow-md disabled:opacity-50"
                >
                  {isProcessingMedia ? <Loader2 size={20} className="animate-spin" /> : <ChevronRight size={20} />}
                </button>
              </div>
              <p className="text-[8px] text-center text-gray-400 mt-2 uppercase font-bold tracking-widest">
                IA treinada para preenchimento automático
              </p>
            </div>
          </motion.div>
          </>
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
        className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-md w-full shadow-2xl space-y-6"
      >
        <div className="flex items-center gap-4 text-red-600 dark:text-red-400">
          <div className="p-3 bg-red-100 dark:bg-red-900/30 rounded-2xl">
            <AlertCircle size={24} />
          </div>
          <h3 className="text-xl font-bold">{title}</h3>
        </div>
        <p className="text-gray-600 dark:text-gray-400 leading-relaxed">
          {message}
        </p>
        <div className="flex gap-3 pt-2">
          <button 
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
          >
            Cancelar
          </button>
          <button 
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 shadow-lg shadow-red-200 dark:shadow-none transition-all"
          >
            Confirmar Exclusão
          </button>
        </div>
      </motion.div>
    </div>
  );
};

const Logo = ({ className, src }: { className?: string, src?: string | null }) => {
  if (src) {
    return (
      <img 
        src={src} 
        alt="Logo" 
        className={cn("w-full h-full object-cover rounded-full", className)} 
        referrerPolicy="no-referrer"
      />
    );
  }
  return (
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
};

const LoginLogo = () => {
  const [logo, setLogo] = useState<string | null>(localStorage.getItem('app_login_logo'));
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64 = reader.result as string;
        setLogo(base64);
        localStorage.setItem('app_login_logo', base64);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    setLogo(null);
    localStorage.removeItem('app_login_logo');
  };

  return (
    <div className="relative group">
      <input 
        type="file" 
        accept="image/*" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileChange}
      />
      <div 
        onClick={() => fileInputRef.current?.click()}
        className="w-24 h-24 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 shadow-lg p-2 border border-green-100 dark:border-gray-700 cursor-pointer hover:scale-105 transition-all relative overflow-hidden"
      >
        <Logo src={logo} />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
          <Camera className="text-white" size={24} />
        </div>
      </div>
      {logo && (
        <button 
          onClick={handleDelete}
          className="absolute -top-2 -right-2 p-1.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-200 dark:hover:bg-red-900/50"
          title="Remover Foto"
        >
          <Trash2 size={14} />
        </button>
      )}
    </div>
  );
};

const Login = ({ onGoogleLogin, onCompleteProfile, needsProfile }: { 
  onGoogleLogin: () => void, 
  onCompleteProfile: (role: Role) => void,
  needsProfile: boolean 
}) => {
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');
  const [error, setError] = useState('');

  if (needsProfile) {
    return (
      <div className="min-h-screen bg-green-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-green-100 dark:border-gray-800"
        >
          <div className="flex flex-col items-center mb-8">
            <h2 className="text-xl font-bold text-green-800 dark:text-green-400">Complete seu Perfil</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm text-center mt-2">Selecione seu cargo para acessar o sistema.</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Área Profissional</label>
              <select 
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-green-500 outline-none text-gray-800 dark:text-white"
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
    <div className="min-h-screen bg-green-50 dark:bg-gray-950 flex items-center justify-center p-4 transition-colors duration-300">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white dark:bg-gray-900 p-8 rounded-2xl shadow-xl w-full max-w-md border border-green-100 dark:border-gray-800"
      >
        <div className="flex flex-col items-center mb-8">
          <LoginLogo />
          <h1 className="text-2xl font-bold text-green-800 dark:text-green-400">OAMI - Vitória do Mearim</h1>
          <p className="text-green-600 dark:text-green-500 text-sm">Sistema de Gestão ILPI</p>
        </div>

        <div className="space-y-6">
          <p className="text-center text-gray-600 dark:text-gray-400 text-sm">Acesse o sistema utilizando sua conta institucional ou pessoal vinculada.</p>
          
          <button 
            onClick={onGoogleLogin}
            className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm transition-all flex items-center justify-center gap-3"
          >
            <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
            Entrar com Google
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200 dark:border-gray-700"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white dark:bg-gray-900 px-2 text-gray-400 dark:text-gray-500">Acesso Restrito</span></div>
          </div>

          <p className="text-[10px] text-center text-gray-400 dark:text-gray-500">
            Ao entrar, você concorda com os termos de uso e privacidade da instituição.
          </p>
        </div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="fixed bottom-4 right-4 text-[10px] text-gray-400 dark:text-gray-600 font-medium uppercase tracking-widest"
      >
        Criado por: Franciara de Abreú Coelho
      </motion.div>
    </div>
  );
};

const Sidebar = ({ user, activeTab, setActiveTab, onLogout, onOpenProfile, isOpen, setIsOpen }: { 
  user: User, 
  activeTab: string, 
  setActiveTab: (tab: string) => void,
  onLogout: () => void,
  onOpenProfile: () => void,
  isOpen: boolean,
  setIsOpen: (open: boolean) => void
}) => {
  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'elderly', label: 'Idosos', icon: Users, roles: ['ANY'] },
    { id: 'physio', label: 'Fisioterapia', icon: Activity, roles: ['FISIOTERAPEUTA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE'] },
    { id: 'nursing', label: 'Enfermagem', icon: Stethoscope, roles: ['ENFERMEIRA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE'] },
    { id: 'psychology', label: 'Psicologia', icon: Brain, roles: ['PSICOLOGA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE'] },
    { id: 'pedagogy', label: 'Pedagogia', icon: BookOpen, roles: ['PEDAGOGA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE'] },
    { id: 'socialWork', label: 'Serviço Social', icon: Heart, roles: ['ASSISTENTE_SOCIAL', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE'] },
    { id: 'professionals', label: 'Cadastro de Profissionais', icon: Briefcase, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'professional', label: 'Área Profissional', icon: UserCircle, roles: ['ASSISTENTE_SOCIAL', 'PSICOLOGA', 'PEDAGOGA', 'ENFERMEIRA', 'FISIOTERAPEUTA', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'financial', label: 'Financeiro', icon: DollarSign, roles: ['PRESIDENTE'] },
    { id: 'institutional', label: 'Institucional', icon: Info, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'schedule', label: 'Cronograma', icon: Calendar, roles: ['ANY'] },
    { id: 'volunteers', label: 'Voluntários/Estagiários', icon: BookOpen, roles: ['ANY'] },
    { id: 'family', label: 'Acompanhamento Familiar', icon: Users, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PSICOLOGA', 'PROJETISTA'] },
    { id: 'donors', label: 'Doadores e Sócios', icon: Heart, roles: ['PRESIDENTE'] },
    { id: 'diaperDonations', label: 'Doação de Fraldas', icon: Gift, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PRESIDENTE', 'PROJETISTA'] },
    { id: 'diaperFactory', label: 'Fábrica de Fraldas', icon: Package, roles: ['FABRICANTE_FRALDAS', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'workshops', label: 'Oficinas e Capacitações', icon: BookOpen, roles: ['ANY'] },
    { id: 'monitoring', label: 'Monitoramento e Avaliação', icon: Activity, roles: ['COORDENADORA', 'PROJETISTA'] },
    { id: 'gallery', label: 'Galeria de Fotos', icon: ImageIcon, roles: ['ANY'] },
    { id: 'reports', label: 'Relatórios Mensais', icon: FileText, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
    { id: 'settings', label: 'Configurações', icon: Settings, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'] },
  ];

  const filteredItems = menuItems.filter(item => 
    item.roles.includes('ANY') || item.roles.includes(user.role)
  );

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    if (window.innerWidth < 1024) {
      setIsOpen(false);
    }
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      <motion.div 
        initial={false}
        animate={{ 
          x: isOpen ? 0 : (window.innerWidth < 1024 ? -256 : 0),
          width: window.innerWidth < 1024 ? 256 : 256
        }}
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-green-100 dark:border-gray-800 flex flex-col z-50 transition-colors duration-300 overflow-hidden",
          !isOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="p-6 border-b border-green-50 dark:border-gray-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-lg flex items-center justify-center shadow-sm p-1 border border-green-100 dark:border-gray-700">
              <Logo />
            </div>
            <div>
              <h2 className="font-bold text-green-800 dark:text-green-400 leading-tight">OAMI</h2>
              <p className="text-xs text-green-600 dark:text-green-500">Vitória do Mearim</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-green-600 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 border-b border-green-50 dark:border-gray-800">
          <button 
            onClick={() => {
              onOpenProfile();
              if (window.innerWidth < 1024) setIsOpen(false);
            }}
            className="w-full bg-green-50 dark:bg-green-900/20 p-3 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-left group"
          >
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg overflow-hidden bg-green-200 dark:bg-green-800 flex-shrink-0">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-green-700 dark:text-green-400 font-bold text-xs">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold text-green-800 dark:text-green-300 truncate group-hover:text-green-900 dark:group-hover:text-green-200">{user.name}</p>
                <p className="text-[10px] text-green-600 dark:text-green-500 uppercase tracking-wider truncate">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-4 space-y-1">
          {filteredItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={cn(
                "w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all",
                activeTab === item.id 
                  ? "bg-green-600 text-white shadow-md shadow-green-200 dark:shadow-none" 
                  : "text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400"
              )}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-green-50 dark:border-gray-800">
          <button 
            onClick={() => {
              onLogout();
              if (window.innerWidth < 1024) setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all"
          >
            <LogOut size={18} />
            Sair do Sistema
          </button>
        </div>
      </motion.div>
    </>
  );
};

const ProfessionalsSection = ({ professionals, showToast, showConfirm }: { 
  professionals: Professional[], 
  showToast: (msg: string, type: 'success' | 'error') => void,
  showConfirm: (msg: string, onConfirm: () => void) => void 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<Professional>>({
    status: 'ATIVO',
    role: 'COORDENADORA'
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newProfessional = {
        ...formData,
        createdAt: new Date().toISOString()
      };
      await addDoc(collection(db, 'professionals'), newProfessional);
      showToast('Profissional cadastrado com sucesso!', 'success');
      setIsModalOpen(false);
      setFormData({ status: 'ATIVO', role: 'COORDENADORA' });
    } catch (error) {
      showToast('Erro ao cadastrar profissional.', 'error');
    }
  };

  const handleDelete = (id: string) => {
    showConfirm('Tem certeza que deseja excluir este profissional?', async () => {
      try {
        await deleteDoc(doc(db, 'professionals', id));
        showToast('Profissional excluído com sucesso!', 'success');
      } catch (error) {
        showToast('Erro ao excluir profissional.', 'error');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Profissionais</h2>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 bg-green-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-green-700 transition-all"
        >
          <Plus size={20} />
          Novo Profissional
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(professionals || []).map((p) => (
          <motion.div 
            key={p.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 relative group"
          >
            <button 
              onClick={() => handleDelete(p.id)}
              className="absolute top-4 right-4 p-2 text-gray-400 hover:text-red-600 transition-colors opacity-0 group-hover:opacity-100"
            >
              <Trash2 size={18} />
            </button>
            <div className="flex items-center gap-4 mb-4">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400">
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="font-bold text-gray-800 dark:text-white">{p.name}</h3>
                <p className="text-xs text-green-600 dark:text-green-400 font-bold uppercase tracking-wider">{ROLE_LABELS[p.role]}</p>
              </div>
            </div>
            <div className="space-y-2 text-sm text-gray-500 dark:text-gray-400">
              <div className="flex items-center gap-2">
                <Activity size={14} />
                <span>Registro: {p.registrationNumber}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock size={14} />
                <span>Admissão: {p.admissionDate ? format(parseISO(p.admissionDate), 'dd/MM/yyyy') : 'N/A'}</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 size={14} className={p.status === 'ATIVO' ? 'text-green-500' : 'text-red-500'} />
                <span>Status: {p.status}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[110] flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 my-8"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastrar Profissional</h3>
                <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAdd} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nome Completo</label>
                    <input 
                      required
                      type="text"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.name || ''}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Cargo/Função</label>
                    <select 
                      required
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.role || ''}
                      onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Número de Registro (COREN, CRM, etc.)</label>
                    <input 
                      required
                      type="text"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.registrationNumber || ''}
                      onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Telefone</label>
                    <input 
                      required
                      type="tel"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">E-mail</label>
                    <input 
                      required
                      type="email"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.email || ''}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Data de Admissão</label>
                    <input 
                      required
                      type="date"
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.admissionDate || ''}
                      onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Endereço Completo</label>
                  <textarea 
                    required
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white h-24 resize-none"
                    value={formData.address || ''}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Observações</label>
                  <textarea 
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white h-24 resize-none"
                    value={formData.observations || ''}
                    onChange={(e) => setFormData({...formData, observations: e.target.value})}
                  />
                </div>
                <button 
                  type="submit"
                  className="w-full py-4 bg-green-600 text-white font-bold rounded-2xl shadow-lg hover:bg-green-700 transition-all"
                >
                  Confirmar Cadastro
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardSection = ({ elderly, communityElderly, caregivers, evolutions, volunteers, financialRecords, user, events, theme, onViewSchedule }: { 
  elderly: Elderly[], 
  communityElderly: CommunityElderly[],
  caregivers: Caregiver[],
  evolutions: EvolutionRecord[], 
  volunteers: Volunteer[],
  financialRecords: FinancialRecord[],
  user: User, 
  events: CalendarEvent[], 
  theme: 'light' | 'dark',
  onViewSchedule: () => void
}) => {
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return {
        name: format(d, 'MMM', { locale: ptBR }),
        monthKey: format(d, 'yyyy-MM'),
        atendimentos: 0,
        saude: 0
      };
    }).reverse();

    evolutions.forEach(ev => {
      const monthKey = ev.date.substring(0, 7);
      const monthData = last6Months.find(m => m.monthKey === monthKey);
      if (monthData) {
        monthData.atendimentos++;
        if (ev.professionalRole === 'ENFERMEIRA' || ev.professionalRole === 'FISIOTERAPEUTA') {
          monthData.saude++;
        }
      }
    });

    return last6Months;
  }, [evolutions]);

  const activeVolunteers = volunteers.filter(v => v.status === 'ATIVO').length;
  
  const monthlyBalance = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthRecords = financialRecords.filter(r => r.date.startsWith(currentMonth));
    const income = monthRecords.filter(r => r.type === 'RECEITA').reduce((acc, curr) => acc + curr.amount, 0);
    const expense = monthRecords.filter(r => r.type === 'DESPESA').reduce((acc, curr) => acc + curr.amount, 0);
    return income - expense;
  }, [financialRecords]);

  const stats = [
    { label: 'Total de Idosos', value: elderly.length.toString(), icon: Users, color: 'bg-blue-500' },
    { label: 'Idosos da Comunidade', value: communityElderly.length.toString(), icon: BookOpen, color: 'bg-indigo-500' },
    { label: 'Cuidadores Cadastrados', value: caregivers.length.toString(), icon: Briefcase, color: 'bg-purple-500' },
    { label: 'Evoluções/Mês', value: evolutions.filter(e => e.date.startsWith(format(new Date(), 'yyyy-MM'))).length.toString(), icon: Activity, color: 'bg-green-500' },
    { label: 'Voluntários Ativos', value: activeVolunteers.toString(), icon: Heart, color: 'bg-red-500' },
  ];

  if (user.role === 'PRESIDENTE') {
    stats.push({ 
      label: 'Saldo Mensal', 
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(monthlyBalance), 
      icon: DollarSign, 
      color: 'bg-yellow-500' 
    });
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
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-4"
          >
            <div className={cn("p-3 rounded-xl text-white shadow-lg", stat.color)}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">{stat.label}</p>
              <p className="text-2xl font-bold text-gray-800 dark:text-white">{stat.value}</p>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <TrendingUp className="text-green-600" size={20} />
            Evolução de Atendimentos
          </h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#f0f0f0'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '12px', 
                    border: 'none', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    backgroundColor: theme === 'dark' ? '#1f2937' : '#ffffff',
                    color: theme === 'dark' ? '#ffffff' : '#000000'
                  }}
                />
                <Line type="monotone" dataKey="atendimentos" stroke="#16a34a" strokeWidth={3} dot={{ r: 4, fill: '#16a34a' }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="saude" stroke="#3b82f6" strokeWidth={3} dot={{ r: 4, fill: '#3b82f6' }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
            <Calendar className="text-green-600" size={20} />
            Próximos Eventos
          </h3>
          <div className="space-y-4">
            {(upcomingEvents || []).length > 0 ? (upcomingEvents || []).map((ev, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors border border-transparent hover:border-gray-100 dark:hover:border-gray-700">
                <div className="flex flex-col items-center justify-center w-12 h-12 bg-green-50 dark:bg-green-900/30 rounded-xl text-green-700 dark:text-green-400">
                  <span className="text-[10px] font-bold uppercase">{format(parseISO(ev.date), 'MMM', { locale: ptBR })}</span>
                  <span className="text-lg font-bold leading-none">{format(parseISO(ev.date), 'dd')}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <h4 className="font-bold text-gray-800 dark:text-white text-sm truncate">{ev.title}</h4>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 font-bold uppercase">{ev.type}</p>
                </div>
              </div>
            )) : (
              <div className="text-center py-8 text-gray-400">
                <p className="text-sm">Sem eventos próximos</p>
              </div>
            )}
          </div>
          <button 
            onClick={onViewSchedule}
            className="w-full mt-6 py-2 text-xs font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
          >
            Ver Cronograma Completo
          </button>
        </div>
      </div>
    </div>
  );
};

const ElderlySection = ({ elderly, evolutions, pias, showToast }: { elderly: Elderly[], evolutions: EvolutionRecord[], pias: PIA[], showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElderly, setSelectedElderly] = useState<Elderly | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingElderly, setEditingElderly] = useState<Elderly | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; type: 'EVOLUCAO' | 'PIA' | 'ELDERLY'; id: string } | null>(null);

  const generateElderlyListPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'CPF', 'Data Nasc.', 'Status'];
      const data = (elderly || []).map(e => [
        e.name || 'N/A',
        e.cpf || 'N/A',
        e.birthDate ? format(parseISO(e.birthDate), 'dd/MM/yyyy') : 'N/A',
        e.status === 'ATIVO' ? 'Ativo' : 'Inativo'
      ]);

      generateModernPDF({
        title: 'Lista de Acolhidos',
        subtitle: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        columns,
        data,
        fileName: 'lista_acolhidos'
      });
      showToast('Lista de acolhidos exportada com sucesso!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar lista de acolhidos', 'error');
    } finally {
      setExporting(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    fullName: '',
    cpf: '',
    birthCertificate: '',
    lastProfession: '',
    birthDate: '',
    entryDate: new Date().toISOString().split('T')[0],
    status: 'ATIVO' as const
  });

  const handleAddElderly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.birthDate) return;

    setLoading(true);
    try {
      if (isEditModalOpen && editingElderly) {
        await updateDoc(doc(db, 'elderly', editingElderly.id), {
          ...formData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'elderly'), {
          ...formData,
          createdAt: new Date().toISOString()
        });
      }
      setIsAddModalOpen(false);
      setIsEditModalOpen(false);
      setEditingElderly(null);
      setFormData({
        name: '',
        fullName: '',
        cpf: '',
        birthCertificate: '',
        lastProfession: '',
        birthDate: '',
        entryDate: new Date().toISOString().split('T')[0],
        status: 'ATIVO'
      });
    } catch (err) {
      handleFirestoreError(err, isEditModalOpen ? OperationType.UPDATE : OperationType.CREATE, 'elderly');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteElderly = async () => {
    if (!deleteConfirm) return;
    try {
      await deleteDoc(doc(db, 'elderly', deleteConfirm.id));
      setDeleteConfirm(null);
      setSelectedElderly(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `elderly/${deleteConfirm.id}`);
    }
  };

  const openEditModal = (e: Elderly) => {
    setEditingElderly(e);
    setFormData({
      name: e.name,
      fullName: e.fullName || '',
      cpf: e.cpf || '',
      birthCertificate: e.birthCertificate || '',
      lastProfession: e.lastProfession || '',
      birthDate: e.birthDate,
      entryDate: e.entryDate,
      status: e.status
    });
    setIsEditModalOpen(true);
  };

  const filtered = elderly.filter(e => e.name?.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="space-y-6">
      <ConfirmationModal 
        isOpen={deleteConfirm?.isOpen || false}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm?.type === 'ELDERLY') {
            await handleDeleteElderly();
          } else {
            // Logic to delete other types if needed
            console.log(`Deleting ${deleteConfirm?.type} with id ${deleteConfirm?.id}`);
          }
        }}
        title={deleteConfirm?.type === 'PIA' ? 'Excluir PIA' : deleteConfirm?.type === 'ELDERLY' ? 'Excluir Acolhido' : 'Excluir Evolução'}
        message={deleteConfirm?.type === 'PIA' 
          ? 'Tem certeza que deseja excluir este Plano Individual de Atendimento? Esta ação não pode ser desfeita.' 
          : deleteConfirm?.type === 'ELDERLY'
          ? 'Tem certeza que deseja excluir este acolhido? Todos os registros vinculados permanecerão no banco, mas o perfil será removido.'
          : 'Tem certeza que deseja excluir este registro de evolução profissional?'}
      />

      <AnimatePresence>
        {(isAddModalOpen || isEditModalOpen) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl p-8 shadow-2xl overflow-y-auto max-h-[90vh]"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  {isEditModalOpen ? <Edit2 className="text-blue-600" /> : <Plus className="text-green-600" />}
                  {isEditModalOpen ? 'Editar Acolhido' : 'Novo Acolhido'}
                </h3>
                <button onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={24} className="text-gray-400 dark:text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleAddElderly} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome Curto (Apelido)</label>
                    <input 
                      required
                      type="text" 
                      placeholder="Ex: Dona Maria"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.name}
                      onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome Completo</label>
                    <input 
                      type="text" 
                      placeholder="Nome completo conforme documento"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.fullName}
                      onChange={e => setFormData({...formData, fullName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">CPF</label>
                    <input 
                      type="text" 
                      placeholder="000.000.000-00"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.cpf}
                      onChange={e => setFormData({...formData, cpf: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Certidão de Nascimento</label>
                    <input 
                      type="text" 
                      placeholder="Nº da Certidão"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.birthCertificate}
                      onChange={e => setFormData({...formData, birthCertificate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Data de Nascimento</label>
                    <input 
                      required
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.birthDate}
                      onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Data de Entrada</label>
                    <input 
                      required
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.entryDate}
                      onChange={e => setFormData({...formData, entryDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Última Profissão</label>
                    <input 
                      type="text" 
                      placeholder="Ex: Agricultor"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.lastProfession}
                      onChange={e => setFormData({...formData, lastProfession: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Status</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.status}
                      onChange={e => setFormData({...formData, status: e.target.value as any})}
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                </div>

                <div className="pt-6 flex gap-4">
                  <button 
                    type="button"
                    onClick={() => { setIsAddModalOpen(false); setIsEditModalOpen(false); }}
                    className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button 
                    disabled={loading}
                    className={cn(
                      "flex-1 py-3 text-white font-bold rounded-xl shadow-lg transition-colors disabled:opacity-50",
                      isEditModalOpen ? "bg-blue-600 hover:bg-blue-700" : "bg-green-600 hover:bg-green-700"
                    )}
                  >
                    {loading ? 'Salvando...' : isEditModalOpen ? 'Salvar Alterações' : 'Cadastrar Acolhido'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acompanhamento de Idosos</h2>
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-gray-500" size={18} />
            <input 
              type="text"
              placeholder="Buscar idoso..."
              className="pl-10 pr-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl focus:ring-2 focus:ring-green-500 outline-none w-full md:w-64 text-gray-800 dark:text-white"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <button 
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-xl text-sm font-bold hover:bg-green-700 transition-all shadow-md"
            >
              <Plus size={18} />
              Novo Acolhido
            </button>
            <button 
              onClick={generateElderlyListPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50" 
              title="Exportar Lista em PDF"
            >
              <FileDown size={18} />
              PDF
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
            className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-md transition-all cursor-pointer group"
          >
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xl group-hover:bg-green-600 group-hover:text-white transition-colors">
                {elderly.name.charAt(0)}
              </div>
              <div>
                <h4 className="font-bold text-gray-800 dark:text-white">{elderly.name}</h4>
                <p className="text-sm text-gray-500 dark:text-gray-400">Entrada: {new Date(elderly.entryDate).toLocaleDateString('pt-BR')}</p>
                <span className="inline-block mt-2 px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full uppercase">
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
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-8">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-24 h-24 bg-green-600 rounded-2xl flex items-center justify-center text-white text-3xl font-bold shadow-lg">
                      {selectedElderly.name.charAt(0)}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">{selectedElderly.fullName || selectedElderly.name}</h2>
                      <div className="flex flex-wrap gap-x-6 gap-y-2 mt-2">
                        <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                          <Calendar size={14} />
                          Nascimento: {new Date(selectedElderly.birthDate).toLocaleDateString('pt-BR')}
                        </p>
                        <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                          <Activity size={14} />
                          Idade: {(() => {
                            const birth = new Date(selectedElderly.birthDate);
                            const today = new Date();
                            let age = today.getFullYear() - birth.getFullYear();
                            const m = today.getMonth() - birth.getMonth();
                            if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
                            return age;
                          })()} anos
                        </p>
                        {selectedElderly.cpf && (
                          <p className="text-gray-500 dark:text-gray-400 text-sm flex items-center gap-1">
                            <Shield size={14} />
                            CPF: {selectedElderly.cpf}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 mt-4">
                        <span className="px-3 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-xs font-bold rounded-full uppercase tracking-wider">PIA ATIVO</span>
                        <span className="px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold rounded-full uppercase tracking-wider">ESTÁVEL</span>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedElderly(null)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                    <X size={24} className="text-gray-400 dark:text-gray-500" />
                  </button>
                </div>

                <div className="flex gap-4 mb-8">
                  <button 
                    onClick={() => openEditModal(selectedElderly)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-xs font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all"
                  >
                    <Edit2 size={14} />
                    Editar Perfil
                  </button>
                  <button 
                    onClick={() => setDeleteConfirm({ isOpen: true, type: 'ELDERLY', id: selectedElderly.id })}
                    className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-xs font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
                  >
                    <Trash2 size={14} />
                    Excluir Acolhido
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  <div className="md:col-span-2 space-y-8">
                    <section className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <UserCircle className="text-blue-600 dark:text-blue-400" size={20} />
                        Informações Pessoais
                      </h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Última Profissão</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedElderly.lastProfession || 'Não informada'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Certidão de Nascimento</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{selectedElderly.birthCertificate || 'Não informada'}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Data de Entrada</p>
                          <p className="text-sm font-medium text-gray-700 dark:text-gray-300">{new Date(selectedElderly.entryDate).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Status Institucional</p>
                          <p className="text-sm font-bold text-green-600 dark:text-green-400">{selectedElderly.status}</p>
                        </div>
                      </div>
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <FileText className="text-green-600 dark:text-green-400" size={20} />
                        Plano Individual de Atendimento (PIA)
                      </h3>
                      {pias.filter(p => p.elderlyId === selectedElderly.id).length > 0 ? (
                        pias.filter(p => p.elderlyId === selectedElderly.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 1).map(pia => (
                          <div key={pia.id} className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                              <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Situação Financeira</p>
                                <div className="flex flex-wrap gap-2">
                                  {pia.hasBPC && <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded uppercase">BPC</span>}
                                  {pia.hasPension && <span className="px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 text-[10px] font-bold rounded uppercase">APOSENTADO</span>}
                                  {pia.hasLoans && <span className="px-2 py-1 bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-[10px] font-bold rounded uppercase">EMPRÉSTIMO</span>}
                                </div>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Vínculo Familiar</p>
                                <span className="px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 text-[10px] font-bold rounded uppercase">{pia.familyInvolvement} ENVOLVIMENTO</span>
                              </div>
                            </div>
                            <div className="space-y-4">
                              <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Objetivos</p>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{pia.objectives}</p>
                              </div>
                              <div>
                                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-1">Ações Estratégicas</p>
                                <p className="text-gray-700 dark:text-gray-300 text-sm">{pia.actions}</p>
                              </div>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500 text-sm">
                          Nenhum PIA registrado para este acolhido.
                        </div>
                      )}
                    </section>

                    <section>
                      <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="text-blue-600 dark:text-blue-400" size={20} />
                        Evolução Profissional Recente
                      </h3>
                      <div className="space-y-4">
                        {evolutions.filter(ev => ev.elderlyId === selectedElderly.id).length > 0 ? (
                          evolutions.filter(ev => ev.elderlyId === selectedElderly.id).slice(0, 5).map(ev => (
                            <div key={ev.id} className="bg-white dark:bg-gray-800 p-4 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm group">
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-xs font-bold text-green-600 dark:text-green-400 uppercase">{ROLE_LABELS[ev.professionalRole]}</span>
                                <div className="flex items-center gap-3">
                                  <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(ev.date).toLocaleDateString('pt-BR')}</span>
                                  <button 
                                    onClick={() => setDeleteConfirm({ isOpen: true, type: 'EVOLUCAO', id: ev.id })}
                                    className="p-1 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                                  >
                                    <Trash2 size={14} />
                                  </button>
                                </div>
                              </div>
                              <p className="text-sm text-gray-700 dark:text-gray-300">{ev.content}</p>
                            </div>
                          ))
                        ) : (
                          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800 text-center text-gray-400 dark:text-gray-500 text-sm">
                            Nenhum registro de evolução encontrado.
                          </div>
                        )}
                      </div>
                    </section>
                  </div>

                  <div className="space-y-8">
                    <div className="bg-green-50 dark:bg-green-900/20 p-6 rounded-2xl border border-green-100 dark:border-green-900/30">
                      <h4 className="font-bold text-green-800 dark:text-green-400 mb-4">Informações de Saúde</h4>
                      <div className="space-y-3">
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 dark:text-green-500">Tipo Sanguíneo</span>
                          <span className="font-bold text-green-800 dark:text-green-300">O+</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 dark:text-green-500">Alergias</span>
                          <span className="font-bold text-red-600 dark:text-red-400">Dipirona</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-green-600 dark:text-green-500">Medicação</span>
                          <span className="font-bold text-green-800 dark:text-green-300">Contínua (3)</span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl border border-blue-100 dark:border-blue-900/30">
                      <h4 className="font-bold text-blue-800 dark:text-blue-400 mb-4">Contatos de Emergência</h4>
                      <div className="space-y-4">
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-500">Filho: Carlos Silva</p>
                          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">(98) 98877-6655</p>
                        </div>
                        <div>
                          <p className="text-xs text-blue-600 dark:text-blue-500">Filha: Ana Silva</p>
                          <p className="text-sm font-bold text-blue-800 dark:text-blue-300">(98) 99911-2233</p>
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

const PIAForm = ({ user, elderly, showToast }: { user: User, elderly: Elderly[], showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formData, setFormData] = useState<Omit<PIA, 'id'>>({
    elderlyId: '',
    date: new Date().toISOString().split('T')[0],
    responsible: user.name,
    status: 'EM_ANDAMENTO',
    hasBPC: false,
    hasPension: false,
    hasLoans: false,
    loanDetails: '',
    hasProperty: false,
    monthlyIncome: 0,
    familyInvolvement: 'MEDIO',
    familyObservations: '',
    healthStatus: '',
    medications: '',
    mobilityStatus: '',
    objectives: '',
    actions: '',
    observations: ''
  });

  const generatePIADoc = async (fileFormat: 'pdf' | 'doc') => {
    if (!formData.elderlyId) {
      showToast('Selecione um idoso primeiro', 'error');
      return;
    }
    const selectedElderly = elderly.find(e => e.id === formData.elderlyId);
    if (!selectedElderly) return;

    setExporting(true);
    try {
      if (fileFormat === 'pdf') {
        const columns = ['Campo', 'Informação'];
        const data = [
          ['Idoso', selectedElderly.name],
          ['Data', format(parseISO(formData.date), 'dd/MM/yyyy')],
          ['Responsável', formData.responsible],
          ['', ''], // Spacer
          ['SITUAÇÃO SOCIOECONÔMICA', ''],
          ['Renda Mensal', `R$ ${formData.monthlyIncome}`],
          ['Possui BPC', formData.hasBPC ? 'Sim' : 'Não'],
          ['Possui Aposentadoria', formData.hasPension ? 'Sim' : 'Não'],
          ['', ''], // Spacer
          ['SAÚDE E MOBILIDADE', ''],
          ['Estado de Saúde', formData.healthStatus],
          ['Medicações', formData.medications],
          ['Mobilidade', formData.mobilityStatus],
          ['', ''], // Spacer
          ['PLANEJAMENTO', ''],
          ['Objetivos', formData.objectives],
          ['Ações', formData.actions]
        ];

        generateModernPDF({
          title: 'Plano Individual de Atendimento (PIA)',
          subtitle: `Acolhido: ${selectedElderly.name} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
          columns,
          data,
          fileName: `PIA_${selectedElderly.name.replace(/\s+/g, '_')}`
        });
      } else {
        const content = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>PIA - OAMI</title></head>
          <body>
            <h1 style="color: #16a34a; text-align: center;">Plano Individual de Atendimento (PIA)</h1>
            <p><b>Idoso:</b> ${selectedElderly.name}</p>
            <p><b>Data:</b> ${new Date(formData.date).toLocaleDateString('pt-BR')}</p>
            <p><b>Responsável:</b> ${formData.responsible}</p>
            <hr/>
            <h2>Situação Socioeconômica</h2>
            <p><b>Renda Mensal:</b> R$ ${formData.monthlyIncome}</p>
            <p><b>Possui BPC:</b> ${formData.hasBPC ? 'Sim' : 'Não'}</p>
            <p><b>Possui Aposentadoria:</b> ${formData.hasPension ? 'Sim' : 'Não'}</p>
            <p><b>Empréstimos:</b> ${formData.hasLoans ? 'Sim (' + formData.loanDetails + ')' : 'Não'}</p>
            <hr/>
            <h2>Saúde e Mobilidade</h2>
            <p><b>Estado de Saúde:</b> ${formData.healthStatus}</p>
            <p><b>Medicações:</b> ${formData.medications}</p>
            <p><b>Mobilidade:</b> ${formData.mobilityStatus}</p>
            <hr/>
            <h2>Planejamento</h2>
            <p><b>Objetivos:</b> ${formData.objectives}</p>
            <p><b>Ações:</b> ${formData.actions}</p>
            <p><b>Observações:</b> ${formData.observations}</p>
          </body>
          </html>
        `;
        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `PIA_${selectedElderly.name.replace(/\s+/g, '_')}.doc`;
        link.click();
      }
      showToast(`PIA exportado com sucesso em ${fileFormat.toUpperCase()}!`);
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar documento', 'error');
    } finally {
      setExporting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.elderlyId) return;

    setLoading(true);
    try {
      await addDoc(collection(db, 'pias'), {
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      });
      // Reset form or show success
      showToast('Plano Individual de Atendimento (PIA) salvo com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pias');
      showToast('Erro ao salvar PIA', 'error');
    } finally {
      setLoading(false);
    }
  };

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
      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
        <div className="flex justify-between items-center">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white">Novo Plano Individual de Atendimento (PIA)</h3>
          <div className="flex gap-2">
            <button 
              type="button" 
              onClick={() => generatePIADoc('pdf')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Exportar PDF
            </button>
            <button 
              type="button" 
              onClick={() => generatePIADoc('doc')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Exportar DOC
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Idoso Selecionado</label>
            <select 
              required
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
              value={formData.elderlyId}
              onChange={e => setFormData({...formData, elderlyId: e.target.value})}
            >
              <option value="">Selecione o Idoso...</option>
              {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
          </div>
          <div className="space-y-4">
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300">Data do Plano</label>
            <input 
              required
              type="date" 
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white" 
              value={formData.date}
              onChange={e => setFormData({...formData, date: e.target.value})}
            />
          </div>
        </div>

        {/* Situação Financeira */}
        <section className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
          <h4 className="font-bold text-green-800 dark:text-green-400 flex items-center gap-2">
            <DollarSign size={18} />
            Situação Socioeconômica e Financeira
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500" 
                checked={formData.hasBPC}
                onChange={e => setFormData({...formData, hasBPC: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui BPC?</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500" 
                checked={formData.hasPension}
                onChange={e => setFormData({...formData, hasPension: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui Aposentadoria?</span>
            </div>
            <div className="flex items-center gap-3 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-green-600 rounded focus:ring-green-500" 
                checked={formData.hasProperty}
                onChange={e => setFormData({...formData, hasProperty: e.target.checked})}
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Possui Imóvel Próprio?</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Renda Mensal (R$)</label>
              <input 
                type="number" 
                placeholder="0,00" 
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white" 
                value={formData.monthlyIncome}
                onChange={e => setFormData({...formData, monthlyIncome: Number(e.target.value)})}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Possui Empréstimos? Detalhe:</label>
              <input 
                type="text" 
                placeholder="Ex: Consignado, 24 parcelas..." 
                className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white" 
                value={formData.loanDetails}
                onChange={e => setFormData({...formData, loanDetails: e.target.value})}
              />
            </div>
          </div>
        </section>

        {/* Acompanhamento Familiar */}
        <section className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-blue-800 dark:text-blue-400 flex items-center gap-2">
              <Users size={18} />
              Acompanhamento Familiar
            </h4>
            <TranscriptionButton 
              onTranscribe={(text) => setFormData({...formData, familyObservations: (formData.familyObservations ? formData.familyObservations + '\n' : '') + text})} 
              label="Digitalizar Família"
            />
          </div>
          <div className="space-y-4">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Nível de Envolvimento da Família</label>
            <div className="flex gap-4">
              {['ALTO', 'MEDIO', 'BAIXO', 'NENHUM'].map(level => (
                <label key={level} className={cn(
                  "flex-1 flex items-center justify-center p-3 border rounded-xl cursor-pointer transition-all",
                  formData.familyInvolvement === level ? "bg-blue-50 dark:bg-blue-900/20 border-blue-500 text-blue-700 dark:text-blue-400" : "border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800"
                )}>
                  <input 
                    type="radio" 
                    name="family" 
                    className="hidden" 
                    value={level}
                    checked={formData.familyInvolvement === level}
                    onChange={e => setFormData({...formData, familyInvolvement: e.target.value as any})}
                  />
                  <span className="text-xs font-bold">{level}</span>
                </label>
              ))}
            </div>
            <textarea 
              placeholder="Observações sobre a dinâmica familiar e visitas..."
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 h-24 text-gray-800 dark:text-white"
              value={formData.familyObservations}
              onChange={e => setFormData({...formData, familyObservations: e.target.value})}
            />
          </div>
        </section>

        {/* Saúde e Bem-estar */}
        <section className="space-y-6 pt-6 border-t border-gray-50 dark:border-gray-800">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-red-800 dark:text-red-400 flex items-center gap-2">
              <Activity size={18} />
              Saúde e Bem-estar
            </h4>
            <TranscriptionButton 
              onTranscribe={(text) => setFormData({...formData, healthStatus: (formData.healthStatus ? formData.healthStatus + '\n' : '') + text})} 
              label="Digitalizar Saúde"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <textarea 
              placeholder="Estado Geral de Saúde..."
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 h-24 text-gray-800 dark:text-white"
              value={formData.healthStatus}
              onChange={e => setFormData({...formData, healthStatus: e.target.value})}
            />
            <textarea 
              placeholder="Medicações em uso e dosagens..."
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 h-24 text-gray-800 dark:text-white"
              value={formData.medications}
              onChange={e => setFormData({...formData, medications: e.target.value})}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Mobilidade e Autonomia</label>
            <input 
              type="text" 
              placeholder="Ex: Deambula com auxílio de andador..." 
              className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-gray-800 dark:text-white" 
              value={formData.mobilityStatus}
              onChange={e => setFormData({...formData, mobilityStatus: e.target.value})}
            />
          </div>
        </section>

        {/* Objetivos e Ações */}
        <section className="space-y-6 pt-6 border-t border-gray-50">
          <div className="flex justify-between items-center">
            <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <FileText size={18} />
              Plano de Ação e Objetivos
            </h4>
            <TranscriptionButton 
              onTranscribe={(text) => setFormData({...formData, objectives: (formData.objectives ? formData.objectives + '\n' : '') + text})} 
              label="Digitalizar Objetivos"
            />
          </div>
          <div className="space-y-4">
            <textarea 
              placeholder="Objetivos do atendimento para o próximo trimestre..."
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white"
              value={formData.objectives}
              onChange={e => setFormData({...formData, objectives: e.target.value})}
            />
            <textarea 
              placeholder="Ações estratégicas a serem desenvolvidas pela equipe..."
              className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white"
              value={formData.actions}
              onChange={e => setFormData({...formData, actions: e.target.value})}
            />
          </div>
        </section>

        <div className="pt-8 flex gap-4">
          <button 
            disabled={loading}
            className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1 disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Salvar Plano Individual de Atendimento (PIA)'}
          </button>
          <div className="flex gap-2">
            <button 
              type="button"
              onClick={() => generatePIADoc('pdf')}
              disabled={exporting}
              className="px-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold py-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              title="Exportar PDF"
            >
              <FileDown size={20} />
            </button>
            <button 
              type="button"
              onClick={() => generatePIADoc('doc')}
              disabled={exporting}
              className="px-6 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold py-4 rounded-2xl border border-gray-200 dark:border-gray-700 hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              title="Exportar DOC"
            >
              <FileText size={20} />
            </button>
          </div>
          <button 
            type="button"
            onClick={() => setIsDeleteModalOpen(true)}
            className="px-6 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 font-bold py-4 rounded-2xl border border-red-100 dark:border-red-900/30 hover:bg-red-100 dark:hover:bg-red-900/40 transition-all"
          >
            <Trash2 size={20} />
          </button>
        </div>
      </form>
    </div>
  );
};

const ProfessionalArea = ({ elderly, evolutions, user, showToast }: { 
  elderly: Elderly[], 
  evolutions: EvolutionRecord[], 
  user: User,
  showToast: (msg: string, type?: 'success' | 'error') => void
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'evolucao' | 'pia' | 'visitas'>('evolucao');
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string } | null>(null);
  const [exporting, setExporting] = useState(false);
  const [loading, setLoading] = useState(false);

  // Evolution Form State
  const [selectedElderly, setSelectedElderly] = useState('');
  const [evolutionType, setEvolutionType] = useState<'INDIVIDUAL' | 'GRUPO' | 'VISITA_DOMICILIAR'>('INDIVIDUAL');
  const [evolutionDate, setEvolutionDate] = useState(new Date().toISOString().split('T')[0]);
  const [evolutionContent, setEvolutionContent] = useState('');

  useEffect(() => {
    if (activeSubTab === 'visitas') {
      setEvolutionType('VISITA_DOMICILIAR');
    } else if (activeSubTab === 'evolucao') {
      setEvolutionType('INDIVIDUAL');
    }
  }, [activeSubTab]);

  const handleSaveEvolution = async () => {
    if (!selectedElderly || !evolutionContent) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'evolutions'), {
        elderlyId: selectedElderly,
        professionalId: user.id,
        professionalRole: user.role,
        date: evolutionDate,
        content: evolutionContent,
        type: evolutionType,
        createdAt: new Date().toISOString()
      });

      showToast('Registro de evolução salvo com sucesso!');
      setSelectedElderly('');
      setEvolutionContent('');
      setEvolutionDate(new Date().toISOString().split('T')[0]);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'evolutions');
      showToast('Erro ao salvar registro de evolução.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const generateProfessionalReportPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Data', 'Acolhido', 'Evolução'];
      const data = filteredEvolutions.map(ev => [
        format(parseISO(ev.date), 'dd/MM/yyyy'),
        elderly.find(e => e.id === ev.elderlyId)?.name || 'N/A',
        ev.content
      ]);

      generateModernPDF({
        title: `Relatório Mensal - ${ROLE_LABELS[user.role]}`,
        subtitle: `Profissional: ${user.name} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${user.role.toLowerCase()}`
      });
      showToast('Relatório profissional exportado com sucesso!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório profissional', 'error');
    } finally {
      setExporting(false);
    }
  };

  const filteredEvolutions = evolutions.filter(ev => ev.professionalRole === user.role);

  return (
    <div id="professional-area-top" className="space-y-8">
      <ConfirmationModal 
        isOpen={deleteConfirm?.isOpen || false}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await deleteDoc(doc(db, 'evolutions', deleteConfirm.id));
              showToast('Registro excluído com sucesso!');
            } catch (err) {
              handleFirestoreError(err, OperationType.DELETE, `evolutions/${deleteConfirm.id}`);
              showToast('Erro ao excluir registro', 'error');
            }
          }
        }}
        title="Excluir Registro de Evolução"
        message="Tem certeza que deseja excluir este registro de evolução técnica? Esta ação não pode ser desfeita."
      />
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-600 rounded-2xl text-white shadow-lg">
              <UserCircle size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Área da {ROLE_LABELS[user.role]}</h2>
              <p className="text-gray-500 dark:text-gray-400">Registro de atividades e acompanhamento técnico</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={generateProfessionalReportPDF}
              disabled={exporting}
              className="p-3 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-green-600 dark:hover:text-green-400 rounded-xl transition-all disabled:opacity-50" 
              title="Exportar Relatório Mensal"
            >
              <FileDown size={20} />
            </button>
          </div>
        </div>

        <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 mb-8">
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
                  : "text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
              )}
            >
              <tab.icon size={16} />
              {tab.label}
            </button>
          ))}
        </div>

        {activeSubTab === 'pia' ? (
          <PIAForm user={user} elderly={elderly} showToast={showToast} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-2xl border border-gray-100 dark:border-gray-800">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-bold text-gray-800 dark:text-white">
                    {activeSubTab === 'visitas' ? 'Novo Registro de Visita/Atendimento' : 'Novo Registro de Evolução'}
                  </h3>
                  <div className="flex gap-2 items-center">
                    <TranscriptionButton 
                      onTranscribe={(text) => setEvolutionContent((evolutionContent ? evolutionContent + '\n' : '') + text)} 
                      label="Digitalizar Relatório"
                    />
                    <button className="text-xs font-bold text-green-600 dark:text-green-400 hover:underline flex items-center gap-1">
                      <FileDown size={14} />
                      Modelo DOC
                    </button>
                  </div>
                </div>
                <div className="space-y-4">
                  <select 
                    value={selectedElderly}
                    onChange={e => setSelectedElderly(e.target.value)}
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                  >
                    <option value="">Selecione o Idoso...</option>
                    {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                  <div className="flex gap-4">
                    <select 
                      value={evolutionType}
                      onChange={e => setEvolutionType(e.target.value as any)}
                      className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                    >
                      <option value="INDIVIDUAL">Individual</option>
                      <option value="GRUPO">Grupo</option>
                      <option value="VISITA_DOMICILIAR">Visita Domiciliar</option>
                    </select>
                    <input 
                      type="date" 
                      value={evolutionDate}
                      onChange={e => setEvolutionDate(e.target.value)}
                      className="flex-1 p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white" 
                    />
                  </div>
                  <textarea 
                    placeholder="Descreva a evolução técnica..."
                    value={evolutionContent}
                    onChange={e => setEvolutionContent(e.target.value)}
                    className="w-full p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-32 text-gray-800 dark:text-white"
                  />
                  <button 
                    onClick={handleSaveEvolution}
                    disabled={loading}
                    className="w-full bg-green-600 text-white font-bold py-3 rounded-xl shadow-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : 'Salvar Registro'}
                  </button>
                </div>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Registros Recentes</h3>
                <div className="space-y-4">
                  {filteredEvolutions.map(ev => (
                    <div key={ev.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-800 group">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">
                            {elderly.find(e => e.id === ev.elderlyId)?.name || 'Desconhecido'}
                          </p>
                          <p className="text-[10px] text-gray-400 dark:text-gray-500">{new Date(ev.date).toLocaleDateString('pt-BR')}</p>
                        </div>
                        <button 
                          onClick={() => setDeleteConfirm({ isOpen: true, id: ev.id })}
                          className="p-1.5 text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 line-clamp-2">{ev.content}</p>
                    </div>
                  ))}
                  {filteredEvolutions.length === 0 && (
                    <p className="text-center text-gray-400 dark:text-gray-500 italic py-8">Nenhum registro encontrado no banco de dados.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h4 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                    <Bell className="text-orange-500" size={18} />
                    Pendências de Revisão
                  </h4>
                  <span className="px-2 py-0.5 bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 text-[10px] font-bold rounded-full">
                    3 Pendentes
                  </span>
                </div>
                <div className="space-y-3">
                  {[
                    { elderlyId: '1', name: 'Maria Silva', task: 'Revisão PIA Trimestral', due: 'Atrasado (2 dias)', status: 'OVERDUE', targetTab: 'pia' },
                    { elderlyId: '2', name: 'João Pereira', task: 'Relatório de Visita', due: 'Hoje', status: 'TODAY', targetTab: 'visitas' },
                    { elderlyId: '3', name: 'Francisca Oliveira', task: 'Evolução Semanal', due: 'Amanhã', status: 'UPCOMING', targetTab: 'evolucao' },
                  ].map((p, i) => (
                    <div 
                      key={i} 
                      onClick={() => {
                        setSelectedElderly(p.elderlyId);
                        setActiveSubTab(p.targetTab as any);
                        showToast(`Navegando para: ${p.task} - ${p.name}`);
                        document.getElementById('professional-area-top')?.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className={cn(
                        "p-3 rounded-xl border transition-all hover:shadow-md cursor-pointer group",
                        p.status === 'OVERDUE' ? "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900/30 hover:border-red-300" : 
                        p.status === 'TODAY' ? "bg-orange-50 dark:bg-orange-900/20 border-orange-100 dark:border-orange-900/30 hover:border-orange-300" : 
                        "bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-900/30 hover:border-blue-300"
                      )}
                    >
                      <div className="flex justify-between items-start mb-1">
                        <p className={cn(
                          "text-xs font-bold group-hover:underline",
                          p.status === 'OVERDUE' ? "text-red-800 dark:text-red-400" : 
                          p.status === 'TODAY' ? "text-orange-800 dark:text-orange-400" : 
                          "text-blue-800 dark:text-blue-400"
                        )}>{p.name}</p>
                        {p.status === 'OVERDUE' && <AlertCircle size={14} className="text-red-500 animate-pulse" />}
                      </div>
                      <p className={cn(
                        "text-xs",
                        p.status === 'OVERDUE' ? "text-red-600 dark:text-red-500" : 
                        p.status === 'TODAY' ? "text-orange-600 dark:text-orange-500" : 
                        "text-blue-600 dark:text-blue-500"
                      )}>{p.task}</p>
                      <div className="flex justify-between items-center mt-2">
                        <div className="flex items-center gap-1">
                          <Clock size={10} className={p.status === 'OVERDUE' ? "text-red-400 dark:text-red-500" : "text-gray-400 dark:text-gray-500"} />
                          <p className={cn(
                            "text-[10px] font-bold",
                            p.status === 'OVERDUE' ? "text-red-500" : 
                            p.status === 'TODAY' ? "text-orange-500" : 
                            "text-blue-500"
                          )}>{p.due}</p>
                        </div>
                        <ChevronRight size={12} className="text-gray-400 group-hover:text-gray-600 transition-colors" />
                      </div>
                    </div>
                  ))}
                </div>
                <button className="w-full mt-4 py-2 text-xs font-bold text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 transition-colors border-t border-gray-50 dark:border-gray-800 pt-4">
                  Ver todas as pendências
                </button>
              </div>

              <div className="bg-white dark:bg-gray-900 p-6 rounded-2xl border border-gray-100 dark:border-gray-800 shadow-sm">
                <h4 className="font-bold text-gray-800 dark:text-white mb-4 flex items-center gap-2">
                  <CheckCircle2 className="text-green-500" size={18} />
                  Metas do Mês
                </h4>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Atendimentos Individuais</span>
                      <span className="font-bold text-green-600 dark:text-green-400">12/15</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-green-500 h-full w-[80%]" />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-500 dark:text-gray-400">Visitas Domiciliares</span>
                      <span className="font-bold text-blue-600 dark:text-blue-400">4/5</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
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

const FinancialSection = ({ financialRecords, user, showToast }: { 
  financialRecords?: FinancialRecord[], 
  user: User,
  showToast: (msg: string, type?: 'success' | 'error') => void 
}) => {
  const records = financialRecords || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    amount: '',
    type: 'RECEITA' as 'RECEITA' | 'DESPESA',
    category: ''
  });

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'financial'), {
        ...formData,
        amount: Number(formData.amount),
        createdAt: new Date().toISOString(),
        createdBy: user.id
      });
      showToast('Lançamento financeiro salvo com sucesso!');
      setIsModalOpen(false);
      setFormData({
        date: new Date().toISOString().split('T')[0],
        description: '',
        amount: '',
        type: 'RECEITA',
        category: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'financial');
      showToast('Erro ao salvar lançamento financeiro.', 'error');
    } finally {
      setLoading(false);
    }
  };
  
  const chartData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return {
        month: format(d, 'MMM', { locale: ptBR }),
        monthKey: format(d, 'yyyy-MM'),
        receitas: 0,
        despesas: 0
      };
    }).reverse();

    records.forEach(r => {
      const monthKey = r.date.substring(0, 7);
      const monthData = last6Months.find(m => m.monthKey === monthKey);
      if (monthData) {
        if (r.type === 'RECEITA') monthData.receitas += r.amount;
        else monthData.despesas += r.amount;
      }
    });

    return last6Months;
  }, [records]);

  const monthlySummary = useMemo(() => {
    const currentMonth = format(new Date(), 'yyyy-MM');
    const monthRecords = records.filter(r => r.date.startsWith(currentMonth));
    const receitas = monthRecords.filter(r => r.type === 'RECEITA').reduce((acc, curr) => acc + curr.amount, 0);
    const despesas = monthRecords.filter(r => r.type === 'DESPESA').reduce((acc, curr) => acc + curr.amount, 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [records]);

  const generateFinancialDoc = async (fileFormat: 'pdf' | 'doc') => {
    setExporting(true);
    try {
      if (fileFormat === 'pdf') {
        const columns = ['Mês', 'Receitas', 'Despesas', 'Saldo'];
        const data = chartData.map(d => [
          d.month,
          `R$ ${d.receitas}`,
          `R$ ${d.despesas}`,
          `R$ ${d.receitas - d.despesas}`
        ]);

        generateModernPDF({
          title: 'Relatório Financeiro',
          subtitle: `Resumo do Fluxo de Caixa (Últimos 6 Meses) - Gerado em ${new Date().toLocaleDateString('pt-BR')}`,
          columns,
          data,
          fileName: 'relatorio_financeiro'
        });
      } else {
        const content = `
          <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
          <head><meta charset='utf-8'><title>Relatório Financeiro - OAMI</title></head>
          <body>
            <h1 style="color: #16a34a; text-align: center;">Relatório Financeiro OAMI</h1>
            <hr/>
            <h2>Resumo do Fluxo de Caixa (Últimos 6 Meses)</h2>
            <table border="1" style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f3f4f6;">
                  <th>Mês</th>
                  <th>Receitas</th>
                  <th>Despesas</th>
                  <th>Saldo</th>
                </tr>
              </thead>
              <tbody>
                ${chartData.map(data => `
                  <tr>
                    <td style="padding: 8px;">${data.month}</td>
                    <td style="padding: 8px;">R$ ${data.receitas}</td>
                    <td style="padding: 8px;">R$ ${data.despesas}</td>
                    <td style="padding: 8px;">R$ ${data.receitas - data.despesas}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </body>
          </html>
        `;
        const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Relatorio_Financeiro_OAMI.doc';
        link.click();
      }
      showToast(`Relatório financeiro exportado em ${fileFormat.toUpperCase()}!`);
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório financeiro', 'error');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex justify-between items-center mb-8">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
            <TrendingUp className="text-green-600" size={24} />
            Fluxo de Caixa - Últimos 6 Meses
          </h3>
          <div className="flex gap-2">
            <button 
              onClick={() => generateFinancialDoc('pdf')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Relatório PDF
            </button>
            <button 
              onClick={() => generateFinancialDoc('doc')}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
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
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão Financeira</h2>
            <div className="flex gap-2">
              <button 
                onClick={() => generateFinancialDoc('pdf')}
                disabled={exporting}
                className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 px-4 py-2 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
              >
                <FileDown size={18} />
                Exportar PDF
              </button>
              <button 
                onClick={() => setIsModalOpen(true)}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors"
              >
                <Plus size={18} />
                Novo Lançamento
              </button>
            </div>
          </div>

          <AnimatePresence>
            {isModalOpen && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
              >
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.9, opacity: 0 }}
                  className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md p-8 shadow-2xl"
                >
                  <div className="flex justify-between items-center mb-6">
                    <h3 className="text-2xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                      <Plus className="text-green-600" />
                      Novo Lançamento
                    </h3>
                    <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                      <X size={24} className="text-gray-400 dark:text-gray-500" />
                    </button>
                  </div>

                  <form onSubmit={handleSaveRecord} className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Tipo</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, type: 'RECEITA'})}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                            formData.type === 'RECEITA' 
                              ? "bg-green-50 dark:bg-green-900/20 border-green-500 text-green-700 dark:text-green-400" 
                              : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                          )}
                        >
                          Receita
                        </button>
                        <button
                          type="button"
                          onClick={() => setFormData({...formData, type: 'DESPESA'})}
                          className={cn(
                            "flex-1 py-2 rounded-xl text-sm font-bold border transition-all",
                            formData.type === 'DESPESA' 
                              ? "bg-red-50 dark:bg-red-900/20 border-red-500 text-red-700 dark:text-red-400" 
                              : "border-gray-200 dark:border-gray-700 text-gray-400 dark:text-gray-500"
                          )}
                        >
                          Despesa
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Data</label>
                      <input 
                        required
                        type="date" 
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Descrição</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Ex: Doação Mensal"
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                        value={formData.description}
                        onChange={e => setFormData({...formData, description: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Categoria</label>
                      <input 
                        required
                        type="text" 
                        placeholder="Ex: Doação, Saúde, Manutenção"
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Valor (R$)</label>
                      <input 
                        required
                        type="number" 
                        step="0.01"
                        placeholder="0,00"
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                        value={formData.amount}
                        onChange={e => setFormData({...formData, amount: e.target.value})}
                      />
                    </div>

                    <div className="pt-4 flex gap-3">
                      <button 
                        type="button"
                        onClick={() => setIsModalOpen(false)}
                        className="flex-1 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
                      >
                        Cancelar
                      </button>
                      <button 
                        disabled={loading}
                        className="flex-1 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                      >
                        {loading ? 'Salvando...' : 'Salvar'}
                      </button>
                    </div>
                  </form>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-gray-100 dark:border-gray-800">
                  <th className="pb-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Data</th>
                  <th className="pb-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Descrição</th>
                  <th className="pb-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">Categoria</th>
                  <th className="pb-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Valor</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {records.map((item: any) => (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                    <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{new Date(item.date).toLocaleDateString('pt-BR')}</td>
                    <td className="py-4 text-sm font-medium text-gray-800 dark:text-white">{item.description}</td>
                    <td className="py-4">
                      <span className="px-2 py-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 text-[10px] font-bold rounded-full uppercase">
                        {item.category}
                      </span>
                    </td>
                    <td className={cn(
                      "py-4 text-sm font-bold text-right",
                      item.type === 'RECEITA' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                    )}>
                      {item.type === 'RECEITA' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR')}
                    </td>
                  </tr>
                ))}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-400 dark:text-gray-500 italic">Nenhum registro financeiro encontrado.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <Camera size={20} className="text-green-600" />
              Digitalização de Documentos
            </h3>
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center hover:border-green-400 transition-colors cursor-pointer group">
                <Upload className="mx-auto text-gray-400 group-hover:text-green-600 mb-2" size={32} />
                <p className="text-sm text-gray-500 dark:text-gray-400">Clique ou arraste Notas Fiscais e Fotos de Documentos</p>
                <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Formatos aceitos: JPG, PNG, PDF (Máx 10MB)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
                    <ImageIcon size={18} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">NF_00123.jpg</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">2.4 MB</p>
                  </div>
                </div>
                <div className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3">
                  <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center shadow-sm">
                    <ImageIcon size={18} className="text-gray-400 dark:text-gray-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-gray-800 dark:text-white truncate">RECIBO_ALUGUEL.png</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500">1.1 MB</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="font-bold text-gray-800 dark:text-white mb-6">Resumo do Mês</h3>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Receitas</p>
                  <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {monthlySummary.receitas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="flex items-center gap-4">
                <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                  <TrendingUp size={20} className="rotate-180" />
                </div>
                <div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">Despesas</p>
                  <p className="text-xl font-bold text-red-600 dark:text-red-400">R$ {monthlySummary.despesas.toLocaleString('pt-BR')}</p>
                </div>
              </div>
              <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">Saldo Projetado</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">R$ {monthlySummary.saldo.toLocaleString('pt-BR')}</p>
              </div>
            </div>
          </div>

          <div className="bg-green-600 p-8 rounded-3xl shadow-lg text-white">
            <h3 className="font-bold mb-4">Prestação de Contas</h3>
            <p className="text-sm text-green-100 mb-6">Gere relatórios automáticos para transparência institucional.</p>
            <button 
              onClick={() => generateFinancialDoc('pdf')}
              disabled={exporting}
              className="w-full bg-white text-green-600 font-bold py-3 rounded-xl shadow-md hover:bg-green-50 transition-colors disabled:opacity-50"
            >
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Doadores e Sócios</h2>
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
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden"
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
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Nome Completo</label>
                    <input 
                      type="text" 
                      required
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">E-mail</label>
                    <input 
                      type="email" 
                      required
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Telefone</label>
                    <input 
                      type="tel" 
                      required
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Tipo</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="DOADOR">Doador Eventual</option>
                      <option value="SOCIO_MENSAL">Sócio Mensal</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Valor (R$)</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) })}
                    />
                  </div>
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Nome</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Tipo</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Contato</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Valor Mensal</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-center">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {(donors || []).map((donor) => (
              <tr key={donor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="p-4">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{donor.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">Desde {new Date(donor.startDate).toLocaleDateString('pt-BR')}</p>
                </td>
                <td className="p-4">
                  <span className={cn(
                    "px-2 py-1 rounded-full text-[10px] font-bold uppercase",
                    donor.type === 'SOCIO_MENSAL' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400' : 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400'
                  )}>
                    {donor.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador'}
                  </span>
                </td>
                <td className="p-4">
                  <p className="text-xs text-gray-600 dark:text-gray-400">{donor.email}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{donor.phone}</p>
                </td>
                <td className="p-4 text-right">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{donor.amount ? `R$ ${donor.amount}` : '-'}</p>
                </td>
                <td className="p-4 text-center">
                  <span className="px-2 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-[10px] font-bold rounded-full">
                    {donor.status}
                  </span>
                </td>
              </tr>
            ))}
            {donors.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">Nenhum doador cadastrado no banco de dados.</td>
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
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Doação de Fraldas para a Comunidade</h2>
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
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Registrar Doação</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="p-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Nome do Beneficiário</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Quantidade (un)</label>
                    <input 
                      type="number" 
                      required
                      min="1"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data</label>
                    <input 
                      type="date" 
                      required
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Observações</label>
                  <textarea 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white"
                    value={formData.observations}
                    onChange={(e) => setFormData({ ...formData, observations: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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

      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center justify-between max-w-md">
        <div>
          <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Estoque Total (Tamanho Único)</p>
          <p className="text-3xl font-bold text-gray-800 dark:text-white">{stock?.quantity || 0} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">unidades</span></p>
        </div>
        <div className="p-4 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
          <Package size={32} />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
        <div className="p-6 border-b border-gray-50 dark:border-gray-800">
          <h3 className="font-bold text-gray-800 dark:text-white">Histórico de Doações</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="text-left bg-gray-50 dark:bg-gray-800 border-b border-gray-100 dark:border-gray-800">
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Beneficiário</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Data</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Quantidade</th>
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Registrado por</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {(donations || []).map((d) => (
              <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
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

  const weeklyProductionData = useMemo(() => {
    const today = new Date();
    const startOfWeek = new Date(today);
    const dayOfWeek = today.getDay();
    const diff = today.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Monday
    startOfWeek.setDate(diff);
    startOfWeek.setHours(0, 0, 0, 0);

    const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex'];
    return days.map((day, index) => {
      const dayDate = new Date(startOfWeek);
      dayDate.setDate(startOfWeek.getDate() + index);
      const dateStr = dayDate.toISOString().split('T')[0];

      const dayProd = logs
        .filter(l => l.type === 'PRODUCTION' && l.date.startsWith(dateStr))
        .reduce((acc, curr) => acc + curr.quantity, 0);

      return { day, prod: dayProd };
    });
  }, [logs]);

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Fábrica de Fraldas - Controle de Produção</h2>
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
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl">
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
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Quantidade (unidades)</label>
                <input
                  type="number"
                  required
                  min="1"
                  value={quantity || ''}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Ex: 50"
                />
              </div>

              <div>
                <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">Observações</label>
                <textarea
                  value={observations}
                  onChange={(e) => setObservations(e.target.value)}
                  className="w-full px-4 py-3 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 focus:ring-2 focus:ring-blue-500 outline-none transition-all text-gray-800 dark:text-white"
                  placeholder="Opcional..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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
          <div className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl p-6 space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white">Confirmar Exclusão</h3>
              <p className="text-gray-500 dark:text-gray-400">Tem certeza que deseja excluir este registro? O estoque será ajustado automaticamente.</p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setDeletingLog(null)}
                className="flex-1 px-4 py-3 rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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
        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
          <div className="flex justify-between items-start">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center font-bold text-xl">
              TU
            </div>
            <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase">Estoque Atual (Tamanho Único)</span>
          </div>
          <div>
            <p className="text-4xl font-bold text-gray-800 dark:text-white">{currentStock.quantity} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">unidades</span></p>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-2 italic">Última atualização: {new Date(currentStock.lastUpdate).toLocaleDateString('pt-BR')} por {currentStock.updatedBy}</p>
          </div>
          <div className="w-full bg-gray-100 dark:bg-gray-800 h-3 rounded-full overflow-hidden">
            <div className="bg-green-500 h-full" style={{ width: `${Math.min((currentStock.quantity / 2000) * 100, 100)}%` }} />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-center">
          <h4 className="font-bold text-gray-800 dark:text-white mb-2">Destinação da Produção</h4>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">As fraldas produzidas atendem tanto aos idosos institucionalizados quanto às doações para a comunidade.</p>
          <div className="flex items-center gap-4">
            <div className="flex-1 bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
              <div className="bg-blue-500 h-full w-[100%]" />
            </div>
            <span className="text-sm font-bold text-blue-600 dark:text-blue-400">100% Ativo</span>
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
              {(logs || []).map((log) => (
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
            <BarChart data={weeklyProductionData}>
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

const InstitutionalSection = ({ institutionalInfo }: { institutionalInfo: InstitutionalInfo | null }) => {
  const mission = institutionalInfo?.mission || 'Proporcionar acolhimento humanizado e digno aos idosos de Vitória do Mearim.';
  const vision = institutionalInfo?.vision || 'Ser referência regional em cuidados gerontológicos e inclusão social.';
  const values = institutionalInfo?.values || 'Respeito, Ética, Transparência, Afeto e Profissionalismo.';
  const history = institutionalInfo?.history || '';

  return (
    <div className="max-w-4xl mx-auto space-y-12 animate-in fade-in duration-500">
      <div className="text-center space-y-4">
        <h2 className="text-4xl font-bold text-green-800 dark:text-green-400">OAMI</h2>
        <p className="text-green-600 dark:text-green-500 font-medium tracking-wide uppercase">Instituição de Longa Permanência para Idosos</p>
        <div className="w-24 h-1.5 bg-green-600 mx-auto rounded-full shadow-sm" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { title: 'Missão', content: mission, icon: Heart, color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-900/10' },
          { title: 'Visão', content: vision, icon: TrendingUp, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-900/10' },
          { title: 'Valores', content: values, icon: Shield, color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-900/10' },
        ].map((item, i) => (
          <div key={i} className="bg-white dark:bg-gray-900 p-8 rounded-[32px] shadow-sm border border-gray-100 dark:border-gray-800 text-center space-y-4 hover:shadow-xl transition-all duration-300">
            <div className={cn("mx-auto p-5 rounded-2xl w-fit transform -rotate-3 hover:rotate-0 transition-transform", item.bg, item.color)}>
              <item.icon size={32} />
            </div>
            <h3 className="text-xl font-bold text-gray-800 dark:text-white uppercase tracking-tighter italic">{item.title}</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm leading-relaxed antialiased">{item.content}</p>
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-gray-900 p-10 rounded-[40px] shadow-sm border border-gray-100 dark:border-gray-800 space-y-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5">
           <Info size={120} />
        </div>
        <h3 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-4">
          <Info className="text-green-600" size={32} />
          Nossa História
        </h3>
        <div className="prose prose-green dark:prose-invert max-w-none text-gray-600 dark:text-gray-400 leading-relaxed text-lg italic">
          {history ? (
             <p className="whitespace-pre-wrap">{history}</p>
          ) : (
            <>
              <p>
                Fundada com o propósito de suprir a carência de espaços adequados para o cuidado da pessoa idosa em Vitória do Mearim, a OAMI nasceu da união de esforços da comunidade e profissionais comprometidos com a causa gerontológica.
              </p>
              <p>
                Ao longo dos anos, evoluímos de um pequeno abrigo para uma instituição estruturada, contando hoje com uma equipe multidisciplinar completa que atende às necessidades físicas, emocionais e sociais de nossos residentes.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

const VolunteersSection = ({ volunteers, showToast, user }: { 
  volunteers: Volunteer[], 
  showToast: (msg: string, type?: 'success' | 'error') => void,
  user: User
}) => {
  const canEdit = ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'].includes(user.role);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Omit<Volunteer, 'id'>>({
    name: '',
    cpf: '',
    address: '',
    type: 'VOLUNTARIO',
    startDate: new Date().toISOString().split('T')[0],
    activities: '',
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  });

  const handleOpenModal = (volunteer?: Volunteer) => {
    if (volunteer) {
      setSelectedVolunteer(volunteer);
      setFormData({
        name: volunteer.name,
        cpf: volunteer.cpf || '',
        address: volunteer.address || '',
        type: volunteer.type,
        startDate: volunteer.startDate,
        activities: volunteer.activities,
        status: volunteer.status,
        createdAt: volunteer.createdAt
      });
    } else {
      setSelectedVolunteer(null);
      setFormData({
        name: '',
        cpf: '',
        address: '',
        type: 'VOLUNTARIO',
        startDate: new Date().toISOString().split('T')[0],
        activities: '',
        status: 'ATIVO',
        createdAt: new Date().toISOString()
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.activities || !formData.cpf || !formData.address) {
      showToast('Por favor, preencha todos os campos obrigatórios.', 'error');
      return;
    }

    setLoading(true);
    const cleanData = {
      ...formData,
      cpf: formData.cpf.trim(),
      address: formData.address.trim(),
      name: formData.name.trim()
    };

    try {
      if (selectedVolunteer) {
        await updateDoc(doc(db, 'volunteers', selectedVolunteer.id), cleanData);
        showToast('Cadastro atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'volunteers'), {
          ...cleanData,
          status: 'ATIVO',
          createdAt: new Date().toISOString()
        });
        showToast('Novo cadastro realizado com sucesso!');
      }
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, 'volunteers');
      showToast('Erro ao salvar cadastro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'volunteers', id));
      showToast('Cadastro excluído com sucesso!');
      setDeleteConfirmId(null);
      setIsModalOpen(false);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `volunteers/${id}`);
      showToast('Erro ao excluir cadastro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white tracking-tight">Voluntários e Estagiários</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão de colaboradores voluntários e acadêmicos</p>
        </div>
        {canEdit && (
          <button 
            onClick={() => handleOpenModal()}
            className="bg-green-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1 flex items-center gap-2"
          >
            <Plus size={20} />
            Novo Cadastro
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(volunteers || []).map((v) => (
          <motion.div 
            key={v.id} 
            layoutId={v.id}
            onClick={() => handleOpenModal(v)}
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-start gap-4 hover:shadow-md transition-all cursor-pointer group relative overflow-hidden"
          >
            <div className={cn(
              "p-4 rounded-2xl text-white shadow-lg transition-transform group-hover:scale-110", 
              v.type === 'VOLUNTARIO' ? 'bg-blue-500' : 'bg-purple-500'
            )}>
              {v.type === 'VOLUNTARIO' ? <Heart size={24} /> : <BookOpen size={24} />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-start mb-2">
                <h4 className="font-bold text-gray-800 dark:text-white truncate pr-2">{v.name}</h4>
                <span className={cn(
                  "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
                  v.type === 'VOLUNTARIO' ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400' : 'bg-purple-50 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400'
                )}>
                  {v.type}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                  <Calendar size={12} />
                  <span>Início: {new Date(v.startDate).toLocaleDateString('pt-BR')}</span>
                </div>
                <p className="text-sm text-gray-700 dark:text-gray-300 mt-3 font-medium line-clamp-2 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-xl border border-gray-100 dark:border-gray-700/50">
                  {v.activities}
                </p>
              </div>
            </div>
            {canEdit && (
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  setDeleteConfirmId(v.id);
                }}
                className="absolute top-4 right-4 p-2 text-gray-300 hover:text-red-500 transition-all"
              >
                <Trash2 size={16} />
              </button>
            )}
          </motion.div>
        ))}
        {volunteers.length === 0 && (
          <div className="col-span-full py-20 text-center bg-white dark:bg-gray-900 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-800">
            <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <Users size={32} />
            </div>
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum voluntário ou estagiário cadastrado.</p>
            <button 
              onClick={() => handleOpenModal()}
              className="mt-4 text-green-600 font-bold hover:underline"
            >
              Começar primeiro cadastro
            </button>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]"
              onClick={e => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white flex-shrink-0">
                <h3 className="text-xl font-bold">{selectedVolunteer ? (canEdit ? 'Editar Cadastro' : 'Visualizar Cadastro') : 'Novo Cadastro'}</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>
              <div className="overflow-y-auto p-8">
                <form onSubmit={handleSave} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Nome Completo</label>
                      <input 
                        type="text" 
                        required
                        disabled={!canEdit}
                        value={formData.name}
                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-70"
                        placeholder="Ex: Ana Maria Souza"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">CPF</label>
                      <input 
                        type="text" 
                        required
                        disabled={!canEdit}
                        value={formData.cpf}
                        onChange={e => setFormData({ ...formData, cpf: e.target.value })}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-70"
                        placeholder="000.000.000-00"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Endereço Residencial</label>
                    <input 
                      type="text" 
                      required
                      disabled={!canEdit}
                      value={formData.address}
                      onChange={e => setFormData({ ...formData, address: e.target.value })}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-70"
                      placeholder="Rua, Número, Bairro, Cidade"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Tipo</label>
                      <select 
                        value={formData.type}
                        disabled={!canEdit}
                        onChange={e => setFormData({ ...formData, type: e.target.value as any })}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-70"
                      >
                        <option value="VOLUNTARIO">Voluntário</option>
                        <option value="ESTAGIARIO">Estagiário</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data de Início</label>
                      <input 
                        type="date" 
                        required
                        disabled={!canEdit}
                        value={formData.startDate}
                        onChange={e => setFormData({ ...formData, startDate: e.target.value })}
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all text-gray-800 dark:text-white disabled:opacity-70"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase ml-1">Atividades / Observações</label>
                    <textarea 
                      required
                      disabled={!canEdit}
                      value={formData.activities}
                      onChange={e => setFormData({ ...formData, activities: e.target.value })}
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 transition-all h-32 text-gray-800 dark:text-white resize-none disabled:opacity-70"
                      placeholder="Descreva as atividades desenvolvidas..."
                    />
                  </div>
                  <div className="pt-4 flex flex-wrap gap-4">
                    {selectedVolunteer && canEdit && (
                      <button 
                        type="button"
                        onClick={() => setDeleteConfirmId(selectedVolunteer.id)}
                        className="flex-1 py-4 text-red-500 font-bold hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-colors border border-red-100 dark:border-red-900/30"
                      >
                        Excluir
                      </button>
                    )}
                    <button 
                      type="button"
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                    >
                      {canEdit ? 'Cancelar' : 'Fechar'}
                    </button>
                    {canEdit && (
                      <button 
                        type="submit"
                        disabled={loading}
                        className="flex-[2] bg-green-600 text-white font-bold py-4 rounded-2xl shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1 disabled:opacity-50"
                      >
                        {loading ? 'Salvando...' : selectedVolunteer ? 'Atualizar Cadastro' : 'Salvar Cadastro'}
                      </button>
                    )}
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {deleteConfirmId && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-[60] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-2xl max-w-sm w-full text-center"
            >
              <div className="w-20 h-20 bg-red-50 dark:bg-red-900/20 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trash2 size={40} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Excluir Cadastro?</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">Esta ação não pode ser desfeita. Deseja realmente excluir este registro?</p>
              <div className="flex gap-4">
                <button 
                  onClick={() => setDeleteConfirmId(null)}
                  className="flex-1 py-4 text-gray-500 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 rounded-2xl transition-colors"
                >
                  Não, manter
                </button>
                <button 
                  onClick={() => handleDelete(deleteConfirmId)}
                  disabled={loading}
                  className="flex-1 bg-red-500 text-white font-bold py-4 rounded-2xl shadow-lg hover:bg-red-600 transition-all disabled:opacity-50"
                >
                  {loading ? 'Excluindo...' : 'Sim, excluir'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const FamilySection = ({ engagements, elderly, showToast }: { engagements: FamilyEngagement[], elderly: Elderly[], showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    elderlyId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'VISITA' as FamilyEngagement['type'],
    summary: ''
  });

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.elderlyId || !formData.summary) {
      showToast('Preencha os campos obrigatórios', 'error');
      return;
    }

    setLoading(true);
    try {
      await addDoc(collection(db, 'familyEngagements'), {
        ...formData,
        createdAt: new Date().toISOString()
      });
      showToast('Contato familiar registrado com sucesso!');
      setIsModalOpen(false);
      setFormData({
        elderlyId: '',
        date: new Date().toISOString().split('T')[0],
        type: 'VISITA',
        summary: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'familyEngagements');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Acompanhamento Familiar</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-1">Gestão de contatos e visitas dos familiares</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="bg-green-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-xl hover:bg-green-700 transition-all transform hover:-translate-y-1 flex items-center gap-2"
        >
          <Plus size={20} />
          Registrar Contato
        </button>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Contato Familiar</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleRegister} className="p-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Idoso Referente</label>
                  <select 
                    required
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                    value={formData.elderlyId}
                    onChange={(e) => setFormData({ ...formData, elderlyId: e.target.value })}
                  >
                    <option value="">Selecione um idoso...</option>
                    {elderly.map(e => (
                      <option key={e.id} value={e.id}>{e.name}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data</label>
                    <input 
                      type="date" 
                      required
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.date}
                      onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Tipo de Contato</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.type}
                      onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                    >
                      <option value="VISITA">Visita Presencial</option>
                      <option value="REUNIAO">Reunião Familiar</option>
                      <option value="CONTATO_TELEFONICO">Contato Telefônico</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Resumo do Contato</label>
                  <textarea 
                    required
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-32 text-gray-800 dark:text-white"
                    placeholder="Descreva como foi o contato..."
                    value={formData.summary}
                    onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {(engagements || []).map((e) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            key={e.id} 
            className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 hover:shadow-xl hover:border-green-100 dark:hover:border-green-900 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="p-3 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl group-hover:scale-110 transition-transform">
                <Users size={24} />
              </div>
              <span className={cn(
                "text-[10px] font-bold px-3 py-1 rounded-full uppercase",
                e.type === 'VISITA' ? 'bg-blue-100 text-blue-700' :
                e.type === 'REUNIAO' ? 'bg-purple-100 text-purple-700' :
                'bg-gray-100 text-gray-700'
              )}>
                {e.type.replace('_', ' ')}
              </span>
            </div>
            
            <h4 className="font-bold text-gray-800 dark:text-white text-lg">
              {elderly.find(res => res.id === e.elderlyId)?.name || 'Idoso não identificado'}
            </h4>
            <div className="flex items-center gap-2 mt-1 text-gray-400 dark:text-gray-500">
              <Calendar size={14} />
              <p className="text-xs font-medium">{new Date(e.date).toLocaleDateString('pt-BR')}</p>
            </div>
            
            <div className="mt-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-50 dark:border-gray-800">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed italic">
                "{e.summary}"
              </p>
            </div>
          </motion.div>
        ))}
        {engagements.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/20 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-800">
            <Users className="mx-auto text-gray-300 dark:text-gray-700 mb-4" size={48} />
            <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhum registro de contato familiar encontrado</p>
          </div>
        )}
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

const ScheduleSection = ({ events, user, showConfirm }: { events: CalendarEvent[], user: User, showConfirm: (msg: string, onConfirm: () => void) => void }) => {
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

  const handleDeleteEvent = async (eventId: string) => {
    showConfirm('Deseja realmente excluir este evento?', async () => {
      try {
        await deleteDoc(doc(db, 'calendarEvents', eventId));
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'calendarEvents');
      }
    });
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
          <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6 flex items-center gap-2">
              <Clock size={20} className="text-green-600 dark:text-green-400" />
              Agenda para {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h3>
            
            <div className="space-y-4">
              {getEventsForDate(selectedDate).holiday && (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-2xl flex items-center gap-4">
                  <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center text-red-600 dark:text-red-400">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-400 dark:text-red-500 uppercase">Feriado</p>
                    <p className="font-bold text-red-800 dark:text-red-200">{getEventsForDate(selectedDate).holiday?.title}</p>
                  </div>
                </div>
              )}

              {getEventsForDate(selectedDate).events.length > 0 ? (
                getEventsForDate(selectedDate).events.map((ev, i) => (
                  <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 border border-gray-100 dark:border-gray-800 rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/20 hover:border-green-100 dark:hover:border-green-800 transition-all group relative">
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold px-2 py-1 bg-white dark:bg-gray-800 rounded-full uppercase text-gray-400 dark:text-gray-500 group-hover:text-green-600 dark:group-hover:text-green-400">
                        {ev.type}
                      </span>
                      <div className="flex items-center gap-2">
                        {ev.time && <span className="text-xs font-bold text-gray-500 dark:text-gray-400">{ev.time}</span>}
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(ev.id);
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 transition-colors rounded-lg hover:bg-red-50"
                          title="Excluir Evento"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                    <h4 className="font-bold text-gray-800 dark:text-white">{ev.title}</h4>
                    {ev.description && <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{ev.description}</p>}
                    {ev.location && (
                      <div className="flex items-center gap-1 mt-2 text-[10px] text-gray-400 dark:text-gray-500">
                        <Info size={12} />
                        {ev.location}
                      </div>
                    )}
                  </div>
                ))
              ) : !getEventsForDate(selectedDate).holiday && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300 dark:text-gray-600">
                    <Calendar size={32} />
                  </div>
                  <p className="text-gray-400 dark:text-gray-500 text-sm font-medium">Nenhum compromisso para este dia</p>
                  <button 
                    onClick={() => setIsModalOpen(true)}
                    className="mt-4 text-green-600 dark:text-green-400 text-xs font-bold hover:underline"
                  >
                    + Adicionar Evento
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="bg-green-900 dark:bg-green-950 p-6 rounded-3xl text-white shadow-lg relative overflow-hidden">
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
              className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 bg-green-600 text-white flex justify-between items-center">
                <h3 className="text-xl font-bold">Novo Evento</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/20 rounded-full transition-colors">
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddEvent} className="p-8 space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Título do Evento</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Tipo</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
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
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Horário</label>
                    <input 
                      type="time" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.time}
                      onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Local</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Descrição</label>
                  <textarea 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                <div className="pt-4 flex gap-3">
                  <button 
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
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

interface GalleryPhoto {
  id: string;
  url: string;
  caption: string;
  date: string;
  uploadedBy: string;
}

const GallerySection = ({ user, showToast }: { user: User, showToast: (msg: string, type?: 'success' | 'error') => void }) => {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editCaption, setEditCaption] = useState('');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const q = query(collection(db, 'gallery'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const photoData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryPhoto));
      setPhotos(photoData);
    }, (error) => {
      handleFirestoreError(error, OperationType.GET, 'gallery');
      showToast('Erro ao carregar galeria', 'error');
    });
    return () => unsubscribe();
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map((file: File) => {
        return new Promise<void>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = async () => {
            try {
              const base64String = reader.result as string;
              const photoData = {
                url: base64String,
                caption: 'Clique para editar legenda',
                date: new Date().toISOString(),
                uploadedBy: user.name
              };
              await addDoc(collection(db, 'gallery'), photoData);
              resolve();
            } catch (err) {
              reject(err);
            }
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
      });

      await Promise.all(uploadPromises);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setUploading(false);
      showToast('Fotos enviadas com sucesso!');
    } catch (error) {
      console.error("Upload Error:", error);
      setUploading(false);
      showToast('Erro ao enviar algumas fotos. Verifique o tamanho dos arquivos.', 'error');
    }
  };

  const deletePhoto = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'gallery', id));
      setConfirmDeleteId(null);
      showToast('Foto excluída com sucesso!');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `gallery/${id}`);
      showToast('Erro ao excluir foto. Verifique suas permissões.', 'error');
    }
  };

  const startEditing = (photo: GalleryPhoto) => {
    setEditingId(photo.id);
    setEditCaption(photo.caption);
  };

  const saveCaption = async (id: string) => {
    try {
      await updateDoc(doc(db, 'gallery', id), { caption: editCaption });
      setEditingId(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `gallery/${id}`);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Galeria de Fotos</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">Selecione uma ou mais fotos para upload rápido.</p>
          </div>
          <div className="flex gap-2 w-full md:w-auto">
            <button 
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2 disabled:opacity-50"
            >
              {uploading ? <Activity className="animate-spin" size={18} /> : <Upload size={18} />}
              {uploading ? 'Enviando...' : 'Selecionar Fotos'}
            </button>
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              multiple
              onChange={handleUpload}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {photos.map((photo) => (
            <motion.div 
              key={photo.id} 
              layout
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="group relative bg-gray-50 dark:bg-gray-800 rounded-2xl overflow-hidden border border-gray-100 dark:border-gray-700"
            >
              <div className="aspect-square overflow-hidden relative">
                <img 
                  src={photo.url} 
                  alt={photo.caption} 
                  className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                  referrerPolicy="no-referrer"
                />
                
                {/* Delete Confirmation Overlay */}
                <AnimatePresence>
                  {confirmDeleteId === photo.id ? (
                    <motion.div 
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="absolute inset-0 bg-red-600/90 flex flex-col items-center justify-center p-4 text-center z-10"
                    >
                      <p className="text-white text-xs font-bold mb-3">Excluir esta foto?</p>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => deletePhoto(photo.id)}
                          className="px-3 py-1 bg-white text-red-600 rounded-lg text-[10px] font-bold"
                        >
                          Sim
                        </button>
                        <button 
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-3 py-1 bg-red-800 text-white rounded-lg text-[10px] font-bold"
                        >
                          Não
                        </button>
                      </div>
                    </motion.div>
                  ) : (
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      {(user.role === 'PRESIDENTE' || user.role === 'COORDENADORA' || photo.uploadedBy === user.name) && (
                        <button 
                          onClick={() => setConfirmDeleteId(photo.id)}
                          className="p-1.5 bg-red-500 text-white rounded-lg shadow-lg hover:bg-red-600 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  )}
                </AnimatePresence>
              </div>
              <div className="p-3">
                {editingId === photo.id ? (
                  <div className="flex gap-1">
                    <input 
                      type="text"
                      className="flex-1 text-xs p-1 bg-white dark:bg-gray-700 border border-green-500 rounded outline-none"
                      value={editCaption}
                      onChange={(e) => setEditCaption(e.target.value)}
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && saveCaption(photo.id)}
                    />
                    <button 
                      onClick={() => saveCaption(photo.id)}
                      className="p-1 bg-green-500 text-white rounded"
                    >
                      <CheckCircle2 size={12} />
                    </button>
                  </div>
                ) : (
                  <p 
                    onClick={() => startEditing(photo)}
                    className="text-xs font-medium text-gray-700 dark:text-gray-300 truncate cursor-pointer hover:text-green-600 dark:hover:text-green-400"
                  >
                    {photo.caption}
                  </p>
                )}
                <p className="text-[10px] text-gray-400 mt-1">{new Date(photo.date).toLocaleDateString('pt-BR')}</p>
              </div>
            </motion.div>
          ))}
          {photos.length === 0 && !uploading && (
            <div className="col-span-full py-20 text-center text-gray-400">
              <ImageIcon size={48} className="mx-auto mb-4 opacity-20" />
              <p>Nenhuma foto na galeria ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ReportsSection = ({ 
  elderly, 
  evolutions, 
  pias, 
  socialEvolutions,
  psychEvolutions,
  pedagogyEvolutions,
  physioEvolutions,
  nursingEvolutions,
  photos, 
  showToast 
}: { 
  elderly: Elderly[], 
  evolutions: EvolutionRecord[], 
  pias: PIA[], 
  socialEvolutions: SocialEvolution[],
  psychEvolutions: PsychEvolution[],
  pedagogyEvolutions: PedagogyEvolution[],
  physioEvolutions: PhysioEvolution[],
  nursingEvolutions: NursingEvolution[],
  photos: GalleryPhoto[], 
  showToast: (msg: string, type?: 'success' | 'error') => void 
}) => {
  const [generating, setGenerating] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));

  const unifiedEvolutions = useMemo(() => {
    const all: any[] = [
      ...evolutions.map(e => ({ ...e, professionalRole: e.professionalRole, source: 'Geral' })),
      ...socialEvolutions.map(e => ({ ...e, date: e.date, professionalRole: 'ASSISTENTE_SOCIAL', source: 'Social' })),
      ...psychEvolutions.map(e => ({ ...e, date: e.date, professionalRole: 'PSICOLOGA', source: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, date: e.date, professionalRole: 'PEDAGOGA', source: 'Pedagogia' })),
      ...physioEvolutions.map(e => ({ ...e, date: e.date, professionalRole: 'FISIOTERAPEUTA', source: 'Fisioterapia' })),
      ...nursingEvolutions.map(e => ({ ...e, date: e.date, professionalRole: 'ENFERMEIRA', source: 'Enfermagem' })),
    ];
    return all;
  }, [evolutions, socialEvolutions, psychEvolutions, pedagogyEvolutions, physioEvolutions, nursingEvolutions]);

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const monthDate = parseISO(`${selectedMonth}-01`);
      const monthLabel = format(monthDate, 'MMMM yyyy', { locale: ptBR });
      const monthEvolutions = unifiedEvolutions.filter(ev => ev.date.startsWith(selectedMonth));
      const monthPIAs = pias.filter(p => p.date.startsWith(selectedMonth));
      const roles = [...new Set(monthEvolutions.map(e => e.professionalRole))];

      const columns = ['Categoria', 'Informação'];
      const data = [
        ['RESUMO DAS AÇÕES', ''],
        ['Total de Idosos Atendidos', elderly.filter(e => e.status === 'ATIVO').length.toString()],
        ['Evoluções Registradas no Mês', monthEvolutions.length.toString()],
        ['Novos PIAs/Revisões', monthPIAs.length.toString()],
        ['', ''],
        ['ATENDIMENTOS POR ÁREA', ''],
        ...roles.map(role => [
          ROLE_LABELS[role as Role] || role,
          `${monthEvolutions.filter(e => e.professionalRole === role).length} atendimentos`
        ])
      ];

      generateModernPDF({
        title: 'Relatório Mensal OAMI',
        subtitle: `Período: ${monthLabel} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_mensal_${selectedMonth}`
      });
      showToast('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showToast('Erro ao gerar PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateDOC = () => {
    try {
      const monthDate = parseISO(`${selectedMonth}-01`);
      const monthLabel = format(monthDate, 'MMMM yyyy', { locale: ptBR });
      const monthEvolutions = evolutions.filter(ev => ev.date.startsWith(selectedMonth));
      const monthPIAs = pias.filter(p => p.date.startsWith(selectedMonth));
      const roles = [...new Set(monthEvolutions.map(e => e.professionalRole))];

      const content = `
        <html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
        <head><meta charset='utf-8'><title>Relatório OAMI</title></head>
        <body>
          <h1 style="color: #16a34a; text-align: center;">Relatório Mensal OAMI</h1>
          <p style="text-align: center;">Período: ${monthLabel}</p>
          <hr/>
          <h2>Resumo das Ações</h2>
          <ul>
            <li>Total de Idosos Atendidos: ${elderly.filter(e => e.status === 'ATIVO').length}</li>
            <li>Evoluções Registradas no Mês: ${monthEvolutions.length}</li>
            <li>Novos PIAs/Revisões: ${monthPIAs.length}</li>
          </ul>
          <hr/>
          <h2>Atendimentos por Área</h2>
          <ul>
            ${roles.map(role => `<li>${role}: ${monthEvolutions.filter(e => e.professionalRole === role).length} atendimentos</li>`).join('')}
          </ul>
        </body>
        </html>
      `;
      const blob = new Blob(['\ufeff', content], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Relatorio_OAMI_${selectedMonth}.doc`;
      link.click();
      showToast('Relatório DOC gerado com sucesso!');
    } catch (error) {
      console.error("DOC Generation Error:", error);
      showToast('Erro ao gerar DOC', 'error');
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios Mensais</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gere documentos consolidados de atividades e fotos.</p>
          </div>
          <div className="flex gap-3 w-full md:w-auto">
            <input 
              type="month" 
              className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
            />
            <button 
              onClick={generatePDF}
              disabled={generating}
              className="flex-1 md:flex-none bg-green-600 text-white px-6 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {generating ? <Activity className="animate-spin" size={18} /> : <FileDown size={18} />}
              {generating ? 'Gerando...' : 'Gerar Relatório PDF'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
              <Activity size={20} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">Ações Técnicas</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Resumo de todas as evoluções e atendimentos do mês selecionado.</p>
          </div>
          <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <ImageIcon size={20} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">Galeria de Fotos</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Inclusão automática das fotos registradas no período.</p>
          </div>
          <div className="p-6 bg-purple-50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30">
            <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center text-purple-600 dark:text-purple-400 mb-4">
              <FileText size={20} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">Exportação</h4>
            <div className="flex gap-2 mt-4">
              <button 
                onClick={generatePDF}
                disabled={generating}
                className="flex-1 py-2 bg-white dark:bg-gray-800 text-green-600 dark:text-green-400 text-xs font-bold rounded-lg border border-green-100 dark:border-green-900/30 hover:bg-green-50 transition-colors disabled:opacity-50"
              >
                Relatório PDF
              </button>
              <button 
                onClick={generateDOC}
                className="flex-1 py-2 bg-white dark:bg-gray-800 text-blue-600 dark:text-blue-400 text-xs font-bold rounded-lg border border-blue-100 dark:border-blue-900/30 hover:bg-blue-50 transition-colors"
              >
                Relatório DOC
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkshopsSection = ({ workshops, communityElderly, caregivers, showToast }: { 
  workshops: Workshop[], 
  communityElderly: CommunityElderly[],
  caregivers: Caregiver[],
  showToast: (msg: string, type?: 'success' | 'error') => void 
}) => {
  const [isElderlyModalOpen, setIsElderlyModalOpen] = useState(false);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const [elderlyFormData, setElderlyFormData] = useState({
    name: '',
    age: '',
    birthDate: '',
    address: '',
    phone: '',
    healthConditions: '',
    medications: '',
    interests: [] as string[],
    livingSituation: '',
    emergencyContact: ''
  });

  const [caregiverFormData, setCaregiverFormData] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    experience: '',
    trainingInterests: [] as string[]
  });

  const [workshopFormData, setWorkshopFormData] = useState({
    title: '',
    date: '',
    description: '',
    type: 'IDOSOS' as 'PROFISSIONAL' | 'IDOSOS',
    participants: [] as string[]
  });

  const handleAddCommunityElderly = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'communityElderly'), {
        ...elderlyFormData,
        age: parseInt(elderlyFormData.age),
        registeredAt: new Date().toISOString()
      });
      showToast('Idoso da comunidade cadastrado com sucesso!');
      setIsElderlyModalOpen(false);
      setElderlyFormData({
        name: '',
        age: '',
        birthDate: '',
        address: '',
        phone: '',
        healthConditions: '',
        medications: '',
        interests: [],
        livingSituation: '',
        emergencyContact: ''
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'communityElderly');
    } finally {
      setLoading(false);
    }
  };

  const handleAddCaregiver = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'caregivers'), {
        ...caregiverFormData,
        registeredAt: new Date().toISOString()
      });
      showToast('Cuidador cadastrado com sucesso!');
      setIsCaregiverModalOpen(false);
      setCaregiverFormData({
        name: '',
        phone: '',
        email: '',
        address: '',
        experience: '',
        trainingInterests: []
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'caregivers');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWorkshop = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await addDoc(collection(db, 'workshops'), {
        ...workshopFormData,
      });
      showToast('Atividade agendada com sucesso!');
      setIsWorkshopModalOpen(false);
      setWorkshopFormData({
        title: '',
        date: '',
        description: '',
        type: 'IDOSOS',
        participants: []
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'workshops');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Oficinas e Capacitações</h2>
          <p className="text-gray-500 text-sm">Gestão de atividades institucionais e comunitárias</p>
        </div>
        <div className="flex flex-wrap gap-3 justify-end">
          <button 
            onClick={() => setIsElderlyModalOpen(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Cadastrar Idoso
          </button>
          <button 
            onClick={() => setIsCaregiverModalOpen(true)}
            className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Cadastrar Cuidador
          </button>
          <button 
            onClick={() => setIsWorkshopModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Agendar Atividade
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workshops.length > 0 ? workshops.map((w) => (
          <div key={w.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-start">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-bold uppercase", 
                w.type === 'PROFISSIONAL' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
              )}>
                {w.type}
              </div>
              <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(w.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white text-lg">{w.title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{w.description}</p>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-gray-800">
              <span className="text-xs text-gray-400 font-medium">{w.participants?.length || 0} participantes</span>
              <button className="text-green-600 dark:text-green-400 text-sm font-bold hover:underline">Ver detalhes</button>
            </div>
          </div>
        )) : (
          <div className="col-span-2 text-center py-12 bg-white dark:bg-gray-900 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800">
            <BookOpen className="mx-auto text-gray-300 mb-4" size={48} />
            <p className="text-gray-500">Nenhuma atividade agendada</p>
          </div>
        )}
      </div>

      {/* Modal Cadastro Idoso Comunidade */}
      <AnimatePresence>
        {isElderlyModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Idoso da Comunidade</h3>
                <button onClick={() => setIsElderlyModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCommunityElderly} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <input 
                      required
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={elderlyFormData.name}
                      onChange={e => setElderlyFormData({...elderlyFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Idade</label>
                      <input 
                        required
                        type="number"
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={elderlyFormData.age}
                        onChange={e => setElderlyFormData({...elderlyFormData, age: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Nascimento</label>
                      <input 
                        required
                        type="date"
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={elderlyFormData.birthDate}
                        onChange={e => setElderlyFormData({...elderlyFormData, birthDate: e.target.value})}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Endereço</label>
                    <input 
                      required
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={elderlyFormData.address}
                      onChange={e => setElderlyFormData({...elderlyFormData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                    <input 
                      required
                      type="tel"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={elderlyFormData.phone}
                      onChange={e => setElderlyFormData({...elderlyFormData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Condições de Saúde</label>
                  <textarea 
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    value={elderlyFormData.healthConditions}
                    onChange={e => setElderlyFormData({...elderlyFormData, healthConditions: e.target.value})}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Medicamentos em Uso</label>
                  <textarea 
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 min-h-[80px]"
                    value={elderlyFormData.medications}
                    onChange={e => setElderlyFormData({...elderlyFormData, medications: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Situação de Moradia</label>
                    <input 
                      type="text"
                      placeholder="Ex: Mora sozinho, com família..."
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={elderlyFormData.livingSituation}
                      onChange={e => setElderlyFormData({...elderlyFormData, livingSituation: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Contato de Emergência</label>
                    <input 
                      required
                      type="text"
                      placeholder="Nome e Telefone"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={elderlyFormData.emergencyContact}
                      onChange={e => setElderlyFormData({...elderlyFormData, emergencyContact: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsElderlyModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-blue-600 text-white rounded-2xl font-bold shadow-lg shadow-blue-200 dark:shadow-none hover:bg-blue-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar Idoso'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Cadastro Cuidador */}
      <AnimatePresence>
        {isCaregiverModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl w-full max-w-2xl my-8"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Cuidador</h3>
                <button onClick={() => setIsCaregiverModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddCaregiver} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <input 
                      required
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={caregiverFormData.name}
                      onChange={e => setCaregiverFormData({...caregiverFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                    <input 
                      required
                      type="tel"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={caregiverFormData.phone}
                      onChange={e => setCaregiverFormData({...caregiverFormData, phone: e.target.value})}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">E-mail (Opcional)</label>
                    <input 
                      type="email"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={caregiverFormData.email}
                      onChange={e => setCaregiverFormData({...caregiverFormData, email: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Endereço</label>
                    <input 
                      required
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={caregiverFormData.address}
                      onChange={e => setCaregiverFormData({...caregiverFormData, address: e.target.value})}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Experiência na Área</label>
                  <textarea 
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500 min-h-[100px]"
                    placeholder="Conte um pouco sobre sua experiência como cuidador..."
                    value={caregiverFormData.experience}
                    onChange={e => setCaregiverFormData({...caregiverFormData, experience: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsCaregiverModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-purple-600 text-white rounded-2xl font-bold shadow-lg shadow-purple-200 dark:shadow-none hover:bg-purple-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Cadastrando...' : 'Cadastrar Cuidador'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Agendar Atividade */}
      <AnimatePresence>
        {isWorkshopModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 shadow-2xl w-full max-w-lg"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Agendar Atividade</h3>
                <button onClick={() => setIsWorkshopModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
                  <X size={24} />
                </button>
              </div>

              <form onSubmit={handleAddWorkshop} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Título da Atividade</label>
                  <input 
                    required
                    type="text"
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                    value={workshopFormData.title}
                    onChange={e => setWorkshopFormData({...workshopFormData, title: e.target.value})}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Data</label>
                    <input 
                      required
                      type="date"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={workshopFormData.date}
                      onChange={e => setWorkshopFormData({...workshopFormData, date: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Tipo</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                      value={workshopFormData.type}
                      onChange={e => setWorkshopFormData({...workshopFormData, type: e.target.value as any})}
                    >
                      <option value="IDOSOS">Para Idosos</option>
                      <option value="PROFISSIONAL">Capacitação Profissional</option>
                    </select>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase">Descrição</label>
                  <textarea 
                    className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 min-h-[100px]"
                    value={workshopFormData.description}
                    onChange={e => setWorkshopFormData({...workshopFormData, description: e.target.value})}
                  />
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => setIsWorkshopModalOpen(false)}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Agendando...' : 'Agendar'}
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

const MonitoringSection = ({ 
  elderly, 
  evolutions, 
  pias, 
  socialEvolutions,
  psychEvolutions,
  pedagogyEvolutions,
  physioEvolutions,
  nursingEvolutions,
  vitalSigns,
  psychEmotionalMonitorings,
  workshops,
  showToast 
}: { 
  elderly: Elderly[], 
  evolutions: EvolutionRecord[],
  pias: PIA[],
  socialEvolutions: SocialEvolution[],
  psychEvolutions: PsychEvolution[],
  pedagogyEvolutions: PedagogyEvolution[],
  physioEvolutions: PhysioEvolution[],
  nursingEvolutions: NursingEvolution[],
  vitalSigns: VitalSigns[],
  psychEmotionalMonitorings: PsychEmotionalMonitoring[],
  workshops: Workshop[],
  showToast: (msg: string, type?: 'success' | 'error') => void 
}) => {
  const [selectedElderlyId, setSelectedElderlyId] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'dashboard' | 'evolutions' | 'pias' | 'health'>('dashboard');
  const [exporting, setExporting] = useState(false);

  const unifiedEvolutions = useMemo(() => {
    const all: any[] = [
      ...evolutions.map(e => ({ ...e, professional: e.professionalRole, source: 'Geral' })),
      ...socialEvolutions.map(e => ({ ...e, elderlyId: e.patientId, professional: 'ASSISTENTE_SOCIAL', content: e.observation, source: 'Social' })),
      ...psychEvolutions.map(e => ({ ...e, elderlyId: e.patientId, professional: 'PSICOLOGA', content: e.observation, source: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, elderlyId: e.patientId, professional: 'PEDAGOGA', content: e.observations, source: 'Pedagogia' })),
      ...physioEvolutions.map(e => ({ ...e, elderlyId: e.patientId, professional: 'FISIOTERAPEUTA', content: e.evolution, source: 'Fisioterapia' })),
      ...nursingEvolutions.map(e => ({ ...e, elderlyId: e.patientId, professional: 'ENFERMEIRA', content: e.content, source: 'Enfermagem' })),
    ];
    return all.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [evolutions, socialEvolutions, psychEvolutions, pedagogyEvolutions, physioEvolutions, nursingEvolutions]);

  const generateMonitoringPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Indicador', 'Valor'];
      const data = [
        ['Total de Idosos Atendidos', elderly.length.toString()],
        ['PIAs em Andamento', pias.filter(p => p.status === 'EM_ANDAMENTO').length.toString()],
        ['Evoluções Totais', unifiedEvolutions.length.toString()],
        ['Atendimentos de Fisioterapia', physioEvolutions.length.toString()],
        ['Atendimentos de Psicologia', psychEvolutions.length.toString()],
        ['Atendimentos de Pedagogia', pedagogyEvolutions.length.toString()],
        ['Atendimentos de Serviço Social', socialEvolutions.length.toString()],
        ['Atendimentos de Enfermagem', nursingEvolutions.length.toString()]
      ];

      generateModernPDF({
        title: 'Relatório de Monitoramento e Impacto',
        subtitle: `Indicadores Institucionais - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: 'relatorio_monitoramento'
      });
      showToast('Relatório de monitoramento exportado com sucesso!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório de monitoramento', 'error');
    } finally {
      setExporting(false);
    }
  };

  const selectedElderly = elderly.find(e => e.id === selectedElderlyId);
  const elderlyPia = pias.find(p => p.elderlyId === selectedElderlyId);
  const elderlyEvolutions = unifiedEvolutions.filter(ev => ev.elderlyId === selectedElderlyId);
  const elderlyVitals = vitalSigns.filter(v => v.patientId === selectedElderlyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const elderlyEmotions = psychEmotionalMonitorings.filter(m => m.patientId === selectedElderlyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Monitoramento e Avaliação de Impacto</h2>
            <p className="text-sm text-gray-500">Acompanhamento integrado de todas as áreas profissionais</p>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={generateMonitoringPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-xl text-sm font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all disabled:opacity-50"
            >
              <FileDown size={18} />
              Relatório PDF
            </button>
          </div>
        </div>

        {/* Tabs de Navegação do Monitoramento */}
        <div className="flex gap-4 mb-8 overflow-x-auto pb-2">
          {[
            { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
            { id: 'evolutions', label: 'Evoluções', icon: Activity },
            { id: 'pias', label: 'PIAs Sociais', icon: ClipboardList },
            { id: 'health', label: 'Saúde e Vitals', icon: HeartPulse },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={cn(
                "flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all whitespace-nowrap",
                activeTab === tab.id 
                  ? "bg-green-600 text-white shadow-lg shadow-green-600/20" 
                  : "bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700"
              )}
            >
              <tab.icon size={18} />
              {tab.label}
            </button>
          ))}
        </div>
        
        {activeTab === 'dashboard' && (
          <div className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[
                { label: 'Total Idosos', value: elderly.length, icon: Users, color: 'text-blue-600' },
                { label: 'PIAs Ativos', value: pias.filter(p => p.status === 'EM_ANDAMENTO').length, icon: ClipboardList, color: 'text-green-600' },
                { label: 'Evoluções (Total)', value: unifiedEvolutions.length, icon: Activity, color: 'text-purple-600' },
                { label: 'Workshops', value: workshops.length, icon: BookOpen, color: 'text-orange-600' },
              ].map((m, i) => (
                <div key={i} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <div className="flex items-center justify-between mb-4">
                    <m.icon className={m.color} size={20} />
                  </div>
                  <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-1">{m.label}</p>
                  <span className="text-3xl font-bold text-gray-800 dark:text-white">{m.value}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Distribuição de Atendimentos</h3>
                <div className="h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Social', value: socialEvolutions.length },
                          { name: 'Psicologia', value: psychEvolutions.length },
                          { name: 'Pedagogia', value: pedagogyEvolutions.length },
                          { name: 'Fisioterapia', value: physioEvolutions.length },
                          { name: 'Enfermagem', value: nursingEvolutions.length },
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map((color, index) => (
                          <Cell key={`cell-${index}`} fill={color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                <h3 className="font-bold text-gray-800 dark:text-white mb-6">Status dos PIAs</h3>
                <div className="space-y-4">
                  {['EM_ANDAMENTO', 'CONCLUIDO', 'REVISAR'].map(status => {
                    const count = pias.filter(p => p.status === status).length;
                    const percentage = pias.length > 0 ? (count / pias.length) * 100 : 0;
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-gray-600 dark:text-gray-400">{status.replace('_', ' ')}</span>
                          <span className="font-bold text-gray-800 dark:text-white">{count}</span>
                        </div>
                        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={cn(
                              "h-full rounded-full transition-all duration-500",
                              status === 'EM_ANDAMENTO' ? 'bg-blue-500' : status === 'CONCLUIDO' ? 'bg-green-500' : 'bg-yellow-500'
                            )}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'evolutions' && (
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <Activity className="text-blue-600 dark:text-blue-400" size={24} />
                Timeline de Evoluções Multidisciplinares
              </h3>
              <select 
                className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64 text-gray-800 dark:text-white"
                value={selectedElderlyId}
                onChange={(e) => setSelectedElderlyId(e.target.value)}
              >
                <option value="">Todos os idosos...</option>
                {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            <div className="space-y-4">
              {(selectedElderlyId ? elderlyEvolutions : unifiedEvolutions).slice(0, 20).map((ev, i) => (
                <div key={i} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    ev.source === 'Social' ? 'bg-blue-100 text-blue-600' :
                    ev.source === 'Psicologia' ? 'bg-green-100 text-green-600' :
                    ev.source === 'Pedagogia' ? 'bg-yellow-100 text-yellow-600' :
                    ev.source === 'Fisioterapia' ? 'bg-red-100 text-red-600' :
                    'bg-purple-100 text-purple-600'
                  )}>
                    <UserCircle size={24} />
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <h4 className="font-bold text-gray-800 dark:text-white">
                          {elderly.find(e => e.id === ev.elderlyId)?.name || 'Idoso não encontrado'}
                        </h4>
                        <span className="text-xs font-bold text-blue-600 uppercase">{ev.source}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-bold">{format(parseISO(ev.date), 'dd/MM/yyyy HH:mm')}</span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">{ev.content}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'pias' && (
          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
              <ClipboardList className="text-green-600 dark:text-green-400" size={24} />
              Planos Individuais de Atendimento (PIA)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {pias.map(pia => {
                const resident = elderly.find(e => e.id === pia.elderlyId);
                return (
                  <div key={pia.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-gray-800 dark:text-white">{resident?.name}</h4>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        pia.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-600' :
                        pia.status === 'CONCLUIDO' ? 'bg-green-100 text-green-600' :
                        'bg-yellow-100 text-yellow-600'
                      )}>
                        {pia.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Objetivos</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{pia.objectives}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Ações</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{pia.actions}</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {activeTab === 'health' && (
          <div className="space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <HeartPulse className="text-red-600 dark:text-red-400" size={24} />
                Monitoramento de Saúde e Bem-estar
              </h3>
              <select 
                className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 w-full md:w-64 text-gray-800 dark:text-white"
                value={selectedElderlyId}
                onChange={(e) => setSelectedElderlyId(e.target.value)}
              >
                <option value="">Selecione um idoso...</option>
                {(elderly || []).map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>

            {selectedElderly ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-6">Sinais Vitais (Últimos Registros)</h4>
                  <div className="space-y-4">
                    {elderlyVitals.slice(0, 5).map((v, i) => (
                      <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700 grid grid-cols-3 gap-4">
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">PA</p>
                          <p className="font-bold text-gray-800 dark:text-white">{v.systolicBP}/{v.diastolicBP}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Temp</p>
                          <p className="font-bold text-gray-800 dark:text-white">{v.temperature}°C</p>
                        </div>
                        <div className="text-center">
                          <p className="text-[10px] font-bold text-gray-400 uppercase">Sat</p>
                          <p className="font-bold text-gray-800 dark:text-white">{v.saturation}%</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                  <h4 className="font-bold text-gray-800 dark:text-white mb-6">Monitoramento Emocional</h4>
                  <div className="space-y-4">
                    {elderlyEmotions.slice(0, 5).map((m, i) => (
                      <div key={i} className="p-4 bg-white dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-xs font-bold text-gray-400">{format(parseISO(m.date), 'dd/MM/yyyy')}</span>
                          <span className={cn(
                            "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                            m.wellBeing === 'FELIZ' ? 'bg-green-100 text-green-600' :
                            m.wellBeing === 'NEUTRO' ? 'bg-yellow-100 text-yellow-600' :
                            'bg-red-100 text-red-600'
                          )}>
                            {m.wellBeing}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{m.observations}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-20 bg-gray-50 dark:bg-gray-800/30 rounded-3xl border border-dashed border-gray-200 dark:border-gray-700">
                <p className="text-gray-500 dark:text-gray-400 font-medium">Selecione um idoso para visualizar os dados de saúde</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};


const NotificationsModal = ({ events, onClose, onViewSchedule }: { 
  events: CalendarEvent[], 
  onClose: () => void,
  onViewSchedule: () => void
}) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const upcoming = (events || [])
    .filter(ev => parseISO(ev.date) >= today)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, 5);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white">
          <div className="flex items-center gap-2">
            <Bell size={20} />
            <h3 className="text-xl font-bold">Notificações</h3>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto">
          {upcoming.length > 0 ? (
            <>
              <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">Próximos Eventos</p>
              {upcoming.map((ev, i) => (
                <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex flex-col items-center justify-center text-green-600 dark:text-green-400">
                    <span className="text-[8px] font-bold uppercase">{format(parseISO(ev.date), 'MMM', { locale: ptBR })}</span>
                    <span className="text-sm font-bold leading-none">{format(parseISO(ev.date), 'dd')}</span>
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-white">{ev.title}</h4>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400">{ev.type}</p>
                  </div>
                </div>
              ))}
              <button 
                onClick={() => {
                  onViewSchedule();
                  onClose();
                }}
                className="w-full py-3 text-sm font-bold text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
              >
                Ver Cronograma Completo
              </button>
            </>
          ) : (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
                <BellOff size={32} />
              </div>
              <p className="text-gray-500 dark:text-gray-400 font-medium">Nenhuma notificação nova</p>
              <p className="text-xs text-gray-400 mt-1">Fique atento para novos eventos e avisos.</p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

const ProfileModal = ({ user, theme, onThemeChange, onClose, onUpdate, showToast, showConfirm }: { 
  user: User, 
  theme: 'light' | 'dark',
  onThemeChange: (theme: 'light' | 'dark') => void,
  onClose: () => void, 
  onUpdate: (updatedUser: User) => void,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  showConfirm: (msg: string, onConfirm: () => void) => void
}) => {
  const [formData, setFormData] = useState({
    name: user.name,
    photoUrl: user.photoUrl || '',
    registrationNumber: user.registrationNumber || '',
    email: auth.currentUser?.email || ''
  });
  const [loading, setLoading] = useState(false);
  const [isEditingPhoto, setIsEditingPhoto] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (auth.currentUser) {
        // Update Firestore
        await updateDoc(doc(db, 'users', auth.currentUser.uid), {
          name: formData.name,
          photoUrl: formData.photoUrl,
          registrationNumber: formData.registrationNumber
        });
        
        // Update Email if changed
        if (formData.email !== auth.currentUser.email) {
          try {
            await updateEmail(auth.currentUser, formData.email);
          } catch (err: any) {
            if (err.code === 'auth/requires-recent-login') {
              showToast('Para alterar o e-mail, você precisa ter feito login recentemente. Por favor, saia e entre novamente.', 'error');
            } else {
              throw err;
            }
          }
        }
      }
      onUpdate({ ...user, ...formData });
      showToast('Perfil atualizado com sucesso!');
      onClose();
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast('Erro ao atualizar perfil. Verifique os dados e tente novamente.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async () => {
    showConfirm('TEM CERTEZA? Esta ação é irreversível e todos os seus dados de acesso serão excluídos.', async () => {
      setLoading(true);
      try {
        if (auth.currentUser) {
          await deleteUser(auth.currentUser);
          window.location.reload();
        }
      } catch (err: any) {
        if (err.code === 'auth/requires-recent-login') {
          showToast('Para excluir sua conta, você precisa ter feito login recentemente. Por favor, saia e entre novamente.', 'error');
        } else {
          console.error("Error deleting account:", err);
          showToast('Erro ao excluir conta.', 'error');
        }
      } finally {
        setLoading(false);
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white dark:bg-gray-900 rounded-3xl shadow-2xl w-full max-w-md overflow-hidden max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-green-600 text-white sticky top-0 z-10">
          <h3 className="text-xl font-bold">Meu Perfil Profissional</h3>
          <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {/* Theme Toggle */}
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700">
            <div className="flex items-center gap-3">
              {theme === 'light' ? <Sun className="text-orange-500" size={20} /> : <Moon className="text-blue-400" size={20} />}
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">Tema do Sistema</p>
                <p className="text-[10px] text-gray-400 uppercase">Alternar entre claro e escuro</p>
              </div>
            </div>
            <button 
              onClick={() => onThemeChange(theme === 'light' ? 'dark' : 'light')}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative",
                theme === 'dark' ? "bg-green-600" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "absolute top-1 w-4 h-4 bg-white rounded-full transition-all",
                theme === 'dark' ? "left-7" : "left-1"
              )} />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex flex-col items-center gap-4">
              <div className="relative group">
                <div className="w-24 h-24 rounded-2xl bg-gray-100 dark:bg-gray-800 border-2 border-green-100 dark:border-green-900 overflow-hidden flex items-center justify-center">
                  {formData.photoUrl ? (
                    <img src={formData.photoUrl} alt="Profile" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  ) : (
                    <UserCircle size={48} className="text-gray-300 dark:text-gray-600" />
                  )}
                </div>
                <button 
                  type="button"
                  onClick={() => setIsEditingPhoto(!isEditingPhoto)}
                  className="absolute bottom-1 right-1 p-2 bg-green-600 text-white rounded-lg shadow-lg cursor-pointer hover:bg-green-700 transition-colors"
                >
                  <Camera size={16} />
                </button>
              </div>
              <p className="text-[10px] text-gray-400 uppercase font-bold tracking-wider">Foto de Perfil</p>
              
              {isEditingPhoto && (
                <div className="w-full flex gap-2 animate-in fade-in slide-in-from-top-2">
                  <input 
                    type="url"
                    placeholder="Cole a URL da imagem aqui..."
                    className="flex-1 p-2 text-xs border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 outline-none focus:ring-2 focus:ring-green-500"
                    value={formData.photoUrl}
                    onChange={(e) => setFormData({ ...formData, photoUrl: e.target.value })}
                  />
                  <button 
                    type="button"
                    onClick={() => setIsEditingPhoto(false)}
                    className="px-3 py-2 bg-green-600 text-white text-xs font-bold rounded-lg"
                  >
                    OK
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Nome Completo</label>
                <input 
                  type="text" 
                  required
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail de Acesso</label>
                <input 
                  type="email" 
                  required
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Registro Profissional</label>
                <input 
                  type="text" 
                  placeholder="Ex: COREN-MA 123.456"
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                  value={formData.registrationNumber}
                  onChange={(e) => setFormData({ ...formData, registrationNumber: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">Cargo/Função</label>
                <input 
                  type="text" 
                  disabled
                  className="w-full p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 rounded-xl text-gray-500 dark:text-gray-400 cursor-not-allowed"
                  value={ROLE_LABELS[user.role]}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-4">
              <button 
                type="button"
                onClick={onClose}
                className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
              >
                Cancelar
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all disabled:opacity-50"
              >
                {loading ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={handleDeleteAccount}
              disabled={loading}
              className="w-full p-4 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
            >
              <Trash2 size={18} />
              Desvincular Minha Conta
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2 uppercase">Atenção: Esta ação excluirá permanentemente seu acesso.</p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

const SettingsSection = ({ users, showToast, institutionalInfo }: { users: User[], showToast: (msg: string, type?: 'success' | 'error') => void, institutionalInfo: InstitutionalInfo | null }) => {
  const [activeSubTab, setActiveSubTab] = useState<'users' | 'institution' | 'security'>('users');
  const [loading, setLoading] = useState(false);
  const [instData, setInstData] = useState<InstitutionalInfo>({
    mission: institutionalInfo?.mission || '',
    vision: institutionalInfo?.vision || '',
    values: institutionalInfo?.values || '',
    history: institutionalInfo?.history || ''
  });

  useEffect(() => {
    if (institutionalInfo) {
      setInstData(institutionalInfo);
    }
  }, [institutionalInfo]);

  const handleUpdateInstitutional = async () => {
    setLoading(true);
    try {
      await setDoc(doc(db, 'settings', 'institutional'), instData);
      showToast('Informações institucionais atualizadas com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, 'settings/institutional');
      showToast('Erro ao atualizar informações', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRole = async (userId: string, newRole: Role) => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'users', userId), { role: newRole });
      showToast('Cargo atualizado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${userId}`);
      showToast('Erro ao atualizar cargo', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-gray-600 dark:bg-gray-700 rounded-2xl text-white shadow-lg">
              <Settings size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Configurações do Sistema</h2>
              <p className="text-gray-500 dark:text-gray-400">Gerenciamento de parâmetros e permissões da plataforma</p>
            </div>
          </div>
          <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-800 rounded-xl">
            <button 
              onClick={() => setActiveSubTab('users')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeSubTab === 'users' ? "bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              Gestão de Equipe
            </button>
            <button 
              onClick={() => setActiveSubTab('institution')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeSubTab === 'institution' ? "bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              Instituição
            </button>
            <button 
              onClick={() => setActiveSubTab('security')}
              className={cn(
                "px-4 py-2 rounded-lg text-xs font-bold transition-all",
                activeSubTab === 'security' ? "bg-white dark:bg-gray-700 text-green-600 dark:text-green-400 shadow-sm" : "text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200"
              )}
            >
              Segurança
            </button>
          </div>
        </div>

        {activeSubTab === 'users' && (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Profissional</th>
                    <th className="px-6 py-4">Cargo Atual</th>
                    <th className="px-6 py-4">Alterar Cargo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                            {u.photoUrl ? (
                              <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                <UserCircle size={20} />
                              </div>
                            )}
                          </div>
                          <div>
                            <p className="font-bold text-gray-800 dark:text-white">{u.name}</p>
                            <p className="text-xs text-gray-400 dark:text-gray-500">{u.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold">
                          {ROLE_LABELS[u.role]}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <select 
                          disabled={loading}
                          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                          value={u.role}
                          onChange={(e) => handleUpdateRole(u.id, e.target.value as Role)}
                        >
                          {Object.entries(ROLE_LABELS).map(([value, label]) => (
                            <option key={value} value={value}>{label}</option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeSubTab === 'institution' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4">
            <div className="grid grid-cols-1 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Missão da Instituição</label>
                <textarea 
                  value={instData.mission} 
                  onChange={e => setInstData({...instData, mission: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-sm text-gray-700 dark:text-gray-300" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Visão da Instituição</label>
                <textarea 
                  value={instData.vision} 
                  onChange={e => setInstData({...instData, vision: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-sm text-gray-700 dark:text-gray-300" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Valores da Instituição</label>
                <textarea 
                  value={instData.values} 
                  onChange={e => setInstData({...instData, values: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-sm text-gray-700 dark:text-gray-300" 
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider">Nossa História</label>
                <textarea 
                  value={instData.history} 
                  onChange={e => setInstData({...instData, history: e.target.value})}
                  className="w-full p-4 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-64 text-sm text-gray-700 dark:text-gray-300" 
                />
              </div>
            </div>
            <button 
              disabled={loading}
              onClick={handleUpdateInstitutional}
              className="w-full md:w-auto bg-green-600 text-white font-bold px-10 py-4 rounded-2xl shadow-xl shadow-green-100 dark:shadow-none hover:bg-green-700 transition-all flex items-center justify-center gap-2"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
              Salvar Informações Institucionais
            </button>
          </div>
        )}

        {activeSubTab === 'security' && (
          <div className="space-y-6">
            <div className="flex items-center gap-4 p-6 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-100 dark:border-yellow-900/30 rounded-3xl">
              <div className="p-3 bg-yellow-100 dark:bg-yellow-900/30 rounded-2xl text-yellow-600 dark:text-yellow-400">
                <Shield size={24} />
              </div>
              <div>
                <p className="font-bold text-yellow-800 dark:text-yellow-400">Logs de Segurança</p>
                <p className="text-sm text-yellow-700 dark:text-yellow-500">Acompanhamento de acessos e alterações críticas no sistema.</p>
              </div>
            </div>
            <div className="space-y-4">
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-200" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tighter">Backup Automático Diário</span>
                </div>
                <span className="text-[10px] font-black px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">ATIVADO</span>
              </div>
              <div className="p-5 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-2xl flex justify-between items-center shadow-sm">
                <div className="flex items-center gap-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse shadow-sm shadow-green-200" />
                  <span className="text-sm font-bold text-gray-700 dark:text-gray-200 uppercase tracking-tighter">Criptografia em Repouso</span>
                </div>
                <span className="text-[10px] font-black px-3 py-1 bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 rounded-full">ATIVADO</span>
              </div>
            </div>
          </div>
        )}

        <div className="mt-12 p-6 bg-blue-50 rounded-2xl border border-blue-100 flex items-start gap-4">
          <Info className="text-blue-600 mt-1" size={20} />
          <div>
            <h4 className="font-bold text-blue-800 text-sm">Acesso Restrito</h4>
            <p className="text-xs text-blue-600 mt-1">
              Esta área é acessível apenas para a Presidência, Coordenação e Projetista. 
              Alterações aqui podem impactar o funcionamento global do sistema.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    const saved = localStorage.getItem('oami-theme');
    return (saved as 'light' | 'dark') || 'light';
  });
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [confirmModal, setConfirmModal] = useState<{ message: string, onConfirm: () => void } | null>(null);

  const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const showConfirm = (message: string, onConfirm: () => void) => {
    setConfirmModal({ message, onConfirm });
  };

  useEffect(() => {
    localStorage.setItem('oami-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);
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
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [pias, setPias] = useState<PIA[]>([]);
  const [allPhotos, setAllPhotos] = useState<GalleryItem[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [communityElderly, setCommunityElderly] = useState<CommunityElderly[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [familyEngagements, setFamilyEngagements] = useState<FamilyEngagement[]>([]);
  const [institutionalInfo, setInstitutionalInfo] = useState<InstitutionalInfo | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const savePhotosToGallery = async (
    photos: string[], 
    patientId: string, 
    patientName: string, 
    activityType: string, 
    description?: string,
    category: GalleryItem['category'] = 'MULTIDISCIPLINAR'
  ) => {
    if (!user || photos.length === 0) return;
    
    try {
      const promises = photos.map(url => {
        const galleryItem: any = {
          url,
          professionalId: user.id,
          professionalName: user.name,
          professionalRole: user.role,
          date: new Date().toISOString(),
          activityType,
          category
        };

        if (patientId) galleryItem.patientId = patientId;
        if (patientName) galleryItem.patientName = patientName;
        if (description) galleryItem.description = description;

        return addDoc(collection(db, 'gallery'), galleryItem);
      });
      await Promise.all(promises);
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'gallery');
    }
  };

  // Physio states
  const [physioPatients, setPhysioPatients] = useState<PhysioPatient[]>([]);
  const [physioAssessments, setPhysioAssessments] = useState<PhysioAssessment[]>([]);
  const [physioEvolutions, setPhysioEvolutions] = useState<PhysioEvolution[]>([]);
  const [physioExercises, setPhysioExercises] = useState<PhysioExercise[]>([]);
  const [physioAppointments, setPhysioAppointments] = useState<PhysioAppointment[]>([]);

  // Nursing states
  const [nursingPatients, setNursingPatients] = useState<NursingPatient[]>([]);
  const [medications, setMedications] = useState<Medication[]>([]);
  const [medicationAdministrations, setMedicationAdministrations] = useState<MedicationAdministration[]>([]);
  const [vitalSigns, setVitalSigns] = useState<VitalSigns[]>([]);
  const [dressingRecords, setDressingRecords] = useState<DressingRecord[]>([]);
  const [nursingEvolutions, setNursingEvolutions] = useState<NursingEvolution[]>([]);
  const [incidentRecords, setIncidentRecords] = useState<IncidentRecord[]>([]);
  const [shiftSchedules, setShiftSchedules] = useState<ShiftSchedule[]>([]);
  const [avdRecords, setAvdRecords] = useState<AVDRecord[]>([]);
  const [diaperChangeRecords, setDiaperChangeRecords] = useState<DiaperChangeRecord[]>([]);

  // Psychology states
  const [psychPatients, setPsychPatients] = useState<PsychPatient[]>([]);
  const [psychInitialAssessments, setPsychInitialAssessments] = useState<PsychInitialAssessment[]>([]);
  const [psychEvolutions, setPsychEvolutions] = useState<PsychEvolution[]>([]);
  const [psychAppointments, setPsychAppointments] = useState<PsychAppointment[]>([]);
  const [psychEmotionalMonitorings, setPsychEmotionalMonitorings] = useState<PsychEmotionalMonitoring[]>([]);
  const [psychFamilyBonds, setPsychFamilyBonds] = useState<PsychFamilyBond[]>([]);
  const [psychActivities, setPsychActivities] = useState<PsychActivity[]>([]);
  const [psychCognitionAssessments, setPsychCognitionAssessments] = useState<PsychCognitionAssessment[]>([]);
  const [psychInterventionPlans, setPsychInterventionPlans] = useState<PsychInterventionPlan[]>([]);

  // Pedagogy states
  const [pedagogyPatients, setPedagogyPatients] = useState<PedagogyPatient[]>([]);
  const [pedagogyInitialAssessments, setPedagogyInitialAssessments] = useState<PedagogyInitialAssessment[]>([]);
  const [pedagogyEvolutions, setPedagogyEvolutions] = useState<PedagogyEvolution[]>([]);
  const [pedagogyActivities, setPedagogyActivities] = useState<PedagogyActivity[]>([]);
  const [pedagogyStimulationTrackings, setPedagogyStimulationTrackings] = useState<PedagogyStimulationTracking[]>([]);
  const [pedagogySocialParticipations, setPedagogySocialParticipations] = useState<PedagogySocialParticipation[]>([]);
  const [pedagogyIndividualPlans, setPedagogyIndividualPlans] = useState<PedagogyIndividualPlan[]>([]);
  const [pedagogyLifeHistories, setPedagogyLifeHistories] = useState<PedagogyLifeHistory[]>([]);

  // Social Work State
  const [socialPatients, setSocialPatients] = useState<SocialPatient[]>([]);
  const [socialFamilyTies, setSocialFamilyTies] = useState<SocialFamilyTie[]>([]);
  const [socialDocumentations, setSocialDocumentations] = useState<SocialDocumentation[]>([]);
  const [socialLegalSituations, setSocialLegalSituations] = useState<SocialLegalSituation[]>([]);
  const [socialStudies, setSocialStudies] = useState<SocialStudy[]>([]);
  const [socialEvolutions, setSocialEvolutions] = useState<SocialEvolution[]>([]);
  const [socialReferrals, setSocialReferrals] = useState<SocialReferral[]>([]);
  const [socialFamilyVisits, setSocialFamilyVisits] = useState<SocialFamilyVisit[]>([]);
  const [socialRiskSituations, setSocialRiskSituations] = useState<SocialRiskSituation[]>([]);

  const physioPatientsList = useMemo(() => {
    return (elderly || []).map(e => {
      const p = (physioPatients || []).find(pp => pp.elderlyId === e.id);
      return {
        ...p,
        id: e.id,
        elderlyId: e.id,
        name: e.name,
        age: e.age,
        photoUrl: e.photoUrl || p?.photoUrl,
        diagnosis: p?.diagnosis || 'Não informado',
        phone: p?.phone || e.phone || 'Não informado',
        observations: p?.observations || '',
        category: p?.category || 'IDOSOS',
        createdAt: p?.createdAt || e.entryDate
      } as PhysioPatient;
    });
  }, [elderly, physioPatients]);

  const nursingPatientsList = useMemo(() => {
    return (elderly || []).map(e => {
      const p = (nursingPatients || []).find(pp => pp.elderlyId === e.id);
      return {
        ...p,
        id: e.id,
        elderlyId: e.id,
        name: e.name,
        age: e.age,
        photoUrl: e.photoUrl || p?.photoUrl,
        diagnosis: p?.diagnosis || 'Não informado',
        comorbidities: p?.comorbidities || '',
        allergies: p?.allergies || 'Nenhuma',
        familyContact: p?.familyContact || e.responsibleName || 'Não informado',
        riskLevel: p?.riskLevel || 'BAIXO',
        isBedridden: p?.isBedridden || false,
        fallRisk: p?.fallRisk || 'BAIXO',
        createdAt: p?.createdAt || e.entryDate
      } as NursingPatient;
    });
  }, [elderly, nursingPatients]);

  const psychPatientsList = useMemo(() => {
    return (elderly || []).map(e => {
      const p = (psychPatients || []).find(pp => pp.elderlyId === e.id);
      return {
        ...p,
        id: e.id,
        elderlyId: e.id,
        name: e.name,
        age: e.age,
        photoUrl: e.photoUrl || p?.photoUrl,
        entryDate: e.entryDate,
        familyContact: p?.familyContact || e.responsibleName || 'Não informado',
        lifeHistory: p?.lifeHistory || '',
        hasVisits: p?.hasVisits || false,
        createdAt: p?.createdAt || e.entryDate
      } as PsychPatient;
    });
  }, [elderly, psychPatients]);

  const pedagogyPatientsList = useMemo(() => {
    return (elderly || []).map(e => {
      const p = (pedagogyPatients || []).find(pp => pp.elderlyId === e.id);
      return {
        ...p,
        id: e.id,
        elderlyId: e.id,
        name: e.name,
        age: e.age,
        photoUrl: e.photoUrl || p?.photoUrl,
        schooling: p?.schooling || '',
        previousProfession: p?.previousProfession || '',
        interests: p?.interests || [],
        cognitiveLimitations: p?.cognitiveLimitations || '',
        literacyLevel: p?.literacyLevel || 'ALFABETIZADO',
        cognitiveLevel: p?.cognitiveLevel || 'MEDIO',
        favoriteActivities: p?.favoriteActivities || [],
        routinePreference: p?.routinePreference || 'MISTO',
        createdAt: p?.createdAt || e.entryDate
      } as PedagogyPatient;
    });
  }, [elderly, pedagogyPatients]);

  const socialPatientsList = useMemo(() => {
    return (elderly || []).map(e => {
      const p = (socialPatients || []).find(pp => pp.elderlyId === e.id);
      return {
        ...p,
        id: e.id,
        elderlyId: e.id,
        name: e.name,
        birthDate: e.birthDate || '',
        photoUrl: e.photoUrl || p?.photoUrl,
        naturalness: p?.naturalness || '',
        maritalStatus: p?.maritalStatus || 'SOLTEIRO',
        schooling: p?.schooling || '',
        previousProfession: p?.previousProfession || '',
        income: p?.income || 0,
        benefits: p?.benefits || [],
        benefitStatus: p?.benefitStatus || 'NAO_POSSUI',
        createdAt: p?.createdAt || e.entryDate
      } as SocialPatient;
    });
  }, [elderly, socialPatients]);

  const handleSmartCommand = async (result: AISmartCommandResult) => {
    if (!user) return;
    
    try {
      const dataWithMeta: any = {
        ...(result.data || {}),
        registeredBy: user.name,
        registeredById: user.id,
        date: result.data?.date || new Date().toISOString().split('T')[0],
        createdAt: new Date().toISOString()
      };

      // Add patientId if available
      if (result.patientId) {
        dataWithMeta.patientId = result.patientId;
        dataWithMeta.elderlyId = result.patientId; // Some types refer to it differently
      }

      let collectionName = '';
      switch (result.recordType) {
        case 'PSYCH_EVOLUTION': collectionName = 'psychEvolutions'; break;
        case 'PSYCH_APPOINTMENT': collectionName = 'psychAppointments'; break;
        case 'PEDAGOGY_EVOLUTION': collectionName = 'pedagogyEvolutions'; break;
        case 'PEDAGOGY_ACTIVITY': collectionName = 'pedagogyActivities'; break;
        case 'PSYCH_ACTIVITY': collectionName = 'psychActivities'; break;
        case 'WORKSHOP': collectionName = 'workshops'; break;
        case 'CALENDAR_EVENT': 
          collectionName = 'calendarEvents'; 
          dataWithMeta.title = result.data?.title || "Evento via IA";
          dataWithMeta.type = result.data?.type || 'REUNIAO';
          break;
        case 'EVOLUTION_RECORD': collectionName = 'evolutions'; break;
        case 'INCIDENT_RECORD': collectionName = 'incidentRecords'; break;
        case 'PHYSIO_EVOLUTION': collectionName = 'physioEvolutions'; break;
        case 'SOCIAL_EVOLUTION': collectionName = 'socialEvolutions'; break;
        case 'NURSING_EVOLUTION': collectionName = 'nursingEvolutions'; break;
        case 'MEDICAL_APPOINTMENT': collectionName = 'medicalAppointments'; break;
        case 'PHYSICAL_EXAM': collectionName = 'physicalExams'; break;
        case 'ADMIN_NOTICE': collectionName = 'adminNotices'; break;
        case 'FAMILY_MEETING': collectionName = 'familyMeetings'; break;
        case 'NUTRITION_EVOLUTION': collectionName = 'nutritionEvolutions'; break;
        default: 
          showToast(`Tipo de registro ${result.recordType} ainda não mapeado para salvamento automático.`, 'error');
          return;
      }

      await addDoc(collection(db, collectionName), dataWithMeta);
      showToast('Registro salvo com sucesso via Smart IA!', 'success');
    } catch (err) {
      console.error("Error saving smart command:", err);
      showToast('Erro ao salvar registro da IA.', 'error');
    }
  };

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
    let unsubDonors = () => {};
    if (user.role === 'PRESIDENTE' || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
      const qDonors = query(collection(db, 'donors'), orderBy('name'));
      unsubDonors = onSnapshot(qDonors, (snapshot) => {
        setDonors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'donors'));
    }

    // Listen to Diaper Donations
    let unsubDiaperDonations = () => {};
    if (['PRESIDENTE', 'COORDENADORA', 'ASSISTENTE_SOCIAL', 'PROJETISTA'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
      const qDiaperDonations = query(collection(db, 'diaperDonations'), orderBy('date', 'desc'));
      unsubDiaperDonations = onSnapshot(qDiaperDonations, (snapshot) => {
        setDiaperDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperDonation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperDonations'));
    }

    // Listen to Volunteers
    const qVolunteers = query(collection(db, 'volunteers'), orderBy('name'));
    const unsubVolunteers = onSnapshot(qVolunteers, (snapshot) => {
      setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'volunteers'));

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

    // Listen to Financial Records
    let unsubFinancial = () => {};
    if (user.role === 'PRESIDENTE' || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
      const qFinancial = query(collection(db, 'financial'), orderBy('date', 'desc'));
      unsubFinancial = onSnapshot(qFinancial, (snapshot) => {
        setFinancialRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'financial'));
    }

    // Listen to All Users (for Settings)
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      setAllUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'users');
      showToast('Erro ao carregar usuários', 'error');
    });

    // Listen to PIAs
    const unsubPias = onSnapshot(collection(db, 'pias'), (snapshot) => {
      setPias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PIA)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'pias');
      showToast('Erro ao carregar PIAs', 'error');
    });

    // Listen to Gallery
    const qGallery = query(collection(db, 'gallery'), orderBy('date', 'desc'));
    const unsubGallery = onSnapshot(qGallery, (snapshot) => {
      const galleryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
      if (!galleryData || galleryData.length === 0) {
        setAllPhotos(MOCK_GALLERY);
      } else {
        setAllPhotos(galleryData);
      }
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'gallery');
      showToast('Erro ao carregar galeria', 'error');
    });

    // Listen to Community Elderly
    const qCommunityElderly = query(collection(db, 'communityElderly'), orderBy('name'));
    const unsubCommunityElderly = onSnapshot(qCommunityElderly, (snapshot) => {
      setCommunityElderly(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityElderly)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'communityElderly'));

    // Listen to Workshops
    const qWorkshops = query(collection(db, 'workshops'), orderBy('date', 'desc'));
    const unsubWorkshops = onSnapshot(qWorkshops, (snapshot) => {
      setWorkshops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'workshops'));

    // Listen to Caregivers
    const qCaregivers = query(collection(db, 'caregivers'), orderBy('name'));
    const unsubCaregivers = onSnapshot(qCaregivers, (snapshot) => {
      setCaregivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caregiver)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'caregivers'));

    // Listen to Family Engagements
    const qFamilyEngagements = query(collection(db, 'familyEngagements'), orderBy('date', 'desc'));
    const unsubFamilyEngagements = onSnapshot(qFamilyEngagements, (snapshot) => {
      setFamilyEngagements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyEngagement)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'familyEngagements'));

    // Listen to Institutional Info
    const unsubInstitutionalInfo = onSnapshot(doc(db, 'settings', 'institutional'), (docSnap) => {
      if (docSnap.exists()) {
        setInstitutionalInfo(docSnap.data() as InstitutionalInfo);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'settings/institutional'));

    // Physio Listeners
    const qPhysioPatients = query(collection(db, 'physioPatients'), orderBy('name'));
    const unsubPhysioPatients = onSnapshot(qPhysioPatients, (snapshot) => {
      setPhysioPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioPatient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioPatients'));

    const qPhysioAssessments = query(collection(db, 'physioAssessments'), orderBy('date', 'desc'));
    const unsubPhysioAssessments = onSnapshot(qPhysioAssessments, (snapshot) => {
      setPhysioAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioAssessment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioAssessments'));

    const qPhysioEvolutions = query(collection(db, 'physioEvolutions'), orderBy('date', 'desc'));
    const unsubPhysioEvolutions = onSnapshot(qPhysioEvolutions, (snapshot) => {
      setPhysioEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioEvolution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioEvolutions'));

    const qPhysioExercises = query(collection(db, 'physioExercises'), orderBy('title'));
    const unsubPhysioExercises = onSnapshot(qPhysioExercises, (snapshot) => {
      setPhysioExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioExercise)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioExercises'));

    const qPhysioAppointments = query(collection(db, 'physioAppointments'), orderBy('date', 'desc'));
    const unsubPhysioAppointments = onSnapshot(qPhysioAppointments, (snapshot) => {
      setPhysioAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioAppointment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioAppointments'));

    // Nursing Listeners
    const unsubNursingPatients = onSnapshot(query(collection(db, 'nursingPatients'), orderBy('name')), (snapshot) => {
      setNursingPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingPatient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'nursingPatients'));

    const unsubMedications = onSnapshot(collection(db, 'medications'), (snapshot) => {
      setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'medications'));

    const unsubMedicationAdministrations = onSnapshot(query(collection(db, 'medicationAdministrations'), orderBy('date', 'desc')), (snapshot) => {
      setMedicationAdministrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationAdministration)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'medicationAdministrations'));

    const unsubVitalSigns = onSnapshot(query(collection(db, 'vitalSigns'), orderBy('date', 'desc')), (snapshot) => {
      setVitalSigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitalSigns)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'vitalSigns'));

    const unsubDressingRecords = onSnapshot(query(collection(db, 'dressingRecords'), orderBy('date', 'desc')), (snapshot) => {
      setDressingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DressingRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'dressingRecords'));

    const unsubNursingEvolutions = onSnapshot(query(collection(db, 'nursingEvolutions'), orderBy('date', 'desc')), (snapshot) => {
      setNursingEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingEvolution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'nursingEvolutions'));

    const unsubIncidentRecords = onSnapshot(query(collection(db, 'incidentRecords'), orderBy('date', 'desc')), (snapshot) => {
      setIncidentRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncidentRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'incidentRecords'));

    const unsubShiftSchedules = onSnapshot(query(collection(db, 'shiftSchedules'), orderBy('date', 'desc')), (snapshot) => {
      setShiftSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftSchedule)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'shiftSchedules'));

    const unsubAvdRecords = onSnapshot(query(collection(db, 'avdRecords'), orderBy('date', 'desc')), (snapshot) => {
      setAvdRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AVDRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'avdRecords'));

    const unsubDiaperChangeRecords = onSnapshot(query(collection(db, 'diaperChangeRecords'), orderBy('date', 'desc')), (snapshot) => {
      setDiaperChangeRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperChangeRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperChangeRecords'));

    const unsubPsychPatients = onSnapshot(query(collection(db, 'psychPatients'), orderBy('name')), (snapshot) => {
      setPsychPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychPatient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychPatients'));

    const unsubPsychInitialAssessments = onSnapshot(query(collection(db, 'psychInitialAssessments'), orderBy('date', 'desc')), (snapshot) => {
      setPsychInitialAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychInitialAssessment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychInitialAssessments'));

    const unsubPsychEvolutions = onSnapshot(query(collection(db, 'psychEvolutions'), orderBy('date', 'desc')), (snapshot) => {
      setPsychEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychEvolution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychEvolutions'));

    const unsubPsychAppointments = onSnapshot(query(collection(db, 'psychAppointments'), orderBy('date', 'desc')), (snapshot) => {
      setPsychAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychAppointment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychAppointments'));

    const unsubPsychEmotionalMonitorings = onSnapshot(query(collection(db, 'psychEmotionalMonitorings'), orderBy('date', 'desc')), (snapshot) => {
      setPsychEmotionalMonitorings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychEmotionalMonitoring)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychEmotionalMonitorings'));

    const unsubPsychFamilyBonds = onSnapshot(query(collection(db, 'psychFamilyBonds'), orderBy('date', 'desc')), (snapshot) => {
      setPsychFamilyBonds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychFamilyBond)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychFamilyBonds'));

    const unsubPsychActivities = onSnapshot(query(collection(db, 'psychActivities'), orderBy('date', 'desc')), (snapshot) => {
      setPsychActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychActivity)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychActivities'));

    const unsubPsychCognitionAssessments = onSnapshot(query(collection(db, 'psychCognitionAssessments'), orderBy('date', 'desc')), (snapshot) => {
      setPsychCognitionAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychCognitionAssessment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychCognitionAssessments'));

    const unsubPsychInterventionPlans = onSnapshot(query(collection(db, 'psychInterventionPlans'), orderBy('date', 'desc')), (snapshot) => {
      setPsychInterventionPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychInterventionPlan)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychInterventionPlans'));

    // Pedagogy listeners
    const unsubPedagogyPatients = onSnapshot(query(collection(db, 'pedagogyPatients'), orderBy('name')), (snapshot) => {
      setPedagogyPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyPatient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyPatients'));

    const unsubPedagogyInitialAssessments = onSnapshot(query(collection(db, 'pedagogyInitialAssessments'), orderBy('date', 'desc')), (snapshot) => {
      setPedagogyInitialAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyInitialAssessment)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyInitialAssessments'));

    const unsubPedagogyEvolutions = onSnapshot(query(collection(db, 'pedagogyEvolutions'), orderBy('date', 'desc')), (snapshot) => {
      setPedagogyEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyEvolution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyEvolutions'));

    const unsubPedagogyActivities = onSnapshot(query(collection(db, 'pedagogyActivities'), orderBy('date', 'desc')), (snapshot) => {
      setPedagogyActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyActivity)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyActivities'));

    const unsubPedagogyStimulationTrackings = onSnapshot(query(collection(db, 'pedagogyStimulationTrackings'), orderBy('date', 'desc')), (snapshot) => {
      setPedagogyStimulationTrackings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyStimulationTracking)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyStimulationTrackings'));

    const unsubPedagogySocialParticipations = onSnapshot(query(collection(db, 'pedagogySocialParticipations'), orderBy('date', 'desc')), (snapshot) => {
      setPedagogySocialParticipations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogySocialParticipation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogySocialParticipations'));

    const unsubPedagogyIndividualPlans = onSnapshot(query(collection(db, 'pedagogyIndividualPlans'), orderBy('date', 'desc')), (snapshot) => {
      setPedagogyIndividualPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyIndividualPlan)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyIndividualPlans'));

    const unsubPedagogyLifeHistories = onSnapshot(collection(db, 'pedagogyLifeHistories'), (snapshot) => {
      setPedagogyLifeHistories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyLifeHistory)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyLifeHistories'));

    // Social Work Listeners
    const unsubSocialPatients = onSnapshot(query(collection(db, 'socialPatients'), orderBy('name')), (snapshot) => {
      setSocialPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPatient)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialPatients'));

    const unsubSocialFamilyTies = onSnapshot(collection(db, 'socialFamilyTies'), (snapshot) => {
      setSocialFamilyTies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialFamilyTie)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialFamilyTies'));

    const unsubSocialDocumentations = onSnapshot(collection(db, 'socialDocumentations'), (snapshot) => {
      setSocialDocumentations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialDocumentation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialDocumentations'));

    const unsubSocialLegalSituations = onSnapshot(collection(db, 'socialLegalSituations'), (snapshot) => {
      setSocialLegalSituations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialLegalSituation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialLegalSituations'));

    const unsubSocialStudies = onSnapshot(query(collection(db, 'socialStudies'), orderBy('date', 'desc')), (snapshot) => {
      setSocialStudies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialStudy)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialStudies'));

    const unsubSocialEvolutions = onSnapshot(query(collection(db, 'socialEvolutions'), orderBy('date', 'desc')), (snapshot) => {
      setSocialEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialEvolution)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialEvolutions'));

    const unsubSocialReferrals = onSnapshot(query(collection(db, 'socialReferrals'), orderBy('date', 'desc')), (snapshot) => {
      setSocialReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialReferral)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialReferrals'));

    const unsubSocialFamilyVisits = onSnapshot(query(collection(db, 'socialFamilyVisits'), orderBy('date', 'desc')), (snapshot) => {
      setSocialFamilyVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialFamilyVisit)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialFamilyVisits'));

    const unsubSocialRiskSituations = onSnapshot(query(collection(db, 'socialRiskSituations'), orderBy('date', 'desc')), (snapshot) => {
      setSocialRiskSituations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialRiskSituation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialRiskSituations'));

    // Listen to Professionals
    let unsubProfessionals = () => {};
    if (user && (['PRESIDENTE', 'COORDENADORA', 'PROJETISTA'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com')) {
      const qProfessionals = query(collection(db, 'professionals'), orderBy('name'));
      unsubProfessionals = onSnapshot(qProfessionals, (snapshot) => {
        setProfessionals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'professionals'));
    }

    return () => {
      unsubElderly();
      unsubEvolutions();
      unsubDonors();
      unsubDiaperDonations();
      unsubStock();
      unsubProductionLogs();
      unsubEvents();
      unsubFinancial();
      unsubUsers();
      unsubPias();
      unsubGallery();
      unsubVolunteers();
      unsubCommunityElderly();
      unsubWorkshops();
      unsubCaregivers();
      unsubFamilyEngagements();
      unsubInstitutionalInfo();
      unsubProfessionals();
      unsubPhysioPatients();
      unsubPhysioAssessments();
      unsubPhysioEvolutions();
      unsubPhysioExercises();
      unsubPhysioAppointments();
      unsubNursingPatients();
      unsubMedications();
      unsubMedicationAdministrations();
      unsubVitalSigns();
      unsubDressingRecords();
      unsubNursingEvolutions();
      unsubIncidentRecords();
      unsubShiftSchedules();
      unsubAvdRecords();
      unsubDiaperChangeRecords();
      unsubPsychPatients();
      unsubPsychInitialAssessments();
      unsubPsychEvolutions();
      unsubPsychAppointments();
      unsubPsychEmotionalMonitorings();
      unsubPsychFamilyBonds();
      unsubPsychActivities();
      unsubPsychCognitionAssessments();
      unsubPsychInterventionPlans();
      unsubPedagogyPatients();
      unsubPedagogyInitialAssessments();
      unsubPedagogyEvolutions();
      unsubPedagogyActivities();
      unsubPedagogyStimulationTrackings();
      unsubPedagogySocialParticipations();
      unsubPedagogyIndividualPlans();
      unsubPedagogyLifeHistories();
      unsubSocialPatients();
      unsubSocialFamilyTies();
      unsubSocialDocumentations();
      unsubSocialLegalSituations();
      unsubSocialStudies();
      unsubSocialEvolutions();
      unsubSocialReferrals();
      unsubSocialFamilyVisits();
      unsubSocialRiskSituations();
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

  const handleUpdateProfile = async (data: Partial<User>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'users', user.id), data);
      setUser({ ...user, ...data });
      showToast('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast('Erro ao atualizar perfil', 'error');
    }
  };

  const handleSavePhysioPatient = async (data: Omit<PhysioPatient, 'id'>, id?: string) => {
    try {
      // Find if there's already a physioPatient doc for this elderly person
      const existing = physioPatients.find(p => p.elderlyId === id || p.id === id);
      if (existing) {
        await updateDoc(doc(db, 'physioPatients', existing.id), { ...data, elderlyId: id });
        showToast('Paciente atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'physioPatients'), { ...data, elderlyId: id });
        showToast('Paciente cadastrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'physioPatients');
      showToast('Erro ao salvar paciente', 'error');
    }
  };

  const handleDeletePhysioPatient = async (id: string) => {
    showConfirm('Tem certeza que deseja excluir este paciente?', async () => {
      try {
        await deleteDoc(doc(db, 'physioPatients', id));
        showToast('Paciente excluído com sucesso');
      } catch (err) {
        handleFirestoreError(err, OperationType.DELETE, 'physioPatients');
        showToast('Erro ao excluir paciente', 'error');
      }
    });
  };

  const handleSavePhysioAssessment = async (data: Omit<PhysioAssessment, 'id'>) => {
    try {
      await addDoc(collection(db, 'physioAssessments'), data);
      showToast('Avaliação salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'physioAssessments');
      showToast('Erro ao salvar avaliação', 'error');
    }
  };

  const handleSavePhysioEvolution = async (data: Omit<PhysioEvolution, 'id'>) => {
    try {
      await addDoc(collection(db, 'physioEvolutions'), data);
      showToast('Evolução registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'physioEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSavePhysioExercise = async (data: Omit<PhysioExercise, 'id'>) => {
    try {
      await addDoc(collection(db, 'physioExercises'), data);
      showToast('Exercício salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'physioExercises');
      showToast('Erro ao salvar exercício', 'error');
    }
  };

  const handleSavePhysioAppointment = async (data: Omit<PhysioAppointment, 'id'>) => {
    try {
      await addDoc(collection(db, 'physioAppointments'), data);
      showToast('Agendamento realizado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'physioAppointments');
      showToast('Erro ao realizar agendamento', 'error');
    }
  };

  // Nursing Handlers
  const handleSaveNursingPatient = async (data: Omit<NursingPatient, 'id'>, id?: string) => {
    try {
      const existing = nursingPatients.find(p => p.elderlyId === id || p.id === id);
      if (existing) {
        await updateDoc(doc(db, 'nursingPatients', existing.id), { ...data, elderlyId: id });
        showToast('Paciente atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'nursingPatients'), { ...data, elderlyId: id });
        showToast('Paciente cadastrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'nursingPatients');
      showToast('Erro ao salvar paciente', 'error');
    }
  };

  const handleDeleteNursingPatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'patients', id));
      showToast('Paciente removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `patients/${id}`);
      showToast('Erro ao remover paciente', 'error');
    }
  };

  const handleSaveMedication = async (data: Omit<Medication, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'medications', id), data);
        showToast('Medicação atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'medications'), data);
        showToast('Medicação cadastrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'medications');
      showToast('Erro ao salvar medicação', 'error');
    }
  };

  const handleSaveMedicationAdministration = async (data: Omit<MedicationAdministration, 'id'>) => {
    try {
      await addDoc(collection(db, 'medicationAdministrations'), data);
      showToast('Administração registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'medicationAdministrations');
      showToast('Erro ao registrar administração', 'error');
    }
  };

  const handleSaveVitalSigns = async (data: Omit<VitalSigns, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'vitalSigns', id), data);
        showToast('Sinais vitais atualizados com sucesso');
      } else {
        await addDoc(collection(db, 'vitalSigns'), data);
        showToast('Sinais vitais registrados com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'vitalSigns');
      showToast('Erro ao registrar sinais vitais', 'error');
    }
  };

  const handleSaveDressingRecord = async (data: Omit<DressingRecord, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'dressingRecords', id), data);
        showToast('Curativo atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'dressingRecords'), data);
        showToast('Curativo registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'dressingRecords');
      showToast('Erro ao registrar curativo', 'error');
    }
  };

  const handleSaveNursingEvolution = async (data: Omit<NursingEvolution, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'nursingEvolutions', id), data);
        showToast('Evolução atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'nursingEvolutions'), data);
        showToast('Evolução registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'nursingEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSaveIncidentRecord = async (data: Omit<IncidentRecord, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'incidentRecords', id), data);
        showToast('Intercorrência atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'incidentRecords'), data);
        showToast('Intercorrência registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'incidentRecords');
      showToast('Erro ao registrar intercorrência', 'error');
    }
  };

  const handleSaveShiftSchedule = async (data: Omit<ShiftSchedule, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'shiftSchedules', id), data);
        showToast('Plantão atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'shiftSchedules'), data);
        showToast('Plantão salvo com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'shiftSchedules');
      showToast('Erro ao salvar plantão', 'error');
    }
  };

  const handleSaveAVDRecord = async (data: Omit<AVDRecord, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'avdRecords', id), data);
        showToast('AVD atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'avdRecords'), data);
        showToast('AVD registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'avdRecords');
      showToast('Erro ao registrar AVD', 'error');
    }
  };

  const handleSaveDiaperChangeRecord = async (data: Omit<DiaperChangeRecord, 'id'>, id?: string) => {
    try {
      if (id) {
        await updateDoc(doc(db, 'diaperChangeRecords', id), data);
        showToast('Troca de fralda atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'diaperChangeRecords'), data);
        showToast('Troca de fralda registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'diaperChangeRecords');
      showToast('Erro ao registrar troca de fralda', 'error');
    }
  };

  const handleDeleteNursingRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      showToast('Erro ao remover registro', 'error');
    }
  };

  // Psychology Handlers
  const handleSavePsychPatient = async (data: Omit<PsychPatient, 'id'>, id?: string) => {
    try {
      const existing = psychPatients.find(p => p.elderlyId === id || p.id === id);
      if (existing) {
        await updateDoc(doc(db, 'psychPatients', existing.id), { ...data, elderlyId: id });
        showToast('Idoso atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'psychPatients'), { ...data, elderlyId: id });
        showToast('Idoso cadastrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'psychPatients');
      showToast('Erro ao salvar idoso', 'error');
    }
  };

  const handleSavePsychInitialAssessment = async (data: Omit<PsychInitialAssessment, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychInitialAssessments'), data);
      showToast('Avaliação inicial salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychInitialAssessments');
      showToast('Erro ao salvar avaliação inicial', 'error');
    }
  };

  const handleSavePsychEvolution = async (data: Omit<PsychEvolution, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychEvolutions'), data);
      showToast('Evolução registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSavePsychAppointment = async (data: Omit<PsychAppointment, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychAppointments'), data);
      showToast('Atendimento registrado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychAppointments');
      showToast('Erro ao registrar atendimento', 'error');
    }
  };

  const handleSavePsychEmotionalMonitoring = async (data: Omit<PsychEmotionalMonitoring, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychEmotionalMonitorings'), data);
      showToast('Monitoramento emocional registrado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychEmotionalMonitorings');
      showToast('Erro ao registrar monitoramento emocional', 'error');
    }
  };

  const handleSavePsychFamilyBond = async (data: Omit<PsychFamilyBond, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychFamilyBonds'), data);
      showToast('Vínculo familiar registrado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychFamilyBonds');
      showToast('Erro ao registrar vínculo familiar', 'error');
    }
  };

  const handleSavePsychActivity = async (data: Omit<PsychActivity, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychActivities'), data);
      showToast('Atividade registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychActivities');
      showToast('Erro ao registrar atividade', 'error');
    }
  };

  const handleSavePsychCognitionAssessment = async (data: Omit<PsychCognitionAssessment, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychCognitionAssessments'), data);
      showToast('Avaliação cognitiva registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychCognitionAssessments');
      showToast('Erro ao registrar avaliação cognitiva', 'error');
    }
  };

  const handleSavePsychInterventionPlan = async (data: Omit<PsychInterventionPlan, 'id'>) => {
    try {
      await addDoc(collection(db, 'psychInterventionPlans'), data);
      showToast('Plano de intervenção registrado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'psychInterventionPlans');
      showToast('Erro ao registrar plano de intervenção', 'error');
    }
  };

  // Pedagogy Handlers
  const handleSavePedagogyPatient = async (data: Partial<PedagogyPatient>) => {
    try {
      const id = data.id;
      const existing = pedagogyPatients.find(p => p.elderlyId === id || p.id === id);
      if (existing) {
        const { id: _, ...rest } = data;
        await updateDoc(doc(db, 'pedagogyPatients', existing.id), { ...rest, elderlyId: id });
        showToast('Idoso atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogyPatients'), { ...data, elderlyId: id, createdAt: new Date().toISOString() });
        showToast('Idoso cadastrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyPatients');
      showToast('Erro ao salvar idoso', 'error');
    }
  };

  const handleSavePedagogyAssessment = async (data: Partial<PedagogyInitialAssessment>) => {
    try {
      await addDoc(collection(db, 'pedagogyInitialAssessments'), data);
      showToast('Avaliação inicial salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedagogyInitialAssessments');
      showToast('Erro ao salvar avaliação inicial', 'error');
    }
  };

  const handleSavePedagogyEvolution = async (data: Partial<PedagogyEvolution>) => {
    try {
      await addDoc(collection(db, 'pedagogyEvolutions'), data);
      showToast('Evolução registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedagogyEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSavePedagogyActivity = async (data: Partial<PedagogyActivity>) => {
    try {
      await addDoc(collection(db, 'pedagogyActivities'), data);
      showToast('Atividade registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedagogyActivities');
      showToast('Erro ao registrar atividade', 'error');
    }
  };

  const handleSavePedagogyStimulation = async (data: Partial<PedagogyStimulationTracking>) => {
    try {
      await addDoc(collection(db, 'pedagogyStimulationTrackings'), data);
      showToast('Estimulação registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedagogyStimulationTrackings');
      showToast('Erro ao registrar estimulação', 'error');
    }
  };

  const handleSavePedagogySocial = async (data: Partial<PedagogySocialParticipation>) => {
    try {
      await addDoc(collection(db, 'pedagogySocialParticipations'), data);
      showToast('Participação social registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedagogySocialParticipations');
      showToast('Erro ao registrar participação social', 'error');
    }
  };

  const handleSavePedagogyPlan = async (data: Partial<PedagogyIndividualPlan>) => {
    try {
      await addDoc(collection(db, 'pedagogyIndividualPlans'), data);
      showToast('Plano pedagógico registrado com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'pedagogyIndividualPlans');
      showToast('Erro ao registrar plano pedagógico', 'error');
    }
  };

  const handleSavePedagogyLifeHistory = async (data: Partial<PedagogyLifeHistory>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'pedagogyLifeHistories', id), rest);
      } else {
        await addDoc(collection(db, 'pedagogyLifeHistories'), data);
      }
      showToast('História de vida salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyLifeHistories');
      showToast('Erro ao salvar história de vida', 'error');
    }
  };

  // Social Work Save Functions
  const handleSaveSocialPatient = async (data: Partial<SocialPatient>) => {
    try {
      const id = data.id;
      const existing = socialPatients.find(p => p.elderlyId === id || p.id === id);
      if (existing) {
        const { id: _, ...rest } = data;
        await updateDoc(doc(db, 'socialPatients', existing.id), { ...rest, elderlyId: id });
      } else {
        await addDoc(collection(db, 'socialPatients'), { ...data, elderlyId: id, createdAt: new Date().toISOString() });
      }
      showToast('Perfil social salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialPatients');
      showToast('Erro ao salvar perfil social', 'error');
    }
  };

  const handleSaveSocialPIA = async (data: Partial<PIA>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'pias', id), { ...rest, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'pias'), { ...data, updatedAt: new Date().toISOString() });
      }
      showToast('PIA salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pias');
      showToast('Erro ao salvar PIA', 'error');
    }
  };

  const handleSaveSocialFamilyTie = async (data: Partial<SocialFamilyTie>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialFamilyTies', id), { ...rest, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'socialFamilyTies'), { ...data, updatedAt: new Date().toISOString() });
      }
      showToast('Vínculo familiar salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialFamilyTies');
      showToast('Erro ao salvar vínculo familiar', 'error');
    }
  };

  const handleSaveSocialDocumentation = async (data: Partial<SocialDocumentation>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialDocumentations', id), { ...rest, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'socialDocumentations'), { ...data, updatedAt: new Date().toISOString() });
      }
      showToast('Documentação salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialDocumentations');
      showToast('Erro ao salvar documentação', 'error');
    }
  };

  const handleSaveSocialLegalSituation = async (data: Partial<SocialLegalSituation>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialLegalSituations', id), { ...rest, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'socialLegalSituations'), { ...data, updatedAt: new Date().toISOString() });
      }
      showToast('Situação jurídica salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialLegalSituations');
      showToast('Erro ao salvar situação jurídica', 'error');
    }
  };

  const handleSaveSocialStudy = async (data: Partial<SocialStudy>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialStudies', id), rest);
      } else {
        await addDoc(collection(db, 'socialStudies'), data);
      }
      showToast('Estudo social salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialStudies');
      showToast('Erro ao salvar estudo social', 'error');
    }
  };

  const handleSaveSocialEvolution = async (data: Partial<SocialEvolution>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialEvolutions', id), rest);
      } else {
        await addDoc(collection(db, 'socialEvolutions'), data);
      }
      showToast('Evolução social salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialEvolutions');
      showToast('Erro ao salvar evolução social', 'error');
    }
  };

  const handleSaveSocialReferral = async (data: Partial<SocialReferral>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialReferrals', id), rest);
      } else {
        await addDoc(collection(db, 'socialReferrals'), data);
      }
      showToast('Encaminhamento salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialReferrals');
      showToast('Erro ao salvar encaminhamento', 'error');
    }
  };

  const handleSaveSocialFamilyVisit = async (data: Partial<SocialFamilyVisit>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialFamilyVisits', id), rest);
      } else {
        await addDoc(collection(db, 'socialFamilyVisits'), data);
      }
      showToast('Visita familiar salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialFamilyVisits');
      showToast('Erro ao salvar visita familiar', 'error');
    }
  };

  const handleSaveSocialRiskSituation = async (data: Partial<SocialRiskSituation>) => {
    try {
      if (data.id) {
        const { id, ...rest } = data;
        await updateDoc(doc(db, 'socialRiskSituations', id), rest);
      } else {
        await addDoc(collection(db, 'socialRiskSituations'), data);
      }
      showToast('Situação de risco salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialRiskSituations');
      showToast('Erro ao salvar situação de risco', 'error');
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
      case 'dashboard': return (
        <DashboardSection 
          elderly={elderly} 
          communityElderly={communityElderly}
          caregivers={caregivers}
          evolutions={evolutions} 
          volunteers={volunteers}
          financialRecords={financialRecords}
          user={user} 
          events={calendarEvents} 
          theme={theme} 
          onViewSchedule={() => setActiveTab('schedule')}
        />
      );
      case 'elderly': return <ElderlySection elderly={elderly} evolutions={evolutions} pias={pias} showToast={showToast} />;
      case 'physio': return (
        <PhysioSection 
          user={user}
          patients={physioPatientsList}
          assessments={physioAssessments}
          evolutions={physioEvolutions}
          exercises={physioExercises}
          appointments={physioAppointments}
          showToast={showToast}
          onSavePatient={handleSavePhysioPatient}
          onDeletePatient={handleDeletePhysioPatient}
          onSaveAssessment={handleSavePhysioAssessment}
          onSaveEvolution={handleSavePhysioEvolution}
          onSaveExercise={handleSavePhysioExercise}
          onSaveAppointment={handleSavePhysioAppointment}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'nursing': return (
        <NursingSection 
          user={user}
          patients={nursingPatientsList}
          medications={medications}
          administrations={medicationAdministrations}
          vitalSigns={vitalSigns}
          dressings={dressingRecords}
          evolutions={nursingEvolutions}
          incidents={incidentRecords}
          shifts={shiftSchedules}
          avds={avdRecords}
          diaperChanges={diaperChangeRecords}
          showToast={showToast}
          onSavePatient={handleSaveNursingPatient}
          onDeletePatient={handleDeleteNursingPatient}
          onSaveMedication={handleSaveMedication}
          onSaveAdministration={handleSaveMedicationAdministration}
          onSaveVitalSigns={handleSaveVitalSigns}
          onSaveDressing={handleSaveDressingRecord}
          onSaveEvolution={handleSaveNursingEvolution}
          onSaveIncident={handleSaveIncidentRecord}
          onSaveShift={handleSaveShiftSchedule}
          onSaveAVD={handleSaveAVDRecord}
          onSaveDiaperChange={handleSaveDiaperChangeRecord}
          onDeleteRecord={handleDeleteNursingRecord}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'psychology': return (
        <PsychologySection 
          user={user}
          patients={psychPatientsList}
          initialAssessments={psychInitialAssessments}
          evolutions={psychEvolutions}
          appointments={psychAppointments}
          emotionalMonitorings={psychEmotionalMonitorings}
          familyBonds={psychFamilyBonds}
          activities={psychActivities}
          cognitionAssessments={psychCognitionAssessments}
          interventionPlans={psychInterventionPlans}
          showToast={showToast}
          onSavePatient={handleSavePsychPatient}
          onSaveInitialAssessment={handleSavePsychInitialAssessment}
          onSaveEvolution={handleSavePsychEvolution}
          onSaveAppointment={handleSavePsychAppointment}
          onSaveEmotionalMonitoring={handleSavePsychEmotionalMonitoring}
          onSaveFamilyBond={handleSavePsychFamilyBond}
          onSaveActivity={handleSavePsychActivity}
          onSaveCognitionAssessment={handleSavePsychCognitionAssessment}
          onSaveInterventionPlan={handleSavePsychInterventionPlan}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'pedagogy': return (
        <PedagogySection 
          user={user}
          patients={pedagogyPatientsList}
          assessments={pedagogyInitialAssessments}
          evolutions={pedagogyEvolutions}
          activities={pedagogyActivities}
          stimulationTrackings={pedagogyStimulationTrackings}
          socialParticipations={pedagogySocialParticipations}
          individualPlans={pedagogyIndividualPlans}
          lifeHistories={pedagogyLifeHistories}
          onSavePatient={handleSavePedagogyPatient}
          onSaveAssessment={handleSavePedagogyAssessment}
          onSaveEvolution={handleSavePedagogyEvolution}
          onSaveActivity={handleSavePedagogyActivity}
          onSaveStimulation={handleSavePedagogyStimulation}
          onSaveSocial={handleSavePedagogySocial}
          onSavePlan={handleSavePedagogyPlan}
          onSaveLifeHistory={handleSavePedagogyLifeHistory}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'socialWork': return (
        <SocialWorkSection 
          user={user}
          patients={socialPatientsList}
          familyTies={socialFamilyTies}
          documentations={socialDocumentations}
          legalSituations={socialLegalSituations}
          socialStudies={socialStudies}
          evolutions={socialEvolutions}
          referrals={socialReferrals}
          familyVisits={socialFamilyVisits}
          riskSituations={socialRiskSituations}
          pias={pias}
          onSavePatient={handleSaveSocialPatient}
          onSaveFamilyTie={handleSaveSocialFamilyTie}
          onSaveDocumentation={handleSaveSocialDocumentation}
          onSaveLegalSituation={handleSaveSocialLegalSituation}
          onSaveSocialStudy={handleSaveSocialStudy}
          onSaveEvolution={handleSaveSocialEvolution}
          onSaveReferral={handleSaveSocialReferral}
          onSaveFamilyVisit={handleSaveSocialFamilyVisit}
          onSaveRiskSituation={handleSaveSocialRiskSituation}
          onSavePIA={handleSaveSocialPIA}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'professionals': return <ProfessionalsSection professionals={professionals} showToast={showToast} showConfirm={showConfirm} />;
      case 'professional': return <ProfessionalArea elderly={elderly} evolutions={evolutions} user={user} showToast={showToast} />;
      case 'financial': return <FinancialSection financialRecords={financialRecords} user={user!} showToast={showToast} />;
      case 'institutional': return <InstitutionalSection institutionalInfo={institutionalInfo} />;
      case 'volunteers': return <VolunteersSection volunteers={volunteers} showToast={showToast} user={user} />;
      case 'family': return <FamilySection engagements={familyEngagements} elderly={elderly} showToast={showToast} />;
      case 'schedule': return <ScheduleSection events={calendarEvents} user={user} showConfirm={showConfirm} />;
      case 'workshops': return <WorkshopsSection workshops={workshops} communityElderly={communityElderly} caregivers={caregivers} showToast={showToast} />;
      case 'monitoring': return (
        <MonitoringSection 
          elderly={elderly} 
          evolutions={evolutions} 
          pias={pias} 
          socialEvolutions={socialEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          physioEvolutions={physioEvolutions}
          nursingEvolutions={nursingEvolutions}
          vitalSigns={vitalSigns}
          psychEmotionalMonitorings={psychEmotionalMonitorings}
          workshops={workshops}
          showToast={showToast} 
        />
      );
      case 'gallery': return (
        <div className="p-8">
          <div className="mb-12">
            <h1 className="text-4xl font-black text-gray-900 dark:text-white leading-tight">
              Galeria <span className="text-green-600">Multidisciplinar</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-2 font-medium">
              Acompanhamento visual de todas as atividades e evoluções dos acolhidos.
            </p>
          </div>
          <GlobalGallery 
            items={allPhotos} 
            patients={elderly}
            user={user}
            showToast={showToast}
            onSavePhotos={savePhotosToGallery}
            onDelete={async (id) => {
              try {
                await deleteDoc(doc(db, 'gallery', id));
                showToast('Foto removida com sucesso!', 'success');
              } catch (err) {
                showToast('Erro ao remover foto.', 'error');
              }
            }}
          />
        </div>
      );
      case 'reports': return (
        <ReportsSection 
          elderly={elderly} 
          evolutions={evolutions} 
          pias={pias} 
          socialEvolutions={socialEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          physioEvolutions={physioEvolutions}
          nursingEvolutions={nursingEvolutions}
          photos={allPhotos} 
          showToast={showToast} 
        />
      );
      case 'donors': return <DonorsSection donors={donors} />;
      case 'diaperDonations': return <DiaperDonationSection donations={diaperDonations} stock={diaperStock} user={user} />;
      case 'diaperFactory': return <DiaperFactorySection stock={diaperStock} logs={diaperProductionLogs} user={user} />;
      case 'settings': return <SettingsSection users={allUsers} showToast={showToast} institutionalInfo={institutionalInfo} />;
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
    <div className="flex min-h-screen bg-gray-50 dark:bg-gray-950 font-sans text-gray-900 dark:text-gray-100 transition-colors duration-300">
      <Sidebar 
        user={user} 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        onLogout={handleLogout} 
        onOpenProfile={() => setIsProfileOpen(true)}
        isOpen={isSidebarOpen}
        setIsOpen={setIsSidebarOpen}
      />
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full">
        <header className="flex justify-between items-center mb-8 md:mb-12">
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 text-gray-600 dark:text-gray-400"
            >
              <Menu size={24} />
            </button>
            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
                {activeTab === 'dashboard' ? 'Visão Geral' : 
                 activeTab === 'elderly' ? 'Gestão de Idosos' : 
                 activeTab === 'physio' ? 'Fisioterapia' :
                 activeTab === 'nursing' ? 'Enfermagem' :
                 activeTab === 'psychology' ? 'Psicologia' :
                 activeTab === 'pedagogy' ? 'Pedagogia' :
                 activeTab === 'socialWork' ? 'Serviço Social' :
                 activeTab === 'professional' ? 'Área Técnica' : 
                 activeTab === 'financial' ? 'Financeiro' : 
                 activeTab === 'donors' ? 'Doadores e Sócios' :
                 activeTab === 'diaperDonations' ? 'Doação de Fraldas' :
                 activeTab === 'diaperFactory' ? 'Fábrica de Fraldas' : 
                 activeTab === 'settings' ? 'Configurações' : 
                 activeTab === 'gallery' ? 'Galeria Multidisciplinar' : 'Institucional'}
              </h1>
              <p className="hidden md:block text-gray-500 dark:text-gray-400 mt-1">Bem-vindo ao sistema OAMI, {user.name.split(' ')[0]}.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button 
              onClick={() => setIsNotificationsOpen(true)}
              className="p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-green-600 transition-colors relative"
            >
              <Bell size={20} />
              {calendarEvents.length > 0 && (
                <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
              )}
            </button>
            <button 
              onClick={() => setIsProfileOpen(true)}
              className="flex items-center gap-3 bg-white dark:bg-gray-900 p-2 pr-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 hover:border-green-200 dark:hover:border-green-900 transition-all group"
            >
              <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 font-bold overflow-hidden">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  user.name.charAt(0)
                )}
              </div>
              <div className="hidden md:block text-left">
                <p className="text-xs font-bold text-gray-800 dark:text-white leading-none group-hover:text-green-600 transition-colors">{user.name}</p>
                <div className="flex items-center gap-2 mt-1">
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">{ROLE_LABELS[user.role]}</p>
                  {user.registrationNumber && (
                    <p className="text-[10px] text-green-600 dark:text-green-400 font-bold border-l border-gray-200 dark:border-gray-700 pl-2">{user.registrationNumber}</p>
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

      <AnimatePresence>
        {toast && (
          <motion.div 
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className={cn(
              "fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-50 flex items-center gap-3",
              toast.type === 'success' ? "bg-green-600 text-white" : "bg-red-600 text-white"
            )}
          >
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            <span className="font-bold text-sm">{toast.message}</span>
          </motion.div>
        )}

        {confirmModal && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-900 p-8 rounded-3xl max-w-md w-full shadow-2xl border border-gray-100 dark:border-gray-800"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center text-red-600 dark:text-red-400 mb-6">
                <AlertCircle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Confirmar Ação</h3>
              <p className="text-gray-500 dark:text-gray-400 mb-8">{confirmModal.message}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setConfirmModal(null)}
                  className="flex-1 px-6 py-3 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    confirmModal.onConfirm();
                    setConfirmModal(null);
                  }}
                  className="flex-1 px-6 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg hover:bg-red-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AIAssistant 
        user={user} 
        elderly={elderly}
        onCommandParsed={handleSmartCommand}
      />

      {isProfileOpen && (
        <ProfileModal 
          user={user} 
          theme={theme}
          onThemeChange={setTheme}
          onClose={() => setIsProfileOpen(false)} 
          onUpdate={(updatedUser) => setUser(updatedUser)}
          showToast={showToast}
          showConfirm={showConfirm}
        />
      )}

      <AnimatePresence>
        {isNotificationsOpen && (
          <NotificationsModal 
            events={calendarEvents} 
            onClose={() => setIsNotificationsOpen(false)}
            onViewSchedule={() => setActiveTab('schedule')}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
