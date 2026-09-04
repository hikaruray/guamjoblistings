// Stores an employer's profile (contact name / URL / phone).
//
// Two callers:
//   • registration — the user_id comes from the signUp result, and the account
//     is not confirmed yet, so this uses the service-role client to write the
//     row for a user who cannot yet authenticate.
//   • the employer dashboard — an existing employer correcting their details.
//     There we require a live session and ignore any user id in the body, so a
//     signed-in employer can only ever write their own row.

import { getSessionUser } from "@/lib/supabase-server";
import { saveEmployerProfile } from "@/lib/store";
import { getSupabase } from "@/lib/supabase";

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

  // A signed-in employer edits their own row, whatever the body claims.
  const sessionUser = await getSessionUser();
  const userId = sessionUser?.id ?? body.userId;
  const email = sessionUser?.email ?? body.email;

  const { contactName, url, phone } = body;
  if (!userId || !email || !contactName || !url || !phone) {
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

  try {
    await saveEmployerProfile({
      userId,
      email,
      contactName,
      url,
      phone,
    });
  } catch (err) {
    console.error("[EMPLOYER PROFILE NOT SAVED]", userId, err);
    return Response.json(
      { error: "Could not save your details. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true });
}
