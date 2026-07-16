"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JobActions({ jobId }: { jobId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function act(action: "approve" | "reject") {
    let rejectionReason: string | undefined;
    if (action === "reject") {
      const r = prompt(
        "Reason for not approving (shown to the employer). Leave blank for a generic message:",
      );
      if (r === null) return; // cancelled
      rejectionReason = r.trim() || undefined;
    }
    setBusy(true);
    try {
      await fetch("/api/admin/job", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: jobId, action, rejectionReason }),
      });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <span className="inline-flex gap-2">
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
    </span>
  );
}
