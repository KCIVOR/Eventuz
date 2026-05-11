/**
 * Next.js app router searchParams shape (values may repeat).
 */
export type SerializableSearchParams = Record<string, string | string[] | undefined>;

export function hrefWithPageParam(
  pathname: string,
  current: SerializableSearchParams,
  pageKey: string,
  page: number
): string {
  const sp = new URLSearchParams();
  for (const [key, val] of Object.entries(current)) {
    if (key === pageKey) continue;
    if (val === undefined) continue;
    if (Array.isArray(val)) {
      val.forEach((v) => sp.append(key, v));
    } else {
      sp.set(key, val);
    }
  }
  if (page > 1) {
    sp.set(pageKey, String(page));
  }
  const qs = sp.toString();
  return qs ? `${pathname}?${qs}` : pathname;
}
