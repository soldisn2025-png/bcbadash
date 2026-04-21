"use client";

import { useState } from "react";

import {
  MiniStat,
  Panel,
  fieldClassName,
  formatDate,
  formatHours,
  parseNumber,
} from "@/components/dashboard-ui";
import { MonthlyLogTable } from "@/components/monthly-log-table";
import type { AppState, MonthlyLog, Profile } from "@/lib/domain/models";
import type { ProfileSnapshot } from "@/lib/domain/progress";
import type { PersistenceSource } from "@/lib/db/queries";

const steps = [
  {
    id: "profiles",
    label: "Profiles",
    title: "Name the two candidates",
    description: "Replace the sample household names and choose which profile should land on the dashboard first.",
  },
  {
    id: "targets",
    label: "Targets",
    title: "Set goals and opening balances",
    description: "Lock in the finish line, the current totals, and the weekly rhythm you want the forecast to use.",
  },
  {
    id: "history",
    label: "History",
    title: "Backfill monthly hours",
    description: "Even a rough month-by-month history makes the expected completion date and missed-time simulator much smarter.",
  },
  {
    id: "review",
    label: "Review",
    title: "Preview the forecast",
    description: "Check the projected finish dates before you start using the dashboard day to day.",
  },
] as const;

type OnboardingFlowProps = {
  appState: AppState;
  hasHydrated: boolean;
  isSaving: boolean;
  signedInEmail?: string | null;
  snapshots: { profile: Profile; snapshot: ProfileSnapshot }[];
  storageMessage: string;
  storageSource: PersistenceSource;
  onAddMonth: (profileId: string) => void;
  onComplete: () => void;
  onRemoveMonth: (profileId: string, logId: string) => void;
  onSelectProfile: (profileId: string) => void;
  onSignOut?: () => void;
  onUpdateGoalDate: (profileId: string, value: string) => void;
  onUpdateGoalHours: (
    profileId: string,
    field: "totalGoalHours" | "restrictedGoalHours" | "unrestrictedGoalHours",
    value: number,
  ) => void;
  onUpdateMonthlyLog: (profileId: string, logId: string, mutator: (log: MonthlyLog) => MonthlyLog) => void;
  onUpdateOpeningBalance: (
    profileId: string,
    field: "asOfDate" | "restrictedHours" | "unrestrictedHours",
    value: string | number,
  ) => void;
  onUpdateProfileName: (profileId: string, value: string) => void;
  onUpdateWorkSchedule: (
    profileId: string,
    field:
      | "weekdayDaysPerWeek"
      | "weekdayHoursPerDay"
      | "weekendDaysPerWeek"
      | "weekendHoursPerDay",
    value: number,
  ) => void;
};

