import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { listJobsByUser } from "@/lib/store";
import LogoutButton from "@/components/LogoutButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Employer dashboard",
  robots: { index: false, follow: false },
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
        <div className="mt-6 space-y-3">
          {jobs.map((job) => (
            <div
              key={job.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
            >
              <div>
                <p className="font-semibold text-slate-900">{job.title}</p>
                <p className="text-sm text-slate-500">
                  {job.location} · {job.jobType} · {job.salary}
                </p>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                  STATUS_STYLE[job.status] ?? "bg-slate-100 text-slate-600"
                }`}
              >
                {job.status}
              </span>
            </div>
          ))}
        </div>
      )}

      <p className="mt-6 text-xs text-slate-400">
        New postings are reviewed by our team before going live (usually within
        24 hours).
      </p>
    </div>
  );
}
