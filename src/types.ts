export type Role = 
  | 'PRESIDENTE' 
  | 'COORDENADORA' 
  | 'ASSISTENTE_SOCIAL' 
  | 'PSICOLOGA' 
  | 'PEDAGOGA' 
  | 'ENFERMEIRA' 
  | 'FISIOTERAPEUTA'
  | 'FABRICANTE_FRALDAS'
  | 'PROJETISTA';

export interface GalleryItem {
  id: string;
  url: string;
  date: string;
  patientId?: string;
  patientName?: string;
  professionalId: string;
  professionalName: string;
  professionalRole: Role;
  activityType: string;
  description?: string;
  category: 'MULTIDISCIPLINAR' | 'OFICINA' | 'REUNIAO' | 'OUTROS';
}

export interface User {
  id: string;
  name: string;
  role: Role;
  password?: string;
  photoUrl?: string;
  registrationNumber?: string;
}

export interface Donor {
  id: string;
  name: string;
  email: string;
  phone: string;
  type: 'DOADOR' | 'SOCIO_MENSAL';
  amount?: number;
  status: 'ATIVO' | 'INATIVO';
  startDate: string;
}

export interface DiaperDonation {
  id: string;
  beneficiaryName: string;
  date: string;
  quantity: number;
  size: 'TAMANHO_UNICO';
  observations?: string;
  registeredBy: string;
}

export interface DiaperStock {
  id: string;
  quantity: number;
  lastUpdate: string;
  updatedBy: string;
}

export interface DiaperProductionLog {
  id: string;
  date: string;
  quantity: number;
  type: 'PRODUCTION' | 'STOCK_OUT';
  registeredBy: string;
  observations?: string;
}

export interface FinancialDocument {
  id: string;
  date: string;
  description: string;
  type: 'NOTA_FISCAL' | 'RECIBO' | 'OUTRO';
  imageUrl: string;
  amount?: number;
}

export interface Elderly {
  id: string;
  name: string;
  fullName?: string;
  cpf?: string;
  birthCertificate?: string;
  lastProfession?: string;
  birthDate: string;
  entryDate: string;
  status: 'ATIVO' | 'INATIVO';
  photoUrl?: string;
}

export interface PIA {
  id: string;
  elderlyId: string;
  date: string;
  responsible: string;
  status: 'EM_ANDAMENTO' | 'CONCLUIDO' | 'REVISAR';
  
  // Social & Financial
  hasBPC: boolean;
  hasPension: boolean;
  hasLoans: boolean;
  loanDetails?: string;
  hasProperty: boolean;
  monthlyIncome: number;
  
  // Family
  familyInvolvement: 'ALTO' | 'MEDIO' | 'BAIXO' | 'NENHUM';
  familyObservations: string;
  
  // Health & Well-being
  healthStatus: string;
  medications: string;
  mobilityStatus: string;
  
  // Objectives & Actions
  objectives: string;
  actions: string;
  observations: string;
}

export interface EvolutionRecord {
  id: string;
  elderlyId: string;
  professionalId: string;
  professionalRole: Role;
  date: string;
  content: string;
  type: 'INDIVIDUAL' | 'GRUPO' | 'VISITA_DOMICILIAR';
}

export interface FinancialRecord {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'RECEITA' | 'DESPESA';
  category: string;
}

export interface InstitutionalInfo {
  mission: string;
  vision: string;
  values: string;
  history: string;
}

export interface Workshop {
  id: string;
  title: string;
  date: string;
  description: string;
  participants: string[];
  type: 'PROFISSIONAL' | 'IDOSOS';
}

export interface CommunityElderly {
  id: string;
  name: string;
  age: number;
  birthDate: string;
  address: string;
  phone: string;
  healthConditions: string;
  medications: string;
  interests: string[];
  livingSituation: string;
  emergencyContact: string;
  registeredAt: string;
}

export interface Caregiver {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address: string;
  experience: string;
  trainingInterests: string[];
  registeredAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  type: 'COMPROMISSO' | 'FERIADO' | 'REUNIAO' | 'OFICINA' | 'ROTINA';
  description?: string;
  time?: string;
  location?: string;
}

export interface Volunteer {
  id: string;
  name: string;
  cpf: string;
  address: string;
  type: 'VOLUNTARIO' | 'ESTAGIARIO';
  startDate: string;
  activities: string;
  status: 'ATIVO' | 'INATIVO';
  createdAt: string;
}

export interface Professional {
  id: string;
  name: string;
  role: Role;
  registrationNumber: string;
  phone: string;
  email: string;
  address: string;
  admissionDate: string;
  status: 'ATIVO' | 'INATIVO';
  observations?: string;
  createdAt: string;
}

