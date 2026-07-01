import type { MetadataRoute } from "next";
import { JOBS } from "@/lib/jobs";

const BASE_URL = "https://www.guamjoblisting.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const staticRoutes = ["", "/jobs", "/post-a-job"].map((path) => ({
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

  return [...staticRoutes, ...jobRoutes];
}
