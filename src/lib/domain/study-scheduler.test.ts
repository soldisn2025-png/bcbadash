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
  it("prioritizes light Hoom House warmup before the hours goal is complete", () => {
    const schedule = buildStudyScheduleSnapshot(CONFIG, [], new Date(2026, 3, 17, 12));

    expect(schedule.currentWeek.phase).toBe("hours-first");
    expect(schedule.currentWeek.targetHours).toBe(3);
    expect(schedule.currentWeek.modules).toEqual(["hoom-house"]);
    expect(schedule.moduleAccess.bds).toBe("locked");
  });

  it("uses Hoom House foundation work after hours are complete but before BDS opens", () => {
    const logs: MonthlyLog[] = [{ monthOf: "2026-04", unrestrictedHours: 700 }];
    const schedule = buildStudyScheduleSnapshot(CONFIG, logs, new Date(2026, 9, 15, 12));

    expect(schedule.currentWeek.phase).toBe("hoom-house");
    expect(schedule.currentWeek.modules).toEqual(["hoom-house"]);
    expect(schedule.bdsStartDate).toBe("2026-12-31");
  });

  it("switches to BDS practice inside the final three months", () => {
    const logs: MonthlyLog[] = [{ monthOf: "2026-04", unrestrictedHours: 700 }];
    const schedule = buildStudyScheduleSnapshot(CONFIG, logs, new Date(2027, 0, 10, 12));

    expect(schedule.currentWeek.phase).toBe("bds-window");
    expect(schedule.currentWeek.modules).toEqual(["bds", "hoom-house"]);
    expect(schedule.moduleAccess.bds).toBe("available");
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
