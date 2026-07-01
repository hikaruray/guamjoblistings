import { Resend } from "resend";
import { FROM_EMAIL, OWNER_COPY_EMAIL } from "@/lib/config";
import { addPendingJob } from "@/lib/store";

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

  // Save to the Admin review queue (pre-publish check).
  await addPendingJob({
    title,
    company,
    location,
    category,
    jobType,
    salary,
    email,
    description,
  });

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
    `— Submitted via Guam Job Listings (www.guamjoblisting.com)`,
  ].join("\n");

  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    console.log("[JOB SUBMISSION — email sending not configured yet]\n" + text);
    return Response.json({ ok: true, delivered: false });
  }

  try {
    const resend = new Resend(apiKey);
    await resend.emails.send({
      from: FROM_EMAIL,
      to: OWNER_COPY_EMAIL, // owner reviews and approves before it goes live
      replyTo: email,
      subject,
      text,
    });
    return Response.json({ ok: true, delivered: true });
  } catch (err) {
    console.error("Failed to send job submission email:", err);
    return Response.json(
      { error: "Could not submit your job. Please try again." },
      { status: 500 },
    );
  }
}
