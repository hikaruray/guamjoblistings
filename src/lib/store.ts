// Storage layer for applications and pending job submissions.
//
// Two backends, selected automatically at runtime:
//   • Supabase  — used when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set
//                 (production on Vercel, which cannot write to the filesystem).
//   • Local JSON — fallback for local development when those env vars are unset,
//                 so `npm run dev` works with no external account (unchanged).
//
// The exported function SIGNATURES are identical in both modes, so the rest of
// the app (API routes, Admin, public-jobs) is untouched.
//
// Supabase tables come from launch/supabase-schema.sql (snake_case columns).
// The camelCase interfaces below are the app-facing shape; mapping happens here.

import "server-only";
import { promises as fs } from "fs";
import path from "path";
import { getSupabase } from "./supabase";

export interface StoredApplication {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  name: string;
  email: string;
  phone: string;
  message: string;
  userId?: string | null; // applicant's auth user id (null for legacy/anon)
  createdAt: string;
}

export type JobStatus = "pending" | "approved" | "rejected" | "closed";

export interface PendingJob {
  id: string;
  title: string;
  company: string;
  location: string;
  category: string;
  jobType: string;
  salary: string;
  email: string;
  description: string;
  status: JobStatus;
  rejectionReason?: string | null; // reason shown to the employer if not approved
  userId?: string | null; // posting employer's auth user id (null for legacy/anon)
  createdAt: string;
  // --- Paid add-on state (see launch/supabase-addons-migration.sql) ---
  // Time-boxed: the timestamp is the source of truth, not a boolean. A job is
  // featured only while featuredUntil is in the future, so expiry is automatic
  // and needs no scheduled job.
  featuredUntil?: string | null;
  urgentUntil?: string | null;
  expiresAt?: string | null; // when the listing drops off the board
  expiryNotifiedAt?: string | null; // when we last warned the employer it is due
}

// A single PayPal charge. Written as 'created' when the order is opened and
// promoted to 'paid' ONLY when PayPal confirms the capture COMPLETED.
export interface StoredPayment {
  id: string;
  jobId: string;
  userId?: string | null;
  addon: string; // "featured" | "urgent" (legacy rows may say "extension")
  amountCents: number;
  currency: string;
  days: number;
  status: "created" | "paid" | "failed";
  paypalOrderId: string;
  paypalCaptureId?: string | null;
  payerEmail?: string | null;
  errorNote?: string | null;
  createdAt: string;
  paidAt?: string | null;
}

// ---------------------------------------------------------------------------
// Row <-> app-object mapping (Supabase snake_case  <->  camelCase interfaces)
// ---------------------------------------------------------------------------

function rowToApplication(row: Record<string, unknown>): StoredApplication {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    jobTitle: String(row.job_title),
    company: String(row.company),
    name: String(row.name),
    email: String(row.email),
    phone: String(row.phone),
    message: (row.message as string) ?? "",
    userId: (row.user_id as string) ?? null,
    createdAt: String(row.created_at),
  };
}

function rowToPendingJob(row: Record<string, unknown>): PendingJob {
  return {
    id: String(row.id),
    title: String(row.title),
    company: String(row.company),
    location: String(row.location),
    category: String(row.category),
    jobType: String(row.job_type),
    salary: String(row.salary),
    email: String(row.email),
    description: String(row.description),
    status: row.status as JobStatus,
    rejectionReason: (row.rejection_reason as string) ?? null,
    userId: (row.user_id as string) ?? null,
    createdAt: String(row.created_at),
    featuredUntil: (row.featured_until as string) ?? null,
    urgentUntil: (row.urgent_until as string) ?? null,
    expiresAt: (row.expires_at as string) ?? null,
    expiryNotifiedAt: (row.expiry_notified_at as string) ?? null,
  };
}

function rowToPayment(row: Record<string, unknown>): StoredPayment {
  return {
    id: String(row.id),
    jobId: String(row.job_id),
    userId: (row.user_id as string) ?? null,
    addon: String(row.addon),
    amountCents: Number(row.amount_cents),
    currency: String(row.currency ?? "USD"),
    days: Number(row.days),
    status: row.status as StoredPayment["status"],
    paypalOrderId: String(row.paypal_order_id),
    paypalCaptureId: (row.paypal_capture_id as string) ?? null,
    payerEmail: (row.payer_email as string) ?? null,
    errorNote: (row.error_note as string) ?? null,
    createdAt: String(row.created_at),
    paidAt: (row.paid_at as string) ?? null,
  };
}

