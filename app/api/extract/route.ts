// STAGE 1 (live) — server-only vision extraction. Reads a photographed weekly
// labor timecard, transcribes exactly what is written (NO correcting — a
// wrong-project or impossible-hours ticket must survive so the deterministic
// validators can catch it), and
// assigns per-field confidence. Pay rates aren't on the physical card, so they
// are filled from the roster by trade class after extraction.
//
// The API key is read from the server environment and never reaches the browser.
// Tiers: live Claude -> last good live result per ticket (cached) -> mock sample.

import Anthropic from "@anthropic-ai/sdk";
import { NextResponse } from "next/server";
import { readFile } from "fs/promises";
import path from "path";
import { roster } from "@/lib/seed";
import { reviewTickets, sampleExtraction, type ExtractionResult, type Conf } from "@/lib/mock-extractions";
import { recordUsage } from "@/lib/usage";

export const runtime = "nodejs";

const MODEL = "claude-opus-4-8";

// Last successful live extraction per ticket id, for the cached tier.
const lastLive: Record<string, ExtractionResult> = {};

// Pay rates aren't printed on the card — resolve them from the roster. Prefer a
// worker last-name match (the real crew), then fall back to trade-class keywords
// (roster classes like "Carpenter Foreman" don't equal the card's "Foreman").
const lastName = (name: string) =>
  (name.trim().split(/\s+/).pop() ?? "").toLowerCase().replace(/[^a-z]/g, "");
const nameRate: Record<string, number> = Object.fromEntries(roster.map((w) => [lastName(w.name), w.rate]));
const rateFor = (re: RegExp) => roster.find((w) => re.test(w.class))?.rate ?? 0;
const foremanRate = rateFor(/foreman/i);
const apprenticeRate = rateFor(/apprentice/i);
const laborerRate = rateFor(/laborer/i);
const carpenterRate = roster.find((w) => /carpenter/i.test(w.class) && !/foreman/i.test(w.class))?.rate ?? 0;

function resolveRate(className: string, worker: string): number {
  const byName = nameRate[lastName(worker)];
  if (byName != null) return byName;
  const c = className.toLowerCase();
  if (/foreman/.test(c)) return foremanRate;
  if (/apprentice/.test(c)) return apprenticeRate;
  if (/laborer/.test(c)) return laborerRate;
  if (/carpenter/.test(c)) return carpenterRate;
  return roster.find((w) => w.class.toLowerCase() === c)?.rate ?? 0;
}

const SYSTEM = `You are a data-entry assistant transcribing a photographed weekly labor timecard from a construction subcontractor. Your transcription feeds a payroll export, so a project manager relies on your confidence flags to know what to double-check.

Transcribe EXACTLY what is written. Do NOT correct, normalize, or "fix" anything that looks wrong — if the project or job number belongs to a different job, or an hours figure is impossible, transcribe it as written. A separate validation step handles those; your job is a faithful transcription.

Confidence is a REVIEW signal, not a measure of your own certainty. Judge the legibility of the scan itself — resolution, blur, faint or broken ink, low contrast, creases, smudges, skew — not just whether you can produce a best guess. Set a field's "confidence" to "low" when the cell is degraded or a character could plausibly be read more than one way, EVEN IF you have a best guess. Bias toward caution: a flagged field costs the PM a two-second glance, but a wrong value marked "high" flows straight into payroll. Hold numeric fields — hours above all — to the strictest bar. Mark "high" only when the value is plainly legible and unambiguous.

Also return "legibility", an overall read of the scan's quality: "clear" (crisp, fully legible), "marginal" (readable but degraded in places — creases, smudges, low contrast, or any field you marked low-confidence), or "poor" (substantially obscured). Use "marginal" or "poor" whenever any part of the card warranted a low-confidence field.

Header fields to read: weekEnding, contractor, project, job (the job number), costCode, phase, description.
For each labor row read: className (the trade/class, e.g. Foreman, Carpenter, Apprentice), worker (the name as written), and hours.`;

const field = {
  type: "object",
  properties: {
    value: { type: "string" },
    confidence: { type: "string", enum: ["high", "low"] },
  },
  required: ["value", "confidence"],
} as const;

