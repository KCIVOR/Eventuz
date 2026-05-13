import { hrefWithPageParam, type SerializableSearchParams } from "@/lib/ui/paginationUrl";
import Link from "next/link";
import { PaginationLayout, paginationBtnClass, paginationBtnStyles } from "./PaginationLayout";

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
  itemLabel?: string;
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
  itemLabel,
}: Props) {
  const prevHref =
    page > 1 ? hrefWithPageParam(pathname, searchParams, paramKey, page - 1) : null;
  const nextHref =
    page < pageCount ? hrefWithPageParam(pathname, searchParams, paramKey, page + 1) : null;

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
          {prevHref ? (
            <Link 
              href={prevHref} 
              className={paginationBtnClass} 
              style={btnStyle}
              prefetch={false}
            >
              Previous
            </Link>
          ) : (
            <span 
              className={paginationBtnClass + disabledClass} 
              style={btnStyle}
              aria-disabled="true"
            >
              Previous
            </span>
          )}
          <span 
            className="px-2 text-[11px] font-medium tracking-wide uppercase"
            style={{ color: "var(--mid-gray)", fontFamily: "var(--font-sans)" }}
          >
            Page {page} of {pageCount}
          </span>
          {nextHref ? (
            <Link 
              href={nextHref} 
              className={paginationBtnClass} 
              style={btnStyle}
              prefetch={false}
            >
              Next
            </Link>
          ) : (
            <span 
              className={paginationBtnClass + disabledClass} 
              style={btnStyle}
              aria-disabled="true"
            >
              Next
            </span>
          )}
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
