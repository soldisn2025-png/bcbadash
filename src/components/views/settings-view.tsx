import { Panel, fieldClassName, parseNumber } from "@/components/dashboard-ui";
import type { Profile } from "@/lib/domain/models";

type SettingsViewProps = {
  hasHydrated: boolean;
  isSaving: boolean;
  profile: Profile;
  profileNames: string[];
  storageMessage: string;
  storageSource: "local" | "supabase";
  onGoalDateChange: (value: string) => void;
  onGoalHoursChange: (field: "totalGoalHours" | "restrictedGoalHours" | "unrestrictedGoalHours", value: number) => void;
  onOpeningBalanceChange: (field: "asOfDate" | "restrictedHours" | "unrestrictedHours", value: string | number) => void;
  onOpenOnboarding: () => void;
  onReset: () => void;
};

export function SettingsView({
  hasHydrated,
  isSaving,
  profile,
  profileNames,
  storageMessage,
  storageSource,
  onGoalDateChange,
  onGoalHoursChange,
  onOpeningBalanceChange,
  onOpenOnboarding,
  onReset,
}: SettingsViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Panel
        eyebrow="Goal settings"
        title="Define the targets"
        description="Everything on the dashboard recomputes instantly from these settings, so this is the right place to model a new finish line."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">Goal date</span>
            <input
              type="date"
              value={profile.goal.targetDate}
              onChange={(event) => onGoalDateChange(event.target.value)}
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
              value={profile.goal.totalGoalHours}
              onChange={(event) => onGoalHoursChange("totalGoalHours", parseNumber(event.target.value))}
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
              value={profile.goal.restrictedGoalHours}
              onChange={(event) => onGoalHoursChange("restrictedGoalHours", parseNumber(event.target.value))}
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
              value={profile.goal.unrestrictedGoalHours}
              onChange={(event) => onGoalHoursChange("unrestrictedGoalHours", parseNumber(event.target.value))}
              className={fieldClassName}
            />
          </label>
        </div>
      </Panel>

      <Panel
        eyebrow="Opening balance"
        title="Set today or a historical snapshot"
        description="This is the quickest way to start if you only know your totals right now. Month rows in or before the snapshot month are treated as already included, so they will not be added on top of the opening balance."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Snapshot date
            </span>
            <input
              type="date"
              value={profile.openingBalance.asOfDate}
              onChange={(event) => onOpeningBalanceChange("asOfDate", event.target.value)}
              className={fieldClassName}
            />
          </label>
          <div />
          <label className="grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Restricted opening hours
            </span>
            <input
              type="number"
              min="0"
              step="0.25"
              value={profile.openingBalance.restrictedHours}
              onChange={(event) => onOpeningBalanceChange("restrictedHours", parseNumber(event.target.value))}
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
              value={profile.openingBalance.unrestrictedHours}
              onChange={(event) => onOpeningBalanceChange("unrestrictedHours", parseNumber(event.target.value))}
              className={fieldClassName}
            />
          </label>
        </div>
      </Panel>

      <Panel
        eyebrow="Data controls"
        title="Persistence and reset"
        description="Use guided setup whenever you want to rename profiles or backfill real data, then keep this panel for sync status and sample resets."
      >
        <div className="grid gap-4">
          <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 text-sm leading-7 text-[var(--soft-ink)]">
            <p>Local persistence: {hasHydrated ? "Active in this browser" : "Loading..."}</p>
            <p>Seed profiles: {profileNames.join(" and ")}</p>
            <p>Current source: {storageSource === "supabase" ? "Supabase" : "Local browser storage"}</p>
            <p>Sync status: {isSaving ? "Saving..." : "Idle"}</p>
            <p>{storageMessage}</p>
          </div>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onOpenOnboarding}
              className="rounded-full bg-[#145c4e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#104d42]"
            >
              Open guided setup
            </button>
            <button
              type="button"
              onClick={onReset}
              className="rounded-full bg-[#9b4b2e] px-5 py-3 text-sm font-semibold text-white transition hover:bg-[#863e24]"
            >
              Reset to sample data
            </button>
          </div>
        </div>
      </Panel>
    </section>
  );
}
