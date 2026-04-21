/**
 * Pure calculation engine for the BCBA Hours Tracker.
 *
 * All functions are stateless and receive every value they need as arguments.
 * No seed values, defaults, or constants from outside this module — callers
 * are responsible for supplying config (loaded from localStorage) and logs.
 *
 * Section 10 of the product spec defines every formula used here.
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type WeeklyLog = {
  /** ISO date string for the Monday that starts the logged week (YYYY-MM-DD). */
  weekOf: string;
  unrestrictedHours: number;
  notes?: string;
};

/**
 * Candidate configuration — all values come from localStorage.
 * None of these should ever be hardcoded at the call site.
 */
export type CandidateConfig = {
  name?: string;
  /** "YYYY-MM-DD" */
  goalDate: string;
  totalHoursTarget: number;
  restrictedBanked: number;
  /** Unrestricted hours as of the opening-balance date, before any weekly logs. */
  unrestrictedBanked: number;
  /**
   * The date the opening balance was recorded (YYYY-MM-DD).
   * Used as the chart's starting anchor. Defaults to today if omitted.
   */
  asOfDate?: string;
};

export type TrackingStatus = "ON TRACK" | "AHEAD" | "BEHIND";

/** Full computed snapshot — the single object the UI reads from. */
export type CalculatorSnapshot = {
  today: string;
  goalDate: string;
  totalHoursTarget: number;

  // Banked totals
  totalHoursBanked: number;
  restrictedBanked: number;
  unrestrictedBanked: number;
  loggedHours: number;

  // Pace
  hoursRemaining: number;
  weeksRemaining: number;
  requiredWeeklyPace: number;
  fourWeekRollingAverage: number;
  weeklyDeficitSurplus: number;

  // Projection
  projectedCompletionDate: string | null;
  daysLateOrEarly: number | null;

  // Status
  status: TrackingStatus;
  flightPathSentence: string;
};

// ---------------------------------------------------------------------------
// Date helpers (no external deps — keeps the engine portable)
// ---------------------------------------------------------------------------

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function daysBetween(start: Date, end: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / msPerDay);
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + Math.round(days));
  return copy;
}

