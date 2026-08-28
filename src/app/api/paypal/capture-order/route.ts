import { captureOrder, isPaypalConfigured } from "@/lib/paypal";
import {
  getPaymentByOrderId,
  markPaymentFailed,
  markPaymentPaidAndGrant,
} from "@/lib/store";
import { getSessionUser, isAuthConfigured } from "@/lib/supabase-server";

// Captures an approved PayPal order and grants the add-on.
//
// This is THE ONLY place in the codebase that grants a paid add-on, and it does
// so only when every one of these holds:
//
//   • a logged-in employer owns the payment row, AND
//   • PayPal reports the capture status is exactly "COMPLETED", AND
//   • the captured amount matches the amount we recorded at order time, AND
//   • the payment row is still 'created' (compare-and-set in the store).
//
// Anything else → the add-on is not granted. An abandoned or declined checkout
// leaves the row as 'created'/'failed' and the job untouched. (MokaruGuam once
// shipped the inverse bug — saving a booking as held after a DENIED
// authorization — which is why the grant is gated on the capture result rather
// than on the browser telling us it went fine.)
export async function POST(request: Request) {
  if (!isPaypalConfigured()) {
    return Response.json(
      { error: "Online payment is not available right now." },
      { status: 503 },
    );
  }
  if (!isAuthConfigured()) {
    return Response.json(
      { error: "Payments are unavailable: sign-in is not configured." },
      { status: 503 },
    );
  }

  const user = await getSessionUser();
  if (!user) {
    return Response.json({ error: "Please sign in." }, { status: 401 });
  }

  let body: { orderId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderId = body.orderId;
  if (!orderId) {
    return Response.json({ error: "Missing order." }, { status: 400 });
  }

  // The payment row is our own record of what this order is FOR and what it
  // should cost. We trust it, not the client, for the rest of this handler.
  const payment = await getPaymentByOrderId(orderId);
  if (!payment) {
    return Response.json({ error: "Unknown order." }, { status: 404 });
  }
  if (payment.userId !== user.id) {
    return Response.json({ error: "Not your order." }, { status: 403 });
  }

  // Already settled by an earlier call (double-click, retry, back button).
  // Report success WITHOUT granting again.
  if (payment.status === "paid") {
    return Response.json({ ok: true, alreadyDone: true });
  }

  let capture;
  try {
    capture = await captureOrder(orderId);
  } catch (err) {
    // Declined / abandoned / PayPal error → record it and grant NOTHING.
    console.error("PayPal capture failed:", err);
    await markPaymentFailed(orderId, String(err));
    return Response.json(
      { error: "Payment was not completed. You have not been charged." },
      { status: 402 },
    );
  }

  // Only "COMPLETED" means the money actually moved. PENDING/DECLINED must not
  // grant the add-on.
  if (capture.status !== "COMPLETED") {
    await markPaymentFailed(orderId, `Capture status: ${capture.status}`);
    return Response.json(
      {
        error: `Payment did not complete (status: ${capture.status}). The add-on was not applied.`,
      },
      { status: 402 },
    );
  }

  // Defence in depth: confirm PayPal charged what we recorded. A mismatch means
  // something is wrong that we do not understand — refuse to grant and flag it
  // for the owner rather than guessing.
  const expected = (payment.amountCents / 100).toFixed(2);
  if (capture.amountValue !== expected || (capture.currency ?? "USD") !== "USD") {
    const note = `Amount mismatch: charged ${capture.amountValue} ${capture.currency}, expected ${expected} USD`;
    console.error(`[payments] ${note} (order ${orderId})`);
    await markPaymentFailed(orderId, note);
    return Response.json(
      {
        error:
          "We could not verify the payment amount. Please contact us — your add-on was not applied.",
      },
      { status: 409 },
    );
  }

  try {
    const result = await markPaymentPaidAndGrant(orderId, {
      captureId: capture.captureId,
      payerEmail: capture.payerEmail,
    });
    return Response.json({
      ok: true,
      alreadyDone: !result.granted,
      addon: payment.addon,
      days: payment.days,
    });
  } catch (err) {
    // Money HAS been taken but we failed to record/grant. Never silently
    // swallow this: it needs the owner's attention.
    console.error(
      `[payments] CAPTURED BUT NOT GRANTED — order ${orderId}, capture ${capture.captureId}:`,
      err,
    );
    return Response.json(
      {
        error:
          "Your payment went through but we could not apply the add-on automatically. Please contact us and we will sort it out.",
      },
      { status: 500 },
    );
  }
}
