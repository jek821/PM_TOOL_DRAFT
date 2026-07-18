// Loads the single-source-of-truth master data into typed structures.
// This is the SEED for the demo — the app treats it as the "already uploaded" project.

import raw from "@/data/master-data.json";
import type {
  Project,
  CostCodeBaseline,
  Worker,
  ChangeOrder,
  ProgressSeries,
} from "./types";

export const project: Project = raw.project as Project;

export const weekEndings: Record<string, string> = raw.weekEndings as Record<
  string,
  string
>;

export const costCodes: CostCodeBaseline[] = raw.costCodes.map((c) => ({
  code: c.code,
  description: c.description,
  scheduledValue: c.sov.scheduledValue,
  plannedHours: c.budget.plannedHours,
  ratePerHour: c.budget.ratePerHour,
  laborCost: c.budget.laborCost,
  materialCost: c.budget.materialCost,
  totalBudget: c.budget.totalBudget,
  role:
    c.code === "09 29 00"
      ? "problem"
      : c.code === "26 05 00"
      ? "behind"
      : "context",
}));

export const roster: Worker[] = raw.roster as Worker[];

export const changeOrders: ChangeOrder[] = raw.changeOrders as ChangeOrder[];

/** Cumulative planned/actual % per cost code, weeks 1-3. (drops the _note key) */
export const progressByCostCode: Record<string, ProgressSeries> =
  Object.fromEntries(
    Object.entries(raw.progressByCostCode).filter(([k]) => !k.startsWith("_"))
  ) as Record<string, ProgressSeries>;

export const gypsumLaborByWeek = raw.gypsumLaborByWeek;

export const totals = raw.totals;

/** The tracked (problem) trade and the behind-schedule trade, for convenience. */
export const PROBLEM_CODE = "09 29 00";
export const BEHIND_CODE = "26 05 00";

export function codeMeta(code: string): CostCodeBaseline | undefined {
  return costCodes.find((c) => c.code === code);
}
