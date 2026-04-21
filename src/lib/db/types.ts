export type ProfileRow = {
  id: string;
  owner_user_id: string;
  name: string;
  role_label: string;
  sort_order: number;
  days_per_week: number;
  hours_per_day: number;
  weekday_days_per_week?: number | null;
  weekday_hours_per_day?: number | null;
  weekend_days_per_week?: number | null;
  weekend_hours_per_day?: number | null;
  created_at?: string;
  updated_at?: string;
};

export type GoalSettingsRow = {
  profile_id: string;
  target_date: string;
  total_goal_hours: number;
  restricted_goal_hours: number;
  unrestricted_goal_hours: number;
  updated_at?: string;
};

export type OpeningBalanceRow = {
  profile_id: string;
  as_of_date: string;
  restricted_hours: number;
  unrestricted_hours: number;
  adjusted_total_override: number | null;
  updated_at?: string;
};

export type MonthlyLogRow = {
  id: string;
  profile_id: string;
  month_start: string;
  restricted_hours: number;
  unrestricted_hours: number;
  supervision_hours: number;
  individual_supervision_hours: number;
  observation_count: number;
  observation_minutes: number;
  verification_status: "pending" | "signed" | "not_signed";
  fieldwork_type: "supervised" | "concentrated";
  note: string | null;
  created_at?: string;
  updated_at?: string;
};

export type AppSettingsRow = {
  owner_user_id: string;
  active_profile_id: string | null;
  has_completed_onboarding: boolean;
  updated_at?: string;
};
