-- GuamJobListings — Auth migration (run AFTER supabase-schema.sql)
-- Adds employer profiles and links jobs/applications to authenticated users.
-- Safe to run on existing data: all additions are nullable / IF NOT EXISTS,
-- so existing anonymous rows and seed data are preserved untouched.
--
-- Run this in the Supabase SQL Editor once, after you have created the base
-- tables from supabase-schema.sql.

-- ---------- Employer profiles ----------
-- One row per employer account (linked to a Supabase Auth user). Holds the
-- required contact fields collected at registration (name / URL / phone).
create table if not exists public.employer_profiles (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  email        text not null,
  contact_name text not null,
  url          text not null,
  phone        text not null,
  created_at   timestamptz not null default now()
);

alter table public.employer_profiles enable row level security;

-- An employer can read/update only their own profile.
drop policy if exists "Employers manage own profile" on public.employer_profiles;
create policy "Employers manage own profile" on public.employer_profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ---------- Link jobs to the employer who posted them ----------
alter table public.jobs
  add column if not exists user_id uuid references auth.users (id) on delete set null;

create index if not exists jobs_user_idx on public.jobs (user_id, created_at desc);

-- ---------- Link applications to the applicant ----------
alter table public.applications
  add column if not exists user_id uuid references auth.users (id) on delete set null;

-- Prevent the same logged-in applicant from applying to the same job twice.
-- Partial unique index: only enforced when user_id is present, so historical
-- anonymous rows (user_id null) are unaffected.
create unique index if not exists applications_job_user_unique
  on public.applications (job_id, user_id)
  where user_id is not null;

-- NOTE ON SECURITY MODEL:
-- The app's server code uses the SERVICE ROLE key (bypasses RLS) for all
-- reads/writes to jobs and applications, and verifies the logged-in user via
-- their session before writing user_id. RLS on jobs/applications stays as set
-- in supabase-schema.sql. Only employer_profiles is directly RLS-guarded above.
