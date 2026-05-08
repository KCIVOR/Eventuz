import Link from "next/link";

const nav = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" },
  { href: "/organizer", label: "Organizer" },
  { href: "/attendee", label: "Attendee" },
  { href: "/staff", label: "Staff" },
  { href: "/super-admin", label: "Super Admin" },
];

export function SiteHeader() {
  return (
    <header className="border-b border-zinc-200/80 bg-white/80 backdrop-blur dark:border-zinc-800 dark:bg-zinc-950/80">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link
          href="/"
          className="text-sm font-semibold tracking-tight text-zinc-900 dark:text-zinc-50"
        >
          Eventuz
        </Link>
        <nav className="flex flex-wrap items-center justify-end gap-x-4 gap-y-1 text-xs text-zinc-600 dark:text-zinc-400 sm:text-sm">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-md py-1 transition-colors hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
