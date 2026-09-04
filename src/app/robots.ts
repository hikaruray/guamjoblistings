import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/config";

// Same rule as the sitemap next door: follow the deployment, never a literal.
// This file kept pointing crawlers at https://www.guamjoblisting.com/sitemap.xml
// after sitemap.ts was fixed on 2026-08-29 — the wrong host (the site is
// canonical on the apex; www answers 308) and, before the cutover, the wrong
// domain entirely. Fixing one of a pair and not the other is how these drift.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/admin"],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  };
}
