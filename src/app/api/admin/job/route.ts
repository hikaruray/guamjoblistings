import { Resend } from "resend";
import {
  getJobById,
  setJobStatus,
  renewJobListing,
  LISTING_DAYS,
} from "@/lib/store";
import { FROM_EMAIL, SITE_URL } from "@/lib/config";
import { adminUnauthorized, isAdmin } from "@/lib/admin-session";

// Approve or reject a pending job submission.
//
// Authentication is handled in proxy.ts, whose matcher covers /admin/:path*
// and /api/admin/:path*: production without ADMIN_PASSWORD is locked shut
// rather than left open. (This file used to carry a note saying the route was
// "not yet protected by login". That stopped being true, and a comment telling
// the next reader an admin endpoint is unguarded is worse than no comment —
// verified 2026-08-29: an unauthenticated POST here answers 401.)
export async function POST(request: Request) {
  // Checked here as well as in proxy.ts — see lib/admin-session.ts.
  if (!(await isAdmin())) return adminUnauthorized();

  let body: {
    id?: string;
    action?: "approve" | "reject" | "unpublish" | "renew";
    rejectionReason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action, rejectionReason } = body;
  const ACTIONS = ["approve", "reject", "unpublish", "renew"] as const;
  if (!id || !action || !ACTIONS.includes(action)) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
  }

  // Enforced here as well as in the UI: the employer's only signal that we
  // removed a listing, rather than them closing it, is that a reason is stored.
  if (action === "unpublish" && !rejectionReason?.trim()) {
    return Response.json(
      { error: "A reason is required when taking a listing down." },
      { status: 400 },
    );
  }

  // Read before writing: the employer's address and the posting title are only
  // needed for the email, but fetching afterwards would race the update.
  let job = null;
  try {
    job = await getJobById(id);
  } catch (err) {
    console.error("Failed to load job before status change:", err);
  }

  // Taking a live listing down is only meaningful while it is live. Say so
  // rather than quietly "closing" something that was never on the board.
  if (action === "unpublish" && job && job.status !== "approved") {
    return Response.json(
      { error: "Only a live listing can be taken down." },
      { status: 409 },
    );
  }

  // Renew: the same free LISTING_DAYS window the employer can take from
  // their own dashboard, pressed on their behalf — e.g. an employer whose
  // deadline is after the expiry, which on 2026-10-02 had to be done by editing
  // the database. Only for an approved posting (live or lapsed); a rejected or
  // closed one goes back through review instead. No email: nothing about the
  // posting changes except that it stays up.
  if (action === "renew") {
    if (!job || job.status !== "approved") {
      return Response.json(
        { error: "Only an approved listing can be renewed." },
        { status: 409 },
      );
    }
    try {
      const expiresAt = await renewJobListing(id);
      return Response.json({ ok: true, expiresAt });
    } catch (err) {
      console.error("Failed to renew listing:", err);
      return Response.json(
        { error: "Could not renew the listing. Please try again." },
        { status: 503 },
      );
    }
  }

  const NEXT_STATUS = {
    approve: "approved",
    reject: "rejected",
    unpublish: "closed",
  } as const;

  try {
    await setJobStatus(
      id,
      NEXT_STATUS[action],
      // Keep the reason for an unpublish too, not just a rejection. It was
      // emailed and then thrown away, so nobody — not the employer, not the
      // next reviewer — could see afterwards why a listing had been pulled.
      action === "reject" || action === "unpublish"
        ? (rejectionReason ?? null)
        : null,
    );
  } catch (err) {
    console.error("Failed to update job status:", err);
    return Response.json(
      { error: "Could not update the job. Please try again." },
      { status: 503 },
    );
  }

  // Tell the employer what happened. Until now nothing was sent either way, so
  // an employer had to keep reopening the dashboard to find out whether their
  // posting went live — and once listings started expiring after
  // LISTING_DAYS, the first email they would ever receive about a posting was
  // "it comes down in three days". DaDeal fixed the same gap in July.
  //
  // The status change is already committed and stays; a failed email does not
  // undo it. But the reviewer has to hear about it — until 2026-10-21 a failed
  // send looked exactly like a sent one (see notifyEmployer), so an employer
  // could be rejected or taken down without a word and nobody would know.
  const mailDelivered = await notifyEmployer(
    job,
    action,
    rejectionReason ?? null,
  ).catch((err) => {
    console.error("Failed to notify employer of review outcome:", err);
    return false;
  });

  return Response.json({ ok: true, mailDelivered });
}

