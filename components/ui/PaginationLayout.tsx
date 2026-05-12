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
      className="flex flex-col gap-3 border-t border-border bg-muted/15 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4"
      aria-label={`Pagination for ${listLabel}`}
    >
      <p className="text-xs tabular-nums text-muted-foreground">
        Showing{" "}
        <span className="font-medium text-foreground">
          {rangeStart}-{rangeEnd}
        </span>{" "}
        of <span className="font-medium text-foreground">{total}</span>
        {suffix}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {children}
      </div>
    </nav>
  );
}

export const paginationBtnClass =
  "inline-flex min-h-9 min-w-[2.25rem] cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-all hover:bg-muted active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-40";
