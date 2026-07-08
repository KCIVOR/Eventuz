import { headers } from "next/headers";

function isLocalHost(hostname: string) {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function normalizePublicOrigin(value: string): string {
  const trimmed = value.trim().replace(/\/$/, "");
  if (!trimmed) return "";

  try {
    const url = new URL(trimmed);
    if (url.protocol === "http:" && !isLocalHost(url.hostname)) {
      url.protocol = "https:";
    }
    url.pathname = "";
    url.search = "";
    url.hash = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return trimmed;
  }
}

/**
 * Canonical public origin for server-side redirects (HitPay return URL, etc.).
 * Prefer NEXT_PUBLIC_SITE_URL in production.
 */
export async function getAppOrigin(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return normalizePublicOrigin(env);

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return normalizePublicOrigin(`${proto}://${host}`);
  return "http://localhost:3000";
}
