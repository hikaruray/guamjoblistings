"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-browser";
import { SITE_URL } from "@/lib/config";

// Employer password reset, step 1: ask Supabase to email a recovery link.
//
// The link lands on /auth/callback, which exchanges the one-time code for a
// session and then forwards to /employer/new-password — the only page that can
// actually change the password, because updateUser() needs that session.
export default function ForgotPasswordForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const data = Object.fromEntries(
      new FormData(e.currentTarget),
    ) as Record<string, string>;

    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
        redirectTo: `${SITE_URL}/auth/callback?next=/employer/new-password`,
      });
      if (error) throw error;
      setDone(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not send the reset link.",
      );
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">Check your email</h1>
          <p className="mt-3 text-slate-700">
            If that address has an employer account, a link to set a new
            password is on its way. It expires in an hour, and it only works
            once — request a fresh one if you need to try again.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/employer/login"
            className="font-medium text-cyan-600 hover:text-cyan-700"
          >
            Back to sign in
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Reset your password</h1>
      <p className="mt-2 text-slate-600">
        Enter the email address you registered with and we&apos;ll send you a
        link to set a new password.
      </p>

      {!configured && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Password reset is not available yet. Please check back soon.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">Email</label>
          <input
            type="email"
            name="email"
            required
            placeholder="you@company.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={sending || !configured}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Sending..." : "Send reset link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Remembered it?{" "}
        <Link
          href="/employer/login"
          className="font-medium text-cyan-600 hover:text-cyan-700"
        >
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
