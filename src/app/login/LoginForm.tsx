"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-browser";
import { SITE_URL } from "@/lib/config";

// Applicant sign-in via magic link (passwordless). Entering an email sends a
// one-time link; clicking it registers + logs in + verifies the email at once.
export default function LoginForm() {
  const params = useSearchParams();
  const nextParam = params.get("next");
  const next = nextParam ?? "/jobs";
  const cameFromAction = Boolean(nextParam);
  const initialError = params.get("error");

  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(initialError);

  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback?next=${encodeURIComponent(next)}`,
        },
      });
      if (error) throw error;
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
          <p className="text-4xl">📧</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Check your email</h1>
          <p className="mt-2 text-slate-600">
            We sent a sign-in link to <strong>{email}</strong>. Click it to
            continue — no password needed.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Sign in to apply</h1>
      <p className="mt-2 text-slate-600">
        Applying is free — we just verify your email first. No password needed:
        enter your email and click the link we send. This keeps applications
        genuine and prevents duplicate submissions.
      </p>
      {cameFromAction && (
        <p className="mt-3 rounded-lg bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          You&apos;ll be taken back to continue your application once you&apos;re
          signed in.
        </p>
      )}

      {!configured && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Sign-in is not available yet. Please check back soon.
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
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@email.com"
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
          {sending ? "Sending link..." : "Send me a sign-in link"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Hiring instead?{" "}
        <Link href="/employer/login" className="font-medium text-cyan-600 hover:text-cyan-700">
          Employer sign in
        </Link>
      </p>
    </div>
  );
}
