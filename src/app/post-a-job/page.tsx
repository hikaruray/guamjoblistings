import { redirect } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
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
  }

  return <PostJobForm defaultEmail={defaultEmail} />;
}
