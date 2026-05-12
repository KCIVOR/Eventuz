"use client";

import { PaginationLayout, paginationBtnClass } from "./PaginationLayout";

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
  return (
    <PaginationLayout
      total={total}
      rangeStart={rangeStart}
      rangeEnd={rangeEnd}
      listLabel={listLabel}
      itemLabel={itemLabel}
    >
      {pageCount > 1 ? (
        <>
          <button
            type="button"
            className={paginationBtnClass}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            suppressHydrationWarning
          >
            Previous
          </button>
          <span className="px-2 text-xs tabular-nums text-muted-foreground">
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className={paginationBtnClass}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            suppressHydrationWarning
          >
            Next
          </button>
        </>
      ) : (
        <span className="text-xs text-muted-foreground">Single page</span>
      )}
    </PaginationLayout>
  );
}
