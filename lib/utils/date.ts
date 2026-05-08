/** Format for `<input type="datetime-local" />` (local wall time). */
export function toDatetimeLocalInput(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Postgres `time` often returns `HH:MM:SS`; input[type=time] accepts `HH:MM`. */
export function trimTimeForInput(t: string | null | undefined): string {
  if (!t) return "";
  return t.slice(0, 5);
}
