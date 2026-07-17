import type { MetadataRoute } from "next";
import { JOBS } from "@/lib/jobs";
import { BLOG_POSTS } from "@/lib/blog-posts";

const BASE_URL = "https://www.guamjoblisting.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/jobs", "/post-a-job", "/blog"].map((path) => ({
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
