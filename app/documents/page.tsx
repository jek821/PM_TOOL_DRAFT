"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { documents as typedDocs } from "@/lib/documents";
import { useStore, ticketChanges, type TicketChange } from "@/lib/store";
import { costCodes, project, weekEndings } from "@/lib/seed";
import { usd } from "@/lib/format";
import { cn } from "@/lib/cn";
import { FileDown, FileText, Image as ImageIcon, FolderOpen, PencilLine } from "lucide-react";
import { ZoomableImage } from "@/components/ui/zoomable-image";

interface Item {
  id: string;
  title: string;
  subtitle: string;
  kind: "html" | "image";
  file: string;
  section: string;
  changes?: TicketChange[];
}

const SECTIONS = [
  "Baselines",
  "Progress Reports",
  "Change Orders",
  "Timecards · To Review",
  "Timecards · Approved",
  "Timecards · Rejected",
];

export default function DocumentsPage() {
  const { loaded, tickets } = useStore();
  const [selectedId, setSelectedId] = useState<string>("sov");

  if (!loaded) return <EmptyState />;

  const docItems: Item[] = typedDocs.map((d) => ({
    id: d.id,
    title: d.title,
    subtitle: `${d.code} · ${d.date}`,
    kind: "html",
    file: d.file,
    section:
      d.category === "Baseline"
        ? "Baselines"
        : d.category === "Progress Report"
        ? "Progress Reports"
        : "Change Orders",
  }));

  const tcItems: Item[] = tickets.map((t) => {
    const changes = ticketChanges(t);
    const statusLabel =
      t.status === "approved" ? "Approved" : t.status === "rejected" ? "Rejected" : "To review";
    return {
      id: t.id,
      title: `Timecard No. ${t.ticketNo}`,
      subtitle: `${t.header.weekEnding} · ${statusLabel}${changes.length > 0 ? " · edited" : ""}`,
      kind: "image" as const,
      file: t.file,
      section:
        t.status === "approved"
          ? "Timecards · Approved"
          : t.status === "rejected"
          ? "Timecards · Rejected"
          : "Timecards · To Review",
      changes,
    };
  });

  const items = [...docItems, ...tcItems];
  const selected = items.find((i) => i.id === selectedId) ?? items[0];

  return (
    <div className="flex h-[calc(100vh-3.75rem)]">
      {/* List */}
      <div className="w-80 shrink-0 overflow-auto border-r bg-card">
        <div className="border-b px-4 py-3">
          <h1 className="text-sm font-semibold">Project Documents</h1>
          <p className="text-xs text-muted-foreground">
            {items.length} files · the project&apos;s document store
          </p>
        </div>
        <div className="p-3 space-y-4">
          {SECTIONS.map((section) => {
            const secItems = items.filter((i) => i.section === section);
            if (secItems.length === 0) return null;
            return (
              <div key={section}>
                <div className="px-1 pb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                  {section}
                </div>
                <div className="space-y-1">
                  {secItems.map((d) => {
                    const active = selected.id === d.id;
                    const Icon = d.kind === "image" ? ImageIcon : FileText;
                    return (
                      <button
                        key={d.id}
                        onClick={() => setSelectedId(d.id)}
                        className={cn(
                          "flex w-full items-start gap-2.5 rounded-md px-2.5 py-2 text-left transition-colors",
                          active ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                        )}
                      >
                        <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "" : "text-muted-foreground")} />
                        <span className="min-w-0">
                          <span className="block truncate text-sm font-medium">{d.title}</span>
                          <span className={cn("block truncate text-xs", active ? "text-primary-foreground/70" : "text-muted-foreground")}>
                            {d.subtitle}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Viewer */}
      <div className="flex min-w-0 flex-1 flex-col bg-muted/40">
        <div className="flex items-center justify-between gap-4 border-b bg-card px-4 py-2.5">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium">{selected.title}</div>
            <div className="truncate text-xs text-muted-foreground">{selected.section}</div>
          </div>
          <a
            href={`/documents/pdf/${selected.id}.pdf`}
            download
            className="inline-flex shrink-0 items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary/90"
          >
            <FileDown className="h-4 w-4" />
            Export as PDF
          </a>
        </div>
        <div className="flex-1 overflow-auto p-4">
          {selected.kind === "html" ? (
            selected.id.startsWith("pr") ? (
              <EditableProgressReport week={Number(selected.id.slice(2)) - 1} />
            ) : selected.id === "sov" ? (
              <EditableSOV />
            ) : selected.id === "budget" ? (
              <EditableBudget />
            ) : (
              <iframe
                key={selected.id}
                src={selected.file}
                title={selected.title}
                className="h-full w-full rounded-md border bg-white"
              />
            )
          ) : (
            <div className="mx-auto max-w-2xl space-y-3">
              {selected.changes && selected.changes.length > 0 && (
                <div className="rounded-md border border-accent/30 bg-accent/5 p-3">
                  <div className="mb-1.5 flex items-center gap-1.5 text-sm font-semibold text-accent">
                    <PencilLine className="h-4 w-4" /> Edited during review
                  </div>
                  <ul className="space-y-1 text-xs text-muted-foreground">
                    {selected.changes.map((c, i) => (
                      <li key={i}>
                        <span className="font-medium text-foreground">{c.label}:</span>{" "}
                        <span className="text-danger line-through">{c.from}</span>{" "}
                        &rarr; <span className="font-medium text-success">{c.to}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              <ZoomableImage
                src={selected.file}
                alt={selected.title}
                className="rounded-md border bg-white shadow-sm"
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MetaRow({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/50 pb-1">
      <dt className="text-muted-foreground">{k}</dt>
      <dd className="text-right font-medium">{v}</dd>
    </div>
  );
}

/** Controlled numeric input with its own draft string — fixes the sticky
 * leading-zero on native number inputs. Selects on focus so typing replaces,
 * strips leading zeros as you type, and commits the parsed number live. */
function NumberCell({
  value,
  onCommit,
  className,
}: {
  value: number;
  onCommit: (n: number) => void;
  className?: string;
}) {
  const [draft, setDraft] = useState(String(value));
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (!editing) setDraft(String(value)); // sync when the store value changes (reset/clamp)
  }, [value, editing]);
  return (
    <input
      type="text"
      inputMode="numeric"
      value={draft}
      onFocus={(e) => {
        setEditing(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setEditing(false);
        setDraft(String(value));
      }}
      onChange={(e) => {
        const raw = e.target.value.replace(/[^\d]/g, "").replace(/^0+(?=\d)/, "");
        setDraft(raw);
        onCommit(raw === "" ? 0 : parseInt(raw, 10));
      }}
      className={className}
    />
  );
}

function EditableProgressReport({ week }: { week: number }) {
  const { progress, setProgressActual } = useStore();
  const weekEnding = weekEndings[String(week + 1)] ?? "";
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Weekly Progress Report</h2>
            <p className="text-xs text-muted-foreground">Physical % complete by cost code</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">
            Editable
          </span>
        </div>

        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <MetaRow k="Project" v={project.name} />
          <MetaRow k="Report No. / Week Ending" v={`PR-0${week + 1} / ${weekEnding}`} />
          <MetaRow k="Prepared By" v={`${project.superintendent}, Superintendent`} />
          <MetaRow k="Job #" v={project.jobNumber} />
        </dl>

        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 text-left font-medium">Cost Code</th>
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-right font-medium">% Complete</th>
              <th className="py-2 text-right font-medium">Planned</th>
            </tr>
          </thead>
          <tbody>
            {costCodes.map((c) => {
              const prog = progress[c.code];
              const actual = prog ? prog.actual[week] : 0;
              const planned = prog ? prog.planned[week] : 0;
              return (
                <tr key={c.code} className="border-b last:border-0">
                  <td className="py-1.5 font-mono text-xs">{c.code}</td>
                  <td className="py-1.5">{c.description}</td>
                  <td className="py-1.5 text-right">
                    <span className="inline-flex items-center gap-1">
                      <NumberCell
                        value={actual}
                        onCommit={(n) => setProgressActual(c.code, week, n)}
                        className="w-16 rounded border border-border px-2 py-1 text-right text-sm tabular-nums outline-none focus:ring-2 focus:ring-accent/40"
                      />
                      <span className="text-muted-foreground">%</span>
                    </span>
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">{planned}%</td>
                </tr>
              );
            })}
          </tbody>
        </table>

        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PencilLine className="h-3.5 w-3.5" /> Edit any % — the dashboard analysis updates live, and it
          resets on refresh.
        </p>
      </div>
    </div>
  );
}

const editNumClass =
  "rounded border border-border px-2 py-1 text-right text-sm tabular-nums outline-none focus:ring-2 focus:ring-accent/40";

function EditableSOV() {
  const { baseline, setCostField } = useStore();
  const total = baseline.reduce((s, c) => s + c.scheduledValue, 0);
  return (
    <div className="mx-auto max-w-3xl">
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Schedule of Values</h2>
            <p className="text-xs text-muted-foreground">Contract value by cost code</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">Editable</span>
        </div>
        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <MetaRow k="Project" v={project.name} />
          <MetaRow k="Contractor" v={project.gc} />
          <MetaRow k="Owner" v={project.owner} />
          <MetaRow k="Job #" v={project.jobNumber} />
        </dl>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 text-left font-medium">Cost Code</th>
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-right font-medium">Scheduled Value</th>
            </tr>
          </thead>
          <tbody>
            {baseline.map((c) => (
              <tr key={c.code} className="border-b last:border-0">
                <td className="py-1.5 font-mono text-xs">{c.code}</td>
                <td className="py-1.5">{c.description}</td>
                <td className="py-1.5 text-right">
                  <span className="inline-flex items-center gap-1">
                    <span className="text-muted-foreground">$</span>
                    <NumberCell
                      value={c.scheduledValue}
                      onCommit={(n) => setCostField(c.code, "scheduledValue", n)}
                      className={cn(editNumClass, "w-28")}
                    />
                  </span>
                </td>
              </tr>
            ))}
            <tr className="font-semibold">
              <td className="py-2" colSpan={2}>Total Contract</td>
              <td className="py-2 text-right tabular-nums">{usd(total)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PencilLine className="h-3.5 w-3.5" /> Edit any value — the dashboard analysis updates live, and it resets on refresh.
        </p>
      </div>
    </div>
  );
}

function EditableBudget() {
  const { baseline, setCostField } = useStore();
  const totHrs = baseline.reduce((s, c) => s + c.plannedHours, 0);
  const totLabor = baseline.reduce((s, c) => s + c.laborCost, 0);
  const totMat = baseline.reduce((s, c) => s + c.materialCost, 0);
  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-xl border bg-card p-6 shadow-card">
        <div className="mb-4 flex items-start justify-between">
          <div>
            <h2 className="text-lg font-bold text-primary">Job Cost Budget</h2>
            <p className="text-xs text-muted-foreground">Planned hours &amp; cost by cost code</p>
          </div>
          <span className="rounded-full bg-accent/10 px-2.5 py-1 text-[11px] font-medium text-accent">Editable</span>
        </div>
        <dl className="mb-5 grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
          <MetaRow k="Project" v={project.name} />
          <MetaRow k="General Contractor" v={project.gc} />
        </dl>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
              <th className="py-2 text-left font-medium">Cost Code</th>
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-right font-medium">Planned Hrs</th>
              <th className="py-2 text-right font-medium">$/Hr</th>
              <th className="py-2 text-right font-medium">Labor $</th>
              <th className="py-2 text-right font-medium">Material $</th>
              <th className="py-2 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody>
            {baseline.map((c) => {
              const rate = c.plannedHours > 0 ? c.laborCost / c.plannedHours : 0;
              return (
                <tr key={c.code} className="border-b last:border-0">
                  <td className="py-1.5 font-mono text-xs">{c.code}</td>
                  <td className="py-1.5">{c.description}</td>
                  <td className="py-1.5 text-right">
                    <NumberCell value={c.plannedHours}
                      onCommit={(n) => setCostField(c.code, "plannedHours", n)}
                      className={cn(editNumClass, "w-16")} />
                  </td>
                  <td className="py-1.5 text-right tabular-nums text-muted-foreground">${rate.toFixed(0)}</td>
                  <td className="py-1.5 text-right">
                    <NumberCell value={c.laborCost}
                      onCommit={(n) => setCostField(c.code, "laborCost", n)}
                      className={cn(editNumClass, "w-24")} />
                  </td>
                  <td className="py-1.5 text-right">
                    <NumberCell value={c.materialCost}
                      onCommit={(n) => setCostField(c.code, "materialCost", n)}
                      className={cn(editNumClass, "w-24")} />
                  </td>
                  <td className="py-1.5 text-right tabular-nums">{usd(c.laborCost + c.materialCost)}</td>
                </tr>
              );
            })}
            <tr className="font-semibold">
              <td className="py-2" colSpan={2}>Total</td>
              <td className="py-2 text-right tabular-nums">{totHrs.toLocaleString()}</td>
              <td />
              <td className="py-2 text-right tabular-nums">{usd(totLabor)}</td>
              <td className="py-2 text-right tabular-nums">{usd(totMat)}</td>
              <td className="py-2 text-right tabular-nums">{usd(totLabor + totMat)}</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground">
          <PencilLine className="h-3.5 w-3.5" /> Edit any value — planned hours and labor $ feed the
          productivity and budget checks. Resets on refresh.
        </p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col items-center justify-center gap-3 text-center">
      <FolderOpen className="h-10 w-10 text-muted-foreground" />
      <div className="text-sm font-medium">No project loaded</div>
      <p className="max-w-xs text-xs text-muted-foreground">
        Load the sample project from the Overview to populate the document store.
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
