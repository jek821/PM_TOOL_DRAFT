"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { useStore } from "@/lib/store";
import { computeProjectContext, type CostCodeMetrics } from "@/lib/metrics";
import { analyzeProject, getCachedAnalysis, type AnalysisResult, type Insight } from "@/lib/analyze";
import { usd, num } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Card, CardContent } from "@/components/ui/card";
import {
  LineChart as LineIcon,
  Sparkles,
  TrendingUp,
  CalendarClock,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  ArrowUpRight,
  FileText,
  Clock,
  Wallet,
  Info,
} from "lucide-react";

export default function DashboardPage() {
  const { loaded, tickets, progress, baseline, changeOrders } = useStore();

  const context = useMemo(
    () =>
      loaded
        ? computeProjectContext(
            tickets.filter((t) => t.status === "approved"),
            progress,
            baseline,
            changeOrders
          )
        : null,
    [loaded, tickets, progress, baseline, changeOrders]
  );

  const [analysis, setAnalysis] = useState<AnalysisResult | null>(() =>
    context ? getCachedAnalysis(context) : null
  );
  const [analyzing, setAnalyzing] = useState(false);
  useEffect(() => {
    if (!context) return;
    const cached = getCachedAnalysis(context);
    if (cached) {
      setAnalysis(cached);
      setAnalyzing(false);
      return; // unchanged inputs -> no re-run, no progress bar
    }
    let live = true;
    setAnalyzing(true);
    analyzeProject(context).then((a) => {
      if (live) {
        setAnalysis(a);
        setAnalyzing(false);
      }
    });
    return () => {
      live = false;
    };
  }, [context]);

  if (!loaded) return <EmptyState />;
  if (!context) return null;

  const metricFor = (code: string | null) =>
    code ? context.byCostCode.find((m) => m.code === code) : undefined;
  const netLabor = context.byCostCode.reduce((s, m) => s + (m.projectedLaborOverrun ?? 0), 0);
  const anyLabor = context.byCostCode.some((m) => m.hasLaborData);
  const pendingCount = tickets.filter(
    (t) => t.status === "unscanned" || t.status === "needsReview"
  ).length;
  const actualPct = Math.round(context.overallActualPct);
  const plannedPct = Math.round(context.overallPlannedPct);
  const behindPts = plannedPct - actualPct; // >0 = behind plan
  const coDelta = context.revisedContract - context.originalContract;
  const totalCodes = context.byCostCode.length;
  const marginDelta = context.projectedMargin - context.plannedMargin; // <0 = eroded by labor
  const spi = context.overallPlannedPct > 0 ? context.overallActualPct / context.overallPlannedPct : 1;
  const totalCostBudget = context.revisedContract - context.plannedMargin; // Job Cost Budget total
  const weeksLate = context.projectedFinishWeek != null ? context.projectedFinishWeek - context.durationWeeks : null;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <SummaryBanner analysis={analysis} analyzing={analyzing} />

      {pendingCount > 0 && (
        <Link
          href="/timecards"
          className="flex items-center gap-3 rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm transition-colors hover:bg-warning/15"
        >
          <AlertTriangle className="h-5 w-5 shrink-0 text-warning" />
          <span className="flex-1 text-foreground/80">
            <span className="font-semibold text-foreground">
              {pendingCount} timecard{pendingCount > 1 ? "s" : ""} still awaiting review.
            </span>{" "}
            Labor figures below count only approved timecards, so this view is incomplete until you finish reviewing.
          </span>
          <span className="flex shrink-0 items-center gap-1 font-medium text-warning">
            Review <ArrowUpRight className="h-4 w-4" />
          </span>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Kpi
          icon={CalendarClock}
          label="Overall complete"
          value={`${actualPct}%`}
          tone="accent"
          info={{
            title: "Overall % complete",
            formula:
              "Each cost code's % complete, weighted by its share of the contract — so a $335k line moves this more than a $75k one.",
            plugged: `Σ(scheduled value × % complete) ÷ ${usd(context.revisedContract)}\n= ${actualPct}% actual vs ${plannedPct}% planned`,
            source: "Weekly Progress Reports (% complete) · Schedule of Values (weighting)",
          }}
          sub={
            <>
              vs {plannedPct}% planned to date
              {behindPts > 0 ? (
                <span className="mt-0.5 block font-semibold text-danger">{behindPts} pts behind plan</span>
              ) : behindPts < 0 ? (
                <span className="mt-0.5 block font-semibold text-success">{-behindPts} pts ahead of plan</span>
              ) : (
                <span className="mt-0.5 block font-medium text-success">on plan</span>
              )}
            </>
          }
        />
        <Kpi
          icon={Clock}
          label="Projected completion"
          value={context.projectedFinishWeek != null ? `Week ${context.projectedFinishWeek}` : "—"}
          info={{
            title: "Projected completion",
            formula:
              "Schedule Performance Index (SPI) = actual % ÷ planned %. Carrying the current pace across the full contract duration gives the finish week.",
            plugged: `${actualPct}% ÷ ${plannedPct}% = ${spi.toFixed(2)} SPI\n${context.durationWeeks} wks ÷ ${spi.toFixed(2)} = Week ${context.projectedFinishWeek ?? "—"}`,
            source: "Weekly Progress Reports · contract duration from the Schedule of Values",
          }}
          tone={weeksLate == null ? "primary" : weeksLate > 0 ? "danger" : weeksLate < 0 ? "success" : "primary"}
          sub={
            weeksLate == null ? (
              "needs progress data"
            ) : (
              <>
                planned Week {context.durationWeeks}
                {weeksLate > 0 ? (
                  <span className="mt-0.5 block font-semibold text-danger">
                    {weeksLate} wk{weeksLate > 1 ? "s" : ""} late at this pace
                  </span>
                ) : weeksLate < 0 ? (
                  <span className="mt-0.5 block font-semibold text-success">
                    {-weeksLate} wk{-weeksLate > 1 ? "s" : ""} ahead of schedule
                  </span>
                ) : (
                  <span className="mt-0.5 block font-medium text-success">on schedule</span>
                )}
              </>
            )
          }
        />
        <Kpi
          icon={context.flagged.length ? AlertTriangle : CheckCircle2}
          label="Cost codes flagged"
          value={String(context.flagged.length)}
          info={{
            title: "Cost codes flagged",
            formula:
              "A line flags if it trails plan by more than 8 points, or productivity is under 0.85, or its projected labor overrun exceeds 10% of that line's labor budget. The same rules run on every line — nothing is hardcoded per trade.",
            plugged: `${context.flagged.length} of ${totalCodes} lines flagged`,
            source: "Weekly Progress Reports · approved Timecards · Job Cost Budget",
          }}
          tone={context.flagged.length ? "warning" : "success"}
          sub={
            context.flagged.length
              ? `of ${totalCodes} — over budget or behind schedule`
              : `all ${totalCodes} on track`
          }
        />
        <Kpi
          icon={DollarSign}
          label="Revised contract"
          value={usd(context.revisedContract)}
          tone="primary"
          info={{
            title: "Revised contract",
            formula:
              "The original contract total plus every approved change order. A change order never replaces the Schedule of Values — it revises it.",
            plugged: `${usd(context.originalContract)} + ${usd(coDelta)} in change orders\n= ${usd(context.revisedContract)}`,
            source: "Schedule of Values · approved Change Orders",
          }}
          sub={
            coDelta !== 0 ? (
              <>
                was {usd(context.originalContract)}
                <span className="mt-0.5 block font-medium text-foreground/70">
                  {coDelta > 0 ? "+" : "-"}
                  {usd(Math.abs(coDelta))} in change orders
                </span>
              </>
            ) : (
              "no change orders yet"
            )
          }
        />
        <Kpi
          icon={Wallet}
          label="Projected margin"
          value={usd(context.projectedMargin)}
          info={{
            title: "Projected margin",
            formula:
              "Revised contract minus the total cost budget gives planned margin; subtracting the projected labor variance gives where it actually lands. Materials are held at budget — there is no invoice data to vary them, so this moves on labor only.",
            plugged: `${usd(context.revisedContract)} − ${usd(totalCostBudget)} = ${usd(context.plannedMargin)} planned\n− ${usd(context.netLaborVariance)} labor = ${usd(context.projectedMargin)}`,
            source: "SOV + Change Orders · Job Cost Budget · approved Timecards",
          }}
          tone={context.projectedMargin < 0 ? "danger" : marginDelta < -1 ? "warning" : "success"}
          sub={
            <>
              vs {usd(context.plannedMargin)} planned
              {marginDelta < -1 ? (
                <span className="mt-0.5 block font-semibold text-danger">
                  {usd(-marginDelta)} eaten by labor overruns
                </span>
              ) : marginDelta > 1 ? (
                <span className="mt-0.5 block font-semibold text-success">
                  {usd(marginDelta)} ahead on labor
                </span>
              ) : (
                <span className="mt-0.5 block font-medium text-foreground/70">materials held at budget</span>
              )}
            </>
          }
        />
        <Kpi
          icon={netLabor > 1 ? TrendingUp : CheckCircle2}
          label="Projected labor"
          value={anyLabor ? usd(Math.abs(netLabor)) : "—"}
          info={{
            title: "Projected labor variance",
            formula:
              "For each line with timecards: estimate at completion = actual hours ÷ % complete, costed at the crew's blended rate, minus that line's labor budget. Summed across lines. Only lines with approved timecards contribute.",
            plugged: anyLabor
              ? `net ${usd(Math.abs(netLabor))} ${netLabor > 0 ? "over" : "under"} labor budget`
              : "no approved timecards yet",
            source: "approved Weekly Labor Tickets · Job Cost Budget · Weekly Progress Reports",
          }}
          tone={netLabor > 1 ? "danger" : netLabor < -1 ? "success" : "primary"}
          sub={
            !anyLabor
              ? "no labor logged yet"
              : netLabor > 1
              ? "over labor budget"
              : netLabor < -1
              ? "under budget · saved"
              : "on labor budget"
          }
        />
      </div>

      <div>
        <SectionLabel>What needs attention</SectionLabel>
        <div className="space-y-4">
          {analysis && analysis.insights.length === 0 && (
            <Card>
              <CardContent className="flex items-center gap-3 p-5 text-sm">
                <CheckCircle2 className="h-5 w-5 text-success" />
                All lines are within tolerance — nothing flagged this week.
              </CardContent>
            </Card>
          )}
          {analysis?.insights.map((ins) => (
            <InsightCard key={ins.costCode ?? ins.title} insight={ins} metric={metricFor(ins.costCode)} />
          ))}
        </div>
      </div>

      <div>
        <SectionLabel>All cost codes</SectionLabel>
        <CostTable rows={context.byCostCode} />
      </div>
    </div>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <div className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>;
}

function SummaryBanner({ analysis, analyzing }: { analysis: AnalysisResult | null; analyzing: boolean }) {
  // Loading state — indeterminate progress bar while the AI runs.
  if (analyzing || !analysis) {
    return (
      <div className="overflow-hidden rounded-xl border shadow-soft">
        <div className="bg-gradient-to-br from-primary/90 to-primary p-5 text-white">
          <div className="flex items-center gap-2 font-display text-xs font-medium text-white/85">
            <Sparkles className="h-4 w-4" /> AI Project Summary
            <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
              Analyzing
            </span>
          </div>
          <p className="mt-2 text-lg font-semibold leading-snug">Reading the latest figures and writing the summary…</p>
          <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-white/20">
            <div className="h-full w-1/4 rounded-full bg-white/90 animate-progress-indeterminate" />
          </div>
        </div>
      </div>
    );
  }

  const status = analysis.status;
  const tone = status === "at-risk" ? "from-danger/90 to-danger" : status === "watch" ? "from-warning/90 to-warning" : "from-success/90 to-success";
  const label = status === "at-risk" ? "At risk" : status === "watch" ? "Watch" : "On track";
  return (
    <div className="overflow-hidden rounded-xl border shadow-soft">
      <div className={cn("bg-gradient-to-br p-5 text-white", tone)}>
        <div className="flex items-center gap-2 font-display text-xs font-medium text-white/85">
          <Sparkles className="h-4 w-4" /> AI Project Summary
          <span className="ml-1 rounded-full bg-white/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">{label}</span>
          {analysis.source !== "live" && (
            <span className="ml-auto rounded-full bg-white/15 px-2 py-0.5 text-[10px]">
              {analysis.source === "cached" ? "cached" : "sample"}
            </span>
          )}
        </div>
        <p className="mt-2 text-lg font-semibold leading-snug">{analysis.headline}</p>
      </div>
    </div>
  );
}

type Tone = "accent" | "primary" | "success" | "warning" | "danger";
const toneChip: Record<Tone, string> = {
  accent: "bg-accent/10 text-accent",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
  danger: "bg-danger/10 text-danger",
};

function Kpi({ icon: Icon, label, value, sub, tone, info }: { icon: React.ElementType; label: string; value: string; sub: React.ReactNode; tone: Tone; info?: MetricInfo }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg", toneChip[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs text-muted-foreground">
          {info ? <InfoTip info={info}>{label}</InfoTip> : label}
        </div>
        <div className="font-display text-xl font-bold tracking-tight">{value}</div>
        <div className="text-[11px] leading-snug text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}

const sevTone: Record<Insight["severity"], Tone> = { high: "danger", medium: "warning", low: "accent" };

function InsightCard({ insight, metric }: { insight: Insight; metric?: CostCodeMetrics }) {
  const [showRec, setShowRec] = useState(false);
  const chips: string[] = [];
  if (metric) {
    if (metric.productivity != null) chips.push(`Productivity ${metric.productivity.toFixed(2)} of 1.00`);
    if (metric.projectedLaborOverrun != null && metric.projectedLaborOverrun > 0) chips.push(`Proj. overrun ${usd(metric.projectedLaborOverrun)}`);
    if (metric.flags.includes("behind-schedule")) chips.push(`${metric.percentComplete}% vs ${metric.plannedPercent}% planned`);
  }
  const showProductivity = metric?.productivitySeries && metric.productivitySeries.length > 0;

  return (
    <Card>
      <CardContent className="grid gap-5 p-5 md:grid-cols-[1fr_260px]">
        <div>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className={cn("rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase", toneChip[sevTone[insight.severity]])}>{insight.severity}</span>
              <h3 className="text-sm font-semibold">{insight.title}</h3>
            </div>
            {insight.costCode && <span className="shrink-0 rounded bg-muted px-1.5 py-0.5 font-mono text-[11px] text-muted-foreground">{insight.costCode}</span>}
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{insight.finding}</p>
          {insight.evidence && (
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <FileText className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/70" />
              <span>
                <span className="font-semibold uppercase tracking-wide text-foreground/60">Source · </span>
                {insight.evidence}
              </span>
            </p>
          )}
          {chips.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {chips.map((c) => <span key={c} className="rounded-md bg-muted px-2 py-1 text-xs font-medium tabular-nums">{c}</span>)}
            </div>
          )}
          {insight.recommendation &&
            (showRec ? (
              <div className="mt-3 flex items-start gap-2 rounded-md bg-accent/5 p-2.5 text-sm">
                <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span className="text-foreground/80">
                  <span className="mr-1 text-[11px] font-semibold uppercase tracking-wide text-accent">
                    Suggested approach ·
                  </span>
                  {insight.recommendation}
                </span>
              </div>
            ) : (
              <button
                onClick={() => setShowRec(true)}
                className="mt-3 inline-flex items-center gap-1.5 rounded-md border border-accent/30 bg-accent/5 px-2.5 py-1.5 text-xs font-medium text-accent transition-colors hover:bg-accent/10"
              >
                <Sparkles className="h-3.5 w-3.5" /> Get AI recommendation
              </button>
            ))}
        </div>

        <div className="min-w-0">
          {metric && (showProductivity ? <ProductivityMini metric={metric} /> : <ScheduleMini metric={metric} />)}
        </div>
      </CardContent>
    </Card>
  );
}

function ChartFrame({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border bg-muted/20 p-3">
      <div className="mb-1 text-[11px] font-medium text-muted-foreground">{title}</div>
      <div className="h-36">
        <ResponsiveContainer width="100%" height="100%">{children as any}</ResponsiveContainer>
      </div>
    </div>
  );
}

function ProductivityMini({ metric }: { metric: CostCodeMetrics }) {
  const data = (metric.productivitySeries ?? []).map((p) => ({ name: `Wk ${p.week}`, value: Number(p.productivity.toFixed(2)) }));
  return (
    <ChartFrame title="Weekly productivity (1.0 = on budget)">
      <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -22 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis domain={[0, 1.2]} tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <ReferenceLine y={1} stroke="hsl(var(--success))" strokeDasharray="4 4" />
        <Tooltip />
        <Line type="monotone" dataKey="value" name="productivity" stroke="hsl(var(--danger))" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ChartFrame>
  );
}

function ScheduleMini({ metric }: { metric: CostCodeMetrics }) {
  const data = metric.progressSeries.map((p) => ({ name: `Wk ${p.week}`, planned: p.planned, actual: p.actual }));
  return (
    <ChartFrame title="Planned vs. actual % complete">
      <LineChart data={data} margin={{ top: 5, right: 8, bottom: 0, left: -22 }}>
        <XAxis dataKey="name" tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <YAxis tick={{ fontSize: 11 }} stroke="hsl(var(--muted-foreground))" />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Line type="monotone" dataKey="planned" stroke="hsl(var(--muted-foreground))" strokeWidth={2} strokeDasharray="4 4" dot={false} />
        <Line type="monotone" dataKey="actual" stroke="hsl(var(--danger))" strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ChartFrame>
  );
}

function ProgressBullet({ actual, planned, flagged }: { actual: number; planned: number; flagged: boolean }) {
  return (
    <div className="relative h-2 w-24 rounded-full bg-muted">
      <div
        className="absolute inset-y-0 left-0 rounded-full"
        style={{ width: `${Math.min(actual, 100)}%`, background: flagged ? "hsl(var(--danger))" : "hsl(var(--success))" }}
      />
      <div
        className="absolute -top-0.5 h-3 w-0.5 rounded bg-foreground/50"
        style={{ left: `${Math.min(planned, 100)}%` }}
        title={`planned ${planned}%`}
      />
    </div>
  );
}

export interface MetricInfo {
  title: string;
  /** The formula in words — how this figure is derived. */
  formula: string;
  /** The same formula with this project's live values substituted in. */
  plugged?: string;
  /** Which uploaded document(s) each input came from. */
  source: string;
}

/** Hover explainer for a figure: the exact formula, the live numbers plugged
 * into it, and the source documents behind it. Every number on this dashboard
 * is computed by lib/metrics.ts — these quote that math so a PM can trace any
 * figure back to the paperwork rather than taking it on faith.
 *
 * Placement matters: the cost table sits in an `overflow-x-auto` container,
 * and CSS forces overflow-y to `auto` when overflow-x isn't `visible` — so a
 * tooltip that escapes the row box vertically gets clipped. "left" centres on
 * the row, "leftUp" grows upward for the bottom rows, "bottom" is for the KPI
 * cards (which have no clipping ancestor). */
function InfoTip({
  info,
  placement = "bottom",
  children,
}: {
  info: MetricInfo;
  placement?: "bottom" | "bottomEnd" | "left" | "leftUp" | "leftDown";
  children: React.ReactNode;
}) {
  const pos =
    placement === "left"
      ? "right-full top-1/2 mr-2 -translate-y-1/2"
      : placement === "leftUp"
      ? "right-full bottom-0 mr-2"
      : placement === "leftDown"
      ? "right-full top-0 mr-2"
      : placement === "bottomEnd"
      ? "right-0 top-full mt-1.5"
      : "left-0 top-full mt-1.5";
  return (
    <span className="group relative inline-flex cursor-help items-center gap-1">
      {children}
      <Info className="h-3 w-3 shrink-0 text-muted-foreground/60" />
      <span
        className={cn(
          "pointer-events-none absolute z-30 hidden w-64 rounded-lg bg-primary px-3 py-2.5 text-left text-xs font-normal normal-case leading-snug tracking-normal text-primary-foreground shadow-lg group-hover:block",
          pos
        )}
      >
        <span className="block font-semibold">{info.title}</span>
        <span className="mt-1 block text-[11px] leading-relaxed text-primary-foreground/80">{info.formula}</span>
        {info.plugged && (
          <span className="mt-1.5 block whitespace-pre-line rounded bg-white/10 px-2 py-1 font-mono text-[11px] leading-relaxed">
            {info.plugged}
          </span>
        )}
        <span className="mt-1.5 block text-[11px] text-primary-foreground/70">
          <span className="font-semibold uppercase tracking-wide">Source · </span>
          {info.source}
        </span>
      </span>
    </span>
  );
}

const SCHEDULE_INFO: MetricInfo = {
  title: "Schedule — actual vs planned",
  formula:
    "Physical % complete as assessed in the field, against the baseline schedule for the same week. A line flags as behind when it trails plan by more than 8 points.",
  source: "Weekly Progress Report (actual %) · baseline schedule curve (planned %)",
};

const PRODUCTIVITY_INFO: MetricInfo = {
  title: "Productivity factor",
  formula:
    "Earned hours ÷ actual hours, where earned = % complete × budgeted hours. 1.00 means the crew is exactly on the budgeted pace. Below 1.00 it is burning more hours than the finished work has earned back; 0.75 means it earns 45 minutes of budgeted work per hour worked. Flags below 0.85.",
  source: "Job Cost Budget (budgeted hrs) · Weekly Progress Report (% complete) · approved Weekly Labor Tickets (actual hrs)",
};

const STATUS_INFO: MetricInfo = {
  title: "Status",
  formula:
    "Red when the line carries at least one flag — behind schedule (>8 pts behind plan), low productivity (<0.85), or budget risk (projected labor overrun >10% of the line's labor budget). Green when none apply. Hover the dot to see which flags fired.",
  source: "computed from the Progress Reports, Job Cost Budget, and approved Timecards",
};

const NO_PRODUCTIVITY_INFO: MetricInfo = {
  title: "No productivity for this line",
  formula:
    "Productivity is earned hours ÷ actual hours, so it needs labor data. No timecards have been approved against this cost code, so the tool shows nothing rather than guessing. The schedule figures on this row are unaffected — those come from the progress report.",
  source: "needs approved Weekly Labor Tickets",
};

function productivityInfo(m: CostCodeMetrics): MetricInfo {
  if (m.productivity == null) return NO_PRODUCTIVITY_INFO;
  const earned = Math.round(m.earnedHours ?? 0);
  return {
    ...PRODUCTIVITY_INFO,
    plugged:
      `${m.percentComplete}% × ${num(m.budgetHours)} budgeted hrs = ${num(earned)} earned hrs\n` +
      `${num(earned)} ÷ ${num(m.actualHours)} actual hrs = ${m.productivity.toFixed(2)}`,
  };
}

function CostTable({ rows }: { rows: CostCodeMetrics[] }) {
  // The table sits in an `overflow-x-auto` container, and CSS forces overflow-y
  // to `auto` alongside it — so a tooltip that escapes the container vertically
  // is clipped. Rows in the top third grow downward, the bottom third upward,
  // and the middle centres. Anchoring by zone rather than by a fixed row count
  // keeps this correct as the tooltip's content (and height) changes.
  const zone = Math.ceil(rows.length / 3);
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b font-display text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Cost Code</th>
                <th className="px-4 py-2.5 text-left font-medium">Description</th>
                <th className="px-4 py-2.5 text-left font-medium">
                  <InfoTip info={SCHEDULE_INFO}>Schedule (actual / planned)</InfoTip>
                </th>
                <th className="px-4 py-2.5 text-right font-medium">
                  <InfoTip info={PRODUCTIVITY_INFO} placement="bottomEnd">
                    Productivity <span className="normal-case">(1.00 = on budget)</span>
                  </InfoTip>
                </th>
                <th className="px-4 py-2.5 text-center font-medium">
                  <InfoTip info={STATUS_INFO} placement="bottomEnd">Status</InfoTip>
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m, i) => {
                const flagged = m.flags.length > 0;
                return (
                  <tr key={m.code} className="border-b last:border-0">
                    <td className="px-4 py-2.5 font-mono text-xs">{m.code}</td>
                    <td className="px-4 py-2.5">{m.description}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2.5">
                        <ProgressBullet actual={m.percentComplete} planned={m.plannedPercent} flagged={m.flags.includes("behind-schedule")} />
                        <span className="w-16 tabular-nums text-[11px] text-muted-foreground">{m.percentComplete}% / {m.plannedPercent}%</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums">
                      <InfoTip
                        info={productivityInfo(m)}
                        placement={i < zone ? "leftDown" : i >= rows.length - zone ? "leftUp" : "left"}
                      >
                        {m.productivity != null ? (
                          <span className={cn(m.productivity < 0.85 && "font-semibold text-danger")}>
                            {m.productivity.toFixed(2)}
                          </span>
                        ) : (
                          <span className="border-b border-dashed border-muted-foreground/50 text-muted-foreground">—</span>
                        )}
                      </InfoTip>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={cn("inline-block h-2.5 w-2.5 rounded-full", flagged ? "bg-danger" : "bg-success")} title={flagged ? m.flags.join(", ") : "on track"} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col items-center justify-center gap-3 text-center">
      <LineIcon className="h-10 w-10 text-muted-foreground" />
      <div className="text-sm font-medium">No project loaded</div>
      <p className="max-w-xs text-xs text-muted-foreground">Load the sample project from the Overview to see the dashboard.</p>
      <Link href="/" className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Go to Overview</Link>
    </div>
  );
}
