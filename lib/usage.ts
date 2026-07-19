// Server-side, in-memory API usage log. Records token counts from each LIVE
// Claude call (cached/sample tiers make no API call, so they aren't recorded).
// Module-level state: shared across route handlers in one server instance,
// resets on restart/redeploy. Never import this from a client component.

export interface UsageEntry {
  ts: number;
  route: "analyze" | "extract";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  detail?: string; // e.g. the ticket id for extract calls
}

const MAX = 1000; // cap memory

// Store the log on globalThis so all route handlers share one instance —
// Next.js bundles each route separately, so a plain module-level array would
// give the recorders and the admin reader different copies.
const g = globalThis as unknown as { __pmUsage?: UsageEntry[] };
const log: UsageEntry[] = (g.__pmUsage ??= []);

// Standard $/1M-token pricing by model (input, output). Estimate only.
const PRICING: Record<string, { in: number; out: number }> = {
  "claude-opus-4-8": { in: 5, out: 25 },
};

export function recordUsage(e: UsageEntry) {
  log.push(e);
  if (log.length > MAX) log.splice(0, log.length - MAX);
}

export function estimateCost(e: Pick<UsageEntry, "model" | "inputTokens" | "outputTokens">): number {
  const p = PRICING[e.model] ?? { in: 5, out: 25 };
  return (e.inputTokens * p.in + e.outputTokens * p.out) / 1_000_000;
}

export function getUsage() {
  const entries = log.slice().reverse(); // newest first
  const totals = log.reduce(
    (a, e) => ({
      calls: a.calls + 1,
      inputTokens: a.inputTokens + e.inputTokens,
      outputTokens: a.outputTokens + e.outputTokens,
      cacheReadTokens: a.cacheReadTokens + e.cacheReadTokens,
      cost: a.cost + estimateCost(e),
    }),
    { calls: 0, inputTokens: 0, outputTokens: 0, cacheReadTokens: 0, cost: 0 }
  );
  const byRoute = {
    analyze: log.filter((e) => e.route === "analyze").length,
    extract: log.filter((e) => e.route === "extract").length,
  };
  return { entries, totals, byRoute };
}

export function clearUsage() {
  log.length = 0;
}
