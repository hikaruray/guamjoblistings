import Link from "next/link";
import type { Job } from "@/lib/jobs";
import { CategoryIcon, FlameIcon, StarIcon, PinIcon } from "./icons";


export default function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      // A paid Featured listing gets a visibly warmer card — the employer is
      // paying to stand out, so it must actually look different in the list.
      className={`group block rounded-xl border bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md ${
        job.featured
          ? "border-amber-300 ring-1 ring-amber-200"
          : "border-slate-200"
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
            <CategoryIcon category={job.category} className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-700">
              {job.title}
            </h3>
            <p className="text-sm text-slate-500">{job.company}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
          {job.urgent && (
            <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
              <FlameIcon className="h-3.5 w-3.5" /> Urgent
            </span>
          )}
          {job.featured && (
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
              <StarIcon className="h-3.5 w-3.5" /> Featured
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          <PinIcon className="h-3.5 w-3.5" /> {job.location}
        </span>
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          {job.jobType}
        </span>
        <span className="rounded-full bg-emerald-50 px-2.5 py-1 font-medium text-emerald-700">
          {job.salary}
        </span>
      </div>
    </Link>
  );
}
