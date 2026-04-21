import {
  MiniStat,
  Panel,
  formatHours,
  formatPercent,
  formatSignedHours,
} from "@/components/dashboard-ui";
import { MonthlyLogTable } from "@/components/monthly-log-table";
import type { MonthlyLog } from "@/lib/domain/models";
import type { ComplianceStatus, ProfileSnapshot, RuleCompliance } from "@/lib/domain/progress";

type HistoryViewProps = {
  logs: MonthlyLog[];
  snapshot: ProfileSnapshot;
  onAddMonth: () => void;
  onRemoveMonth: (logId: string) => void;
  onUpdateLog: (logId: string, mutator: (log: MonthlyLog) => MonthlyLog) => void;
};

export function HistoryView({
  logs,
  snapshot,
  onAddMonth,
  onRemoveMonth,
  onUpdateLog,
}: HistoryViewProps) {
  return (
    <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Panel
        eyebrow="Monthly history"
        title="Backfill or tune each month"
        description="Use this table to replace rough totals with a clean month-by-month history. It now captures the monthly supervision, observation, and verification details needed for compliance checks too."
      >
        <div className="space-y-4">
          {snapshot.ignoredHistoricalRawTotal > 0 ? (
            <div className="rounded-3xl border border-[#bfe1d6] bg-[#edf8f4] px-4 py-4 text-sm leading-7 text-[#145c4e]">
              {formatHours(snapshot.ignoredHistoricalRawTotal)} from older month rows is already included in the{" "}
              {snapshot.snapshotMonthLabel} opening snapshot. Those rows stay editable here, but they do not add again to the dashboard totals.
            </div>
          ) : null}
          <MonthlyLogTable logs={logs} onRemoveMonth={onRemoveMonth} onUpdateLog={onUpdateLog} />
          <button
            type="button"
            onClick={onAddMonth}
            className="rounded-full border border-dashed border-[var(--border)] px-4 py-3 text-sm font-semibold text-[var(--soft-ink)] transition hover:border-[#145c4e] hover:text-[#145c4e]"
          >
            Add month
          </button>
        </div>
      </Panel>

      <div className="space-y-6">
        <Panel
          eyebrow="Compliance summary"
          title="How the logged months hold up"
          description="Each month is checked against the current BACB form rules plus a 2027 preview, so you can spot paperwork risk without having to memorize the rule change timeline."
        >
          <div className="grid gap-3 sm:grid-cols-2">
            <MiniStat
              label="Current rules pass / warn / fail"
              value={`${snapshot.complianceSummary2022.pass}/${snapshot.complianceSummary2022.warning}/${snapshot.complianceSummary2022.fail}`}
            />
            <MiniStat
              label="2027 preview pass / warn / fail"
              value={`${snapshot.complianceSummary2027.pass}/${snapshot.complianceSummary2027.warning}/${snapshot.complianceSummary2027.fail}`}
            />
          </div>

          <div className="mt-5 space-y-3">
            {snapshot.monthRows
              .slice()
              .reverse()
              .map((row) => (
                <div key={row.month} className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{row.fieldworkType}</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--soft-ink)]">
                      {formatSignedHours(row.varianceRawHours)} vs expected
                    </p>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Raw total" value={formatHours(row.rawTotal)} />
                    <MiniStat label="Supervision %" value={formatPercent(row.supervisionPct)} />
                    <MiniStat
                      label="Unrestricted share"
                      value={formatPercent(row.unrestrictedShare)}
                    />
                  </div>

                  <div className="mt-4 grid gap-3">
                    <ComplianceBlock title="Current rules check" compliance={row.compliance2022} />
                    <ComplianceBlock title="2027 preview" compliance={row.compliance2027} />
                  </div>
                </div>
              ))}
          </div>
        </Panel>

        <Panel
          eyebrow="Monthly roll-up"
          title="How each month translated"
          description="Actual raw totals stay visible, while progress deltas show how much each month really moved the finish line."
        >
          <div className="space-y-3">
            {snapshot.monthRows
              .slice()
              .reverse()
              .map((row) => (
                <div key={`${row.month}-rollup`} className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{row.label}</p>
                      <p className="text-xs uppercase tracking-[0.18em] text-[var(--muted)]">{row.verificationStatus.replace("_", " ")}</p>
                    </div>
                    <p className="text-sm font-semibold text-[var(--soft-ink)]">
                      {formatHours(row.observationMinutes)} observed
                    </p>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-3">
                    <MiniStat label="Progress delta" value={formatHours(row.countableDelta)} />
                    <MiniStat label="Adjusted delta" value={formatHours(row.adjustedDelta)} />
                    <MiniStat
                      label="Individual supervision"
                      value={formatPercent(row.individualSupervisionShare)}
                    />
                  </div>
                </div>
              ))}
          </div>
        </Panel>
      </div>
    </section>
  );
}

function ComplianceBlock({ title, compliance }: { title: string; compliance: RuleCompliance }) {
  const flaggedChecks = compliance.checks.filter((check) => check.status !== "pass");

  return (
    <div className={`rounded-3xl border px-4 py-4 ${getComplianceTone(compliance.status)}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-semibold">{title}</p>
        <span className="rounded-full border border-current/15 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]">
          {compliance.status}
        </span>
      </div>
      <div className="mt-3 grid gap-2 text-sm leading-7">
        {flaggedChecks.length > 0 ? (
          flaggedChecks.map((check) => (
            <p key={`${title}-${check.id}`}>
              <span className="font-semibold">{check.label}:</span> {check.detail}
            </p>
          ))
        ) : (
          <p>All tracked monthly checks pass with the data logged so far.</p>
        )}
      </div>
    </div>
  );
}

function getComplianceTone(status: ComplianceStatus) {
  if (status === "fail") {
    return "border-[#efcfbf] bg-[#fff4ed] text-[#8d3f25]";
  }

  if (status === "warning") {
    return "border-[#e6d9a8] bg-[#fff9e6] text-[#695315]";
  }

  return "border-[#bfe1d6] bg-[#edf8f4] text-[#145c4e]";
}
