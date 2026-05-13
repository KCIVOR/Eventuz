import type { ReactNode } from "react";
import { Breadcrumbs, type BreadcrumbItem } from "./Breadcrumbs";

type Props = {
  title: string;
  description?: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: ReactNode;
};

export function PageHeader({ title, description, breadcrumbs, actions }: Props) {
  return (
    <header className="mb-8 space-y-4">
      {/* Breadcrumbs — DS .bc pattern */}
      {breadcrumbs?.length ? (
        <div style={{ paddingBottom: "12px", borderBottom: "1px solid #EDE8E3" }}>
          <Breadcrumbs items={breadcrumbs} />
        </div>
      ) : null}

      {/* Ornamental divider above title */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", margin: "4px 0 16px" }}>
        <span style={{ flex: 1, height: "1px", background: "linear-gradient(to right, transparent, #EDE8E3)" }} />
        <div style={{ width: "5px", height: "5px", background: "#C9A96E", transform: "rotate(45deg)", flexShrink: 0 }} />
        <span style={{ flex: 1, height: "1px", background: "linear-gradient(to left, transparent, #EDE8E3)" }} />
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 space-y-2">
          {/* H1 — DS .sec-title / Cormorant Garamond 300 */}
          <h1
            style={{
              fontFamily: "'Cormorant Garamond', serif",
              fontSize: "clamp(28px, 3.5vw, 40px)",
              fontWeight: 300,
              color: "#1A1512",
              lineHeight: 1.1,
            }}
          >
            {title}
          </h1>
          {description ? (
            <p
              style={{
                fontSize: "13px",
                fontWeight: 300,
                color: "#7A6E68",
                lineHeight: 1.75,
                maxWidth: "540px",
              }}
            >
              {description}
            </p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
        ) : null}
      </div>
    </header>
  );
}
