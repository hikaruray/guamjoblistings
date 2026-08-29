import { getJobById, renewJobListing, setJobStatus } from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

type Action = "close" | "reopen" | "renew";
const ACTIONS: Action[] = ["close", "reopen", "renew"];

// Employer manages their own posting.
//   close  → status "closed"  (removed from the public listings)
//   reopen → status "pending" (re-reviewed before it goes live again)
//   renew  → another LISTING_DAYS on the board, free
//
// Renewal is deliberately free and deliberately here rather than in the paid
// add-ons: charging to stay visible is what the retired "extension" add-on did,
// and it turned the paid options into a tax on being listed at all.
export async function POST(request: Request) {
  let body: { id?: string; action?: Action };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || !action || !ACTIONS.includes(action)) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
  }

  let job = null;
  if (isAuthConfigured()) {
    const user = await getSessionUser();
    if (!user) {
      return Response.json(
        { error: "Please sign in as an employer." },
        { status: 401 },
      );
    }
    job = await getJobById(id);
    if (!job) {
      return Response.json({ error: "Job not found." }, { status: 404 });
    }
    if (job.userId !== user.id) {
      return Response.json(
        { error: "You can only manage your own postings." },
        { status: 403 },
      );
    }
    // Only a live listing has a window to extend. Renewing a closed or rejected
    // posting would quietly put it back on the board without review.
    if (action === "renew" && job.status !== "approved") {
      return Response.json(
        { error: "Only a live posting can be renewed." },
        { status: 409 },
      );
    }
  }

  try {
    if (action === "renew") {
      const expiresAt = await renewJobListing(id);
      return Response.json({ ok: true, expiresAt });
    }
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
