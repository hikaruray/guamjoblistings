// Lets the reviewer close out a payment whose outcome we could not determine.
//
// Authentication is handled in proxy.ts, whose matcher covers /api/admin/*.
//
// Why this route exists: capture-order marks an order "unresolved" when the
// money may have moved without us knowing (a timeout, a PENDING capture, an
// amount we did not expect). That marker blocks a second checkout for the same
// job and add-on, which is what stops a double charge — but nothing in the app
// could ever clear it. The employer was told to contact us, and whoever they
// contacted had no button either; the only way out was editing the database by
// hand, which was written down nowhere. A block with no release is a trap.
//
// This deliberately does NOT grant the add-on and does NOT change the payment's
// status, so revenue figures cannot be moved from here. It only records what a
// human found in PayPal and lifts the block.

import { resolvePayment } from "@/lib/store";

export async function POST(request: Request) {
  let body: { orderId?: string; resolution?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { orderId, resolution } = body;
  if (!orderId || !resolution?.trim()) {
    return Response.json(
      { error: "Say what you found in PayPal — it is the only record of it." },
      { status: 400 },
    );
  }

  try {
    await resolvePayment(orderId, resolution.trim());
  } catch (err) {
    console.error("Failed to resolve payment:", err);
    return Response.json(
      { error: "Could not update the payment. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
