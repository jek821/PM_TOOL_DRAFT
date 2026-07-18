"use client";

import { useState } from "react";
import Link from "next/link";
import {
  useStore,
  isWrongProject,
  impossibleRows,
  isReady,
  ticketHours,
  ticketLabor,
  type TicketState,
  type HeaderData,
} from "@/lib/store";
import { MAX_WEEK_HOURS, HIGH_WEEK_HOURS } from "@/lib/mock-extractions";
import { buildPayrollCsv, downloadCsv } from "@/lib/csv";
import { usd } from "@/lib/format";
import { cn } from "@/lib/cn";
import { ZoomableImage } from "@/components/ui/zoomable-image";
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ScanEye,
  ScanLine,
  CircleDot,
  Loader2,
  Download,
  FileText,
} from "lucide-react";

const HEADER_FIELDS: [keyof HeaderData, string][] = [
  ["weekEnding", "Week Ending"],
  ["job", "Job #"],
  ["project", "Project"],
  ["costCode", "Cost Code"],
  ["phase", "Phase"],
  ["contractor", "Contractor"],
];

export default function TimecardsPage() {
  const {
    loaded,
    tickets,
    scanning,
    scanAll,
    updateHeader,
    updateRow,
    approve,
    reject,
  } = useStore();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  if (!loaded) return <EmptyState />;

  const queue = tickets.filter((t) => t.status === "unscanned" || t.status === "needsReview");
  const approved = tickets.filter((t) => t.status === "approved");
  const rejected = tickets.filter((t) => t.status === "rejected");
  const anyUnscanned = tickets.some((t) => t.status === "unscanned");

  const selected = queue.find((t) => t.id === selectedId) ?? queue[0] ?? null;

  const exportCsv = () =>
    downloadCsv("payroll_export_633-third-ave.csv", buildPayrollCsv(tickets));

  return (
    <div className="flex h-[calc(100vh-3.75rem)]">
      {/* Queue */}
      <div className="flex w-72 shrink-0 flex-col border-r bg-card">
        <div className="border-b px-4 py-4">
          <h1 className="text-base font-semibold">Timecard Review</h1>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <ScanEye className="h-3.5 w-3.5" /> AI vision extraction · confidence-scored
          </p>

          {/* Counts */}
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Count n={queue.length} label="To review" tone="warning" />
            <Count n={approved.length} label="Approved" tone="success" />
            <Count n={rejected.length} label="Rejected" tone="danger" />
          </div>

          <button
            onClick={scanAll}
            disabled={scanning || !anyUnscanned}
            className={cn(
              "mt-4 flex w-full items-center justify-center gap-2 rounded-md px-3 py-2.5 text-sm font-semibold shadow-sm",
              scanning || !anyUnscanned
                ? "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
                : "bg-primary text-primary-foreground hover:bg-primary/90"
            )}
          >
            {scanning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Scanning…
              </>
            ) : (
              <>
                <ScanLine className="h-4 w-4" /> Scan all unapproved
              </>
            )}
          </button>

        </div>

        <div className="flex-1 overflow-auto p-3">
          <div className="px-1 pb-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Queue
          </div>
          {queue.length === 0 && (
            <p className="px-1 pt-4 text-center text-xs text-muted-foreground">
              Nothing left to review.
            </p>
          )}
          <div className="space-y-1.5">
            {queue.map((t) => {
              const active = selected?.id === t.id;
              const scanned = t.scanned;
              const wrong = scanned && isWrongProject(t);
              const impossible = scanned && impossibleRows(t).length > 0;
              const lowConf = scanned && (t.lowConfRows.length > 0 || t.lowConfHeader.length > 0);
              const poorScan = scanned && (t.legibility === "poor" || t.legibility === "marginal");
              const danger = wrong || impossible;
              const warn = !danger && (lowConf || poorScan);
              const Icon = !scanned ? CircleDot : danger || warn ? AlertTriangle : CheckCircle2;
              const color = !scanned
                ? "text-muted-foreground"
                : danger
                ? "text-danger"
                : warn
                ? "text-warning"
                : "text-success";
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md border px-3 py-2.5 text-left transition-colors",
                    active
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border hover:bg-muted"
                  )}
                >
                  <Icon className={cn("h-4 w-4 shrink-0", color)} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-semibold">No. {t.ticketNo}</span>
                    <span className="block truncate text-xs text-muted-foreground">
                      {scanned ? t.header.project : "Not scanned yet"}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

      </div>

      {/* Review panel */}
      <div className="min-w-0 flex-1 overflow-auto bg-muted/40">
        {!selected ? (
          <AllDone approvedCount={approved.length} onExport={exportCsv} />
        ) : !selected.scanned ? (
          <Unscanned ticket={selected} />
        ) : (
          <ReviewPanel
            ticket={selected}
            onHeader={updateHeader}
            onRow={updateRow}
            onApprove={() => approve(selected.id)}
            onReject={() => reject(selected.id)}
          />
        )}
      </div>
    </div>
  );
}

