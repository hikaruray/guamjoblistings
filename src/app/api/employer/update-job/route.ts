import { getJobById, updateJob } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

// Update a job the signed-in employer owns. Edits go back to review (pending),
// so changed content is re-checked before it's public again.
export async function POST(request: Request) {
  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, title, company, location, category, jobType, salary, email, description } =
    body;

  if (!id || !title || !company || !location || !email || !description) {
    return Response.json(
      { error: "Please fill in all required fields." },
      { status: 400 },
    );
  }

  // Verify the signed-in employer owns this posting before allowing an edit.
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
        { error: "You can only edit your own postings." },
        { status: 403 },
      );
    }
  }

  try {
    await updateJob(id, {
      title,
      company,
      location,
      category,
      jobType,
      salary,
      email,
      description,
    });
  } catch (err) {
    console.error("Failed to update job:", err);
    return Response.json(
      { error: "Could not update your job. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
