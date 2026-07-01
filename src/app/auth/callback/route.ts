// Auth callback: Supabase redirects here after a magic link or email
// confirmation is clicked. We exchange the one-time code for a session (setting
// the auth cookies), then send the user to their intended destination.
//
//   /auth/callback?code=...&next=/apply/3   → applicant magic link
//   /auth/callback?code=...&next=/post-a-job → employer email confirmation

import { NextResponse, type NextRequest } from "next/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  // Only allow same-site relative redirects (avoid open-redirect abuse).
  const safeNext = next.startsWith("/") ? next : "/";

  if (code) {
    const supabase = await createSupabaseServerClient(true);
    if (supabase) {
      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (!error) {
        return NextResponse.redirect(`${origin}${safeNext}`);
      }
    }
  }

  return NextResponse.redirect(
    `${origin}/login?error=Could not sign you in. The link may have expired — please try again.`,
  );
}
