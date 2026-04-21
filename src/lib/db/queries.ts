import type { AppState } from "@/lib/domain/models";
import { appStateSchema } from "@/lib/domain/models";
import { mapAppStateToRows, mapRowsToAppState } from "@/lib/db/mappers";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/supabase";
import type { AppSettingsRow, GoalSettingsRow, MonthlyLogRow, OpeningBalanceRow, ProfileRow } from "@/lib/db/types";

const LOCAL_STORAGE_KEY_PREFIX = "bcbadash-state-v1";

export type PersistenceSource = "supabase" | "local";

export type PersistenceResult = {
  appState: AppState;
  message: string;
  source: PersistenceSource;
};

export type PersistenceSaveResult = Omit<PersistenceResult, "appState">;

export async function loadPersistedAppState(
  initialState: AppState,
  userId?: string,
): Promise<PersistenceResult> {
  const scopedInitialState = userId ? scopeAppStateToOwner(initialState, userId) : initialState;
  const localState = loadLocalAppState(scopedInitialState, userId);

  if (!isSupabaseConfigured()) {
    return {
      appState: localState,
      source: "local",
      message: "Supabase env vars are not set yet. Using browser storage for now.",
    };
  }

  if (!userId) {
    return {
      appState: localState,
      source: "local",
      message: "Supabase is configured, but you are not signed in yet. Local guest data is loaded until you authenticate.",
    };
  }

  try {
    const client = getSupabaseBrowserClient();

    if (!client) {
      throw new Error("Supabase client could not be created.");
    }

    let profileRows = await fetchProfilesForUser(userId);
    let didBootstrap = false;

    if (profileRows.length === 0) {
      const bootstrapResult = await client.rpc("bootstrap_default_household");
      assertNoError(bootstrapResult.error);
      didBootstrap = true;
      profileRows = await fetchProfilesForUser(userId);
    }

    if (profileRows.length === 0) {
      await saveAppStateToSupabase(localState, userId);
      return {
        appState: localState,
        source: "supabase",
        message: "Supabase was empty, so your current local data was seeded there for this account.",
      };
    }

    const profileIds = profileRows.map((row) => row.id);
    const [goalSettings, openingBalances, monthlyLogs, appSettings] = await Promise.all([
      fetchTableForProfiles<GoalSettingsRow>("goal_settings", profileIds),
      fetchTableForProfiles<OpeningBalanceRow>("opening_balances", profileIds),
      fetchTableForProfiles<MonthlyLogRow>("monthly_logs", profileIds, "month_start"),
      fetchAppSettingsForUser(userId),
    ]);

    const nextState = mapRowsToAppState(
      {
        profiles: profileRows,
        goalSettings,
        openingBalances,
        monthlyLogs,
        appSettings,
      },
      localState,
    );

    saveLocalAppState(nextState, userId);

    return {
      appState: nextState,
      source: "supabase",
      message: didBootstrap
        ? "A default household was created for your Supabase account and cached locally."
        : "Loaded data from Supabase and refreshed the local cache.",
    };
  } catch (error) {
    return {
      appState: localState,
      source: "local",
      message: getPersistenceErrorMessage(error, "load"),
    };
  }
}

export async function savePersistedAppState(
  appState: AppState,
  userId?: string,
): Promise<PersistenceSaveResult> {
  saveLocalAppState(appState, userId);

  if (!isSupabaseConfigured()) {
    return {
      source: "local",
      message: "Saved locally. Add Supabase env vars when you're ready to sync remotely.",
    };
  }

  if (!userId) {
    return {
      source: "local",
      message: "Saved locally in guest mode. Sign in to sync this browser's state to Supabase.",
    };
  }

  try {
    await saveAppStateToSupabase(appState, userId);

    return {
      source: "supabase",
      message: "Synced to Supabase and refreshed the per-user local cache.",
    };
  } catch (error) {
    return {
      source: "local",
      message: getPersistenceErrorMessage(error, "save"),
    };
  }
}

function loadLocalAppState(initialState: AppState, userId?: string) {
  if (typeof window === "undefined") {
    return initialState;
  }

  const stored = window.localStorage.getItem(getLocalStorageKey(userId));
  if (!stored) {
    return initialState;
  }

  try {
    const parsed = appStateSchema.safeParse(JSON.parse(stored));
    return parsed.success ? parsed.data : initialState;
  } catch {
    return initialState;
  }
}

function saveLocalAppState(appState: AppState, userId?: string) {
  if (typeof window !== "undefined") {
    window.localStorage.setItem(getLocalStorageKey(userId), JSON.stringify(appState));
  }
}

