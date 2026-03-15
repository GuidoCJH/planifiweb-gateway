import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/discovery";

export default function robots(): MetadataRoute.Robots {
  const host = new URL(SITE_URL).host;

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
      },
      {
        userAgent: "GPTBot",
        disallow: "/",
      },
      {
        userAgent: "Google-Extended",
        disallow: "/",
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host,
  };
}
