import type { EventuzRole } from "./roles";

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
      return "/attendee";
  }
}
