import type { NextRequest } from "next/server";
import type { EventuzRole } from "./roles";

/** Path prefixes that require an authenticated user with a matching profile role. */
const ROLE_ROUTE_PREFIX: { pathPrefix: string; role: EventuzRole }[] = [
  { pathPrefix: "/organizer", role: "organizer" },
  { pathPrefix: "/attendee", role: "attendee" },
  { pathPrefix: "/staff", role: "staff" },
  { pathPrefix: "/super-admin", role: "super_admin" },
];

export function getRequiredRoleForPathname(pathname: string): EventuzRole | null {
  const hit = ROLE_ROUTE_PREFIX.find(
    (r) => pathname === r.pathPrefix || pathname.startsWith(`${r.pathPrefix}/`)
  );
  return hit?.role ?? null;
}

export function roleMatchesProfile(
  profileRole: EventuzRole,
  requiredRole: EventuzRole
): boolean {
  return profileRole === requiredRole;
}

export type GuardResult = { ok: boolean; reason?: string };

/**
 * Cookie/session guard used when `NextRequest` is available (middleware).
 * Prefer `roleMatchesProfile` with DB-loaded role in layouts.
 */
export function placeholderAssertAccess(
  _request: NextRequest,
  _requiredRole: EventuzRole
): GuardResult {
  return { ok: true, reason: "deprecated — use middleware Supabase guard" };
}
