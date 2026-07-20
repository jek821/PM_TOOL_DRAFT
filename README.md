# Navillus PM — Project Health

An AI-assisted project-controls tool for a general contractor's project manager. It reads the
paperwork that comes in from the field, turns handwritten labor tickets into payroll-ready data,
and tells the PM which cost codes need attention this week — and why.

Built as a technical assessment for Navillus.

| | |
|---|---|
| **Live demo** | https://pm-tool-demo.vercel.app |
| **Walkthrough video** | `<VIDEO_URL>` |

> **Everything in this demo is synthetic.** Real contractor cost documents — populated schedules of
> values, job cost budgets, certified payroll, timecards — are confidential and not publicly
> available. The project, its documents and the handwritten timecards were all generated for this
> demo, and the app says so on its first screen.

---

## The problem

A PM on a fit-out is running the job's cost and schedule out of a stack of paper. Weekly labor
tickets come off the field in handwriting, get keyed into payroll by hand, and are usually the last
thing anyone reconciles against the budget. By the time a labor overrun shows up in the monthly
requisition, it's four weeks old and the crew has already burned the hours.

Labor is where margin quietly leaks, and it's the one cost the GC actually has primary data for.
This tool closes that loop: read the ticket, catch the bad ones before they reach payroll, and
compute what the hours mean against the budget while there's still time to act.

## See it in three minutes

1. **Sign in** and hit **Upload Sample Documents** — this loads the job's paperwork: a Schedule of
   Values, a Job Cost Budget, three Weekly Progress Reports, a Change Order, and four handwritten
   labor tickets.
2. Go to **Timecards → Scan all unapproved.** Claude reads each photographed card and scores every
   field for confidence.
3. **Three deliberate traps are in the stack**, and each is handled differently:
   - **No. 1177** is for a *different job* (215 Water Street, Job 2388). It's flagged and can't be
     approved — reject it so its hours never reach this job's cost.
   - **No. 3068** has an apprentice logged at **440 hours** in one week. Flagged as impossible;
     correct it to 44 and the approve button unlocks.
   - **No. 3041** is a poor-quality scan. It comes back marked low-confidence, with the hard-to-read
     fields highlighted so you check them against the image before approving.
4. Approve the three real cards, then **Export payroll CSV** (regular/overtime split at 40 hours).
5. Open the **Dashboard**: an AI-written summary, ranked insights, and per-line metrics.
   **Hover any figure** to see the exact formula, the live numbers plugged into it, and which
   document each input came from.
6. Optional: on **Documents**, edit any value in the SOV, Job Cost Budget or a Progress Report and
   return to the Dashboard — the metrics and the analysis recompute against what you entered.
   `/admin` shows live token usage and estimated cost for the session.

**What the demo is meant to show:** the drywall line looks fine on schedule but its crew is burning
hours — productivity has fallen 1.03 → 0.75 → 0.53 over three weeks and projects roughly $41k over
its labor budget. Electrical is ~1.5 weeks behind on progress alone, with no timecards at all, and
it *gates* drywall close-up. Two problems, from two independent document trails, both hidden under a
top-line that reads roughly on track.

## How it works

Three stages, deliberately separated:

**1 · Vision extraction** (`app/api/extract/route.ts`) — Claude reads the photographed ticket and
transcribes it *faithfully*. It is explicitly instructed not to correct anything that looks wrong,
because a wrong job number or an impossible hours figure has to survive to be caught. It returns
per-field confidence plus an overall legibility read.

**2 · Deterministic metrics** (`lib/metrics.ts`) — pure arithmetic over the baselines, the dated
events and the *approved* timecards. Earned value, productivity, estimate-at-completion, schedule
variance, projected margin. Every cost code runs the same computation and the same thresholds;
there is no per-trade special-casing.

**3 · Narrative** (`app/api/analyze/route.ts`) — Claude receives the computed figures and writes the
plain-English priorities and recommendations on top of them.

> **Numbers from the engine, words from the model.** The model never does arithmetic — it is given
> the figures and forbidden from deriving new ones. Everything it writes cites the source document
> the number came from, so the PM can verify it.

Each AI stage degrades gracefully: **live → last good result (cached) → deterministic sample**, and
the UI badges which tier produced what. The app renders something honest even with no API key.

