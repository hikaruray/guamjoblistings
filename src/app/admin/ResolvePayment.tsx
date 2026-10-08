"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// Buttons for one payment whose outcome is in doubt.
//
//   Check PayPal now — asks PayPal and settles what it can answer: a confirmed
//     capture is granted AND counted as revenue; "no money moved" lifts the
//     block. Anything odd is left here for a person.
//   I checked PayPal — for what the check cannot decide (a refund you made, a
//     wrong amount). Records what you found and lifts the block; never grants.
export default function ResolvePayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function send(payload: Record<string, string>) {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await fetch("/api/admin/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, ...payload }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        error?: string;
        result?: { action: string; detail: string };
      };
      if (!res.ok) {
        setErr(data.error ?? "Something went wrong.");
        return;
      }
      // Refreshing re-renders this row and would wipe the answer, so only do it
      // when the payment actually moved; otherwise show what PayPal said.
      if (data.result && !["granted", "closed"].includes(data.result.action)) {
        setMsg(`${data.result.action}: ${data.result.detail}`);
        return;
      }
      router.refresh();
    } catch {
      setErr("Network error. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function resolve() {
    const found = prompt(
      "What did PayPal show for this order? (e.g. \"captured, refunded 2026-09-05\", or \"not captured — employer may re-purchase\")",
    );
    if (found === null) return;
    if (!found.trim()) {
      setErr("Please say what you found — it is the only record of it.");
      return;
    }
    send({ action: "resolve", resolution: found.trim() });
  }

  const btn =
    "rounded-md bg-white px-2 py-0.5 text-xs font-medium text-rose-800 ring-1 ring-rose-300 transition hover:bg-rose-50 disabled:opacity-50";

  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-2">
      <button type="button" onClick={() => send({ action: "check" })} disabled={busy} className={btn}>
        {busy ? "…" : "Check PayPal now"}
      </button>
      <button type="button" onClick={resolve} disabled={busy} className={btn}>
        I checked PayPal
      </button>
      {msg && <span className="text-xs text-slate-600">{msg}</span>}
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </span>
  );
}

// Undo for a resolution made by mistake. Puts the row back in the alerts and
// re-blocks a repurchase, exactly as it was before.
export function ReopenPayment({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function reopen() {
    if (!confirm("Undo this resolution? The payment goes back to needing attention.")) return;
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/payment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, action: "reopen" }),
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
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        onClick={reopen}
        disabled={busy}
        className="text-xs font-medium text-slate-500 underline hover:text-slate-700 disabled:opacity-50"
      >
        {busy ? "…" : "Undo"}
      </button>
      {err && <span className="text-xs text-rose-700">{err}</span>}
    </span>
  );
}
