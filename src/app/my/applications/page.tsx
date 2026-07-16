import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { listApplicationsByUser } from "@/lib/store";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "My applications",
  robots: { index: false, follow: false },
};

export default async function MyApplicationsPage() {
  // Sign-in required — this is the applicant's own record.
  if (!isAuthConfigured()) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center text-slate-500">
        Sign-in is not available in this environment.
      </div>
    );
  }

  const user = await getSessionUser();
  if (!user) redirect("/login?next=/my/applications");

  const applications = await listApplicationsByUser(user.id);

  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">My applications</h1>
          <p className="mt-1 text-sm text-slate-500">Signed in as {user.email}</p>
        </div>
        <Link
          href="/jobs"
          className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
        >
          Browse jobs
        </Link>
      </div>

      {applications.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          <p>You haven&apos;t applied to any jobs yet.</p>
          <Link
            href="/jobs"
            className="mt-3 inline-block font-medium text-cyan-600 hover:text-cyan-700"
          >
            Find a job →
          </Link>
        </div>
      ) : (
        <>
          <p className="mt-6 text-sm text-slate-600">
            {applications.length} application
            {applications.length === 1 ? "" : "s"} sent. Employers contact you
            directly if you&apos;re a match.
          </p>
          <div className="mt-3 space-y-3">
            {applications.map((a) => (
              <div
                key={a.id}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900">{a.jobTitle}</p>
                    <p className="text-sm text-slate-500">{a.company}</p>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Sent
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  Applied {new Date(a.createdAt).toLocaleDateString()} · sent to
                  the employer with your contact details
                </p>
                {a.message && (
                  <p className="mt-2 max-w-xl text-xs text-slate-500">
                    &ldquo;{a.message}&rdquo;
                  </p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-slate-400">
        Employers usually reply within about a week. If you don&apos;t hear back,
        they most likely moved forward with other candidates — keep applying, new
        jobs are posted regularly.
      </p>
    </div>
  );
}
