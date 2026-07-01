// Lightweight persistence layer for applications and pending job submissions.
//
// DEV STORAGE: data is kept in a local JSON file so the Admin dashboard works
// immediately in development without any external account. At launch this file
// is the ONLY thing that changes — each function will be swapped to read/write
// Supabase, and the rest of the app stays exactly the same.

import { promises as fs } from "fs";
import path from "path";

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

interface DB {
  applications: StoredApplication[];
  pendingJobs: PendingJob[];
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DB_FILE = path.join(DATA_DIR, "db.json");

async function read(): Promise<DB> {
  try {
    const raw = await fs.readFile(DB_FILE, "utf8");
    return JSON.parse(raw) as DB;
  } catch {
    return { applications: [], pendingJobs: [] };
  }
}

async function write(db: DB): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(DB_FILE, JSON.stringify(db, null, 2), "utf8");
}

function id(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ---- Applications ----

export async function addApplication(
  data: Omit<StoredApplication, "id" | "createdAt">,
): Promise<void> {
  const db = await read();
  db.applications.unshift({ ...data, id: id(), createdAt: new Date().toISOString() });
  await write(db);
}

export async function listApplications(): Promise<StoredApplication[]> {
  return (await read()).applications;
}

// ---- Pending job submissions ----

export async function addPendingJob(
  data: Omit<PendingJob, "id" | "status" | "createdAt">,
): Promise<void> {
  const db = await read();
  db.pendingJobs.unshift({
    ...data,
    id: id(),
    status: "pending",
    createdAt: new Date().toISOString(),
  });
  await write(db);
}

export async function listPendingJobs(): Promise<PendingJob[]> {
  return (await read()).pendingJobs;
}

export async function setJobStatus(
  jobId: string,
  status: PendingJob["status"],
): Promise<void> {
  const db = await read();
  const job = db.pendingJobs.find((j) => j.id === jobId);
  if (job) job.status = status;
  await write(db);
}
