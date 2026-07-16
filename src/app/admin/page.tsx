import { listApplications, listPendingJobs } from "@/lib/store";
import JobActions from "./JobActions";

// Always read the latest data (no caching) so new submissions show immediately.
export const dynamic = "force-dynamic";

export const metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  closed: "bg-slate-200 text-slate-600",
};

export default async function AdminPage() {
  const [applications, pendingJobs] = await Promise.all([
    listApplications(),
    listPendingJobs(),
  ]);

  const now = Date.now();
  const daysAgo = (iso: string) => (now - new Date(iso).getTime()) / 86_400_000;

  // ── Supply (employers & listings) ────────────────────────────────────
  const liveJobs = pendingJobs.filter((j) => j.status === "approved");
  const awaitingReview = pendingJobs.filter((j) => j.status === "pending").length;
  const closedJobs = pendingJobs.filter((j) => j.status === "closed").length;
  // Unique employers = distinct account (fall back to company name for legacy rows)
  const employers = new Set(pendingJobs.map((j) => j.userId ?? j.company)).size;
  const newJobs7 = pendingJobs.filter((j) => daysAgo(j.createdAt) <= 7).length;

  // ── Demand (applicants) ──────────────────────────────────────────────
  const applicants = new Set(applications.map((a) => a.userId ?? a.email)).size;
  const apps7 = applications.filter((a) => daysAgo(a.createdAt) <= 7).length;
  const apps30 = applications.filter((a) => daysAgo(a.createdAt) <= 30).length;

  // ── Matching ─────────────────────────────────────────────────────────
  // Applications are stored against the PUBLIC job id: `p_<uuid>` for employer
  // submissions, or the seed id for the built-in sample jobs.
  const countByPublicId = new Map<string, number>();
  for (const a of applications) {
    countByPublicId.set(a.jobId, (countByPublicId.get(a.jobId) ?? 0) + 1);
  }
  const appsForEmployerJobs = applications.filter((a) =>
    a.jobId.startsWith("p_"),
  ).length;
  const appsForSampleJobs = applications.length - appsForEmployerJobs;
  const liveWithApplicants = liveJobs.filter(
    (j) => (countByPublicId.get(`p_${j.id}`) ?? 0) > 0,
  ).length;
  const avgPerLiveJob = liveJobs.length
    ? appsForEmployerJobs / liveJobs.length
    : 0;

  // Most applied-to listings (real + sample), highest first.
  const topJobs = [...countByPublicId.entries()]
    .map(([publicId, count]) => {
      const sample = applications.find((a) => a.jobId === publicId);
      return {
        publicId,
        count,
        title: sample?.jobTitle ?? "(unknown)",
        company: sample?.company ?? "",
        isSample: !publicId.startsWith("p_"),
      };
    })
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Business overview — listings, applicants, matching and revenue.
      </p>

      {/* ── Overview ─────────────────────────────────────────────── */}
      <h2 className="mt-8 text-lg font-bold text-slate-900">Overview</h2>
      <div className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        <Stat label="Live jobs" value={liveJobs.length} />
        <Stat
          label="Awaiting review"
          value={awaitingReview}
          highlight={awaitingReview > 0}
        />
        <Stat label="Employers" value={employers} />
        <Stat label="Applicants" value={applicants} />
        <Stat label="Applications" value={applications.length} />
        <Stat label="Revenue" value="$0.00" note="add-ons not enabled yet" money />
      </div>

      {/* ── Matching ─────────────────────────────────────────────── */}
      <h2 className="mt-10 text-lg font-bold text-slate-900">
        Matching — are listings getting applicants?
      </h2>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat
          label="Applications to employer jobs"
          value={appsForEmployerJobs}
          note={`${appsForSampleJobs} to sample listings`}
        />
        <Stat
          label="Live jobs with applicants"
          value={`${liveWithApplicants} / ${liveJobs.length}`}
          note={
            liveJobs.length
              ? `${Math.round((liveWithApplicants / liveJobs.length) * 100)}% getting interest`
              : "no live jobs yet"
          }
        />
        <Stat
          label="Avg applications / live job"
          value={avgPerLiveJob.toFixed(1)}
        />
        <Stat
          label="Applications 7d / 30d"
          value={`${apps7} / ${apps30}`}
          note={`${newJobs7} new listings in 7d`}
        />
      </div>

      {/* Most applied-to listings */}
      <h3 className="mt-6 text-sm font-semibold text-slate-700">
        Most applied-to listings
      </h3>
      <div className="mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        {topJobs.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">
            No applications yet.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {topJobs.map((t) => (
              <li
                key={t.publicId}
                className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
              >
                <span className="min-w-0">
                  <span className="font-medium text-slate-900">{t.title}</span>
                  <span className="text-slate-500"> · {t.company}</span>
                  {t.isSample && (
                    <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
                      sample
                    </span>
                  )}
                </span>
                <span className="shrink-0 font-semibold text-slate-700">
                  {t.count} applicant{t.count === 1 ? "" : "s"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-400">
        Listings: {liveJobs.length} live · {awaitingReview} awaiting review ·{" "}
        {closedJobs} closed · {pendingJobs.length} submitted in total.
      </p>

      {/* Pending jobs — pre-publish check */}
      <h2 className="mt-10 text-lg font-bold text-slate-900">
        Job Submissions — Review before publishing
      </h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Contact</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 text-right font-medium">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pendingJobs.length === 0 ? (
              <EmptyRow span={4} text="No job submissions yet." />
            ) : (
              pendingJobs.map((job) => (
                <tr key={job.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{job.title}</p>
                    <p className="text-slate-500">{job.company}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {job.category} · {job.jobType} · {job.salary} · {job.location}
                    </p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    {job.email}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${STATUS_STYLE[job.status]}`}
                    >
                      {job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {job.status === "pending" ? (
                      <JobActions jobId={job.id} />
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Applications */}
      <h2 className="mt-10 text-lg font-bold text-slate-900">Applications</h2>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Applicant</th>
              <th className="px-4 py-3 font-medium">Applied for</th>
              <th className="hidden px-4 py-3 font-medium sm:table-cell">Contact</th>
              <th className="hidden px-4 py-3 font-medium lg:table-cell">When</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {applications.length === 0 ? (
              <EmptyRow span={4} text="No applications yet." />
            ) : (
              applications.map((a) => (
                <tr key={a.id} className="align-top hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <p className="font-medium text-slate-900">{a.name}</p>
                    {a.message && (
                      <p className="mt-1 max-w-xs text-xs text-slate-500">
                        “{a.message}”
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    <p>{a.jobTitle}</p>
                    <p className="text-xs text-slate-400">{a.company}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    <p>{a.email}</p>
                    <p className="text-xs text-slate-400">{a.phone}</p>
                  </td>
                  <td className="hidden px-4 py-3 text-xs text-slate-400 lg:table-cell">
                    {new Date(a.createdAt).toLocaleString()}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Live data from the production database. This page is protected by owner
        login. Revenue stays $0 until paid add-ons (Featured / Urgent) are turned
        on.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
  money,
  note,
}: {
  label: string;
  value: string | number;
  highlight?: boolean;
  money?: boolean; // revenue card (emerald)
  note?: string; // small caption under the label
}) {
  const box = highlight
    ? "border-amber-200 bg-amber-50"
    : money
      ? "border-emerald-200 bg-emerald-50"
      : "border-slate-200 bg-white";
  return (
    <div className={`rounded-xl border p-4 shadow-sm ${box}`}>
      <p
        className={`text-2xl font-bold ${money ? "text-emerald-700" : "text-slate-900"}`}
      >
        {value}
      </p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
    </div>
  );
}

function EmptyRow({ span, text }: { span: number; text: string }) {
  return (
    <tr>
      <td colSpan={span} className="px-4 py-10 text-center text-slate-400">
        {text}
      </td>
    </tr>
  );
}
