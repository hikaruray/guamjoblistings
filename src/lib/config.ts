// Site-wide configuration. Email sending is enabled by setting RESEND_API_KEY
// in the environment (Vercel). Until then, applications are logged server-side
// so nothing is lost during development.

export const SITE_NAME = "Guam Job Listings";

// Owner always receives a copy (BCC) of every application for record-keeping.
export const OWNER_COPY_EMAIL = "ynishihira@gmail.com";

// Verified sending address (set up at launch with the domain's DNS records).
export const FROM_EMAIL = "Guam Job Listings <applications@guamjoblisting.com>";
