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
  };
}

// ---------------------------------------------------------------------------
// Local JSON fallback (development only)
// ---------------------------------------------------------------------------

interface DB {
  applications: StoredApplication[];
  pendingJobs: PendingJob[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function readFile(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    return { applications: [], pendingJobs: [] };
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

export async function setJobStatus(
  jobId: string,
  status: JobStatus,
  rejectionReason?: string | null,
): Promise<void> {
  // Keep a rejection reason only while the job is rejected; clear it otherwise.
  const reason = status === "rejected" ? rejectionReason ?? null : null;
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from("jobs")
      .update({ status, rejection_reason: reason })
      .eq("id", jobId);
    if (error) throw new Error(`Failed to update job status: ${error.message}`);
    return;
  }

  const db = await readFile();
  const job = db.pendingJobs.find((j) => j.id === jobId);
  if (job) {
    job.status = status;
    job.rejectionReason = reason;
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