async function saveAppStateToSupabase(appState: AppState, userId: string) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase env vars are missing.");
  }

  const scopedState = scopeAppStateToOwner(appState, userId);
  const rows = mapAppStateToRows(scopedState, userId);

  const existingProfilesResult = await client.from("profiles").select("id").eq("owner_user_id", userId);
  assertNoError(existingProfilesResult.error);

  const existingIds = new Set((existingProfilesResult.data ?? []).map((row) => row.id));
  const currentIds = new Set(rows.profiles.map((row) => row.id));
  const removedProfileIds = [...existingIds].filter((id) => !currentIds.has(id));

  if (removedProfileIds.length > 0) {
    const removeProfilesResult = await client.from("profiles").delete().in("id", removedProfileIds);
    assertNoError(removeProfilesResult.error);
  }

  const profilesResult = await client.from("profiles").upsert(rows.profiles, { onConflict: "id" });
  const goalsResult = await client.from("goal_settings").upsert(rows.goalSettings, { onConflict: "profile_id" });
  const openingsResult = await client
    .from("opening_balances")
    .upsert(rows.openingBalances, { onConflict: "profile_id" });

  assertNoError(profilesResult.error);
  assertNoError(goalsResult.error);
  assertNoError(openingsResult.error);

  for (const profile of rows.profiles) {
    const deleteLogsResult = await client.from("monthly_logs").delete().eq("profile_id", profile.id);
    assertNoError(deleteLogsResult.error);

    const logsForProfile = rows.monthlyLogs.filter((log) => log.profile_id === profile.id);
    if (logsForProfile.length > 0) {
      const insertLogsResult = await client.from("monthly_logs").upsert(logsForProfile, { onConflict: "id" });
      assertNoError(insertLogsResult.error);
    }
  }

  const settingsResult = await client.from("app_settings").upsert(rows.appSettings, { onConflict: "owner_user_id" });
  assertNoError(settingsResult.error);
}

async function fetchProfilesForUser(userId: string) {
  const client = getSupabaseBrowserClient();

  if (!client) {
    throw new Error("Supabase client could not be created.");
  }

  const result = await client.from("profiles").select("*").eq("owner_user_id", userId).order("sort_order");
  assertNoError(result.error);

  return (result.data ?? []) as ProfileRow[];
}

async function fetchTableForProfiles<T extends { profile_id: string }>(
  tableName: "goal_settings" | "opening_balances" | "monthly_logs",
  profileIds: string[],
  orderBy?: string,
) {
  if (profileIds.length === 0) {
    return [] as T[];
  }

  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase client could not be created.");
  }

  let query = client.from(tableName).select("*").in("profile_id", profileIds);
  if (orderBy) {
    query = query.order(orderBy, { ascending: true });
  }

  const result = await query;
  assertNoError(result.error);
  return (result.data ?? []) as T[];
}

async function fetchAppSettingsForUser(userId: string) {
  const client = getSupabaseBrowserClient();
  if (!client) {
    throw new Error("Supabase client could not be created.");
  }

  const result = await client.from("app_settings").select("*").eq("owner_user_id", userId).maybeSingle();
  assertNoError(result.error);
  return (result.data ?? null) as AppSettingsRow | null;
}

function getLocalStorageKey(userId?: string) {
  return `${LOCAL_STORAGE_KEY_PREFIX}:${userId ?? "guest"}`;
}

function scopeAppStateToOwner(appState: AppState, userId: string): AppState {
  const prefix = `${userId}:`;
  const profileIdMap = new Map(
    appState.profiles.map((profile) => [
      profile.id,
      profile.id.startsWith(prefix) ? profile.id : `${prefix}${profile.id}`,
    ]),
  );

  const profiles = appState.profiles.map((profile) => {
    const scopedProfileId = profileIdMap.get(profile.id)!;

    return {
      ...profile,
      id: scopedProfileId,
      monthlyLogs: profile.monthlyLogs.map((log) => ({
        ...log,
        id: log.id.startsWith(prefix) ? log.id : `${scopedProfileId}:${log.id}`,
      })),
    };
  });

  const activeProfileId = profileIdMap.get(appState.activeProfileId) ?? profiles[0]?.id ?? appState.activeProfileId;

  return {
    activeProfileId,
    setup: appState.setup,
    profiles,
  };
}

function assertNoError(error: { message: string } | null) {
  if (error) {
    throw new Error(error.message);
  }
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function getPersistenceErrorMessage(error: unknown, phase: "load" | "save") {
  const message = getErrorMessage(error);
  const normalized = message.toLowerCase();
  const missingSchema =
    normalized.includes("could not find the table 'public.profiles'") ||
    normalized.includes("relation \"public.profiles\" does not exist") ||
    normalized.includes("schema cache");

  if (missingSchema) {
    return phase === "load"
      ? "Supabase schema is not installed yet, so the app stayed on local browser storage. Run supabase/schema.sql in the Supabase SQL editor, then refresh."
      : "Saved locally, but Supabase schema is not installed yet. Run supabase/schema.sql in the Supabase SQL editor, then refresh.";
  }

  return phase === "load"
    ? `Supabase load failed, so the app stayed on local browser storage. ${message}`
    : `Saved locally, but Supabase sync failed. ${message}`;
}
