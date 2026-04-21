import type { MonthlyLog, Profile, VerificationStatus } from "@/lib/domain/models";

const DAY_MS = 24 * 60 * 60 * 1000;
const AVERAGE_DAYS_PER_MONTH = 30.4375;
const MONTHLY_PACE_CAP = 130;
const CURRENT_MONTHLY_MIN = 20;
const CURRENT_MONTHLY_MAX = 130;
const FUTURE_MONTHLY_MAX = 160;
const TRANSITION_DATE = "2027-01-01";

export type MonthRow = {
  month: string;
  label: string;
  fieldworkType: MonthlyLog["fieldworkType"];
  restrictedHours: number;
  unrestrictedHours: number;
  supervisionHours: number;
  individualSupervisionHours: number;
  observationCount: number;
  observationMinutes: number;
  verificationStatus: VerificationStatus;
  rawTotal: number;
  countableDelta: number;
  adjustedDelta: number;
  unrestrictedShare: number;
  supervisionPct: number;
  individualSupervisionShare: number;
  expectedRawHours: number;
  varianceRawHours: number;
  cumulativeRawTotal: number;
  cumulativeCountableTotal: number;
  compliance2022: RuleCompliance;
  compliance2027: RuleCompliance;
};

export type TrajectoryPoint = {
  month: string;
  label: string;
  targetRawTotal: number;
  actualRawTotal: number | null;
  actualCountableTotal: number | null;
};

export type ProjectionPoint = {
  label: string;
  completionDate: string | null;
  description: string;
};

export type ScenarioSnapshot = {
  label: string;
  lostHours: number;
  requiredMonthlyAfterMiss: number | null;
  projectedRawFinish: string | null;
  projectedCountableFinish: string | null;
};

export type GuardrailSeverity = "warning" | "caution" | "info";

export type Guardrail = {
  id: string;
  severity: GuardrailSeverity;
  title: string;
  body: string;
};

export type ComplianceStatus = "pass" | "warning" | "fail";

export type ComplianceCheck = {
  id: string;
  label: string;
  status: ComplianceStatus;
  detail: string;
};

export type RuleCompliance = {
  ruleSet: "2022" | "2027";
  status: ComplianceStatus;
  checks: ComplianceCheck[];
};

export type ComplianceSummary = {
  pass: number;
  warning: number;
  fail: number;
};

export type ProfileSnapshot = {
  today: string;
  goalDate: string;
  snapshotAsOfDate: string;
  snapshotMonthLabel: string;
  openingSnapshotRawTotal: number;
  addedAfterSnapshotRawTotal: number;
  ignoredHistoricalRawTotal: number;
  ignoredHistoricalMonthCount: number;
  rawRestricted: number;
  rawUnrestricted: number;
  rawTotal: number;
  countableRestricted: number;
  countableTotal: number;
  lockedRestricted: number;
  adjustedTotal: number;
  unrestrictedShare: number;
  remainingRawGoal: number;
  remainingCountableGoal: number;
  remainingRestrictedGoal: number;
  remainingUnrestrictedGoal: number;
  remainingTargetHours: number;
  weeksLeftToGoal: number;
  monthsLeftToGoal: number;
  hasHistoricalMonths: boolean;
  usesPlannedScheduleForecast: boolean;
  plannedMonthlyRate: number;
  requiredRawWeekly: number | null;
  requiredRawMonthly: number | null;
  requiredCountableMonthly: number | null;
  expectedThisMonthRaw: number;
  expectedByTodayRaw: number;
  currentMonthActualRaw: number;
  currentMonthForecastRaw: number;
  currentMonthGapRaw: number;
  currentMonthCountableDelta: number;
  currentMonthCompliance2022: RuleCompliance | null;
  currentMonthCompliance2027: RuleCompliance | null;
  complianceSummary2022: ComplianceSummary;
  complianceSummary2027: ComplianceSummary;
  realisticRawRate: number;
  optimisticRawRate: number;
  realisticCountableRate: number;
  optimisticCountableRate: number;
  projectedGoalFinish: string | null;
  projectedRawFinish: string | null;
  projectedCountableFinish: string | null;
  optimisticGoalFinish: string | null;
  optimisticRawFinish: string | null;
  optimisticCountableFinish: string | null;
  monthRows: MonthRow[];
  trajectory: TrajectoryPoint[];
  projectionPoints: ProjectionPoint[];
  scenarios: ScenarioSnapshot[];
  guardrails: Guardrail[];
  insights: string[];
};

type PlanMonth = {
  expectedRawHours: number;
  targetRawTotal: number;
};

function parseIsoDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day, 12);
}

function formatIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1, 12);
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0, 12);
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function addMonths(date: Date, months: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + months, 1, 12);
}

function differenceInDays(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / DAY_MS);
}

function monthKey(date: Date): string {
  return formatIsoDate(startOfMonth(date));
}

function monthLabel(date: Date): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    year: "2-digit",
  }).format(date);
}

function clamp(value: number, min = 0, max = Number.POSITIVE_INFINITY): number {
  return Math.min(max, Math.max(min, value));
}

