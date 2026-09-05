"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// "I checked PayPal, here is what I found." Clears the unresolved marker on one
// payment so the employer can buy again, without touching the payment's status
// or granting anything — both of those stay manual and deliberate.
export default function ResolvePayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function resolve() {
    const found = prompt(
      "What did PayPal show for this order? (e.g. \"not captured — employer may re-purchase\", or \"captured, refunded 2026-09-05\", or \"captured, add-on applied by hand\")",
    );
    if (found === null) return;
    if (!found.trim()) {
      setErr("Please say what you found — it is the only record of it.");
      return;
    }

    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, resolution: found.trim() }),
      });
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setErr(data.error ?? "Something went wrong.");
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
    <span className="ml-2 inline-flex items-center gap-2">
      <button
        type="button"
        onClick={resolve}
        disabled={busy}
        className="rounded-md bg-white px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-300 transition hover:bg-rose-50 disabled:opacity-50"
      >
        {busy ? "…" : "I checked PayPal"}
      </button>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </span>
  );
}
