-- GridHabits schema for Supabase (free tier)
-- Run this in the Supabase SQL Editor: https://supabase.com/dashboard/project/_/sql

create table if not exists public.habits (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  category text not null,
  target_daily_count integer not null default 1 check (target_daily_count >= 1),
  color text not null,
  icon text not null,
  created_at timestamptz not null default now(),
  is_active boolean not null default true,
  occurrence text not null default 'daily'
    check (occurrence in ('daily', 'weekly', 'monthly')),
  weekdays integer[] not null default '{}'::integer[],
  month_days integer[] not null default '{}'::integer[],
  ended_at date,
  skipped_dates date[] not null default '{}'::date[]
);

create table if not exists public.habit_logs (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  habit_id text not null references public.habits (id) on delete cascade,
  date date not null,
  count integer not null default 0 check (count >= 0),
  unique (habit_id, date)
);

create index if not exists habits_user_id_idx on public.habits (user_id);
create index if not exists habit_logs_user_id_idx on public.habit_logs (user_id);
create index if not exists habit_logs_habit_date_idx on public.habit_logs (habit_id, date);

alter table public.habits enable row level security;
alter table public.habit_logs enable row level security;

drop policy if exists "Users can select own habits" on public.habits;
drop policy if exists "Users can insert own habits" on public.habits;
drop policy if exists "Users can update own habits" on public.habits;
drop policy if exists "Users can delete own habits" on public.habits;

create policy "Users can select own habits"
  on public.habits for select
  using (auth.uid() = user_id);

create policy "Users can insert own habits"
  on public.habits for insert
  with check (auth.uid() = user_id);

create policy "Users can update own habits"
  on public.habits for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own habits"
  on public.habits for delete
  using (auth.uid() = user_id);

drop policy if exists "Users can select own logs" on public.habit_logs;
drop policy if exists "Users can insert own logs" on public.habit_logs;
drop policy if exists "Users can update own logs" on public.habit_logs;
drop policy if exists "Users can delete own logs" on public.habit_logs;

create policy "Users can select own logs"
  on public.habit_logs for select
  using (auth.uid() = user_id);

create policy "Users can insert own logs"
  on public.habit_logs for insert
  with check (auth.uid() = user_id);

create policy "Users can update own logs"
  on public.habit_logs for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own logs"
  on public.habit_logs for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.habits to authenticated;
grant select, insert, update, delete on public.habit_logs to authenticated;
grant usage, select on all sequences in schema public to authenticated;