// ---------------------------------------------------------------------------
// Local JSON fallback (development only)
// ---------------------------------------------------------------------------

interface DB {
  applications: StoredApplication[];
  pendingJobs: PendingJob[];
  payments: StoredPayment[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function readFile(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    const db = JSON.parse(raw) as Partial<DB>;
    // Tolerate older db.json files written before payments existed.
    return {
      applications: db.applications ?? [],
      pendingJobs: db.pendingJobs ?? [],
      payments: db.payments ?? [],
    };
  } catch {
    return { applications: [], pendingJobs: [], payments: [] };
  }
}

async function writeFile(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function localId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---------------------------------------------------------------------------
// Applications
// ---------------------------------------------------------------------------

export async function addApplication(
  data: Omit<StoredApplication, "id" | "createdAt">,
): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.from("applications").insert({
      job_id: data.jobId,
      job_title: data.jobTitle,
      company: data.company,
      name: data.name,
      email: data.email,
      phone: data.phone,
      message: data.message,
      user_id: data.userId ?? null,
    });
    if (error) throw new Error(`Failed to save application: ${error.message}`);
    return;
  }

  const db = await readFile();
  db.applications.unshift({
    ...data,
    id: localId(),
    createdAt: new Date().toISOString(),
  });
  await writeFile(db);
}

export async function listApplications(): Promise<StoredApplication[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load applications: ${error.message}`);
    return (data ?? []).map(rowToApplication);
  }

  return (await readFile()).applications;
}

// Applications submitted by a specific applicant (for their own history page).
export async function listApplicationsByUser(
  userId: string,
): Promise<StoredApplication[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("applications")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load your applications: ${error.message}`);
    return (data ?? []).map(rowToApplication);
  }

  return (await readFile()).applications.filter((a) => a.userId === userId);
}

// Returns true if this user has already applied to this job (dedupe guard).
export async function hasApplied(
  jobId: string,
  userId: string,
): Promise<boolean> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("applications")
      .select("id")
      .eq("job_id", jobId)
      .eq("user_id", userId)
      .limit(1);
    if (error) throw new Error(`Failed to check application: ${error.message}`);
    return (data ?? []).length > 0;
  }

  const db = await readFile();
  return db.applications.some(
    (a) => a.jobId === jobId && a.userId === userId,
  );
}

// ---------------------------------------------------------------------------
// Pending job submissions
// ---------------------------------------------------------------------------

