import { buildSnapshot, type CandidateConfig, type MonthlyLog } from "@/lib/domain/calculator";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BDS_LEAD_MONTHS = 3;
const DEFAULT_STUDY_HOURS_PER_WEEK = 8;
const DEFAULT_WARMUP_HOURS_PER_WEEK = 3;

export type StudyModuleId = "hoom-house" | "bds";

export type StudyWeek = {
  weekStart: string;
  weekEnd: string;
  phase: "hours-first" | "hoom-house" | "bds-window" | "exam-week" | "done";
  focus: string;
  targetHours: number;
  modules: StudyModuleId[];
  tasks: string[];
  reminder: string;
};

export type StudyScheduleSnapshot = {
  examDate: string;
  suggestedExamDate: string;
  hoursReadyDate: string | null;
  bdsStartDate: string;
  weeksUntilExam: number;
  weeksUntilBds: number;
  currentWeek: StudyWeek;
  upcomingWeeks: StudyWeek[];
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
      config,
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
    moduleAccess,
  };
}

function buildStudyWeek({
  weekStart,
  config,
  examDate,
  hoursReadyDate,
  bdsStartDate,
  todayIso,
}: {
  weekStart: Date;
  config: CandidateConfig;
  examDate: string;
  hoursReadyDate: string;
  bdsStartDate: string;
  todayIso: string;
}): StudyWeek {
  const weekStartIso = formatDate(weekStart);
  const weekEndIso = formatDate(addDays(weekStart, 6));
  const examWeekStart = formatDate(startOfWeek(parseDate(examDate)));
  const baseTarget = config.weeklyStudyHoursTarget ?? DEFAULT_STUDY_HOURS_PER_WEEK;

  if (weekStartIso >= examWeekStart) {
    return {
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      phase: weekStartIso > examDate ? "done" : "exam-week",
      focus: "Protect sleep, confidence, and final review",
      targetHours: Math.min(baseTarget, 6),
      modules: ["bds", "hoom-house"],
      tasks: [
        "Review only missed concepts and high-yield notes.",
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
      targetHours: config.warmupStudyHoursPerWeek ?? DEFAULT_WARMUP_HOURS_PER_WEEK,
      modules: ["hoom-house"],
      tasks: [
        "Finish one Hoom House lesson or review block.",
        "Write down three terms that felt fuzzy.",
        "Keep the main energy on reaching the 2,000-hour goal.",
      ],
      reminder: "Small study reps count. Right now the biggest win is steady hours plus a little exam muscle.",
    };
  }

  if (weekStartIso < bdsStartDate) {
    return {
      weekStart: weekStartIso,
      weekEnd: weekEndIso,
      phase: "hoom-house",
      focus: "Build the base before BDS opens",
      targetHours: Math.max(5, Math.round(baseTarget * 0.75)),
      modules: ["hoom-house"],
      tasks: [
        "Complete two Hoom House study blocks.",
        "Create a short weak-area list for BDS launch.",
        "Do one mixed review session without worrying about speed yet.",
      ],
      reminder: "This is foundation time. Every clean concept now makes the BDS window less stressful.",
    };
  }

  const weeksLeft = Math.max(1, Math.ceil(daysBetween(parseDate(weekStartIso), parseDate(examDate)) / 7));
  const targetHours = weeksLeft <= 4 ? Math.max(baseTarget + 2, 10) : baseTarget;

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    phase: "bds-window",
    focus: weeksLeft <= 4 ? "Exam rehearsal and weak-area repair" : "BDS practice with Hoom House backup",
    targetHours,
    modules: ["bds", "hoom-house"],
    tasks: [
      "Complete BDS practice sets on the weakest domain.",
      "Review every missed question and tag the reason.",
      "Use Hoom House to reteach any concept that still feels unstable.",
    ],
    reminder:
      todayIso >= bdsStartDate
        ? "BDS is open now. Practice, review misses, and let the data pick the next topic."
        : "BDS is almost here. Set up the launch week so the first practice block is easy to start.",
  };
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
