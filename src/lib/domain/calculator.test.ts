import { describe, expect, it } from "vitest";

import {
  buildSnapshot,
  calcDaysLateOrEarly,
  calcFourWeekRollingAverage,
  calcHoursRemaining,
  calcProjectedCompletionDate,
  calcRequiredWeeklyPace,
  calcStatus,
  calcTotalHoursBanked,
  calcWeeksRemaining,
  calcWeeklyDeficitSurplus,
  calcWhatIfProjection,
  buildFlightPathSentence,
  type CandidateConfig,
  type WeeklyLog,
} from "@/lib/domain/calculator";

// ---------------------------------------------------------------------------
// Seed config — mirrors the spec's opening state.
// These values represent what a user would enter on first launch.
// ---------------------------------------------------------------------------
const SEED_CONFIG: CandidateConfig = {
  name: "Sol",
  goalDate: "2026-12-31",
  totalHoursTarget: 2000,
  restrictedBanked: 800,
  unrestrictedBanked: 512,
};

// Reference date used throughout: April 17, 2026
const TODAY = new Date(2026, 3, 17, 12, 0, 0);

// ---------------------------------------------------------------------------
// Section 10 formula validation
// ---------------------------------------------------------------------------

describe("calcTotalHoursBanked", () => {
  it("returns restricted + unrestricted when no logs", () => {
    expect(calcTotalHoursBanked(SEED_CONFIG, [])).toBe(1312);
  });

  it("adds weekly log hours to the opening balance", () => {
    const logs: WeeklyLog[] = [
      { weekOf: "2026-04-14", unrestrictedHours: 18.5 },
      { weekOf: "2026-04-07", unrestrictedHours: 22.0 },
    ];
    expect(calcTotalHoursBanked(SEED_CONFIG, logs)).toBe(1352.5);
  });
});

describe("calcHoursRemaining", () => {
  it("returns 688 with seed totals and no logs", () => {
    expect(calcHoursRemaining(2000, 1312)).toBe(688);
  });

  it("floors at 0 when already at or above target", () => {
    expect(calcHoursRemaining(2000, 2050)).toBe(0);
  });
});

describe("calcWeeksRemaining", () => {
  it("returns ~36.86 weeks from April 17 to December 31", () => {
    // April 17 → Dec 31 = 258 days = 36.857 weeks
    const weeks = calcWeeksRemaining("2026-12-31", TODAY);
    expect(weeks).toBeCloseTo(36.86, 1);
  });

  it("returns 0 when goal date has passed", () => {
    const past = new Date(2027, 0, 15, 12, 0, 0);
    expect(calcWeeksRemaining("2026-12-31", past)).toBe(0);
  });
});

describe("calcRequiredWeeklyPace", () => {
  it("produces ~18.67 hrs/week with seed data on April 17, 2026", () => {
    // 688 hrs / 36.857 weeks ≈ 18.67
    const weeks = calcWeeksRemaining("2026-12-31", TODAY);
    const pace = calcRequiredWeeklyPace(688, weeks);
    expect(pace).not.toBeNull();
    expect(pace!).toBeCloseTo(18.67, 1);
  });

  it("returns null when weeksRemaining is 0", () => {
    expect(calcRequiredWeeklyPace(100, 0)).toBeNull();
  });
});

describe("calcFourWeekRollingAverage", () => {
  it("returns 0 when no logs", () => {
    expect(calcFourWeekRollingAverage([])).toBe(0);
  });

  it("averages only the 4 most recent weeks (sorted by weekOf desc)", () => {
    const logs: WeeklyLog[] = [
      { weekOf: "2026-03-16", unrestrictedHours: 10 }, // oldest — should be excluded
      { weekOf: "2026-03-23", unrestrictedHours: 20 },
      { weekOf: "2026-03-30", unrestrictedHours: 20 },
      { weekOf: "2026-04-06", unrestrictedHours: 20 },
      { weekOf: "2026-04-13", unrestrictedHours: 20 },
    ];
    // 4 most recent: 20+20+20+20 / 4 = 20
    expect(calcFourWeekRollingAverage(logs)).toBe(20);
  });

  it("averages all logs when fewer than 4 exist", () => {
    const logs: WeeklyLog[] = [
      { weekOf: "2026-04-07", unrestrictedHours: 15 },
      { weekOf: "2026-04-14", unrestrictedHours: 25 },
    ];
    expect(calcFourWeekRollingAverage(logs)).toBe(20);
  });
});

describe("calcWeeklyDeficitSurplus", () => {
  it("returns positive value when ahead", () => {
    expect(calcWeeklyDeficitSurplus(22, 19.1)).toBeCloseTo(2.9, 5);
  });

  it("returns negative value when behind", () => {
    expect(calcWeeklyDeficitSurplus(12, 19.1)).toBeCloseTo(-7.1, 5);
  });
});

