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

const linkBase =
  "block rounded-lg px-3 py-2.5 text-sm font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar-bg)]";
const linkInactive = "text-foreground/85 hover:bg-muted/70 hover:text-foreground";
const linkActive = "bg-primary/12 text-primary shadow-[inset_0_0_0_1px_rgba(114,47,55,0.12)]";

export function SidebarNav({ role, sections, onNavigate }: Props) {
  const pathname = usePathname() ?? "";
  const hash = useSyncExternalStore(
    subscribeLocationHash,
    getLocationHashSnapshot,
    () => ""
  );

  return (
    <div className="flex h-full flex-col">
      <p className="mb-5 px-3 text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {roleLabels[role]}
      </p>
      <nav aria-label="Primary navigation" className="flex flex-1 flex-col gap-7">
        {sections.map((section, sectionIndex) => (
          <section
            key={section.id}
            aria-labelledby={`sidebar-section-${section.id}`}
            className={
              sectionIndex > 0
                ? "border-t border-[var(--sidebar-border)] pt-6"
                : undefined
            }
          >
            <h2
              id={`sidebar-section-${section.id}`}
              className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground/90"
            >
              {section.label}
            </h2>
            <ul className="flex flex-col gap-1">
              {section.items.map((item) => {
                const active = pathMatchesItem(pathname, hash, item);
                return (
                  <li key={`${section.id}-${item.id}`}>
                    <Link
                      href={item.href}
                      prefetch={false}
                      onClick={() => onNavigate?.()}
                      className={`${linkBase} ${active ? linkActive : linkInactive}`}
                      aria-current={active ? "page" : undefined}
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
