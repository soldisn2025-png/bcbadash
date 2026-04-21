"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { ThreeNumbers } from "@/components/tracker/three-numbers";
import { SetupForm } from "@/components/tracker/setup-form";
import { buildSnapshot, type CandidateConfig, type WeeklyLog } from "@/lib/domain/calculator";
import {
  loadTrackerData,
  saveTrackerData,
  exportTrackerJson,
  type TrackerData,
} from "@/lib/storage/tracker";

type Phase = "loading" | "setup" | "dashboard";

export function TrackerShell() {
  const [phase, setPhase] = useState<Phase>("loading");
  const [data, setData] = useState<TrackerData | null>(null);

  // Hydrate on mount — async because Supabase load is async
  useEffect(() => {
    let cancelled = false;

    void loadTrackerData().then((saved) => {
      if (cancelled) return;
      if (saved) {
        setData(saved);
        setPhase("dashboard");
      } else {
        setPhase("setup");
      }
    }).catch(() => {
      if (!cancelled) setPhase("setup");
    });

    return () => { cancelled = true; };
  }, []);

  // Debounced remote save — fires 600 ms after the last local change
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persistData = useCallback((next: TrackerData) => {
    setData(next);
    // Write to localStorage immediately (sync via saveTrackerData's local path)
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    saveTimeoutRef.current = setTimeout(() => {
      void saveTrackerData(next);
    }, 600);
  }, []);

  function handleSetupComplete(config: CandidateConfig) {
    const fresh: TrackerData = { config, weeklyLogs: [] };
    void saveTrackerData(fresh);
    setData(fresh);
    setPhase("dashboard");
  }

  if (phase === "loading") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="space-y-2 text-center">
          <div className="mx-auto h-6 w-6 animate-spin rounded-full border-2 border-[var(--border)] border-t-[var(--soft-ink)]" />
          <p className="text-xs text-[var(--muted)]">Loading your data...</p>
        </div>
      </div>
    );
  }

  if (phase === "setup") {
    return <SetupForm onComplete={handleSetupComplete} />;
  }

  if (!data) return null;

  return (
    <Dashboard
      data={data}
      onOpenSettings={() => setPhase("setup")}
      onDataChange={persistData}
    />
  );
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

type DashboardProps = {
  data: TrackerData;
  onOpenSettings: () => void;
  onDataChange: (next: TrackerData) => void;
};

function Dashboard({ data, onOpenSettings, onDataChange: _onDataChange }: DashboardProps) {
  const snapshot = buildSnapshot(data.config, data.weeklyLogs);
  const name = data.config.name ?? "You";

  return (
    <div className="min-h-screen text-[var(--foreground)]">
      <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">

        {/* Header */}
        <header className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
              BCBA Hours Tracker
            </p>
            <h1 className="font-serif text-3xl leading-tight sm:text-4xl">
              {name}&rsquo;s flight path
            </h1>
            <p className="text-sm text-[var(--muted)]">
              {snapshot.totalHoursBanked.toFixed(0)} of {snapshot.totalHoursTarget} hrs banked
              &nbsp;&middot;&nbsp;
              {snapshot.hoursRemaining.toFixed(0)} hrs remaining
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => exportTrackerJson(data)}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--soft-ink)] transition hover:bg-[var(--border)]"
            >
              Export JSON
            </button>
            <button
              type="button"
              onClick={onOpenSettings}
              className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2 text-xs font-medium text-[var(--soft-ink)] transition hover:bg-[var(--border)]"
            >
              Settings
            </button>
          </div>
        </header>

        {/* The Three Numbers — always visible, always first */}
        <section aria-label="Pace summary">
          <ThreeNumbers snapshot={snapshot} />
        </section>

        {/* Progress bar */}
        <ProgressSection snapshot={snapshot} />

        {/* Placeholders for upcoming steps */}
        <PlaceholderCard label="Weekly Log Entry" step="Step 4" />
        <PlaceholderCard label="Projection Chart" step="Step 3" />
        <PlaceholderCard label="History Table" step="Step 5" />
        <PlaceholderCard label="What If Lever" step="Step 6" />
      </div>
    </div>
  );
}

function ProgressSection({
  snapshot,
}: {
  snapshot: ReturnType<typeof buildSnapshot>;
}) {
  const pct = Math.min(100, (snapshot.totalHoursBanked / snapshot.totalHoursTarget) * 100);

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-3">
      <div className="flex items-baseline justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
          Total progress
        </p>
        <p className="text-sm font-semibold tabular-nums text-[var(--foreground)]">
          {pct.toFixed(1)}%
        </p>
      </div>
      <div className="h-3 w-full overflow-hidden rounded-full bg-[var(--border)]">
        <div
          className="h-full rounded-full bg-[#2d7a5a] transition-all duration-500"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={Math.round(pct)}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>
      <div className="flex justify-between text-xs text-[var(--muted)] tabular-nums">
        <span>{snapshot.totalHoursBanked.toFixed(1)} hrs banked</span>
        <span>{snapshot.totalHoursTarget} hrs goal</span>
      </div>
    </div>
  );
}

function PlaceholderCard({ label, step }: { label: string; step: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)]/40 px-5 py-8 text-center space-y-1">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--border)]">
        {step}
      </p>
      <p className="text-sm text-[var(--muted)]">{label}</p>
    </div>
  );
}
