// src/lib/base-url.ts
import { headers } from "next/headers";

/**
 * Get the base URL for building absolute links.
 * - Uses NEXT_PUBLIC_APP_URL if defined (e.g. "https://yourdomain.com")
 * - Otherwise falls back to request headers (x-forwarded-host/proto).
 * - Defaults to http://localhost:3000 in dev if nothing is found.
 */
export function getBaseUrl(): string {
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, "");
  }

  try {
    const h = headers();
    const host = h.get("x-forwarded-host") ?? h.get("host");
    if (host) {
      const proto =
        h.get("x-forwarded-proto") ??
        (process.env.NODE_ENV === "production" ? "https" : "http");
      return `${proto}://${host}`;
    }
  } catch {
    // no-op
  }

  return "http://localhost:3000";
}

/** Build an absolute URL from a request + path (works in route handlers). */
export function absoluteUrl(req: Request, path: string): string {
  // Prefer explicit public URL
  const envUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl && envUrl.trim().length > 0) {
    return `${envUrl.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
  }

  // Derive from request headers
  const host =
    req.headers.get("x-forwarded-host") ||
    req.headers.get("host") ||
    "localhost:3000";
  const proto = (req.headers.get("x-forwarded-proto") || "http").split(",")[0];
  const base = `${proto}://${host}`;
  return `${base}${path.startsWith("/") ? "" : "/"}${path}`;
}
