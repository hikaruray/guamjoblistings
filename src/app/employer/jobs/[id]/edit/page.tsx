import { redirect, notFound } from "next/navigation";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";
import { getJobById } from "@/lib/store";
import EditJobForm from "./EditJobForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Edit job",
  robots: { index: false, follow: false },
};

export default async function EditJobPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // Editing requires a signed-in employer who owns this posting.
  if (!isAuthConfigured()) redirect("/employer/dashboard");

  const user = await getSessionUser();
  if (!user) redirect(`/employer/login?next=/employer/jobs/${id}/edit`);

  const job = await getJobById(id);
  if (!job) notFound();
  if (job.userId !== user.id) redirect("/employer/dashboard");

  return <EditJobForm job={job} />;
}
