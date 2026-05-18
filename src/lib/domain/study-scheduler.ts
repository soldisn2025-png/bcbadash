import { BACB_6TH_EDITION_DOMAINS, BACB_TOTAL_TASKS, type BacbDomain, type BacbTask } from "@/lib/domain/bacb-outline";
import { buildSnapshot, type CandidateConfig, type MonthlyLog } from "@/lib/domain/calculator";

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_BDS_LEAD_MONTHS = 3;
const LOOKAHEAD_WEEKS = 6;

export type StudyTrackId = "one-hour" | "two-hour";

export type StudyModuleRecommendation = {
  domainId: string;
  domainTitle: string;
  questionCount: number;
  examPercent: number;
  tasks: BacbTask[];
};

export type StudyWeek = {
  weekStart: string;
  weekEnd: string;
  phase: "outline" | "compressed" | "review" | "exam-week" | "done";
  focus: string;
  targetHours: number;
  dailyHours: 1 | 2;
  modules: StudyModuleRecommendation[];
  tasks: string[];
  reminder: string;
};

export type StudyTrack = {
  id: StudyTrackId;
  label: string;
  dailyHours: 1 | 2;
  weeklyHours: 7 | 14;
  currentWeek: StudyWeek;
  upcomingWeeks: StudyWeek[];
};

