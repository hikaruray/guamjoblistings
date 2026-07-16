"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

// Per-listing actions on the employer dashboard: Edit, and Close / Reopen.
export default function DashboardJobActions({
  id,
  status,
}: {
  id: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: "close" | "reopen") {
    if (
      action === "close" &&
      !confirm(
        "Close this posting? It will be removed from the public listings. You can reopen it any time.",
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
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
      router.refresh();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-3 flex flex-wrap items-center justify-end gap-4 border-t border-slate-100 pt-3">
      {err && <span className="mr-auto text-xs font-medium text-rose-600">{err}</span>}
      <Link
        href={`/employer/jobs/${id}/edit`}
        className="text-sm font-medium text-cyan-600 hover:text-cyan-700"
      >
        Edit
      </Link>
      {status === "closed" ? (
        <button
          type="button"
          onClick={() => act("reopen")}
          disabled={busy}
          className="text-sm font-medium text-emerald-600 hover:text-emerald-700 disabled:opacity-50"
        >
          {busy ? "…" : "Reopen"}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => act("close")}
          disabled={busy}
          className="text-sm font-medium text-slate-500 hover:text-slate-700 disabled:opacity-50"
        >
          {busy ? "…" : "Close"}
        </button>
      )}
    </div>
  );
}
