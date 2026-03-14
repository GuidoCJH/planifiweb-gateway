const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:8000";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

function isAbsoluteUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}

function resolveDefaultApiUrl(): string {
  const configuredApiUrl = process.env.NEXT_PUBLIC_API_URL?.trim();

  if (typeof window === "undefined") {
    return configuredApiUrl ? trimTrailingSlash(configuredApiUrl) : DEFAULT_LOCAL_API_URL;
  }

  const { hostname, origin, port } = window.location;
  if (configuredApiUrl) {
    return trimTrailingSlash(configuredApiUrl);
  }

  if (hostname === "localhost" || hostname === "127.0.0.1") {
    // Same-origin fallback for local gateway setups only when NEXT_PUBLIC_API_URL is absent.
    if (port === "8080") {
      return origin;
    }
    return DEFAULT_LOCAL_API_URL;
  }
  return origin;
}

export const API_BASE_URL = trimTrailingSlash(resolveDefaultApiUrl());

export function buildApiUrl(path: string): string {
  if (isAbsoluteUrl(path)) {
    return path;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!API_BASE_URL) {
    return normalizedPath;
  }

  if (API_BASE_URL.startsWith("/")) {
    if (normalizedPath === API_BASE_URL || normalizedPath.startsWith(`${API_BASE_URL}/`)) {
      return normalizedPath;
    }
    if (API_BASE_URL === "/api" && normalizedPath.startsWith("/api/")) {
      return normalizedPath;
    }
    return `${API_BASE_URL}${normalizedPath}`;
  }

  if (API_BASE_URL.endsWith("/api")) {
    if (normalizedPath === "/api") {
      return API_BASE_URL;
    }
    if (normalizedPath.startsWith("/api/")) {
      return `${API_BASE_URL}${normalizedPath.slice(4)}`;
    }
  }

  return `${API_BASE_URL}${normalizedPath}`;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  return fetch(buildApiUrl(path), {
    ...init,
    credentials: "include",
  });
}

export async function parseApiError(response: Response): Promise<string> {
  try {
    const body = await response.json();
    if (typeof body.detail === "string") {
      return body.detail;
    }
    if (Array.isArray(body.detail)) {
      const first = body.detail.find(
        (item: unknown) =>
          typeof item === "object" && item !== null && "msg" in item,
      ) as { msg?: unknown } | undefined;
      if (first && typeof first.msg === "string") {
        return first.msg;
      }
    }
  } catch {
    // noop
  }
  return `Request failed with status ${response.status}`;
}
