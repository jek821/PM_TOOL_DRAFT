"use client";

import { useState } from "react";
import { Building2, Lock, Loader2 } from "lucide-react";

export default function LoginPage() {
  const [user, setUser] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ user, password }),
      });
      if (res.ok) {
        const next = new URLSearchParams(window.location.search).get("next");
        window.location.href = next && next.startsWith("/") ? next : "/";
        return;
      }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Invalid username or password.");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-soft">
            <Building2 className="h-6 w-6" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary">Navillus PM</h1>
          <p className="mt-1 text-sm text-muted-foreground">Sign in to the demo</p>
        </div>

        <form onSubmit={submit} className="space-y-3 rounded-2xl border bg-card p-6 shadow-card">
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/80">Username</span>
            <input
              value={user}
              onChange={(e) => setUser(e.target.value)}
              autoFocus
              autoComplete="username"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium text-foreground/80">Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              className="h-10 w-full rounded-lg border border-border px-3 text-sm outline-none focus:ring-2 focus:ring-accent/40"
            />
          </label>

          {error && <p className="text-sm text-danger">{error}</p>}

          <button
            type="submit"
            disabled={busy}
            className="flex h-10 w-full items-center justify-center gap-2 rounded-lg bg-accent text-sm font-semibold text-white transition-colors hover:bg-accent/90 disabled:opacity-70"
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> Signing in…
              </>
            ) : (
              <>
                <Lock className="h-4 w-4" /> Sign in
              </>
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-xs text-muted-foreground">
          Demo access · fictional data only
        </p>
      </div>
    </div>
  );
}
