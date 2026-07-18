// Domain + pipeline types. Mirrors data/master-data.json and the 3-stage
// pipeline: (1) extract [AI]  ->  (2) assemble & compute [deterministic]  ->  (3) analyze [AI].

// ---------- Static baselines ----------

export interface Project {
  id: string;
  name: string;
  gc: string;
  owner: string;
  location: string;
  address: string;
  jobNumber: string;
  projectManager: string;
  superintendent: string;
  contractValue: number;
  durationWeeks: number;
  asOfWeek: number;
  startDate: string;
  asOfDate: string;
}

export interface CostCodeBaseline {
  code: string;
  description: string;
  scheduledValue: number; // SOV (dollars, labor bundled in)
  plannedHours: number; // Job Cost Budget
  ratePerHour: number;
  laborCost: number;
  materialCost: number;
  totalBudget: number;
  role: "context" | "problem" | "behind";
}

export interface Worker {
  id: string;
  name: string;
  class: string;
  rate: number;
  costCode: string;
}

export interface ChangeOrder {
  id: string;
  dateApproved: string;
  week: number;
  costCode: string;
  description: string;
  reason: string;
  labor: number;
  material: number;
  equipment: number;
  netIncrease: number;
  originalContract: number;
  revisedContract: number;
}

// ---------- Dynamic events ----------

/** Cumulative % complete by week index [W1, W2, W3]. */
export interface ProgressSeries {
  planned: number[];
  actual: number[];
}

export interface LaborRow {
  workerId?: string;
  name: string;
  class: string;
  hours: number;
  rate: number;
  extension: number;
}

export interface LaborTicket {
  no: string;
  weekEnding: string;
  project: string;
  job: string;
  costCode: string;
  phase: string;
  description: string;
  rows: LaborRow[];
  totalLabor: number;
}

// ---------- Stage 1: extraction output (AI, per document) ----------

export type Confidence = "high" | "low";

export interface ExtractedField<T> {
  value: T;
  confidence: Confidence;
}

export type ValidationFlag =
  | { kind: "improbable-hours"; row: number; message: string }
  | { kind: "wrong-project"; message: string }
  | { kind: "low-confidence"; field: string; message: string };

export interface TicketExtraction {
  ticket: LaborTicket;
  flags: ValidationFlag[];
  /** true when the ticket belongs to another project and should be rejected. */
  rejected: boolean;
  /** true when every field is high-confidence and no flags -> auto-approve. */
  autoApprove: boolean;
}

// ---------- Stage 2: computed metrics (deterministic) ----------

export interface CostCodeMetrics {
  code: string;
  description: string;
  scheduledValue: number;
  plannedHours: number;
  actualHours: number;
  percentComplete: number; // actual
  plannedPercent: number;
  earnedValue: number; // % x scheduledValue
  earnedHours: number; // % x plannedHours
  actualLaborCost: number;
  productivity: number | null; // earnedHours / actualHours
  scheduleVariancePct: number; // actual - planned
  eacHours: number | null;
  laborBudget: number;
  projectedLaborOver: number | null;
}

export interface WeeklyPoint {
  week: number;
  actualHours: number;
  productivity: number | null;
  percentComplete: number;
}

export interface ProjectContext {
  project: Project;
  asOfWeek: number;
  overallActualPct: number;
  overallPlannedPct: number;
  revisedContract: number;
  byCostCode: CostCodeMetrics[];
  gypsumWeekly: WeeklyPoint[]; // the tracked-trade trend
}

// ---------- Stage 3: analysis output (AI, over computed context) ----------

export type Severity = "high" | "medium" | "info";

export interface Insight {
  costCode: string;
  title: string;
  severity: Severity;
  finding: string;
  evidence: string;
  recommendation: string;
}

export interface AnalysisResult {
  headline: string;
  insights: Insight[];
}
