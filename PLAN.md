# Working Plan — Navillus Assessment (PM Tool)

This is our shared checklist so we don't skip steps. We finish each phase before
starting the next. **Nothing gets built or filled until the plan is approved.**

Last updated: 2026-07-17

---

## THE SEQUENCE (do these in order)

### ▶ Phase 1 — Establish ALL document templates (blank structures only, no data yet)
- [x] **SOV** — LOCKED. `templates/sov-template.html`. Dollars only, no labor hours.
- [x] **Weekly Labor Ticket** — LOCKED. Blank image (CLASS column, not DATE). User to place original at `templates/weekly-labor-ticket-blank.png` to preserve image quality.
- [x] **Job Cost Budget** — LOCKED. `templates/job-cost-budget-template.html`. Carries planned labor hours per cost code.
- [x] **Weekly Progress Report** — LOCKED. `templates/weekly-progress-report-template.html`. % complete + Basis/Notes per cost code.
- [x] **Change Order** — LOCKED. `templates/change-order-template.html`. CO No. + Cost Code added; executed CO; includes This-Change labor/material/equipment breakdown.

**✅ PHASE 1 COMPLETE — all five templates locked.**

### ▶ Phase 2 — Plan the project  ✅ DONE
- [x] Project = **Idea 1: "Midtown Office Fit-Out"** — Kestrel Builders, 2-floor Midtown Manhattan office fit-out, $1.8M, 8-week schedule, **currently end of Week 3**.
- [x] Timeline = **3 weeks** of weekly data (weeks 1-3).
- [x] Insight structure = **two ranked insights**:
  - **Over budget (from timecards):** 09 29 00 Gypsum Board — labor productivity declining weekly.
  - **Behind schedule (from progress):** 26 05 00 Electrical — lagging plan; it *gates* drywall close-up (cross-trade dependency = the standout insight).
- [x] Trap tickets (extraction feature, applied to the gypsum cards):
  - Improbable data (extra 0) — baked into a week 1-3 card → flagged & corrected
  - Wrong-project card — rejected, not counted (the only extra image; 4th card)
  - Low-quality scan — one week 1-3 card rendered degraded → manual entry

### ▶ Phase 3 — Fill the docs with generated data (single source of truth: `data/master-data.json`)
- [x] **Step 1 — Baselines (SOV + Job Cost Budget)** — APPROVED & recorded to master-data.json.
- [x] **Step 2 — Pin insight targets** — APPROVED (gypsum productivity 1.03→0.75→0.53; electrical ~1.5 wks behind; top-line ~on-track).
- [x] **Step 3 — Master weekly table** — RECORDED & reconciled (progressByCostCode, gypsumLaborByWeek, _reconciliation in master-data.json).
- [x] **Step 4 — Render typed event docs** — DONE in `documents/`: SOV, Job Cost Budget, 3 Progress Reports, Change Order CO-01.
- [x] **Step 5 — Timecards** — all 4 images generated & approved (wk1-3041 low-qual, wk2-3068 extra-0, wk3-3095 clean, decoy-1177 wrong-project). User saving to `documents/timecards/`.

**✅ PHASE 3 COMPLETE — full synthetic dataset generated (6 typed docs + 4 timecard images), all tracing to `data/master-data.json`.**

### ▶ Phase 4 — Build the app  (Next.js + TS + Tailwind, mock-first)
- [x] Scaffold + env + .gitignore (verified running on :3000)
- [x] App shell (sidebar nav) + seed loader (`lib/seed.ts`)
- [x] Overview page
- [x] Documents page (view all uploaded docs)
- [x] ★ Timecard extraction + review (mock-first) — 4 trap behaviors verified working
- [x] Shared store (`lib/store.tsx`) = frontend "database"
- [x] Upload/onboarding flow (grayed real-upload + Load Sample + toast + nav badge)
- [x] Documents = live DB (To Review / Approved / Rejected sections)
- [x] Reworked Review (scan-all, all fields editable, non-prescriptive warnings, approve/approve-all/reject)
- [x] Payroll CSV export (Reg/OT split)
- [x] Deterministic metrics engine (`lib/metrics.ts`) — general, rule-driven, computes from approved timecards
- [x] `analyzeProject` seam (`lib/analyze.ts`) — mock AnalysisResult, shaped for live/cached/sample tiers
- [x] Dashboard first pass (summary · KPIs · ranked insights · trend chart · cost-code table) — numbers verified
- [ ] Wire real Claude pipeline (extract / analyze) — needs API key
- [ ] Payroll CSV export
- [ ] Deploy to Vercel + README + bump Next to patched 14.2.x