export async function addPendingJob(
  data: Omit<PendingJob, "id" | "status" | "createdAt">,
): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.from("jobs").insert({
      title: data.title,
      company: data.company,
      location: data.location,
      category: data.category,
      job_type: data.jobType,
      salary: data.salary,
      email: data.email,
      description: data.description,
      status: "pending",
      user_id: data.userId ?? null,
    });
    if (error) throw new Error(`Failed to save job submission: ${error.message}`);
    return;
  }

  const db = await readFile();
  db.pendingJobs.unshift({
    ...data,
    id: localId(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await writeFile(db);
}

export async function listPendingJobs(): Promise<PendingJob[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load job submissions: ${error.message}`);
    return (data ?? []).map(rowToPendingJob);
  }

  return (await readFile()).pendingJobs;
}

// How long an approved listing stays on the board before it needs renewing.
// Owner decision, 2026-08-29: 10 days. Before this, expires_at was always null
// and a posting stayed up forever — which is how the old WordPress board ended
// up showing 2024 vacancies as if they were still open. A short window means
// what a jobseeker sees is something an employer confirmed recently.
//
// Renewal is free, from the employer dashboard. The paid "extension" add-on was
// retired the same day: paid options should buy prominence, never continued
// existence.
export const LISTING_DAYS = 10;

export function listingExpiryFromNow(): string {
  return new Date(Date.now() + LISTING_DAYS * 86_400_000).toISOString();
}

export async function setJobStatus(
  jobId: string,
  status: JobStatus,
  rejectionReason?: string | null,
): Promise<void> {
  // Keep a rejection reason only while the job is rejected; clear it otherwise.
  const reason = status === "rejected" ? rejectionReason ?? null : null;
  // Approval starts the clock. Reopening a closed posting restarts it too, so a
  // role that comes back is visible for a full window rather than expiring the
  // moment it reappears.
  const expiry = status === "approved" ? listingExpiryFromNow() : undefined;
  const supabase = getSupabase();

  if (supabase) {
    const patch: Record<string, unknown> = { status, rejection_reason: reason };
    if (expiry) {
      patch.expires_at = expiry;
      // A fresh window deserves a fresh warning.
      patch.expiry_notified_at = null;
    }
    const { error } = await supabase.from("jobs").update(patch).eq("id", jobId);
    if (error) throw new Error(`Failed to update job status: ${error.message}`);
    return;
  }

  const db = await readFile();
  const job = db.pendingJobs.find((j) => j.id === jobId);
  if (job) {
    job.status = status;
    job.rejectionReason = reason;
    if (expiry) {
      job.expiresAt = expiry;
      job.expiryNotifiedAt = null;
    }
  }
  await writeFile(db);
}

// A single job by id (for ownership checks and the edit form).
export async function getJobById(id: string): Promise<PendingJob | null> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    if (error) throw new Error(`Failed to load job: ${error.message}`);
    return data ? rowToPendingJob(data as Record<string, unknown>) : null;
  }

  return (await readFile()).pendingJobs.find((j) => j.id === id) ?? null;
}

export interface JobEditFields {
  title: string;
  company: string;
  location: string;
  category: string;
  jobType: string;
  salary: string;
  email: string;
  description: string;
}

// Update an employer's job. Edits send the posting back to review (pending) so
// changed content is re-checked before it's public again.
export async function updateJob(
  id: string,
  fields: JobEditFields,
): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from("jobs")
      .update({
        title: fields.title,
        company: fields.company,
        location: fields.location,
        category: fields.category,
        job_type: fields.jobType,
        salary: fields.salary,
        email: fields.email,
        description: fields.description,
        status: "pending",
        rejection_reason: null, // resubmitted content — clear any old reason
      })
      .eq("id", id);
    if (error) throw new Error(`Failed to update job: ${error.message}`);
    return;
  }

  const db = await readFile();
  const job = db.pendingJobs.find((j) => j.id === id);
  if (job)
    Object.assign(job, fields, {
      status: "pending" as const,
      rejectionReason: null,
    });
  await writeFile(db);
}

// Count applications per job id (for the employer dashboard, so employers can
// see how many people applied to each of their postings). Returns a map keyed
// by job id; every requested id is present (0 when no applications).
export async function applicationCountsForJobs(
  jobIds: string[],
): Promise<Record<string, number>> {
  const counts: Record<string, number> = {};
  for (const id of jobIds) counts[id] = 0;
  if (jobIds.length === 0) return counts;

  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("applications")
      .select("job_id")
      .in("job_id", jobIds);
    if (error) throw new Error(`Failed to count applications: ${error.message}`);
    for (const row of data ?? []) {
      const jid = String((row as { job_id: unknown }).job_id);
      counts[jid] = (counts[jid] ?? 0) + 1;
    }
    return counts;
  }

  const db = await readFile();
  for (const a of db.applications) {
    if (jobIds.includes(a.jobId)) counts[a.jobId] = (counts[a.jobId] ?? 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Payments & paid add-ons
// ---------------------------------------------------------------------------
//
// Lifecycle, and why it is ordered this way:
//   1. createPayment()          — status 'created', written BEFORE the buyer is
//                                 sent to PayPal. Records our intent and the
//                                 server-decided amount.
//   2. markPaymentPaidAndGrant()— called ONLY after PayPal confirms the capture
//                                 COMPLETED. Flips 'created' → 'paid' and grants
//                                 the add-on in the same step.
//   3. markPaymentFailed()      — the buyer abandoned, or PayPal declined.
//                                 The add-on is NEVER granted.
//
// The add-on is granted in exactly one place (step 2), gated on a successful
// 'created' → 'paid' transition. If the buyer never approves, or PayPal denies
// the order, nothing reaches step 2 and the job is untouched. This is the
// specific bug Mokaru shipped once (saving a booking as held on a DENIED
// authorization) and the ordering above is what prevents it here.

// Add `days` to an existing deadline, or start from now if it's absent/expired.
// Buying Featured twice in a row therefore stacks (60 days), rather than
// silently throwing away the time the employer already paid for.
function extendDeadline(current: string | null | undefined, days: number): string {
  const now = Date.now();
  const currentMs = current ? new Date(current).getTime() : 0;
  const base = Number.isFinite(currentMs) && currentMs > now ? currentMs : now;
  return new Date(base + days * 86_400_000).toISOString();
}

// The column each add-on extends. expires_at is no longer one of them: it is
// set on approval and renewed free by the employer (see LISTING_DAYS).
const ADDON_COLUMN: Record<string, "featured_until" | "urgent_until"> = {
  featured: "featured_until",
  urgent: "urgent_until",
};

const ADDON_FIELD: Record<string, "featuredUntil" | "urgentUntil"> = {
  featured: "featuredUntil",
  urgent: "urgentUntil",
};

export async function createPayment(
  data: Omit<StoredPayment, "id" | "createdAt" | "status" | "paidAt">,
): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase.from("payments").insert({
      job_id: data.jobId,
      user_id: data.userId ?? null,
      addon: data.addon,
      amount_cents: data.amountCents,
      currency: data.currency,
      days: data.days,
      status: "created",
      paypal_order_id: data.paypalOrderId,
    });
    if (error) throw new Error(`Failed to record payment: ${error.message}`);
    return;
  }

  const db = await readFile();
  db.payments.unshift({
    ...data,
    id: localId(),
    status: "created",
    createdAt: new Date().toISOString(),
  });
  await writeFile(db);
}

export async function getPaymentByOrderId(
  orderId: string,
): Promise<StoredPayment | null> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .eq("paypal_order_id", orderId)
      .maybeSingle();
    if (error) throw new Error(`Failed to load payment: ${error.message}`);
    return data ? rowToPayment(data as Record<string, unknown>) : null;
  }

  return (await readFile()).payments.find((p) => p.paypalOrderId === orderId) ?? null;
}

export interface GrantResult {
  granted: boolean;
  alreadyPaid: boolean;
  payment: StoredPayment | null;
}

// Flip 'created' → 'paid' and grant the add-on. Returns granted=false when the
// row was already 'paid' (a retry / double-click), so the caller can respond
// success WITHOUT extending the add-on a second time.
//
// The status guard is a compare-and-set: the UPDATE only matches rows still in
// 'created', so two concurrent captures cannot both grant.
export async function markPaymentPaidAndGrant(
  orderId: string,
  info: { captureId: string; payerEmail?: string | null },
): Promise<GrantResult> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "paid",
        paypal_capture_id: info.captureId,
        payer_email: info.payerEmail ?? null,
        paid_at: new Date().toISOString(),
      })
      .eq("paypal_order_id", orderId)
      .eq("status", "created") // ← compare-and-set: only a 'created' row wins
      .select();
    if (error) throw new Error(`Failed to mark payment paid: ${error.message}`);

    const rows = (data ?? []) as Record<string, unknown>[];
    if (rows.length === 0) {
      // Someone else already promoted it (or it doesn't exist). Do NOT grant.
      const existing = await getPaymentByOrderId(orderId);
      return {
        granted: false,
        alreadyPaid: existing?.status === "paid",
        payment: existing,
      };
    }

    const payment = rowToPayment(rows[0]);
    await grantAddon(payment.jobId, payment.addon, payment.days);
    return { granted: true, alreadyPaid: false, payment };
  }

  const db = await readFile();
  const payment = db.payments.find((p) => p.paypalOrderId === orderId);
  if (!payment) return { granted: false, alreadyPaid: false, payment: null };
  if (payment.status === "paid") {
    return { granted: false, alreadyPaid: true, payment };
  }
  payment.status = "paid";
  payment.paypalCaptureId = info.captureId;
  payment.payerEmail = info.payerEmail ?? null;
  payment.paidAt = new Date().toISOString();

  const job = db.pendingJobs.find((j) => j.id === payment.jobId);
  if (job) {
    const field = ADDON_FIELD[payment.addon];
    if (field) job[field] = extendDeadline(job[field], payment.days);
  }
  await writeFile(db);
  return { granted: true, alreadyPaid: false, payment };
}

export async function markPaymentFailed(
  orderId: string,
  note: string,
): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    // Only a still-'created' row may fail — never downgrade a paid charge.
    const { error } = await supabase
      .from("payments")
      .update({ status: "failed", error_note: note.slice(0, 500) })
      .eq("paypal_order_id", orderId)
      .eq("status", "created");
    if (error) console.error("Failed to mark payment failed:", error.message);
    return;
  }

  const db = await readFile();
  const payment = db.payments.find((p) => p.paypalOrderId === orderId);
  if (payment && payment.status === "created") {
    payment.status = "failed";
    payment.errorNote = note.slice(0, 500);
  }
  await writeFile(db);
}

// Extend the add-on deadline on a job. Called ONLY from a confirmed payment.
async function grantAddon(
  jobId: string,
  addon: string,
  days: number,
): Promise<void> {
  const column = ADDON_COLUMN[addon];
  if (!column) throw new Error(`Unknown add-on: ${addon}`);

  const supabase = getSupabase();
  if (!supabase) return; // local mode handled inline by the caller

  const { data, error } = await supabase
    .from("jobs")
    .select(column)
    .eq("id", jobId)
    .maybeSingle();
  if (error) throw new Error(`Failed to read job for add-on: ${error.message}`);

  const current = (data as Record<string, string | null> | null)?.[column] ?? null;
  const next = extendDeadline(current, days);

  const { error: updateError } = await supabase
    .from("jobs")
    .update({ [column]: next })
    .eq("id", jobId);
  if (updateError) {
    throw new Error(`Failed to grant add-on: ${updateError.message}`);
  }
}

// Every payment, newest first (Admin ledger).
export async function listPayments(): Promise<StoredPayment[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load payments: ${error.message}`);
    return (data ?? []).map(rowToPayment);
  }

  return (await readFile()).payments;
}

