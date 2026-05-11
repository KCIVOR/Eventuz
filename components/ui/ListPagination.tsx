import { hrefWithPageParam, type SerializableSearchParams } from "@/lib/ui/paginationUrl";
import Link from "next/link";

const btnClass =
  "inline-flex min-h-9 min-w-[2.25rem] cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/25";

const disabledClass = " pointer-events-none opacity-40";

type Props = {
  pathname: string;
  searchParams: SerializableSearchParams;
  paramKey: string;
  page: number;
  pageSize: number;
  total: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
  /** e.g. "All users" for aria-label */
  listLabel: string;
};

export function ListPagination({
  pathname,
  searchParams,
  paramKey,
  page,
  pageSize: _pageSize,
  total,
  pageCount,
  rangeStart,
  rangeEnd,
  listLabel,
}: Props) {
  if (total === 0) return null;

  const prevHref =
    page > 1 ? hrefWithPageParam(pathname, searchParams, paramKey, page - 1) : null;
  const nextHref =
    page < pageCount ? hrefWithPageParam(pathname, searchParams, paramKey, page + 1) : null;

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
      </p>
      <div className="flex flex-wrap items-center gap-2">
        {pageCount > 1 ? (
          <>
            {prevHref ? (
              <Link href={prevHref} className={btnClass} prefetch={false}>
                Previous
              </Link>
            ) : (
              <span className={btnClass + disabledClass} aria-disabled="true">
                Previous
              </span>
            )}
            <span className="px-2 text-xs tabular-nums text-muted-foreground">
              Page {page} of {pageCount}
            </span>
            {nextHref ? (
              <Link href={nextHref} className={btnClass} prefetch={false}>
                Next
              </Link>
            ) : (
              <span className={btnClass + disabledClass} aria-disabled="true">
                Next
              </span>
            )}
          </>
        ) : (
          <span className="text-xs text-muted-foreground">Single page</span>
        )}
      </div>
    </nav>
  );
}
