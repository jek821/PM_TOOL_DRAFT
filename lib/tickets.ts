// Pure ticket domain: types, the deterministic validators, and the shaping
// helpers. Kept out of the "use client" store module so (a) these can be unit
// tested without pulling in React/JSX, and (b) the store file only exports
// React components/hooks (avoids the Fast Refresh "exports incompatible" churn).

import { reviewTickets, MAX_WEEK_HOURS, type ExtractionResult, type Legibility } from "./mock-extractions";
import { project } from "./seed";

export type CostField = "scheduledValue" | "plannedHours" | "laborCost" | "materialCost";

export type TicketStatus = "unscanned" | "needsReview" | "approved" | "rejected";

export interface HeaderData {
  weekEnding: string;
  contractor: string;
  project: string;
  job: string;
  costCode: string;
  phase: string;
  description: string;
}

export interface RowData {
  className: string;
  worker: string;
  hours: string;
  rate: number;
}

export interface TicketState {
  id: string;
  file: string;
  ticketNo: string;
  scanned: boolean;
  status: TicketStatus;
  header: HeaderData;
  rows: RowData[];
  /** Snapshot of the AI's original extraction, for diffing PM edits. */
  original: { header: HeaderData; rows: RowData[] };
  lowConfHeader: string[];
  lowConfRows: number[];
  /** Which tier produced the current extraction: live Claude, cached, or sample. */
  extractSource?: ExtractionResult["source"];
  /** Overall scan quality from Stage 1 — marginal/poor flags the card for review. */
  legibility?: Legibility;
}

/** Map a Stage-1 extraction result onto a ticket (live or sample). */
export function applyExtraction(t: TicketState, ext: ExtractionResult): TicketState {
  const lowConfHeader = Object.entries(ext.header)
    .filter(([, f]) => f.confidence === "low")
    .map(([k]) => k);
  const lowConfRows = ext.rows
    .map((r, i) => (r.hours.confidence === "low" ? i : -1))
    .filter((i) => i >= 0);
  const header: HeaderData = {
    weekEnding: ext.header.weekEnding.value,
    contractor: ext.header.contractor.value,
    project: ext.header.project.value,
    job: ext.header.job.value,
    costCode: ext.header.costCode.value,
    phase: ext.header.phase.value,
    description: ext.header.description.value,
  };
  const rows: RowData[] = ext.rows.map((r) => ({
    className: r.className,
    worker: r.worker,
    hours: r.hours.value,
    rate: r.rate,
  }));
  return {
    ...t,
    scanned: true,
    status: "needsReview",
    header,
    rows,
    original: { header: { ...header }, rows: rows.map((r) => ({ ...r })) },
    lowConfHeader,
    lowConfRows,
    extractSource: ext.source,
    legibility: ext.legibility,
  };
}

export function initialTickets(): TicketState[] {
  return reviewTickets.map((t) => {
    const lowConfHeader = Object.entries(t.header)
      .filter(([, f]) => f.confidence === "low")
      .map(([k]) => k);
    const lowConfRows = t.rows
      .map((r, i) => (r.hours.confidence === "low" ? i : -1))
      .filter((i) => i >= 0);
    const header: HeaderData = {
      weekEnding: t.header.weekEnding.value,
      contractor: t.header.contractor.value,
      project: t.header.project.value,
      job: t.header.job.value,
      costCode: t.header.costCode.value,
      phase: t.header.phase.value,
      description: t.header.description.value,
    };
    const rows: RowData[] = t.rows.map((r) => ({
      className: r.className,
      worker: r.worker,
      hours: r.hours.value,
      rate: r.rate,
    }));
    return {
      id: t.id,
      file: t.file,
      ticketNo: t.ticketNo,
      scanned: false,
      status: "unscanned" as TicketStatus,
      header,
      rows,
      original: { header: { ...header }, rows: rows.map((r) => ({ ...r })) },
      lowConfHeader,
      lowConfRows,
    };
  });
}

// ---- derived validators (pure) ----
export const isWrongProject = (t: TicketState) => t.header.job !== project.jobNumber;
export const impossibleRows = (t: TicketState) =>
  t.rows.map((r, i) => ((parseFloat(r.hours) || 0) > MAX_WEEK_HOURS ? i : -1)).filter((i) => i >= 0);
export const isReady = (t: TicketState) =>
  t.scanned && !isWrongProject(t) && impossibleRows(t).length === 0;
export const ticketHours = (t: TicketState) =>
  t.rows.reduce((s, r) => s + (parseFloat(r.hours) || 0), 0);
export const ticketLabor = (t: TicketState) =>
  t.rows.reduce((s, r) => s + (parseFloat(r.hours) || 0) * r.rate, 0);

export interface TicketChange {
  label: string;
  from: string;
  to: string;
}

const HEADER_LABELS: Record<keyof HeaderData, string> = {
  weekEnding: "Week Ending",
  contractor: "Contractor",
  project: "Project",
  job: "Job #",
  costCode: "Cost Code",
  phase: "Phase",
  description: "Description",
};

/** What the PM changed vs. the AI's original extraction. */
export function ticketChanges(t: TicketState): TicketChange[] {
  const out: TicketChange[] = [];
  const o = t.original;
  (Object.keys(HEADER_LABELS) as (keyof HeaderData)[]).forEach((k) => {
    if (String(t.header[k]) !== String(o.header[k]))
      out.push({ label: HEADER_LABELS[k], from: String(o.header[k]), to: String(t.header[k]) });
  });
  t.rows.forEach((r, i) => {
    const or = o.rows[i];
    if (!or) return;
    const who = r.worker || `Row ${i + 1}`;
    if (r.hours !== or.hours) out.push({ label: `${who} — hours`, from: String(or.hours), to: String(r.hours) });
    if (String(r.rate) !== String(or.rate)) out.push({ label: `${who} — rate`, from: String(or.rate), to: String(r.rate) });
    if (r.worker !== or.worker) out.push({ label: `Row ${i + 1} — worker`, from: or.worker, to: r.worker });
    if (r.className !== or.className) out.push({ label: `Row ${i + 1} — class`, from: or.className, to: r.className });
  });
  return out;
}
