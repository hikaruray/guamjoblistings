"use client";

import { useState } from "react";

export default function LoginForm({ next }: { next: string }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(data.error ?? "Could not log in. Please try again.");
        return;
      }
      // A full navigation, so the protected page is requested with the new cookie.
      window.location.assign(next);
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <label className="block text-sm font-medium text-slate-700">
        Password
        <input
          type="password"
          autoComplete="current-password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="mt-1 block w-full rounded-lg border border-slate-300 px-3 py-2 text-slate-900 focus:border-cyan-500 focus:outline-none"
        />
      </label>
      {err && <p className="text-sm text-rose-600">{err}</p>}
      <button
        type="submit"
        disabled={busy || !password}
        className="w-full rounded-lg bg-cyan-600 px-4 py-2 font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
      >
        {busy ? "Logging in…" : "Log in"}
      </button>
    </form>
  );
}
