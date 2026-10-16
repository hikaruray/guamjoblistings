// Protects the Admin dashboard and admin APIs.
//
// The Admin area shows applicant personal information, so it must never be
// publicly accessible in production. This proxy checks every request to
// /admin and /api/admin/* for the owner's login cookie before the page/route
// runs. (In Next.js 16 the request-interception file is called "proxy";
// earlier versions called the same thing "middleware".)
//
// Until 2026-10-16 this was HTTP Basic Auth, which a browser cannot log out
// of — see lib/admin-session.ts for the cookie that replaced it.
//
// Configuration (Vercel env var):
//   ADMIN_PASSWORD — the password the owner types at /admin/login. It also
//                    signs the login cookie, so changing it logs everyone out.
//
// Fail-safe behavior:
//   • Production with ADMIN_PASSWORD set     → must log in at /admin/login.
//   • Production with ADMIN_PASSWORD MISSING → access is DENIED (locked shut),
//                                              so private data is never exposed
//                                              by a forgotten env var.
//   • Local development (`npm run dev`)      → auth is skipped for convenience,
//                                              so the owner can work locally.

import { NextResponse, type NextRequest } from "next/server";
import {
  ADMIN_COOKIE,
  adminAuthDisabled,
  adminPassword,
  verifyAdminToken,
} from "@/lib/admin-session";

export const config = {
  // Only run on the Admin page and admin APIs.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

// The two doors that must open without a session: the form and its handler.
const PUBLIC_PATHS = new Set(["/admin/login", "/api/admin/login"]);

export async function proxy(request: NextRequest) {
  if (adminAuthDisabled()) {
    return NextResponse.next();
  }

  const password = adminPassword();

  // Fail closed: if no password is configured in production, deny access
  // rather than exposing applicant data.
  if (!password) {
    return new NextResponse(
      "Admin access is not configured. Set ADMIN_PASSWORD.",
      { status: 503 },
    );
  }

  const { pathname, search } = request.nextUrl;
  if (PUBLIC_PATHS.has(pathname)) {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE)?.value;
  if (await verifyAdminToken(token, password)) {
    return NextResponse.next();
  }

  // An API call answers 401 (the screen that made it shows "log in again");
  // a page sends the owner to the login form and back here afterwards.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Please log in again." }, { status: 401 });
  }
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}