// Returns whether the employer was actually emailed.
async function notifyEmployer(
  job: Awaited<ReturnType<typeof getJobById>>,
  action: "approve" | "reject" | "unpublish",
  rejectionReason: string | null,
): Promise<boolean> {
  if (!job?.email) {
    console.error("[REVIEW OUTCOME NOT EMAILED] no employer address", job?.id);
    return false;
  }

  const apiKey = process.env.RESEND_API_KEY;
  const { subject, text } =
    action === "unpublish"
      ? {
          // Taking a live posting down without a word is worse than never
          // approving it: applications simply stop and the employer has no idea
          // why. Say what happened, why if we gave a reason, and how to get back.
          subject: `"${job.title}" has been taken down from Guam Job Listings`,
          text: [
            `We've removed your posting from the board.`,
            ``,
            `${job.title} — ${job.company}`,
            ``,
            rejectionReason
              ? `Why:\n${rejectionReason}`
              : `This is usually because something in the listing no longer meets our guidelines.`,
            ``,
            `It is not deleted — applications you already received are untouched, and you can edit it and put it back up for review from your dashboard:`,
            `${SITE_URL}/employer/dashboard`,
            ``,
            `If you think we've got this wrong, just reply to this email.`,
            ``,
            `— Guam Job Listings`,
          ].join("\n"),
        }
      : action === "approve"
      ? {
          subject: `"${job.title}" is now live on Guam Job Listings`,
          text: [
            `Good news — your posting has been reviewed and is now on the board.`,
            ``,
            `${job.title} — ${job.company}`,
            `${SITE_URL}/jobs/p_${job.id}`,
            ``,
            `We'll email ${job.email} each time someone applies. The application`,
            `itself — their name, phone and message — is on your dashboard, so`,
            `applicants' details stay with the people you give access to:`,
            `${SITE_URL}/employer/applications`,
            ``,
            `It stays listed for ${LISTING_DAYS} days. We'll email you before it comes down, and renewing for another ${LISTING_DAYS} days is free and takes one click from your dashboard:`,
            `${SITE_URL}/employer/dashboard`,
            ``,
            `If the role is filled before then, close it from the same page and it stops showing immediately.`,
            ``,
            `— Guam Job Listings`,
          ].join("\n"),
        }
      : {
          subject: `"${job.title}" needs a change before it can go live`,
          text: [
            `We reviewed your posting and can't publish it as written.`,
            ``,
            `${job.title} — ${job.company}`,
            ``,
            rejectionReason
              ? `What needs changing:\n${rejectionReason}`
              : `Usually this is missing detail, or content outside our guidelines.`,
            ``,
            `Edit it and submit again from your dashboard — there is no penalty and no cost:`,
            `${SITE_URL}/employer/dashboard`,
            ``,
            `If you think we've got this wrong, just reply to this email.`,
            ``,
            `— Guam Job Listings`,
          ].join("\n"),
        };

  if (!apiKey) {
    console.log(`[REVIEW OUTCOME — email not configured]\nto=${job.email}\n${subject}\n${text}`);
    return false;
  }

  // Resend never throws on a failed send — a bad key, an unverified domain or
  // a refused address all come back as `{ error }` (ENGINEERING_LESSONS.md).
  const resend = new Resend(apiKey);
  const { error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: job.email,
    subject,
    text,
  });
  if (error) {
    console.error("[REVIEW OUTCOME NOT EMAILED]", { jobId: job.id, subject, error });
    return false;
  }
  return true;
}