export function OnboardingFlow({
  appState,
  hasHydrated,
  isSaving,
  signedInEmail,
  snapshots,
  storageMessage,
  storageSource,
  onAddMonth,
  onComplete,
  onRemoveMonth,
  onSelectProfile,
  onSignOut,
  onUpdateGoalDate,
  onUpdateGoalHours,
  onUpdateMonthlyLog,
  onUpdateOpeningBalance,
  onUpdateProfileName,
  onUpdateWorkSchedule,
}: OnboardingFlowProps) {
  const [stepIndex, setStepIndex] = useState(0);

  const activeProfile =
    appState.profiles.find((profile) => profile.id === appState.activeProfileId) ?? appState.profiles[0];
  const activeSnapshot =
    snapshots.find((entry) => entry.profile.id === activeProfile.id)?.snapshot ?? snapshots[0]?.snapshot;
  const sortedLogs = [...activeProfile.monthlyLogs].sort((left, right) => right.month.localeCompare(left.month));
  const currentStep = steps[stepIndex];

  return (
    <div className="min-h-screen bg-[var(--background)] text-[var(--foreground)]">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
        <header className="overflow-hidden rounded-[36px] border border-white/35 bg-[linear-gradient(135deg,#17473f_0%,#10302b_58%,#0a1d19_100%)] text-white shadow-[0_30px_80px_rgba(13,40,35,0.22)]">
          <div className="flex flex-wrap items-start justify-between gap-6 px-6 py-8 lg:px-8 lg:py-10">
            <div className="max-w-3xl space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.32em] text-white/58">
                Guided setup
              </p>
              <div className="space-y-3">
                <h1 className="font-serif text-4xl leading-tight sm:text-5xl">
                  Turn the sample dashboard into your real BCBA plan.
                </h1>
                <p className="max-w-2xl text-sm leading-7 text-white/72 sm:text-base">
                  This setup flow lets you rename the profiles, set real goal dates, enter your current totals,
                  and backfill the months that matter most for forecasting.
                </p>
              </div>
            </div>

            <div className="grid gap-3">
              {signedInEmail ? (
                <div className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm text-white/82">
                  {signedInEmail}
                </div>
              ) : null}
              {onSignOut ? (
                <button
                  type="button"
                  onClick={onSignOut}
                  className="rounded-full border border-white/14 bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/14"
                >
                  Sign out
                </button>
              ) : null}
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[0.7fr_1.3fr]">
          <Panel
            eyebrow="Setup progress"
            title={currentStep.title}
            description={currentStep.description}
          >
            <div className="space-y-3">
              {steps.map((step, index) => {
                const isActive = index === stepIndex;
                const isDone = index < stepIndex;

                return (
                  <button
                    key={step.id}
                    type="button"
                    onClick={() => setStepIndex(index)}
                    className={`w-full rounded-3xl border px-4 py-4 text-left transition ${
                      isActive
                        ? "border-[#145c4e] bg-[#edf8f4] text-[#145c4e]"
                        : isDone
                          ? "border-[#bfe1d6] bg-[#f6fbf9] text-[#145c4e]"
                          : "border-[var(--border)] bg-[var(--card)] text-[var(--soft-ink)] hover:border-[#cad8d1]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.22em] opacity-65">
                          Step {index + 1}
                        </p>
                        <p className="mt-2 text-base font-semibold">{step.label}</p>
                      </div>
                      <div className="rounded-full border border-current/12 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em]">
                        {isDone ? "Done" : isActive ? "Now" : "Next"}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <MiniStat label="Active profile" value={activeProfile.name} />
              <MiniStat
                label="Storage"
                value={storageSource === "supabase" ? "Supabase" : "Local"}
              />
              <MiniStat label="Sync" value={isSaving ? "Saving" : hasHydrated ? "Ready" : "Loading"} />
              <MiniStat
                label="Projected finish"
                value={activeSnapshot ? formatDate(activeSnapshot.projectedGoalFinish) : "TBD"}
              />
            </div>

            <div className="mt-6 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--soft-ink)]">
              {storageMessage}
            </div>
          </Panel>

          <div className="space-y-6">
            {stepIndex === 0 ? (
              <Panel
                eyebrow="Household profiles"
                title="Make the dashboard feel like yours"
                description="You can reopen this guided setup later from Settings, so there is no pressure to make it perfect in one pass."
              >
                <div className="grid gap-4 md:grid-cols-2">
                  {appState.profiles.map((profile) => {
                    const isActive = profile.id === appState.activeProfileId;
                    const profileSnapshot =
                      snapshots.find((entry) => entry.profile.id === profile.id)?.snapshot ?? activeSnapshot;

                    return (
                      <div
                        key={profile.id}
                        className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_14px_30px_rgba(64,40,20,0.05)]"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                              Candidate
                            </p>
                            <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">{profile.roleLabel}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => onSelectProfile(profile.id)}
                            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
                              isActive
                                ? "bg-[#145c4e] text-white"
                                : "border border-[var(--border)] bg-white text-[var(--soft-ink)] hover:border-[#145c4e] hover:text-[#145c4e]"
                            }`}
                          >
                            {isActive ? "Dashboard default" : "Make default"}
                          </button>
                        </div>

                        <label className="mt-5 grid gap-2 text-sm">
                          <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                            Display name
                          </span>
                          <input
                            type="text"
                            value={profile.name}
                            onChange={(event) => onUpdateProfileName(profile.id, event.target.value)}
                            className={fieldClassName}
                          />
                        </label>

                        <div className="mt-5 grid gap-3 sm:grid-cols-2">
                          <MiniStat
                            label="Goal date"
                            value={formatDate(profile.goal.targetDate)}
                          />
                          <MiniStat
                            label="Projected finish"
                            value={formatDate(profileSnapshot?.projectedGoalFinish ?? null)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Panel>
            ) : null}

            {stepIndex === 1 ? (
              <Panel
                eyebrow="Targets and totals"
                title={`${activeProfile.name}'s current planning inputs`}
                description="This is the part that powers required pace, expected completion, and the total-hour math. The opening snapshot is treated as already including any rows in or before that same month."
              >
                <ProfileTabs activeProfileId={activeProfile.id} profiles={appState.profiles} onSelectProfile={onSelectProfile} />

                <div className="mt-5 grid gap-4 lg:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Goal date
                    </span>
                    <input
                      type="date"
                      value={activeProfile.goal.targetDate}
                      onChange={(event) => onUpdateGoalDate(activeProfile.id, event.target.value)}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Total goal hours
                    </span>
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={activeProfile.goal.totalGoalHours}
                      onChange={(event) =>
                        onUpdateGoalHours(activeProfile.id, "totalGoalHours", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Restricted goal
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={activeProfile.goal.restrictedGoalHours}
                      onChange={(event) =>
                        onUpdateGoalHours(activeProfile.id, "restrictedGoalHours", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Unrestricted goal
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={activeProfile.goal.unrestrictedGoalHours}
                      onChange={(event) =>
                        onUpdateGoalHours(activeProfile.id, "unrestrictedGoalHours", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Opening balance date
                    </span>
                    <input
                      type="date"
                      value={activeProfile.openingBalance.asOfDate}
                      onChange={(event) => onUpdateOpeningBalance(activeProfile.id, "asOfDate", event.target.value)}
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Weekdays per week
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="5"
                      step="1"
                      value={activeProfile.workSchedule.weekdayDaysPerWeek}
                      onChange={(event) =>
                        onUpdateWorkSchedule(activeProfile.id, "weekdayDaysPerWeek", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Restricted opening hours
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={activeProfile.openingBalance.restrictedHours}
                      onChange={(event) =>
                        onUpdateOpeningBalance(activeProfile.id, "restrictedHours", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Unrestricted opening hours
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={activeProfile.openingBalance.unrestrictedHours}
                      onChange={(event) =>
                        onUpdateOpeningBalance(activeProfile.id, "unrestrictedHours", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Hours per weekday
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={activeProfile.workSchedule.weekdayHoursPerDay}
                      onChange={(event) =>
                        onUpdateWorkSchedule(activeProfile.id, "weekdayHoursPerDay", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Weekend days per week
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="2"
                      step="1"
                      value={activeProfile.workSchedule.weekendDaysPerWeek}
                      onChange={(event) =>
                        onUpdateWorkSchedule(activeProfile.id, "weekendDaysPerWeek", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                      Hours per weekend day
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="0.25"
                      value={activeProfile.workSchedule.weekendHoursPerDay}
                      onChange={(event) =>
                        onUpdateWorkSchedule(activeProfile.id, "weekendHoursPerDay", parseNumber(event.target.value))
                      }
                      className={fieldClassName}
                    />
                  </label>
                </div>

                {activeSnapshot ? (
                  <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <MiniStat label="Logged today" value={formatHours(activeSnapshot.rawTotal)} />
                    <MiniStat label="Unrestricted left" value={formatHours(activeSnapshot.remainingUnrestrictedGoal)} />
                    <MiniStat label="Needed per month" value={formatHours(activeSnapshot.requiredRawMonthly ?? 0)} />
                    <MiniStat
                      label="Projected finish"
                      value={formatDate(activeSnapshot.projectedGoalFinish)}
                    />
                  </div>
                ) : null}
              </Panel>
            ) : null}

            {stepIndex === 2 ? (
              <Panel
                eyebrow="Backfill history"
                title={`Monthly logs for ${activeProfile.name}`}
                description="You do not need every historical month on day one. Start with recent months and the forecast will immediately get more realistic."
              >
                <ProfileTabs activeProfileId={activeProfile.id} profiles={appState.profiles} onSelectProfile={onSelectProfile} />

                {activeSnapshot ? (
                  <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Expected this month" value={formatHours(activeSnapshot.expectedThisMonthRaw)} />
                    <MiniStat label="Actual this month" value={formatHours(activeSnapshot.currentMonthActualRaw)} />
                    <MiniStat
                      label="Gap by today"
                      value={`${activeSnapshot.currentMonthGapRaw > 0 ? "+" : ""}${formatHours(activeSnapshot.currentMonthGapRaw)}`}
                    />
                  </div>
                ) : null}

                <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--soft-ink)]">
                  Concentrated months are the ones that receive the `1.33x` adjusted view. Restricted vs unrestricted
                  should still reflect the real raw hours you logged.
                </div>

                <div className="mt-5 space-y-4">
                  <MonthlyLogTable
                    logs={sortedLogs}
                    onRemoveMonth={(logId) => onRemoveMonth(activeProfile.id, logId)}
                    onUpdateLog={(logId, mutator) => onUpdateMonthlyLog(activeProfile.id, logId, mutator)}
                  />
                  <button
                    type="button"
                    onClick={() => onAddMonth(activeProfile.id)}
                    className="rounded-full border border-dashed border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--soft-ink)] transition hover:border-[#145c4e] hover:text-[#145c4e]"
                  >
                    Add month
                  </button>
                </div>
              </Panel>
            ) : null}

            {stepIndex === 3 ? (
              <Panel
                eyebrow="Forecast review"
                title="What the app thinks right now"
                description="This is your last check before you land on the live dashboard. You can always reopen guided setup from Settings."
              >
                <div className="grid gap-4 lg:grid-cols-2">
                  {snapshots.map(({ profile, snapshot }) => (
                    <div
                      key={profile.id}
                      className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5 shadow-[0_14px_30px_rgba(64,40,20,0.05)]"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">
                            {profile.roleLabel}
                          </p>
                          <h3 className="mt-2 text-2xl font-serif text-[var(--foreground)]">{profile.name}</h3>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            onSelectProfile(profile.id);
                            setStepIndex(1);
                          }}
                          className="rounded-full border border-[var(--border)] bg-white px-4 py-2 text-sm font-semibold text-[var(--soft-ink)] transition hover:border-[#145c4e] hover:text-[#145c4e]"
                        >
                          Edit
                        </button>
                      </div>

                      <div className="mt-5 grid gap-3 sm:grid-cols-2">
                        <MiniStat label="User goal date" value={formatDate(profile.goal.targetDate)} />
                        <MiniStat label="Projected finish" value={formatDate(snapshot.projectedGoalFinish)} />
                        <MiniStat label="Needed per month" value={formatHours(snapshot.requiredRawMonthly ?? 0)} />
                        <MiniStat label="Month-end forecast" value={formatHours(snapshot.currentMonthForecastRaw)} />
                      </div>

                      <div className="mt-5 rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4 text-sm leading-7 text-[var(--soft-ink)]">
                        {snapshot.insights[0]}
                      </div>
                    </div>
                  ))}
                </div>
              </Panel>
            ) : null}

            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setStepIndex((current) => Math.max(0, current - 1))}
                disabled={stepIndex === 0}
                className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--soft-ink)] transition hover:border-[#145c4e] hover:text-[#145c4e] disabled:cursor-not-allowed disabled:opacity-45"
              >
                Back
              </button>

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={onComplete}
                  className="rounded-full border border-[var(--border)] bg-white px-5 py-3 text-sm font-semibold text-[var(--soft-ink)] transition hover:border-[#145c4e] hover:text-[#145c4e]"
                >
                  Use current data now
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (stepIndex === steps.length - 1) {
                      onComplete();
                      return;
                    }

                    setStepIndex((current) => Math.min(steps.length - 1, current + 1));
                  }}
                  className="rounded-full bg-[#145c4e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104d42]"
                >
                  {stepIndex === steps.length - 1 ? "Start dashboard" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

function ProfileTabs({
  activeProfileId,
  profiles,
  onSelectProfile,
}: {
  activeProfileId: string;
  profiles: Profile[];
  onSelectProfile: (profileId: string) => void;
}) {
  return (
    <div className="flex flex-wrap gap-3">
      {profiles.map((profile) => {
        const isActive = profile.id === activeProfileId;

        return (
          <button
            key={profile.id}
            type="button"
            onClick={() => onSelectProfile(profile.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              isActive
                ? "bg-[#145c4e] text-white"
                : "border border-[var(--border)] bg-white text-[var(--soft-ink)] hover:border-[#145c4e] hover:text-[#145c4e]"
            }`}
          >
            {profile.name}
          </button>
        );
      })}
    </div>
  );
}
