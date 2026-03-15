const DEFAULT_LOCAL_API_URL = "http://127.0.0.1:8000";
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);

let csrfTokenCache: string | null = null;
let csrfTokenPromise: Promise<string> | null = null;

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

function shouldAttachCsrf(path: string, init: RequestInit): boolean {
  const method = (init.method ?? "GET").toUpperCase();
  if (!STATE_CHANGING_METHODS.has(method)) {
    return false;
  }

  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return normalizedPath !== "/api/auth/csrf";
}

async function fetchCsrfToken(): Promise<string> {
  const response = await fetch(buildApiUrl("/api/auth/csrf"), {
    method: "GET",
    cache: "no-store",
    credentials: "include",
  });

  if (!response.ok) {
    throw new Error(await parseApiError(response));
  }

  const payload = (await response.json()) as { csrf_token?: unknown };
  if (typeof payload.csrf_token !== "string" || !payload.csrf_token) {
    throw new Error("No se pudo obtener el token CSRF.");
  }

  csrfTokenCache = payload.csrf_token;
  return payload.csrf_token;
}

export async function primeCsrfToken(): Promise<string> {
  if (csrfTokenCache) {
    return csrfTokenCache;
  }
  if (!csrfTokenPromise) {
    csrfTokenPromise = fetchCsrfToken().finally(() => {
      csrfTokenPromise = null;
    });
  }
  return csrfTokenPromise;
}

export function clearCsrfToken(): void {
  csrfTokenCache = null;
  csrfTokenPromise = null;
}

export async function apiFetch(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  const headers = new Headers(init.headers ?? {});
  const needsCsrf = shouldAttachCsrf(path, init);

  if (needsCsrf) {
    headers.set("X-CSRF-Token", await primeCsrfToken());
  }

  let response = await fetch(buildApiUrl(path), {
    ...init,
    headers,
    credentials: "include",
  });

  if (needsCsrf && response.status === 403) {
    let detail = "";
    try {
      const payload = (await response.clone().json()) as { detail?: unknown };
      if (typeof payload.detail === "string") {
        detail = payload.detail;
      }
    } catch {
      // noop
    }

    if (detail === "Invalid CSRF token.") {
      clearCsrfToken();
      headers.set("X-CSRF-Token", await primeCsrfToken());
      response = await fetch(buildApiUrl(path), {
        ...init,
        headers,
        credentials: "include",
      });
    }
  }

  return response;
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
