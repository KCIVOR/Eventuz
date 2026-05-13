import Link from "next/link";

export type BreadcrumbItem = {
  label: string;
  href?: string;
};

type Props = {
  items: BreadcrumbItem[];
};

export function Breadcrumbs({ items }: Props) {
  if (!items.length) return null;

  return (
    <nav aria-label="Breadcrumb">
      <ol className="flex flex-wrap items-center gap-x-2 gap-y-1">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-2">
            {i > 0 ? (
              // DS .bc-sep — gold ›
              <span
                style={{ color: "#C9A96E", fontSize: "12px" }}
                aria-hidden
              >
                ›
              </span>
            ) : null}
            {item.href ? (
              <Link
                href={item.href}
                className="hover-gold-text"
                style={{
                  fontSize: "12px",
                  fontWeight: 400,
                  color: "#7A6E68",
                  textDecoration: "none",
                  transition: "color 0.15s",
                }}
              >
                {item.label}
              </Link>
            ) : (
              // DS .bc-item.active
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: 500,
                  color: "#1A1512",
                }}
              >
                {item.label}
              </span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
