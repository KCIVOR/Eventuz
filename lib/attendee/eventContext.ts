import { createClient } from "@/lib/supabase/server";
import { resolveAttendeeFacingEvent } from "@/lib/event/attendeeEvent";
import { runStaleOrderCleanup } from "@/lib/orders/cleanup";
import { availableTicketQuantityForType } from "@/lib/orders/inventory";

/** Published event + active ticket types; capacity = ticket_types.quantity − reserved orders. */
export type TicketTypeWithSlots = Record<string, unknown> & {
  id: string;
  quantity: number;
  slotsLeft: number;
};

/** Paid orders that still need seats + guest details (may be partially assigned). */
export type SeatAssignmentOrderLink = {
  id: string;
  status: string;
  quantity: number;
  /** Active seat_assignments rows for this order (assigned or ticket_issued). */
  assignedCount: number;
};

/** Completed orders that still need QR tickets issued. */
export type PaidOrderSummary = { id: string; quantity: number };

/** Issued ticket row for the attendee event hub (no raw QR here — use ticket page). */
export type QrTicketListRow = {
  id: string;
  ticket_code: string;
  attendee_name: string;
  attendee_email: string;
  order_id: string;
  emailed_at: string | null;
  email_last_error: string | null;
  status: string;
  seats: { display_label: string; seat_label: string; table_label: string | null } | null;
  ticket_types: { name: string } | null;
};

