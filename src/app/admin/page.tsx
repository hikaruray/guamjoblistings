import { listApplications, listPendingJobs, listPayments } from "@/lib/store";
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
  const [applications, pendingJobs, payments] = await Promise.all([
    listApplications(),
    listPendingJobs(),
    // Never let a payments-table read take the whole Admin page down (e.g. the
    // add-ons migration hasn't been run yet).
    listPayments().catch((err) => {
      console.error("Failed to load payments:", err);
      return [];
    }),
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

  // ── Revenue ──────────────────────────────────────────────────────────
  // Only 'paid' rows are money. 'created' rows are checkouts the buyer never
  // finished; 'failed' rows were declined — neither is revenue, and neither
  // granted an add-on.
  const paidPayments = payments.filter((p) => p.status === "paid");
  const revenueCents = paidPayments.reduce((sum, p) => sum + p.amountCents, 0);
  const revenue30Cents = paidPayments
    .filter((p) => daysAgo(p.paidAt ?? p.createdAt) <= 30)
    .reduce((sum, p) => sum + p.amountCents, 0);
  const usd = (cents: number) => `$${(cents / 100).toFixed(2)}`;
  const payingEmployers = new Set(paidPayments.map((p) => p.userId ?? p.jobId)).size;
  const abandoned = payments.filter((p) => p.status === "created").length;
  const failed = payments.filter((p) => p.status === "failed").length;

  // Job title lookup so the ledger reads as names, not uuids.
  const jobTitleById = new Map(pendingJobs.map((j) => [j.id, j]));

  const ADDON_LABEL: Record<string, string> = {
    featured: "Featured",
    urgent: "Urgent badge",
    extension: "Extension",
  };
  const PAYMENT_STYLE: Record<string, string> = {
    paid: "bg-emerald-100 text-emerald-700",
    created: "bg-slate-100 text-slate-500",
    failed: "bg-rose-100 text-rose-700",
  };
  const PAYMENT_LABEL: Record<string, string> = {
    paid: "Paid",
    created: "Not completed",
    failed: "Failed",
  };

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
        <Stat
          label="Revenue"
          value={usd(revenueCents)}
          note={
            payments.length === 0
              ? "no add-on purchases yet"
              : `${usd(revenue30Cents)} in last 30d`
          }
          money
        />
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

      {/* ── Payments (add-on purchases) ──────────────────────────── */}
      <h2 className="mt-10 text-lg font-bold text-slate-900">
        Payments — add-on purchases
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        Every PayPal checkout, including ones that were never completed. Only
        <span className="font-semibold text-emerald-700"> Paid</span> rows are
        revenue and only those grant the add-on.
        {(abandoned > 0 || failed > 0) &&
          ` ${abandoned} not completed, ${failed} failed.`}
      </p>
      <div className="mt-3 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total revenue" value={usd(revenueCents)} money />
        <Stat label="Revenue (30d)" value={usd(revenue30Cents)} money />
        <Stat label="Paying employers" value={payingEmployers} />
        <Stat
          label="Completed purchases"
          value={paidPayments.length}
          note={`${payments.length} checkouts started`}
        />
      </div>
      <div className="mt-3 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Job</th>
              <th className="px-4 py-3 font-medium">Add-on</th>
              <th className="px-4 py-3 font-medium">Amount</th>
              <th className="px-4 py-3 font-medium">Payer</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium">PayPal ref</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.length === 0 ? (
              <EmptyRow
                span={7}
                text="No add-on purchases yet. Paid add-ons appear here once PayPal is enabled."
              />
            ) : (
              payments.map((p) => {
                const job = jobTitleById.get(p.jobId);
                return (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                      {new Date(p.paidAt ?? p.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-slate-900">
                        {job?.title ?? "(job removed)"}
                      </span>
                      {job?.company && (
                        <span className="block text-xs text-slate-400">
                          {job.company}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {ADDON_LABEL[p.addon] ?? p.addon}
                      <span className="block text-xs text-slate-400">
                        {p.days} days
                      </span>
                    </td>
                    <td
                      className={`px-4 py-3 font-semibold ${
                        p.status === "paid" ? "text-emerald-700" : "text-slate-400"
                      }`}
                    >
                      {usd(p.amountCents)}
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {p.payerEmail ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                          PAYMENT_STYLE[p.status] ?? "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {PAYMENT_LABEL[p.status] ?? p.status}
                      </span>
                      {p.errorNote && (
                        <span
                          className="block max-w-[16rem] truncate text-xs text-slate-400"
                          title={p.errorNote}
                        >
                          {p.errorNote}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-400">
                      {p.paypalCaptureId ?? p.paypalOrderId}
                    </td>
                  </tr>
                );
              })
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
        login. Paid add-ons are live only when PayPal credentials are set in the
        environment; until then the Promote buttons stay hidden and revenue is $0.
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
