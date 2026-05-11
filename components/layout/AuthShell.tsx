import type { ReactNode } from "react";
import Link from "next/link";
import { SiteFooter } from "./SiteFooter";

type Props = {
  title: string;
  children: ReactNode;
  /** In-card back control (e.g. home from login, login from register). */
  backHref?: string;
  backLabel?: string;
};

export function AuthShell({ title, children, backHref, backLabel }: Props) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="border-b border-[var(--sidebar-border)] bg-card/95 px-4 py-4 backdrop-blur-md supports-[backdrop-filter]:bg-card/90 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25"
        >
          ← Eventuz
        </Link>
      </div>
      <main className="flex flex-1 flex-col items-center justify-center bg-[var(--surface-app)] px-4 py-16">
        <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-8 shadow-[0_2px_16px_rgba(28,25,23,0.06)]">
          {backHref && backLabel ? (
            <p className="mb-4">
              <Link
                href={backHref}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 rounded-md"
              >
                <span aria-hidden>←</span>
                {backLabel}
              </Link>
            </p>
          ) : null}
          <h1 className="mb-6 text-center font-serif text-2xl font-semibold tracking-tight text-foreground">
            {title}
          </h1>
          {children}
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
