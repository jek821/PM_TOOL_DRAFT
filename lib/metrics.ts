// STAGE 2 — deterministic metrics engine. Pure math over the loaded baselines,
// progress, change orders, and APPROVED timecards. No AI, no hardcoded per-line
// logic: every cost code runs the same computation and the same threshold rules.

import { costCodes, progressByCostCode, changeOrders, project } from "./seed";
import type { TicketState } from "./tickets";
import type { AnalysisResult } from "./analyze";

export type Flag = "behind-schedule" | "low-productivity" | "budget-risk";

export interface ProgressPoint {
  week: number;
  planned: number;
  actual: number;
}
export interface ProductivityPoint {
  week: number;
  productivity: number;
}

export interface CostCodeMetrics {
  code: string;
  description: string;
  scheduledValue: number; // revised for change orders
  laborBudget: number;
  budgetHours: number;
  percentComplete: number; // actual, latest week
  plannedPercent: number; // baseline schedule, latest week
  scheduleVariancePct: number; // actual - planned (negative = behind)
  earnedValue: number;
  hasLaborData: boolean; // true only where approved timecards exist
  actualHours: number;
  actualLaborCost: number;
  earnedHours: number | null;
  productivity: number | null; // earnedHours / actualHours
  eacHours: number | null; // estimate at completion
  projectedLaborOverrun: number | null; // $ over the line's labor budget
  flags: Flag[];
  severityScore: number; // 0..1, drives ranking
  progressSeries: ProgressPoint[]; // planned vs actual by week (all lines)
  productivitySeries: ProductivityPoint[] | null; // weekly productivity (labor lines only)
}

export interface ProjectContext {
  asOfWeek: number;
  asOfDate: string;
  overallActualPct: number;
  overallPlannedPct: number;
  originalContract: number;
  revisedContract: number;
  byCostCode: CostCodeMetrics[];
  flagged: string[]; // codes with >=1 flag, ranked by severityScore desc
  laborTicketsByCode: Record<string, string[]>; // approved timecard #s feeding each line
  netLaborVariance: number; // projected labor $ over (>0) or under/saved (<0) budget
  plannedMargin: number; // revised contract - total cost budget
  projectedMargin: number; // planned margin absorbing the projected labor variance (materials held at budget)
  durationWeeks: number;
  projectedFinishWeek: number | null; // forecast finish at current schedule performance (SPI)
  analysis: AnalysisResult | null; // ← filled by the analyzeProject() seam
}

// ---- thresholds (tunable, documented) ----
const BEHIND_SCHEDULE_PTS = 8; // > 8 points behind plan
const LOW_PRODUCTIVITY = 0.85; // earned/actual hours below this
const BUDGET_RISK_PCT = 0.1; // projected overrun > 10% of labor budget

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const weekFromId = (id: string): number | null => {
  const m = id.match(/^wk(\d+)/);
  return m ? Number(m[1]) : null;
};

