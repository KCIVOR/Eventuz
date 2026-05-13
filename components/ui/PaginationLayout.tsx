import React, { ReactNode } from "react";

type Props = {
  total: number;
  rangeStart: number;
  rangeEnd: number;
  listLabel: string;
  itemLabel?: string;
  children: ReactNode;
};

function pluralUnit(total: number, singular: string): string {
  const s = singular.trim();
  if (!s) return "";
  return total === 1 ? s : `${s}s`;
}

export function PaginationLayout({
  total,
  rangeStart,
  rangeEnd,
  listLabel,
  itemLabel,
  children,
}: Props) {
  if (total === 0) return null;

  const suffix = itemLabel ? ` ${pluralUnit(total, itemLabel)}` : "";

  return (
    <nav
      className="flex flex-col gap-4 border-t px-4 py-4 sm:flex-row sm:items-center sm:justify-between"
      style={{ 
        borderColor: "var(--border)", 
        background: "var(--alt-surface)" 
      }}
      aria-label={`Pagination for ${listLabel}`}
    >
      <p 
        style={{ 
          fontSize: "12px", 
          fontWeight: 300, 
          color: "var(--warm-gray)", 
          fontFamily: "var(--font-sans)" 
        }}
      >
        Showing{" "}
        <span style={{ fontWeight: 500, color: "var(--foreground)" }}>
          {rangeStart}-{rangeEnd}
        </span>{" "}
        of <span style={{ fontWeight: 500, color: "var(--foreground)" }}>{total}</span>
        {suffix}
      </p>
      <div className="flex flex-wrap items-center gap-3">
        {children}
      </div>
    </nav>
  );
}

// DS-aligned small pagination button
export const paginationBtnClass =
  "inline-flex min-h-[32px] cursor-pointer items-center justify-center border bg-white px-4 text-[10px] font-medium tracking-[0.15em] uppercase transition-all duration-200 " +
  "disabled:pointer-events-none disabled:opacity-30 focus-visible:outline-none " +
  "hover:border-[var(--champagne)] hover:text-[var(--champagne-dark)] active:scale-[0.98]";

export const paginationBtnStyles: React.CSSProperties = {
  fontFamily: "var(--font-sans)",
  borderRadius: "1px",
  borderColor: "var(--border)",
  color: "var(--charcoal)",
};
