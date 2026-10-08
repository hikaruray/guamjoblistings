"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

// The owner's on/off switch for selling paid add-ons. See lib/payments-switch.ts.
export default function SalesSwitch({
  keysConfigured,
  switchedOn,
  liveMode,
  switchError,
}: {
  keysConfigured: boolean;
  switchedOn: boolean;
  liveMode: boolean;
  switchError: string | null;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const open = keysConfigured && switchedOn;

  async function flip(next: boolean) {
    if (
      next &&
      !confirm(
        liveMode
          ? "Start selling paid add-ons with REAL money (PayPal live)?"
          : "Start selling paid add-ons in PayPal SANDBOX (test money)?",
      )
    ) {
      return;
    }
    setBusy(true);
    setErr(null);
    try {
      const res = await fetch("/api/admin/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ open: next }),
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
    <div
      className={`mt-3 rounded-xl border p-4 text-sm ${
        open ? "border-emerald-300 bg-emerald-50" : "border-slate-200 bg-white"
      }`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-semibold text-slate-900">
            Paid add-ons:{" "}
            <span className={open ? "text-emerald-700" : "text-slate-500"}>
              {open ? "ON SALE" : "not on sale"}
            </span>
            {keysConfigured && (
              <span
                className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                  liveMode ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700"
                }`}
              >
                {liveMode ? "PayPal LIVE — real money" : "PayPal sandbox — test money"}
              </span>
            )}
          </p>
          <p className="mt-1 text-slate-500">
            {!keysConfigured
              ? "PayPal keys are not set in Vercel (PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, NEXT_PUBLIC_PAYPAL_CLIENT_ID), so nothing can be sold whatever this switch says."
              : open
                ? "Employers can buy Featured and Urgent from their dashboard. Turning this off hides the buy buttons and refuses new checkouts at once; payments already in progress still complete."
                : "Keys are set. Nothing is sold until you switch this on."}
          </p>
          {switchError && (
            <p className="mt-1 text-rose-700">
              Could not read the switch ({switchError}). If this is the first
              time, run launch/supabase-payments-v2-migration.sql in Supabase.
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => flip(!switchedOn)}
          disabled={busy}
          className={`rounded-lg px-4 py-2 font-semibold transition disabled:opacity-50 ${
            switchedOn
              ? "bg-white text-rose-700 ring-1 ring-rose-300 hover:bg-rose-50"
              : "bg-emerald-600 text-white hover:bg-emerald-700"
          }`}
        >
          {busy ? "…" : switchedOn ? "Stop selling" : "Start selling"}
        </button>
      </div>
      {err && <p className="mt-2 text-rose-700">{err}</p>}
    </div>
  );
}
