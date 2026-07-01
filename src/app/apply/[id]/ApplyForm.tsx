"use client";

import { useState } from "react";
import Link from "next/link";

export default function ApplyForm({
  jobId,
  jobTitle,
  company,
  applicantEmail,
}: {
  jobId: string;
  jobTitle: string;
  company: string;
  applicantEmail?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const form = e.currentTarget;
    const data = Object.fromEntries(new FormData(form));

    try {
      const res = await fetch("/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId, ...data }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Something went wrong.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
          <p className="text-4xl">🎉</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Application sent!
          </h1>
          <p className="mt-2 text-slate-600">
            Your application for <strong>{jobTitle}</strong> at{" "}
            <strong>{company}</strong>{" "}has been submitted. The employer will
            contact you directly if you&apos;re a match. Good luck! 🌴
          </p>
          <Link
            href="/jobs"
            className="mt-6 inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
          >
            Browse more jobs
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href={`/jobs/${jobId}`}
        className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
      >
        ← Back to job
      </Link>

      <h1 className="mt-4 text-2xl font-bold text-slate-900">
        Apply for {jobTitle}
      </h1>
      <p className="mt-1 text-slate-600">{company}</p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <Field label="Full Name" name="name" placeholder="Your full name" required />
        <Field
          label="Email"
          name="email"
          type="email"
          placeholder="you@email.com"
          required
          defaultValue={applicantEmail}
          readOnly={Boolean(applicantEmail)}
        />
        <Field label="Phone" name="phone" type="tel" placeholder="(671) 000-0000" required />

        <div>
          <label className="block text-sm font-medium text-slate-700">
            Cover Message
          </label>
          <textarea
            name="message"
            rows={5}
            placeholder="Tell the employer why you'd be a great fit..."
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
          {sending ? "Sending..." : "Submit Application"}
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
  readOnly,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
  readOnly?: boolean;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700">{label}</label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        readOnly={readOnly}
        className={`mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200 ${
          readOnly ? "bg-slate-50 text-slate-500" : ""
        }`}
      />
    </div>
  );
}
