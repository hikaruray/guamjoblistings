import { Resend } from "resend";
import { FROM_EMAIL, SITE_URL, OWNER_COPY_EMAIL } from "@/lib/config";
import { isPaypalConfigured } from "@/lib/paypal";
import { paymentsToReconcile } from "@/lib/store";
import { reconcilePayment, type ReconcileResult } from "@/lib/reconcile";

// Twice-daily sweep: ask PayPal about every payment we could not settle at
// checkout time, and settle what PayPal can answer (see lib/reconcile.ts).
//
// Until this existed, the browser returning to capture-order was the ONLY path
// that could finish a purchase. A buyer who approved and then closed the tab
// believed they had paid, and nothing on our side would ever notice.
//
// Runs regardless of the owner's sales switch: pausing sales must not leave
// money that has already moved unaccounted for.
//
// Scheduled by vercel.json (06:00 and 18:00 Guam time). Same bearer-token check
// as the other crons.

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorised(request: Request): boolean {
  const secret = process.env.CRON_SECRET;
  // Refuse rather than run unauthenticated. An unset secret is a
  // misconfiguration, not permission.
  if (!secret) return false;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

export async function GET(request: Request) {
  if (!authorised(request)) {
    return Response.json({ error: "Not authorised." }, { status: 401 });
  }
  if (!isPaypalConfigured()) {
    return Response.json({ ok: true, checked: 0, note: "PayPal not configured." });
  }

  let rows;
  try {
    rows = await paymentsToReconcile();
  } catch (err) {
    console.error("[cron/reconcile-payments] could not load payments:", err);
    return Response.json({ error: "Lookup failed." }, { status: 503 });
  }

  // One at a time: each may capture money, and a burst is not worth the risk.
  const results: ReconcileResult[] = [];
  for (const p of rows) {
    try {
      results.push(await reconcilePayment(p));
    } catch (err) {
      console.error(`[cron/reconcile-payments] order ${p.paypalOrderId}:`, err);
      results.push({ orderId: p.paypalOrderId, action: "error", detail: String(err) });
    }
  }

  // The owner hears about anything that happened or still needs them, and
  // nothing when the sweep had nothing to say.
  const worthTelling = results.filter((r) => r.action !== "waiting");
  let emailed = false;
  const apiKey = process.env.RESEND_API_KEY;
  if (worthTelling.length > 0 && apiKey) {
    const needsYou = worthTelling.filter((r) => r.action === "flagged" || r.action === "error");
    const text = [
      `Payment check: ${worthTelling.length} payment${worthTelling.length === 1 ? "" : "s"} changed or need attention.`,
      needsYou.length > 0
        ? `${needsYou.length} need${needsYou.length === 1 ? "s" : ""} you — open each order in PayPal.`
        : `Nothing needs you; this is for the record.`,
      ``,
      ...worthTelling.map((r) => `[${r.action.toUpperCase()}] order ${r.orderId} — ${r.detail}`),
      ``,
      `Admin: ${SITE_URL}/admin`,
    ].join("\n");
    try {
      const { error } = await new Resend(apiKey).emails.send({
        from: FROM_EMAIL,
        to: OWNER_COPY_EMAIL,
        subject: `${needsYou.length > 0 ? "ACTION NEEDED: " : ""}Payment check — ${worthTelling.length} update${worthTelling.length === 1 ? "" : "s"}`,
        text,
      });
      if (error) throw new Error(error.message);
      emailed = true;
    } catch (err) {
      console.error("[cron/reconcile-payments] owner email failed:", err);
    }
  }

  return Response.json({ ok: true, checked: rows.length, results, emailed });
}
