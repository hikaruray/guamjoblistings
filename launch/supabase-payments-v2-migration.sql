-- ===========================================================================
-- Guam Job Listings — payments v2 (run ONCE in the Supabase SQL Editor)
-- ===========================================================================
-- Safe to re-run: every statement is IF NOT EXISTS / CREATE OR REPLACE.
-- Nothing here deletes or rewrites existing rows.
--
-- Adds the two things paid add-ons need before they go live (2026-10-08):
--
--   1. site_settings — a server-side on/off switch for selling add-ons, flipped
--      from /admin. Until now the only way to stop sales was to delete the
--      PayPal keys from Vercel and redeploy.
--
--   2. settle_payment() — marks a payment paid AND extends the add-on in ONE
--      transaction. The app used to do these as two separate requests, so a
--      failure between them left money taken with no add-on switched on, and
--      the read-then-write grant could lose time if two purchases landed at once.
-- ===========================================================================


-- 1. Settings --------------------------------------------------------------
create table if not exists public.site_settings (
  key        text primary key,
  value      text not null,
  updated_at timestamptz not null default now()
);

-- Server-only, like payments: RLS on with no public policy, so the browser key
-- can neither read nor flip the switch.
alter table public.site_settings enable row level security;


-- 2. Atomic settle ----------------------------------------------------------
-- Moves one payment to 'paid' and extends the job's add-on column, or does
-- neither. Returns granted=false when there was nothing to settle (already paid
-- by an earlier call, or the row is not in a state that may be settled).
--
-- p_allow_unresolved: also settle a row recorded as failed with the
-- "Outcome unknown" marker — used only after PayPal itself has been asked and
-- confirmed the capture COMPLETED for the expected amount.
create or replace function public.settle_payment(
  p_order_id         text,
  p_capture_id       text,
  p_payer_email      text,
  p_allow_unresolved boolean default false,
  p_note             text default null
)
returns table (granted boolean, job_id text, addon text, days integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  r public.payments%rowtype;
begin
  update public.payments p
     set status            = 'paid',
         paypal_capture_id = p_capture_id,
         payer_email       = p_payer_email,
         paid_at           = now(),
         error_note        = coalesce(p_note, p.error_note)
   where p.paypal_order_id = p_order_id
     and (
           p.status = 'created'
        or (p_allow_unresolved
            and p.status = 'failed'
            and p.error_note like 'Outcome unknown%')
         )
  returning p.* into r;

  if not found then
    return query select false, null::text, null::text, null::integer;
    return;
  end if;

  -- Extend from the later of now and the current end date, so a second
  -- purchase stacks on the first instead of throwing paid time away.
  if r.addon = 'featured' then
    update public.jobs j
       set featured_until = greatest(coalesce(j.featured_until, now()), now())
                            + make_interval(days => r.days)
     where j.id::text = r.job_id;
  elsif r.addon = 'urgent' then
    update public.jobs j
       set urgent_until = greatest(coalesce(j.urgent_until, now()), now())
                          + make_interval(days => r.days)
     where j.id::text = r.job_id;
  else
    raise exception 'Unknown add-on: %', r.addon;
  end if;

  -- No job row means nothing was granted: undo the 'paid' as well.
  if not found then
    raise exception 'Job % not found for order %', r.job_id, p_order_id;
  end if;

  return query select true, r.job_id, r.addon, r.days;
end;
$$;

-- Only the server (service role) may call it.
revoke all on function public.settle_payment(text, text, text, boolean, text) from public, anon, authenticated;
grant execute on function public.settle_payment(text, text, text, boolean, text) to service_role;
