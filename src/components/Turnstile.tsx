"use client";

// Cloudflare Turnstile — the "are you human" check in front of every Supabase
// Auth call that sends an email or creates an account (2026-10-17).
//
// Why: by 2026-10-16, 579 of 585 accounts had never signed in. Bots filled the
// employer sign-up form ~15 times a day with random names and other people's
// real email addresses, and each one made Supabase send a confirmation email
// through our Resend account (the 100/day quota shared by three businesses)
// to a stranger. The form called Supabase straight from the browser, so no
// check in our own code could stop it — the bot can call Supabase directly.
//
// So the check is enforced by Supabase itself (Authentication → Attack
// Protection → CAPTCHA, provider Turnstile). Once that is ON, signUp,
// signInWithPassword, signInWithOtp and resetPasswordForEmail are all refused
// without a fresh token — which is why all four forms carry this widget.
//
// Without NEXT_PUBLIC_TURNSTILE_SITE_KEY (local dev) the widget renders
// nothing and the forms work as before. Production refuses to build without it
// (next.config.ts), because with CAPTCHA on in Supabase a missing widget means
// nobody can sign in.

import { useEffect, useRef, useState } from "react";

export const TURNSTILE_SITE_KEY =
  process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY?.trim() ?? "";

/** True when the forms must wait for a token before submitting. */
export const captchaRequired = TURNSTILE_SITE_KEY !== "";

type TurnstileApi = {
  render: (
    el: HTMLElement,
    options: {
      sitekey: string;
      callback: (token: string) => void;
      "expired-callback": () => void;
      "error-callback": () => void;
      theme?: "light" | "dark" | "auto";
    },
  ) => string;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_SRC =
  "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

let scriptPromise: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.onload = () =>
      window.turnstile
        ? resolve(window.turnstile)
        : reject(new Error("Turnstile did not load"));
    script.onerror = () => {
      scriptPromise = null; // allow a retry on the next mount
      reject(new Error("Turnstile did not load"));
    };
    document.head.appendChild(script);
  });
  return scriptPromise;
}

/**
 * Renders the widget and reports the current token (null until solved, and
 * again after it expires). A token works once: after any Supabase call that
 * used it, remount this component (change its `key`) to get a fresh one.
 */
export default function Turnstile({
  onToken,
}: {
  onToken: (token: string | null) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  // Keep the latest callback without re-rendering the widget when it changes.
  const onTokenRef = useRef(onToken);
  useEffect(() => {
    onTokenRef.current = onToken;
  });

  useEffect(() => {
    if (!captchaRequired || !ref.current) return;
    let widgetId: string | null = null;
    let cancelled = false;
    const el = ref.current;

    loadTurnstile()
      .then((api) => {
        if (cancelled) return;
        widgetId = api.render(el, {
          sitekey: TURNSTILE_SITE_KEY,
          theme: "light",
          callback: (token) => {
            setFailed(false);
            onTokenRef.current(token);
          },
          "expired-callback": () => onTokenRef.current(null),
          "error-callback": () => {
            setFailed(true);
            onTokenRef.current(null);
          },
        });
      })
      .catch(() => setFailed(true));

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) window.turnstile.remove(widgetId);
      onTokenRef.current(null);
    };
  }, []);

  if (!captchaRequired) return null;

  return (
    <div>
      <div ref={ref} className="min-h-[65px]" />
      {failed && (
        <p className="mt-2 text-sm text-rose-700">
          We couldn&apos;t run the security check. Please refresh the page and
          try again.
        </p>
      )}
    </div>
  );
}

/**
 * Supabase's refusal reads "captcha protection: request disallowed (...)".
 * Say something a person can act on instead.
 */
export function captchaErrorMessage(message: string): string {
  return /captcha/i.test(message)
    ? "The security check expired. Please try again."
    : message;
}