function roundToTwo(value: number): number {
  return Math.round(value * 100) / 100;
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

function getWorstComplianceStatus(statuses: ComplianceStatus[]) {
  if (statuses.includes("fail")) {
    return "fail";
  }

  if (statuses.includes("warning")) {
    return "warning";
  }

  return "pass";
}

function overlapDaysInMonth(monthStartDate: Date, rangeStart: Date, rangeEnd: Date): number {
  if (rangeEnd < rangeStart) {
    return 0;
  }

  const monthEndDate = endOfMonth(monthStartDate);
  const overlapStart = new Date(Math.max(monthStartDate.getTime(), rangeStart.getTime()));
  const overlapEnd = new Date(Math.min(monthEndDate.getTime(), rangeEnd.getTime()));

  if (overlapEnd < overlapStart) {
    return 0;
  }

  return differenceInDays(overlapStart, overlapEnd) + 1;
}

function buildMonthSequence(startDate: Date, endDate: Date): Date[] {
  const start = startOfMonth(startDate);
  const end = startOfMonth(endDate);
  const months: Date[] = [];

  for (let cursor = start; cursor <= end; cursor = addMonths(cursor, 1)) {
    months.push(cursor);
  }

  return months;
}

function calculateCountableTotals(restrictedHours: number, unrestrictedHours: number) {
  const countableRestricted = Math.min(restrictedHours, unrestrictedHours * (2 / 3));
  return {
    countableRestricted,
    countableTotal: unrestrictedHours + countableRestricted,
    lockedRestricted: Math.max(0, restrictedHours - countableRestricted),
  };
}

function getPlannedSchedule(profile: Profile) {
  const weekdayDaysPerWeek = clamp(profile.workSchedule.weekdayDaysPerWeek, 0, 5);
  const weekendDaysPerWeek = clamp(profile.workSchedule.weekendDaysPerWeek, 0, 2);
  const weekdayHoursPerDay = clamp(profile.workSchedule.weekdayHoursPerDay, 0);
  const weekendHoursPerDay = clamp(profile.workSchedule.weekendHoursPerDay, 0);

  return {
    weekdayDaysPerWeek,
    weekendDaysPerWeek,
    weekdayHoursPerDay,
    weekendHoursPerDay,
    weeklyPlannedHours: roundToTwo(
      weekdayDaysPerWeek * weekdayHoursPerDay + weekendDaysPerWeek * weekendHoursPerDay,
    ),
  };
}

function getPlannedMonthlyRate(profile: Profile) {
  const schedule = getPlannedSchedule(profile);
  return roundToTwo((schedule.weeklyPlannedHours * AVERAGE_DAYS_PER_MONTH) / 7);
}

function splitLogsAroundSnapshot(profile: Profile) {
  const snapshotDate = parseIsoDate(profile.openingBalance.asOfDate);
  const snapshotMonthStart = startOfMonth(snapshotDate);
  const countedLogs: MonthlyLog[] = [];
  const ignoredLogs: MonthlyLog[] = [];

  for (const log of profile.monthlyLogs) {
    if (parseIsoDate(log.month) > snapshotMonthStart) {
      countedLogs.push(log);
    } else {
      ignoredLogs.push(log);
    }
  }

  return {
    snapshotDate,
    snapshotMonthStart,
    countedLogs,
    ignoredLogs,
  };
}

function buildComplianceSummary(rows: MonthRow[], key: "compliance2022" | "compliance2027"): ComplianceSummary {
  return rows.reduce<ComplianceSummary>(
    (summary, row) => {
      summary[row[key].status] += 1;
      return summary;
    },
    { pass: 0, warning: 0, fail: 0 },
  );
}

function buildRuleCompliance({
  fieldworkType,
  individualSupervisionHours,
  isCurrentMonth,
  isFutureMonth,
  monthLabel,
  observationCount,
  observationMinutes,
  rawTotal,
  ruleSet,
  supervisionHours,
  unrestrictedHours,
  verificationStatus,
}: {
  fieldworkType: MonthlyLog["fieldworkType"];
  individualSupervisionHours: number;
  isCurrentMonth: boolean;
  isFutureMonth: boolean;
  monthLabel: string;
  observationCount: number;
  observationMinutes: number;
  rawTotal: number;
  ruleSet: "2022" | "2027";
  supervisionHours: number;
  unrestrictedHours: number;
  verificationStatus: VerificationStatus;
}): RuleCompliance {
  if (isFutureMonth) {
    return {
      ruleSet,
      status: "warning",
      checks: [
        {
          id: `${ruleSet}-future`,
          label: "Month status",
          status: "warning",
          detail: `${monthLabel} has not happened yet, so compliance cannot be finalized.`,
        },
      ],
    };
  }

  const minHours = CURRENT_MONTHLY_MIN;
  const maxHours = ruleSet === "2022" ? CURRENT_MONTHLY_MAX : FUTURE_MONTHLY_MAX;
  const requiredSupervisionPct =
    fieldworkType === "concentrated"
      ? ruleSet === "2022"
        ? 0.1
        : 0.075
      : 0.05;
  const requiredObservationCount = ruleSet === "2022" ? 1 : 0;
  const requiredObservationMinutes =
    ruleSet === "2027" ? (fieldworkType === "concentrated" ? 90 : 60) : 0;
  const hoursStatus: ComplianceStatus =
    rawTotal > maxHours ? "fail" : rawTotal >= minHours ? "pass" : isCurrentMonth ? "warning" : "fail";
  const requiredSupervisionHours = rawTotal * requiredSupervisionPct;
  const supervisionStatus: ComplianceStatus =
    rawTotal <= 0
      ? isCurrentMonth
        ? "warning"
        : "fail"
      : supervisionHours >= requiredSupervisionHours
        ? "pass"
        : isCurrentMonth
          ? "warning"
          : "fail";
  const individualShare = supervisionHours > 0 ? individualSupervisionHours / supervisionHours : 0;
  const individualStatus: ComplianceStatus =
    rawTotal <= 0 || supervisionHours <= 0
      ? supervisionStatus
      : individualShare >= 0.5
        ? "pass"
        : isCurrentMonth
          ? "warning"
          : "fail";
  const observationStatus: ComplianceStatus =
    ruleSet === "2022"
      ? observationCount >= requiredObservationCount
        ? "pass"
        : isCurrentMonth
          ? "warning"
          : "fail"
      : observationMinutes >= requiredObservationMinutes
        ? "pass"
        : isCurrentMonth
          ? "warning"
          : "fail";
  const verificationStatusCheck: ComplianceStatus =
    verificationStatus === "signed"
      ? "pass"
      : verificationStatus === "pending"
        ? "warning"
        : "fail";
  const unrestrictedShare = rawTotal > 0 ? unrestrictedHours / rawTotal : 0;
  const unrestrictedStatus: ComplianceStatus = rawTotal <= 0
    ? isCurrentMonth
      ? "warning"
      : "fail"
    : unrestrictedShare >= 0.6
      ? "pass"
      : "warning";

  const checks: ComplianceCheck[] = [
    {
      id: `${ruleSet}-hours`,
      label: "Monthly hours",
      status: hoursStatus,
      detail:
        hoursStatus === "pass"
          ? `${roundToTwo(rawTotal)} hours is inside the ${ruleSet} monthly range of ${minHours}-${maxHours}.`
          : rawTotal > maxHours
            ? `${roundToTwo(rawTotal)} hours is above the ${ruleSet} monthly maximum of ${maxHours}.`
            : `${roundToTwo(rawTotal)} hours is below the ${ruleSet} monthly minimum of ${minHours}.`,
    },
    {
      id: `${ruleSet}-supervision`,
      label: "Supervision hours",
      status: supervisionStatus,
      detail:
        supervisionStatus === "pass"
          ? `${roundToTwo(supervisionHours)} supervision hours meets the ${roundToTwo(requiredSupervisionPct * 100)}% requirement.`
          : `Need ${roundToTwo(Math.max(0, requiredSupervisionHours - supervisionHours))} more supervision hours to satisfy the ${roundToTwo(requiredSupervisionPct * 100)}% requirement.`,
    },
    {
      id: `${ruleSet}-individual`,
      label: "Individual supervision",
      status: individualStatus,
      detail:
        supervisionHours <= 0
          ? "Log supervision hours before the individual-vs-group split can be checked."
          : individualStatus === "pass"
            ? `${roundToTwo(individualShare * 100)}% of supervision was individual, meeting the 50% threshold.`
            : `${roundToTwo(individualShare * 100)}% of supervision was individual. At least 50% must be individual.`,
    },
    {
      id: `${ruleSet}-observation`,
      label: ruleSet === "2022" ? "Client observation count" : "Client observation minutes",
      status: observationStatus,
      detail:
        ruleSet === "2022"
          ? observationStatus === "pass"
            ? `${observationCount} client observation${observationCount === 1 ? "" : "s"} logged.`
            : `Need at least 1 client observation for ${monthLabel}.`
          : observationStatus === "pass"
            ? `${roundToTwo(observationMinutes)} observation minutes meets the ${requiredObservationMinutes}-minute requirement.`
            : `Need ${roundToTwo(Math.max(0, requiredObservationMinutes - observationMinutes))} more observation minutes to satisfy the ${requiredObservationMinutes}-minute requirement.`,
    },
    {
      id: `${ruleSet}-unrestricted`,
      label: "Unrestricted mix",
      status: unrestrictedStatus,
      detail:
        rawTotal <= 0
          ? "No unrestricted work is logged yet."
          : unrestrictedStatus === "pass"
            ? `${roundToTwo(unrestrictedShare * 100)}% of this month's hours were unrestricted.`
            : `${roundToTwo(unrestrictedShare * 100)}% of this month's hours were unrestricted. The 60% unrestricted rule is evaluated across total fieldwork, so this is a caution rather than an automatic month failure.`,
    },
    {
      id: `${ruleSet}-verification`,
      label: "Verification form",
      status: verificationStatusCheck,
      detail:
        verificationStatus === "signed"
          ? "Marked as signed."
          : verificationStatus === "pending"
            ? "Still marked as pending supervisor sign-off."
            : "Marked as not signed, so these hours may not be usable.",
    },
  ];

  return {
    ruleSet,
    status: getWorstComplianceStatus(checks.map((check) => check.status)),
    checks,
  };
}

function buildExpectedPlan(profile: Profile, logs: MonthlyLog[], today: Date) {
  const goalDate = parseIsoDate(profile.goal.targetDate);
  const openingDate = parseIsoDate(profile.openingBalance.asOfDate);
  const planStart = addDays(openingDate, 1);
  const openingRawTotal =
    profile.openingBalance.restrictedHours + profile.openingBalance.unrestrictedHours;
  const rawGapFromOpening = Math.max(0, profile.goal.totalGoalHours - openingRawTotal);
  const totalPlanDays = Math.max(1, differenceInDays(planStart, goalDate) + 1);
  const rawDailyPace = rawGapFromOpening / totalPlanDays;

  const firstLoggedMonth = logs
    .map((log) => parseIsoDate(log.month))
    .sort((left, right) => left.getTime() - right.getTime())[0];

  const planRangeStart = firstLoggedMonth && firstLoggedMonth < startOfMonth(planStart)
    ? firstLoggedMonth
    : planStart;
  const planRangeEndCandidates = [goalDate, today];

  if (firstLoggedMonth) {
    const lastLoggedMonth = logs
      .map((log) => parseIsoDate(log.month))
      .sort((left, right) => right.getTime() - left.getTime())[0];
    if (lastLoggedMonth) {
      planRangeEndCandidates.push(lastLoggedMonth);
    }
  }

  const planRangeEnd = planRangeEndCandidates.sort(
    (left, right) => right.getTime() - left.getTime(),
  )[0];
  const months = buildMonthSequence(planRangeStart, planRangeEnd);
  const plan = new Map<string, PlanMonth>();

  let runningTarget = openingRawTotal;

  for (const monthStartDate of months) {
    const overlapDays = overlapDaysInMonth(monthStartDate, planStart, goalDate);
    const expectedRawHours = roundToTwo(
      clamp(rawDailyPace * overlapDays, 0, profile.goal.totalGoalHours - runningTarget),
    );
    runningTarget = roundToTwo(Math.min(profile.goal.totalGoalHours, runningTarget + expectedRawHours));

    plan.set(monthKey(monthStartDate), {
      expectedRawHours,
      targetRawTotal: runningTarget,
    });
  }

  const currentMonth = startOfMonth(today);
  const currentMonthKey = monthKey(currentMonth);
  const currentMonthPlan = plan.get(currentMonthKey) ?? {
    expectedRawHours: 0,
    targetRawTotal: openingRawTotal,
  };
  const expectedDaysElapsed = overlapDaysInMonth(currentMonth, planStart, today > goalDate ? goalDate : today);
  const expectedByTodayRaw = roundToTwo(rawDailyPace * expectedDaysElapsed);

  return {
    currentMonthPlan,
    expectedByTodayRaw,
    openingRawTotal,
    plan,
    rawDailyPace,
  };
}

function getMonthlyRates(rows: MonthRow[], today: Date) {
  const currentMonth = monthKey(startOfMonth(today));
  const completeRows = rows.filter((row) => row.month < currentMonth);

  const rawRates = completeRows.map((row) => row.rawTotal);
  const countableRates = completeRows.map((row) => row.countableDelta);

  return { rawRates, countableRates };
}

function getWeightedRate(rates: number[]) {
  const recent = [...rates].slice(-3).reverse();
  if (recent.length === 0) {
    return 0;
  }

  const weights = [0.5, 0.3, 0.2];
  const usedWeights = weights.slice(0, recent.length);
  const weightTotal = sum(usedWeights);

  const weighted = recent.reduce((total, rate, index) => {
    return total + rate * usedWeights[index];
  }, 0);

  return roundToTwo(clamp(weighted / weightTotal, 0, MONTHLY_PACE_CAP));
}

function getOptimisticRate(rates: number[]) {
  const recent = [...rates].slice(-4);
  if (recent.length === 0) {
    return 0;
  }

  const selected = recent.sort((left, right) => right - left).slice(0, Math.min(2, recent.length));
  return roundToTwo(clamp(sum(selected) / selected.length, 0, MONTHLY_PACE_CAP));
}

function projectCompletionDate(today: Date, remainingHours: number, monthlyRate: number) {
  if (remainingHours <= 0) {
    return formatIsoDate(today);
  }

  if (monthlyRate <= 0) {
    return null;
  }

  const monthsNeeded = remainingHours / monthlyRate;
  const projected = addDays(today, Math.ceil(monthsNeeded * AVERAGE_DAYS_PER_MONTH));
  return formatIsoDate(projected);
}

function buildScenarios(
  profile: Profile,
  today: Date,
  remainingRawGoal: number,
  remainingCountableGoal: number,
  realisticRawRate: number,
  realisticCountableRate: number,
) {
  const daysLeft = Math.max(0, differenceInDays(today, parseIsoDate(profile.goal.targetDate)) + 1);
  const monthsLeft = daysLeft / AVERAGE_DAYS_PER_MONTH;
  const efficiency =
    realisticRawRate > 0 ? clamp(realisticCountableRate / realisticRawRate, 0, 1) : 0.6;
  const schedule = getPlannedSchedule(profile);

  const scenarios = [
    {
      label: "Miss 1 weekday",
      lostHours: schedule.weekdayHoursPerDay,
    },
    {
      label: "Miss 1 weekend day",
      lostHours: schedule.weekendHoursPerDay,
    },
    {
      label: "Miss 1 planned week",
      lostHours: schedule.weeklyPlannedHours,
    },
  ];

  return scenarios.map((scenario) => {
    const lostCountable = scenario.lostHours * efficiency;
    return {
      label: scenario.label,
      lostHours: roundToTwo(scenario.lostHours),
      requiredMonthlyAfterMiss:
        monthsLeft > 0 ? roundToTwo((remainingRawGoal + scenario.lostHours) / monthsLeft) : null,
      projectedRawFinish: projectCompletionDate(
        today,
        remainingRawGoal + scenario.lostHours,
        realisticRawRate,
      ),
      projectedCountableFinish: projectCompletionDate(
        today,
        remainingCountableGoal + lostCountable,
        realisticCountableRate,
      ),
    };
  });
}

function buildInsights(snapshot: Omit<ProfileSnapshot, "guardrails" | "insights">, profile: Profile) {
  const insights: string[] = [];

  if (snapshot.usesPlannedScheduleForecast) {
    insights.push(
      `No completed monthly history is logged yet, so the finish estimate is using the planned schedule of about ${roundToTwo(snapshot.plannedMonthlyRate)} hours per month.`,
    );
  }

  if (snapshot.ignoredHistoricalRawTotal > 0) {
    insights.push(
      `${roundToTwo(snapshot.ignoredHistoricalRawTotal)} hours from ${snapshot.ignoredHistoricalMonthCount} older monthly row${snapshot.ignoredHistoricalMonthCount === 1 ? "" : "s"} are treated as already included in the ${snapshot.snapshotMonthLabel} opening snapshot, so they are not added again.`,
    );
  }

  if (snapshot.lockedRestricted > 0) {
    insights.push(
      `${roundToTwo(snapshot.lockedRestricted)} restricted hours are still waiting on more unrestricted work before the mix fully catches up.`,
    );
  }

  if (snapshot.remainingRestrictedGoal <= 0 && snapshot.remainingUnrestrictedGoal > 0) {
    insights.push(
      `${profile.name} has already finished the restricted goal. The fastest next win is simply adding unrestricted hours.`,
    );
  }

  if (
    snapshot.requiredRawMonthly !== null &&
    snapshot.realisticRawRate > 0 &&
    snapshot.requiredRawMonthly > snapshot.realisticRawRate
  ) {
    insights.push(
      `To hit ${profile.goal.targetDate}, ${profile.name} needs about ${roundToTwo(
        snapshot.requiredRawMonthly - snapshot.realisticRawRate,
      )} more raw hours per month than the recent average.`,
    );
  }

  if (snapshot.currentMonthGapRaw < 0) {
    insights.push(
      `${profile.name} is ${roundToTwo(Math.abs(snapshot.currentMonthGapRaw))} hours behind this month's pace line so far. A strong unrestricted week would close the gap fastest.`,
    );
  } else {
    insights.push(
      `${profile.name} is ${roundToTwo(snapshot.currentMonthGapRaw)} hours ahead of this month's expected pace so far. Keep the same rhythm to protect the target date.`,
    );
  }

  if (snapshot.projectedCountableFinish && snapshot.projectedCountableFinish >= "2027-01-01") {
    insights.push(
      "The projected finish falls on or after January 1, 2027. Review the upcoming 2027 requirements before relying on this timeline.",
    );
  }

  return insights;
}

function buildGuardrails(
  profile: Profile,
  snapshot: Omit<ProfileSnapshot, "guardrails" | "insights">,
  today: Date,
): Guardrail[] {
  const guardrails: Guardrail[] = [];
  const currentMonthKey = monthKey(startOfMonth(today));
  const completedMonths = snapshot.monthRows.filter((row) => row.month < currentMonthKey);
  const lowMonths = completedMonths.filter((row) => row.rawTotal < CURRENT_MONTHLY_MIN);
  const highMonths = completedMonths.filter((row) => row.rawTotal > CURRENT_MONTHLY_MAX);
  const transitionTriggered =
    profile.goal.targetDate >= TRANSITION_DATE ||
    (snapshot.projectedRawFinish !== null && snapshot.projectedRawFinish >= TRANSITION_DATE) ||
    (snapshot.projectedCountableFinish !== null && snapshot.projectedCountableFinish >= TRANSITION_DATE);

  if (snapshot.requiredRawMonthly !== null && snapshot.requiredRawMonthly > CURRENT_MONTHLY_MAX) {
    const stretchContext =
      snapshot.requiredRawMonthly <= FUTURE_MONTHLY_MAX
        ? `That is above the current 2022 monthly maximum of ${CURRENT_MONTHLY_MAX} hours. The 2027 maximum is ${FUTURE_MONTHLY_MAX}, but the forms and concentrated supervision rules also change on ${TRANSITION_DATE}.`
        : `That is above both the current 2022 monthly maximum of ${CURRENT_MONTHLY_MAX} hours and the 2027 monthly maximum of ${FUTURE_MONTHLY_MAX} hours.`;

    guardrails.push({
      id: "goal-monthly-cap",
      severity: "warning",
      title: "Goal date requires more hours than the current monthly cap allows",
      body: `${profile.name} needs about ${roundToTwo(snapshot.requiredRawMonthly)} hours per month to hit ${profile.goal.targetDate}. ${stretchContext}`,
    });
  }

  if (snapshot.currentMonthForecastRaw > CURRENT_MONTHLY_MAX) {
    guardrails.push({
      id: "current-month-over-cap",
      severity: "warning",
      title: "This month's forecast is above the 2022 monthly maximum",
      body: `The current forecast lands near ${roundToTwo(snapshot.currentMonthForecastRaw)} hours for the month. Under the 2022 requirements, a supervisory period should stay between ${CURRENT_MONTHLY_MIN} and ${CURRENT_MONTHLY_MAX} hours.`,
    });
  } else if (snapshot.currentMonthForecastRaw > 0 && snapshot.currentMonthForecastRaw < CURRENT_MONTHLY_MIN) {
    guardrails.push({
      id: "current-month-under-min",
      severity: "caution",
      title: "This month's forecast is below the usual minimum accrual",
      body: `The month is currently pacing toward about ${roundToTwo(snapshot.currentMonthForecastRaw)} hours. Under the 2022 requirements, supervisory periods usually need at least ${CURRENT_MONTHLY_MIN} hours.`,
    });
  }

  if (lowMonths.length > 0) {
    const labels = lowMonths.slice(0, 2).map((row) => row.label).join(", ");
    guardrails.push({
      id: "historical-low-months",
      severity: "caution",
      title: "Some completed months fell below the usual minimum",
      body: `${labels}${lowMonths.length > 2 ? " and others" : ""} finished under ${CURRENT_MONTHLY_MIN} hours. Those months are worth checking against signed verification forms.`,
    });
  }

  if (highMonths.length > 0) {
    const labels = highMonths.slice(0, 2).map((row) => row.label).join(", ");
    guardrails.push({
      id: "historical-high-months",
      severity: "warning",
      title: "Some completed months exceeded the current 2022 cap",
      body: `${labels}${highMonths.length > 2 ? " and others" : ""} finished above ${CURRENT_MONTHLY_MAX} hours. If those months were tracked under 2022 forms, revisit what can actually count.`,
    });
  }

  if (snapshot.rawTotal >= profile.goal.totalGoalHours && snapshot.countableTotal < profile.goal.totalGoalHours) {
    guardrails.push({
      id: "raw-total-not-ready",
      severity: "warning",
      title: "The 2,000-hour total can arrive before the mix is fully usable",
      body: `${profile.name} has already logged ${roundToTwo(snapshot.rawTotal)} total hours, but the current restricted versus unrestricted mix means only ${roundToTwo(snapshot.countableTotal)} is fully usable right now.`,
    });
  }

  if (snapshot.remainingUnrestrictedGoal > 0 || snapshot.lockedRestricted > 0) {
    guardrails.push({
      id: "unrestricted-shortfall",
      severity: "caution",
      title: "Unrestricted work is still the main unlock",
      body: `${profile.name} still needs ${roundToTwo(snapshot.remainingUnrestrictedGoal)} unrestricted hours, and ${roundToTwo(snapshot.lockedRestricted)} restricted hours are currently locked by the 60/40 mix requirement.`,
    });
  }

  if (transitionTriggered) {
    guardrails.push({
      id: "transition-2027",
      severity: "info",
      title: "The timeline touches the January 1, 2027 transition",
      body: `Because the goal date or projected finish reaches ${TRANSITION_DATE}, double-check which Monthly and Final Fieldwork Verification Forms you will need. The 2027 rules raise the monthly maximum to ${FUTURE_MONTHLY_MAX} hours and change concentrated supervision from 10% to 7.5%.`,
    });
  }

  return guardrails;
}

export function buildProfileSnapshot(profile: Profile, today = new Date()): ProfileSnapshot {
  const currentMonth = startOfMonth(today);
  const currentMonthKey = monthKey(currentMonth);
  const { countedLogs, ignoredLogs, snapshotDate, snapshotMonthStart } = splitLogsAroundSnapshot(profile);
  const plannedMonthlyRate = getPlannedMonthlyRate(profile);
  const { plan, currentMonthPlan, expectedByTodayRaw, openingRawTotal } = buildExpectedPlan(
    profile,
    countedLogs,
    today,
  );
  const openingTotals = calculateCountableTotals(
    profile.openingBalance.restrictedHours,
    profile.openingBalance.unrestrictedHours,
  );
  const sortedLogs = [...countedLogs].sort((left, right) => left.month.localeCompare(right.month));
  const ignoredHistoricalRawTotal = roundToTwo(
    ignoredLogs.reduce((total, log) => total + log.restrictedHours + log.unrestrictedHours, 0),
  );

  let runningRestricted = profile.openingBalance.restrictedHours;
  let runningUnrestricted = profile.openingBalance.unrestrictedHours;
  let runningCountable = openingTotals.countableTotal;
  let runningAdjusted =
    profile.openingBalance.adjustedTotalOverride ?? openingRawTotal;

  const monthRows: MonthRow[] = sortedLogs.map((log) => {
    const logMonthDate = parseIsoDate(log.month);
    const isCurrentMonth = log.month === currentMonthKey;
    const isFutureMonth = logMonthDate > currentMonth;
    runningRestricted += log.restrictedHours;
    runningUnrestricted += log.unrestrictedHours;

    const countableTotals = calculateCountableTotals(runningRestricted, runningUnrestricted);
    const countableDelta = countableTotals.countableTotal - runningCountable;
    runningCountable = countableTotals.countableTotal;

    const adjustedDelta =
      (log.restrictedHours + log.unrestrictedHours) *
      (log.fieldworkType === "concentrated" ? 1.33 : 1);
    runningAdjusted += adjustedDelta;

    const monthPlan = plan.get(log.month) ?? {
      expectedRawHours: 0,
      targetRawTotal: openingRawTotal,
    };

    return {
      month: log.month,
      label: monthLabel(parseIsoDate(log.month)),
      fieldworkType: log.fieldworkType,
      restrictedHours: log.restrictedHours,
      unrestrictedHours: log.unrestrictedHours,
      supervisionHours: roundToTwo(log.supervisionHours),
      individualSupervisionHours: roundToTwo(log.individualSupervisionHours),
      observationCount: log.observationCount,
      observationMinutes: roundToTwo(log.observationMinutes),
      verificationStatus: log.verificationStatus,
      rawTotal: roundToTwo(log.restrictedHours + log.unrestrictedHours),
      countableDelta: roundToTwo(countableDelta),
      adjustedDelta: roundToTwo(adjustedDelta),
      unrestrictedShare:
        log.restrictedHours + log.unrestrictedHours > 0
          ? roundToTwo(log.unrestrictedHours / (log.restrictedHours + log.unrestrictedHours))
          : 0,
      supervisionPct:
        log.restrictedHours + log.unrestrictedHours > 0
          ? roundToTwo(log.supervisionHours / (log.restrictedHours + log.unrestrictedHours))
          : 0,
      individualSupervisionShare:
        log.supervisionHours > 0 ? roundToTwo(log.individualSupervisionHours / log.supervisionHours) : 0,
      expectedRawHours: monthPlan.expectedRawHours,
      varianceRawHours: roundToTwo(log.restrictedHours + log.unrestrictedHours - monthPlan.expectedRawHours),
      cumulativeRawTotal: roundToTwo(runningRestricted + runningUnrestricted),
      cumulativeCountableTotal: roundToTwo(runningCountable),
      compliance2022: buildRuleCompliance({
        fieldworkType: log.fieldworkType,
        individualSupervisionHours: log.individualSupervisionHours,
        isCurrentMonth,
        isFutureMonth,
        monthLabel: monthLabel(logMonthDate),
        observationCount: log.observationCount,
        observationMinutes: log.observationMinutes,
        rawTotal: log.restrictedHours + log.unrestrictedHours,
        ruleSet: "2022",
        supervisionHours: log.supervisionHours,
        unrestrictedHours: log.unrestrictedHours,
        verificationStatus: log.verificationStatus,
      }),
      compliance2027: buildRuleCompliance({
        fieldworkType: log.fieldworkType,
        individualSupervisionHours: log.individualSupervisionHours,
        isCurrentMonth,
        isFutureMonth,
        monthLabel: monthLabel(logMonthDate),
        observationCount: log.observationCount,
        observationMinutes: log.observationMinutes,
        rawTotal: log.restrictedHours + log.unrestrictedHours,
        ruleSet: "2027",
        supervisionHours: log.supervisionHours,
        unrestrictedHours: log.unrestrictedHours,
        verificationStatus: log.verificationStatus,
      }),
    };
  });

  const rawRestricted = roundToTwo(runningRestricted);
  const rawUnrestricted = roundToTwo(runningUnrestricted);
  const rawTotal = roundToTwo(rawRestricted + rawUnrestricted);
  const currentTotals = calculateCountableTotals(rawRestricted, rawUnrestricted);
  const countableTotal = roundToTwo(currentTotals.countableTotal);
  const countableRestricted = roundToTwo(currentTotals.countableRestricted);
  const lockedRestricted = roundToTwo(currentTotals.lockedRestricted);
  const adjustedTotal = roundToTwo(runningAdjusted);
  const unrestrictedShare = rawTotal > 0 ? roundToTwo(rawUnrestricted / rawTotal) : 0;
  const addedAfterSnapshotRawTotal = roundToTwo(rawTotal - openingRawTotal);

  const goalDate = parseIsoDate(profile.goal.targetDate);
  const daysLeft = Math.max(0, differenceInDays(today, goalDate) + 1);
  const weeksLeftToGoal = roundToTwo(daysLeft / 7);
  const monthsLeftToGoal = roundToTwo(daysLeft / AVERAGE_DAYS_PER_MONTH);

  const remainingRawGoal = roundToTwo(Math.max(0, profile.goal.totalGoalHours - rawTotal));
  const remainingCountableGoal = roundToTwo(
    Math.max(0, profile.goal.totalGoalHours - countableTotal),
  );
  const remainingRestrictedGoal = roundToTwo(
    Math.max(0, profile.goal.restrictedGoalHours - rawRestricted),
  );
  const remainingUnrestrictedGoal = roundToTwo(
    Math.max(0, profile.goal.unrestrictedGoalHours - rawUnrestricted),
  );
  const remainingTargetHours = roundToTwo(remainingRestrictedGoal + remainingUnrestrictedGoal);

  const requiredRawWeekly =
    daysLeft > 0 ? roundToTwo(remainingRawGoal / Math.max(daysLeft / 7, 0.01)) : null;
  const requiredRawMonthly =
    daysLeft > 0 ? roundToTwo(remainingRawGoal / Math.max(daysLeft / AVERAGE_DAYS_PER_MONTH, 0.01)) : null;
  const requiredCountableMonthly =
    daysLeft > 0
      ? roundToTwo(remainingCountableGoal / Math.max(daysLeft / AVERAGE_DAYS_PER_MONTH, 0.01))
      : null;

  const currentMonthRow = monthRows.find((row) => row.month === currentMonthKey);
  const currentMonthActualRaw = currentMonthRow?.rawTotal ?? 0;
  const currentMonthCountableDelta = currentMonthRow?.countableDelta ?? 0;
  const currentMonthGapRaw = roundToTwo(currentMonthActualRaw - expectedByTodayRaw);
  const complianceSummary2022 = buildComplianceSummary(monthRows, "compliance2022");
  const complianceSummary2027 = buildComplianceSummary(monthRows, "compliance2027");

  const elapsedDaysInMonth = today.getDate();
  const daysInCurrentMonth = endOfMonth(today).getDate();

  const { rawRates, countableRates } = getMonthlyRates(monthRows, today);
  const hasHistoricalMonths = rawRates.length > 0;
  const usesPlannedScheduleForecast = !hasHistoricalMonths;
  const realisticRawRate = usesPlannedScheduleForecast ? plannedMonthlyRate : getWeightedRate(rawRates);
  const optimisticRawRate = usesPlannedScheduleForecast ? plannedMonthlyRate : getOptimisticRate(rawRates);
  const realisticCountableRate = usesPlannedScheduleForecast
    ? plannedMonthlyRate
    : getWeightedRate(countableRates);
  const optimisticCountableRate = usesPlannedScheduleForecast
    ? plannedMonthlyRate
    : getOptimisticRate(countableRates);
  const historyDailyRaw = realisticRawRate > 0 ? realisticRawRate / AVERAGE_DAYS_PER_MONTH : 0;
  const currentDailyRaw = elapsedDaysInMonth > 0 ? currentMonthActualRaw / elapsedDaysInMonth : 0;
  const blendedDailyRaw =
    currentMonthActualRaw > 0 && historyDailyRaw > 0
      ? currentDailyRaw * 0.6 + historyDailyRaw * 0.4
      : currentDailyRaw || historyDailyRaw;
  const currentMonthForecastRaw = roundToTwo(
    Math.max(currentMonthActualRaw, blendedDailyRaw * daysInCurrentMonth),
  );

  const projectedGoalFinish = projectCompletionDate(today, remainingTargetHours, realisticRawRate);
  const projectedRawFinish = projectCompletionDate(today, remainingRawGoal, realisticRawRate);
  const projectedCountableFinish = projectCompletionDate(
    today,
    remainingCountableGoal,
    realisticCountableRate,
  );
  const optimisticGoalFinish = projectCompletionDate(today, remainingTargetHours, optimisticRawRate);
  const optimisticRawFinish = projectCompletionDate(today, remainingRawGoal, optimisticRawRate);
  const optimisticCountableFinish = projectCompletionDate(
    today,
    remainingCountableGoal,
    optimisticCountableRate,
  );

  const trajectoryMonths = buildMonthSequence(
    parseIsoDate(profile.openingBalance.asOfDate),
    [
      goalDate,
      today,
      projectedCountableFinish ? parseIsoDate(projectedCountableFinish) : today,
    ].sort((left, right) => right.getTime() - left.getTime())[0],
  );
  const rowMap = new Map(monthRows.map((row) => [row.month, row]));
  const trajectory: TrajectoryPoint[] = trajectoryMonths.map((monthStartDate) => {
    const key = monthKey(monthStartDate);
    const planPoint = plan.get(key) ?? { expectedRawHours: 0, targetRawTotal: openingRawTotal };
    const actualPoint = rowMap.get(key);

    return {
      month: key,
      label: monthLabel(monthStartDate),
      targetRawTotal: planPoint.targetRawTotal,
      actualRawTotal: actualPoint?.cumulativeRawTotal ?? null,
      actualCountableTotal: actualPoint?.cumulativeCountableTotal ?? null,
    };
  });

  const projectionPoints: ProjectionPoint[] = [
    {
      label: "User goal",
      completionDate: profile.goal.targetDate,
      description: "The target date you chose.",
    },
    {
      label: usesPlannedScheduleForecast ? "Planned pace" : "Likely finish",
      completionDate: projectedGoalFinish,
      description: usesPlannedScheduleForecast
        ? "Using your weekday and weekend schedule because there is no completed month history yet."
        : "Based on your completed months continuing at a similar pace.",
    },
    {
      label: "Optimistic",
      completionDate: optimisticGoalFinish,
      description: usesPlannedScheduleForecast
        ? "This is the day you can reach if you hit the full planned schedule every month."
        : "Based on stronger completed months repeating.",
    },
  ];

  const snapshotWithoutInsights = {
    today: formatIsoDate(today),
    goalDate: profile.goal.targetDate,
    snapshotAsOfDate: formatIsoDate(snapshotDate),
    snapshotMonthLabel: monthLabel(snapshotMonthStart),
    openingSnapshotRawTotal: roundToTwo(openingRawTotal),
    addedAfterSnapshotRawTotal,
    ignoredHistoricalRawTotal,
    ignoredHistoricalMonthCount: ignoredLogs.length,
    rawRestricted,
    rawUnrestricted,
    rawTotal,
    countableRestricted,
    countableTotal,
    lockedRestricted,
    adjustedTotal,
    unrestrictedShare,
    remainingRawGoal,
    remainingCountableGoal,
    remainingRestrictedGoal,
    remainingUnrestrictedGoal,
    remainingTargetHours,
    weeksLeftToGoal,
    monthsLeftToGoal,
    hasHistoricalMonths,
    usesPlannedScheduleForecast,
    plannedMonthlyRate,
    requiredRawWeekly,
    requiredRawMonthly,
    requiredCountableMonthly,
    expectedThisMonthRaw: currentMonthPlan.expectedRawHours,
    expectedByTodayRaw: roundToTwo(expectedByTodayRaw),
    currentMonthActualRaw,
    currentMonthForecastRaw,
    currentMonthGapRaw,
    currentMonthCountableDelta,
    currentMonthCompliance2022: currentMonthRow?.compliance2022 ?? null,
    currentMonthCompliance2027: currentMonthRow?.compliance2027 ?? null,
    complianceSummary2022,
    complianceSummary2027,
    realisticRawRate,
    optimisticRawRate,
    realisticCountableRate,
    optimisticCountableRate,
    projectedGoalFinish,
    projectedRawFinish,
    projectedCountableFinish,
    optimisticGoalFinish,
    optimisticRawFinish,
    optimisticCountableFinish,
    monthRows,
    trajectory,
    projectionPoints,
    scenarios: buildScenarios(
      profile,
      today,
      remainingRawGoal,
      remainingCountableGoal,
      realisticRawRate,
      realisticCountableRate,
    ),
  };
  const guardrails = buildGuardrails(profile, snapshotWithoutInsights, today);

  return {
    ...snapshotWithoutInsights,
    guardrails,
    insights: buildInsights(snapshotWithoutInsights, profile),
  };
}
