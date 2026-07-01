import Link from "next/link";
import { notFound } from "next/navigation";
import { getPublicJob } from "@/lib/public-jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getPublicJob(id);
  if (!job) return { title: "Job not found" };
  return {
    title: `${job.title} at ${job.company}`,
    description: `${job.jobType} position in ${job.location}. ${job.description.slice(0, 140)}`,
    openGraph: {
      title: `${job.title} — ${job.company} | Guam Job Listings`,
      description: `${job.jobType} · ${job.location} · ${job.salary}`,
    },
  };
}

export default async function JobDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getPublicJob(id);

  if (!job) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "JobPosting",
    title: job.title,
    description: job.description,
    datePosted: job.postedAt,
    employmentType: job.jobType.toUpperCase().replace("-", "_"),
    hiringOrganization: {
      "@type": "Organization",
      name: job.company,
    },
    jobLocation: {
      "@type": "Place",
      address: {
        "@type": "PostalAddress",
        addressLocality: job.location,
        addressRegion: "GU",
        addressCountry: "US",
      },
    },
  };

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/jobs"
        className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
      >
        ← Back to all jobs
      </Link>

      <div className="mt-4 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">{job.title}</h1>
            <p className="mt-1 text-slate-600">{job.company}</p>
          </div>
          {job.featured && (
            <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-700">
              ★ Featured
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap gap-2 text-sm">
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            📍 {job.location}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {job.category}
          </span>
          <span className="rounded-full bg-slate-100 px-3 py-1 text-slate-600">
            {job.jobType}
          </span>
          <span className="rounded-full bg-emerald-50 px-3 py-1 font-medium text-emerald-700">
            {job.salary}
          </span>
        </div>

        <div className="mt-6 border-t border-slate-100 pt-6">
          <h2 className="font-semibold text-slate-900">About the role</h2>
          <p className="mt-2 leading-relaxed text-slate-600">{job.description}</p>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold text-slate-900">Responsibilities</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
            {job.responsibilities.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="mt-6">
          <h2 className="font-semibold text-slate-900">Requirements</h2>
          <ul className="mt-2 list-inside list-disc space-y-1 text-slate-600">
            {job.requirements.map((r) => (
              <li key={r}>{r}</li>
            ))}
          </ul>
        </div>

        <div className="mt-8 border-t border-slate-100 pt-6">
          <Link
            href={`/apply/${job.id}`}
            className="inline-block w-full rounded-lg bg-cyan-600 px-6 py-3 text-center font-semibold text-white transition hover:bg-cyan-700 sm:w-auto"
          >
            Apply for this job
          </Link>
        </div>
      </div>
    </div>
  );
}
