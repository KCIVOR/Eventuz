/** Supabase nested selects are typed as T | T[]; normalize to a single row. */
export function nestedOne<T>(x: T | T[] | null | undefined): T | null {
  if (x == null) return null;
  return Array.isArray(x) ? (x[0] ?? null) : x;
}
