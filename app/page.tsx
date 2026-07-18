"use client";

import { useState } from "react";
import Link from "next/link";
import { project, costCodes } from "@/lib/seed";
import { allDocuments } from "@/lib/documents";
import { useStore } from "@/lib/store";
import { Card, CardContent } from "@/components/ui/card";
import { usd } from "@/lib/format";
import { cn } from "@/lib/cn";
import {
  Building2,
  CalendarClock,
  Layers,
  FileStack,
  FileSearch,
  Calculator,
  Flag,
  ArrowRight,
  UploadCloud,
  Lock,
  FileText,
  Image as ImageIcon,
  CheckCircle2,
  Loader2,
  CircleDashed,
  RotateCcw,
} from "lucide-react";

type Tone = "accent" | "primary" | "success" | "warning";
const toneChip: Record<Tone, string> = {
  accent: "bg-accent/10 text-accent",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

function Stat({
  icon: Icon,
  label,
  value,
  tone,
}: {
  icon: React.ElementType;
  label: string;
  value: string;
  tone: Tone;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4 p-5">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", toneChip[tone])}>
          <Icon className="h-5 w-5" />
        </div>
        <div>
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="text-xl font-bold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function Overview() {
  const { loaded, loadProject, reset } = useStore();

  if (!loaded) return <UploadScreen onLoad={loadProject} />;

  const details: [string, string][] = [
    ["General Contractor", project.gc],
    ["Owner", project.owner],
    ["Project Manager", project.projectManager],
    ["Superintendent", project.superintendent],
    ["Address", project.address],
    ["Job Number", project.jobNumber],
    ["Start Date", project.startDate],
    ["Reporting As Of", project.asOfDate],
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-8">
      <div className="flex items-start justify-between rounded-xl border bg-gradient-to-br from-primary to-primary/85 p-6 text-white shadow-soft">
        <div>
          <div className="flex items-center gap-2 text-xs font-medium text-white/70">
            <Building2 className="h-4 w-4" /> Project Overview
          </div>
          <h1 className="mt-1.5 text-3xl font-bold tracking-tight">{project.name}</h1>
          <p className="mt-1 text-sm text-white/70">
            {project.location} · {project.gc}
          </p>
        </div>
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-3 py-1.5 text-xs font-medium text-white/80 hover:bg-white/20"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Reset demo
        </button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat icon={CalendarClock} label="Timeline" value={`Wk ${project.asOfWeek} / ${project.durationWeeks}`} tone="accent" />
        <Stat icon={Building2} label="Contract Value" value={usd(project.contractValue)} tone="primary" />
        <Stat icon={Layers} label="Cost Codes" value={String(costCodes.length)} tone="success" />
        <Stat icon={FileStack} label="Documents" value={String(allDocuments.length)} tone="warning" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">Project Details</h2>
            <dl className="space-y-2.5">
              {details.map(([k, v]) => (
                <div key={k} className="flex justify-between gap-4 border-b border-border/60 pb-2 text-sm">
                  <dt className="text-muted-foreground">{k}</dt>
                  <dd className="text-right font-medium">{v}</dd>
                </div>
              ))}
            </dl>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <h2 className="mb-4 text-sm font-semibold">What this tool does</h2>
            <div className="space-y-3">
              {[
                { icon: FileSearch, tag: "Reads your paperwork", note: "It reads the documents and handwritten timecards you upload and pulls out the numbers for you.", tone: "accent" as Tone },
                { icon: CheckCircle2, tag: "You approve the hours", note: "You review the hours it pulled from each timecard, fix anything that looks off, and approve it — then export a payroll-ready spreadsheet.", tone: "warning" as Tone },
                { icon: Calculator, tag: "Keeps the running totals", note: "As work comes in, it tracks the budget, hours, and schedule so you don't have to add it up by hand.", tone: "primary" as Tone },
                { icon: Flag, tag: "Tells you where to look", note: "It flags where the project is slipping over budget or behind schedule — so problems surface early.", tone: "success" as Tone },
              ].map((s) => (
                <div key={s.tag} className="flex gap-3 rounded-lg border bg-muted/20 p-3.5">
                  <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg", toneChip[s.tone])}>
                    <s.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{s.tag}</div>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{s.note}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/timecards"
          className="inline-flex items-center gap-2 rounded-md bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90"
        >
          Review Timecards <ArrowRight className="h-4 w-4" />
        </Link>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:bg-muted"
        >
          Open Dashboard <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}

function UploadScreen({ onLoad }: { onLoad: () => void }) {
  const [uploading, setUploading] = useState(false);
  const [done, setDone] = useState(0);
  const total = allDocuments.length;

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
          To show how the tool works, I prepared a set of{" "}
          <span className="font-medium text-foreground">sample documents</span> for a
          fictional job — a Midtown office fit-out. In real use you&apos;d upload your own;
          here, just press <span className="font-medium text-foreground">Upload</span> to
          bring these in.
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">
              Sample documents{" "}
              <span className="font-normal text-muted-foreground">· {total} files</span>
            </h2>
            {uploading && (
              <span className="text-xs font-medium text-accent">
                Uploading {done}/{total}…
              </span>
            )}
          </div>

          {/* progress bar */}
          <div className="mb-4 h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-accent transition-all duration-200"
              style={{ width: `${(done / total) * 100}%` }}
            />
          </div>

          <div className="max-h-72 space-y-1.5 overflow-auto pr-1">
            {allDocuments.map((d, i) => {
              const uploaded = i < done;
              const active = uploading && i === done;
              const Icon = d.kind === "image" ? ImageIcon : FileText;
              return (
                <div
                  key={d.id}
                  className={cn(
                    "flex items-center gap-3 rounded-md border px-3 py-2 transition-colors",
                    uploaded ? "border-success/30 bg-success/5" : "border-border"
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0 text-muted-foreground" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{d.title}</div>
                    <div className="text-[11px] text-muted-foreground">{d.category}</div>
                  </div>
                  {uploaded ? (
                    <CheckCircle2 className="h-4 w-4 text-success" />
                  ) : active ? (
                    <Loader2 className="h-4 w-4 animate-spin text-accent" />
                  ) : (
                    <CircleDashed className="h-4 w-4 text-muted-foreground/40" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
        <button
          disabled
          className="flex cursor-not-allowed items-center justify-center gap-2 rounded-md border border-dashed bg-muted/30 px-4 py-3 text-sm font-medium text-muted-foreground"
        >
          <Lock className="h-4 w-4" /> Upload from Computer
          <span className="ml-1 rounded-full bg-muted px-2 py-0.5 text-[10px]">
            Production
          </span>
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

      <p className="mt-6 text-center text-xs text-muted-foreground">
        All sample data is synthetic — real GC cost documents (SOVs, payroll, timecards) are
        confidential and not publicly available.
      </p>
    </div>
  );
}
