// Owner login: checks ADMIN_PASSWORD and sets the signed session cookie.
// Reachable without a session (proxy.ts lets this one path through).

import { cookies } from "next/headers";
import {
  ADMIN_COOKIE,
  ADMIN_SESSION_DAYS,
  adminPassword,
  createAdminToken,
  safeEqual,
} from "@/lib/admin-session";

export async function POST(request: Request) {
  const expected = adminPassword();
  if (!expected) {
    return Response.json(
      { error: "Admin access is not configured. Set ADMIN_PASSWORD." },
      { status: 503 },
    );
  }

  let body: { password?: unknown };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const password = typeof body.password === "string" ? body.password : "";

  if (!safeEqual(password, expected)) {
    // A small, fixed delay makes guessing slow without locking the owner out.
    await new Promise((r) => setTimeout(r, 800));
    return Response.json({ error: "Wrong password." }, { status: 401 });
  }

  (await cookies()).set(ADMIN_COOKIE, await createAdminToken(expected), {
    httpOnly: true, // page scripts can never read it
    secure: process.env.NODE_ENV === "production",
    // Strict: no other site can make the browser send it, which is what keeps
    // a forged form on another page from pressing Approve or Stop selling.
    sameSite: "strict",
    path: "/",
    maxAge: ADMIN_SESSION_DAYS * 86_400,
  });
  return Response.json({ ok: true });
}
