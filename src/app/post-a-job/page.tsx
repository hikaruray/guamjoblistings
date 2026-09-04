import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { getEmployerProfile } from "@/lib/store";
import PostJobForm from "./PostJobForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Post a Job",
  description: "Post a job opening and reach local talent across Guam.",
};

export default async function PostAJobPage() {
  // Require a signed-in employer to post (only when auth is configured; local
  // dev without Supabase keeps the old open behavior so development isn't blocked).
  let defaultEmail: string | undefined;
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) redirect("/employer/login?next=/post-a-job");
    defaultEmail = user.email;

    // A session alone used to be enough, so an account created through the
    // applicant magic link could post a listing having never given a company
    // name, website or phone — while the sign-in page promises jobseekers that
    // employers keep a verified account. Send them to fill it in first; the
    // dashboard opens that form by itself when the profile is missing.
    const profile = await getEmployerProfile(user.id).catch(() => null);
    if (!profile) redirect("/employer/dashboard?needCompanyDetails=1");
  }

  return <PostJobForm defaultEmail={defaultEmail} />;
}
