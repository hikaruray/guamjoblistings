import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import {
  listJobsByUser,
  applicationCountsForJobs,
  getEmployerProfile,
} from "@/lib/store";
import { addonViews } from "@/lib/addons";
import { isPaypalConfigured } from "@/lib/paypal";
import { PAYPAL_ENABLED } from "@/lib/config";
import LogoutButton from "@/components/LogoutButton";
import DashboardJobActions from "./DashboardJobActions";
import PromoteJob from "./PromoteJob";
import CompanyDetails from "./CompanyDetails";

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
  closed: "Closed",
};

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-rose-100 text-rose-700",
  closed: "bg-slate-200 text-slate-600",
};

// Approved but past its window: off the board, so it is not "Live" and there is
// nothing to promote. Used by the badge and by the add-on panel, which used to
// disagree — the day PayPal keys land, "Expired" and "Feature it" would have
// appeared on the same card.
function isExpired(job: { status: string; expiresAt?: string | null }): boolean {
  return (
    job.status === "approved" &&
    job.expiresAt != null &&
    new Date(job.expiresAt).getTime() <= Date.now()
  );
}

export default async function EmployerDashboardPage({
  searchParams,
}: {
  // Next 16: request-time APIs are async, so this is a Promise.
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const needCompanyDetails =
    (await searchParams).needCompanyDetails !== undefined;
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
  // Applications are stored against the PUBLIC job id, which for an employer
  // submission is `p_<uuid>` (see lib/public-jobs.ts mapApproved) — not the raw
  // row id. Count against that or every job shows 0 applicants.
  const counts = await applicationCountsForJobs(jobs.map((j) => `p_${j.id}`));
  const totalApplicants = Object.values(counts).reduce((a, b) => a + b, 0);

  // Paid add-ons appear only when PayPal is fully configured (server secret AND
  // public client id). Until the owner sets those, the site stays exactly as it
  // is today: Phase 0, every listing free, no payment UI anywhere.
  // Their registration details, so they can see and correct them. A failure
  // here is not worth taking the whole dashboard down for.
  const profile = await getEmployerProfile(user.id).catch((err) => {
    console.error("Failed to load employer profile:", err);
    return null;
  });

  const addonsEnabled = isPaypalConfigured() && PAYPAL_ENABLED;
  // Prices are resolved on the server and passed down for DISPLAY only.
  const addons = addonsEnabled ? addonViews() : [];

  return (
    <div className="mx-auto max-w-4xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          {/* Someone sent here from Post a Job, with no company details and no
              listings, is not looking at "your job listings" — they may not even
              be an employer. A jobseeker who taps Post a Job out of curiosity
              landed on a page titled as though they already had postings. */}
          <h1 className="text-2xl font-bold text-slate-900">
            {needCompanyDetails && !profile && jobs.length === 0
              ? "Set up your employer account"
              : "Your job listings"}
          </h1>
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

      {/* Arriving here from /post-a-job without a profile is a redirect, and a
          redirect with no explanation reads as the site losing your click. */}
      {needCompanyDetails && !profile && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Before your first listing, we need your company details. Job seekers
          and our reviewers use them to tell a real employer from a scam. Fill
          them in below and you&apos;ll go straight back to posting.
        </p>
      )}

      <CompanyDetails
        profile={profile}
        email={user.email ?? ""}
        returnToPosting={needCompanyDetails && !profile}
      />

      {jobs.length === 0 ? (
        <div className="mt-8 rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
          You haven&apos;t posted any jobs yet.
        </div>
      ) : (
        <>
          {/* The count used to be the end of the road: an employer could see
              that six people had applied and had no way to read any of them
              here. The applications themselves now live one click away. */}
          <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-slate-600">
              {totalApplicants === 0
                ? "No applicants yet — new applications will appear here as they come in."
                : `${totalApplicants} application${totalApplicants === 1 ? "" : "s"} received across your listings.`}
            </p>
            {totalApplicants > 0 && (
              <Link
                href="/employer/applications"
                className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700"
              >
                Read applications
              </Link>
            )}
          </div>
          <div className="mt-3 space-y-3">
            {jobs.map((job) => {
              const n = counts[`p_${job.id}`] ?? 0;
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
                      {/* An approved posting past its expiry is not on the
                          board any more, and calling it "Live" in green while
                          the line underneath says it has expired put two
                          contradictory claims on one card. */}
                      {(() => {
                        const expired = isExpired(job);
                        const label = expired
                          ? "Expired"
                          : (STATUS_LABEL[job.status] ?? job.status);
                        const style = expired
                          ? "bg-slate-200 text-slate-600"
                          : (STATUS_STYLE[job.status] ??
                            "bg-slate-100 text-slate-600");
                        return (
                          <span
                            className={`rounded-full px-2.5 py-1 text-xs font-medium ${style}`}
                          >
                            {label}
                          </span>
                        );
                      })()}
                    </div>
                  </div>
                  {job.status === "rejected" && (
                    <div className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
                      {job.rejectionReason ? (
                        <p>
                          <span className="font-semibold">Reason:</span>{" "}
                          {job.rejectionReason}
                        </p>
                      ) : (
                        <p>
                          This posting wasn&apos;t approved — usually due to
                          missing details or content outside our guidelines.
                        </p>
                      )}
                      <p className="mt-1">
                        Please edit and resubmit, or email us at
                        applications@guamjoblisting.com and we&apos;ll help.
                      </p>
                    </div>
                  )}
                  {/* A closed posting carrying a reason was closed by us, not
                      by the employer — see setJobStatus. Without this the two
                      looked identical, so an employer could reopen a listing we
                      had removed, never knowing why, and have it removed again. */}
                  {job.status === "closed" && job.rejectionReason && (
                    <div className="mt-2 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-900">
                      <p>
                        <span className="font-semibold">
                          We took this posting down.
                        </span>{" "}
                        {job.rejectionReason}
                      </p>
                      <p className="mt-1">
                        Edit it to address this and reopen it, or reply to our
                        email if you think we got it wrong.
                      </p>
                    </div>
                  )}
                  <DashboardJobActions
                    id={job.id}
                    status={job.status}
                    expiresAt={job.expiresAt ?? null}
                    promotable={addonsEnabled}
                  />
                  {/* Only a live listing can be promoted — mirrors the server
                      check in /api/paypal/create-order. */}
                  {addonsEnabled && job.status === "approved" && !isExpired(job) && (
                    <PromoteJob
                      jobId={job.id}
                      addons={addons}
                      featuredUntil={job.featuredUntil ?? null}
                      urgentUntil={job.urgentUntil ?? null}
                    />
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}

      <p className="mt-6 text-xs text-slate-400">
        We email your contact address each time someone applies; the application itself is here. New
        postings are reviewed by our team before going live (usually within 24
        hours).
      </p>
    </div>
  );
}