---

## DECISIONS LOCKED (domain model — do not relitigate)

**Documents & where data lives**
- **SOV** = owner-facing, billing/revenue. Dollars only; labor cost is *bundled* into each line's Scheduled Value (not broken out, not in hours). **Static baseline** — built once, never remade.
- **Job Cost Budget** = internal, cost side. Carries **planned labor hours** (and labor $) per cost code. This is the honest source of planned hours — NOT the SOV, NOT a manual input, NOT hardcoded.
- **Progress reports** = dynamic, dated. Source of **% complete** over time.
- **Timecards** = dynamic, dated. Source of **actual labor hours**.
- **Change Order** = a separate signed document (a dated event) that *revises* the SOV. A change order is NOT an updated SOV — it *causes* one (Original + COs = Revised Contract).
- **Architecture:** static baselines (SOV + Budget) + dated event stream (progress, timecards, change orders) → system **computes** current state. The "pay-application view" (SOV with current %) is a **computed output**, never a re-uploaded input.

**Data realism**
- Use **modern 6-digit CSI MasterFormat** cost codes (e.g., `09 29 00`), not the old 3-digit format.
- All data is **synthetic and disclosed as such** — real SOVs/budgets/timecards aren't public (confidential). This is stated honestly in the demo.

**AI / extraction**
- **Parse everything live** with Claude vision extraction (not just OCR — it uses context, so it can catch a wrong project or improbable hours).
- **Confidence routing:** auto-approve high-confidence extractions; flag low-confidence for human review.
- **Metrics are deterministic math** (earned value, productivity factor = earned hrs ÷ actual hrs, schedule slippage). **The LLM never does arithmetic** — it only writes the plain-English summary on top.
- **Labor is the only honest actionable signal** (we have real labor actuals). Material/subcontractor cost variance = named as roadmap, not built (no invoice data).

**Timecards**
- Weekly cards. One ticket = one crew-week (keeps count low). Hours reconcile to the actual-hours totals.
- One hero card hand-written on iPad; the rest generated (GPT Image 2 / HTML overlay). No printer needed.

---

## DEMO FLOW (user's outline — reference)
Login → Create Project → Upload SOV (+ Job Cost Budget) → Upload progress logs & change orders →
Upload labor tickets (extraction + confidence flagging + the 3 traps) → data assembled into a
timeline → PM exports payroll CSV, views dashboard metrics + Claude-written summary → (optional)
export insights as PDF.

**Presentation talking points to make (honest framing):**
- Sparse public data → had to use assumptions + generic templates; a real system would fit each company's actual data formats.
- More data → deeper analysis.
- Knowing the real payroll system → optimize the CSV output format for it.
- Roadmap: a chatbot/RAG feature so PMs can ask targeted questions of their project's docs instead of digging manually.

---

## OPEN DECISIONS (still to settle)
- [x] Weekly ticket: CLASS-vs-DATE column — RESOLVED, using CLASS.
- [ ] Login: keep minimal/mock single account (Navillus wants creds, not real auth). *Recommendation, not yet confirmed.*
- [ ] Insights export as PDF: optional/stretch. *Recommendation: build only if time allows.*
- [ ] SOV baseline document: build as day-one baseline (progress columns empty) vs. show current pay-app view. *Recommendation: day-one baseline; progress comes from progress reports.*
