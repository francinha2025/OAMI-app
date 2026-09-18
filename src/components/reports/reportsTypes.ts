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
  CommunityElderly,
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

export type SectorKey =
  | 'ENFERMAGEM'
  | 'FISIOTERAPIA'
  | 'PSICOLOGIA'
  | 'SERVICO_SOCIAL'
  | 'PEDAGOGIA'
  | 'NUTRICAO'
  | 'EQUIPE_TECNICA'
  | 'OUTRAS_AREAS'
  | 'OFICINAS'
  | 'MONITORAMENTO'
  | 'ESTOQUE'
  | 'PRODUCAO_FRALDAS'
  | 'CAPACITACOES';

export type RecordType =
  | 'EVOLUCAO'
  | 'ATENDIMENTO'
  | 'OFICINA'
  | 'AVALIACAO'
  | 'MONITORAMENTO'
  | 'VISITA'
  | 'REUNIAO'
  | 'CAPACITACAO'
  | 'ESTOQUE'
  | 'PRODUCAO'
  | 'OUTRO';

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
  sectorKey: SectorKey;
  sector: string;
  recordType: RecordType;
  recordTypeLabel: string;
  date: string; // YYYY-MM-DD or ISO string
  title: string;
  responsible: string;
  roleOrFunction?: string;
  elderlyId?: string;
  targetOrParticipant?: string;
  participantsCount?: number;
  quantityOrValue?: number | string;
  typeOrStatus?: string;
  description?: string;
  conductOrOutcome?: string;
  locationOrRoom?: string;
  details: Record<string, any>;
  photos?: string[];
  documents?: Array<{
    name: string;
    url?: string;
    size?: string;
    base64?: string;
    id?: string;
    isChunked?: boolean;
    chunkCount?: number;
  }>;
}

export interface GeneralReportMetrics {
  totalRecords: number;
  totalAttendances: number;
  totalGroupActivities: number;
  totalWorkshops: number;
  totalAssessments: number;
  totalClinicalMonitorings: number;
  totalStockMovements: number;
  totalDiaperProduced: number;
  totalTrainings: number;
  activeProfessionalsCount: number;
  totalParticipants: number;
  totalDiaperDistributed: number;
  totalStockInputs: number;
  totalStockOutputs: number;
  totalTreasuryTransactions: number;
  totalDonationsValue: number;
  categoryCounts: Record<string, number>;
  sectorCounts: Record<string, number>;
  recordTypeCounts: Record<string, number>;
}

export interface SectorExecutiveSummary {
  sectorKey: SectorKey;
  name: string;
  recordsCount: number;
  elderlyCount: number;
  professionalsCount: number;
  professionalsList: string[];
}

export interface ExecutiveSummaryData {
  totalRecords: number;
  totalAttendances: number;
  totalWorkshops: number;
  totalTrainings: number;
  totalDiaperProduced: number;
  totalStockMovements: number;
  totalMonitorings: number;
  totalAssessments: number;
  totalGroupActivities: number;
  activeProfessionalsCount: number;
  sectors: SectorExecutiveSummary[];
}

export interface MonthlySummaryItem {
  monthKey: string; // e.g. "2026-08"
  monthLabel: string; // e.g. "AGOSTO / 2026"
  totalRecords: number;
  nursingRecords: number;
  physioRecords: number;
  psychRecords: number;
  socialRecords: number;
  pedagogyRecords: number;
  nutritionRecords: number;
  workshopsCount: number;
  monitoringsCount: number;
  stockMovementsCount: number;
  diaperProducedCount: number;
  trainingsCount: number;
  deltaRecordsPercent?: number; // comparison with previous month
  deltaRecordsAbsolute?: number;
}

export interface ElderlyGroupedReport {
  elderlyId: string;
  elderlyName: string;
  totalRecords: number;
  sectors: {
    nursing: UnifiedReportItem[];
    physio: UnifiedReportItem[];
    psych: UnifiedReportItem[];
    social: UnifiedReportItem[];
    pedagogy: UnifiedReportItem[];
    nutrition: UnifiedReportItem[];
    other: UnifiedReportItem[];
  };
}

export interface ProfessionalGroupedReport {
  professionalName: string;
  area: string;
  totalRecords: number;
  byRecordType: Record<string, number>;
  elderlyAttended: string[];
  elderlyAttendedCount: number;
  dateRange: { start: string; end: string };
  records: UnifiedReportItem[];
}

export interface MonthlyStockCategoryConsumption {
  category: string; // e.g. "ALIMENTAÇÃO", "HIGIENE", "FRALDAS", "MEDICAMENTOS"
  products: Array<{
    productName: string;
    unit: string;
    totalQuantity: number;
  }>;
}

export interface MonthlyStockReport {
  monthKey: string;
  monthLabel: string;
  categories: MonthlyStockCategoryConsumption[];
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
  communityElderly?: CommunityElderly[];
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
