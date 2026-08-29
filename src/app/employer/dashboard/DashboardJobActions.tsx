"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Action = "close" | "reopen" | "renew";

function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 86_400_000);
}

// Per-listing actions on the employer dashboard: Edit, Renew, and Close /
// Reopen. Renewal is free — see the note in /api/employer/close-job.
export default function DashboardJobActions({
  id,
  status,
  expiresAt,
}: {
  id: string;
  status: string;
  expiresAt?: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function act(action: Action) {
    if (
      action === "close" &&
      !confirm(
        "Close this posting? It will be removed from the public listings. You can reopen it any time.",
      )
    ) {
      return;
    }
    setBusy(action);
    setErr(null);
    setDone(null);
    try {
      const res = await fetch("/api/employer/close-job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, action }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setErr(data.error || "Something went wrong. Please try again.");
        return;
      }
      if (action === "renew") setDone("Renewed for another 30 days.");
      router.refresh();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(null);
    }
  }

  const left = status === "approved" && expiresAt ? daysLeft(expiresAt) : null;
  // Nudge harder as the window closes, but never hide the button — an employer
  // should be able to renew before we start warning them.
  const urgent = left !== null && left <= 7;

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {left !== null && (
        <p
          className={`mb-2 text-xs ${
            urgent ? "font-medium text-amber-700" : "text-slate-500"
          }`}
        >
          {left <= 0
            ? "This posting has expired and is no longer shown publicly."
            : `Live for ${left} more day${left === 1 ? "" : "s"}. Renewing is free.`}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-4">
        {err && (
          <span className="mr-auto text-xs font-medium text-rose-600">{err}</span>
        )}
        {!err && done && (
          <span className="mr-auto text-xs font-medium text-emerald-600">
            {done}
          </span>
        )}
        <Link
          href={`/employer/jobs/${id}/edit`}
          className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
        >
          Edit
        </Link>
        {status === "approved" && (
          <button
            type="button"
            onClick={() => act("renew")}
            disabled={busy !== null}
            className={`text-sm font-medium disabled:opacity-50 ${
              urgent
                ? "text-amber-700 hover:text-amber-800"
                : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {busy === "renew" ? "…" : "Renew 30 days"}
          </button>
        )}
        {status === "closed" ? (
          <button
            type="button"
            onClick={() => act("reopen")}
            disabled={busy !== null}
            className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
          >
            {busy === "reopen" ? "…" : "Reopen"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => act("close")}
            disabled={busy !== null}
            className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
          >
            {busy === "close" ? "…" : "Close"}
          </button>
        )}
      </div>
    </div>
  );
}