describe("calcProjectedCompletionDate", () => {
  it("projects a date correctly based on rolling average", () => {
    // 688 hrs remaining / 20 hrs per week × 7 = 240.8 days from today
    const projected = calcProjectedCompletionDate(TODAY, 688, 20);
    expect(projected).not.toBeNull();
    // Roughly December 2026 / January 2027
    expect(projected!.startsWith("2026") || projected!.startsWith("2027")).toBe(true);
  });

  it("returns today when hoursRemaining is 0", () => {
    const projected = calcProjectedCompletionDate(TODAY, 0, 20);
    expect(projected).toBe("2026-04-17");
  });

  it("returns null when rollingAverage is 0", () => {
    expect(calcProjectedCompletionDate(TODAY, 688, 0)).toBeNull();
  });
});

describe("calcDaysLateOrEarly", () => {
  it("returns positive when projected is after goal", () => {
    // Projected Feb 14, 2027 vs goal Dec 31, 2026 = 45 days late
    const days = calcDaysLateOrEarly("2027-02-14", "2026-12-31");
    expect(days).toBe(45);
  });

  it("returns negative when projected is before goal", () => {
    // Projected Nov 15, 2026 vs goal Dec 31, 2026 = 46 days early
    const days = calcDaysLateOrEarly("2026-11-15", "2026-12-31");
    expect(days).toBe(-46);
  });

  it("returns 0 on the exact goal date", () => {
    expect(calcDaysLateOrEarly("2026-12-31", "2026-12-31")).toBe(0);
  });

  it("returns null when projectedDate is null", () => {
    expect(calcDaysLateOrEarly(null, "2026-12-31")).toBeNull();
  });
});

describe("calcStatus", () => {
  it("returns BEHIND when rolling average is < 95% of required pace", () => {
    expect(calcStatus(20, 15)).toBe("BEHIND");
  });

  it("returns ON TRACK when rolling average is within 5% of required pace", () => {
    expect(calcStatus(20, 20)).toBe("ON TRACK");
    expect(calcStatus(20, 19)).toBe("ON TRACK"); // 95% of 20
  });

  it("returns AHEAD when rolling average is > 105% of required pace", () => {
    expect(calcStatus(20, 22)).toBe("AHEAD");
  });
});

describe("calcWhatIfProjection", () => {
  it("projects a valid date", () => {
    // 688 / 25 = 27.52 weeks = ~192.64 days from Apr 17
    const result = calcWhatIfProjection(TODAY, 688, 25);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null when hypothetical hours is 0", () => {
    expect(calcWhatIfProjection(TODAY, 688, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Snapshot integration test — the key validation from the spec
// ---------------------------------------------------------------------------

describe("buildSnapshot — seed data validation", () => {
  it("produces the correct opening-state numbers from the spec", () => {
    const snap = buildSnapshot(SEED_CONFIG, [], TODAY);

    expect(snap.totalHoursBanked).toBe(1312);
    expect(snap.hoursRemaining).toBe(688);
    expect(snap.loggedHours).toBe(0);
    // Weeks from April 17 → Dec 31, 2026 = 258 days / 7 ≈ 36.86
    expect(snap.weeksRemaining).toBeCloseTo(36.86, 1);
    // Required pace ≈ 18.67 hrs/week
    expect(snap.requiredWeeklyPace).toBeCloseTo(18.67, 1);
    // No logs yet → rolling average is 0
    expect(snap.fourWeekRollingAverage).toBe(0);
    // No projection yet
    expect(snap.projectedCompletionDate).toBeNull();
    expect(snap.status).toBe("BEHIND"); // 0 rolling avg < 95% of required
    expect(snap.flightPathSentence).toMatch(/No weeks logged yet/);
  });

  it("re-calculates correctly after logging two weeks", () => {
    const logs: WeeklyLog[] = [
      { weekOf: "2026-04-07", unrestrictedHours: 22 },
      { weekOf: "2026-04-14", unrestrictedHours: 18 },
    ];
    const snap = buildSnapshot(SEED_CONFIG, logs, TODAY);

    expect(snap.loggedHours).toBe(40);
    expect(snap.totalHoursBanked).toBe(1352);
    expect(snap.hoursRemaining).toBe(648);
    // Rolling avg = (22 + 18) / 2 = 20
    expect(snap.fourWeekRollingAverage).toBe(20);
    // 20 hrs/wk > required ~18.67 → AHEAD
    expect(snap.status).toBe("AHEAD");
    // Projected finish should be before Dec 31
    expect(snap.projectedCompletionDate).not.toBeNull();
    expect(snap.daysLateOrEarly).not.toBeNull();
    expect(snap.daysLateOrEarly!).toBeLessThan(0); // early
  });

  it("shows BEHIND and a late projected date when pace is low", () => {
    const logs: WeeklyLog[] = [
      { weekOf: "2026-04-07", unrestrictedHours: 10 },
      { weekOf: "2026-04-14", unrestrictedHours: 10 },
    ];
    const snap = buildSnapshot(SEED_CONFIG, logs, TODAY);

    expect(snap.status).toBe("BEHIND");
    expect(snap.daysLateOrEarly).toBeGreaterThan(0); // late
    expect(snap.flightPathSentence).toMatch(/behind pace/);
    expect(snap.flightPathSentence).toMatch(/days late/);
  });
});
