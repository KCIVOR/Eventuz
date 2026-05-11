import type { EventuzRole } from "./roles";
import { getRequiredRoleForPathname } from "./guards";

export function homeForRole(role: EventuzRole): string {
  switch (role) {
    case "organizer":
      return "/organizer";
    case "super_admin":
      return "/super-admin";
    case "staff":
      return "/staff";
    case "attendee":
    default:
      return "/attendee/event";
  }
}

/**
 * Open redirects (e.g. ?next=) must match the user's role or we send them home for that role.
 */
export function safeNextPathForRole(nextParam: string | null, role: EventuzRole): string {
  const fallback = homeForRole(role);
  if (!nextParam || !nextParam.startsWith("/")) return fallback;
  if (nextParam.startsWith("//")) return fallback;
  if (nextParam.startsWith("/login") || nextParam.startsWith("/register")) return fallback;

  const required = getRequiredRoleForPathname(nextParam);
  if (required === null) return nextParam;
  if (required === role) return nextParam;
  return fallback;
}
