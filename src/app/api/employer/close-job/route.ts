import { getJobById, setJobStatus } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

// Employer closes (marks as filled/ended) or reopens their own posting.
//   close  → status "closed"  (removed from the public listings)
//   reopen → status "pending" (re-reviewed before it goes live again)
export async function POST(request: Request) {
  let body: { id?: string; action?: "close" | "reopen" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || (action !== "close" && action !== "reopen")) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
  }

  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in as an employer." },
        { status: 401 },
      );
    }
    const job = await getJobById(id);
    if (!job) {
      return Response.json({ error: "Job not found." }, { status: 404 });
    }
    if (job.userId !== user.id) {
      return Response.json(
        { error: "You can only manage your own postings." },
        { status: 403 },
      );
    }
  }

  try {
    await setJobStatus(id, action === "close" ? "closed" : "pending");
  } catch (err) {
    console.error("Failed to change job status:", err);
    return Response.json(
      { error: "Could not update your job. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
