// Owner logout: drops the session cookie and returns to the login form.
// A plain form POST (no JavaScript needed), answered with a 303 redirect.

import { cookies } from "next/headers";
import { ADMIN_COOKIE } from "@/lib/admin-session";

export async function POST(request: Request) {
  (await cookies()).delete(ADMIN_COOKIE);
  return Response.redirect(new URL("/admin/login?loggedOut=1", request.url), 303);
}
