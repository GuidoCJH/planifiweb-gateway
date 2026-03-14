import type { NextConfig } from "next";

function resolveConnectSources(): string[] {
  const sources = new Set<string>(["'self'"]);
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;

  if (apiUrl) {
    try {
      sources.add(new URL(apiUrl).origin);
    } catch {
      // Ignore malformed URL in config and keep same-origin CSP.
    }
  }

  return [...sources];
}

function normalizeProxyTarget(value?: string): string | null {
  const normalized = value?.trim().replace(/\/$/, "");
  if (!normalized) {
    return null;
  }

  try {
    return new URL(normalized).toString().replace(/\/$/, "");
  } catch {
    return null;
  }
}

const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob:",
      `connect-src ${resolveConnectSources().join(" ")}`,
      "frame-ancestors 'none'",
      "base-uri 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  turbopack: {
    root: process.cwd(),
  },
  async rewrites() {
    const rewrites = [];
    const apiTarget = normalizeProxyTarget(process.env.API_PROXY_TARGET);
    const appTarget = normalizeProxyTarget(process.env.APP_PROXY_TARGET);

    if (apiTarget) {
      rewrites.push({
        source: "/api/:path*",
        destination: `${apiTarget}/api/:path*`,
      });
    }

    if (appTarget) {
      rewrites.push(
        {
          source: "/app",
          destination: `${appTarget}/app`,
        },
        {
          source: "/app/:path*",
          destination: `${appTarget}/app/:path*`,
        },
      );
    }

    return rewrites;
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
