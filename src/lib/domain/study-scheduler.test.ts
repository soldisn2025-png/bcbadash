import { describe, expect, it } from "vitest";

import type { CandidateConfig, MonthlyLog } from "@/lib/domain/calculator";
import { buildStudyScheduleSnapshot } from "@/lib/domain/study-scheduler";

const CONFIG: CandidateConfig = {
  name: "Sol",
  goalDate: "2026-12-31",
  totalHoursTarget: 2000,
  restrictedBanked: 800,
  unrestrictedBanked: 512,
  asOfDate: "2026-04-01",
  examDate: "2027-03-31",
  bdsAccessLeadMonths: 3,
  weeklyStudyHoursTarget: 8,
  warmupStudyHoursPerWeek: 3,
};

describe("buildStudyScheduleSnapshot", () => {
  it("builds two BACB 6th edition study tracks", () => {
    const schedule = buildStudyScheduleSnapshot(CONFIG, [], new Date(2026, 3, 17, 12));

    expect(schedule.tracks.map((track) => track.label)).toEqual(["1 hour/day", "2 hours/day"]);
    expect(schedule.tracks[0].weeklyHours).toBe(7);
    expect(schedule.tracks[1].weeklyHours).toBe(14);
    expect(schedule.outline.totalTasks).toBe(104);
    expect(schedule.outline.totalQuestions).toBe(175);
    expect(schedule.moduleAccess.bds).toBe("locked");
  });

  it("weights the current week toward high-question domains", () => {
    const schedule = buildStudyScheduleSnapshot(CONFIG, [], new Date(2026, 3, 17, 12));
    const firstDomainIds = schedule.tracks[0].currentWeek.modules.map((module) => module.domainId);

    expect(firstDomainIds).toContain("G");
    expect(schedule.tracks[0].currentWeek.modules[0].tasks[0].id).toMatch(/^[A-I]\.\d+$/);
  });

  it("keeps BDS access connected to the final three months", () => {
    const logs: MonthlyLog[] = [{ monthOf: "2026-04", unrestrictedHours: 700 }];
    const schedule = buildStudyScheduleSnapshot(CONFIG, logs, new Date(2027, 0, 10, 12));

    expect(schedule.tracks[1].weeklyHours).toBe(14);
    expect(schedule.moduleAccess.bds).toBe("available");
  });

  it("compresses the plan when the exam date is close", () => {
    const schedule = buildStudyScheduleSnapshot(
      { ...CONFIG, examDate: "2026-05-15" },
      [],
      new Date(2026, 3, 17, 12),
    );

    expect(schedule.tracks[0].currentWeek.phase).toBe("compressed");
    expect(schedule.recommendation.studyHoursBasis).toContain("compressed");
  });

  it("suggests an exam date three months after the projected hours-ready date when none is set", () => {
    const configWithoutExamDate = { ...CONFIG, examDate: undefined };
    const logs: MonthlyLog[] = [
      { monthOf: "2026-03", unrestrictedHours: 90 },
      { monthOf: "2026-04", unrestrictedHours: 90 },
    ];

    const schedule = buildStudyScheduleSnapshot(
      configWithoutExamDate,
      logs,
      new Date(2026, 3, 17, 12),
    );

    expect(schedule.examDate).toBe(schedule.suggestedExamDate);
    expect(schedule.examDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
