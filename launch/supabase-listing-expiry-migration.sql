-- Guam Job Listings — 30-day listing window + expiry notice
-- Owner decision, 2026-08-29.
--
-- Run this ONCE in Supabase → SQL Editor. It is idempotent and non-destructive:
-- running it twice changes nothing, and it does not touch existing data beyond
-- giving already-approved postings a fresh 30-day window.
--
-- Background. Until now jobs.expires_at was null on every row, so a posting
-- stayed on the board forever. That is how the old WordPress board ended up
-- advertising 2024 vacancies as if they were open. Listings now run for 30 days
-- and the employer renews them for free from their dashboard. The paid
-- "Listing Extension" add-on was retired the same day: because expires_at was
-- null, buying it SET an expiry that had not existed — $10 to make your posting
-- vanish in 30 days.

-- 1. Remember when we last warned an employer, so the daily job cannot send the
--    same warning twice. Null = not warned during the current window.
alter table public.jobs
  add column if not exists expiry_notified_at timestamptz;

-- 2. Give existing approved postings a full window starting now, rather than
--    expiring them retroactively the moment this ships.
update public.jobs
   set expires_at = now() + interval '30 days'
 where status = 'approved'
   and expires_at is null;

-- 3. The daily cron filters on these three columns.
create index if not exists jobs_expiry_sweep_idx
  on public.jobs (status, expires_at)
  where expires_at is not null;

-- Check afterwards:
--   select id, title, status, expires_at, expiry_notified_at
--     from public.jobs order by created_at desc limit 20;
