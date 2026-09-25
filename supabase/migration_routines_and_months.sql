-- Run in the Supabase SQL editor if the project was created before routines and active months.

alter table public.habits
  add column if not exists active_months smallint[] not null default '{1,2,3,4,5,6,7,8,9,10,11,12}'::smallint[],
  add column if not exists section_id text,
  add column if not exists sort_order integer not null default 0;

create table if not exists public.habit_sections (
  id text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  sort_order integer not null default 0
);

alter table public.habit_sections enable row level security;

drop policy if exists "Users can select own sections" on public.habit_sections;
drop policy if exists "Users can insert own sections" on public.habit_sections;
drop policy if exists "Users can update own sections" on public.habit_sections;
drop policy if exists "Users can delete own sections" on public.habit_sections;

create policy "Users can select own sections"
  on public.habit_sections for select
  using (auth.uid() = user_id);

create policy "Users can insert own sections"
  on public.habit_sections for insert
  with check (auth.uid() = user_id);

create policy "Users can update own sections"
  on public.habit_sections for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete own sections"
  on public.habit_sections for delete
  using (auth.uid() = user_id);

grant select, insert, update, delete on public.habit_sections to authenticated;
