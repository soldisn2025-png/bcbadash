"use client";

import { startTransition, useEffect, useEffectEvent, useRef, useState } from "react";
import type { Session } from "@supabase/supabase-js";

import { AuthPanel } from "@/components/auth-panel";
import { MiniStat, formatDate, formatHours } from "@/components/dashboard-ui";
import { OnboardingFlow } from "@/components/onboarding-flow";
import { DashboardView } from "@/components/views/dashboard-view";
import { HistoryView } from "@/components/views/history-view";
import { ScenariosView } from "@/components/views/scenarios-view";
import { SettingsView } from "@/components/views/settings-view";
import { loadPersistedAppState, savePersistedAppState, type PersistenceSource } from "@/lib/db/queries";
import { getSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/db/supabase";
import type { AppState, MonthlyLog, Profile, WorkSchedule } from "@/lib/domain/models";
import { buildProfileSnapshot } from "@/lib/domain/progress";

const views = [
  { id: "dashboard", label: "Dashboard" },
  { id: "history", label: "History" },
  { id: "scenarios", label: "Scenarios" },
  { id: "settings", label: "Settings" },
] as const;

type ViewId = (typeof views)[number]["id"];

type DashboardShellProps = {
  initialState: AppState;
};

export function DashboardShell({ initialState }: DashboardShellProps) {
  const requiresAuth = isSupabaseConfigured();
  const [appState, setAppState] = useState<AppState>(initialState);
  const [hydratedForKey, setHydratedForKey] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [storageMessage, setStorageMessage] = useState("Loading saved data...");
  const [storageSource, setStorageSource] = useState<PersistenceSource>("local");
  const [view, setView] = useState<ViewId>("dashboard");
  const [session, setSession] = useState<Session | null>(null);
  const [authReady, setAuthReady] = useState(!requiresAuth);
  const [authMessage, setAuthMessage] = useState(
    requiresAuth
      ? "Sign in with your email to unlock your saved household dashboard."
      : "Supabase is not configured yet, so the app is running in local-only mode.",
  );
  const lastSyncedStateRef = useRef(JSON.stringify(initialState));

  useEffect(() => {
    if (!requiresAuth) {
      return;
    }

    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    let mounted = true;

    void client.auth.getSession().then(({ data, error }) => {
      if (!mounted) {
        return;
      }

      startTransition(() => {
        setSession(data.session);
        setAuthReady(true);
        setAuthMessage(error?.message ?? "Sign in with your email to unlock your saved household dashboard.");
      });
    });

    const {
      data: { subscription },
    } = client.auth.onAuthStateChange((event, nextSession) => {
      startTransition(() => {
        setSession(nextSession);
        setAuthReady(true);

        if (event === "SIGNED_IN") {
          setAuthMessage(`Signed in as ${nextSession?.user.email ?? "your account"}.`);
        } else if (event === "SIGNED_OUT") {
          setAuthMessage("Signed out. Sign back in to load your saved household data.");
        } else if (event === "TOKEN_REFRESHED") {
          setAuthMessage(`Session refreshed for ${nextSession?.user.email ?? "your account"}.`);
        }
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [requiresAuth]);

  const userId = session?.user.id;
  const dataScopeKey = userId ?? "guest";
  const hasHydrated = hydratedForKey === dataScopeKey;

  useEffect(() => {
    if (requiresAuth && !authReady) {
      return;
    }

    let cancelled = false;

    async function hydrate() {
      const result = await loadPersistedAppState(initialState, userId);

      if (cancelled) {
        return;
      }

      lastSyncedStateRef.current = JSON.stringify(result.appState);

      startTransition(() => {
        setAppState(result.appState);
        setStorageMessage(result.message);
        setStorageSource(result.source);
        setHydratedForKey(dataScopeKey);
      });
    }

    void hydrate().catch((error: unknown) => {
      if (cancelled) {
        return;
      }

      startTransition(() => {
        setStorageMessage(
          `The app could not load saved data, so it stayed on the built-in sample state. ${getErrorMessage(error)}`,
        );
        setStorageSource("local");
        setHydratedForKey(dataScopeKey);
      });
    });

    return () => {
      cancelled = true;
    };
  }, [authReady, dataScopeKey, initialState, requiresAuth, userId]);

  const persistState = useEffectEvent(async (nextState: AppState, serialized: string) => {
    setIsSaving(true);
    const result = await savePersistedAppState(nextState, userId);
    lastSyncedStateRef.current = serialized;

    startTransition(() => {
      setStorageMessage(result.message);
      setStorageSource(result.source);
      setIsSaving(false);
    });
  });

  useEffect(() => {
    if (!hasHydrated) {
      return;
    }

    const serialized = JSON.stringify(appState);
    if (serialized === lastSyncedStateRef.current) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void persistState(appState, serialized);
    }, 400);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [appState, hasHydrated]);

  if (requiresAuth && !authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)] px-4 text-sm text-[var(--soft-ink)]">
        Loading Supabase authentication...
      </div>
    );
  }

  if (requiresAuth && !session) {
    return <AuthPanel authMessage={authMessage} />;
  }

  const activeProfile =
    appState.profiles.find((profile) => profile.id === appState.activeProfileId) ?? appState.profiles[0];
  const profileSnapshots = appState.profiles.map((profile) => ({
    profile,
    snapshot: buildProfileSnapshot(profile),
  }));
  const snapshot = buildProfileSnapshot(activeProfile);
  const sortedLogs = [...activeProfile.monthlyLogs].sort((left, right) => right.month.localeCompare(left.month));

  function setActiveProfile(profileId: string) {
    setAppState((current) => ({
      ...current,
      activeProfileId: profileId,
    }));
  }

  function setOnboardingCompleted(completed: boolean) {
    setAppState((current) => ({
      ...current,
      setup: {
        ...current.setup,
        completed,
      },
    }));
  }

  function updateProfileById(profileId: string, mutator: (profile: Profile) => Profile) {
    setAppState((current) => ({
      ...current,
      profiles: current.profiles.map((profile) => (profile.id === profileId ? mutator(profile) : profile)),
    }));
  }

  function updateActiveProfile(mutator: (profile: Profile) => Profile) {
    updateProfileById(activeProfile.id, mutator);
  }

  function updateMonthlyLogForProfile(
    profileId: string,
    logId: string,
    mutator: (log: MonthlyLog) => MonthlyLog,
  ) {
    updateProfileById(profileId, (profile) => ({
      ...profile,
      monthlyLogs: profile.monthlyLogs.map((log) => (log.id === logId ? mutator(log) : log)),
    }));
  }

  function addMonthForProfile(profileId: string) {
    const targetProfile =
      appState.profiles.find((profile) => profile.id === profileId) ?? appState.profiles[0];
    const sortedMonths = [...targetProfile.monthlyLogs]
      .map((log) => log.month)
      .sort((left, right) => left.localeCompare(right));
    const seedMonth = sortedMonths.at(-1)
      ? new Date(`${sortedMonths.at(-1)}T12:00:00`)
      : new Date(new Date().getFullYear(), new Date().getMonth(), 1, 12);
    const nextMonth = new Date(seedMonth.getFullYear(), seedMonth.getMonth() + 1, 1, 12);
    const month = `${nextMonth.getFullYear()}-${`${nextMonth.getMonth() + 1}`.padStart(2, "0")}-01`;

    updateProfileById(profileId, (profile) => ({
      ...profile,
      monthlyLogs: [
        ...profile.monthlyLogs,
        {
          id: crypto.randomUUID(),
          month,
          restrictedHours: 0,
          unrestrictedHours: 0,
          supervisionHours: 0,
          individualSupervisionHours: 0,
          observationCount: 0,
          observationMinutes: 0,
          verificationStatus: "pending",
          fieldworkType: "supervised",
          note: "",
        },
      ],
    }));
  }

  function removeMonthForProfile(profileId: string, logId: string) {
    updateProfileById(profileId, (profile) => ({
      ...profile,
      monthlyLogs: profile.monthlyLogs.filter((log) => log.id !== logId),
    }));
  }

  async function handleSignOut() {
    const client = getSupabaseBrowserClient();
    if (!client) {
      return;
    }

    const { error } = await client.auth.signOut();
    if (error) {
      setAuthMessage(error.message);
    }
  }

  if (!appState.setup.completed) {
    return (
      <OnboardingFlow
        appState={appState}
        hasHydrated={hasHydrated}
        isSaving={isSaving}
        signedInEmail={session?.user.email}
        snapshots={profileSnapshots}
        storageMessage={storageMessage}
        storageSource={storageSource}
        onAddMonth={addMonthForProfile}
        onComplete={() => {
          setOnboardingCompleted(true);
          setView("dashboard");
        }}
        onRemoveMonth={removeMonthForProfile}
        onSelectProfile={setActiveProfile}
        onSignOut={session ? () => void handleSignOut() : undefined}
        onUpdateGoalDate={(profileId, value) =>
          updateProfileById(profileId, (profile) => ({
            ...profile,
            goal: { ...profile.goal, targetDate: value },
          }))
        }
        onUpdateGoalHours={(profileId, field, value) =>
          updateProfileById(profileId, (profile) => ({
            ...profile,
            goal: { ...profile.goal, [field]: value },
          }))
        }
        onUpdateMonthlyLog={updateMonthlyLogForProfile}
        onUpdateOpeningBalance={(profileId, field, value) =>
          updateProfileById(profileId, (profile) => ({
            ...profile,
            openingBalance: { ...profile.openingBalance, [field]: value },
          }))
        }
        onUpdateProfileName={(profileId, value) =>
          updateProfileById(profileId, (profile) => ({
            ...profile,
            name: value,
          }))
        }
        onUpdateWorkSchedule={(profileId, field, value) =>
          updateProfileById(profileId, (profile) => ({
            ...profile,
            workSchedule: mergeWorkSchedule(profile.workSchedule, field, value),
          }))
        }
      />
    );
  }

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="overflow-hidden rounded-[32px] border border-white/40 bg-[linear-gradient(135deg,#184f45_0%,#10322c_55%,#0c211d_100%)] text-white shadow-[0_30px_80px_rgba(13,40,35,0.24)]">
          <div className="grid gap-8 px-6 py-8 lg:grid-cols-[1.4fr_0.8fr] lg:px-8 lg:py-10">
            <div className="space-y-5">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/60">
                BCBA fieldwork dashboard
              </p>
              <div className="space-y-3">
                <h1 className="max-w-3xl font-serif text-4xl leading-tight sm:text-5xl">
                  See the finish line, the monthly pace, and what to work on next.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                  Goal date is fully user-defined. The dashboard compares your plan against real hours,
                  estimates likely finish dates from history, and keeps the restricted versus unrestricted
                  mix visible without drowning you in rules language.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {appState.profiles.map((profile) => {
                  const isActive = profile.id === activeProfile.id;
                  return (
                    <button
                      key={profile.id}
                      type="button"
                      onClick={() => setActiveProfile(profile.id)}
                      className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${
                        isActive
                          ? "border-white bg-white text-[#10322c]"
                          : "border-white/25 bg-white/8 text-white/82 hover:border-white/45 hover:bg-white/12"
                      }`}
                    >
                      {profile.name}
                    </button>
                  );
                })}
                {session?.user.email ? (
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm text-white/82">
                      {session.user.email}
                    </div>
                    <button
                      type="button"
                      onClick={() => void handleSignOut()}
                      className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/12"
                    >
                      Sign out
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="grid gap-4 rounded-[28px] border border-white/12 bg-white/8 p-5 backdrop-blur">
              <div>
                <p className="text-xs uppercase tracking-[0.24em] text-white/58">Current headline</p>
                <p className="mt-3 text-2xl font-semibold">
                  {buildHeroHeadline(activeProfile.name, snapshot)}
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <MiniStat
                  label="Projected finish"
                  value={formatDate(snapshot.projectedGoalFinish)}
                  tone="light"
                />
                <MiniStat
                  label="This month forecast"
                  value={formatHours(snapshot.currentMonthForecastRaw)}
                  tone="light"
                />
                <MiniStat
                  label="Unrestricted still needed"
                  value={formatHours(snapshot.remainingUnrestrictedGoal)}
                  tone="light"
                />
                <MiniStat
                  label="Restricted goal"
                  value={snapshot.remainingRestrictedGoal <= 0 ? "Done" : formatHours(snapshot.remainingRestrictedGoal)}
                  tone="light"
                />
                <MiniStat
                  label="Needed per month"
                  value={formatHours(snapshot.requiredRawMonthly ?? 0)}
                  tone="light"
                />
              </div>
            </div>
          </div>

          <div className="border-t border-white/10 px-6 py-4 lg:px-8">
            <div className="flex flex-wrap gap-2">
              {views.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id)}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                    item.id === view
                      ? "bg-white text-[#10322c]"
                      : "bg-white/8 text-white/80 hover:bg-white/12 hover:text-white"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {view === "dashboard" && <DashboardView profile={activeProfile} snapshot={snapshot} />}

        {view === "history" && (
          <HistoryView
            logs={sortedLogs}
            snapshot={snapshot}
            onAddMonth={() => addMonthForProfile(activeProfile.id)}
            onRemoveMonth={(logId) => removeMonthForProfile(activeProfile.id, logId)}
            onUpdateLog={(logId, mutator) => updateMonthlyLogForProfile(activeProfile.id, logId, mutator)}
          />
        )}

        {view === "scenarios" && (
          <ScenariosView
            profile={activeProfile}
            snapshot={snapshot}
            onWeekdayDaysPerWeekChange={(value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                workSchedule: mergeWorkSchedule(profile.workSchedule, "weekdayDaysPerWeek", value),
              }))
            }
            onWeekdayHoursPerDayChange={(value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                workSchedule: mergeWorkSchedule(profile.workSchedule, "weekdayHoursPerDay", value),
              }))
            }
            onWeekendDaysPerWeekChange={(value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                workSchedule: mergeWorkSchedule(profile.workSchedule, "weekendDaysPerWeek", value),
              }))
            }
            onWeekendHoursPerDayChange={(value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                workSchedule: mergeWorkSchedule(profile.workSchedule, "weekendHoursPerDay", value),
              }))
            }
          />
        )}

        {view === "settings" && (
          <SettingsView
            hasHydrated={hasHydrated}
            isSaving={isSaving}
            profile={activeProfile}
            profileNames={appState.profiles.map((profile) => profile.name)}
            storageMessage={storageMessage}
            storageSource={storageSource}
            onGoalDateChange={(value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                goal: { ...profile.goal, targetDate: value },
              }))
            }
            onGoalHoursChange={(field, value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                goal: { ...profile.goal, [field]: value },
              }))
            }
            onOpeningBalanceChange={(field, value) =>
              updateActiveProfile((profile) => ({
                ...profile,
                openingBalance: { ...profile.openingBalance, [field]: value },
              }))
            }
            onReset={() => {
              setAppState(initialState);
              setView("dashboard");
              setStorageMessage("Resetting to the sample dataset. The new state will sync automatically.");
            }}
            onOpenOnboarding={() => setOnboardingCompleted(false)}
          />
        )}
      </div>
    </div>
  );
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }

  return "Unknown error";
}

function buildHeroHeadline(profileName: string, snapshot: ReturnType<typeof buildProfileSnapshot>) {
  if (snapshot.remainingRestrictedGoal <= 0 && snapshot.remainingUnrestrictedGoal > 0) {
    return `${profileName} needs ${formatHours(snapshot.remainingUnrestrictedGoal)} more unrestricted hours and about ${formatHours(snapshot.requiredRawMonthly ?? 0)} per month to hit ${formatDate(snapshot.goalDate)}.`;
  }

  if (snapshot.remainingRawGoal <= 0) {
    return `${profileName} has already logged the total goal. Now the job is keeping the mix and paperwork clean.`;
  }

  return `${profileName} needs ${formatHours(snapshot.remainingTargetHours)} more goal hours and about ${formatHours(snapshot.requiredRawMonthly ?? 0)} per month to hit ${formatDate(snapshot.goalDate)}.`;
}

function mergeWorkSchedule(
  current: WorkSchedule,
  field:
    | "weekdayDaysPerWeek"
    | "weekdayHoursPerDay"
    | "weekendDaysPerWeek"
    | "weekendHoursPerDay",
  value: number,
): WorkSchedule {
  const normalizedValue =
    field === "weekdayDaysPerWeek"
      ? Math.min(5, Math.max(0, value))
      : field === "weekendDaysPerWeek"
        ? Math.min(2, Math.max(0, value))
        : Math.max(0, value);
  const next = {
    ...current,
    [field]: normalizedValue,
  };

  return {
    ...next,
    daysPerWeek: next.weekdayDaysPerWeek + next.weekendDaysPerWeek,
    hoursPerDay: next.weekdayHoursPerDay > 0 ? next.weekdayHoursPerDay : next.weekendHoursPerDay,
  };
}
