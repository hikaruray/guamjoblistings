import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { listJobsByUser, applicationCountsForJobs } from "@/lib/store";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employer dashboard",
  robots: { index: false, follow: false },
};

// Employer-friendly wording for each review state (clearer than the raw value).
const STATUS_LABEL: Record<string, string> = {
  pending: "Pending review",
  approved: "Live",
  rejected: "Not approved",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
};

export default async function EmployerDashboardPage() {
  // If auth isn't configured (local dev), guide the user rather than crashing.
  if (!isAuthConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-600">
        <h1 className="text-2xl font-bold text-slate-900">Employer dashboard</h1>
        <p className="mt-3">
          Accounts are not available in this environment yet.
        </p>
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/employer/login?next=/employer/dashboard");

  const jobs = await listJobsByUser(user.id);
  const counts = await applicationCountsForJobs(jobs.map((j) => j.id));
  const totalApplicants = Object.values(counts).reduce((a, b) => a + b, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Your job listings</h1>
          <p className="mt-1 text-sm text-slate-500">Signed in as {user.email}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/post-a-job"
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
          >
            + Post a job
          </Link>
          <LogoutButton />
        </div>
      </div>

      {jobs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          You haven&apos;t posted any jobs yet.
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">
            {totalApplicants === 0
              ? "No applicants yet — new applications will appear here as they come in."
              : `${totalApplicants} application${totalApplicants === 1 ? "" : "s"} received across your listings.`}
          </p>
          <div className="mt-3 space-y-3">
            {jobs.map((job) => {
              const n = counts[job.id] ?? 0;
              return (
                <div
                  key={job.id}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-slate-900">{job.title}</p>
                      <p className="text-sm text-slate-500">
                        {job.location} · {job.jobType} · {job.salary}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-slate-700">
                        {n} applicant{n === 1 ? "" : "s"}
                      </span>
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          STATUS_STYLE[job.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {STATUS_LABEL[job.status] ?? job.status}
                      </span>
                    </div>
                  </div>
                  {job.status === "rejected" && (
                    <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      This posting wasn&apos;t approved — usually due to missing
                      details or content outside our guidelines. Please review and
                      post again, or email us at applications@guamjoblisting.com
                      and we&apos;ll help.
                    </p>
                  )}
                  <div className="mt-3 flex justify-end border-t border-slate-100 pt-3">
                    <Link
                      href={`/employer/jobs/${job.id}/edit`}
                      className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
                    >
                      Edit
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Applications are emailed to your contact address as they arrive. New
        postings are reviewed by our team before going live (usually within 24
        hours).
      </p>
    </div>
  );
}
