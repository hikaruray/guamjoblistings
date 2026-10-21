// Stores an employer's profile (contact name / URL / phone).
//
// Two callers:
//   • registration — the user_id comes from the signUp result, and the account
//     is not confirmed yet, so this uses the service-role client to write the
//     row for a user who cannot yet authenticate.
//   • the employer dashboard — an existing employer correcting their details.
//     There we require a live session and ignore any user id in the body, so a
//     signed-in employer can only ever write their own row.
//
// The registration path cannot check who is calling — there is no session yet.
// Until 2026-10-21 it simply trusted the user id in the body and upserted, so
// anyone holding an account's id could rewrite that employer's name, website
// and phone without signing in. Now, without a session, it only CREATES a row:
// for an account that exists, was registered in the last few minutes, and has
// no profile yet. The email comes from the account, not the body.

import { getSessionUser } from "@/lib/supabase-server";
import {
  createEmployerProfileIfAbsent,
  getAuthAccount,
  saveEmployerProfile,
} from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

// The register form posts here straight after signUp returns, so seconds is
// normal. Ten minutes leaves room for a slow network without leaving the
// unauthenticated path open for long.
const REGISTRATION_WINDOW_MS = 10 * 60 * 1000;

export async function POST(request: Request) {
  let body: {
    userId?: string;
    email?: string;
    contactName?: string;
    url?: string;
    phone?: string;
  };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const { contactName, url, phone } = body;
  if (!contactName || !url || !phone) {
    return Response.json({ error: "Missing fields." }, { status: 400 });
  }

  // Without Supabase there is nowhere to put this. Say so rather than
  // returning ok — the previous version reported success here, which is how a
  // silent failure could look identical to a save.
  if (!getSupabase()) {
    return Response.json(
      { error: "Storage is not configured." },
      { status: 503 },
    );
  }

  // A signed-in employer edits their own row, whatever the body claims.
  const sessionUser = await getSessionUser();

  try {
    if (sessionUser) {
      await saveEmployerProfile({
        userId: sessionUser.id,
        email: sessionUser.email ?? "",
        contactName,
        url,
        phone,
      });
      return Response.json({ ok: true });
    }

    // No session: this can only be the register form, moments after signUp.
    const account = body.userId ? await getAuthAccount(body.userId) : null;
    const age = account ? Date.now() - Date.parse(account.createdAt) : Infinity;
    if (!account || !(age >= 0 && age <= REGISTRATION_WINDOW_MS)) {
      return Response.json(
        { error: "Please sign in to update your company details." },
        { status: 403 },
      );
    }

    const created = await createEmployerProfileIfAbsent({
      userId: account.id,
      email: account.email,
      contactName,
      url,
      phone,
    });
    if (!created) {
      return Response.json(
        { error: "Please sign in to update your company details." },
        { status: 409 },
      );
    }
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[EMPLOYER PROFILE NOT SAVED]", sessionUser?.id ?? body.userId, err);
    return Response.json(
      { error: "Could not save your details. Please try again." },
      { status: 503 },
    );
  }
}
