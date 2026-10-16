import Link from "next/link";
import { redirect } from "next/navigation";
import {
  listAuthAccounts,
  listEmployerProfiles,
  listPendingJobs,
  listApplications,
  listPayments,
  type AuthAccount,
  type EmployerProfile,
  type PendingJob,
} from "@/lib/store";
import { isAdmin } from "@/lib/admin-session";
import AdminNav from "../AdminNav";

// Every sign-in account, with what it has actually done on the site.
//
// Added 2026-10-16. Until then the Admin only ever showed accounts through the
// jobs they posted, so the owner could not see who had registered at all — and
// the database turned out to hold 579 accounts of which 6 had ever signed in
// and 5 had posted a job: mostly sign-ups that never came back (many look
// automated). This screen separates the two so real employers are not lost in
// the noise, and so the noise itself is visible.

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Accounts — Admin",
  robots: { index: false, follow: false },
};

const SHOW = ["active", "never", "all"] as const;
type Show = (typeof SHOW)[number];
const SHOW_LABEL: Record<Show, string> = {
  active: "Active",
  never: "Never signed in",
  all: "All",
};
const MAX_ROWS = 300;

// This page is rendered per request on the server (force-dynamic), so reading
// the clock is correct here; kept in a helper for the React purity lint.
function requestTime(): number {
  return Date.now();
}

