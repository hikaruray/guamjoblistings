import type { MetadataRoute } from "next";
import { getPublicJobs } from "@/lib/public-jobs";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { SITE_URL } from "@/lib/config";

// Follow the deployment rather than a hardcoded host. This used to read
// "https://www.guamjoblisting.com" — the wrong host (this site is canonical on
// the apex, not www) and the wrong domain while we are on *.vercel.app. A
// hardcoded origin also cost us a day on 2026-08-29: it was mistaken for proof
// that an env var had reached the build. Set NEXT_PUBLIC_SITE_URL instead.
const BASE_URL = SITE_URL;

// Jobs come and go, so a sitemap frozen at build time goes stale between
// deploys. Rebuild it hourly instead of on every crawl.
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes = [
    "",
    "/jobs",
    "/post-a-job",
    "/blog",
    "/how-it-works",
    "/about-us",
    "/faq",
    "/contact",
    "/privacy",
    "/terms",
  ].map((path) => ({
    url: `${BASE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "daily" as const,
    priority: path === "" ? 1 : 0.8,
  }));

  // Real, approved postings. This used to list the placeholder seed jobs that
  // were deleted on 2026-08-29. A database hiccup must not fail the build, so
  // fall back to no job URLs rather than throwing.
  let jobRoutes: MetadataRoute.Sitemap = [];
  try {
    const jobs = await getPublicJobs();
    jobRoutes = jobs.map((job) => ({
      url: `${BASE_URL}/jobs/${job.id}`,
      lastModified: new Date(job.postedAt),
      changeFrequency: "weekly" as const,
      priority: 0.6,
    }));
  } catch (err) {
    console.warn("[sitemap] could not load jobs; omitting job URLs", err);
  }

  // Migrated blog articles — kept at their original WordPress paths.
  const blogRoutes = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...jobRoutes, ...blogRoutes];
}
