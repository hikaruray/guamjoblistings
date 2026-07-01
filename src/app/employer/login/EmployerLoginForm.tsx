"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-browser";

// Employer sign-in via email + password. On success, redirects to the
// dashboard (or the page they were trying to reach, e.g. /post-a-job).
export default function EmployerLoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const nextParam = params.get("next");
  const next = nextParam ?? "/employer/dashboard";
  const cameFromAction = Boolean(nextParam);

  const [sending, setSending] = useState(false);
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
      const { error } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });
      if (error) throw error;
      router.push(next.startsWith("/") ? next : "/employer/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Invalid email or password.",
      );
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Employer sign in</h1>
      <p className="mt-2 text-slate-600">
        Posting jobs is free — we just ask employers to keep a verified account
        so every listing stays trustworthy for local job seekers. Sign in to
        post and manage your listings.
      </p>
      {cameFromAction && (
        <p className="mt-3 rounded-lg bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
          You&apos;ll be taken back to continue once you&apos;re signed in.
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
            name="email"
            required
            placeholder="you@company.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Password</label>
          <input
            type="password"
            name="password"
            required
            placeholder="Your password"
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
          {sending ? "Signing in..." : "Sign in"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/employer/register" className="font-medium text-cyan-600 hover:text-cyan-700">
          Create an employer account
        </Link>
      </p>
    </div>
  );
}
