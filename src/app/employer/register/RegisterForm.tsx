"use client";

import { useState } from "react";
import Link from "next/link";
import {
  createSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase-browser";
import { SITE_URL } from "@/lib/config";

// Employer sign-up: email + password (email confirmation required), plus the
// required contact fields (name / URL / phone). After sign-up, Supabase emails
// a confirmation link; clicking it verifies the email and logs them in.
export default function RegisterForm() {
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const configured = isSupabaseConfigured();

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form)) as Record<string, string>;

    try {
      const supabase = createSupabaseBrowserClient();
      const { data: signUp, error: signUpError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${SITE_URL}/auth/callback?next=/employer/dashboard`,
        },
      });
      if (signUpError) throw signUpError;

      // Save the employer profile fields (name / URL / phone), keyed to the
      // newly created user. Uses a server route (service role) so RLS is fine.
      const userId = signUp.user?.id;
      if (userId) {
        await fetch("/api/employer/profile", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userId,
            email: data.email,
            contactName: data.contactName,
            url: data.url,
            phone: data.phone,
          }),
        });
      }

      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (done) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
          <p className="text-4xl">📧</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Confirm your email
          </h1>
          <p className="mt-2 text-slate-600">
            We sent a confirmation link to your inbox. Click it to verify your
            account, then you can post your first job.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="text-2xl font-bold text-slate-900">Create an employer account</h1>
      <p className="mt-2 text-slate-600">
        Post jobs and reach local talent across Guam. It&apos;s free to start —
        we just verify your email so every listing stays trustworthy for job
        seekers. After you confirm your email, you can post right away.
      </p>

      {!configured && (
        <p className="mt-6 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Employer sign-up is not available yet. Please check back soon.
        </p>
      )}

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <Field label="Email" name="email" type="email" placeholder="you@company.com" required />
        <Field label="Password" name="password" type="password" placeholder="At least 8 characters" required minLength={8} />
        <Field label="Contact Name" name="contactName" placeholder="Your full name" required />
        <Field label="Company Website / URL" name="url" type="url" placeholder="https://yourcompany.com" required />
        <Field label="Phone" name="phone" type="tel" placeholder="(671) 000-0000" required />

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
          {sending ? "Creating account..." : "Create account"}
        </button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/employer/login" className="font-medium text-cyan-600 hover:text-cyan-700">
          Sign in
        </Link>
      </p>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  minLength,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  minLength?: number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        minLength={minLength}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
      />
    </div>
  );
}
