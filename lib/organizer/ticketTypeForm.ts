/**
 * Server-side validation for organizer ticket types (Phase 4).
 * No checkout pricing; no seats.
 */

export const TICKET_TYPE_STATUSES = ["active", "hidden", "inactive", "sold_out"] as const;
export type TicketTypeStatus = (typeof TICKET_TYPE_STATUSES)[number];

export function parseTicketTypeStatus(value: FormDataEntryValue | null): TicketTypeStatus {
  const raw = String(value ?? "active").trim();
  return TICKET_TYPE_STATUSES.includes(raw as TicketTypeStatus)
    ? (raw as TicketTypeStatus)
    : "active";
}

/** Non-negative money, max 2 decimal places in value. Returns null if invalid. */
export function parseMoney(value: FormDataEntryValue | null): number | null {
  const s = String(value ?? "").trim();
  if (s === "") return null;
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100) / 100;
}

export type ValidatedTicketType = {
  name: string;
  description: string;
  regular_price: number;
  early_bird_price: number;
  early_bird_start_at: string | null;
  early_bird_end_at: string | null;
  quantity: number;
  status: TicketTypeStatus;
};

export function validateTicketTypeForm(formData: FormData):
  | { ok: true; data: ValidatedTicketType }
  | { ok: false; message: string } {
  const name = String(formData.get("name") ?? "").trim();
  if (!name) return { ok: false, message: "Ticket name is required." };

  const description = String(formData.get("description") ?? "").trim();

  const regular_price = parseMoney(formData.get("regular_price"));
  if (regular_price === null) return { ok: false, message: "Enter a valid regular price (0 or more)." };

  const early_bird_price = parseMoney(formData.get("early_bird_price"));
  if (early_bird_price === null)
    return { ok: false, message: "Enter a valid early bird price (0 or more)." };

  const startRaw = String(formData.get("early_bird_start_at") ?? "").trim();
  const endRaw = String(formData.get("early_bird_end_at") ?? "").trim();
  const hasStart = startRaw !== "";
  const hasEnd = endRaw !== "";

  if (hasStart !== hasEnd) {
    return {
      ok: false,
      message: "Set both early bird start and end, or clear both.",
    };
  }

  let early_bird_start_at: string | null = null;
  let early_bird_end_at: string | null = null;

  if (hasStart && hasEnd) {
    const start = new Date(startRaw);
    const end = new Date(endRaw);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { ok: false, message: "Early bird dates could not be read." };
    }
    if (end <= start) {
      return { ok: false, message: "Early bird end must be after early bird start." };
    }
    if (early_bird_price >= regular_price) {
      return {
        ok: false,
        message: "Early bird price must be lower than regular price when a promotional window is set.",
      };
    }
    early_bird_start_at = start.toISOString();
    early_bird_end_at = end.toISOString();
  }

  if (early_bird_price > regular_price) {
    return { ok: false, message: "Early bird price cannot exceed regular price." };
  }

  const qtyRaw = Number(formData.get("quantity"));
  if (!Number.isFinite(qtyRaw) || !Number.isInteger(qtyRaw) || qtyRaw < 1) {
    return { ok: false, message: "Quantity must be a whole number of at least 1." };
  }

  const status = parseTicketTypeStatus(formData.get("status"));

  return {
    ok: true,
    data: {
      name,
      description,
      regular_price,
      early_bird_price,
      early_bird_start_at,
      early_bird_end_at,
      quantity: qtyRaw,
      status,
    },
  };
}