export type StudyScheduleSnapshot = {
  examDate: string;
  suggestedExamDate: string;
  hoursReadyDate: string | null;
  bdsStartDate: string;
  weeksUntilExam: number;
  weeksUntilBds: number;
  outline: {
    domains: BacbDomain[];
    totalTasks: number;
    totalQuestions: number;
  };
  tracks: StudyTrack[];
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

type AssignedTask = BacbTask & {
  domain: BacbDomain;
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
  const totalWeeks = Math.max(1, Math.ceil(daysBetween(currentWeekStart, parseDate(examDate)) / 7));
  const tracks = [
    buildStudyTrack("one-hour", 1, currentWeekStart, examDate, totalWeeks),
    buildStudyTrack("two-hour", 2, currentWeekStart, examDate, totalWeeks),
  ];

  return {
    examDate,
    suggestedExamDate,
    hoursReadyDate,
    bdsStartDate,
    weeksUntilExam: Math.max(0, Math.ceil(daysBetween(today, parseDate(examDate)) / 7)),
    weeksUntilBds: Math.max(0, Math.ceil(daysBetween(today, parseDate(bdsStartDate)) / 7)),
    outline: {
      domains: BACB_6TH_EDITION_DOMAINS,
      totalTasks: BACB_TOTAL_TASKS,
      totalQuestions: BACB_6TH_EDITION_DOMAINS.reduce((total, domain) => total + domain.questionCount, 0),
    },
    tracks,
    currentWeek: tracks[0].currentWeek,
    upcomingWeeks: tracks[0].upcomingWeeks,
    recommendation: {
      fieldworkPaceMonthly: hoursSnapshot.requiredMonthlyPace,
      fieldworkPressure: getFieldworkPressure(hoursSnapshot.requiredMonthlyPace),
      studyHoursBasis: buildStudyHoursBasis(
        hoursSnapshot.requiredMonthlyPace,
        totalWeeks,
        bdsStartDate,
        examDate,
      ),
    },
    moduleAccess,
  };
}

function buildStudyTrack(
  id: StudyTrackId,
  dailyHours: 1 | 2,
  currentWeekStart: Date,
  examDate: string,
  totalWeeks: number,
): StudyTrack {
  const weeklyHours = (dailyHours * 7) as 7 | 14;
  const scheduleWeeks = Math.min(LOOKAHEAD_WEEKS, Math.max(1, totalWeeks + 1));
  const weeklyAssignments = assignTasksAcrossWeeks(totalWeeks, dailyHours);
  const upcomingWeeks = Array.from({ length: scheduleWeeks }, (_, weekIndex) =>
    buildStudyWeek({
      weekStart: addDays(currentWeekStart, weekIndex * 7),
      weekIndex,
      totalWeeks,
      weeklyHours,
      dailyHours,
      assignments: weeklyAssignments[weekIndex] ?? [],
      examDate,
    }),
  );

  return {
    id,
    label: dailyHours === 1 ? "1 hour/day" : "2 hours/day",
    dailyHours,
    weeklyHours,
    currentWeek: upcomingWeeks[0],
    upcomingWeeks,
  };
}

function assignTasksAcrossWeeks(totalWeeks: number, dailyHours: 1 | 2): AssignedTask[][] {
  const orderedTasks = orderTasksByExamWeight();
  const baseWeeks = Math.max(1, totalWeeks);
  const firstPassWeeks = dailyHours === 1 ? baseWeeks : Math.max(1, Math.ceil(baseWeeks * 0.65));
  const assignments = Array.from({ length: baseWeeks }, () => [] as AssignedTask[]);

  for (let index = 0; index < orderedTasks.length; index += 1) {
    const weekIndex = Math.min(firstPassWeeks - 1, Math.floor((index * firstPassWeeks) / orderedTasks.length));
    assignments[weekIndex].push(orderedTasks[index]);
  }

  if (dailyHours === 2 && firstPassWeeks < baseWeeks) {
    const reviewTasks = orderTasksByExamWeight();
    for (let weekIndex = firstPassWeeks; weekIndex < baseWeeks; weekIndex += 1) {
      const reviewStart = Math.floor(((weekIndex - firstPassWeeks) * reviewTasks.length) / (baseWeeks - firstPassWeeks));
      const reviewEnd = Math.floor(((weekIndex - firstPassWeeks + 1) * reviewTasks.length) / (baseWeeks - firstPassWeeks));
      assignments[weekIndex].push(...reviewTasks.slice(reviewStart, reviewEnd));
    }
  }

  return assignments;
}

function orderTasksByExamWeight(): AssignedTask[] {
  return BACB_6TH_EDITION_DOMAINS.flatMap((domain) =>
    domain.tasks.map((task) => ({
      ...task,
      domain,
    })),
  ).sort((left, right) => {
    const weightDelta = right.domain.questionCount - left.domain.questionCount;
    return weightDelta || left.id.localeCompare(right.id, undefined, { numeric: true });
  });
}

function buildStudyWeek({
  weekStart,
  weekIndex,
  totalWeeks,
  weeklyHours,
  dailyHours,
  assignments,
  examDate,
}: {
  weekStart: Date;
  weekIndex: number;
  totalWeeks: number;
  weeklyHours: 7 | 14;
  dailyHours: 1 | 2;
  assignments: AssignedTask[];
  examDate: string;
}): StudyWeek {
  const weekStartIso = formatDate(weekStart);
  const weekEndIso = formatDate(addDays(weekStart, 6));
  const examWeekStart = formatDate(startOfWeek(parseDate(examDate)));
  const modules = groupTasksByDomain(assignments);
  const isPastExam = weekStartIso > examDate;
  const isExamWeek = weekStartIso >= examWeekStart && weekStartIso <= examDate;
  const isCompressed = totalWeeks < 8 && !isExamWeek && !isPastExam;
  const isReview = dailyHours === 2 && weekIndex >= Math.ceil(totalWeeks * 0.65) && !isExamWeek && !isPastExam;

  return {
    weekStart: weekStartIso,
    weekEnd: weekEndIso,
    phase: isPastExam ? "done" : isExamWeek ? "exam-week" : isReview ? "review" : isCompressed ? "compressed" : "outline",
    focus: getWeekFocus(modules, isExamWeek, isReview),
    targetHours: isExamWeek ? Math.min(weeklyHours, dailyHours === 1 ? 5 : 8) : weeklyHours,
    dailyHours,
    modules,
    tasks: buildWeekTasks(modules, isExamWeek, isReview),
    reminder: buildReminder(totalWeeks, isExamWeek, isReview),
  };
}

function groupTasksByDomain(tasks: AssignedTask[]): StudyModuleRecommendation[] {
  const domainMap = new Map<string, StudyModuleRecommendation>();

  for (const task of tasks) {
    const existing = domainMap.get(task.domain.id);
    if (existing) {
      existing.tasks.push({ id: task.id, text: task.text });
      continue;
    }

    domainMap.set(task.domain.id, {
      domainId: task.domain.id,
      domainTitle: task.domain.title,
      questionCount: task.domain.questionCount,
      examPercent: task.domain.examPercent,
      tasks: [{ id: task.id, text: task.text }],
    });
  }

  return [...domainMap.values()].sort((left, right) => {
    const weightDelta = right.questionCount - left.questionCount;
    return weightDelta || left.domainId.localeCompare(right.domainId);
  });
}

function getWeekFocus(modules: StudyModuleRecommendation[], isExamWeek: boolean, isReview: boolean): string {
  if (isExamWeek) return "Final review and rest";
  if (isReview) return "Second pass and mixed review";
  if (modules.length === 0) return "Mixed review";

  const [primary, secondary] = modules;
  return secondary
    ? `${primary.domainId}. ${primary.domainTitle} + ${secondary.domainId}. ${secondary.domainTitle}`
    : `${primary.domainId}. ${primary.domainTitle}`;
}

function buildWeekTasks(
  modules: StudyModuleRecommendation[],
  isExamWeek: boolean,
  isReview: boolean,
): string[] {
  if (isExamWeek) {
    return [
      "Review completed task notes and avoid adding brand-new content late in the week.",
      "Do light mixed practice early in the week, then focus on sleep and confidence.",
    ];
  }

  if (modules.length === 0) {
    return ["Use this week for mixed review across completed BACB domains."];
  }

  const moduleSummary = modules
    .map((module) => `${module.domainId}: ${module.tasks.length} task${module.tasks.length === 1 ? "" : "s"}`)
    .join(", ");

  return [
    `${isReview ? "Revisit" : "Study"} ${moduleSummary}.`,
    "Expand each domain below and mark individual BACB tasks complete as you finish them.",
  ];
}

function buildReminder(totalWeeks: number, isExamWeek: boolean, isReview: boolean): string {
  if (isExamWeek) return "This is a confidence week. Keep review light and protect rest.";
  if (isReview) return "The 2 hour/day track finishes the first pass earlier so extra time can go to retrieval practice and missed items.";
  if (totalWeeks < 8) return "This timeline is compressed, so the full 6th edition outline is packed into the weeks available.";
  return "The plan follows the BCBA 6th edition outline and gives heavier exam domains more repeated attention.";
}

function getFieldworkPressure(requiredMonthlyPace: number): "light" | "steady" | "heavy" {
  if (requiredMonthlyPace >= 90) return "heavy";
  if (requiredMonthlyPace >= 55) return "steady";
  return "light";
}

function buildStudyHoursBasis(
  fieldworkPaceMonthly: number,
  totalWeeks: number,
  bdsStartDate: string,
  examDate: string,
): string {
  const compression = totalWeeks < 8 ? " The timeline is compressed, so all outline tasks are distributed across the available weeks." : "";
  return `Based on ${Math.round(fieldworkPaceMonthly)} fieldwork hrs/month needed, ${totalWeeks} week${totalWeeks === 1 ? "" : "s"} until exam day, and the official BACB 6th edition outline. BDS access is still shown from ${bdsStartDate} to ${examDate}.${compression}`;
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
