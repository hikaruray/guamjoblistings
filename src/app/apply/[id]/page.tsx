import { notFound } from "next/navigation";
import { getPublicJob } from "@/lib/public-jobs";
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

  return <ApplyForm jobId={job.id} jobTitle={job.title} company={job.company} />;
}
