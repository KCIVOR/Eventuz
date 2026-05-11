import type { createClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/utils/slug";

type Supabase = Awaited<ReturnType<typeof createClient>>;

type SeatInsert = {
  event_id: string;
  ticket_type_id: string;
  table_label: string | null;
  seat_label: string;
  display_label: string;
  status: "available";
};

/**
 * After ticket_types row is updated: ensure seat count matches `newQuantity`.
 * Removes only `available` seats when decreasing. Adds rows when increasing.
 */
export async function reconcileSeatsToQuantity(
  supabase: Supabase,
  eventId: string,
  ticketTypeId: string,
  ticketTypeName: string,
  newQuantity: number
): Promise<{ ok: true } | { ok: false; message: string }> {
  const { data: seats, error: loadErr } = await supabase
    .from("seats")
    .select("id, status")
    .eq("ticket_type_id", ticketTypeId)
    .order("created_at", { ascending: true });

  if (loadErr || !seats) {
    return { ok: false, message: loadErr?.message ?? "Could not load seats." };
  }

  const N = seats.length;

  if (newQuantity < N) {
    const toRemove = N - newQuantity;
    const victims = [...seats]
      .reverse()
      .filter((s) => s.status === "available")
      .slice(0, toRemove);
    if (victims.length < toRemove) {
      return {
        ok: false,
        message:
          "Cannot reduce quantity: only available seats can be removed. Assigned or held seats block this until a later phase supports reassignment.",
      };
    }
    const { error: delErr } = await supabase
      .from("seats")
      .delete()
      .in(
        "id",
        victims.map((v) => v.id)
      );
    if (delErr) return { ok: false, message: delErr.message };
  }

  const { data: after, error: afterErr } = await supabase
    .from("seats")
    .select("id")
    .eq("ticket_type_id", ticketTypeId);

  if (afterErr || !after) {
    return { ok: false, message: afterErr?.message ?? "Could not reload seats." };
  }

  const M = after.length;
  if (newQuantity > M) {
    const add = newQuantity - M;
    const base = slugify(ticketTypeName);
    const rows: SeatInsert[] = Array.from({ length: add }, (_, i) => {
      const n = M + i + 1;
      return {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        table_label: null,
        seat_label: String(n),
        display_label: `${base}-${String(n).padStart(3, "0")}`,
        status: "available",
      };
    });
    const { error: insErr } = await supabase.from("seats").insert(rows);
    if (insErr) return { ok: false, message: insErr.message };
  }

  return { ok: true };
}

export function initialSeatsForNewTicketType(
  eventId: string,
  ticketTypeId: string,
  ticketTypeName: string,
  quantity: number
): SeatInsert[] {
  const base = slugify(ticketTypeName);
  return Array.from({ length: quantity }, (_, i) => {
    const n = i + 1;
    return {
      event_id: eventId,
      ticket_type_id: ticketTypeId,
      table_label: null,
      seat_label: String(n),
      display_label: `${base}-${String(n).padStart(3, "0")}`,
      status: "available",
    };
  });
}