export interface FamilyEngagement {
  id: string;
  elderlyId: string;
  date: string;
  type: 'VISITA' | 'REUNIAO' | 'CONTATO_TELEFONICO';
  summary: string;
}

export interface PhysioPatient {
  id: string;
  elderlyId?: string;
  name: string;
  age: number;
  diagnosis: string;
  phone: string;
  photoUrl?: string;
  observations: string;
  category: 'ORTOPEDIA' | 'NEUROLOGICO' | 'IDOSOS' | 'OUTRO';
  photos?: string[];
  createdAt: string;
}

export interface PhysioAssessment {
  id: string;
  patientId: string;
  date: string;
  complaint: string;
  history: string;
  painScale: number;
  motionLimitation: string;
  physicalTests: string;
  fallRisk?: 'BAIXO' | 'MEDIO' | 'ALTO';
  mobilityLevel?: string;
  independenceADLs?: string;
  medicalHistory?: string;
  photos?: string[];
}

export interface PhysioEvolution {
  id: string;
  patientId: string;
  date: string;
  procedures: string;
  evolution: string;
  observations: string;
  painLevel?: number;
  photos?: string[];
}

export interface PhysioExercise {
  id: string;
  title: string;
  description: string;
  category: 'ALONGAMENTO' | 'FORTALECIMENTO' | 'REABILITACAO' | 'OUTRO';
  videoUrl?: string;
  imageUrl?: string;
}

export interface PhysioAppointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  status: 'ATENDIDO' | 'FALTOU' | 'PENDENTE';
  observations?: string;
}

export interface NursingPatient {
  id: string;
  elderlyId?: string;
  name: string;
  age: number;
  diagnosis: string;
  comorbidities: string;
  allergies: string;
  familyContact: string;
  riskLevel: 'BAIXO' | 'MEDIO' | 'ALTO';
  isBedridden: boolean;
  fallRisk: 'BAIXO' | 'MEDIO' | 'ALTO';
  photoUrl?: string;
  createdAt: string;
}

export interface Medication {
  id: string;
  patientId: string;
  name: string;
  dosage: string;
  route: 'ORAL' | 'IV' | 'IM' | 'SUBCUTANEA' | 'TOPICA' | 'OUTRA';
  frequency: string;
  times: string[];
  status: 'ATIVO' | 'SUSPENSO';
  type: 'CONTINUA' | 'CONTROLADA' | 'PONTUAL';
  startDate: string;
  endDate?: string;
}

export interface MedicationAdministration {
  id: string;
  patientId: string;
  medicationId: string;
  scheduledTime: string;
  administeredTime?: string;
  status: 'PENDENTE' | 'ADMINISTRADO' | 'RECUSADO' | 'ATRASADO';
  administeredBy?: string;
  observations?: string;
  date: string;
}

export interface VitalSigns {
  id: string;
  patientId: string;
  date: string;
  time: string;
  systolicBP: number;
  diastolicBP: number;
  heartRate: number;
  temperature: number;
  saturation: number;
  respiratoryRate?: number;
  bloodGlucose?: number;
  registeredBy: string;
}

export interface DressingRecord {
  id: string;
  patientId: string;
  date: string;
  woundType: string;
  location: string;
  aspect: string;
  conduct: string;
  nextChangeDate: string;
  registeredBy: string;
  photoUrl?: string;
  photos?: string[];
}

export interface NursingEvolution {
  id: string;
  patientId: string;
  date: string;
  time: string;
  content: string;
  registeredBy: string;
  photos?: string[];
}

export interface IncidentRecord {
  id: string;
  patientId: string;
  date: string;
  time: string;
  type: 'QUEDA' | 'FEBRE' | 'MAL_ESTAR' | 'INTERNACAO' | 'OUTRO';
  description: string;
  conduct: string;
  registeredBy: string;
  photos?: string[];
}

export interface ShiftSchedule {
  id: string;
  date: string;
  shift: 'MANHA' | 'TARDE' | 'NOITE';
  professionals: string[];
  activities: string;
}

export interface AVDRecord {
  id: string;
  patientId: string;
  date: string;
  feeding: 'INDEPENDENTE' | 'ASSISTIDA' | 'DEPENDENTE';
  hygiene: 'INDEPENDENTE' | 'ASSISTIDA' | 'DEPENDENTE';
  mobility: 'INDEPENDENTE' | 'ASSISTIDA' | 'DEPENDENTE';
  sleep: 'BOM' | 'AGITADO' | 'INSÔNIA';
  observations?: string;
  registeredBy: string;
}

