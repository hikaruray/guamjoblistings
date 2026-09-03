"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-browser";

// Employer password reset, step 2: actually set the new password.
//
// Reachable only with a live session, which /auth/callback creates from the
// one-time code in the recovery email. Someone who opens this URL directly has
// no session, so we say what to do instead of failing at submit time.
export default function NewPasswordForm() {
  const router = useRouter();
  const configured = isSupabaseConfigured();

  const [checking, setChecking] = useState(true);
  const [hasSession, setHasSession] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!configured) {
      setChecking(false);
      return;
    }
    const supabase = createSupabaseBrowserClient();
    supabase.auth.getUser().then(({ data }) => {
      setHasSession(Boolean(data.user));
      setChecking(false);
    });
  }, [configured]);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const data = Object.fromEntries(
      new FormData(e.currentTarget),
    ) as Record<string, string>;

    if (data.password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (data.password !== data.confirm) {
      setError("Those two passwords don't match.");
      return;
    }

    setSending(true);
    try {
      const supabase = createSupabaseBrowserClient();
      const { error } = await supabase.auth.updateUser({
        password: data.password,
      });
      if (error) throw error;
      // updateUser leaves the session in place, so go straight to the dashboard
      // rather than making them sign in again with the password they just set.
      router.push("/employer/dashboard");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Could not update the password.",
      );
      setSending(false);
    }
  }

  if (checking) {
    return <div className="mx-auto max-w-md px-4 py-12 text-slate-500">Checking your link...</div>;
  }

  if (!configured || !hasSession) {
    return (
      <div className="mx-auto max-w-md px-4 py-12">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
          <h1 className="text-xl font-bold text-slate-900">
            This link isn&apos;t valid anymore
          </h1>
          <p className="mt-3 text-slate-700">
            Reset links expire after an hour and only work once. Request a new
            one and open it from the same browser.
          </p>
        </div>
        <p className="mt-6 text-center text-sm text-slate-500">
          <Link
            href="/employer/forgot-password"
            className="font-medium text-cyan-600 hover:text-cyan-700"
          >
            Send a new reset link
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Set a new password</h1>
      <p className="mt-2 text-slate-600">
        Choose a new password for your employer account. You&apos;ll go straight
        to your dashboard afterwards.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <div>
          <label className="block text-sm font-medium text-slate-700">
            New password
          </label>
          <input
            type="password"
            name="password"
            required
            minLength={8}
            placeholder="At least 8 characters"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Confirm new password
          </label>
          <input
            type="password"
            name="confirm"
            required
            minLength={8}
            placeholder="Type it again"
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
          disabled={sending}
          className="w-full rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {sending ? "Saving..." : "Save new password"}
        </button>
      </form>
    </div>
  );
}
