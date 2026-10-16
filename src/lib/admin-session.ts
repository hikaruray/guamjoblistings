// Owner login for /admin and /api/admin/* — a signed cookie instead of HTTP
// Basic Auth.
//
// Why not Basic Auth any more (2026-10-16): the browser caches Basic
// credentials for the whole session and offers no way to drop them, so the
// Admin screen — which shows applicants' names, phones and emails — had no
// "Log out". On a shared or borrowed computer the only exit was closing every
// browser window. A cookie can be cleared.
//
// The cookie is `<expiry ms>.<HMAC-SHA256(expiry)>`, keyed by ADMIN_PASSWORD.
// Nothing else is stored anywhere, so:
//   • no new environment variable is needed;
//   • changing ADMIN_PASSWORD in Vercel logs every browser out at once;
//   • a forged or expired cookie simply fails verification.
//
// Used by proxy.ts (every request) and again inside each admin page and route,
// because Next.js warns that a matcher change can silently drop proxy
// coverage — the check must not live in one place only.
//
// Web Crypto only (no node:crypto) so the same code runs in the proxy and in
// route handlers.

export const ADMIN_COOKIE = "gjl_admin";
export const ADMIN_SESSION_DAYS = 7;
const SESSION_MS = ADMIN_SESSION_DAYS * 86_400_000;
// Domain-separates the signing key from any other use of the password.
const KEY_LABEL = "guamjoblistings-admin-session-v1:";

export function adminPassword(): string | null {
  return process.env.ADMIN_PASSWORD || null;
}

// Local `npm run dev` skips the login, as the Basic Auth proxy did.
export function adminAuthDisabled(): boolean {
  return process.env.NODE_ENV === "development";
}

function base64url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function sign(message: string, password: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(KEY_LABEL + password),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(message),
  );
  return base64url(sig);
}

// Constant-time comparison so neither the password nor the signature leaks
// through response timing.
export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

export async function createAdminToken(
  password: string,
  now = Date.now(),
): Promise<string> {
  const expires = String(now + SESSION_MS);
  return `${expires}.${await sign(expires, password)}`;
}

export async function verifyAdminToken(
  token: string | undefined | null,
  password: string,
  now = Date.now(),
): Promise<boolean> {
  if (!token) return false;
  const dot = token.indexOf(".");
  if (dot <= 0) return false;
  const expires = token.slice(0, dot);
  const sig = token.slice(dot + 1);
  if (!/^\d{13}$/.test(expires)) return false;
  const exp = Number(expires);
  // Expired, or further in the future than we ever issue (a cookie from a
  // different signing scheme, or a clock gone wrong) — refuse both.
  if (exp <= now || exp > now + SESSION_MS + 60_000) return false;
  return safeEqual(sig, await sign(expires, password));
}

// For pages and route handlers: is this request from the logged-in owner?
// Reads the cookie through next/headers, so call it only on the server.
export async function isAdmin(): Promise<boolean> {
  if (adminAuthDisabled()) return true;
  const password = adminPassword();
  if (!password) return false; // fail closed, as the proxy does
  const { cookies } = await import("next/headers");
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  return verifyAdminToken(token, password);
}

export function adminUnauthorized(): Response {
  return Response.json({ error: "Please log in again." }, { status: 401 });
}
