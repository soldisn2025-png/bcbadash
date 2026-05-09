import { buildSnapshot, type CandidateConfig, type MonthlyLog } from "@/lib/domain/calculator";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BDS_LEAD_MONTHS = 3;

export type StudyModuleId = "hoom-house" | "bds";

export type StudyModuleRecommendation = {
  provider: StudyModuleId;
  label: string;
  domain: string;
  detail: string;
};

export type StudyWeek = {
  weekStart: string;
  weekEnd: string;
  phase: "hours-first" | "hoom-house" | "bds-window" | "exam-week" | "done";
  focus: string;
  targetHours: number;
  modules: StudyModuleId[];
  moduleRecommendation: StudyModuleRecommendation;
  tasks: string[];
  reminder: string;
};

const HOOM_HOUSE_SEQUENCE: StudyModuleRecommendation[] = [
  {
    provider: "hoom-house",
    label: "Hoom House: Concepts & Principles",
    domain: "Domain B",
    detail: "Start with Concepts & Principles, including stimulus and response classes, verbal behavior, and motivating operations.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Measurement, Data Display, & Interpretation",
    domain: "Domain C",
    detail: "Work through measurement, operational definitions, graphing, and data interpretation.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Behavior Change Procedures I",
    domain: "Domain G",
    detail: "Focus on reinforcement, punishment, prompting, shaping, and prompt fading.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Behavior Change Procedures II/III",
    domain: "Domain G",
    detail: "Study task analysis, chains, extinction, discrimination, generalization, and maintenance.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Behavior Assessment",
    domain: "Domain F",
    detail: "Review FBA methods, preference assessments, descriptive assessment, and functional analysis.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Ethics",
    domain: "Domain E",
    detail: "Review ethical decision making, confidentiality, boundaries, competence, and professional conduct.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Selecting and Implementing Interventions",
    domain: "Domain H",
    detail: "Study intervention goals, contextual fit, social validity, relapse, and data-based decisions.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Personnel Supervision and Management",
    domain: "Domain I",
    detail: "Review supervision, feedback, training, monitoring performance, and management systems.",
  },
  {
    provider: "hoom-house",
    label: "Hoom House: Experimental Design",
    domain: "Domain D",
    detail: "Review reversal, multielement, multiple baseline, changing criterion, and validity threats.",
  },
];

const BDS_SEQUENCE: StudyModuleRecommendation[] = [
  {
    provider: "bds",
    label: "BDS: Domain G mastery modules",
    domain: "Domain G",
    detail: "Prioritize behavior-change procedures, then review missed items in Hoom House if a concept is shaky.",
  },
  {
    provider: "bds",
    label: "BDS: Domain B mastery modules",
    domain: "Domain B",
    detail: "Prioritize concepts and principles with active responding until the explanations feel automatic.",
  },
  {
    provider: "bds",
    label: "BDS: Domain F mastery modules",
    domain: "Domain F",
    detail: "Focus on assessment decisions, FBA logic, preference assessment, and functional analysis.",
  },
  {
    provider: "bds",
    label: "BDS: Domain E mastery modules",
    domain: "Domain E",
    detail: "Practice ethics application questions and write down the rule behind each missed item.",
  },
  {
    provider: "bds",
    label: "BDS: Domain C mastery modules",
    domain: "Domain C",
    detail: "Focus on measurement selection, graph interpretation, validity, reliability, and procedural integrity.",
  },
  {
    provider: "bds",
    label: "BDS: Domain H mastery modules",
    domain: "Domain H",
    detail: "Practice choosing interventions from assessment results, client context, and data.",
  },
  {
    provider: "bds",
    label: "BDS: Domain I mastery modules",
    domain: "Domain I",
    detail: "Review staff training, feedback, supervision systems, and performance monitoring.",
  },
  {
    provider: "bds",
    label: "BDS: Domains A and D mastery modules",
    domain: "Domains A/D",
    detail: "Cover foundations and experimental design, then fold misses into mixed review.",
  },
];

