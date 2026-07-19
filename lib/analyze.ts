// STAGE 3 — analysis seam. Returns an AnalysisResult (the AI's job).
// Now: a `sample` mock, shaped EXACTLY like the real Claude output, derived from
// the computed context so it reflects whatever the engine flagged.
// Later: try live Claude -> cached last-real-result -> this sample (badged by `source`).

import type { ProjectContext, CostCodeMetrics } from "./metrics";
import { usd } from "./format";

export type OverallStatus = "healthy" | "watch" | "at-risk";

export interface Insight {
  costCode: string | null; // line it concerns (null = project-wide)
  title: string;
  severity: "high" | "medium" | "low"; // the AI's priority read
  finding: string; // plain English — what's happening
  evidence: string; // the specific source documents + figures behind the finding
  recommendation: string; // what the PM should do
  relatedCodes?: string[]; // cross-references
}

export interface AnalysisResult {
  status: OverallStatus;
  headline: string;
  insights: Insight[]; // order follows the engine's ranking
  source: "live" | "cached" | "sample";
}

// Client-side memo so navigating back to the dashboard doesn't re-run the AI
// when the inputs are unchanged. Keyed by a signature of the figures that drive
// the analysis; survives client-side navigation, resets on a full page reload.
let memoKey: string | null = null;
let memoResult: AnalysisResult | null = null;
// In-flight request dedup: if the dashboard mounts again (e.g. you navigate
// away and back) while an identical analysis is still running, reuse that same
// request instead of firing — and paying for — a second Claude call.
let inflightKey: string | null = null;
let inflight: Promise<AnalysisResult> | null = null;

function contextKey(ctx: ProjectContext): string {
  return JSON.stringify({
    w: ctx.asOfWeek,
    a: Math.round(ctx.overallActualPct),
    p: Math.round(ctx.overallPlannedPct),
    r: ctx.revisedContract,
    f: ctx.flagged,
    lines: ctx.byCostCode.map((m) => [
      m.code,
      m.percentComplete,
      m.plannedPercent,
      m.productivity,
      m.projectedLaborOverrun,
      m.flags.join(","),
    ]),
  });
}

/** Synchronous cache read — lets the dashboard skip the "Analyzing…" flash on
 * revisits when the inputs haven't changed. Returns null on a cache miss. */
export function getCachedAnalysis(ctx: ProjectContext): AnalysisResult | null {
  return contextKey(ctx) === memoKey ? memoResult : null;
}

// Client seam. POSTs the computed context to the server route, which owns the
// live -> cached -> sample tiers (the API key lives there, never in the browser).
// If the route itself is unreachable, fall back to the local sample so the
// dashboard always renders something — badged honestly via `source`.
export async function analyzeProject(ctx: ProjectContext): Promise<AnalysisResult> {
  const key = contextKey(ctx);
  if (key === memoKey && memoResult) return memoResult; // unchanged inputs -> no re-run
  if (key === inflightKey && inflight) return inflight; // identical request already running -> reuse it

  const run = (async (): Promise<AnalysisResult> => {
    let result: AnalysisResult;
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ context: ctx }),
      });
      if (!res.ok) throw new Error(`analyze ${res.status}`);
      result = (await res.json()) as AnalysisResult;
    } catch {
      result = sampleAnalysis(ctx);
    }
    memoKey = key;
    memoResult = result;
    return result;
  })();

  inflightKey = key;
  inflight = run;
  try {
    return await run;
  } finally {
    if (inflightKey === key) {
      inflightKey = null;
      inflight = null;
    }
  }
}

