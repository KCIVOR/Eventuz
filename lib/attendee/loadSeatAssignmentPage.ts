import { createClient } from "@/lib/supabase/server";
import { resolveAttendeeFacingEvent } from "@/lib/event/attendeeEvent";
import { runStaleOrderCleanup } from "@/lib/orders/cleanup";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import {
  FLOOR_PLAN_BACKGROUND_COLOR,
  FLOOR_PLAN_CANVAS_HEIGHT,
  FLOOR_PLAN_CANVAS_WIDTH,
  FLOOR_PLAN_GRID_SIZE,
  floorPlanSeatCount,
  isFloorPlanSeatElement,
  type FloorPlanLayout,
  type FloorPlanTicketType,
  validateFloorPlanLayout,
} from "@/lib/organizer/floorPlan";

export type SeatPickerRow = {
  id: string;
  display_label: string;
  seat_label: string;
  table_label: string | null;
  status: string;
  is_owned_assignment: boolean;
};

export type ExistingAssignment = {
  seat_id: string;
  attendee_name: string;
  attendee_email: string;
};

export type AssignableOrder = {
  id: string;
  quantity: number;
  total_amount: number;
  unit_price_locked: number;
  pricing_type: string;
  ticket_type_id: string;
  status: string;
};

export type SeatAssignmentPageOk = {
  ok: true;
  eventName: string;
  eventId: string;
  order: AssignableOrder;
  ticketTypeName: string;
  seatLayoutMode: "rowed" | "tables";
  seats: SeatPickerRow[];
  initialAssignments: ExistingAssignment[];
  /** Count of seat rows for this ticket type (any status). 0 usually means no seating plan exists yet */
  seatInventoryTotal: number;
  floorPlanPreview: AttendeeFloorPlanPreview | null;
};

export type AttendeeFloorPlanPreview = {
  layout: FloorPlanLayout;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
  currentTicketTypeId: string;
};

export type SeatWorkOrderPick = {
  id: string;
  quantity: number;
  ticketTypeName: string;
};

/** Non-assignable states stay on-page with guidance (no silent redirect to invitation). */
export type SeatAssignmentPageErr = {
  ok: false;
  message: string;
  /** Legacy: only login guard uses redirect */
  redirectToLogin?: boolean;
  variant?:
    | "no_event"
    | "locked_need_purchase"
    | "choose_order"
    | "invalid_order"
    | "not_assignable_order";
  /** choose_order: multiple paid orders need seats — pick one */
  seatWorkOrders?: SeatWorkOrderPick[];
};

