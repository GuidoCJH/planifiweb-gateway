import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://tu-dominio.com";
const now = new Date();

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    "",
    "/dashboard",
    "/login",
    "/register",
    "/terminos",
    "/privacidad",
  ].map((path) => ({
    url: `${siteUrl}${path}`,
    lastModified: now,
    changeFrequency: path === "" ? "weekly" : "monthly",
    priority: path === "" ? 1 : 0.7,
  }));
}