function Count({ n, label, tone }: { n: number; label: string; tone: "warning" | "success" | "danger" }) {
  const toneCls =
    tone === "warning" ? "text-warning" : tone === "success" ? "text-success" : "text-danger";
  return (
    <div className="rounded-md border bg-muted/30 py-2">
      <div className={cn("text-lg font-bold leading-none", n > 0 ? toneCls : "text-muted-foreground/50")}>
        {n}
      </div>
      <div className="mt-1 text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}

function SourceBadge({ source }: { source?: TicketState["extractSource"] }) {
  if (!source) return null;
  const map = {
    live: {
      label: "AI-read",
      cls: "border-accent/30 bg-accent/10 text-accent",
      Icon: ScanEye,
      title: "Extracted live by Claude vision from the ticket image.",
    },
    cached: {
      label: "cached",
      cls: "border-warning/40 bg-warning/10 text-warning",
      Icon: CircleDot,
      title: "Served from the last successful live extraction — live vision was unavailable.",
    },
    sample: {
      label: "sample",
      cls: "border-warning/40 bg-warning/10 text-warning",
      Icon: CircleDot,
      title: "Fallback sample values — live vision was unavailable.",
    },
  } as const;
  const { label, cls, Icon, title } = map[source];
  return (
    <span
      title={title}
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium",
        cls
      )}
    >
      <Icon className="h-3.5 w-3.5" /> {label}
    </span>
  );
}

function Unscanned({ ticket }: { ticket: TicketState }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8">
      <img
        src={ticket.file}
        alt={`Ticket ${ticket.ticketNo}`}
        className="max-h-[62vh] rounded-lg border bg-white shadow-md"
      />
      <p className="flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm text-muted-foreground shadow-sm">
        <ScanLine className="h-4 w-4" /> Not yet scanned — run “Scan all unapproved” to extract.
      </p>
    </div>
  );
}

type Severity = "danger" | "warning" | "ok";

function severityOf(t: TicketState): { level: Severity; title: string; body: string } {
  if (isWrongProject(t))
    return {
      level: "danger",
      title: "Possible wrong project",
      body: `This ticket lists Job ${t.header.job} (${t.header.project}), which does not match this project. Confirm against the original — if it belongs to another job, reject it so it isn't counted.`,
    };
  const bad = impossibleRows(t);
  if (bad.length > 0)
    return {
      level: "danger",
      title: "Unusual value — please verify",
      body: `${t.rows[bad[0]].worker}'s hours are well above a normal work week. Check the original ticket and correct the value if needed before approving.`,
    };
  const poorScan = t.legibility === "poor" || t.legibility === "marginal";
  const lowConf = t.lowConfRows.length > 0 || t.lowConfHeader.length > 0;
  if (poorScan)
    return {
      level: "warning",
      title: "Low-quality scan — please double-check",
      body: "This card scanned poorly — creases, smudges, or low contrast may have caused misreads. Compare the values against the original ticket before approving; any highlighted fields were the hardest to read.",
    };
  if (lowConf)
    return {
      level: "warning",
      title: "Low-confidence fields",
      body: "Some values were hard to read on the scan — the highlighted fields are best estimates. Please confirm them against the original before approving.",
    };
  return {
    level: "ok",
    title: "All fields read at high confidence",
    body: "Nothing flagged. Review and approve to count this ticket toward the project.",
  };
}

