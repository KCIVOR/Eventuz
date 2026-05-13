"use client";

import { PaginationLayout, paginationBtnClass, paginationBtnStyles } from "./PaginationLayout";

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
  const btnStyle = { ...paginationBtnStyles };

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
            style={btnStyle}
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            suppressHydrationWarning
          >
            Previous
          </button>
          <span 
            className="px-2 text-[11px] font-medium tracking-wide uppercase"
            style={{ color: "var(--mid-gray)", fontFamily: "var(--font-sans)" }}
          >
            Page {page} of {pageCount}
          </span>
          <button
            type="button"
            className={paginationBtnClass}
            style={btnStyle}
            disabled={page >= pageCount}
            onClick={() => onPageChange(page + 1)}
            suppressHydrationWarning
          >
            Next
          </button>
        </>
      ) : (
        <span 
          className="text-[11px] font-medium tracking-wide uppercase"
          style={{ color: "var(--warm-gray)", fontFamily: "var(--font-sans)" }}
        >
          Single page
        </span>
      )}
    </PaginationLayout>
  );
}
