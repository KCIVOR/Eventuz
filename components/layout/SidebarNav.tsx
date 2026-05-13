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
  if (typeof window === "undefined") return () => {};
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
                return (
                  <li key={`${section.id}-${item.id}`}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={() => onNavigate?.()}
                      aria-current={active ? "page" : undefined}
                      className="sidebar-link-hover"
                      style={{
                        display: "block",
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
                      {item.label}
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