function formatLongDate(iso: string): string {
  const d = parseDate(iso);
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

// ---------------------------------------------------------------------------
// Core calculation functions
// ---------------------------------------------------------------------------

/**
 * Total hours banked = restrictedBanked + unrestrictedBanked + sum(weeklyLogs).
 *
 * Restricted hours are fully banked — the only ongoing tracking is unrestricted.
 */
export function calcTotalHoursBanked(
  config: Pick<CandidateConfig, "restrictedBanked" | "unrestrictedBanked">,
  weeklyLogs: WeeklyLog[],
): number {
  const loggedSum = weeklyLogs.reduce((acc, log) => acc + log.unrestrictedHours, 0);
  return config.restrictedBanked + config.unrestrictedBanked + loggedSum;
}

/**
 * Hours remaining = totalHoursTarget − totalHoursBanked.
 * Floors at 0 — cannot be negative.
 */
export function calcHoursRemaining(
  totalHoursTarget: number,
  totalHoursBanked: number,
): number {
  return Math.max(0, totalHoursTarget - totalHoursBanked);
}

/**
 * Weeks remaining = (goalDate − today) / 7.
 * Floors at 0.
 */
export function calcWeeksRemaining(goalDate: string, today: Date): number {
  const goal = parseDate(goalDate);
  const days = daysBetween(today, goal);
  return Math.max(0, days / 7);
}

/**
 * Required weekly pace = hoursRemaining / weeksRemaining.
 * Returns null when weeksRemaining ≤ 0 (goal date has passed).
 */
export function calcRequiredWeeklyPace(
  hoursRemaining: number,
  weeksRemaining: number,
): number | null {
  if (weeksRemaining <= 0) return null;
  return hoursRemaining / weeksRemaining;
}

/**
 * 4-week rolling average of the most recent 4 weekly log entries.
 * Returns 0 when fewer than 1 entry exists.
 */
export function calcFourWeekRollingAverage(weeklyLogs: WeeklyLog[]): number {
  if (weeklyLogs.length === 0) return 0;
  const sorted = [...weeklyLogs].sort((a, b) => b.weekOf.localeCompare(a.weekOf));
  const recent = sorted.slice(0, 4);
  const total = recent.reduce((acc, log) => acc + log.unrestrictedHours, 0);
  return total / recent.length;
}

/**
 * Weekly surplus/deficit = actualLogged − requiredPace.
 * Positive = surplus (ahead), negative = deficit (behind).
 */
export function calcWeeklyDeficitSurplus(
  actualHours: number,
  requiredPace: number,
): number {
  return actualHours - requiredPace;
}

/**
 * Projected completion date = today + (hoursRemaining / rollingAverage) × 7.
 * Returns null when rollingAverage ≤ 0 (cannot project without pace data).
 */
export function calcProjectedCompletionDate(
  today: Date,
  hoursRemaining: number,
  rollingAverage: number,
): string | null {
  if (rollingAverage <= 0) return null;
  if (hoursRemaining <= 0) return formatDate(today);
  const weeksNeeded = hoursRemaining / rollingAverage;
  const projected = addDays(today, weeksNeeded * 7);
  return formatDate(projected);
}

/**
 * Days late or early vs. the goal date.
 * Negative = early (finishes before deadline), positive = late (finishes after).
 * Returns null when projectedDate is null.
 */
export function calcDaysLateOrEarly(
  projectedDate: string | null,
  goalDate: string,
): number | null {
  if (projectedDate === null) return null;
  const projected = parseDate(projectedDate);
  const goal = parseDate(goalDate);
  return daysBetween(goal, projected); // positive = projected is after goal
}

/**
 * Derive tracking status from the gap between required pace and rolling average.
 * Threshold: within ±5% of required pace is ON TRACK.
 */
export function calcStatus(
  requiredPace: number | null,
  rollingAverage: number,
): TrackingStatus {
  if (requiredPace === null || requiredPace === 0) return "ON TRACK";
  const ratio = rollingAverage / requiredPace;
  if (ratio >= 0.95) return ratio > 1.05 ? "AHEAD" : "ON TRACK";
  return "BEHIND";
}

/**
 * Compose the "flight path sentence" that is the motivational core of the app.
 *
 * Examples:
 *   "You are 6.4 hrs/week behind pace. At this rate, you finish February 14, 2027 — 45 days late."
 *   "You are 3.1 hrs/week ahead of pace. At this rate, you finish October 18, 2026 — 74 days early."
 *   "You are exactly on pace. Projected finish: December 31, 2026."
 */
export function buildFlightPathSentence(
  requiredPace: number | null,
  rollingAverage: number,
  projectedDate: string | null,
  daysLateOrEarly: number | null,
  noLogsYet: boolean,
): string {
  if (requiredPace === null) {
    return "Goal date has passed. Update your target date to resume tracking.";
  }

  if (noLogsYet) {
    return `No weeks logged yet. Log your first week to see a projection. Required pace: ${requiredPace.toFixed(1)} hrs/week.`;
  }

  if (projectedDate === null) {
    return `Log at least one week to generate a projection. Required pace: ${requiredPace.toFixed(1)} hrs/week.`;
  }

  const gap = rollingAverage - requiredPace;
  const absGap = Math.abs(gap).toFixed(1);
  const formattedDate = formatLongDate(projectedDate);
  const absDays = daysLateOrEarly !== null ? Math.abs(daysLateOrEarly) : 0;

  if (daysLateOrEarly !== null && daysLateOrEarly > 0) {
    return `You are ${absGap} hrs/week behind pace. At this rate, you finish ${formattedDate} — ${absDays} day${absDays === 1 ? "" : "s"} late.`;
  }

  if (daysLateOrEarly !== null && daysLateOrEarly < 0) {
    return `You are ${absGap} hrs/week ahead of pace. At this rate, you finish ${formattedDate} — ${absDays} day${absDays === 1 ? "" : "s"} early.`;
  }

  return `You are exactly on pace. Projected finish: ${formattedDate}.`;
}

// ---------------------------------------------------------------------------
// What-If projection
// ---------------------------------------------------------------------------

/**
 * Project a completion date assuming a user-specified weekly pace from today forward.
 * Returns null when hypotheticalHours ≤ 0.
 */
export function calcWhatIfProjection(
  today: Date,
  hoursRemaining: number,
  hypotheticalWeeklyHours: number,
): string | null {
  if (hypotheticalWeeklyHours <= 0) return null;
  if (hoursRemaining <= 0) return formatDate(today);
  const weeksNeeded = hoursRemaining / hypotheticalWeeklyHours;
  return formatDate(addDays(today, weeksNeeded * 7));
}

// ---------------------------------------------------------------------------
// Snapshot builder — the single entry point for the UI
// ---------------------------------------------------------------------------

/**
 * Build a complete computed snapshot from config + logs + a reference date.
 *
 * @param config  Loaded from localStorage — never hardcoded.
 * @param weeklyLogs  All logged weeks, in any order.
 * @param today  Reference date (injectable for testing; defaults to now).
 */
export function buildSnapshot(
  config: CandidateConfig,
  weeklyLogs: WeeklyLog[],
  today: Date = new Date(),
): CalculatorSnapshot {
  const loggedHours = weeklyLogs.reduce((acc, l) => acc + l.unrestrictedHours, 0);
  const totalBanked = calcTotalHoursBanked(config, weeklyLogs);
  const remaining = calcHoursRemaining(config.totalHoursTarget, totalBanked);
  const weeksLeft = calcWeeksRemaining(config.goalDate, today);
  const requiredPace = calcRequiredWeeklyPace(remaining, weeksLeft);
  const rollingAvg = calcFourWeekRollingAverage(weeklyLogs);
  const deficitSurplus =
    requiredPace !== null ? calcWeeklyDeficitSurplus(rollingAvg, requiredPace) : 0;
  const projected = calcProjectedCompletionDate(today, remaining, rollingAvg);
  const daysOffset = calcDaysLateOrEarly(projected, config.goalDate);
  const status = calcStatus(requiredPace, rollingAvg);
  const sentence = buildFlightPathSentence(
    requiredPace,
    rollingAvg,
    projected,
    daysOffset,
    weeklyLogs.length === 0,
  );

  return {
    today: formatDate(today),
    goalDate: config.goalDate,
    totalHoursTarget: config.totalHoursTarget,
    totalHoursBanked: Math.round(totalBanked * 100) / 100,
    restrictedBanked: config.restrictedBanked,
    unrestrictedBanked: config.unrestrictedBanked,
    loggedHours: Math.round(loggedHours * 100) / 100,
    hoursRemaining: Math.round(remaining * 100) / 100,
    weeksRemaining: Math.round(weeksLeft * 100) / 100,
    requiredWeeklyPace:
      requiredPace !== null ? Math.round(requiredPace * 100) / 100 : 0,
    fourWeekRollingAverage: Math.round(rollingAvg * 100) / 100,
    weeklyDeficitSurplus: Math.round(deficitSurplus * 100) / 100,
    projectedCompletionDate: projected,
    daysLateOrEarly: daysOffset,
    status,
    flightPathSentence: sentence,
  };
}
