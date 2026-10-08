// Whether the site is selling paid add-ons right now.
//
// Three things must all hold, and every place that sells — the buy buttons on
// the employer dashboard, create-order, the renewal email's promo — asks this
// one function, so they cannot disagree:
//
//   1. the server PayPal keys are set            (isPaypalConfigured)
//   2. the public client id was built into the page (PAYPAL_ENABLED)
//   3. the owner has switched sales ON in /admin (site_settings)
//
// Before this, create-order looked only at (1). Setting the server keys without
// a redeploy left the API taking orders while the page showed no button, and
// the only way to stop selling was to delete the keys and redeploy.
//
// The switch defaults to OFF and fails closed: a missing row, a missing table
// (migration not run yet) or a database error all mean "not selling". Putting
// the keys in therefore never starts sales by itself — the owner checks the
// setup first and then opens sales on purpose.
//
// Capturing an order the buyer has already approved is deliberately NOT gated
// by this: pausing sales must not strand someone halfway through paying.

import "server-only";
import { PAYPAL_ENABLED } from "./config";
import { isPaypalConfigured } from "./paypal";
import { getSetting, setSetting } from "./store";

const KEY = "payments_open";

export interface PaymentsState {
  keysConfigured: boolean; // (1) and (2)
  switchedOn: boolean; // (3)
  open: boolean; // all three
  switchError: string | null; // why (3) could not be read, if it could not
}

export async function paymentsState(): Promise<PaymentsState> {
  const keysConfigured = isPaypalConfigured() && PAYPAL_ENABLED;
  let switchedOn = false;
  let switchError: string | null = null;
  try {
    switchedOn = (await getSetting(KEY)) === "true";
  } catch (err) {
    switchError = err instanceof Error ? err.message : String(err);
    console.error("[payments] could not read the sales switch:", switchError);
  }
  return {
    keysConfigured,
    switchedOn,
    open: keysConfigured && switchedOn,
    switchError,
  };
}

export async function paymentsOpen(): Promise<boolean> {
  return (await paymentsState()).open;
}

export async function setPaymentsOpen(open: boolean): Promise<void> {
  await setSetting(KEY, open ? "true" : "false");
}
