// Turns selling paid add-ons on or off (lib/payments-switch.ts).
//
// Authentication is handled in proxy.ts, whose matcher covers /api/admin/*.
// Takes effect on the next request: no redeploy, and the PayPal keys stay put.

import { paymentsState, setPaymentsOpen } from "@/lib/payments-switch";

export async function POST(request: Request) {
  let body: { open?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (typeof body.open !== "boolean") {
    return Response.json({ error: "Say open: true or false." }, { status: 400 });
  }

  try {
    await setPaymentsOpen(body.open);
  } catch (err) {
    console.error("Failed to change the sales switch:", err);
    return Response.json(
      {
        error:
          "Could not save the switch. If this is the first time, run launch/supabase-payments-v2-migration.sql in Supabase.",
      },
      { status: 503 },
    );
  }

  // Report what is now true, not what was asked for: switching on without the
  // keys still sells nothing, and the admin should see that straight away.
  return Response.json({ ok: true, state: await paymentsState() });
}
