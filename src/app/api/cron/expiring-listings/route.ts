import { Resend } from "resend";
import { FROM_EMAIL, SITE_URL } from "@/lib/config";
import { addonViews } from "@/lib/addons";
import { isPaypalConfigured } from "@/lib/paypal";
import {
  listingsDueForExpiryNotice,
  markExpiryNoticeSent,
  LISTING_DAYS,
} from "@/lib/store";

// Daily sweep: warn employers before a posting drops off the board.
//
// Listings run for LISTING_DAYS and are renewed free from the dashboard. An
// expiry nobody is told about is a silent failure — the employer would simply
// stop receiving applications and never learn why — so this exists from the
// same day the expiry does.
//
// Scheduled by vercel.json. Vercel sends a bearer token on cron invocations;
// we require it so the route cannot be triggered by anyone who finds the URL.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Warn this many days before the listing expires. Kept well inside the 10-day
// window so the email lands while the posting is still worth renewing.
const WARN_WITHIN_DAYS = 3;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run unauthenticated. An unset secret is a
  // misconfiguration, not permission.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  let due;
  try {
    due = await listingsDueForExpiryNotice(WARN_WITHIN_DAYS);
  } catch (err) {
    console.error("[cron/expiring-listings] could not load jobs:", err);
    return Response.json({ error: "Lookup failed." }, { status: 503 });
  }

  if (due.length === 0) {
    return Response.json({ ok: true, checked: 0, sent: 0 });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Do NOT mark them as notified — nobody was told anything.
    console.warn(
      `[cron/expiring-listings] ${due.length} listing(s) due, but RESEND_API_KEY is unset. Nothing sent.`,
    );
    return Response.json({ ok: true, checked: due.length, sent: 0 });
  }

  // Only mention paid options when they can actually be bought. Advertising a
  // checkout that answers 503 is worse than staying quiet about it.
  const promo = isPaypalConfigured()
    ? [
        "",
        "While you are there: renewing keeps the role listed, and a paid option keeps it seen.",
        ...addonViews().map(
          (a) => `  ${a.name} — ${a.priceLabel} for ${a.days} days. ${a.blurb}`,
        ),
      ]
    : [];

  const resend = new Resend(apiKey);
  let sent = 0;
  const failed: string[] = [];

  for (const job of due) {
    const days = Math.max(
      0,
      Math.ceil(
        (new Date(job.expiresAt!).getTime() - Date.now()) / 86_400_000,
      ),
    );
    const text = [
      `Hi,`,
      ``,
      `Your posting "${job.title}" on Guam Job Listings comes down in ${days} day${days === 1 ? "" : "s"}.`,
      ``,
      `If you are still hiring, renewing takes one click and costs nothing:`,
      `${SITE_URL}/employer/dashboard`,
      ``,
      `Renewing keeps it live for another ${LISTING_DAYS} days. If the role is filled you do not need to do anything — it will come down on its own.`,
      ``,
      `Postings expire so that jobseekers browsing the board are looking at roles that are genuinely open.`,
      ...promo,
      ``,
      `— Guam Job Listings`,
    ].join("\n");

    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: job.email,
        subject: `"${job.title}" comes down in ${days} day${days === 1 ? "" : "s"} — renew free`,
        text,
      });
      // Only after the send succeeds. Marking first would silently swallow the
      // one warning this employer was going to get.
      await markExpiryNoticeSent(job.id);
      sent += 1;
    } catch (err) {
      console.error(
        `[cron/expiring-listings] failed for job ${job.id}:`,
        err,
      );
      failed.push(job.id);
    }
  }

  return Response.json({ ok: true, checked: due.length, sent, failed });
}
