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
import { type ExtractionResult } from "./mock-extractions";
import { progressByCostCode, costCodes as seedCostCodes } from "./seed";
import { projects, DEFAULT_PROJECT_ID, projectById, type ProjectMeta } from "./projects";
import type { ProgressSeries, CostCodeBaseline } from "./types";
import {
  applyExtraction,
  initialTickets,
  isReady,
  type CostField,
  type HeaderData,
  type RowData,
  type TicketState,
  type TicketStatus,
} from "./tickets";

// Re-export the pure ticket API so existing "@/lib/store" imports keep working.
export {
  isWrongProject,
  impossibleRows,
  isReady,
  ticketHours,
  ticketLabor,
  ticketChanges,
} from "./tickets";
export type {
  CostField,
  HeaderData,
  RowData,
  TicketState,
  TicketStatus,
  TicketChange,
} from "./tickets";

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
  projects: ProjectMeta[];
  currentProject: ProjectMeta;
  setProjectId: (id: string) => void;
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
  const [currentProjectId, setCurrentProjectId] = useState(DEFAULT_PROJECT_ID);
  const currentProject = projectById(currentProjectId);
  const setProjectId = useCallback((id: string) => setCurrentProjectId(id), []);

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
    setCurrentProjectId(DEFAULT_PROJECT_ID);
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
        projects,
        currentProject,
        setProjectId,
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
