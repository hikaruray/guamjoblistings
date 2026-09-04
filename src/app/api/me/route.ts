// Who is signed in, and which parts of the site they actually use.
//
// There is no role column, and deliberately so: the same person can hire and
// job-hunt, and the owner's own account is both at once — it has an employer
// profile and an application against its own listing. So instead of asking
// "are you an employer or an applicant", we report the faces this account
// already has and let the header show the matching links.
//
// Read-only, session-scoped, and it never reveals anything about anyone else.

import { getSessionUser } from "@/lib/supabase-server";
import { getEmployerProfile, listJobsByUser } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return Response.json({ signedIn: false });
  }

  let isEmployer = false;
  let applicationCount = 0;

  try {
    // Either signal makes someone an employer: they filled in company details,
    // or they have posted at least once. A profile alone is enough, so a brand
    // new employer sees their dashboard before their first listing exists.
    const [profile, jobs] = await Promise.all([
      getEmployerProfile(user.id).catch(() => null),
      listJobsByUser(user.id).catch(() => []),
    ]);
    isEmployer = Boolean(profile) || jobs.length > 0;

    const supabase = getSupabase();
    if (supabase) {
      const { count } = await supabase
        .from("applications")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id);
      applicationCount = count ?? 0;
    }
  } catch (err) {
    // The header is decoration; never fail the request over it. Worst case the
    // account still gets "signed in as", just without the shortcuts.
    console.error("Failed to resolve account faces:", err);
  }

  return Response.json({
    signedIn: true,
    email: user.email ?? null,
    isEmployer,
    isApplicant: applicationCount > 0,
    applicationCount,
  });
}
