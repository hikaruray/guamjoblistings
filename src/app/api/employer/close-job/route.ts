import { getJobById, renewJobListing, setJobStatus } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { OWNER_COPY_EMAIL, SITE_URL } from "@/lib/config";
import { sendMail } from "@/lib/email";

type Action = "close" | "reopen" | "renew";
const ACTIONS: Action[] = ["close", "reopen", "renew"];

// Employer manages their own posting.
//   close  → status "closed"  (removed from the public listings)
//   reopen → status "pending" (re-reviewed before it goes live again)
//   renew  → another LISTING_DAYS on the board, free
//
// Renewal is deliberately free and deliberately here rather than in the paid
// add-ons: charging to stay visible is what the retired "extension" add-on did,
// and it turned the paid options into a tax on being listed at all.
export async function POST(request: Request) {
  let body: { id?: string; action?: Action };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !action || !ACTIONS.includes(action)) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
  }

  let job = null;
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in as an employer." },
        { status: 401 },
      );
    }
    job = await getJobById(id);
    if (!job) {
      return Response.json({ error: "Job not found." }, { status: 404 });
    }
    if (job.userId !== user.id) {
      return Response.json(
        { error: "You can only manage your own postings." },
        { status: 403 },
      );
    }
    // Only a live listing has a window to extend. Renewing a closed or rejected
    // posting would quietly put it back on the board without review.
    if (action === "renew" && job.status !== "approved") {
      return Response.json(
        { error: "Only a live posting can be renewed." },
        { status: 409 },
      );
    }
  }

  try {
    if (action === "renew") {
      const expiresAt = await renewJobListing(id);
      return Response.json({ ok: true, expiresAt });
    }
    await setJobStatus(id, action === "close" ? "closed" : "pending");
  } catch (err) {
    console.error("Failed to change job status:", err);
    return Response.json(
      { error: "Could not update your job. Please try again." },
      { status: 503 },
    );
  }

  // Reopening puts the posting back in the review queue, and until now it did
  // so in total silence: the reviewer got nothing, so a reopened listing could
  // sit unnoticed for as long as nobody happened to open /admin. A new
  // submission has always emailed the reviewer; a resubmission is the same
  // event and deserves the same email. The employer gets a line too, because
  // "reopened" does not mean "live again" and the button alone does not say so.
  //
  // Best-effort on purpose: the status change is committed and is what matters,
  // and a failed email does not undo it. The result is still reported, because
  // until 2026-10-21 a failed send looked exactly like a sent one (lib/email.ts).
  // If the reviewer's copy fails, the twice-daily pending-review cron lists the
  // posting anyway — it is pending — so the log line is enough there. The
  // employer's copy only repeats what the dashboard has just told them.
  if (action === "reopen") {
    // Without auth (local dev) the ownership check above never loaded the
    // posting, and the notice went out as "A listing" with no employer copy.
    const notified = await notifyReopened(
      job ?? (await getJobById(id).catch(() => null)),
      id,
    );
    return Response.json({ ok: true, ...notified });
  }

  return Response.json({ ok: true });
}

async function notifyReopened(
  job: Awaited<ReturnType<typeof getJobById>>,
  id: string,
): Promise<{ reviewerNotified: boolean; employerNotified: boolean }> {
  const title = job?.title ?? "A listing";
  const company = job?.company ?? "";

  const reviewerText = [
    `An employer has put a closed listing back up for review.`,
    ``,
    `${title}${company ? ` — ${company}` : ""}`,
    `Contact: ${job?.email ?? "(unknown)"}`,
    ``,
    `It is waiting in the review queue and is NOT public until you approve it:`,
    `${SITE_URL}/admin`,
    ``,
    `— Guam Job Listings`,
  ].join("\n");

  const employerText = [
    `Your posting is back with us for review.`,
    ``,
    `${title}${company ? ` — ${company}` : ""}`,
    ``,
    `It is not on the board yet — reopening sends a listing through review`,
    `again, the same as a new posting, so job seekers only ever see something`,
    `an employer confirmed recently. We'll email you the moment it's live.`,
    ``,
    `You can edit it in the meantime from your dashboard:`,
    `${SITE_URL}/employer/dashboard`,
    ``,
    `— Guam Job Listings`,
  ].join("\n");

  // Independent sends — see the same note in update-job. In sequence, a failure
  // reaching the reviewer also silently cancelled the employer's copy.
  const [reviewerNotified, employerNotified] = await Promise.all([
    sendMail({
      to: OWNER_COPY_EMAIL,
      replyTo: job?.email,
      subject: `Back for review: ${title}${company ? ` — ${company}` : ""}`,
      text: reviewerText,
    }),
    job?.email
      ? sendMail({
          to: job.email,
          subject: `"${title}" is back with us for review`,
          text: employerText,
        })
      : false,
  ]);
  if (!reviewerNotified || !employerNotified) {
    console.error(`[REOPEN NOTICE NOT DELIVERED] job=${id}`, {
      reviewerNotified,
      employerNotified,
    });
  }
  return { reviewerNotified, employerNotified };
}
