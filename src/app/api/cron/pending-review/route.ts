import { Resend } from "resend";
import { FROM_EMAIL, SITE_URL, OWNER_COPY_EMAIL } from "@/lib/config";
import { listPendingJobs } from "@/lib/store";

// Twice-daily nag: remind the owner about postings still waiting for review.
//
// The post form promises employers a review "usually within 24 hours". The only
// signal used to be one email at submission time, and on 2026-10-02 that email
// sat unread while the first outside employer (CEMML) waited four days and had
// to write in to ask. One email is easy to miss; a reminder that repeats until
// the queue is empty is not. There is deliberately no "already reminded" flag:
// the point is to keep asking until someone approves or rejects.
//
// Scheduled by vercel.json (06:00 and 18:00 Guam time). Same bearer-token check
// as the expiring-listings cron.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Skip postings younger than this. The submission email has just gone out for
// those, so a reminder minutes later is noise.
const MIN_AGE_HOURS = 3;

// What the post form promises. Anything older is flagged as overdue.
const PROMISED_HOURS = 24;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run unauthenticated. An unset secret is a
  // misconfiguration, not permission.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }

  let jobs;
  try {
    jobs = await listPendingJobs();
  } catch (err) {
    console.error("[cron/pending-review] could not load jobs:", err);
    return Response.json({ error: "Lookup failed." }, { status: 503 });
  }

  const now = Date.now();
  const hoursWaiting = (iso: string) => (now - new Date(iso).getTime()) / 3_600_000;
  const waiting = jobs
    .filter((j) => j.status === "pending" && hoursWaiting(j.createdAt) >= MIN_AGE_HOURS)
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));

  if (waiting.length === 0) {
    return Response.json({ ok: true, waiting: 0, sent: false });
  }

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    console.warn(
      `[cron/pending-review] ${waiting.length} posting(s) waiting, but RESEND_API_KEY is unset. Nothing sent.`,
    );
    return Response.json({ ok: true, waiting: waiting.length, sent: false });
  }

  const overdue = waiting.filter((j) => hoursWaiting(j.createdAt) >= PROMISED_HOURS).length;
  const age = (iso: string) => {
    const h = Math.floor(hoursWaiting(iso));
    return h >= 48 ? `${Math.floor(h / 24)} days` : `${h} hours`;
  };

  const text = [
    `${waiting.length} job posting${waiting.length === 1 ? " is" : "s are"} waiting for review.`,
    overdue > 0
      ? `${overdue} ${overdue === 1 ? "has" : "have"} passed the "within ${PROMISED_HOURS} hours" the post form promises employers.`
      : `None has passed the ${PROMISED_HOURS}-hour promise yet.`,
    ``,
    ...waiting.map(
      (j) =>
        `${hoursWaiting(j.createdAt) >= PROMISED_HOURS ? "[OVERDUE] " : ""}${j.title} — ${j.company} (waiting ${age(j.createdAt)})`,
    ),
    ``,
    `Approve or reject: ${SITE_URL}/admin`,
    ``,
    `This reminder repeats every morning and evening until the queue is empty.`,
  ].join("\n");

  try {
    // Resend reports most failures in the return value rather than by throwing.
    const { error } = await new Resend(apiKey).emails.send({
      from: FROM_EMAIL,
      to: OWNER_COPY_EMAIL,
      subject: `${overdue > 0 ? "OVERDUE: " : ""}${waiting.length} job posting${waiting.length === 1 ? "" : "s"} waiting for review`,
      text,
    });
    if (error) throw new Error(error.message);
  } catch (err) {
    console.error("[cron/pending-review] send failed:", err);
    return Response.json({ error: "Send failed." }, { status: 502 });
  }

  return Response.json({ ok: true, waiting: waiting.length, overdue, sent: true });
}
