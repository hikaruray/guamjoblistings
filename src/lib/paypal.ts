// Server-only PayPal Orders API v2 client.
//
// ---------------------------------------------------------------------------
// WHY IMMEDIATE CAPTURE (intent=CAPTURE), unlike MokaruGuam
// ---------------------------------------------------------------------------
// Mokaru uses authorize → capture because a tour booking is a REQUEST: the
// owner must check availability before charging, so the money is only held.
// A job add-on has no such gate — paying IS the purchase, and the add-on is
// granted the instant the money lands. There is nothing to approve afterwards.
//
// Immediate capture also side-steps the pitfall Mokaru hit: a PayPal
// authorization's guarantee lapses after ~3 days, so a hold left sitting can
// silently become uncapturable. With intent=CAPTURE the money is settled in the
// same round-trip and that failure mode cannot occur.
//
// ---------------------------------------------------------------------------
// STANDARD CHECKOUT ONLY
// ---------------------------------------------------------------------------
// This account is NOT approved for Advanced Card Payments (ACDC) — PayPal
// returned DENIED (processor PPCE) for merchant KSCHVM9TQ69P2. Do not attempt
// on-page card fields. The standard PayPal Checkout buttons (PayPal balance +
// Pay Later + PayPal-hosted guest card) work today and are what we ship.
//
// Secrets: PAYPAL_CLIENT_SECRET is used ONLY here (server side). The public
// client id (NEXT_PUBLIC_PAYPAL_CLIENT_ID) is the only value the browser sees.
//
// Base URL switches on PAYPAL_ENV: "live" → api-m.paypal.com, else sandbox.
// When PayPal env vars are unset, isPaypalConfigured() returns false and the
// add-on UI hides itself, so local dev and the build work with no account.

import "server-only";

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;
const ENV = process.env.PAYPAL_ENV ?? "sandbox";

export function isPaypalConfigured(): boolean {
  return Boolean(CLIENT_ID && CLIENT_SECRET);
}

export function isLiveMode(): boolean {
  return ENV === "live";
}

function baseUrl(): string {
  return ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

// fetch with a timeout + small retry. Order-mutating calls pass retries=0 so a
// network hiccup can never double-charge.
async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  { timeoutMs = 12000, retries = 1 }: { timeoutMs?: number; retries?: number } = {},
): Promise<Response> {
  let lastErr: unknown;
  for (let attempt = 0; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } catch (err) {
      lastErr = err;
    } finally {
      clearTimeout(timer);
    }
  }
  throw new Error(
    `PayPal request failed after ${retries + 1} attempt(s): ${String(lastErr)}`,
  );
}