export async function loadSeatAssignmentPage(
  orderIdFromQuery: string | null | undefined
): Promise<SeatAssignmentPageOk | SeatAssignmentPageErr> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to assign seats.", redirectToLogin: true };
  }

  await runStaleOrderCleanup(supabase, { buyerUserId: user.id });

  const { event: ev, message: evMsg } = await resolveAttendeeFacingEvent(supabase, {
    buyerUserId: user.id,
  });
  if (!ev || evMsg) {
    return { ok: false, message: evMsg ?? "No event available.", variant: "no_event" };
  }

  const eventId = ev.id as string;
  const eventName = (ev.name as string) || "Event";
  const q = orderIdFromQuery?.trim() || "";

  let orderId = q;
  if (!orderId) {
    const { data: rowData, error: rowErr } = await supabase
      .from("orders")
      .select(
        `id, quantity, ticket_type_id,
         ticket_types ( name )`
      )
      .eq("buyer_user_id", user.id)
      .eq("event_id", eventId)
      .in("status", ["paid_unassigned", "partially_assigned"])
      .order("created_at", { ascending: false });

    if (rowErr) {
      return { ok: false, message: rowErr.message, variant: "no_event" };
    }

    const list = rowData ?? [];
    if (list.length === 0) {
      return {
        ok: false,
        variant: "locked_need_purchase",
        message:
          "Seat selection opens after your payment is confirmed. Purchase a ticket first, then return here to choose seats.",
      };
    }
    if (list.length > 1) {
      const seatWorkOrders: SeatWorkOrderPick[] = list.map((r) => {
        const ttRaw = r.ticket_types as { name?: string } | { name?: string }[] | null;
        const ttName = Array.isArray(ttRaw)
          ? (ttRaw[0]?.name as string | undefined)
          : (ttRaw?.name as string | undefined);
        return {
          id: r.id as string,
          quantity: Number(r.quantity),
          ticketTypeName: ttName ?? "Ticket",
        };
      });
      return {
        ok: false,
        variant: "choose_order",
        message: "You have more than one order waiting for seats. Choose which one to set up first.",
        seatWorkOrders,
      };
    }
    orderId = list[0].id as string;
  }

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select(
      "id, quantity, total_amount, unit_price_locked, pricing_type, ticket_type_id, status, buyer_user_id, event_id"
    )
    .eq("id", orderId)
    .maybeSingle();

  if (oErr || !order) {
    return {
      ok: false,
      variant: "invalid_order",
      message: oErr?.message ?? "That order could not be found.",
    };
  }

  if ((order.buyer_user_id as string) !== user.id) {
    return {
      ok: false,
      variant: "invalid_order",
      message: "You can only manage your own orders.",
    };
  }

  if ((order.event_id as string) !== eventId) {
    return {
      ok: false,
      variant: "invalid_order",
      message: "This order is not for the published event.",
    };
  }

  const st = order.status as string;
  if (st === "completed") {
    return {
      ok: false,
      variant: "not_assignable_order",
      message:
        "Seats are already saved for this order. View your passes under Your tickets when they’re ready.",
    };
  }
  if (st !== "paid_unassigned" && st !== "partially_assigned") {
    return {
      ok: false,
      variant: "not_assignable_order",
      message:
        "This order isn’t open for seat assignment yet. Finish payment first, or check Your tickets if checkout is complete.",
    };
  }

  const ticketTypeId = order.ticket_type_id as string;

  const { data: tt } = await supabase
    .from("ticket_types")
    .select("name, seat_layout_mode")
    .eq("id", ticketTypeId)
    .maybeSingle();

  const ticketTypeName = (tt?.name as string) || "Ticket";
  const seatLayoutMode = tt?.seat_layout_mode === "tables" ? "tables" : "rowed";

  const { data: seatRows } = await supabase
    .from("seats")
    .select("id, display_label, seat_label, table_label, status")
    .eq("event_id", eventId)
    .eq("ticket_type_id", ticketTypeId)
    .order("display_label", { ascending: true });

  const { data: existing } = await supabase
    .from("seat_assignments")
    .select("seat_id, attendee_name, attendee_email")
    .eq("order_id", orderId)
    .in("status", ["assigned", "ticket_issued"]);

  const assignedIds = [...new Set((existing ?? []).map((r) => r.seat_id as string))];

  const byId = new Map<string, SeatPickerRow>();
  for (const r of seatRows ?? []) {
    byId.set(r.id as string, {
      id: r.id as string,
      display_label: (r.display_label as string) ?? "",
      seat_label: (r.seat_label as string) ?? "",
      table_label: (r.table_label as string | null) ?? null,
      status: (r.status as string) ?? "available",
      is_owned_assignment: assignedIds.includes(r.id as string),
    });
  }

  const seats = Array.from(byId.values()).sort((a, b) =>
    a.display_label.localeCompare(b.display_label, undefined, { numeric: true })
  );

  const { count: seatInventoryTotal } = await supabase
    .from("seats")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .eq("ticket_type_id", ticketTypeId);

  const floorPlanPreview = await loadAttendeeFloorPlanPreview({
    eventId,
    ticketTypeId,
    seatLayoutMode,
    seats,
    seatInventoryTotal: seatInventoryTotal ?? 0,
  });

  return {
    ok: true,
    eventName,
    eventId,
    order: {
      id: order.id as string,
      quantity: Number(order.quantity),
      total_amount: Number(order.total_amount),
      unit_price_locked: Number(order.unit_price_locked),
      pricing_type: order.pricing_type as string,
      ticket_type_id: ticketTypeId,
      status: st,
    },
    ticketTypeName,
    seatLayoutMode,
    seats,
    seatInventoryTotal: seatInventoryTotal ?? 0,
    floorPlanPreview,
    initialAssignments: (existing ?? []).map((r) => ({
      seat_id: r.seat_id as string,
      attendee_name: r.attendee_name as string,
      attendee_email: r.attendee_email as string,
    })),
  };
}