export type StudyScheduleSnapshot = {
  examDate: string;
  suggestedExamDate: string;
  hoursReadyDate: string | null;
  bdsStartDate: string;
  weeksUntilExam: number;
  weeksUntilBds: number;
  currentWeek: StudyWeek;
  upcomingWeeks: StudyWeek[];
  recommendation: {
    fieldworkPaceMonthly: number;
    fieldworkPressure: "light" | "steady" | "heavy";
    studyHoursBasis: string;
  };
  moduleAccess: {
    hoomHouse: "available";
    bds: "locked" | "available";
  };
};

export function buildStudyScheduleSnapshot(
  config: CandidateConfig,
  monthlyLogs: MonthlyLog[],
  today: Date = new Date(),
): StudyScheduleSnapshot {
  const hoursSnapshot = buildSnapshot(config, monthlyLogs, today);
  const todayIso = formatDate(today);
  const hoursReadyDate =
    hoursSnapshot.hoursRemaining <= 0
      ? todayIso
      : hoursSnapshot.projectedCompletionDate ?? config.goalDate;
  const suggestedExamDate = formatDate(addMonths(parseDate(hoursReadyDate), DEFAULT_BDS_LEAD_MONTHS));
  const examDate = config.examDate || suggestedExamDate;
  const bdsLeadMonths = config.bdsAccessLeadMonths ?? DEFAULT_BDS_LEAD_MONTHS;
  const bdsStartDate = formatDate(addMonths(parseDate(examDate), -bdsLeadMonths));
  const moduleAccess = {
    hoomHouse: "available" as const,
    bds: todayIso >= bdsStartDate ? ("available" as const) : ("locked" as const),
  };

  const currentWeekStart = startOfWeek(today);
  const upcomingWeeks = Array.from({ length: 6 }, (_, index) =>
    buildStudyWeek({
      weekStart: addDays(currentWeekStart, index * 7),
      weekIndex: index,
      fieldworkPaceMonthly: hoursSnapshot.requiredMonthlyPace,
      fieldworkPressure: getFieldworkPressure(hoursSnapshot.requiredMonthlyPace),
      examDate,
      hoursReadyDate,
      bdsStartDate,
      todayIso,
    }),
  );

  return {
    examDate,
    suggestedExamDate,
    hoursReadyDate,
    bdsStartDate,
    weeksUntilExam: Math.max(0, Math.ceil(daysBetween(today, parseDate(examDate)) / 7)),
    weeksUntilBds: Math.max(0, Math.ceil(daysBetween(today, parseDate(bdsStartDate)) / 7)),
    currentWeek: upcomingWeeks[0],
    upcomingWeeks,
    recommendation: {
      fieldworkPaceMonthly: hoursSnapshot.requiredMonthlyPace,
      fieldworkPressure: getFieldworkPressure(hoursSnapshot.requiredMonthlyPace),
      studyHoursBasis: buildStudyHoursBasis(hoursSnapshot.requiredMonthlyPace, hoursReadyDate, bdsStartDate, examDate),
    },
    moduleAccess,
  };
}

