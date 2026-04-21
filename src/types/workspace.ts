// ── Workspace file metadata ──────────────────────────────────────────────

export interface WorkspaceFile {
  filename: string;
  content: string;
}

// ── Section discovery ────────────────────────────────────────────────────

export interface SectionConfig {
  icon: string;
  label: string;
  order: number;
  route: string;
  group: "overview" | "navigate" | "organize" | "connect" | "dynamic";
}

export interface WorkspaceSection extends SectionConfig {
  filename: string;
}

// ── Parsed alert ─────────────────────────────────────────────────────────

export type AlertSeverity = "HIGH" | "MEDIUM" | "INFO";
export type AlertStatus = "active" | "dismissed";

export interface ParsedAlert {
  date: string;
  severity: AlertSeverity;
  title: string;
  description: string;
  action: string;
  status: AlertStatus;
}

// ── Parsed pathway ───────────────────────────────────────────────────────

export type PathwayStageStatus =
  | "completed"
  | "current"
  | "upcoming";

export type PathwayItemStatus =
  | "completed"
  | "current"
  | "upcoming"
  | "blocked"
  | "milestone";

export interface PathwayItem {
  text: string;
  completed: boolean;
  status: PathwayItemStatus;
  date?: string;
}

export interface ParsedPathwayStage {
  number: number;
  title: string;
  status: PathwayStageStatus;
  items: PathwayItem[];
}

export interface ParsedPathway {
  currentStage: string;
  stages: ParsedPathwayStage[];
  nextActions: string[];
}

// ── Parsed profile ───────────────────────────────────────────────────────

export interface ProfileBasicInfo {
  name: string;
  dateOfBirth: string;
  age: string;
  diagnosis: string;
  currentStage: string;
  postalCode: string;
  location: string;
  familyLanguage: string;
  [key: string]: string;
}

export interface ProfilePersonal {
  communication: string;
  sensory: string;
  interests: string;
  strengths: string;
  challenges: string;
  interestsList: string[];
  sensoryProfile: { seeks: string[]; avoids: string[]; calming: string[] };
  communicationStyles: string[];
  personalityTraits: string[];
  triggers: string[];
  strengthsList: string[];
  challengesList: string[];
  supportNeeds: string[];
  extraInfo: string;
  [key: string]: string | string[] | { seeks: string[]; avoids: string[]; calming: string[] };
}

export interface Medication {
  medication: string;
  dose: string;
  frequency: string;
  prescriber: string;
  startDate: string;
  status: string;
  notes: string;
}

export interface Doctor {
  role: string;
  name: string;
  organization: string;
  phone: string;
}

export interface Appointment {
  date: string;
  description: string;
}

export interface Supplement {
  supplement: string;
  dose: string;
  frequency: string;
  notes: string;
}

export interface ProfileMedical {
  medications: Medication[];
  unconfirmedMedications: string[];
  supplements: Supplement[];
  comorbidConditions: string[];
  doctors: Doctor[];
  appointments: Appointment[];
}

export interface JourneyPartner {
  role: string;
  name: string;
  organization: string;
  contact: string;
  notes: string;
}

export interface ParsedProfile {
  title: string;
  basicInfo: ProfileBasicInfo;
  personalProfile: ProfilePersonal;
  medical: ProfileMedical;
  journeyPartners: JourneyPartner[];
}

// ── Parsed provider ──────────────────────────────────────────────────────

export type ProviderPriority = "highest" | "relevant" | "other";

export interface ParsedProvider {
  name: string;
  type: string;
  services: string;
  relevance: string;
  waitlist: string;
  contact: string;
  funding: string;
  notes: string;
  priority: ProviderPriority;
  isGapFiller: boolean;
}

export interface ProviderTable {
  provider: string;
  hourlyRate: string;
  waitlist: string;
  specialties: string;
}

export interface ParsedProviders {
  highestPriority: ParsedProvider[];
  relevant: ParsedProvider[];
  other: ParsedProvider[];
  tables: ProviderTable[];
  lastUpdated: string;
}

