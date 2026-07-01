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
};

export default async function AdminPage() {
  const [applications, pendingJobs] = await Promise.all([
    listApplications(),
    listPendingJobs(),
  ]);

  const awaitingReview = pendingJobs.filter((j) => j.status === "pending").length;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
      <p className="mt-1 text-sm text-slate-500">
        Review job submissions and track applications.
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Total Applications" value={applications.length} />
        <Stat label="Job Submissions" value={pendingJobs.length} />
        <Stat label="Awaiting Review" value={awaitingReview} highlight={awaitingReview > 0} />
        <Stat
          label="Approved"
          value={pendingJobs.filter((j) => j.status === "approved").length}
        />
      </div>

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
        Using local development storage. At launch this connects to the live
        database and is protected by owner login.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        highlight
          ? "border-amber-200 bg-amber-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
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
