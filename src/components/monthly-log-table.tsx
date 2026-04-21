"use client";

import type { ReactNode } from "react";

import { fieldClassName, parseNumber } from "@/components/dashboard-ui";
import type { MonthlyLog } from "@/lib/domain/models";

type MonthlyLogTableProps = {
  logs: MonthlyLog[];
  onRemoveMonth?: (logId: string) => void;
  onUpdateLog: (logId: string, mutator: (log: MonthlyLog) => MonthlyLog) => void;
};

export function MonthlyLogTable({ logs, onRemoveMonth, onUpdateLog }: MonthlyLogTableProps) {
  return (
    <div className="space-y-4">
      {logs.map((log) => (
        <div
          key={log.id}
          className="rounded-3xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5"
        >
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Monthly entry
              </p>
              <p className="mt-2 text-lg font-semibold text-[var(--foreground)]">
                {log.month.slice(0, 7)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onRemoveMonth?.(log.id)}
              className="rounded-2xl border border-[var(--border)] bg-[#fff5ed] px-4 py-3 text-sm font-semibold text-[#9b4b2e] transition hover:border-[#e1bba9] hover:bg-[#ffefe3] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={!onRemoveMonth}
            >
              Delete
            </button>
          </div>

          <div className="mt-5 space-y-4">
            <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Core hours
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField label="Month">
                  <input
                    type="month"
                    value={log.month.slice(0, 7)}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        month: `${event.target.value}-01`,
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
                <FormField label="Type">
                  <select
                    value={log.fieldworkType}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        fieldworkType: event.target.value as MonthlyLog["fieldworkType"],
                      }))
                    }
                    className={fieldClassName}
                  >
                    <option value="supervised">Supervised</option>
                    <option value="concentrated">Concentrated</option>
                  </select>
                </FormField>
                <FormField label="Restricted hours">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={log.restrictedHours}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        restrictedHours: parseNumber(event.target.value),
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
                <FormField label="Unrestricted hours">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={log.unrestrictedHours}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        unrestrictedHours: parseNumber(event.target.value),
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
              </div>
            </section>

            <section className="rounded-3xl border border-[var(--border)] bg-[var(--panel)] p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-[var(--muted)]">
                Compliance inputs
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <FormField label="Supervision hours">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={log.supervisionHours}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        supervisionHours: parseNumber(event.target.value),
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
                <FormField label="Individual supervision hours">
                  <input
                    type="number"
                    min="0"
                    step="0.25"
                    value={log.individualSupervisionHours}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        individualSupervisionHours: parseNumber(event.target.value),
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
                <FormField label="Observation count">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={log.observationCount}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        observationCount: Math.max(0, Math.round(parseNumber(event.target.value))),
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
                <FormField label="Observation minutes">
                  <input
                    type="number"
                    min="0"
                    step="1"
                    value={log.observationMinutes}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        observationMinutes: parseNumber(event.target.value),
                      }))
                    }
                    className={fieldClassName}
                  />
                </FormField>
                <FormField label="Verification status" className="sm:col-span-2">
                  <select
                    value={log.verificationStatus}
                    onChange={(event) =>
                      onUpdateLog(log.id, (current) => ({
                        ...current,
                        verificationStatus: event.target.value as MonthlyLog["verificationStatus"],
                      }))
                    }
                    className={fieldClassName}
                  >
                    <option value="pending">Pending</option>
                    <option value="signed">Signed</option>
                    <option value="not_signed">Not signed</option>
                  </select>
                </FormField>
              </div>
              <div className="mt-4 rounded-3xl border border-[var(--border)] bg-[var(--card)] px-4 py-3 text-sm leading-6 text-[var(--soft-ink)]">
                Use `signed` once the monthly verification form is finalized. Leave current months as `pending` while the month is still in progress.
              </div>
            </section>
          </div>

          <label className="mt-5 grid gap-2 text-sm">
            <span className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
              Note
            </span>
            <textarea
              value={log.note ?? ""}
              onChange={(event) =>
                onUpdateLog(log.id, (current) => ({
                  ...current,
                  note: event.target.value,
                }))
              }
              className={`${fieldClassName.replace("h-12 ", "")} min-h-28 py-3`}
            />
          </label>
        </div>
      ))}
    </div>
  );
}

function FormField({
  children,
  className = "",
  label,
}: {
  children: ReactNode;
  className?: string;
  label: string;
}) {
  return (
    <label className={`grid min-w-0 gap-2 text-sm ${className}`.trim()}>
      <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--muted)]">
        {label}
      </span>
      {children}
    </label>
  );
}