// ── Parsed benefit ───────────────────────────────────────────────────────

export type BenefitStatus =
  | "registered"
  | "pending"
  | "waiting"
  | "not_started"
  | "approved"
  | "active"
  | "renewed"
  | "denied"
  | "unknown";

export interface BenefitStatusRow {
  benefit: string;
  status: BenefitStatus;
  statusDisplay: string;
  applied: string;
  approved: string;
  renewal: string;
  amount: string;
  notes: string;
}

export interface BenefitDetail {
  name: string;
  eligibility: string;
  amount: string;
  unlocks: string;
  howApplied: string;
  expectedResponse: string;
  action: string;
  documentsNeeded: string;
  renewal: string;
  status: string;
  details: Record<string, string>;
}

export interface ParsedBenefits {
  statusTable: BenefitStatusRow[];
  details: BenefitDetail[];
  agentMonitoring: string[];
  lastUpdated: string;
}

// ── Parsed program ───────────────────────────────────────────────────────

export type ProgramCategory = "gap_filler" | "government" | "educational";

export interface ParsedProgram {
  name: string;
  category: ProgramCategory;
  type: string;
  cost: string;
  ages: string;
  schedule: string;
  location: string;
  whyGapFiller: string;
  register: string;
  status: string;
  url: string;
  phone: string;
  email: string;
  details: Record<string, string>;
  isGapFiller: boolean;
}

export interface ParsedPrograms {
  gapFillers: ParsedProgram[];
  government: ParsedProgram[];
  educational: ParsedProgram[];
  lastUpdated: string;
}

// ── Parsed document ──────────────────────────────────────────────────────

export interface DocumentEntry {
  date: string;
  title: string;
  from: string;
  type: string;
  storageLink: string;
}

export interface DocumentSummary {
  title: string;
  findings: string[];
}

export interface ParsedDocuments {
  documents: DocumentEntry[];
  summaries: DocumentSummary[];
}

// ── Parsed Ontario System ────────────────────────────────────────────────

export interface OntarioWaitTimeEntry {
  service: string;
  wait: string;
  months: number;
}

export interface OntarioBenefitEntry {
  name: string;
  amount: string;
  eligibility: string;
}

export interface ParsedOntarioSystem {
  journeyOverview: string;
  oap: {
    entryPoints: string[];
    childhoodBudget: string[];
    foundationalServices: string[];
    waitTimes: OntarioWaitTimeEntry[];
  };
  school: {
    iepPoints: string[];
    boards: { name: string; type: string }[];
  };
  financialSupports: OntarioBenefitEntry[];
  lastUpdated: string;
  sources: string;
}

// ── Parsed employment ───────────────────────────────────────────────────

export interface ParsedEmployment {
  title: string;
  lastUpdated?: string;
  status?: string;
  strengths: string[];
  supportNeeds: string[];
  goals: { nearTerm: string[]; midTerm: string[] };
  planningAreas: { title: string; description: string; items: string[] }[];
  careerHypotheses: string[];
  nextActions: string[];
}

// ── Parsed university ────────────────────────────────────────────────────

export interface UniversityPlanningPriority {
  title: string;
  description: string;
  items: string[];
}

export interface ParsedUniversity {
  title: string;
  lastUpdated: string;
  status: string;
  snapshot: string;
  academicThemes: string[];
  planningPriorities: UniversityPlanningPriority[];
  documentationNeeded: string[];
  campusConsiderations: string[];
  cautionNotes: string[];
}

// ── Parsed journey partner ──────────────────────────────────────────────

export interface ParsedJourneyPartner {
  name: string;
  role: string;
  organization: string;
  services: string;
  contact: string;
  status: string;
  source: string;
  active: boolean;
}

export interface ParsedJourneyPartners {
  activeTeam: ParsedJourneyPartner[];
  formerTeam: ParsedJourneyPartner[];
  lastUpdated: string;
}

// ── Chat types ───────────────────────────────────────────────────────────

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  isFallback?: boolean;
}
