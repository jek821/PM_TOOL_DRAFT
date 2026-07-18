// Mock Stage-1 extraction output — shaped exactly like the real Claude-vision
// response will be, so wiring the live API later is a drop-in replacement.
// Each field carries a confidence; validation (improbable hours / wrong project)
// is applied deterministically in the UI, not by the model.

export type Conf = "high" | "low";

export interface FieldC {
  value: string;
  confidence: Conf;
}

export interface ReviewRow {
  className: string;
  worker: string;
  hours: FieldC;
  rate: number;
}

export interface ReviewTicket {
  id: string;
  file: string; // original image
  ticketNo: string;
  header: {
    weekEnding: FieldC;
    contractor: FieldC;
    project: FieldC;
    job: FieldC;
    costCode: FieldC;
    phase: FieldC;
    description: FieldC;
  };
  rows: ReviewRow[];
}

const H = (value: string): FieldC => ({ value, confidence: "high" });
const L = (value: string): FieldC => ({ value, confidence: "low" });

export const reviewTickets: ReviewTicket[] = [
  {
    id: "wk1-3041",
    file: "/documents/timecards/wk1-3041.png",
    ticketNo: "3041",
    header: {
      weekEnding: H("7/3/26"),
      contractor: H("Navillus Contracting"),
      project: H("633 Third Ave – 17th Fl Fit-Out"),
      job: H("2412"),
      costCode: H("09 29 00"),
      phase: H("Partitions – 17th Fl"),
      description: H("Partition layout & metal framing, 17th fl east"),
    },
    rows: [
      { className: "Foreman", worker: "M. Torres", hours: H("44"), rate: 95 },
      { className: "Carpenter", worker: "J. Okafor", hours: H("40"), rate: 85 },
      { className: "Carpenter", worker: "D. Russo", hours: L("40"), rate: 85 },
      { className: "Apprentice", worker: "K. Park", hours: L("36"), rate: 55 },
    ],
  },
  {
    id: "wk2-3068",
    file: "/documents/timecards/wk2-3068.png",
    ticketNo: "3068",
    header: {
      weekEnding: H("7/10/26"),
      contractor: H("Navillus Contracting"),
      project: H("633 Third Ave – 17th Fl Fit-Out"),
      job: H("2412"),
      costCode: H("09 29 00"),
      phase: H("Partitions – 17th Fl"),
      description: H("Framing & board hang, 17th fl east; shim at out-of-plumb shafts"),
    },
    rows: [
      { className: "Foreman", worker: "M. Torres", hours: H("48"), rate: 95 },
      { className: "Carpenter", worker: "J. Okafor", hours: H("44"), rate: 85 },
      { className: "Carpenter", worker: "D. Russo", hours: H("44"), rate: 85 },
      { className: "Apprentice", worker: "K. Park", hours: H("440"), rate: 55 },
    ],
  },
  {
    id: "wk3-3095",
    file: "/documents/timecards/wk3-3095.png",
    ticketNo: "3095",
    header: {
      weekEnding: H("7/17/26"),
      contractor: H("Navillus Contracting"),
      project: H("633 Third Ave – 17th Fl Fit-Out"),
      job: H("2412"),
      costCode: H("09 29 00"),
      phase: H("Partitions – 17th Fl"),
      description: H("Board hang east/central; taping east; patch at MEP penetrations"),
    },
    rows: [
      { className: "Foreman", worker: "M. Torres", hours: H("54"), rate: 95 },
      { className: "Carpenter", worker: "J. Okafor", hours: H("50"), rate: 85 },
      { className: "Carpenter", worker: "D. Russo", hours: H("48"), rate: 85 },
      { className: "Apprentice", worker: "K. Park", hours: H("48"), rate: 55 },
    ],
  },
  {
    id: "decoy-1177",
    file: "/documents/timecards/decoy-1177.png",
    ticketNo: "1177",
    header: {
      weekEnding: H("7/10/26"),
      contractor: H("Navillus Contracting"),
      project: H("215 Water Street – Lobby Renovation"),
      job: H("2388"),
      costCode: H("09 29 00"),
      phase: H("Lobby – Level 1"),
      description: H("Furring & gypsum at lobby feature wall"),
    },
    rows: [
      { className: "Foreman", worker: "L. Mendez", hours: H("40"), rate: 95 },
      { className: "Carpenter", worker: "T. Walsh", hours: H("40"), rate: 85 },
      { className: "Carpenter", worker: "A. Ruiz", hours: H("38"), rate: 85 },
      { className: "Apprentice", worker: "J. Kim", hours: H("36"), rate: 55 },
    ],
  },
];

/** Deterministic validation thresholds (code, not the model). */
export const MAX_WEEK_HOURS = 168; // impossible above this
export const HIGH_WEEK_HOURS = 80; // suspicious above this

// ---- Stage-1 extraction result (what the live vision route returns) ----
// Shaped exactly like a ReviewTicket's fields so the mock is a drop-in sample
// fallback. `rate` is filled from the roster (not on the physical card).
export type Legibility = "clear" | "marginal" | "poor"; // overall scan quality
export interface ExtractionResult {
  header: ReviewTicket["header"];
  rows: ReviewRow[];
  legibility: Legibility; // a marginal/poor scan flags the whole card for review
  source: "live" | "cached" | "sample";
}

/** Sample fallback for one ticket — the pre-baked mock extraction. */
export function sampleExtraction(id: string): ExtractionResult | null {
  const t = reviewTickets.find((x) => x.id === id);
  if (!t) return null;
  const anyLow =
    Object.values(t.header).some((f) => f.confidence === "low") ||
    t.rows.some((r) => r.hours.confidence === "low");
  return { header: t.header, rows: t.rows, legibility: anyLow ? "marginal" : "clear", source: "sample" };
}