export function computeProjectContext(
  approvedTickets: TicketState[],
  progress: Record<string, { planned: number[]; actual: number[] }> = progressByCostCode,
  codes: typeof costCodes = costCodes
): ProjectContext {
  const latest = project.asOfWeek - 1; // index into [w1,w2,w3]

  // change orders -> per-code $ delta + revised contract
  const coByCode: Record<string, number> = {};
  let coTotal = 0;
  for (const co of changeOrders) {
    coByCode[co.costCode] = (coByCode[co.costCode] || 0) + co.netIncrease;
    coTotal += co.netIncrease;
  }

  // approved labor -> actual hours & cost by cost code, and hours by week
  const laborByCode: Record<string, { hours: number; cost: number }> = {};
  const hoursByWeekByCode: Record<string, Record<number, number>> = {};
  const laborTicketsByCode: Record<string, string[]> = {};
  for (const t of approvedTickets) {
    const code = t.header.costCode;
    const wk = weekFromId(t.id);
    if (!laborTicketsByCode[code]) laborTicketsByCode[code] = [];
    laborTicketsByCode[code].push(t.ticketNo);
    let ticketHours = 0;
    for (const r of t.rows) {
      const h = parseFloat(r.hours) || 0;
      ticketHours += h;
      if (!laborByCode[code]) laborByCode[code] = { hours: 0, cost: 0 };
      laborByCode[code].hours += h;
      laborByCode[code].cost += h * r.rate;
    }
    if (wk != null) {
      hoursByWeekByCode[code] = hoursByWeekByCode[code] || {};
      hoursByWeekByCode[code][wk] = (hoursByWeekByCode[code][wk] || 0) + ticketHours;
    }
  }

  const byCostCode: CostCodeMetrics[] = codes.map((c) => {
    const scheduledValue = c.scheduledValue + (coByCode[c.code] || 0);
    const laborBudget = c.laborCost;
    const budgetHours = c.plannedHours;
    const prog = progress[c.code];
    const percentComplete = prog ? prog.actual[latest] : 0;
    const plannedPercent = prog ? prog.planned[latest] : 0;
    const scheduleVariancePct = percentComplete - plannedPercent;
    const earnedValue = (percentComplete / 100) * scheduledValue;

    const labor = laborByCode[c.code];
    const hasLaborData = !!labor && labor.hours > 0;
    const actualHours = labor ? labor.hours : 0;
    const actualLaborCost = labor ? labor.cost : 0;

    let earnedHours: number | null = null;
    let productivity: number | null = null;
    let eacHours: number | null = null;
    let projectedLaborOverrun: number | null = null;

    if (hasLaborData && percentComplete > 0) {
      earnedHours = (percentComplete / 100) * budgetHours;
      productivity = earnedHours / actualHours;
      eacHours = actualHours / (percentComplete / 100);
      const blendedRate = actualLaborCost / actualHours;
      projectedLaborOverrun = eacHours * blendedRate - laborBudget;
    }

    const flags: Flag[] = [];
    if (plannedPercent - percentComplete > BEHIND_SCHEDULE_PTS) flags.push("behind-schedule");
    if (productivity != null && productivity < LOW_PRODUCTIVITY) flags.push("low-productivity");
    if (projectedLaborOverrun != null && projectedLaborOverrun > BUDGET_RISK_PCT * laborBudget)
      flags.push("budget-risk");

    const scheduleSev = clamp((plannedPercent - percentComplete) / 20, 0, 1);
    const prodSev = productivity != null && productivity < 1 ? clamp((1 - productivity) / 0.5, 0, 1) : 0;
    const budgetSev =
      projectedLaborOverrun != null && laborBudget > 0
        ? clamp(projectedLaborOverrun / laborBudget / 0.5, 0, 1)
        : 0;
    const severityScore = flags.length === 0 ? 0 : Math.max(0.8 * scheduleSev, prodSev, budgetSev);

    // per-line weekly series
    const progressSeries: ProgressPoint[] = prog
      ? prog.actual.map((a, i) => ({ week: i + 1, planned: prog.planned[i], actual: a }))
      : [];

    let productivitySeries: ProductivityPoint[] | null = null;
    if (hasLaborData && prog) {
      const hw = hoursByWeekByCode[c.code] || {};
      const series: ProductivityPoint[] = [];
      let prev = 0;
      prog.actual.forEach((pct, i) => {
        const wk = i + 1;
        const earned = ((pct - prev) / 100) * budgetHours;
        prev = pct;
        const hrs = hw[wk];
        if (hrs && hrs > 0) series.push({ week: wk, productivity: earned / hrs });
      });
      productivitySeries = series.length ? series : null;
    }

    return {
      code: c.code,
      description: c.description,
      scheduledValue,
      laborBudget,
      budgetHours,
      percentComplete,
      plannedPercent,
      scheduleVariancePct,
      earnedValue,
      hasLaborData,
      actualHours,
      actualLaborCost,
      earnedHours,
      productivity,
      eacHours,
      projectedLaborOverrun,
      flags,
      severityScore,
      progressSeries,
      productivitySeries,
    };
  });

  const totalValue = byCostCode.reduce((s, m) => s + m.scheduledValue, 0);
  const overallActualPct =
    byCostCode.reduce((s, m) => s + m.scheduledValue * m.percentComplete, 0) / totalValue || 0;
  const overallPlannedPct =
    byCostCode.reduce((s, m) => s + m.scheduledValue * m.plannedPercent, 0) / totalValue || 0;

  const flagged = byCostCode
    .filter((m) => m.flags.length > 0)
    .sort((a, b) => b.severityScore - a.severityScore)
    .map((m) => m.code);

  const baselineTotal = codes.reduce((s, c) => s + c.scheduledValue, 0);
  const revisedContract = baselineTotal + coTotal;

  // Cost / margin: only labor has actuals (timecards); materials are held at budget.
  const totalCostBudget = codes.reduce((s, c) => s + c.laborCost + c.materialCost, 0);
  const netLaborVariance = byCostCode.reduce((s, m) => s + (m.projectedLaborOverrun ?? 0), 0);
  const plannedMargin = revisedContract - totalCostBudget;
  const projectedMargin = plannedMargin - netLaborVariance;

  // Time: forecast finish from schedule performance (SPI = earned / planned).
  const spi = overallPlannedPct > 0 ? overallActualPct / overallPlannedPct : 1;
  const projectedFinishWeek =
    overallActualPct > 0 && overallPlannedPct > 0 ? Math.round(project.durationWeeks / spi) : null;

  return {
    asOfWeek: project.asOfWeek,
    asOfDate: project.asOfDate,
    overallActualPct,
    overallPlannedPct,
    originalContract: baselineTotal,
    revisedContract,
    byCostCode,
    flagged,
    laborTicketsByCode,
    netLaborVariance,
    plannedMargin,
    projectedMargin,
    durationWeeks: project.durationWeeks,
    projectedFinishWeek,
    analysis: null,
  };
}
