import Link from "next/link";

const primaryNav = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" },
];

export function SiteHeader() {
  return (
    <header className="no-print border-b border-[var(--sidebar-border)] bg-card/90 backdrop-blur-md supports-[backdrop-filter]:bg-card/85">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6">
        <Link
          href="/"
          className="font-serif text-lg font-semibold tracking-tight text-primary transition-colors hover:text-primary-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:text-xl"
        >
          Eventuz
        </Link>
        <nav
          aria-label="Public"
          className="flex flex-wrap items-center justify-end gap-x-1 sm:gap-x-2"
        >
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-lg px-2.5 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-3 sm:text-sm"
            >
              {item.label}
            </Link>
          ))}
          <span className="hidden h-4 w-px bg-border sm:mx-1 sm:block" aria-hidden />
          <Link
            href="/organizer"
            className="rounded-lg px-2.5 py-2 text-xs font-medium text-primary/90 transition-colors hover:bg-primary/5 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 sm:px-3 sm:text-sm"
          >
            For organizers
          </Link>
        </nav>
      </div>
    </header>
  );
}
