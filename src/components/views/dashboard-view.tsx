import type { ReactNode } from "react";
import dynamic from "next/dynamic";

import { GoalRail, MetricCard, MiniStat, Panel, formatDate, formatHours, formatSignedHours } from "@/components/dashboard-ui";
import type { Profile } from "@/lib/domain/models";
import type { ComplianceStatus, GuardrailSeverity, ProfileSnapshot } from "@/lib/domain/progress";

const MonthlyHoursChart = dynamic(
  () => import("@/components/charts/monthly-hours-chart").then((mod) => mod.MonthlyHoursChart),
  {
    ssr: false,
    loading: () => <ChartPlaceholder />,
  },
);

const MixChart = dynamic(() => import("@/components/charts/mix-chart").then((mod) => mod.MixChart), {
  ssr: false,
  loading: () => <ChartPlaceholder />,
});

type DashboardViewProps = {
  profile: Profile;
  snapshot: ProfileSnapshot;
};

export function DashboardView({ profile, snapshot }: DashboardViewProps) {
  const restrictedGoalDone = snapshot.remainingRestrictedGoal <= 0;
  const unrestrictedGoalDone = snapshot.remainingUnrestrictedGoal <= 0;

  return (
    <section className="grid gap-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Total logged today"
          value={formatHours(snapshot.rawTotal)}
          helper={`${formatHours(snapshot.openingSnapshotRawTotal)} in the ${snapshot.snapshotMonthLabel} snapshot + ${formatHours(snapshot.addedAfterSnapshotRawTotal)} added after that`}
        />
        <MetricCard
          label="Restricted goal"
          value={restrictedGoalDone ? "Done" : formatHours(snapshot.remainingRestrictedGoal)}
          helper={
            restrictedGoalDone
              ? `${formatHours(snapshot.rawRestricted)} logged out of ${formatHours(profile.goal.restrictedGoalHours)}.`
              : `${formatHours(snapshot.rawRestricted)} logged, ${formatHours(snapshot.remainingRestrictedGoal)} left to reach ${formatHours(profile.goal.restrictedGoalHours)}.`
          }
        />
        <MetricCard
          label="Unrestricted goal"
          value={unrestrictedGoalDone ? "Done" : formatHours(snapshot.remainingUnrestrictedGoal)}
          helper={
            unrestrictedGoalDone
              ? `${formatHours(snapshot.rawUnrestricted)} logged out of ${formatHours(profile.goal.unrestrictedGoalHours)}.`
              : `${formatHours(snapshot.rawUnrestricted)} logged, ${formatHours(snapshot.remainingUnrestrictedGoal)} left to reach ${formatHours(profile.goal.unrestrictedGoalHours)}.`
          }
        />
        <MetricCard
          label="Projected finish"
          value={formatDate(snapshot.projectedGoalFinish)}
          helper={getProjectedFinishHelper(snapshot)}
        />
      </div>

      <div className="rounded-3xl border border-[#bfe1d6] bg-[#edf8f4] px-5 py-4 text-sm leading-7 text-[#145c4e]">
        {restrictedGoalDone && !unrestrictedGoalDone
          ? `${profile.name} has already finished the restricted goal. From here, unrestricted hours are the main thing that moves the finish date forward.`
          : unrestrictedGoalDone && !restrictedGoalDone
            ? `${profile.name} has already finished the unrestricted goal. The next push is simply to finish the remaining restricted hours.`
            : snapshot.lockedRestricted > 0
              ? `${formatHours(snapshot.lockedRestricted)} restricted hours are still waiting on more unrestricted hours before the mix fully catches up.`
              : "Restricted and unrestricted progress are moving together cleanly right now."}
      </div>

      <Panel
        eyebrow="Forecast"
        title="Goal date vs likely finish"
        description="These dates stay focused on the actual remaining goal: if restricted is already done, the forecast shifts to the unrestricted hours that are still left."
      >
        <div className="grid gap-4 md:grid-cols-3">
          {snapshot.projectionPoints.map((point) => (
            <div key={point.label} className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{point.label}</p>
              <p className="mt-3 text-2xl font-semibold text-[var(--foreground)]">
                {formatDate(point.completionDate)}
              </p>
              <p className="mt-2 text-sm leading-7 text-[var(--soft-ink)]">{point.description}</p>
            </div>
          ))}
        </div>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[1.3fr_0.7fr]">
        <Panel
          eyebrow="This month"
          title="Expected vs actual pace"
          description="This compares the current month against the pace needed to hit the chosen goal date."
        >
          <div className="grid gap-4 md:grid-cols-3">
            <MiniStat label="Expected by today" value={formatHours(snapshot.expectedByTodayRaw)} />
            <MiniStat label="Actual by today" value={formatHours(snapshot.currentMonthActualRaw)} />
            <MiniStat
              label="Gap"
              value={formatSignedHours(snapshot.currentMonthGapRaw)}
              tone={snapshot.currentMonthGapRaw >= 0 ? "positive" : "warning"}
            />
          </div>
          <div className="mt-6">
            <GoalRail
              label="Raw goal"
              current={snapshot.rawTotal}
              goal={profile.goal.totalGoalHours}
              tint="bg-[#145c4e]"
            />
            <GoalRail
              label="Restricted"
              current={snapshot.rawRestricted}
              goal={profile.goal.restrictedGoalHours}
              tint="bg-[#d79b5d]"
            />
            <GoalRail
              label="Unrestricted"
              current={snapshot.rawUnrestricted}
              goal={profile.goal.unrestrictedGoalHours}
              tint="bg-[#307a6b]"
            />
          </div>
        </Panel>

        <Panel
          eyebrow="Pace guidance"
          title="Daily, weekly, and monthly checkpoints"
          description="These benchmarks show what today, this week, and this month need to look like if the goal date is going to stay realistic."
        >
          <div className="grid gap-3">
            <MiniStat label="Planned monthly capacity" value={formatHours(snapshot.plannedMonthlyRate)} />
            <MiniStat label="Required weekly" value={formatHours(snapshot.requiredRawWeekly ?? 0)} tone="positive" />
            <MiniStat label="Required monthly" value={formatHours(snapshot.requiredRawMonthly ?? 0)} tone="positive" />
            <MiniStat label="Realistic recent pace" value={formatHours(snapshot.realisticRawRate)} />
            <MiniStat label="Optimistic pace" value={formatHours(snapshot.optimisticRawRate)} />
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel
          eyebrow="Monthly trend"
          title="Actual hours vs expected hours"
          description="This chart answers the motivating question directly: are we banking enough hours each month to land on the chosen date?"
        >
          <MonthlyHoursChart rows={snapshot.monthRows} />
        </Panel>

        <Panel
          eyebrow="Hour mix"
          title="Restricted and unrestricted by month"
          description="This helps you spot months that felt productive but still did not move unrestricted progress enough."
        >
          <MixChart rows={snapshot.monthRows} />
        </Panel>
      </div>

      <Panel
        eyebrow="Coach notes"
        title="High-signal insights"
        description="These callouts are generated from the current totals, monthly history, and target date."
      >
        <div className="grid gap-3">
          {snapshot.insights.map((insight) => (
            <div
              key={insight}
              className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-7 text-[var(--soft-ink)]"
            >
              {insight}
            </div>
          ))}
        </div>
      </Panel>

      {snapshot.ignoredHistoricalRawTotal > 0 ? (
        <FoldedSection
          eyebrow="Snapshot logic"
          title="Why the total may look different from older rows"
          description="Open this if the current total looks different from the month-by-month history."
        >
          <div className="rounded-3xl border border-[#bfe1d6] bg-[#edf8f4] px-5 py-4 text-sm leading-7 text-[#145c4e]">
            {formatHours(snapshot.ignoredHistoricalRawTotal)} from {snapshot.ignoredHistoricalMonthCount} older month
            {snapshot.ignoredHistoricalMonthCount === 1 ? "" : "s"} is already included in the {snapshot.snapshotMonthLabel} opening snapshot, so it is not added again on top of the current total.
          </div>
        </FoldedSection>
      ) : null}

      <FoldedSection
        eyebrow="Paperwork checks"
        title="Monthly compliance snapshot"
        description="Open this only when you want to review supervision, observation, and signature requirements."
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <ComplianceSnapshotCard
            label="Current rules check"
            compliance={snapshot.currentMonthCompliance2022}
          />
          <ComplianceSnapshotCard
            label="2027 preview"
            compliance={snapshot.currentMonthCompliance2027}
          />
        </div>
      </FoldedSection>

      <FoldedSection
        eyebrow="Rule checks"
        title="Guardrails and risks"
        description="Open this only when you want the stricter BACB-focused warnings."
      >
        <div className="grid gap-3">
          {snapshot.guardrails.length > 0 ? (
            snapshot.guardrails.map((guardrail) => (
              <div
                key={guardrail.id}
                className={`rounded-3xl border px-5 py-4 ${getGuardrailTone(guardrail.severity)}`}
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-base font-semibold">{guardrail.title}</p>
                  <span className="rounded-full border border-current/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] opacity-80">
                    {guardrail.severity}
                  </span>
                </div>
                <p className="mt-3 text-sm leading-7 opacity-90">{guardrail.body}</p>
              </div>
            ))
          ) : (
            <div className="rounded-3xl border border-[#bfe1d6] bg-[#edf8f4] px-5 py-4 text-sm leading-7 text-[#145c4e]">
              No major guardrails are firing right now. Keep reviewing signed monthly forms with the supervisor, but the current data does not show an obvious mix or pace compliance risk.
            </div>
          )}
        </div>
      </FoldedSection>
    </section>
  );
}

