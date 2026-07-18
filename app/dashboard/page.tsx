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
import { usd } from "@/lib/format";
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
} from "lucide-react";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const fmtShort = (iso: string) => {
  const [, m, d] = iso.split("-").map(Number);
  return `${MONTHS[m - 1]} ${d}`;
};

export default function DashboardPage() {
  const { loaded, tickets, progress, baseline } = useStore();

  const context = useMemo(
    () =>
      loaded
        ? computeProjectContext(tickets.filter((t) => t.status === "approved"), progress, baseline)
        : null,
    [loaded, tickets, progress, baseline]
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
  const topOverrun = Math.max(0, ...context.byCostCode.map((m) => m.projectedLaborOverrun ?? 0));
  const laborApproved = context.byCostCode.some((m) => m.hasLaborData);
  const pendingCount = tickets.filter(
    (t) => t.status === "unscanned" || t.status === "needsReview"
  ).length;
  const actualPct = Math.round(context.overallActualPct);
  const plannedPct = Math.round(context.overallPlannedPct);
  const behindPts = plannedPct - actualPct; // >0 = behind plan
  const asOfShort = fmtShort(context.asOfDate);
  const coDelta = context.revisedContract - context.originalContract;
  const totalCodes = context.byCostCode.length;

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

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          icon={CalendarClock}
          label="Overall complete"
          value={`${actualPct}%`}
          tone="accent"
          sub={
            <>
              vs {plannedPct}% planned by {asOfShort}
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
          icon={DollarSign}
          label="Revised contract"
          value={usd(context.revisedContract)}
          tone="primary"
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
          icon={context.flagged.length ? AlertTriangle : CheckCircle2}
          label="Cost codes flagged"
          value={String(context.flagged.length)}
          tone={context.flagged.length ? "warning" : "success"}
          sub={
            context.flagged.length
              ? `of ${totalCodes} — over budget or behind schedule`
              : `all ${totalCodes} on track`
          }
        />
        <Kpi
          icon={topOverrun > 0 ? TrendingUp : CheckCircle2}
          label="Projected labor overrun"
          value={topOverrun > 0 ? usd(topOverrun) : "—"}
          tone={topOverrun > 0 ? "danger" : "success"}
          sub={topOverrun > 0 ? "worst line, over its labor budget" : "no lines over labor budget"}
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
          {!laborApproved && (
            <p className="text-xs text-muted-foreground">
              Tip: labor productivity appears once you approve timecards on the Timecards page.
            </p>
          )}
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
  return <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{children}</div>;
}

function SummaryBanner({ analysis, analyzing }: { analysis: AnalysisResult | null; analyzing: boolean }) {
  // Loading state — indeterminate progress bar while the AI runs.
  if (analyzing || !analysis) {
    return (
      <div className="overflow-hidden rounded-xl border shadow-soft">
        <div className="bg-gradient-to-br from-primary/90 to-primary p-5 text-white">
          <div className="flex items-center gap-2 text-xs font-medium text-white/85">
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
        <div className="flex items-center gap-2 text-xs font-medium text-white/85">
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

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: React.ElementType; label: string; value: string; sub: React.ReactNode; tone: Tone }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className={cn("mb-2 inline-flex h-9 w-9 items-center justify-center rounded-lg", toneChip[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-xl font-bold">{value}</div>
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
    if (metric.productivity != null) chips.push(`Productivity ${metric.productivity.toFixed(2)}`);
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

function CostTable({ rows }: { rows: CostCodeMetrics[] }) {
  return (
    <Card>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                <th className="px-4 py-2.5 text-left font-medium">Cost Code</th>
                <th className="px-4 py-2.5 text-left font-medium">Description</th>
                <th className="px-4 py-2.5 text-left font-medium">Schedule (actual / planned)</th>
                <th className="px-4 py-2.5 text-right font-medium">Productivity</th>
                <th className="px-4 py-2.5 text-center font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((m) => {
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
                      {m.productivity != null ? (
                        <span className={cn(m.productivity < 0.85 && "font-semibold text-danger")}>{m.productivity.toFixed(2)}</span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
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
