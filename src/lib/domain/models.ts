import { z } from "zod";

export const fieldworkTypeSchema = z.enum(["supervised", "concentrated"]);
export const verificationStatusSchema = z.enum(["pending", "signed", "not_signed"]);

export const openingBalanceSchema = z.object({
  asOfDate: z.string(),
  restrictedHours: z.number().min(0),
  unrestrictedHours: z.number().min(0),
  adjustedTotalOverride: z.number().min(0).nullable().optional(),
});

export const monthlyLogSchema = z.object({
  id: z.string(),
  month: z.string(),
  restrictedHours: z.number().min(0),
  unrestrictedHours: z.number().min(0),
  supervisionHours: z.number().min(0).default(0),
  individualSupervisionHours: z.number().min(0).default(0),
  observationCount: z.number().int().min(0).default(0),
  observationMinutes: z.number().min(0).default(0),
  verificationStatus: verificationStatusSchema.default("pending"),
  fieldworkType: fieldworkTypeSchema,
  note: z.string().optional(),
});

export const workScheduleSchema = z
  .object({
    daysPerWeek: z.number().min(0).max(7).default(5),
    hoursPerDay: z.number().min(0).default(0),
    weekdayDaysPerWeek: z.number().min(0).max(5).optional(),
    weekdayHoursPerDay: z.number().min(0).optional(),
    weekendDaysPerWeek: z.number().min(0).max(2).optional(),
    weekendHoursPerDay: z.number().min(0).optional(),
  })
  .transform((value) => {
    const totalDays = Math.min(7, Math.max(0, value.daysPerWeek ?? 5));
    const baseHours = Math.max(0, value.hoursPerDay ?? 0);
    const derivedWeekdayDays = Math.min(5, totalDays);
    const derivedWeekendDays = Math.max(0, totalDays - derivedWeekdayDays);
    const weekdayDaysPerWeek = value.weekdayDaysPerWeek ?? derivedWeekdayDays;
    const weekendDaysPerWeek = value.weekendDaysPerWeek ?? derivedWeekendDays;
    const weekdayHoursPerDay = value.weekdayHoursPerDay ?? baseHours;
    const weekendHoursPerDay =
      value.weekendHoursPerDay ?? (weekendDaysPerWeek > 0 ? baseHours : 0);

    return {
      daysPerWeek: weekdayDaysPerWeek + weekendDaysPerWeek,
      hoursPerDay: baseHours,
      weekdayDaysPerWeek,
      weekdayHoursPerDay,
      weekendDaysPerWeek,
      weekendHoursPerDay,
    };
  });

export const goalSettingsSchema = z.object({
  targetDate: z.string(),
  totalGoalHours: z.number().min(1),
  restrictedGoalHours: z.number().min(0),
  unrestrictedGoalHours: z.number().min(0),
});

export const setupStateSchema = z.object({
  completed: z.boolean().default(false),
});

export const profileSchema = z.object({
  id: z.string(),
  name: z.string(),
  roleLabel: z.string(),
  openingBalance: openingBalanceSchema,
  goal: goalSettingsSchema,
  workSchedule: workScheduleSchema,
  monthlyLogs: z.array(monthlyLogSchema),
});

export const appStateSchema = z.object({
  activeProfileId: z.string(),
  setup: setupStateSchema.default({ completed: false }),
  profiles: z.array(profileSchema).min(1),
});

export type FieldworkType = z.infer<typeof fieldworkTypeSchema>;
export type VerificationStatus = z.infer<typeof verificationStatusSchema>;
export type OpeningBalance = z.infer<typeof openingBalanceSchema>;
export type MonthlyLog = z.infer<typeof monthlyLogSchema>;
export type WorkSchedule = z.infer<typeof workScheduleSchema>;
export type GoalSettings = z.infer<typeof goalSettingsSchema>;
export type SetupState = z.infer<typeof setupStateSchema>;
export type Profile = z.infer<typeof profileSchema>;
export type AppState = z.infer<typeof appStateSchema>;
