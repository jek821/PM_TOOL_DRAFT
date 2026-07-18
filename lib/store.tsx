"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckCircle2 } from "lucide-react";
import { reviewTickets, MAX_WEEK_HOURS, type ExtractionResult, type Legibility } from "./mock-extractions";
import { project, progressByCostCode, costCodes as seedCostCodes } from "./seed";
import type { ProgressSeries, CostCodeBaseline } from "./types";

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
function applyExtraction(t: TicketState, ext: ExtractionResult): TicketState {
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

function initialTickets(): TicketState[] {
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

// ---- derived helpers (pure) ----
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

interface Store {
  loaded: boolean;
  loadProject: () => void;
  reset: () => void;
  scanning: boolean;
  tickets: TicketState[];
  scanAll: () => void;
  updateHeader: (id: string, key: keyof HeaderData, val: string) => void;
  updateRow: (id: string, i: number, field: keyof RowData, val: string) => void;
  approve: (id: string) => void;
  reject: (id: string) => void;
  undo: (id: string) => void;
  approveAllReady: () => void;
  progress: Record<string, ProgressSeries>;
  setProgressActual: (code: string, week: number, value: number) => void;
  baseline: CostCodeBaseline[];
  setCostField: (code: string, field: CostField, value: number) => void;
  toast: string | null;
  showToast: (msg: string) => void;
}

const Ctx = createContext<Store | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [loaded, setLoaded] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [tickets, setTickets] = useState<TicketState[]>(initialTickets);
  const ticketsRef = useRef<TicketState[]>(tickets);
  ticketsRef.current = tickets;
  const [progress, setProgressState] = useState<Record<string, ProgressSeries>>(() =>
    JSON.parse(JSON.stringify(progressByCostCode))
  );
  const [baseline, setBaseline] = useState<CostCodeBaseline[]>(() =>
    JSON.parse(JSON.stringify(seedCostCodes))
  );
  const [toast, setToast] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast((cur) => (cur === msg ? null : cur)), 4200);
  }, []);

  const loadProject = useCallback(() => {
    setLoaded(true);
    setToast("Sample project loaded — 4 timecards ready for review");
    window.setTimeout(() => setToast(null), 4200);
  }, []);

  const reset = useCallback(() => {
    setLoaded(false);
    setTickets(initialTickets());
    setProgressState(JSON.parse(JSON.stringify(progressByCostCode)));
    setBaseline(JSON.parse(JSON.stringify(seedCostCodes)));
  }, []);

  const setCostField = useCallback((code: string, field: CostField, value: number) => {
    const v = Math.max(0, Math.round(value));
    setBaseline((b) => b.map((c) => (c.code === code ? { ...c, [field]: v } : c)));
  }, []);

  const setProgressActual = useCallback((code: string, week: number, value: number) => {
    const v = Math.max(0, Math.min(100, Math.round(value)));
    setProgressState((p) =>
      p[code]
        ? { ...p, [code]: { ...p[code], actual: p[code].actual.map((x, i) => (i === week ? v : x)) } }
        : p
    );
  }, []);

  const scanAll = useCallback(() => {
    setScanning(true);
    const toScan = ticketsRef.current.filter(
      (t) => t.status !== "approved" && t.status !== "rejected"
    );
    Promise.all(
      toScan.map(async (t) => {
        try {
          const res = await fetch("/api/extract", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ ticketId: t.id, file: t.file }),
          });
          if (!res.ok) throw new Error(`extract ${res.status}`);
          return { id: t.id, ext: (await res.json()) as ExtractionResult };
        } catch {
          return { id: t.id, ext: null as ExtractionResult | null };
        }
      })
    ).then((list) => {
      setTickets((cur) =>
        cur.map((t) => {
          if (t.status === "approved" || t.status === "rejected") return t;
          const found = list.find((l) => l.id === t.id);
          // Route is unreachable AND we somehow got no result: still mark scanned
          // so the card leaves the queue (values stay as the pre-baked mock).
          if (!found || !found.ext) return { ...t, scanned: true, status: "needsReview", extractSource: "sample" };
          return applyExtraction(t, found.ext);
        })
      );
      setScanning(false);
    });
  }, []);

  const updateHeader = useCallback(
    (id: string, key: keyof HeaderData, val: string) =>
      setTickets((ts) =>
        ts.map((t) => (t.id === id ? { ...t, header: { ...t.header, [key]: val } } : t))
      ),
    []
  );

  const updateRow = useCallback(
    (id: string, i: number, field: keyof RowData, val: string) =>
      setTickets((ts) =>
        ts.map((t) => {
          if (t.id !== id) return t;
          const rows = t.rows.map((r, idx) =>
            idx === i ? { ...r, [field]: field === "rate" ? Number(val) || 0 : val } : r
          );
          return { ...t, rows };
        })
      ),
    []
  );

  const setStatus = (id: string, status: TicketStatus) =>
    setTickets((ts) => ts.map((t) => (t.id === id ? { ...t, status } : t)));

  const approve = useCallback((id: string) => setStatus(id, "approved"), []);
  const reject = useCallback((id: string) => setStatus(id, "rejected"), []);
  const undo = useCallback(
    (id: string) =>
      setTickets((ts) =>
        ts.map((t) =>
          t.id === id ? { ...t, status: t.scanned ? "needsReview" : "unscanned" } : t
        )
      ),
    []
  );

  const approveAllReady = useCallback(
    () =>
      setTickets((ts) =>
        ts.map((t) => (t.status === "needsReview" && isReady(t) ? { ...t, status: "approved" } : t))
      ),
    []
  );

  return (
    <Ctx.Provider
      value={{
        loaded,
        loadProject,
        reset,
        scanning,
        tickets,
        scanAll,
        updateHeader,
        updateRow,
        approve,
        reject,
        undo,
        approveAllReady,
        progress,
        setProgressActual,
        baseline,
        setCostField,
        toast,
        showToast,
      }}
    >
      {children}
      <Toaster />
    </Ctx.Provider>
  );
}

export function useStore() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useStore must be used within AppProvider");
  return c;
}

function Toaster() {
  const { toast } = useStore();
  if (!toast) return null;
  return (
    <div className="fixed right-6 top-20 z-50 max-w-sm">
      <div className="flex items-start gap-2.5 rounded-lg border border-white/10 bg-primary px-4 py-3 text-sm font-medium text-primary-foreground shadow-lg">
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-white/90" />
        <span>{toast}</span>
      </div>
    </div>
  );
}
