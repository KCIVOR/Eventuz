import type { EventuzRole } from "@/lib/auth/roles";

export type NavItem = {
  id: string;
  label: string;
  href: string;
  icon?: string;
};

/** Sidebar section — groups links under a visible heading (desktop + mobile drawer). */
export type NavSection = {
  id: string;
  label: string;
  items: NavItem[];
};

export type NavContext = {
  eventId?: string | null;
};

export function roleHomeHref(role: EventuzRole): string {
  switch (role) {
    case "attendee":
      return "/attendee/event";
    case "organizer":
      return "/organizer";
    case "staff":
      return "/staff";
    case "super_admin":
      return "/super-admin";
    default:
      return "/";
  }
}

/** Role-specific sidebar navigation in grouped sections. Empty roles return []. */
export function navSectionsForRole(role: EventuzRole, ctx: NavContext = {}): NavSection[] {
  const { eventId } = ctx;

  switch (role) {
    case "attendee":
      return [
        {
          id: "guest",
          label: "Guest experience",
          items: [
            { id: "dashboard", label: "Dashboard", href: "/attendee/event", icon: "dashboard" },
            { id: "seats", label: "Choose seats", href: "/attendee/event/seats", icon: "seating" },
            { id: "tickets", label: "Your tickets", href: "/attendee/event/tickets", icon: "tickets" },
          ],
        },
      ];
    case "organizer": {
      const sections: NavSection[] = [];

      if (!eventId) {
        sections.push({
          id: "get-started",
          label: "Get started",
          items: [
            {
              id: "create",
              label: "Create your event",
              href: "/organizer/events/new",
              icon: "plus",
            },
          ],
        });
      } else {
        sections.push({
          id: "event",
          label: "Your event",
          items: [
            {
              id: "dashboard",
              label: "Dashboard",
              href: `/organizer/events/${eventId}/dashboard`,
              icon: "dashboard",
            },
            { id: "setup", label: "Event setup", href: `/organizer/events/${eventId}`, icon: "setup" },
            {
              id: "tickets",
              label: "Ticket management",
              href: `/organizer/events/${eventId}/tickets`,
              icon: "tickets",
            },
            {
              id: "attendees",
              label: "Attendees",
              href: `/organizer/events/${eventId}/attendees`,
              icon: "attendees",
            },
            {
              id: "seating",
              label: "Seating",
              href: `/organizer/events/${eventId}/seating`,
              icon: "seating",
            },
            {
              id: "scanner",
              label: "Check-in scanner",
              href: `/organizer/events/${eventId}/scan`,
              icon: "scanner",
            },
            {
              id: "staff",
              label: "Staff access",
              href: `/organizer/events/${eventId}/staff`,
              icon: "staff",
            },
          ],
        });
      }

      // Always show settings
      sections.push({
        id: "settings",
        label: "Settings",
        items: [
          {
            id: "hitpay",
            label: "Payment settings",
            href: "/organizer/settings/hitpay",
            icon: "settings",
          },
        ],
      });

      return sections;
    }
    case "staff":
      return [
        {
          id: "workspace",
          label: "Workspace",
          items: [{ id: "assigned", label: "Assigned events", href: "/staff", icon: "dashboard" }],
        },
        {
          id: "check-in",
          label: "Check-in",
          items: [
            {
              id: "scanner",
              label: "Check-in scanner",
              href: eventId ? `/staff/events/${eventId}/scanner` : "/staff#event-scanners",
              icon: "scanner",
            },
            {
              id: "attendees",
              label: "Attendees",
              href: eventId ? `/staff/events/${eventId}/attendees` : "/staff#event-attendees",
              icon: "attendees",
            },
          ],
        },
      ];
    case "super_admin":
      return [
        {
          id: "administration",
          label: "Administration",
          items: [
            {
              id: "overview",
              label: "Platform overview",
              href: "/super-admin",
              icon: "dashboard",
            },
            { id: "users", label: "Users", href: "/super-admin/users", icon: "attendees" },
            { id: "events", label: "Events", href: "/super-admin/events", icon: "setup" },
            { id: "audit", label: "Audit log", href: "/super-admin/audit", icon: "audit" },
            {
              id: "smtp",
              label: "Email delivery",
              href: "/super-admin/smtp",
              icon: "email",
            },
            {
              id: "google-maps",
              label: "Google Maps",
              href: "/super-admin/google-maps",
              icon: "map",
            },
            {
              id: "terms",
              label: "Terms",
              href: "/super-admin/terms",
              icon: "terms",
            },
          ],
        },
      ];
    default:
      return [];
  }
}
