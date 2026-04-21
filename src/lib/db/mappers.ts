import type { AppState, Profile } from "@/lib/domain/models";
import type {
  AppSettingsRow,
  GoalSettingsRow,
  MonthlyLogRow,
  OpeningBalanceRow,
  ProfileRow,
} from "@/lib/db/types";

type DatabaseState = {
  appSettings: AppSettingsRow | null;
  goalSettings: GoalSettingsRow[];
  monthlyLogs: MonthlyLogRow[];
  openingBalances: OpeningBalanceRow[];
  profiles: ProfileRow[];
};

export function mapRowsToAppState(databaseState: DatabaseState, fallback: AppState): AppState {
  const fallbackProfiles = new Map(fallback.profiles.map((profile) => [profile.id, profile]));

  const profiles = databaseState.profiles
    .slice()
    .sort((left, right) => left.sort_order - right.sort_order)
    .map((profileRow) => mapProfileRow(profileRow, databaseState, fallbackProfiles.get(profileRow.id)))
    .filter((profile): profile is Profile => profile !== null);

  if (profiles.length === 0) {
    return fallback;
  }

  const activeProfileId =
    databaseState.appSettings?.active_profile_id && profiles.some((profile) => profile.id === databaseState.appSettings?.active_profile_id)
      ? databaseState.appSettings.active_profile_id
      : fallback.activeProfileId && profiles.some((profile) => profile.id === fallback.activeProfileId)
        ? fallback.activeProfileId
        : profiles[0].id;

  return {
    activeProfileId,
    setup: {
      completed: databaseState.appSettings?.has_completed_onboarding ?? fallback.setup.completed,
    },
    profiles,
  };
}

export function mapAppStateToRows(appState: AppState, ownerUserId: string) {
  const profiles = appState.profiles.map((profile, index) => ({
    id: profile.id,
    owner_user_id: ownerUserId,
    name: profile.name,
    role_label: profile.roleLabel,
    sort_order: index,
    days_per_week: profile.workSchedule.daysPerWeek,
    hours_per_day:
      profile.workSchedule.weekdayHoursPerDay > 0
        ? profile.workSchedule.weekdayHoursPerDay
        : profile.workSchedule.weekendHoursPerDay,
    weekday_days_per_week: profile.workSchedule.weekdayDaysPerWeek,
    weekday_hours_per_day: profile.workSchedule.weekdayHoursPerDay,
    weekend_days_per_week: profile.workSchedule.weekendDaysPerWeek,
    weekend_hours_per_day: profile.workSchedule.weekendHoursPerDay,
  }));

  const goalSettings = appState.profiles.map((profile) => ({
    profile_id: profile.id,
    target_date: profile.goal.targetDate,
    total_goal_hours: profile.goal.totalGoalHours,
    restricted_goal_hours: profile.goal.restrictedGoalHours,
    unrestricted_goal_hours: profile.goal.unrestrictedGoalHours,
  }));

  const openingBalances = appState.profiles.map((profile) => ({
    profile_id: profile.id,
    as_of_date: profile.openingBalance.asOfDate,
    restricted_hours: profile.openingBalance.restrictedHours,
    unrestricted_hours: profile.openingBalance.unrestrictedHours,
    adjusted_total_override: profile.openingBalance.adjustedTotalOverride ?? null,
  }));

  const monthlyLogs = appState.profiles.flatMap((profile) =>
    profile.monthlyLogs.map((log) => ({
      id: log.id,
      profile_id: profile.id,
      month_start: log.month,
      restricted_hours: log.restrictedHours,
      unrestricted_hours: log.unrestrictedHours,
      supervision_hours: log.supervisionHours,
      individual_supervision_hours: log.individualSupervisionHours,
      observation_count: log.observationCount,
      observation_minutes: log.observationMinutes,
      verification_status: log.verificationStatus,
      fieldwork_type: log.fieldworkType,
      note: log.note ?? null,
    })),
  );

  const appSettings = {
    owner_user_id: ownerUserId,
    active_profile_id: appState.activeProfileId,
    has_completed_onboarding: appState.setup.completed,
  };

  return {
    profiles,
    goalSettings,
    openingBalances,
    monthlyLogs,
    appSettings,
  };
}

