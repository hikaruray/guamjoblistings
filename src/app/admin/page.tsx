import {
  listApplications,
  listPendingJobs,
  listPayments,
  employerProfilesByUserId,
  type EmployerProfile,
} from "@/lib/store";
import JobActions from "./JobActions";
import ResolvePayment from "./ResolvePayment";

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

  // Who is behind each listing. Reviewing a job means judging whether the
  // employer is real, so the contact details they gave at registration belong
  // on this screen. Never let a profiles read take the page down.
  const profiles = await employerProfilesByUserId(
    pendingJobs.map((j) => j.userId ?? ""),
  ).catch((err) => {
    console.error("Failed to load employer profiles:", err);
    return new Map<string, EmployerProfile>();
  });

  const now = Date.now();
  const daysAgo = (iso: string) => (now - new Date(iso).getTime()) / 86_400_000;

  // ── Supply (employers & listings) ────────────────────────────────────
  // Approved and still inside its window. Counting every approved row as live
  // made this number drift from what /jobs actually shows, and an expired
  // posting kept a green "Live" badge in the queue below.
  const isLive = (j: (typeof pendingJobs)[number]) =>
    j.status === "approved" &&
    (j.expiresAt == null || new Date(j.expiresAt).getTime() > Date.now());
  const liveJobs = pendingJobs.filter(isLive);
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

  // Money taken where the thing bought is not actually switched on.
  //
  // capture-order marks a payment 'paid' and then grants the add-on, in that
  // order and not atomically, so a grant that fails leaves a paid row against a
  // posting with no add-on — counted as revenue, invisible everywhere. There
  // was no way to notice; now it is the first thing on this page when it
  // happens. Also catches a paid add-on whose window has run out while the
  // posting sat closed, which is a refund conversation, not a bug.
  // Judged against when the money was taken, never against "now".
  //
  // Comparing the add-on's end date to the current time was wrong in a way that
  // got worse with success: a purchase that worked perfectly ends 10 days after
  // it was paid for, so on day 11 every healthy sale fell into this list and
  // stayed there. The alert would have filled with normal revenue and buried
  // the one real failure it exists to surface. A grant that happened always
  // pushes the end date past the moment of payment, so that is the comparison.
  const ungranted = paidPayments.filter((p) => {
    const job = jobTitleById.get(p.jobId);
    if (!job) return true; // paid against a posting that no longer exists
    // Explicit per-addon lookup rather than a two-way branch: a retired addon
    // id (the 2026-08-29 "extension") would otherwise be checked against
    // urgentUntil and flagged forever. None exist today — payments is empty —
    // but the branch would have been wrong the moment one did.
    const until =
      p.addon === "featured"
        ? job.featuredUntil
        : p.addon === "urgent"
          ? job.urgentUntil
          : undefined;
    if (until === undefined) return false; // unknown/retired addon: not ours to judge
    if (until == null) return true;

    // A successful grant extends from max(now, existing) by the days bought, so
    // the end date always lands at least that far past the moment of payment.
    // Comparing only against paidAt would miss the case that matters most in
    // practice: topping up an add-on before it runs out. There the end date is
    // already in the future from the first purchase, so a failed second grant
    // looked healthy. Allow an hour of slack for clock and rounding.
    const paidAt = new Date(p.paidAt ?? p.createdAt).getTime();
    const expectedAtLeast = paidAt + p.days * 86_400_000 - 3_600_000;
    return new Date(until).getTime() < expectedAtLeast;
  });

  // Orders where we do not know whether the money moved. capture-order writes
  // these when the PayPal call threw — a timeout can mean the capture succeeded
  // — so they are more urgent than a clean failure, not less. They are 'failed'
  // rows, which the revenue table excludes, so without this they appeared
  // nowhere but a truncated cell in the ledger and a server log nobody reads.
  const unknownOutcome = payments.filter(
    (p) => p.status === "failed" && p.errorNote?.startsWith("Outcome unknown"),
  );

  // Live listings someone has paid to promote. The reviewer needs this before
  // pressing Unpublish: taking down a posting that was featured yesterday is a
  // refund the buyer will (rightly) ask for, and there is no refund flow.
  const paidJobIds = new Set(
    paidPayments
      .filter((p) => {
        const job = jobTitleById.get(p.jobId);
        if (!job) return false;
        const until =
          p.addon === "featured"
            ? job.featuredUntil
            : p.addon === "urgent"
              ? job.urgentUntil
              : null;
        return until != null && new Date(until).getTime() > Date.now();
      })
      .map((p) => p.jobId),
  );

  const ADDON_LABEL: Record<string, string> = {
    featured: "Featured",
    urgent: "Urgent badge",
    extension: "Extension", // legacy: add-on retired 2026-08-29
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

      {unknownOutcome.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-400 bg-rose-100 p-4 text-sm text-rose-900">
          <p className="font-semibold">
            {unknownOutcome.length} payment
            {unknownOutcome.length === 1 ? "" : "s"} with an unknown outcome.
          </p>
          <p className="mt-1">
            We lost contact with PayPal mid-capture, so the money may or may not
            have moved. Open each order in PayPal: if it was captured, apply the
            add-on by hand or refund it; if it was not, nothing to do. The buyer
            has been told not to pay again.
          </p>
          <p className="mt-1">
            Until you press <strong>I checked PayPal</strong> on a row, that
            employer cannot buy that add-on again — which is what stops them
            paying twice for something that may already have gone through.
          </p>
          <ul className="mt-2 space-y-1">
            {unknownOutcome.map((p) => (
              <li key={p.id}>
                {usd(p.amountCents)} · {ADDON_LABEL[p.addon] ?? p.addon} ·{" "}
                {jobTitleById.get(p.jobId)?.title ?? "(posting deleted)"} · order{" "}
                {p.paypalOrderId}
                <ResolvePayment orderId={p.paypalOrderId} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {ungranted.length > 0 && (
        <div className="mt-4 rounded-xl border border-rose-300 bg-rose-50 p-4 text-sm text-rose-800">
          <p className="font-semibold">
            {ungranted.length} paid add-on
            {ungranted.length === 1 ? " is" : "s are"} not active.
          </p>
          <p className="mt-1">
            Money was taken and the add-on is not switched on. Check each order
            in PayPal and either apply it by hand or refund it.
          </p>
          <ul className="mt-2 space-y-1">
            {ungranted.map((p) => (
              <li key={p.id}>
                {usd(p.amountCents)} · {ADDON_LABEL[p.addon] ?? p.addon} ·{" "}
                {jobTitleById.get(p.jobId)?.title ?? "(posting deleted)"} ·
                order {p.paypalOrderId}
              </li>
            ))}
          </ul>
        </div>
      )}

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
                      {" · submitted "}
                      {new Date(job.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                      })}
                    </p>
                    {/* The posting itself. Approve and Reject were being pressed
                        without it: a pending job is not public, so /jobs/p_… is
                        a 404 and this screen showed only the metadata. Deciding
                        whether an employer is real means reading what they
                        wrote. Collapsed so the queue still scans at a glance. */}
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-medium text-cyan-700 hover:text-cyan-800">
                        Read the posting
                      </summary>
                      <p className="mt-2 max-w-prose whitespace-pre-wrap rounded-lg bg-slate-50 px-3 py-2 text-xs leading-relaxed text-slate-700">
                        {job.description}
                      </p>
                    </details>
                  </td>
                  <td className="hidden px-4 py-3 text-slate-600 sm:table-cell">
                    <p>{job.email}</p>
                    {(() => {
                      const p = job.userId ? profiles.get(job.userId) : undefined;
                      if (!p) {
                        return (
                          <p className="mt-1 text-xs text-amber-600">
                            No account details on file
                          </p>
                        );
                      }
                      // Does the account's email live at the company's own
                      // domain? A real hotel signs up from @hotel.com; a scam
                      // listing almost always uses free webmail with a company
                      // website borrowed from somewhere. It is a hint, not a
                      // verdict — plenty of small Guam employers legitimately
                      // use Gmail — so it is shown, never enforced.
                      const emailDomain = p.email.split("@")[1]?.toLowerCase();
                      let siteDomain: string | null = null;
                      try {
                        siteDomain = new URL(p.url).hostname
                          .toLowerCase()
                          .replace(/^www\./, "");
                      } catch {
                        siteDomain = null;
                      }
                      const domainsMatch =
                        Boolean(emailDomain && siteDomain) &&
                        (emailDomain === siteDomain ||
                          siteDomain!.endsWith(`.${emailDomain}`) ||
                          emailDomain!.endsWith(`.${siteDomain}`));

                      return (
                        <div className="mt-1 space-y-0.5 text-xs text-slate-500">
                          <p>{p.contactName}</p>
                          <p>{p.phone}</p>
                          <a
                            href={p.url}
                            target="_blank"
                            rel="noopener noreferrer nofollow"
                            className="text-cyan-600 hover:text-cyan-700"
                          >
                            {p.url}
                          </a>
                          {p.email !== job.email && (
                            <p className="text-amber-600">
                              Account email: {p.email}
                            </p>
                          )}
                          <p
                            className={
                              domainsMatch ? "text-emerald-600" : "text-amber-600"
                            }
                          >
                            {domainsMatch
                              ? `Email matches ${siteDomain}`
                              : siteDomain
                                ? `Email is ${emailDomain ?? "?"}, site is ${siteDomain}`
                                : "Website is not a valid URL"}
                          </p>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="px-4 py-3">
                    {/* Same rule as the Live count above and the employer's own
                        dashboard: approved but past its window is not live. */}
                    <span
                      className={`rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
                        job.status === "approved" && !isLive(job)
                          ? "bg-slate-200 text-slate-600"
                          : STATUS_STYLE[job.status]
                      }`}
                    >
                      {job.status === "approved" && !isLive(job)
                        ? "expired"
                        : job.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* There is no refund flow, so the reviewer has to know
                        before pressing Unpublish that this employer has paid
                        for prominence that is still running. */}
                    {paidJobIds.has(job.id) && (
                      <p className="mb-1 text-xs font-medium text-amber-700">
                        Paid add-on active — refund conversation
                      </p>
                    )}
                    {job.status === "pending" || job.status === "approved" ? (
                      <JobActions jobId={job.id} status={job.status} />
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
