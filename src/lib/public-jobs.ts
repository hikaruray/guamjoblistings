// Server-only accessor for jobs shown to the public.
// Combines the built-in seed jobs with employer submissions that the owner has
// APPROVED in the Admin dashboard, so approval → live listing works end to end.
// (This file imports the store, which uses `fs`, so it must never be imported
// by a Client Component. Client code imports types/constants from ./jobs.)

import "server-only";
import {
  JOBS,
  type Job,
  type JobCategory,
  type JobType,
  CATEGORIES,
} from "./jobs";
import { listPendingJobs, type PendingJob } from "./store";

function isCategory(value: string): value is JobCategory {
  return (CATEGORIES as string[]).includes(value);
}

// A time-boxed add-on is active only while its deadline is in the future.
// Expiry is therefore automatic — no cron job, no nightly sweep.
function isActive(until: string | null | undefined): boolean {
  if (!until) return false;
  const ms = new Date(until).getTime();
  return Number.isFinite(ms) && ms > Date.now();
}

function mapApproved(job: PendingJob): Job {
  return {
    id: `p_${job.id}`,
    title: job.title,
    company: job.company,
    contactEmail: job.email,
    location: job.location,
    category: isCategory(job.category) ? job.category : "General & Other",
    jobType: (["Full-time", "Part-time", "Contract", "Seasonal"].includes(
      job.jobType,
    )
      ? job.jobType
      : "Full-time") as JobType,
    salary: job.salary,
    postedAt: job.createdAt.slice(0, 10),
    // Paid add-ons. Previously hardcoded false, which meant an employer job
    // could never be featured even after paying.
    featured: isActive(job.featuredUntil),
    urgent: isActive(job.urgentUntil),
    description: job.description,
    responsibilities: [],
    requirements: [],
  };
}

// A posting is hidden once an explicit expiry has passed. expiresAt is null for
// every existing listing (= never expires), so this changes nothing until a
// "Listing Extension" add-on sets a date.
function isExpired(job: PendingJob): boolean {
  if (!job.expiresAt) return false;
  const ms = new Date(job.expiresAt).getTime();
  return Number.isFinite(ms) && ms <= Date.now();
}

export async function getPublicJobs(): Promise<Job[]> {
  let approved: Job[] = [];
  try {
    approved = (await listPendingJobs())
      .filter((j) => j.status === "approved" && !isExpired(j))
      .map(mapApproved);
  } catch (err) {
    // If the store (e.g. Supabase) is unreachable, still show the seed jobs so
    // the public site never goes fully down over a transient read failure.
    console.error("Failed to load approved job submissions:", err);
  }
  // Newest approved submissions first, then the seed jobs.
  const all = [...approved, ...JOBS];

  // Featured listings float to the top — that is the product the employer paid
  // for. Order within each group is otherwise preserved (stable sort).
  return all.sort((a, b) => Number(b.featured) - Number(a.featured));
}

export async function getPublicJob(id: string): Promise<Job | undefined> {
  return (await getPublicJobs()).find((j) => j.id === id);
}
