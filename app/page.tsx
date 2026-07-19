"use client";

import { useState } from "react";
import Link from "next/link";
import { project } from "@/lib/seed";
import { allDocuments } from "@/lib/documents";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import {
  Building2,
  ScrollText,
  LineChart,
  ArrowRight,
  UploadCloud,
  Lock,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  FolderOpen,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";

export default function Overview() {
  const { loaded, loadProject, reset, tickets } = useStore();

  if (!loaded) return <UploadScreen onLoad={loadProject} />;

  const toReview = tickets.filter((t) => t.status === "unscanned" || t.status === "needsReview").length;
  const approved = tickets.filter((t) => t.status === "approved").length;

  const details: [string, string][] = [
    ["General Contractor", project.gc],
    ["Owner", project.owner],
    ["Project Manager", project.projectManager],
    ["Superintendent", project.superintendent],
    ["Address", project.address],
    ["Job Number", project.jobNumber],
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-8">
      {/* Compact project header */}
      <div className="flex items-start justify-between overflow-hidden rounded-2xl border bg-gradient-to-br from-primary to-primary/85 p-6 text-white shadow-soft">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-white/60">
            <Building2 className="h-4 w-4" /> Active Project
          </div>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="mt-1 truncate text-sm text-white/70">
            {project.gc} · {project.owner} · Job {project.jobNumber}
          </p>
        </div>
        <button
          onClick={reset}
          className="ml-4 inline-flex shrink-0 items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo
        </button>
      </div>

      {/* Foreground the core job: timecard review */}
      <div className="grid gap-4 md:grid-cols-[1.5fr_1fr]">
        <Link
          href="/timecards"
          className="group flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-card transition hover:border-accent/40 hover:shadow-soft"
        >
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <ScrollText className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-xl font-bold">Review this week&apos;s timecards</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              {toReview > 0
                ? `${toReview} card${toReview > 1 ? "s" : ""} waiting. The tool reads each handwritten ticket — you verify the hours and approve them for payroll.`
                : `All caught up — ${approved} approved. Re-open to review or export the payroll CSV.`}
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-accent">
            {toReview > 0 ? "Start review" : "Open timecards"}
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>

        <Link
          href="/dashboard"
          className="group flex flex-col justify-between rounded-2xl border bg-card p-6 shadow-card transition hover:border-primary/30 hover:shadow-soft"
        >
          <div>
            <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <LineChart className="h-5 w-5" />
            </div>
            <h2 className="mt-3 text-xl font-bold">Project health</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Budget vs. progress, labor productivity, and schedule risk — with an AI read on what needs attention.
            </p>
          </div>
          <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary">
            Open dashboard
            <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
          </span>
        </Link>
      </div>

      {/* Project facts — no dashboard-style KPIs */}
      <Card>
        <CardContent className="p-6">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Project Details
          </h2>
          <dl className="grid grid-cols-1 gap-x-8 gap-y-2.5 sm:grid-cols-2">
            {details.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2 text-sm">
                <dt className="text-muted-foreground">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>
    </div>
  );
}

function UploadScreen({ onLoad }: { onLoad: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const total = allDocuments.length;
  const started = uploading || done > 0;

  const startUpload = () => {
    if (uploading) return;
    setUploading(true);
    let i = 0;
    const timer = window.setInterval(() => {
      i += 1;
      setDone(i);
      if (i >= total) {
        window.clearInterval(timer);
        window.setTimeout(onLoad, 500);
      }
    }, 160);
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <div className="mb-6 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
          <UploadCloud className="h-7 w-7" />
        </div>
        <h1 className="text-3xl font-bold tracking-tight text-primary">
          Start with your project&apos;s paperwork
        </h1>
        <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
          Load the sample paperwork below to explore the tool. In production you&apos;d upload your own.
        </p>
      </div>

      <div className="mb-5 flex items-start gap-3 rounded-xl border border-warning/50 bg-warning/10 px-4 py-3.5 text-sm">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
        <p className="text-foreground/80">
          <span className="font-semibold text-foreground">This is a demo — the entire scenario is fictional.</span>{" "}
          The project (633 Third Avenue), its documents, and the handwritten timecards are all synthetic.
          Real contractor cost documents (SOVs, payroll, timecards) are confidential, so nothing here is real data.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Sample document set{" "}
              <span className="font-normal text-muted-foreground">· {total} files</span>
            </h2>
            {started && (
              <span className="text-xs font-medium text-accent">
                {done < total ? `Loading ${done}/${total}…` : `Loaded ${total} of ${total}`}
              </span>
            )}
          </div>

          {started ? (
            <>
              <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-accent transition-all duration-200"
                  style={{ width: `${(done / total) * 100}%` }}
                />
              </div>
              <div className="max-h-72 space-y-1.5 overflow-auto pr-1">
                {allDocuments.slice(0, done).map((d) => (
                  <DocRow key={d.id} d={d} />
                ))}
                {uploading && done < total && <DocRow key={allDocuments[done].id} d={allDocuments[done]} active />}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed bg-muted/20 px-6 py-10 text-center">
              <FolderOpen className="h-8 w-8 text-muted-foreground/50" />
              <div className="text-sm font-medium">{total} documents ready to load</div>
              <p className="max-w-sm text-xs text-muted-foreground">
                Nothing to pick here — the button below loads the whole set (schedule of values, budget,
                progress reports, a change order, and the timecards). They&apos;ll appear here as they load.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <button
          disabled
          className="flex cursor-not-allowed items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Lock className="h-4 w-4" /> Upload from Computer
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">Production</span>
        </button>
        <button
          onClick={startUpload}
          disabled={uploading}
          className={cn(
            "flex items-center justify-center gap-2 rounded-md px-6 py-3 text-sm font-semibold shadow-sm",
            uploading
              ? "cursor-not-allowed bg-primary/70 text-primary-foreground"
              : "bg-primary text-primary-foreground hover:bg-primary/90"
          )}
        >
          {uploading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading…
            </>
          ) : (
            <>
              <UploadCloud className="h-4 w-4" /> Upload Sample Documents
            </>
          )}
        </button>
      </div>

    </div>
  );
}

/** One document row in the load list. Rendered only once a file has "loaded"
 * (or is actively loading), so the pre-load screen shows no pickable list. */
function DocRow({ d, active }: { d: (typeof allDocuments)[number]; active?: boolean }) {
  const Icon = d.kind === "image" ? ImageIcon : FileText;
  return (
    <div
      className={cn(
        "animate-doc-in flex items-center gap-3 rounded-md border px-3 py-2",
        active ? "border-border" : "border-success/30 bg-success/5"
      )}
    >
      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-medium">{d.title}</div>
        <div className="text-[11px] text-muted-foreground">{d.category}</div>
      </div>
      {active ? (
        <Loader2 className="h-4 w-4 animate-spin text-accent" />
      ) : (
        <CheckCircle2 className="h-4 w-4 text-success" />
      )}
    </div>
  );
}
