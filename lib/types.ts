// Static baseline domain types, mirroring data/master-data.json.
//
// NOTE: the live pipeline types (Stage-1 extraction, Stage-2 metrics, Stage-3
// analysis) are defined next to the code that owns them — extraction shapes in
// `lib/mock-extractions.ts`, metrics in `lib/metrics.ts`, analysis in
// `lib/analyze.ts`. This file is only the shared, static baseline vocabulary.

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

/** Cumulative % complete by week index [W1, W2, W3]. */
export interface ProgressSeries {
  planned: number[];
  actual: number[];
}
