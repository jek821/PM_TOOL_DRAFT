// STAGE 3 (live) — server-only analysis route. The API key is read from the
// server environment and NEVER reaches the browser. The deterministic engine
// (Stage 2) has already computed every number; Claude's only job is to turn
// those numbers into plain-English priorities and recommendations — "numbers
// from the engine, words from the model." It never does arithmetic.
//
// Tiers, owned here: live Claude -> last good live result (cached) -> sample.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import type { ProjectContext } from "@/lib/metrics";
import { sampleAnalysis, type AnalysisResult, type Insight } from "@/lib/analyze";

export const runtime = "nodejs";

// Last successful live result, kept in module memory for the cached tier.
let lastLive: AnalysisResult | null = null;

const MODEL = "claude-opus-4-8";

const SYSTEM = `You are a construction project-controls analyst helping a general contractor's project manager read a labor-and-progress dashboard.

You are given a JSON "context" produced by a deterministic metrics engine. Every number in it is already computed and correct.

Hard rules:
- NEVER compute, estimate, or invent a number. Use only figures present in the context. You may quote and format them (e.g. "0.75 productivity", "$41,185 over budget"), but never derive new ones.
- Write ONE insight for each cost code listed in "flagged", and nothing for lines that are not flagged. "flagged" is already ranked most-serious-first by the engine — keep that order in your insights array.
- The engine decides ranking; you decide how urgent each item reads. Set "severity": "high" when the line's severityScore > 0.6, "medium" when > 0.35, otherwise "low".
- Set "status": "at-risk" if any flagged line carries a "budget-risk" flag; else "watch" if any line is flagged; else "healthy".
- If nothing is flagged, return status "healthy", a one-line reassuring headline, and an empty insights array.

Every figure in the context traces to a specific source document. Cite those sources so the PM can verify:
- percentComplete / plannedPercent -> the Weekly Progress Report (for "Week N", use asOfWeek).
- actualHours / productivity / productivitySeries -> the approved Weekly Labor Tickets (cite their ticket numbers from "laborTickets", e.g. "timecards #3041, #3068, #3095").
- budgetHours (planned hours) / laborBudget -> the Job Cost Budget.
- scheduledValue -> the Schedule of Values (includes any change orders).

Voice: plain English for a busy PM. Concrete, not generic. For each insight:
- "finding": what is happening and why it matters. If a line's productivitySeries declines week over week, call out the worsening trend using the actual values. If a behind-schedule line gates another trade, name that trade and the knock-on effect.
- "evidence": a terse, source-attributed list of the exact figures behind the finding — each item as "<source document>: <figure>", joined by " · ". Example: "Job Cost Budget: 720 planned hrs, $61,200 labor · approved timecards #3041, #3068, #3095: 540 hrs logged · Week 3 progress report: 45% complete". Pull the numbers only from the context; never invent them.
- "recommendation": a specific action the PM can take this week (get the foreman's read on the cause, re-baseline the remaining hours, add a crew, resequence, clear open RFIs) — never "monitor the situation".
- "relatedCodes": cost codes this line affects or depends on, when relevant.
Keep each finding and recommendation to 1-3 sentences. Headline: one sentence tying overall % complete vs planned to the number of lines needing attention. Use "" for costCode only on a project-wide insight.`;

const emitAnalysisTool: Anthropic.Tool = {
  name: "emit_analysis",
  description: "Return the project health analysis in the required structure.",
  input_schema: {
    type: "object",
    properties: {
      status: { type: "string", enum: ["healthy", "watch", "at-risk"] },
      headline: { type: "string" },
      insights: {
        type: "array",
        items: {
          type: "object",
          properties: {
            costCode: {
              type: "string",
              description: "Cost code this insight concerns, or \"\" for a project-wide insight.",
            },
            title: { type: "string" },
            severity: { type: "string", enum: ["high", "medium", "low"] },
            finding: { type: "string" },
            evidence: {
              type: "string",
              description: "Source-attributed figures behind the finding, each as \"<document>: <figure>\", joined by \" · \".",
            },
            recommendation: { type: "string" },
            relatedCodes: { type: "array", items: { type: "string" } },
          },
          required: ["costCode", "title", "severity", "finding", "evidence", "recommendation"],
        },
      },
    },
    required: ["status", "headline", "insights"],
  },
};

