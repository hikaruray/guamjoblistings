import type { MetadataRoute } from "next";
import { JOBS } from "@/lib/jobs";
import { BLOG_POSTS } from "@/lib/blog-posts";
import { SITE_URL } from "@/lib/config";

// Follow the deployment rather than a hardcoded host. This used to read
// "https://www.guamjoblisting.com" — the wrong host (this site is canonical on
// the apex, not www) and the wrong domain while we are on *.vercel.app. A
// hardcoded origin also cost us a day on 2026-08-29: it was mistaken for proof
// that an env var had reached the build. Set NEXT_PUBLIC_SITE_URL instead.
const BASE_URL = SITE_URL;

export default function sitemap(): MetadataRoute.Sitemap {
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

  const jobRoutes = JOBS.map((job) => ({
    url: `${BASE_URL}/jobs/${job.id}`,
    lastModified: new Date(job.postedAt),
    changeFrequency: "weekly" as const,
    priority: 0.6,
  }));

  // Migrated blog articles — kept at their original WordPress paths.
  const blogRoutes = BLOG_POSTS.map((post) => ({
    url: `${BASE_URL}/${post.slug}`,
    lastModified: new Date(post.modified),
    changeFrequency: "monthly" as const,
    priority: 0.5,
  }));

  return [...staticRoutes, ...jobRoutes, ...blogRoutes];
}