## Design decisions

The parts that took the most thinking are in the data model, not the UI.

- **Two baselines, not one.** The Schedule of Values is owner-facing and in *dollars only* — labor is
  bundled into each line's value. Planned *hours* live in the internal Job Cost Budget. Productivity
  is impossible without both, and conflating them is the most common way this gets modelled wrong.
- **Static baselines plus a dated event stream.** Progress reports, timecards and change orders are
  events; the system *computes* current state from them. The pay-application view is an output,
  never a re-uploaded input.
- **A change order revises the SOV — it is not a new SOV.** Original + change orders = revised
  contract ($1,800,000 + $24,000 = $1,824,000).
- **Validation is deterministic, not model judgement.** The wrong-project and impossible-hours traps
  are caught by rules in `lib/tickets.ts`, not by asking the model whether something looks off. The
  model's confidence scores route attention; code decides what's approvable.
- **The tool declines to guess.** Productivity needs both a % complete *and* approved timecards, so
  lines without labor data show no value rather than a fabricated one. Six cost codes have progress
  but no timecards — their schedule metrics still compute and still flag, because the schedule and
  cost signals are independent.
- **Only labor has actuals.** Materials are held at budget throughout, because there's no invoice
  data to vary them. Material and subcontractor variance is named as roadmap, not faked.

## What's real and what isn't

- All data is synthetic and traces to one source file, `data/master-data.json`, which carries its own
  reconciliation block. The generated documents are views of it.
- Cost codes follow modern 6-digit CSI MasterFormat. Labor rates are representative NYC
  prevailing-wage-style figures. `Links.txt` cites the public templates each document format was
  based on.
- State is in-memory and resets on refresh — there's no database. Fine for a demo, and the app says
  so where it matters.
- One project carries full data; the project switcher shows the multi-project shape without
  inventing two more datasets.

## Running it locally

```bash
npm install
cp .env.example .env.local   # then fill in the values below
npm run dev                  # http://localhost:3000
npm test                     # 10 unit tests
```

`.env.local`:

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Server-side only. Without it the app runs on its sample tier. |
| `DEMO_USER` / `DEMO_PASSWORD` | Demo login credentials. |
| `AUTH_SECRET` | Any random string; the value stored in the session cookie. |

The API key is read in server route handlers and never reaches the browser. Login posts to
`/api/login`, which verifies credentials server-side and sets an httpOnly cookie that `middleware.ts`
checks on every request. **If the three auth variables are unset the gate is disabled** — that's
intentional for local dev, so make sure all three are set in the deployment.

Tests cover the metrics engine (contract totals, flag thresholds, severity ranking, the productivity
formula) and the ticket validators (wrong project, impossible hours, approvability).

```
app/          pages + the two server-side Claude routes
lib/          metrics engine, ticket domain + validators, analysis seam, CSV export
data/         master-data.json — the single source of truth
documents/    the generated project paperwork (+ timecard images)
templates/    blank document templates the data was rendered into
```

## What I'd build next

- **Fit the parsers to the company's real formats.** Public construction data is sparse outside
  generic templates, so this works from reasonable assumptions. Real document formats would replace
  them.
- **Tune the payroll export to the actual payroll system** rather than a sensible generic CSV.
- **Ask questions of the project.** A retrieval layer over a job's documents so a PM can ask "what
  did we agree on the glass fronts?" instead of digging through the stack.
- **Material and subcontractor variance**, once there's invoice data to make it honest.
- **Persistence and real multi-project support** — a database, per-user projects, and an audit trail
  of who approved which ticket.

## How this was built

I worked from written specifications rather than ad-hoc prompting. `PLAN.md` holds the locked domain
decisions and phase gates; `data/master-data.json` is a declared single source of truth that every
generated document reconciles against. Claude Code was run against those documents phase by phase and
re-grounded in them at each step, so the constraints stayed fixed as the build progressed.

The guardrails are in the repo, not just in the prompts — which is why the dataset reconciles: 540
hours logged across three tickets, 405 earned against a 1,500-hour budget line, 0.75 productivity,
all traceable to one file.

---

Jacob Kriss · built for the Navillus AI Deployment assessment, July 2026
