/**
 * Eventuz role identifiers — aligned with future Supabase profile / JWT claims.
 */
export const EVENTUZ_ROLES = [
  "attendee",
  "organizer",
  "staff",
  "super_admin",
] as const;

export type EventuzRole = (typeof EVENTUZ_ROLES)[number];

export function isEventuzRole(value: string): value is EventuzRole {
  return (EVENTUZ_ROLES as readonly string[]).includes(value);
}
