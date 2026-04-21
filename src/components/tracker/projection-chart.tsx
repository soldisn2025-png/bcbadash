"use client";

import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Legend,
} from "recharts";

import {
  calcFourWeekRollingAverage,
  calcHoursRemaining,
  calcTotalHoursBanked,
  type CandidateConfig,
  type WeeklyLog,
  type CalculatorSnapshot,
} from "@/lib/domain/calculator";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChartPoint = {
  date: string;
  label: string;
  target: number;
  actual: number | null;
  projected: number | null;
};

type ProjectionChartProps = {
  config: CandidateConfig;
  weeklyLogs: WeeklyLog[];
  snapshot: CalculatorSnapshot;
};

// ---------------------------------------------------------------------------
// Date helpers (inline — no external dep)
// ---------------------------------------------------------------------------

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function parseDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d, 12);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + Math.round(days) * MS_PER_DAY);
}

function daysBetween(a: Date, b: Date): number {
  return (b.getTime() - a.getTime()) / MS_PER_DAY;
}

function getMondayOf(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  d.setDate(d.getDate() + (day === 0 ? -6 : 1 - day));
  return d;
}

function shortLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function longLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

// ---------------------------------------------------------------------------
// Chart data builder
// ---------------------------------------------------------------------------

function buildChartData(
  config: CandidateConfig,
  weeklyLogs: WeeklyLog[],
  today: Date,
): ChartPoint[] {
  const sortedLogs = [...weeklyLogs].sort((a, b) => a.weekOf.localeCompare(b.weekOf));

  // Cumulative unrestricted hours by logged week
  let running = config.unrestrictedBanked;
  const cumulativeByWeek = new Map<string, number>();
  for (const log of sortedLogs) {
    running += log.unrestrictedHours;
    cumulativeByWeek.set(log.weekOf, running);
  }
  const currentCumulative = running;

  // Pace values
  const rollingAvg = calcFourWeekRollingAverage(weeklyLogs);
  const totalBanked = calcTotalHoursBanked(config, weeklyLogs);
  const remaining = calcHoursRemaining(config.totalHoursTarget, totalBanked);

  // Unrestricted ceiling — the Y value we're trying to reach
  const unrestrictedCeiling = config.totalHoursTarget - config.restrictedBanked;

  // Last logged week (for projection anchor)
  const lastLog = sortedLogs.at(-1);
  const lastLogDate = lastLog ? parseDate(lastLog.weekOf) : today;
  const lastLogCumulative = lastLog
    ? (cumulativeByWeek.get(lastLog.weekOf) ?? currentCumulative)
    : currentCumulative;

  // Projected finish date
  const goalDate = parseDate(config.goalDate);
  const weeksNeeded = rollingAvg > 0 ? remaining / rollingAvg : 0;
  const projectedFinish =
    rollingAvg > 0 ? addDays(today, weeksNeeded * 7) : goalDate;

  // Opening balance anchor — use asOfDate if provided, else first log or today
  const asOfDate = config.asOfDate
    ? parseDate(config.asOfDate)
    : sortedLogs.length > 0
      ? parseDate(sortedLogs[0].weekOf)
      : today;

  // Chart range: start from asOfDate (or a bit before), end past goal/projection
  const chartStart = getMondayOf(addDays(asOfDate, -7));
  const chartEnd = addDays(
    projectedFinish > goalDate ? projectedFinish : goalDate,
    14,
  );

  // Target line: straight from (asOfDate, unrestrictedBanked) to (goalDate, unrestrictedCeiling)
  const totalTargetDays = Math.max(1, daysBetween(asOfDate, goalDate));

  // Generate weekly data points
  const points: ChartPoint[] = [];
  let cursor = getMondayOf(chartStart);

  while (cursor <= chartEnd) {
    const dateStr = formatDate(cursor);
    const daysFromAsOf = daysBetween(asOfDate, cursor);

    // Target: linear from opening balance on asOfDate to ceiling on goalDate
    const targetRaw =
      config.unrestrictedBanked +
      ((unrestrictedCeiling - config.unrestrictedBanked) * daysFromAsOf) / totalTargetDays;
    const target = Math.round(Math.min(Math.max(config.unrestrictedBanked, targetRaw), unrestrictedCeiling) * 10) / 10;

    // Actual: only for logged weeks
    const actual = cumulativeByWeek.has(dateStr)
      ? (cumulativeByWeek.get(dateStr) as number)
      : null;

    // Projected: from last log date forward at rolling average
    let projected: number | null = null;
    if (rollingAvg > 0 && dateStr >= formatDate(lastLogDate)) {
      const weeksFromAnchor = daysBetween(lastLogDate, cursor) / 7;
      const val = lastLogCumulative + rollingAvg * weeksFromAnchor;
      projected = Math.round(Math.min(val, unrestrictedCeiling) * 10) / 10;
    }

    points.push({
      date: dateStr,
      label: shortLabel(cursor),
      target,
      actual,
      projected,
    });

    cursor = addDays(cursor, 7);
  }

  return points;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectionChart({ config, weeklyLogs, snapshot }: ProjectionChartProps) {
  const today = new Date();
  const data = buildChartData(config, weeklyLogs, today);
  const goalDateStr = config.goalDate;
  const hasLogs = weeklyLogs.length > 0;

  const projectedFinish = snapshot.projectedCompletionDate;
  const daysOffset = snapshot.daysLateOrEarly;

  // Y-axis domain — from slightly below opening to slightly above ceiling
  const yMin = Math.max(0, config.unrestrictedBanked - 20);
  const yCeiling = config.totalHoursTarget - config.restrictedBanked;
  const yMax = yCeiling + 20;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
            Projection chart
          </p>
          <p className="text-sm font-medium text-[var(--foreground)]">
            Cumulative unrestricted hours vs. target line
          </p>
        </div>
        {projectedFinish && (
          <div className="text-right shrink-0">
            <p className={`text-sm font-semibold ${daysOffset !== null && daysOffset > 0 ? "text-red-700" : "text-emerald-700"}`}>
              {longLabel(projectedFinish)}
            </p>
            <p className="text-xs text-[var(--muted)]">
              {daysOffset === null
                ? "projected finish"
                : daysOffset > 0
                  ? `${daysOffset}d late`
                  : daysOffset < 0
                    ? `${Math.abs(daysOffset)}d early`
                    : "on target"}
            </p>
          </div>
        )}
      </div>

      {/* Chart */}
      {!hasLogs ? (
        <div className="flex h-52 items-center justify-center rounded-xl border border-dashed border-[var(--border)]">
          <p className="text-sm text-[var(--muted)]">
            Log your first week to see your actual pace vs. the target line.
          </p>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis
              domain={[yMin, yMax]}
              tick={{ fontSize: 11, fill: "var(--muted)" }}
              tickLine={false}
              axisLine={false}
              width={38}
              tickFormatter={(v: number) => `${v}`}
            />
            <Tooltip content={<ChartTooltip goalDate={goalDateStr} ceiling={yCeiling} />} />
            <Legend
              iconType="line"
              wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
            />

            {/* Goal date reference line */}
            <ReferenceLine
              x={data.find((p) => p.date >= goalDateStr)?.label ?? ""}
              stroke="var(--muted)"
              strokeDasharray="3 3"
              label={{ value: "Dec 31", fontSize: 10, fill: "var(--muted)", position: "insideTopRight" }}
            />

            {/* Ceiling reference */}
            <ReferenceLine
              y={yCeiling}
              stroke="var(--border)"
              strokeDasharray="2 4"
            />

            {/* Target */}
            <Line
              name="Target"
              dataKey="target"
              stroke="#9ca3af"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={false}
            />

            {/* Actual — bars make each logged week visually distinct */}
            <Bar
              name="Actual"
              dataKey="actual"
              fill="#2d7a5a"
              fillOpacity={0.85}
              radius={[3, 3, 0, 0]}
              barSize={10}
              isAnimationActive={false}
            />

            {/* Projected */}
            <Line
              name="Projected"
              dataKey="projected"
              stroke={daysOffset !== null && daysOffset > 14 ? "#dc2626" : "#d97706"}
              strokeWidth={2}
              strokeDasharray="6 3"
              dot={false}
              activeDot={{ r: 4 }}
              connectNulls={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}

      {/* Legend gloss */}
      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <LegendItem color="#9ca3af" dash label="Target — pace needed to hit Dec 31" />
        <LegendItem color="#2d7a5a" bar label="Actual — cumulative hours logged" />
        <LegendItem
          color={daysOffset !== null && daysOffset > 14 ? "#dc2626" : "#d97706"}
          dash
          label="Projected — at current 4-week average"
        />
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Tooltip
// ---------------------------------------------------------------------------

function ChartTooltip({
  active,
  payload,
  label,
  goalDate,
  ceiling,
}: {
  active?: boolean;
  payload?: Array<{ name: string; value: number | null; color: string }>;
  label?: string;
  goalDate: string;
  ceiling: number;
}) {
  if (!active || !payload?.length) return null;

  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-3 py-2.5 text-xs shadow-lg space-y-1">
      <p className="font-semibold text-[var(--foreground)]">{label}</p>
      {payload.map((entry) =>
        entry.value !== null ? (
          <p key={entry.name} style={{ color: entry.color }}>
            {entry.name}: {entry.value} hrs
            {entry.name !== "Target" && ` / ${ceiling} goal`}
          </p>
        ) : null,
      )}
    </div>
  );
}

function LegendItem({
  color,
  dash = false,
  bar = false,
  label,
}: {
  color: string;
  dash?: boolean;
  bar?: boolean;
  label: string;
}) {
  return (
    <span className="flex items-center gap-1.5">
      {bar ? (
        <span
          className="inline-block w-2.5 rounded-sm"
          style={{ backgroundColor: color, height: 12, opacity: 0.85 }}
        />
      ) : (
        <span
          className="inline-block w-5 rounded"
          style={{
            backgroundColor: dash ? "transparent" : color,
            borderBottom: dash ? `2px dashed ${color}` : undefined,
            height: dash ? 0 : 2,
          }}
        />
      )}
      {label}
    </span>
  );
}