const emitTicketTool: Anthropic.Tool = {
  name: "emit_ticket",
  description: "Return the transcribed timecard.",
  input_schema: {
    type: "object",
    properties: {
      header: {
        type: "object",
        properties: {
          weekEnding: field,
          contractor: field,
          project: field,
          job: field,
          costCode: field,
          phase: field,
          description: field,
        },
        required: ["weekEnding", "contractor", "project", "job", "costCode", "phase", "description"],
      },
      rows: {
        type: "array",
        items: {
          type: "object",
          properties: {
            className: { type: "string" },
            worker: { type: "string" },
            hours: field,
          },
          required: ["className", "worker", "hours"],
        },
      },
      legibility: {
        type: "string",
        enum: ["clear", "marginal", "poor"],
        description: "Overall scan quality. marginal/poor flags the whole card for PM review.",
      },
    },
    required: ["header", "rows", "legibility"],
  },
};

const asConf = (c: unknown): Conf => (c === "low" ? "low" : "high");
const asField = (f: unknown) => {
  const o = (f ?? {}) as Record<string, unknown>;
  return { value: String(o.value ?? ""), confidence: asConf(o.confidence) };
};

// Load the timecard image as base64. Prefer fetching the static asset over the
// deployment's own origin — this works on Vercel serverless (where public/ files
// are NOT on the function's filesystem) and in local dev. Falls back to a disk
// read if the self-fetch is unavailable.
async function loadImageB64(req: Request, file: string): Promise<string> {
  try {
    const origin = new URL(req.url).origin;
    const res = await fetch(`${origin}${file}`);
    if (res.ok) return Buffer.from(await res.arrayBuffer()).toString("base64");
  } catch {
    /* fall through to disk read */
  }
  const abs = path.join(process.cwd(), "public", file.replace(/^\//, ""));
  return (await readFile(abs)).toString("base64");
}

export async function POST(req: Request) {
  let ticketId = "";
  try {
    ticketId = String((await req.json()).ticketId ?? "");
  } catch {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  // Resolve the image path from the ticket id against a known whitelist — never
  // from a client-supplied path (prevents path traversal on the disk read and
  // host re-targeting / SSRF on the origin fetch).
  const ticket = reviewTickets.find((t) => t.id === ticketId);

  if (process.env.ANTHROPIC_API_KEY && ticket) {
    try {
      const b64 = await loadImageB64(req, ticket.file);

      const client = new Anthropic();
      const msg = await client.messages.create({
        model: MODEL,
        max_tokens: 1500,
        system: SYSTEM,
        tools: [emitTicketTool],
        tool_choice: { type: "tool", name: "emit_ticket" },
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: "image/png", data: b64 } },
              { type: "text", text: "Transcribe this weekly labor timecard." },
            ],
          },
        ],
      });
      recordUsage({
        ts: Date.now(),
        route: "extract",
        model: MODEL,
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
        cacheReadTokens: (msg.usage as { cache_read_input_tokens?: number }).cache_read_input_tokens ?? 0,
        detail: ticketId,
      });

      const block = msg.content.find((b) => b.type === "tool_use");
      if (block && block.type === "tool_use") {
        const out = block.input as Record<string, unknown>;
        const h = (out.header ?? {}) as Record<string, unknown>;
        const rawRows = Array.isArray(out.rows) ? out.rows : [];
        const result: ExtractionResult = {
          header: {
            weekEnding: asField(h.weekEnding),
            contractor: asField(h.contractor),
            project: asField(h.project),
            job: asField(h.job),
            costCode: asField(h.costCode),
            phase: asField(h.phase),
            description: asField(h.description),
          },
          rows: rawRows.map((r) => {
            const o = r as Record<string, unknown>;
            const className = String(o.className ?? "");
            const worker = String(o.worker ?? "");
            return {
              className,
              worker,
              hours: asField(o.hours),
              rate: resolveRate(className, worker),
            };
          }),
          legibility: out.legibility === "poor" ? "poor" : out.legibility === "marginal" ? "marginal" : "clear",
          source: "live",
        };
        lastLive[ticketId] = result;
        return NextResponse.json(result);
      }
    } catch (err) {
      console.error("[extract] live call failed:", err);
    }
  }

  // Fallbacks: last good live result for this ticket, else the mock sample.
  if (lastLive[ticketId]) return NextResponse.json({ ...lastLive[ticketId], source: "cached" });
  const sample = sampleExtraction(ticketId);
  if (sample) return NextResponse.json(sample);
  return NextResponse.json({ error: "unknown ticket" }, { status: 404 });
}