// Cache the OAuth token until shortly before it expires.
let tokenCache: { token: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (!isPaypalConfigured()) {
    throw new Error("PayPal is not configured (missing client id/secret).");
  }
  if (tokenCache && Date.now() < tokenCache.expiresAt) return tokenCache.token;

  const auth = Buffer.from(`${CLIENT_ID}:${CLIENT_SECRET}`).toString("base64");
  const res = await fetchWithTimeout(
    `${baseUrl()}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: "grant_type=client_credentials",
    },
    { retries: 2 },
  );

  if (!res.ok) {
    throw new Error(`PayPal token error ${res.status}: ${await res.text()}`);
  }
  const data = (await res.json()) as { access_token: string; expires_in: number };
  tokenCache = {
    token: data.access_token,
    expiresAt: Date.now() + (data.expires_in - 60) * 1000, // refresh 60s early
  };
  return tokenCache.token;
}

// Error carrying the PayPal HTTP status and issue names, so callers can treat
// "already in target state" outcomes as success.
export class PaypalApiError extends Error {
  status: number;
  issues: string[];
  constructor(message: string, status: number, issues: string[]) {
    super(message);
    this.name = "PaypalApiError";
    this.status = status;
    this.issues = issues;
  }
  hasIssue(...names: string[]): boolean {
    return this.issues.some((i) => names.includes(i));
  }
}

function extractIssues(text: string): string[] {
  try {
    const body = JSON.parse(text) as {
      name?: string;
      details?: { issue?: string }[];
    };
    const issues = (body.details ?? [])
      .map((d) => d.issue)
      .filter((x): x is string => Boolean(x));
    if (body.name) issues.push(body.name);
    return issues;
  } catch {
    return [];
  }
}

async function api<T>(
  path: string,
  method: "POST" | "GET",
  body?: unknown,
  retries = 0,
): Promise<T> {
  const token = await getAccessToken();
  const res = await fetchWithTimeout(
    `${baseUrl()}${path}`,
    {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: body ? JSON.stringify(body) : undefined,
    },
    { retries },
  );
  const text = await res.text();
  if (!res.ok) {
    throw new PaypalApiError(
      `PayPal ${method} ${path} → ${res.status}: ${text}`,
      res.status,
      extractIssues(text),
    );
  }
  return (text ? JSON.parse(text) : {}) as T;
}

// --- Orders ---------------------------------------------------------------

export interface PaypalOrder {
  id: string;
  status: string;
}

// intent=CAPTURE: the buyer's approval settles the money immediately.
// `value` is a decimal string computed on the server from the add-on catalog.
export async function createCaptureOrder(
  value: string,
  opts: { referenceId: string; description: string; customId?: string },
): Promise<PaypalOrder> {
  return api<PaypalOrder>("/v2/checkout/orders", "POST", {
    intent: "CAPTURE",
    purchase_units: [
      {
        reference_id: opts.referenceId,
        description: opts.description.slice(0, 127), // PayPal max length
        custom_id: opts.customId,
        amount: { currency_code: "USD", value },
      },
    ],
    application_context: {
      brand_name: "Guam Job Listings",
      user_action: "PAY_NOW", // button reads "Pay Now", not "Continue"
      shipping_preference: "NO_SHIPPING", // digital add-on — no address needed
    },
  });
}

export interface CaptureResult {
  captureId: string;
  status: string; // COMPLETED when the money actually moved
  amountValue: string | null; // what PayPal ACTUALLY charged
  currency: string | null;
  payerEmail: string | null;
  alreadyDone: boolean;
}

function readCapture(data: {
  status?: string;
  payer?: { email_address?: string };
  purchase_units?: {
    payments?: {
      captures?: {
        id: string;
        status: string;
        amount?: { value?: string; currency_code?: string };
      }[];
    };
  }[];
}): CaptureResult | null {
  const capture = data.purchase_units?.[0]?.payments?.captures?.[0];
  if (!capture?.id) return null;
  return {
    captureId: capture.id,
    status: capture.status,
    amountValue: capture.amount?.value ?? null,
    currency: capture.amount?.currency_code ?? null,
    payerEmail: data.payer?.email_address ?? null,
    alreadyDone: false,
  };
}

// Capture an APPROVED order. Mutating → no retry.
//
// IDEMPOTENT: if PayPal reports the order was already captured, we read the
// order back and return the existing capture as success, so a retry reconciles
// our DB instead of erroring (and never charges twice).
export async function captureOrder(orderId: string): Promise<CaptureResult> {
  try {
    const data = await api<Parameters<typeof readCapture>[0]>(
      `/v2/checkout/orders/${orderId}/capture`,
      "POST",
      {},
      0,
    );
    const result = readCapture(data);
    if (!result) throw new Error("PayPal capture: no capture id returned.");
    return result;
  } catch (err) {
    if (
      err instanceof PaypalApiError &&
      err.hasIssue("ORDER_ALREADY_CAPTURED")
    ) {
      const existing = await getOrder(orderId);
      const result = readCapture(existing);
      if (result) return { ...result, alreadyDone: true };
    }
    throw err;
  }
}

// Read an order back (status / amount verification).
export async function getOrder(
  orderId: string,
): Promise<Parameters<typeof readCapture>[0] & { id?: string }> {
  return api(`/v2/checkout/orders/${orderId}`, "GET", undefined, 2);
}
