"use client";

import type { NavItem, NavSection } from "@/components/layout/navigation";
import type { EventuzRole } from "@/lib/auth/roles";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

const roleLabels: Record<EventuzRole, string> = {
  attendee: "Guest",
  organizer: "Organizer",
  staff: "Staff",
  super_admin: "Platform admin",
};

type Props = {
  role: EventuzRole;
  sections: NavSection[];
  onNavigate?: () => void;
};

function subscribeLocationHash(onChange: () => void) {
  if (typeof window === "undefined") return () => { };
  window.addEventListener("hashchange", onChange);
  return () => window.removeEventListener("hashchange", onChange);
}

function getLocationHashSnapshot(): string {
  return typeof window !== "undefined" ? window.location.hash : "";
}

function pathMatchesItem(pathname: string, hash: string, item: NavItem): boolean {
  const [path, frag] = item.href.split("#");
  const normalizedPath = path || "/";
  if (frag) {
    if (pathname !== normalizedPath) return false;
    return hash === `#${frag}`;
  }
  return pathname === normalizedPath;
}

const NavIcons: Record<string, React.ReactNode> = {
  dashboard: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="7" height="9" x="3" y="3" rx="1" /><rect width="7" height="5" x="14" y="3" rx="1" /><rect width="7" height="9" x="14" y="12" rx="1" /><rect width="7" height="5" x="3" y="16" rx="1" />
    </svg>
  ),
  setup: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h7.5" /><path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" /><path d="m22 22-1.5-1.5" /><circle cx="18.5" cy="18.5" r="2.5" />
    </svg>
  ),
  attendees: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  seating: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M9 3v18" /><path d="M15 3v18" />
    </svg>
  ),
  scanner: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="5" height="5" x="3" y="3" rx="1" /><rect width="5" height="5" x="16" y="3" rx="1" /><rect width="5" height="5" x="3" y="16" rx="1" /><path d="M21 16h-3a2 2 0 0 0-2 2v3" /><path d="M21 21v.01" /><path d="M12 7v3a2 2 0 0 1-2 2H7" /><path d="M3 12h.01" /><path d="M12 3h.01" /><path d="M12 16v.01" /><path d="M16 12h1" /><path d="M21 12v.01" /><path d="M12 21v-1" />
    </svg>
  ),
  staff: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" /><path d="m9 12 2 2 4-4" />
    </svg>
  ),
  settings: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" /><circle cx="12" cy="12" r="3" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14" /><path d="M12 5v14" />
    </svg>
  ),
  audit: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" /><path d="M3 9h18" /><path d="M3 15h18" /><path d="M12 3v18" />
    </svg>
  ),
  email: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  map: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" /><circle cx="12" cy="10" r="3" />
    </svg>
  ),
  terms: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M16 13H8" /><path d="M16 17H8" /><path d="M10 9H8" />
    </svg>
  ),
  tickets: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z" /><path d="M13 5v2" /><path d="M13 17v2" /><path d="M13 11v2" />
    </svg>
  )
};

export function SidebarNav({ role, sections, onNavigate }: Props) {
  const pathname = usePathname() ?? "";
  const hash = useSyncExternalStore(
    subscribeLocationHash,
    getLocationHashSnapshot,
    () => ""
  );

  return (
    <div className="flex h-full flex-col">
      {/* Role label — DS .sec-label style */}
      <p
        className="mb-5 px-3"
        style={{
          fontSize: "10px",
          fontWeight: 600,
          letterSpacing: "0.35em",
          textTransform: "uppercase",
          color: "#C9A96E",
        }}
      >
        {roleLabels[role]}
      </p>

      <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-7">
        {sections.map((section, sectionIndex) => (
          <section
            key={section.id}
            aria-labelledby={`sidebar-section-${section.id}`}
            style={
              sectionIndex > 0
                ? { borderTop: "1px solid #EDE8E3", paddingTop: "24px" }
                : undefined
            }
          >
            {/* Section label */}
            <h2
              id={`sidebar-section-${section.id}`}
              className="mb-2 px-3"
              style={{
                fontSize: "10px",
                fontWeight: 500,
                letterSpacing: "0.25em",
                textTransform: "uppercase",
                color: "#AEA89F",
              }}
            >
              {section.label}
            </h2>

            <ul className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = pathMatchesItem(pathname, hash, item);
                const Icon = item.icon ? NavIcons[item.icon] : null;
                return (
                  <li key={`${section.id}-${item.id}`}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={() => onNavigate?.()}
                      aria-current={active ? "page" : undefined}
                      className="sidebar-link-hover group flex items-center gap-3"
                      style={{
                        padding: "10px 12px",
                        fontSize: "13px",
                        fontWeight: active ? 500 : 300,
                        color: active ? "#C9A96E" : "#2E2825",
                        background: active ? "#FDF6EE" : "transparent",
                        borderRadius: "2px",
                        borderLeft: active ? "2px solid #C9A96E" : "2px solid transparent",
                        textDecoration: "none",
                        transition: "all 0.15s ease",
                      }}
                    >
                      {Icon && (
                        <span className={`transition-colors ${active ? 'text-[#C9A96E]' : 'text-[#AEA89F] group-hover:text-[#2E2825]'}`}>
                          {Icon}
                        </span>
                      )}
                      <span>{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        ))}
      </nav>
    </div>
  );
}
