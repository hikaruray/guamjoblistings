import { setJobStatus } from "@/lib/store";

// Approve or reject a pending job submission.
// NOTE: not yet protected by login — owner authentication is added at launch
// together with Supabase.
export async function POST(request: Request) {
  let body: { id?: string; action?: "approve" | "reject" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { id, action } = body;
  if (!id || (action !== "approve" && action !== "reject")) {
    return Response.json({ error: "Bad parameters." }, { status: 400 });
  }

  try {
    await setJobStatus(id, action === "approve" ? "approved" : "rejected");
  } catch (err) {
    console.error("Failed to update job status:", err);
    return Response.json(
      { error: "Could not update the job. Please try again." },
      { status: 503 },
    );
  }
  return Response.json({ ok: true });
}
