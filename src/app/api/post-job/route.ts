import { OWNER_COPY_EMAIL, SITE_URL } from "@/lib/config";
import { sendMail } from "@/lib/email";
import { addPendingJob, getEmployerProfile } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let body: Record<string, string>;

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { title, company, location, category, jobType, salary, email, description } =
    body;

  if (!title || !company || !location || !email || !description) {
    return Response.json(
      { error: "Please fill in all required fields." },
      { status: 400 },
    );
  }

  // When auth is configured, require a signed-in employer and tag the posting
  // with their user id. (Local dev without Supabase stays open.)
  let userId: string | null = null;
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in as an employer to post a job." },
        { status: 401 },
      );
    }
    userId = user.id;

    // The page redirects anyone without company details to fill them in, but
    // the page is not the gate — this is. A posting whose employer we know
    // nothing about is the shape a scam listing takes.
    const profile = await getEmployerProfile(userId).catch(() => null);
    if (!profile) {
      return Response.json(
        {
          error:
            "Please add your company details before posting. You can do it from your dashboard.",
        },
        { status: 403 },
      );
    }
  }

  // Save to the Admin review queue (pre-publish check).
  try {
    await addPendingJob({
      title,
      company,
      location,
      category,
      jobType,
      salary,
      email,
      description,
      userId,
    });
  } catch (err) {
    console.error("Failed to save job submission:", err);
    return Response.json(
      { error: "Could not submit your job. Please try again." },
      { status: 503 },
    );
  }

  const subject = `New job submission: ${title} — ${company}`;
  const text = [
    `New job posting submitted for review:`,
    ``,
    `Title:    ${title}`,
    `Company:  ${company}`,
    `Location: ${location}`,
    `Category: ${category}`,
    `Type:     ${jobType}`,
    `Salary:   ${salary}`,
    `Contact:  ${email}`,
    ``,
    `Description:`,
    description,
    ``,
    `— Submitted via Guam Job Listings (${SITE_URL})`,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[JOB SUBMISSION — email sending not configured yet]\n" + text);
    return Response.json({ ok: true, delivered: false });
  }

  // The posting is saved by this point, and that is the submission; this email
  // only tells the reviewer it is waiting. Until 2026-10-21 a send that threw
  // answered 500 "Could not submit your job. Please try again." for a posting
  // already in the queue — the contradiction /api/apply used to have, and
  // following its advice files the posting twice — while a send that failed
  // without throwing, which is how Resend fails (lib/email.ts), answered
  // delivered:true. Now the employer is told it was received, because it was.
  // A missed reviewer email is caught by the twice-daily pending-review cron,
  // which lists every posting pending for 3+ hours — inside the 24 hours the
  // form promises — so the employer has nothing to do about it.
  const delivered = await sendMail({
    to: OWNER_COPY_EMAIL, // owner reviews and approves before it goes live
    replyTo: email,
    subject,
    text,
  });
  if (!delivered) {
    console.error(
      `[JOB SUBMISSION NOT EMAILED] "${title}" — ${company}: saved as pending; the pending-review cron will list it.`,
    );
  }
  return Response.json({ ok: true, delivered });
}
