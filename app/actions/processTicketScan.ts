"use server";

import { createClient } from "@/lib/supabase/server";

export type ScanResultKind = "valid" | "duplicate" | "invalid" | "voided";

export type ProcessTicketScanPayload = {
  scan_result: ScanResultKind;
  check_in_id: string | null;
  ticket_id: string | null;
  order_id: string | null;
  ticket_type_id: string | null;
  ticket_type_name: string | null;
  seat_id: string | null;
  seat_display_label: string | null;
  seat_label: string | null;
  table_label: string | null;
  seat_status: string | null;
  attendee_name: string | null;
  attendee_email: string | null;
  ticket_code: string | null;
  ticket_status: string | null;
  issued_at: string | null;
  checked_in_at: string | null;
  event_name: string | null;
  event_date: string | null;
  event_time: string | null;
  venue: string | null;
};

function parsePayload(raw: unknown): ProcessTicketScanPayload | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const scan_result = o.scan_result;
  if (
    scan_result !== "valid" &&
    scan_result !== "duplicate" &&
    scan_result !== "invalid" &&
    scan_result !== "voided"
  ) {
    return null;
  }
  return {
    scan_result,
    check_in_id: typeof o.check_in_id === "string" ? o.check_in_id : null,
    ticket_id: typeof o.ticket_id === "string" ? o.ticket_id : null,
    order_id: typeof o.order_id === "string" ? o.order_id : null,
    ticket_type_id: typeof o.ticket_type_id === "string" ? o.ticket_type_id : null,
    ticket_type_name: typeof o.ticket_type_name === "string" ? o.ticket_type_name : null,
    seat_id: typeof o.seat_id === "string" ? o.seat_id : null,
    seat_display_label: typeof o.seat_display_label === "string" ? o.seat_display_label : null,
    seat_label: typeof o.seat_label === "string" ? o.seat_label : null,
    table_label: typeof o.table_label === "string" ? o.table_label : null,
    seat_status: typeof o.seat_status === "string" ? o.seat_status : null,
    attendee_name: typeof o.attendee_name === "string" ? o.attendee_name : null,
    attendee_email: typeof o.attendee_email === "string" ? o.attendee_email : null,
    ticket_code: typeof o.ticket_code === "string" ? o.ticket_code : null,
    ticket_status: typeof o.ticket_status === "string" ? o.ticket_status : null,
    issued_at: typeof o.issued_at === "string" ? o.issued_at : null,
    checked_in_at: typeof o.checked_in_at === "string" ? o.checked_in_at : null,
    event_name: typeof o.event_name === "string" ? o.event_name : null,
    event_date: typeof o.event_date === "string" ? o.event_date : null,
    event_time: typeof o.event_time === "string" ? o.event_time : null,
    venue: typeof o.venue === "string" ? o.venue : null,
  };
}

export async function processTicketScan(
  eventId: string,
  raw: string,
  deviceInfo: Record<string, unknown> | null
): Promise<
  { ok: true; data: ProcessTicketScanPayload } | { ok: false; message: string }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, message: "You must be signed in to scan." };
  }

  const { data, error } = await supabase.rpc("process_ticket_scan", {
    p_event_id: eventId,
    p_scan_raw: raw,
    p_device_info: deviceInfo,
  });

  if (error) {
    return { ok: false, message: error.message };
  }

  const parsed = parsePayload(data);
  if (!parsed) {
    return { ok: false, message: "Unexpected scan response." };
  }

  return { ok: true, data: parsed };
}
