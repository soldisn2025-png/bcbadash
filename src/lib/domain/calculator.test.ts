import { describe, expect, it } from "vitest";

import {
  buildSnapshot,
  calcDaysLateOrEarly,
  calcThreeMonthAverage,
  calcHoursRemaining,
  calcProjectedCompletionDate,
  calcRequiredMonthlyPace,
  calcStatus,
  calcTotalHoursBanked,
  calcMonthsRemaining,
  calcMonthlyDeficitSurplus,
  calcWhatIfProjection,
  buildFlightPathSentence,
  type CandidateConfig,
  type MonthlyLog,
} from "@/lib/domain/calculator";

// ---------------------------------------------------------------------------
// Seed config — mirrors the spec's opening state.
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
// Formula validation
// ---------------------------------------------------------------------------

describe("calcTotalHoursBanked", () => {
  it("returns restricted + unrestricted when no logs", () => {
    expect(calcTotalHoursBanked(SEED_CONFIG, [])).toBe(1312);
  });

  it("adds monthly log hours to the opening balance", () => {
    const logs: MonthlyLog[] = [
      { monthOf: "2026-02", unrestrictedHours: 85 },
      { monthOf: "2026-03", unrestrictedHours: 90 },
    ];
    expect(calcTotalHoursBanked(SEED_CONFIG, logs)).toBe(1487);
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

describe("calcMonthsRemaining", () => {
  it("returns ~8.48 months from April 17 to December 31", () => {
    // April 17 → Dec 31 = 258 days / 30.44 ≈ 8.477 months
    const months = calcMonthsRemaining("2026-12-31", TODAY);
    expect(months).toBeCloseTo(8.48, 1);
  });

  it("returns 0 when goal date has passed", () => {
    const past = new Date(2027, 0, 15, 12, 0, 0);
    expect(calcMonthsRemaining("2026-12-31", past)).toBe(0);
  });
});

describe("calcRequiredMonthlyPace", () => {
  it("produces ~81.2 hrs/month with seed data on April 17, 2026", () => {
    // 688 hrs / 8.477 months ≈ 81.16
    const months = calcMonthsRemaining("2026-12-31", TODAY);
    const pace = calcRequiredMonthlyPace(688, months);
    expect(pace).not.toBeNull();
    expect(pace!).toBeCloseTo(81.2, 0);
  });

  it("returns null when monthsRemaining is 0", () => {
    expect(calcRequiredMonthlyPace(100, 0)).toBeNull();
  });
});

describe("calcThreeMonthAverage", () => {
  it("returns 0 when no logs", () => {
    expect(calcThreeMonthAverage([])).toBe(0);
  });

  it("averages only the 3 most recent months (sorted by monthOf desc)", () => {
    const logs: MonthlyLog[] = [
      { monthOf: "2025-12", unrestrictedHours: 10 }, // oldest — excluded
      { monthOf: "2026-01", unrestrictedHours: 10 }, // 2nd oldest — excluded
      { monthOf: "2026-02", unrestrictedHours: 80 },
      { monthOf: "2026-03", unrestrictedHours: 80 },
      { monthOf: "2026-04", unrestrictedHours: 80 },
    ];
    // 3 most recent: 80+80+80 / 3 = 80
    expect(calcThreeMonthAverage(logs)).toBe(80);
  });

  it("averages all logs when fewer than 3 exist", () => {
    const logs: MonthlyLog[] = [
      { monthOf: "2026-03", unrestrictedHours: 70 },
      { monthOf: "2026-04", unrestrictedHours: 90 },
    ];
    expect(calcThreeMonthAverage(logs)).toBe(80);
  });
});

describe("calcMonthlyDeficitSurplus", () => {
  it("returns positive value when ahead", () => {
    expect(calcMonthlyDeficitSurplus(90, 81.2)).toBeCloseTo(8.8, 5);
  });

  it("returns negative value when behind", () => {
    expect(calcMonthlyDeficitSurplus(50, 81.2)).toBeCloseTo(-31.2, 5);
  });
});

describe("calcProjectedCompletionDate", () => {
  it("projects a date correctly based on rolling average", () => {
    // 688 hrs remaining / 85 hrs per month × 30.44 = 246.4 days from today ≈ Dec 2026
    const projected = calcProjectedCompletionDate(TODAY, 688, 85);
    expect(projected).not.toBeNull();
    expect(projected!.startsWith("2026")).toBe(true);
  });

  it("returns today when hoursRemaining is 0", () => {
    const projected = calcProjectedCompletionDate(TODAY, 0, 85);
    expect(projected).toBe("2026-04-17");
  });

  it("returns null when monthlyAverage is 0", () => {
    expect(calcProjectedCompletionDate(TODAY, 688, 0)).toBeNull();
  });
});

describe("calcDaysLateOrEarly", () => {
  it("returns positive when projected is after goal", () => {
    const days = calcDaysLateOrEarly("2027-02-14", "2026-12-31");
    expect(days).toBe(45);
  });

  it("returns negative when projected is before goal", () => {
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
    expect(calcStatus(80, 60)).toBe("BEHIND");
  });

  it("returns ON TRACK when rolling average is within 5% of required pace", () => {
    expect(calcStatus(80, 80)).toBe("ON TRACK");
    expect(calcStatus(80, 76)).toBe("ON TRACK"); // 95% of 80
  });

  it("returns AHEAD when rolling average is > 105% of required pace", () => {
    expect(calcStatus(80, 90)).toBe("AHEAD");
  });
});

describe("calcWhatIfProjection", () => {
  it("projects a valid date", () => {
    // 688 / 100 = 6.88 months = ~209 days from Apr 17
    const result = calcWhatIfProjection(TODAY, 688, 100);
    expect(result).not.toBeNull();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("returns null when hypothetical hours is 0", () => {
    expect(calcWhatIfProjection(TODAY, 688, 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Snapshot integration test
// ---------------------------------------------------------------------------

describe("buildSnapshot — seed data validation", () => {
  it("produces the correct opening-state numbers from the spec", () => {
    const snap = buildSnapshot(SEED_CONFIG, [], TODAY);

    expect(snap.totalHoursBanked).toBe(1312);
    expect(snap.hoursRemaining).toBe(688);
    expect(snap.loggedHours).toBe(0);
    // Months from April 17 → Dec 31, 2026 = 258 days / 30.44 ≈ 8.48
    expect(snap.monthsRemaining).toBeCloseTo(8.48, 1);
    // Required pace ≈ 81.2 hrs/month
    expect(snap.requiredMonthlyPace).toBeCloseTo(81.2, 0);
    // No logs yet → rolling average is 0
    expect(snap.threeMonthAverage).toBe(0);
    // No projection yet
    expect(snap.projectedCompletionDate).toBeNull();
    expect(snap.status).toBe("BEHIND");
    expect(snap.flightPathSentence).toMatch(/No months logged yet/);
  });

  it("re-calculates correctly after logging two strong months", () => {
    const logs: MonthlyLog[] = [
      { monthOf: "2026-03", unrestrictedHours: 90 },
      { monthOf: "2026-04", unrestrictedHours: 80 },
    ];
    const snap = buildSnapshot(SEED_CONFIG, logs, TODAY);

    expect(snap.loggedHours).toBe(170);
    expect(snap.totalHoursBanked).toBe(1482);
    expect(snap.hoursRemaining).toBe(518);
    // Rolling avg = (90 + 80) / 2 = 85
    expect(snap.threeMonthAverage).toBe(85);
    // 85 hrs/month > required ~61 hrs/month → AHEAD
    expect(snap.status).toBe("AHEAD");
    expect(snap.projectedCompletionDate).not.toBeNull();
    expect(snap.daysLateOrEarly).not.toBeNull();
    expect(snap.daysLateOrEarly!).toBeLessThan(0); // early
  });

  it("shows BEHIND and a late projected date when pace is low", () => {
    const logs: MonthlyLog[] = [
      { monthOf: "2026-03", unrestrictedHours: 30 },
      { monthOf: "2026-04", unrestrictedHours: 40 },
    ];
    const snap = buildSnapshot(SEED_CONFIG, logs, TODAY);

    expect(snap.status).toBe("BEHIND");
    expect(snap.daysLateOrEarly).toBeGreaterThan(0); // late
    expect(snap.flightPathSentence).toMatch(/behind pace/);
    expect(snap.flightPathSentence).toMatch(/days late/);
  });
});
