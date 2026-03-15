import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function shouldNoIndex(pathname: string) {
  return (
    pathname === "/app" ||
    pathname.startsWith("/app/") ||
    pathname === "/api" ||
    pathname.startsWith("/api/")
  );
}

export function proxy(request: NextRequest) {
  const response = NextResponse.next();

  if (shouldNoIndex(request.nextUrl.pathname)) {
    response.headers.set(
      "X-Robots-Tag",
      "noindex, nofollow, noarchive, nosnippet",
    );
  }

  return response;
}

export const config = {
  matcher: ["/app", "/app/:path*", "/api", "/api/:path*"],
};
