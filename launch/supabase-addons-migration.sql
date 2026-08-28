-- GuamJobListings — Paid add-ons migration (run AFTER supabase-auth-migration.sql)
--
-- This file does THREE things, so it only needs to be run ONCE:
--   1. FIXES an existing bug: jobs.status rejects the value 'closed'  (section 1)
--   2. FIXES an existing bug: jobs.rejection_reason is missing        (section 2)
--   3. Adds paid add-on columns + a payments ledger for PayPal        (sections 3-5)
--
-- Sections 1 and 2 are repairs of drift that built up because supabase-schema.sql
-- was not updated as features were added. They are unrelated to PayPal, but are
-- included here so you only have to run SQL once.
--
-- Safe to run on existing data:
--   • Every addition is nullable / defaulted / IF NOT EXISTS.
--   • Nothing is deleted and no existing row is modified.
--   • The whole file is IDEMPOTENT — running it twice by mistake is harmless.
--
-- Run this once in the Supabase SQL Editor (paste the whole file, press Run).

-- ===========================================================================
-- 1. FIX: jobs.status must allow 'closed'
-- ===========================================================================
-- WHY THIS IS HERE:
-- supabase-schema.sql originally created jobs.status as
--     check (status in ('pending', 'approved', 'rejected'))
-- but the application also writes 'closed' — see JobStatus in src/lib/store.ts,
-- written by the employer's "close this posting" button
-- (src/app/api/employer/close-job/route.ts). On a database created from that
-- original schema, closing a posting is REJECTED by the constraint and the
-- employer gets an error. This has gone unnoticed only because there are no
-- real employer postings yet.
--
-- WHY A DO BLOCK INSTEAD OF ONE LINE:
-- The constraint already exists in the live database, so it must be dropped and
-- re-added — adding a second constraint would not loosen the first one. We drop
-- by LOOKUP rather than by hardcoded name, because the name depends on how the
-- table was created (Postgres auto-names an inline column check
-- 'jobs_status_check', but a hand-edited database may differ). This converges on
-- the correct final state whether the database currently has the old constraint,
-- an already-fixed one, a differently-named one, or none at all.
--
-- SAFETY: constraints only — no data is read, changed or deleted.
do $$
declare
  con_name text;
begin
  -- Drop every CHECK constraint on public.jobs that references the status column.
  for con_name in
    select con.conname
    from pg_constraint con
    join pg_class rel on rel.oid = con.conrelid
    join pg_namespace nsp on nsp.oid = rel.relnamespace
    where nsp.nspname = 'public'
      and rel.relname = 'jobs'
      and con.contype = 'c'                                  -- 'c' = CHECK
      and pg_get_constraintdef(con.oid) ilike '%status%'
  loop
    execute format('alter table public.jobs drop constraint %I', con_name);
  end loop;
end $$;

-- Re-add it under a known, stable name, now including 'closed'.
-- (The DO block above guarantees no conflicting constraint remains, so this
--  cannot fail on a re-run.)
alter table public.jobs
  add constraint jobs_status_check
  check (status in ('pending', 'approved', 'rejected', 'closed'));

-- ===========================================================================
-- 2. FIX: jobs.rejection_reason is missing
-- ===========================================================================
-- WHY THIS IS HERE:
-- The app stores the reason a posting was NOT approved, so the employer can see
-- it on their dashboard and fix the posting:
--   • written by setJobStatus()  — src/lib/store.ts  (Admin "reject with reason")
--   • cleared by updateJob()     — src/lib/store.ts  (employer resubmits an edit)
--   • read by rowToPendingJob()  — src/lib/store.ts
-- But the column was never added to supabase-schema.sql or the auth migration.
-- On a database built from those files, rejecting a posting with a reason — and
-- an employer editing their posting — are REJECTED by Postgres ("column
-- rejection_reason does not exist"). Same root cause as section 1; unnoticed
-- only because there are no real employer postings yet.
--
-- IDEMPOTENT + NON-DESTRUCTIVE: `add column if not exists` is a no-op if the
-- column is already there (e.g. it was added by hand). Nullable with no default,
-- so every existing row simply gets NULL = "no rejection reason", which is
-- exactly what the app already expects (see `?? null` in rowToPendingJob).
alter table public.jobs
  add column if not exists rejection_reason text;

-- ===========================================================================
-- 3. Paid add-on state on a job posting
-- ===========================================================================

-- featured / urgent are TIME-BOXED: the boolean alone is not the source of
-- truth — the *_until timestamp is. A job is featured only while
-- featured_until > now(). This makes expiry automatic with no cron job.
alter table public.jobs
  add column if not exists featured_until timestamptz,
  add column if not exists urgent_until   timestamptz,
  -- expires_at powers the "listing extension" add-on. NULL = no explicit expiry
  -- (current behaviour: listings never auto-expire), so existing rows are
  -- unaffected until an extension is purchased.
  add column if not exists expires_at     timestamptz;

create index if not exists jobs_featured_idx on public.jobs (featured_until desc nulls last);

-- ===========================================================================
-- 4. Payments ledger
-- ===========================================================================
-- One row per PayPal order we create. Written BEFORE the buyer approves
-- (status 'created') and updated to 'paid' only once PayPal reports the capture
-- COMPLETED. Rows that never reach 'paid' are the audit trail of abandoned or
-- failed checkouts — the add-on is NEVER granted for those.
create table if not exists public.payments (
  id                uuid primary key default gen_random_uuid(),
  job_id            text not null,          -- jobs.id (uuid) as text
  user_id           uuid references auth.users (id) on delete set null,
  addon             text not null check (addon in ('featured', 'urgent', 'extension')),
  -- Amount in CENTS (integer) — never float, to avoid rounding drift.
  amount_cents      integer not null check (amount_cents > 0),
  currency          text not null default 'USD',
  days              integer not null,       -- duration granted by this purchase
  status            text not null default 'created'
                    check (status in ('created', 'paid', 'failed')),
  paypal_order_id   text not null,
  paypal_capture_id text,
  payer_email       text,
  error_note        text,                   -- why a charge ended up 'failed'
  created_at        timestamptz not null default now(),
  paid_at           timestamptz
);

-- CRITICAL: one PayPal order can only ever produce ONE payment row. This is the
-- database-level guard that makes capture idempotent — a double-clicked or
-- retried capture cannot grant the add-on twice.
create unique index if not exists payments_order_unique
  on public.payments (paypal_order_id);

create index if not exists payments_created_idx on public.payments (created_at desc);
create index if not exists payments_job_idx     on public.payments (job_id, created_at desc);

-- ===========================================================================
-- 5. Security
-- ===========================================================================
-- Same model as jobs/applications: the app reads/writes payments only from
-- server-side code using the SERVICE ROLE key (bypasses RLS). RLS is enabled
-- with no public policy, so the anon/browser key can never read the ledger.
alter table public.payments enable row level security;
