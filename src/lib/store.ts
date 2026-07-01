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
  createdAt: string;
}

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
  status: "pending" | "approved" | "rejected";
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
    status: row.status as PendingJob["status"],
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
  status: PendingJob["status"],
): Promise<void> {
  const supabase = getSupabase();

  if (supabase) {
    const { error } = await supabase
      .from("jobs")
      .update({ status })
      .eq("id", jobId);
    if (error) throw new Error(`Failed to update job status: ${error.message}`);
    return;
  }

  const db = await readFile();
  const job = db.pendingJobs.find((j) => j.id === jobId);
  if (job) job.status = status;
  await writeFile(db);
}
