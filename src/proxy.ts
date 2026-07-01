// Protects the Admin dashboard and admin APIs with HTTP Basic Auth.
//
// The Admin area shows applicant personal information, so it must never be
// publicly accessible in production. This proxy challenges every request to
// /admin and /api/admin/* for a password before the page/route runs.
//
// (In Next.js 16 the request-interception file is called "proxy"; earlier
// versions called the same thing "middleware".)
//
// Configuration (Vercel env var):
//   ADMIN_PASSWORD — the password the owner types to log in. Username is ignored
//                    (type anything), so the owner only remembers one secret.
//
// Fail-safe behavior:
//   • Production with ADMIN_PASSWORD set     → must enter the correct password.
//   • Production with ADMIN_PASSWORD MISSING → access is DENIED (locked shut),
//                                              so private data is never exposed
//                                              by a forgotten env var.
//   • Local development (`npm run dev`)      → auth is skipped for convenience,
//                                              so the owner can work locally.

import { NextResponse, type NextRequest } from "next/server";

export const config = {
  // Only run on the Admin page and admin APIs.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};

function unauthorized(): NextResponse {
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Guam Job Listings Admin", charset="UTF-8"',
    },
  });
}

export function proxy(request: NextRequest) {
  // Local development convenience: skip auth so `npm run dev` admin works.
  if (process.env.NODE_ENV === "development") {
    return NextResponse.next();
  }

  const expected = process.env.ADMIN_PASSWORD;

  // Fail closed: if no password is configured in production, deny access
  // rather than exposing applicant data.
  if (!expected) {
    return new NextResponse(
      "Admin access is not configured. Set ADMIN_PASSWORD.",
      { status: 503 },
    );
  }

  const header = request.headers.get("authorization");
  if (!header || !header.startsWith("Basic ")) {
    return unauthorized();
  }

  let decoded = "";
  try {
    decoded = atob(header.slice("Basic ".length));
  } catch {
    return unauthorized();
  }

  // Format is "username:password" — username is ignored, only the password matters.
  const password = decoded.slice(decoded.indexOf(":") + 1);

  if (!timingSafeEqual(password, expected)) {
    return unauthorized();
  }

  return NextResponse.next();
}

// Constant-time string comparison to avoid leaking the password via timing.
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
