import {
  Panel,
  ScenarioNote,
  fieldClassName,
  formatDate,
  formatHours,
  parseNumber,
} from "@/components/dashboard-ui";
import type { Profile } from "@/lib/domain/models";
import type { ProfileSnapshot } from "@/lib/domain/progress";

type ScenariosViewProps = {
  profile: Profile;
  snapshot: ProfileSnapshot;
  onWeekdayDaysPerWeekChange: (value: number) => void;
  onWeekdayHoursPerDayChange: (value: number) => void;
  onWeekendDaysPerWeekChange: (value: number) => void;
  onWeekendHoursPerDayChange: (value: number) => void;
};

export function ScenariosView({
  profile,
  snapshot,
  onWeekdayDaysPerWeekChange,
  onWeekdayHoursPerDayChange,
  onWeekendDaysPerWeekChange,
  onWeekendHoursPerDayChange,
}: ScenariosViewProps) {
  return (
    <section className="grid gap-6">
      <Panel
        eyebrow="Impact simulator"
        title="If life disrupts the plan, what shifts?"
        description="Scenario math uses the recent realistic pace, your work schedule, and the same BACB mix efficiency already visible on the dashboard."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {snapshot.scenarios.map((scenario) => (
            <div key={scenario.label} className="rounded-[28px] border border-[var(--border)] bg-[var(--card)] p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{scenario.label}</p>
              <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{formatHours(scenario.lostHours)}</p>
              <div className="mt-5 space-y-3 text-sm text-[var(--soft-ink)]">
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">New required monthly pace</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {formatHours(scenario.requiredMonthlyAfterMiss ?? 0)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Finish if total pace holds</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {formatDate(scenario.projectedRawFinish)}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">Finish with current mix</p>
                  <p className="mt-1 text-lg font-semibold text-[var(--foreground)]">
                    {formatDate(scenario.projectedCountableFinish)}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel
          eyebrow="Schedule assumptions"
          title="Tune the simulator"
          description="Separate weekday and weekend plans here so the simulator reflects the kind of week you actually expect to work."
        >
          <div className="grid gap-4 md:grid-cols-2">
            <label className="grid gap-2 text-sm">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
                Weekdays per week
              </span>
              <input
                type="number"
                min="0"
                max="5"
                value={profile.workSchedule.weekdayDaysPerWeek}
                onChange={(event) =>
                  onWeekdayDaysPerWeekChange(Math.min(5, Math.max(0, parseNumber(event.target.value))))
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
                value={profile.workSchedule.weekdayHoursPerDay}
                onChange={(event) => onWeekdayHoursPerDayChange(parseNumber(event.target.value))}
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
                value={profile.workSchedule.weekendDaysPerWeek}
                onChange={(event) =>
                  onWeekendDaysPerWeekChange(Math.min(2, Math.max(0, parseNumber(event.target.value))))
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
                value={profile.workSchedule.weekendHoursPerDay}
                onChange={(event) => onWeekendHoursPerDayChange(parseNumber(event.target.value))}
                className={fieldClassName}
              />
            </label>
          </div>
        </Panel>

        <Panel
          eyebrow="Reality check"
          title="Interpret the scenarios"
          description="This language is meant to be coach-like rather than punitive, so the dashboard nudges action instead of just reporting problems."
        >
          <div className="grid gap-3">
            <ScenarioNote
              title="If this month goes off-plan"
              body={`A missed week adds about ${formatHours(
                snapshot.scenarios.at(-1)?.lostHours ?? 0,
              )} to the short-term gap. That pushes the required monthly pace to ${formatHours(
                snapshot.scenarios.at(-1)?.requiredMonthlyAfterMiss ?? 0,
              )}.`}
            />
            <ScenarioNote
              title="If unrestricted remains light"
              body={`The simple total-hour finish can happen sooner than the realistic finish if the mix stays too restricted-heavy. Right now the two projections differ because ${profile.name} still needs ${formatHours(
                snapshot.remainingUnrestrictedGoal,
              )} unrestricted hours.`}
            />
            <ScenarioNote
              title="Best catch-up lever"
              body="Bias the next strong month toward unrestricted work. That closes both the calendar gap and the locked-restricted gap at the same time."
            />
          </div>
        </Panel>
      </div>
    </section>
  );
}
