// Settles payments whose real outcome only PayPal knows.
//
// The browser is the only thing that tells capture-order a buyer approved, so
// anything that stops the browser coming back — a closed tab, a dropped
// connection, our own 12s timeout — used to leave the payment in limbo:
//
//   • 'created' rows: the buyer may have approved (and believes they paid)
//     while we never captured, or simply walked away. Nobody could tell which.
//   • "Outcome unknown" rows: the capture call threw, so the money may or may
//     not have moved. A human had to open PayPal for every one.
//
// This asks PayPal about each such row and does the one safe thing:
//
//   capture COMPLETED, amount as recorded  → settle + grant (atomic)
//   order APPROVED, posting still live     → capture now, then as above
//   PayPal shows no money moved            → close the row / lift the block
//   anything odd (wrong amount, PENDING,
//   refunded, a capture we cannot read)    → leave for a human, flagged
//
// It never refunds and never grants without a COMPLETED capture for exactly
// the recorded amount — the same gate capture-order uses.

import "server-only";
import { Resend } from "resend";
import { FROM_EMAIL, SITE_URL } from "./config";
import {
  captureOrder,
  getOrder,
  isPaypalConfigured,
  PaypalApiError,
  readCapture,
  type CaptureResult,
} from "./paypal";
import {
  getJobById,
  markPaymentFailed,
  markPaymentPaidAndGrant,
  resolvePayment,
  RESOLVED_NOTE_PREFIX,
  UNRESOLVED_NOTE_PREFIX,
  type StoredPayment,
} from "./store";

// A checkout younger than this may still be open in the buyer's browser.
// Capturing it from here would race their own Pay Now click.
const IN_PROGRESS_MINUTES = 10;

// A buyer who has not approved within a day is not coming back.
const ABANDON_UNAPPROVED_HOURS = 24;

// An approved order we will not capture (its posting is no longer live) is
// left alone this long before we close it out; PayPal lets it lapse unpaid.
const ABANDON_APPROVED_HOURS = 72;

export type ReconcileAction =
  | "granted" //   money confirmed at PayPal, add-on switched on
  | "closed" //    PayPal shows no money moved; row closed / block lifted
  | "flagged" //   needs a human — see detail
  | "waiting" //   nothing to do yet
  | "error"; //    could not reach a conclusion this time; will retry

export interface ReconcileResult {
  orderId: string;
  action: ReconcileAction;
  detail: string;
}

const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3_600_000;

function isLive(job: Awaited<ReturnType<typeof getJobById>>): boolean {
  return (
    job != null &&
    job.status === "approved" &&
    (job.expiresAt == null || new Date(job.expiresAt).getTime() > Date.now())
  );
}

