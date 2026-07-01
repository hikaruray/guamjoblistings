// Site-wide configuration. Email sending is enabled by setting RESEND_API_KEY
// in the environment (Vercel). Until then, applications are logged server-side
// so nothing is lost during development.

export const SITE_NAME = "Guam Job Listings";

// Single source of truth for the site's public origin. Used to build auth
// redirect links (magic link / email confirmation) so they always point at the
// right deployment. Set NEXT_PUBLIC_SITE_URL in the environment:
//   • Vercel preview/prod: https://guamjoblistings.vercel.app
//   • Custom domain later:  https://www.guamjoblisting.com
// Falls back to localhost for local development.
export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

// Owner always receives a copy (BCC) of every application for record-keeping.
export const OWNER_COPY_EMAIL = "ynishihira@gmail.com";

// Verified sending address (set up at launch with the domain's DNS records).
export const FROM_EMAIL = "Guam Job Listings <applications@guamjoblisting.com>";
