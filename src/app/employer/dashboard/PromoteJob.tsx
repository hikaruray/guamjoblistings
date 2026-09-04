"use client";

import { StarIcon } from "@/components/icons";
import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import PaypalCheckout from "@/components/PaypalCheckout";
import type { AddonView } from "@/lib/addons";

export interface PromoteJobProps {
  jobId: string;
  addons: AddonView[]; // priced on the server; shown here for display only
  featuredUntil: string | null;
  urgentUntil: string | null;
}

function isActive(until: string | null): boolean {
  return Boolean(until && new Date(until).getTime() > Date.now());
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function PromoteJob({
  jobId,
  addons,
  featuredUntil,
  urgentUntil,
}: PromoteJobProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<AddonView | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const featuredOn = isActive(featuredUntil);
  const urgentOn = isActive(urgentUntil);

  // Ask the server to open an order. The server decides the price from the
  // add-on id alone — we deliberately send no amount.
  const createOrder = useCallback(async (): Promise<string> => {
    setError(null);
    const res = await fetch("/api/paypal/create-order", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jobId, addon: selected?.id }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
    return data.id as string;
  }, [jobId, selected]);

  // Buyer approved in the PayPal window. The add-on is granted server-side by
  // this call — never optimistically in the browser.
  const onApproved = useCallback(
    async (orderId: string) => {
      setBusy(true);
      setError(null);
      try {
        const res = await fetch("/api/paypal/capture-order", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId }),
        });
        const data = await res.json();
        if (!res.ok) {
          setError(data.error ?? "Payment could not be completed.");
          return;
        }
        setDone(
          `${selected?.name} is now active on this listing. Thank you!`,
        );
        setOpen(false);
        setSelected(null);
        router.refresh(); // pull the new add-on state from the server
      } catch {
        setError("Network problem while confirming your payment.");
      } finally {
        setBusy(false);
      }
    },
    [router, selected],
  );

  const onError = useCallback((message: string) => setError(message), []);
  const onCancel = useCallback(() => {
    // Buyer closed PayPal — nothing was charged, nothing was granted.
    setError(null);
    setSelected(null);
  }, []);

  return (
    <div className="mt-3 border-t border-slate-100 pt-3">
      {/* Current add-on state */}
      <div className="flex flex-wrap items-center gap-2">
        {featuredOn && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-xs font-medium text-amber-800">
            <StarIcon className="h-3.5 w-3.5" /> Featured until {formatDate(featuredUntil!)}
          </span>
        )}
        {urgentOn && (
          <span className="rounded-full bg-rose-100 px-2.5 py-1 text-xs font-medium text-rose-700">
            Urgent until {formatDate(urgentUntil!)}
          </span>
        )}
        {/* The listing's own expiry used to be shown here, alongside the paid
            badges, as though it were one of them. It stopped being an add-on
            on 2026-08-29: every approved posting now gets a free 10-day window
            that the employer renews for nothing, and the countdown sits right
            above this box. Leaving it here made a free window look like
            something you had bought — and since every approved job now has
            one, the "no add-ons active" line below could never appear. */}
        {!featuredOn && !urgentOn && (
          <span className="text-xs text-slate-400">No add-ons active</span>
        )}

        <button
          type="button"
          onClick={() => {
            setOpen((v) => !v);
            setDone(null);
            setError(null);
            setSelected(null);
          }}
          className="ml-auto rounded-lg border border-cyan-600 px-3 py-1.5 text-xs font-semibold text-cyan-700 transition hover:bg-cyan-50"
        >
          {open ? "Close" : "Promote this job"}
        </button>
      </div>

      {done && (
        <p className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
          {done}
        </p>
      )}

      {open && (
        <div className="mt-3 rounded-lg bg-slate-50 p-3">
          <p className="text-xs text-slate-600">
            Get more applicants — one-time payment, no subscription.
          </p>

          <div className="mt-2 space-y-2">
            {addons.map((addon) => {
              const active =
                (addon.id === "featured" && featuredOn) ||
                (addon.id === "urgent" && urgentOn);
              const isSelected = selected?.id === addon.id;
              return (
                <div
                  key={addon.id}
                  className={`rounded-lg border bg-white p-3 ${
                    isSelected ? "border-cyan-500 ring-1 ring-cyan-500" : "border-slate-200"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">
                        {addon.name}{" "}
                        <span className="text-cyan-700">{addon.priceLabel}</span>
                        <span className="text-xs font-normal text-slate-500">
                          {" "}
                          / {addon.days} days
                        </span>
                      </p>
                      <p className="text-xs text-slate-500">{addon.blurb}</p>
                    </div>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setSelected(isSelected ? null : addon);
                        setError(null);
                      }}
                      className="shrink-0 rounded-lg bg-cyan-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-cyan-700 disabled:opacity-50"
                    >
                      {isSelected ? "Selected" : active ? "Extend" : "Buy"}
                    </button>
                  </div>

                  {isSelected && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      {busy ? (
                        <p className="py-3 text-center text-sm text-slate-600">
                          Confirming your payment…
                        </p>
                      ) : (
                        <PaypalCheckout
                          createOrder={createOrder}
                          onApproved={onApproved}
                          onError={onError}
                          onCancel={onCancel}
                        />
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <p className="mt-2 rounded-lg bg-rose-50 px-3 py-2 text-xs text-rose-700">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
