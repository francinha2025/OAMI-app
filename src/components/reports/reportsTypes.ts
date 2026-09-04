import {
  Elderly,
  EvolutionRecord,
  PIA,
  SocialEvolution,
  SocialPatient,
  SocialFamilyVisit,
  SocialRiskSituation,
  SocialReferral,
  SocialStudy,
  PsychEvolution,
  PsychPatient,
  PsychActivity,
  PsychAppointment,
  PsychEmotionalMonitoring,
  PsychCognitionAssessment,
  PedagogyEvolution,
  PedagogyPatient,
  PedagogyActivity,
  PedagogyStimulationTracking,
  PedagogySocialParticipation,
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
  GalleryItem,
  FamilyEngagement,
  PresidencySupportDocument,
  InstitutionalSupportRecord
} from '../../types';

export type ReportCategory =
  | 'ALL'
  | 'PROFESSIONALS'
  | 'WORKSHOPS'
  | 'TRAININGS'
  | 'DIAPERS'
  | 'STOCK'
  | 'MONITORING'
  | 'TREASURY'
  | 'OTHER';

export type DatePreset =
  | 'all'
  | 'today'
  | 'week'
  | 'month'
  | 'last_30_days'
  | 'last_month'
  | 'year'
  | 'custom';

export interface UnifiedReportItem {
  id: string;
  category: Exclude<ReportCategory, 'ALL'>;
  categoryLabel: string;
  sector: string;
  date: string; // YYYY-MM-DD or ISO string
  title: string;
  responsible: string;
  roleOrFunction?: string;
  targetOrParticipant?: string;
  participantsCount?: number;
  quantityOrValue?: number | string;
  typeOrStatus?: string;
  description?: string;
  conductOrOutcome?: string;
  locationOrRoom?: string;
  details: Record<string, any>;
  photos?: string[];
  documents?: Array<{ name: string; url?: string; size?: string; base64?: string }>;
}

export interface GeneralReportMetrics {
  totalRecords: number;
  totalAttendances: number;
  totalParticipants: number;
  totalWorkshops: number;
  totalTrainings: number;
  totalDiaperProduced: number;
  totalDiaperDistributed: number;
  totalStockMovements: number;
  totalStockInputs: number;
  totalStockOutputs: number;
  totalClinicalMonitorings: number;
  totalTreasuryTransactions: number;
  totalDonationsValue: number;
  activeProfessionalsCount: number;
  categoryCounts: Record<string, number>;
  sectorCounts: Record<string, number>;
}

export interface GeneralReportProps {
  user?: User | null;
  elderly?: Elderly[];
  evolutions?: EvolutionRecord[];
  pias?: PIA[];
  socialEvolutions?: SocialEvolution[];
  socialPatients?: SocialPatient[];
  socialFamilyVisits?: SocialFamilyVisit[];
  socialRiskSituations?: SocialRiskSituation[];
  socialReferrals?: SocialReferral[];
  socialStudies?: SocialStudy[];
  psychEvolutions?: PsychEvolution[];
  psychPatients?: PsychPatient[];
  psychActivities?: PsychActivity[];
  psychAppointments?: PsychAppointment[];
  psychEmotionalMonitorings?: PsychEmotionalMonitoring[];
  psychCognitionAssessments?: PsychCognitionAssessment[];
  pedagogyEvolutions?: PedagogyEvolution[];
  pedagogyPatients?: PedagogyPatient[];
  pedagogyActivities?: PedagogyActivity[];
  pedagogyStimulationTrackings?: PedagogyStimulationTracking[];
  pedagogySocialParticipations?: PedagogySocialParticipation[];
  physioEvolutions?: PhysioEvolution[];
  physioPatients?: PhysioPatient[];
  physioAssessments?: PhysioAssessment[];
  physioExercises?: PhysioExercise[];
  physioAppointments?: PhysioAppointment[];
  nursingEvolutions?: NursingEvolution[];
  nursingPatients?: NursingPatient[];
  vitalSigns?: VitalSigns[];
  dressingRecords?: DressingRecord[];
  medicationAdministrations?: MedicationAdministration[];
  incidentRecords?: IncidentRecord[];
  diaperChangeRecords?: DiaperChangeRecord[];
  nutritionEvolutions?: NutritionEvolution[];
  nutritionPatients?: NutritionPatient[];
  nutritionAnthropometries?: NutritionAnthropometry[];
  nutritionMealPlans?: NutritionMealPlan[];
  workshops?: Workshop[];
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
  familyEngagements?: FamilyEngagement[];
  presidencyDocs?: PresidencySupportDocument[];
  institutionalRecords?: InstitutionalSupportRecord[];
  stockProducts?: StockProduct[];
  stockMovements?: StockMovement[];
  treasuryTransactions?: TreasuryTransaction[];
  showToast?: (msg: string, type?: 'success' | 'error') => void;
  showConfirm?: (message: string, onConfirm: () => void) => void;
}
