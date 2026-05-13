/**
 * Opt in with NEXT_PUBLIC_AUTH_DEBUG=true, or it runs in development unless
 * NEXT_PUBLIC_AUTH_DEBUG=false. Never log secrets (passwords, tokens).
 */

function envFlag(name: string): boolean | null {
  const v = process.env[name]?.trim().toLowerCase();
  if (v === "true" || v === "1" || v === "yes") return true;
  if (v === "false" || v === "0" || v === "no") return false;
  return null;
}

export function isAuthDebugEnabled(): boolean {
  const explicit = envFlag("NEXT_PUBLIC_AUTH_DEBUG");
  if (explicit !== null) return explicit;
  return process.env.NODE_ENV === "development";
}

type AuthDebugPayload = Record<string, unknown>;

export function authDebug(tag: string, payload: AuthDebugPayload): void {
  if (!isAuthDebugEnabled()) return;
  console.log(`[eventuz:auth:${tag}]`, payload);
}

function envFlagTrue(name: string): boolean {
  const v = process.env[name]?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}

/** Extra middleware request logs (can be noisy on high traffic). */
export function isAuthDebugVerbose(): boolean {
  return isAuthDebugEnabled() && envFlagTrue("NEXT_PUBLIC_AUTH_DEBUG_VERBOSE");
}

/**
 * Hostname from NEXT_PUBLIC_SUPABASE_URL for logs (no path, no keys). Empty if unset/invalid.
 */
export function authSupabaseApiHost(): string | null {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

/**
 * Count / list Supabase auth-related cookie names only (never values).
 */
export function authCookieNamesForLog(
  cookies: Iterable<{ name: string }>
): { supabaseAuthCookieCount: number; supabaseAuthCookieNames: string[] } {
  const names: string[] = [];
  for (const c of cookies) {
    if (c.name.includes("auth-token") || c.name.startsWith("sb-")) {
      names.push(c.name);
    }
  }
  return { supabaseAuthCookieCount: names.length, supabaseAuthCookieNames: names };
}
