/** Organizer event setup — shared validation (no app-level hardcoded hold defaults). */

export const EVENT_STATUSES = ["draft", "published", "disabled"] as const;
export type EventStatus = (typeof EVENT_STATUSES)[number];

const HOLD_MAX_MINUTES = 525600; /* 1 year upper bound */

export function parseEventStatus(value: FormDataEntryValue | null): EventStatus {
  const raw = String(value ?? "draft").trim();
  return EVENT_STATUSES.includes(raw as EventStatus) ? (raw as EventStatus) : "draft";
}

/** Required on update — must be a positive whole number within bounds. */
export function parseHoldMinutesRequired(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > HOLD_MAX_MINUTES) return null;
  return n;
}

/** Empty field → undefined (database default applies on insert). Invalid → null. */
export function parseHoldMinutesOptional(
  value: FormDataEntryValue | null
): number | undefined | null {
  const s = String(value ?? "").trim();
  if (s === "") return undefined;
  const n = Number(s);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n < 1 || n > HOLD_MAX_MINUTES) return null;
  return n;
}
