/** Default rows per page for admin-style tables */
export const DEFAULT_LIST_PAGE_SIZE = 12;

/** Seat overview map: rows per page (large guest lists) */
export const SEAT_OVERVIEW_PAGE_SIZE = 25;

export function parsePageParam(
  raw: string | string[] | undefined,
  fallback = 1
): number {
  const s = Array.isArray(raw) ? raw[0] : raw;
  const n = parseInt(String(s ?? fallback), 10);
  if (!Number.isFinite(n) || n < 1) return 1;
  return n;
}

export type PageSlice<T> = {
  slice: T[];
  total: number;
  page: number;
  pageSize: number;
  pageCount: number;
  rangeStart: number;
  rangeEnd: number;
};

export function slicePage<T>(items: readonly T[], page: number, pageSize: number): PageSlice<T> {
  const total = items.length;
  const pageCount = Math.max(1, Math.ceil(total / pageSize) || 1);
  const pageClamped = Math.min(Math.max(1, page), pageCount);
  const start = (pageClamped - 1) * pageSize;
  const slice = items.slice(start, start + pageSize);
  const rangeStart = total === 0 ? 0 : start + 1;
  const rangeEnd = start + slice.length;
  return {
    slice,
    total,
    page: pageClamped,
    pageSize,
    pageCount,
    rangeStart,
    rangeEnd,
  };
}
export function getPaginationRange(page: number, pageSize: number) {
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  return { from, to };
}
