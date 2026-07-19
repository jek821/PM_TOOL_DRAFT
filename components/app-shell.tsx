"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Files, ScrollText, LineChart, ChevronDown, Check, Layers, Sparkles } from "lucide-react";
import { cn } from "@/lib/cn";
import { useStore } from "@/lib/store";
import type { ProjectMeta } from "@/lib/projects";

const nav = [
  { href: "/", label: "Overview", icon: Home },
  { href: "/timecards", label: "Timecards", icon: ScrollText },
  { href: "/documents", label: "Documents", icon: Files },
  { href: "/dashboard", label: "Dashboard", icon: LineChart },
];

function isActive(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname.startsWith(href);
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { loaded, tickets, currentProject } = useStore();
  const toReview = tickets.filter(
    (t) => t.status === "unscanned" || t.status === "needsReview"
  ).length;

  // The login screen renders full-bleed, without the app chrome.
  if (pathname === "/login") return <>{children}</>;

  return (
    <div className="flex min-h-screen">
      <aside className="flex w-60 shrink-0 flex-col bg-primary text-white">
        <div className="flex items-center gap-2.5 border-b border-white/10 px-5 py-4">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent font-display text-sm font-bold text-white">
            N
          </div>
          <div className="leading-tight">
            <div className="font-display text-sm font-semibold tracking-tight text-white">Navillus PM</div>
            <div className="text-[11px] text-white/55">Project Health</div>
          </div>
        </div>

        {loaded && <ProjectSwitcher />}

        <nav className="flex-1 p-3 space-y-1">
          {nav.map(({ href, label, icon: Icon }) => {
            const active = isActive(pathname, href);
            const badge =
              href === "/timecards" && loaded && currentProject.hasData && toReview > 0 ? toReview : null;
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 font-display text-sm tracking-tight transition-colors",
                  active
                    ? "bg-accent font-semibold text-white shadow-sm"
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
                <div className="truncate text-sm font-semibold">{currentProject.name}</div>
                <div className="text-xs text-muted-foreground">
                  {currentProject.gc} · Job {currentProject.jobNumber}
                </div>
              </div>
              <div className="flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                Week {currentProject.asOfWeek} of {currentProject.durationWeeks}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted-foreground">No project loaded</div>
          )}
        </header>

        <main className="flex-1 overflow-auto">
          {loaded && !currentProject.hasData ? <ProjectStub project={currentProject} /> : children}
        </main>
      </div>
    </div>
  );
}

function ProjectSwitcher() {
  const { projects, currentProject, setProjectId } = useStore();
  const [open, setOpen] = useState(false);
  return (
    <div className="relative border-b border-white/10 px-3 py-3">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-left transition-colors hover:bg-white/15"
      >
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-[13px] font-semibold text-white">{currentProject.name}</div>
          <div className="text-[11px] text-white/55">Job {currentProject.jobNumber}</div>
        </div>
        <ChevronDown className={cn("h-4 w-4 shrink-0 text-white/50 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-3 right-3 top-full z-20 mt-1 overflow-hidden rounded-lg border bg-card py-1 shadow-soft">
            {projects.map((p) => {
              const active = p.id === currentProject.id;
              return (
                <button
                  key={p.id}
                  onClick={() => {
                    setProjectId(p.id);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full items-start gap-2 px-3 py-2 text-left transition-colors hover:bg-muted",
                    active && "bg-muted/60"
                  )}
                >
                  <Check className={cn("mt-0.5 h-4 w-4 shrink-0", active ? "text-accent" : "text-transparent")} />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-foreground">{p.name}</div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <span>Job {p.jobNumber}</span>
                      {!p.hasData && (
                        <span className="rounded bg-accent/10 px-1.5 py-0.5 text-[10px] font-semibold text-accent">
                          Coming soon
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

function ProjectStub({ project }: { project: ProjectMeta }) {
  const { projects, setProjectId } = useStore();
  const real = projects.find((p) => p.hasData) ?? projects[0];
  return (
    <div className="flex h-[calc(100vh-3.75rem)] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent">
        <Layers className="h-7 w-7" />
      </div>
      <div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          <Sparkles className="h-3.5 w-3.5" /> Coming soon
        </span>
        <h2 className="mt-3 text-xl font-bold">{project.name}</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Job {project.jobNumber} · {project.location}
        </p>
      </div>
      <p className="max-w-md text-sm text-muted-foreground">
        Full multi-project support is on the roadmap. This demo runs on a single job —{" "}
        <span className="font-medium text-foreground">{real.name}</span> — with complete documents, timecards, and
        analytics. Managing your whole portfolio here is a planned feature.
      </p>
      <button
        onClick={() => setProjectId(real.id)}
        className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90"
      >
        Back to {real.name.split(" — ")[0]}
      </button>
    </div>
  );
}
