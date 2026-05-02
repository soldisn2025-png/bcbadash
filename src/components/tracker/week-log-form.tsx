"use client";

import { useState } from "react";

import type { MonthlyLog } from "@/lib/domain/calculator";

type MonthLogFormProps = {
  requiredPace: number;
  existingLogs: MonthlyLog[];
  onSubmit: (log: MonthlyLog) => void;
  onClose: () => void;
};

type ResultCard = {
  hours: number;
  surplus: number;
  newRequiredPace: number;
};

function getCurrentMonth(): string {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

function formatMonthLabel(yyyyMM: string): string {
  const [year, month] = yyyyMM.split("-").map(Number);
  return new Date(year, month - 1, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function WeekLogForm({
  requiredPace,
  existingLogs,
  onSubmit,
  onClose,
}: MonthLogFormProps) {
  const [monthOf, setMonthOf] = useState(getCurrentMonth());
  const [hours, setHours] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState<ResultCard | null>(null);

  const alreadyLogged = existingLogs.some((l) => l.monthOf === monthOf);
  const parsedHours = parseFloat(hours);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!hours || isNaN(parsedHours) || parsedHours < 0) {
      setError("Enter the number of unrestricted hours you worked this month.");
      return;
    }
    if (alreadyLogged) {
      setError("You already have a log for this month. Choose a different month.");
      return;
    }

    setError("");

    const surplus = parsedHours - requiredPace;
    const newRequired = requiredPace - surplus / 9; // approximate; real recalc happens in snapshot
    setResult({ hours: parsedHours, surplus, newRequiredPace: Math.max(0, newRequired) });
  }

  function handleConfirm() {
    if (!result) return;
    onSubmit({ monthOf, unrestrictedHours: result.hours, notes: notes.trim() || undefined });
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
            <h2 className="font-serif text-2xl text-[var(--foreground)]">Log this month</h2>
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
            Required pace: <strong>{requiredPace.toFixed(1)} hrs/month</strong>
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
                  : `${Math.abs(result.surplus).toFixed(1)} hrs short. Push a little harder next month.`}
              </p>
            </div>
            <p className="text-xs text-[var(--muted)]">
              {formatMonthLabel(monthOf)}
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
            {/* Month picker */}
            <div className="space-y-1.5">
              <label className="block text-sm font-medium text-[var(--soft-ink)]">
                Month
              </label>
              <input
                type="month"
                value={monthOf}
                onChange={(e) => { setMonthOf(e.target.value); setError(""); }}
                className="w-full rounded-xl border border-[var(--border)] bg-white px-4 py-3 text-sm text-[var(--foreground)] focus:border-[#122922] focus:outline-none focus:ring-2 focus:ring-[#122922]/20"
              />
              {alreadyLogged && (
                <p className="text-xs text-amber-600">You already logged this month — pick a different month or edit the existing entry.</p>
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
                max={200}
                step={0.5}
                placeholder="e.g. 85"
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
                placeholder="e.g. conference month, short month"
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
