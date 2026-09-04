import { Resend } from "resend";
import { getPublicJob } from "@/lib/public-jobs";
import { FROM_EMAIL, OWNER_COPY_EMAIL, SITE_URL } from "@/lib/config";
import { addApplication, hasApplied } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

export async function POST(request: Request) {
  let body: {
    jobId?: string;
    name?: string;
    email?: string;
    phone?: string;
    message?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { jobId, name, email, phone, message } = body;

  if (!jobId || !name || !email || !phone) {
    return Response.json(
      { error: "Please fill in all required fields." },
      { status: 400 },
    );
  }

  const job = await getPublicJob(jobId);
  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }

  // When auth is configured, require a signed-in applicant and dedupe by user.
  // (Local dev without Supabase stays anonymous so development isn't blocked.)
  let userId: string | null = null;
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in to apply." },
        { status: 401 },
      );
    }
    userId = user.id;

    try {
      if (await hasApplied(jobId, userId)) {
        return Response.json(
          { error: "You have already applied to this job." },
          { status: 409 },
        );
      }
    } catch (err) {
      console.error("Failed to check for duplicate application:", err);
      // Non-fatal: fall through and let the insert's unique index guard it.
    }
  }

  // Save to the Admin dashboard store (record of every application).
  try {
    await addApplication({
      jobId,
      jobTitle: job.title,
      company: job.company,
      name,
      email,
      phone,
      message: message?.trim() ?? "",
      userId,
    });
  } catch (err) {
    console.error("Failed to save application:", err);
    return Response.json(
      { error: "Could not submit your application. Please try again." },
      { status: 503 },
    );
  }

  // Deliberately no applicant details.
  //
  // Until 2026-09-04 this email carried the applicant's name, email, phone and
  // message. The address it goes to is whatever the posting typed in — we never
  // verify it — so every application pushed a real person's contact details
  // into an inbox we cannot see, cannot audit, and cannot take them back out of
  // if the listing later turned out to be fake. Taking a listing down did
  // nothing about the copies already sent.
  //
  // Now the notification says only that an application arrived, and the details
  // live behind the employer's login, where access ends when their access does.
  const subject = `New application: ${job.title}`;
  const text = [
    `You have a new application.`,
    ``,
    `${job.title} — ${job.company}`,
    ``,
    `Read it, with the applicant's contact details, on your dashboard:`,
    `${SITE_URL}/employer/applications`,
    ``,
    `Sign in with the account that posted this job — this notification can go`,
    `to a different address, but only the posting account can open the`,
    `application.`,
    ``,
    `We keep applicants' personal details on the site rather than in email, so`,
    `they stay with the people who need them.`,
    ``,
    `— Sent via Guam Job Listings (www.guamjoblisting.com)`,
  ].join("\n");

  // Confirmation copy for the applicant, so they have their application in
  // writing (not just an on-screen message they might close).
  const applicantSubject = `Your application was sent — ${job.title} at ${job.company}`;
  const applicantText = [
    `Hi ${name},`,
    ``,
    `Your application has been sent to ${job.company}. Here's a copy for your records.`,
    ``,
    `▼ Application details`,
    `Job:      ${job.title}`,
    `Company:  ${job.company}`,
    `Location: ${job.location}`,
    `Applied:  ${new Date().toLocaleDateString("en-US")}`,
    ``,
    `Your message:`,
    message?.trim() || "(none)",
    ``,
    `▼ What happens next`,
    `${job.company} received your application directly and will contact you at ${email} or ${phone} if you're a match. Employers usually reply within about a week — if you don't hear back, they most likely moved forward with other candidates.`,
    ``,
    `See all your applications any time:`,
    `${SITE_URL}/my/applications`,
    ``,
    `Good luck!`,
    `— Guam Job Listings`,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;

  // Until the sending key is configured at launch, log so nothing is lost.
  if (!apiKey) {
    console.log(
      "[APPLICATION — email sending not configured yet]\n--- EMPLOYER ---\n" +
        text +
        "\n--- APPLICANT ---\n" +
        applicantText,
    );
    return Response.json({ ok: true, delivered: false });
  }

  // The application is already in the database by this point. Email is how we
  // notify people about it, not how we record it, so a send failure must not be
  // reported to the applicant as a failed application.
  //
  // It used to return 500 "Could not send your application. Please try again."
  // Following that advice hit the duplicate check and got back "You have
  // already applied to this job." — two contradictory messages for one
  // application that had in fact been saved both times. Note also that the
  // branch above, for when RESEND_API_KEY is unset, already returns ok with
  // delivered:false; this path simply now agrees with it.
  const resend = new Resend(apiKey);
  let delivered = false;
  let copySent = false;

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: job.contactEmail, // employer is told an application arrived
      bcc: OWNER_COPY_EMAIL, // owner keeps a record that it happened
      // No replyTo. It used to carry the applicant's address so the employer
      // could reply straight to them — which would put the applicant's email
      // back in this message's headers and undo the whole point of taking it
      // out of the body. They reply from the dashboard instead.
      subject,
      text,
    });
    delivered = true;
  } catch (err) {
    // Loud on purpose: this is the owner's only signal that an application is
    // sitting in the admin dashboard which nobody has been told about.
    console.error(
      `[APPLICATION NOT DELIVERED] job=${job.id} "${job.title}" applicant=${email} — the application IS saved; notify the employer manually.`,
      err,
    );
  }

  try {
    await resend.emails.send({
      from: FROM_EMAIL,
      to: email,
      subject: applicantSubject,
      text: applicantText,
    });
    copySent = true;
  } catch (err) {
    console.error("Failed to send applicant confirmation:", err);
  }

  return Response.json({ ok: true, delivered, copySent });
}