function getGuardrailTone(severity: GuardrailSeverity) {
  if (severity === "warning") {
    return "border-[#efcfbf] bg-[#fff4ed] text-[#8d3f25]";
  }

  if (severity === "caution") {
    return "border-[#e6d9a8] bg-[#fff9e6] text-[#695315]";
  }

  return "border-[#bfe1d6] bg-[#edf8f4] text-[#145c4e]";
}

function ComplianceSnapshotCard({
  label,
  compliance,
}: {
  label: string;
  compliance: ProfileSnapshot["currentMonthCompliance2022"];
}) {
  if (!compliance) {
    return (
      <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-5 text-sm leading-7 text-[var(--soft-ink)]">
        No current-month row is logged yet.
      </div>
    );
  }

  const flaggedChecks = compliance.checks.filter((check) => check.status !== "pass").slice(0, 3);

  return (
    <div className={`rounded-3xl border px-5 py-4 ${getComplianceCardTone(compliance.status)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">{label}</p>
        <span className="rounded-full border border-current/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {compliance.status}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-sm leading-7">
        {flaggedChecks.length > 0 ? (
          flaggedChecks.map((check) => (
            <p key={`${label}-${check.id}`}>
              <span className="font-semibold">{check.label}:</span> {check.detail}
            </p>
          ))
        ) : (
          <p>All tracked current-month compliance checks pass with the data logged so far.</p>
        )}
      </div>
    </div>
  );
}

function getComplianceCardTone(status: ComplianceStatus) {
  if (status === "fail") {
    return "border-[#efcfbf] bg-[#fff4ed] text-[#8d3f25]";
  }

  if (status === "warning") {
    return "border-[#e6d9a8] bg-[#fff9e6] text-[#695315]";
  }

  return "border-[#bfe1d6] bg-[#edf8f4] text-[#145c4e]";
}

function ChartPlaceholder() {
  return (
    <div className="flex h-80 w-full items-center justify-center rounded-3xl border border-dashed border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted)]">
      Loading chart...
    </div>
  );
}

function getProjectedFinishHelper(snapshot: ProfileSnapshot) {
  if (!snapshot.projectedGoalFinish) {
    return "Add a schedule or a little more month-by-month history to get a stable estimate.";
  }

  if (snapshot.usesPlannedScheduleForecast) {
    return `Using the planned schedule of about ${formatHours(snapshot.plannedMonthlyRate)} per month because there is no completed month history yet.`;
  }

  if (snapshot.projectedGoalFinish <= snapshot.goalDate) {
    return `At the current pace, this still lands on or before the goal date of ${formatDate(snapshot.goalDate)}.`;
  }

  return `At the current pace, this lands after the goal date of ${formatDate(snapshot.goalDate)}.`;
}

function FoldedSection({
  children,
  description,
  eyebrow,
  title,
}: {
  children: ReactNode;
  description: string;
  eyebrow: string;
  title: string;
}) {
  return (
    <details className="group rounded-[32px] border border-[var(--border)] bg-[var(--panel)] shadow-[0_16px_40px_rgba(64,40,20,0.07)]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{eyebrow}</p>
          <h2 className="font-serif text-2xl text-[var(--foreground)]">{title}</h2>
          <p className="max-w-3xl text-sm leading-7 text-[var(--soft-ink)]">{description}</p>
        </div>
        <span className="mt-1 rounded-full border border-[var(--border)] px-3 py-1 text-xs font-semibold text-[var(--soft-ink)] transition group-open:bg-[var(--card)]">
          Open
        </span>
      </summary>
      <div className="border-t border-[var(--border)] px-5 py-5 sm:px-6">{children}</div>
    </details>
  );
}
