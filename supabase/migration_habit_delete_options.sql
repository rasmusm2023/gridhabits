-- Add skip / end-series support for partial habit deletes.
-- Run in Supabase SQL Editor after the base schema.

alter table public.habits
  add column if not exists ended_at date,
  add column if not exists skipped_dates date[] not null default '{}'::date[];
