"use client";

import { useState } from "react";

import type { WeeklyLog } from "@/lib/domain/calculator";

type WeekLogFormProps = {
  requiredPace: number;
  existingLogs: WeeklyLog[];
  onSubmit: (log: WeeklyLog) => void;
  onClose: () => void;
};

type ResultCard = {
  hours: number;
  surplus: number;
  newRequiredPace: number;
};

function getCurrentMonday(): string {
  const today = new Date();
  const day = today.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + diff);
  return monday.toISOString().split("T")[0];
}

function formatWeekLabel(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

export function WeekLogForm({
  requiredPace,
  existingLogs,
  onSubmit,
  onClose,
}: WeekLogFormProps) {
  const [weekOf, setWeekOf] = useState(getCurrentMonday());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultCard | null>(null);

  const alreadyLogged = existingLogs.some((l) => l.weekOf === weekOf);
  const parsedHours = parseFloat(hours);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!hours || isNaN(parsedHours) || parsedHours < 0) {
      setError("Enter the number of unrestricted hours you worked this week.");
      return;
    }
    if (parsedHours > 40) {
      // Warn but don't block — unrestricted work can span multiple settings in one week
    }
    if (alreadyLogged) {
      setError("You already have a log for this week. Choose a different week.");
      return;
    }

    setError("");

    const surplus = parsedHours - requiredPace;
    // Compute what the new required pace will be after this log is added
    // (rough estimate: surplus carries forward, divided over remaining weeks)
    const newRequired = requiredPace - surplus / 36; // approximate; real recalc happens in snapshot
    setResult({ hours: parsedHours, surplus, newRequiredPace: Math.max(0, newRequired) });
  }

  function handleConfirm() {
    if (!result) return;
    onSubmit({ weekOf, unrestrictedHours: result.hours, notes: notes.trim() || undefined });
  }

  const isAhead = result && result.surplus >= 0;

  return (
    // Backdrop
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="w-full max-w-md rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-2xl">
        <div className="px-6 pt-6 pb-2">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl text-[var(--foreground)]">Log this week</h2>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl p-2 text-[var(--muted)] transition hover:bg-[var(--border)]"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Required pace: <strong>{requiredPace.toFixed(1)} hrs/week</strong>
          </p>
        </div>

        {result ? (
          // Result card
          <div className="px-6 pb-6 pt-4 space-y-5">
            <div
              className={`rounded-2xl border p-5 space-y-2 ${
                isAhead
                  ? "border-emerald-200 bg-emerald-50"
                  : "border-amber-200 bg-amber-50"
              }`}
            >
              <p className={`text-2xl font-serif ${isAhead ? "text-emerald-800" : "text-amber-800"}`}>
                {isAhead ? "✓" : "⚠"} You logged {result.hours} hrs
              </p>
              <p className={`text-sm leading-6 ${isAhead ? "text-emerald-700" : "text-amber-700"}`}>
                {isAhead
                  ? `${Math.abs(result.surplus).toFixed(1)} hrs ahead of target. Keep it up.`
                  : `${Math.abs(result.surplus).toFixed(1)} hrs short. Push a little harder next week.`}
              </p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              Week of {formatWeekLabel(weekOf)}
              {notes ? ` · ${notes}` : ""}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 rounded-2xl bg-[#122922] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#1a3d33]"
              >
                Save and close
              </button>
              <button
                type="button"
                onClick={() => setResult(null)}
                className="rounded-2xl border border-[var(--border)] px-4 py-3 text-sm font-medium text-[var(--soft-ink)] transition hover:bg-[var(--border)]"
              >
                Edit
              </button>
            </div>
          </div>
        ) : (
          // Entry form
          <form onSubmit={handleSubmit} noValidate className="px-6 pb-6 pt-4 space-y-5">
            {/* Week picker */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--soft-ink)]">
                Week of (Monday)
              </label>
              <input
                type="date"
                value={weekOf}
                onChange={(e) => { setWeekOf(e.target.value); setError(""); }}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] focus:border-[#122922] focus:outline-none focus:ring-2 focus:ring-[#122922]/20"
              />
              {alreadyLogged && (
                <p className="text-xs text-amber-600">You already logged this week — pick a different week or edit the existing entry.</p>
              )}
            </div>

            {/* Hours */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--soft-ink)]">
                Unrestricted hours logged
              </label>
              <input
                type="number"
                value={hours}
                min={0}
                max={40}
                step={0.5}
                placeholder="e.g. 19.5"
                onChange={(e) => { setHours(e.target.value); setError(""); }}
                autoFocus
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] focus:border-[#122922] focus:outline-none focus:ring-2 focus:ring-[#122922]/20"
              />
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--soft-ink)]">
                Notes <span className="font-normal text-[var(--muted)]">(optional)</span>
              </label>
              <input
                type="text"
                value={notes}
                placeholder="e.g. conference week, short week"
                onChange={(e) => setNotes(e.target.value)}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] focus:border-[#122922] focus:outline-none focus:ring-2 focus:ring-[#122922]/20 placeholder:text-[var(--muted)]"
              />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <button
              type="submit"
              className="w-full rounded-2xl bg-[#122922] px-4 py-4 text-sm font-semibold text-white transition hover:bg-[#1a3d33] active:scale-[0.98]"
            >
              See how I did
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
