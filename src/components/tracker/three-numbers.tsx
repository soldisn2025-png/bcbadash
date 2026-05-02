"use client";

import type { CalculatorSnapshot, TrackingStatus } from "@/lib/domain/calculator";

type ThreeNumbersProps = {
  snapshot: CalculatorSnapshot;
};

/**
 * The Three Numbers — the first thing you see, always visible.
 *
 * 1. Required pace (hrs/week to hit the goal date)
 * 2. Actual pace  (4-week rolling average)
 * 3. Deficit / Surplus (gap, with the "flight path sentence")
 */
export function ThreeNumbers({ snapshot }: ThreeNumbersProps) {
  const {
    requiredMonthlyPace,
    threeMonthAverage,
    monthlyDeficitSurplus,
    flightPathSentence,
    status,
    projectedCompletionDate,
    daysLateOrEarly,
  } = snapshot;

  const tone = statusTone(status, monthlyDeficitSurplus, requiredMonthlyPace);

  return (
    <div className="space-y-4">
      {/* Status badge */}
      <div className="flex items-center gap-3">
        <StatusBadge status={status} tone={tone} />
        {projectedCompletionDate && (
          <span className="text-sm text-[var(--muted)]">
            Projected finish:{" "}
            <span className={`font-semibold ${tone.text}`}>
              {formatLongDate(projectedCompletionDate)}
            </span>
            {daysLateOrEarly !== null && daysLateOrEarly !== 0 && (
              <span className="ml-1 text-[var(--muted)]">
                ({Math.abs(daysLateOrEarly)}d {daysLateOrEarly > 0 ? "late" : "early"})
              </span>
            )}
          </span>
        )}
      </div>

      {/* The Three Numbers */}
      <div className="grid gap-4 sm:grid-cols-3">
        <NumberCard
          label="Required pace"
          sublabel="hrs / month to hit goal"
          value={fmt(requiredMonthlyPace)}
          unit="hrs/mo"
          tone={{ bg: "bg-[var(--card)]", text: "text-[var(--foreground)]", border: "border-[var(--border)]" }}
        />
        <NumberCard
          label="Actual pace"
          sublabel="3-month average"
          value={fmt(threeMonthAverage)}
          unit={threeMonthAverage > 0 ? "hrs/mo" : "no logs yet"}
          tone={{ bg: "bg-[var(--card)]", text: "text-[var(--foreground)]", border: "border-[var(--border)]" }}
        />
        <NumberCard
          label={monthlyDeficitSurplus >= 0 ? "Surplus" : "Deficit"}
          sublabel={monthlyDeficitSurplus >= 0 ? "ahead of required pace" : "behind required pace"}
          value={threeMonthAverage === 0 ? "—" : fmtSigned(monthlyDeficitSurplus)}
          unit={threeMonthAverage > 0 ? "hrs/mo" : ""}
          tone={tone}
          hero
        />
      </div>

      {/* Flight path sentence */}
      <div
        className={`rounded-2xl border px-5 py-4 ${tone.border} ${tone.bg}`}
        role="status"
        aria-live="polite"
      >
        <p className={`text-sm leading-6 font-medium ${tone.text}`}>{flightPathSentence}</p>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function NumberCard({
  label,
  sublabel,
  value,
  unit,
  tone,
  hero = false,
}: {
  label: string;
  sublabel: string;
  value: string;
  unit: string;
  tone: { bg: string; text: string; border: string };
  hero?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 space-y-1 ${tone.border} ${tone.bg}`}
    >
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
        {label}
      </p>
      <p
        className={`font-serif leading-none tabular-nums ${hero ? "text-6xl" : "text-5xl"} ${tone.text}`}
      >
        {value}
      </p>
      <p className="text-xs text-[var(--muted)]">{unit}</p>
      <p className="text-xs text-[var(--muted)] pt-1">{sublabel}</p>
    </div>
  );
}

function StatusBadge({ status, tone }: { status: TrackingStatus; tone: ToneSet }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${tone.border} ${tone.bg} ${tone.text}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          status === "ON TRACK"
            ? "bg-emerald-500"
            : status === "AHEAD"
              ? "bg-emerald-600"
              : "bg-red-500"
        }`}
      />
      {status}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Tone helpers — maps status + deficit magnitude to a consistent color set
// ---------------------------------------------------------------------------

type ToneSet = { bg: string; text: string; border: string };

function statusTone(
  status: TrackingStatus,
  deficit: number,
  required: number,
): ToneSet {
  if (status === "AHEAD" || status === "ON TRACK") {
    return {
      bg: "bg-emerald-50",
      text: "text-emerald-800",
      border: "border-emerald-200",
    };
  }

  // BEHIND — distinguish amber vs red by how far behind
  const deficitRatio = required > 0 ? Math.abs(deficit) / required : 0;
  if (deficitRatio < 0.2) {
    return {
      bg: "bg-amber-50",
      text: "text-amber-800",
      border: "border-amber-200",
    };
  }

  return {
    bg: "bg-red-50",
    text: "text-red-800",
    border: "border-red-200",
  };
}

// ---------------------------------------------------------------------------
// Formatting
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  // e.g. 18.7
  return n.toFixed(1);
}

function fmtSigned(n: number): string {
  if (n === 0) return "0.0";
  return (n > 0 ? "+" : "") + n.toFixed(1);
}

function formatLongDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const d = new Date(year, month - 1, day, 12);
  return d.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
