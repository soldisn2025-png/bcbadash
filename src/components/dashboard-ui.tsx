export const fieldClassName =
  "h-12 rounded-2xl border border-[var(--border)] bg-[var(--card)] px-4 text-sm text-[var(--foreground)] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition focus:border-[#145c4e] focus:ring-2 focus:ring-[#145c4e]/15";

export function Panel({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[32px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_16px_40px_rgba(64,40,20,0.07)] sm:p-6">
      <div className="mb-5 space-y-2">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">{eyebrow}</p>
        <h2 className="font-serif text-3xl text-[var(--foreground)]">{title}</h2>
        <p className="max-w-3xl text-sm leading-7 text-[var(--soft-ink)]">{description}</p>
      </div>
      {children}
    </div>
  );
}

export function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: string;
  helper: string;
}) {
  return (
    <div className="rounded-[28px] border border-[var(--border)] bg-[var(--panel)] p-5 shadow-[0_16px_32px_rgba(64,40,20,0.06)]">
      <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">{label}</p>
      <p className="mt-3 text-3xl font-semibold text-[var(--foreground)]">{value}</p>
      <p className="mt-2 text-sm text-[var(--soft-ink)]">{helper}</p>
    </div>
  );
}

export function MiniStat({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "positive" | "warning" | "light";
}) {
  const toneClass =
    tone === "positive"
      ? "border-[#bfe1d6] bg-[#edf8f4] text-[#145c4e]"
      : tone === "warning"
        ? "border-[#efcfbf] bg-[#fff4ed] text-[#9b4b2e]"
        : tone === "light"
          ? "border-white/12 bg-white/10 text-white"
          : "border-[var(--border)] bg-[var(--card)] text-[var(--foreground)]";

  return (
    <div className={`rounded-3xl border p-4 ${toneClass}`}>
      <p className="text-xs font-semibold uppercase tracking-[0.18em] opacity-70">{label}</p>
      <p className="mt-3 text-xl font-semibold">{value}</p>
    </div>
  );
}

export function GoalRail({
  label,
  current,
  goal,
  tint,
}: {
  label: string;
  current: number;
  goal: number;
  tint: string;
}) {
  const progress = goal > 0 ? Math.min(100, (current / goal) * 100) : 0;

  return (
    <div className="mt-4">
      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
        <span className="font-semibold text-[var(--soft-ink)]">{label}</span>
        <span className="text-[var(--muted)]">
          {formatHours(current)} / {formatHours(goal)}
        </span>
      </div>
      <div className="h-3 overflow-hidden rounded-full bg-[#eadfce]">
        <div className={`h-full rounded-full ${tint}`} style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

export function ScenarioNote({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4">
      <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
      <p className="mt-2 text-sm leading-7 text-[var(--soft-ink)]">{body}</p>
    </div>
  );
}

export function parseNumber(value: string) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatHours(value: number) {
  return `${new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 1,
  }).format(value)}h`;
}

export function formatSignedHours(value: number) {
  const prefix = value > 0 ? "+" : "";
  return `${prefix}${formatHours(value)}`;
}

export function formatPercent(value: number) {
  return `${Math.round(value * 100)}%`;
}

export function formatDate(value: string | null) {
  if (!value) {
    return "TBD";
  }

  const [year, month, day] = value.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(year, month - 1, day, 12));
}
