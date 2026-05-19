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
  Utensils,
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
  AlertTriangle,
  FileDown,
  Trash2,
  LayoutDashboard,
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
  HeartPulse,
  Save,
  Loader2,
  Mic,
  MicOff,
  Paperclip,
  MoreVertical,
  Home,
  ShieldAlert,
  IdCard,
  ShieldCheck,
  Phone,
  Printer,
  History,
  User as UserIcon
} from 'lucide-react';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  endOfDay,
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
  Pie,
  Legend,
  AreaChart,
  Area,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ScatterChart,
  Scatter
} from 'recharts';
import { cn, safeReplace, cleanData, compressImage } from './lib/utils';
import { TranscriptionButton } from './components/TranscriptionButton';
import { Role, User, Elderly, EvolutionRecord, FinancialRecord, PIA, Donor, DiaperDonation, DiaperStock, DiaperProductionLog, FinancialDocument, CalendarEvent, Volunteer, CommunityElderly, Workshop, Caregiver, Professional, PhysioPatient, PhysioAssessment, PhysioEvolution, PhysioExercise, PhysioAppointment, NursingPatient, Medication, MedicationAdministration, VitalSigns, DressingRecord, NursingEvolution, IncidentRecord, ShiftSchedule, StaffRole, StaffMember, AVDRecord, DiaperChangeRecord, PsychPatient, PsychInitialAssessment, PsychEvolution, PsychAppointment, PsychEmotionalMonitoring, PsychFamilyBond, PsychActivity, PsychCognitionAssessment, PsychInterventionPlan, PedagogyPatient, PedagogyInitialAssessment, PedagogyEvolution, PedagogyActivity, PedagogyStimulationTracking, PedagogySocialParticipation, PedagogyIndividualPlan, PedagogyLifeHistory, SocialPatient, SocialFamilyTie, SocialDocumentation, SocialLegalSituation, SocialStudy, SocialEvolution, SocialReferral, SocialFamilyVisit, SocialRiskSituation, NutritionPatient, NutritionEvolution, NutritionAnthropometry, NutritionMealPlan, DiaperRawProduction, DiaperWIPProcessing, DiaperFinalPacking, DiaperProductionGoal, DiaperBeneficiary, GalleryItem, InstitutionalInfo, FamilyEngagement, AppNotification } from './types';
import { MOCK_USERS, ROLE_LABELS, MOCK_GALLERY, INSTITUTION_LOGO } from './constants';
import { generateModernPDF } from './lib/pdfUtils';
import { generateModernWord } from './lib/wordUtils';
import { generateModernExcel } from './lib/excelUtils';
import { Table as TableIcon } from 'lucide-react';
import { processSmartIA, AISmartCommandResult } from './services/geminiService';
import { GoogleGenAI } from "@google/genai";
import { db, auth, testConnection } from './firebase';
import { PhysioSection } from './components/PhysioSection';
import { NursingSection } from './components/NursingSection';
import { PsychologySection } from './components/PsychologySection';
import { PedagogySection } from './components/PedagogySection';
import { SocialWorkSection } from './components/SocialWorkSection';
import { NutritionSection } from './components/NutritionSection';
import { DiaperProductionSection } from './components/DiaperProductionSection';
import { AdminAssistantSection } from './components/AdminAssistantSection';
import { GlobalGallery } from './components/GlobalGallery';
import { DigitizeButton } from './components/DigitizeButton';
import { CameraModal } from './components/CameraModal';
import { PhotoUpload } from './components/PhotoUpload';
import LogoOami from './components/LogoOami';
import { 
  collection, 
  where, 
  Timestamp,
  limit,
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
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged,
  signOut,
  updateEmail,
  deleteUser
} from 'firebase/auth';
import { googleProvider } from './firebase';

// --- Error Handling ---
const safeFormat = (dateStr: string | undefined | null, formatStr: string, fallback = '--/--') => {
  if (!dateStr) return fallback;
  try {
    const date = parseISO(dateStr);
    if (isNaN(date.getTime())) return fallback;
    return format(date, formatStr, { locale: ptBR });
  } catch (e) {
    return fallback;
  }
};

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
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errInfo: FirestoreErrorInfo = {
    error: errorMessage,
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
  
  if (errorMessage.includes('Quota exceeded') || errorMessage.includes('quota')) {
    window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
    console.warn("ALERTA: Limite de cota do banco de dados atingido.");
  }

  // Despachar evento para que o App possa mostrar um toast (showToast não está disponível aqui fora)
  window.dispatchEvent(new CustomEvent('firestore-error-toast', { detail: { message: `Erro ao acessar ${path}: ${errorMessage}` } }));
}

// --- AI Assistant Component ---

const AIAssistant = ({ user, elderly, onCommandParsed, isVisible, setIsVisible }: { 
  user: User, 
  elderly: Elderly[], 
  onCommandParsed: (result: AISmartCommandResult) => void,
  isVisible: boolean,
  setIsVisible: (visible: boolean) => void
}) => {
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
        aiContent = `Entendido! Identifiquei um registro de ${safeReplace(parsed.recordType, '_', ' ')}. Deseja salvar estas informações?`;
        
        if (parsed.patientNameHint) {
          const searchName = parsed.patientNameHint.toLowerCase().trim();
          const match = (elderly || []).find(e => 
            e.name.toLowerCase().includes(searchName) ||
            searchName.includes(e.name.toLowerCase()) ||
            e.name.toLowerCase().split(' ')[0] === searchName
          );
          if (match) {
            parsed.patientId = match.id;
            aiContent = `Identifiquei um registro de ${safeReplace(parsed.recordType, '_', ' ')} para **${match.name}**. Deseja salvar?`;
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

  if (!isVisible) return null;

  return (
    <>
      <motion.div 
        drag
        dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 100, bottom: 0 }}
        dragElastic={0.1}
        className="fixed bottom-6 right-6 z-[60] flex flex-col items-end gap-2 no-print"
      >
        <AnimatePresence>
          {!isOpen && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.5 }}
              onClick={() => setIsVisible(false)}
              className="bg-red-500 text-white p-1 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
              title="Ocultar Assistente"
            >
              <X size={12} />
            </motion.button>
          )}
        </AnimatePresence>

        <div className="relative group cursor-move">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            title={isOpen ? "Fechar Chat" : "Abrir Assistente IA"}
            className="w-14 h-14 bg-green-600 text-white rounded-full shadow-2xl flex items-center justify-center hover:bg-green-700 transition-all"
          >
            {isOpen ? (
              <X size={28} className="animate-in zoom-in duration-300" />
            ) : (
              <Sparkles size={24} className="group-hover:scale-110 transition-transform" />
            )}
            {!isOpen && (
              <span className="absolute right-full mr-4 bg-white dark:bg-gray-900 text-green-800 dark:text-green-400 px-3 py-1 rounded-lg text-xs font-bold shadow-md opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                Assistente OAMI Smart IA
              </span>
            )}
          </button>
          
          {!isOpen && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsVisible(false);
              }}
              className="absolute -top-2 -right-2 w-5 h-5 bg-gray-800 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity shadow-md hover:bg-red-600"
              title="Remover da tela"
            >
              <X size={10} />
            </button>
          )}
        </div>
      </motion.div>

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
              className="fixed bottom-24 right-6 w-96 h-[600px] bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-green-100 dark:border-green-900/30 flex flex-col z-[60] overflow-hidden"
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

