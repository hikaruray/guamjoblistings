"use client";

import { useState } from "react";
import Link from "next/link";
import { CATEGORIES } from "@/lib/jobs";
import type { PendingJob } from "@/lib/store";

const JOB_TYPES = ["Full-time", "Part-time", "Contract", "Seasonal"];

export default function EditJobForm({ job }: { job: PendingJob }) {
  const [saved, setSaved] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSending(true);
    setError(null);

    const data = Object.fromEntries(new FormData(e.currentTarget));

    try {
      const res = await fetch("/api/employer/update-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, id: job.id }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error ?? "Something went wrong.");
      }
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setSending(false);
    }
  }

  if (saved) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center">
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-10">
          <p className="text-4xl">✅</p>
          <h1 className="mt-4 text-2xl font-bold text-slate-900">Changes saved</h1>
          <p className="mt-2 text-slate-600">
            Your edits were saved. Because the posting changed, it goes back to a
            quick review before it&apos;s live again (usually within 24 hours).
          </p>
          <Link
            href="/employer/dashboard"
            className="mt-6 inline-block rounded-lg bg-cyan-600 px-6 py-3 font-semibold text-white transition hover:bg-cyan-700"
          >
            Back to my dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-10">
      <Link
        href="/employer/dashboard"
        className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
      >
        ← Back to my dashboard
      </Link>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Edit job</h1>
      <p className="mt-2 text-slate-600">
        Update your posting. Saved edits are re-reviewed before going live again.
      </p>

      <form
        onSubmit={handleSubmit}
        className="mt-8 space-y-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"
      >
        <Field label="Job Title" name="title" defaultValue={job.title} required />
        <Field label="Company Name" name="company" defaultValue={job.company} required />
        <Field label="Location" name="location" defaultValue={job.location} required />

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <Label>Category</Label>
            <select
              name="category"
              required
              defaultValue={job.category}
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
              defaultValue={job.jobType}
              className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
            >
              {JOB_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
        </div>

        <Field label="Salary / Pay" name="salary" defaultValue={job.salary} required />
        <Field
          label="Contact Email (where applications go)"
          name="email"
          type="email"
          defaultValue={job.email}
          required
        />

        <div>
          <Label>Job Description</Label>
          <textarea
            name="description"
            required
            rows={5}
            defaultValue={job.description}
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
          {sending ? "Saving..." : "Save changes"}
        </button>
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
  defaultValue,
  required,
}: {
  label: string;
  name: string;
  type?: string;
  defaultValue?: string;
  required?: boolean;
}) {
  return (
    <div>
      <Label>{label}</Label>
      <input
        type={type}
        name={name}
        defaultValue={defaultValue}
        required={required}
        className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
      />
    </div>
  );
}
