"use client";

const btnClass =
  "inline-flex min-h-9 min-w-[2.25rem] cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25 disabled:pointer-events-none disabled:opacity-40";

type Props = {
  page: number;
  pageCount: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (nextPage: number) => void;
  /** e.g. "Seat tables" */
  listLabel: string;
  /** Optional unit for the summary line, e.g. "seat" → "of 120 seats" */
  itemLabel?: string;
};

function pluralUnit(total: number, singular: string): string {
  const s = singular.trim();
  if (!s) return "";
  return total === 1 ? s : `${s}s`;
}

export function ClientPaginationBar({
  page,
  pageCount,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
  listLabel,
  itemLabel,
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
      {pageCount > 1 ? (
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className={btnClass}
            suppressHydrationWarning
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
          >
            Previous
          </button>
          <span className="px-2 text-xs tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className={btnClass}
            suppressHydrationWarning
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
          >
            Next
          </button>
        </div>
      ) : (
        <span className="text-xs text-muted-foreground">Single page</span>
      )}
    </nav>
  );
}
