import { Resend } from "resend";
import { getJobById, updateJob } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { FROM_EMAIL, OWNER_COPY_EMAIL, SITE_URL } from "@/lib/config";

// Update a job the signed-in employer owns. Edits go back to review (pending),
// so changed content is re-checked before it's public again.
export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, title, company, location, category, jobType, salary, email, description } =
    body;

  if (!id || !title || !company || !location || !email || !description) {
    return Response.json(
      { error: "Please fill in all required fields." },
      { status: 400 },
    );
  }

  // Verify the signed-in employer owns this posting before allowing an edit.
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in as an employer." },
        { status: 401 },
      );
    }
    const job = await getJobById(id);
    if (!job) {
      return Response.json({ error: "Job not found." }, { status: 404 });
    }
    if (job.userId !== user.id) {
      return Response.json(
        { error: "You can only edit your own postings." },
        { status: 403 },
      );
    }
  }

  try {
    await updateJob(id, {
      title,
      company,
      location,
      category,
      jobType,
      salary,
      email,
      description,
    });
  } catch (err) {
    console.error("Failed to update job:", err);
    return Response.json(
      { error: "Could not update your job. Please try again." },
      { status: 503 },
    );
  }


  // Saving an edit sends the posting back to pending, which takes it straight
  // off the public board — and nobody was told. The reviewer got no email and
  // no marker, so a live listing could vanish and sit in the queue until
  // someone happened to open /admin. Reopen had exactly this hole and it was
  // closed on 2026-09-04; this is the same event arriving through a different
  // door, and it is the door the rejection email tells employers to use.
  //
  // Best-effort: the edit is saved and that is what matters.
  await notifyResubmitted(id, title, company, email).catch((err) =>
    console.error("Failed to notify of edited listing:", err),
  );

  return Response.json({ ok: true });
}

async function notifyResubmitted(
  id: string,
  title: string,
  company: string,
  contactEmail: string,
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  const reviewerText = [
    `An employer has edited a posting, so it is back in the review queue.`,
    ``,
    `${title} — ${company}`,
    `Contact: ${contactEmail}`,
    ``,
    `It is NOT public until you approve it again:`,
    `${SITE_URL}/admin`,
    ``,
    `— Guam Job Listings`,
  ].join("\n");

  const employerText = [
    `We have your changes.`,
    ``,
    `${title} — ${company}`,
    ``,
    `Editing sends a posting back through review, so it has come off the board`,
    `for now. That is deliberate: what job seekers read should be something an`,
    `employer confirmed recently. We'll email you the moment it is live again.`,
    ``,
    `${SITE_URL}/employer/dashboard`,
    ``,
    `— Guam Job Listings`,
  ].join("\n");

  if (!apiKey) {
    console.log(
      `[LISTING EDITED — email not configured] job=${id}\n${reviewerText}`,
    );
    return;
  }

  const resend = new Resend(apiKey);
  await resend.emails.send({
    from: FROM_EMAIL,
    to: OWNER_COPY_EMAIL,
    replyTo: contactEmail,
    subject: `Back for review (edited): ${title} — ${company}`,
    text: reviewerText,
  });
  await resend.emails.send({
    from: FROM_EMAIL,
    to: contactEmail,
    subject: `"${title}" is back with us for review`,
    text: employerText,
  });
}
