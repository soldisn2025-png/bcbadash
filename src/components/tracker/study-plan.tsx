"use client";

import type { StudyScheduleSnapshot, StudyWeek } from "@/lib/domain/study-scheduler";

type StudyPlanProps = {
  schedule: StudyScheduleSnapshot;
};

export function StudyPlan({ schedule }: StudyPlanProps) {
  return (
    <section className="space-y-5" aria-label="BCBA study scheduler">
      <div className="grid gap-3 sm:grid-cols-3">
        <StudyStat label="Exam date" value={formatLongDate(schedule.examDate)} />
        <StudyStat label="BDS opens" value={formatLongDate(schedule.bdsStartDate)} />
        <StudyStat
          label="BDS access"
          value={schedule.moduleAccess.bds === "available" ? "Available now" : `${schedule.weeksUntilBds} wk away`}
        />
      </div>

      <div className="rounded-2xl border border-[#122922] bg-[#122922] p-5 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">This week</p>
        <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="font-serif text-2xl leading-tight">{schedule.currentWeek.focus}</h2>
            <p className="text-sm text-white/65">
              {formatShortDate(schedule.currentWeek.weekStart)} - {formatShortDate(schedule.currentWeek.weekEnd)}
            </p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 text-[#122922]">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d8278]">Target</p>
            <p className="text-2xl font-semibold tabular-nums">{schedule.currentWeek.targetHours} hrs</p>
          </div>
        </div>
        <div className="mt-5 grid gap-2">
          {schedule.currentWeek.tasks.map((task) => (
            <p key={task} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white/78">
              {task}
            </p>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-white/72">{schedule.currentWeek.reminder}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <ModuleCard
          title="Hoom House"
          status="Free, available anytime"
          body="Use this for warmup lessons, concept repair, and calmer review before and during the BDS window."
          active
        />
        <ModuleCard
          title="BDS"
          status={
            schedule.moduleAccess.bds === "available"
              ? "Available now"
              : `Starts ${formatLongDate(schedule.bdsStartDate)}`
          }
          body="Use this for the three-month push: practice sets, missed-question review, and exam rehearsal."
          active={schedule.moduleAccess.bds === "available"}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Upcoming weeks</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">Suggested targets and module focus</p>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {schedule.upcomingWeeks.map((week) => (
            <StudyWeekRow key={week.weekStart} week={week} />
          ))}
        </div>
      </div>
    </section>
  );
}

function StudyStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--muted)]">{label}</p>
      <p className="mt-2 text-base font-semibold text-[var(--foreground)]">{value}</p>
    </div>
  );
}

function ModuleCard({
  active,
  body,
  status,
  title,
}: {
  active: boolean;
  body: string;
  status: string;
  title: string;
}) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        active
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--soft-ink)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <h3 className="font-serif text-xl">{title}</h3>
        <span className="rounded-full border border-current/15 px-2.5 py-1 text-xs font-semibold">
          {active ? "Open" : "Locked"}
        </span>
      </div>
      <p className="mt-2 text-sm font-semibold">{status}</p>
      <p className="mt-2 text-sm leading-6 opacity-75">{body}</p>
    </div>
  );
}

function StudyWeekRow({ week }: { week: StudyWeek }) {
  return (
    <div className="grid gap-3 px-5 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm font-semibold text-[var(--foreground)]">
            {formatShortDate(week.weekStart)} - {formatShortDate(week.weekEnd)}
          </p>
          <span className="rounded-full bg-[#f5efe4] px-2.5 py-0.5 text-xs font-semibold text-[var(--soft-ink)]">
            {labelPhase(week.phase)}
          </span>
        </div>
        <p className="text-sm text-[var(--soft-ink)]">{week.focus}</p>
        <p className="text-xs text-[var(--muted)]">{week.modules.map(labelModule).join(" + ")}</p>
      </div>
      <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">{week.targetHours} hrs</p>
    </div>
  );
}

function labelPhase(phase: StudyWeek["phase"]): string {
  if (phase === "hours-first") return "Hours first";
  if (phase === "hoom-house") return "Hoom House";
  if (phase === "bds-window") return "BDS";
  if (phase === "exam-week") return "Exam week";
  return "Done";
}

function labelModule(module: StudyWeek["modules"][number]): string {
  return module === "hoom-house" ? "Hoom House" : "BDS";
}

function formatLongDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatShortDate(iso: string): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}