// Jobs posted by a specific employer (for their dashboard).
export async function listJobsByUser(userId: string): Promise<PendingJob[]> {
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(`Failed to load your jobs: ${error.message}`);
    return (data ?? []).map(rowToPendingJob);
  }

  return (await readFile()).pendingJobs.filter((j) => j.userId === userId);
}

// Free renewal — the employer's own escape hatch from the listing window.
// Deliberately not an add-on: charging to keep a listing alive is what the
// retired "extension" did, and it made the paid option a tax on staying
// visible rather than a way to stand out.
//
// Ownership is checked by the caller; this only touches the one row.
export async function renewJobListing(jobId: string): Promise<string> {
  const expiry = listingExpiryFromNow();
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from("jobs")
      .update({ expires_at: expiry, expiry_notified_at: null })
      .eq("id", jobId)
      .eq("status", "approved"); // never resurrect a rejected or closed posting
    if (error) throw new Error(`Failed to renew listing: ${error.message}`);
    return expiry;
  }

  const db = await readFile();
  const job = db.pendingJobs.find((j) => j.id === jobId);
  if (job && job.status === "approved") {
    job.expiresAt = expiry;
    job.expiryNotifiedAt = null;
  }
  await writeFile(db);
  return expiry;
}

// Approved listings whose expiry falls inside the next `days` days and that we
// have not warned about since their current window began. Used by the daily
// cron that emails employers before a posting drops off.
export async function listingsDueForExpiryNotice(
  days: number,
): Promise<PendingJob[]> {
  const now = Date.now();
  const horizon = new Date(now + days * 86_400_000).toISOString();
  const supabase = getSupabase();

  if (supabase) {
    const { data, error } = await supabase
      .from("jobs")
      .select("*")
      .eq("status", "approved")
      .is("expiry_notified_at", null)
      .not("expires_at", "is", null)
      .lte("expires_at", horizon)
      .gt("expires_at", new Date(now).toISOString());
    if (error) throw new Error(`Failed to load expiring jobs: ${error.message}`);
    return (data ?? []).map((row) => rowToPendingJob(row as Record<string, unknown>));
  }

  const db = await readFile();
  return db.pendingJobs.filter(
    (j) =>
      j.status === "approved" &&
      !j.expiryNotifiedAt &&
      j.expiresAt != null &&
      j.expiresAt <= horizon &&
      j.expiresAt > new Date(now).toISOString(),
  );
}

export async function markExpiryNoticeSent(jobId: string): Promise<void> {
  const sentAt = new Date().toISOString();
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from("jobs")
      .update({ expiry_notified_at: sentAt })
      .eq("id", jobId);
    if (error) throw new Error(`Failed to record notice: ${error.message}`);
    return;
  }

  const db = await readFile();
  const job = db.pendingJobs.find((j) => j.id === jobId);
  if (job) job.expiryNotifiedAt = sentAt;
  await writeFile(db);
}
