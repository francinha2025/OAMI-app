import {
  Elderly,
  EvolutionRecord,
  PIA,
  SocialEvolution,
  SocialPatient,
  SocialFamilyTie,
  SocialDocumentation,
  SocialLegalSituation,
  SocialStudy,
  SocialReferral,
  SocialFamilyVisit,
  SocialRiskSituation,
  PsychEvolution,
  PsychPatient,
  PsychActivity,
  PsychAppointment,
  PsychEmotionalMonitoring,
  PsychCognitionAssessment,
  PsychFamilyBond,
  PedagogyEvolution,
  PedagogyPatient,
  PedagogyActivity,
  PedagogyStimulationTracking,
  PedagogySocialParticipation,
  PedagogyIndividualPlan,
  PhysioEvolution,
  PhysioPatient,
  PhysioAssessment,
  PhysioExercise,
  PhysioAppointment,
  NursingEvolution,
  NursingPatient,
  VitalSigns,
  DressingRecord,
  MedicationAdministration,
  IncidentRecord,
  DiaperChangeRecord,
  NutritionEvolution,
  NutritionPatient,
  NutritionAnthropometry,
  NutritionMealPlan,
  Workshop,
  Volunteer,
  Caregiver,
  StaffMember,
  Professional,
  Donor,
  DiaperDonation,
  DiaperBeneficiary,
  DiaperRawProduction,
  DiaperWIPProcessing,
  DiaperFinalPacking,
  DiaperProductionGoal,
  StockProduct,
  StockMovement,
  TreasuryTransaction,
  FinancialRecord,
  User,
  GalleryItem
} from '../../types';

export type PeriodPreset = 'today' | 'week' | 'month' | 'last_month' | 'year' | 'all' | 'custom';

export type MonitoringTab =
  | 'overview'
  | 'elderly'
  | 'multidisciplinary'
  | 'activities'
  | 'diapers'
  | 'stock'
  | 'treasury'
  | 'charts'
  | 'alerts';

export type MultidisciplinarySector =
  | 'all'
  | 'nursing'
  | 'physio'
  | 'psych'
  | 'pedagogy'
  | 'social'
  | 'nutrition';

export interface ManagementAlert {
  id: string;
  type: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'STOCK' | 'DIAPERS' | 'ELDERLY' | 'SECTOR' | 'SOCIAL_RISK' | 'INCIDENT' | 'PIA';
  title: string;
  description: string;
  count?: number;
  items?: string[];
  actionLabel?: string;
  targetTab?: MonitoringTab;
}

export interface UnifiedEvolutionItem {
  id: string;
  elderlyId: string;
  elderlyName: string;
  date: string;
  professional: string;
  professionalRole: string;
  sector: 'Enfermagem' | 'Fisioterapia' | 'Psicologia' | 'Pedagogia' | 'Serviço Social' | 'Nutrição' | 'Geral';
  content: string;
  conduct?: string;
  photos?: string[];
  vitalSignsSummary?: string;
}

export interface ElderlyMonitoringSummary {
  elderly: Elderly;
  attendancesCount: number;
  attendancesBySector: Record<string, number>;
  lastEvolution?: UnifiedEvolutionItem;
  lastVitalSign?: VitalSigns;
  lastPIA?: PIA;
  activitiesCount: number;
  diaperChangesCount: number;
  incidentCount: number;
}

export interface MonitoringSectionProps {
  user: User;
  elderly: Elderly[];
  evolutions: EvolutionRecord[];
  pias: PIA[];
  socialEvolutions: SocialEvolution[];
  socialPatients?: SocialPatient[];
  socialFamilyVisits?: SocialFamilyVisit[];
  socialRiskSituations?: SocialRiskSituation[];
  socialReferrals?: SocialReferral[];
  socialStudies?: SocialStudy[];
  psychEvolutions: PsychEvolution[];
  psychPatients?: PsychPatient[];
  psychActivities?: PsychActivity[];
  psychAppointments?: PsychAppointment[];
  psychEmotionalMonitorings: PsychEmotionalMonitoring[];
  psychCognitionAssessments?: PsychCognitionAssessment[];
  pedagogyEvolutions: PedagogyEvolution[];
  pedagogyPatients?: PedagogyPatient[];
  pedagogyActivities?: PedagogyActivity[];
  pedagogyStimulationTrackings?: PedagogyStimulationTracking[];
  pedagogySocialParticipations?: PedagogySocialParticipation[];
  physioEvolutions: PhysioEvolution[];
  physioPatients?: PhysioPatient[];
  physioAssessments?: PhysioAssessment[];
  physioExercises?: PhysioExercise[];
  physioAppointments?: PhysioAppointment[];
  nursingEvolutions: NursingEvolution[];
  nursingPatients?: NursingPatient[];
  vitalSigns: VitalSigns[];
  dressingRecords?: DressingRecord[];
  medicationAdministrations?: MedicationAdministration[];
  incidentRecords?: IncidentRecord[];
  diaperChangeRecords?: DiaperChangeRecord[];
  nutritionEvolutions?: NutritionEvolution[];
  nutritionPatients?: NutritionPatient[];
  nutritionAnthropometries?: NutritionAnthropometry[];
  nutritionMealPlans?: NutritionMealPlan[];
  workshops: Workshop[];
  professionals?: Professional[];
  users?: StaffMember[];
  caregivers?: Caregiver[];
  volunteers?: Volunteer[];
  donors?: Donor[];
  diaperDonations?: DiaperDonation[];
  diaperBeneficiaries?: DiaperBeneficiary[];
  diaperRawProductions?: DiaperRawProduction[];
  diaperWIPProcessings?: DiaperWIPProcessing[];
  diaperFinalPackings?: DiaperFinalPacking[];
  diaperProductionGoals?: DiaperProductionGoal[];
  financialRecords?: FinancialRecord[];
  allPhotos?: GalleryItem[];
  showToast: (msg: string, type?: 'success' | 'error') => void;
  showConfirm?: (message: string, onConfirm: () => void) => void;
}