// Compact, model-facing digest: everything needed to reason about priority and
// dependencies, nothing else. Numbers pass through untouched.
function digest(ctx: ProjectContext) {
  return {
    asOfWeek: ctx.asOfWeek,
    overallActualPct: Math.round(ctx.overallActualPct),
    overallPlannedPct: Math.round(ctx.overallPlannedPct),
    flagged: ctx.flagged,
    lines: ctx.byCostCode.map((m) => ({
      code: m.code,
      description: m.description,
      flags: m.flags,
      severityScore: Number(m.severityScore.toFixed(3)),
      // schedule — from the Weekly Progress Report
      percentComplete: m.percentComplete,
      plannedPercent: m.plannedPercent,
      scheduleVariancePct: m.scheduleVariancePct,
      // labor — from approved Weekly Labor Tickets + the Job Cost Budget
      actualHours: m.actualHours,
      budgetHours: m.budgetHours,
      laborBudget: m.laborBudget,
      laborTickets: ctx.laborTicketsByCode[m.code] ?? [],
      productivity: m.productivity,
      productivitySeries:
        m.productivitySeries?.map((p) => ({ week: p.week, productivity: Number(p.productivity.toFixed(2)) })) ?? null,
      projectedLaborOverrun: m.projectedLaborOverrun != null ? Math.round(m.projectedLaborOverrun) : null,
      // value — from the Schedule of Values (incl. change orders)
      scheduledValue: m.scheduledValue,
    })),
  };
}

function normalizeInsights(raw: unknown): Insight[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((r) => {
    const o = r as Record<string, unknown>;
    const code = typeof o.costCode === "string" && o.costCode.trim() !== "" ? o.costCode : null;
    const related = Array.isArray(o.relatedCodes) ? (o.relatedCodes as string[]).filter((c) => typeof c === "string") : [];
    return {
      costCode: code,
      title: String(o.title ?? ""),
      severity: (o.severity === "high" || o.severity === "medium" || o.severity === "low" ? o.severity : "low") as Insight["severity"],
      finding: String(o.finding ?? ""),
      evidence: String(o.evidence ?? ""),
      recommendation: String(o.recommendation ?? ""),
      relatedCodes: related.length ? related : undefined,
    };
  });
}

export async function POST(req: Request) {
  let ctx: ProjectContext;
  try {
    ctx = (await req.json()).context as ProjectContext;
  } catch {
    return NextResponse.json({ status: "healthy", headline: "Analysis unavailable.", insights: [], source: "sample" });
  }

  if (process.env.ANTHROPIC_API_KEY) {
    try {
      const client = new Anthropic();
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        tools: [emitAnalysisTool],
        tool_choice: { type: "tool", name: "emit_analysis" },
        messages: [
          {
            role: "user",
            content: `Here is the project context (JSON):\n\n${JSON.stringify(digest(ctx), null, 2)}`,
          },
        ],
      });
      const block = msg.content.find((b) => b.type === "tool_use");
      if (block && block.type === "tool_use") {
        const out = block.input as Record<string, unknown>;
        const status =
          out.status === "healthy" || out.status === "watch" || out.status === "at-risk"
            ? (out.status as AnalysisResult["status"])
            : "watch";
        const result: AnalysisResult = {
          status,
          headline: String(out.headline ?? ""),
          insights: normalizeInsights(out.insights),
          source: "live",
        };
        lastLive = result;
        return NextResponse.json(result);
      }
    } catch (err) {
      console.error("[analyze] live call failed:", err);
    }
  }

  // Fallbacks: last good live result, else the deterministic sample.
  if (lastLive) return NextResponse.json({ ...lastLive, source: "cached" });
  return NextResponse.json(sampleAnalysis(ctx));
}