export interface DiaperChangeRecord {
  id: string;
  patientId: string;
  date: string;
  time: string;
  aspect: 'NORMAL' | 'ALTERADO';
  observations?: string;
  registeredBy: string;
}

export interface PsychPatient {
  id: string;
  elderlyId?: string;
  name: string;
  age: number;
  entryDate: string;
  familyContact: string;
  lifeHistory: string;
  hasVisits: boolean;
  photoUrl?: string;
  createdAt: string;
}

export interface PsychInitialAssessment {
  id: string;
  patientId: string;
  date: string;
  emotionalState: string;
  cognition: 'ORIENTADO' | 'DESORIENTADO';
  mood: string;
  adaptationLevel: string;
  observations: string;
  registeredBy: string;
}

export interface PsychEvolution {
  id: string;
  patientId: string;
  date: string;
  time: string;
  observation: string;
  intervention: string;
  registeredBy: string;
  photos?: string[];
}

export interface PsychAppointment {
  id: string;
  patientId: string;
  date: string;
  time: string;
  type: 'INDIVIDUAL' | 'GRUPO' | 'RODA_CONVERSA';
  status: 'REALIZADO' | 'FALTOU' | 'PENDENTE';
  observations?: string;
  registeredBy: string;
}

export interface PsychEmotionalMonitoring {
  id: string;
  patientId: string;
  date: string;
  sadness: 'LEVE' | 'MODERADO' | 'INTENSO' | 'NENHUM';
  anxiety: 'LEVE' | 'MODERADO' | 'INTENSO' | 'NENHUM';
  loneliness: 'LEVE' | 'MODERADO' | 'INTENSO' | 'NENHUM';
  irritability: 'LEVE' | 'MODERADO' | 'INTENSO' | 'NENHUM';
  wellBeing: 'FELIZ' | 'NEUTRO' | 'TRISTE';
  observations?: string;
  registeredBy: string;
}

export interface PsychFamilyBond {
  id: string;
  patientId: string;
  date: string;
  receivesVisits: boolean;
  frequency: string;
  familyRelationship: string;
  observations?: string;
  registeredBy: string;
}

export interface PsychActivity {
  id: string;
  date: string;
  title: string;
  type: 'OFICINA' | 'DINAMICA' | 'GRUPO';
  description: string;
  participants: string[]; // patientIds
  registeredBy: string;
  photos?: string[];
}

export interface PsychCognitionAssessment {
  id: string;
  patientId: string;
  date: string;
  memory: 'PRESERVADO' | 'COMPROMETIDO';
  attention: 'PRESERVADO' | 'COMPROMETIDO';
  orientation: 'PRESERVADO' | 'COMPROMETIDO';
  observations?: string;
  registeredBy: string;
}

export interface PsychInterventionPlan {
  id: string;
  patientId: string;
  date: string;
  objectives: string;
  strategies: string;
  followUp: string;
  registeredBy: string;
}

export interface PedagogyPatient {
  id: string;
  elderlyId?: string;
  name: string;
  age: number;
  schooling: string;
  previousProfession: string;
  interests: string[];
  cognitiveLimitations: string;
  literacyLevel: 'ALFABETIZADO' | 'ANALFABETO' | 'ALFABETIZADO_FUNCIONAL';
  cognitiveLevel: 'ALTO' | 'MEDIO' | 'BAIXO';
  favoriteActivities: string[];
  routinePreference: 'GRUPO' | 'SOZINHO' | 'MISTO';
  photoUrl?: string;
  createdAt: string;
}

export interface PedagogyInitialAssessment {
  id: string;
  patientId: string;
  date: string;
  memory: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  attention: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  language: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  comprehension: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  orientation: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  praxis: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  gnosis: 'PRESERVADO' | 'LEVE_COMPROMETIMENTO' | 'COMPROMETIDO';
  observations: string;
  registeredBy: string;
}

export interface PedagogyEvolution {
  id: string;
  patientId: string;
  date: string;
  activityTitle: string;
  participation: 'ATIVO' | 'PASSIVO' | 'RECUSOU';
  response: string;
  observations: string;
  registeredBy: string;
  photos?: string[];
}

export interface PedagogyActivity {
  id: string;
  date: string;
  time: string;
  title: string;
  type: 'MEMORIA' | 'PINTURA' | 'MUSICA' | 'JOGOS' | 'LEITURA' | 'OUTRO';
  description: string;
  participants: string[]; // patientIds
  registeredBy: string;
  photos?: string[];
}

