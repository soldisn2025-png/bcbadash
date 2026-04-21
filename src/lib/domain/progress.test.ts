import { describe, expect, it } from "vitest";

import { sampleAppState } from "@/lib/data/sample-data";
import { buildProfileSnapshot } from "@/lib/domain/progress";

describe("buildProfileSnapshot", () => {
  it("keeps restricted hours locked until unrestricted catches up", () => {
    const wife = sampleAppState.profiles.find((profile) => profile.id === "wife");

    if (!wife) {
      throw new Error("Missing wife sample profile");
    }

    const snapshot = buildProfileSnapshot(wife, new Date(2026, 3, 20));

    expect(snapshot.rawRestricted).toBe(800);
    expect(snapshot.rawUnrestricted).toBe(512);
    expect(snapshot.countableRestricted).toBeCloseTo(341.33, 2);
    expect(snapshot.lockedRestricted).toBeCloseTo(458.67, 2);
    expect(snapshot.remainingUnrestrictedGoal).toBe(688);
  });

  it("applies the concentrated multiplier only to concentrated months", () => {
    const wife = sampleAppState.profiles.find((profile) => profile.id === "wife");

    if (!wife) {
      throw new Error("Missing wife sample profile");
    }

    const snapshot = buildProfileSnapshot(wife, new Date(2026, 3, 20));
    const march = snapshot.monthRows.find((row) => row.month === "2026-03-01");
    const february = snapshot.monthRows.find((row) => row.month === "2026-02-01");

    expect(march?.adjustedDelta).toBeCloseTo(171.57, 2);
    expect(february?.adjustedDelta).toBe(104);
  });

  it("projects a stronger monthly requirement when the goal date moves earlier", () => {
    const profile = structuredClone(sampleAppState.profiles[1]);
    const relaxed = buildProfileSnapshot(profile, new Date(2026, 3, 20));

    profile.goal.targetDate = "2026-09-30";
    const aggressive = buildProfileSnapshot(profile, new Date(2026, 3, 20));

    expect(aggressive.requiredRawMonthly).toBeGreaterThan(relaxed.requiredRawMonthly ?? 0);
  });

  it("surfaces 2027 transition and unrestricted mix guardrails", () => {
    const wife = sampleAppState.profiles.find((profile) => profile.id === "wife");

    if (!wife) {
      throw new Error("Missing wife sample profile");
    }

    const snapshot = buildProfileSnapshot(wife, new Date(2026, 3, 20));
    const guardrailIds = snapshot.guardrails.map((guardrail) => guardrail.id);

    expect(guardrailIds).toContain("transition-2027");
    expect(guardrailIds).toContain("unrestricted-shortfall");
  });

  it("warns when the goal date needs more than the current monthly cap", () => {
    const profile = structuredClone(sampleAppState.profiles[1]);
    profile.goal.targetDate = "2026-05-31";

    const snapshot = buildProfileSnapshot(profile, new Date(2026, 3, 20));

    expect(snapshot.guardrails.map((guardrail) => guardrail.id)).toContain("goal-monthly-cap");
  });

  it("warns when raw hours hit the total goal before the BACB-ready total does", () => {
    const profile = structuredClone(sampleAppState.profiles[0]);
    profile.monthlyLogs = [];
    profile.openingBalance = {
      ...profile.openingBalance,
      restrictedHours: 1400,
      unrestrictedHours: 600,
    };

    const snapshot = buildProfileSnapshot(profile, new Date(2026, 3, 20));

    expect(snapshot.rawTotal).toBe(2000);
    expect(snapshot.countableTotal).toBeLessThan(2000);
    expect(snapshot.guardrails.map((guardrail) => guardrail.id)).toContain("raw-total-not-ready");
  });

  it("does not double count older month rows when the opening balance is set as of today", () => {
    const profile = structuredClone(sampleAppState.profiles[0]);
    profile.openingBalance = {
      ...profile.openingBalance,
      asOfDate: "2026-04-21",
      restrictedHours: 800,
      unrestrictedHours: 500,
    };

    const snapshot = buildProfileSnapshot(profile, new Date(2026, 3, 21));

    expect(snapshot.rawTotal).toBe(1300);
    expect(snapshot.openingSnapshotRawTotal).toBe(1300);
    expect(snapshot.addedAfterSnapshotRawTotal).toBe(0);
    expect(snapshot.ignoredHistoricalRawTotal).toBe(482);
    expect(snapshot.monthRows).toHaveLength(0);
  });

  it("uses the planned weekday and weekend schedule when no completed month history exists", () => {
    const profile = structuredClone(sampleAppState.profiles[0]);
    profile.monthlyLogs = [];
    profile.openingBalance = {
      ...profile.openingBalance,
      asOfDate: "2026-04-21",
      restrictedHours: 800,
      unrestrictedHours: 500,
    };

    const snapshot = buildProfileSnapshot(profile, new Date(2026, 3, 21));

    expect(snapshot.usesPlannedScheduleForecast).toBe(true);
    expect(snapshot.plannedMonthlyRate).toBeCloseTo(86.96, 2);
    expect(snapshot.remainingTargetHours).toBe(700);
    expect(snapshot.projectedGoalFinish).toBe("2026-12-22");
    expect(snapshot.optimisticGoalFinish).toBe("2026-12-22");
  });

  it("distinguishes between 2022 and 2027 concentrated supervision thresholds", () => {
    const profile = structuredClone(sampleAppState.profiles[0]);
    profile.monthlyLogs = [
      {
        id: "test-2026-03",
        month: "2026-03-01",
        restrictedHours: 32,
        unrestrictedHours: 48,
        supervisionHours: 6.5,
        individualSupervisionHours: 4,
        observationCount: 1,
        observationMinutes: 90,
        verificationStatus: "signed",
        fieldworkType: "concentrated",
        note: "",
      },
    ];

    const snapshot = buildProfileSnapshot(profile, new Date(2026, 3, 20));
    const row = snapshot.monthRows[0];

    expect(row.compliance2022.status).toBe("fail");
    expect(row.compliance2027.status).toBe("pass");
  });

  it("flags unsigned months in compliance tracking", () => {
    const profile = structuredClone(sampleAppState.profiles[1]);
    const snapshot = buildProfileSnapshot(profile, new Date(2026, 3, 20));
    const march = snapshot.monthRows.find((row) => row.month === "2026-03-01");

    expect(march?.compliance2022.status).toBe("fail");
    expect(march?.compliance2022.checks.find((check) => check.id === "2022-verification")?.status).toBe("fail");
  });
});
