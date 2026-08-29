// GuamJobListings — Job data model.
//
// The seed listings that used to live here were deleted on 2026-08-29, before
// pointing the real domain at this site. Real postings come from Supabase via
// lib/public-jobs.ts; JOBS is kept as an empty escape hatch so the public board
// still renders if the database is unreachable.

export type JobCategory =
  | "Hospitality & Hotels"
  | "Food & Beverage"
  | "Water Sports & Tours"
  | "Retail & Shopping"
  | "General & Other";

export type JobType = "Full-time" | "Part-time" | "Contract" | "Seasonal";

export interface Job {
  id: string;
  title: string;
  company: string;
  contactEmail: string; // employer address that applications are sent to
  location: string;
  category: JobCategory;
  jobType: JobType;
  salary: string;
  postedAt: string; // ISO date
  featured: boolean;
  urgent?: boolean; // paid "Urgent Hiring" badge (add-on), time-boxed in the DB
  description: string;
  responsibilities: string[];
  requirements: string[];
  isSample?: boolean; // true = placeholder seed data, delete once real jobs go live
}

export const CATEGORIES: JobCategory[] = [
  "Hospitality & Hotels",
  "Food & Beverage",
  "Water Sports & Tours",
  "Retail & Shopping",
  "General & Other",
];

// Seed listings lived here until 2026-08-29. They were placeholder companies
// with *.example.com contact addresses, and they were mixed into the public
// board unconditionally — not only when the database was empty. Applying to
// one sent a real person's name, email and phone to an address that does not
// exist. That was acceptable on a preview URL and unacceptable on the domain
// jobseekers already know, so they were deleted before the cutover, per the
// owner decision recorded at the top of this file.
//
// The board now shows only real, approved employer postings.
export const JOBS: Job[] = [];

export function getJob(id: string): Job | undefined {
  return JOBS.find((j) => j.id === id);
}

export function getFeaturedJobs(): Job[] {
  return JOBS.filter((j) => j.featured);
}
