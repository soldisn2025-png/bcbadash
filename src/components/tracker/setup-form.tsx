"use client";

import { useState } from "react";

import type { CandidateConfig } from "@/lib/domain/calculator";

type SetupFormProps = {
  /** When re-opening from the dashboard, pass the existing config to pre-fill the form. */
  existing?: CandidateConfig;
  onComplete: (config: CandidateConfig) => void;
  onCancel?: () => void;
};

type FormState = {
  name: string;
  goalDate: string;
  totalHoursTarget: string;
  restrictedBanked: string;
  unrestrictedBanked: string;
};

const DEFAULTS: FormState = {
  name: "",
  goalDate: "2026-12-31",
  totalHoursTarget: "2000",
  restrictedBanked: "800",
  unrestrictedBanked: "512",
};

export function SetupForm({ existing, onComplete, onCancel }: SetupFormProps) {
  const [form, setForm] = useState<FormState>(
    existing
      ? {
          name: existing.name ?? "",
          goalDate: existing.goalDate,
          totalHoursTarget: String(existing.totalHoursTarget),
          restrictedBanked: String(existing.restrictedBanked),
          unrestrictedBanked: String(existing.unrestrictedBanked),
        }
      : DEFAULTS,
  );
  const [errors, setErrors] = useState<Partial<Record<keyof FormState, string>>>({});

  function set(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validate(): CandidateConfig | null {
    const next: Partial<Record<keyof FormState, string>> = {};

    const totalHoursTarget = Number(form.totalHoursTarget);
    const restrictedBanked = Number(form.restrictedBanked);
    const unrestrictedBanked = Number(form.unrestrictedBanked);

    if (!form.goalDate) next.goalDate = "Required";
    if (isNaN(totalHoursTarget) || totalHoursTarget <= 0)
      next.totalHoursTarget = "Must be a positive number";
    if (isNaN(restrictedBanked) || restrictedBanked < 0)
      next.restrictedBanked = "Must be 0 or more";
    if (isNaN(unrestrictedBanked) || unrestrictedBanked < 0)
      next.unrestrictedBanked = "Must be 0 or more";
    if (restrictedBanked + unrestrictedBanked >= totalHoursTarget)
      next.unrestrictedBanked = "Opening balance is already at or above the total goal";

    if (Object.keys(next).length > 0) {
      setErrors(next);
      return null;
    }

    return {
      name: form.name.trim() || undefined,
      goalDate: form.goalDate,
      totalHoursTarget,
      restrictedBanked,
      unrestrictedBanked,
    };
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const config = validate();
    if (config) onComplete(config);
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        {/* Header */}
        <div className="mb-10 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-[0.28em] text-[var(--muted)]">
            BCBA Hours Tracker
          </p>
          <h1 className="font-serif text-4xl leading-tight text-[var(--foreground)]">
            {existing ? "Edit opening balance" : "Enter your opening balance"}
          </h1>
          <p className="text-sm leading-6 text-[var(--muted)]">
            {existing
              ? "Update any of the values below. Changes are saved immediately."
              : "These numbers are saved and can be changed at any time. Nothing is hardcoded — this is your data."}
          </p>
        </div>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          {/* Name */}
          <Field label="Your name (optional)">
            <input
              type="text"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Sol"
              className={inputClass()}
            />
          </Field>

          {/* Goal date + total target */}
          <div className="grid gap-6 sm:grid-cols-2">
            <Field label="Goal date" error={errors.goalDate}>
              <input
                type="date"
                value={form.goalDate}
                onChange={(e) => set("goalDate", e.target.value)}
                required
                className={inputClass(!!errors.goalDate)}
              />
            </Field>
            <Field label="Total hours target" error={errors.totalHoursTarget}>
              <input
                type="number"
                value={form.totalHoursTarget}
                min={1}
                step={1}
                onChange={(e) => set("totalHoursTarget", e.target.value)}
                required
                className={inputClass(!!errors.totalHoursTarget)}
              />
            </Field>
          </div>

          {/* Opening balance */}
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 space-y-4">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-[var(--muted)]">
              Opening balance — hours already banked
            </p>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Restricted hours" error={errors.restrictedBanked}>
                <input
                  type="number"
                  value={form.restrictedBanked}
                  min={0}
                  step={0.5}
                  onChange={(e) => set("restrictedBanked", e.target.value)}
                  required
                  className={inputClass(!!errors.restrictedBanked)}
                />
              </Field>
              <Field label="Unrestricted hours" error={errors.unrestrictedBanked}>
                <input
                  type="number"
                  value={form.unrestrictedBanked}
                  min={0}
                  step={0.5}
                  onChange={(e) => set("unrestrictedBanked", e.target.value)}
                  required
                  className={inputClass(!!errors.unrestrictedBanked)}
                />
              </Field>
            </div>
            <p className="text-xs text-[var(--muted)] leading-5">
              Enter the totals from your last verification form. Restricted hours that are
              already completed don't need further tracking — only unrestricted hours will
              be logged going forward.
            </p>
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-[#122922] px-6 py-4 text-sm font-semibold text-white transition hover:bg-[#1a3d33] active:scale-[0.98]"
          >
            {existing ? "Save changes" : "Start tracking"}
          </button>
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="w-full rounded-2xl border border-[var(--border)] px-6 py-3 text-sm font-medium text-[var(--soft-ink)] transition hover:bg-[var(--border)]"
            >
              Cancel — go back to dashboard
            </button>
          )}
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-[var(--soft-ink)]">{label}</label>
      {children}
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputClass(hasError = false) {
  return [
    "w-full rounded-xl border px-4 py-3 text-sm bg-white text-[var(--foreground)]",
    "focus:outline-none focus:ring-2 focus:ring-[#122922]/20 focus:border-[#122922]",
    "transition placeholder:text-[var(--muted)]",
    hasError
      ? "border-red-400 focus:border-red-500 focus:ring-red-200"
      : "border-[var(--border)]",
  ].join(" ");
}
