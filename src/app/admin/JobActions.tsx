"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

type Action = "approve" | "reject" | "unpublish";

// Review actions on the Admin screen. Approve / Reject while a submission is
// waiting, and Unpublish once it is live — without that last one the only way
// to pull a listing we should not have approved was to ask the employer to
// close it themselves, or to edit the database by hand.
export default function JobActions({
  jobId,
  status,
}: {
  jobId: string;
  status: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function act(action: Action) {
    let rejectionReason: string | undefined;

    if (action === "reject" || action === "unpublish") {
      // Rejecting may be generic; taking a live listing down may not.
      //
      // The employer's dashboard tells "we removed this" apart from "you closed
      // this" by whether a reason is stored — so a blank reason silently puts
      // the employer back where they started: a grey Closed badge, a Reopen
      // button, and no idea we were involved. If the distinction rests on the
      // reason, the reason cannot be optional.
      const r = prompt(
        action === "reject"
          ? "Reason for not approving (shown to the employer). Leave blank for a generic message:"
          : "Why are you taking this down? The employer sees this, and it is how they can tell we removed it rather than assuming they closed it themselves:",
      );
      if (r === null) return; // cancelled
      rejectionReason = r.trim() || undefined;

      if (action === "unpublish" && !rejectionReason) {
        setErr("Please give a reason — the employer only sees that we took it down if you do.");
        return;
      }
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, action, rejectionReason }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(data.error ?? "Something went wrong. Please try again.");
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
    <span className="inline-flex flex-col items-end gap-1">
      <span className="inline-flex gap-2">
        {status === "pending" && (
          <>
            <button
              onClick={() => act("approve")}
              disabled={busy}
              className="rounded-md bg-emerald-50 px-3 py-1.5 text-xs font-medium text-emerald-700 ring-1 ring-emerald-200 transition hover:bg-emerald-100 disabled:opacity-50"
            >
              Approve
            </button>
            <button
              onClick={() => act("reject")}
              disabled={busy}
              className="rounded-md bg-rose-50 px-3 py-1.5 text-xs font-medium text-rose-700 ring-1 ring-rose-200 transition hover:bg-rose-100 disabled:opacity-50"
            >
              Reject
            </button>
          </>
        )}
        {status === "approved" && (
          <button
            onClick={() => act("unpublish")}
            disabled={busy}
            className="rounded-md bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-300 transition hover:bg-slate-100 disabled:opacity-50"
          >
            Unpublish
          </button>
        )}
      </span>
      {err && <span className="text-xs text-rose-600">{err}</span>}
    </span>
  );
}
