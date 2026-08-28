import type { NextConfig } from "next";

// ── Build-time guard for NEXT_PUBLIC_* ────────────────────────────────────
//
// 2026-08-29. A missing NEXT_PUBLIC_SUPABASE_* on Vercel did **not** fail the
// build. It produced a green deploy in which `isSupabaseConfigured()` had been
// constant-folded to `false`, so every sign-in / sign-up screen quietly showed
// "Sign-in is not available yet" and the entire authenticated half of the site
// was dead — with no error anywhere. See ENGINEERING_LESSONS.md.
//
// NEXT_PUBLIC_ values are inlined at BUILD time. A wrong or empty value can
// therefore only be caught here; by runtime the mistake is already baked into
// the JS the browser downloads. So: fail loudly instead of shipping a site
// whose login is silently switched off.
//
// Local development without Supabase stays supported (that is a deliberate
// mode — see src/lib/supabase-browser.ts). This only fires on a Vercel
// *production* build.

type Check = {
  name: string;
  validate?: (value: string) => string | null; // returns an error, or null
};

const REQUIRED_PUBLIC_ENV: Check[] = [
  {
    name: "NEXT_PUBLIC_SUPABASE_URL",
    validate: (value) => {
      let url: URL;
      try {
        url = new URL(value);
      } catch {
        return "is not a valid URL";
      }
      if (url.protocol !== "https:") return "must start with https://";
      return null;
    },
  },
  {
    name: "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    validate: (value) =>
      value.length < 40 ? "looks too short to be a real anon key" : null,
  },
];

// Vercel renders the value of a "Sensitive" variable as bullets (U+2022). If
// that display text is ever copied back into the field, the placeholder gets
// saved as the real value — and it breaks fetch() with
// "String contains non ISO-8859-1 code point". Catch it at build time.
function findNonLatin1(value: string): string | null {
  for (const char of value) {
    const code = char.codePointAt(0) ?? 0;
    if (code > 255) return `U+${code.toString(16).toUpperCase().padStart(4, "0")}`;
  }
  return null;
}

function assertPublicEnvForProduction() {
  if (process.env.VERCEL_ENV !== "production") return;

  const problems: string[] = [];

  for (const { name, validate } of REQUIRED_PUBLIC_ENV) {
    const raw = process.env[name];

    if (raw === undefined) {
      problems.push(`${name} is not set at all`);
      continue;
    }
    const value = raw.trim();
    if (value === "") {
      problems.push(`${name} is set but empty (or only whitespace)`);
      continue;
    }
    const badChar = findNonLatin1(value);
    if (badChar) {
      problems.push(
        `${name} contains ${badChar} — this is the bullet character Vercel shows for a hidden value. The placeholder was pasted in instead of the real value.`,
      );
      continue;
    }
    const error = validate?.(value);
    if (error) problems.push(`${name} ${error}`);
  }

  if (problems.length === 0) return;

  throw new Error(
    [
      "",
      "Refusing to build for production: the browser-side Supabase configuration is broken.",
      "",
      ...problems.map((p) => `  • ${p}`),
      "",
      "Without these, sign-in and sign-up are switched off for every visitor and",
      "nothing on the site reports an error. Fix the values in",
      "Vercel → Settings → Environments → Production, then redeploy.",
      "",
      "NEXT_PUBLIC_ values are baked in at build time, so re-saving them is not",
      "enough on its own — the deployment has to be rebuilt afterwards.",
      "",
    ].join("\n"),
  );
}

assertPublicEnvForProduction();

// NEXT_PUBLIC_SITE_URL only degrades to http://localhost:3000, which breaks
// confirmation-email links rather than the whole site — warn, do not block.
if (process.env.VERCEL_ENV === "production" && !process.env.NEXT_PUBLIC_SITE_URL?.trim()) {
  console.warn(
    "\n⚠  NEXT_PUBLIC_SITE_URL is not set. Auth and confirmation emails will link to http://localhost:3000.\n",
  );
}

const nextConfig: NextConfig = {
  async redirects() {
    return [
      // ── Old WordPress URLs (2026-08-29) ──────────────────────────────
      // The WordPress sitemap had 73 URLs; this Next.js site answers 11 of
      // them. Most of the rest SHOULD 404 — /resume/ and /author/* were the
      // 2026-07-17 exposure we deliberately took down, and the old listing /
      // taxonomy / membership pages have no equivalent here.
      //
      // These three do have a page whose content genuinely corresponds, so
      // they are redirected rather than dropped. Mokaru's lesson: Google
      // treats a 301 to an unrelated page as a soft 404 and you lose the
      // traffic anyway, so "just send everything to the homepage" is the
      // worst option. Only redirect where the destination really matches.
      {
        // Tag archives for the 9 migrated blog posts → the blog index.
        source: "/tag/:slug",
        destination: "/blog",
        permanent: true,
      },
      {
        // Old paid-advertising pages → where you actually post a job now.
        source: "/pricing",
        destination: "/post-a-job",
        permanent: true,
      },
      {
        source: "/advertising",
        destination: "/post-a-job",
        permanent: true,
      },
      // The old WordPress site had duplicate index.php-prefixed URLs indexed
      // (e.g. /index.php/blog/). Normalise them to the clean path with a 301.
      {
        source: "/index.php/:path*",
        destination: "/:path*",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;