export function sampleAnalysis(ctx: ProjectContext): AnalysisResult {
  const flaggedMetrics = ctx.flagged
    .map((code) => ctx.byCostCode.find((m) => m.code === code))
    .filter((m): m is CostCodeMetrics => !!m);

  if (flaggedMetrics.length === 0) {
    return {
      status: "healthy",
      headline: `On track — every line is within tolerance at Week ${ctx.asOfWeek}.`,
      insights: [],
      source: "sample",
    };
  }

  const insights = flaggedMetrics.map((m) => sampleInsight(m, ctx));
  const hasBudget = flaggedMetrics.some((m) => m.flags.includes("budget-risk"));
  const status: OverallStatus = hasBudget ? "at-risk" : "watch";
  const n = flaggedMetrics.length;
  const headline =
    `Overall ${ctx.overallActualPct.toFixed(0)}% complete vs ~${ctx.overallPlannedPct.toFixed(0)}% planned — ` +
    `reads on track, but ${n} line${n > 1 ? "s" : ""} need${n > 1 ? "" : "s"} a closer look.`;

  return { status, headline, insights, source: "sample" };
}

function sampleInsight(m: CostCodeMetrics, ctx: ProjectContext): Insight {
  const severity: Insight["severity"] =
    m.severityScore > 0.6 ? "high" : m.severityScore > 0.35 ? "medium" : "low";

  const finding: string[] = [];
  const rec: string[] = [];
  const related: string[] = [];
  let title = m.description;

  const isCost = m.flags.includes("low-productivity") || m.flags.includes("budget-risk");
  const isSchedule = m.flags.includes("behind-schedule");

  if (isCost) {
    title = `${m.description} — labor running over`;
    if (m.productivity != null)
      finding.push(
        `Productivity is ${m.productivity.toFixed(2)} — the crew is logging more hours than the completed work is earning back.`
      );
    const s = m.productivitySeries;
    if (s && s.length >= 2 && s[s.length - 1].productivity < s[0].productivity)
      finding.push(
        `It has fallen every week so far (${s[0].productivity.toFixed(2)} → ${s[s.length - 1].productivity.toFixed(2)}) — a worsening trend, not a one-week blip.`
      );
    if (m.projectedLaborOverrun != null && m.projectedLaborOverrun > 0)
      finding.push(`At this rate it projects to about ${usd(m.projectedLaborOverrun)} over the labor budget on this scope.`);
    rec.push(
      "Get the foreman's read on the cause — access, rework, or an undersized crew — and re-baseline the remaining hours now, rather than waiting for the monthly requisition to surface it."
    );
  }

  if (isSchedule) {
    if (!isCost) title = `${m.description} — behind schedule`;
    const weeksBehind = ((m.plannedPercent - m.percentComplete) / 10).toFixed(1);
    finding.push(
      `${m.percentComplete}% complete against ${m.plannedPercent}% planned — roughly ${weeksBehind} weeks behind.`
    );
    const dependent = ctx.byCostCode.find(
      (x) => x.hasLaborData && x.flags.length > 0 && x.code !== m.code
    );
    if (dependent) {
      finding.push(
        `This scope gates ${dependent.description}, so a further slip stalls that crew and deepens its labor overrun.`
      );
      rec.push(
        `Press the subcontractor to add a crew and clear any open RFIs this week. If it can't recover, resequence ${dependent.description} to areas that don't depend on it so those hours aren't wasted.`
      );
      related.push(dependent.code);
    } else {
      rec.push("Add a crew or extend shifts this week to close the gap before downstream trades are affected.");
    }
  }

  // Ground the finding in the specific source documents + figures.
  const ev: string[] = [];
  if (isCost) {
    ev.push(`Job Cost Budget: ${m.budgetHours} planned hrs, ${usd(m.laborBudget)} labor`);
    const tks = ctx.laborTicketsByCode[m.code] ?? [];
    if (tks.length) ev.push(`approved timecards ${tks.map((t) => `#${t}`).join(", ")}: ${m.actualHours} hrs logged`);
  }
  if (isSchedule) {
    ev.push(`Week ${ctx.asOfWeek} progress report: ${m.percentComplete}% actual vs ${m.plannedPercent}% planned`);
  }

  return {
    costCode: m.code,
    title,
    severity,
    finding: finding.join(" "),
    evidence: ev.join(" · "),
    recommendation: rec.join(" "),
    relatedCodes: related.length ? related : undefined,
  };
}
