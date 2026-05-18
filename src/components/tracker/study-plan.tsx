"use client";

import { BACB_OUTLINE_SOURCE } from "@/lib/domain/bacb-outline";
import type { StudyModuleRecommendation, StudyScheduleSnapshot, StudyTrack, StudyWeek } from "@/lib/domain/study-scheduler";
import type { StudyCheckIn } from "@/lib/storage/tracker";

type StudyPlanProps = {
  checkIns: StudyCheckIn[];
  schedule: StudyScheduleSnapshot;
  onCheckInChange: (
    weekStart: string,
    patch:
      | Pick<StudyCheckIn, "completed">
      | Pick<StudyCheckIn, "comment">
      | Pick<StudyCheckIn, "completedTaskIds">,
  ) => void;
};

export function StudyPlan({ checkIns, schedule, onCheckInChange }: StudyPlanProps) {
  const completedTaskIds = new Set(checkIns.flatMap((checkIn) => checkIn.completedTaskIds));
  const completedTaskCount = completedTaskIds.size;
  const completionPct = schedule.outline.totalTasks === 0 ? 0 : (completedTaskCount / schedule.outline.totalTasks) * 100;

  return (
    <section className="space-y-5" aria-label="BCBA study scheduler">
      <div className="grid gap-3 sm:grid-cols-4">
        <StudyStat label="Exam date" value={formatLongDate(schedule.examDate)} />
        <StudyStat label="Outline tasks" value={`${completedTaskCount}/${schedule.outline.totalTasks}`} />
        <StudyStat label="Scored questions" value={`${schedule.outline.totalQuestions}`} />
        <StudyStat
          label="BDS access"
          value={schedule.moduleAccess.bds === "available" ? "Available now" : `${schedule.weeksUntilBds} wk away`}
        />
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">BCBA 6th edition plan</p>
            <p className="mt-2 text-sm leading-6 text-[var(--soft-ink)]">{schedule.recommendation.studyHoursBasis}</p>
          </div>
          <p className="shrink-0 text-2xl font-semibold tabular-nums text-[var(--foreground)]">{completionPct.toFixed(0)}%</p>
        </div>
        <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-[var(--border)]">
          <div className="h-full rounded-full bg-[#2d7a5a]" style={{ width: `${Math.min(100, completionPct)}%` }} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {schedule.tracks.map((track) => (
          <CurrentTrackCard
            key={track.id}
            checkIn={getCheckIn(checkIns, track.currentWeek.weekStart)}
            completedTaskIds={completedTaskIds}
            track={track}
            onCheckInChange={onCheckInChange}
          />
        ))}
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
        <div className="border-b border-[var(--border)] px-5 py-4">
          <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Upcoming weeks</p>
          <p className="mt-0.5 text-sm font-medium text-[var(--foreground)]">Both daily study options, weighted by the BACB outline</p>
        </div>
        <div className="grid gap-0 lg:grid-cols-2 lg:divide-x lg:divide-[var(--border)]">
          {schedule.tracks.map((track) => (
            <TrackWeeks
              key={track.id}
              checkIns={checkIns}
              completedTaskIds={completedTaskIds}
              track={track}
              onCheckInChange={onCheckInChange}
            />
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] px-5 py-4">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">Reference</p>
        <p className="mt-2 text-sm leading-6 text-[var(--soft-ink)]">
          Based on {BACB_OUTLINE_SOURCE.label}{" "}
          <a className="font-semibold text-[#1f6b55] underline-offset-4 hover:underline" href={BACB_OUTLINE_SOURCE.url} target="_blank" rel="noreferrer">
            {BACB_OUTLINE_SOURCE.url}
          </a>
        </p>
      </div>
    </section>
  );
}

function CurrentTrackCard({
  checkIn,
  completedTaskIds,
  track,
  onCheckInChange,
}: {
  checkIn?: StudyCheckIn;
  completedTaskIds: Set<string>;
  track: StudyTrack;
  onCheckInChange: StudyPlanProps["onCheckInChange"];
}) {
  return (
    <div className="rounded-2xl border border-[#122922] bg-[#122922] p-5 text-white">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-white/55">This week</p>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h2 className="font-serif text-2xl leading-tight">{track.label}</h2>
          <p className="text-sm text-white/65">
            {formatShortDate(track.currentWeek.weekStart)} - {formatShortDate(track.currentWeek.weekEnd)}
          </p>
        </div>
        <div className="rounded-2xl bg-white px-4 py-3 text-[#122922]">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#6d8278]">Target</p>
          <p className="text-2xl font-semibold tabular-nums">{track.currentWeek.targetHours} hrs</p>
        </div>
      </div>
      <p className="mt-4 text-sm leading-6 text-white/78">{track.currentWeek.focus}</p>
      <div className="mt-4 grid gap-2">
        {track.currentWeek.tasks.map((task) => (
          <p key={task} className="rounded-xl border border-white/10 bg-white/8 px-3 py-2 text-sm text-white/78">
            {task}
          </p>
        ))}
      </div>
      <StudyModules
        completedTaskIds={completedTaskIds}
        inverted
        modules={track.currentWeek.modules}
        weekStart={track.currentWeek.weekStart}
        onCheckInChange={onCheckInChange}
      />
      <p className="mt-4 text-sm leading-6 text-white/72">{track.currentWeek.reminder}</p>
      <div className="mt-5 rounded-2xl border border-white/12 bg-white/8 p-4">
        <StudyCheckInControls
          checkIn={checkIn}
          inverted
          week={track.currentWeek}
          onCheckInChange={onCheckInChange}
        />
      </div>
    </div>
  );
}

function TrackWeeks({
  checkIns,
  completedTaskIds,
  track,
  onCheckInChange,
}: {
  checkIns: StudyCheckIn[];
  completedTaskIds: Set<string>;
  track: StudyTrack;
  onCheckInChange: StudyPlanProps["onCheckInChange"];
}) {
  return (
    <div>
      <div className="border-b border-[var(--border)] px-5 py-3">
        <p className="text-sm font-semibold text-[var(--foreground)]">{track.label}</p>
        <p className="text-xs text-[var(--muted)]">{track.weeklyHours} study hrs/week</p>
      </div>
      <div className="divide-y divide-[var(--border)]">
        {track.upcomingWeeks.map((week) => (
          <StudyWeekRow
            key={`${track.id}-${week.weekStart}`}
            checkIn={getCheckIn(checkIns, week.weekStart)}
            completedTaskIds={completedTaskIds}
            week={week}
            onCheckInChange={onCheckInChange}
          />
        ))}
      </div>
    </div>
  );
}

function StudyWeekRow({
  checkIn,
  completedTaskIds,
  week,
  onCheckInChange,
}: {
  checkIn?: StudyCheckIn;
  completedTaskIds: Set<string>;
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
        </div>
        <p className="text-lg font-semibold tabular-nums text-[var(--foreground)]">{week.targetHours} hrs</p>
      </div>
      <StudyModules
        completedTaskIds={completedTaskIds}
        modules={week.modules}
        weekStart={week.weekStart}
        onCheckInChange={onCheckInChange}
      />
      <StudyCheckInControls checkIn={checkIn} week={week} onCheckInChange={onCheckInChange} />
    </div>
  );
}

function StudyModules({
  completedTaskIds,
  inverted = false,
  modules,
  weekStart,
  onCheckInChange,
}: {
  completedTaskIds: Set<string>;
  inverted?: boolean;
  modules: StudyModuleRecommendation[];
  weekStart: string;
  onCheckInChange: StudyPlanProps["onCheckInChange"];
}) {
  if (modules.length === 0) {
    return (
      <p className={`mt-4 rounded-xl border px-3 py-2 text-sm ${inverted ? "border-white/10 bg-white/8 text-white/72" : "border-[var(--border)] bg-[#f5efe4] text-[var(--soft-ink)]"}`}>
        Mixed review week. Revisit completed domains and missed practice items.
      </p>
    );
  }

  return (
    <div className="mt-4 grid gap-3">
      {modules.map((module) => (
        <details
          key={`${weekStart}-${module.domainId}`}
          className={`rounded-2xl border px-4 py-3 ${inverted ? "border-white/12 bg-white/8 text-white" : "border-[var(--border)] bg-[#f5efe4] text-[var(--foreground)]"}`}
        >
          <summary className="cursor-pointer list-none">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${inverted ? "border-white/18 text-white/75" : "border-[#dccfbe] text-[var(--soft-ink)]"}`}>
                  Domain {module.domainId}
                </span>
                <p className="text-sm font-semibold">{module.domainTitle}</p>
              </div>
              <p className={`text-xs font-semibold ${inverted ? "text-white/65" : "text-[var(--muted)]"}`}>
                {module.questionCount} questions | {module.examPercent}%
              </p>
            </div>
          </summary>
          <div className="mt-3 grid gap-2">
            {module.tasks.map((task) => {
              const checked = completedTaskIds.has(task.id);
              return (
                <label
                  key={task.id}
                  className={`flex items-start gap-3 rounded-xl border px-3 py-2 text-sm leading-5 ${inverted ? "border-white/10 bg-white/8 text-white/78" : "border-white/70 bg-white/55 text-[var(--soft-ink)]"}`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleTask(task.id, completedTaskIds, weekStart, onCheckInChange)}
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-[var(--border)] accent-[#122922]"
                  />
                  <span>
                    <span className="font-semibold">{task.id}</span> {task.text}
                  </span>
                </label>
              );
            })}
          </div>
        </details>
      ))}
    </div>
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
        placeholder="Optional note: what got done, what felt hard, and what to adjust next week."
        rows={2}
        className={`w-full resize-none rounded-xl border px-3 py-2 text-sm leading-6 outline-none transition focus:ring-2 focus:ring-[#122922]/20 ${
          inverted
            ? "border-white/15 bg-white text-[#122922] placeholder:text-[#6d8278]"
            : "border-[var(--border)] bg-white text-[var(--foreground)] placeholder:text-[var(--muted)]"
        }`}
      />
    </div>
  );
}

function toggleTask(
  taskId: string,
  completedTaskIds: Set<string>,
  weekStart: string,
  onCheckInChange: StudyPlanProps["onCheckInChange"],
) {
  const next = new Set(completedTaskIds);
  if (next.has(taskId)) {
    next.delete(taskId);
  } else {
    next.add(taskId);
  }
  onCheckInChange(weekStart, { completedTaskIds: [...next].sort((left, right) => left.localeCompare(right, undefined, { numeric: true })) });
}

function getCheckIn(checkIns: StudyCheckIn[], weekStart: string): StudyCheckIn | undefined {
  return checkIns.find((checkIn) => checkIn.weekStart === weekStart);
}

function labelPhase(phase: StudyWeek["phase"]): string {
  if (phase === "compressed") return "Compressed";
  if (phase === "review") return "Review";
  if (phase === "exam-week") return "Exam week";
  if (phase === "done") return "Done";
  return "Outline";
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
