/**
 * URL-safe slug; falls back to "event" if empty after sanitizing.
 */
export function slugify(input: string): string {
  const s = input
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return s || "event";
}

export function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}
