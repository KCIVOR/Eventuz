"use server";

import { createClient } from "@/lib/supabase/server";

export type ScanResultKind = "valid" | "duplicate" | "invalid" | "voided";

export type ProcessTicketScanPayload = {
  scan_result: ScanResultKind;
  check_in_id: string | null;
  ticket_id: string | null;
  attendee_name: string | null;
  ticket_code: string | null;
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
    attendee_name: typeof o.attendee_name === "string" ? o.attendee_name : null,
    ticket_code: typeof o.ticket_code === "string" ? o.ticket_code : null,
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
