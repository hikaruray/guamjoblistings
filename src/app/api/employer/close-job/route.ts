import { Resend } from "resend";
import { getJobById, renewJobListing, setJobStatus } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { FROM_EMAIL, OWNER_COPY_EMAIL, SITE_URL } from "@/lib/config";

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
  // Best-effort on purpose: the status change is committed and is what matters.
  if (action === "reopen") {
    await notifyReopened(job, id).catch((err) =>
      console.error("Failed to notify of reopened listing:", err),
    );
  }

  return Response.json({ ok: true });
}

async function notifyReopened(
  job: Awaited<ReturnType<typeof getJobById>>,
  id: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
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

  if (!apiKey) {
    console.log(
      `[LISTING REOPENED — email not configured] job=${id}\n${reviewerText}`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: OWNER_COPY_EMAIL,
    replyTo: job?.email,
    subject: `Back for review: ${title}${company ? ` — ${company}` : ""}`,
    text: reviewerText,
  });

  if (job?.email) {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: job.email,
      subject: `"${title}" is back with us for review`,
      text: employerText,
    });
  }
}
