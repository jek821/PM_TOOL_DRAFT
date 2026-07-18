"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Files, ScrollText, LineChart } from "lucide-react";
import { cn } from "@/lib/cn";
import { project } from "@/lib/seed";
import { useStore } from "@/lib/store";

const nav = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/documents", label: "Documents", icon: Files },
  { href: "/timecards", label: "Timecards", icon: ScrollText },
  { href: "/dashboard", label: "Dashboard", icon: LineChart },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loaded, tickets } = useStore();
  const toReview = tickets.filter(
    (t) => t.status === "unscanned" || t.status === "needsReview"
  ).length;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-primary text-white">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white text-sm font-bold text-primary">
            N
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold text-white">Navillus PM</div>
            <div className="text-[11px] text-white/55">Project Health</div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge = href === "/timecards" && loaded && toReview > 0 ? toReview : null;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                  active
                    ? "bg-white/15 font-medium text-white"
                    : "text-white/65 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
                {badge && (
                  <span className="ml-auto rounded-full bg-warning px-1.5 py-0.5 text-[10px] font-bold text-white">
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-4 text-[11px] leading-relaxed text-white/45">
          Demo data — synthetic. Real GC cost documents are confidential.
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b bg-card px-6 py-3">
          {loaded ? (
            <>
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold">{project.name}</div>
                <div className="text-xs text-muted-foreground">
                  {project.gc} · Job {project.jobNumber}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Week {project.asOfWeek} of {project.durationWeeks} · as of {project.asOfDate}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No project loaded</div>
          )}
        </header>

        <main className="flex-1 overflow-auto">{children}</main>
      </div>
    </div>
  );
}
