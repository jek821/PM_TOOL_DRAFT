import type { TicketState } from "./store";

const cell = (v: string | number) => {
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Payroll-ready CSV from APPROVED timecards. Splits Reg (<=40) / OT (>40) hours. */
export function buildPayrollCsv(tickets: TicketState[]): string {
  const approved = tickets.filter((t) => t.status === "approved");
  const header = [
    "Worker",
    "Class",
    "Week Ending",
    "Job",
    "Cost Code",
    "Reg Hours",
    "OT Hours",
    "Rate",
  ];
  const rows: (string | number)[][] = [];
  for (const t of approved) {
    for (const r of t.rows) {
      const h = parseFloat(r.hours) || 0;
      const reg = Math.min(h, 40);
      const ot = Math.max(h - 40, 0);
      rows.push([
        r.worker,
        r.className,
        t.header.weekEnding,
        t.header.job,
        t.header.costCode,
        reg,
        ot,
        r.rate.toFixed(2),
      ]);
    }
  }
  return [header, ...rows].map((r) => r.map(cell).join(",")).join("\r\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
