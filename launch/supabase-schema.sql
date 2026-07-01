-- GuamJobListings — Supabase schema
-- Run this in the Supabase SQL editor at launch. It creates the tables that the
-- app's storage layer (src/lib/store.ts) will read/write once connected.
-- Mirrors the current local dev data shapes so the swap is 1:1.

-- ---------- Job submissions (employer postings, reviewed before publishing) ----------
create table if not exists public.jobs (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  company     text not null,
  location    text not null,
  category    text not null,
  job_type    text not null,
  salary      text not null,
  email       text not null,           -- employer contact / where applications go
  description text not null,
  status      text not null default 'pending'
              check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now()
);

-- ---------- Applications (record of every application submitted) ----------
create table if not exists public.applications (
  id         uuid primary key default gen_random_uuid(),
  job_id     text not null,            -- seed id ("3") or submitted job uuid
  job_title  text not null,
  company    text not null,
  name       text not null,
  email      text not null,
  phone      text not null,
  message    text default '',
  created_at timestamptz not null default now()
);

create index if not exists jobs_status_idx on public.jobs (status, created_at desc);
create index if not exists applications_created_idx on public.applications (created_at desc);

-- ---------- Security ----------
-- Enable Row Level Security. The app talks to Supabase only from server-side
-- code using the SERVICE ROLE key (never exposed to the browser), which
-- bypasses RLS. With RLS on and no public policies, the anon/public key cannot
-- read or write these tables directly. This keeps applicant data private.
alter table public.jobs enable row level security;
alter table public.applications enable row level security;

-- ---------- Public read of approved jobs (optional) ----------
-- If you later want to query approved jobs with the public/anon key, uncomment:
-- create policy "Approved jobs are public" on public.jobs
--   for select using (status = 'approved');
