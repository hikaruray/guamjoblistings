import { Resend } from "resend";
import { getJobById, setJobStatus, LISTING_DAYS } from "@/lib/store";
import { FROM_EMAIL, SITE_URL } from "@/lib/config";

// Approve or reject a pending job submission.
//
// Authentication is handled in proxy.ts, whose matcher covers /admin/:path*
// and /api/admin/:path*: production without ADMIN_PASSWORD is locked shut
// rather than left open. (This file used to carry a note saying the route was
// "not yet protected by login". That stopped being true, and a comment telling
// the next reader an admin endpoint is unguarded is worse than no comment —
// verified 2026-08-29: an unauthenticated POST here answers 401.)
export async function POST(request: Request) {
  let body: {
    id?: string;
    action?: "approve" | "reject" | "unpublish";
    rejectionReason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action, rejectionReason } = body;
  const ACTIONS = ["approve", "reject", "unpublish"] as const;
  if (!id || !action || !ACTIONS.includes(action)) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
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
  // Best-effort: the status change is already committed and is what matters.
  await notifyEmployer(job, action, rejectionReason ?? null).catch((err) =>
    console.error("Failed to notify employer of review outcome:", err),
  );

  return Response.json({ ok: true });
}

async function notifyEmployer(
  job: Awaited<ReturnType<typeof getJobById>>,
  action: "approve" | "reject" | "unpublish",
  rejectionReason: string | null,
): Promise<void> {
  if (!job?.email) return;

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
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: job.email,
    subject,
    text,
  });
}