async function loadAttendeeFloorPlanPreview({
  eventId,
  ticketTypeId,
  seatLayoutMode,
  seats,
  seatInventoryTotal,
}: {
  eventId: string;
  ticketTypeId: string;
  seatLayoutMode: "rowed" | "tables";
  seats: SeatPickerRow[];
  seatInventoryTotal: number;
}): Promise<AttendeeFloorPlanPreview | null> {
  if (seatInventoryTotal === 0 || seats.length === 0) return null;

  let admin;
  try {
    admin = createServiceRoleClient();
  } catch {
    return null;
  }

  const [{ data: ticketRows, error: ticketErr }, { data: planRow, error: planErr }] =
    await Promise.all([
      admin
        .from("ticket_types")
        .select(
          "id, name, quantity, seat_layout_mode, seat_layout_rows, seat_layout_columns, seat_layout_table_count, seat_layout_seats_per_table"
        )
        .eq("event_id", eventId)
        .order("created_at", { ascending: true }),
      admin
        .from("event_floor_plans")
        .select("layout_json, canvas_width, canvas_height, grid_size")
        .eq("event_id", eventId)
        .maybeSingle(),
    ]);

  if (ticketErr || planErr || !ticketRows || !planRow?.layout_json) return null;

  const ticketTypes: FloorPlanTicketType[] = ticketRows.map((row) => ({
    id: row.id as string,
    name: (row.name as string) || "Ticket",
    quantity: Number(row.quantity ?? 0),
    seatLayoutMode: row.seat_layout_mode === "tables" ? "tables" : "rowed",
    seatLayoutRows: row.seat_layout_rows == null ? null : Number(row.seat_layout_rows),
    seatLayoutColumns: row.seat_layout_columns == null ? null : Number(row.seat_layout_columns),
    seatLayoutTableCount:
      row.seat_layout_table_count == null ? null : Number(row.seat_layout_table_count),
    seatLayoutSeatsPerTable:
      row.seat_layout_seats_per_table == null ? null : Number(row.seat_layout_seats_per_table),
  }));

  const canvasWidth = Number(planRow.canvas_width ?? FLOOR_PLAN_CANVAS_WIDTH);
  const canvasHeight = Number(planRow.canvas_height ?? FLOOR_PLAN_CANVAS_HEIGHT);
  const validated = validateFloorPlanLayout(planRow.layout_json, ticketTypes, {
    strictAllocation: true,
    canvasWidth,
    canvasHeight,
  });
  if (!validated.ok) return null;

  const currentElements = validated.layout.elements.filter(
    (element) => isFloorPlanSeatElement(element.type) && element.ticketTypeId === ticketTypeId
  );
  const allocated = currentElements.reduce((sum, element) => sum + floorPlanSeatCount(element), 0);
  if (allocated !== seats.length || allocated !== seatInventoryTotal) return null;

  if (seatLayoutMode === "tables") {
    for (const element of currentElements) {
      if (!element.ticketTableNumber) return null;
      const tableLabel = `T${element.ticketTableNumber}`;
      const tableSeats = seats.filter((seat) => seat.table_label === tableLabel);
      if (tableSeats.length !== floorPlanSeatCount(element)) return null;
    }
  }

  return {
    layout: {
      ...validated.layout,
      backgroundColor: validated.layout.backgroundColor ?? FLOOR_PLAN_BACKGROUND_COLOR,
    },
    canvasWidth,
    canvasHeight,
    gridSize: Number(planRow.grid_size ?? FLOOR_PLAN_GRID_SIZE),
    currentTicketTypeId: ticketTypeId,
  };
}