function buildStudyWeek({
  weekStart,
  weekIndex,
  fieldworkPaceMonthly,
  fieldworkPressure,
  examDate,
  hoursReadyDate,
  bdsStartDate,
  todayIso,
}: {
  weekStart: Date;
  weekIndex: number;
  fieldworkPaceMonthly: number;
  fieldworkPressure: "light" | "steady" | "heavy";
  examDate: string;
  hoursReadyDate: string;
  bdsStartDate: string;
  todayIso: string;
}): StudyWeek {
  const weekStartIso = formatDate(weekStart);
  const weekEndIso = formatDate(addDays(weekStart, 6));
  const examWeekStart = formatDate(startOfWeek(parseDate(examDate)));
  const baseTarget = getBaseStudyTarget(fieldworkPaceMonthly, hoursReadyDate, bdsStartDate, examDate);
  const warmupTarget = getWarmupStudyTarget(fieldworkPressure, hoursReadyDate, bdsStartDate);
  const hoomHouseRecommendation = pickRecommendation(HOOM_HOUSE_SEQUENCE, weekIndex);

  if (weekStartIso >= examWeekStart) {
    const recommendation: StudyModuleRecommendation = {
      provider: "bds",
      label: "BDS mixed review + Hoom House weak-area refresh",
      domain: "Mixed review",
      detail: "Use BDS for a light mixed set and Hoom House only for the concepts that still feel unstable.",
    };
    return {
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      phase: weekStartIso > examDate ? "done" : "exam-week",
      focus: "Protect sleep, confidence, and final review",
      targetHours: Math.min(baseTarget, 6),
      modules: ["bds", "hoom-house"],
      moduleRecommendation: recommendation,
      tasks: [
        `Review ${recommendation.domain}: ${recommendation.detail}`,
        "Do one light BDS mixed set early in the week.",
        "Use Hoom House for calm refreshers, not cramming.",
      ],
      reminder: "This is a confidence week. The goal is a rested brain, not a heroic sprint.",
    };
  }

  if (weekEndIso < hoursReadyDate) {
    return {
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      phase: "hours-first",
      focus: "Keep fieldwork moving and warm up gently",
      targetHours: warmupTarget,
      modules: ["hoom-house"],
      moduleRecommendation: hoomHouseRecommendation,
      tasks: [
        `Complete ${hoomHouseRecommendation.label}.`,
        hoomHouseRecommendation.detail,
        "Write down three terms that felt fuzzy.",
      ],
      reminder: "Small study reps count. Right now the biggest win is steady hours plus a little exam muscle.",
    };
  }

  if (weekStartIso < bdsStartDate) {
    const weeksUntilBds = Math.max(1, Math.ceil(daysBetween(parseDate(weekStartIso), parseDate(bdsStartDate)) / 7));
    const foundationTarget = weeksUntilBds <= 4 ? Math.max(7, baseTarget - 1) : Math.max(5, baseTarget - 2);
    const recommendation = pickRecommendation(HOOM_HOUSE_SEQUENCE, weekIndex + 2);
    return {
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      phase: "hoom-house",
      focus: "Build the base before BDS opens",
      targetHours: foundationTarget,
      modules: ["hoom-house"],
      moduleRecommendation: recommendation,
      tasks: [
        `Complete ${recommendation.label}.`,
        recommendation.detail,
        "Create a short weak-area list for BDS launch.",
      ],
      reminder: "This is foundation time. Every clean concept now makes the BDS window less stressful.",
    };
  }

  const weeksLeft = Math.max(1, Math.ceil(daysBetween(parseDate(weekStartIso), parseDate(examDate)) / 7));
  const targetHours = weeksLeft <= 4 ? Math.max(baseTarget + 2, 10) : baseTarget;
  const bdsWeekIndex = Math.max(0, Math.floor(daysBetween(parseDate(bdsStartDate), parseDate(weekStartIso)) / 7));
  const recommendation =
    weeksLeft <= 4
      ? {
          provider: "bds" as const,
          label: "BDS mixed exam rehearsal",
          domain: "Mixed review",
          detail: "Use mixed BDS sets, then spend most review time on the domains with repeated misses.",
        }
      : pickRecommendation(BDS_SEQUENCE, bdsWeekIndex);

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    phase: "bds-window",
    focus: weeksLeft <= 4 ? "Exam rehearsal and weak-area repair" : "BDS practice with Hoom House backup",
    targetHours,
    modules: ["bds", "hoom-house"],
    moduleRecommendation: recommendation,
    tasks: [
      `Complete ${recommendation.label}.`,
      recommendation.detail,
      "Review every missed question and tag the reason.",
    ],
    reminder:
      todayIso >= bdsStartDate
        ? "BDS is open now. Practice, review misses, and let the data pick the next topic."
        : "BDS is almost here. Set up the launch week so the first practice block is easy to start.",
  };
}

