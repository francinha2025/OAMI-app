import React, { useState, useMemo, useEffect, useRef, useCallback } from 'react';
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
  Landmark,
  Info,
  ChevronRight,
  Plus,
  ArrowLeft,
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
  Eye,
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
  User as UserIcon,
  Star,
  Award,
  Boxes
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
import { ActivityDetailsModal } from './components/ActivityDetailsModal';
import { Role, User, Elderly, EvolutionRecord, FinancialRecord, PIA, Donor, DiaperDonation, DiaperStock, DiaperProductionLog, FinancialDocument, CalendarEvent, Volunteer, CommunityElderly, Workshop, Caregiver, Professional, PhysioPatient, PhysioAssessment, PhysioEvolution, PhysioExercise, PhysioAppointment, NursingPatient, Medication, MedicationAdministration, VitalSigns, DressingRecord, NursingEvolution, IncidentRecord, ShiftSchedule, StaffRole, StaffMember, AVDRecord, DiaperChangeRecord, PsychPatient, PsychInitialAssessment, PsychEvolution, PsychAppointment, PsychEmotionalMonitoring, PsychFamilyBond, PsychActivity, PsychCognitionAssessment, PsychInterventionPlan, PedagogyPatient, PedagogyInitialAssessment, PedagogyEvolution, PedagogyActivity, PedagogyStimulationTracking, PedagogySocialParticipation, PedagogyIndividualPlan, PedagogyLifeHistory, SocialPatient, SocialFamilyTie, SocialDocumentation, SocialLegalSituation, SocialStudy, SocialEvolution, SocialReferral, SocialFamilyVisit, SocialRiskSituation, NutritionPatient, NutritionEvolution, NutritionAnthropometry, NutritionMealPlan, DiaperRawProduction, DiaperWIPProcessing, DiaperFinalPacking, DiaperProductionGoal, DiaperBeneficiary, GalleryItem, InstitutionalInfo, FamilyEngagement, AppNotification, ProfessionalEvaluation, PresidencySupportDocument, InstitutionalSupportRecord, StockProduct, StockMovement } from './types';
import { MOCK_USERS, ROLE_LABELS, MOCK_GALLERY, INSTITUTION_LOGO } from './constants';
import { generateModernPDF } from './lib/pdfUtils';
import { generateModernWord } from './lib/wordUtils';
import { generateModernExcel } from './lib/excelUtils';
import { Table as TableIcon } from 'lucide-react';
import { processSmartIA, AISmartCommandResult, analyzeInvoice } from './services/geminiService';
import { db, auth, testConnection } from './firebase';
import { PhysioSection } from './components/PhysioSection';
import { NursingSection } from './components/NursingSection';
import { PsychologySection } from './components/PsychologySection';
import { PedagogySection } from './components/PedagogySection';
import { SocialWorkSection } from './components/SocialWorkSection';
import { NutritionSection } from './components/NutritionSection';
import { DiaperProductionSection } from './components/DiaperProductionSection';
import { TreasurySection } from './components/TreasurySection';
import { StockSection } from './components/StockSection';
import { AdminAssistantSection } from './components/AdminAssistantSection';
import { PresidencySupportSection } from './components/PresidencySupportSection';
import { InstitutionalSupportSection } from './components/InstitutionalSupportSection';
import { GlobalGallery } from './components/GlobalGallery';
import { DigitizeButton } from './components/DigitizeButton';
import { ProductivitySection } from './components/ProductivitySection';
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
  getDocs,
  deleteField
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

