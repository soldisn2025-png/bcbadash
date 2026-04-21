import { describe, expect, it } from "vitest";

import { sampleAppState } from "@/lib/data/sample-data";
import { mapAppStateToRows, mapRowsToAppState } from "@/lib/db/mappers";

describe("app settings mapping", () => {
  it("persists onboarding completion in app settings rows", () => {
    const appState = structuredClone(sampleAppState);
    appState.setup.completed = true;

    const rows = mapAppStateToRows(appState, "user-123");

    expect(rows.appSettings.has_completed_onboarding).toBe(true);
  });

  it("hydrates onboarding completion from app settings rows", () => {
    const fallback = structuredClone(sampleAppState);
    const rows = mapAppStateToRows(fallback, "user-123");

    const hydrated = mapRowsToAppState(
      {
        appSettings: {
          ...rows.appSettings,
          has_completed_onboarding: true,
        },
        goalSettings: rows.goalSettings,
        monthlyLogs: rows.monthlyLogs,
        openingBalances: rows.openingBalances,
        profiles: rows.profiles,
      },
      fallback,
    );

    expect(hydrated.setup.completed).toBe(true);
  });
});