function mapProfileRow(
  profileRow: ProfileRow,
  databaseState: DatabaseState,
  fallbackProfile?: Profile,
): Profile | null {
  const goal = databaseState.goalSettings.find((row) => row.profile_id === profileRow.id);
  const openingBalance = databaseState.openingBalances.find((row) => row.profile_id === profileRow.id);

  if (!goal && !fallbackProfile) {
    return null;
  }

  const totalDays = profileRow.days_per_week ?? fallbackProfile?.workSchedule.daysPerWeek ?? 5;
  const baseHours = profileRow.hours_per_day ?? fallbackProfile?.workSchedule.hoursPerDay ?? 0;
  const derivedWeekdayDays = Math.min(5, totalDays);
  const derivedWeekendDays = Math.max(0, totalDays - derivedWeekdayDays);
  const rowWeekdayDays = profileRow.weekday_days_per_week ?? null;
  const rowWeekendDays = profileRow.weekend_days_per_week ?? null;
  const rowDaysMatchTotal =
    rowWeekdayDays !== null &&
    rowWeekendDays !== null &&
    rowWeekdayDays + rowWeekendDays === totalDays;
  const fallbackWeekdayDays =
    fallbackProfile?.workSchedule.weekdayDaysPerWeek ??
    (rowDaysMatchTotal ? rowWeekdayDays! : derivedWeekdayDays);
  const fallbackWeekendDays =
    fallbackProfile?.workSchedule.weekendDaysPerWeek ??
    (rowDaysMatchTotal ? rowWeekendDays! : derivedWeekendDays);
  const rowWeekdayHours = profileRow.weekday_hours_per_day ?? null;
  const rowWeekendHours = profileRow.weekend_hours_per_day ?? null;
  const rowHasDetailedHours =
    (rowWeekdayHours !== null && rowWeekdayHours > 0) ||
    (rowWeekendHours !== null && rowWeekendHours > 0);
  const fallbackWeekdayHours =
    fallbackProfile?.workSchedule.weekdayHoursPerDay ??
    (rowHasDetailedHours ? rowWeekdayHours ?? 0 : baseHours);
  const fallbackWeekendHours =
    fallbackProfile?.workSchedule.weekendHoursPerDay ??
    (rowHasDetailedHours ? rowWeekendHours ?? 0 : derivedWeekendDays > 0 ? baseHours : 0);

  return {
    id: profileRow.id,
    name: profileRow.name,
    roleLabel: profileRow.role_label,
    workSchedule: {
      daysPerWeek: totalDays,
      hoursPerDay: baseHours,
      weekdayDaysPerWeek: profileRow.weekday_days_per_week ?? fallbackWeekdayDays,
      weekdayHoursPerDay: profileRow.weekday_hours_per_day ?? fallbackWeekdayHours,
      weekendDaysPerWeek: profileRow.weekend_days_per_week ?? fallbackWeekendDays,
      weekendHoursPerDay: profileRow.weekend_hours_per_day ?? fallbackWeekendHours,
    },
    goal: {
      targetDate: goal?.target_date ?? fallbackProfile?.goal.targetDate ?? new Date().toISOString().slice(0, 10),
      totalGoalHours: goal?.total_goal_hours ?? fallbackProfile?.goal.totalGoalHours ?? 2000,
      restrictedGoalHours: goal?.restricted_goal_hours ?? fallbackProfile?.goal.restrictedGoalHours ?? 800,
      unrestrictedGoalHours: goal?.unrestricted_goal_hours ?? fallbackProfile?.goal.unrestrictedGoalHours ?? 1200,
    },
    openingBalance: {
      asOfDate: openingBalance?.as_of_date ?? fallbackProfile?.openingBalance.asOfDate ?? new Date().toISOString().slice(0, 10),
      restrictedHours: openingBalance?.restricted_hours ?? fallbackProfile?.openingBalance.restrictedHours ?? 0,
      unrestrictedHours: openingBalance?.unrestricted_hours ?? fallbackProfile?.openingBalance.unrestrictedHours ?? 0,
      adjustedTotalOverride:
        openingBalance?.adjusted_total_override ?? fallbackProfile?.openingBalance.adjustedTotalOverride ?? undefined,
    },
    monthlyLogs: databaseState.monthlyLogs
      .filter((row) => row.profile_id === profileRow.id)
      .sort((left, right) => left.month_start.localeCompare(right.month_start))
      .map((row) => ({
        id: row.id,
        month: row.month_start,
        restrictedHours: row.restricted_hours,
        unrestrictedHours: row.unrestricted_hours,
        supervisionHours: row.supervision_hours ?? fallbackProfile?.monthlyLogs.find((log) => log.id === row.id)?.supervisionHours ?? 0,
        individualSupervisionHours:
          row.individual_supervision_hours ?? fallbackProfile?.monthlyLogs.find((log) => log.id === row.id)?.individualSupervisionHours ?? 0,
        observationCount: row.observation_count ?? fallbackProfile?.monthlyLogs.find((log) => log.id === row.id)?.observationCount ?? 0,
        observationMinutes:
          row.observation_minutes ?? fallbackProfile?.monthlyLogs.find((log) => log.id === row.id)?.observationMinutes ?? 0,
        verificationStatus:
          row.verification_status ?? fallbackProfile?.monthlyLogs.find((log) => log.id === row.id)?.verificationStatus ?? "pending",
        fieldworkType: row.fieldwork_type,
        note: row.note ?? "",
      })),
  };
}
