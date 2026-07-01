import Link from "next/link";
import { CATEGORIES } from "@/lib/jobs";
import { getPublicJobs } from "@/lib/public-jobs";
import JobCard from "@/components/JobCard";

export const dynamic = "force-dynamic";

export default async function JobsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string }>;
}) {
  const { q, category } = await searchParams;

  const query = (q ?? "").trim().toLowerCase();
  const activeCategory = category ?? "";

  const allJobs = await getPublicJobs();
  const results = allJobs.filter((job) => {
    const matchesCategory = activeCategory
      ? job.category === activeCategory
      : true;
    const matchesQuery = query
      ? `${job.title} ${job.company} ${job.category} ${job.location}`
          .toLowerCase()
          .includes(query)
      : true;
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Browse Jobs</h1>

      {/* Search */}
      <form action="/jobs" className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          type="text"
          name="q"
          defaultValue={q ?? ""}
          placeholder="Search jobs, companies, keywords..."
          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
        />
        {activeCategory && (
          <input type="hidden" name="category" value={activeCategory} />
        )}
        <button
          type="submit"
          className="rounded-lg bg-cyan-600 px-6 py-2.5 font-semibold text-white transition hover:bg-cyan-700"
        >
          Search
        </button>
      </form>

      {/* Category filters */}
      <div className="mt-4 flex flex-wrap gap-2">
        <Link
          href={`/jobs${query ? `?q=${encodeURIComponent(query)}` : ""}`}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
            !activeCategory
              ? "bg-cyan-600 text-white"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
          }`}
        >
          All
        </Link>
        {CATEGORIES.map((cat) => {
          const params = new URLSearchParams();
          if (query) params.set("q", query);
          params.set("category", cat);
          const isActive = activeCategory === cat;
          return (
            <Link
              key={cat}
              href={`/jobs?${params.toString()}`}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
                isActive
                  ? "bg-cyan-600 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100"
              }`}
            >
              {cat}
            </Link>
          );
        })}
      </div>

      {/* Results */}
      <p className="mt-6 text-sm text-slate-500">
        {results.length} {results.length === 1 ? "job" : "jobs"} found
        {activeCategory && ` in ${activeCategory}`}
        {query && ` for “${q}”`}
      </p>

      {results.length > 0 ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {results.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      ) : (
        <div className="mt-10 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <p className="text-slate-500">
            No jobs match your search. Try a different keyword or category.
          </p>
        </div>
      )}
    </div>
  );
}
