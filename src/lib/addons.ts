// Paid add-on catalog — the SINGLE SOURCE OF TRUTH for what an add-on costs.
//
// ⚠️ SERVER ONLY, deliberately. The price a buyer is charged must be decided
// here on the server and never taken from the browser. The employer dashboard
// (a Server Component) reads this catalog and passes it down to the client for
// DISPLAY only; the charge amount is recomputed here when the PayPal order is
// created. A tampered client therefore cannot change the price.
//
// ---------------------------------------------------------------------------
// PRICING IS NOT HARDCODED — it is configuration.
// ---------------------------------------------------------------------------
// The owner has the final say on price (owner decision, 2026-07-02: add-ons sit
// in the $10–20 band). Each price below can be overridden with an environment
// variable, with no code change and no redeploy of new code:
//
//   ADDON_PRICE_FEATURED    default 15   (USD, whole or decimal dollars)
//   ADDON_PRICE_URGENT      default 10
//   ADDON_PRICE_EXTENSION   default 10
//   ADDON_DAYS_FEATURED     default 30   (duration in days)
//   ADDON_DAYS_URGENT       default 30
//   ADDON_DAYS_EXTENSION    default 30
//
// Set them in Vercel → Project Settings → Environment Variables.

import "server-only";

export type AddonId = "featured" | "urgent" | "extension";

export const ADDON_IDS: AddonId[] = ["featured", "urgent", "extension"];

export interface Addon {
  id: AddonId;
  name: string;
  blurb: string;
  priceCents: number;
  days: number;
}

// Parse a dollar amount from an env var into integer CENTS.
// Money is handled in cents everywhere to avoid floating-point drift.
// Falls back to `fallbackDollars` when unset, malformed, or out of a sane range.
function priceCents(envVar: string, fallbackDollars: number): number {
  const raw = process.env[envVar];
  if (raw != null && raw.trim() !== "") {
    const parsed = Number(raw);
    // Guard rails: a typo (e.g. "1500" meaning $15) must not silently charge
    // $1,500. Anything outside $1–$500 is treated as a mistake → use default.
    if (Number.isFinite(parsed) && parsed >= 1 && parsed <= 500) {
      return Math.round(parsed * 100);
    }
    console.warn(
      `[addons] ${envVar}="${raw}" is not a sane USD price (expected 1–500). Using default $${fallbackDollars}.`,
    );
  }
  return Math.round(fallbackDollars * 100);
}

function days(envVar: string, fallbackDays: number): number {
  const raw = process.env[envVar];
  if (raw != null && raw.trim() !== "") {
    const parsed = Number(raw);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 365) return parsed;
    console.warn(
      `[addons] ${envVar}="${raw}" is not a sane day count (expected 1–365). Using default ${fallbackDays}.`,
    );
  }
  return fallbackDays;
}

// Built fresh per call so an env change is picked up without a rebuild.
export function addonCatalog(): Record<AddonId, Addon> {
  return {
    featured: {
      id: "featured",
      name: "Featured Listing",
      blurb:
        "Pinned to the top of the job list and the homepage, with a highlighted card.",
      priceCents: priceCents("ADDON_PRICE_FEATURED", 15),
      days: days("ADDON_DAYS_FEATURED", 30),
    },
    urgent: {
      id: "urgent",
      name: "Urgent Badge",
      blurb: 'A bright "Urgent Hiring" badge so jobseekers notice you first.',
      priceCents: priceCents("ADDON_PRICE_URGENT", 10),
      days: days("ADDON_DAYS_URGENT", 30),
    },
    extension: {
      id: "extension",
      name: "Listing Extension",
      blurb: "Keep your posting live for another 30 days.",
      priceCents: priceCents("ADDON_PRICE_EXTENSION", 10),
      days: days("ADDON_DAYS_EXTENSION", 30),
    },
  };
}

export function isAddonId(value: unknown): value is AddonId {
  return typeof value === "string" && (ADDON_IDS as string[]).includes(value);
}

// Server-trusted lookup: the ONLY way an amount enters a PayPal order.
// Returns null for an unknown add-on id.
export function addonFor(id: unknown): Addon | null {
  if (!isAddonId(id)) return null;
  return addonCatalog()[id];
}

// Display helper: 1500 → "$15.00"
export function formatCents(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

// PayPal wants a decimal string: 1500 → "15.00"
export function centsToPaypalValue(cents: number): string {
  return (cents / 100).toFixed(2);
}

// Plain, client-safe view of the catalog (no env, no secrets) for passing from
// a Server Component to a Client Component as props.
export interface AddonView {
  id: AddonId;
  name: string;
  blurb: string;
  priceCents: number;
  priceLabel: string;
  days: number;
}

export function addonViews(): AddonView[] {
  const catalog = addonCatalog();
  return ADDON_IDS.map((id) => {
    const a = catalog[id];
    return {
      id: a.id,
      name: a.name,
      blurb: a.blurb,
      priceCents: a.priceCents,
      priceLabel: formatCents(a.priceCents),
      days: a.days,
    };
  });
}
