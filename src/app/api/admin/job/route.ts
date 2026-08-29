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
    action?: "approve" | "reject";
    rejectionReason?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action, rejectionReason } = body;
  if (!id || (action !== "approve" && action !== "reject")) {
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

  try {
    await setJobStatus(
      id,
      action === "approve" ? "approved" : "rejected",
      action === "reject" ? rejectionReason ?? null : null,
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
  action: "approve" | "reject",
  rejectionReason: string | null,
): Promise<void> {
  if (!job?.email) return;

  const apiKey = process.env.RESEND_API_KEY;
  const { subject, text } =
    action === "approve"
      ? {
          subject: `"${job.title}" is now live on Guam Job Listings`,
          text: [
            `Good news — your posting has been reviewed and is now on the board.`,
            ``,
            `${job.title} — ${job.company}`,
            `${SITE_URL}/jobs/p_${job.id}`,
            ``,
            `Applications arrive by email at ${job.email} as they come in.`,
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
