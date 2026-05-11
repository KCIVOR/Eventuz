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
