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
  promotable = false,
  paidAddonActive = false,
}: {
  id: string;
  status: string;
  expiresAt?: string | null;
  // Only true when add-ons can actually be bought (PayPal keys present on the
  // server). Never advertise a checkout that answers 503.
  promotable?: boolean;
  // True while a paid add-on is still running on this posting. Closing does not
  // pause it — the days keep counting — so the person about to throw their own
  // money away should be the one told.
  paidAddonActive?: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<Action | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function act(action: Action) {
    if (
      action === "close" &&
      !confirm(
        paidAddonActive
          ? "Close this posting? You have a paid add-on running on it, and closing does NOT pause it — the days you bought keep counting down while it is closed. Reopening also sends it back through review. Close it anyway?"
          : "Close this posting? It will be removed from the public listings. You can reopen it any time.",
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
      if (action === "renew") setDone("renewed");
      if (action === "reopen") setDone("reopened");
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
  const urgent = left !== null && left <= 3;

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
      {/* Renewal is free and stays free. The upsell is for being seen first,
          never for staying listed — that was the retired extension add-on. */}
      {promotable && status === "approved" && (
        <p className="mb-2 rounded-lg bg-cyan-50 px-3 py-2 text-xs text-cyan-800">
          {done === "renewed" ? "Renewed. " : ""}Want it seen first? Feature it
          or add an Urgent badge below — jobseekers see promoted roles at the
          top of the board.
          {/* Buying 10 days of prominence on a posting with 2 days left buys 2
              days of prominence. Same mismatch the 30-vs-10 fix removed, one
              size smaller, and only the employer can see it coming. */}
          {left !== null && left > 0 && left < 10 && (
            <span className="mt-1 block font-medium text-cyan-900">
              This posting comes down in {left} day{left === 1 ? "" : "s"}. Renew
              it first — it&apos;s free — or the days you buy run out with it.
            </span>
          )}
        </p>
      )}
      <div className="flex flex-wrap items-center justify-end gap-4">
        {err && (
          <span className="mr-auto text-xs font-medium text-rose-600">{err}</span>
        )}
        {!err && done === "renewed" && (
          <span className="mr-auto text-xs font-medium text-emerald-600">
            Renewed — live for another 10 days.
          </span>
        )}
        {/* Reopening is not republishing: it goes back through review, and
            saying so here saves the employer wondering why it is not on the
            board yet. */}
        {!err && done === "reopened" && (
          <span className="mr-auto text-xs font-medium text-amber-700">
            Sent back for review — we&apos;ll email you when it&apos;s live again.
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
            {busy === "renew" ? "…" : "Renew 10 days"}
          </button>
        )}
        {/* Close is the only way to take a posting down — there is no delete,
            because applications already sent must keep pointing at something
            real. It used to sit here as grey text the same weight as Edit, and
            the owner could not find it on the live site; an employer with a
            filled role will not do better. Give it a border so it reads as a
            control rather than a third link. */}
        {status === "closed" ? (
          <button
            type="button"
            onClick={() => act("reopen")}
            disabled={busy !== null}
            className="rounded-lg border border-emerald-300 px-3 py-1.5 text-sm font-medium text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
          >
            {busy === "reopen" ? "…" : "Reopen"}
          </button>
        ) : (
          <button
            type="button"
            onClick={() => act("close")}
            disabled={busy !== null}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
          >
            {busy === "close" ? "…" : "Close listing"}
          </button>
        )}
      </div>
    </div>
  );
}
