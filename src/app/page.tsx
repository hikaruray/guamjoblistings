import Link from "next/link";
import { CATEGORIES } from "@/lib/jobs";
import { getPublicJobs } from "@/lib/public-jobs";
import JobCard from "@/components/JobCard";
import { CategoryIcon, PalmLogo, SearchIcon, DocumentIcon, HandshakeIcon } from "@/components/icons";

export default async function Home() {
  // Real, approved postings only. The placeholder listings this page used to
  // count and feature were deleted on 2026-08-29.
  const jobs = await getPublicJobs();
  const featured = jobs.filter((j) => j.featured).slice(0, 6);

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-500 to-teal-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find Your Next Job in Guam
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-cyan-50">
            The island&apos;s local job board for hospitality, dining, water
            sports, retail and more. Discover opportunities or hire great people.
          </p>

          {/* Search bar */}
          <form
            action="/jobs"
            className="mx-auto mt-8 flex max-w-xl flex-col gap-2 sm:flex-row"
          >
            <input
              type="text"
              name="q"
              placeholder="Search jobs, companies, keywords..."
              className="w-full rounded-lg border-0 px-4 py-3 text-slate-800 shadow-sm focus:ring-2 focus:ring-white"
            />
            <button
              type="submit"
              className="rounded-lg bg-slate-900 px-6 py-3 font-semibold text-white shadow-sm transition hover:bg-slate-800"
            >
              Search
            </button>
          </form>

          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-cyan-50">
            <span>
              {jobs.length === 1 ? "1 open position" : jobs.length + " open positions"}
            </span>
            <span aria-hidden>•</span>
            <span>{CATEGORIES.length} categories</span>
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-xl font-bold text-slate-900">Browse by Category</h2>
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {CATEGORIES.map((cat) => (
            <Link
              key={cat}
              href={`/jobs?category=${encodeURIComponent(cat)}`}
              className="flex flex-col items-center gap-2 rounded-xl border border-slate-200 bg-white p-5 text-center shadow-sm transition hover:border-cyan-300 hover:shadow-md"
            >
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                <CategoryIcon category={cat} className="h-6 w-6" />
              </span>
              <span className="text-sm font-medium text-slate-700">{cat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured jobs. An honest empty state beats a grid of nothing — and
          beats the placeholder listings that used to fill it. */}
      {jobs.length > 0 ? (
        <section className="mx-auto max-w-6xl px-4 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-900">
              {featured.length > 0 ? "Featured Jobs" : "Latest Jobs"}
            </h2>
            <Link
              href="/jobs"
              className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
            >
              View all jobs →
            </Link>
          </div>
          <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {(featured.length > 0 ? featured : jobs.slice(0, 6)).map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      ) : (
        <section className="mx-auto max-w-3xl px-4 pb-4">
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-8 text-center">
            <p className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-slate-100 text-slate-400"><PalmLogo className="h-7 w-7" /></p>
            <h2 className="mt-3 text-xl font-bold text-slate-900">
              No openings posted yet
            </h2>
            <p className="mt-2 text-slate-600">
              This board is new. Every listing here will be a real job on Guam,
              posted by the employer hiring for it.
            </p>
            <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                href="/post-a-job"
                className="rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
              >
                Hiring? Post a job — free
              </Link>
              <Link
                href="/blog"
                className="rounded-lg px-6 py-3 font-semibold text-cyan-700 ring-1 ring-cyan-200 transition hover:bg-cyan-50"
              >
                Read our Guam work guides
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-xl font-bold text-slate-900">
          How It Works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: SearchIcon,
              title: "Browse Jobs",
              text: "Explore open positions across Guam by category or keyword.",
            },
            {
              icon: DocumentIcon,
              title: "Apply in Minutes",
              text: "Confirm your email with a one-time link, then send a short application. No password, no resume upload.",
            },
            {
              icon: HandshakeIcon,
              title: "Get Hired",
              text: "Employers contact you directly when you're a great match.",
            },
          ].map(({ icon: StepIcon, ...step }, i) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-cyan-700">
                <StepIcon className="h-6 w-6" />
              </div>
              <p className="mt-3 text-sm font-semibold text-cyan-600">
                Step {i + 1}
              </p>
              <h3 className="mt-1 font-semibold text-slate-900">{step.title}</h3>
              <p className="mt-2 text-sm text-slate-500">{step.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Employer CTA */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl bg-slate-900 px-6 py-10 text-center text-white sm:px-12">
          <h2 className="text-2xl font-bold">Hiring in Guam?</h2>
          <p className="mx-auto mt-2 max-w-xl text-slate-300">
            Post your job opening and reach local talent across the island.
            It&apos;s free to get started.
          </p>
          <Link
            href="/post-a-job"
            className="mt-6 inline-block rounded-lg bg-cyan-500 px-6 py-3 font-semibold text-white transition hover:bg-cyan-400"
          >
            Post a Job — Free
          </Link>
        </div>
      </section>
    </>
  );
}