export interface PedagogyStimulationTracking {
  id: string;
  patientId: string;
  date: string;
  memoryScore: number; // 0-10
  attentionScore: number; // 0-10
  reasoningScore: number; // 0-10
  languageScore: number; // 0-10
  observations: string;
  registeredBy: string;
}

export interface PedagogySocialParticipation {
  id: string;
  patientId: string;
  date: string;
  interactionLevel: 'ALTO' | 'MEDIO' | 'BAIXO';
  isIsolated: boolean;
  isCommunicative: boolean;
  observations: string;
  registeredBy: string;
}

export interface PedagogyIndividualPlan {
  id: string;
  patientId: string;
  date: string;
  objectives: string;
  indicatedActivities: string[];
  strategies: string;
  registeredBy: string;
}

export interface PedagogyLifeHistory {
  id: string;
  patientId: string;
  memories: string;
  photos: string[]; // URLs
  stories: string;
  timelineEvents: { date: string; event: string }[];
  registeredBy: string;
}

export interface SocialPatient {
  id: string;
  elderlyId?: string;
  name: string;
  birthDate: string;
  naturalness: string;
  maritalStatus: 'SOLTEIRO' | 'CASADO' | 'DIVORCIADO' | 'VIUVO' | 'OUTRO';
  schooling: string;
  previousProfession: string;
  income: number;
  benefits: ('BPC' | 'APOSENTADORIA' | 'OUTRO' | 'NENHUM')[];
  benefitStatus: 'ATIVO' | 'SUSPENSO' | 'NAO_POSSUI';
  photoUrl?: string;
  createdAt: string;
}

export interface FamilyMember {
  id: string;
  name: string;
  kinship: string;
  phone: string;
  isMainContact: boolean;
  visitFrequency: 'SEMANAL' | 'QUINZENAL' | 'MENSAL' | 'RARO' | 'INEXISTENTE';
  relationshipQuality: 'BOA' | 'REGULAR' | 'DISTANTE' | 'ROMPIDA';
}

export interface SocialFamilyTie {
  id: string;
  patientId: string;
  hasFamily: boolean;
  members: FamilyMember[];
  observations: string;
  abandonmentRisk: boolean;
  registeredBy: string;
  updatedAt: string;
}

export interface SocialDocumentation {
  id: string;
  patientId: string;
  rg: 'COMPLETO' | 'PENDENTE' | 'INEXISTENTE';
  cpf: 'COMPLETO' | 'PENDENTE' | 'INEXISTENTE';
  sus: 'COMPLETO' | 'PENDENTE' | 'INEXISTENTE';
  birthCertificate: 'COMPLETO' | 'PENDENTE' | 'INEXISTENTE';
  addressProof: 'COMPLETO' | 'PENDENTE' | 'INEXISTENTE';
  observations?: string;
  updatedAt: string;
}

export interface SocialLegalSituation {
  id: string;
  patientId: string;
  hasCurator: boolean;
  curatorName?: string;
  isInterdicted: boolean;
  processNumber?: string;
  comarca?: string;
  situationStatus: 'REGULAR' | 'EM_ANDAMENTO' | 'PENDENTE';
  observations?: string;
  updatedAt: string;
}

export interface SocialStudy {
  id: string;
  patientId: string;
  date: string;
  lifeHistory: string;
  socialConditions: string;
  institutionalizationReason: string;
  supportNetwork: string;
  technicalOpinion: string;
  registeredBy: string;
}

export interface SocialEvolution {
  id: string;
  patientId: string;
  date: string;
  serviceType: string;
  observation: string;
  conduct: string;
  registeredBy: string;
  photos?: string[];
}

export interface SocialReferral {
  id: string;
  patientId: string;
  date: string;
  destination: 'CRAS' | 'CREAS' | 'INSS' | 'DEFENSORIA' | 'SAUDE' | 'OUTRO';
  description: string;
  status: 'CONCLUIDO' | 'EM_ANDAMENTO' | 'NAO_REALIZADO';
  observations?: string;
  registeredBy: string;
}

export interface SocialFamilyVisit {
  id: string;
  patientId: string;
  date: string;
  visitorName: string;
  kinship: string;
  observations: string;
  registeredBy: string;
}

export interface SocialRiskSituation {
  id: string;
  patientId: string;
  date: string;
  type: 'ABANDONO' | 'NEGLIGENCIA' | 'VIOLACAO_DIREITOS' | 'OUTRO';
  description: string;
  severity: 'BAIXA' | 'MEDIA' | 'ALTA';
  status: 'IDENTIFICADO' | 'EM_ACOMPANHAMENTO' | 'RESOLVIDO';
  registeredBy: string;
}

