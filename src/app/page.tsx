import Link from "next/link";
import { CATEGORIES, getFeaturedJobs, JOBS } from "@/lib/jobs";
import JobCard from "@/components/JobCard";

const CATEGORY_EMOJI: Record<string, string> = {
  "Hospitality & Hotels": "🏨",
  "Food & Beverage": "🍽️",
  "Water Sports & Tours": "🌊",
  "Retail & Shopping": "🛍️",
  "General & Other": "💼",
};

export default function Home() {
  const featured = getFeaturedJobs();

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cyan-600 via-cyan-500 to-teal-500 text-white">
        <div className="mx-auto max-w-6xl px-4 py-20 text-center sm:py-28">
          <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
            Find Your Next Job in Guam 🌴
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
            <span>{JOBS.length} open positions</span>
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
              <span className="text-3xl">{CATEGORY_EMOJI[cat]}</span>
              <span className="text-sm font-medium text-slate-700">{cat}</span>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured jobs */}
      <section className="mx-auto max-w-6xl px-4 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold text-slate-900">Featured Jobs</h2>
          <Link
            href="/jobs"
            className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
          >
            View all jobs →
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((job) => (
            <JobCard key={job.id} job={job} />
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-center text-xl font-bold text-slate-900">
          How It Works
        </h2>
        <div className="mt-8 grid gap-6 sm:grid-cols-3">
          {[
            {
              icon: "🔍",
              title: "Browse Jobs",
              text: "Explore open positions across Guam by category or keyword.",
            },
            {
              icon: "📝",
              title: "Apply in Minutes",
              text: "Send your application straight to the employer — no account needed.",
            },
            {
              icon: "🤝",
              title: "Get Hired",
              text: "Employers contact you directly when you're a great match.",
            },
          ].map((step, i) => (
            <div
              key={step.title}
              className="rounded-xl border border-slate-200 bg-white p-6 text-center shadow-sm"
            >
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-cyan-50 text-2xl">
                {step.icon}
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