function ReviewPanel({
  ticket: t,
  onHeader,
  onRow,
  onApprove,
  onReject,
}: {
  ticket: TicketState;
  onHeader: (id: string, key: keyof HeaderData, val: string) => void;
  onRow: (id: string, i: number, field: "className" | "worker" | "hours" | "rate", val: string) => void;
  onApprove: () => void;
  onReject: () => void;
}) {
  const wrong = isWrongProject(t);
  const badRows = impossibleRows(t);
  const ready = isReady(t);
  const sev = severityOf(t);

  const alertStyle =
    sev.level === "danger"
      ? "border-l-danger bg-danger/5"
      : sev.level === "warning"
      ? "border-l-warning bg-warning/5"
      : "border-l-success bg-success/5";
  const AlertIcon = sev.level === "ok" ? CheckCircle2 : AlertTriangle;
  const alertIconColor =
    sev.level === "danger" ? "text-danger" : sev.level === "warning" ? "text-warning" : "text-success";

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* Ticket header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Ticket No. {t.ticketNo}</h2>
          <p className="text-sm text-muted-foreground">Week ending {t.header.weekEnding}</p>
        </div>
        <SourceBadge source={t.extractSource} />
      </div>

      {/* Alert */}
      <div className={cn("mb-5 flex items-start gap-3 rounded-md border border-l-4 bg-card p-4", alertStyle)}>
        <AlertIcon className={cn("mt-0.5 h-5 w-5 shrink-0", alertIconColor)} />
        <div>
          <div className={cn("text-sm font-semibold", alertIconColor)}>{sev.title}</div>
          <p className="mt-0.5 text-sm text-muted-foreground">{sev.body}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[380px_1fr]">
        {/* Original — reference */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Original ticket
          </div>
          <div className="overflow-hidden rounded-lg border bg-white shadow-sm">
            <ZoomableImage
              src={t.file}
              alt={`Ticket ${t.ticketNo}`}
              className="max-h-[70vh] w-full object-contain"
            />
          </div>
        </div>

        {/* Extracted / editable */}
        <div className="space-y-5">
          <div>
            <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Extracted data — all fields editable
            </div>
            <div className="grid grid-cols-2 gap-3 rounded-lg border bg-card p-4 shadow-sm">
              {HEADER_FIELDS.map(([key, label]) => {
                const danger = wrong && (key === "job" || key === "project");
                const low = t.lowConfHeader.includes(key);
                return (
                  <label key={key} className="text-xs">
                    <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                      {label}
                    </span>
                    <input
                      value={t.header[key]}
                      onChange={(e) => onHeader(t.id, key, e.target.value)}
                      className={cn(
                        "mt-1 h-9 w-full rounded-md border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40",
                        danger
                          ? "border-danger bg-danger/10 font-medium text-danger"
                          : low
                          ? "border-warning/70 bg-warning/10"
                          : "border-border"
                      )}
                    />
                  </label>
                );
              })}
              <label className="col-span-2 text-xs">
                <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                  Description
                </span>
                <input
                  value={t.header.description}
                  onChange={(e) => onHeader(t.id, "description", e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                />
              </label>
            </div>
          </div>

          {/* Labor table */}
          <div className="overflow-hidden rounded-lg border bg-card shadow-sm">
            <div className="border-b bg-muted/40 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Labor
            </div>
            <table className="w-full">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-3 py-2 text-left font-medium">Class</th>
                  <th className="px-3 py-2 text-left font-medium">Worker</th>
                  <th className="px-3 py-2 text-right font-medium">Hours</th>
                  <th className="px-3 py-2 text-right font-medium">Rate</th>
                  <th className="px-3 py-2 text-right font-medium">Extension</th>
                </tr>
              </thead>
              <tbody>
                {t.rows.map((r, i) => {
                  const h = parseFloat(r.hours) || 0;
                  const impossible = h > MAX_WEEK_HOURS;
                  const high = h > HIGH_WEEK_HOURS && !impossible;
                  const low = t.lowConfRows.includes(i);
                  return (
                    <tr
                      key={i}
                      className={cn(
                        "border-b last:border-0",
                        impossible ? "bg-danger/5" : low ? "bg-warning/5" : ""
                      )}
                    >
                      <td className="px-2 py-1.5">
                        <input
                          value={r.className}
                          onChange={(e) => onRow(t.id, i, "className", e.target.value)}
                          className="h-9 w-full rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          value={r.worker}
                          onChange={(e) => onRow(t.id, i, "worker", e.target.value)}
                          className="h-9 w-full rounded-md border border-border px-2 text-sm outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={r.hours}
                          onChange={(e) => onRow(t.id, i, "hours", e.target.value)}
                          className={cn(
                            "h-9 w-20 rounded-md border px-2 text-right text-sm outline-none focus:ring-2",
                            impossible
                              ? "border-danger bg-danger/15 font-bold text-danger focus:ring-danger/40"
                              : high
                              ? "border-warning bg-warning/15 font-medium focus:ring-warning/40"
                              : low
                              ? "border-warning/70 bg-warning/10 focus:ring-warning/40"
                              : "border-border focus:ring-accent/40"
                          )}
                        />
                      </td>
                      <td className="px-2 py-1.5">
                        <input
                          type="number"
                          value={r.rate}
                          onChange={(e) => onRow(t.id, i, "rate", e.target.value)}
                          className="h-9 w-20 rounded-md border border-border px-2 text-right text-sm outline-none focus:ring-2 focus:ring-accent/40"
                        />
                      </td>
                      <td className="px-3 py-2 text-right text-sm tabular-nums">{usd(h * r.rate)}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr className="bg-muted/50 text-sm font-semibold">
                  <td className="px-3 py-2.5" colSpan={2}>
                    Total
                  </td>
                  <td className="px-2 py-2.5 text-right tabular-nums">{ticketHours(t)} hrs</td>
                  <td />
                  <td className="px-3 py-2.5 text-right tabular-nums">{usd(ticketLabor(t))}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Action bar */}
          <div className="flex items-center gap-3 rounded-lg border bg-card p-3 shadow-sm">
            <button
              onClick={onApprove}
              disabled={!ready}
              className={cn(
                "inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold shadow-sm",
                ready
                  ? "bg-success text-white hover:bg-success/90"
                  : "cursor-not-allowed bg-muted text-muted-foreground shadow-none"
              )}
            >
              <CheckCircle2 className="h-4 w-4" /> Approve
            </button>
            <button
              onClick={onReject}
              className="inline-flex items-center gap-2 rounded-md border border-danger/40 px-5 py-2.5 text-sm font-semibold text-danger hover:bg-danger/10"
            >
              <XCircle className="h-4 w-4" /> Reject
            </button>
            {!ready && !wrong && badRows.length > 0 && (
              <span className="text-xs text-muted-foreground">
                Resolve the flagged value to approve.
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function AllDone({ approvedCount, onExport }: { approvedCount: number; onExport: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-success/10">
        <CheckCircle2 className="h-8 w-8 text-success" />
      </div>
      <div>
        <div className="text-lg font-semibold">All timecards reviewed</div>
        <p className="mt-1 max-w-sm text-sm text-muted-foreground">
          {approvedCount} approved and ready to export. Approved cards now live in the
          Documents store.
        </p>
      </div>
      {approvedCount > 0 && (
        <button
          onClick={onExport}
          className="inline-flex items-center gap-2 rounded-md bg-accent px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent/90"
        >
          <Download className="h-4 w-4" /> Export payroll CSV
        </button>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col items-center justify-center gap-3 text-center">
      <FileText className="h-10 w-10 text-muted-foreground" />
      <div className="text-sm font-medium">No project loaded</div>
      <p className="max-w-xs text-xs text-muted-foreground">
        Load the sample project from the Overview to review its timecards.
      </p>
      <Link
        href="/"
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Go to Overview
      </Link>
    </div>
  );
}
