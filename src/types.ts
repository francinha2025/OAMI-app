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
  type: 'VOLUNTARIO' | 'ESTAGIARIO';
  startDate: string;
  activities: string;
}

export interface FamilyEngagement {
  id: string;
  elderlyId: string;
  date: string;
  type: 'VISITA' | 'REUNIAO' | 'CONTATO_TELEFONICO';
  summary: string;
}