const OfficialHeader = () => {
  return (
    <div className="print-only w-full mb-8 border-b-2 border-green-600 pb-4">
      <div className="flex items-center justify-between gap-8">
        <div className="flex-1">
          <h1 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Opera Assistenza Malati Impediti</h1>
          <p className="text-sm font-bold text-green-700 tracking-widest mt-1">OAMI - UNIDADE POMPÉIA/SP</p>
          <div className="mt-4 space-y-0.5 text-[10px] text-gray-600 font-medium leading-tight">
            <p>CNPJ: 00.000.000/0000-00</p>
            <p>Rua Exemplo, 123 - Pompéia - São Paulo/SP</p>
            <p>Tel: (11) 0000-0000 | Email: contato@oami.org.br</p>
          </div>
        </div>
        <div className="w-32 h-32 flex-shrink-0">
          <img 
            src={INSTITUTION_LOGO} 
            alt="Logo OAMI"
            className="w-full h-full object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
      </div>
      <div className="mt-6 border-t border-gray-100 pt-2 flex justify-between items-center text-[8px] text-gray-400 font-bold uppercase tracking-widest">
        <span>Documento Gerado Eletronicamente via Sistema OAMI</span>
        <span>Data de Emissão: {format(new Date(), "dd/MM/yyyy HH:mm:ss")}</span>
      </div>
    </div>
  );
};

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
  const displayLogo = src || INSTITUTION_LOGO;
  
  if (displayLogo && !displayLogo.includes('...')) {
    return (
      <img 
        src={displayLogo} 
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

const Login = ({ onGoogleLogin, onCompleteProfile, needsProfile, error: loginError }: { 
  onGoogleLogin: () => void, 
  onCompleteProfile: (role: Role) => void,
  needsProfile: boolean,
  error: string | null
}) => {
  const [selectedRole, setSelectedRole] = useState<Role | ''>('');

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

          {loginError && (
            <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-100 dark:border-red-900/30 rounded-xl space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                <p className="text-xs text-red-700 dark:text-red-400 font-medium">
                  {loginError}
                </p>
              </div>
              <div className="flex flex-col gap-2">
                <p className="text-[10px] text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider italic">Dica: Tente abrir o sistema em uma nova aba.</p>
                <a 
                  href={window.location.href} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-lg hover:bg-blue-100"
                >
                  ABRIR EM NOVA ABA
                  <ChevronRight size={12} />
                </a>
              </div>
            </div>
          )}

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
  const menuGroups = [
    {
      title: 'Geral',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: TrendingUp, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'elderly', label: 'Idosos', icon: Users, roles: ['ANY'] },
        { id: 'schedule', label: 'Cronograma', icon: Calendar, roles: ['ANY'] },
        { id: 'gallery', label: 'Galeria de Fotos', icon: ImageIcon, roles: ['ANY'] },
      ]
    },
    {
      title: 'Serviços Técnicos',
      items: [
        { id: 'physio', label: 'Fisioterapia', icon: Activity, roles: ['FISIOTERAPEUTA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'nursing', label: 'Enfermagem', icon: Stethoscope, roles: ['ENFERMEIRA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'psychology', label: 'Psicologia', icon: Brain, roles: ['PSICOLOGA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'pedagogy', label: 'Pedagogia', icon: BookOpen, roles: ['PEDAGOGA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'socialWork', label: 'Serviço Social', icon: Heart, roles: ['ASSISTENTE_SOCIAL', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'nutrition', label: 'Nutrição', icon: Utensils, roles: ['NUTRICIONISTA', 'COORDENADORA', 'PROJETISTA', 'PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'professional', label: 'Área Profissional', icon: UserCircle, roles: ['COORDENADORA', 'AUXILIAR_ADMINISTRATIVO', 'PROJETISTA', 'PRESIDENTE'] },
      ]
    },
    {
      title: 'Administrativo',
      items: [
        { id: 'adminAssistant', label: 'Painel Auxiliar', icon: LayoutDashboard, roles: ['AUXILIAR_ADMINISTRATIVO'] },
        { id: 'professionals', label: 'Usuários', icon: Users, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'financial', label: 'Financeiro', icon: DollarSign, roles: ['PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'institutional', label: 'Institucional', icon: Info, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'volunteers', label: 'Voluntários/Estagiários', icon: BookOpen, roles: ['ANY'] },
        { id: 'family', label: 'Acompanhamento Familiar', icon: Users, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PSICOLOGA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'donors', label: 'Doadores e Sócios', icon: Heart, roles: ['PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'] },
      ]
    },
    {
      title: 'Operacional',
      items: [
        { id: 'diaperProduction', label: 'Produção (SGPF)', icon: Package, roles: ['FABRICANTE_FRALDAS', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO', 'PRESIDENTE'] },
        { id: 'workshops', label: 'Oficinas e Capacitações', icon: BookOpen, roles: ['ANY'] },
        { id: 'monitoring', label: 'Monitoramento', icon: Activity, roles: ['COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'reports', label: 'Relatórios', icon: FileText, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'settings', label: 'Configurações', icon: Settings, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
      ]
    }
  ];

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
          x: isOpen ? 0 : (window.innerWidth < 1024 ? -280 : 0),
          width: 280
        }}
        className={cn(
          "fixed lg:sticky top-0 left-0 h-screen bg-white dark:bg-gray-900 border-r border-green-100 dark:border-gray-800 flex flex-col z-50 transition-colors duration-300 overflow-hidden shadow-2xl lg:shadow-none no-print",
          !isOpen && "pointer-events-none lg:pointer-events-auto"
        )}
      >
        <div className="p-6 border-b border-green-50 dark:border-gray-800 flex justify-between items-center bg-white dark:bg-gray-900 z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-sm p-1.5 border border-green-100 dark:border-gray-700">
              <Logo />
            </div>
            <div>
              <h2 className="font-black text-green-800 dark:text-green-400 leading-tight tracking-tight">OAMI</h2>
              <p className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase tracking-widest leading-none mt-0.5">Vitória do Mearim</p>
            </div>
          </div>
          <button onClick={() => setIsOpen(false)} className="lg:hidden p-2 text-gray-400 hover:text-green-600 transition-colors rounded-xl hover:bg-green-50 dark:hover:bg-green-900/20">
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-8 custom-scrollbar">
          {menuGroups.map((group, groupIdx) => {
            const filteredItems = group.items.filter(item => 
              item.roles.includes('ANY') || item.roles.includes(user.role)
            );

            if (filteredItems.length === 0) return null;

            return (
              <div key={groupIdx} className="space-y-3">
                <h3 className="px-4 text-[10px] font-black text-gray-400 dark:text-gray-500 uppercase tracking-[0.2em]">
                  {group.title}
                </h3>
                <div className="space-y-1">
                  {filteredItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleTabChange(item.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-bold transition-all group",
                        activeTab === item.id 
                          ? "bg-green-600 text-white shadow-xl shadow-green-200 dark:shadow-none translate-x-1" 
                          : "text-gray-600 dark:text-gray-400 hover:bg-green-50 dark:hover:bg-green-900/20 hover:text-green-700 dark:hover:text-green-400"
                      )}
                    >
                      <item.icon size={18} className={cn(
                        "transition-transform group-hover:scale-110",
                        activeTab === item.id ? "text-white" : "text-gray-400 group-hover:text-green-600"
                      )} />
                      <span className="truncate" translate="no">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 border-t border-green-50 dark:border-gray-800 space-y-2 bg-white dark:bg-gray-900">
          <button 
            onClick={() => {
              onOpenProfile();
              if (window.innerWidth < 1024) setIsOpen(false);
            }}
            className="w-full bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl hover:bg-green-50 dark:hover:bg-green-900/20 transition-all border border-transparent hover:border-green-100 dark:hover:border-green-900/30 group"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-green-200 dark:bg-green-800 flex-shrink-0 shadow-sm border-2 border-white dark:border-gray-700">
                {user.photoUrl ? (
                  <img src={user.photoUrl} alt={user.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-green-700 dark:text-green-400 font-black text-sm">
                    {user.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="min-w-0 text-left">
                <p className="text-xs font-black text-gray-900 dark:text-white truncate group-hover:text-green-600 transition-colors uppercase tracking-tight">{user.name}</p>
                <p className="text-[9px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">{ROLE_LABELS[user.role]}</p>
              </div>
            </div>
          </button>
          
          <button 
            onClick={() => {
              onLogout();
              if (window.innerWidth < 1024) setIsOpen(false);
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all group"
          >
            <LogOut size={16} className="transition-transform group-hover:-translate-x-1" />
            Sair do Sistema
          </button>
        </div>
      </motion.div>
    </>
  );
};

const ProfessionalsSection = ({ professionals, users, onSaveStaff, onDeleteStaff, showToast, showConfirm }: { 
  professionals: Professional[], 
  users: StaffMember[],
  onSaveStaff: (data: Omit<StaffMember, 'id'>, id?: string) => Promise<void>,
  onDeleteStaff: (id: string) => Promise<void>,
  showToast: (msg: string, type: 'success' | 'error') => void,
  showConfirm: (msg: string, onConfirm: () => void) => void 
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalType, setModalType] = useState<'CONVIVER' | 'INSTITUICAO'>('CONVIVER');
  const [formData, setFormData] = useState<Partial<Professional>>({
    status: 'ATIVO',
    role: 'COORDENADORA',
    cpf: '',
    address: '',
    phone: '',
    email: '',
    observations: '',
    registrationNumber: '',
    admissionDate: ''
  });
  const [staffFormData, setStaffFormData] = useState<Omit<StaffMember, 'id'>>({
    name: '',
    role: 'CUIDADOR',
    status: 'ATIVO',
    cpf: '',
    address: '',
    phone: '',
    email: '',
    observations: '',
    admissionDate: '',
    createdAt: new Date().toISOString()
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'CONVIVER') {
      try {
        const cleanedProfessional = cleanData({
          ...formData,
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'professionals'), cleanedProfessional);
        showToast('Profissional cadastrado com sucesso!', 'success');
        setIsModalOpen(false);
        setFormData({ status: 'ATIVO', role: 'COORDENADORA', cpf: '', address: '', phone: '', email: '', observations: '', registrationNumber: '', admissionDate: '' });
      } catch (error) {
        showToast('Erro ao cadastrar profissional.', 'error');
      }
    } else {
      await onSaveStaff(staffFormData);
      setIsModalOpen(false);
      setStaffFormData({ name: '', role: 'CUIDADOR', status: 'ATIVO', cpf: '', address: '', phone: '', email: '', observations: '', admissionDate: '', createdAt: new Date().toISOString() });
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

  const handleDeleteStaff = (id: string) => {
    showConfirm('Tem certeza que deseja excluir este funcionário da instituição?', async () => {
      await onDeleteStaff(id);
    });
  };

  return (
    <div className="space-y-12">
      {/* Search and Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão de <span className="text-green-600">Usuários</span></h2>
          <p className="text-gray-500 font-medium font-mono text-xs uppercase tracking-widest mt-1">Recursos Humanos & Equipe</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={() => { setModalType('CONVIVER'); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all text-sm"
          >
            <Plus size={18} /> Novo Usuário Conviver
          </button>
          <button 
            onClick={() => { setModalType('INSTITUICAO'); setIsModalOpen(true); }}
            className="flex items-center gap-2 bg-green-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg hover:bg-green-700 transition-all text-sm"
          >
            <Plus size={18} /> Novo Usuário Instituição
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        {/* Column 1: Projeto Conviver */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-blue-100 dark:border-blue-900/30">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600">
              <Users size={20} />
            </div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white">Usuários do Projeto Conviver</h3>
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {(professionals || []).map((p) => (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative group flex items-center gap-4"
              >
                <button 
                  onClick={() => handleDelete(p.id)}
                  className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Briefcase size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{p.name}</h4>
                  <p className="text-[10px] text-blue-600 dark:text-blue-400 font-black uppercase tracking-wider mt-1">{ROLE_LABELS[p.role]}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><IdCard size={10} /> {p.registrationNumber}</span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><UserIcon size={10} /> CPF: {p.cpf || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><CheckCircle2 size={10} className={p.status === 'ATIVO' ? 'text-green-500' : 'text-red-500'} /> {p.status}</span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Phone size={10} /> {p.phone || 'N/A'}</span>
                  </div>
                  {p.address && <p className="text-[9px] text-gray-400 mt-1 line-clamp-1 flex items-center gap-1"><Home size={9} /> {p.address}</p>}
                </div>
              </motion.div>
            ))}
            {professionals.length === 0 && (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 font-bold text-sm">Nenhum profissional conviver.</p>
              </div>
            )}
          </div>
        </section>

        {/* Column 2: Instituição */}
        <section className="space-y-6">
          <div className="flex items-center gap-3 pb-2 border-b-2 border-green-100 dark:border-green-900/30">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600">
              <ShieldCheck size={20} />
            </div>
            <h3 className="text-xl font-black text-gray-800 dark:text-white">Usuários da Instituição (OAMI)</h3>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {(users || []).map((s) => (
              <motion.div 
                key={s.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 relative group flex items-center gap-4"
              >
                <button 
                  onClick={() => handleDeleteStaff(s.id)}
                  className="absolute top-2 right-2 p-2 text-gray-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                >
                  <Trash2 size={16} />
                </button>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-500 flex-shrink-0">
                  <Heart size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{s.name}</h4>
                  <p className="text-[10px] text-green-600 dark:text-green-400 font-black uppercase tracking-wider mt-1">{safeReplace(s.role, '_', ' ') || 'FUNÇÃO'}</p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 mt-2">
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><UserIcon size={10} /> CPF: {s.cpf || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Phone size={10} /> {s.phone || 'N/A'}</span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><CheckCircle2 size={10} className={s.status === 'ATIVO' ? 'text-green-500' : 'text-red-500'} /> {s.status}</span>
                    <span className="text-[10px] text-gray-400 font-bold flex items-center gap-1"><Calendar size={10} /> Adm: {safeFormat(s.admissionDate, 'dd/MM/yyyy', 'N/A')}</span>
                  </div>
                  {s.address && <p className="text-[9px] text-gray-400 mt-1 line-clamp-1 flex items-center gap-1"><Home size={9} /> {s.address}</p>}
                </div>
              </motion.div>
            ))}
            {users.length === 0 && (
              <div className="text-center py-10 bg-gray-50 dark:bg-gray-800/30 rounded-2xl border border-dashed border-gray-200 dark:border-gray-800">
                <p className="text-gray-400 font-bold text-sm">Nenhum funcionário institutional.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex justify-center items-start p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] max-w-2xl w-full shadow-2xl border border-gray-100 dark:border-gray-800 my-4 md:my-10 overflow-hidden flex flex-col"
            >
              <div className="flex justify-between items-center p-8 pb-4 bg-white dark:bg-gray-900 sticky top-0 z-10">
                <h3 className="text-2xl font-black text-gray-800 dark:text-white">
                  Cadastrar {modalType === 'CONVIVER' ? 'Usuário Conviver' : 'Usuário da Instituição'}
                </h3>
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-3 rounded-2xl transition-all shadow-sm"
                  aria-label="Fachar"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto px-8 pb-10">
                <form onSubmit={handleAdd} className="space-y-6">
                {modalType === 'CONVIVER' ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nome Completo</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.name || ''}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Cargo/Função</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.role || ''}
                        onChange={(e) => setFormData({...formData, role: e.target.value as Role})}
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Número de Registro</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.registrationNumber || ''}
                        onChange={(e) => setFormData({...formData, registrationNumber: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">CPF</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.cpf || ''}
                        onChange={(e) => setFormData({...formData, cpf: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Telefone</label>
                      <input 
                        type="tel"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.phone || ''}
                        onChange={(e) => setFormData({...formData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">E-mail</label>
                      <input 
                        type="email"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.email || ''}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Data de Admissão</label>
                      <input 
                        type="date"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.admissionDate || ''}
                        onChange={(e) => setFormData({...formData, admissionDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Endereço</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.address || ''}
                        onChange={(e) => setFormData({...formData, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Observações/Outros</label>
                      <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold h-24"
                        value={formData.observations || ''}
                        onChange={(e) => setFormData({...formData, observations: e.target.value})}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Nome Completo</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.name}
                        onChange={(e) => setStaffFormData({...staffFormData, name: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Vínculo/Cargo</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.role}
                        onChange={(e) => setStaffFormData({...staffFormData, role: e.target.value as StaffRole})}
                      >
                        <option value="CUIDADOR">Cuidador</option>
                        <option value="SERVICO_GERAIS">Serviço Gerais</option>
                        <option value="COZINHEIRA">Cozinheira</option>
                        <option value="VIGIA">Vigia</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">CPF</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.cpf || ''}
                        onChange={(e) => setStaffFormData({...staffFormData, cpf: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Telefone</label>
                      <input 
                        type="tel"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.phone || ''}
                        onChange={(e) => setStaffFormData({...staffFormData, phone: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">E-mail</label>
                      <input 
                        type="email"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.email || ''}
                        onChange={(e) => setStaffFormData({...staffFormData, email: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Data de Admissão</label>
                      <input 
                        type="date"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.admissionDate || ''}
                        onChange={(e) => setStaffFormData({...staffFormData, admissionDate: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Endereço</label>
                      <input 
                        type="text"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                        value={staffFormData.address || ''}
                        onChange={(e) => setStaffFormData({...staffFormData, address: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Observações/Outros</label>
                      <textarea 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold h-24"
                        value={staffFormData.observations || ''}
                        onChange={(e) => setStaffFormData({...staffFormData, observations: e.target.value})}
                      />
                    </div>
                  </div>
                )}

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                  <button type="submit" className={cn(
                    "flex-1 py-4 text-white rounded-2xl font-black text-sm shadow-xl transition-all",
                    modalType === 'CONVIVER' ? 'bg-blue-600 hover:bg-blue-700 shadow-blue-600/20' : 'bg-green-600 hover:bg-green-700 shadow-green-600/20'
                  )}>
                    Salvar Cadastro
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DashboardSection = ({ 
  elderly, 
  communityElderly, 
  caregivers, 
  evolutions, 
  volunteers, 
  financialRecords, 
  user, 
  events, 
  theme, 
  onViewSchedule,
  physioEvolutions,
  nursingEvolutions,
  psychEvolutions,
  pedagogyEvolutions,
  socialEvolutions,
  vitalSigns,
  workshops,
  socialFamilyVisits,
  pias,
  onNavigate,
  diaperRawProductions,
  diaperFinalPackings
}: { 
  elderly: Elderly[], 
  communityElderly: CommunityElderly[],
  caregivers: Caregiver[],
  evolutions: EvolutionRecord[], 
  volunteers: Volunteer[],
  financialRecords: FinancialRecord[],
  user: User, 
  events: CalendarEvent[], 
  theme: 'light' | 'dark',
  onViewSchedule: () => void,
  physioEvolutions: PhysioEvolution[],
  nursingEvolutions: NursingEvolution[],
  psychEvolutions: PsychEvolution[],
  pedagogyEvolutions: PedagogyEvolution[],
  socialEvolutions: SocialEvolution[],
  vitalSigns: VitalSigns[],
  workshops: Workshop[],
  socialFamilyVisits: SocialFamilyVisit[],
  pias: PIA[],
  onNavigate: (tab: string) => void,
  diaperRawProductions: DiaperRawProduction[],
  diaperFinalPackings: DiaperFinalPacking[]
}) => {
  // Aggregate all evolutions
  const allEvolutions = useMemo(() => {
    return [
      ...(evolutions || []).map(e => ({ ...e, specialty: 'Institucional' })),
      ...(physioEvolutions || []).map(e => ({ ...e, specialty: 'Fisioterapia' })),
      ...(nursingEvolutions || []).map(e => ({ ...e, specialty: 'Enfermagem' })),
      ...(psychEvolutions || []).map(e => ({ ...e, specialty: 'Psicologia' })),
      ...(pedagogyEvolutions || []).map(e => ({ ...e, specialty: 'Pedagogia' })),
      ...(socialEvolutions || []).map(e => ({ ...e, specialty: 'S. Social' }))
    ].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  }, [evolutions, physioEvolutions, nursingEvolutions, psychEvolutions, pedagogyEvolutions, socialEvolutions]);

  const evolutionStats = useMemo(() => {
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const d = subMonths(new Date(), i);
      return {
        name: format(d, 'MMM', { locale: ptBR }),
        monthKey: format(d, 'yyyy-MM'),
        Fisioterapia: 0,
        Enfermagem: 0,
        Psicologia: 0,
        Pedagogia: 0,
        Social: 0,
        Total: 0
      };
    }).reverse();

    allEvolutions.forEach(ev => {
      const monthKey = ev.date?.substring(0, 7);
      const monthData = last12Months.find(m => m.monthKey === monthKey);
      if (monthData) {
        monthData.Total++;
        if (ev.specialty === 'Fisioterapia') monthData.Fisioterapia++;
        if (ev.specialty === 'Enfermagem') monthData.Enfermagem++;
        if (ev.specialty === 'Psicologia') monthData.Psicologia++;
        if (ev.specialty === 'Pedagogia') monthData.Pedagogia++;
        if (ev.specialty === 'S. Social' || ev.source === 'Social') monthData.Social++;
      }
    });

    return last12Months;
  }, [allEvolutions]);

  const radarStats = useMemo(() => {
    const monthStr = format(new Date(), 'yyyy-MM');
    const filterByMonth = (list: any[]) => (list || []).filter(item => (item.date || '').startsWith(monthStr)).length;

    return [
      { subject: 'Saúde', A: filterByMonth(nursingEvolutions) + filterByMonth(physioEvolutions), B: 100, fullMark: 150 },
      { subject: 'Social', A: filterByMonth(socialEvolutions) + filterByMonth(socialFamilyVisits), B: 80, fullMark: 150 },
      { subject: 'Psico', A: filterByMonth(psychEvolutions), B: 60, fullMark: 150 },
      { subject: 'Lazer', A: filterByMonth(workshops) + filterByMonth(pedagogyEvolutions), B: 90, fullMark: 150 },
      { subject: 'Doc.', A: (pias || []).length, B: elderly.length, fullMark: Math.max(10, (elderly || []).length) },
    ];
  }, [nursingEvolutions, physioEvolutions, socialEvolutions, socialFamilyVisits, psychEvolutions, workshops, pedagogyEvolutions, pias, elderly]);

  const vitalSignsStats = useMemo(() => {
    const last15 = [...(vitalSigns || [])].sort((a,b) => (a.date || '').localeCompare(b.date || '')).slice(-30);
    return last15.map(v => ({
      date: safeFormat(v.date, 'dd/MM'),
      sistolica: v.systolicBP || 120,
      diastolica: v.diastolicBP || 80,
      pulso: v.heartRate
    }));
  }, [vitalSigns]);

  const workshopStats = useMemo(() => {
    const categories: Record<string, number> = {};
    (workshops || []).forEach(w => {
      const label = w.type === 'CAPACITACAO' ? 'Capacitação' : 'Oficina';
      categories[label] = (categories[label] || 0) + 1;
    });
    return Object.entries(categories).map(([name, value]) => ({ name, value }));
  }, [workshops]);

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

  const stats = useMemo(() => {
    const now = new Date();
    const lastMonth = subMonths(now, 1);
    const twoMonthsAgo = subMonths(now, 2);
    
    // Calculate real numbers and simulations for growth
    const evolutionsThisMonth = (allEvolutions || []).filter(e => e.date && e.date >= format(lastMonth, 'yyyy-MM-dd')).length;
    const evolutionsPrevMonth = (allEvolutions || []).filter(e => e.date && e.date >= format(twoMonthsAgo, 'yyyy-MM-dd') && e.date < format(lastMonth, 'yyyy-MM-dd')).length;
    const evolutionsGrowth = evolutionsPrevMonth === 0 ? 0 : Math.round(((evolutionsThisMonth - evolutionsPrevMonth) / evolutionsPrevMonth) * 100);

    const diaperThisMonth = (diaperFinalPackings || []).filter(p => p.date >= format(startOfMonth(now), 'yyyy-MM-dd')).reduce((acc, p) => acc + p.quantityPackaged, 0);
    const diaperPrevMonth = (diaperFinalPackings || []).filter(p => p.date >= format(startOfMonth(subMonths(now, 1)), 'yyyy-MM-dd') && p.date < format(startOfMonth(now), 'yyyy-MM-dd')).reduce((acc, p) => acc + p.quantityPackaged, 0);
    const diaperGrowth = diaperPrevMonth === 0 ? 0 : Math.round(((diaperThisMonth - diaperPrevMonth) / diaperPrevMonth) * 100);

    return [
      { 
        label: 'Produção (Mês)', 
        value: diaperThisMonth.toLocaleString('pt-BR'), 
        growth: diaperGrowth >= 0 ? `+${diaperGrowth}%` : `${diaperGrowth}%`,
        icon: Package, 
        color: 'text-amber-600', 
        bg: 'bg-amber-50', 
        tab: 'diaperProduction' 
      },
      { 
        label: 'Evoluções (30d)', 
        value: evolutionsThisMonth.toString(), 
        growth: evolutionsGrowth >= 0 ? `+${evolutionsGrowth}%` : `${evolutionsGrowth}%`,
        icon: ClipboardList, 
        color: 'text-blue-600', 
        bg: 'bg-blue-50', 
        tab: 'professional' 
      },
      { 
        label: 'Oficinas/Capac.', 
        value: (workshops || []).length.toString(), 
        growth: (workshops || []).length > 0 ? '+5%' : '0%',
        icon: BookOpen, 
        color: 'text-emerald-600', 
        bg: 'bg-emerald-50', 
        tab: 'workshops' 
      },
      { 
        label: 'Alertas Saúde', 
        value: (vitalSigns || []).filter(v => 
          (v.heartRate && (v.heartRate > 100 || v.heartRate < 60)) || 
          (v.systolicBP && (v.systolicBP > 140 || v.systolicBP < 90)) ||
          (v.saturation && v.saturation < 92)
        ).length.toString(), 
        growth: 'Ref. Técnica',
        icon: ShieldAlert, 
        color: 'text-rose-600', 
        bg: 'bg-rose-50', 
        tab: 'nursing' 
      },
    ];
  }, [allEvolutions, workshops, socialFamilyVisits, vitalSigns]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-12">
      {/* Header Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Dashboard Executivo</h2>
          <p className="text-gray-500 font-medium">Visão geral do monitoramento multidisciplinar e institucional.</p>
        </div>
        <div className="flex items-center gap-2 bg-white dark:bg-gray-800 p-1.5 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-4 py-2 bg-green-600 text-white rounded-xl text-xs font-bold shadow-md shadow-green-200 dark:shadow-none">
            Visão Geral
          </div>
          <button 
            onClick={() => onNavigate('reports')}
            className="px-4 py-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-xl text-xs font-bold transition-colors"
          >
            Relatórios
          </button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, i) => (
          <motion.button 
            key={stat.label}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => onNavigate(stat.tab)}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="group relative bg-white dark:bg-gray-900 p-6 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden hover:shadow-xl hover:shadow-gray-200/50 dark:hover:shadow-none transition-all text-left w-full cursor-pointer"
          >
            <div className={cn("absolute -right-4 -bottom-4 p-8 rounded-full opacity-5 group-hover:scale-110 transition-transform", stat.bg)}>
              <stat.icon size={80} />
            </div>
            
            <div className="relative flex flex-col gap-4">
              <div className={cn("w-12 h-12 rounded-2xl flex items-center justify-center shadow-sm", stat.bg, stat.color)}>
                <stat.icon size={24} />
              </div>
              <div>
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-1">{stat.label}</p>
                <div className="flex items-baseline gap-2">
                  <h4 className="text-3xl font-black text-gray-900 dark:text-white">{stat.value}</h4>
                  <span className="text-[10px] font-bold text-green-500">{stat.growth}</span>
                </div>
              </div>
            </div>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Multidisciplinary Evolutions Chart */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Evoluções por Especialidade</h3>
              <p className="text-sm text-gray-500 font-medium font-mono uppercase tracking-tighter">Histórico Multidisciplinar (12 meses)</p>
            </div>
            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl">
              <TrendingUp size={20} />
            </div>
          </div>
          
          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={evolutionStats} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#f8f8f8'} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  cursor={{ fill: theme === 'dark' ? '#1f2937' : '#f9fafb' }}
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    padding: '16px'
                  }}
                  itemStyle={{ fontWeight: 'bold', fontSize: '12px' }}
                />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ paddingTop: '20px' }} formatter={(v) => <span className="text-[10px] font-black uppercase text-gray-500">{v}</span>} />
                <Bar dataKey="Fisioterapia" stackId="a" fill="#3b82f6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Enfermagem" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Psicologia" stackId="a" fill="#f59e0b" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Pedagogia" stackId="a" fill="#8b5cf6" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Social" stackId="a" fill="#ef4444" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Vital Signs Area Chart */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Tendência de Sinais Vitais</h3>
              <p className="text-sm text-gray-500 font-medium font-mono uppercase tracking-tighter">Médias de Monitoramento (Histórico)</p>
            </div>
            <div className="p-2 bg-rose-50 text-rose-600 rounded-xl">
              <HeartPulse size={20} />
            </div>
          </div>

          <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={vitalSignsStats}>
                <defs>
                  <linearGradient id="colorSis" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                  </linearGradient>
                  <linearGradient id="colorPulse" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/>
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={theme === 'dark' ? '#374151' : '#f8f8f8'} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <YAxis axisLine={false} tickLine={false} tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                <Tooltip 
                  contentStyle={{ 
                    borderRadius: '24px', 
                    border: 'none', 
                    boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                    backgroundColor: theme === 'dark' ? '#111827' : '#ffffff',
                    padding: '16px'
                  }}
                />
                <Legend verticalAlign="top" align="right" iconType="circle" iconSize={8} formatter={(v) => <span className="text-[10px] font-black uppercase text-gray-500">{v}</span>} />
                <Area type="monotone" dataKey="sistolica" name="Pres. Sistólica" stroke="#ef4444" strokeWidth={3} fillOpacity={1} fill="url(#colorSis)" />
                <Area type="monotone" dataKey="pulso" name="Pulso (bpm)" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorPulse)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Workshop Distrubution */}
        <div className="bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800">
           <h3 className="text-lg font-black text-gray-900 dark:text-white mb-6">Oficinas vs Capacitações</h3>
           <div style={{ width: '100%', height: 300 }} className="relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={workshopStats}
                    innerRadius={60}
                    outerRadius={80}
                    paddingAngle={8}
                    dataKey="value"
                  >
                    {workshopStats.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                     contentStyle={{ 
                        borderRadius: '16px', 
                        border: 'none', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        backgroundColor: theme === 'dark' ? '#111827' : '#ffffff'
                      }}
                  />
                  <Legend iconSize={8} iconType="circle" layout="vertical" align="right" verticalAlign="middle" formatter={(v) => <span className="text-[10px] font-black uppercase text-gray-500">{v}</span>} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-1/2 left-[35%] -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
                 <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total</p>
                 <p className="text-2xl font-black text-gray-900 dark:text-white">{workshops.length}</p>
              </div>
           </div>
        </div>

        {/* Home Visits Radar Chart */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-[2.5rem] shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row gap-8 items-center">
            <div className="flex-1 space-y-4">
               <div>
                  <h3 className="text-xl font-black text-gray-900 dark:text-white mb-1">Acompanhamento Familiar</h3>
                  <p className="text-sm text-gray-500 font-medium">As visitas domiciliares são essenciais para o monitoramento multidimensional do idoso.</p>
               </div>
               <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Visitas Mês</p>
                     <p className="text-xl font-black text-gray-900 dark:text-white">{socialFamilyVisits.filter(v => v.date.startsWith(format(new Date(), 'yyyy-MM'))).length}</p>
                  </div>
                  <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-2xl">
                     <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Última Visita</p>
                     <p className="text-xl font-black text-gray-900 dark:text-white">{safeFormat(socialFamilyVisits[0]?.date, 'dd/MM', '--')}</p>
                  </div>
               </div>
               <button 
                  onClick={() => onNavigate('socialWork')}
                  className="w-full py-3 bg-gray-900 dark:bg-white dark:text-gray-900 text-white rounded-2xl text-xs font-black uppercase tracking-widest hover:scale-[1.02] transition-transform"
               >
                  Ver Relatório Completo
               </button>
            </div>

            <div style={{ width: '100%', height: 300 }} className="shrink-0">
               <ResponsiveContainer width="100%" height="100%">
                  <RadarChart cx="50%" cy="50%" outerRadius="80%" data={radarStats}>
                    <PolarGrid stroke={theme === 'dark' ? '#374151' : '#e5e7eb'} />
                    <PolarAngleAxis dataKey="subject" tick={{ fill: '#9ca3af', fontSize: 10, fontWeight: 'bold' }} />
                    <Radar name="Meta" dataKey="B" stroke="#10b981" fill="#10b981" fillOpacity={0.3} />
                    <Radar name="Real" dataKey="A" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} />
                  </RadarChart>
               </ResponsiveContainer>
            </div>
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
        safeFormat(e.birthDate, 'dd/MM/yyyy', 'N/A'),
        e.status === 'ATIVO' ? 'Ativo' : 'Inativo'
      ]);

      await generateModernPDF({
        title: 'Lista de Acolhidos',
        subtitle: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        columns,
        data,
        fileName: 'lista_acolhidos'
      });
      showToast('Lista de acolhidos exportada com sucesso (PDF)!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar lista de acolhidos', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateElderlyListWord = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'CPF', 'Data Nasc.', 'Status'];
      const data = (elderly || []).map(e => [
        e.name || 'N/A',
        e.cpf || 'N/A',
        safeFormat(e.birthDate, 'dd/MM/yyyy', 'N/A'),
        e.status === 'ATIVO' ? 'Ativo' : 'Inativo'
      ]);

      await generateModernWord({
        title: 'Lista de Acolhidos',
        subtitle: `Relatório gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm")}`,
        columns,
        data,
        fileName: 'lista_acolhidos'
      });
      showToast('Lista de acolhidos exportada com sucesso (Word)!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar lista de acolhidos (Word)', 'error');
    } finally {
      setExporting(false);
    }
  };

  const [formData, setFormData] = useState({
    name: '',
    fullName: '',
    cpf: '',
    rg: '',
    susCard: '',
    birthCertificate: '',
    lastProfession: '',
    birthDate: '',
    gender: 'F' as 'M' | 'F' | 'OUTRO',
    photoUrl: '',
    entryDate: new Date().toISOString().split('T')[0],
    address: '',
    phone: '',
    responsibleName: '',
    responsiblePhone: '',
    schooling: '',
    literacyLevel: 'ALFABETIZADO' as 'ALFABETIZADO' | 'ANALFABETO' | 'ALFABETIZADO_FUNCIONAL',
    diseases: '',
    medications: '',
    allergies: '',
    diagnoses: '',
    physicalLimitations: '',
    observations: '',
    status: 'ATIVO' as const
  });

  const handleAddElderly = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.birthDate) return;

    setLoading(true);
    try {
      let finalPhotoUrl = formData.photoUrl;
      // Se a foto for um Base64 muito grande (mais de 100kb), vamos comprimir antes de salvar
      if (finalPhotoUrl && finalPhotoUrl.startsWith('data:image') && finalPhotoUrl.length > 100000) {
        try {
          finalPhotoUrl = await compressImage(finalPhotoUrl);
        } catch (err) {
          console.warn("Falha na compressão preventiva:", err);
        }
      }

      const cleanedData = cleanData({ ...formData, photoUrl: finalPhotoUrl });
      if (isEditModalOpen && editingElderly) {
        await updateDoc(doc(db, 'elderly', editingElderly.id), {
          ...cleanedData,
          updatedAt: new Date().toISOString()
        });
      } else {
        await addDoc(collection(db, 'elderly'), {
          ...cleanedData,
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
        rg: '',
        susCard: '',
        birthCertificate: '',
        lastProfession: '',
        birthDate: '',
        gender: 'F',
        photoUrl: '',
        entryDate: new Date().toISOString().split('T')[0],
        address: '',
        phone: '',
        responsibleName: '',
        responsiblePhone: '',
        schooling: '',
        literacyLevel: 'ALFABETIZADO',
        diseases: '',
        medications: '',
        allergies: '',
        diagnoses: '',
        physicalLimitations: '',
        observations: '',
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
      name: e.name || '',
      fullName: e.fullName || '',
      cpf: e.cpf || '',
      rg: e.rg || '',
      susCard: e.susCard || '',
      birthCertificate: e.birthCertificate || '',
      lastProfession: e.lastProfession || '',
      birthDate: e.birthDate || '',
      gender: e.gender || 'F',
      photoUrl: e.photoUrl || '',
      entryDate: e.entryDate || '',
      address: e.address || '',
      phone: e.phone || '',
      responsibleName: e.responsibleName || '',
      responsiblePhone: e.responsiblePhone || '',
      schooling: e.schooling || '',
      literacyLevel: e.literacyLevel || 'ALFABETIZADO',
      diseases: e.diseases || '',
      medications: e.medications || '',
      allergies: e.allergies || '',
      diagnoses: e.diagnoses || '',
      physicalLimitations: e.physicalLimitations || '',
      observations: e.observations || '',
      status: e.status || 'ATIVO'
    });
    setIsEditModalOpen(true);
    setSelectedElderly(null);
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      const compressed = await compressImage(base64);
      setFormData(prev => ({ ...prev, photoUrl: compressed }));
    } catch (err) {
      console.error("Erro ao comprimir foto do idoso:", err);
    }
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
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
                <div className="flex flex-col items-center mb-6">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-gray-100 dark:bg-gray-800 rounded-3xl overflow-hidden border-2 border-dashed border-gray-300 dark:border-gray-700 flex items-center justify-center transition-all group-hover:border-green-500">
                      {formData.photoUrl ? (
                        <img src={formData.photoUrl} alt="Preview" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="flex flex-col items-center text-gray-400 dark:text-gray-500">
                          <Camera size={32} />
                          <span className="text-[10px] font-bold mt-2 uppercase tracking-widest">Foto</span>
                        </div>
                      )}
                    </div>
                    <label className="absolute inset-0 cursor-pointer flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-3xl">
                      <Upload className="text-white" size={24} />
                      <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
                    </label>
                    {formData.photoUrl && (
                      <button 
                        type="button"
                        onClick={() => setFormData({...formData, photoUrl: ''})}
                        className="absolute -top-2 -right-2 p-1.5 bg-red-500 text-white rounded-full shadow-lg hover:bg-red-600 transition-colors"
                      >
                        <X size={14} />
                      </button>
                    )}
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-600 font-bold mt-3 uppercase tracking-tighter">Clique para enviar foto ou arrastar</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Nome Curto (Apelido)</label>
                    <input 
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
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.birthDate}
                      onChange={e => setFormData({...formData, birthDate: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Gênero</label>
                    <select
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.gender}
                      onChange={e => setFormData({...formData, gender: e.target.value as any})}
                    >
                      <option value="M">Masculino</option>
                      <option value="F">Feminino</option>
                      <option value="OUTRO">Outro</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">RG</label>
                    <input 
                      type="text" 
                      placeholder="Nº do RG"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.rg || ''}
                      onChange={e => setFormData({...formData, rg: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Cartão SUS</label>
                    <input 
                      type="text" 
                      placeholder="Nº do Cartão SUS"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.susCard || ''}
                      onChange={e => setFormData({...formData, susCard: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2 md:col-span-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Endereço de Origem</label>
                    <input 
                      type="text" 
                      placeholder="Rua, Número, Bairro, Cidade"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.address || ''}
                      onChange={e => setFormData({...formData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Responsável Legal</label>
                    <input 
                      type="text" 
                      placeholder="Nome do Responsável"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.responsibleName || ''}
                      onChange={e => setFormData({...formData, responsibleName: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Telefone Responsável</label>
                    <input 
                      type="tel" 
                      placeholder="(00) 0 0000-0000"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.responsiblePhone || ''}
                      onChange={e => setFormData({...formData, responsiblePhone: e.target.value})}
                    />
                  </div>
                  
                  <div className="md:col-span-2 pt-4 border-t border-gray-100 dark:border-gray-800">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4">Informações Multidisciplinares Sincronizadas</h4>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Escolaridade</label>
                    <input 
                      type="text" 
                      placeholder="Grau de instrução"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.schooling || ''}
                      onChange={e => setFormData({...formData, schooling: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Alfabetização</label>
                    <select
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.literacyLevel}
                      onChange={e => setFormData({...formData, literacyLevel: e.target.value as any})}
                    >
                      <option value="ALFABETIZADO">Alfabetizado</option>
                      <option value="ANALFABETO">Analfabeto</option>
                      <option value="ALFABETIZADO_FUNCIONAL">Alfabetizado Funcional</option>
                    </select>
                  </div>

                  <div className="md:col-span-2 space-y-4">
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-red-600 dark:text-red-400 flex items-center gap-2">
                        <ShieldAlert size={14} /> Doenças / Comorbidades
                      </label>
                      <textarea 
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-red-500 text-gray-800 dark:text-white h-20"
                        value={formData.diseases || ''}
                        onChange={e => setFormData({...formData, diseases: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-amber-600 dark:text-amber-400 flex items-center gap-2">
                        <ClipboardList size={14} /> Medicações em Uso
                      </label>
                      <textarea 
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-gray-800 dark:text-white h-20"
                        value={formData.medications || ''}
                        onChange={e => setFormData({...formData, medications: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Diagnósticos / Observações Gerais</label>
                      <textarea 
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white h-24"
                        value={formData.observations || ''}
                        onChange={e => setFormData({...formData, observations: e.target.value})}
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 dark:text-gray-300">Data de Entrada</label>
                    <input 
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
                    <span translate="no">{loading ? 'Salvando...' : isEditModalOpen ? 'Salvar Alterações' : 'Cadastrar Acolhido'}</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-800 dark:text-white" translate="no">Acompanhamento de Idosos</h2>
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
              <span translate="no">Novo Acolhido</span>
            </button>
            <button 
              onClick={generateElderlyListPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all disabled:opacity-50" 
              title="Exportar Lista em PDF"
            >
              <FileDown size={18} />
              PDF
            </button>
            <button 
              onClick={generateElderlyListWord}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/30 transition-all disabled:opacity-50" 
              title="Exportar Lista em Word"
            >
              <FileText size={18} />
              Word
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
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center text-green-600 dark:text-green-400 font-bold text-xl group-hover:bg-green-600 group-hover:text-white transition-all overflow-hidden shadow-sm">
                {elderly.photoUrl ? (
                  <img src={elderly.photoUrl} alt={elderly.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                ) : (
                  elderly.name.charAt(0)
                )}
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
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
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
                    <div className="w-24 h-24 bg-green-600 rounded-3xl flex items-center justify-center text-white text-3xl font-bold shadow-lg overflow-hidden">
                      {selectedElderly.photoUrl ? (
                        <img src={selectedElderly.photoUrl} alt={selectedElderly.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        selectedElderly.name.charAt(0)
                      )}
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
                      {(pias || []).filter(p => p.elderlyId === selectedElderly.id).length > 0 ? (
                        (pias || []).filter(p => p.elderlyId === selectedElderly.id).sort((a, b) => b.date.localeCompare(a.date)).slice(0, 1).map(pia => (
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
                        {(evolutions || []).filter(ev => ev.elderlyId === selectedElderly.id).length > 0 ? (
                          (evolutions || []).filter(ev => ev.elderlyId === selectedElderly.id).slice(0, 5).map(ev => (
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
    const selectedElderly = (elderly || []).find(e => e.id === formData.elderlyId);
    if (!selectedElderly) return;

    setExporting(true);
    try {
      if (fileFormat === 'pdf') {
        const columns = ['Campo', 'Informação'];
        const data = [
          ['Idoso', selectedElderly.name],
          ['Data', safeFormat(formData.date, 'dd/MM/yyyy')],
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

        await generateModernPDF({
          title: 'Plano Individual de Atendimento (PIA)',
          subtitle: `Acolhido: ${selectedElderly.name} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
          columns,
          data,
          fileName: `PIA_${safeReplace(selectedElderly.name, /\s+/g, '_')}`
        });
      } else {
        const columns = ['Campo', 'Informação'];
        const data = [
          ['Idoso', selectedElderly.name],
          ['Data', safeFormat(formData.date, 'dd/MM/yyyy')],
          ['Responsável', formData.responsible],
          ['', ''], // Spacer
          ['SITUAÇÃO SOCIOECONÔMICA', ''],
          ['Renda Mensal', `R$ ${formData.monthlyIncome}`],
          ['Possui BPC', formData.hasBPC ? 'Sim' : 'Não'],
          ['Possui Aposentadoria', formData.hasPension ? 'Sim' : 'Não'],
          ['Empréstimos', formData.hasLoans ? 'Sim (' + formData.loanDetails + ')' : 'Não'],
          ['', ''], // Spacer
          ['SAÚDE E MOBILIDADE', ''],
          ['Estado de Saúde', formData.healthStatus],
          ['Medicações', formData.medications],
          ['Mobilidade', formData.mobilityStatus],
          ['', ''], // Spacer
          ['PLANEJAMENTO', ''],
          ['Objetivos', formData.objectives],
          ['Ações', formData.actions],
          ['Observações', formData.observations]
        ];

        await generateModernWord({
          title: 'Plano Individual de Atendimento (PIA)',
          subtitle: `Acolhido: ${selectedElderly.name} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
          columns,
          data,
          fileName: `PIA_${safeReplace(selectedElderly.name, /\s+/g, '_')}`
        });
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
      const piasData = cleanData({
        ...formData,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      });
      await addDoc(collection(db, 'pias'), piasData);
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
      const evolutionData = cleanData({
        elderlyId: selectedElderly,
        professionalId: user.id,
        professionalRole: user.role,
        date: evolutionDate,
        content: evolutionContent,
        type: evolutionType,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'evolutions'), evolutionData);

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
        safeFormat(ev.date, 'dd/MM/yyyy'),
        (elderly || []).find(e => e.id === ev.elderlyId)?.name || 'N/A',
        ev.content
      ]);

      await generateModernPDF({
        title: `Relatório Mensal - ${ROLE_LABELS[user.role]}`,
        subtitle: `Profissional: ${user.name} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${user.role.toLowerCase()}`
      });
      showToast('Relatório profissional exportado com sucesso (PDF)!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório profissional', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateProfessionalReportWord = async () => {
    setExporting(true);
    try {
      const columns = ['Data', 'Acolhido', 'Evolução'];
      const data = filteredEvolutions.map(ev => [
        safeFormat(ev.date, 'dd/MM/yyyy'),
        (elderly || []).find(e => e.id === ev.elderlyId)?.name || 'N/A',
        ev.content
      ]);

      await generateModernWord({
        title: `Relatório Mensal - ${ROLE_LABELS[user.role]}`,
        subtitle: `Profissional: ${user.name} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${user.role.toLowerCase()}`
      });
      showToast('Relatório profissional exportado com sucesso (Word)!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório profissional (Word)', 'error');
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
              className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2" 
              title="Exportar Relatório Mensal (PDF)"
            >
              <FileDown size={20} />
              <span className="text-xs font-bold">PDF</span>
            </button>
            <button 
              onClick={generateProfessionalReportWord}
              disabled={exporting}
              className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2" 
              title="Exportar Relatório Mensal (Word)"
            >
              <FileText size={20} />
              <span className="text-xs font-bold">Word</span>
            </button>
          </div>
        </div>

        <div className="flex gap-4 border-b border-gray-100 dark:border-gray-800 mb-8 overflow-x-auto custom-scrollbar whitespace-nowrap pb-1">
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
                            {(elderly || []).find(e => e.id === ev.elderlyId)?.name || 'Desconhecido'}
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
      const financialData = cleanData({
        ...formData,
        amount: Number(formData.amount),
        createdAt: new Date().toISOString(),
        createdBy: user.id
      });
      await addDoc(collection(db, 'financial'), financialData);
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

  const generateFinancialDoc = async (fileFormat: 'pdf' | 'doc' | 'xls') => {
    setExporting(true);
    try {
      const columns = ['Mês', 'Receitas', 'Despesas', 'Saldo'];
      const data = chartData.map(d => [
        d.month,
        `R$ ${d.receitas}`,
        `R$ ${d.despesas}`,
        `R$ ${d.receitas - d.despesas}`
      ]);
      const title = 'Relatório Financeiro';
      const subtitle = `Resumo do Fluxo de Caixa (Últimos 6 Meses) - Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
      const fileName = 'relatorio_financeiro';

      if (fileFormat === 'pdf') {
        await generateModernPDF({ title, subtitle, columns, data, fileName });
      } else if (fileFormat === 'doc') {
        await generateModernWord({ title, subtitle, columns, data, fileName });
      } else if (fileFormat === 'xls') {
        generateModernExcel({ title, columns, data, fileName });
      }
      showToast(`Relatório financeiro exportado em ${safeReplace(fileFormat.toUpperCase(), 'XLS', 'EXCEL')}!`);
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
              className="flex items-center gap-2 p-3 bg-red-50 text-red-600 rounded-xl text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50"
              title="Exportar PDF"
            >
              <FileText size={18} />
            </button>
            <button 
              onClick={() => generateFinancialDoc('doc')}
              disabled={exporting}
              className="flex items-center gap-2 p-3 bg-blue-50 text-blue-600 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all disabled:opacity-50"
              title="Exportar Word"
            >
              <FileDown size={18} />
            </button>
            <button 
              onClick={() => generateFinancialDoc('xls')}
              disabled={exporting}
              className="flex items-center gap-2 p-3 bg-green-50 text-green-600 rounded-xl text-xs font-bold hover:bg-green-100 transition-all disabled:opacity-50"
              title="Exportar Excel"
            >
              <TableIcon size={18} />
            </button>
          </div>
        </div>
        <div style={{ width: '100%', height: 300 }}>
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
                className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
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
                        type="date" 
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                        value={formData.date}
                        onChange={e => setFormData({...formData, date: e.target.value})}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-600 dark:text-gray-400">Descrição</label>
                      <input 
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
  const [exporting, setExporting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'DOADOR' as 'DOADOR' | 'SOCIO_MENSAL',
    amount: 0,
    status: 'ATIVO' as 'ATIVO' | 'INATIVO',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'Tipo', 'E-mail', 'Telefone', 'Valor Mensal', 'Status'];
      const data = donors.map(d => [
        d.name,
        d.type === 'SOCIO_MENSAL' ? 'Sócio Mensal' : 'Doador',
        d.email,
        d.phone,
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
        d.email,
        d.phone,
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
    } finally {
      setExporting(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.email) return;

    setLoading(true);
    try {
      const cleanedDonor = cleanData({
        ...formData,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'donors'), cleanedDonor);
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
        <div className="flex gap-2">
          <button 
            onClick={handleExportPDF}
            disabled={exporting || donors.length === 0}
            className="p-2.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl hover:bg-blue-100 transition-all disabled:opacity-50"
            title="Exportar PDF"
          >
            <FileDown size={20} />
          </button>
          <button 
            onClick={handleExportWord}
            disabled={exporting || donors.length === 0}
            className="p-2.5 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl hover:bg-green-100 transition-all disabled:opacity-50"
            title="Exportar Word"
          >
            <FileText size={20} />
          </button>
          <button 
            onClick={() => setIsModalOpen(true)}
            className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-colors flex items-center gap-2"
          >
            <Plus size={18} />
            Novo Cadastro
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">E-mail</label>
                    <input 
                      type="email" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Telefone</label>
                    <input 
                      type="tel" 
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

const DiaperDonationSection = ({ donations, stock, user, communityElderly, elderly, onFollowBeneficiary, socialPatients, onNavigate, onAddCommunityElderly }: { 
  donations: DiaperDonation[], 
  stock: DiaperStock | null, 
  user: User,
  communityElderly: CommunityElderly[],
  elderly: Elderly[],
  onFollowBeneficiary: (beneficiary: { name: string, birthDate?: string }) => Promise<void>,
  socialPatients: SocialPatient[],
  onNavigate: (tab: string) => void,
  onAddCommunityElderly: (data: any) => Promise<void>
}) => {
  const [activeTab, setActiveTab] = useState<'donations' | 'beneficiaries'>('donations');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewBeneficiaryModalOpen, setIsNewBeneficiaryModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    beneficiaryName: '',
    beneficiaryId: '',
    quantity: 0,
    date: new Date().toISOString().split('T')[0],
    observations: ''
  });

  const [newBeneficiaryData, setNewBeneficiaryData] = useState({
    name: '',
    birthDate: '',
    phone: '',
    address: '',
    age: ''
  });

  const handleAddNewBeneficiary = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onAddCommunityElderly({
        ...newBeneficiaryData,
        age: parseInt(newBeneficiaryData.age) || 0
      });
      setIsNewBeneficiaryModalOpen(false);
      setNewBeneficiaryData({ name: '', birthDate: '', phone: '', address: '', age: '' });
    } catch (err) {
      // Error handled by parent
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.beneficiaryName || formData.quantity <= 0) return;
    
    setLoading(true);
    try {
      const selectedBeneficiary = [...communityElderly, ...elderly].find(b => b.name === formData.beneficiaryName);
      
      const cleanedDonation = cleanData({
        ...formData,
        beneficiaryId: selectedBeneficiary?.id || '',
        size: 'TAMANHO_UNICO',
        registeredBy: user.name,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'diaperDonations'), cleanedDonation);

      const currentQty = stock?.quantity || 0;
      await setDoc(doc(db, 'diaperStock', 'current'), {
        quantity: Math.max(0, currentQty - formData.quantity),
        lastUpdate: new Date().toISOString(),
        updatedBy: user.name
      }, { merge: true });

      setIsModalOpen(false);
      setFormData({
        beneficiaryName: '',
        beneficiaryId: '',
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

  const beneficiariesList = useMemo(() => {
    const map = new Map<string, { name: string, id?: string, total: number, lastDate: string, birthDate?: string }>();
    
    donations.forEach(d => {
      const existing = map.get(d.beneficiaryName);
      if (existing) {
        existing.total += d.quantity;
        if (d.date > existing.lastDate) existing.lastDate = d.date;
      } else {
        const profile = [...communityElderly, ...elderly].find(b => b.id === d.beneficiaryId || b.name === d.beneficiaryName);
        map.set(d.beneficiaryName, {
          name: d.beneficiaryName,
          id: d.beneficiaryId,
          total: d.quantity,
          lastDate: d.date,
          birthDate: profile?.birthDate
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.total - a.total);
  }, [donations, communityElderly, elderly]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Doação de Fraldas</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Gestão de doações comunitárias e acompanhamento multi</p>
        </div>
        <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl">
          <button 
            onClick={() => setActiveTab('donations')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'donations' ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Doações
          </button>
          <button 
            onClick={() => setActiveTab('beneficiaries')}
            className={cn(
              "px-4 py-2 rounded-lg text-sm font-bold transition-all",
              activeTab === 'beneficiaries' ? "bg-white dark:bg-gray-700 text-green-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
            )}
          >
            Beneficiários
          </button>
        </div>
      </div>

      {activeTab === 'donations' ? (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <div className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex items-center gap-6 w-full max-w-sm">
              <div className="p-4 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl">
                <Package size={32} />
              </div>
              <div>
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">Estoque Total</p>
                <p className="text-3xl font-bold text-gray-800 dark:text-white">{stock?.quantity || 0} <span className="text-sm font-normal text-gray-400 dark:text-gray-500">un</span></p>
              </div>
            </div>
            <button 
              onClick={() => setIsModalOpen(true)}
              className="bg-green-600 text-white px-6 py-3 rounded-2xl text-sm font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2"
            >
              <Plus size={20} />
              Registrar Doação
            </button>
          </div>

          <div className="bg-white dark:bg-gray-900 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
            <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 dark:text-white flex items-center gap-2">
                <History className="text-green-600" size={20} />
                Histórico de Doações
              </h3>
            </div>
            <div className="overflow-x-auto">
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
                  {donations.map((d) => (
                    <tr key={d.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="p-4 text-sm font-bold text-gray-800 dark:text-white capitalize">{d.beneficiaryName}</td>
                      <td className="p-4 text-sm text-gray-600 dark:text-gray-400">{new Date(d.date).toLocaleDateString('pt-BR')}</td>
                      <td className="p-4 text-sm font-bold text-right text-gray-800 dark:text-white">{d.quantity} un</td>
                      <td className="p-4 text-xs text-gray-500">{d.registeredBy}</td>
                    </tr>
                  ))}
                  {donations.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center text-gray-500 italic">Nenhuma doação registrada.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-bold text-gray-800 dark:text-white">Lista de Beneficiários</h3>
            <button 
              onClick={() => setIsNewBeneficiaryModalOpen(true)}
              className="bg-blue-600 text-white px-4 py-2 rounded-xl text-xs font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2"
            >
              <Plus size={16} />
              Registrar Novo Beneficiário
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {beneficiariesList.map((b) => {
            const isFollowed = socialPatients.some(p => p.name === b.name);
            return (
              <motion.div 
                layout
                key={b.name}
                className="bg-white dark:bg-gray-900 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-4">
                    <div className="w-12 h-12 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-2xl flex items-center justify-center">
                      <UserIcon size={24} />
                    </div>
                    {isFollowed ? (
                      <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-[10px] font-bold px-2 py-1 rounded-full flex items-center gap-1 uppercase">
                        <Activity size={10} />
                        Monitorado
                      </span>
                    ) : (
                      <span className="bg-gray-100 dark:bg-gray-800 text-gray-400 text-[10px] font-bold px-2 py-1 rounded-full uppercase">
                        Não Monitorado
                      </span>
                    )}
                  </div>
                  <h3 className="font-bold text-gray-800 dark:text-white text-lg capitalize">{b.name}</h3>
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 uppercase font-bold">Total Recebido</span>
                      <span className="text-gray-800 dark:text-white font-bold">{b.total} un</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400 uppercase font-bold">Última doação</span>
                      <span className="text-gray-600 dark:text-gray-400">{new Date(b.lastDate).toLocaleDateString('pt-BR')}</span>
                    </div>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t border-gray-50 dark:border-gray-800">
                  {isFollowed ? (
                    <button 
                      onClick={() => onNavigate('socialWork')}
                      className="w-full py-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 font-bold rounded-2xl text-xs hover:bg-blue-100 transition-all flex items-center justify-center gap-2"
                    >
                      <Heart size={14} />
                      Ver Acompanhamento Social
                    </button>
                  ) : (
                    <button 
                      onClick={() => onFollowBeneficiary({ name: b.name, birthDate: b.birthDate })}
                      className="w-full py-3 bg-green-600 text-white font-bold rounded-2xl text-xs hover:bg-green-700 transition-all shadow-lg shadow-green-600/20 flex items-center justify-center gap-2"
                    >
                      <Activity size={14} />
                      Iniciar Acompanhamento Multi
                    </button>
                  )}
                </div>
              </motion.div>
            );
          })}
          {beneficiariesList.length === 0 && (
            <div className="col-span-full p-12 text-center text-gray-500 bg-gray-50 dark:bg-gray-800/50 rounded-3xl border-2 border-dashed border-gray-200 dark:border-gray-700">
              <Users size={48} className="mx-auto mb-4 opacity-20" />
              <p className="font-bold">Nenhum beneficiário encontrado</p>
              <p className="text-sm">Registre doações para ver o histórico aqui.</p>
            </div>
          )}
        </div>
      </div>
      )}

      {/* Modal for registering donation - unchanged structurally but needs to stay inside component */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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
                    list="beneficiary-options"
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                    placeholder="Busque ou digite novo nome"
                    value={formData.beneficiaryName}
                    onChange={(e) => setFormData({ ...formData, beneficiaryName: e.target.value })}
                  />
                  <datalist id="beneficiary-options">
                    {communityElderly.map(e => <option key={e.id} value={e.name} />)}
                    {elderly.map(e => <option key={e.id} value={e.name} />)}
                  </datalist>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Quantidade (un)</label>
                    <input 
                      type="number" 
                      min="1"
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.quantity}
                      onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
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
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Observações (Opcional)</label>
                  <textarea 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white"
                    placeholder="Ex: Motivo da doação extra, local de entrega..."
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

      {/* Modal for New Beneficiary */}
      <AnimatePresence>
        {isNewBeneficiaryModalOpen && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[70] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl p-8 shadow-2xl relative"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-gray-800 dark:text-white">Novo Beneficiário (Comunidade)</h3>
                <button onClick={() => setIsNewBeneficiaryModalOpen(false)} className="text-gray-400 hover:text-gray-600"><X size={24} /></button>
              </div>

              <form onSubmit={handleAddNewBeneficiary} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Nome Completo</label>
                  <input 
                    type="text" 
                    required
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                    value={newBeneficiaryData.name}
                    onChange={(e) => setNewBeneficiaryData({ ...newBeneficiaryData, name: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Idade</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                      value={newBeneficiaryData.age}
                      onChange={(e) => setNewBeneficiaryData({ ...newBeneficiaryData, age: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data de Nasc.</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                      value={newBeneficiaryData.birthDate}
                      onChange={(e) => setNewBeneficiaryData({ ...newBeneficiaryData, birthDate: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Telefone</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                    value={newBeneficiaryData.phone}
                    onChange={(e) => setNewBeneficiaryData({ ...newBeneficiaryData, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Endereço</label>
                  <input 
                    type="text" 
                    className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white"
                    value={newBeneficiaryData.address}
                    onChange={(e) => setNewBeneficiaryData({ ...newBeneficiaryData, address: e.target.value })}
                  />
                </div>

                <div className="flex gap-3 mt-8">
                  <button 
                    type="button"
                    onClick={() => setIsNewBeneficiaryModalOpen(false)}
                    className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-2xl hover:bg-gray-200 transition-all transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-3 bg-blue-600 text-white font-bold rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2"
                  >
                    {loading ? <Activity className="animate-spin" size={18} /> : 'Cadastrar'}
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

        const updateData = cleanData({
          quantity,
          type: modalType,
          observations,
          date: new Date().toISOString()
        });

        await updateDoc(doc(db, 'diaperProductionLogs', editingLog.id), updateData);
      } else {
        const effect = modalType === 'PRODUCTION' ? quantity : -quantity;
        newQty = currentQty + effect;

        const logData = cleanData({
          quantity,
          type: modalType,
          observations,
          registeredBy: user.name,
          date: new Date().toISOString()
        });

        await addDoc(collection(db, 'diaperProductionLogs'), logData);
      }

      const stockData = cleanData({
        quantity: Math.max(0, newQty),
        lastUpdate: new Date().toISOString(),
        updatedBy: user.name
      });

      await setDoc(doc(db, 'diaperStock', 'current'), stockData, { merge: true });

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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
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
        <div style={{ width: '100%', height: 300 }}>
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
      <div className="flex justify-center flex-col items-center gap-6">
        <LogoOami />
        <div className="text-center space-y-4">
          <h2 className="text-4xl font-bold text-green-800 dark:text-green-400">OAMI</h2>
          <p className="text-green-600 dark:text-green-500 font-medium tracking-wide uppercase">Instituição de Longa Permanência para Idosos</p>
          <div className="w-24 h-1.5 bg-green-600 mx-auto rounded-full shadow-sm" />
        </div>
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
  const canEdit = ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);

  const handleExportPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'Tipo', 'Início', 'CPF', 'Endereço', 'Atividades'];
      const data = volunteers.map(v => [
        v.name,
        v.type,
        new Date(v.startDate).toLocaleDateString('pt-BR'),
        v.cpf || '-',
        v.address || '-',
        v.activities
      ]);

      await generateModernPDF({
        title: 'Lista de Voluntários e Estagiários',
        subtitle: `Total: ${volunteers.length} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: 'voluntarios_oami'
      });
    } finally {
      setExporting(false);
    }
  };

  const handleExportWord = async () => {
    setExporting(true);
    try {
      const columns = ['Nome', 'Tipo', 'Início', 'CPF', 'Endereço', 'Atividades'];
      const data = volunteers.map(v => [
        v.name,
        v.type,
        new Date(v.startDate).toLocaleDateString('pt-BR'),
        v.cpf || '-',
        v.address || '-',
        v.activities
      ]);

      await generateModernWord({
        title: 'Lista de Voluntários e Estagiários',
        subtitle: `Total: ${volunteers.length} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: 'voluntarios_oami'
      });
    } finally {
      setExporting(false);
    }
  };
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
    const volunteerData = cleanData({
      ...formData,
      cpf: formData.cpf.trim(),
      address: formData.address.trim(),
      name: formData.name.trim()
    });

    try {
      if (selectedVolunteer) {
        await updateDoc(doc(db, 'volunteers', selectedVolunteer.id), volunteerData);
        showToast('Cadastro atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'volunteers'), {
          ...volunteerData,
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
        <div className="flex gap-3">
          <button 
            onClick={handleExportPDF}
            disabled={exporting || volunteers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all disabled:opacity-50"
            title="Exportar PDF"
          >
            <FileDown size={18} />
            PDF
          </button>
          <button 
            onClick={handleExportWord}
            disabled={exporting || volunteers.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl text-sm font-bold hover:bg-green-100 dark:hover:bg-green-900/40 transition-all disabled:opacity-50"
            title="Exportar Word"
          >
            <FileText size={18} />
            Word
          </button>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4" onClick={() => setIsModalOpen(false)}>
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
      const engagementData = cleanData({
        ...formData,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'familyEngagements'), engagementData);
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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
                {safeReplace(e.type, '_', ' ') || 'INDIVIDUAL'}
              </span>
            </div>
            
            <h4 className="font-bold text-gray-800 dark:text-white text-lg">
              {(elderly || []).find(res => res.id === e.elderlyId)?.name || 'Idoso não identificado'}
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
        {(engagements || []).length === 0 && (
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

const ScheduleSection = ({ events, user, showConfirm, sendNotification }: { 
  events: CalendarEvent[], 
  user: User, 
  showConfirm: (msg: string, onConfirm: () => void) => void,
  sendNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'date'>) => Promise<void>
}) => {
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
      const eventData = cleanData({
        ...formData,
        date: format(selectedDate, 'yyyy-MM-dd'),
        createdBy: user.name,
        createdAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'calendarEvents'), eventData);
      
      // Notificar equipe
      sendNotification({
        title: `Novo Evento: ${formData.title}`,
        message: `${user.name} agendou um(a) ${formData.type} para ${format(selectedDate, 'dd/MM/yyyy')} às ${formData.time || '--:--'}`,
        type: 'SCHEDULE',
        targetRole: 'ALL',
        professionalName: user.name
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
                {dayEvents.slice(0, 2).map((ev) => (
                  <div key={ev.id} className="text-[9px] p-1 bg-green-100 text-green-800 rounded truncate font-medium">
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
                      <span className="opacity-70">{safeFormat(h.date, "dd/MM")}</span>
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
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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
              const photoData = cleanData({
                url: base64String,
                caption: 'Clique para editar legenda',
                date: new Date().toISOString(),
                uploadedBy: user.name
              });
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
      const cleanedCaption = cleanData({ caption: editCaption });
      await updateDoc(doc(db, 'gallery', id), cleanedCaption);
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
                      {(user.role === 'PRESIDENTE' || user.role === 'AUXILIAR_ADMINISTRATIVO' || user.role === 'COORDENADORA' || photo.uploadedBy === user.name) && (
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
  const [reportPeriod, setReportPeriod] = useState<'daily' | 'weekly' | 'monthly' | 'semi-annually' | 'annually'>('monthly');
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [selectedMonth, setSelectedMonth] = useState(format(new Date(), 'yyyy-MM'));
  const [selectedYear, setSelectedYear] = useState(format(new Date(), 'yyyy'));

  const unifiedEvolutions = useMemo(() => {
    const all: any[] = [
      ...evolutions.map(e => ({ ...e, id: `gen-${e.id}`, professionalRole: e.professionalRole, source: 'Geral' })),
      ...socialEvolutions.map(e => ({ ...e, id: `soc-${e.id}`, date: e.date, professionalRole: 'ASSISTENTE_SOCIAL', source: 'Social' })),
      ...psychEvolutions.map(e => ({ ...e, id: `psy-${e.id}`, date: e.date, professionalRole: 'PSICOLOGA', source: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, id: `ped-${e.id}`, date: e.date, professionalRole: 'PEDAGOGA', source: 'Pedagogia' })),
      ...physioEvolutions.map(e => ({ ...e, id: `phy-${e.id}`, date: e.date, professionalRole: 'FISIOTERAPEUTA', source: 'Fisioterapia' })),
      ...nursingEvolutions.map(e => ({ ...e, id: `nur-${e.id}`, date: e.date, professionalRole: 'ENFERMEIRA', source: 'Enfermagem' })),
    ];
    return all;
  }, [evolutions, socialEvolutions, psychEvolutions, pedagogyEvolutions, physioEvolutions, nursingEvolutions]);

  const filteredData = useMemo(() => {
    let start: Date;
    let end: Date;

    if (reportPeriod === 'daily') {
      start = parseISO(selectedDate);
      end = endOfDay(start);
    } else if (reportPeriod === 'weekly') {
      const base = parseISO(selectedDate);
      start = startOfWeek(base, { weekStartsOn: 0 });
      end = endOfWeek(base, { weekStartsOn: 0 });
    } else if (reportPeriod === 'monthly') {
      const base = parseISO(`${selectedMonth}-01`);
      start = startOfMonth(base);
      end = endOfMonth(base);
    } else if (reportPeriod === 'semi-annually') {
      const isSecondHalf = new Date().getMonth() >= 6;
      start = isSecondHalf ? parseISO(`${selectedYear}-07-01`) : parseISO(`${selectedYear}-01-01`);
      end = isSecondHalf ? endOfMonth(parseISO(`${selectedYear}-12-01`)) : endOfMonth(parseISO(`${selectedYear}-06-01`));
    } else {
      start = parseISO(`${selectedYear}-01-01`);
      end = endOfMonth(parseISO(`${selectedYear}-12-01`));
    }

    const filterFn = (dateStr: string) => {
      const d = parseISO(dateStr);
      return d >= start && d <= end;
    };

    return {
      evolutions: unifiedEvolutions.filter(ev => filterFn(ev.date)),
      pias: pias.filter(p => filterFn(p.date)),
      periodLabel: reportPeriod === 'daily' ? format(start, 'dd/MM/yyyy') : 
                   reportPeriod === 'weekly' ? `${format(start, 'dd/MM')} a ${format(end, 'dd/MM/yyyy')}` :
                   reportPeriod === 'monthly' ? format(start, 'MMMM yyyy', { locale: ptBR }) :
                   reportPeriod === 'semi-annually' ? `${start.getMonth() === 0 ? '1º' : '2º'} Semestre ${selectedYear}` :
                   selectedYear
    };
  }, [reportPeriod, selectedDate, selectedMonth, selectedYear, unifiedEvolutions, pias]);

  const getReportData = () => {
    const { evolutions: periodEvolutions, pias: periodPIAs } = filteredData;
    const roles = [...new Set(periodEvolutions.map(e => e.professionalRole))];
    const columns = ['Categoria', 'Informação'];
    const data = [
      ['RESUMO DAS AÇÕES', ''],
      ['Total de Idosos Atendidos', elderly.filter(e => e.status === 'ATIVO').length.toString()],
      ['Evoluções Registradas no Período', periodEvolutions.length.toString()],
      ['Novos PIAs/Revisões', periodPIAs.length.toString()],
      ['', ''],
      ['ATENDIMENTOS POR ÁREA', ''],
      ...roles.map(role => [
        ROLE_LABELS[role as Role] || role,
        `${periodEvolutions.filter(e => e.professionalRole === role).length} atendimentos`
      ])
    ];
    return { columns, data };
  };

  const generatePDF = async () => {
    setGenerating(true);
    try {
      const { periodLabel } = filteredData;
      const { columns, data } = getReportData();

      await generateModernPDF({
        title: 'Relatório OAMI',
        subtitle: `Período: ${periodLabel} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${reportPeriod}_${safeReplace(periodLabel, /\//g, '-')}`
      });
      showToast('Relatório PDF gerado com sucesso!');
    } catch (error) {
      console.error("PDF Generation Error:", error);
      showToast('Erro ao gerar PDF', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateWord = async () => {
    setGenerating(true);
    try {
      const { periodLabel } = filteredData;
      const { columns, data } = getReportData();

      await generateModernWord({
        title: 'Relatório OAMI',
        subtitle: `Período: ${periodLabel} - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_${reportPeriod}_${safeReplace(periodLabel, /\//g, '-')}`
      });
      showToast('Relatório Word gerado com sucesso!');
    } catch (error) {
      console.error("Word Generation Error:", error);
      showToast('Erro ao gerar Word', 'error');
    } finally {
      setGenerating(false);
    }
  };

  const generateExcel = () => {
    setGenerating(true);
    try {
      const { periodLabel } = filteredData;
      const { columns, data } = getReportData();

      generateModernExcel({
        title: 'Relatório OAMI',
        columns,
        data,
        fileName: `relatorio_${reportPeriod}_${safeReplace(periodLabel, /\//g, '-')}`
      });
      showToast('Relatório Excel gerado com sucesso!');
    } catch (error) {
      console.error("Excel Generation Error:", error);
      showToast('Erro ao gerar Excel', 'error');
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Relatórios Consolidados</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm mt-1">Gere documentos de atividades e atendimentos por período.</p>
          </div>
          <div className="flex flex-wrap gap-3 w-full md:w-auto">
            <select 
              className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
              value={reportPeriod}
              onChange={(e) => setReportPeriod(e.target.value as any)}
            >
              <option value="daily">Diário</option>
              <option value="weekly">Semanal</option>
              <option value="monthly">Mensal</option>
              <option value="semi-annually">Semestral</option>
              <option value="annually">Anual</option>
            </select>

            {reportPeriod === 'daily' || reportPeriod === 'weekly' ? (
              <input 
                type="date" 
                className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
              />
            ) : reportPeriod === 'monthly' ? (
              <input 
                type="month" 
                className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
              />
            ) : (
              <select 
                className="p-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-sm text-gray-800 dark:text-white font-bold"
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
              >
                {[2024, 2025, 2026, 2027].map(y => (
                  <option key={y} value={y.toString()}>{y}</option>
                ))}
              </select>
            )}

            <div className="flex gap-2">
              <button 
                onClick={generateWord}
                disabled={generating}
                className="bg-blue-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-blue-700 transition-all flex items-center gap-2 disabled:opacity-50"
                title="Exportar Word"
              >
                <FileText size={18} /> Word
              </button>
              <button 
                onClick={generateExcel}
                disabled={generating}
                className="bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-green-700 transition-all flex items-center gap-2 disabled:opacity-50"
                title="Exportar Excel"
              >
                <TableIcon size={18} /> Excel
              </button>
              <button 
                onClick={generatePDF}
                disabled={generating}
                className="bg-red-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-red-700 transition-all flex items-center gap-2 disabled:opacity-50"
                title="Exportar PDF"
              >
                <FileDown size={18} /> PDF
              </button>
              <button 
                onClick={() => window.print()}
                className="bg-purple-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg hover:bg-purple-700 transition-all flex items-center gap-2"
                title="Imprimir (Papel Timbrado)"
              >
                <Printer size={18} /> Imprimir
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-6 bg-green-50 dark:bg-green-900/10 rounded-2xl border border-green-100 dark:border-green-900/30">
            <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center text-green-600 dark:text-green-400 mb-4">
              <Activity size={20} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">Ações Técnicas</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Resumo de todas as evoluções e atendimentos do período: <span className="font-bold text-green-600">{filteredData.periodLabel}</span>.</p>
          </div>
          <div className="p-6 bg-blue-50 dark:bg-blue-900/10 rounded-2xl border border-blue-100 dark:border-blue-900/30">
            <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 mb-4">
              <ImageIcon size={20} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">Galeria de Fotos</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">Inclusão automática das fotos registradas no período.</p>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-200 dark:border-gray-700">
            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-600 dark:text-gray-400 mb-4">
              <Search size={20} />
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white mb-1">Dados Consolidados</h4>
            <div className="text-[10px] space-y-1 text-gray-500 mt-2">
              <p>• Evoluções: {filteredData.evolutions.length}</p>
              <p>• Atendimentos: {filteredData.evolutions.length}</p>
              <p>• PIAs no período: {filteredData.pias.length}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const WorkshopsSection = ({ workshops, communityElderly, caregivers, elderly, showToast }: { 
  workshops: Workshop[], 
  communityElderly: CommunityElderly[],
  caregivers: Caregiver[],
  elderly: Elderly[],
  showToast: (msg: string, type?: 'success' | 'error') => void 
}) => {
  const [isElderlyModalOpen, setIsElderlyModalOpen] = useState(false);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  
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
    type: 'OFICINA' as 'OFICINA' | 'CAPACITACAO',
    participants: [] as string[],
    what: '',
    why: '',
    where: '',
    when: '',
    who: '',
    how: '',
    howMuch: ''
  });

  const handleAddCommunityElderly = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const communityData = cleanData({
        ...elderlyFormData,
        age: parseInt(elderlyFormData.age),
        registeredAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'communityElderly'), communityData);
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
      const caregiverData = cleanData({
        ...caregiverFormData,
        registeredAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'caregivers'), caregiverData);
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
      const workshopData = cleanData({
        ...workshopFormData,
        registeredBy: auth.currentUser?.email || 'Sistema'
      });
      
      if (editingWorkshop) {
        await updateDoc(doc(db, 'workshops', editingWorkshop.id), workshopData);
        showToast('Registro de atividade atualizado com sucesso!');
      } else {
        await addDoc(collection(db, 'workshops'), workshopData);
        showToast('Registro de atividade realizado com sucesso!');
      }
      
      setIsWorkshopModalOpen(false);
      setEditingWorkshop(null);
      setWorkshopFormData({
        title: '',
        date: '',
        description: '',
        type: 'OFICINA',
        participants: [],
        what: '',
        why: '',
        where: '',
        when: '',
        who: '',
        how: '',
        howMuch: ''
      });
    } catch (err) {
      handleFirestoreError(err, editingWorkshop ? OperationType.UPDATE : OperationType.CREATE, 'workshops');
    } finally {
      setLoading(false);
    }
  };

  const toggleCategory = (ids: string[]) => {
    const allSelected = ids.length > 0 && ids.every(id => workshopFormData.participants.includes(id));
    if (allSelected) {
      setWorkshopFormData({
        ...workshopFormData,
        participants: workshopFormData.participants.filter(id => !ids.includes(id))
      });
    } else {
      const newParticipants = Array.from(new Set([...workshopFormData.participants, ...ids]));
      setWorkshopFormData({
        ...workshopFormData,
        participants: newParticipants
      });
    }
  };

  const handleDeleteWorkshop = async (id: string) => {
    setShowConfirm({
      msg: 'Tem certeza que deseja excluir esta atividade? Esta ação não pode ser desfeita.',
      onConfirm: async () => {
        try {
          await deleteDoc(doc(db, 'workshops', id));
          showToast('Atividade excluída com sucesso!');
        } catch (err) {
          handleFirestoreError(err, OperationType.DELETE, 'workshops');
        }
        setShowConfirm(null);
      }
    });
  };

  const handleEditWorkshop = (w: Workshop) => {
    setEditingWorkshop(w);
    setWorkshopFormData({
      title: w.title,
      date: w.date,
      description: w.description || '',
      type: w.type,
      participants: w.participants || [],
      what: w.what || '',
      why: w.why || '',
      where: w.where || '',
      when: w.when || '',
      who: w.who || '',
      how: w.how || '',
      howMuch: w.howMuch || ''
    });
    setIsWorkshopModalOpen(true);
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
            Registrar Oficina/Capacitação
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {workshops.length > 0 ? workshops.map((w) => (
          <div key={w.id} className="bg-white dark:bg-gray-900 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-4">
            <div className="flex justify-between items-start">
              <div className="flex gap-2 items-center">
                <div className={cn(
                  "px-3 py-1 rounded-full text-[10px] font-bold uppercase", 
                  w.type === 'CAPACITACAO' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                )}>
                  {w.type}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400 dark:text-gray-500">{new Date(w.date).toLocaleDateString('pt-BR')}</span>
                <div className="flex items-center gap-1 border-l border-gray-100 dark:border-gray-800 ml-2 pl-2">
                  <button onClick={() => handleEditWorkshop(w)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeleteWorkshop(w.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            </div>
            <h4 className="font-bold text-gray-800 dark:text-white text-lg">{w.title}</h4>
            <div className="space-y-2">
              <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-2">
                <span className="font-bold text-green-600 dark:text-green-400">O quê:</span> {w.what || w.description}
              </p>
              {w.who && (
                <p className="text-xs text-gray-500 dark:text-gray-500 flex items-center gap-1">
                  <UserIcon size={12} /> <span className="font-semibold">Responsável:</span> {w.who}
                </p>
              )}
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-gray-50 dark:border-gray-800">
              <span className="text-xs text-gray-400 font-medium">{w.participants?.length || 0} participantes</span>
              <button 
                onClick={() => {
                  setSelectedWorkshop(w);
                  setIsDetailsModalOpen(true);
                }}
                className="text-green-600 dark:text-green-400 text-sm font-bold hover:underline"
              >
                Ver detalhes
              </button>
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
          <div className="fixed inset-0 z-[60] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl w-full max-w-2xl my-4 md:my-16"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Idoso da Comunidade</h3>
                <button 
                  onClick={() => setIsElderlyModalOpen(false)} 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2.5 rounded-2xl transition-all shadow-sm"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddCommunityElderly} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <input 
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
                        type="number"
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                        value={elderlyFormData.age}
                        onChange={e => setElderlyFormData({...elderlyFormData, age: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Nascimento</label>
                      <input 
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
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      value={elderlyFormData.address}
                      onChange={e => setElderlyFormData({...elderlyFormData, address: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                    <input 
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
          <div className="fixed inset-0 z-[60] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl w-full max-w-2xl my-4 md:my-16"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Cuidador</h3>
                <button 
                  onClick={() => setIsCaregiverModalOpen(false)} 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2.5 rounded-2xl transition-all shadow-sm"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddCaregiver} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Nome Completo</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-purple-500"
                      value={caregiverFormData.name}
                      onChange={e => setCaregiverFormData({...caregiverFormData, name: e.target.value})}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Telefone</label>
                    <input 
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

      <AnimatePresence>
        {isWorkshopModalOpen && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl w-full max-w-2xl my-4 md:my-10"
            >
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-bold text-gray-800 dark:text-white">
                  {editingWorkshop ? 'Editar' : 'Registrar'} Oficina/Capacitação
                </h3>
                <button 
                  onClick={() => {
                    setIsWorkshopModalOpen(false);
                    setEditingWorkshop(null);
                  }} 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 p-2.5 rounded-2xl transition-all shadow-sm"
                  aria-label="Fechar"
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddWorkshop} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Título do Evento</label>
                    <input 
                      type="text"
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium"
                      value={workshopFormData.title}
                      onChange={e => setWorkshopFormData({...workshopFormData, title: e.target.value})}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">Tipo</label>
                    <select 
                      className="w-full p-3 bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 font-medium"
                      value={workshopFormData.type}
                      onChange={e => setWorkshopFormData({...workshopFormData, type: e.target.value as any})}
                    >
                      <option value="OFICINA">Oficina</option>
                      <option value="CAPACITACAO">Capacitação</option>
                    </select>
                  </div>
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/50 p-6 rounded-3xl space-y-4">
                  <label className="text-xs font-bold text-gray-400 uppercase">Participantes (Idosos, Idosos da Comunidade e Cuidadores)</label>
                  <div className="max-h-64 overflow-y-auto space-y-2 pr-2">
                    <div className="flex justify-between items-center mb-1">
                      <p className="text-[10px] font-bold text-green-600 dark:text-green-400 uppercase">Idosos Residentes</p>
                      <button 
                        type="button"
                        onClick={() => toggleCategory(elderly.map(e => e.id))}
                        className="text-[9px] font-bold text-green-600 hover:underline"
                      >
                        {elderly.every(e => workshopFormData.participants.includes(e.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </button>
                    </div>
                    {elderly.map(e => (
                      <label key={e.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={workshopFormData.participants.includes(e.id)}
                          onChange={() => {
                            const newParticipants = workshopFormData.participants.includes(e.id)
                              ? workshopFormData.participants.filter(id => id !== e.id)
                              : [...workshopFormData.participants, e.id];
                            setWorkshopFormData({...workshopFormData, participants: newParticipants});
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600">{e.name}</span>
                      </label>
                    ))}

                    <div className="flex justify-between items-center mt-4 mb-1">
                      <p className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase">Idosos da Comunidade</p>
                      <button 
                        type="button"
                        onClick={() => toggleCategory(communityElderly.map(e => e.id))}
                        className="text-[9px] font-bold text-blue-600 hover:underline"
                      >
                        {communityElderly.every(e => workshopFormData.participants.includes(e.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </button>
                    </div>
                    {communityElderly.map(e => (
                      <label key={e.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={workshopFormData.participants.includes(e.id)}
                          onChange={() => {
                            const newParticipants = workshopFormData.participants.includes(e.id)
                              ? workshopFormData.participants.filter(id => id !== e.id)
                              : [...workshopFormData.participants, e.id];
                            setWorkshopFormData({...workshopFormData, participants: newParticipants});
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600">{e.name}</span>
                      </label>
                    ))}
                    
                    <div className="flex justify-between items-center mt-4 mb-1">
                      <p className="text-[10px] font-bold text-purple-600 dark:text-purple-400 uppercase">Cuidadores</p>
                      <button 
                        type="button"
                        onClick={() => toggleCategory(caregivers.map(c => c.id))}
                        className="text-[9px] font-bold text-purple-600 hover:underline"
                      >
                        {caregivers.every(c => workshopFormData.participants.includes(c.id)) ? 'Desmarcar Todos' : 'Selecionar Todos'}
                      </button>
                    </div>
                    {caregivers.map(c => (
                      <label key={c.id} className="flex items-center gap-3 p-2 hover:bg-white dark:hover:bg-gray-700 rounded-lg cursor-pointer transition-colors group">
                        <input 
                          type="checkbox"
                          className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500"
                          checked={workshopFormData.participants.includes(c.id)}
                          onChange={() => {
                            const newParticipants = workshopFormData.participants.includes(c.id)
                              ? workshopFormData.participants.filter(id => id !== c.id)
                              : [...workshopFormData.participants, c.id];
                            setWorkshopFormData({...workshopFormData, participants: newParticipants});
                          }}
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 group-hover:text-green-600">{c.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/10 p-6 rounded-3xl space-y-6">
                  <h4 className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-widest">Método 5W2H</h4>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">What (O que será feito?)</label>
                      <input 
                        type="text"
                        required
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        value={workshopFormData.what}
                        onChange={e => setWorkshopFormData({...workshopFormData, what: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Why (Por que será feito?)</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        value={workshopFormData.why}
                        onChange={e => setWorkshopFormData({...workshopFormData, why: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Where (Onde será feito?)</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        value={workshopFormData.where}
                        onChange={e => setWorkshopFormData({...workshopFormData, where: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">When (Quando / Data?)</label>
                      <input 
                        type="date"
                        required
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        value={workshopFormData.date}
                        onChange={e => setWorkshopFormData({...workshopFormData, date: e.target.value})}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">Who (Quem irá fazer / Responsável?)</label>
                      <input 
                        type="text"
                        required
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        value={workshopFormData.who}
                        onChange={e => setWorkshopFormData({...workshopFormData, who: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-400 uppercase">How Much (Quanto custará?)</label>
                      <input 
                        type="text"
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500"
                        value={workshopFormData.howMuch}
                        onChange={e => setWorkshopFormData({...workshopFormData, howMuch: e.target.value})}
                        placeholder="Ex: R$ 0,00 ou Recursos Próprios"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-400 uppercase">How (Como será feito? - Detalhamento)</label>
                    <textarea 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 min-h-[80px]"
                      value={workshopFormData.how}
                      onChange={e => setWorkshopFormData({...workshopFormData, how: e.target.value})}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      setIsWorkshopModalOpen(false);
                      setEditingWorkshop(null);
                    }}
                    className="flex-1 py-4 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-gray-700 transition-all"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-4 bg-green-600 text-white rounded-2xl font-bold shadow-lg shadow-green-200 dark:shadow-none hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : editingWorkshop ? 'Salvar Alterações' : 'Salvar Registro'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Detalhes */}
      <AnimatePresence>
        {isDetailsModalOpen && selectedWorkshop && (
          <div className="fixed inset-0 z-[60] flex justify-center items-start p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl w-full max-w-2xl my-4 md:my-16"
            >
              <div className="flex justify-between items-start mb-6">
                <div>
                  <div className={cn(
                    "px-3 py-1 rounded-full text-[10px] font-black uppercase mb-2 inline-block", 
                    selectedWorkshop.type === 'CAPACITACAO' ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400' : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400'
                  )}>
                    {selectedWorkshop.type}
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 dark:text-white">{selectedWorkshop.title}</h3>
                  <p className="text-sm text-gray-400 font-medium">{format(parseISO(selectedWorkshop.date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</p>
                </div>
                <button 
                  onClick={() => setIsDetailsModalOpen(false)} 
                  className="bg-gray-100 dark:bg-gray-800 text-gray-500 hover:text-red-500 p-2.5 rounded-2xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Participantes ({selectedWorkshop.participants?.length || 0})</p>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {selectedWorkshop.participants?.map(pid => {
                      const resident = elderly.find(e => e.id === pid);
                      const community = communityElderly.find(e => e.id === pid);
                      const caregiver = caregivers.find(c => c.id === pid);
                      const person = resident || community || caregiver;
                      if (!person) return null;
                      return (
                        <div key={pid} className="flex items-center gap-2 p-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm">
                          <div className={cn(
                            "w-2 h-2 rounded-full",
                            resident ? "bg-green-500" : community ? "bg-blue-500" : "bg-purple-500"
                          )} />
                          <span className="text-xs font-bold text-gray-700 dark:text-gray-300">{person.name}</span>
                          <span className="text-[9px] font-medium text-gray-400 ml-auto">{resident ? 'Residente' : community ? 'Idoso Comunidade' : 'Cuidador'}</span>
                        </div>
                      );
                    })}
                    {(!selectedWorkshop.participants || selectedWorkshop.participants.length === 0) && (
                      <p className="text-xs text-gray-400 text-center py-4">Nenhum participante registrado</p>
                    )}
                  </div>
                </div>

                <div className="bg-green-50 dark:bg-green-900/10 p-4 rounded-2xl space-y-3">
                  <p className="text-[10px] font-black text-green-700 dark:text-green-400 uppercase mb-2">Informações 5W2H</p>
                  <div className="space-y-2 text-xs">
                    <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-green-600">WHERE:</span> {selectedWorkshop.where}</p>
                    <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-green-600">WHO:</span> {selectedWorkshop.who}</p>
                    <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-green-600">HOW MUCH:</span> {selectedWorkshop.howMuch}</p>
                    <p className="text-gray-600 dark:text-gray-300"><span className="font-bold text-green-600">WHY:</span> {selectedWorkshop.why}</p>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Detalhamento (HOW)</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedWorkshop.how || 'Sem detalhamento disponível'}</p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal Confirmação Exclusão */}
      <AnimatePresence>
        {showConfirm && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-white dark:bg-gray-900 rounded-[2rem] p-8 shadow-2xl w-full max-w-sm text-center"
            >
              <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertTriangle size={32} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">Confirmar Exclusão</h3>
              <p className="text-gray-500 text-sm mb-8 leading-relaxed">{showConfirm.msg}</p>
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowConfirm(null)}
                  className="flex-1 py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  onClick={showConfirm.onConfirm}
                  className="flex-1 py-3 bg-red-600 text-white font-bold rounded-xl shadow-lg shadow-red-200 dark:shadow-none hover:bg-red-700 transition-all"
                >
                  Confirmar
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

const StaffManagementSection = ({ staff, onSave, showToast }: { staff: StaffMember[], onSave: (data: Omit<StaffMember, 'id'>, id?: string) => Promise<void>, showToast: (m: string, t?: 'success' | 'error') => void }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState<Omit<StaffMember, 'id'>>({
    name: '',
    role: 'CUIDADOR',
    status: 'ATIVO',
    createdAt: new Date().toISOString()
  });

  const handleEdit = (s: StaffMember) => {
    setEditingStaff(s);
    setFormData({
      name: s.name,
      role: s.role,
      status: s.status,
      createdAt: s.createdAt,
      phone: s.phone
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData, editingStaff?.id);
    setIsModalOpen(false);
    setEditingStaff(null);
    setFormData({ name: '', role: 'CUIDADOR', status: 'ATIVO', createdAt: new Date().toISOString() });
  };

  return (
    <div className="p-8 space-y-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">Gestão de <span className="text-green-600">Funcionários</span></h2>
          <p className="text-gray-500 font-medium">Controle de cuidadores, serviços gerais, cozinheiras e vigias.</p>
        </div>
        <button 
          onClick={() => { setEditingStaff(null); setFormData({ name: '', role: 'CUIDADOR', status: 'ATIVO', createdAt: new Date().toISOString() }); setIsModalOpen(true); }}
          className="bg-green-600 text-white px-6 py-3 rounded-2xl font-black text-sm shadow-xl hover:bg-green-700 transition-all flex items-center gap-2"
        >
          <Plus size={20} /> Cadastrar Funcionário
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {staff.map((s) => (
          <div key={s.id} className="bg-white dark:bg-gray-900 p-6 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm hover:shadow-md transition-all">
            <div className="flex justify-between items-start mb-4">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
                s.status === 'ATIVO' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              )}>
                {s.status}
              </div>
              <button onClick={() => handleEdit(s)} className="text-gray-400 hover:text-green-600 p-1">
                <Edit2 size={18} />
              </button>
            </div>
            <h4 className="font-bold text-gray-900 dark:text-white text-lg mb-1">{s.name}</h4>
            <div className="flex items-center gap-2 text-sm text-gray-500 mb-4">
              <Briefcase size={14} className="text-green-600" />
              <span className="font-medium uppercase tracking-tight">{safeReplace(s.role, '_', ' ') || 'CUIDADORA'}</span>
            </div>
            {s.phone && (
              <p className="text-xs text-gray-400 mb-4">Tel: {s.phone}</p>
            )}
          </div>
        ))}
        {staff.length === 0 && (
          <div className="col-span-full py-20 text-center bg-gray-50 dark:bg-gray-800/20 rounded-[2.5rem] border border-dashed border-gray-200 dark:border-gray-800">
            <Users className="mx-auto text-gray-200 dark:text-gray-800 mb-4" size={64} />
            <p className="text-gray-500 font-bold">Nenhum funcionário cadastrado no sistema.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white dark:bg-gray-900 rounded-[2.5rem] p-8 shadow-2xl w-full max-w-lg border border-gray-100 dark:border-gray-800"
            >
              <div className="flex justify-between items-center mb-8">
                <h3 className="text-2xl font-black text-gray-900 dark:text-white">{editingStaff ? 'Editar' : 'Novo'} Funcionário</h3>
                <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors text-gray-400"><X /></button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Nome Completo</label>
                    <input 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Cargo</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as StaffRole })}
                      >
                        <option value="CUIDADOR">Cuidador</option>
                        <option value="SERVICO_GERAIS">Serviço Gerais</option>
                        <option value="COZINHEIRA">Cozinheira</option>
                        <option value="VIGIA">Vigia</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Status</label>
                      <select 
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                        value={formData.status}
                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                      >
                        <option value="ATIVO">Ativo</option>
                        <option value="INATIVO">Inativo</option>
                      </select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-2">Telefone (Opcional)</label>
                    <input 
                      className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 font-bold"
                      value={formData.phone || ''}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="flex gap-4 pt-4">
                  <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 px-6 bg-gray-100 dark:bg-gray-800 text-gray-500 rounded-2xl font-black text-sm hover:bg-gray-200 transition-all">Cancelar</button>
                  <button type="submit" className="flex-1 py-4 px-6 bg-green-600 text-white rounded-2xl font-black text-sm hover:bg-green-700 shadow-xl shadow-green-600/20 transition-all">Salvar Funcionário</button>
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
      ...evolutions.map(e => ({ ...e, id: `gen-${e.id}`, professional: e.professionalRole, source: 'Geral' })),
      ...socialEvolutions.map(e => ({ ...e, id: `soc-${e.id}`, elderlyId: e.patientId, professional: 'ASSISTENTE_SOCIAL', content: e.observation, source: 'Social' })),
      ...psychEvolutions.map(e => ({ ...e, id: `psy-${e.id}`, elderlyId: e.patientId, professional: 'PSICOLOGA', content: e.observation, source: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, id: `ped-${e.id}`, elderlyId: e.patientId, professional: 'PEDAGOGA', content: e.observations, source: 'Pedagogia' })),
      ...physioEvolutions.map(e => ({ ...e, id: `phy-${e.id}`, elderlyId: e.patientId, professional: 'FISIOTERAPEUTA', content: e.evolution, source: 'Fisioterapia' })),
      ...nursingEvolutions.map(e => ({ ...e, id: `nur-${e.id}`, elderlyId: e.patientId, professional: 'ENFERMEIRA', content: e.content, source: 'Enfermagem' })),
    ];
    return all.sort((a, b) => {
      const dateA = new Date(a.date || 0).getTime();
      const dateB = new Date(b.date || 0).getTime();
      return (dateB || 0) - (dateA || 0);
    });
  }, [evolutions, socialEvolutions, psychEvolutions, pedagogyEvolutions, physioEvolutions, nursingEvolutions]);

  const generateMonitoringPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Indicador', 'Valor'];
      const data = [
        ['Total de Idosos Atendidos', (elderly || []).length.toString()],
        ['PIAs em Andamento', (pias || []).filter(p => p.status === 'EM_ANDAMENTO').length.toString()],
        ['Evoluções Totais', (unifiedEvolutions || []).length.toString()],
        ['Atendimentos de Fisioterapia', (physioEvolutions || []).length.toString()],
        ['Atendimentos de Psicologia', (psychEvolutions || []).length.toString()],
        ['Atendimentos de Pedagogia', (pedagogyEvolutions || []).length.toString()],
        ['Atendimentos de Serviço Social', (socialEvolutions || []).length.toString()],
        ['Atendimentos de Enfermagem', (nursingEvolutions || []).length.toString()]
      ];

      await generateModernPDF({
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

  const generateMonitoringWord = async () => {
    setExporting(true);
    try {
      const columns = ['Indicador', 'Valor'];
      const data = [
        ['Total de Idosos Atendidos', (elderly || []).length.toString()],
        ['PIAs em Andamento', (pias || []).filter(p => p.status === 'EM_ANDAMENTO').length.toString()],
        ['Evoluções Totais', (unifiedEvolutions || []).length.toString()],
        ['Atendimentos de Fisioterapia', (physioEvolutions || []).length.toString()],
        ['Atendimentos de Psicologia', (psychEvolutions || []).length.toString()],
        ['Atendimentos de Pedagogia', (pedagogyEvolutions || []).length.toString()],
        ['Atendimentos de Serviço Social', (socialEvolutions || []).length.toString()],
        ['Atendimentos de Enfermagem', (nursingEvolutions || []).length.toString()]
      ];

      await generateModernWord({
        title: 'Relatório de Monitoramento e Impacto',
        subtitle: `Indicadores Institucionais - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: 'relatorio_monitoramento'
      });
      showToast('Relatório Word gerado com sucesso!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório em Word', 'error');
    } finally {
      setExporting(false);
    }
  };

  const selectedElderly = (elderly || []).find(e => e.id === selectedElderlyId);
  const elderlyPia = (pias || []).find(p => p.elderlyId === selectedElderlyId);
  const elderlyEvolutions = (unifiedEvolutions || []).filter(ev => ev && ev.elderlyId === selectedElderlyId);
  const elderlyVitals = (vitalSigns || []).filter(v => v && v.patientId === selectedElderlyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  const elderlyEmotions = (psychEmotionalMonitorings || []).filter(m => m && m.patientId === selectedElderlyId).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

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
              onClick={generateMonitoringWord}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl text-sm font-bold hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-all disabled:opacity-50"
            >
              <FileText size={18} />
              Relatório Word
            </button>
            <button 
              onClick={generateMonitoringPDF}
              disabled={exporting}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold hover:bg-red-100 dark:hover:bg-red-900/40 transition-all disabled:opacity-50"
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
                { label: 'PIAs Ativos', value: (pias || []).filter(p => p.status === 'EM_ANDAMENTO').length, icon: ClipboardList, color: 'text-green-600' },
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
                 <div style={{ width: '100%', height: 300 }}>
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
                    const count = (pias || []).filter(p => p.status === status).length;
                    const percentage = (pias || []).length > 0 ? (count / (pias || []).length) * 100 : 0;
                    return (
                      <div key={status} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="font-bold text-gray-600 dark:text-gray-400">{safeReplace(status, '_', ' ') || 'ATIVO'}</span>
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
              {(selectedElderlyId ? elderlyEvolutions : unifiedEvolutions).slice(0, 20).map((ev) => (
                <div key={ev.id} className="p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 flex gap-4">
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
                          {(elderly || []).find(e => e.id === ev.elderlyId)?.name || 'Idoso não encontrado'}
                        </h4>
                        <span className="text-xs font-bold text-blue-600 uppercase">{ev.source}</span>
                      </div>
                      <span className="text-xs text-gray-400 font-bold">{safeFormat(ev.date, 'dd/MM/yyyy HH:mm')}</span>
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
              {(pias || []).map(pia => {
                if (!pia || !pia.id) return null;
                const resident = (elderly || []).find(e => e.id === pia.elderlyId);
                return (
                  <div key={pia.id} className="p-6 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800">
                    <div className="flex justify-between items-start mb-4">
                      <h4 className="font-bold text-gray-800 dark:text-white">{resident?.name || 'Idoso não encontrado'}</h4>
                      <span className={cn(
                        "px-2 py-1 rounded-lg text-[10px] font-bold uppercase",
                        pia.status === 'EM_ANDAMENTO' ? 'bg-blue-100 text-blue-600' :
                        pia.status === 'CONCLUIDO' ? 'bg-green-100 text-green-600' :
                        'bg-yellow-100 text-yellow-600'
                      )}>
                        {safeReplace(pia.status, '_', ' ') || 'ATIVO'}
                      </span>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Objetivos</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{pia.objectives || 'Nenhum objetivo definido'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-gray-400 uppercase">Ações</p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 line-clamp-2">{pia.actions || 'Nenhuma ação definida'}</p>
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
                          <span className="text-xs font-bold text-gray-400">{safeFormat(m.date, 'dd/MM/yyyy')}</span>
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
              {upcoming.map((ev) => (
                <div key={ev.id} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700">
                  <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex flex-col items-center justify-center text-green-600 dark:text-green-400">
                    <span className="text-[8px] font-bold uppercase">{safeFormat(ev.date, 'MMM')}</span>
                    <span className="text-sm font-bold leading-none">{safeFormat(ev.date, 'dd')}</span>
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

const ProfileModal = ({ user, theme, onThemeChange, onClose, onUpdate, showToast, showConfirm, showAIAssistant, onToggleAIAssistant }: { 
  user: User, 
  theme: 'light' | 'dark',
  onThemeChange: (theme: 'light' | 'dark') => void,
  onClose: () => void, 
  onUpdate: (updatedUser: User) => void,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  showConfirm: (msg: string, onConfirm: () => void) => void,
  showAIAssistant: boolean,
  onToggleAIAssistant: () => void
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
        const profileUpdate = cleanData({
          name: formData.name,
          photoUrl: formData.photoUrl,
          registrationNumber: formData.registrationNumber
        });
        await updateDoc(doc(db, 'profiles', auth.currentUser.uid), profileUpdate);
        
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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
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

          <div className="flex items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 rounded-2xl border border-blue-100 dark:border-blue-800/30">
            <div className="flex items-center gap-3">
              <Sparkles className="text-blue-500" size={20} />
              <div>
                <p className="text-sm font-bold text-gray-800 dark:text-white">Assistente Smart IA</p>
                <p className="text-[10px] text-blue-400 uppercase">Bolinha do chat flutuante</p>
              </div>
            </div>
            <button 
              type="button"
              onClick={onToggleAIAssistant}
              className={cn(
                "w-12 h-6 rounded-full transition-all relative p-1",
                showAIAssistant ? "bg-blue-600" : "bg-gray-300"
              )}
            >
              <div className={cn(
                "w-4 h-4 bg-white rounded-full transition-all",
                showAIAssistant ? "translate-x-6" : "translate-x-0"
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
                  className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase mb-2">E-mail de Acesso</label>
                <input 
                  type="email" 
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
      const cleanedInstData = cleanData(instData);
      await setDoc(doc(db, 'settings', 'institutional'), cleanedInstData);
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
      const roleUpdate = cleanData({ role: newRole });
      await updateDoc(doc(db, 'profiles', userId), roleUpdate);
      showToast('Cargo atualizado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${userId}`);
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
  const [activeTab, setActiveTab] = useState(() => {
    const saved = localStorage.getItem('oami-active-tab');
    return saved || 'dashboard';
  });

  useEffect(() => {
    localStorage.setItem('oami-active-tab', activeTab);
  }, [activeTab]);

  // --- Initial System Cleanup and Connection Test ---
  useEffect(() => {
    // Connection Test
    const testConnection = async () => {
      try {
        const { doc, getDocFromServer } = await import('firebase/firestore');
        await getDocFromServer(doc(db, 'settings', 'institutional'));
      } catch (error) {
        if (error instanceof Error && error.message.includes('offline')) {
          console.error("Conexão instável ou offline.");
        }
      }
    };
    testConnection();
  }, []);

  // --- Service Worker Registration for PWA & Notifications ---
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js', { scope: '/' })
        .then(reg => {
          console.log('SW Registered with scope:', reg.scope);
        })
        .catch(err => {
          console.error('SW registration failed:', err);
        });
    }
  }, []);

  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [showAIAssistant, setShowAIAssistant] = useState(() => {
    const saved = localStorage.getItem('oami-show-ai');
    return saved !== 'false';
  });
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
    localStorage.setItem('oami-active-tab', activeTab);
  }, [activeTab]);

  useEffect(() => {
    localStorage.setItem('oami-show-ai', showAIAssistant.toString());
  }, [showAIAssistant]);

  const toggleAIAssistant = () => setShowAIAssistant(prev => !prev);

  useEffect(() => {
    localStorage.setItem('oami-theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [theme]);

  useEffect(() => {
    const handleQuota = () => {
      setQuotaExceeded(true);
      showToast('Limite diário de acesso ao banco (Firebase) atingido. O sistema funcionará apenas em modo leitura parcial até o reset diário da cota.', 'error');
    };
    window.addEventListener('firestore-quota-exceeded', handleQuota);
    return () => window.removeEventListener('firestore-quota-exceeded', handleQuota);
  }, []);

  const [isAuthReady, setIsAuthReady] = useState(false);
  const [needsProfile, setNeedsProfile] = useState(false);
  const [quotaExceeded, setQuotaExceeded] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  // Real-time data states
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [elderly, setElderly] = useState<Elderly[]>([]);
  const [evolutions, setEvolutions] = useState<EvolutionRecord[]>([]);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [diaperDonations, setDiaperDonations] = useState<DiaperDonation[]>([]);
  const [diaperStock, setDiaperStock] = useState<DiaperStock | null>(null);
  const [diaperProductionLogs, setDiaperProductionLogs] = useState<DiaperProductionLog[]>([]);
  const [diaperRawProductions, setDiaperRawProductions] = useState<DiaperRawProduction[]>([]);
  const [diaperWIPProcessings, setDiaperWIPProcessings] = useState<DiaperWIPProcessing[]>([]);
  const [diaperFinalPackings, setDiaperFinalPackings] = useState<DiaperFinalPacking[]>([]);
  const [diaperProductionGoals, setDiaperProductionGoals] = useState<DiaperProductionGoal[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>([]);
  const [adminUsers, setAdminUsers] = useState<User[]>([]);
  const [pias, setPias] = useState<PIA[]>([]);
  const [allPhotos, setAllPhotos] = useState<GalleryItem[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [communityElderly, setCommunityElderly] = useState<CommunityElderly[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [familyEngagements, setFamilyEngagements] = useState<FamilyEngagement[]>([]);
  const [institutionalInfo, setInstitutionalInfo] = useState<InstitutionalInfo | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const onSaveCommunityElderly = async (data: any) => {
    try {
      const communityData = cleanData({
        ...data,
        registeredAt: new Date().toISOString()
      });
      await addDoc(collection(db, 'communityElderly'), communityData);
      showToast('Idoso da comunidade cadastrado com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'communityElderly');
      throw err;
    }
  };

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

        return addDoc(collection(db, 'gallery'), cleanData(galleryItem));
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

  // Nutrition states
  const [nutritionPatients, setNutritionPatients] = useState<NutritionPatient[]>([]);
  const [nutritionEvolutions, setNutritionEvolutions] = useState<NutritionEvolution[]>([]);
  const [nutritionAnthropometries, setNutritionAnthropometries] = useState<NutritionAnthropometry[]>([]);
  const [nutritionMealPlans, setNutritionMealPlans] = useState<NutritionMealPlan[]>([]);

  // Diaper States
  const [diaperBeneficiaries, setDiaperBeneficiaries] = useState<DiaperBeneficiary[]>([]);

  const nutritionPatientsList = useMemo(() => {
    return (elderly || []).map(e => {
      const p = (nutritionPatients || []).find(pp => pp.elderlyId === e.id);
      return {
        ...p,
        id: e.id,
        elderlyId: e.id,
        name: e.name,
        age: e.age,
        photoUrl: e.photoUrl || p?.photoUrl,
        phone: p?.phone || e.phone || 'Não informado',
        observations: p?.observations || '',
        createdAt: p?.createdAt || e.entryDate
      } as NutritionPatient;
    });
  }, [elderly, nutritionPatients]);

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
      
      const cleanedIAData = cleanData(dataWithMeta);
      await addDoc(collection(db, collectionName), cleanedIAData);
      showToast('Registro salvo com sucesso via Smart IA!', 'success');
    } catch (err) {
      console.error("Error saving smart command:", err);
      showToast('Erro ao salvar registro da IA.', 'error');
    }
  };

  useEffect(() => {
    // Handle redirect result if any
    getRedirectResult(auth).catch(err => {
      console.error("Redirect sign-in error:", err);
      if (err.code === 'auth/popup-blocked') {
        setLoginError("O popup de login foi bloqueado pelo seu navegador.");
      }
    });

    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const userDocRef = doc(db, 'profiles', firebaseUser.uid);
        getDoc(userDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            setUser({ id: docSnap.id, ...docSnap.data() } as User);
            setNeedsProfile(false);
            console.log("👤 Perfil do usuário carregado:", docSnap.data()?.role);
            testConnection();
          } else {
            // Bypass para a criadora/admin se o documento não existir ou falhar por cota
            if (firebaseUser.email === 'franciaraeabreucoelho@gmail.com') {
              setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Franciara Coelho',
                role: 'COORDENADORA',
                photoUrl: firebaseUser.photoURL || ''
              });
              setNeedsProfile(false);
            } else {
              setNeedsProfile(true);
            }
          }
          setIsAuthReady(true);
        }).catch(err => {
          const profilePath = `profiles/${firebaseUser.uid}`;
          if (err.message?.includes('the client is offline') || err.message?.includes('offline')) {
            console.warn(`User profile fetch delayed (${profilePath}): client is offline.`);
            showToast('Conexão instável ou offline.', 'error');
          } else {
            console.error(`Error fetching user profile (${profilePath}):`, err);
            // More detailed info for the user/developer
            if (err.code === 'permission-denied') {
              console.error("🔥 Permission Denied on Profile! Check Firestore Rules for 'profiles' collection.");
            }
          }
          
          // Se falhar por cota ou offline, mas for a admin, deixa entrar
          if (firebaseUser.email === 'franciaraeabreucoelho@gmail.com') {
            setUser({
              id: firebaseUser.uid,
              name: firebaseUser.displayName || 'Franciara Coelho',
              role: 'COORDENADORA',
              photoUrl: firebaseUser.photoURL || ''
            });
            setNeedsProfile(false);
            console.log("⭐ Admin logada (Bypass de Perfil)");
            testConnection();
          } else {
            if (err.message?.includes('Quota exceeded') || err.message?.includes('quota')) {
              showToast('Limite diário de acesso atingido (Quota). Tente novamente amanhã.', 'error');
            }
            setNeedsProfile(true);
          }
          setIsAuthReady(true);
        });
      } else {
        setUser(null);
        setNeedsProfile(false);
        setIsAuthReady(true);
      }
    });

    const handleGlobalErrorToast = (e: any) => {
      if (e.detail?.message) {
        showToast(e.detail.message, 'error');
      }
    };

    window.addEventListener('firestore-error-toast', handleGlobalErrorToast);
    return () => {
      unsubscribe();
      window.removeEventListener('firestore-error-toast', handleGlobalErrorToast);
    };
  }, []);

  useEffect(() => {
    // Listeners for cleanup
    let unsubElderly = () => {};
    let unsubStaff = () => {};
    let unsubDonors = () => {};
    let unsubDiaperDonations = () => {};
    let unsubDiaperBeneficiaries = () => {};
    let unsubProductionLogs = () => {};
    let unsubVolunteers = () => {};
    let unsubRawProd = () => {};
    let unsubWIP = () => {};
    let unsubGoals = () => {};
    let unsubCommunityElderly = () => {};
    let unsubCaregivers = () => {};
    let unsubEvolutions = () => {};
    let unsubEvents = () => {};
    let unsubStock = () => {};
    let unsubFinal = () => {};
    let unsubFinancial = () => {};
    let unsubUsers = () => {};
    let unsubPias = () => {};
    let unsubGallery = () => {};
    let unsubWorkshops = () => {};
    let unsubFamilyEngagements = () => {};
    let unsubProfessionals = () => {};
    let unsubPhysioPatients = () => {};
    let unsubPhysioAssessments = () => {};
    let unsubPhysioEvolutions = () => {};
    let unsubPhysioExercises = () => {};
    let unsubPhysioAppointments = () => {};
    let unsubNursingPatients = () => {};
    let unsubMedications = () => {};
    let unsubMedicationAdministrations = () => {};
    let unsubVitalSigns = () => {};
    let unsubDressingRecords = () => {};
    let unsubNursingEvolutions = () => {};
    let unsubIncidentRecords = () => {};
    let unsubShiftSchedules = () => {};
    let unsubAvdRecords = () => {};
    let unsubDiaperChangeRecords = () => {};
    let unsubPsychPatients = () => {};
    let unsubPsychInitialAssessments = () => {};
    let unsubPsychEvolutions = () => {};
    let unsubPsychAppointments = () => {};
    let unsubPsychEmotionalMonitorings = () => {};
    let unsubPsychFamilyBonds = () => {};
    let unsubPsychActivities = () => {};
    let unsubPsychCognitionAssessments = () => {};
    let unsubPsychInterventionPlans = () => {};
    let unsubPedagogyPatients = () => {};
    let unsubPedagogyInitialAssessments = () => {};
    let unsubPedagogyEvolutions = () => {};
    let unsubPedagogyActivities = () => {};
    let unsubPedagogyStimulationTrackings = () => {};
    let unsubPedagogySocialParticipations = () => {};
    let unsubPedagogyIndividualPlans = () => {};
    let unsubSocialPatients = () => {};
    let unsubSocialStudies = () => {};
    let unsubSocialEvolutions = () => {};
    let unsubSocialReferrals = () => {};
    let unsubSocialFamilyVisits = () => {};
    let unsubSocialRiskSituations = () => {};
    let unsubNutritionPatients = () => {};
    let unsubNutritionEvolutions = () => {};
    let unsubNutritionAnthropometries = () => {};
    let unsubNutritionMealPlans = () => {};

    if (!isAuthReady || !user) return;

    // Otimização de Cotas: Buscar apenas registros dos últimos 7 dias por padrão (antes era 30)
    const farPast = new Date();
    farPast.setFullYear(farPast.getFullYear() - 10);
    const farPastStr = farPast.toISOString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
    const ninetyDaysAgoStr = ninetyDaysAgo.toISOString();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString();

    // 1. Core Data (Always needed, real-time listeners)
    // --- Data Seeding for Francisco Gomes da Silva (User Request) ---
    const seedFranciscoRequest = async () => {
      if (!auth.currentUser || auth.currentUser.email !== 'franciaraeabreucoelho@gmail.com') return;
      
      try {
        const q = query(collection(db, 'elderly'), where('cpf', '==', '056811913-46'));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          const elderlyRef = await addDoc(collection(db, 'elderly'), cleanData({
            name: 'Francisco Gomes da Silva',
            fullName: 'Francisco Gomes da Silva',
            cpf: '056811913-46',
            birthDate: '1950-10-04',
            entryDate: '2020-12-17',
            status: 'ATIVO',
            lastProfession: 'Não informada'
          }));
          
          await addDoc(collection(db, 'pias'), cleanData({
            elderlyId: elderlyRef.id,
            date: '2020-12-17',
            responsible: 'Antonilson Lima Moreira',
            status: 'CONCLUIDO',
            hasBPC: true,
            hasPension: true,
            hasLoans: false,
            hasProperty: false,
            familyInvolvement: 'BAIXO',
            familyObservations: 'Relação distanciada. Não possui filhos.',
            healthStatus: 'Pessoa com deficiência física e visual. Sem resistência alimentar.',
            mobilityStatus: 'Deficiência física e visual',
            objectives: 'Acompanhamento Social',
            actions: 'Recebimento institucional e início de acompanhamento social.',
            observations: 'Religião: Católica. Naturalidade: São Luís - MA. Não alfabetizado. Cor: Pardo. Estado Civil: Viúvo. Registro: 000059565296-4/MA.'
          }));
          
          console.log("Dados do Sr. Francisco Gomes da Silva semeados com sucesso!");
        }
      } catch (error) {
        console.error("Erro ao semear dados:", error);
      }
    };
    seedFranciscoRequest();

    // Replaced fetchStaticData with real-time listeners
    unsubElderly = onSnapshot(query(collection(db, 'elderly'), orderBy('name'), limit(300)), (snapshot) => {
      console.log(`📦 Firestore: ${snapshot.size} idosos encontrados.`);
      setElderly(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Elderly)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'elderly'));

    unsubStaff = onSnapshot(collection(db, 'users'), (snapshot) => {
      setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));

    unsubVolunteers = onSnapshot(query(collection(db, 'volunteers'), orderBy('name'), limit(100)), (snapshot) => {
      setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteer)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'volunteers'));

    // 2. Real-time Critical Listeners (Keep as onSnapshot)
    // Listen to Evolutions (Histórico de 1 ano para Dashboard)
    const qEvolutions = query(
      collection(db, 'evolutions'), 
      where('date', '>=', farPastStr),
      orderBy('date', 'desc'),
      limit(500)
    );
    unsubEvolutions = onSnapshot(qEvolutions, (snapshot) => {
      setEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvolutionRecord)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'evolutions'));

    // Calendar Events
    unsubEvents = onSnapshot(query(collection(db, 'calendarEvents'), orderBy('date'), limit(100)), (snapshot) => {
      setCalendarEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'calendarEvents'));

    // Stock for Diapers
    unsubStock = onSnapshot(doc(db, 'diaperStock', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setDiaperStock({ id: docSnap.id, ...docSnap.data() } as DiaperStock);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'diaperStock/current'));

    // Final Packings (Histórico de 1 ano para Dashboard)
    unsubFinal = onSnapshot(query(
      collection(db, 'diaperFinalPackings'), 
      where('date', '>=', farPastStr),
      orderBy('date', 'desc'),
      limit(300)
    ), (snapshot) => {
      setDiaperFinalPackings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperFinalPacking)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperFinalPackings'));

    unsubRawProd = onSnapshot(query(collection(db, 'diaperRawProductions'), orderBy('date', 'desc'), limit(100)), (snapshot) => {
      setDiaperRawProductions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperRawProduction)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperRawProductions'));

    unsubWIP = onSnapshot(query(collection(db, 'diaperWIPProcessings'), orderBy('date', 'desc'), limit(100)), (snapshot) => {
      setDiaperWIPProcessings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperWIPProcessing)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperWIPProcessings'));

    unsubGoals = onSnapshot(collection(db, 'diaperProductionGoals'), (snapshot) => {
      setDiaperProductionGoals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperProductionGoal)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperProductionGoals'));

    unsubDiaperDonations = onSnapshot(query(collection(db, 'diaperDonations'), orderBy('date', 'desc'), limit(100)), (snapshot) => {
      setDiaperDonations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperDonation)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperDonations'));

    unsubDiaperBeneficiaries = onSnapshot(query(collection(db, 'diaperBeneficiaries'), orderBy('name'), limit(100)), (snapshot) => {
      setDiaperBeneficiaries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperBeneficiary)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperBeneficiaries'));

    // Listen to Financial Records
    if (['PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
      const qFinancial = query(
        collection(db, 'financial'), 
        where('date', '>=', farPastStr),
        orderBy('date', 'desc'),
        limit(500)
      );
      unsubFinancial = onSnapshot(qFinancial, (snapshot) => {
        setFinancialRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'financial'));
    }

    // Listen to All Users (Limitado para evitar leitura massiva)
    unsubUsers = onSnapshot(query(collection(db, 'profiles'), limit(50)), (snapshot) => {
      setAdminUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'profiles');
      showToast('Erro ao carregar usuários', 'error');
    });

    // Listen to PIAs
    unsubPias = onSnapshot(query(collection(db, 'pias'), limit(500)), (snapshot) => {
      setPias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PIA)));
    }, (err) => {
      handleFirestoreError(err, OperationType.LIST, 'pias');
      showToast('Erro ao carregar PIAs', 'error');
    });

    // Listen to Gallery
    const qGallery = query(collection(db, 'gallery'), orderBy('date', 'desc'), limit(50));
    unsubGallery = onSnapshot(qGallery, (snapshot) => {
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

    // Listen for Community Elderly (real-time)
    const qCommunityElderly = query(collection(db, 'communityElderly'), orderBy('name'), limit(100));
    unsubCommunityElderly = onSnapshot(qCommunityElderly, (snapshot) => {
      setCommunityElderly(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityElderly)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'communityElderly'));

    // Listen to Workshops (1 ano para dashboard)
    const qWorkshops = query(collection(db, 'workshops'), where('date', '>=', oneYearAgoStr), orderBy('date', 'desc'), limit(150));
    unsubWorkshops = onSnapshot(qWorkshops, (snapshot) => {
      setWorkshops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'workshops'));

    // Listen for Caregivers (real-time)
    const qCaregivers = query(collection(db, 'caregivers'), orderBy('name'), limit(100));
    unsubCaregivers = onSnapshot(qCaregivers, (snapshot) => {
      setCaregivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caregiver)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'caregivers'));

    // Listen to Family Engagements
    const qFamilyEngagements = query(collection(db, 'familyEngagements'), where('date', '>=', thirtyDaysAgoStr), orderBy('date', 'desc'), limit(50));
    unsubFamilyEngagements = onSnapshot(qFamilyEngagements, (snapshot) => {
      setFamilyEngagements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyEngagement)));
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'familyEngagements'));

    // Listen to Institutional Info (Reduzido para getDoc pois muda raramente)
    getDoc(doc(db, 'settings', 'institutional')).then((docSnap) => {
      if (docSnap.exists()) {
        setInstitutionalInfo(docSnap.data() as InstitutionalInfo);
      }
    }).catch(err => handleFirestoreError(err, OperationType.GET, 'settings/institutional'));

    // 3. Tab-Specific Lazy Listeners
    if (activeTab === 'physio' || activeTab === 'professional' || activeTab === 'dashboard') {
      if (['PRESIDENTE', 'COORDENADORA', 'FISIOTERAPEUTA', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        const qPhysioPatients = query(collection(db, 'physioPatients'), orderBy('name'), limit(100));
        unsubPhysioPatients = onSnapshot(qPhysioPatients, (snapshot) => {
          setPhysioPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioPatient)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioPatients'));

        unsubPhysioAssessments = onSnapshot(query(collection(db, 'physioAssessments'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPhysioAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioAssessment)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioAssessments'));

        unsubPhysioEvolutions = onSnapshot(query(collection(db, 'physioEvolutions'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setPhysioEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioEvolution)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioEvolutions'));

        unsubPhysioExercises = onSnapshot(query(collection(db, 'physioExercises'), orderBy('title'), limit(200)), (snapshot) => {
          setPhysioExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioExercise)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioExercises'));

        unsubPhysioAppointments = onSnapshot(query(collection(db, 'physioAppointments'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPhysioAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioAppointment)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioAppointments'));
      }
    }

    // Nursing Listeners (Cargo ou Board)
    if (activeTab === 'nursing' || activeTab === 'professional' || activeTab === 'dashboard') {
      if (['PRESIDENTE', 'COORDENADORA', 'ENFERMEIRA', 'TECNICO_ENFERMAGEM', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        unsubNursingPatients = onSnapshot(query(collection(db, 'nursingPatients'), orderBy('name'), limit(100)), (snapshot) => {
          setNursingPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingPatient)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'nursingPatients'));

        unsubMedications = onSnapshot(query(collection(db, 'medications'), limit(200)), (snapshot) => {
          setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'medications'));

        unsubMedicationAdministrations = onSnapshot(query(collection(db, 'medicationAdministrations'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setMedicationAdministrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationAdministration)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'medicationAdministrations'));

        unsubVitalSigns = onSnapshot(query(collection(db, 'vitalSigns'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setVitalSigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitalSigns)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'vitalSigns'));

        unsubDressingRecords = onSnapshot(query(collection(db, 'dressingRecords'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setDressingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DressingRecord)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'dressingRecords'));

        unsubNursingEvolutions = onSnapshot(query(collection(db, 'nursingEvolutions'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setNursingEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingEvolution)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'nursingEvolutions'));

        unsubIncidentRecords = onSnapshot(query(collection(db, 'incidentRecords'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setIncidentRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncidentRecord)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'incidentRecords'));

        unsubShiftSchedules = onSnapshot(query(collection(db, 'shiftSchedules'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setShiftSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftSchedule)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'shiftSchedules'));

        unsubAvdRecords = onSnapshot(query(collection(db, 'avdRecords'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setAvdRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AVDRecord)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'avdRecords'));

        unsubDiaperChangeRecords = onSnapshot(query(collection(db, 'diaperChangeRecords'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setDiaperChangeRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperChangeRecord)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperChangeRecords'));
      }
    }

    // Psych Listeners (Cargo ou Board)
    if (activeTab === 'psychology' || activeTab === 'professional' || activeTab === 'dashboard') {
      if (['PRESIDENTE', 'COORDENADORA', 'PSICOLOGA', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        unsubPsychPatients = onSnapshot(query(collection(db, 'psychPatients'), orderBy('name'), limit(100)), (snapshot) => {
          setPsychPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychPatient)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychPatients'));

        unsubPsychInitialAssessments = onSnapshot(query(collection(db, 'psychInitialAssessments'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPsychInitialAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychInitialAssessment)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychInitialAssessments'));

        unsubPsychEvolutions = onSnapshot(query(collection(db, 'psychEvolutions'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setPsychEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychEvolution)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychEvolutions'));

        unsubPsychAppointments = onSnapshot(query(collection(db, 'psychAppointments'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPsychAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychAppointment)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychAppointments'));

        unsubPsychEmotionalMonitorings = onSnapshot(query(collection(db, 'psychEmotionalMonitorings'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setPsychEmotionalMonitorings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychEmotionalMonitoring)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychEmotionalMonitorings'));

        unsubPsychFamilyBonds = onSnapshot(query(collection(db, 'psychFamilyBonds'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPsychFamilyBonds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychFamilyBond)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychFamilyBonds'));

        unsubPsychActivities = onSnapshot(query(collection(db, 'psychActivities'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPsychActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychActivity)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychActivities'));

        unsubPsychCognitionAssessments = onSnapshot(query(collection(db, 'psychCognitionAssessments'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPsychCognitionAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychCognitionAssessment)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychCognitionAssessments'));

        unsubPsychInterventionPlans = onSnapshot(query(collection(db, 'psychInterventionPlans'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPsychInterventionPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychInterventionPlan)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychInterventionPlans'));
      }
    }

    // Pedagogy listeners (Cargo ou Board)
    if (activeTab === 'pedagogy' || activeTab === 'professional' || activeTab === 'dashboard') {
      if (['PRESIDENTE', 'COORDENADORA', 'PEDAGOGA', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        unsubPedagogyPatients = onSnapshot(query(collection(db, 'pedagogyPatients'), orderBy('name'), limit(100)), (snapshot) => {
          setPedagogyPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyPatient)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyPatients'));

        unsubPedagogyInitialAssessments = onSnapshot(query(collection(db, 'pedagogyInitialAssessments'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPedagogyInitialAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyInitialAssessment)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyInitialAssessments'));

        unsubPedagogyEvolutions = onSnapshot(query(collection(db, 'pedagogyEvolutions'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setPedagogyEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyEvolution)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyEvolutions'));

        unsubPedagogyActivities = onSnapshot(query(collection(db, 'pedagogyActivities'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPedagogyActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyActivity)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyActivities'));

        unsubPedagogyStimulationTrackings = onSnapshot(query(collection(db, 'pedagogyStimulationTrackings'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPedagogyStimulationTrackings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyStimulationTracking)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyStimulationTrackings'));

        unsubPedagogySocialParticipations = onSnapshot(query(collection(db, 'pedagogySocialParticipations'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPedagogySocialParticipations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogySocialParticipation)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogySocialParticipations'));

        unsubPedagogyIndividualPlans = onSnapshot(query(collection(db, 'pedagogyIndividualPlans'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setPedagogyIndividualPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyIndividualPlan)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyIndividualPlans'));

        // Life Histories - raras alterações, usa getDocs
        getDocs(query(collection(db, 'pedagogyLifeHistories'), limit(100))).then((snapshot) => {
          setPedagogyLifeHistories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyLifeHistory)));
        }).catch(err => handleFirestoreError(err, OperationType.LIST, 'pedagogyLifeHistories'));
      }
    }

    // Social Work Listeners (Cargo ou Board)
    if (activeTab === 'socialWork' || activeTab === 'professional' || activeTab === 'dashboard') {
      if (['PRESIDENTE', 'COORDENADORA', 'ASSISTENTE_SOCIAL', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        unsubSocialPatients = onSnapshot(query(collection(db, 'socialPatients'), orderBy('name'), limit(100)), (snapshot) => {
          setSocialPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPatient)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialPatients'));

        unsubSocialStudies = onSnapshot(query(collection(db, 'socialStudies'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setSocialStudies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialStudy)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialStudies'));

        unsubSocialEvolutions = onSnapshot(query(collection(db, 'socialEvolutions'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setSocialEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialEvolution)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialEvolutions'));

        unsubSocialReferrals = onSnapshot(query(collection(db, 'socialReferrals'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setSocialReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialReferral)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialReferrals'));

        unsubSocialFamilyVisits = onSnapshot(query(collection(db, 'socialFamilyVisits'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setSocialFamilyVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialFamilyVisit)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialFamilyVisits'));

        unsubSocialRiskSituations = onSnapshot(query(collection(db, 'socialRiskSituations'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setSocialRiskSituations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialRiskSituation)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialRiskSituations'));
      }
    }


    // Nutrition Listeners
    if (activeTab === 'nutrition' || activeTab === 'professional' || activeTab === 'dashboard') {
      if (['PRESIDENTE', 'COORDENADORA', 'NUTRICIONISTA', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        unsubNutritionPatients = onSnapshot(query(collection(db, 'nutritionPatients'), orderBy('name'), limit(100)), (snapshot) => {
          setNutritionPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionPatient)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionPatients'));

        unsubNutritionEvolutions = onSnapshot(query(collection(db, 'nutritionEvolutions'), orderBy('date', 'desc'), limit(1000)), (snapshot) => {
          setNutritionEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionEvolution)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionEvolutions'));

        unsubNutritionAnthropometries = onSnapshot(query(collection(db, 'nutritionAnthropometries'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
          setNutritionAnthropometries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionAnthropometry)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionAnthropometries'));

        unsubNutritionMealPlans = onSnapshot(query(collection(db, 'nutritionMealPlans'), orderBy('date', 'desc'), limit(100)), (snapshot) => {
          setNutritionMealPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionMealPlan)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionMealPlans'));
      }
    }

    // Listen to Professionals
    if (user && (['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com')) {
      const qProfessionals = query(collection(db, 'professionals'), orderBy('name'), limit(100));
      unsubProfessionals = onSnapshot(qProfessionals, (snapshot) => {
        setProfessionals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'professionals'));
    }

    // Notifications Listener
    let unsubNotifications: () => void = () => {};
    if (user) {
      const qNotifications = query(
        collection(db, 'notifications'), 
        where('targetRole', 'in', ['ALL', user.role]),
        orderBy('date', 'desc'), 
        limit(50)
      );
      unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
        setNotifications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
        
        // Trigger browser notification for new items
        snapshot.docChanges().forEach((change) => {
          if (change.type === 'added' && !snapshot.metadata.hasPendingWrites) {
            const n = change.doc.data() as AppNotification;
            if (window.Notification && Notification.permission === 'granted' && !n.read) {
              // Priority for Service Worker implementation (better for mobile system trays)
              if ('serviceWorker' in navigator) {
                navigator.serviceWorker.ready.then(registration => {
                  registration.showNotification(n.title, {
                    body: n.message,
                    icon: INSTITUTION_LOGO,
                    badge: INSTITUTION_LOGO,
                    tag: n.id,
                    vibrate: [200, 100, 200],
                    renotify: true,
                    data: { url: n.link || '/' }
                  } as any);
                }).catch(() => {
                  // Fallback to basic notification if SW ready fails
                  new Notification(n.title, {
                    body: n.message,
                    icon: INSTITUTION_LOGO
                  });
                });
              } else {
                new Notification(n.title, {
                  body: n.message,
                  icon: INSTITUTION_LOGO
                });
              }
            }
          }
        });
      }, (err) => {
        // If query fails (could be missing index), fallback to simpler query
        const qSimple = query(collection(db, 'notifications'), limit(50));
        onSnapshot(qSimple, (snap) => {
          setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
        });
      });
    }

    // Request Notification Permission
    if (window.Notification && Notification.permission === 'default') {
      Notification.requestPermission();
    }

    return () => {
      unsubElderly();
      unsubStaff();
      unsubEvolutions();
      unsubDonors();
      unsubDiaperDonations();
      unsubDiaperBeneficiaries();
      unsubStock();
      unsubProductionLogs();
      unsubRawProd();
      unsubWIP();
      unsubGoals();
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
      unsubSocialPatients();
      unsubSocialStudies();
      unsubSocialEvolutions();
      unsubSocialReferrals();
      unsubSocialFamilyVisits();
      unsubSocialRiskSituations();
      unsubRawProd();
      unsubWIP();
      unsubFinal();
      unsubGoals();
      unsubNutritionPatients();
      unsubNutritionEvolutions();
      unsubNutritionAnthropometries();
      unsubNutritionMealPlans();
      unsubNotifications();
    };
  }, [isAuthReady, user?.id, user?.role, activeTab]);

  const handleGoogleLogin = async () => {
    setLoginError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Login Error:", error);
      if (error.code === 'auth/popup-blocked') {
        const msg = "O popup de login foi bloqueado pelo seu navegador. Por favor, permita popups para este site ou utilize um navegador que permita janelas auxiliares.";
        setLoginError(msg);
        showToast(msg, 'error');
      } else if (error.code === 'auth/cancelled-popup-request') {
        // Ignorar se o usuário apenas fechou o popup
      } else {
        setLoginError("Erro ao autenticar com Google. Tente novamente.");
        showToast("Erro ao autenticar com Google", 'error');
      }
    }
  };

  const handleGoogleRedirectLogin = async () => {
    setLoginError(null);
    try {
      await signInWithRedirect(auth, googleProvider);
    } catch (error: any) {
      console.error("Google Redirect Error:", error);
      setLoginError("Erro ao redirecionar para login. No AI Studio Build, prefira usar popups.");
      showToast("Erro ao redirecionar para login", 'error');
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
      await setDoc(doc(db, 'profiles', auth.currentUser.uid), {
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
      const cleanedData = cleanData(data);
      await updateDoc(doc(db, 'profiles', user.id), cleanedData);
      setUser({ ...user, ...data });
      showToast('Perfil atualizado com sucesso!');
    } catch (err) {
      console.error("Error updating profile:", err);
      showToast('Erro ao atualizar perfil', 'error');
    }
  };

  const sendNotification = async (notification: Omit<AppNotification, 'id' | 'read' | 'date'>) => {
    try {
      const newNotification = {
        ...notification,
        date: new Date().toISOString(),
        read: false
      };
      await addDoc(collection(db, 'notifications'), newNotification);
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const handleSavePhysioPatient = async (data: Omit<PhysioPatient, 'id'>, id?: string) => {
    try {
      const elderlyId = id;
      if (!elderlyId) return;

      const existing = physioPatients.find(p => p.elderlyId === elderlyId || p.id === elderlyId);
      const cleanedData = cleanData(data);
      if (existing) {
        await updateDoc(doc(db, 'physioPatients', existing.id), { ...cleanedData, elderlyId });
      } else {
        await addDoc(collection(db, 'physioPatients'), { ...cleanedData, elderlyId });
      }

      // Sync shared fields to central Elderly record
      await updateSharedElderlyData(elderlyId, {
        diagnoses: data.diagnosis,
        phone: data.phone,
        physicalLimitations: data.observations
      });

      showToast('Dados de fisioterapia salvos e compartilhados');
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

  const handleSavePhysioAssessment = async (data: Omit<PhysioAssessment, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'physioAssessments', id), cleanedData);
        showToast('Avaliação atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'physioAssessments'), cleanedData);
        showToast('Avaliação salva com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'physioAssessments');
      showToast('Erro ao salvar avaliação', 'error');
    }
  };

  const handleSavePhysioEvolution = async (data: Omit<PhysioEvolution, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'physioEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'physioEvolutions'), cleanedData);
        showToast('Evolução registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'physioEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSavePhysioExercise = async (data: Omit<PhysioExercise, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'physioExercises', id), cleanedData);
        showToast('Exercício atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'physioExercises'), cleanedData);
        showToast('Exercício salva com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'physioExercises');
      showToast('Erro ao salvar exercício', 'error');
    }
  };

  const handleSavePhysioAppointment = async (data: Omit<PhysioAppointment, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'physioAppointments', id), cleanedData);
        showToast('Agendamento atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'physioAppointments'), cleanedData);
        
        // Notificar equipe
        sendNotification({
          title: 'Novo Agendamento de Fisioterapia',
          message: `Uma nova sessão foi agendada para ${format(parseISO(data.date), 'dd/MM/yyyy')} às ${data.time}`,
          type: 'SCHEDULE',
          targetRole: 'FISIOTERAPEUTA',
          professionalName: user.name
        });

        showToast('Agendamento realizado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'physioAppointments');
      showToast('Erro ao realizar agendamento', 'error');
    }
  };

  const updateSharedElderlyData = async (elderlyId: string, data: Partial<Elderly>) => {
    if (!elderlyId) return;
    try {
      const elderlyRef = doc(db, 'elderly', elderlyId);
      const cleanedSyncData = cleanData(data);
      if (Object.keys(cleanedSyncData).length > 0) {
        await updateDoc(elderlyRef, {
          ...cleanedSyncData,
          updatedAt: new Date().toISOString()
        });
      }
    } catch (err) {
      console.error("Error syncing elderly data:", err);
    }
  };

  // Nursing Handlers
  const handleSaveNursingPatient = async (data: Omit<NursingPatient, 'id'>, id?: string) => {
    try {
      const elderlyId = id;
      if (!elderlyId) return;

      const existing = nursingPatients.find(p => p.elderlyId === elderlyId || p.id === elderlyId);
      const cleanedData = cleanData(data);
      
      // Update Nursing specific collection
      if (existing) {
        await updateDoc(doc(db, 'nursingPatients', existing.id), { ...cleanedData, elderlyId });
      } else {
        await addDoc(collection(db, 'nursingPatients'), { ...cleanedData, elderlyId });
      }

      // Sync shared fields to central Elderly record
      await updateSharedElderlyData(elderlyId, {
        diseases: data.comorbidities,
        allergies: data.allergies,
        diagnoses: data.diagnosis,
        phone: data.familyContact,
        physicalLimitations: data.careDegree + (data.isBedridden ? ' - Acamado' : '')
      });

      showToast('Dados de enfermagem salvos e compartilhados');
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'nursingPatients');
      showToast('Erro ao salvar paciente', 'error');
    }
  };

  const handleDeleteNursingPatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'nursingPatients', id));
      showToast('Paciente removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `nursingPatients/${id}`);
      showToast('Erro ao remover paciente', 'error');
    }
  };

  const handleDeletePsychPatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'psychPatients', id));
      showToast('Paciente removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `psychPatients/${id}`);
      showToast('Erro ao remover paciente', 'error');
    }
  };

  const handleDeletePedagogyPatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'pedagogyPatients', id));
      showToast('Paciente removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `pedagogyPatients/${id}`);
      showToast('Erro ao remover paciente', 'error');
    }
  };

  const handleDeleteSocialPatient = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'socialPatients', id));
      showToast('Paciente removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `socialPatients/${id}`);
      showToast('Erro ao remover paciente', 'error');
    }
  };

  const handleSaveMedication = async (data: Omit<Medication, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'medications', id), cleanedData);
        showToast('Medicação atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'medications'), cleanedData);
        showToast('Medicação cadastrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'medications');
      showToast('Erro ao salvar medicação', 'error');
    }
  };

  const handleSaveMedicationAdministration = async (data: Omit<MedicationAdministration, 'id'>) => {
    try {
      const cleanedData = cleanData(data);
      await addDoc(collection(db, 'medicationAdministrations'), cleanedData);
      showToast('Administração registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, 'medicationAdministrations');
      showToast('Erro ao registrar administração', 'error');
    }
  };

  const handleSaveVitalSigns = async (data: Omit<VitalSigns, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'vitalSigns', id), cleanedData);
        showToast('Sinais vitais atualizados com sucesso');
      } else {
        await addDoc(collection(db, 'vitalSigns'), cleanedData);
        showToast('Sinais vitais registrados com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'vitalSigns');
      showToast('Erro ao registrar sinais vitais', 'error');
    }
  };

  const handleSaveDressingRecord = async (data: Omit<DressingRecord, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'dressingRecords', id), cleanedData);
        showToast('Curativo atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'dressingRecords'), cleanedData);
        showToast('Curativo registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'dressingRecords');
      showToast('Erro ao registrar curativo', 'error');
    }
  };

  const handleSaveNursingEvolution = async (data: Omit<NursingEvolution, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'nursingEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'nursingEvolutions'), cleanedData);
        showToast('Evolução registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'nursingEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSaveIncidentRecord = async (data: Omit<IncidentRecord, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'incidentRecords', id), cleanedData);
        showToast('Intercorrência atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'incidentRecords'), cleanedData);
        
        // Notificar equipe (Coordenação, Presidente e Enfermagem)
        const targetRoles: Role[] = ['COORDENADORA', 'PRESIDENTE', 'ENFERMEIRA'];
        targetRoles.forEach(role => {
          sendNotification({
            title: 'ALERTA: Nova Intercorrência',
            message: `Uma intercorrência foi registrada para o idoso(a) ${elderly.find(e => e.id === data.patientId)?.name}. Tipo: ${data.type}`,
            type: 'URGENTE',
            targetRole: role,
            professionalName: user.name
          });
        });

        showToast('Intercorrência registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'incidentRecords');
      showToast('Erro ao registrar intercorrência', 'error');
    }
  };

  const handleSaveShiftSchedule = async (data: Omit<ShiftSchedule, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'shiftSchedules', id), cleanedData);
        showToast('Plantão atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'shiftSchedules'), cleanedData);

        // Notificar equipe
        sendNotification({
          title: 'Novo Plantão Cadastrado',
          message: `Um novo plantão foi cadastrado para o dia ${format(parseISO(data.date), 'dd/MM/yyyy')}`,
          type: 'SCHEDULE',
          targetRole: 'ALL',
          professionalName: user.name
        });

        showToast('Plantão salvo com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'shiftSchedules');
      showToast('Erro ao salvar plantão', 'error');
    }
  };

  const handleSaveStaffMember = async (data: Omit<StaffMember, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'users', id), cleanedData);
        showToast('Funcionário atualizado!', 'success');
      } else {
        await addDoc(collection(db, 'users'), cleanedData);
        showToast('Funcionário registrado!', 'success');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'users');
      showToast('Erro ao salvar funcionário', 'error');
    }
  };

  const handleSaveAVDRecord = async (data: Omit<AVDRecord, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'avdRecords', id), cleanedData);
        showToast('AVD atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'avdRecords'), cleanedData);
        showToast('AVD registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'avdRecords');
      showToast('Erro ao registrar AVD', 'error');
    }
  };

  const handleSaveDiaperChangeRecord = async (data: Omit<DiaperChangeRecord, 'id'>, id?: string) => {
    try {
      const cleanedData = cleanData(data);
      if (id) {
        await updateDoc(doc(db, 'diaperChangeRecords', id), cleanedData);
        showToast('Troca de fralda atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'diaperChangeRecords'), cleanedData);
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

  const handleDeletePsychRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      showToast('Erro ao remover registro', 'error');
    }
  };

  const handleDeletePhysioRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      showToast('Erro ao remover registro', 'error');
    }
  };

  const handleDeletePedagogyRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      showToast('Erro ao remover registro', 'error');
    }
  };

  const handleDeleteSocialRecord = async (collectionName: string, id: string) => {
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
      const elderlyId = id;
      if (!elderlyId) return;

      const existing = psychPatients.find(p => p.elderlyId === elderlyId || p.id === elderlyId);
      const cleanedData = cleanData(data);

      if (existing) {
        await updateDoc(doc(db, 'psychPatients', existing.id), { ...cleanedData, elderlyId });
      } else {
        await addDoc(collection(db, 'psychPatients'), { ...cleanedData, elderlyId });
      }

      // Sync shared fields to central Elderly record
      await updateSharedElderlyData(elderlyId, {
        phone: data.familyContact,
        observations: data.lifeHistory
      });

      showToast('Dados de psicologia salvos e compartilhados');
    } catch (err) {
      handleFirestoreError(err, id ? OperationType.UPDATE : OperationType.CREATE, 'psychPatients');
      showToast('Erro ao salvar paciente', 'error');
    }
  };

  const handleSavePsychInitialAssessment = async (data: Omit<PsychInitialAssessment, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychInitialAssessments', id), cleanedData);
        showToast('Avaliação inicial atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'psychInitialAssessments'), cleanedData);
        showToast('Avaliação inicial salva com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychInitialAssessments');
      showToast('Erro ao salvar avaliação inicial', 'error');
    }
  };

  const handleSavePsychEvolution = async (data: Omit<PsychEvolution, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'psychEvolutions'), cleanedData);
        showToast('Evolução registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSavePsychAppointment = async (data: Omit<PsychAppointment, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychAppointments', id), cleanedData);
        showToast('Atendimento atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'psychAppointments'), cleanedData);

        // Notificar equipe
        sendNotification({
          title: 'Novo Agendamento de Psicologia',
          message: `Uma nova sessão foi agendada para ${format(parseISO(data.date), 'dd/MM/yyyy')} às ${data.time}`,
          type: 'SCHEDULE',
          targetRole: 'PSICOLOGA',
          professionalName: user.name
        });

        showToast('Atendimento registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychAppointments');
      showToast('Erro ao registrar atendimento', 'error');
    }
  };

  const handleSavePsychEmotionalMonitoring = async (data: Omit<PsychEmotionalMonitoring, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychEmotionalMonitorings', id), cleanedData);
        showToast('Monitoramento emocional atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'psychEmotionalMonitorings'), cleanedData);
        showToast('Monitoramento emocional registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychEmotionalMonitorings');
      showToast('Erro ao registrar monitoramento emocional', 'error');
    }
  };

  const handleSavePsychFamilyBond = async (data: Omit<PsychFamilyBond, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychFamilyBonds', id), cleanedData);
        showToast('Vínculo familiar atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'psychFamilyBonds'), cleanedData);
        showToast('Vínculo familiar registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychFamilyBonds');
      showToast('Erro ao registrar vínculo familiar', 'error');
    }
  };

  const handleSavePsychActivity = async (data: Omit<PsychActivity, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychActivities', id), cleanedData);
        showToast('Atividade atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'psychActivities'), cleanedData);
        showToast('Atividade registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychActivities');
      showToast('Erro ao registrar atividade', 'error');
    }
  };

  const handleSavePsychCognitionAssessment = async (data: Omit<PsychCognitionAssessment, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychCognitionAssessments', id), cleanedData);
        showToast('Avaliação cognitiva atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'psychCognitionAssessments'), cleanedData);
        showToast('Avaliação cognitiva registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychCognitionAssessments');
      showToast('Erro ao registrar avaliação cognitiva', 'error');
    }
  };

  const handleSavePsychInterventionPlan = async (data: Omit<PsychInterventionPlan, 'id'> & { id?: string }) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'psychInterventionPlans', id), cleanedData);
        showToast('Plano de intervenção atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'psychInterventionPlans'), cleanedData);
        showToast('Plano de intervenção registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'psychInterventionPlans');
      showToast('Erro ao registrar plano de intervenção', 'error');
    }
  };

  // Pedagogy Handlers
  const handleSavePedagogyPatient = async (data: Partial<PedagogyPatient>) => {
    try {
      const id = data.id;
      if (!id) return;
      const existing = pedagogyPatients.find(p => p.elderlyId === id || p.id === id);
      
      const { id: _, ...rest } = data;
      const cleanedData = cleanData(rest);

      if (existing) {
        await updateDoc(doc(db, 'pedagogyPatients', existing.id), { ...cleanedData, elderlyId: id });
      } else {
        await addDoc(collection(db, 'pedagogyPatients'), { ...cleanedData, elderlyId: id, createdAt: new Date().toISOString() });
      }

      // Sync shared fields to central Elderly record
      await updateSharedElderlyData(id, {
        schooling: data.schooling,
        literacyLevel: data.literacyLevel,
        lastProfession: data.previousProfession,
        physicalLimitations: data.cognitiveLimitations
      });

      showToast('Dados pedagógicos salvos e compartilhados');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyPatients');
      showToast('Erro ao salvar dados pedagógicos', 'error');
    }
  };

  const handleSavePedagogyAssessment = async (data: Partial<PedagogyInitialAssessment>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogyInitialAssessments', id), cleanedData);
        showToast('Avaliação inicial atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogyInitialAssessments'), cleanedData);
        showToast('Avaliação inicial salva com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyInitialAssessments');
      showToast('Erro ao salvar avaliação inicial', 'error');
    }
  };

  const handleSavePedagogyEvolution = async (data: Partial<PedagogyEvolution>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogyEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogyEvolutions'), cleanedData);
        showToast('Evolução registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyEvolutions');
      showToast('Erro ao registrar evolução', 'error');
    }
  };

  const handleSavePedagogyActivity = async (data: Partial<PedagogyActivity>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogyActivities', id), cleanedData);
        showToast('Atividade atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogyActivities'), cleanedData);
        showToast('Atividade registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyActivities');
      showToast('Erro ao registrar atividade', 'error');
    }
  };

  const handleSavePedagogyStimulation = async (data: Partial<PedagogyStimulationTracking>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogyStimulationTrackings', id), cleanedData);
        showToast('Estimulação atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogyStimulationTrackings'), cleanedData);
        showToast('Estimulação registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyStimulationTrackings');
      showToast('Erro ao registrar estimulação', 'error');
    }
  };

  const handleSavePedagogySocial = async (data: Partial<PedagogySocialParticipation>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogySocialParticipations', id), cleanedData);
        showToast('Participação social atualizada com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogySocialParticipations'), cleanedData);
        showToast('Participação social registrada com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogySocialParticipations');
      showToast('Erro ao registrar participação social', 'error');
    }
  };

  const handleSavePedagogyPlan = async (data: Partial<PedagogyIndividualPlan>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogyIndividualPlans', id), cleanedData);
        showToast('Plano pedagógico atualizado com sucesso');
      } else {
        await addDoc(collection(db, 'pedagogyIndividualPlans'), cleanedData);
        showToast('Plano pedagógico registrado com sucesso');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pedagogyIndividualPlans');
      showToast('Erro ao registrar plano pedagógico', 'error');
    }
  };

  const handleSavePedagogyLifeHistory = async (data: Partial<PedagogyLifeHistory>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pedagogyLifeHistories', id), cleanedData);
      } else {
        await addDoc(collection(db, 'pedagogyLifeHistories'), cleanedData);
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
      if (!id) return;
      const existing = socialPatients.find(p => p.elderlyId === id || p.id === id);
      
      const { id: _, ...rest } = data;
      const cleanedData = cleanData(rest);

      if (existing) {
        await updateDoc(doc(db, 'socialPatients', existing.id), { ...cleanedData, elderlyId: id });
      } else {
        await addDoc(collection(db, 'socialPatients'), { ...cleanedData, elderlyId: id, createdAt: new Date().toISOString() });
      }

      // Sync shared fields to central Elderly record
      await updateSharedElderlyData(id, {
        birthDate: data.birthDate,
        schooling: data.schooling,
        lastProfession: data.previousProfession
      });

      showToast('Perfil social salvo e compartilhado');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialPatients');
      showToast('Erro ao salvar perfil social', 'error');
    }
  };

  const handleSaveSocialPIA = async (data: Partial<PIA>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'pias', id), { ...cleanedData, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'pias'), { ...cleanedData, updatedAt: new Date().toISOString() });
      }
      showToast('PIA salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'pias');
      showToast('Erro ao salvar PIA', 'error');
    }
  };

  const handleSaveSocialFamilyTie = async (data: Partial<SocialFamilyTie>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialFamilyTies', id), { ...cleanedData, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'socialFamilyTies'), { ...cleanedData, updatedAt: new Date().toISOString() });
      }
      showToast('Vínculo familiar salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialFamilyTies');
      showToast('Erro ao salvar vínculo familiar', 'error');
    }
  };

  const handleSaveSocialDocumentation = async (data: Partial<SocialDocumentation>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialDocumentations', id), { ...cleanedData, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'socialDocumentations'), { ...cleanedData, updatedAt: new Date().toISOString() });
      }
      showToast('Documentação salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialDocumentations');
      showToast('Erro ao salvar documentação', 'error');
    }
  };

  const handleSaveSocialLegalSituation = async (data: Partial<SocialLegalSituation>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialLegalSituations', id), { ...cleanedData, updatedAt: new Date().toISOString() });
      } else {
        await addDoc(collection(db, 'socialLegalSituations'), { ...cleanedData, updatedAt: new Date().toISOString() });
      }
      showToast('Situação jurídica salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialLegalSituations');
      showToast('Erro ao salvar situação jurídica', 'error');
    }
  };

  const handleSaveSocialStudy = async (data: Partial<SocialStudy>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialStudies', id), cleanedData);
      } else {
        await addDoc(collection(db, 'socialStudies'), cleanedData);
      }
      showToast('Estudo social salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialStudies');
      showToast('Erro ao salvar estudo social', 'error');
    }
  };

  const handleSaveSocialEvolution = async (data: Partial<SocialEvolution>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialEvolutions', id), cleanedData);
      } else {
        await addDoc(collection(db, 'socialEvolutions'), cleanedData);
      }
      showToast('Evolução social salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialEvolutions');
      showToast('Erro ao salvar evolução social', 'error');
    }
  };

  const handleSaveSocialReferral = async (data: Partial<SocialReferral>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialReferrals', id), cleanedData);
      } else {
        await addDoc(collection(db, 'socialReferrals'), cleanedData);
      }
      showToast('Encaminhamento salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialReferrals');
      showToast('Erro ao salvar encaminhamento', 'error');
    }
  };

  const handleSaveSocialFamilyVisit = async (data: Partial<SocialFamilyVisit>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialFamilyVisits', id), cleanedData);
      } else {
        await addDoc(collection(db, 'socialFamilyVisits'), cleanedData);
      }
      showToast('Visita familiar salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialFamilyVisits');
      showToast('Erro ao salvar visita familiar', 'error');
    }
  };

  const handleSaveSocialRiskSituation = async (data: Partial<SocialRiskSituation>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'socialRiskSituations', id), cleanedData);
      } else {
        await addDoc(collection(db, 'socialRiskSituations'), cleanedData);
      }
      showToast('Situação de risco salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialRiskSituations');
      showToast('Erro ao salvar situação de risco', 'error');
    }
  };

  const handleSaveDiaperDonation = async (data: Partial<DiaperDonation>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'diaperDonations', id), cleanedData);
      } else {
        await addDoc(collection(db, 'diaperDonations'), cleanedData);
      }
      showToast('Doação registrada com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'diaperDonations');
      showToast('Erro ao registrar doação', 'error');
    }
  };

  const handleSaveDiaperBeneficiary = async (data: Partial<DiaperBeneficiary>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'diaperBeneficiaries', id), cleanedData);
      } else {
        await addDoc(collection(db, 'diaperBeneficiaries'), cleanedData);
      }
      showToast('Beneficiário salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'diaperBeneficiaries');
      showToast('Erro ao salvar beneficiário', 'error');
    }
  };

  const handleSaveDiaperRawProduction = async (data: Partial<DiaperRawProduction>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'diaperRawProductions', id), cleanedData);
      } else {
        await addDoc(collection(db, 'diaperRawProductions'), cleanedData);
      }
      showToast('Produção bruta salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'diaperRawProductions');
      showToast('Erro ao salvar produção bruta', 'error');
    }
  };

  const handleSaveDiaperWIPProcessing = async (data: Partial<DiaperWIPProcessing>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'diaperWIPProcessings', id), cleanedData);
      } else {
        await addDoc(collection(db, 'diaperWIPProcessings'), cleanedData);
      }
      showToast('Processamento WIP salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'diaperWIPProcessings');
      showToast('Erro ao salvar processamento WIP', 'error');
    }
  };

  const handleSaveDiaperFinalPacking = async (data: Partial<DiaperFinalPacking>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'diaperFinalPackings', id), cleanedData);
      } else {
        await addDoc(collection(db, 'diaperFinalPackings'), cleanedData);
      }
      showToast('Embalamento final salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'diaperFinalPackings');
      showToast('Erro ao salvar embalamento final', 'error');
    }
  };

  const handleSaveDiaperProductionGoal = async (data: Partial<DiaperProductionGoal>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'diaperProductionGoals', id), cleanedData);
      } else {
        await addDoc(collection(db, 'diaperProductionGoals'), cleanedData);
      }
      showToast('Meta de produção salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'diaperProductionGoals');
      showToast('Erro ao salvar meta de produção', 'error');
    }
  };

  const handleDeleteDiaperRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro excluído com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionName);
      showToast('Erro ao excluir registro', 'error');
    }
  };

  // Nutrition Handlers
  const handleSaveNutritionPatient = async (data: Partial<NutritionPatient>) => {
    try {
      const id = data.id;
      if (!id) return;
      const existing = nutritionPatients.find(p => p.elderlyId === id || p.id === id);
      const { id: _, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (existing) {
        await updateDoc(doc(db, 'nutritionPatients', existing.id), { ...cleanedData, elderlyId: id });
        showToast('Perfil nutricional atualizado');
      } else {
        await addDoc(collection(db, 'nutritionPatients'), { ...cleanedData, elderlyId: id, createdAt: new Date().toISOString() });
        showToast('Perfil nutricional cadastrado');
      }

      // Sync shared fields to central Elderly record
      await updateSharedElderlyData(id, {
        allergies: data.allergies?.join(', ')
      });
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'nutritionPatients');
      showToast('Erro ao salvar perfil nutricional', 'error');
    }
  };

  const handleSaveNutritionEvolution = async (data: Partial<NutritionEvolution>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'nutritionEvolutions', id), cleanedData);
        showToast('Evolução nutricional atualizada');
      } else {
        await addDoc(collection(db, 'nutritionEvolutions'), cleanedData);
        showToast('Evolução nutricional registrada');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'nutritionEvolutions');
      showToast('Erro ao salvar evolução', 'error');
    }
  };

  const handleSaveNutritionAnthropometry = async (data: Partial<NutritionAnthropometry>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'nutritionAnthropometries', id), cleanedData);
        showToast('Antropometria atualizada');
      } else {
        await addDoc(collection(db, 'nutritionAnthropometries'), cleanedData);
        showToast('Antropometria registrada');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'nutritionAnthropometries');
      showToast('Erro ao salvar antropometria', 'error');
    }
  };

  const handleSaveNutritionMealPlan = async (data: Partial<NutritionMealPlan>) => {
    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      if (id) {
        await updateDoc(doc(db, 'nutritionMealPlans', id), cleanedData);
        showToast('Plano alimentar atualizado');
      } else {
        await addDoc(collection(db, 'nutritionMealPlans'), cleanedData);
        showToast('Plano alimentar salvo');
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'nutritionMealPlans');
      showToast('Erro ao salvar plano alimentar', 'error');
    }
  };

  const handleDeleteNutritionRecord = async (collectionName: string, id: string) => {
    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro removido');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, collectionName);
      showToast('Erro ao remover registro', 'error');
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
        error={loginError}
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
          physioEvolutions={physioEvolutions}
          nursingEvolutions={nursingEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          vitalSigns={vitalSigns}
          workshops={workshops}
          socialFamilyVisits={socialFamilyVisits}
          pias={pias}
          onNavigate={(tab) => setActiveTab(tab)}
          diaperRawProductions={diaperRawProductions}
          diaperFinalPackings={diaperFinalPackings}
        />
      );
      case 'adminAssistant': return (
        <AdminAssistantSection 
          user={user}
          elderly={elderly}
          financialRecords={financialRecords}
          events={calendarEvents}
          volunteers={volunteers}
          caregivers={caregivers}
          adminUsers={adminUsers}
          onNavigate={(tab) => setActiveTab(tab)}
          showToast={showToast}
        />
      );
      case 'elderly': return <ElderlySection elderly={elderly} evolutions={evolutions} pias={pias} showToast={showToast} />;
      case 'physio': return (
        <PhysioSection 
          user={user}
          elderly={elderly}
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
          onDeleteRecord={handleDeletePhysioRecord}
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
          elderly={elderly}
          patients={nursingPatientsList}
          medications={medications}
          administrations={medicationAdministrations}
          vitalSigns={vitalSigns}
          dressings={dressingRecords}
          evolutions={nursingEvolutions}
          incidents={incidentRecords}
          shifts={shiftSchedules}
          users={users}
          professionals={professionals}
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
          elderly={elderly}
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
          onDeleteRecord={handleDeletePsychRecord}
          onDeletePatient={handleDeletePsychPatient}
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
          elderly={elderly}
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
          onDeleteRecord={handleDeletePedagogyRecord}
          onDeletePatient={handleDeletePedagogyPatient}
          showToast={showToast}
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
          elderly={elderly}
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
          onDeleteRecord={handleDeleteSocialRecord}
          onDeletePatient={handleDeleteSocialPatient}
          showToast={showToast}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'nutrition': return (
        <NutritionSection 
          user={user}
          elderly={elderly}
          patients={nutritionPatientsList}
          evolutions={nutritionEvolutions}
          anthropometries={nutritionAnthropometries}
          mealPlans={nutritionMealPlans}
          showToast={showToast}
          onSavePatient={handleSaveNutritionPatient}
          onSaveEvolution={handleSaveNutritionEvolution}
          onSaveAnthropometry={handleSaveNutritionAnthropometry}
          onSaveMealPlan={handleSaveNutritionMealPlan}
          onDeleteRecord={handleDeleteNutritionRecord}
          onSavePhotos={savePhotosToGallery}
          onUpdateProfile={handleUpdateProfile}
          theme={theme}
          setTheme={setTheme}
          onLogout={handleLogout}
        />
      );
      case 'professionals': return (
        <ProfessionalsSection 
          professionals={professionals} 
          users={users}
          onSaveStaff={handleSaveStaffMember}
          onDeleteStaff={async (id) => {
            try {
              await deleteDoc(doc(db, 'users', id));
              showToast('Funcionário institucional excluído!', 'success');
            } catch (err) {
              showToast('Erro ao excluir funcionário', 'error');
            }
          }}
          showToast={showToast} 
          showConfirm={showConfirm} 
        />
      );
      case 'professional': return <ProfessionalArea elderly={elderly} evolutions={evolutions} user={user} showToast={showToast} />;
      case 'financial': return <FinancialSection financialRecords={financialRecords} user={user!} showToast={showToast} />;
      case 'institutional': return <InstitutionalSection institutionalInfo={institutionalInfo} />;
      case 'volunteers': return <VolunteersSection volunteers={volunteers} showToast={showToast} user={user} />;
      case 'family': return <FamilySection engagements={familyEngagements} elderly={elderly} showToast={showToast} />;
      case 'staff': return <StaffManagementSection staff={users} onSave={handleSaveStaffMember} showToast={showToast} />;
      case 'schedule': return <ScheduleSection events={calendarEvents} user={user} showConfirm={showConfirm} sendNotification={sendNotification} />;
      case 'workshops': return <WorkshopsSection workshops={workshops} communityElderly={communityElderly} caregivers={caregivers} elderly={elderly} showToast={showToast} />;
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
      case 'diaperProduction': return (
        <DiaperProductionSection 
          user={user}
          rawProductions={diaperRawProductions}
          wipProcessings={diaperWIPProcessings}
          finalPackings={diaperFinalPackings}
          donations={diaperDonations}
          beneficiaries={diaperBeneficiaries}
          goals={diaperProductionGoals}
          onSaveDonation={handleSaveDiaperDonation}
          onSaveBeneficiary={handleSaveDiaperBeneficiary}
          onSaveRaw={handleSaveDiaperRawProduction}
          onSaveWip={handleSaveDiaperWIPProcessing}
          onSaveFinal={handleSaveDiaperFinalPacking}
          onSaveGoal={handleSaveDiaperProductionGoal}
          onDeleteRecord={handleDeleteDiaperRecord}
          showToast={showToast}
        />
      );
      case 'settings': return <SettingsSection users={adminUsers} showToast={showToast} institutionalInfo={institutionalInfo} />;
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
      
      <main className="flex-1 p-4 md:p-8 overflow-y-auto w-full main-content">
        {quotaExceeded && (
          <div className="bg-red-600 text-white p-4 mb-6 rounded-2xl flex items-center justify-between gap-4 shadow-xl shadow-red-600/20 animate-in slide-in-from-top duration-500 no-print">
            <div className="flex items-center gap-3">
              <ShieldAlert className="shrink-0" />
              <div className="text-left">
                <p className="font-black text-sm">Limite de Acesso Atingido (Quota Exceeded)</p>
                <p className="text-[10px] opacity-90 font-medium">O Firebase atingiu o limite gratuito de leitura para hoje. Algumas informações podem não carregar até a meia-noite.</p>
              </div>
            </div>
            <button onClick={() => setQuotaExceeded(false)} className="bg-white/20 hover:bg-white/30 p-2 rounded-xl transition-colors">
              <X size={16} />
            </button>
          </div>
        )}
        <OfficialHeader />
        <header className="flex justify-between items-center mb-8 md:mb-12 no-print">
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
                 activeTab === 'diaperProduction' ? 'Produção de Fraldas (SGPF)' : 
                 activeTab === 'adminAssistant' ? 'Painel Auxiliar Administrativo' :
                 activeTab === 'settings' ? 'Configurações' : 
                 activeTab === 'gallery' ? 'Galeria Multidisciplinar' : 'Institucional'}
              </h1>
              <p className="hidden md:block text-gray-500 dark:text-gray-400 mt-1">Bem-vindo ao sistema OAMI, {user.name.split(' ')[0]}.</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <div className="relative">
              <button 
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className="p-3 bg-white dark:bg-gray-900 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-800 text-gray-400 dark:text-gray-500 hover:text-green-600 transition-colors relative"
              >
                <Bell size={20} />
                {notifications.filter(n => !n.read).length > 0 && (
                  <span className="absolute top-3 right-3 w-2 h-2 bg-red-500 rounded-full border-2 border-white dark:border-gray-900" />
                )}
              </button>

              <AnimatePresence>
                {isNotificationsOpen && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setIsNotificationsOpen(false)} 
                    />
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute right-0 mt-4 w-80 bg-white dark:bg-gray-900 rounded-3xl shadow-2xl border border-gray-100 dark:border-gray-800 z-50 overflow-hidden"
                    >
                      <div className="p-6 border-b border-gray-50 dark:border-gray-800 flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-gray-800 dark:text-white">Notificações</h3>
                          {window.Notification && Notification.permission !== 'granted' ? (
                            <button 
                              onClick={() => Notification.requestPermission().then(res => {
                                if (res === 'granted') showToast('Notificações ativadas!');
                              })}
                              className="text-[9px] font-bold text-blue-500 hover:underline"
                            >
                              Ativar no celular
                            </button>
                          ) : (
                            <button 
                              onClick={() => {
                                if ('serviceWorker' in navigator) {
                                  navigator.serviceWorker.ready.then(registration => {
                                    registration.showNotification('Teste OAMI', {
                                      body: 'Se você está vendo isso, as notificações no celular estão funcionando!',
                                      icon: INSTITUTION_LOGO,
                                      vibrate: [200, 100, 200]
                                    } as any);
                                  });
                                }
                              }}
                              className="text-[9px] font-bold text-gray-400 hover:text-green-500 transition-colors"
                            >
                              Testar notificações
                            </button>
                          )}
                        </div>
                        <span className="text-[10px] font-bold bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 px-2 py-1 rounded-full">
                          {notifications.filter(n => !n.read).length} Novas
                        </span>
                      </div>
                      <div className="max-h-96 overflow-y-auto">
                        {notifications.length > 0 ? (
                          notifications.map((n) => (
                            <div 
                              key={n.id} 
                              className={cn(
                                "p-4 border-b border-gray-50 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors cursor-pointer relative",
                                !n.read && "bg-green-50/30 dark:bg-green-900/10"
                              )}
                              onClick={() => {
                                markNotificationAsRead(n.id);
                                if (n.link) setActiveTab(n.link as any);
                                setIsNotificationsOpen(false);
                              }}
                            >
                              <div className="flex gap-3">
                                <div className={cn(
                                  "p-2 rounded-xl shrink-0",
                                  n.type === 'SCHEDULE' ? 'bg-blue-100 text-blue-600' :
                                  n.type === 'INCIDENT' ? 'bg-red-100 text-red-600' :
                                  'bg-green-100 text-green-600'
                                )}>
                                  {n.type === 'SCHEDULE' ? <Calendar size={16} /> : 
                                   n.type === 'INCIDENT' ? <AlertCircle size={16} /> : 
                                   <Bell size={16} />}
                                </div>
                                <div className="space-y-1">
                                  <p className="text-xs font-bold text-gray-800 dark:text-white leading-tight">{n.title}</p>
                                  <p className="text-[10px] text-gray-500 dark:text-gray-400 line-clamp-2">{n.message}</p>
                                  <p className="text-[9px] text-gray-400 dark:text-gray-600 font-medium">
                                    {format(parseISO(n.date), "HH:mm '•' dd/MM")}
                                  </p>
                                </div>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="p-12 text-center">
                            <BellOff className="mx-auto text-gray-200 dark:text-gray-800 mb-2" size={32} />
                            <p className="text-xs text-gray-400 font-medium">Nenhuma notificação</p>
                          </div>
                        )}
                      </div>
                      {notifications.length > 0 && (
                        <button className="w-full p-4 text-[10px] font-bold text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 transition-colors">
                          Ver Todas
                        </button>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>

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
              "fixed bottom-8 right-8 px-6 py-3 rounded-2xl shadow-2xl z-[110] flex items-center gap-3",
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
        isVisible={showAIAssistant}
        setIsVisible={setShowAIAssistant}
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
          showAIAssistant={showAIAssistant}
          onToggleAIAssistant={toggleAIAssistant}
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
