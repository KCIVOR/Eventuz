import { headers } from "next/headers";

/**
 * Canonical public origin for server-side redirects (HitPay return URL, etc.).
 * Prefer NEXT_PUBLIC_SITE_URL in production.
 */
export async function getAppOrigin(): Promise<string> {
  const env = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (env) return env.replace(/\/$/, "");

  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? "http";
  if (host) return `${proto}://${host}`;
  return "http://localhost:3000";
}
