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

  const subject = `New application: ${job.title} — ${name}`;
  const text = [
    `New application for: ${job.title} (${job.company})`,
    ``,
    `Name:  ${name}`,
    `Email: ${email}`,
    `Phone: ${phone}`,
    ``,
    `Message:`,
    message?.trim() || "(none)",
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
    `Good luck! 🌴`,
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

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: job.contactEmail, // employer receives the application directly
      bcc: OWNER_COPY_EMAIL, // owner keeps a copy for record-keeping
      replyTo: email, // employer can reply straight to the applicant
      subject,
      text,
    });
    // Best-effort: the application is already saved and sent to the employer, so
    // a failure to send the applicant's copy must not fail the request.
    try {
      await resend.emails.send({
        from: FROM_EMAIL,
        to: email,
        subject: applicantSubject,
        text: applicantText,
      });
    } catch (err) {
      console.error("Failed to send applicant confirmation:", err);
    }
    return Response.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("Failed to send application email:", err);
    return Response.json(
      { error: "Could not send your application. Please try again." },
      { status: 500 },
    );
  }
}