export async function reconcilePayment(
  p: StoredPayment,
  opts: { force?: boolean } = {},
): Promise<ReconcileResult> {
  const orderId = p.paypalOrderId;
  const result = (action: ReconcileAction, detail: string): ReconcileResult => ({
    orderId,
    action,
    detail,
  });

  const unresolved =
    p.status === "failed" && (p.errorNote ?? "").startsWith(UNRESOLVED_NOTE_PREFIX);
  if (p.status !== "created" && !unresolved) {
    return result("waiting", `Nothing to reconcile (status ${p.status}).`);
  }
  if (!isPaypalConfigured()) return result("error", "PayPal is not configured.");
  if (!opts.force && !unresolved && hoursSince(p.createdAt) * 60 < IN_PROGRESS_MINUTES) {
    return result("waiting", "Checkout may still be in progress.");
  }

  // Close out a row where PayPal shows no money moved.
  const closeNoMoney = async (why: string): Promise<ReconcileResult> => {
    if (unresolved) {
      await resolvePayment(orderId, `PayPal checked automatically — ${why}`);
    } else {
      await markPaymentFailed(orderId, `Abandoned: ${why}`);
    }
    return result("closed", why);
  };

  // Something a human must look at. A 'created' row is moved to "Outcome
  // unknown" so it shows on /admin and blocks a second purchase meanwhile.
  const flag = async (why: string): Promise<ReconcileResult> => {
    if (!unresolved) await markPaymentFailed(orderId, `${UNRESOLVED_NOTE_PREFIX}: ${why}`);
    return result("flagged", why);
  };

  let order;
  try {
    order = await getOrder(orderId);
  } catch (err) {
    if (err instanceof PaypalApiError && err.status === 404) {
      return closeNoMoney("PayPal has no record of this order (it expired unpaid).");
    }
    return result("error", `Could not read the order from PayPal: ${String(err)}`);
  }

  let capture: CaptureResult | null = readCapture(order);

  // Approved but never captured: the buyer pressed Pay Now and their browser
  // never told us. Finish what they started — if the posting can still use it.
  if (!capture && order.status === "APPROVED") {
    const job = await getJobById(p.jobId).catch(() => null);
    if (!isLive(job)) {
      return hoursSince(p.createdAt) >= ABANDON_APPROVED_HOURS
        ? closeNoMoney("Approved, but the posting is no longer live, so it was not charged.")
        : result("waiting", "Approved, but the posting is not live — not capturing.");
    }
    try {
      capture = await captureOrder(orderId);
    } catch (err) {
      // A 4xx is PayPal refusing (expired, declined): no money moved. Anything
      // else — a timeout above all — may have captured, so it goes to a human.
      if (err instanceof PaypalApiError && err.status >= 400 && err.status < 500) {
        return closeNoMoney(`PayPal refused the capture (${err.issues.join(", ") || err.status}).`);
      }
      return flag(`capture attempted by the reconciler, outcome unknown — ${String(err)}`);
    }
  }

  if (!capture) {
    if (order.status === "VOIDED") return closeNoMoney("PayPal voided the order.");
    if (order.status === "COMPLETED") {
      return flag("PayPal says COMPLETED but returned no capture to check.");
    }
    if (unresolved) {
      return closeNoMoney(`PayPal shows the order was never captured (${order.status}); the buyer was not charged.`);
    }
    return hoursSince(p.createdAt) >= ABANDON_UNAPPROVED_HOURS
      ? closeNoMoney(`The buyer never approved the payment (${order.status}).`)
      : result("waiting", `Buyer has not approved yet (${order.status}).`);
  }

  if (capture.status === "PENDING") {
    return unresolved
      ? result("waiting", "Capture is still PENDING at PayPal.")
      : flag("PayPal returned PENDING — may settle later");
  }
  if (capture.status === "DECLINED" || capture.status === "FAILED") {
    return closeNoMoney(`PayPal shows the capture ${capture.status}.`);
  }
  if (capture.status !== "COMPLETED") {
    // REFUNDED / PARTIALLY_REFUNDED: money moved and (some) came back.
    return flag(`capture is ${capture.status} at PayPal`);
  }

  const expected = (p.amountCents / 100).toFixed(2);
  if (capture.amountValue !== expected || (capture.currency ?? "USD") !== "USD") {
    return flag(`charged ${capture.amountValue} ${capture.currency}, expected ${expected} USD`);
  }

  const note = unresolved
    ? `${RESOLVED_NOTE_PREFIX} PayPal confirmed capture ${capture.captureId}; settled automatically | was: ${p.errorNote}`
    : `Settled by reconciliation: the buyer paid but did not return from PayPal (capture ${capture.captureId}).`;
  const settled = await markPaymentPaidAndGrant(orderId, {
    captureId: capture.captureId,
    payerEmail: capture.payerEmail,
    allowUnresolved: unresolved,
    note,
  });
  if (!settled.granted) {
    return settled.alreadyPaid
      ? result("waiting", "Already settled.")
      : result("error", "PayPal confirmed the capture but the payment could not be settled.");
  }

  await tellBuyer(p).catch((err) =>
    console.error(`[reconcile] could not email the buyer for ${orderId}:`, err),
  );
  return result("granted", `PayPal confirmed ${expected} USD (capture ${capture.captureId}); add-on switched on.`);
}

// The buyer saw an error, or nothing at all, after paying. Tell them it worked.
async function tellBuyer(p: StoredPayment): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return;
  const job = await getJobById(p.jobId);
  if (!job?.email) return;
  const name = p.addon === "featured" ? "Featured Listing" : p.addon === "urgent" ? "Urgent Badge" : p.addon;
  const { error } = await new Resend(apiKey).emails.send({
    from: FROM_EMAIL,
    to: job.email,
    subject: `Your ${name} for "${job.title}" is now active`,
    text: [
      `Hi,`,
      ``,
      `Your PayPal payment for the ${name} on "${job.title}" has been confirmed and the add-on is now active for ${p.days} days.`,
      ``,
      `The checkout did not finish on our side when you paid, so you may have seen an error or nothing at all. You were charged once, and you do not need to do anything.`,
      ``,
      `Your dashboard: ${SITE_URL}/employer/dashboard`,
      ``,
      `— Guam Job Listings`,
    ].join("\n"),
  });
  if (error) throw new Error(error.message);
}
