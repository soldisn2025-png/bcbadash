"use client";

import type { StudyScheduleSnapshot, StudyWeek } from "@/lib/domain/study-scheduler";
import type { StudyCheckIn } from "@/lib/storage/tracker";

type StudyPlanProps = {
  checkIns: StudyCheckIn[];
  schedule: StudyScheduleSnapshot;
  onCheckInChange: (
    weekStart: string,
    patch: Pick<StudyCheckIn, "completed"> | Pick<StudyCheckIn, "comment">,
  ) => void;
};

export function StudyPlan({ checkIns, schedule, onCheckInChange }: StudyPlanProps) {
  const currentCheckIn = getCheckIn(checkIns, schedule.currentWeek.weekStart);

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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Why this target</p>
        <p className="mt-2 text-sm leading-6 text-[var(--soft-ink)]">{schedule.recommendation.studyHoursBasis}</p>
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
        <ModuleRecommendationCard inverted week={schedule.currentWeek} />
        <div className="mt-5 grid gap-2">
          {schedule.currentWeek.tasks.map((task) => (
            <p key={task} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white/78">
              {task}
            </p>
          ))}
        </div>
        <p className="mt-4 text-sm leading-6 text-white/72">{schedule.currentWeek.reminder}</p>
        <div className="mt-5 rounded-2xl border border-white/12 bg-white/8 p-4">
          <StudyCheckInControls
            checkIn={currentCheckIn}
            inverted
            week={schedule.currentWeek}
            onCheckInChange={onCheckInChange}
          />
        </div>
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
            <StudyWeekRow
              key={week.weekStart}
              checkIn={getCheckIn(checkIns, week.weekStart)}
              week={week}
              onCheckInChange={onCheckInChange}
            />
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

function StudyWeekRow({
  checkIn,
  week,
  onCheckInChange,
}: {
  checkIn?: StudyCheckIn;
  week: StudyWeek;
  onCheckInChange: StudyPlanProps["onCheckInChange"];
}) {
  return (
    <div className="grid gap-4 px-5 py-4">
      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-center">
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
      <ModuleRecommendationCard week={week} />
      <StudyCheckInControls checkIn={checkIn} week={week} onCheckInChange={onCheckInChange} />
    </div>
  );
}

function ModuleRecommendationCard({ inverted = false, week }: { inverted?: boolean; week: StudyWeek }) {
  const recommendation = week.moduleRecommendation;

  return (
    <div
      className={`mt-5 rounded-2xl border px-4 py-3 ${
        inverted
          ? "border-white/12 bg-white/8 text-white"
          : "border-[var(--border)] bg-[#f5efe4] text-[var(--foreground)]"
      }`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
            inverted ? "border-white/18 text-white/75" : "border-[#dccfbe] text-[var(--soft-ink)]"
          }`}
        >
          {recommendation.domain}
        </span>
        <p className="text-sm font-semibold">{recommendation.label}</p>
      </div>
      <p className={`mt-2 text-sm leading-6 ${inverted ? "text-white/72" : "text-[var(--soft-ink)]"}`}>
        {recommendation.detail}
      </p>
    </div>
  );
}

function StudyCheckInControls({
  checkIn,
  inverted = false,
  week,
  onCheckInChange,
}: {
  checkIn?: StudyCheckIn;
  inverted?: boolean;
  week: StudyWeek;
  onCheckInChange: StudyPlanProps["onCheckInChange"];
}) {
  const comment = checkIn?.comment ?? "";
  const completed = checkIn?.completed ?? false;
  const isComplete = completed && comment.trim().length > 0;

  return (
    <div className="grid gap-3">
      <label className={`flex items-center gap-3 text-sm font-semibold ${inverted ? "text-white" : "text-[var(--foreground)]"}`}>
        <input
          type="checkbox"
          checked={completed}
          onChange={(event) => onCheckInChange(week.weekStart, { completed: event.target.checked })}
          className="h-4 w-4 rounded border-[var(--border)] accent-[#122922]"
        />
        Mark this week complete
      </label>
      <textarea
        value={comment}
        onChange={(event) => onCheckInChange(week.weekStart, { comment: event.target.value })}
        placeholder="Required weekly comment: what got done, what felt hard, and what to adjust next week."
        rows={2}
        className={`w-full resize-none rounded-xl border px-3 py-2 text-sm leading-6 outline-none transition focus:ring-2 focus:ring-[#122922]/20 ${
          inverted
            ? "border-white/15 bg-white text-[#122922] placeholder:text-[#6d8278]"
            : "border-[var(--border)] bg-white text-[var(--foreground)] placeholder:text-[var(--muted)]"
        }`}
      />
      <p className={`text-xs ${inverted ? "text-white/62" : "text-[var(--muted)]"}`}>
        {isComplete ? "Complete: checkmark and comment are both saved." : "A week only counts when both the checkmark and comment are filled in."}
      </p>
    </div>
  );
}

function getCheckIn(checkIns: StudyCheckIn[], weekStart: string): StudyCheckIn | undefined {
  return checkIns.find((checkIn) => checkIn.weekStart === weekStart);
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
