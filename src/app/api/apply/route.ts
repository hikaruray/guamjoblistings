import { Resend } from "resend";
import { getPublicJob } from "@/lib/public-jobs";
import { FROM_EMAIL, OWNER_COPY_EMAIL } from "@/lib/config";
import { addApplication } from "@/lib/store";

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

  const apiKey = process.env.RESEND_API_KEY;

  // Until the sending key is configured at launch, log so nothing is lost.
  if (!apiKey) {
    console.log("[APPLICATION — email sending not configured yet]\n" + text);
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
    return Response.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("Failed to send application email:", err);
    return Response.json(
      { error: "Could not send your application. Please try again." },
      { status: 500 },
    );
  }
}
