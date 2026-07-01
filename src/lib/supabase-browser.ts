// Browser-side Supabase client (uses the PUBLIC anon key).
//
// Safe to expose to the browser: the anon key only allows what Row Level
// Security policies permit. Used for auth actions initiated in the browser
// (magic link, employer email/password sign-up & sign-in).
//
// Configuration (public env vars, set in Vercel):
//   NEXT_PUBLIC_SUPABASE_URL       — your project URL
//   NEXT_PUBLIC_SUPABASE_ANON_KEY  — the anon/public key (safe to expose)
//
// If these are unset (local dev without Supabase), isSupabaseConfigured() is
// false and the auth UI shows a friendly "not configured yet" message instead
// of crashing.

"use client";

import { createBrowserClient } from "@supabase/ssr";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isSupabaseConfigured(): boolean {
  return Boolean(URL && ANON);
}

export function createSupabaseBrowserClient() {
  if (!URL || !ANON) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    );
  }
  return createBrowserClient(URL, ANON);
}
