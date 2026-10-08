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
// Three actions:
//   check   — ask PayPal now and settle what it can answer (lib/reconcile.ts).
//             The only path here that can grant, and only on a COMPLETED
//             capture for the recorded amount — so a payment PayPal confirms is
//             counted as revenue, rather than being "applied by hand" while its
//             row stayed failed and the money never appeared in the totals.
//   resolve — record what a human found in PayPal and lift the block. Does not
//             grant and does not change the status.
//   reopen  — undo a resolve made by mistake.

import {
  getPaymentByOrderId,
  reopenPayment,
  resolvePayment,
  RESOLVED_NOTE_PREFIX,
} from "@/lib/store";
import { reconcilePayment } from "@/lib/reconcile";

export async function POST(request: Request) {
  let body: { orderId?: string; resolution?: string; action?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { orderId, resolution } = body;
  const action = body.action ?? "resolve";
  if (!orderId) {
    return Response.json({ error: "Missing order." }, { status: 400 });
  }

  try {
    if (action === "check") {
      const payment = await getPaymentByOrderId(orderId);
      if (!payment) return Response.json({ error: "Unknown order." }, { status: 404 });
      const result = await reconcilePayment(payment, { force: true });
      return Response.json({ ok: true, result });
    }

    if (action === "reopen") {
      const payment = await getPaymentByOrderId(orderId);
      if (!payment) return Response.json({ error: "Unknown order." }, { status: 404 });
      if (!(payment.errorNote ?? "").startsWith(RESOLVED_NOTE_PREFIX)) {
        return Response.json({ error: "This payment has no resolution to undo." }, { status: 409 });
      }
      await reopenPayment(orderId);
      return Response.json({ ok: true });
    }

    if (action !== "resolve") {
      return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    if (!resolution?.trim()) {
      return Response.json(
        { error: "Say what you found in PayPal — it is the only record of it." },
        { status: 400 },
      );
    }
    await resolvePayment(orderId, resolution.trim());
  } catch (err) {
    console.error(`Admin payment action "${action}" failed:`, err);
    return Response.json(
      { error: "Could not update the payment. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
