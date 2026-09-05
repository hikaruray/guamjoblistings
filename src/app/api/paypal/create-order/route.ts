import { addonFor, centsToPaypalValue } from "@/lib/addons";
import { createCaptureOrder, isPaypalConfigured } from "@/lib/paypal";
import {
  createPayment,
  getJobById,
  unresolvedPaymentsFor,
} from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

// See the note in capture-order: give the request more room than the 12s the
// PayPal client allows itself, so we always reach our own bookkeeping.
export const maxDuration = 30;

// Opens a PayPal order (intent=CAPTURE) for one add-on on one job.
//
// SECURITY — the three holes this route is written to close:
//
//  1. PRICE TAMPERING. The amount is looked up HERE from the server-only add-on
//     catalog using just the add-on id. The client sends no amount, and if it
//     did we would ignore it. There is no code path where a browser value
//     reaches PayPal.
//
//  2. CHARGING SOMEONE ELSE'S JOB. We require a logged-in employer and verify
//     job.userId === user.id. Without this, anyone could buy (or, worse, be
//     billed for) a stranger's posting. Auth is REQUIRED — unlike close-job,
//     there is deliberately no "auth not configured" bypass, because a bypass
//     on a money path is a hole rather than a convenience.
//
//  3. PREMATURE GRANTING. This route only RECORDS intent (payments.status =
//     'created'). It never touches the job's add-on columns. The add-on is
//     granted only by capture-order, and only on a COMPLETED capture.
export async function POST(request: Request) {
  if (!isPaypalConfigured()) {
    return Response.json(
      { error: "Online payment is not available right now." },
      { status: 503 },
    );
  }

  // Money path: a verified employer session is mandatory, no fallback.
  if (!isAuthConfigured()) {
    return Response.json(
      { error: "Payments are unavailable: sign-in is not configured." },
      { status: 503 },
    );
  }
  const user = await getSessionUser();
  if (!user) {
    return Response.json(
      { error: "Please sign in as an employer to buy an add-on." },
      { status: 401 },
    );
  }

  let body: { jobId?: string; addon?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  // The add-on id is the ONLY pricing input we accept from the client.
  const addon = addonFor(body.addon);
  if (!addon) {
    return Response.json({ error: "Unknown add-on." }, { status: 400 });
  }

  const jobId = body.jobId;
  if (!jobId) {
    return Response.json({ error: "Missing job." }, { status: 400 });
  }

  const job = await getJobById(jobId);
  if (!job) {
    return Response.json({ error: "Job not found." }, { status: 404 });
  }
  if (job.userId !== user.id) {
    return Response.json(
      { error: "You can only promote your own postings." },
      { status: 403 },
    );
  }
  // Only a live listing can be promoted. Paying to feature a posting that is
  // still in review (or was rejected/closed) would buy the employer nothing.
  if (job.status !== "approved") {
    return Response.json(
      {
        error:
          "This posting is not live yet. You can promote it once it has been approved.",
      },
      { status: 409 },
    );
  }
  // ...and "approved" is not the same as "on the board". An approved posting
  // past its window is not shown to anyone, so featuring it buys nothing at
  // all. The dashboard's comment claimed it mirrored a server check for this;
  // the server had no such check, so the claim was describing a defence that
  // did not exist.
  if (job.expiresAt != null && new Date(job.expiresAt).getTime() <= Date.now()) {
    return Response.json(
      {
        error:
          "This posting has expired and is not being shown. Renew it (free) and then promote it.",
      },
      { status: 409 },
    );
  }

  // Refuse to sell the same thing twice while an earlier attempt is unresolved.
  //
  // When a capture times out we cannot tell whether the money moved, so we ask
  // the buyer not to pay again — and asking was the entire defence. Pressing
  // Buy again opened a brand new order and charged them a second time, which is
  // exactly the outcome that warning exists to prevent.
  try {
    const unresolved = await unresolvedPaymentsFor(job.id, addon.id);
    if (unresolved.length > 0) {
      return Response.json(
        {
          error:
            "An earlier payment for this add-on has not been resolved yet — it may already have gone through. Please contact us before paying again rather than risking a double charge.",
        },
        { status: 409 },
      );
    }
  } catch (err) {
    // A failure to check must not open a checkout we cannot reason about.
    console.error("[payments] could not check unresolved payments:", err);
    return Response.json(
      { error: "We could not start checkout just now. Please try again." },
      { status: 503 },
    );
  }

  const value = centsToPaypalValue(addon.priceCents);

  try {
    const order = await createCaptureOrder(value, {
      referenceId: `gjl-${addon.id}-${job.id}`.slice(0, 127),
      description: `${addon.name} (${addon.days} days) — ${job.title}`,
      customId: job.id,
    });

    // Record our intent + the server-decided amount BEFORE the buyer approves.
    // If this insert fails we must not send the buyer to PayPal, or we could
    // take money we have no record of.
    await createPayment({
      jobId: job.id,
      userId: user.id,
      addon: addon.id,
      amountCents: addon.priceCents,
      currency: "USD",
      days: addon.days,
      paypalOrderId: order.id,
    });

    return Response.json({
      id: order.id,
      // Display only — the browser never decides this.
      amountCents: addon.priceCents,
      addonName: addon.name,
      days: addon.days,
    });
  } catch (err) {
    console.error("PayPal create-order failed:", err);
    return Response.json(
      { error: "Could not start checkout. Please try again shortly." },
      { status: 502 },
    );
  }
}
