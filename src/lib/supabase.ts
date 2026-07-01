// Server-only Supabase client.
//
// Uses the SERVICE ROLE key, which bypasses Row Level Security. This key is a
// full-access secret and must NEVER reach the browser — this file imports
// "server-only" so any accidental client import fails the build.
//
// Configuration is via environment variables (set in Vercel at launch):
//   SUPABASE_URL               — your project URL (Project Settings → API)
//   SUPABASE_SERVICE_ROLE_KEY  — the service_role secret key (same page)
//
// When these are NOT set (e.g. local `npm run dev`), getSupabase() returns null
// and the storage layer falls back to the local JSON file. This keeps local
// development working exactly as before with no external account required.

import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null | undefined;

export function getSupabase(): SupabaseClient | null {
  if (cached !== undefined) return cached;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    cached = null; // not configured → caller falls back to local JSON
    return cached;
  }

  cached = createClient(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
