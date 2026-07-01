import { notFound, redirect } from "next/navigation";
import { getPublicJob } from "@/lib/public-jobs";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import ApplyForm from "./ApplyForm";

export const dynamic = "force-dynamic";

export default async function ApplyPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const job = await getPublicJob(id);

  if (!job) notFound();

  // Require sign-in to apply (only when auth is configured; local dev without
  // Supabase keeps the old anonymous behavior so development isn't blocked).
  let applicantEmail: string | undefined;
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) redirect(`/login?next=/apply/${id}`);
    applicantEmail = user.email;
  }

  return (
    <ApplyForm
      jobId={job.id}
      jobTitle={job.title}
      company={job.company}
      applicantEmail={applicantEmail}
    />
  );
}
