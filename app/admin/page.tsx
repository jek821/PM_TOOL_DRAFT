"use client";

import { useCallback, useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/cn";
import { Activity, RefreshCw, Trash2, Loader2 } from "lucide-react";

interface UsageEntry {
  ts: number;
  route: "analyze" | "extract";
  model: string;
  inputTokens: number;
  outputTokens: number;
  cacheReadTokens: number;
  detail?: string;
}
interface UsageData {
  entries: UsageEntry[];
  totals: { calls: number; inputTokens: number; outputTokens: number; cacheReadTokens: number; cost: number };
  byRoute: { analyze: number; extract: number };
}

const n = (x: number) => x.toLocaleString();
const usd = (x: number) => `$${x.toFixed(x < 1 ? 4 : 2)}`;
const rowCost = (e: UsageEntry) => (e.inputTokens * 5 + e.outputTokens * 25) / 1_000_000;
const time = (ts: number) => new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default function AdminPage() {
  const [data, setData] = useState<UsageData | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/usage", { cache: "no-store" });
      setData(await res.json());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const clear = async () => {
    if (!confirm("Clear the usage log for this session?")) return;
    await fetch("/api/admin/usage", { method: "DELETE" });
    load();
  };

  const t = data?.totals;

  return (
    <div className="mx-auto max-w-5xl space-y-5 p-8">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-primary">
            <Activity className="h-6 w-6 text-accent" /> API usage
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Live Claude token usage for this server session. In-memory only — resets on restart or redeploy.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium hover:bg-muted"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />} Refresh
          </button>
          <button
            onClick={clear}
            className="inline-flex items-center gap-1.5 rounded-lg border border-danger/40 px-3 py-2 text-sm font-medium text-danger hover:bg-danger/10"
          >
            <Trash2 className="h-4 w-4" /> Clear
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Tile label="Live calls" value={t ? n(t.calls) : "—"} sub={t ? `${data!.byRoute.extract} extract · ${data!.byRoute.analyze} analyze` : ""} />
        <Tile label="Input tokens" value={t ? n(t.inputTokens) : "—"} sub={t && t.cacheReadTokens ? `${n(t.cacheReadTokens)} from cache` : "uncached"} />
        <Tile label="Output tokens" value={t ? n(t.outputTokens) : "—"} sub="generated" />
        <Tile label="Est. cost" value={t ? usd(t.cost) : "—"} sub="approx · Opus 4.8 rates" tone="accent" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b text-[11px] uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-2.5 text-left font-medium">Time</th>
                  <th className="px-4 py-2.5 text-left font-medium">Route</th>
                  <th className="px-4 py-2.5 text-left font-medium">Detail</th>
                  <th className="px-4 py-2.5 text-right font-medium">Input</th>
                  <th className="px-4 py-2.5 text-right font-medium">Output</th>
                  <th className="px-4 py-2.5 text-right font-medium">Est. cost</th>
                </tr>
              </thead>
              <tbody>
                {data?.entries.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      No live calls yet. Scan timecards or open the dashboard to generate usage.
                    </td>
                  </tr>
                )}
                {data?.entries.map((e, i) => (
                  <tr key={i} className="border-b last:border-0">
                    <td className="px-4 py-2.5 tabular-nums text-muted-foreground">{time(e.ts)}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={cn(
                          "rounded-md px-1.5 py-0.5 text-[11px] font-medium",
                          e.route === "extract" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary"
                        )}
                      >
                        {e.route}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">{e.detail ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{n(e.inputTokens)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{n(e.outputTokens)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{usd(rowCost(e))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Tile({ label, value, sub, tone }: { label: string; value: string; sub: string; tone?: "accent" }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={cn("font-display text-2xl font-bold tracking-tight", tone === "accent" && "text-accent")}>{value}</div>
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      </CardContent>
    </Card>
  );
}
