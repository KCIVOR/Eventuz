"use client";

import type { NavSection } from "@/components/layout/navigation";
import type { EventuzRole } from "@/lib/auth/roles";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "./SidebarNav";
import { SiteFooter } from "./SiteFooter";
import { UserDropdown } from "./UserDropdown";
import { AnnouncementDropdown } from "./AnnouncementDropdown";

type Props = {
  role: EventuzRole;
  homeHref: string;
  navSections: NavSection[];
  compactTitle?: string;
  user: {
    full_name: string;
    avatar_url?: string | null;
  };
  children: React.ReactNode;
};

export function DashboardFrame({
  role,
  navSections,
  compactTitle,
  user,
  children,
}: Props) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [contentLoading, setContentLoading] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const timeout = window.setTimeout(() => setContentLoading(false), 0);
    return () => window.clearTimeout(timeout);
  }, [pathname]);

  useEffect(() => {
    if (!contentLoading) return;
    const timeout = window.setTimeout(() => setContentLoading(false), 8_000);
    return () => window.clearTimeout(timeout);
  }, [contentLoading]);

  function handleSidebarNavigate() {
    setMobileOpen(false);
    setContentLoading(true);
  }

  return (
    <div className="flex flex-1 flex-col" style={{ background: "var(--surface-app)" }}>
      <a
        href="#dashboard-main"
        className="no-print sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:shadow-md"
      >
        Skip to content
      </a>

      {/* Top Bar — dark obsidian, DS .nav */}
      <header
        className="no-print sticky top-0 z-40"
        style={{
          background: "#1A1512",
          borderBottom: "1px solid rgba(201,169,110,0.2)",
        }}
      >
        <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
          {/* Mobile hamburger */}
          <button
            type="button"
            className="inline-flex h-9 w-9 items-center justify-center lg:hidden hover-gold-text"
            style={{
              border: "1px solid rgba(201,169,110,0.25)",
              borderRadius: "2px",
              color: "#AEA89F",
              transition: "color 0.2s",
              background: "transparent",
              cursor: "pointer"
            }}
            aria-expanded={mobileOpen}
            aria-controls="mobile-drawer-nav"
            onClick={() => setMobileOpen((o) => !o)}
          >
            <span className="sr-only">{mobileOpen ? "Close menu" : "Open menu"}</span>
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" aria-hidden>
              {mobileOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5M3.75 17.25h16.5" />
              )}
            </svg>
          </button>

          {/* Brand — DS .nav-brand */}
          <Link
            href="/"
            prefetch={false}
            className="shrink-0 focus-visible:outline-none hover-gold-text"
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "22px",
              fontWeight: 300,
              color: "#FDFAF4",
              letterSpacing: "0.05em",
              textDecoration: "none",
              transition: "color 0.2s",
            }}
          >
            Eventuz
          </Link>

          {/* Compact title */}
          {compactTitle ? (
            <p
              className="min-w-0 flex-1 truncate text-center sm:text-left"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "14px",
                fontWeight: 300,
                color: "#AEA89F",
                fontStyle: "italic",
              }}
            >
              {compactTitle}
            </p>
          ) : (
            <span className="flex-1" />
          )}

          <div className="flex shrink-0 items-center gap-3">
            <AnnouncementDropdown />
            <UserDropdown user={user} role={role} />
          </div>
        </div>
      </header>

      <div className="relative flex min-h-[calc(100vh-3.5rem)] flex-1">
        {mobileOpen ? (
          <button
            type="button"
            className="no-print fixed inset-0 z-40 lg:hidden"
            style={{ background: "rgba(26,21,18,0.5)", backdropFilter: "blur(1px)", border: "none", cursor: "pointer" }}
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
        ) : null}

        {/* Sidebar — DS .nav-links style, ivory/alt-surface bg */}
        <aside
          id="mobile-drawer-nav"
          className={`no-print fixed bottom-0 left-0 top-14 z-50 lg:static lg:top-auto lg:z-auto lg:flex lg:min-h-[calc(100vh-3.5rem)] lg:w-60 lg:shrink-0 lg:translate-x-0 ${mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
            }`}
          style={{
            width: "min(18rem, 88vw)",
            borderRight: "1px solid #EDE8E3",
            background: "#F7F4EF",
            boxShadow: mobileOpen ? "4px 0 24px rgba(26,21,18,0.06)" : undefined,
            transition: "transform 0.2s ease-out",
          }}
        >
          <div className="h-full overflow-y-auto px-3 py-6 lg:sticky lg:top-14 lg:max-h-[calc(100vh-3.5rem)]">
            <SidebarNav role={role} sections={navSections} onNavigate={handleSidebarNavigate} />
          </div>
        </aside>

        <div id="dashboard-main" className="relative min-w-0 flex-1 overflow-x-hidden" tabIndex={-1}>
          {children}
          {contentLoading ? (
            <div
              className="absolute inset-0 z-30 flex min-h-[18rem] items-start justify-center bg-[#F7F4EF]/75 px-4 pt-10 backdrop-blur-[1px] sm:pt-16"
              role="status"
              aria-live="polite"
              aria-label="Loading page content"
            >
              <div className="flex flex-col items-center gap-4 rounded-[2px] border border-[#EDE8E3] bg-white/90 px-8 py-7 shadow-[0_18px_50px_rgba(26,21,18,0.08)]">
                <div className="h-9 w-9 animate-spin rounded-full border-2 border-[#C9A96E] border-t-transparent" />
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#7A6E68]">
                  Loading content
                </p>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <SiteFooter />
    </div>
  );
}
