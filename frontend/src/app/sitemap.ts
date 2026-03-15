import type { MetadataRoute } from "next";
import { SITE_URL, publicGuideSummaries, publicIndexableRoutes } from "@/lib/discovery";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  const guidePaths = new Set(publicGuideSummaries.map((guide) => `/${guide.slug}`));

  return publicIndexableRoutes.map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: now,
    changeFrequency: path === "/" ? "weekly" : guidePaths.has(path) ? "weekly" : "monthly",
    priority: path === "/" ? 1 : guidePaths.has(path) ? 0.85 : 0.45,
  }));
}
