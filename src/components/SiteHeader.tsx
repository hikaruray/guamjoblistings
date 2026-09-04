"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createSupabaseBrowserClient, isSupabaseConfigured } from "@/lib/supabase-browser";
import { PalmLogo } from "./icons";

type Me = {
  signedIn: boolean;
  email?: string | null;
  isEmployer?: boolean;
  isApplicant?: boolean;
};

// The header is a client component on purpose. Reading the session on the
// server would make every page dynamic — including /about-us, /faq, /privacy
// and the guides, which are prerendered today and want to stay that way. So we
// render the signed-out nav first and fill in the account once the browser has
// asked. Nothing jumps: the account area holds its space while it loads.
export default function SiteHeader() {
  const [me, setMe] = useState<Me | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;
    fetch("/api/me")
      .then((r) => (r.ok ? r.json() : { signedIn: false }))
      .then((data: Me) => {
        if (!cancelled) setMe(data);
      })
      .catch(() => {
        if (!cancelled) setMe({ signedIn: false });
      });
    return () => {
      cancelled = true;
    };
    // Re-check after navigation: signing in or out happens on another page.
  }, [pathname]);

  async function signOut() {
    try {
      if (isSupabaseConfigured()) {
        await createSupabaseBrowserClient().auth.signOut();
      }
    } catch {
      // ignore — the redirect below still gets them out of the signed-in area
    }
    setMe({ signedIn: false });
    router.push("/");
    router.refresh();
  }

  const signedIn = me?.signedIn === true;

  return (
    <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2">
          <PalmLogo className="h-7 w-7 text-cyan-600" title="Guam Job Listings" />
          <span className="text-lg font-bold tracking-tight text-slate-900">
            Guam<span className="text-cyan-600">Jobs</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1 text-sm font-medium sm:gap-2">
          <Link
            href="/jobs"
            className="rounded-md px-2 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:px-3"
          >
            Browse Jobs
          </Link>

          {/* Signed out: the two front doors. */}
          {!signedIn && (
            <Link
              href="/employer/login"
              className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 sm:block"
            >
              Employers
            </Link>
          )}

          {/* Signed in: whichever dashboards this account actually has. This is
              also how you get back to a dashboard from anywhere on the site —
              previously the only route was the browser's back button. */}
          {signedIn && me?.isEmployer && (
            <Link
              href="/employer/dashboard"
              className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:block"
            >
              My Listings
            </Link>
          )}
          {/* Someone with no application yet still needs the way in, so this
              shows for any signed-in account that is not purely an employer. */}
          {signedIn && (me?.isApplicant || !me?.isEmployer) && (
            <Link
              href="/my/applications"
              className="hidden rounded-md px-3 py-2 text-slate-600 hover:bg-slate-100 hover:text-slate-900 lg:block"
            >
              My Applications
            </Link>
          )}

          <Link
            href="/post-a-job"
            className="rounded-md bg-cyan-600 px-3 py-2 text-white shadow-sm transition hover:bg-cyan-700 sm:px-4"
          >
            Post a Job
          </Link>

          {signedIn && (
            <div className="ml-1 hidden items-center gap-2 border-l border-slate-200 pl-3 lg:flex">
              <span
                className="max-w-[13rem] truncate text-xs text-slate-500"
                title={me?.email ?? undefined}
              >
                Signed in as{" "}
                <span className="font-medium text-slate-700">{me?.email}</span>
              </span>
              <button
                type="button"
                onClick={signOut}
                className="shrink-0 rounded-md px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
              >
                Sign out
              </button>
            </div>
          )}
        </nav>
      </div>

      {/* Below lg the top row is already full, so the account and its
          dashboards get their own strip rather than being dropped. Knowing
          which account you are about to post or apply as matters most on a
          phone, and this is also the route back to a dashboard from any page
          on a narrow screen. */}
      {signedIn && (
        <div className="border-t border-slate-100 bg-slate-50 px-4 py-1.5 lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
            <span
              className="truncate text-xs text-slate-500"
              title={me?.email ?? undefined}
            >
              Signed in as{" "}
              <span className="font-medium text-slate-700">{me?.email}</span>
            </span>
            <div className="flex shrink-0 items-center gap-3">
              {me?.isEmployer && (
                <Link
                  href="/employer/dashboard"
                  className="text-xs font-medium text-cyan-700"
                >
                  My Listings
                </Link>
              )}
              {(me?.isApplicant || !me?.isEmployer) && (
                <Link
                  href="/my/applications"
                  className="text-xs font-medium text-cyan-700"
                >
                  Applications
                </Link>
              )}
              <button
                type="button"
                onClick={signOut}
                className="text-xs font-medium text-slate-500"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
