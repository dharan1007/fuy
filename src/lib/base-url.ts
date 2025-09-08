// src/lib/base-url.ts

/**
 * Resolve the app origin (protocol + host + optional port), no trailing slash.
 * Prefers public env vars; falls back to NEXTAUTH_URL; finally localhost.
 */
export function baseUrl(): string {
  const raw =
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.NEXTAUTH_URL ||
    "http://localhost:3000";
  return raw.replace(/\/+$/, "");
}

/** Safely extract an origin string from Request/URL/string, with env fallback. */
export function getOrigin(input?: Request | URL | string): string {
  if (input) {
    // URL object
    if (input instanceof URL) return input.origin;
    // string that might be a full URL
    if (typeof input === "string") {
      try {
        return new URL(input).origin;
      } catch {
        // not a full URL, fall through
      }
    }
    // Request object
    if (typeof input === "object" && "url" in input) {
      try {
        return new URL((input as Request).url).origin;
      } catch {
        // fall through
      }
    }
  }
  return baseUrl();
}

/**
 * Overloads:
 *  - absoluteUrl(path: string): string
 *  - absoluteUrl(input: URL): string
 *  - absoluteUrl(input: Request): string
 *  - absoluteUrl(req: Request, path: string): string
 *  - absoluteUrl(pathOrUrl: string, opts?: { base?: string | URL | Request }): string
 */
export function absoluteUrl(path: string): string;
export function absoluteUrl(input: URL): string;
export function absoluteUrl(input: Request): string;
export function absoluteUrl(req: Request, path: string): string;
export function absoluteUrl(
  pathOrURL: string | URL | Request,
  opts?: { base?: string | URL | Request }
): string;
export function absoluteUrl(
  a: string | URL | Request,
  b?: string | { base?: string | URL | Request }
): string {
  // Case: absoluteUrl(URL) or absoluteUrl(Request)
  if (a instanceof URL) return a.toString();
  if (typeof a !== "string" && a) {
    // Request overloads
    if (typeof b === "string") {
      const origin = getOrigin(a);
      return new URL(b, origin.endsWith("/") ? origin : origin + "/").toString();
    }
    // absoluteUrl(Request) -> return its URL
    return (a as Request).url;
  }

  // Case: absoluteUrl(path: string) or absoluteUrl(path, { base })
  const path = a || "/";
  const base =
    (b && typeof b === "object" && "base" in b ? (b as any).base : undefined) ??
    undefined;
  const origin = getOrigin(base);
  const baseWithSlash = origin.endsWith("/") ? origin : origin + "/";
  return new URL(path, baseWithSlash).toString();
}

/**
 * WebAuthn RP settings.
 * - origin: full origin used for verifications
 * - rpID: effective RP ID (host only)
 */
export function rpSettings(input?: Request | URL | string) {
  const origin = getOrigin(input);
  const rpID =
    process.env.NEXT_PUBLIC_RP_ID ||
    (typeof window === "undefined"
      ? new URL(origin).host
      : window.location.hostname);
  return { origin: origin.replace(/\/+$/, ""), rpID };
}
