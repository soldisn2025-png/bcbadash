create table if not exists profiles (
  id text primary key,
  owner_user_id uuid not null,
  name text not null,
  role_label text not null,
  sort_order integer not null default 0,
  days_per_week integer not null default 5 check (days_per_week between 0 and 7),
  hours_per_day numeric(6,2) not null default 0,
  weekday_days_per_week integer not null default 5 check (weekday_days_per_week between 0 and 5),
  weekday_hours_per_day numeric(6,2) not null default 0,
  weekend_days_per_week integer not null default 0 check (weekend_days_per_week between 0 and 2),
  weekend_hours_per_day numeric(6,2) not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table profiles
add column if not exists weekday_days_per_week integer not null default 5;

alter table profiles
add column if not exists weekday_hours_per_day numeric(6,2) not null default 0;

alter table profiles
add column if not exists weekend_days_per_week integer not null default 0;

alter table profiles
add column if not exists weekend_hours_per_day numeric(6,2) not null default 0;

alter table profiles
drop constraint if exists profiles_days_per_week_check;

alter table profiles
add constraint profiles_days_per_week_check check (days_per_week between 0 and 7);

update profiles
set
  weekday_days_per_week = least(5, days_per_week),
  weekend_days_per_week = greatest(days_per_week - least(5, days_per_week), 0),
  weekday_hours_per_day = case
    when weekday_hours_per_day = 0 and hours_per_day > 0 then hours_per_day
    else weekday_hours_per_day
  end,
  weekend_hours_per_day = case
    when weekend_hours_per_day = 0 and days_per_week > 5 and hours_per_day > 0 then hours_per_day
    else weekend_hours_per_day
  end
where
  (weekday_days_per_week + weekend_days_per_week) <> days_per_week
  or (weekday_hours_per_day = 0 and hours_per_day > 0)
  or (weekend_hours_per_day = 0 and days_per_week > 5 and hours_per_day > 0);

create index if not exists profiles_owner_user_id_idx on profiles(owner_user_id);

create table if not exists goal_settings (
  profile_id text primary key references profiles(id) on delete cascade,
  target_date date not null,
  total_goal_hours numeric(8,2) not null default 2000,
  restricted_goal_hours numeric(8,2) not null default 800,
  unrestricted_goal_hours numeric(8,2) not null default 1200,
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists opening_balances (
  profile_id text primary key references profiles(id) on delete cascade,
  as_of_date date not null,
  restricted_hours numeric(8,2) not null default 0,
  unrestricted_hours numeric(8,2) not null default 0,
  adjusted_total_override numeric(8,2),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists monthly_logs (
  id text primary key,
  profile_id text not null references profiles(id) on delete cascade,
  month_start date not null,
  restricted_hours numeric(8,2) not null default 0,
  unrestricted_hours numeric(8,2) not null default 0,
  supervision_hours numeric(8,2) not null default 0,
  individual_supervision_hours numeric(8,2) not null default 0,
  observation_count integer not null default 0,
  observation_minutes numeric(8,2) not null default 0,
  verification_status text not null default 'pending' check (verification_status in ('pending', 'signed', 'not_signed')),
  fieldwork_type text not null check (fieldwork_type in ('supervised', 'concentrated')),
  note text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (profile_id, month_start)
);

alter table monthly_logs
add column if not exists supervision_hours numeric(8,2) not null default 0;

alter table monthly_logs
add column if not exists individual_supervision_hours numeric(8,2) not null default 0;

alter table monthly_logs
add column if not exists observation_count integer not null default 0;

alter table monthly_logs
add column if not exists observation_minutes numeric(8,2) not null default 0;

alter table monthly_logs
add column if not exists verification_status text not null default 'pending';

alter table monthly_logs
drop constraint if exists monthly_logs_verification_status_check;

alter table monthly_logs
add constraint monthly_logs_verification_status_check
check (verification_status in ('pending', 'signed', 'not_signed'));

create index if not exists monthly_logs_profile_id_idx on monthly_logs(profile_id);

create table if not exists app_settings (
  owner_user_id uuid primary key,
  active_profile_id text references profiles(id) on delete set null,
  has_completed_onboarding boolean not null default false,
  updated_at timestamptz not null default timezone('utc', now())
);

alter table app_settings
add column if not exists has_completed_onboarding boolean not null default false;

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on profiles;
create trigger profiles_set_updated_at
before update on profiles
for each row
execute function set_updated_at();

drop trigger if exists goal_settings_set_updated_at on goal_settings;
create trigger goal_settings_set_updated_at
before update on goal_settings
for each row
execute function set_updated_at();

drop trigger if exists opening_balances_set_updated_at on opening_balances;
create trigger opening_balances_set_updated_at
before update on opening_balances
for each row
execute function set_updated_at();

drop trigger if exists monthly_logs_set_updated_at on monthly_logs;
create trigger monthly_logs_set_updated_at
before update on monthly_logs
for each row
execute function set_updated_at();

drop trigger if exists app_settings_set_updated_at on app_settings;
create trigger app_settings_set_updated_at
before update on app_settings
for each row
execute function set_updated_at();

alter table profiles enable row level security;
alter table goal_settings enable row level security;
alter table opening_balances enable row level security;
alter table monthly_logs enable row level security;
alter table app_settings enable row level security;

-- ---------------------------------------------------------------------------
-- Weekly tracker — single-household personal tool, no auth required.
-- Data is stored as a single JSON row. RLS is intentionally disabled:
-- access control is the deployment URL itself, not database permissions.
-- ---------------------------------------------------------------------------

create table if not exists weekly_tracker (
  id text primary key,
  config jsonb not null,
  weekly_logs jsonb not null default '[]',
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists weekly_tracker_set_updated_at on weekly_tracker;
create trigger weekly_tracker_set_updated_at
before update on weekly_tracker
for each row
execute function set_updated_at();

drop policy if exists profiles_select_own on profiles;
create policy profiles_select_own on profiles
for select using (owner_user_id = auth.uid());

drop policy if exists profiles_insert_own on profiles;
create policy profiles_insert_own on profiles
for insert with check (owner_user_id = auth.uid());

drop policy if exists profiles_update_own on profiles;
create policy profiles_update_own on profiles
for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists profiles_delete_own on profiles;
create policy profiles_delete_own on profiles
for delete using (owner_user_id = auth.uid());

drop policy if exists goal_settings_select_own on goal_settings;
create policy goal_settings_select_own on goal_settings
for select using (
  exists (
    select 1 from profiles
    where profiles.id = goal_settings.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists goal_settings_insert_own on goal_settings;
create policy goal_settings_insert_own on goal_settings
for insert with check (
  exists (
    select 1 from profiles
    where profiles.id = goal_settings.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists goal_settings_update_own on goal_settings;
create policy goal_settings_update_own on goal_settings
for update using (
  exists (
    select 1 from profiles
    where profiles.id = goal_settings.profile_id
      and profiles.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from profiles
    where profiles.id = goal_settings.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists goal_settings_delete_own on goal_settings;
create policy goal_settings_delete_own on goal_settings
for delete using (
  exists (
    select 1 from profiles
    where profiles.id = goal_settings.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists opening_balances_select_own on opening_balances;
create policy opening_balances_select_own on opening_balances
for select using (
  exists (
    select 1 from profiles
    where profiles.id = opening_balances.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists opening_balances_insert_own on opening_balances;
create policy opening_balances_insert_own on opening_balances
for insert with check (
  exists (
    select 1 from profiles
    where profiles.id = opening_balances.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists opening_balances_update_own on opening_balances;
create policy opening_balances_update_own on opening_balances
for update using (
  exists (
    select 1 from profiles
    where profiles.id = opening_balances.profile_id
      and profiles.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from profiles
    where profiles.id = opening_balances.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists opening_balances_delete_own on opening_balances;
create policy opening_balances_delete_own on opening_balances
for delete using (
  exists (
    select 1 from profiles
    where profiles.id = opening_balances.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists monthly_logs_select_own on monthly_logs;
create policy monthly_logs_select_own on monthly_logs
for select using (
  exists (
    select 1 from profiles
    where profiles.id = monthly_logs.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists monthly_logs_insert_own on monthly_logs;
create policy monthly_logs_insert_own on monthly_logs
for insert with check (
  exists (
    select 1 from profiles
    where profiles.id = monthly_logs.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists monthly_logs_update_own on monthly_logs;
create policy monthly_logs_update_own on monthly_logs
for update using (
  exists (
    select 1 from profiles
    where profiles.id = monthly_logs.profile_id
      and profiles.owner_user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from profiles
    where profiles.id = monthly_logs.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists monthly_logs_delete_own on monthly_logs;
create policy monthly_logs_delete_own on monthly_logs
for delete using (
  exists (
    select 1 from profiles
    where profiles.id = monthly_logs.profile_id
      and profiles.owner_user_id = auth.uid()
  )
);

drop policy if exists app_settings_select_own on app_settings;
create policy app_settings_select_own on app_settings
for select using (owner_user_id = auth.uid());

drop policy if exists app_settings_insert_own on app_settings;
create policy app_settings_insert_own on app_settings
for insert with check (owner_user_id = auth.uid());

drop policy if exists app_settings_update_own on app_settings;
create policy app_settings_update_own on app_settings
for update using (owner_user_id = auth.uid()) with check (owner_user_id = auth.uid());

drop policy if exists app_settings_delete_own on app_settings;
create policy app_settings_delete_own on app_settings
for delete using (owner_user_id = auth.uid());

create or replace function bootstrap_default_household()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  current_user_id uuid := auth.uid();
  wife_profile_id text;
  sol_profile_id text;
begin
  if current_user_id is null then
    raise exception 'Not authenticated';
  end if;

  if exists (select 1 from profiles where owner_user_id = current_user_id) then
    insert into app_settings (owner_user_id, active_profile_id, has_completed_onboarding)
    values (
      current_user_id,
      (
        select id
        from profiles
        where owner_user_id = current_user_id
        order by sort_order
        limit 1
      ),
      false
    )
    on conflict (owner_user_id) do update
    set active_profile_id = excluded.active_profile_id;

    return;
  end if;

  wife_profile_id := current_user_id::text || ':wife';
  sol_profile_id := current_user_id::text || ':sol';

  insert into profiles (
    id,
    owner_user_id,
    name,
    role_label,
    sort_order,
    days_per_week,
    hours_per_day,
    weekday_days_per_week,
    weekday_hours_per_day,
    weekend_days_per_week,
    weekend_hours_per_day
  )
  values
    (wife_profile_id, current_user_id, 'Wife', 'BCBA candidate', 0, 5, 4.0, 5, 4.0, 0, 0),
    (sol_profile_id, current_user_id, 'Sol', 'BCBA candidate', 1, 5, 3.5, 5, 3.5, 0, 0);

  insert into goal_settings (profile_id, target_date, total_goal_hours, restricted_goal_hours, unrestricted_goal_hours)
  values
    (wife_profile_id, '2026-12-31', 2000, 800, 1200),
    (sol_profile_id, '2026-12-31', 2000, 800, 1200);

  insert into opening_balances (profile_id, as_of_date, restricted_hours, unrestricted_hours, adjusted_total_override)
  values
    (wife_profile_id, '2025-12-31', 530, 300, null),
    (sol_profile_id, '2025-12-31', 390, 260, null);

  insert into monthly_logs (
    id,
    profile_id,
    month_start,
    restricted_hours,
    unrestricted_hours,
    supervision_hours,
    individual_supervision_hours,
    observation_count,
    observation_minutes,
    verification_status,
    fieldwork_type,
    note
  )
  values
    (current_user_id::text || ':wife-2026-01', wife_profile_id, '2026-01-01', 80, 48, 7.0, 4.0, 1, 75, 'signed', 'supervised', 'Strong clinic month'),
    (current_user_id::text || ':wife-2026-02', wife_profile_id, '2026-02-01', 65, 39, 5.5, 3.0, 1, 60, 'signed', 'supervised', null),
    (current_user_id::text || ':wife-2026-03', wife_profile_id, '2026-03-01', 74, 55, 13.5, 7.5, 1, 95, 'signed', 'concentrated', null),
    (current_user_id::text || ':wife-2026-04', wife_profile_id, '2026-04-01', 51, 70, 8.0, 4.0, 0, 30, 'pending', 'concentrated', 'Entered as of today'),
    (current_user_id::text || ':sol-2026-01', sol_profile_id, '2026-01-01', 45, 32, 4.25, 2.5, 1, 65, 'signed', 'supervised', null),
    (current_user_id::text || ':sol-2026-02', sol_profile_id, '2026-02-01', 52, 38, 5.0, 2.75, 1, 70, 'signed', 'supervised', null),
    (current_user_id::text || ':sol-2026-03', sol_profile_id, '2026-03-01', 49, 40, 4.75, 2.0, 1, 55, 'not_signed', 'supervised', null),
    (current_user_id::text || ':sol-2026-04', sol_profile_id, '2026-04-01', 36, 30, 5.25, 2.5, 1, 80, 'pending', 'concentrated', 'Partial current month');

  insert into app_settings (owner_user_id, active_profile_id, has_completed_onboarding)
    values (current_user_id, wife_profile_id, false)
  on conflict (owner_user_id) do update
  set active_profile_id = excluded.active_profile_id;
end;
$$;

revoke execute on function bootstrap_default_household() from public;
grant execute on function bootstrap_default_household() to authenticated;
