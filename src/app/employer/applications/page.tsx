import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { listJobsByUser, listApplicationsForJobs } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Applications received",
  // Never index a page that exists to show other people's personal details.
  robots: { index: false, follow: false },
};

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Applications to this employer's own postings.
//
// The ownership check is the whole point of this page: we read the jobs that
// belong to the signed-in user, then look up applications for exactly those
// job ids. Nothing is taken from the URL, so there is no id to tamper with.
export default async function EmployerApplicationsPage() {
  if (!isAuthConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-600">
        <h1 className="text-2xl font-bold text-slate-900">
          Applications received
        </h1>
        <p className="mt-3">This page needs the site to be fully configured.</p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/employer/login?next=/employer/applications");

  const jobs = await listJobsByUser(user.id);
  const byPublicId = new Map(jobs.map((j) => [`p_${j.id}`, j]));
  const applications = await listApplicationsForJobs([...byPublicId.keys()]);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Applications received
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Everyone who has applied to your postings.
          </p>
        </div>
        <Link
          href="/employer/dashboard"
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          Back to listings
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          No applications yet. They&apos;ll appear here as they come in, and
          we&apos;ll email you each time.
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">
            {applications.length} application
            {applications.length === 1 ? "" : "s"} across {jobs.length} listing
            {jobs.length === 1 ? "" : "s"}.
          </p>

          <div className="mt-4 space-y-4">
            {applications.map((a) => {
              const job = byPublicId.get(a.jobId);
              return (
                <div
                  key={a.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{a.name}</p>
                      <p className="text-sm text-slate-500">
                        Applied for{" "}
                        <span className="font-medium text-slate-700">
                          {job?.title ?? a.jobTitle}
                        </span>
                      </p>
                    </div>
                    <p className="text-xs text-slate-400">
                      {formatDate(a.createdAt)}
                    </p>
                  </div>

                  <div className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                    <a
                      href={`mailto:${a.email}`}
                      className="font-medium text-cyan-600 hover:text-cyan-700"
                    >
                      {a.email}
                    </a>
                    <a
                      href={`tel:${a.phone}`}
                      className="font-medium text-cyan-600 hover:text-cyan-700"
                    >
                      {a.phone}
                    </a>
                  </div>

                  {a.message?.trim() && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700">
                      {a.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <p className="mt-6 text-xs text-slate-400">
            These are real people&apos;s contact details, shared with you so you
            can hire. Please use them only to fill the role they applied for.
          </p>
        </>
      )}
    </div>
  );
}
