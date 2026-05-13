import { createClient } from "@/lib/supabase/server";
import { nestedOne } from "@/lib/supabase/nestedOne";

export type SeatOverviewRow = {
  seatId: string;
  displayLabel: string;
  seatLabel: string;
  tableLabel: string | null;
  seatStatus: string;
  ticketTypeId: string;
  ticketTypeName: string;
  guestName: string | null;
  guestEmail: string | null;
  assignmentStatus: string | null;
  ticketCode: string | null;
  ticketStatus: string | null;
  checkedInAt: string | null;
};

export type TicketTypeOption = { id: string; name: string };

/** Serialized seat row for the inventory editor (labels + status). */
export type SeatInventoryEditorSeat = {
  id: string;
  display_label: string;
  table_label: string | null;
  seat_label: string;
  status: string;
};

export type InventoryTicketType = {
  id: string;
  name: string;
  quantity: number;
  seatLayoutMode: "rowed" | "tables";
  seatLayoutRows: number | null;
  seatLayoutColumns: number | null;
  seatLayoutTableCount: number | null;
  seatLayoutSeatsPerTable: number | null;
};

type SeatingOverviewRawSeat = {
  id: string;
  display_label: string | null;
  seat_label: string | null;
  table_label: string | null;
  status: string | null;
  ticket_type_id: string | null;
  ticket_types: { id?: string; name?: string } | { id?: string; name?: string }[] | null;
  seat_assignments:
    | { attendee_name: string; attendee_email: string; status: string }
    | { attendee_name: string; attendee_email: string; status: string }[]
    | null;
  tickets:
    | { ticket_code: string; status: string; checked_in_at: string | null }
    | { ticket_code: string; status: string; checked_in_at: string | null }[]
    | null;
};

export async function loadOrganizerSeatingOverview(eventId: string): Promise<
  | {
    ok: true;
    eventName: string;
    rows: SeatOverviewRow[];
    ticketTypes: TicketTypeOption[];
    inventoryTicketTypes: InventoryTicketType[];
    inventorySeatsByTypeId: Record<string, SeatInventoryEditorSeat[]>;
  }
  | { ok: false; reason: "auth" | "forbidden" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, name, organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event || event.organizer_id !== user.id) {
    return { ok: false, reason: "forbidden" };
  }

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select(
      "id, name, quantity, seat_layout_mode, seat_layout_rows, seat_layout_columns, seat_layout_table_count, seat_layout_seats_per_table"
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const typeOptions: TicketTypeOption[] = (ticketTypes ?? []).map((t) => ({
    id: t.id as string,
    name: (t.name as string) || "Ticket",
  }));

  const inventoryTicketTypes: InventoryTicketType[] = (ticketTypes ?? []).map((t) => ({
    id: t.id as string,
    name: (t.name as string) || "Ticket",
    quantity: Number(t.quantity ?? 0),
    seatLayoutMode: t.seat_layout_mode === "tables" ? "tables" : "rowed",
    seatLayoutRows: t.seat_layout_rows == null ? null : Number(t.seat_layout_rows),
    seatLayoutColumns: t.seat_layout_columns == null ? null : Number(t.seat_layout_columns),
    seatLayoutTableCount:
      t.seat_layout_table_count == null ? null : Number(t.seat_layout_table_count),
    seatLayoutSeatsPerTable:
      t.seat_layout_seats_per_table == null ? null : Number(t.seat_layout_seats_per_table),
  }));

  let allSeats: SeatingOverviewRawSeat[] = [];
  let from = 0;
  let to = 999;
  let finished = false;

  while (!finished) {
    const { data: chunk, error: chunkErr } = await supabase
      .from("seats")
      .select(
        `id, display_label, seat_label, table_label, status, ticket_type_id,
         ticket_types ( id, name ),
         seat_assignments ( attendee_name, attendee_email, status ),
         tickets ( ticket_code, status, checked_in_at )`
      )
      .eq("event_id", eventId)
      .order("display_label", { ascending: true })
      .range(from, to);

    if (chunkErr) {
      console.error("[loadSeatingOverview] Error fetching seats chunk:", chunkErr);
      break;
    }

    if (chunk && chunk.length > 0) {
      allSeats = [...allSeats, ...(chunk as SeatingOverviewRawSeat[])];
      if (chunk.length < 1000) {
        finished = true;
      } else {
        from += 1000;
        to += 1000;
      }
    } else {
      finished = true;
    }
  }

  const seatsRaw = allSeats;



  function asArray<T>(x: T | T[] | null | undefined): T[] {
    if (x == null) return [];
    return Array.isArray(x) ? x : [x];
  }

  const rows: SeatOverviewRow[] = (seatsRaw ?? []).map((s) => {
    const tt = nestedOne(s.ticket_types as { id?: string; name?: string } | null);
    const assigns = asArray(
      s.seat_assignments as
      | { attendee_name: string; attendee_email: string; status: string }
      | { attendee_name: string; attendee_email: string; status: string }[]
      | null
    );
    const activeAssign =
      assigns.find((a) => a.status === "ticket_issued") ??
      assigns.find((a) => a.status === "assigned") ??
      assigns[0] ??
      null;

    const tks = asArray(
      s.tickets as
      | { ticket_code: string; status: string; checked_in_at: string | null }
      | { ticket_code: string; status: string; checked_in_at: string | null }[]
      | null
    );
    const ticket =
      tks.find((t) => t.status === "checked_in") ??
      tks.find((t) => t.status === "issued") ??
      tks.find((t) => t.status !== "voided") ??
      null;

    return {
      seatId: s.id as string,
      displayLabel: (s.display_label as string) ?? "",
      seatLabel: (s.seat_label as string) ?? "",
      tableLabel: (s.table_label as string | null) ?? null,
      seatStatus: (s.status as string) ?? "available",
      ticketTypeId: (s.ticket_type_id as string) ?? "",
      ticketTypeName: tt?.name ?? "—",
      guestName: activeAssign?.attendee_name ?? null,
      guestEmail: activeAssign?.attendee_email ?? null,
      assignmentStatus: activeAssign?.status ?? null,
      ticketCode: ticket?.ticket_code ?? null,
      ticketStatus: ticket?.status ?? null,
      checkedInAt: ticket?.checked_in_at ? String(ticket.checked_in_at) : null,
    };
  });

  const inventorySeatsByTypeId: Record<string, SeatInventoryEditorSeat[]> = Object.fromEntries(
    inventoryTicketTypes.map((t) => [t.id, [] as SeatInventoryEditorSeat[]])
  );
  for (const s of seatsRaw ?? []) {
    // Robustly extract the ticket type ID from either the column or the joined object
    const rawTid = s.ticket_type_id;
    const joined = nestedOne(s.ticket_types);
    const joinedTid = joined?.id;
    const tid = rawTid || joinedTid || "";
    const list = inventorySeatsByTypeId[tid];
    if (!list) continue;
    list.push({
      id: s.id as string,
      display_label: (s.display_label as string) ?? "",
      table_label: (s.table_label as string | null) ?? null,
      seat_label: (s.seat_label as string) ?? "",
      status: (s.status as string) ?? "available",
    });
  }

  return {
    ok: true,
    eventName: (event.name as string) || "Event",
    rows,
    ticketTypes: typeOptions,
    inventoryTicketTypes,
    inventorySeatsByTypeId,
  };
}
