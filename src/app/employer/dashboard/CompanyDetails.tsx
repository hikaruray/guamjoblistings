"use client";

import { useState } from "react";
import type { EmployerProfile } from "@/lib/store";

// The contact name / website / phone an employer gave at registration, shown
// back to them and editable. Two reasons this exists: registration could fail
// to save them (it did, silently, until 2026-09-04), and a phone number or a
// contact person changes long before an employer thinks to tell us.
//
// The server takes the user id from the session, not from anything sent here,
// so this can only ever write the signed-in employer's own row.
export default function CompanyDetails({
  profile,
  email,
}: {
  profile: EmployerProfile | null;
  email: string;
}) {
  const [open, setOpen] = useState(!profile);
  const [current, setCurrent] = useState(profile);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const data = Object.fromEntries(
      new FormData(e.currentTarget),
    ) as Record<string, string>;

    try {
      const res = await fetch("/api/employer/profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          contactName: data.contactName,
          url: data.url,
          phone: data.phone,
        }),
      });
      if (!res.ok) {
        const payload = (await res.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(payload.error ?? "Could not save your details.");
      }
      setCurrent({
        userId: current?.userId ?? "",
        email,
        contactName: data.contactName,
        url: data.url,
        phone: data.phone,
      });
      setOpen(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save.");
    } finally {
      setSaving(false);
    }
  }

  if (!open) {
    return (
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="text-sm">
            <p className="font-semibold text-slate-900">Company details</p>
            <p className="mt-1 text-slate-600">{current?.contactName}</p>
            <p className="text-slate-600">{current?.phone}</p>
            <p className="text-slate-600">{current?.url}</p>
          </div>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            Edit
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <p className="font-semibold text-slate-900">Company details</p>
      {!current && (
        <p className="mt-1 text-sm text-amber-700">
          We don&apos;t have these on file. Job seekers and our reviewers use
          them to tell a real employer from a scam, so please add them.
        </p>
      )}

      <form onSubmit={handleSubmit} className="mt-4 space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Contact name
          </label>
          <input
            name="contactName"
            required
            defaultValue={current?.contactName ?? ""}
            placeholder="Your full name"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Company website / URL
          </label>
          <input
            name="url"
            type="url"
            required
            defaultValue={current?.url ?? ""}
            placeholder="https://yourcompany.com"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Phone
          </label>
          <input
            name="phone"
            type="tel"
            required
            defaultValue={current?.phone ?? ""}
            placeholder="(671) 000-0000"
            className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-800 shadow-sm focus:border-cyan-500 focus:ring-2 focus:ring-cyan-200"
          />
        </div>

        {error && (
          <p className="rounded-lg bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </p>
        )}

        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-cyan-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-cyan-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? "Saving..." : "Save details"}
          </button>
          {current && (
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                setError(null);
              }}
              className="rounded-lg px-3 py-2 text-sm text-slate-500 hover:text-slate-700"
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
