import Link from "next/link";
import type { Job } from "@/lib/jobs";

const CATEGORY_EMOJI: Record<string, string> = {
  "Hospitality & Hotels": "🏨",
  "Food & Beverage": "🍽️",
  "Water Sports & Tours": "🌊",
  "Retail & Shopping": "🛍️",
  "General & Other": "💼",
};

export default function JobCard({ job }: { job: Job }) {
  return (
    <Link
      href={`/jobs/${job.id}`}
      className="group block rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-cyan-300 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{CATEGORY_EMOJI[job.category] ?? "💼"}</span>
          <div>
            <h3 className="font-semibold text-slate-900 group-hover:text-cyan-700">
              {job.title}
            </h3>
            <p className="text-sm text-slate-500">{job.company}</p>
          </div>
        </div>
        {job.featured && (
          <span className="shrink-0 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-700">
            ★ Featured
          </span>
        )}
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs">
        <span className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-600">
          📍 {job.location}
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
