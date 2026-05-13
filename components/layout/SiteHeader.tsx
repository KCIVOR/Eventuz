import Link from "next/link";

const primaryNav = [
  { href: "/", label: "Home" },
  { href: "/login", label: "Log in" },
  { href: "/register", label: "Register" },
];

// Public site header — DS .nav style (dark obsidian)
export function SiteHeader() {
  return (
    <header
      className="no-print"
      style={{
        background: "#1A1512",
        borderBottom: "1px solid rgba(201,169,110,0.2)",
      }}
    >
      <div
        className="mx-auto flex h-14 max-w-6xl items-center justify-between gap-4 px-4 sm:h-16 sm:px-6"
      >
        {/* DS .nav-brand — Cormorant Garamond */}
        <Link
          href="/"
          className="hover-gold-text"
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

        {/* DS .nav-links — Jost 500, uppercase, spaced */}
        <nav aria-label="Public" className="flex flex-wrap items-center justify-end gap-x-1 sm:gap-x-2">
          {primaryNav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="hover-gold-text"
              style={{
                fontFamily: "'Jost', sans-serif",
                fontSize: "11px",
                fontWeight: 500,
                letterSpacing: "0.2em",
                textTransform: "uppercase",
                color: "#AEA89F",
                textDecoration: "none",
                padding: "6px 12px",
                transition: "color 0.2s",
              }}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
