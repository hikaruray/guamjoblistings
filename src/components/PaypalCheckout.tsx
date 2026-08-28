"use client";

import { useEffect, useRef, useState } from "react";
import { PAYPAL_CLIENT_ID } from "@/lib/config";

// Minimal typings for the parts of the PayPal JS SDK we use.
interface PaypalNamespace {
  Buttons: (opts: unknown) => {
    render: (el: HTMLElement) => Promise<void>;
    close?: () => void;
  };
}
declare global {
  interface Window {
    paypal?: PaypalNamespace;
  }
}

let sdkPromise: Promise<void> | null = null;

// Standard PayPal Checkout ONLY.
//
// This account is not approved for Advanced Card Payments (ACDC) — PayPal
// returned DENIED (processor PPCE) for merchant KSCHVM9TQ69P2, the same finding
// that forced MokaruGuam onto standard Checkout. The Buttons below still let a
// buyer pay by card as a guest via PayPal's own hosted flow, so no employer is
// required to have a PayPal account. Do not add card-fields here unless PayPal
// approves ACDC first.
function loadSdk(): Promise<void> {
  if (sdkPromise) return sdkPromise;
  sdkPromise = new Promise<void>((resolve, reject) => {
    if (window.paypal) return resolve();
    const s = document.createElement("script");
    const params = new URLSearchParams({
      "client-id": PAYPAL_CLIENT_ID,
      currency: "USD",
      intent: "capture", // must match the server's intent=CAPTURE order
      // Pin the buttons to English. Without this the SDK follows the BROWSER's
      // locale — a Japanese-locale visitor saw "PayPalで支払う" on a site that is
      // English-only (owner decision). Guam is a USD/en-US market.
      locale: "en_US",
    });
    s.src = `https://www.paypal.com/sdk/js?${params.toString()}`;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("PayPal SDK failed to load"));
    document.body.appendChild(s);
  });
  return sdkPromise;
}

export interface PaypalCheckoutProps {
  // Server creates the CAPTURE order and returns its id.
  createOrder: () => Promise<string>;
  // Buyer approved; hand the order id back so the parent can capture server-side.
  onApproved: (orderId: string) => Promise<void>;
  onError: (message: string) => void;
  onCancel?: () => void;
}

export default function PaypalCheckout({
  createOrder,
  onApproved,
  onError,
  onCancel,
}: PaypalCheckoutProps) {
  const buttonsRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<"loading" | "ready" | "failed">("loading");

  // Keep the latest callbacks in a ref: the PayPal Buttons instance is rendered
  // once, and must not capture stale closures from the first render.
  // Updated in an effect (not during render) — mutating a ref while rendering is
  // unsafe under concurrent rendering.
  const handlers = useRef({ createOrder, onApproved, onError, onCancel });
  useEffect(() => {
    handlers.current = { createOrder, onApproved, onError, onCancel };
  });

  useEffect(() => {
    let cancelled = false;

    loadSdk()
      .then(async () => {
        if (cancelled || !buttonsRef.current) return;
        const paypal = window.paypal;
        if (!paypal) throw new Error("PayPal SDK unavailable");

        await paypal
          .Buttons({
            style: { layout: "vertical", shape: "pill", label: "pay" },
            createOrder: () => handlers.current.createOrder(),
            onApprove: async (data: { orderID: string }) => {
              await handlers.current.onApproved(data.orderID);
            },
            // Buyer closed the PayPal window. No charge, no add-on — just tell
            // the parent so it can reset the UI.
            onCancel: () => handlers.current.onCancel?.(),
            onError: () =>
              handlers.current.onError(
                "Something went wrong during payment. You have not been charged.",
              ),
          })
          .render(buttonsRef.current);

        if (!cancelled) setMode("ready");
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) {
          setMode("failed");
          handlers.current.onError("Could not load the payment form.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div>
      {mode === "loading" && (
        <p className="py-4 text-center text-sm text-slate-500">
          Loading payment options…
        </p>
      )}
      <div ref={buttonsRef} />
      {mode === "ready" && (
        <p className="mt-2 text-center text-xs text-slate-500">
          Pay with PayPal or a debit/credit card. No PayPal account needed.
        </p>
      )}
      {mode === "failed" && (
        <p className="py-3 text-center text-sm text-rose-600">
          Could not load the payment form. Please try again shortly.
        </p>
      )}
    </div>
  );
}