import { handleFirestoreError, OperationType } from './lib/firestoreErrors';

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
      const response = await fetch("/api/gemini/process-media", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ base64Data, mimeType }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      const extractedText = result.text;
      if (extractedText) {
        setInput(extractedText);
        setMessages(prev => [...prev, { role: 'ai', content: "📄 Texto extraído do anexo/câmera. Você pode revisar e enviar agora para processamento inteligente." }]);
      }
    } catch (error) {
      console.error("Media processing error:", error);
      setMessages(prev => [...prev, { role: 'ai', content: "⚠️ Erro ao processar imagem via IA." }]);
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

const MOCK_PROFESSIONALS: Professional[] = [
  {
    id: 'p1',
    name: 'Franciara Coelho',
    role: 'COORDENADORA',
    registrationNumber: 'REG-001',
    cpf: '111.111.111-11',
    phone: '(11) 99999-9991',
    email: 'franciaraeabreucoelho@gmail.com',
    address: 'Rua Exemplo, 123',
    admissionDate: '2022-01-10',
    status: 'ATIVO',
    createdAt: '2022-01-10'
  },
  {
    id: 'p2',
    name: 'Dra. Ana Paula (Assistente Social)',
    role: 'ASSISTENTE_SOCIAL',
    registrationNumber: 'CRESS-456',
    cpf: '222.222.222-22',
    phone: '(11) 99999-9992',
    email: 'social@oami.org.br',
    address: 'Rua Exemplo, 123',
    admissionDate: '2023-03-15',
    status: 'ATIVO',
    createdAt: '2023-03-15'
  },
  {
    id: 'p3',
    name: 'Dra. Camila Santos (Psicóloga)',
    role: 'PSICOLOGA',
    registrationNumber: 'CRP-789',
    cpf: '333.333.333-33',
    phone: '(11) 99999-9993',
    email: 'psico@oami.org.br',
    address: 'Rua Exemplo, 123',
    admissionDate: '2024-01-15',
    status: 'ATIVO',
    createdAt: '2024-01-15'
  },
  {
    id: 'p4',
    name: 'Prof. Marina Silva (Pedagoga)',
    role: 'PEDAGOGA',
    registrationNumber: 'REG-004',
    cpf: '444.444.444-44',
    phone: '(11) 99999-9994',
    email: 'pedagoga@oami.org.br',
    address: 'Rua Exemplo, 123',
    admissionDate: '2023-05-20',
    status: 'ATIVO',
    createdAt: '2023-05-20'
  },
  {
    id: 'p5',
    name: 'Dr. Roberto Oliveira (Fisioterapeuta)',
    role: 'FISIOTERAPEUTA',
    registrationNumber: 'CREFITO-321',
    cpf: '555.555.555-55',
    phone: '(11) 99999-9995',
    email: 'physio@oami.org.br',
    address: 'Rua Exemplo, 123',
    admissionDate: '2022-11-01',
    status: 'ATIVO',
    createdAt: '2022-11-01'
  },
  {
    id: 'p6',
    name: 'Enf. Juliana Rocha',
    role: 'ENFERMEIRA',
    registrationNumber: 'COREN-654',
    cpf: '666.666.666-66',
    phone: '(11) 99999-9996',
    email: 'enfermeira@oami.org.br',
    address: 'Rua Exemplo, 123',
    admissionDate: '2021-08-10',
    status: 'ATIVO',
    createdAt: '2021-08-10'
  },
  {
    id: 'p7',
    name: 'Nutr. Beatriz Costa',
    role: 'NUTRICIONISTA',
    registrationNumber: 'CRN-9871',
    cpf: '777.777.777-77',
    phone: '(11) 99999-9997',
    email: 'nutri@oami.org.br',
    address: 'Rua Exemplo, 123',
    admissionDate: '2023-10-15',
    status: 'ATIVO',
    createdAt: '2023-10-15'
  }
];

const MOCK_PROFESSIONAL_EVALUATIONS: ProfessionalEvaluation[] = [
  {
    id: 'eval-1',
    professionalId: 'p2',
    professionalName: 'Dra. Ana Paula (Assistente Social)',
    professionalRole: 'ASSISTENTE_SOCIAL',
    evaluatorId: 'p1',
    evaluatorName: 'Franciara Coelho',
    date: '2026-05-15',
    attendance: 5,
    teamwork: 4,
    competence: 5,
    proactivity: 5,
    relationshipWithElderly: 5,
    comments: 'Excelente profissional, demonstra extremo comprometimento com a documentação social e o bem-estar dos acolhidos.',
    recommendations: 'Manter a alta qualidade do trabalho. Sugere-se participação em novos simpósios de assistência ao idoso.',
    createdAt: '2026-05-15T10:00:00.000Z'
  },
  {
    id: 'eval-2',
    professionalId: 'p3',
    professionalName: 'Dra. Camila Santos (Psicóloga)',
    professionalRole: 'PSICOLOGA',
    evaluatorId: 'p1',
    evaluatorName: 'Franciara Coelho',
    date: '2026-05-18',
    attendance: 4,
    teamwork: 5,
    competence: 4,
    proactivity: 4,
    relationshipWithElderly: 5,
    comments: 'Muito dedicada e com ótima postura ética. Tem desenvolvido dinâmicas excelentes com os idosos.',
    recommendations: 'Reforçar o preenchimento diário das evoluções de acompanhamento clínico.',
    createdAt: '2026-05-18T14:30:00.000Z'
  }
];

const MOCK_SOCIAL_PATIENTS: SocialPatient[] = [
  {
    id: '1',
    elderlyId: '1',
    name: 'Maria Silva',
    birthDate: '1940-05-15',
    naturalness: 'São Paulo - SP',
    maritalStatus: 'VIUVO',
    schooling: 'Ensino Fundamental Completo',
    previousProfession: 'Costureira',
    income: 1412.00,
    benefits: ['APOSENTADORIA'],
    benefitStatus: 'ATIVO',
    inssMonitoring: 'Aposentadoria por idade ativa e regularizada',
    cadUnicoUpdateDate: '2025-06-10',
    hasLoans: false,
    loanDetails: '',
    createdAt: '2026-05-15T09:00:00.000Z'
  },
  {
    id: '2',
    elderlyId: '2',
    name: 'João Pereira',
    birthDate: '1935-08-22',
    naturalness: 'Belo Horizonte - MG',
    maritalStatus: 'DIVORCIADO',
    schooling: 'Ensino Fundamental Incompleto',
    previousProfession: 'Pedreiro',
    income: 1412.00,
    benefits: ['BPC'],
    benefitStatus: 'ATIVO',
    inssMonitoring: 'Benefício Assistencial (BPC) com acompanhamento direto',
    cadUnicoUpdateDate: '2025-11-20',
    hasLoans: true,
    loanDetails: 'Consignado de R$ 150/mês para compra de órteses',
    createdAt: '2026-05-15T09:00:00.000Z'
  },
  {
    id: '3',
    elderlyId: '3',
    name: 'Francisca Oliveira',
    birthDate: '1942-12-01',
    naturalness: 'Salvador - BA',
    maritalStatus: 'SOLTEIRO',
    schooling: 'Analfabeto',
    previousProfession: 'Dona de Casa',
    income: 1412.00,
    benefits: ['BPC'],
    benefitStatus: 'ATIVO',
    inssMonitoring: 'BPC acompanhado trimestralmente',
    cadUnicoUpdateDate: '2026-01-15',
    hasLoans: false,
    loanDetails: '',
    createdAt: '2026-05-15T09:00:00.000Z'
  },
  {
    id: '4',
    elderlyId: '4',
    name: 'Antônio Santos',
    birthDate: '1938-02-28',
    naturalness: 'Recife - PE',
    maritalStatus: 'VIUVO',
    schooling: 'Ensino Médio Incompleto',
    previousProfession: 'Comerciante',
    income: 2100.00,
    benefits: ['APOSENTADORIA', 'OUTRO'],
    benefitStatus: 'ATIVO',
    inssMonitoring: 'Aposentadoria integral monitorada pela defensoria',
    cadUnicoUpdateDate: '2025-05-05',
    hasLoans: false,
    loanDetails: '',
    createdAt: '2026-05-15T09:00:00.000Z'
  }
];

const MOCK_SOCIAL_FAMILY_TIES: SocialFamilyTie[] = [
  {
    id: 'ft1',
    patientId: '1',
    hasFamily: true,
    members: [
      {
        id: 'm1',
        name: 'Carlos Silva',
        kinship: 'Filho',
        phone: '(11) 98888-1111',
        isMainContact: true,
        visitFrequency: 'SEMANAL',
        relationshipQuality: 'BOA'
      },
      {
        id: 'm2',
        name: 'Mariana Silva',
        kinship: 'Neta',
        phone: '(11) 97777-2222',
        isMainContact: false,
        visitFrequency: 'QUINZENAL',
        relationshipQuality: 'BOA'
      }
    ],
    observations: 'Família presente e afetiva. Carlos visita todos os finais de semana e traz insumos adicionais de bem-estar.',
    abandonmentRisk: false,
    registeredBy: 'Franciara Coelho',
    updatedAt: '2026-05-18T14:30:00.000Z'
  },
  {
    id: 'ft2',
    patientId: '2',
    hasFamily: true,
    members: [
      {
        id: 'm3',
        name: 'Ana Pereira',
        kinship: 'Filha',
        phone: '(11) 96666-3333',
        isMainContact: true,
        visitFrequency: 'MENSAL',
        relationshipQuality: 'REGULAR'
      }
    ],
    observations: 'Filha demonstra desgaste familiar histórico, mas mantém contato telefônico e visitas mensais.',
    abandonmentRisk: true,
    registeredBy: 'Camila Santos',
    updatedAt: '2026-05-19T15:00:00.000Z'
  },
  {
    id: 'ft3',
    patientId: '3',
    hasFamily: false,
    members: [],
    observations: 'Ausência total de familiares de referência ou contatos conhecidos. Acolhimento institucional total.',
    abandonmentRisk: true,
    registeredBy: 'Camila Santos',
    updatedAt: '2026-05-20T10:00:00.000Z'
  }
];

const MOCK_SOCIAL_DOCUMENTATIONS: SocialDocumentation[] = [
  {
    id: 'd1',
    patientId: '1',
    rg: 'COMPLETO',
    cpf: 'COMPLETO',
    sus: 'COMPLETO',
    birthCertificate: 'COMPLETO',
    addressProof: 'COMPLETO',
    observations: 'Toda a documentação civil e da saúde está atualizada e arquivada na pasta física.',
    updatedAt: '2026-05-18T14:30:00.000Z'
  },
  {
    id: 'd2',
    patientId: '2',
    rg: 'COMPLETO',
    cpf: 'COMPLETO',
    sus: 'PENDENTE',
    birthCertificate: 'COMPLETO',
    addressProof: 'PENDENTE',
    observations: 'Comprovante de residência antigo. Cartão do SUS desatualizado na base do município.',
    updatedAt: '2026-05-19T15:00:00.000Z'
  },
  {
    id: 'd3',
    patientId: '3',
    rg: 'PENDENTE',
    cpf: 'COMPLETO',
    sus: 'COMPLETO',
    birthCertificate: 'INEXISTENTE',
    addressProof: 'INEXISTENTE',
    observations: 'Idosa sem registro de certidão de nascimento original. Necessário requisição de segunda via extraordinária.',
    updatedAt: '2026-05-20T10:00:00.000Z'
  }
];

const MOCK_SOCIAL_LEGAL_SITUATIONS: SocialLegalSituation[] = [
  {
    id: 'l1',
    patientId: '1',
    hasCurator: true,
    curatorName: 'Carlos Silva',
    isInterdicted: true,
    processNumber: '1002345-67.2023.8.26.0001',
    comarca: 'São Paulo - Vara da Família',
    situationStatus: 'REGULAR',
    observations: 'Termo de curatela definitiva homologado de forma regular pelo filho.',
    updatedAt: '2026-05-18T14:30:00.000Z'
  },
  {
    id: 'l2',
    patientId: '2',
    hasCurator: false,
    isInterdicted: false,
    situationStatus: 'EM_ANDAMENTO',
    observations: 'Processo de interdição civil e nomeação de curador em fase de instrução com o Ministério Público.',
    updatedAt: '2026-05-19T15:00:00.000Z'
  },
  {
    id: 'l3',
    patientId: '3',
    hasCurator: true,
    curatorName: 'Direção Geral do Abrigo',
    isInterdicted: true,
    processNumber: '1014498-12.2024.8.26.0002',
    comarca: 'Salvador - Vara de Órfãos e Sucessões',
    situationStatus: 'REGULAR',
    observations: 'Curatela institucional provisória decretada pelo juiz competente.',
    updatedAt: '2026-05-20T10:00:00.000Z'
  }
];

const MOCK_SOCIAL_STUDIES: SocialStudy[] = [
  {
    id: 's1',
    patientId: '1',
    date: '2026-04-10T11:00:00.000Z',
    lifeHistory: 'Maria Silva viveu mais de 45 anos na mesma comunidade costurando de forma autônoma. Perdeu o companheiro há 10 anos.',
    socialConditions: 'Residia em residência alugada com sérios problemas estruturais e de umidade, em área de risco mitigado.',
    institutionalizationReason: 'Desenvolveu declínio cognitivo e físico acentuado, necessitando de cuidados 24 horas indisponíveis pela rede familiar devido à jornada laboral.',
    supportNetwork: 'Apenas o filho Carlos que trabalha em período integral do outro lado da cidade.',
    technicalOpinion: 'Acolhimento de caráter eminentemente protetivo e profilático, garantindo a sua integridade e dignidade geral.',
    registeredBy: 'Franciara Coelho'
  },
  {
    id: 's2',
    patientId: '2',
    date: '2026-04-12T14:00:00.000Z',
    lifeHistory: 'João Pereira é pedreiro aposentado. Após o divórcio se isolou socialmente, perdendo contato regular com os demais membros de sua rede originária.',
    socialConditions: 'Vivia sozinho em quarto alugado em situação análoga a cortiço rústico.',
    institutionalizationReason: 'Encontrado pela equipe de assistência do CRAS em quadro visível de autonegligência alimentar e higiênica de alta severidade.',
    supportNetwork: 'Rompida com filhos e irmãos há mais de uma década.',
    technicalOpinion: 'Estudo social recomenda vivamente a permanência institucional assistida para reconstrução de rotina de convívio social qualificado.',
    registeredBy: 'Camila Santos'
  }
];

const MOCK_SOCIAL_EVOLUTIONS: SocialEvolution[] = [
  {
    id: 'se1',
    patientId: '1',
    date: '2026-05-15T09:00:00.000Z',
    serviceType: 'Entrevista Individual',
    observation: 'Idosa Maria Silva foi ouvida no pátio interno. Expressou excelente adaptação, elogiou a alimentação oferecida.',
    conduct: 'Continuar estimulando a participação em oficinas pedagógicas e monitorando reinserção familiar programada.',
    registeredBy: 'Franciara Coelho'
  },
  {
    id: 'se2',
    patientId: '2',
    date: '2026-05-18T10:30:00.000Z',
    serviceType: 'Visita Familiar',
    observation: 'Acompanhamento de atendimento conjunto com a filha Ana. Conversa pautada em superação de mágoas históricas.',
    conduct: 'Agendar novas sessões de escuta conjunta para abrandar tensões e encorajar visitas frequentes.',
    registeredBy: 'Camila Santos'
  }
];

const MOCK_SOCIAL_REFERRALS: SocialReferral[] = [
  {
    id: 'r1',
    patientId: '1',
    date: '2026-05-10T13:00:00.000Z',
    destination: 'CRAS',
    description: 'Encaminhamento para atualização do cadastro geral de beneficiários da assistência municipal.',
    status: 'CONCLUIDO',
    observations: 'Atendimento presencial realizado. Cadastro consolidado com sucesso.',
    registeredBy: 'Franciara Coelho'
  },
  {
    id: 'r2',
    patientId: '2',
    date: '2026-05-14T08:30:00.000Z',
    destination: 'INSS',
    description: 'Solicitação de detalhamento de empréstimos ativos em sua folha previdenciária de modo a coibir abusos.',
    status: 'EM_ANDAMENTO',
    observations: 'Equipe aguarda retorno oficial do portal MEU INSS.',
    registeredBy: 'Camila Santos'
  }
];

const MOCK_SOCIAL_RISK_SITUATIONS: SocialRiskSituation[] = [
  {
    id: 'rk1',
    patientId: '2',
    date: '2026-05-11T16:00:00.000Z',
    type: 'NEGLIGENCIA',
    description: 'Idoso encaminhado com ferimentos na derme em áreas não tratadas e sinais de desnutrição leve originadas do domicílio.',
    severity: 'MEDIA',
    status: 'RESOLVIDO',
    registeredBy: 'Franciara Coelho'
  },
  {
    id: 'rk2',
    patientId: '3',
    date: '2026-05-15T11:00:00.000Z',
    type: 'ABANDONO',
    description: 'Acolhimento imediato de idosa sem referências familiares ou rede de suporte primária identificável.',
    severity: 'ALTA',
    status: 'EM_ACOMPANHAMENTO',
    registeredBy: 'Camila Santos'
  }
];

const MOCK_SOCIAL_FAMILY_VISITS: SocialFamilyVisit[] = [
  {
    id: 'v1',
    patientId: '1',
    date: '2026-05-18T14:30:00.000Z',
    visitorName: 'Carlos Silva',
    kinship: 'Filho',
    observations: 'Visitou a mãe Maria Silva. Trouxe pertences pessoais e conversaram por 1 hora, demonstrando boa interação e afeto.',
    registeredBy: 'Franciara Coelho'
  },
  {
    id: 'v2',
    patientId: '2',
    date: '2026-05-19T15:00:00.000Z',
    visitorName: 'Ana Pereira',
    kinship: 'Filha',
    observations: 'Visitou o pai João Pereira. Conversaram no refeitório, relatando tranquilidade.',
    registeredBy: 'Camila Santos'
  }
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

const Login = ({ onGoogleLogin, onCompleteProfile, needsProfile, error: loginError, isLoggingIn }: { 
  onGoogleLogin: () => void, 
  onCompleteProfile: (role: Role) => void,
  needsProfile: boolean,
  error: string | null,
  isLoggingIn: boolean
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
            disabled={isLoggingIn}
            className="w-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 font-bold py-3 px-4 rounded-lg border border-gray-300 dark:border-gray-600 shadow-sm transition-all flex items-center justify-center gap-3 disabled:opacity-50"
          >
            {isLoggingIn ? (
              <>
                <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="text-green-600 dark:text-green-400">
                  <Activity size={18} />
                </motion.div>
                Conectando...
              </>
            ) : (
              <>
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
                Entrar com Google
              </>
            )}
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
        { id: 'productivity', label: 'Painel e Colaboração', icon: Award, roles: ['ANY'] },
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
        { id: 'professional', label: 'Avaliação & Monitoramento', icon: Award, roles: ['COORDENADORA', 'AUXILIAR_ADMINISTRATIVO', 'PROJETISTA', 'PRESIDENTE'] },
      ]
    },
    {
      title: 'Administrativo',
      items: [
        { id: 'adminAssistant', label: 'Painel Auxiliar', icon: LayoutDashboard, roles: ['COORDENADORA', 'AUXILIAR_ADMINISTRATIVO', 'PRESIDENTE'] },
        { id: 'treasury', label: 'Tesouraria', icon: Landmark, roles: ['ADMIN', 'TESOUREIRA', 'COORDENADORA', 'PRESIDENTE'] },
        { id: 'professionals', label: 'Usuários', icon: Users, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'financial', label: 'Financeiro', icon: DollarSign, roles: ['PRESIDENTE', 'COORDENADORA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'presidency_support', label: 'Suporte à Presidência', icon: ClipboardList, roles: ['PRESIDENTE', 'COORDENADORA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'institutional_support', label: 'Apoio Institucional', icon: Briefcase, roles: ['PRESIDENTE', 'COORDENADORA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'institutional', label: 'Institucional', icon: Info, roles: ['PRESIDENTE', 'COORDENADORA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'volunteers', label: 'Voluntários/Estagiários', icon: BookOpen, roles: ['ANY'] },
        { id: 'family', label: 'Acompanhamento Familiar', icon: Users, roles: ['COORDENADORA', 'ASSISTENTE_SOCIAL', 'PSICOLOGA', 'PROJETISTA', 'AUXILIAR_ADMINISTRATIVO'] },
        { id: 'donors', label: 'Doadores e Sócios', icon: Heart, roles: ['PRESIDENTE', 'COORDENADORA', 'AUXILIAR_ADMINISTRATIVO'] },
      ]
    },
    {
      title: 'Operacional',
      items: [
        { id: 'stock', label: 'Controle de Estoque', icon: Boxes, roles: ['PRESIDENTE', 'COORDENADORA', 'TESOUREIRA', 'AUXILIAR_ADMINISTRATIVO'] },
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<Partial<Professional>>({
    status: 'ATIVO',
    role: 'COORDENADORA',
    cpf: '',
    address: '',
    phone: '',
    email: '',
    observations: '',
    registrationNumber: '',
    admissionDate: '',
    sector: '',
    photoUrl: '',
    permissions: []
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

  const handleOpenNew = (type: 'CONVIVER' | 'INSTITUICAO') => {
    setEditingId(null);
    setModalType(type);
    setFormData({ status: 'ATIVO', role: 'COORDENADORA', cpf: '', address: '', phone: '', email: '', observations: '', registrationNumber: '', admissionDate: '', sector: '', photoUrl: '', permissions: [] });
    setStaffFormData({ name: '', role: 'CUIDADOR', status: 'ATIVO', cpf: '', address: '', phone: '', email: '', observations: '', admissionDate: '', createdAt: new Date().toISOString() });
    setIsModalOpen(true);
  };

  const handleEditConviver = (p: Professional) => {
    setEditingId(p.id);
    setModalType('CONVIVER');
    setFormData({
      name: p.name,
      status: p.status,
      role: p.role,
      cpf: p.cpf || '',
      address: p.address || '',
      phone: p.phone || '',
      email: p.email || '',
      observations: p.observations || '',
      registrationNumber: p.registrationNumber || '',
      admissionDate: p.admissionDate || '',
      sector: p.sector || '',
      photoUrl: p.photoUrl || '',
      permissions: p.permissions || []
    });
    setIsModalOpen(true);
  };

  const handleEditInstituicao = (s: StaffMember) => {
    setEditingId(s.id);
    setModalType('INSTITUICAO');
    setStaffFormData({
      name: s.name,
      role: s.role,
      status: s.status,
      cpf: s.cpf || '',
      address: s.address || '',
      phone: s.phone || '',
      email: s.email || '',
      observations: s.observations || '',
      admissionDate: s.admissionDate || '',
      createdAt: s.createdAt || new Date().toISOString()
    });
    setIsModalOpen(true);
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (modalType === 'CONVIVER') {
      try {
        const permissionsArray = typeof formData.permissions === 'string' && formData.permissions
          ? (formData.permissions as string).split(',').map((s: string) => s.trim()).filter(Boolean)
          : Array.isArray(formData.permissions) ? formData.permissions : [];

        const cleanedProfessional = cleanData({
          ...formData,
          permissions: permissionsArray,
          createdAt: new Date().toISOString()
        });
        if (editingId) {
          await updateDoc(doc(db, 'professionals', editingId), cleanedProfessional);
          showToast('Profissional atualizado com sucesso!', 'success');
        } else {
          await addDoc(collection(db, 'professionals'), cleanedProfessional);
          showToast('Profissional cadastrado com sucesso!', 'success');
        }
        setIsModalOpen(false);
        setEditingId(null);
        setFormData({ status: 'ATIVO', role: 'COORDENADORA', cpf: '', address: '', phone: '', email: '', observations: '', registrationNumber: '', admissionDate: '', sector: '', photoUrl: '', permissions: [] });
      } catch (error) {
        showToast('Erro ao gravar profissional.', 'error');
      }
    } else {
      await onSaveStaff(staffFormData, editingId || undefined);
      setIsModalOpen(false);
      setEditingId(null);
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
            onClick={() => handleOpenNew('CONVIVER')}
            className="flex items-center gap-2 bg-blue-600 text-white px-5 py-3 rounded-2xl font-bold shadow-lg hover:bg-blue-700 transition-all text-sm"
          >
            <Plus size={18} /> Novo Usuário Conviver
          </button>
          <button 
            onClick={() => handleOpenNew('INSTITUICAO')}
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
                <div className="absolute top-2 right-2 flex gap-1 bg-gray-50/90 dark:bg-gray-800/90 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                  <button 
                    onClick={() => handleEditConviver(p)}
                    className="p-1 text-gray-500 hover:text-blue-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                    title="Editar ✏️"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDelete(p.id)}
                    className="p-1 text-gray-500 hover:text-red-650 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                    title="Excluir 🗑️"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="w-12 h-12 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-500 flex-shrink-0">
                  <Briefcase size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight pr-14">{p.name}</h4>
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
                <div className="absolute top-2 right-2 flex gap-1 bg-gray-50/90 dark:bg-gray-800/90 p-1 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700/50">
                  <button 
                    onClick={() => handleEditInstituicao(s)}
                    className="p-1 text-gray-500 hover:text-green-600 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                    title="Editar ✏️"
                  >
                    <Edit2 size={14} />
                  </button>
                  <button 
                    onClick={() => handleDeleteStaff(s.id)}
                    className="p-1 text-gray-500 hover:text-red-650 hover:bg-white dark:hover:bg-gray-700 rounded-lg transition-all"
                    title="Excluir 🗑️"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                <div className="w-12 h-12 bg-green-50 dark:bg-green-900/20 rounded-xl flex items-center justify-center text-green-500 flex-shrink-0">
                  <Heart size={24} />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 dark:text-white text-base leading-tight pr-14">{s.name}</h4>
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
                  {editingId ? 'Editar' : 'Cadastrar'} {modalType === 'CONVIVER' ? 'Usuário Conviver' : 'Usuário da Instituição'}
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
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Setor</label>
                      <input 
                        type="text"
                        placeholder="Ex: Clínico, Administrativo, Social"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.sector || ''}
                        onChange={(e) => setFormData({...formData, sector: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Foto de Perfil (URL)</label>
                      <input 
                        type="text"
                        placeholder="Ex: https://images.unsplash.com/..."
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={formData.photoUrl || ''}
                        onChange={(e) => setFormData({...formData, photoUrl: e.target.value})}
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">Permissões de Acesso (Separadas por vírgula)</label>
                      <input 
                        type="text"
                        placeholder="Ex: Evoluções, Dashboard, Finanças, Administrador, SGPF"
                        className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 dark:text-white font-bold"
                        value={Array.isArray(formData.permissions) ? formData.permissions.join(', ') : (formData.permissions || '')}
                        onChange={(e) => setFormData({...formData, permissions: e.target.value})}
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

const ElderlySection = ({ 
  elderly, 
  evolutions, 
  pias, 
  showToast,
  nursingPatients,
  physioPatients,
  psychPatients,
  pedagogyPatients,
  socialPatients,
  nutritionPatients
}: { 
  elderly: Elderly[], 
  evolutions: EvolutionRecord[], 
  pias: PIA[], 
  showToast: (msg: string, type?: 'success' | 'error') => void,
  nursingPatients: NursingPatient[],
  physioPatients: PhysioPatient[],
  psychPatients: PsychPatient[],
  pedagogyPatients: PedagogyPatient[],
  socialPatients: SocialPatient[],
  nutritionPatients: NutritionPatient[]
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedElderly, setSelectedElderly] = useState<Elderly | null>(null);

  const nursingData = selectedElderly ? nursingPatients?.find(p => p.elderlyId === selectedElderly.id) : null;
  const physioData = selectedElderly ? physioPatients?.find(p => p.elderlyId === selectedElderly.id) : null;
  const psychData = selectedElderly ? psychPatients?.find(p => p.elderlyId === selectedElderly.id) : null;
  const pedagogyData = selectedElderly ? pedagogyPatients?.find(p => p.elderlyId === selectedElderly.id) : null;
  const socialData = selectedElderly ? socialPatients?.find(p => p.elderlyId === selectedElderly.id) : null;
  const nutritionData = selectedElderly ? nutritionPatients?.find(p => p.elderlyId === selectedElderly.id) : null;
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
                    <div className="bg-green-50/75 dark:bg-green-950/20 p-6 rounded-3xl border border-green-100 dark:border-green-900/30 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-green-100/50 dark:border-green-900/30">
                        <Activity className="text-green-600 dark:text-green-400" size={18} />
                        <h4 className="font-extrabold text-green-800 dark:text-green-300 text-sm uppercase tracking-wider">Informações de Saúde</h4>
                      </div>
                      
                      {/* Enfermagem */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500" />
                          Enfermagem
                        </h5>
                        <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-2xl text-xs space-y-2 border border-green-100/30 dark:border-green-900/20">
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Diagnóstico: </span>
                            <span className="text-gray-800 dark:text-gray-200">{nursingData?.diagnosis || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Comorbidades: </span>
                            <span className="text-gray-800 dark:text-gray-200">{nursingData?.comorbidities || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Alergias: </span>
                            <span className="font-bold text-red-600 dark:text-red-400">{nursingData?.allergies || 'Nenhuma'}</span>
                          </div>
                          <div className="grid grid-cols-2 gap-2 pt-1">
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Risco: </span>
                              <span className={cn(
                                "font-bold px-1.5 py-0.5 rounded text-[10px]",
                                nursingData?.riskLevel === 'ALTO' ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400" :
                                nursingData?.riskLevel === 'MEDIO' ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400" :
                                "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                              )}>{nursingData?.riskLevel || 'BAIXO'}</span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Risco de Queda: </span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">{nursingData?.fallRisk || 'BAIXO'}</span>
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Grau Cuidado: </span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">{nursingData?.careDegree || 'Não informado'}</span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Acamado: </span>
                              <span className="font-bold text-gray-800 dark:text-gray-200">{nursingData?.isBedridden ? 'Sim' : 'Não'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Fisioterapia */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                          Fisioterapia
                        </h5>
                        <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-2xl text-xs space-y-2 border border-green-100/30 dark:border-green-900/20">
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Diagnóstico: </span>
                            <span className="text-gray-800 dark:text-gray-200">{physioData?.diagnosis || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Limitações Físicas: </span>
                            <span className="text-gray-800 dark:text-gray-200">{physioData?.observations || 'Não informado'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Psicologia */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500" />
                          Psicologia
                        </h5>
                        <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-2xl text-xs space-y-1 border border-green-100/30 dark:border-green-900/20">
                          <p className="font-bold text-gray-500 dark:text-gray-400">Histórico de Vida:</p>
                          <p className="text-gray-700 dark:text-gray-300 text-[11px] leading-relaxed line-clamp-3">
                            {psychData?.lifeHistory || 'Nenhum histórico registrado.'}
                          </p>
                          <div className="pt-1 flex justify-between items-center">
                            <span className="font-bold text-gray-500 dark:text-gray-400">Recebe Visitas:</span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{psychData?.hasVisits ? 'Sim' : 'Não'}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="bg-blue-50/70 dark:bg-blue-950/20 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/30 space-y-4">
                      <div className="flex items-center gap-2 pb-2 border-b border-blue-100/50 dark:border-blue-900/30">
                        <Users className="text-blue-600 dark:text-blue-400" size={18} />
                        <h4 className="font-extrabold text-blue-800 dark:text-blue-300 text-sm uppercase tracking-wider">Social, Pedagógico e Nutrição</h4>
                      </div>

                      {/* Assistente Social */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Assistência Social
                        </h5>
                        <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-2xl text-xs space-y-2 border border-blue-100/30 dark:border-blue-900/20">
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Responsável Legal: </span>
                            <span className="font-bold text-gray-800 dark:text-gray-200">{socialData?.responsibleName || selectedElderly.responsibleName || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Contato Resp.: </span>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{socialData?.responsiblePhone || selectedElderly.responsiblePhone || 'Não informado'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Endereço: </span>
                            <span className="text-gray-800 dark:text-gray-200">{socialData?.address || selectedElderly.address || 'Não informado'}</span>
                          </div>
                          <div className="flex justify-between">
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Benefício: </span>
                              <span className="text-gray-800 dark:text-gray-200">{socialData?.benefits?.join(', ') || 'Nenhum'}</span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Status: </span>
                              <span className="text-gray-800 dark:text-gray-200">{socialData?.benefitStatus || 'Não informado'}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Pedagoga */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                          Pedagogia
                        </h5>
                        <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-2xl text-xs space-y-2 border border-blue-100/30 dark:border-blue-900/20">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Escolaridade: </span>
                              <span className="text-gray-800 dark:text-gray-200">{pedagogyData?.schooling || 'Não informada'}</span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Nível: </span>
                              <span className="text-gray-800 dark:text-gray-200">{pedagogyData?.literacyLevel || 'Não informado'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Profissão Anterior: </span>
                            <span className="text-gray-800 dark:text-gray-200">{pedagogyData?.previousProfession || 'Não informada'}</span>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Limitações Cognitivas: </span>
                            <span className="text-gray-800 dark:text-gray-200">{pedagogyData?.cognitiveLimitations || 'Nenhuma registrada'}</span>
                          </div>
                        </div>
                      </div>

                      {/* Nutricionista */}
                      <div className="space-y-2">
                        <h5 className="text-xs font-black text-blue-700 dark:text-blue-400 uppercase tracking-widest flex items-center gap-1.5">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          Nutrição
                        </h5>
                        <div className="bg-white/60 dark:bg-gray-800/40 p-3 rounded-2xl text-xs space-y-2 border border-blue-100/30 dark:border-blue-900/20">
                          <div className="grid grid-cols-2 gap-2">
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Tipo Dieta: </span>
                              <span className="text-gray-800 dark:text-gray-200">{nutritionData?.dietType || 'LIVRE'}</span>
                            </div>
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400 font-sans">Consistência: </span>
                              <span className="text-gray-800 dark:text-gray-200">{nutritionData?.consistency || 'NORMAL'}</span>
                            </div>
                          </div>
                          <div>
                            <span className="font-bold text-gray-500 dark:text-gray-400">Alergias Alimentares: </span>
                            <span className="font-bold text-red-600 dark:text-red-400">{nutritionData?.allergies?.join(', ') || 'Nenhuma'}</span>
                          </div>
                          {nutritionData?.intolerances && nutritionData.intolerances.length > 0 && (
                            <div>
                              <span className="font-bold text-gray-500 dark:text-gray-400">Intolerâncias: </span>
                              <span className="text-gray-800 dark:text-gray-200">{nutritionData.intolerances.join(', ')}</span>
                            </div>
                          )}
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

const ProfessionalArea = ({ 
  professionals, 
  evaluations, 
  onSaveEvaluation, 
  onDeleteEvaluation, 
  user, 
  showToast 
}: { 
  professionals: Professional[], 
  evaluations: ProfessionalEvaluation[], 
  onSaveEvaluation: (evaluationData: Partial<ProfessionalEvaluation>) => Promise<void>,
  onDeleteEvaluation: (evalId: string) => Promise<void>,
  user: User,
  showToast: (msg: string, type?: 'success' | 'error') => void
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState<string>('');
  const [evaluationDate, setEvaluationDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [attendance, setAttendance] = useState<number>(5);
  const [teamwork, setTeamwork] = useState<number>(5);
  const [competence, setCompetence] = useState<number>(5);
  const [proactivity, setProactivity] = useState<number>(5);
  const [relationshipWithElderly, setRelationshipWithElderly] = useState<number>(5);
  const [comments, setComments] = useState<string>('');
  const [recommendations, setRecommendations] = useState<string>('');

  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [viewingEvaluation, setViewingEvaluation] = useState<ProfessionalEvaluation | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ isOpen: boolean; id: string } | null>(null);
  const [exporting, setExporting] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);

  const canEvaluate = user.role === 'COORDENADORA' || user.role === 'PRESIDENTE';

  const handleEditClick = (ev: ProfessionalEvaluation) => {
    setEditingId(ev.id);
    setSelectedProfessionalId(ev.professionalId);
    setEvaluationDate(ev.date);
    setAttendance(ev.attendance);
    setTeamwork(ev.teamwork);
    setCompetence(ev.competence);
    setProactivity(ev.proactivity);
    setRelationshipWithElderly(ev.relationshipWithElderly);
    setComments(ev.comments);
    setRecommendations(ev.recommendations);
    
    // Smooth scroll to top of form
    document.getElementById('evaluation-form-card')?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setSelectedProfessionalId('');
    setEvaluationDate(new Date().toISOString().split('T')[0]);
    setAttendance(5);
    setTeamwork(5);
    setCompetence(5);
    setProactivity(5);
    setRelationshipWithElderly(5);
    setComments('');
    setRecommendations('');
  };

  const handleSaveSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfessionalId) {
      showToast('Por favor, selecione um profissional.', 'error');
      return;
    }

    const prof = professionals.find(p => p.id === selectedProfessionalId);
    if (!prof) {
      showToast('Profissional selecionado inválido.', 'error');
      return;
    }

    setLoading(true);
    try {
      await onSaveEvaluation({
        id: editingId || undefined,
        professionalId: selectedProfessionalId,
        professionalName: prof.name,
        professionalRole: prof.role,
        date: evaluationDate,
        attendance,
        teamwork,
        competence,
        proactivity,
        relationshipWithElderly,
        comments,
        recommendations
      });
      handleCancelEdit();
    } catch (err) {
      showToast('Erro ao salvar avaliação.', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Stats calculation
  const stats = useMemo(() => {
    const list = evaluations || [];
    if (list.length === 0) return { total: 0, average: 0, attendanceAvg: 0, teamworkAvg: 0, competenceAvg: 0, proactivityAvg: 0, relationshipAvg: 0 };
    
    let sumAttendance = 0;
    let sumTeamwork = 0;
    let sumCompetence = 0;
    let sumProactivity = 0;
    let sumRelationship = 0;

    list.forEach(ev => {
      sumAttendance += ev.attendance;
      sumTeamwork += ev.teamwork;
      sumCompetence += ev.competence;
      sumProactivity += ev.proactivity;
      sumRelationship += ev.relationshipWithElderly;
    });

    const attendanceAvg = sumAttendance / list.length;
    const teamworkAvg = sumTeamwork / list.length;
    const competenceAvg = sumCompetence / list.length;
    const proactivityAvg = sumProactivity / list.length;
    const relationshipAvg = sumRelationship / list.length;

    const totalAvg = (attendanceAvg + teamworkAvg + competenceAvg + proactivityAvg + relationshipAvg) / 5;

    return {
      total: list.length,
      average: Number(totalAvg.toFixed(1)),
      attendanceAvg: Number(attendanceAvg.toFixed(1)),
      teamworkAvg: Number(teamworkAvg.toFixed(1)),
      competenceAvg: Number(competenceAvg.toFixed(1)),
      proactivityAvg: Number(proactivityAvg.toFixed(1)),
      relationshipAvg: Number(relationshipAvg.toFixed(1))
    };
  }, [evaluations]);

  const generateReportPDF = async () => {
    setExporting(true);
    try {
      const columns = ['Data', 'Profissional', 'Cargo', 'Avaliador', 'Média'];
      const data = filteredEvaluations.map(ev => {
        const avg = ((ev.attendance + ev.teamwork + ev.competence + ev.proactivity + ev.relationshipWithElderly) / 5).toFixed(1);
        return [
          format(parseISO(ev.date), 'dd/MM/yyyy'),
          ev.professionalName,
          ROLE_LABELS[ev.professionalRole as Role] || ev.professionalRole,
          ev.evaluatorName,
          `${avg} / 5.0`
        ];
      });

      await generateModernPDF({
        title: `Relatório de Avaliações de Desempenho`,
        subtitle: `OAMI - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_avaliacoes_desempenho`
      });
      showToast('Relatório de de avaliações exportado com sucesso (PDF)!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório', 'error');
    } finally {
      setExporting(false);
    }
  };

  const generateReportWord = async () => {
    setExporting(true);
    try {
      const columns = ['Data', 'Profissional', 'Cargo', 'Avaliador', 'Nota Média'];
      const data = filteredEvaluations.map(ev => {
        const avg = ((ev.attendance + ev.teamwork + ev.competence + ev.proactivity + ev.relationshipWithElderly) / 5).toFixed(1);
        return [
          format(parseISO(ev.date), 'dd/MM/yyyy'),
          ev.professionalName,
          ROLE_LABELS[ev.professionalRole as Role] || ev.professionalRole,
          ev.evaluatorName,
          `${avg} / 5.0`
        ];
      });

      await generateModernWord({
        title: `Relatório de Avaliações de Desempenho`,
        subtitle: `OAMI - Gerado em ${format(new Date(), "dd/MM/yyyy")}`,
        columns,
        data,
        fileName: `relatorio_avaliacoes_desempenho`
      });
      showToast('Relatório de avaliações exportado com sucesso (Word)!');
    } catch (err) {
      console.error("Export Error:", err);
      showToast('Erro ao exportar relatório (Word)', 'error');
    } finally {
      setExporting(false);
    }
  };

  const filteredEvaluations = useMemo(() => {
    return (evaluations || []).filter(ev => {
      const nameMatch = ev.professionalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        ev.evaluatorName.toLowerCase().includes(searchQuery.toLowerCase());
      const roleMatch = !roleFilter || ev.professionalRole === roleFilter;
      return nameMatch && roleMatch;
    });
  }, [evaluations, searchQuery, roleFilter]);

  const StarRating = ({ value, onChange, label, description, disabled }: { value: number, onChange: (val: number) => void, label: string, description: string, disabled?: boolean }) => {
    return (
      <div className="space-y-1">
        <div className="flex justify-between items-center">
          <label className="text-sm font-bold text-gray-700 dark:text-gray-300 ml-1">{label}</label>
          <span className="text-xs font-black text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2.5 py-0.5 rounded-full">{value} / 5</span>
        </div>
        <p className="text-[10px] text-gray-400 dark:text-gray-500 ml-1 mb-2">{description}</p>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              disabled={disabled}
              onClick={() => onChange(star)}
              className="p-1 transition-all transform hover:scale-110 disabled:scale-100 disabled:opacity-80"
            >
              <Star
                size={22}
                className={cn(
                  "transition-colors",
                  star <= value 
                    ? "fill-amber-400 text-amber-400" 
                    : "text-gray-300 dark:text-gray-700"
                )}
              />
            </button>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div id="professional-area-top" className="space-y-8">
      <ConfirmationModal 
        isOpen={deleteConfirm?.isOpen || false}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={async () => {
          if (deleteConfirm) {
            try {
              await onDeleteEvaluation(deleteConfirm.id);
              setDeleteConfirm(null);
            } catch (err) {
              showToast('Erro ao excluir avaliação.', 'error');
            }
          }
        }}
        title="Excluir Avaliação de Desempenho"
        message="Tem certeza que deseja excluir esta avaliação? Esta ação não poderá ser desfeita."
      />

      {/* Details Modal */}
      <AnimatePresence>
        {viewingEvaluation && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.95 }}
              className="bg-white dark:bg-gray-900 rounded-3xl p-8 max-w-2xl w-full shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar border border-gray-100 dark:border-gray-800"
            >
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-amber-50 dark:bg-amber-950/30 text-amber-600 rounded-2xl">
                    <Award size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-800 dark:text-white">Ficha de Avaliação de Desempenho</h3>
                    <p className="text-xs text-gray-400">Avaliação realizada em {format(parseISO(viewingEvaluation.date), 'dd/MM/yyyy')}</p>
                  </div>
                </div>
                <button 
                  onClick={() => setViewingEvaluation(null)}
                  className="p-2 text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-2xl border border-gray-100 dark:border-gray-800 text-sm">
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Profissional Avaliado</span>
                  <p className="font-bold text-gray-850 dark:text-white">{viewingEvaluation.professionalName}</p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 font-black uppercase mt-1">({ROLE_LABELS[viewingEvaluation.professionalRole as Role] || viewingEvaluation.professionalRole})</p>
                </div>
                <div>
                  <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider block">Avaliador Responsável</span>
                  <p className="font-bold text-gray-850 dark:text-white">{viewingEvaluation.evaluatorName}</p>
                  <p className="text-xs text-gray-450 mt-1">Cargo de Gestão</p>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Pontuações Detalhadas</h4>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-450">Pontualidade e Assiduidade</span>
                      <span className="font-bold text-gray-800 dark:text-white">{viewingEvaluation.attendance}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(viewingEvaluation.attendance / 5) * 100}%` }} />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-455">Trabalho em Equipe</span>
                      <span className="font-bold text-gray-800 dark:text-white">{viewingEvaluation.teamwork}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(viewingEvaluation.teamwork / 5) * 100}%` }} />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-450">Competência Técnica</span>
                      <span className="font-bold text-gray-800 dark:text-white">{viewingEvaluation.competence}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(viewingEvaluation.competence / 5) * 100}%` }} />
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-450">Proatividade e Iniciativa</span>
                      <span className="font-bold text-gray-800 dark:text-white">{viewingEvaluation.proactivity}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(viewingEvaluation.proactivity / 5) * 100}%` }} />
                    </div>

                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 dark:text-gray-450">Relação com Idosos & Família</span>
                      <span className="font-bold text-gray-800 dark:text-white">{viewingEvaluation.relationshipWithElderly}/5</span>
                    </div>
                    <div className="w-full bg-gray-100 dark:bg-gray-800 h-2 rounded-full overflow-hidden">
                      <div className="bg-amber-400 h-full" style={{ width: `${(viewingEvaluation.relationshipWithElderly / 5) * 100}%` }} />
                    </div>

                    <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-xl flex justify-between items-center border border-green-100 dark:border-green-950/30">
                      <span className="text-xs font-bold text-green-700 dark:text-green-400 uppercase">Nota Média Final</span>
                      <span className="text-lg font-black text-green-700 dark:text-green-400">{(((viewingEvaluation.attendance + viewingEvaluation.teamwork + viewingEvaluation.competence + viewingEvaluation.proactivity + viewingEvaluation.relationshipWithElderly) / 5)).toFixed(1)} / 5.0</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h4 className="font-bold text-gray-800 dark:text-white border-b border-gray-100 dark:border-gray-800 pb-2">Feedback Qualitativo</h4>
                <div className="space-y-3">
                  <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Pontos Fortes e Observações</span>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800/60 text-sm text-gray-650 dark:text-gray-350 italic">
                      {viewingEvaluation.comments || 'Nenhuma observação técnica registrada.'}
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 font-bold uppercase block mb-1">Recomendações de Melhoria / Plano de Ação</span>
                    <div className="p-4 bg-gray-50 dark:bg-gray-800/40 rounded-xl border border-gray-100 dark:border-gray-800/60 text-sm text-gray-650 dark:text-gray-350 italic">
                      {viewingEvaluation.recommendations || 'Nenhuma recomendação registrada.'}
                    </div>
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setViewingEvaluation(null)}
                className="w-full bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold py-3 rounded-xl transition-all"
              >
                Voltar
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header card */}
      <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="p-4 bg-green-600 rounded-2xl text-white shadow-lg">
              <Award size={32} />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Avaliação e Monitoramento</h2>
              <p className="text-gray-500 dark:text-gray-400">Avaliação profissional e monitoramento de desempenho</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={generateReportPDF}
              disabled={exporting}
              className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 hover:bg-blue-100 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2" 
              title="Exportar Relatório Mensal (PDF)"
            >
              <FileDown size={20} />
              <span className="text-xs font-bold">PDF</span>
            </button>
            <button 
              onClick={generateReportWord}
              disabled={exporting}
              className="p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 rounded-xl transition-all disabled:opacity-50 flex items-center gap-2" 
              title="Exportar Relatório Mensal (Word)"
            >
              <FileText size={20} />
              <span className="text-xs font-bold">Word</span>
            </button>
          </div>
        </div>

        {/* Dashboard Overview */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-8">
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Total de Avaliações</span>
            <p className="text-3xl font-black text-gray-800 dark:text-white mt-1">{stats.total}</p>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Nota Média Geral</span>
            <div className="flex items-center gap-2 mt-1">
              <p className="text-3xl font-black text-green-600 dark:text-green-400">{stats.average > 0 ? `${stats.average}` : '0.0'}</p>
              <span className="text-xs text-gray-400">/ 5.0</span>
            </div>
          </div>
          <div className="p-6 bg-gray-50 dark:bg-gray-800/40 rounded-2xl border border-gray-100 dark:border-gray-800 sm:col-span-2">
            <span className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">Média por Critério</span>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mt-2 text-gray-500">
              <div className="flex justify-between">
                <span>Pontualidade:</span>
                <span className="font-bold text-gray-750 dark:text-white">{stats.attendanceAvg}/5</span>
              </div>
              <div className="flex justify-between">
                <span>Trabalho em Equipe:</span>
                <span className="font-bold text-gray-750 dark:text-white">{stats.teamworkAvg}/5</span>
              </div>
              <div className="flex justify-between">
                <span>Competência Técnica:</span>
                <span className="font-bold text-gray-750 dark:text-white">{stats.competenceAvg}/5</span>
              </div>
              <div className="flex justify-between">
                <span>Proatividade:</span>
                <span className="font-bold text-gray-750 dark:text-white">{stats.proactivityAvg}/5</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Form Column */}
        <div id="evaluation-form-card" className="lg:col-span-5">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
            <div className="border-b border-gray-105 dark:border-gray-800 pb-4">
              <h3 className="text-lg font-bold text-gray-800 dark:text-white">
                {editingId ? 'Editar Avaliação de Desempenho' : 'Nova Avaliação de Desempenho'}
              </h3>
              <p className="text-xs text-gray-450 mt-1">
                {canEvaluate 
                  ? 'Preencha as notas e comentários para registrar o monitoramento técnico.' 
                  : 'Apenas coordenadores e presidentes possuem permissões para preencher e registrar avaliações.'}
              </p>
            </div>

            {canEvaluate ? (
              <form onSubmit={handleSaveSubmit} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Profissional Técnico</label>
                  <select
                    disabled={loading}
                    value={selectedProfessionalId}
                    onChange={(e) => setSelectedProfessionalId(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                    required
                  >
                    <option value="">Selecione o profissional...</option>
                    {(professionals || [])
                      .filter(p => p.status === 'ATIVO')
                      .map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({ROLE_LABELS[p.role as Role] || p.role})
                        </option>
                      ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Data da Avaliação</label>
                  <input
                    type="date"
                    disabled={loading}
                    value={evaluationDate}
                    onChange={(e) => setEvaluationDate(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                    required
                  />
                </div>

                <div className="bg-gray-50 dark:bg-gray-800/30 p-4 rounded-3xl space-y-4 border border-gray-100 dark:border-gray-800/50">
                  <StarRating 
                    value={attendance} 
                    onChange={setAttendance} 
                    label="1. Pontualidade & Assiduidade" 
                    description="Cumprimento dos horários de entrada, saída, e compromissos internos." 
                    disabled={loading}
                  />
                  <StarRating 
                    value={teamwork} 
                    onChange={setTeamwork} 
                    label="2. Trabalho em Equipe" 
                    description="Colaboração ativa com outros profissionais e sintonia nas rotinas institucionais." 
                    disabled={loading}
                  />
                  <StarRating 
                    value={competence} 
                    onChange={setCompetence} 
                    label="3. Competência Técnica" 
                    description="Eficiência no atendimento técnico e exatidão nos registros diários." 
                    disabled={loading}
                  />
                  <StarRating 
                    value={proactivity} 
                    onChange={setProactivity} 
                    label="4. Proatividade & Iniciativa" 
                    description="Busca por soluções autônomas e implementações de melhorias." 
                    disabled={loading}
                  />
                  <StarRating 
                    value={relationshipWithElderly} 
                    onChange={setRelationshipWithElderly} 
                    label="5. Relação com Idosos & Família" 
                    description="Empatia, respeito e paciência no acolhimento de residentes e familiares." 
                    disabled={loading}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Pontos Fortes e Observações</label>
                  <textarea
                    placeholder="Quais são as principais qualidades profissionais observadas?"
                    disabled={loading}
                    value={comments}
                    onChange={(e) => setComments(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-gray-400 uppercase ml-1">Recomendações / Plano de Ação</label>
                  <textarea
                    placeholder="Quais caminhos ou comportamentos devem ser melhorados?"
                    disabled={loading}
                    value={recommendations}
                    onChange={(e) => setRecommendations(e.target.value)}
                    className="w-full p-4 bg-gray-50 dark:bg-gray-800 border-none rounded-2xl outline-none focus:ring-2 focus:ring-green-500 h-24 text-gray-800 dark:text-white text-sm"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  {editingId && (
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="flex-1 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 font-bold py-4 rounded-2xl hover:bg-gray-200 dark:hover:bg-gray-700 transition-all text-sm"
                    >
                      Cancelar
                    </button>
                  )}
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-green-600 text-white font-bold py-4 rounded-2xl hover:bg-green-700 transition-all shadow-md text-sm select-none"
                  >
                    {loading ? 'Processando...' : (editingId ? 'Salvar Alterações' : 'Registrar Avaliação')}
                  </button>
                </div>
              </form>
            ) : (
              <div className="p-8 text-center bg-gray-50 dark:bg-gray-800/40 rounded-3xl border border-gray-150 border-dashed dark:border-gray-800 text-gray-400 space-y-3">
                <Shield size={32} className="mx-auto text-gray-300 dark:text-gray-750" />
                <p className="text-xs">Seu usuário atual possui o perfil <strong className="text-gray-500">{ROLE_LABELS[user.role]}</strong>.</p>
                <p className="text-xs">Apenas usuários com as funções de <strong>Presidente</strong> ou <strong>Coordenador</strong> podem administrar novos registros de desempenho técnico.</p>
              </div>
            )}
          </div>
        </div>

        {/* List Column */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl border border-gray-100 dark:border-gray-800 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Registros de Monitoramentos Recentes</h3>
                <p className="text-xs text-gray-450 mt-1">Lista completa das avaliações realizadas para acompanhamento de qualidade institucional.</p>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="relative">
                <Search size={16} className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por profissional ou avaliador..."
                  className="w-full text-xs pl-11 pr-4 py-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="w-full text-xs p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                >
                  <option value="">Filtro de Cargo...</option>
                  {Object.entries(ROLE_LABELS).map(([role, label]) => (
                    <option key={role} value={role}>{label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="space-y-4 max-h-[700px] overflow-y-auto custom-scrollbar pr-1">
              {filteredEvaluations.map((ev) => {
                const averageScore = ((ev.attendance + ev.teamwork + ev.competence + ev.proactivity + ev.relationshipWithElderly) / 5).toFixed(1);
                
                return (
                  <div 
                    key={ev.id} 
                    className="p-5 bg-gray-50 dark:bg-gray-850 rounded-2xl border border-gray-100 dark:border-gray-800/60 hover:shadow-md transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="space-y-2 flex-1">
                      <div className="flex items-start justify-between sm:justify-start sm:items-center gap-3">
                        <h4 className="font-bold text-gray-800 dark:text-white text-base leading-tight">
                          {ev.professionalName}
                        </h4>
                        <span className="text-[10px] bg-blue-50 dark:bg-blue-900/40 text-blue-600 dark:text-blue-300 px-2 py-0.5 font-bold rounded-lg uppercase tracking-wide">
                          {ROLE_LABELS[ev.professionalRole as Role] || ev.professionalRole}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-gray-500">
                        <p>Avaliador: <strong className="text-gray-700 dark:text-gray-300">{ev.evaluatorName}</strong></p>
                        <p>Data: <strong className="text-gray-700 dark:text-gray-300">{format(parseISO(ev.date), 'dd/MM/yyyy')}</strong></p>
                      </div>

                      {ev.comments && (
                        <p className="text-xs text-gray-450 line-clamp-1 italic mt-1">"{ev.comments}"</p>
                      )}
                    </div>

                    <div className="flex items-center gap-4 border-t sm:border-t-0 border-gray-100 dark:border-gray-800 pt-3 sm:pt-0">
                      {/* Score Badge */}
                      <div className="flex flex-col items-center justify-center p-2.5 bg-green-50 dark:bg-green-950/30 rounded-2xl border border-green-100/50 dark:border-green-950/55 min-w-[70px]">
                        <span className="text-[9px] uppercase font-black text-green-600 dark:text-green-400 tracking-wider">Média</span>
                        <p className="text-lg font-black text-green-700 dark:text-green-400">{averageScore}</p>
                      </div>

                      {/* Action buttons */}
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => setViewingEvaluation(ev)}
                          className="px-3 py-2 bg-white dark:bg-gray-800 hover:bg-gray-100 text-gray-600 dark:text-gray-300 text-xs font-bold rounded-xl border border-gray-200 dark:border-gray-750 transition-all shadow-sm"
                        >
                          Ver
                        </button>
                        {canEvaluate && (
                          <>
                            <button
                              onClick={() => handleEditClick(ev)}
                              className="p-2 bg-white dark:bg-gray-800 hover:bg-gray-100 text-blue-500 rounded-xl border border-gray-200 dark:border-gray-750 transition-all shadow-sm"
                              title="Editar Avaliação"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm({ isOpen: true, id: ev.id })}
                              className="p-2 bg-white dark:bg-gray-800 hover:bg-red-50 text-red-500 rounded-xl border border-gray-200 dark:border-gray-750 transition-all shadow-sm"
                              title="Excluir Avaliação"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredEvaluations.length === 0 && (
                <div className="p-12 text-center text-gray-400 dark:text-gray-500 italic">
                  Nenhuma avaliação de desempenho cadastrada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const EXPENSE_CATEGORIES = [
  { value: 'OFICINAS', label: 'Oficinas', color: 'bg-emerald-500', colorTailwind: 'bg-emerald-500', text: 'text-emerald-700 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/40', border: 'border-emerald-200 dark:border-emerald-900/40', icon: Briefcase },
  { value: 'CAPACITACAO', label: 'Capacitação', color: 'bg-blue-500', colorTailwind: 'bg-blue-500', text: 'text-blue-700 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40', border: 'border-blue-200 dark:border-blue-900/40', icon: Award },
  { value: 'ESCRITORIO', label: 'Mat. Escritório', color: 'bg-indigo-500', colorTailwind: 'bg-indigo-500', text: 'text-indigo-700 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-950/40', border: 'border-indigo-200 dark:border-indigo-900/40', icon: Paperclip },
  { value: 'CAMPANHA', label: 'Lembrancinhas/Campanhas', color: 'bg-purple-500', colorTailwind: 'bg-purple-500', text: 'text-purple-700 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/40', border: 'border-purple-200 dark:border-purple-900/40', icon: Gift },
  { value: 'VIAGENS', label: 'Viagens e Diárias', color: 'bg-amber-500', colorTailwind: 'bg-amber-500', text: 'text-amber-700 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40', border: 'border-amber-200 dark:border-amber-900/40', icon: TrendingUp },
  { value: 'PROFISSIONAIS', label: 'Profissionais e Serviços', color: 'bg-rose-500', colorTailwind: 'bg-rose-500', text: 'text-rose-700 dark:text-rose-400', bg: 'bg-rose-50 dark:bg-rose-950/40', border: 'border-rose-200 dark:border-rose-900/40', icon: Users },
  { value: 'ROTINA', label: 'Gastos de Rotina', color: 'bg-orange-500', colorTailwind: 'bg-orange-500', text: 'text-orange-700 dark:text-orange-400', bg: 'bg-orange-50 dark:bg-orange-950/40', border: 'border-orange-200 dark:border-orange-900/40', icon: Clock },
  { value: 'GASOLINA', label: 'Gasolina', color: 'bg-yellow-500', colorTailwind: 'bg-yellow-500', text: 'text-amber-750 dark:text-amber-400', bg: 'bg-yellow-50/50 dark:bg-yellow-950/20', border: 'border-yellow-200 dark:border-yellow-900/40', icon: Activity },
  { value: 'OUTROS', label: 'Outras Despesas', color: 'bg-gray-400', text: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/40', border: 'border-gray-200 dark:border-gray-900/40', icon: DollarSign }
];

const INCOME_CATEGORIES = [
  { value: 'DOACAO', label: 'Doação', color: 'bg-green-500', text: 'text-green-700 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-950/40', border: 'border-green-200 dark:border-green-900/40' },
  { value: 'SOCIO', label: 'Sócio Mensal', color: 'bg-teal-500', text: 'text-teal-700 dark:text-teal-400', bg: 'bg-teal-50 dark:bg-teal-950/40', border: 'border-teal-200 dark:border-teal-900/40' },
  { value: 'SUBVENCAO', label: 'Subvenção Pública', color: 'bg-cyan-500', text: 'text-cyan-700 dark:text-cyan-400', bg: 'bg-cyan-50 dark:bg-cyan-950/44', border: 'border-cyan-200 dark:border-cyan-900/40' },
  { value: 'OUTROS', label: 'Outras Receitas', color: 'bg-gray-400', text: 'text-gray-700 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-950/40', border: 'border-gray-200 dark:border-gray-900/40' }
];

const getCategoryInfo = (categoryStr: string, type: 'RECEITA' | 'DESPESA') => {
  const normalized = (categoryStr || '').toUpperCase().trim();
  if (type === 'DESPESA') {
    const found = EXPENSE_CATEGORIES.find(c => c.value === normalized || c.label.toUpperCase() === normalized);
    return found || { label: categoryStr || 'Despesa', color: 'bg-gray-400', text: 'text-gray-750 dark:text-gray-300', bg: 'bg-gray-100 dark:bg-gray-800/60', border: 'border-gray-200 dark:border-gray-800' };
  } else {
    const found = INCOME_CATEGORIES.find(c => c.value === normalized || c.label.toUpperCase() === normalized);
    return found || { label: categoryStr || 'Receita', color: 'bg-green-500', text: 'text-green-700 dark:text-green-300', bg: 'bg-green-100 dark:bg-green-800/60', border: 'border-green-200 dark:border-green-800' };
  }
};

const FinancialSection = ({ financialRecords, user, showToast }: { 
  financialRecords?: FinancialRecord[], 
  user: User,
  showToast: (msg: string, type?: 'success' | 'error') => void 
}) => {
  const records = financialRecords || [];

  // Helper to format stored date string to Brazilian layout without timezone shifting issues
  const formatFinancialDate = (dateStr: string) => {
    if (!dateStr) return '';
    const dateOnly = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr;
    const parts = dateOnly.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // Helper to get present client local date as YYYY-MM-DD
  const getTodayLocalDate = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [formData, setFormData] = useState({
    date: getTodayLocalDate(),
    description: '',
    amount: '',
    type: 'RECEITA' as 'RECEITA' | 'DESPESA',
    category: ''
  });

  // Edit and deletion states
  const [editingRecord, setEditingRecord] = useState<any | null>(null);
  const [deletingRecord, setDeletingRecord] = useState<any | null>(null);

  // Gemini & Invoice states
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analyzingStatus, setAnalyzingStatus] = useState('');
  const [selectedInvoiceImage, setSelectedInvoiceImage] = useState<string | null>(null);
  const [selectedInvoiceTitle, setSelectedInvoiceTitle] = useState('');
  const [selectedInvoiceRecord, setSelectedInvoiceRecord] = useState<any | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingRecord(null);
    setFormData({
      date: getTodayLocalDate(),
      description: '',
      amount: '',
      type: 'RECEITA',
      category: ''
    });
  };

  const handleEditClick = (item: any) => {
    setEditingRecord(item);
    setFormData({
      date: item.date || getTodayLocalDate(),
      description: item.description || '',
      amount: String(item.amount || ''),
      type: (item.type || 'RECEITA') as 'RECEITA' | 'DESPESA',
      category: item.category || ''
    });
    setIsModalOpen(true);
  };

  const handleDeleteRecord = async () => {
    if (!deletingRecord) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'financial', deletingRecord.id));
      showToast('Lançamento financeiro excluído com sucesso!');
      setDeletingRecord(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `financial/${deletingRecord.id}`);
      showToast('Erro ao excluir lançamento financeiro.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveInvoiceImage = async (record: any) => {
    if (!window.confirm("Deseja realmente remover a Nota Fiscal anexa a este lançamento?")) return;
    setLoading(true);
    try {
      await updateDoc(doc(db, 'financial', record.id), {
        invoiceImage: deleteField(),
        invoiceFileName: deleteField(),
        updatedAt: new Date().toISOString(),
        updatedBy: user.id
      });
      showToast('Nota Fiscal removida com sucesso!');
      setSelectedInvoiceImage(null);
      setSelectedInvoiceRecord(null);
    } catch (err) {
      console.error("Remove invoice error:", err);
      showToast('Erro ao remover nota fiscal.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveRecord = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description || !formData.amount || !formData.category) {
      showToast('Por favor, preencha todos os campos.', 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingRecord) {
        const cleaned = cleanData({
          ...formData,
          amount: Number(formData.amount),
          createdBy: editingRecord.createdBy || user.id,
          createdAt: editingRecord.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          updatedBy: user.id
        });
        const financialData = {
          ...cleaned,
          invoiceImage: editingRecord.invoiceImage ? editingRecord.invoiceImage : deleteField(),
          invoiceFileName: editingRecord.invoiceFileName ? editingRecord.invoiceFileName : deleteField()
        };
        await updateDoc(doc(db, 'financial', editingRecord.id), financialData);
        showToast('Lançamento financeiro atualizado com sucesso!');
      } else {
        const financialData = cleanData({
          ...formData,
          amount: Number(formData.amount),
          createdAt: new Date().toISOString(),
          createdBy: user.id
        });
        await addDoc(collection(db, 'financial'), financialData);
        showToast('Lançamento financeiro salvo com sucesso!');
      }
      handleCloseModal();
    } catch (err) {
      if (editingRecord) {
        handleFirestoreError(err, OperationType.UPDATE, `financial/${editingRecord.id}`);
        showToast('Erro ao atualizar lançamento financeiro.', 'error');
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'financial');
        showToast('Erro ao salvar lançamento financeiro.', 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleInvoiceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAnalyzing(true);
    setAnalyzingStatus('Lendo imagem da Nota Fiscal...');

    try {
      const reader = new FileReader();
      const loadPromise = new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (err) => reject(err);
      });
      reader.readAsDataURL(file);
      const base64Str = await loadPromise;

      setAnalyzingStatus('Reduzindo tamanho do arquivo...');
      const compressedBase64 = await compressImage(base64Str, 1024, 1024, 0.65);

      setAnalyzingStatus('Analisando Nota com Gemini Smart IA...');
      const analysisResult = await analyzeInvoice(compressedBase64, file.type);

      if (!analysisResult) {
        showToast('Não foi possível identificar a nota de forma nítida. Tente outra imagem.', 'error');
        setIsAnalyzing(false);
        return;
      }

      setAnalyzingStatus('Lançando despesa automaticamente no sistema...');
      const financialData = cleanData({
        date: analysisResult.date || getTodayLocalDate(),
        description: analysisResult.description,
        amount: Number(analysisResult.amount),
        type: analysisResult.type || 'DESPESA',
        category: (analysisResult.category || 'OUTROS').toUpperCase(),
        invoiceImage: compressedBase64,
        invoiceFileName: file.name,
        createdAt: new Date().toISOString(),
        createdBy: user.id
      });

      await addDoc(collection(db, 'financial'), financialData);
      showToast(`Sucesso! Contabilizado R$ ${analysisResult.amount.toLocaleString('pt-BR')} (${analysisResult.description})`, 'success');
    } catch (err: any) {
      console.error("Scanning Error:", err);
      showToast('Não foi possível processar a imagem. Erro no OCR automático.', 'error');
    } finally {
      setIsAnalyzing(false);
      setAnalyzingStatus('');
      if (e.target) e.target.value = '';
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
      if (!r.date || typeof r.date !== 'string') return;
      const monthKey = r.date.substring(0, 7);
      const monthData = last6Months.find(m => m.monthKey === monthKey);
      if (monthData) {
        if (r.type === 'RECEITA') monthData.receitas += r.amount;
        else monthData.despesas += r.amount;
      }
    });

    return last6Months;
  }, [records]);

  const [selectedMonthFilter, setSelectedMonthFilter] = useState('all');

  const availableMonths = useMemo(() => {
    const list = new Set<string>();
    records.forEach(r => {
      if (r.date && r.date.length >= 7) {
        list.add(r.date.substring(0, 7)); // YYYY-MM
      }
    });
    const currentCal = format(new Date(), 'yyyy-MM');
    list.add(currentCal);
    list.add("2025-12");

    const sorted = Array.from(list).sort().reverse();
    return sorted;
  }, [records]);

  const filteredRecords = useMemo(() => {
    if (selectedMonthFilter === 'all') {
      return records;
    }
    return records.filter(r => r.date && r.date.startsWith(selectedMonthFilter));
  }, [records, selectedMonthFilter]);

  const monthlySummary = useMemo(() => {
    const targetRecords = selectedMonthFilter === 'all' ? records : filteredRecords;
    const receitas = targetRecords.filter(r => r.type === 'RECEITA').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const despesas = targetRecords.filter(r => r.type === 'DESPESA').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [records, selectedMonthFilter, filteredRecords]);

  const overallBalance = useMemo(() => {
    const receitas = records.filter(r => r.type === 'RECEITA').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    const despesas = records.filter(r => r.type === 'DESPESA').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
    return { receitas, despesas, saldo: receitas - despesas };
  }, [records]);

  const recordsWithInvoice = useMemo(() => {
    return records.filter((r: any) => !!r.invoiceImage);
  }, [records]);

  const generateFinancialDoc = async (fileFormat: 'pdf' | 'doc' | 'xls') => {
    setExporting(true);
    try {
      const activeMonthName = selectedMonthFilter === 'all' 
        ? 'Todos os Períodos' 
        : (() => {
            const parts = selectedMonthFilter.split('-');
            const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
            const formatted = format(dateObj, 'MMMM \'de\' yyyy', { locale: ptBR });
            return formatted.charAt(0).toUpperCase() + formatted.slice(1);
          })();

      const columns = ['Data', 'Descrição', 'Categoria', 'Tipo', 'Valor'];
      const sortedRecords = [...filteredRecords].sort((a, b) => (a.date || '').localeCompare(b.date || ''));

      const data = sortedRecords.map(r => {
        const catInfo = getCategoryInfo(r.category, r.type);
        return [
          formatFinancialDate(r.date),
          r.description,
          catInfo.label,
          r.type === 'RECEITA' ? 'RECEITA (+)' : 'DESPESA (-)',
          `R$ ${Number(r.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
        ];
      });

      const sReceitas = filteredRecords.filter(r => r.type === 'RECEITA').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const sDespesas = filteredRecords.filter(r => r.type === 'DESPESA').reduce((acc, curr) => acc + Number(curr.amount || 0), 0);
      const sSaldo = sReceitas - sDespesas;

      data.push([]); // spacer row
      data.push([
        'TOTAIS',
        'Resumo do Período',
        '-',
        '-',
        `R$ ${sSaldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      data.push([
        '-',
        'Total Receitas',
        '-',
        '-',
        `R$ ${sReceitas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);
      data.push([
        '-',
        'Total Despesas',
        '-',
        '-',
        `R$ ${sDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      ]);

      const title = 'Livro Caixa - Relatório Financeiro';
      const subtitle = `Livro de Registros - Período: ${activeMonthName} - Gerado em ${new Date().toLocaleDateString('pt-BR')}`;
      const fileName = `livro_caixa_financeiro_${selectedMonthFilter}`;

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

      {/* Dashboard de Despesas por Categoria */}
      {(() => {
        const targetRecordsForDashboard = filteredRecords;
        const totalDespesas = targetRecordsForDashboard
          .filter(r => r.type === 'DESPESA')
          .reduce((acc, curr) => acc + Number(curr.amount || 0), 0);

        // Auditoria de erros e inconsistencias nos lancamentos
        const auditErrors: Array<{
          id: string;
          description: string;
          date: string;
          amount: number;
          type: string;
          message: string;
          field: string;
        }> = [];

        filteredRecords.forEach(r => {
          const amt = Number(r.amount);
          const desc = (r.description || '').trim();
          const cat = (r.category || '').trim();
          
          if (!desc) {
            auditErrors.push({
              id: r.id || '',
              description: '(Sem Descrição)',
              date: r.date || 'N/A',
              amount: amt || 0,
              type: r.type || 'DESPESA',
              message: 'Lançamento sem descrição descritiva.',
              field: 'description'
            });
          }
          
          if (isNaN(amt) || amt <= 0) {
            auditErrors.push({
              id: r.id || '',
              description: desc || 'Sem descrição',
              date: r.date || 'N/A',
              amount: amt || 0,
              type: r.type || 'DESPESA',
              message: `Valor inválido, zerado ou negativo: R$ ${r.amount || 0}.`,
              field: 'amount'
            });
          }

          if (!r.date || r.date.trim() === '') {
            auditErrors.push({
              id: r.id || '',
              description: desc || 'Sem descrição',
              date: 'Data ausente',
              amount: amt || 0,
              type: r.type || 'DESPESA',
              message: 'Data não informada no lançamento.',
              field: 'date'
            });
          }

          if (r.type !== 'RECEITA' && r.type !== 'DESPESA') {
            auditErrors.push({
              id: r.id || '',
              description: desc || 'Sem descrição',
              date: r.date || 'N/A',
              amount: amt || 0,
              type: r.type || 'DESPESA',
              message: `Tipo inválido (${r.type || 'N/A'}). Deve ser RECEITA ou DESPESA.`,
              field: 'type'
            });
          }
        });

        // Agrupador inteligente de categorias de Despesas solicitadas
        const getGroupForKey = (r: any) => {
          const cat = (r.category || '').toLowerCase();
          const desc = (r.description || '').toLowerCase();
          
          // 1. SALARIOS (Pagamento de salário)
          if (
            cat.includes('salário') || cat.includes('salario') || cat.includes('vencimento') || cat.includes('pagamento de salário') || cat.includes('pagamento de salario') || cat.includes('profissionais') ||
            desc.includes('salário') || desc.includes('salario') || desc.includes('vencimento') || desc.includes('pagamento de salário') || desc.includes('pagamento de salario') ||
            desc.includes('enfermeira') || desc.includes('psicóloga') || desc.includes('psicologa') || desc.includes('assistente social') || desc.includes('fisioterapeuta') || 
            desc.includes('técnico de produção') || desc.includes('tecnico de producao') || desc.includes('coordenadora') || desc.includes('social média') || desc.includes('social media') || 
            desc.includes('auxiliar administrativo') || desc.includes('motorista') || desc.includes('pedagoga') || desc.includes('projetista') || desc.includes('esteticista') ||
            desc.includes('auxiliar de produção') || desc.includes('auxiliar de producao')
          ) {
            return {
              key: 'SALARIOS',
              label: 'Pagamento de Salário',
              icon: Users,
              color: 'bg-rose-500',
              text: 'text-rose-700 dark:text-rose-400',
              bg: 'bg-rose-50 dark:bg-rose-950/40',
              border: 'border-rose-200 dark:border-rose-900/40'
            };
          }
          
          // 2. TRIBUTOS (Tributos e ISS)
          if (
            cat.includes('iss') || cat.includes('tributo') || cat.includes('encargo') || cat.includes('tarifa') || cat.includes('imposto') || cat.includes('banco') || cat.includes('taxa') ||
            desc.includes('iss') || desc.includes('tributo') || desc.includes('encargo') || desc.includes('tarifa') || desc.includes('imposto') || desc.includes('banco') || desc.includes('taxa') || desc.includes('pix')
          ) {
            return {
              key: 'TRIBUTOS',
              label: 'Tributos, ISS e Tarifas',
              icon: FileText,
              color: 'bg-amber-500',
              text: 'text-amber-700 dark:text-amber-400',
              bg: 'bg-amber-50 dark:bg-amber-950/40',
              border: 'border-amber-200 dark:border-amber-900/40'
            };
          }

          // 3. FORMACOES (Formações e Viagens)
          if (
            cat.includes('viagem') || cat.includes('passagem') || cat.includes('hospedagem') || cat.includes('hotel') || cat.includes('formação') || cat.includes('formacao') || cat.includes('capacitação') || cat.includes('capacitacao') ||
            desc.includes('viagem') || desc.includes('passagem') || desc.includes('hospedagem') || desc.includes('hotel') || desc.includes('formação') || desc.includes('formacao') || desc.includes('capacitação') || desc.includes('capacitacao') || desc.includes('vôo') || desc.includes('voo')
          ) {
            return {
              key: 'FORMACOES',
              label: 'Formações e Viagens',
              icon: Award,
              color: 'bg-blue-500',
              text: 'text-blue-700 dark:text-blue-400',
              bg: 'bg-blue-50 dark:bg-blue-950/40',
              border: 'border-blue-200 dark:border-blue-900/40'
            };
          }

          // 4. COMPRAS (Compras e Insumos)
          if (
            cat.includes('compra') || cat.includes('insumo') || cat.includes('material') || cat.includes('escritório') || cat.includes('escritorio') || cat.includes('móvel') || cat.includes('movel') || cat.includes('equipamento') || cat.includes('vidro') || cat.includes('oficina') || cat.includes('personalizado') || cat.includes('camiseta') || cat.includes('folders') ||
            desc.includes('compra') || desc.includes('insumo') || desc.includes('material') || desc.includes('escritório') || desc.includes('escritorio') || desc.includes('móvel') || desc.includes('movel') || desc.includes('equipamento') || desc.includes('vidro') || desc.includes('oficina') || desc.includes('personalizado') || desc.includes('camiseta') || desc.includes('folder') || desc.includes('folders')
          ) {
            return {
              key: 'COMPRAS',
              label: 'Compras e Insumos',
              icon: Package,
              color: 'bg-indigo-500',
              text: 'text-indigo-700 dark:text-indigo-400',
              bg: 'bg-indigo-50 dark:bg-indigo-950/40',
              border: 'border-indigo-200 dark:border-indigo-900/40'
            };
          }

          // 5. SERVICOS (Serviços e Manutenção)
          if (
            cat.includes('serviço') || cat.includes('servico') || cat.includes('assessoria') || cat.includes('consultoria') || cat.includes('projeto') || cat.includes('manutenção') || cat.includes('manutencao') || cat.includes('reforma') || cat.includes('conta') || cat.includes('pacote') || cat.includes('frete') ||
            desc.includes('serviço') || desc.includes('servico') || desc.includes('assessoria') || desc.includes('consultoria') || desc.includes('projeto') || desc.includes('manutenção') || desc.includes('manutencao') || desc.includes('reforma') || desc.includes('conta') || desc.includes('pacote') || desc.includes('frete')
          ) {
            return {
              key: 'SERVICOS',
              label: 'Serviços e Manutenção',
              icon: Briefcase,
              color: 'bg-emerald-500',
              text: 'text-emerald-700 dark:text-emerald-400',
              bg: 'bg-emerald-50 dark:bg-emerald-950/40',
              border: 'border-emerald-200 dark:border-emerald-900/40'
            };
          }

          // 6. OUTROS
          return {
            key: 'OUTROS',
            label: 'Outras Despesas',
            icon: DollarSign,
            color: 'bg-gray-400',
            text: 'text-gray-700 dark:text-gray-400',
            bg: 'bg-gray-50 dark:bg-gray-950/40',
            border: 'border-gray-200 dark:border-gray-900/40'
          };
        };

        const dynamicCategoriesMap = new Map<string, { label: string, amount: number, style: any }>();

        targetRecordsForDashboard.forEach(r => {
          if (r.type === 'DESPESA') {
            const amt = Number(r.amount || 0);
            const styleInfo = getGroupForKey(r);
            
            if (dynamicCategoriesMap.has(styleInfo.key)) {
              const existing = dynamicCategoriesMap.get(styleInfo.key)!;
              existing.amount += amt;
            } else {
              dynamicCategoriesMap.set(styleInfo.key, {
                label: styleInfo.label,
                amount: amt,
                style: styleInfo
              });
            }
          }
        });

        let displayCategories: Array<{
          value: string,
          label: string,
          amount: number,
          icon: any,
          color: string,
          text: string,
          bg: string,
          border: string,
          colorTailwind?: string
        }> = [];

        dynamicCategoriesMap.forEach((data, key) => {
          displayCategories.push({
            value: key,
            label: data.label,
            amount: data.amount,
            icon: data.style.icon,
            color: data.style.color,
            text: data.style.text,
            bg: data.style.bg,
            border: data.style.border,
            colorTailwind: data.style.color
          });
        });

        // Ordenar por maior valor para dar destaque aos principais custos
        displayCategories.sort((a, b) => b.amount - a.amount);

        return (
          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800 space-y-6">
            {/* Panel de Auditoria e Erros se houver inconsistencias */}
            {auditErrors.length > 0 && (
              <div className="p-5 bg-amber-50/70 dark:bg-amber-950/15 border border-amber-200 dark:border-amber-900/40 rounded-3xl space-y-3">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 bg-amber-500 text-white rounded-lg">
                    <AlertTriangle size={18} />
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-amber-800 dark:text-amber-300">
                      ⚠️ {auditErrors.length} inconsistência(s) detectada(s) para correção
                    </h4>
                    <p className="text-xs text-amber-600/90 dark:text-amber-400/80">
                      Alguns registros possuem problemas de preenchimento que podem distorcer as somas e o balanço financeiro. Corrija-os na tabela de lançamentos abaixo.
                    </p>
                  </div>
                </div>
                <div className="max-h-40 overflow-y-auto divide-y divide-amber-100 dark:divide-amber-900/30 text-xs pl-8">
                  {auditErrors.map((err, idx) => (
                    <div key={idx} className="py-2 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1">
                      <div>
                        <span className="font-mono text-[10px] bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-200 px-1.5 py-0.5 rounded mr-2">
                          {err.date}
                        </span>
                        <strong className="text-gray-700 dark:text-gray-300">{err.description}</strong>
                        <span className="text-amber-600 dark:text-amber-400 ml-1.5">• {err.message}</span>
                      </div>
                      <div className="text-gray-500 font-mono text-[10px]">
                        ID: {err.id ? err.id.slice(0, 8) + '...' : 'Sem ID'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
              <div>
                <h3 className="text-xl font-bold text-gray-800 dark:text-white flex items-center gap-1.5">
                  <LayoutDashboard className="text-indigo-600" size={24} />
                  Dashboard de Despesas por Categoria
                </h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Percentual de impacto e somas acumuladas de todas as categorias ativas.</p>
              </div>
              <div className="px-4 py-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-bold border border-red-100 dark:border-red-900/30">
                Total Geral Saídas: R$ {totalDespesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {displayCategories.map(cat => {
                const sum = cat.amount;
                const pct = totalDespesas > 0 ? (sum / totalDespesas) * 100 : 0;
                const IconComp = cat.icon;

                return (
                  <div key={cat.value} className="p-5 rounded-3xl border border-gray-150/50 dark:border-gray-800 bg-gray-50/40 dark:bg-gray-950/20 hover:border-gray-250 dark:hover:border-gray-700 hover:shadow-sm transition-all flex flex-col justify-between" id={`cat-card-${cat.value}`}>
                    <div className="flex justify-between items-start mb-3">
                      <div className={`p-2.5 rounded-2xl ${cat.bg} ${cat.text}`}>
                        <IconComp size={18} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 font-mono">
                        {pct.toFixed(1)}% das saídas
                      </span>
                    </div>
                    <div>
                      <p className="text-[11px] font-extrabold text-gray-400 dark:text-gray-500 uppercase tracking-widest truncate" title={cat.label}>
                        {cat.label}
                      </p>
                      <h4 className={`text-lg font-black mt-1 ${sum > 0 ? 'text-gray-800 dark:text-white' : 'text-gray-400 dark:text-gray-600'}`}>
                        R$ {sum.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </h4>

                      {/* Progress bar */}
                      <div className="w-full bg-gray-100 dark:bg-gray-800 h-1.5 rounded-full mt-3 overflow-hidden">
                        <div 
                          className={`h-full ${cat.colorTailwind || cat.color} rounded-full transition-all duration-500`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8 pb-4 border-b border-gray-50 dark:border-gray-800">
            <div>
              <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Gestão Financeira</h2>
              <p className="text-xs text-gray-400 dark:text-gray-500">Filtrado por período ou consolidado.</p>
            </div>
            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
              {/* Filtro de Mês/Período */}
              <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-850 px-3 py-2 rounded-xl border border-gray-250/50 dark:border-gray-700">
                <Calendar size={14} className="text-gray-500" />
                <select
                  value={selectedMonthFilter}
                  onChange={e => setSelectedMonthFilter(e.target.value)}
                  className="bg-transparent border-none text-xs font-bold text-gray-750 dark:text-gray-250 outline-none cursor-pointer focus:ring-0"
                >
                  <option value="all">Todos os Meses</option>
                  {availableMonths.map(m => {
                    const parts = m.split('-');
                    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
                    const formatted = format(dateObj, "MMMM 'de' yyyy", { locale: ptBR });
                    const capitalized = formatted.charAt(0).toUpperCase() + formatted.slice(1);
                    return (
                      <option key={m} value={m}>
                        {capitalized}
                      </option>
                    );
                  })}
                </select>
              </div>

              <button 
                onClick={() => {
                  setEditingRecord(null);
                  setIsModalOpen(true);
                }}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-md hover:bg-green-700 transition-colors"
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
                      {editingRecord ? <Edit2 className="text-blue-600" /> : <Plus className="text-green-600" />}
                      {editingRecord ? 'Editar Lançamento' : 'Novo Lançamento'}
                    </h3>
                    <button onClick={handleCloseModal} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
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
                      <select
                        className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-850 dark:text-white"
                        value={formData.category}
                        onChange={e => setFormData({...formData, category: e.target.value})}
                      >
                        <option value="">Selecione uma categoria...</option>
                        {formData.type === 'RECEITA' ? (
                          <>
                            <option value="DOACAO">Doação</option>
                            <option value="SOCIO">Sócio Mensal</option>
                            <option value="SUBVENCAO">Subvenção Pública</option>
                            <option value="OUTROS">Outras Receitas</option>
                            {formData.category && !['DOACAO', 'SOCIO', 'SUBVENCAO', 'OUTROS'].includes(formData.category.toUpperCase()) && (
                              <option value={formData.category}>{formData.category}</option>
                            )}
                          </>
                        ) : (
                          <>
                            <option value="OFICINAS">Oficinas / Gastos com Oficinas</option>
                            <option value="CAPACITACAO">Capacitação</option>
                            <option value="ESCRITORIO">Materiais de Escritório</option>
                            <option value="CAMPANHA">Lembrancinhas / Campanhas</option>
                            <option value="VIAGENS">Viagens e Diárias</option>
                            <option value="PROFISSIONAIS">Profissionais e Serviços</option>
                            <option value="ROTINA">Gastos de Rotina / Manutenção</option>
                            <option value="GASOLINA">Gasolina / Combustível</option>
                            <option value="OUTROS">Outras Despesas</option>
                            {formData.category && !['OFICINAS', 'CAPACITACAO', 'ESCRITORIO', 'CAMPANHA', 'VIAGENS', 'PROFISSIONAIS', 'ROTINA', 'GASOLINA', 'OUTROS'].includes(formData.category.toUpperCase()) && (
                              <option value={formData.category}>{formData.category}</option>
                            )}
                          </>
                        )}
                      </select>
                    </div>

                    {editingRecord && editingRecord.invoiceImage && (
                      <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500">Nota Fiscal em Anexo</label>
                        <div className="p-3 bg-gray-50 dark:bg-gray-800/50 border border-gray-150 dark:border-gray-700/60 rounded-xl flex items-center justify-between">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <Paperclip size={14} className="text-green-600 flex-shrink-0" />
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 truncate">
                              {editingRecord.invoiceFileName || 'Comprovante anexo'}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={async () => {
                              if (confirm("Remover o anexo de Nota Fiscal associado a este lançamento?")) {
                                try {
                                  await updateDoc(doc(db, 'financial', editingRecord.id), {
                                    invoiceImage: deleteField(),
                                    invoiceFileName: deleteField(),
                                    updatedAt: new Date().toISOString(),
                                    updatedBy: user.id
                                  });
                                  showToast('Nota Fiscal removida!');
                                  setEditingRecord({
                                    ...editingRecord,
                                    invoiceImage: null,
                                    invoiceFileName: null
                                  });
                                } catch(e) {
                                  showToast('Erro ao remover nota fiscal.', 'error');
                                }
                              }
                            }}
                            className="p-1 text-red-650 hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 rounded transition-colors"
                            title="Remover Nota Fiscal"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    )}

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
                        onClick={handleCloseModal}
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
                  <th className="pb-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                {filteredRecords.map((item: any) => {
                  const catInfo = getCategoryInfo(item.category, item.type);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                      <td className="py-4 text-sm text-gray-600 dark:text-gray-400">{formatFinancialDate(item.date)}</td>
                      <td className="py-4 text-sm font-medium text-gray-800 dark:text-white">
                        <div className="flex items-center gap-2">
                          <span>{item.description}</span>
                          {item.invoiceImage && (
                            <button
                              onClick={() => {
                                setSelectedInvoiceImage(item.invoiceImage);
                                setSelectedInvoiceTitle(`${item.description} - R$ ${item.amount.toLocaleString('pt-BR')}`);
                                setSelectedInvoiceRecord(item);
                              }}
                              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors text-green-600 hover:text-green-700 flex items-center"
                              title="Ver Nota Fiscal Anexa (Presidente & Auxiliar)"
                            >
                              <Paperclip size={13} />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-4">
                        <span className={cn(
                          "px-2.5 py-1 text-[10px] font-bold rounded-full border uppercase tracking-wider",
                          catInfo.text,
                          catInfo.bg,
                          catInfo.border || 'border-transparent'
                        )}>
                          {catInfo.label}
                        </span>
                      </td>
                      <td className={cn(
                        "py-4 text-sm font-bold text-right",
                        item.type === 'RECEITA' ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400"
                      )}>
                        {item.type === 'RECEITA' ? '+' : '-'} R$ {item.amount.toLocaleString('pt-BR')}
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex justify-end items-center gap-1.5">
                          <button
                            onClick={() => handleEditClick(item)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center"
                            title="Editar"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            onClick={() => setDeletingRecord(item)}
                            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-600 hover:text-red-750 transition-colors flex items-center justify-center"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {records.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-400 dark:text-gray-500 italic">Nenhum registro financeiro encontrado.</td>
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
              Digitalização de Notas Fiscais
            </h3>
            <div className="space-y-4">
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={handleInvoiceUpload}
                accept="image/*"
                className="hidden" 
              />
              
              <div 
                onClick={() => !isAnalyzing && fileInputRef.current?.click()}
                className={cn(
                  "border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-2xl p-8 text-center transition-all cursor-pointer group",
                  isAnalyzing ? "bg-gray-50 dark:bg-gray-800/50 border-green-350 cursor-not-allowed" : "hover:border-green-400"
                )}
              >
                {isAnalyzing ? (
                  <div className="flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="animate-spin text-green-600" size={36} />
                    <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Inteligência Artificial Ativa</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 italic animate-pulse">{analyzingStatus}</p>
                  </div>
                ) : (
                  <>
                    <Upload className="mx-auto text-gray-400 group-hover:text-green-600 mb-2" size={32} />
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Clique para selecionar Notas Fiscais</p>
                    <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-1">Lançamento e cálculo automático via Gemini da imagem</p>
                  </>
                )}
              </div>
              
              {/* Image Preview List */}
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wide">Notas Digitalizadas Recentes</p>
                <div className="grid grid-cols-1 gap-2">
                  {recordsWithInvoice.slice(0, 3).map((r: any) => (
                    <div 
                      key={r.id}
                      onClick={() => {
                        setSelectedInvoiceImage(r.invoiceImage);
                        setSelectedInvoiceTitle(`${r.description} - R$ ${r.amount.toLocaleString('pt-BR')}`);
                      }}
                      className="p-3 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 flex items-center gap-3 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-750 transition-all select-none group"
                    >
                      <div className="w-10 h-10 bg-white dark:bg-gray-900 rounded-lg flex items-center justify-center shadow-sm relative overflow-hidden flex-shrink-0">
                        <img src={r.invoiceImage} alt={r.description} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <Eye size={12} className="text-white" />
                        </div>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-gray-800 dark:text-white truncate">{r.description}</p>
                        <p className="text-[10px] text-red-600 dark:text-red-400 font-bold">R$ {r.amount.toLocaleString('pt-BR')}</p>
                        <p className="text-[9px] text-gray-400 dark:text-gray-500">{new Date(r.date || r.createdAt).toLocaleDateString('pt-BR')}</p>
                      </div>
                    </div>
                  ))}
                  
                  {recordsWithInvoice.length === 0 && (
                    <div className="text-center py-4 text-xs text-gray-400 dark:text-gray-500 italic bg-gray-50/50 dark:bg-gray-800/30 rounded-xl">
                      Nenhuma nota digitalizada armazenada.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-900 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-gray-800">
            {(() => {
              const activeMonthLabel = selectedMonthFilter === 'all' 
                ? 'Todos os Meses' 
                : (() => {
                    const parts = selectedMonthFilter.split('-');
                    const dateObj = new Date(Number(parts[0]), Number(parts[1]) - 1, 1);
                    const formatted = format(dateObj, "MMMM 'de' yyyy", { locale: ptBR });
                    return formatted.charAt(0).toUpperCase() + formatted.slice(1);
                  })();
              return (
                <>
                  <h3 className="font-bold text-gray-800 dark:text-white mb-6">Resumo - {activeMonthLabel}</h3>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-xl">
                        <TrendingUp size={20} />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Receitas</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">R$ {monthlySummary.receitas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl">
                        <TrendingUp size={20} className="rotate-180" />
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Despesas</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">R$ {monthlySummary.despesas.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                    </div>
                    <div className="pt-6 border-t border-gray-100 dark:border-gray-800 flex justify-between items-center">
                      <div>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-extrabold">Saldo do Período</p>
                        <p className={cn(
                          "text-2xl font-black mt-1",
                          monthlySummary.saldo >= 0 ? "text-green-600 dark:text-green-400" : "text-red-650"
                        )}>R$ {monthlySummary.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                      </div>
                      {selectedMonthFilter !== 'all' && (
                        <div className="text-right">
                          <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase tracking-wider font-extrabold">Fluxo Acumulado Geral</p>
                          <p className="text-sm font-bold text-gray-700 dark:text-gray-300 mt-1">R$ {overallBalance.saldo.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                        </div>
                      )}
                    </div>
                  </div>
                </>
              );
            })()}
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

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingRecord && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-left"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle size={32} />
                <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir o lançamento de <strong className="text-gray-900 dark:text-white">"{deletingRecord.description}"</strong> no valor de <strong className="text-gray-900 dark:text-white">R$ {deletingRecord.amount.toLocaleString('pt-BR')}</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeletingRecord(null)}
                  disabled={loading}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteRecord}
                  disabled={loading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lightbox Modal overlay for private scanned invoice receipts */}
      <AnimatePresence>
        {selectedInvoiceImage && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedInvoiceImage(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[70] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-2xl p-6 shadow-2xl relative overflow-hidden"
            >
              <div className="flex justify-between items-center mb-4 pb-2 border-b border-gray-100 dark:border-gray-800">
                <h4 className="font-bold text-gray-800 dark:text-white text-md truncate pr-4">{selectedInvoiceTitle || 'Anexo de Nota Fiscal'}</h4>
                <button 
                  onClick={() => setSelectedInvoiceImage(null)}
                  className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors"
                >
                  <X size={20} className="text-gray-400 hover:text-gray-600" />
                </button>
              </div>
              <div className="flex justify-center items-center max-h-[70vh] overflow-y-auto bg-gray-50 dark:bg-gray-950 rounded-2xl p-4">
                <img 
                  src={selectedInvoiceImage} 
                  alt="Nota Fiscal" 
                  className="max-w-full max-h-[60vh] object-contain rounded-xl shadow-md border border-gray-200/50 dark:border-gray-800/50" 
                  referrerPolicy="no-referrer"
                />
              </div>
              <div className="mt-4 flex flex-col sm:flex-row justify-between items-center gap-2 pt-2 border-t border-gray-100 dark:border-gray-800">
                <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">Visualização restrita ao setor financeiro (Presidente & Auxiliar Administrativo)</p>
                {selectedInvoiceRecord && (
                  <button
                    onClick={async () => {
                      if (confirm("Deseja realmente excluir a nota fiscal anexa a este lançamento financeiro? A imagem será desvinculada permanentemente.")) {
                        try {
                          await updateDoc(doc(db, 'financial', selectedInvoiceRecord.id), {
                            invoiceImage: deleteField(),
                            invoiceFileName: deleteField(),
                            updatedAt: new Date().toISOString(),
                            updatedBy: user.id
                          });
                          showToast('Nota fiscal excluída com sucesso!');
                          setSelectedInvoiceImage(null);
                          setSelectedInvoiceRecord(null);
                        } catch (err) {
                          console.error("Erro ao remover nota fiscal:", err);
                          showToast('Erro ao remover nota fiscal', 'error');
                        }
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-600 dark:bg-red-950/20 dark:text-red-400 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 size={13} />
                    Excluir Nota Fiscal
                  </button>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const DonorsSection = ({ donors, showToast }: { donors: Donor[]; showToast: any }) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editingDonor, setEditingDonor] = useState<Donor | null>(null);
  const [deletingDonor, setDeletingDonor] = useState<Donor | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    type: 'DOADOR' as 'DOADOR' | 'SOCIO_MENSAL',
    amount: 0,
    status: 'ATIVO' as 'ATIVO' | 'INATIVO',
    startDate: new Date().toISOString().split('T')[0]
  });

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingDonor(null);
    setFormData({
      name: '',
      email: '',
      phone: '',
      type: 'DOADOR',
      amount: 0,
      status: 'ATIVO',
      startDate: new Date().toISOString().split('T')[0]
    });
  };

  const handleEditClick = (donor: Donor) => {
    setEditingDonor(donor);
    setFormData({
      name: donor.name,
      email: donor.email || '',
      phone: donor.phone || '',
      type: donor.type,
      amount: donor.amount || 0,
      status: donor.status || 'ATIVO',
      startDate: donor.startDate || new Date().toISOString().split('T')[0]
    });
    setIsModalOpen(true);
  };

  const handleDeleteDonor = async () => {
    if (!deletingDonor) return;
    setLoading(true);
    try {
      await deleteDoc(doc(db, 'donors', deletingDonor.id));
      showToast('Cadastro de doador/sócio excluído com sucesso!');
      setDeletingDonor(null);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `donors/${deletingDonor.id}`);
      showToast('Erro ao excluir cadastro.', 'error');
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
      if (editingDonor) {
        const cleanedDonor = cleanData({
          ...formData,
          createdAt: editingDonor.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        await updateDoc(doc(db, 'donors', editingDonor.id), cleanedDonor);
        showToast('Cadastro de doador/sócio atualizado com sucesso!');
      } else {
        const cleanedDonor = cleanData({
          ...formData,
          createdAt: new Date().toISOString()
        });
        await addDoc(collection(db, 'donors'), cleanedDonor);
        showToast('Cadastro de doador/sócio realizado com sucesso!');
      }
      handleCloseModal();
    } catch (err) {
      if (editingDonor) {
        handleFirestoreError(err, OperationType.UPDATE, `donors/${editingDonor.id}`);
        showToast('Erro ao atualizar cadastro.', 'error');
      } else {
        handleFirestoreError(err, OperationType.CREATE, 'donors');
        showToast('Erro ao realizar cadastro.', 'error');
      }
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
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-gray-800 dark:text-white">Cadastro de Doadores e Sócios</h2>
          <p className="text-sm text-gray-500 mt-1">Gerenciamento e controle de sócios mensais e doadores eventuais da instituição.</p>
        </div>
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
            onClick={() => {
              setEditingDonor(null);
              setIsModalOpen(true);
            }}
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
                <h3 className="text-xl font-bold">
                  {editingDonor ? 'Editar Doador/Sócio' : 'Novo Doador/Sócio'}
                </h3>
                <button onClick={handleCloseModal} className="p-2 hover:bg-white/20 rounded-full transition-colors">
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
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">E-mail (Opcional)</label>
                    <input 
                      type="email" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Telefone (Opcional)</label>
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
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Valor da Contribuição (R$)</label>
                    <input 
                      type="number" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Status</label>
                    <select 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.status}
                      onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    >
                      <option value="ATIVO">Ativo</option>
                      <option value="INATIVO">Inativo</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-400 dark:text-gray-500 uppercase mb-2">Data de Início</label>
                    <input 
                      type="date" 
                      className="w-full p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
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
                    className="flex-1 px-6 py-3 bg-green-600 text-white font-bold rounded-xl shadow-lg hover:bg-green-700 transition-all disabled:opacity-50"
                  >
                    {loading ? 'Salvando...' : editingDonor ? 'Salvar Alterações' : 'Cadastrar'}
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
              <th className="p-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
            {(donors || []).map((donor) => (
              <tr key={donor.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                <td className="p-4">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{donor.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    Desde {donor.startDate ? new Date(donor.startDate + "T00:00:00").toLocaleDateString('pt-BR') : '-'}
                  </p>
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
                  <p className="text-xs text-gray-600 dark:text-gray-400">{donor.email || '-'}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{donor.phone || '-'}</p>
                </td>
                <td className="p-4 text-right">
                  <p className="text-sm font-bold text-gray-800 dark:text-white">{donor.amount ? `R$ ${donor.amount.toLocaleString('pt-BR')}` : '-'}</p>
                </td>
                <td className="p-4 text-center">
                  <span className={cn(
                    "px-2 py-1 text-[10px] font-bold rounded-full uppercase",
                    donor.status === 'ATIVO' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
                  )}>
                    {donor.status || 'ATIVO'}
                  </span>
                </td>
                <td className="p-4 text-right">
                  <div className="flex justify-end items-center gap-1.5">
                    <button
                      onClick={() => handleEditClick(donor)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-blue-600 hover:text-blue-700 transition-colors flex items-center justify-center"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    <button
                      onClick={() => setDeletingDonor(donor)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-red-600 hover:text-red-750 transition-colors flex items-center justify-center"
                      title="Excluir"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {donors.length === 0 && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-gray-500 dark:text-gray-400 italic">Nenhum doador cadastrado no banco de dados.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Seção de Resumo de Doações com Cálculos Automáticos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100/50 dark:border-blue-900/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-blue-600/70 dark:text-blue-400/70 uppercase tracking-wider mb-1">Doação Mensal (Sócios)</p>
            <h3 className="text-2xl font-black text-blue-900 dark:text-blue-300">
              R$ {totalMensal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-blue-500 dark:text-blue-400 font-medium mt-1">
              {donors.filter(d => d.type === 'SOCIO_MENSAL').length} sócios cadastrados
            </p>
          </div>
          <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100/50 dark:border-emerald-900/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider mb-1">Doação Eventual</p>
            <h3 className="text-2xl font-black text-emerald-950 dark:text-emerald-350">
              R$ {totalEventual.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-emerald-500 dark:text-emerald-400 font-medium mt-1">
              {donors.filter(d => d.type === 'DOADOR').length} doadores eventuais cadastrados
            </p>
          </div>
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <Heart size={24} />
          </div>
        </div>

        <div className="bg-purple-50/50 dark:bg-purple-900/10 p-6 rounded-3xl border border-purple-100/50 dark:border-purple-900/20 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-purple-600/70 dark:text-purple-400/70 uppercase tracking-wider mb-1">Total Geral</p>
            <h3 className="text-2xl font-black text-purple-900 dark:text-purple-300">
              R$ {totalGeral.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </h3>
            <p className="text-xs text-purple-500 dark:text-purple-400 font-medium mt-1">
              {donors.length} registros somados
            </p>
          </div>
          <div className="p-4 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-2xl">
            <TrendingUp size={24} />
          </div>
        </div>
      </div>

      {/* Deletion Confirmation Modal */}
      <AnimatePresence>
        {deletingDonor && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[60] flex items-center justify-center p-4 text-left">
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white dark:bg-gray-900 rounded-3xl w-full max-w-sm p-6 shadow-2xl space-y-4"
            >
              <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
                <AlertTriangle size={32} />
                <h3 className="text-xl font-bold">Confirmar Exclusão</h3>
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Tem certeza que deseja excluir o cadastro de <strong className="text-gray-900 dark:text-white">"{deletingDonor.name}"</strong>? Esta ação não pode ser desfeita.
              </p>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setDeletingDonor(null)}
                  disabled={loading}
                  className="flex-1 py-2 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400 font-bold rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleDeleteDonor}
                  disabled={loading}
                  className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl shadow-lg transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      Excluindo...
                    </>
                  ) : 'Confirmar'}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
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

const WorkshopsSection = ({ 
  workshops, 
  communityElderly, 
  caregivers, 
  elderly, 
  professionals = [], 
  showToast,
  user,
  sendNotification,
  notifyTaggedCoWorkers
}: { 
  workshops: Workshop[], 
  communityElderly: CommunityElderly[],
  caregivers: Caregiver[],
  elderly: Elderly[],
  professionals?: Professional[],
  showToast: (msg: string, type?: 'success' | 'error') => void;
  user: User;
  sendNotification: (notification: Omit<AppNotification, 'id' | 'read' | 'date'>) => Promise<void>;
  notifyTaggedCoWorkers?: (
    currentCoWorkers: string[],
    previousCoWorkers: string[],
    title: string,
    messageBuilder: (name: string) => string,
    activityId?: string,
    tipo?: string,
    rotaDestino?: string,
    link?: string
  ) => Promise<void>;
}) => {
  const [isElderlyModalOpen, setIsElderlyModalOpen] = useState(false);
  const [isCaregiverModalOpen, setIsCaregiverModalOpen] = useState(false);
  const [isWorkshopModalOpen, setIsWorkshopModalOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [selectedWorkshop, setSelectedWorkshop] = useState<Workshop | null>(null);
  const [editingWorkshop, setEditingWorkshop] = useState<Workshop | null>(null);
  const [loading, setLoading] = useState(false);
  const [showConfirm, setShowConfirm] = useState<{ msg: string; onConfirm: () => void } | null>(null);
  const [profSearch, setProfSearch] = useState('');
  
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
    howMuch: '',
    coWorkers: [] as string[],
    photos: [] as string[],
    documents: [] as Array<{ name: string; type: string; base64: string; size?: string }>
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
      const isNew = !editingWorkshop;
      const workshopData = cleanData({
        ...workshopFormData,
        registeredBy: auth.currentUser?.email || 'Sistema',
        professionalId: user?.id || ''
      });
      
      let recordId = '';
      if (editingWorkshop) {
        await updateDoc(doc(db, 'workshops', editingWorkshop.id), workshopData);
        recordId = editingWorkshop.id;
        showToast('Atividade em equipe atualizada com sucesso!');
      } else {
        const docRef = await addDoc(collection(db, 'workshops'), workshopData);
        recordId = docRef.id;
        showToast('Atividade em equipe registrada com sucesso!');
      }

      // Envia notificação interna automática para os profissionais adicionados
      try {
        const previousCoWorkers = editingWorkshop?.coWorkers || [];
        const currentCoWorkers = workshopFormData.coWorkers || [];
        
        if (notifyTaggedCoWorkers) {
          await notifyTaggedCoWorkers(
            currentCoWorkers,
            previousCoWorkers,
            'Nova Atividade em Conjunto',
            (name) => `Você foi adicionado como colaborador na atividade "${workshopFormData.title}" por ${user?.name || 'um colega'}.`,
            recordId,
            'workshops',
            'workshops'
          );
        }
      } catch (notifErr) {
        console.error("Erro ao enviar notificações:", notifErr);
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
        howMuch: '',
        coWorkers: [],
        photos: [],
        documents: []
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
      howMuch: w.howMuch || '',
      coWorkers: w.coWorkers || [],
      photos: w.photos || [],
      documents: w.documents || []
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
                  <button onClick={() => { setSelectedWorkshop(w); setIsDetailsModalOpen(true); }} className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-lg transition-colors" title="Visualizar 👁️">
                    <Eye size={14} />
                  </button>
                  <button onClick={() => handleEditWorkshop(w)} className="p-1.5 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors" title="Editar ✏️">
                    <Edit2 size={14} />
                  </button>
                  <button onClick={() => handleDeleteWorkshop(w.id)} className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors" title="Excluir 🗑️">
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

                {/* Seleção de Profissionais Co-Participantes (Equipe Multidisciplinar) */}
                <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30 space-y-4">
                  <div className="flex justify-between items-center">
                    <label className="text-xs font-bold text-emerald-850 dark:text-emerald-400 uppercase flex items-center gap-1.5">
                      <Users size={14} /> Equipe Co-participante (Multidisciplinar)
                    </label>
                    <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-300 font-bold px-2 py-0.5 rounded-full">
                      {workshopFormData.coWorkers?.length || 0} selecionado(s)
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Selecione outros profissionais do OAMI (Assistente Social, Psicóloga, Pedagoga, Enfermeira, etc.) que realizaram esta ação em conjunto.
                  </p>

                  {/* Search box */}
                  <div className="relative">
                    <input 
                      type="text"
                      placeholder="Buscar por nome do profissional ou cargo..."
                      className="w-full text-sm p-3 pr-10 bg-white dark:bg-gray-850 border border-emerald-100 dark:border-emerald-950 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 font-medium text-gray-800 dark:text-white"
                      value={profSearch}
                      onChange={e => setProfSearch(e.target.value)}
                    />
                    {profSearch && (
                      <button 
                        type="button"
                        onClick={() => setProfSearch('')}
                        className="absolute right-3 top-3 text-xs text-gray-400 hover:text-emerald-600 font-semibold"
                      >
                        Limpar
                      </button>
                    )}
                  </div>

                  {/* Filtered list */}
                  <div className="max-h-48 overflow-y-auto space-y-1.5 pr-2">
                    {(() => {
                      const queryClean = profSearch.toLowerCase().trim();
                      const filteredProfs = professionals.filter(p => {
                        // Exclude myself (who registered it) to keep interface intuitive
                        if (p.id === user?.id || p.email === user?.email) return false;
                        if (!queryClean) return true;
                        
                        const nameMatch = p.name.toLowerCase().includes(queryClean);
                        const roleMatch = (ROLE_LABELS[p.role] || p.role).toLowerCase().includes(queryClean);
                        return nameMatch || roleMatch;
                      });

                      if (filteredProfs.length === 0) {
                        return (
                          <p className="text-xs text-gray-400 dark:text-gray-500 py-4 text-center">
                            Nenhum outro profissional participante cadastrado.
                          </p>
                        );
                      }

                      return filteredProfs.map(p => {
                        const isChecked = (workshopFormData.coWorkers || []).includes(p.id) || (workshopFormData.coWorkers || []).includes(p.email);
                        return (
                          <label key={p.id} className="flex items-center gap-3 p-2.5 bg-white dark:bg-gray-800 hover:bg-emerald-50/50 dark:hover:bg-emerald-900/10 rounded-xl cursor-pointer transition-colors group border border-gray-50 dark:border-gray-750">
                            <input 
                              type="checkbox"
                              className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                              checked={isChecked}
                              onChange={() => {
                                const idToUse = p.id || p.email;
                                const originalCoWorkers = workshopFormData.coWorkers || [];
                                const newCoWorkers = isChecked
                                  ? originalCoWorkers.filter(id => id !== p.id && id !== p.email)
                                  : [...originalCoWorkers, idToUse];
                                setWorkshopFormData({...workshopFormData, coWorkers: newCoWorkers});
                              }}
                            />
                            <div className="flex-1 flex flex-col">
                              <span className="text-xs font-bold text-gray-700 dark:text-gray-200 group-hover:text-emerald-600 transition-colors">
                                {p.name}
                              </span>
                              <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
                                {ROLE_LABELS[p.role] || p.role}
                              </span>
                            </div>
                          </label>
                        );
                      });
                    })()}
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

                  {/* Mídia e Documentos do 5W2H */}
                  <div className="border-t border-green-150/50 dark:border-green-900/20 pt-6 space-y-4">
                    <h5 className="text-xs font-black text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-2">
                      <Paperclip size={14} /> Anexos e Mídia (5W2H)
                    </h5>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Carregar Mídia (Imagens) */}
                      <div className="space-y-3 bg-white dark:bg-gray-800/40 p-4 rounded-2xl border border-green-100/30">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">Mídias (Fotos)</span>
                        
                        <div className="flex flex-wrap gap-2">
                          {(workshopFormData.photos || []).map((p, idx) => (
                            <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border border-gray-150 dark:border-gray-750 group shrink-0">
                              <img src={p} alt="" className="w-full h-full object-cover" />
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (workshopFormData.photos || []).filter((_, i) => i !== idx);
                                  setWorkshopFormData({ ...workshopFormData, photos: updated });
                                }}
                                className="absolute top-1 right-1 p-0.5 bg-red-600 hover:bg-red-700 text-white rounded-full transition-colors"
                              >
                                <X size={10} />
                              </button>
                            </div>
                          ))}
                          
                          {(workshopFormData.photos || []).length < 6 && (
                            <button
                              type="button"
                              onClick={() => {
                                const input = document.createElement('input');
                                input.type = 'file';
                                input.accept = 'image/*';
                                input.multiple = true;
                                input.onchange = async (e: any) => {
                                  const files: File[] = Array.from(e.target.files || []);
                                  if (files.length === 0) return;
                                  
                                  const loaded: string[] = [];
                                  for (const file of files) {
                                    const base64 = await new Promise<string>((resolve) => {
                                      const reader = new FileReader();
                                      reader.onloadend = () => resolve(reader.result as string);
                                      reader.readAsDataURL(file);
                                    });
                                    try {
                                      const compressed = await compressImage(base64, 800, 800, 0.5);
                                      loaded.push(compressed);
                                    } catch (err) {
                                      loaded.push(base64); // fallback if compression fails
                                    }
                                  }
                                  setWorkshopFormData({
                                    ...workshopFormData,
                                    photos: [...(workshopFormData.photos || []), ...loaded].slice(0, 6)
                                  });
                                };
                                input.click();
                              }}
                              className="w-16 h-16 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-700 flex flex-col items-center justify-center text-gray-400 hover:text-green-600 hover:border-green-300 transition-colors"
                            >
                              <ImageIcon size={20} />
                              <span className="text-[9px] font-black uppercase mt-1">Add</span>
                            </button>
                          )}
                        </div>
                        <p className="text-[10px] text-gray-400 font-medium leading-relaxed">Arraste ou carregue até 6 fotos da oficina/capacitação.</p>
                      </div>

                      {/* Carregar Documentos (PDF, DOCX, etc.) */}
                      <div className="space-y-3 bg-white dark:bg-gray-800/40 p-4 rounded-2xl border border-green-100/30">
                        <span className="text-xs font-bold text-gray-500 dark:text-gray-400 block uppercase tracking-wider">Documentos (PDF, DOC, etc.)</span>
                        
                        <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                          {(workshopFormData.documents || []).map((doc, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-750 group">
                              <div className="flex items-center gap-2 min-w-0">
                                <FileText size={16} className="text-blue-500 shrink-0" />
                                <div className="min-w-0">
                                  <p className="text-xs font-bold text-gray-700 dark:text-gray-300 truncate max-w-[140px] md:max-w-[180px]" title={doc.name}>
                                    {doc.name}
                                  </p>
                                  <p className="text-[9px] text-gray-400 font-medium">{doc.size || 'N/A'}</p>
                                </div>
                              </div>
                              <button
                                type="button"
                                onClick={() => {
                                  const updated = (workshopFormData.documents || []).filter((_, i) => i !== idx);
                                  setWorkshopFormData({ ...workshopFormData, documents: updated });
                                }}
                                className="p-1 hover:bg-red-50 text-gray-400 hover:text-red-600 rounded-lg transition-colors"
                              >
                                <Trash2 size={12} />
                              </button>
                            </div>
                          ))}

                          {(!workshopFormData.documents || workshopFormData.documents.length === 0) && (
                            <p className="text-[10px] text-gray-400 italic py-2 text-center">Nenhum documento anexado.</p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => {
                            const input = document.createElement('input');
                            input.type = 'file';
                            input.accept = '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt';
                            input.multiple = true;
                            input.onchange = async (e: any) => {
                              const files: File[] = Array.from(e.target.files || []);
                              if (files.length === 0) return;

                              const loadedDocs: Array<{ name: string; type: string; base64: string; size?: string }> = [];
                              for (const file of files) {
                                if (file.size > 800 * 1024) {
                                  showToast(`O arquivo ${file.name} excede o limite de 800KB.`, 'error');
                                  continue;
                                }
                                const base64 = await new Promise<string>((resolve) => {
                                  const reader = new FileReader();
                                  reader.onloadend = () => resolve(reader.result as string);
                                  reader.readAsDataURL(file);
                                });
                                
                                const formattedSize = file.size > 1024 * 1024 
                                  ? `${(file.size / (1024 * 1024)).toFixed(1)} MB`
                                  : `${(file.size / 1024).toFixed(0)} KB`;

                                loadedDocs.push({
                                  name: file.name,
                                  type: file.type || file.name.split('.').pop() || '',
                                  base64,
                                  size: formattedSize
                                });
                              }

                              setWorkshopFormData({
                                ...workshopFormData,
                                documents: [...(workshopFormData.documents || []), ...loadedDocs]
                              });
                            };
                            input.click();
                          }}
                          className="w-full py-2.5 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-xs font-black text-gray-500 hover:text-blue-600 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Upload size={14} />
                          Anexar Documento (PDF, Word, etc.)
                        </button>
                      </div>
                    </div>
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

                {selectedWorkshop.coWorkers && selectedWorkshop.coWorkers.length > 0 && (
                  <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl md:col-span-2 border border-emerald-100/40 dark:border-emerald-900/10">
                    <p className="text-[10px] font-black text-emerald-800 dark:text-emerald-400 uppercase mb-2">Colaboradores da Ação ({selectedWorkshop.coWorkers.length})</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedWorkshop.coWorkers.map(id => {
                        const prof = professionals.find(p => p.id === id || p.email === id);
                        if (!prof) return null;
                        return (
                          <div key={id} className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-gray-800 rounded-xl shadow-sm text-xs border border-emerald-100/30">
                            <span className="font-bold text-gray-700 dark:text-gray-200">{prof.name}</span>
                            <span className="text-[9px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">({ROLE_LABELS[prof.role] || prof.role})</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                  <p className="text-[10px] font-black text-gray-400 uppercase mb-2">Detalhamento (HOW)</p>
                  <p className="text-sm text-gray-600 dark:text-gray-300 whitespace-pre-wrap leading-relaxed">{selectedWorkshop.how || 'Sem detalhamento disponível'}</p>
                </div>

                {/* Seção de Fotos Anexadas */}
                {selectedWorkshop.photos && selectedWorkshop.photos.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Mídias Anexadas ({selectedWorkshop.photos.length})</p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                      {selectedWorkshop.photos.map((photo, idx) => (
                        <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border border-gray-150 dark:border-gray-700 bg-black group">
                          <img src={photo} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                          <a 
                            href={photo} 
                            target="_blank" 
                            rel="noreferrer"
                            className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity text-xs font-bold gap-1"
                          >
                            <Eye size={14} /> Visualizar
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Seção de Documentos Anexados */}
                {selectedWorkshop.documents && selectedWorkshop.documents.length > 0 && (
                  <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-2xl">
                    <p className="text-[10px] font-black text-gray-400 uppercase mb-3">Documentos Anexados ({selectedWorkshop.documents.length})</p>
                    <div className="space-y-2">
                      {selectedWorkshop.documents.map((doc, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3.5 bg-white dark:bg-gray-900 rounded-xl border border-gray-100 dark:border-gray-800 shadow-sm">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="p-2.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 rounded-xl">
                              <FileText size={18} />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate" title={doc.name}>
                                {doc.name}
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium">{doc.size || 'N/A'}</p>
                            </div>
                          </div>
                          
                          <a
                            href={doc.base64}
                            download={doc.name}
                            className="p-2 bg-gray-50 hover:bg-green-50 dark:bg-gray-800 dark:hover:bg-green-950/20 text-gray-500 hover:text-green-600 rounded-xl transition-all shadow-sm flex items-center gap-1.5 text-xs font-bold"
                          >
                            <FileDown size={14} /> Baixar
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
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

const StaffManagementSection = ({ staff, onSave, onDelete, showToast }: { staff: StaffMember[], onSave: (data: Omit<StaffMember, 'id'>, id?: string) => Promise<void>, onDelete?: (id: string) => Promise<void>, showToast: (m: string, t?: 'success' | 'error') => void }) => {
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
            <div className="flex justify-between items-center mb-4">
              <div className={cn(
                "px-3 py-1 rounded-full text-[10px] font-black tracking-widest uppercase",
                s.status === 'ATIVO' ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400' : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400'
              )}>
                {s.status}
              </div>
              <div className="flex gap-1">
                <button 
                  onClick={() => handleEdit(s)} 
                  className="text-gray-400 hover:text-green-600 hover:bg-gray-150 dark:hover:bg-gray-800 p-1.5 rounded-xl transition-all"
                  title="Editar ✏️"
                >
                  <Edit2 size={16} />
                </button>
                {onDelete && (
                  <button 
                    onClick={async () => {
                      if (window.confirm(`Tem certeza que deseja excluir o funcionário "${s.name}"? Esta ação removerá o registro permanentemente do banco de dados.`)) {
                        await onDelete(s.id);
                      }
                    }}
                    className="text-gray-400 hover:text-red-650 hover:bg-gray-150 dark:hover:bg-gray-800 p-1.5 rounded-xl transition-all"
                    title="Excluir 🗑️"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
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

const ProfileModal = ({ 
  user, 
  theme, 
  onThemeChange, 
  onClose, 
  onUpdate, 
  showToast, 
  showConfirm, 
  showAIAssistant, 
  onToggleAIAssistant,
  workshops = [],
  psychActivities = [],
  pedagogyActivities = [],
  physioEvolutions = [],
  nursingEvolutions = [],
  psychEvolutions = [],
  pedagogyEvolutions = [],
  socialEvolutions = [],
  nutritionEvolutions = [],
  professionals = [],
  setSelectedActivityForView,
  users = []
}: { 
  user: User, 
  theme: 'light' | 'dark',
  onThemeChange: (theme: 'light' | 'dark') => void,
  onClose: () => void, 
  onUpdate: (updatedUser: User) => void,
  showToast: (msg: string, type?: 'success' | 'error') => void,
  showConfirm: (msg: string, onConfirm: () => void) => void,
  showAIAssistant: boolean,
  onToggleAIAssistant: () => void,
  workshops?: Workshop[],
  psychActivities?: PsychActivity[],
  pedagogyActivities?: PedagogyActivity[],
  physioEvolutions?: PhysioEvolution[],
  nursingEvolutions?: NursingEvolution[],
  psychEvolutions?: PsychEvolution[],
  pedagogyEvolutions?: PedagogyEvolution[],
  socialEvolutions?: SocialEvolution[],
  nutritionEvolutions?: NutritionEvolution[],
  professionals?: Professional[],
  setSelectedActivityForView: (activity: any) => void,
  users?: any[]
}) => {
  const filterAndMap = (list: any[], defaultTypeLabel: string, sector: string) => {
    return (list || []).filter(item => {
      const isCreator = item.professionalId === user.id || 
                        item.registeredBy === user.email || 
                        item.registeredBy === auth.currentUser?.email || 
                        item.professional === user.name ||
                        item.createdBy === user.email ||
                        item.authorEmail === user.email ||
                        item.authorName === user.name ||
                        (item.registeredBy && (item.registeredBy.toLowerCase() === user.name.toLowerCase() || item.registeredBy.toLowerCase() === user.email.toLowerCase()));
      const isCoWorker = (item.coWorkers || []).includes(user.id) ||
                         (item.coWorkers || []).includes(user.email) ||
                         (item.coWorkers || []).includes(auth.currentUser?.email || '') ||
                         (item.coWorkers || []).includes(user.name);
      return isCreator || isCoWorker;
    }).map(item => {
      const isCreator = item.professionalId === user.id || 
                        item.registeredBy === user.email || 
                        item.registeredBy === auth.currentUser?.email || 
                        item.professional === user.name ||
                        item.createdBy === user.email ||
                        item.authorEmail === user.email ||
                        item.authorName === user.name ||
                        (item.registeredBy && (item.registeredBy.toLowerCase() === user.name.toLowerCase() || item.registeredBy.toLowerCase() === user.email.toLowerCase()));
      let formattedDate = item.date;
      try {
        if (item.date && item.date.includes('/')) {
          const parts = item.date.split('/');
          if (parts.length === 3) {
            formattedDate = `${parts[2]}-${parts[1]}-${parts[0]}`;
          }
        }
      } catch (err) {}
      return {
        id: item.id,
        type: `${sector}: ${item.type || defaultTypeLabel}`,
        title: item.title || item.evolution || item.content || item.procedures || 'Evolução/Atendimento',
        date: formattedDate || new Date().toISOString().split('T')[0],
        isCreator,
        sector,
        coWorkers: item.coWorkers || [],
        registeredBy: item.registeredBy || item.professionalId || item.professional || item.createdBy || 'Sistema',
        rawItem: item
      };
    });
  };

  const myWorkshops = filterAndMap(workshops, 'Oficina/Capacitação', 'Oficinas');
  const myPsychAct = filterAndMap(psychActivities, 'Atividade Prática', 'Psicologia');
  const myPedagogyAct = filterAndMap(pedagogyActivities, 'Atividade Pedagógica', 'Pedagogia');
  const myPhysioEvo = filterAndMap(physioEvolutions || [], 'Evolução de Fisioterapia', 'Fisioterapia');
  const myNursingEvo = filterAndMap(nursingEvolutions || [], 'Evolução de Enfermagem', 'Enfermagem');
  const myPsychEvo = filterAndMap(psychEvolutions || [], 'Evolução de Psicologia', 'Psicologia');
  const myPedagogyEvo = filterAndMap(pedagogyEvolutions || [], 'Evolução Pedagógica', 'Pedagogia');
  const mySocialEvo = filterAndMap(socialEvolutions || [], 'Evolução de Serviço Social', 'Serviço Social');
  const myNutritionEvo = filterAndMap(nutritionEvolutions || [], 'Evolução Nutricional', 'Nutrição');

  const allMyActivities = [
    ...myWorkshops, 
    ...myPsychAct, 
    ...myPedagogyAct,
    ...myPhysioEvo,
    ...myNursingEvo,
    ...myPsychEvo,
    ...myPedagogyEvo,
    ...mySocialEvo,
    ...myNutritionEvo
  ].sort((a, b) => b.date.localeCompare(a.date));

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
    showConfirm(
      'TEM CERTEZA? Esta ação irá desvincular seu perfil corporativo deste e-mail de acesso e fazer o logout de forma que você possa acessar o sistema com outro e-mail.',
      async () => {
        setLoading(true);
        try {
          if (auth.currentUser) {
            // Delete Firestore profile so the user is fully unlinked and reference is cleared
            await deleteDoc(doc(db, 'profiles', auth.currentUser.uid));
            
            // Clean logout
            await signOut(auth);
            
            showToast('Perfil desvinculado com sucesso!', 'success');
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          } else {
            showToast('Nenhum usuário ativo para desvincular.', 'error');
          }
        } catch (err: any) {
          console.error("Error unlinking account:", err);
          showToast('Erro ao desvincular o perfil. Tente novamente.', 'error');
        } finally {
          setLoading(false);
        }
      }
    );
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

          {/* Histórico Individual de Ações em Conjunto */}
          <div className="pt-6 border-t border-gray-100 dark:border-gray-800 space-y-4">
            <h4 className="text-xs font-bold text-gray-400 dark:text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
              <ClipboardList size={14} className="text-green-600" /> Meu Feed de Atividades & Equipe
            </h4>
            <p className="text-[9px] text-gray-450 dark:text-gray-500 uppercase tracking-widest font-black">Ações que você cadastrou ou participou como colaborador</p>
            
            <div className="max-h-60 overflow-y-auto space-y-3 pr-1">
              {allMyActivities.length === 0 ? (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center py-6 bg-gray-50 dark:bg-gray-850 rounded-2xl">
                  Nenhuma atividade cadastrada ou vinculada a este perfil corporativo.
                </p>
              ) : (
                allMyActivities.map((act) => (
                  <div 
                    key={act.id} 
                    onClick={() => setSelectedActivityForView(act)}
                    className="p-3 bg-gray-50 dark:bg-gray-850 hover:bg-green-50/40 dark:hover:bg-green-950/20 active:scale-[0.99] rounded-2xl border border-gray-100 dark:border-gray-750 flex items-start gap-3 cursor-pointer transition-all"
                  >
                    <div className={cn(
                      "p-2 rounded-xl text-xs font-bold shrink-0",
                      act.sector === 'Psicologia' ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400' :
                      act.sector === 'Pedagogia' ? 'bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-400' :
                      'bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-400'
                    )}>
                      {act.sector === 'Psicologia' ? <Brain size={16} /> :
                       act.sector === 'Pedagogia' ? <BookOpen size={16} /> :
                       <Users size={16} />}
                    </div>
                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-xs font-bold text-gray-850 dark:text-gray-250 leading-tight block truncate">
                          {act.title}
                        </span>
                        <div className={cn(
                          "px-2 py-0.5 rounded-full text-[8.5px] font-black uppercase shrink-0 tracking-wider",
                          act.isCreator ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400" : "bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400"
                        )}>
                          {act.isCreator ? 'Criador' : 'Colaborador'}
                        </div>
                      </div>
                      <div className="flex items-center justify-between text-[9.5px] font-medium text-gray-400 uppercase tracking-widest">
                        <span>{act.type}</span>
                        <span>{new Date(act.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      {(() => {
                        const creatorUser = users.find(u => u.id === act.registeredBy || u.email === act.registeredBy) 
                          || professionals.find(p => p.id === act.registeredBy || p.email === act.registeredBy || p.name === act.registeredBy);
                        const displayName = creatorUser ? creatorUser.name : act.registeredBy;
                        return (
                          <div className="text-[10px] font-medium text-gray-500 dark:text-gray-400">
                            <span className="font-bold uppercase text-[8px] tracking-wider text-gray-400 dark:text-gray-500">Responsável Principal: </span>
                            <span className="font-semibold text-gray-750 dark:text-gray-200">{displayName}</span>
                          </div>
                        );
                      })()}
                      {act.coWorkers && act.coWorkers.length > 0 && (
                        <div className="mt-1.5 pt-1.5 border-t border-gray-100/50 dark:border-gray-800/50 flex flex-wrap gap-1 items-center">
                          <span className="text-[8px] font-black text-gray-400 uppercase mr-1">Ação Conjunta:</span>
                          {act.coWorkers.map((cwId: string) => {
                            const prof = professionals.find(p => p.id === cwId || p.email === cwId || p.name === cwId);
                            return (
                              <span key={cwId} className="px-1.5 py-0.5 bg-green-50/80 dark:bg-green-950/20 text-green-700 dark:text-green-400 text-[8px] font-bold rounded">
                                {prof?.name || cwId}
                              </span>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-6 border-t border-gray-100 dark:border-gray-800">
            <button 
              onClick={handleDeleteAccount}
              disabled={loading}
              className="w-full p-4 text-red-600 dark:text-red-400 font-bold text-sm flex items-center justify-center gap-2 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-2xl transition-all"
            >
              <Trash2 size={18} />
              Desvincular Meu Perfil / Trocar E-mail
            </button>
            <p className="text-[10px] text-gray-400 text-center mt-2 uppercase">Atenção: Seu perfil atual será desvinculado e você será desconectado(a) para entrar com outro e-mail.</p>
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

  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [editingUserForm, setEditingUserForm] = useState<{
    name: string;
    role: Role;
    email?: string;
    registrationNumber?: string;
  }>({ name: '', role: 'FABRICANTE_FRALDAS', email: '', registrationNumber: '' });

  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUserForm, setNewUserForm] = useState<{
    id: string;
    name: string;
    role: Role;
    email?: string;
    registrationNumber?: string;
  }>({ id: '', name: '', role: 'FABRICANTE_FRALDAS', email: '', registrationNumber: '' });

  useEffect(() => {
    if (institutionalInfo) {
      setInstData(institutionalInfo);
    }
  }, [institutionalInfo]);

  const [isLinkingPresident, setIsLinkingPresident] = useState(false);
  const [selectedNewPresidentId, setSelectedNewPresidentId] = useState('');

  const currentPresident = users.find(u => u.role === 'PRESIDENTE');

  const handleUnlinkPresident = async () => {
    if (!currentPresident) {
      showToast('Nenhum presidente vinculado atualmente.', 'error');
      return;
    }
    if (!window.confirm(`Tem certeza que deseja desvincular o cargo de Presidente de "${currentPresident.name}"? A função deste de usuário retornará para a de Coordenadora.`)) {
      return;
    }
    setLoading(true);
    try {
      await updateDoc(doc(db, 'profiles', currentPresident.id), {
        role: 'COORDENADORA'
      });
      showToast('Presidente desvinculado com sucesso!', 'success');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${currentPresident.id}`);
      showToast('Erro ao desvincular presidente', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLinkNewPresident = async (newPresidentId: string) => {
    if (!newPresidentId) {
      showToast('Selecione um profissional para vincular como Presidente.', 'error');
      return;
    }
    const targetUser = users.find(u => u.id === newPresidentId);
    if (!targetUser) return;

    if (!window.confirm(`Tem certeza que deseja vincular "${targetUser.name}" como a nova Presidente?`)) {
      return;
    }
    setLoading(true);
    try {
      if (currentPresident) {
        await updateDoc(doc(db, 'profiles', currentPresident.id), {
          role: 'COORDENADORA'
        });
      }
      await updateDoc(doc(db, 'profiles', newPresidentId), {
        role: 'PRESIDENTE'
      });
      showToast(`"${targetUser.name}" vinculada com sucesso como Presidente!`, 'success');
      setIsLinkingPresident(false);
      setSelectedNewPresidentId('');
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `profiles/${newPresidentId}`);
      showToast('Erro ao vincular nova presidente', 'error');
    } finally {
      setLoading(false);
    }
  };

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
          <div className="space-y-6 animate-in fade-in duration-300">
            {/* Widget de Gestão da Presidência (Swiss/Modern Design) */}
            <div className="bg-slate-50 dark:bg-gray-850 p-6 rounded-3xl border border-dashed border-gray-200 dark:border-gray-800 space-y-4">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-black text-slate-800 dark:text-white uppercase tracking-wider flex items-center gap-2">
                    <Award className="w-5 h-5 text-amber-500 animate-pulse" />
                    Gestão do Cargo de Presidente
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    Gerencie o perfil vinculado ao cargo máximo de Presidente (OAMI). O sistema permite desvincular o cargo atual e atribuí-lo a outro membro da equipe de forma segura.
                  </p>
                </div>
                {!isLinkingPresident && (
                  <button
                    type="button"
                    onClick={() => setIsLinkingPresident(true)}
                    className="px-4 py-2 bg-slate-850 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 text-white font-extrabold text-xs tracking-wider uppercase rounded-xl transition-all shadow-sm flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" />
                    Vincular Nova Presidente
                  </button>
                )}
              </div>

              {/* Info of currently linked President */}
              <div className="bg-white dark:bg-gray-900 p-4 rounded-2xl border border-gray-100 dark:border-gray-800 flex flex-col md:flex-row items-center md:items-center justify-between gap-4">
                {currentPresident ? (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-full overflow-hidden border-2 border-amber-500 bg-gray-100 dark:bg-gray-800 shrink-0">
                      {currentPresident.photoUrl ? (
                        <img src={currentPresident.photoUrl} alt={currentPresident.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <UserCircle size={24} />
                        </div>
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-gray-800 dark:text-white text-sm">{currentPresident.name}</span>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-800 dark:text-amber-400 font-extrabold text-[9px] rounded uppercase tracking-wider">
                          Presidente Atual
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{currentPresident.email || 'Sem e-mail cadastrado'}</p>
                      <p className="text-[9px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">UID / ID de Perfil: {currentPresident.id}</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-red-500 dark:text-red-400">
                    <AlertCircle size={20} />
                    <span className="text-xs font-black uppercase tracking-wider">Nenhum perfil de Presidente vinculado ao sistema</span>
                  </div>
                )}

                {currentPresident && (
                  <button
                    type="button"
                    onClick={handleUnlinkPresident}
                    disabled={loading}
                    className="p-2.5 text-red-655 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-all border border-transparent hover:border-red-100 dark:hover:border-red-900/40 text-xs font-bold flex items-center gap-1.5 self-stretch md:self-auto justify-center"
                    title="Desvincular Presidente"
                  >
                    <Trash2 className="w-4 h-4" />
                    Desvincular Presidente
                  </button>
                )}
              </div>

              {/* Mini form to link a new President */}
              {isLinkingPresident && (
                <div className="bg-gradient-to-r from-amber-50/20 to-orange-50/10 dark:from-amber-955/10 dark:to-orange-950/5 p-4 rounded-2xl border border-amber-100/50 dark:border-amber-900/35 space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <h5 className="text-xs font-black text-amber-700 dark:text-amber-400 uppercase tracking-widest">
                    Vincular Novo(a) Presidente OAMI
                  </h5>
                  <p className="text-[11px] font-medium text-gray-500 dark:text-gray-400 leading-relaxed">
                    Selecione um dos profissionais abaixo para assumir o cargo máximo de Presidente. Caso já exista um Presidente ativo, ele será automaticamente redefinido para a função de Coordenadora.
                  </p>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                    <select
                      value={selectedNewPresidentId}
                      onChange={(e) => setSelectedNewPresidentId(e.target.value)}
                      className="flex-1 text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold outline-none focus:ring-2 focus:ring-amber-500"
                    >
                      <option value="">-- SELECIONE O PROFISSIONAL (LISTA DE PERFIS) --</option>
                      {users
                        .filter(u => u.role !== 'PRESIDENTE')
                        .map(u => (
                          <option key={u.id} value={u.id}>
                            {u.name.toUpperCase()} ({ROLE_LABELS[u.role] || u.role}) - ID: {u.id}
                          </option>
                        ))}
                    </select>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => {
                          setIsLinkingPresident(false);
                          setSelectedNewPresidentId('');
                        }}
                        className="px-4 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all w-1/2 sm:w-auto text-center"
                      >
                        Cancelar
                      </button>
                      <button
                        type="button"
                        onClick={() => handleLinkNewPresident(selectedNewPresidentId)}
                        disabled={loading || !selectedNewPresidentId}
                        className="px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-md shadow-amber-100 dark:shadow-none flex-1 sm:flex-none text-center"
                      >
                        Confirmar Cargo
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Equipe header & trigger to manually add users */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-gray-100 dark:border-gray-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-gray-800 dark:text-white">Profissionais de Equipe</h3>
                <p className="text-xs text-gray-400 dark:text-gray-500">Configure perfis de classe, papéis organizacionais e credenciais.</p>
              </div>
              <button
                type="button"
                onClick={() => setIsAddingUser(!isAddingUser)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-xl hover:bg-green-700 transition-colors font-bold text-xs self-start sm:self-center"
              >
                <Plus className="w-4 h-4" />
                {isAddingUser ? 'Fechar Formulário' : 'Novo Profissional'}
              </button>
            </div>

            {/* Form to manually create a User Profile */}
            {isAddingUser && (
              <div className="bg-gradient-to-r from-green-50/50 to-emerald-50/50 dark:from-gray-800/40 dark:to-gray-900/30 p-6 rounded-[32px] border border-green-100 dark:border-gray-800 space-y-4 mb-4 animate-in fade-in duration-300">
                <h4 className="text-sm font-black text-green-700 dark:text-green-400 uppercase tracking-widest flex items-center gap-2">
                  <Plus className="w-5 h-5 text-green-600" />
                  Cadastrar Novo Profissional da Equipe
                </h4>
                <form 
                  onSubmit={async (e) => {
                    e.preventDefault();
                    if (!newUserForm.name.trim()) {
                      showToast('Preencha o nome do profissional', 'error');
                      return;
                    }
                    if (!newUserForm.id.trim()) {
                      showToast('Preencha o ID único do Usuário (Ex: e-mail ou UID)', 'error');
                      return;
                    }
                    setLoading(true);
                    try {
                      const userUID = newUserForm.id.trim();
                      const cleanedData = cleanData({
                        name: newUserForm.name.trim(),
                        role: newUserForm.role,
                        email: newUserForm.email?.trim() || '',
                        registrationNumber: newUserForm.registrationNumber?.trim() || ''
                      });
                      await setDoc(doc(db, 'profiles', userUID), cleanedData);
                      setIsAddingUser(false);
                      setNewUserForm({
                        id: '',
                        name: '',
                        role: 'FABRICANTE_FRALDAS',
                        email: '',
                        registrationNumber: ''
                      });
                      showToast('Profissional cadastrado com sucesso!', 'success');
                    } catch (err) {
                      handleFirestoreError(err, OperationType.CREATE, `profiles/${newUserForm.id}`);
                      showToast('Erro ao cadastrar profissional', 'error');
                    } finally {
                      setLoading(false);
                    }
                  }}
                  className="space-y-4"
                >
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Identificador Único (UID ou E-mail) *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: joao@gmail.com ou UID do Firebase"
                        value={newUserForm.id}
                        onChange={(e) => setNewUserForm({ ...newUserForm, id: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Nome Completo do Profissional *</label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: Dra. Ana Paula"
                        value={newUserForm.name}
                        onChange={(e) => setNewUserForm({ ...newUserForm, name: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Cargo / Função *</label>
                      <select
                        required
                        value={newUserForm.role}
                        onChange={(e) => setNewUserForm({ ...newUserForm, role: e.target.value as Role })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                      >
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">E-mail Profissional (Opcional)</label>
                      <input
                        type="email"
                        placeholder="Ex: ana.paula@oami.org.br"
                        value={newUserForm.email || ''}
                        onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-500 dark:text-gray-400 uppercase tracking-widest mb-1">Registro de Classe (Opcional)</label>
                      <input
                        type="text"
                        placeholder="Ex: CRESS/SP 12345"
                        value={newUserForm.registrationNumber || ''}
                        onChange={(e) => setNewUserForm({ ...newUserForm, registrationNumber: e.target.value })}
                        className="w-full text-xs p-2.5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white font-bold focus:ring-2 focus:ring-green-500 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-green-100/50 dark:border-gray-800">
                    <button
                      type="button"
                      onClick={() => setIsAddingUser(false)}
                      className="px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-green-600 text-white text-xs font-black uppercase tracking-wider rounded-xl hover:bg-green-700 transition-all shadow-md shadow-green-100"
                    >
                      Salvar Cadastro
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-[#FAF9F6] dark:bg-gray-800 text-gray-400 dark:text-gray-500 text-[10px] font-bold uppercase tracking-wider">
                  <tr>
                    <th className="px-6 py-4">Profissional</th>
                    <th className="px-6 py-4">Cargo Atual</th>
                    <th className="px-6 py-4">Alterar Cargo</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-gray-800">
                  {users.map(u => {
                    const isEditing = editingUserId === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <div className="space-y-2 max-w-sm">
                              <div>
                                <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Nome Completo</label>
                                <input
                                  type="text"
                                  className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold animate-in duration-250"
                                  value={editingUserForm.name}
                                  onChange={e => setEditingUserForm({ ...editingUserForm, name: e.target.value })}
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">E-mail</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: joao@gmail.com"
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-medium"
                                    value={editingUserForm.email || ''}
                                    onChange={e => setEditingUserForm({ ...editingUserForm, email: e.target.value })}
                                  />
                                </div>
                                <div>
                                  <label className="block text-[9px] font-black text-gray-400 uppercase tracking-wider mb-0.5">Reg. Profissional</label>
                                  <input
                                    type="text"
                                    placeholder="Ex: CRM / COREN"
                                    className="w-full p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-medium"
                                    value={editingUserForm.registrationNumber || ''}
                                    onChange={e => setEditingUserForm({ ...editingUserForm, registrationNumber: e.target.value })}
                                  />
                                </div>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden shrink-0">
                                {u.photoUrl ? (
                                  <img src={u.photoUrl} alt={u.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-gray-400 dark:text-gray-500">
                                    <UserCircle size={20} />
                                  </div>
                                )}
                              </div>
                              <div>
                                <p className="font-bold text-gray-800 dark:text-white text-sm">{u.name}</p>
                                <div className="flex flex-col gap-0.5 mt-0.5">
                                  {u.email && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 font-medium">{u.email}</p>
                                  )}
                                  {u.registrationNumber && (
                                    <p className="text-[10px] text-gray-400 dark:text-gray-500 font-mono">Reg: {u.registrationNumber}</p>
                                  )}
                                  <p className="text-[9px] text-gray-400 dark:text-gray-500 font-mono">ID: {u.id}</p>
                                </div>
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-3 py-1 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 rounded-full text-[10px] font-bold">
                            {ROLE_LABELS[isEditing ? editingUserForm.role : u.role]}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          {isEditing ? (
                            <select 
                              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-800 dark:text-white font-bold"
                              value={editingUserForm.role}
                              onChange={(e) => setEditingUserForm({ ...editingUserForm, role: e.target.value as Role })}
                            >
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          ) : (
                            <select 
                              disabled={loading}
                              className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-xs outline-none focus:ring-2 focus:ring-green-500 text-gray-850 dark:text-white"
                              value={u.role}
                              onChange={(e) => handleUpdateRole(u.id, e.target.value as Role)}
                            >
                              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                                <option key={value} value={value}>{label}</option>
                              ))}
                            </select>
                          )}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <div className="flex justify-end gap-2 text-right">
                            {isEditing ? (
                              <>
                                <button
                                  type="button"
                                  disabled={loading}
                                  onClick={async () => {
                                    if (!editingUserForm.name.trim()) {
                                      showToast('O nome não pode estar vazio!', 'error');
                                      return;
                                    }
                                    setLoading(true);
                                    try {
                                      const cleanedData = cleanData({
                                        name: editingUserForm.name.trim(),
                                        role: editingUserForm.role,
                                        email: editingUserForm.email?.trim() || '',
                                        registrationNumber: editingUserForm.registrationNumber?.trim() || ''
                                      });
                                      await updateDoc(doc(db, 'profiles', u.id), cleanedData);
                                      showToast('Profissional atualizado com sucesso!');
                                      setEditingUserId(null);
                                    } catch (err) {
                                      handleFirestoreError(err, OperationType.UPDATE, `profiles/${u.id}`);
                                      showToast('Erro ao atualizar profissional', 'error');
                                    } finally {
                                      setLoading(false);
                                    }
                                  }}
                                  className="p-2 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded-xl transition-colors"
                                  title="Salvar alterações"
                                >
                                  <Save className="w-5 h-5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingUserId(null)}
                                  className="p-2 text-gray-500 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-xl transition-colors"
                                  title="Cancelar"
                                >
                                  <X className="w-5 h-5" />
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingUserId(u.id);
                                    setEditingUserForm({
                                      name: u.name,
                                      role: u.role,
                                      email: u.email || '',
                                      registrationNumber: u.registrationNumber || ''
                                    });
                                  }}
                                  className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-colors"
                                  title="Editar Profissional"
                                >
                                  <Edit2 className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    if (window.confirm(`Deseja realmente excluir o profissional ${u.name}? Esta ação é irreversível e removerá todos os privilégios dele.`)) {
                                      setLoading(true);
                                      try {
                                        await deleteDoc(doc(db, 'profiles', u.id));
                                        showToast('Profissional excluído com sucesso!');
                                      } catch (err) {
                                        handleFirestoreError(err, OperationType.DELETE, `profiles/${u.id}`);
                                        showToast('Erro ao excluir profissional', 'error');
                                      } finally {
                                        setLoading(false);
                                      }
                                    }
                                  }}
                                  className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors"
                                  title="Excluir Profissional"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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

  const [tabHistory, setTabHistory] = useState<string[]>(() => {
    const saved = localStorage.getItem('oami-active-tab');
    return [saved || 'dashboard'];
  });
  const [isGoingBack, setIsGoingBack] = useState(false);

  useEffect(() => {
    localStorage.setItem('oami-active-tab', activeTab);
    
    if (isGoingBack) {
      setIsGoingBack(false);
      return;
    }
    setTabHistory(prev => {
      if (prev.length > 0 && prev[prev.length - 1] === activeTab) return prev;
      return [...prev, activeTab];
    });
  }, [activeTab]);

  const handleGoBack = () => {
    if (tabHistory.length <= 1) return;
    const newHistory = [...tabHistory];
    newHistory.pop(); // remove current tab
    const previousTab = newHistory[newHistory.length - 1];
    setIsGoingBack(true);
    setTabHistory(newHistory);
    setActiveTab(previousTab);
  };

  // --- Initial System Cleanup and Connection Test ---
  useEffect(() => {
    // Connection Test
    const testConnection = async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        await getDoc(doc(db, 'settings', 'institutional'));
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

  const loadedUidRef = useRef<string | null>(null);
  const hasSeededRef = useRef<boolean>(false);

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
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Real-time data states
  const [users, setUsers] = useState<StaffMember[]>([]);
  const [elderly, setElderly] = useState<Elderly[]>(MOCK_ELDERLY);
  const [evolutions, setEvolutions] = useState<EvolutionRecord[]>(MOCK_EVOLUTIONS);
  const [donors, setDonors] = useState<Donor[]>([]);
  const [diaperDonations, setDiaperDonations] = useState<DiaperDonation[]>([]);
  const [diaperStock, setDiaperStock] = useState<DiaperStock | null>(null);
  const [diaperProductionLogs, setDiaperProductionLogs] = useState<DiaperProductionLog[]>([]);
  const [diaperRawProductions, setDiaperRawProductions] = useState<DiaperRawProduction[]>([]);
  const [diaperWIPProcessings, setDiaperWIPProcessings] = useState<DiaperWIPProcessing[]>([]);
  const [diaperFinalPackings, setDiaperFinalPackings] = useState<DiaperFinalPacking[]>([]);
  const [diaperProductionGoals, setDiaperProductionGoals] = useState<DiaperProductionGoal[]>([]);
  const [calendarEvents, setCalendarEvents] = useState<CalendarEvent[]>([]);
  const [financialRecords, setFinancialRecords] = useState<FinancialRecord[]>(MOCK_FINANCIAL);
  const [adminUsers, setAdminUsers] = useState<User[]>(MOCK_USERS);
  const [pias, setPias] = useState<PIA[]>([]);
  const [allPhotos, setAllPhotos] = useState<GalleryItem[]>([]);
  const [workshops, setWorkshops] = useState<Workshop[]>([]);
  const [volunteers, setVolunteers] = useState<Volunteer[]>([]);
  const [communityElderly, setCommunityElderly] = useState<CommunityElderly[]>([]);
  const [caregivers, setCaregivers] = useState<Caregiver[]>([]);
  const [familyEngagements, setFamilyEngagements] = useState<FamilyEngagement[]>([]);
  const [institutionalInfo, setInstitutionalInfo] = useState<InstitutionalInfo | null>(null);
  const [presidencyDocs, setPresidencyDocs] = useState<PresidencySupportDocument[]>([]);
  const [institutionalRecords, setInstitutionalRecords] = useState<InstitutionalSupportRecord[]>([]);
  const [professionals, setProfessionals] = useState<Professional[]>(MOCK_PROFESSIONALS);
  const [professionalEvaluations, setProfessionalEvaluations] = useState<ProfessionalEvaluation[]>(MOCK_PROFESSIONAL_EVALUATIONS);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [selectedActivityForView, setSelectedActivityForView] = useState<any | null>(null);
  const [sectorDefaultTabs, setSectorDefaultTabs] = useState<Record<string, string>>({});

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
  const [socialPatients, setSocialPatients] = useState<SocialPatient[]>(MOCK_SOCIAL_PATIENTS);
  const [socialFamilyTies, setSocialFamilyTies] = useState<SocialFamilyTie[]>(MOCK_SOCIAL_FAMILY_TIES);
  const [socialDocumentations, setSocialDocumentations] = useState<SocialDocumentation[]>(MOCK_SOCIAL_DOCUMENTATIONS);
  const [socialLegalSituations, setSocialLegalSituations] = useState<SocialLegalSituation[]>(MOCK_SOCIAL_LEGAL_SITUATIONS);
  const [socialStudies, setSocialStudies] = useState<SocialStudy[]>(MOCK_SOCIAL_STUDIES);
  const [socialEvolutions, setSocialEvolutions] = useState<SocialEvolution[]>(MOCK_SOCIAL_EVOLUTIONS);
  const [socialReferrals, setSocialReferrals] = useState<SocialReferral[]>(MOCK_SOCIAL_REFERRALS);
  const [socialFamilyVisits, setSocialFamilyVisits] = useState<SocialFamilyVisit[]>(MOCK_SOCIAL_FAMILY_VISITS);
  const [socialRiskSituations, setSocialRiskSituations] = useState<SocialRiskSituation[]>(MOCK_SOCIAL_RISK_SITUATIONS);

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

  const isRoleOrUserTagged = useCallback((coWorkersList: string[] | undefined | null, targetRoles: string[]) => {
    if (!coWorkersList || !Array.isArray(coWorkersList)) return false;
    
    const lowerCoWorkers = coWorkersList.map(cw => String(cw).trim().toLowerCase());
    const rolesLower = targetRoles.map(r => r.toLowerCase());

    // 1. Direct check: Is currently logged in user tagged?
    if (user) {
      if (lowerCoWorkers.includes(String(user.id).toLowerCase()) ||
          lowerCoWorkers.includes(String(user.email).toLowerCase()) ||
          lowerCoWorkers.includes(String(user.name).toLowerCase()) ||
          (auth.currentUser?.email && lowerCoWorkers.includes(auth.currentUser.email.toLowerCase()))) {
        return true;
      }
    }

    // 2. Check if any professional matching one of the target roles is in the coWorkers list
    for (const cwStr of lowerCoWorkers) {
      // Direct keyword match
      if (rolesLower.some(role => cwStr.includes(role))) {
        return true;
      }

      // Look up professional info
      const prof = professionals.find(p => 
        (p.id && String(p.id).toLowerCase() === cwStr) ||
        (p.email && p.email.toLowerCase() === cwStr) ||
        (p.name && p.name.toLowerCase() === cwStr)
      );

      if (prof && prof.role && rolesLower.includes(prof.role.toLowerCase())) {
        return true;
      }
    }

    return false;
  }, [user, professionals]);

  const mergedPhysioEvolutions = useMemo(() => {
    const list = [...physioEvolutions];
    const registeredIds = new Set(list.map(e => e.id));
    const others = [
      ...nursingEvolutions.map(e => ({ ...e, sectorName: 'Enfermagem' })),
      ...psychEvolutions.map(e => ({ ...e, sectorName: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, sectorName: 'Pedagogia' })),
      ...socialEvolutions.map(e => ({ ...e, sectorName: 'Serviço Social' })),
      ...nutritionEvolutions.map(e => ({ ...e, sectorName: 'Nutrição' }))
    ];
    others.forEach(other => {
      if (!registeredIds.has(other.id) && isRoleOrUserTagged(other.coWorkers, ['FISIOTERAPEUTA'])) {
        list.push({
          id: other.id,
          patientId: other.patientId || '',
          date: other.date,
          procedures: `[Atendimento de ${other.sectorName}]`,
          evolution: (other as any).content || (other as any).evolution || (other as any).observation || (other as any).procedures || '',
          observations: (other as any).conduct || (other as any).conducts || (other as any).observation || (other as any).observations || '',
          painLevel: (other as any).painLevel,
          photos: other.photos || [],
          coWorkers: other.coWorkers || []
        });
      }
    });
    return list;
  }, [physioEvolutions, nursingEvolutions, psychEvolutions, pedagogyEvolutions, socialEvolutions, nutritionEvolutions, isRoleOrUserTagged]);

  const mergedNursingEvolutions = useMemo(() => {
    const list = [...nursingEvolutions];
    const registeredIds = new Set(list.map(e => e.id));
    const others = [
      ...physioEvolutions.map(e => ({ ...e, sectorName: 'Fisioterapia' })),
      ...psychEvolutions.map(e => ({ ...e, sectorName: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, sectorName: 'Pedagogia' })),
      ...socialEvolutions.map(e => ({ ...e, sectorName: 'Serviço Social' })),
      ...nutritionEvolutions.map(e => ({ ...e, sectorName: 'Nutrição' }))
    ];
    others.forEach(other => {
      if (!registeredIds.has(other.id) && isRoleOrUserTagged(other.coWorkers, ['ENFERMEIRA', 'TECNICO_ENFERMAGEM'])) {
        list.push({
          id: other.id,
          patientId: other.patientId || '',
          date: other.date,
          time: (other as any).time || '12:00',
          content: `[Atendimento Conjunto - ${other.sectorName}]\n${(other as any).content || (other as any).evolution || (other as any).observation || (other as any).procedures || ''}\n\nConduta: ${(other as any).conduct || (other as any).conducts || (other as any).observations || ''}`,
          registeredBy: (other as any).registeredBy || (other as any).professional || 'Sistema',
          photos: other.photos || [],
          coWorkers: other.coWorkers || []
        } as any);
      }
    });
    return list;
  }, [nursingEvolutions, physioEvolutions, psychEvolutions, pedagogyEvolutions, socialEvolutions, nutritionEvolutions, isRoleOrUserTagged]);

  const mergedSocialEvolutions = useMemo(() => {
    const list = [...socialEvolutions];
    const registeredIds = new Set(list.map(e => e.id));
    const others = [
      ...nursingEvolutions.map(e => ({ ...e, sectorName: 'Enfermagem' })),
      ...physioEvolutions.map(e => ({ ...e, sectorName: 'Fisioterapia' })),
      ...psychEvolutions.map(e => ({ ...e, sectorName: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, sectorName: 'Pedagogia' })),
      ...nutritionEvolutions.map(e => ({ ...e, sectorName: 'Nutrição' }))
    ];
    others.forEach(other => {
      if (!registeredIds.has(other.id) && isRoleOrUserTagged(other.coWorkers, ['ASSISTENTE_SOCIAL'])) {
        list.push({
          id: other.id,
          patientId: other.patientId || '',
          date: other.date,
          serviceType: `[Atendimento de ${other.sectorName}]`,
          observation: (other as any).content || (other as any).evolution || (other as any).observation || (other as any).procedures || '',
          conduct: (other as any).conduct || (other as any).conducts || (other as any).observations || (other as any).response || '',
          registeredBy: (other as any).registeredBy || (other as any).professional || 'Sistema',
          photos: other.photos || [],
          coWorkers: other.coWorkers || []
        });
      }
    });
    return list;
  }, [socialEvolutions, nursingEvolutions, physioEvolutions, psychEvolutions, pedagogyEvolutions, nutritionEvolutions, isRoleOrUserTagged]);

  const mergedPsychEvolutions = useMemo(() => {
    const list = [...psychEvolutions];
    
    // Unify activities under evolution
    (psychActivities || []).forEach(act => {
      list.push({
        id: `act-${act.id}`,
        patientId: act.participants && act.participants.length === 1 ? act.participants[0] : (act.patientIds && act.patientIds.length === 1 ? act.patientIds[0] : 'GERAL'),
        patientIds: act.participants || act.patientIds || [],
        date: act.date,
        time: '12:00',
        observation: `[Atividade: ${act.type || 'OFICINA'}] ${act.title || ''}\nDescrição: ${act.description || ''}`,
        intervention: `Conduzido por: ${act.registeredBy || 'Psicóloga'}`,
        registeredBy: act.registeredBy || 'Psicóloga',
        photos: act.photos || [],
        coWorkers: act.coWorkers || []
      });
    });

    // Unify appointments under evolution
    (psychAppointments || []).forEach(appt => {
      list.push({
        id: `appt-${appt.id}`,
        patientId: appt.patientId || (appt.patientIds && appt.patientIds.length === 1 ? appt.patientIds[0] : 'GERAL'),
        patientIds: appt.patientIds || (appt.patientId ? [appt.patientId] : []),
        date: appt.date,
        time: appt.time || '12:00',
        observation: `[Atendimento: ${appt.type || 'INDIVIDUAL'}] [Status: ${appt.status || 'REALIZADO'}]\nObservações: ${appt.observations || ''}`,
        intervention: `Conduzido por: ${appt.registeredBy || 'Psicóloga'}`,
        registeredBy: appt.registeredBy || 'Psicóloga',
        photos: [],
        coWorkers: []
      });
    });

    const registeredIds = new Set(list.map(e => e.id));
    const others = [
      ...nursingEvolutions.map(e => ({ ...e, sectorName: 'Enfermagem' })),
      ...physioEvolutions.map(e => ({ ...e, sectorName: 'Fisioterapia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, sectorName: 'Pedagogia' })),
      ...socialEvolutions.map(e => ({ ...e, sectorName: 'Serviço Social' })),
      ...nutritionEvolutions.map(e => ({ ...e, sectorName: 'Nutrição' }))
    ];
    others.forEach(other => {
      if (!registeredIds.has(other.id) && isRoleOrUserTagged(other.coWorkers, ['PSICOLOGA'])) {
        list.push({
          id: other.id,
          patientId: other.patientId || '',
          date: other.date,
          time: (other as any).time || '12:00',
          observation: (other as any).content || (other as any).evolution || (other as any).observation || (other as any).procedures || '',
          intervention: (other as any).conduct || (other as any).conducts || (other as any).observations || (other as any).response || '',
          registeredBy: (other as any).registeredBy || (other as any).professional || 'Sistema',
          photos: other.photos || [],
          coWorkers: other.coWorkers || []
        });
      }
    });
    return list;
  }, [psychEvolutions, psychActivities, psychAppointments, nursingEvolutions, physioEvolutions, pedagogyEvolutions, socialEvolutions, nutritionEvolutions, isRoleOrUserTagged]);

  const mergedPedagogyEvolutions = useMemo(() => {
    const list = [...pedagogyEvolutions];
    const registeredIds = new Set(list.map(e => e.id));
    const others = [
      ...nursingEvolutions.map(e => ({ ...e, sectorName: 'Enfermagem' })),
      ...physioEvolutions.map(e => ({ ...e, sectorName: 'Fisioterapia' })),
      ...psychEvolutions.map(e => ({ ...e, sectorName: 'Psicologia' })),
      ...socialEvolutions.map(e => ({ ...e, sectorName: 'Serviço Social' })),
      ...nutritionEvolutions.map(e => ({ ...e, sectorName: 'Nutrição' }))
    ];
    others.forEach(other => {
      if (!registeredIds.has(other.id) && isRoleOrUserTagged(other.coWorkers, ['PEDAGOGA'])) {
        list.push({
          id: other.id,
          patientId: other.patientId || '',
          date: other.date,
          time: (other as any).time || '12:00',
          activityTitle: `Atendimento de ${other.sectorName}`,
          participation: 'ATIVO',
          response: (other as any).content || (other as any).evolution || (other as any).observation || (other as any).procedures || '',
          observations: (other as any).conduct || (other as any).conducts || (other as any).observations || (other as any).response || '',
          registeredBy: (other as any).registeredBy || (other as any).professional || 'Sistema',
          photos: other.photos || [],
          coWorkers: other.coWorkers || []
        });
      }
    });
    return list;
  }, [pedagogyEvolutions, nursingEvolutions, physioEvolutions, psychEvolutions, socialEvolutions, nutritionEvolutions, isRoleOrUserTagged]);

  const mergedNutritionEvolutions = useMemo(() => {
    const list = [...nutritionEvolutions];
    const registeredIds = new Set(list.map(e => e.id));
    const others = [
      ...nursingEvolutions.map(e => ({ ...e, sectorName: 'Enfermagem' })),
      ...physioEvolutions.map(e => ({ ...e, sectorName: 'Fisioterapia' })),
      ...psychEvolutions.map(e => ({ ...e, sectorName: 'Psicologia' })),
      ...pedagogyEvolutions.map(e => ({ ...e, sectorName: 'Pedagogia' })),
      ...socialEvolutions.map(e => ({ ...e, sectorName: 'Serviço Social' }))
    ];
    others.forEach(other => {
      if (!registeredIds.has(other.id) && isRoleOrUserTagged(other.coWorkers, ['NUTRICIONISTA'])) {
        list.push({
          id: other.id,
          patientId: other.patientId || '',
          date: other.date,
          time: (other as any).time || '12:00',
          acceptance: 'BOA',
          hydrationLevel: 'BOM',
          observations: (other as any).content || (other as any).evolution || (other as any).observation || (other as any).procedures || '',
          conduct: (other as any).conduct || (other as any).conducts || (other as any).observations || (other as any).response || '',
          registeredBy: (other as any).registeredBy || (other as any).professional || 'Sistema',
          photos: other.photos || [],
          coWorkers: other.coWorkers || []
        });
      }
    });
    return list;
  }, [nutritionEvolutions, nursingEvolutions, physioEvolutions, psychEvolutions, pedagogyEvolutions, socialEvolutions, isRoleOrUserTagged]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__allPatientsAndElderly = {
        elderly,
        nursingPatientsList,
        psychPatientsList,
        pedagogyPatientsList,
        socialPatientsList,
        physioPatientsList,
        nutritionPatientsList
      };
    }
  }, [
    elderly,
    nursingPatientsList,
    psychPatientsList,
    pedagogyPatientsList,
    socialPatientsList,
    physioPatientsList,
    nutritionPatientsList
  ]);

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
        // Se já carregou este UID e já temos 'user' em memória, evita refazer getDoc do perfil!
        if (loadedUidRef.current === firebaseUser.uid && user) {
          setIsAuthReady(true);
          return;
        }

        const userDocRef = doc(db, 'profiles', firebaseUser.uid);
        getDoc(userDocRef).then((docSnap) => {
          if (docSnap.exists()) {
            const data = docSnap.data();
            const isFranciara = firebaseUser.email === 'franciaraeabreucoelho@gmail.com';
            const isFernanda = firebaseUser.email === 'fernandakellenfk378@gmail.com';
            const finalRole = isFernanda ? 'AUXILIAR_ADMINISTRATIVO' : (data?.role || (isFranciara ? 'COORDENADORA' : 'COORDENADORA'));
            const finalName = data?.name || firebaseUser.displayName || (isFranciara ? 'Franciara de Abreú Coelho' : (isFernanda ? 'Fernanda Kellen' : 'Usuário'));
            const finalEmail = firebaseUser.email || data?.email || '';

            if (isFranciara && !data?.role) {
              updateDoc(userDocRef, {
                role: 'COORDENADORA',
                name: 'Franciara de Abreú Coelho',
                email: 'franciaraeabreucoelho@gmail.com'
              }).catch(e => console.error("Error auto-creating admin profile doc:", e));
            }

            if (isFernanda && (!data?.role || data?.role !== 'AUXILIAR_ADMINISTRATIVO')) {
              updateDoc(userDocRef, {
                role: 'AUXILIAR_ADMINISTRATIVO',
                name: finalName,
                email: 'fernandakellenfk378@gmail.com'
              }).catch(e => console.error("Error auto-updating Fernanda profile doc:", e));
            }

            setUser({
              id: docSnap.id,
              ...data,
              role: finalRole as Role,
              name: finalName,
              email: finalEmail,
              photoUrl: firebaseUser.photoURL || data?.photoUrl || ''
            } as User);
            setNeedsProfile(false);
            loadedUidRef.current = firebaseUser.uid;
            console.log("👤 Perfil do usuário carregado em memória:", finalRole);
          } else {
            // Bypass para a criadora/admin se o documento não existir ou falhar por cota
            if (firebaseUser.email === 'franciaraeabreucoelho@gmail.com') {
              setDoc(userDocRef, {
                name: 'Franciara de Abreú Coelho',
                role: 'COORDENADORA',
                email: 'franciaraeabreucoelho@gmail.com',
                photoUrl: firebaseUser.photoURL || '',
                createdAt: new Date().toISOString()
              }).catch(e => console.error("Error creating admin profile doc:", e));

              setUser({
                id: firebaseUser.uid,
                name: 'Franciara de Abreú Coelho',
                role: 'COORDENADORA',
                photoUrl: firebaseUser.photoURL || '',
                email: 'franciaraeabreucoelho@gmail.com'
              });
              setNeedsProfile(false);
              loadedUidRef.current = firebaseUser.uid;
            } else if (firebaseUser.email === 'fernandakellenfk378@gmail.com') {
              setDoc(userDocRef, {
                name: firebaseUser.displayName || 'Fernanda Kellen',
                role: 'AUXILIAR_ADMINISTRATIVO',
                email: 'fernandakellenfk378@gmail.com',
                photoUrl: firebaseUser.photoURL || '',
                createdAt: new Date().toISOString()
              }).catch(e => console.error("Error creating Fernanda profile doc:", e));

              setUser({
                id: firebaseUser.uid,
                name: firebaseUser.displayName || 'Fernanda Kellen',
                role: 'AUXILIAR_ADMINISTRATIVO',
                photoUrl: firebaseUser.photoURL || '',
                email: 'fernandakellenfk378@gmail.com'
              });
              setNeedsProfile(false);
              loadedUidRef.current = firebaseUser.uid;
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
          
          // Se falhar por cota ou erro de rede, permite a entrada usando os dados da conta
          const isFranciara = firebaseUser.email === 'franciaraeabreucoelho@gmail.com';
          const isFernanda = firebaseUser.email === 'fernandakellenfk378@gmail.com';
          
          if (err.message?.includes('Quota exceeded') || err.message?.includes('quota') || err.message?.includes('RESOURCE_EXHAUSTED')) {
            window.dispatchEvent(new CustomEvent('firestore-quota-exceeded'));
          }

          setUser({
            id: firebaseUser.uid,
            name: firebaseUser.displayName || (isFranciara ? 'Franciara de Abreú Coelho' : (isFernanda ? 'Fernanda Kellen' : (firebaseUser.email?.split('@')[0] || 'Usuário'))),
            role: isFranciara ? 'COORDENADORA' : (isFernanda ? 'AUXILIAR_ADMINISTRATIVO' : 'CUIDADOR'),
            photoUrl: firebaseUser.photoURL || '',
            email: firebaseUser.email || ''
          });
          setNeedsProfile(false);
          loadedUidRef.current = firebaseUser.uid;
          console.log("⭐ Usuário autenticado via perfil fallback devido a erro no Firestore");
          setIsAuthReady(true);
        });
      } else {
        loadedUidRef.current = null;
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

  // --- Efeito ÚNICO para Semeação Inicial de Dados (Executa apenas 1 vez por sessão) ---
  useEffect(() => {
    if (!isAuthReady || !user) return;
    if (hasSeededRef.current) return;
    hasSeededRef.current = true;

    if (auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
      const seedFranciscoRequest = async () => {
        try {
          const qCpf = query(collection(db, 'elderly'), where('cpf', '==', '056811913-46'));
          const snapCpf = await getDocs(qCpf);
          const qName = query(collection(db, 'elderly'), where('name', '==', 'Francisco Gomes da Silva'));
          const snapName = await getDocs(qName);

          const docsToUpdate = [...snapCpf.docs, ...snapName.docs];
          if (docsToUpdate.length > 0) {
            for (const d of docsToUpdate) {
              if (d.data().status !== 'ATIVO') {
                await updateDoc(doc(db, 'elderly', d.id), { status: 'ATIVO' });
              }
            }
          } else {
            const elderlyRef = await addDoc(collection(db, 'elderly'), cleanData({
              name: 'Francisco Gomes da Silva',
              fullName: 'Francisco Gomes da Silva',
              cpf: '056811913-46',
              birthDate: '1950-10-04',
              entryDate: '2020-12-17',
              status: 'ATIVO',
              gender: 'M',
              lastProfession: 'Não informado',
              schooling: 'Não Alfabetizado',
              responsibleName: 'Antonilson Lima Moreira',
              responsiblePhone: '',
              medications: 'Ficha da saúde',
              diagnoses: 'Deficiência física e visual',
              observations: 'Religião: Católica. Naturalidade: São Luís - MA.'
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
              observations: 'Religião: Católica. Naturalidade: São Luís - MA. Não alfabetizado. Cor: Pardo. Estado Civil: Viúvo.'
            }));
          }
        } catch (error) {
          console.error("Erro ao semear dados Francisco:", error);
        }
      };

      const seedIarlesRequest = async () => {
        try {
          const qName = query(collection(db, 'elderly'), where('name', '==', 'Iarles Vieira Garcia'));
          const snapName = await getDocs(qName);

          if (!snapName.empty) {
            for (const d of snapName.docs) {
              if (d.data().status !== 'ATIVO') {
                await updateDoc(doc(db, 'elderly', d.id), { status: 'ATIVO' });
              }
            }
          } else {
            await addDoc(collection(db, 'elderly'), cleanData({
              name: 'Iarles Vieira Garcia',
              fullName: 'Iarles Vieira Garcia',
              birthDate: '1955-05-15',
              entryDate: '2021-03-10',
              status: 'ATIVO',
              gender: 'M',
              lastProfession: 'Aposentado',
              schooling: 'Ensino Fundamental',
              responsibleName: 'Responsável Familiar',
              medications: 'Ficha da saúde',
              diagnoses: 'Acompanhamento institucional',
              observations: 'Idoso institucionalizado ativo.'
            }));
          }
        } catch (error) {
          console.error("Erro ao semear dados Iarles:", error);
        }
      };

      const seedMartinhaRequest = async () => {
        try {
          const qCpf = query(collection(db, 'elderly'), where('cpf', '==', '70879540320'));
          const snapCpf = await getDocs(qCpf);
          const qName = query(collection(db, 'elderly'), where('name', '==', 'Martinha Cardoso'));
          const snapName = await getDocs(qName);

          let elderlyId = '';
          const martinhaData = {
            name: 'Martinha Cardoso',
            fullName: 'Martinha Cardoso',
            cpf: '70879540320',
            rg: '03002171920024',
            birthDate: '1944-01-03',
            entryDate: '2024-09-18',
            gender: 'F',
            status: 'ATIVO',
            lastProfession: 'Aposentada',
            schooling: 'Não Alfabetizada',
            literacyLevel: 'ANALFABETO',
            responsibleName: 'Maria Enilde Lima Brito',
            responsiblePhone: '98981054117',
            medications: 'Ficha da saúde',
            diagnoses: 'Baixa Visão, Catarata'
          };

          if (!snapCpf.empty) {
            elderlyId = snapCpf.docs[0].id;
            await updateDoc(doc(db, 'elderly', elderlyId), cleanData(martinhaData));
          } else if (!snapName.empty) {
            elderlyId = snapName.docs[0].id;
            await updateDoc(doc(db, 'elderly', elderlyId), cleanData(martinhaData));
          } else {
            const docRef = await addDoc(collection(db, 'elderly'), cleanData(martinhaData));
            elderlyId = docRef.id;
          }
        } catch (error) {
          console.error("Erro ao semear dados Martinha:", error);
        }
      };

      const ensureFernandaKellenRole = async () => {
        try {
          const targetEmail = 'fernandakellenfk378@gmail.com';
          const qProfiles = query(collection(db, 'profiles'), where('email', '==', targetEmail));
          const snapProfiles = await getDocs(qProfiles);
          
          for (const d of snapProfiles.docs) {
            const data = d.data();
            if (data.role !== 'AUXILIAR_ADMINISTRATIVO') {
              await updateDoc(doc(db, 'profiles', d.id), { role: 'AUXILIAR_ADMINISTRATIVO' });
            }
          }
        } catch (err) {
          console.error("Error ensuring Fernanda Kellen role:", err);
        }
      };

      seedFranciscoRequest();
      seedIarlesRequest();
      seedMartinhaRequest();
      ensureFernandaKellenRole();
    }
  }, [isAuthReady, user?.id]);

  // --- Efeito Global do Firestore (Core Data - NUNCA reiniciado na troca de abas) ---
  useEffect(() => {
    if (!isAuthReady || !user) return;

    // 1. Idosos principais
    const unsubElderly = onSnapshot(query(collection(db, 'elderly'), orderBy('name'), limit(300)), (snapshot) => {
      const list = snapshot.docs.map(docSnap => {
        const data = docSnap.data();
        const nameLower = (data.name || '').toLowerCase();
        let status = data.status || 'ATIVO';

        // Auto-fix status para Iarles Vieira Garcia e Francisco Gomes se estiverem como INATIVO
        if ((nameLower.includes('iarles') || nameLower.includes('francisco gomes')) && status === 'INATIVO') {
          status = 'ATIVO';
          updateDoc(doc(db, 'elderly', docSnap.id), { status: 'ATIVO' }).catch(err => console.error("Error auto-activating elderly:", err));
        }

        return { id: docSnap.id, ...data, status } as Elderly;
      });
      setElderly(list);
    }, (err) => handleFirestoreError(err, OperationType.LIST, 'elderly'));

    // 2. Estoque de Fraldas
    const unsubStock = onSnapshot(doc(db, 'diaperStock', 'current'), (docSnap) => {
      if (docSnap.exists()) {
        setDiaperStock({ id: docSnap.id, ...docSnap.data() } as DiaperStock);
      }
    }, (err) => handleFirestoreError(err, OperationType.GET, 'diaperStock/current'));

    // 3. Notificações do Usuário
    const qNotifications = query(collection(db, 'notifications'), orderBy('createdAt', 'desc'), limit(50));
    const unsubNotifications = onSnapshot(qNotifications, (snapshot) => {
      const allNotifs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification));
      const filtered = allNotifs.filter(n => {
        if (n.targetUserId) return n.targetUserId === user.id;
        if (n.targetEmail) {
          return n.targetEmail.toLowerCase() === user.email?.toLowerCase() || 
                 n.targetEmail.toLowerCase() === auth.currentUser?.email?.toLowerCase();
        }
        if (n.targetRole) return n.targetRole === 'ALL' || n.targetRole === user.role;
        return true;
      });
      setNotifications(filtered);
    }, (err) => {
      getDocs(query(collection(db, 'notifications'), limit(50))).then(snap => {
        setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppNotification)));
      }).catch(e => console.error(e));
    });

    // 4. Configurações Institucionais (getDoc único)
    getDoc(doc(db, 'settings', 'institutional')).then((docSnap) => {
      if (docSnap.exists()) {
        setInstitutionalInfo(docSnap.data() as InstitutionalInfo);
      }
    }).catch(err => handleFirestoreError(err, OperationType.GET, 'settings/institutional'));

    return () => {
      unsubElderly();
      unsubStock();
      unsubNotifications();
    };
  }, [isAuthReady, user?.id]);

  // --- Efeito Lazy Loading por Aba Ativa (Carrega APENAS a aba selecionada) ---
  useEffect(() => {
    if (!isAuthReady || !user) return;

    let unsubEvolutions = () => {};
    let unsubEvents = () => {};
    let unsubWorkshops = () => {};
    let unsubFinal = () => {};
    let unsubRawProd = () => {};
    let unsubWIP = () => {};
    let unsubGoals = () => {};
    let unsubDiaperDonations = () => {};
    let unsubDiaperBeneficiaries = () => {};
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
    let unsubSocialFamilyTies = () => {};
    let unsubSocialDocumentations = () => {};
    let unsubSocialLegalSituations = () => {};
    let unsubSocialStudies = () => {};
    let unsubSocialEvolutions = () => {};
    let unsubSocialReferrals = () => {};
    let unsubSocialFamilyVisits = () => {};
    let unsubSocialRiskSituations = () => {};
    let unsubPias = () => {};
    let unsubNutritionPatients = () => {};
    let unsubNutritionEvolutions = () => {};
    let unsubNutritionAnthropometries = () => {};
    let unsubNutritionMealPlans = () => {};
    let unsubDonors = () => {};
    let unsubFinancial = () => {};
    let unsubPresidencyDocs = () => {};
    let unsubInstitutionalRecords = () => {};
    let unsubUsers = () => {};
    let unsubStaff = () => {};
    let unsubGallery = () => {};
    let unsubCommunityElderly = () => {};
    let unsubVolunteers = () => {};
    let unsubCaregivers = () => {};
    let unsubFamilyEngagements = () => {};
    let unsubProfessionals = () => {};
    let unsubProfessionalEvaluations = () => {};

    const farPast = new Date();
    farPast.setFullYear(farPast.getFullYear() - 10);
    const farPastStr = farPast.toISOString();

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const thirtyDaysAgoStr = thirtyDaysAgo.toISOString();

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    const oneYearAgoStr = oneYearAgo.toISOString();

    // 1. Dashboard / Cronograma / General
    if (['dashboard', 'overview', 'productivity', 'schedule', 'workshops', 'monitoring', 'reports'].includes(activeTab)) {
      const qEvolutions = query(
        collection(db, 'evolutions'), 
        where('date', '>=', farPastStr),
        orderBy('date', 'desc'),
        limit(200)
      );
      unsubEvolutions = onSnapshot(qEvolutions, (snapshot) => {
        setEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as EvolutionRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'evolutions'));

      unsubEvents = onSnapshot(query(collection(db, 'calendarEvents'), orderBy('date'), limit(100)), (snapshot) => {
        setCalendarEvents(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CalendarEvent)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'calendarEvents'));

      unsubWorkshops = onSnapshot(query(collection(db, 'workshops'), where('date', '>=', oneYearAgoStr), orderBy('date', 'desc'), limit(100)), (snapshot) => {
        setWorkshops(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Workshop)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'workshops'));
    }

    // 2. Produção de Fraldas (SGPF)
    if (activeTab === 'diaperProduction') {
      unsubFinal = onSnapshot(query(collection(db, 'diaperFinalPackings'), where('date', '>=', farPastStr), orderBy('date', 'desc'), limit(200)), (snapshot) => {
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
    }

    // 3. Fisioterapia
    if (activeTab === 'physio') {
      unsubPhysioPatients = onSnapshot(query(collection(db, 'physioPatients'), orderBy('name'), limit(100)), (snapshot) => {
        setPhysioPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioPatient)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioPatients'));

      unsubPhysioAssessments = onSnapshot(query(collection(db, 'physioAssessments'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPhysioAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioAssessment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioAssessments'));

      unsubPhysioEvolutions = onSnapshot(query(collection(db, 'physioEvolutions'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setPhysioEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioEvolution)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioEvolutions'));

      unsubPhysioExercises = onSnapshot(query(collection(db, 'physioExercises'), orderBy('title'), limit(200)), (snapshot) => {
        setPhysioExercises(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioExercise)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioExercises'));

      unsubPhysioAppointments = onSnapshot(query(collection(db, 'physioAppointments'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPhysioAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PhysioAppointment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'physioAppointments'));
    }

    // 4. Enfermagem
    if (activeTab === 'nursing') {
      unsubNursingPatients = onSnapshot(query(collection(db, 'nursingPatients'), orderBy('name'), limit(100)), (snapshot) => {
        setNursingPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingPatient)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'nursingPatients'));

      unsubMedications = onSnapshot(query(collection(db, 'medications'), limit(200)), (snapshot) => {
        setMedications(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Medication)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'medications'));

      unsubMedicationAdministrations = onSnapshot(query(collection(db, 'medicationAdministrations'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setMedicationAdministrations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MedicationAdministration)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'medicationAdministrations'));

      unsubVitalSigns = onSnapshot(query(collection(db, 'vitalSigns'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setVitalSigns(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as VitalSigns)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'vitalSigns'));

      unsubDressingRecords = onSnapshot(query(collection(db, 'dressingRecords'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setDressingRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DressingRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'dressingRecords'));

      unsubNursingEvolutions = onSnapshot(query(collection(db, 'nursingEvolutions'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setNursingEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NursingEvolution)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'nursingEvolutions'));

      unsubIncidentRecords = onSnapshot(query(collection(db, 'incidentRecords'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setIncidentRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as IncidentRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'incidentRecords'));

      unsubShiftSchedules = onSnapshot(query(collection(db, 'shiftSchedules'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setShiftSchedules(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftSchedule)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'shiftSchedules'));

      unsubAvdRecords = onSnapshot(query(collection(db, 'avdRecords'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setAvdRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AVDRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'avdRecords'));

      unsubDiaperChangeRecords = onSnapshot(query(collection(db, 'diaperChangeRecords'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setDiaperChangeRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DiaperChangeRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'diaperChangeRecords'));
    }

    // 5. Psicologia
    if (activeTab === 'psychology') {
      unsubPsychPatients = onSnapshot(query(collection(db, 'psychPatients'), orderBy('name'), limit(100)), (snapshot) => {
        setPsychPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychPatient)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychPatients'));

      unsubPsychInitialAssessments = onSnapshot(query(collection(db, 'psychInitialAssessments'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPsychInitialAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychInitialAssessment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychInitialAssessments'));

      unsubPsychEvolutions = onSnapshot(query(collection(db, 'psychEvolutions'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setPsychEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychEvolution)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychEvolutions'));

      unsubPsychAppointments = onSnapshot(query(collection(db, 'psychAppointments'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPsychAppointments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychAppointment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychAppointments'));

      unsubPsychEmotionalMonitorings = onSnapshot(query(collection(db, 'psychEmotionalMonitorings'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPsychEmotionalMonitorings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychEmotionalMonitoring)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychEmotionalMonitoring'));

      unsubPsychFamilyBonds = onSnapshot(query(collection(db, 'psychFamilyBonds'), limit(300)), (snapshot) => {
        setPsychFamilyBonds(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychFamilyBond)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychFamilyBonds'));

      unsubPsychActivities = onSnapshot(query(collection(db, 'psychActivities'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPsychActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychActivity)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychActivities'));

      unsubPsychCognitionAssessments = onSnapshot(query(collection(db, 'psychCognitionAssessments'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPsychCognitionAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychCognitionAssessment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychCognitionAssessments'));

      unsubPsychInterventionPlans = onSnapshot(query(collection(db, 'psychInterventionPlans'), limit(300)), (snapshot) => {
        setPsychInterventionPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PsychInterventionPlan)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'psychInterventionPlans'));
    }

    // 6. Pedagogia
    if (activeTab === 'pedagogy') {
      unsubPedagogyPatients = onSnapshot(query(collection(db, 'pedagogyPatients'), orderBy('name'), limit(100)), (snapshot) => {
        setPedagogyPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyPatient)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyPatients'));

      unsubPedagogyInitialAssessments = onSnapshot(query(collection(db, 'pedagogyInitialAssessments'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPedagogyInitialAssessments(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyInitialAssessment)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyInitialAssessments'));

      unsubPedagogyEvolutions = onSnapshot(query(collection(db, 'pedagogyEvolutions'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setPedagogyEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyEvolution)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyEvolutions'));

      unsubPedagogyActivities = onSnapshot(query(collection(db, 'pedagogyActivities'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPedagogyActivities(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyActivity)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyActivities'));

      unsubPedagogyStimulationTrackings = onSnapshot(query(collection(db, 'pedagogyStimulationTrackings'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPedagogyStimulationTrackings(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyStimulationTracking)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyStimulationTrackings'));

      unsubPedagogySocialParticipations = onSnapshot(query(collection(db, 'pedagogySocialParticipations'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setPedagogySocialParticipations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogySocialParticipation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogySocialParticipations'));

      unsubPedagogyIndividualPlans = onSnapshot(query(collection(db, 'pedagogyIndividualPlans'), limit(300)), (snapshot) => {
        setPedagogyIndividualPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PedagogyIndividualPlan)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pedagogyIndividualPlans'));
    }

    // 7. Serviço Social
    if (activeTab === 'socialWork') {
      unsubSocialPatients = onSnapshot(query(collection(db, 'socialPatients'), orderBy('name'), limit(100)), (snapshot) => {
        setSocialPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialPatient)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialPatients'));

      unsubSocialFamilyTies = onSnapshot(query(collection(db, 'socialFamilyTies'), limit(300)), (snapshot) => {
        setSocialFamilyTies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialFamilyTie)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialFamilyTies'));

      unsubSocialDocumentations = onSnapshot(query(collection(db, 'socialDocumentations'), limit(300)), (snapshot) => {
        setSocialDocumentations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialDocumentation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialDocumentations'));

      unsubSocialLegalSituations = onSnapshot(query(collection(db, 'socialLegalSituations'), limit(300)), (snapshot) => {
        setSocialLegalSituations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialLegalSituation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialLegalSituations'));

      unsubSocialStudies = onSnapshot(query(collection(db, 'socialStudies'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setSocialStudies(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialStudy)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialStudies'));

      unsubSocialEvolutions = onSnapshot(query(collection(db, 'socialEvolutions'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setSocialEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialEvolution)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialEvolutions'));

      unsubSocialReferrals = onSnapshot(query(collection(db, 'socialReferrals'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setSocialReferrals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialReferral)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialReferrals'));

      unsubSocialFamilyVisits = onSnapshot(query(collection(db, 'socialFamilyVisits'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setSocialFamilyVisits(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialFamilyVisit)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialFamilyVisits'));

      unsubSocialRiskSituations = onSnapshot(query(collection(db, 'socialRiskSituations'), limit(300)), (snapshot) => {
        setSocialRiskSituations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SocialRiskSituation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'socialRiskSituations'));

      unsubPias = onSnapshot(query(collection(db, 'pias'), limit(300)), (snapshot) => {
        setPias(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PIA)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'pias'));
    }

    // 8. Nutrição
    if (activeTab === 'nutrition') {
      unsubNutritionPatients = onSnapshot(query(collection(db, 'nutritionPatients'), orderBy('name'), limit(100)), (snapshot) => {
        setNutritionPatients(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionPatient)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionPatients'));

      unsubNutritionEvolutions = onSnapshot(query(collection(db, 'nutritionEvolutions'), orderBy('date', 'desc'), limit(500)), (snapshot) => {
        setNutritionEvolutions(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionEvolution)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionEvolutions'));

      unsubNutritionAnthropometries = onSnapshot(query(collection(db, 'nutritionAnthropometries'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
        setNutritionAnthropometries(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionAnthropometry)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionAnthropometries'));

      unsubNutritionMealPlans = onSnapshot(query(collection(db, 'nutritionMealPlans'), limit(100)), (snapshot) => {
        setNutritionMealPlans(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as NutritionMealPlan)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'nutritionMealPlans'));
    }

    // 9. Financeiro e Doadores
    if (['financial', 'treasury', 'donors'].includes(activeTab)) {
      if (['PRESIDENTE', 'AUXILIAR_ADMINISTRATIVO', 'COORDENADORA', 'TESOUREIRA'].includes(user.role) || auth.currentUser?.email === 'franciaraeabreucoelho@gmail.com') {
        unsubFinancial = onSnapshot(query(collection(db, 'financial'), orderBy('date', 'desc'), limit(300)), (snapshot) => {
          setFinancialRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FinancialRecord)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'financial'));

        unsubDonors = onSnapshot(query(collection(db, 'donors'), orderBy('name'), limit(200)), (snapshot) => {
          setDonors(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Donor)));
        }, (err) => handleFirestoreError(err, OperationType.LIST, 'donors'));
      }
    }

    // 10. Suporte à Presidência e Apoio Institucional
    if (activeTab === 'presidency_support') {
      unsubPresidencyDocs = onSnapshot(query(collection(db, 'presidency_support'), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
        setPresidencyDocs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as PresidencySupportDocument)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'presidency_support'));
    }

    if (activeTab === 'institutional_support') {
      unsubInstitutionalRecords = onSnapshot(query(collection(db, 'institutional_support'), orderBy('createdAt', 'desc'), limit(100)), (snapshot) => {
        setInstitutionalRecords(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InstitutionalSupportRecord)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'institutional_support'));
    }

    // 11. Galeria
    if (activeTab === 'gallery') {
      unsubGallery = onSnapshot(query(collection(db, 'gallery'), orderBy('date', 'desc'), limit(50)), (snapshot) => {
        const galleryData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as GalleryItem));
        setAllPhotos(galleryData && galleryData.length > 0 ? galleryData : MOCK_GALLERY);
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'gallery'));
    }

    // 12. Usuários e Profissionais
    if (['professionals', 'adminAssistant'].includes(activeTab)) {
      unsubUsers = onSnapshot(query(collection(db, 'profiles'), limit(50)), (snapshot) => {
        setAdminUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as User)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'profiles'));

      unsubStaff = onSnapshot(collection(db, 'users'), (snapshot) => {
        setUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as StaffMember)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'users'));
    }

    // 13. Avaliações Técnicas / Profissional
    if (activeTab === 'professional') {
      unsubProfessionals = onSnapshot(query(collection(db, 'professionals'), orderBy('name'), limit(100)), (snapshot) => {
        setProfessionals(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Professional)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'professionals'));

      unsubProfessionalEvaluations = onSnapshot(query(collection(db, 'professionalEvaluations'), orderBy('date', 'desc'), limit(100)), (snapshot) => {
        setProfessionalEvaluations(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ProfessionalEvaluation)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'professionalEvaluations'));
    }

    // 14. Voluntários, Comunidade e Acompanhamento Familiar
    if (['volunteers', 'family', 'elderly'].includes(activeTab)) {
      unsubVolunteers = onSnapshot(query(collection(db, 'volunteers'), orderBy('name'), limit(100)), (snapshot) => {
        setVolunteers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteer)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'volunteers'));

      unsubCommunityElderly = onSnapshot(query(collection(db, 'communityElderly'), orderBy('name'), limit(100)), (snapshot) => {
        setCommunityElderly(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityElderly)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'communityElderly'));

      unsubCaregivers = onSnapshot(query(collection(db, 'caregivers'), orderBy('name'), limit(100)), (snapshot) => {
        setCaregivers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Caregiver)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'caregivers'));

      unsubFamilyEngagements = onSnapshot(query(collection(db, 'familyEngagements'), where('date', '>=', thirtyDaysAgoStr), orderBy('date', 'desc'), limit(50)), (snapshot) => {
        setFamilyEngagements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as FamilyEngagement)));
      }, (err) => handleFirestoreError(err, OperationType.LIST, 'familyEngagements'));
    }

    return () => {
      unsubEvolutions();
      unsubEvents();
      unsubWorkshops();
      unsubFinal();
      unsubRawProd();
      unsubWIP();
      unsubGoals();
      unsubDiaperDonations();
      unsubDiaperBeneficiaries();
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
      unsubSocialFamilyTies();
      unsubSocialDocumentations();
      unsubSocialLegalSituations();
      unsubSocialStudies();
      unsubSocialEvolutions();
      unsubSocialReferrals();
      unsubSocialFamilyVisits();
      unsubSocialRiskSituations();
      unsubPias();
      unsubNutritionPatients();
      unsubNutritionEvolutions();
      unsubNutritionAnthropometries();
      unsubNutritionMealPlans();
      unsubDonors();
      unsubFinancial();
      unsubPresidencyDocs();
      unsubInstitutionalRecords();
      unsubUsers();
      unsubStaff();
      unsubGallery();
      unsubCommunityElderly();
      unsubVolunteers();
      unsubCaregivers();
      unsubFamilyEngagements();
      unsubProfessionals();
      unsubProfessionalEvaluations();
    };
  }, [isAuthReady, user?.id, user?.role, activeTab]);

  const handleGoogleLogin = async () => {
    if (isLoggingIn) return;
    setIsLoggingIn(true);
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
    } finally {
      setIsLoggingIn(false);
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
      await addDoc(collection(db, 'notifications'), cleanData(newNotification));
    } catch (err) {
      console.error("Error sending notification:", err);
    }
  };

  const notifyTaggedCoWorkers = async (
    currentCoWorkers: string[],
    previousCoWorkers: string[],
    title: string,
    messageBuilder: (name: string) => string,
    activityId?: string,
    tipo?: string,
    rotaDestino?: string,
    link?: string
  ) => {
    try {
      const newlyAdded = currentCoWorkers.filter(val => !previousCoWorkers.includes(val));
      for (const value of newlyAdded) {
        // Find recipient in users or professionals
        const recipientUser = users.find(u => u.id === value || u.email === value || u.name === value || (u.name && u.name.toLowerCase() === value.toLowerCase()));
        if (recipientUser) {
          await sendNotification({
            title,
            message: messageBuilder(recipientUser.name),
            type: 'SYSTEM',
            targetRole: recipientUser.role,
            professionalName: recipientUser.name,
            targetUserId: recipientUser.id,
            targetEmail: recipientUser.email || undefined,
            usuarioId: recipientUser.id,
            atividadeId: activityId,
            tipo,
            rotaDestino,
            mensagem: messageBuilder(recipientUser.name),
            data: new Date().toISOString(),
            lida: false,
            link
          });
          continue;
        }

        const recipientProf = professionals.find(p => p.id === value || p.email === value || p.name === value || (p.name && p.name.toLowerCase() === value.toLowerCase()));
        if (recipientProf) {
          await sendNotification({
            title,
            message: messageBuilder(recipientProf.name),
            type: 'SYSTEM',
            targetRole: recipientProf.role,
            professionalName: recipientProf.name,
            targetUserId: recipientProf.id,
            targetEmail: recipientProf.email || undefined,
            usuarioId: recipientProf.id || value,
            atividadeId: activityId,
            tipo,
            rotaDestino,
            mensagem: messageBuilder(recipientProf.name),
            data: new Date().toISOString(),
            lida: false,
            link
          });
        }
      }
    } catch (err) {
      console.error("Error sending coWorker notifications:", err);
    }
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      await updateDoc(doc(db, 'notifications', id), { read: true });
    } catch (err) {
      console.error("Error marking notification as read:", err);
    }
  };

  const deleteNotification = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'notifications', id));
    } catch (err) {
      console.error("Error deleting notification:", err);
    }
  };

  const openRecordFromNotification = (tipo: string, recordId: string) => {
    let match: any = null;
    let sector = '';
    let subTab = '';
    let title = '';
    let sectorLabel = '';

    if (tipo === 'nursingEvolutions') {
      match = nursingEvolutions.find(e => e.id === recordId);
      sector = 'nursing';
      subTab = 'evolutions';
      title = 'Evolução de Enfermagem';
      sectorLabel = 'Enfermagem';
    } else if (tipo === 'physioEvolutions') {
      match = physioEvolutions.find(e => e.id === recordId);
      sector = 'physio';
      subTab = 'evolution';
      title = 'Evolução de Fisioterapia';
      sectorLabel = 'Fisioterapia';
    } else if (tipo === 'psychEvolutions') {
      match = psychEvolutions.find(e => e.id === recordId);
      sector = 'psychology';
      subTab = 'evolution';
      title = 'Evolução de Psicologia';
      sectorLabel = 'Psicologia';
    } else if (tipo === 'pedagogyEvolutions') {
      match = pedagogyEvolutions.find(e => e.id === recordId);
      sector = 'pedagogy';
      subTab = 'evolution';
      title = 'Evolução de Pedagogia';
      sectorLabel = 'Pedagogia';
    } else if (tipo === 'socialEvolutions') {
      match = socialEvolutions.find(e => e.id === recordId);
      sector = 'socialWork';
      subTab = 'evolution';
      title = 'Evolução de Serviço Social';
      sectorLabel = 'Serviço Social';
    } else if (tipo === 'nutritionEvolutions') {
      match = nutritionEvolutions.find(e => e.id === recordId);
      sector = 'nutrition';
      subTab = 'evolutions';
      title = 'Evolução de Nutrição';
      sectorLabel = 'Nutrição';
    } else if (tipo === 'workshops') {
      match = workshops.find(w => w.id === recordId);
      sector = 'workshops';
      subTab = '';
      title = 'Oficina';
      sectorLabel = 'Oficinas';
    } else if (tipo === 'psychActivities') {
      match = psychActivities.find(a => a.id === recordId);
      sector = 'psychology';
      subTab = 'activities';
      title = 'Atividade Prática (Psicologia)';
      sectorLabel = 'Psicologia';
    } else if (tipo === 'pedagogyActivities') {
      match = pedagogyActivities.find(a => a.id === recordId);
      sector = 'pedagogy';
      subTab = 'activities';
      title = 'Atividade Pedagógica';
      sectorLabel = 'Pedagogia';
    }

    if (match) {
      setActiveTab(sector as any);
      if (subTab) {
        localStorage.setItem(`oami-${sector}-tab`, subTab);
        setSectorDefaultTabs(prev => ({
          ...prev,
          [sector]: subTab
        }));
      }

      setSelectedActivityForView({
        id: match.id,
        type: tipo.toUpperCase().includes('EVOLUTION') ? 'EVOLUÇÃO' : (tipo.toUpperCase().includes('WORKSHOP') ? 'OFICINA' : 'ATIVIDADE'),
        title: match.title || match.activityTitle || title,
        date: match.date || '',
        isCreator: match.registeredBy === user?.id,
        sector: sectorLabel,
        coWorkers: match.coWorkers || [],
        registeredBy: match.registeredBy || '',
        rawItem: match
      });
    } else {
      showToast('Registro não encontrado ou ainda sincronizando.', 'error');
    }
  };

  const handleSaveSharedActivity = async (collectionName: string, id: string, updatedData: any) => {
    try {
      const docRef = doc(db, collectionName, id);
      await updateDoc(docRef, cleanData(updatedData));
      
      // Instant snap update for fast responsiveness
      if (collectionName === 'nursingEvolutions') {
        setNursingEvolutions(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      } else if (collectionName === 'physioEvolutions') {
        setPhysioEvolutions(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      } else if (collectionName === 'psychEvolutions') {
        setPsychEvolutions(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      } else if (collectionName === 'pedagogyEvolutions') {
        setPedagogyEvolutions(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      } else if (collectionName === 'socialEvolutions') {
        setSocialEvolutions(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      } else if (collectionName === 'nutritionEvolutions') {
        setNutritionEvolutions(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      } else if (collectionName === 'workshops') {
        setWorkshops(prev => prev.map(e => e.id === id ? { ...e, ...updatedData } : e));
      }
    } catch (err) {
      console.error("Error updating shared activity:", err);
      throw err;
    }
  };

  const handleDeleteSharedActivity = async (collectionName: string, id: string) => {
    try {
      const docRef = doc(db, collectionName, id);
      await deleteDoc(docRef);
      
      // Instant snap delete
      if (collectionName === 'nursingEvolutions') {
        setNursingEvolutions(prev => prev.filter(e => e.id !== id));
      } else if (collectionName === 'physioEvolutions') {
        setPhysioEvolutions(prev => prev.filter(e => e.id !== id));
      } else if (collectionName === 'psychEvolutions') {
        setPsychEvolutions(prev => prev.filter(e => e.id !== id));
      } else if (collectionName === 'pedagogyEvolutions') {
        setPedagogyEvolutions(prev => prev.filter(e => e.id !== id));
      } else if (collectionName === 'socialEvolutions') {
        setSocialEvolutions(prev => prev.filter(e => e.id !== id));
      } else if (collectionName === 'nutritionEvolutions') {
        setNutritionEvolutions(prev => prev.filter(e => e.id !== id));
      } else if (collectionName === 'workshops') {
        setWorkshops(prev => prev.filter(w => w.id !== id));
      }
    } catch (err) {
      console.error("Error deleting shared activity:", err);
      throw err;
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
      let recordId = id || '';
      if (id) {
        await updateDoc(doc(db, 'physioEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'physioEvolutions'), cleanedData);
        recordId = docRef.id;
        showToast('Evolução registrada com sucesso');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (physioEvolutions.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Evolução em Conjunto',
          (name) => `Você foi adicionado como colaborador do atendimento de Fisioterapia por ${user?.name || 'um colega'}.`,
          recordId,
          'physioEvolutions',
          'physio'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de fisioterapia:", notifErr);
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
      let recordId = id || '';
      if (id) {
        await updateDoc(doc(db, 'nursingEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'nursingEvolutions'), cleanedData);
        recordId = docRef.id;
        showToast('Evolução registrada com sucesso');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = data.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (nursingEvolutions.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Evolução em Conjunto',
          (name) => `Você foi adicionado como colaborador do atendimento de Enfermagem por ${user?.name || 'um colega'}.`,
          recordId,
          'nursingEvolutions',
          'nursing'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de enfermagem:", notifErr);
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
      if (collectionName === 'psychEvolutions' && id.startsWith('act-')) {
        const actId = id.substring(4);
        await deleteDoc(doc(db, 'psychActivities', actId));
      } else if (collectionName === 'psychEvolutions' && id.startsWith('appt-')) {
        const apptId = id.substring(4);
        await deleteDoc(doc(db, 'psychAppointments', apptId));
      } else if (collectionName === 'psychInitialAssessments') {
        const assessmentSnap = await getDoc(doc(db, 'psychInitialAssessments', id));
        if (assessmentSnap.exists()) {
          const assessmentData = assessmentSnap.data();
          if (assessmentData.patientId && assessmentData.date) {
            // Delete linked emotional monitorings
            const emotionalColl = collection(db, 'psychEmotionalMonitorings');
            const q = query(
              emotionalColl,
              where('patientId', '==', assessmentData.patientId),
              where('date', '==', assessmentData.date)
            );
            const snapshot = await getDocs(q);
            for (const docSnap of snapshot.docs) {
              await deleteDoc(doc(db, 'psychEmotionalMonitorings', docSnap.id));
            }

            // Delete linked cognition assessments
            const cognitionColl = collection(db, 'psychCognitionAssessments');
            const qCognition = query(
              cognitionColl,
              where('patientId', '==', assessmentData.patientId),
              where('date', '==', assessmentData.date)
            );
            const snapshotCognition = await getDocs(qCognition);
            for (const docSnap of snapshotCognition.docs) {
              await deleteDoc(doc(db, 'psychCognitionAssessments', docSnap.id));
            }
          }
        }
        await deleteDoc(doc(db, 'psychInitialAssessments', id));
      } else {
        await deleteDoc(doc(db, collectionName, id));
      }
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
    // Proactively delete locally to bypass quota issues immediately
    if (collectionName === 'socialFamilyVisits') {
      setSocialFamilyVisits(prev => prev.filter(v => v.id !== id));
    } else if (collectionName === 'socialEvolutions') {
      setSocialEvolutions(prev => prev.filter(e => e.id !== id));
    } else if (collectionName === 'socialFamilyTies') {
      setSocialFamilyTies(prev => prev.filter(t => t.id !== id));
    } else if (collectionName === 'socialDocumentations') {
      setSocialDocumentations(prev => prev.filter(d => d.id !== id));
    } else if (collectionName === 'socialLegalSituations') {
      setSocialLegalSituations(prev => prev.filter(l => l.id !== id));
    } else if (collectionName === 'socialStudies') {
      setSocialStudies(prev => prev.filter(s => s.id !== id));
    } else if (collectionName === 'socialReferrals') {
      setSocialReferrals(prev => prev.filter(r => r.id !== id));
    } else if (collectionName === 'socialRisks') {
      setSocialRiskSituations(prev => prev.filter(r => r.id !== id));
    } else if (collectionName === 'pias' || collectionName === 'socialPIAs') {
      setPias(prev => prev.filter(p => p.id !== id));
    }

    try {
      await deleteDoc(doc(db, collectionName, id));
      showToast('Registro removido com sucesso');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
      showToast('Cota excedida - Registro removido localmente', 'success');
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

      // Automatically sync to psychEmotionalMonitorings collection
      if (cleanedData.wellBeing) {
        const emotionalColl = collection(db, 'psychEmotionalMonitorings');
        const q = query(
          emotionalColl,
          where('patientId', '==', cleanedData.patientId),
          where('date', '==', cleanedData.date)
        );
        const snapshot = await getDocs(q);
        const monitoringPayload = {
          patientId: cleanedData.patientId,
          targetName: cleanedData.targetName || '',
          targetType: cleanedData.targetType || 'IDOSO_COMUNIDADE',
          date: cleanedData.date,
          wellBeing: cleanedData.wellBeing,
          sadness: cleanedData.sadness || 'NENHUM',
          anxiety: cleanedData.anxiety || 'NENHUM',
          loneliness: cleanedData.loneliness || 'NENHUM',
          irritability: cleanedData.irritability || 'NENHUM',
          registeredBy: cleanedData.registeredBy || 'Psicóloga',
          observations: cleanedData.observations || ''
        };

        if (!snapshot.empty) {
          const matchId = snapshot.docs[0].id;
          await updateDoc(doc(db, 'psychEmotionalMonitorings', matchId), cleanData(monitoringPayload));
        } else {
          await addDoc(emotionalColl, cleanData(monitoringPayload));
        }
      }

      // Automatically sync to psychCognitionAssessments collection
      if (cleanedData.memory) {
        const cognitionColl = collection(db, 'psychCognitionAssessments');
        const q = query(
          cognitionColl,
          where('patientId', '==', cleanedData.patientId),
          where('date', '==', cleanedData.date)
        );
        const snapshot = await getDocs(q);
        const cognitionPayload = {
          patientId: cleanedData.patientId,
          targetName: cleanedData.targetName || '',
          targetType: cleanedData.targetType || 'IDOSO_COMUNIDADE',
          date: cleanedData.date,
          memory: cleanedData.memory || 'PRESERVADO',
          attention: cleanedData.attention || 'PRESERVADO',
          orientation: cleanedData.orientation || 'PRESERVADO',
          registeredBy: cleanedData.registeredBy || 'Psicóloga',
          observations: cleanedData.cognitionObservations || ''
        };

        if (!snapshot.empty) {
          const matchId = snapshot.docs[0].id;
          await updateDoc(doc(db, 'psychCognitionAssessments', matchId), cleanData(cognitionPayload));
        } else {
          await addDoc(cognitionColl, cleanData(cognitionPayload));
        }
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
      let recordId = id || '';
      if (id) {
        if (id.startsWith('act-')) {
          const actId = id.substring(4);
          const activityPayload: any = {
            date: rest.date,
            description: rest.observation,
            participants: rest.patientIds || (rest.patientId ? [rest.patientId] : []),
            coWorkers: rest.coWorkers || [],
            photos: rest.photos || [],
            registeredBy: rest.registeredBy || 'Psicóloga',
            title: 'Atividade Integrada',
            type: 'OFICINA'
          };
          await updateDoc(doc(db, 'psychActivities', actId), cleanData(activityPayload));
          showToast('Atividade atualizada com sucesso');
          recordId = actId;
        } else if (id.startsWith('appt-')) {
          const apptId = id.substring(4);
          const apptPayload: any = {
            date: rest.date,
            time: rest.time || '12:00',
            observations: rest.observation,
            patientId: rest.patientId || (rest.patientIds && rest.patientIds[0]) || '',
            patientIds: rest.patientIds || (rest.patientId ? [rest.patientId] : []),
            registeredBy: rest.registeredBy || 'Psicóloga',
            type: 'INDIVIDUAL',
            status: 'REALIZADO'
          };
          await updateDoc(doc(db, 'psychAppointments', apptId), cleanData(apptPayload));
          showToast('Atendimento atualizado com sucesso');
          recordId = apptId;
        } else {
          await updateDoc(doc(db, 'psychEvolutions', id), cleanedData);
          showToast('Evolução atualizada com sucesso');
        }
      } else {
        const docRef = await addDoc(collection(db, 'psychEvolutions'), cleanedData);
        recordId = docRef.id;
        showToast('Evolução registrada com sucesso');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (psychEvolutions.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Evolução em Conjunto',
          (name) => `Você foi adicionado como colaborador do atendimento de Psicologia por ${user?.name || 'um colega'}.`,
          recordId,
          'psychEvolutions',
          'psychology'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de psicologia:", notifErr);
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
      let recordId = id || '';
      if (id) {
        await updateDoc(doc(doc(db, 'psychActivities', id).parent, id), cleanedData);
        showToast('Atividade atualizada com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'psychActivities'), cleanedData);
        recordId = docRef.id;
        showToast('Atividade registrada com sucesso');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (psychActivities.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Atividade em Conjunto',
          (name) => `Você foi adicionado como colaborador na atividade de Psicologia "${rest.title}" por ${user?.name || 'um colega'}.`,
          recordId,
          'psychActivities',
          'psychology'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de psicologia:", notifErr);
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
      let recordId = id || '';
      if (id) {
        await updateDoc(doc(db, 'pedagogyEvolutions', id), cleanedData);
        showToast('Evolução atualizada com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'pedagogyEvolutions'), cleanedData);
        recordId = docRef.id;
        showToast('Evolução registrada com sucesso');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (pedagogyEvolutions.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Evolução em Conjunto',
          (name) => `Você foi adicionado como colaborador do atendimento de Pedagogia por ${user?.name || 'um colega'}.`,
          recordId,
          'pedagogyEvolutions',
          'pedagogy'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de pedagogia:", notifErr);
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
      let recordId = id || '';
      if (id) {
        await updateDoc(doc(doc(db, 'pedagogyActivities', id!).parent, id!), cleanedData);
        showToast('Atividade atualizada com sucesso');
      } else {
        const docRef = await addDoc(collection(db, 'pedagogyActivities'), cleanedData);
        recordId = docRef.id;
        showToast('Atividade registrada com sucesso');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (pedagogyActivities.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Atividade em Conjunto',
          (name) => `Você foi adicionado como colaborador na atividade de Pedagogia "${rest.title}" por ${user?.name || 'um colega'}.`,
          recordId,
          'pedagogyActivities',
          'pedagogy'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de pedagogia:", notifErr);
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
        lastProfession: data.previousProfession,
        address: data.address,
        phone: data.phone,
        responsibleName: data.responsibleName,
        responsiblePhone: data.responsiblePhone
      });

      showToast('Perfil social salvo e compartilhado');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialPatients');
      showToast('Erro ao salvar perfil social', 'error');
    }
  };

  const handleSaveSocialPIA = async (data: Partial<PIA>) => {
    const piaId = data.id || `pia-${Date.now()}`;
    const newPIA: PIA = {
      id: piaId,
      elderlyId: data.elderlyId || '',
      date: data.date || new Date().toISOString(),
      responsible: data.responsible || '',
      status: data.status || 'EM_ANDAMENTO',
      hasBPC: data.hasBPC !== undefined ? data.hasBPC : false,
      hasPension: data.hasPension !== undefined ? data.hasPension : false,
      hasLoans: data.hasLoans !== undefined ? data.hasLoans : false,
      loanDetails: data.loanDetails || '',
      hasProperty: data.hasProperty !== undefined ? data.hasProperty : false,
      monthlyIncome: data.monthlyIncome || 0,
      familyInvolvement: data.familyInvolvement || 'MEDIO',
      familyObservations: data.familyObservations || '',
      healthStatus: data.healthStatus || '',
      medications: data.medications || '',
      mobilityStatus: data.mobilityStatus || '',
      objectives: data.objectives || '',
      actions: data.actions || '',
      observations: data.observations || ''
    };

    setPias(prev => {
      const exists = prev.some(p => p.id === piaId);
      if (exists) {
        return prev.map(p => p.id === piaId ? newPIA : p);
      } else {
        return [newPIA, ...prev];
      }
    });

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
      showToast('PIA registrado localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialFamilyTie = async (data: Partial<SocialFamilyTie>) => {
    const existingTie = data.id 
      ? socialFamilyTies.find(t => t.id === data.id)
      : socialFamilyTies.find(t => t.patientId === data.patientId);

    const tieId = existingTie?.id || data.id || `tie-${Date.now()}`;
    const newTie: SocialFamilyTie = {
      id: tieId,
      patientId: data.patientId || '',
      hasFamily: data.hasFamily !== undefined ? data.hasFamily : true,
      members: data.members || [],
      observations: data.observations || '',
      abandonmentRisk: !!data.abandonmentRisk,
      registeredBy: data.registeredBy || user?.name || 'Assistente Social',
      updatedAt: new Date().toISOString()
    };

    setSocialFamilyTies(prev => {
      const exists = prev.some(t => t.id === tieId);
      if (exists) {
        return prev.map(t => t.id === tieId ? newTie : t);
      } else {
        return [newTie, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialFamilyTies', tieId), { ...cleanedData, updatedAt: new Date().toISOString() }, { merge: true });
      showToast('Vínculo familiar salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialFamilyTies');
      showToast('Vínculo familiar registrado localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialDocumentation = async (data: Partial<SocialDocumentation>) => {
    const existingDoc = data.id 
      ? socialDocumentations.find(d => d.id === data.id)
      : socialDocumentations.find(d => d.patientId === data.patientId);

    const docId = existingDoc?.id || data.id || `doc-${Date.now()}`;
    const newDoc: SocialDocumentation = {
      id: docId,
      patientId: data.patientId || '',
      rg: data.rg || 'PENDENTE',
      cpf: data.cpf || 'PENDENTE',
      sus: data.sus || 'PENDENTE',
      birthCertificate: data.birthCertificate || 'PENDENTE',
      addressProof: data.addressProof || 'PENDENTE',
      observations: data.observations || '',
      updatedAt: new Date().toISOString()
    };

    setSocialDocumentations(prev => {
      const exists = prev.some(d => d.id === docId);
      if (exists) {
        return prev.map(d => d.id === docId ? newDoc : d);
      } else {
        return [newDoc, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialDocumentations', docId), { ...cleanedData, updatedAt: new Date().toISOString() }, { merge: true });
      showToast('Documentação salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialDocumentations');
      showToast('Documentação registrada localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialLegalSituation = async (data: Partial<SocialLegalSituation>) => {
    const existingLegal = data.id 
      ? socialLegalSituations.find(l => l.id === data.id)
      : socialLegalSituations.find(l => l.patientId === data.patientId);

    const legalId = existingLegal?.id || data.id || `legal-${Date.now()}`;
    const newLegal: SocialLegalSituation = {
      id: legalId,
      patientId: data.patientId || '',
      hasCurator: data.hasCurator !== undefined ? !!data.hasCurator : !!data.curatorName,
      curatorName: data.curatorName || '',
      isInterdicted: !!data.isInterdicted,
      processNumber: data.processNumber || '',
      comarca: data.comarca || '',
      situationStatus: data.situationStatus || 'PENDENTE',
      observations: data.observations || '',
      updatedAt: new Date().toISOString()
    };

    setSocialLegalSituations(prev => {
      const exists = prev.some(l => l.id === legalId);
      if (exists) {
        return prev.map(l => l.id === legalId ? newLegal : l);
      } else {
        return [newLegal, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialLegalSituations', legalId), { ...cleanedData, updatedAt: new Date().toISOString() }, { merge: true });
      showToast('Situação jurídica salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialLegalSituations');
      showToast('Situação jurídica registrada localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialStudy = async (data: Partial<SocialStudy>) => {
    const studyId = data.id || `study-${Date.now()}`;
    const newStudy: SocialStudy = {
      id: studyId,
      patientId: data.patientId || '',
      date: data.date || new Date().toISOString(),
      lifeHistory: data.lifeHistory || '',
      socialConditions: data.socialConditions || '',
      institutionalizationReason: data.institutionalizationReason || '',
      supportNetwork: data.supportNetwork || '',
      technicalOpinion: data.technicalOpinion || '',
      registeredBy: data.registeredBy || user?.name || 'Assistente Social'
    };

    setSocialStudies(prev => {
      const exists = prev.some(s => s.id === studyId);
      if (exists) {
        return prev.map(s => s.id === studyId ? newStudy : s);
      } else {
        return [newStudy, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialStudies', studyId), cleanedData, { merge: true });
      showToast('Estudo social salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialStudies');
      showToast('Estudo social registrado localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialEvolution = async (data: Partial<SocialEvolution>) => {
    const evolutionId = data.id || `evo-${Date.now()}`;
    const newEvo: SocialEvolution = {
      id: evolutionId,
      patientId: data.patientId || '',
      date: data.date || new Date().toISOString(),
      serviceType: data.serviceType || '',
      observation: data.observation || '',
      textPlan: data.textPlan || '',
      conduct: data.conduct || '',
      registeredBy: data.registeredBy || user?.name || 'Assistente Social',
      photos: data.photos || [],
      coWorkers: data.coWorkers || []
    };

    setSocialEvolutions(prev => {
      const exists = prev.some(e => e.id === evolutionId);
      if (exists) {
        return prev.map(e => e.id === evolutionId ? newEvo : e);
      } else {
        return [newEvo, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialEvolutions', evolutionId), cleanedData, { merge: true });
      showToast('Evolução social salva com sucesso');

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (socialEvolutions.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Evolução em Conjunto',
          (name) => `Você foi adicionado como colaborador do atendimento de Serviço Social por ${user?.name || 'um colega'}.`,
          evolutionId,
          'socialEvolutions',
          'socialWork'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de serviço social:", notifErr);
      }
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialEvolutions');
      showToast('Evolução social registrada localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialReferral = async (data: Partial<SocialReferral>) => {
    const refId = data.id || `ref-${Date.now()}`;
    const newRef: SocialReferral = {
      id: refId,
      patientId: data.patientId || '',
      date: data.date || new Date().toISOString(),
      destination: data.destination || 'OUTRO',
      description: data.description || '',
      status: data.status || 'EM_ANDAMENTO',
      observations: data.observations || '',
      registeredBy: data.registeredBy || user?.name || 'Assistente Social'
    };

    setSocialReferrals(prev => {
      const exists = prev.some(r => r.id === refId);
      if (exists) {
        return prev.map(r => r.id === refId ? newRef : r);
      } else {
        return [newRef, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialReferrals', refId), cleanedData, { merge: true });
      showToast('Encaminhamento salvo com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialReferrals');
      showToast('Encaminhamento registrado localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveSocialFamilyVisit = async (data: Partial<SocialFamilyVisit>) => {
    const visitId = data.id || `visit-${Date.now()}`;
    const newVisit: SocialFamilyVisit = {
      id: visitId,
      patientId: data.patientId || '',
      date: data.date || new Date().toISOString(),
      visitorName: data.visitorName || '',
      kinship: data.kinship || '',
      observations: data.observations || '',
      registeredBy: data.registeredBy || user?.name || 'Assistente Social',
    };

    setSocialFamilyVisits(prev => {
      const exists = prev.some(v => v.id === visitId);
      if (exists) {
        return prev.map(v => v.id === visitId ? newVisit : v);
      } else {
        return [newVisit, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialFamilyVisits', visitId), cleanedData, { merge: true });
      showToast('Visita familiar salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialFamilyVisits');
      showToast('Visita familiar registrada localmente (Cota excedida)', 'success');
    }
  };

  const handleSaveProfessionalEvaluation = async (evaluationData: Partial<ProfessionalEvaluation>) => {
    const evalId = evaluationData.id || `eval-${Date.now()}`;
    const newEval: ProfessionalEvaluation = {
      id: evalId,
      professionalId: evaluationData.professionalId || '',
      professionalName: evaluationData.professionalName || '',
      professionalRole: evaluationData.professionalRole || '',
      evaluatorId: evaluationData.evaluatorId || user?.id || 'evaluator-1',
      evaluatorName: evaluationData.evaluatorName || user?.name || 'Coordenador',
      date: evaluationData.date || new Date().toISOString().split('T')[0],
      attendance: Number(evaluationData.attendance ?? 5),
      teamwork: Number(evaluationData.teamwork ?? 5),
      competence: Number(evaluationData.competence ?? 5),
      proactivity: Number(evaluationData.proactivity ?? 5),
      relationshipWithElderly: Number(evaluationData.relationshipWithElderly ?? 5),
      comments: evaluationData.comments || '',
      recommendations: evaluationData.recommendations || '',
      createdAt: evaluationData.createdAt || new Date().toISOString()
    };

    setProfessionalEvaluations(prev => {
      const exists = prev.some(e => e.id === evalId);
      if (exists) {
        return prev.map(e => e.id === evalId ? { ...newEval, ...cleanData(evaluationData) } : e);
      } else {
        return [newEval, ...prev];
      }
    });

    try {
      const { id, ...rest } = newEval;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'professionalEvaluations', evalId), cleanedData, { merge: true });
      showToast('Avaliação de desempenho salva com sucesso!');
    } catch (err) {
      handleFirestoreError(err, evaluationData.id ? OperationType.UPDATE : OperationType.CREATE, 'professionalEvaluations');
      showToast('Avaliação registrada localmente (Offline)', 'success');
    }
  };

  const handleDeleteProfessionalEvaluation = async (evalId: string) => {
    setProfessionalEvaluations(prev => prev.filter(e => e.id !== evalId));
    try {
      await deleteDoc(doc(db, 'professionalEvaluations', evalId));
      showToast('Avaliação de desempenho excluída com sucesso!');
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `professionalEvaluations/${evalId}`);
      showToast('Registro excluído localmente', 'success');
    }
  };

  const handleSaveSocialRiskSituation = async (data: Partial<SocialRiskSituation>) => {
    const riskId = data.id || `risk-${Date.now()}`;
    const newRisk: SocialRiskSituation = {
      id: riskId,
      patientId: data.patientId || '',
      date: data.date || new Date().toISOString(),
      type: data.type || 'OUTRO',
      description: data.description || '',
      severity: data.severity || 'MEDIA',
      status: data.status || 'IDENTIFICADO',
      registeredBy: data.registeredBy || user?.name || 'Assistente Social'
    };

    setSocialRiskSituations(prev => {
      const exists = prev.some(r => r.id === riskId);
      if (exists) {
        return prev.map(r => r.id === riskId ? newRisk : r);
      } else {
        return [newRisk, ...prev];
      }
    });

    try {
      const { id, ...rest } = data;
      const cleanedData = cleanData(rest);
      await setDoc(doc(db, 'socialRiskSituations', riskId), cleanedData, { merge: true });
      showToast('Situação de risco salva com sucesso');
    } catch (err) {
      handleFirestoreError(err, data.id ? OperationType.UPDATE : OperationType.CREATE, 'socialRiskSituations');
      showToast('Situação de risco registrada localmente (Cota excedida)', 'success');
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
        diseases: data.comorbidities,
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
      let recordId = id || '';
      if (id) {
        await updateDoc(doc(db, 'nutritionEvolutions', id), cleanedData);
        showToast('Evolução nutricional atualizada');
      } else {
        const docRef = await addDoc(collection(db, 'nutritionEvolutions'), cleanedData);
        recordId = docRef.id;
        showToast('Evolução nutricional registrada');
      }

      // Envia notificação para novos co-workers
      try {
        const isNew = !id;
        const currentCoWorkers = rest.coWorkers || [];
        const previousCoWorkers = isNew ? [] : (nutritionEvolutions.find(a => a.id === id)?.coWorkers || []);
        
        await notifyTaggedCoWorkers(
          currentCoWorkers,
          previousCoWorkers,
          'Nova Evolução em Conjunto',
          (name) => `Você foi adicionado como colaborador do atendimento de Nutrição por ${user?.name || 'um colega'}.`,
          recordId,
          'nutritionEvolutions',
          'nutrition'
        );
      } catch (notifErr) {
        console.error("Erro ao enviar notificações de nutrição:", notifErr);
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
        isLoggingIn={isLoggingIn}
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
      case 'elderly': return (
        <ElderlySection 
          elderly={elderly} 
          evolutions={evolutions} 
          pias={pias} 
          showToast={showToast} 
          nursingPatients={nursingPatientsList}
          physioPatients={physioPatientsList}
          psychPatients={psychPatientsList}
          pedagogyPatients={pedagogyPatientsList}
          socialPatients={socialPatientsList}
          nutritionPatients={nutritionPatientsList}
        />
      );
      case 'physio': return (
        <PhysioSection 
          user={user}
          elderly={elderly}
          patients={physioPatientsList}
          assessments={physioAssessments}
          evolutions={mergedPhysioEvolutions}
          exercises={physioExercises}
          appointments={physioAppointments}
          professionals={professionals}
          nursingEvolutions={nursingEvolutions}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveCollaborationEvolution={handleSaveSharedActivity}
          onDeleteCollaborationEvolution={handleDeleteSharedActivity}
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
          evolutions={mergedNursingEvolutions}
          incidents={incidentRecords}
          shifts={shiftSchedules}
          users={users}
          professionals={professionals}
          avds={avdRecords}
          diaperChanges={diaperChangeRecords}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveCollaborationEvolution={handleSaveSharedActivity}
          onDeleteCollaborationEvolution={handleDeleteSharedActivity}
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
          evolutions={mergedPsychEvolutions}
          appointments={psychAppointments}
          emotionalMonitorings={psychEmotionalMonitorings}
          familyBonds={psychFamilyBonds}
          activities={psychActivities}
          cognitionAssessments={psychCognitionAssessments}
          interventionPlans={psychInterventionPlans}
          professionals={professionals}
          nursingEvolutions={nursingEvolutions}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveCollaborationEvolution={handleSaveSharedActivity}
          onDeleteCollaborationEvolution={handleDeleteSharedActivity}
          sendNotification={sendNotification}
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
          evolutions={mergedPedagogyEvolutions}
          activities={pedagogyActivities}
          stimulationTrackings={pedagogyStimulationTrackings}
          socialParticipations={pedagogySocialParticipations}
          individualPlans={pedagogyIndividualPlans}
          lifeHistories={pedagogyLifeHistories}
          professionals={professionals}
          nursingEvolutions={nursingEvolutions}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveCollaborationEvolution={handleSaveSharedActivity}
          onDeleteCollaborationEvolution={handleDeleteSharedActivity}
          sendNotification={sendNotification}
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
          evolutions={mergedSocialEvolutions}
          referrals={socialReferrals}
          familyVisits={socialFamilyVisits}
          riskSituations={socialRiskSituations}
          pias={pias}
          professionals={professionals}
          nursingEvolutions={nursingEvolutions}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveCollaborationEvolution={handleSaveSharedActivity}
          onDeleteCollaborationEvolution={handleDeleteSharedActivity}
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
          evolutions={mergedNutritionEvolutions}
          anthropometries={nutritionAnthropometries}
          mealPlans={nutritionMealPlans}
          professionals={professionals}
          nursingEvolutions={nursingEvolutions}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveCollaborationEvolution={handleSaveSharedActivity}
          onDeleteCollaborationEvolution={handleDeleteSharedActivity}
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
      case 'professional': return (
        <ProfessionalArea 
          professionals={professionals}
          evaluations={professionalEvaluations}
          onSaveEvaluation={handleSaveProfessionalEvaluation}
          onDeleteEvaluation={handleDeleteProfessionalEvaluation}
          user={user!} 
          showToast={showToast} 
        />
      );
      case 'financial': return <FinancialSection financialRecords={financialRecords} user={user!} showToast={showToast} />;
      case 'treasury': return <TreasurySection user={user!} showToast={showToast} showConfirm={showConfirm} />;
      case 'stock': return <StockSection user={user!} showToast={showToast} showConfirm={showConfirm} />;
      case 'presidency_support': return <PresidencySupportSection documents={presidencyDocs} user={user!} showToast={showToast} />;
      case 'institutional_support': return <InstitutionalSupportSection records={institutionalRecords} user={user!} showToast={showToast} />;
      case 'institutional': return <InstitutionalSection institutionalInfo={institutionalInfo} />;
      case 'volunteers': return <VolunteersSection volunteers={volunteers} showToast={showToast} user={user} />;
      case 'family': return <FamilySection engagements={familyEngagements} elderly={elderly} showToast={showToast} />;
      case 'staff': return (
        <StaffManagementSection 
          staff={users} 
          onSave={handleSaveStaffMember} 
          onDelete={async (id) => {
            try {
              await deleteDoc(doc(db, 'users', id));
              showToast('Funcionário institucional excluído!', 'success');
            } catch (err) {
              showToast('Erro ao excluir funcionário', 'error');
            }
          }}
          showToast={showToast} 
        />
      );
      case 'schedule': return <ScheduleSection events={calendarEvents} user={user} showConfirm={showConfirm} sendNotification={sendNotification} />;
      case 'workshops': return (
        <WorkshopsSection 
          workshops={workshops} 
          communityElderly={communityElderly} 
          caregivers={caregivers} 
          elderly={elderly} 
          professionals={professionals} 
          showToast={showToast} 
          user={user!}
          sendNotification={sendNotification}
          notifyTaggedCoWorkers={notifyTaggedCoWorkers}
        />
      );
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
      case 'donors': return <DonorsSection donors={donors} showToast={showToast} />;
      case 'diaperProduction': return (
        <DiaperProductionSection 
          user={user}
          elderly={elderly}
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
      case 'productivity': return (
        <ProductivitySection 
          user={user}
          professionals={professionals}
          nursingEvolutions={nursingEvolutions}
          physioEvolutions={physioEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          workshops={workshops}
          notifications={notifications}
          elderly={elderly}
          onDeleteNotification={async (id, e) => {
            e.stopPropagation();
            await deleteNotification(id);
          }}
          onSaveEvolution={handleSaveSharedActivity}
          onDeleteEvolution={handleDeleteSharedActivity}
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
            
            {tabHistory.length > 1 && (
              <button 
                onClick={handleGoBack}
                className="flex items-center gap-2 px-3 py-2 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-300 border border-gray-200 dark:border-gray-800 rounded-xl text-xs font-black uppercase tracking-wider shadow-sm hover:bg-gray-50 dark:hover:bg-gray-800 hover:border-green-300 dark:hover:border-green-800 transition-all cursor-pointer shrink-0 group"
                title="Voltar para a aba anterior"
              >
                <ArrowLeft size={14} className="text-green-600 dark:text-green-400 transition-transform group-hover:-translate-x-0.5 animate-pulse" />
                <span className="hidden sm:inline">Voltar</span>
              </button>
            )}

            <div>
              <h1 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight">
                {activeTab === 'dashboard' ? 'Visão Geral' : 
                 activeTab === 'elderly' ? 'Gestão de Idosos' : 
                 activeTab === 'physio' ? 'Fisioterapia' :
                 activeTab === 'nursing' ? 'Enfermagem' :
                 activeTab === 'psychology' ? 'Psicologia' :
                 activeTab === 'pedagogy' ? 'Pedagogia' :
                 activeTab === 'socialWork' ? 'Serviço Social' :
                 activeTab === 'professional' ? 'Avaliação & Monitoramento' : 
                 activeTab === 'financial' ? 'Financeiro' : 
                 activeTab === 'treasury' ? 'Tesouraria' : 
                 activeTab === 'stock' ? 'Controle de Estoque' :
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
                                if (n.tipo && n.atividadeId) {
                                  openRecordFromNotification(n.tipo, n.atividadeId);
                                } else if (n.link) {
                                  setActiveTab(n.link as any);
                                }
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
          workshops={workshops}
          psychActivities={psychActivities}
          pedagogyActivities={pedagogyActivities}
          physioEvolutions={physioEvolutions}
          nursingEvolutions={nursingEvolutions}
          psychEvolutions={psychEvolutions}
          pedagogyEvolutions={pedagogyEvolutions}
          socialEvolutions={socialEvolutions}
          nutritionEvolutions={nutritionEvolutions}
          professionals={professionals}
          setSelectedActivityForView={setSelectedActivityForView}
          users={users}
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

      {selectedActivityForView && (
        <ActivityDetailsModal 
          activity={selectedActivityForView}
          onClose={() => setSelectedActivityForView(null)}
          professionals={professionals}
          elderly={elderly}
          users={users}
        />
      )}
    </div>
  );
}