export async function loadAttendeeEventContext() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  await runStaleOrderCleanup(supabase, { buyerUserId: user?.id ?? null });

  const {
    event: ev,
    message,
    registrationOpen,
  } = await resolveAttendeeFacingEvent(supabase, { buyerUserId: user?.id ?? null });

  if (!ev || message) {
    return {
      event: null as Record<string, unknown> | null,
      ticketTypes: [] as TicketTypeWithSlots[],
      activeOrder: null as Record<string, unknown> | null,
      resumeCheckoutUrl: null as string | null,
      seatAssignmentOrders: [] as SeatAssignmentOrderLink[],
      ordersNeedingQrIssue: [] as PaidOrderSummary[],
      qrTickets: [] as QrTicketListRow[],
      registrationOpen: false,
      message,
    };
  }

  const eventId = ev.id as string;

  const { data: ticketTypes, error: ttErr } = registrationOpen
    ? await supabase
        .from("ticket_types")
        .select("*")
        .eq("event_id", eventId)
        .eq("status", "active")
        .order("created_at", { ascending: true })
    : { data: [] as Record<string, unknown>[], error: null as null };

  if (ttErr) {
    return {
      event: ev,
      ticketTypes: [] as TicketTypeWithSlots[],
      activeOrder: null as Record<string, unknown> | null,
      resumeCheckoutUrl: null as string | null,
      seatAssignmentOrders: [] as SeatAssignmentOrderLink[],
      ordersNeedingQrIssue: [] as PaidOrderSummary[],
      qrTickets: [] as QrTicketListRow[],
      registrationOpen,
      message: ttErr.message,
    };
  }

  let activeOrder: Record<string, unknown> | null = null;
  let resumeCheckoutUrl: string | null = null;
  let seatAssignmentOrders: SeatAssignmentOrderLink[] = [];
  let ordersNeedingQrIssue: PaidOrderSummary[] = [];
  let qrTickets: QrTicketListRow[] = [];
  if (user) {
    const nowIso = new Date().toISOString();
    const { data: ord } = await supabase
      .from("orders")
      .select("*")
      .eq("buyer_user_id", user.id)
      .eq("event_id", eventId)
      .in("status", ["capacity_held", "payment_pending"])
      .maybeSingle();

    if (ord) {
      const capOk =
        ord.status === "capacity_held" &&
        ord.capacity_hold_expires_at &&
        String(ord.capacity_hold_expires_at) > nowIso;
      const payOk =
        ord.status === "payment_pending" &&
        ord.payment_expires_at &&
        String(ord.payment_expires_at) > nowIso;
      if (capOk || payOk) {
        activeOrder = ord as Record<string, unknown>;
        if (ord.status === "payment_pending") {
          const { data: pay } = await supabase
            .from("payments")
            .select("provider_checkout_url")
            .eq("order_id", ord.id as string)
            .eq("status", "pending")
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();
          resumeCheckoutUrl = (pay?.provider_checkout_url as string) ?? null;
        }
      }
    }

    const { data: assignRows } = await supabase
      .from("orders")
      .select("id, status, quantity")
      .eq("buyer_user_id", user.id)
      .eq("event_id", eventId)
      .in("status", ["paid_unassigned", "partially_assigned"])
      .order("created_at", { ascending: false });

    const assignList = assignRows ?? [];
    const countByOrder = new Map<string, number>();
    if (assignList.length > 0) {
      const orderIds = assignList.map((r) => r.id as string);
      const { data: saRows } = await supabase
        .from("seat_assignments")
        .select("order_id")
        .in("order_id", orderIds)
        .in("status", ["assigned", "ticket_issued"]);
      for (const row of saRows ?? []) {
        const oid = row.order_id as string;
        countByOrder.set(oid, (countByOrder.get(oid) ?? 0) + 1);
      }
    }

    seatAssignmentOrders = assignList.map((r) => ({
      id: r.id as string,
      status: r.status as string,
      quantity: Number(r.quantity),
      assignedCount: countByOrder.get(r.id as string) ?? 0,
    }));

    const { data: completedOrders } = await supabase
      .from("orders")
      .select("id, quantity")
      .eq("buyer_user_id", user.id)
      .eq("event_id", eventId)
      .eq("status", "completed");

    const completedList = completedOrders ?? [];
    const completedIds = completedList.map((o) => o.id as string);

    if (completedIds.length > 0) {
      const { data: tixOrders } = await supabase
        .from("tickets")
        .select("order_id")
        .in("order_id", completedIds)
        .neq("status", "voided");

      const hasTicket = new Set((tixOrders ?? []).map((t) => t.order_id as string));
      ordersNeedingQrIssue = completedList
        .filter((o) => !hasTicket.has(o.id as string))
        .map((o) => ({ id: o.id as string, quantity: Number(o.quantity) }));
    }

    const { data: qrRows } = await supabase
      .from("tickets")
      .select(
        `id, ticket_code, attendee_name, attendee_email, order_id, emailed_at, email_last_error, status,
         seats ( display_label, seat_label, table_label ),
         ticket_types ( name )`
      )
      .eq("event_id", eventId)
      .neq("status", "voided")
      .order("issued_at", { ascending: true });

    qrTickets = (qrRows ?? []).map((r) => {
      const seatsRaw = r.seats as unknown;
      const typesRaw = r.ticket_types as unknown;
      const seats =
        Array.isArray(seatsRaw) && seatsRaw[0]
          ? (seatsRaw[0] as QrTicketListRow["seats"])
          : (seatsRaw as QrTicketListRow["seats"] | null);
      const ticket_types =
        Array.isArray(typesRaw) && typesRaw[0]
          ? (typesRaw[0] as QrTicketListRow["ticket_types"])
          : (typesRaw as QrTicketListRow["ticket_types"] | null);
      return {
        id: r.id as string,
        ticket_code: r.ticket_code as string,
        attendee_name: r.attendee_name as string,
        attendee_email: r.attendee_email as string,
        order_id: r.order_id as string,
        emailed_at: r.emailed_at ? String(r.emailed_at) : null,
        email_last_error: r.email_last_error ? String(r.email_last_error) : null,
        status: (r.status as string) ?? "issued",
        seats,
        ticket_types,
      };
    });
  }

  const typesWithSlots: TicketTypeWithSlots[] = await Promise.all(
    (ticketTypes ?? []).map(async (tt) => {
      const q = Number(tt.quantity);
      const baseLeft = await availableTicketQuantityForType(
        supabase,
        tt.id as string,
        Number.isFinite(q) ? q : 0
      );
      const ownBump =
        activeOrder && activeOrder.ticket_type_id === tt.id
          ? Number(activeOrder.quantity ?? 0)
          : 0;
      const slotsLeft = baseLeft + (Number.isFinite(ownBump) ? ownBump : 0);
      return { ...(tt as Record<string, unknown>), slotsLeft } as TicketTypeWithSlots;
    })
  );

  return {
    event: ev,
    ticketTypes: typesWithSlots,
    activeOrder,
    resumeCheckoutUrl,
    seatAssignmentOrders,
    ordersNeedingQrIssue,
    qrTickets,
    registrationOpen,
    message: null as string | null,
  };
}
