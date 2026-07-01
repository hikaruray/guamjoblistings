// Stores an employer's profile (contact name / URL / phone) at registration.
// Uses the service-role client so the row can be written for a just-created,
// not-yet-confirmed user. The user_id comes from the signUp result.

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

  const { userId, email, contactName, url, phone } = body;
  if (!userId || !email || !contactName || !url || !phone) {
    return Response.json({ error: "Missing fields." }, { status: 400 });
  }

  const supabase = getSupabase();
  if (!supabase) {
    // Local dev without Supabase — nothing to persist; succeed quietly.
    return Response.json({ ok: true, stored: false });
  }

  const { error } = await supabase.from("employer_profiles").upsert(
    {
      user_id: userId,
      email,
      contact_name: contactName,
      url,
      phone,
    },
    { onConflict: "user_id" },
  );

  if (error) {
    console.error("Failed to save employer profile:", error);
    return Response.json(
      { error: "Could not save your details. Please try again." },
      { status: 503 },
    );
  }

  return Response.json({ ok: true, stored: true });
}
