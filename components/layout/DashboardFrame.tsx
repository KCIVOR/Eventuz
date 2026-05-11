"use client";

import type { NavSection } from "@/components/layout/navigation";
import type { EventuzRole } from "@/lib/auth/roles";
import Link from "next/link";
import { useState } from "react";
import { SidebarNav } from "./SidebarNav";
import { SiteFooter } from "./SiteFooter";

const roleShort: Record<EventuzRole, string> = {
  attendee: "Guest",
  organizer: "Organizer",
  staff: "Staff",
  super_admin: "Admin",
};

type Props = {
  role: EventuzRole;
  homeHref: string;
  navSections: NavSection[];
  /** Shown in the sticky top bar when the main page omits a duplicate `PageHeader` title. */
  compactTitle?: string;
  children: React.ReactNode;
};

export function DashboardFrame({
  role,
  homeHref,
  navSections,
  compactTitle,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-full flex-col bg-[var(--surface-app)]">
      <a
        href="#dashboard-main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-card focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>

      <header className="no-print sticky top-0 z-40 border-b border-[var(--sidebar-border)] bg-card/95 backdrop-blur-md supports-[backdrop-filter]:bg-card/90">
        <div className="flex h-14 items-center gap-3 px-4 sm:px-5">
          <button
            type="button"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-border/80 bg-background text-foreground transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 lg:hidden"
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            <svg
              className="h-5 w-5"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={1.5}
              stroke="currentColor"
              aria-hidden
            >
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>

          <Link
            href={homeHref}
            className="shrink-0 font-serif text-lg font-semibold tracking-tight text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
          >
            Eventuz
          </Link>

          {compactTitle ? (
            <p className="min-w-0 flex-1 truncate text-center font-serif text-sm font-medium text-foreground/90 sm:text-left">
              {compactTitle}
            </p>
          ) : (
            <span className="flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-2 sm:gap-3">
            <div className="hidden items-center gap-2 sm:flex" aria-label="Account">
              <span
                className="rounded-full border border-accent-gold/35 bg-muted/50 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-primary"
                title="Your role"
              >
                {roleShort[role]}
              </span>
              <span className="h-6 w-px bg-border/90" aria-hidden />
            </div>
            <Link
              href="/auth/sign-out"
              className="rounded-lg border border-border/80 bg-background px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition-colors duration-150 hover:border-border hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30 sm:px-3"
            >
              Sign out
            </Link>
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-1">
        {mobileOpen ? (
          <button
            type="button"
            className="no-print fixed inset-0 z-40 bg-foreground/20 backdrop-blur-[1px] lg:hidden"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        <aside
          id="mobile-drawer-nav"
          className={`no-print fixed bottom-0 left-0 top-14 z-50 w-[min(18rem,88vw)] border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] shadow-[4px_0_24px_rgba(28,25,23,0.06)] transition-transform duration-200 ease-out lg:static lg:top-auto lg:z-auto lg:flex lg:min-h-[calc(100vh-3.5rem)] lg:w-60 lg:shrink-0 lg:translate-x-0 lg:shadow-none ${
            mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
          }`}
        >
          <div className="h-full overflow-y-auto px-3 py-4 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)] lg:py-6">
            <SidebarNav role={role} sections={navSections} onNavigate={() => setMobileOpen(false)} />
          </div>
        </aside>

        <div
          id="dashboard-main"
          className="min-w-0 flex-1 overflow-x-hidden"
          tabIndex={-1}
        >
          {children}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