function pickRecommendation<T>(sequence: T[], index: number): T {
  return sequence[index % sequence.length];
}

function getFieldworkPressure(requiredMonthlyPace: number): "light" | "steady" | "heavy" {
  if (requiredMonthlyPace >= 90) return "heavy";
  if (requiredMonthlyPace >= 55) return "steady";
  return "light";
}

function getWarmupStudyTarget(
  fieldworkPressure: "light" | "steady" | "heavy",
  hoursReadyDate: string,
  bdsStartDate: string,
): number {
  const weeksBetweenHoursAndBds = Math.max(0, Math.ceil(daysBetween(parseDate(hoursReadyDate), parseDate(bdsStartDate)) / 7));

  if (fieldworkPressure === "heavy") return weeksBetweenHoursAndBds < 4 ? 2 : 3;
  if (fieldworkPressure === "steady") return weeksBetweenHoursAndBds < 4 ? 3 : 4;
  return weeksBetweenHoursAndBds < 4 ? 4 : 5;
}

function getBaseStudyTarget(
  fieldworkPaceMonthly: number,
  hoursReadyDate: string,
  bdsStartDate: string,
  examDate: string,
): number {
  const bdsWeeks = Math.max(1, Math.ceil(daysBetween(parseDate(bdsStartDate), parseDate(examDate)) / 7));
  const runwayWeeks = Math.max(0, Math.ceil(daysBetween(parseDate(hoursReadyDate), parseDate(bdsStartDate)) / 7));
  const pressure = getFieldworkPressure(fieldworkPaceMonthly);

  let target = bdsWeeks < 10 ? 11 : bdsWeeks < 13 ? 10 : 8;
  if (runwayWeeks < 3) target += 1;
  if (pressure === "heavy") target += 1;
  if (pressure === "light" && runwayWeeks >= 8) target -= 1;

  return Math.min(12, Math.max(7, target));
}

function buildStudyHoursBasis(
  fieldworkPaceMonthly: number,
  hoursReadyDate: string,
  bdsStartDate: string,
  examDate: string,
): string {
  const bdsWeeks = Math.max(1, Math.ceil(daysBetween(parseDate(bdsStartDate), parseDate(examDate)) / 7));
  const runwayWeeks = Math.max(0, Math.ceil(daysBetween(parseDate(hoursReadyDate), parseDate(bdsStartDate)) / 7));
  const pressure = getFieldworkPressure(fieldworkPaceMonthly);

  return `Based on ${Math.round(fieldworkPaceMonthly)} fieldwork hrs/month needed, ${runwayWeeks} week${runwayWeeks === 1 ? "" : "s"} between 2,000 hours and BDS access, and a ${bdsWeeks}-week BDS window. Fieldwork pressure is ${pressure}.`;
}

function parseDate(iso: string): Date {
  const [year, month, day] = iso.split("-").map(Number);
  return new Date(year, month - 1, day, 12, 0, 0);
}

function formatDate(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function addDays(date: Date, days: number): Date {
  const copy = new Date(date.getTime());
  copy.setDate(copy.getDate() + days);
  return copy;
}

function addMonths(date: Date, months: number): Date {
  const copy = new Date(date.getTime());
  copy.setMonth(copy.getMonth() + months);
  return copy;
}

function startOfWeek(date: Date): Date {
  const copy = new Date(date.getTime());
  const day = copy.getDay();
  copy.setDate(copy.getDate() - day);
  return copy;
}

function daysBetween(start: Date, end: Date): number {
  const startUtc = Date.UTC(start.getFullYear(), start.getMonth(), start.getDate());
  const endUtc = Date.UTC(end.getFullYear(), end.getMonth(), end.getDate());
  return Math.round((endUtc - startUtc) / DAY_MS);
}
