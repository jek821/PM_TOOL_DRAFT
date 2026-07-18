// Manifest of the project's "uploaded" documents, served from /public/documents.

export type DocCategory =
  | "Baseline"
  | "Progress Report"
  | "Change Order"
  | "Labor Ticket";

export interface DocMeta {
  id: string;
  title: string;
  code: string; // short tag, e.g. "SOV", "PR-01", "No. 3041"
  category: DocCategory;
  kind: "html" | "image";
  file: string; // path under /public
  date: string;
  description: string;
}

export const documents: DocMeta[] = [
  {
    id: "sov",
    title: "Schedule of Values",
    code: "SOV",
    category: "Baseline",
    kind: "html",
    file: "/documents/schedule-of-values.html",
    date: "2026-06-26",
    description: "Original contract baseline — $1.8M across 10 cost codes (dollars only).",
  },
  {
    id: "budget",
    title: "Job Cost Budget",
    code: "Budget",
    category: "Baseline",
    kind: "html",
    file: "/documents/job-cost-budget.html",
    date: "2026-06-26",
    description: "Internal cost-loaded budget — planned labor hours per cost code.",
  },
  {
    id: "pr1",
    title: "Weekly Progress Report — Week 1",
    code: "PR-01",
    category: "Progress Report",
    kind: "html",
    file: "/documents/progress-report-wk1.html",
    date: "2026-07-03",
    description: "Physical % complete by cost code, week ending 7/3.",
  },
  {
    id: "pr2",
    title: "Weekly Progress Report — Week 2",
    code: "PR-02",
    category: "Progress Report",
    kind: "html",
    file: "/documents/progress-report-wk2.html",
    date: "2026-07-10",
    description: "Physical % complete by cost code, week ending 7/10.",
  },
  {
    id: "pr3",
    title: "Weekly Progress Report — Week 3",
    code: "PR-03",
    category: "Progress Report",
    kind: "html",
    file: "/documents/progress-report-wk3.html",
    date: "2026-07-17",
    description: "Physical % complete by cost code, week ending 7/17.",
  },
  {
    id: "co1",
    title: "Change Order CO-01",
    code: "CO-01",
    category: "Change Order",
    kind: "html",
    file: "/documents/change-order-01.html",
    date: "2026-07-08",
    description: "Owner-requested glass fronts. +$24,000 → revised contract $1,824,000.",
  },
];

export const timecards: DocMeta[] = [
  {
    id: "wk1-3041",
    title: "Weekly Labor Ticket — No. 3041",
    code: "No. 3041",
    category: "Labor Ticket",
    kind: "image",
    file: "/documents/timecards/wk1-3041.png",
    date: "2026-07-03",
    description: "Gypsum crew, week ending 7/3. Low-quality scan.",
  },
  {
    id: "wk2-3068",
    title: "Weekly Labor Ticket — No. 3068",
    code: "No. 3068",
    category: "Labor Ticket",
    kind: "image",
    file: "/documents/timecards/wk2-3068.png",
    date: "2026-07-10",
    description: "Gypsum crew, week ending 7/10.",
  },
  {
    id: "wk3-3095",
    title: "Weekly Labor Ticket — No. 3095",
    code: "No. 3095",
    category: "Labor Ticket",
    kind: "image",
    file: "/documents/timecards/wk3-3095.png",
    date: "2026-07-17",
    description: "Gypsum crew, week ending 7/17.",
  },
  {
    id: "decoy-1177",
    title: "Weekly Labor Ticket — No. 1177",
    code: "No. 1177",
    category: "Labor Ticket",
    kind: "image",
    file: "/documents/timecards/decoy-1177.png",
    date: "2026-07-10",
    description: "215 Water Street crew — a different project.",
  },
];

export const allDocuments: DocMeta[] = [...documents, ...timecards];
