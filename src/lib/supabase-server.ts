// Server-side Supabase client bound to the request's auth cookies.
//
// Used in Server Components, Route Handlers, and the auth callback to READ the
// logged-in user's session (set by the browser client after sign-in). This uses
// the PUBLIC anon key + the user's cookies — it is NOT the service-role client
// (that stays in supabase.ts for privileged DB writes).
//
// If the public env vars are unset (local dev), getSessionUser() returns null so
// the app treats every request as logged-out and falls back gracefully.

import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import type { User } from "@supabase/supabase-js";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function isAuthConfigured(): boolean {
  return Boolean(URL && ANON);
}

// Create a request-scoped client. `writable` = true lets the auth callback set
// refreshed session cookies; read-only contexts (Server Components) pass false
// so we never try to write cookies where Next.js forbids it.
export async function createSupabaseServerClient(writable = false) {
  if (!URL || !ANON) return null;

  const cookieStore = await cookies();

  return createServerClient(URL, ANON, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        if (!writable) return;
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a context where cookies can't be set — ignore.
        }
      },
    },
  });
}

// Returns the currently authenticated user, or null if not logged in / not
// configured. Verifies the session against Supabase (not just cookie presence).
export async function getSessionUser(): Promise<User | null> {
  const supabase = await createSupabaseServerClient(false);
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}
