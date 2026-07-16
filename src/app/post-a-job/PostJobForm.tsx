"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/jobs";

export default function PostJobForm({
  defaultEmail,
}: {
  defaultEmail?: string;
}) {
  const [submitted, setSubmitted] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const res = await fetch("/api/post-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
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
          <p className="text-4xl">✅</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Job submitted!
          </h1>
          <p className="mt-2 text-slate-600">
            Thank you. Your job posting has been received and will be reviewed by
            our team before going live (usually within 24 hours).
          </p>
          <Link
            href="/employer/dashboard"
            className="mt-6 inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
          >
            Go to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <h1 className="text-2xl font-bold text-slate-900">Post a Job</h1>
      <p className="mt-2 text-slate-600">
        Reach local talent across Guam — it&apos;s free to post your job.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <Field label="Job Title" name="title" placeholder="e.g. Front Desk Agent" required />
        <Field label="Company Name" name="company" placeholder="e.g. Tumon Bay Resort" required />
        <Field label="Location" name="location" placeholder="e.g. Tumon, Guam" required />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <select
              name="category"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
          <div>
            <Label>Job Type</Label>
            <select
              name="jobType"
              required
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              <option>Full-time</option>
              <option>Part-time</option>
              <option>Contract</option>
              <option>Seasonal</option>
            </select>
          </div>
        </div>

        <Field label="Salary / Pay" name="salary" placeholder="e.g. $14 - $17 / hour" required />
        <Field
          label="Contact Email (where applications go)"
          name="email"
          type="email"
          placeholder="hiring@yourcompany.com"
          required
          defaultValue={defaultEmail}
        />

        <div>
          <Label>Job Description</Label>
          <textarea
            name="description"
            required
            rows={5}
            placeholder="Describe the role, responsibilities, and requirements..."
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
          {sending ? "Submitting..." : "Submit Job Posting"}
        </button>
        <p className="text-center text-xs text-slate-400">
          Submissions are reviewed before going live.
        </p>
      </form>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-700">{children}</label>
  );
}

function Field({
  label,
  name,
  type = "text",
  placeholder,
  required,
  defaultValue,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        name={name}
        placeholder={placeholder}
        required={required}
        defaultValue={defaultValue}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
      />
    </div>
  );
}