const fmt = (iso: string | null | undefined) =>
  iso
    ? new Date(iso).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        timeZone: "Pacific/Guam",
      })
    : "—";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams: Promise<{ show?: string; q?: string }>;
}) {
  // Checked here as well as in proxy.ts — see lib/admin-session.ts.
  if (!(await isAdmin())) redirect("/admin/login");

  const params = await searchParams;
  const show: Show = (SHOW as readonly string[]).includes(params.show ?? "")
    ? (params.show as Show)
    : "active";
  const q = (params.q ?? "").trim().toLowerCase();

  const [accountsResult, profiles, jobs, applications, payments] = await Promise.all([
    listAuthAccounts().then(
      (list) => ({ list, error: null as string | null }),
      (err: unknown) => ({
        list: [] as AuthAccount[],
        error: err instanceof Error ? err.message : String(err),
      }),
    ),
    listEmployerProfiles().catch(() => [] as EmployerProfile[]),
    listPendingJobs().catch(() => [] as PendingJob[]),
    listApplications().catch(() => []),
    listPayments().catch(() => []),
  ]);

  const accounts = accountsResult.list;
  const loadError = accountsResult.error;
  const now = requestTime();
  const profileById = new Map(profiles.map((p) => [p.userId, p]));
  const jobsByUser = new Map<string, PendingJob[]>();
  for (const j of jobs) {
    if (!j.userId) continue;
    jobsByUser.set(j.userId, [...(jobsByUser.get(j.userId) ?? []), j]);
  }
  const appsByUser = new Map<string, number>();
  for (const a of applications) {
    if (a.userId) appsByUser.set(a.userId, (appsByUser.get(a.userId) ?? 0) + 1);
  }
  const paidByUser = new Map<string, number>();
  for (const p of payments) {
    if (p.status === "paid" && p.userId) {
      paidByUser.set(p.userId, (paidByUser.get(p.userId) ?? 0) + p.amountCents);
    }
  }

  const isLive = (j: PendingJob) =>
    j.status === "approved" &&
    (j.expiresAt == null || new Date(j.expiresAt).getTime() > now);

  const rows = accounts.map((a) => {
    const userJobs = jobsByUser.get(a.id) ?? [];
    const apps = appsByUser.get(a.id) ?? 0;
    const paid = paidByUser.get(a.id) ?? 0;
    const profile = profileById.get(a.id);
    // "Active" = has done anything at all: signed in, posted, applied or paid.
    const active = Boolean(a.lastSignInAt) || userJobs.length > 0 || apps > 0 || paid > 0;
    return { a, profile, userJobs, apps, paid, active };
  });

  const counts = {
    total: rows.length,
    active: rows.filter((r) => r.active).length,
    never: rows.filter((r) => !r.active).length,
    posted: rows.filter((r) => r.userJobs.length > 0).length,
    new7: rows.filter((r) => now - new Date(r.a.createdAt).getTime() <= 7 * 86_400_000).length,
    new7never: rows.filter(
      (r) => !r.active && now - new Date(r.a.createdAt).getTime() <= 7 * 86_400_000,
    ).length,
  };

  const matchesQuery = (r: (typeof rows)[number]) => {
    if (!q) return true;
    const hay = [
      r.a.id,
      r.a.email,
      r.profile?.contactName,
      r.profile?.phone,
      r.profile?.url,
      ...r.userJobs.map((j) => `${j.company} ${j.title}`),
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(q);
  };

  const filtered = rows
    // A search looks through everyone, so a link from a job always finds its account.
    .filter((r) => (q ? true : show === "all" || (show === "active" ? r.active : !r.active)))
    .filter(matchesQuery)
    .sort((x, y) => {
      const t = (r: typeof x) =>
        new Date(r.a.lastSignInAt ?? r.a.createdAt).getTime();
      return t(y) - t(x);
    });
  const shown = filtered.slice(0, MAX_ROWS);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <AdminNav current="accounts" />
      <h1 className="mt-6 text-2xl font-bold text-slate-900">Accounts</h1>
      <p className="mt-1 text-sm text-slate-500">
        Everyone who has registered, and what they have done since.
      </p>

      {loadError && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
          Could not load accounts: {loadError}
        </p>
      )}

      <div className="mt-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Accounts" value={counts.total} note={`${counts.new7} new in 7 days`} />
        <Stat label="Active" value={counts.active} note="signed in, posted, applied or paid" />
        <Stat label="Posted a job" value={counts.posted} />
        <Stat
          label="Never signed in"
          value={counts.never}
          note={`${counts.new7never} of them in the last 7 days`}
          warn={counts.total > 0 && counts.never / counts.total > 0.5}
        />
      </div>
      {counts.total > 0 && counts.never / counts.total > 0.5 && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Most accounts have never signed in. A steady flow of sign-ups that
          never come back is usually automated — every one of them still makes
          the site send a confirmation email.
        </p>
      )}

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <nav className="flex flex-wrap gap-2 text-xs">
          {SHOW.map((s) => (
            <Link
              key={s}
              href={s === "active" ? "/admin/accounts" : `/admin/accounts?show=${s}`}
              className={`rounded-full px-3 py-1 font-medium ring-1 ${
                !q && show === s
                  ? "bg-slate-900 text-white ring-slate-900"
                  : "bg-white text-slate-600 ring-slate-300 hover:bg-slate-50"
              }`}
            >
              {SHOW_LABEL[s]} ({s === "all" ? counts.total : counts[s]})
            </Link>
          ))}
        </nav>
        <form method="get" className="flex gap-2">
          <input
            name="q"
            defaultValue={params.q ?? ""}
            placeholder="Search email, name, company, phone…"
            className="w-64 rounded-lg border border-slate-300 px-3 py-1.5 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-3 py-1.5 text-sm font-medium text-white"
          >
            Search
          </button>
          {q && (
            <Link
              href="/admin/accounts"
              className="rounded-lg px-3 py-1.5 text-sm text-slate-600 ring-1 ring-slate-300"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {q ? `${filtered.length} match "${params.q}" (searching all accounts)` : `${filtered.length} shown`}
        {filtered.length > MAX_ROWS && ` — first ${MAX_ROWS} listed; search to narrow down`}
      </p>

      <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-sm">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              <th className="px-4 py-3 font-medium">Account</th>
              <th className="px-4 py-3 font-medium">Registered</th>
              <th className="px-4 py-3 font-medium">Last sign-in</th>
              <th className="px-4 py-3 font-medium">Jobs</th>
              <th className="px-4 py-3 font-medium">Activity</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {shown.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No accounts here.
                </td>
              </tr>
            ) : (
              shown.map(({ a, profile, userJobs, apps, paid }) => {
                const live = userJobs.filter(isLive).length;
                const pending = userJobs.filter((j) => j.status === "pending").length;
                return (
                  <tr key={a.id} className="align-top hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium text-slate-900">{a.email}</p>
                      {profile ? (
                        <div className="mt-0.5 space-y-0.5 text-xs text-slate-500">
                          <p>{profile.contactName} · {profile.phone}</p>
                          {profile.url && (
                            <a
                              href={profile.url}
                              target="_blank"
                              rel="noopener noreferrer nofollow"
                              className="break-all text-cyan-600 hover:text-cyan-700"
                            >
                              {profile.url}
                            </a>
                          )}
                        </div>
                      ) : (
                        <p className="mt-0.5 text-xs text-slate-400">No profile</p>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {fmt(a.createdAt)}
                      <span
                        className={`mt-1 block w-fit rounded-full px-2 py-0.5 text-xs ${
                          a.emailConfirmedAt
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-500"
                        }`}
                      >
                        {a.emailConfirmedAt ? "email confirmed" : "not confirmed"}
                      </span>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-slate-600">
                      {a.lastSignInAt ? fmt(a.lastSignInAt) : (
                        <span className="text-slate-400">never</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {userJobs.length === 0 ? (
                        <span className="text-slate-400">—</span>
                      ) : (
                        <details>
                          <summary className="cursor-pointer text-xs">
                            <span className="font-medium text-slate-900">{userJobs.length}</span>{" "}
                            ({live} live{pending ? `, ${pending} pending` : ""})
                          </summary>
                          <ul className="mt-1 space-y-1 text-xs">
                            {userJobs.map((j) => (
                              <li key={j.id}>
                                {isLive(j) ? (
                                  <a
                                    href={`/jobs/p_${j.id}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-cyan-700 hover:text-cyan-800"
                                  >
                                    {j.title}
                                  </a>
                                ) : (
                                  <span className="text-slate-700">{j.title}</span>
                                )}
                                <span className="text-slate-400">
                                  {" "}· {j.company} ·{" "}
                                  {j.status === "approved" && !isLive(j) ? "expired" : j.status}
                                </span>
                              </li>
                            ))}
                          </ul>
                        </details>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">
                      {apps > 0 && <p>{apps} application{apps === 1 ? "" : "s"} sent</p>}
                      {paid > 0 && (
                        <p className="font-medium text-emerald-700">
                          ${(paid / 100).toFixed(2)} paid
                        </p>
                      )}
                      {apps === 0 && paid === 0 && <span className="text-slate-400">—</span>}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Stat({
  label,
  value,
  note,
  warn,
}: {
  label: string;
  value: number;
  note?: string;
  warn?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border p-4 shadow-sm ${
        warn ? "border-amber-200 bg-amber-50" : "border-slate-200 bg-white"
      }`}
    >
      <p className="text-2xl font-bold text-slate-900">{value}</p>
      <p className="mt-1 text-sm text-slate-500">{label}</p>
      {note && <p className="mt-0.5 text-xs text-slate-400">{note}</p>}
    </div>
  );
}
