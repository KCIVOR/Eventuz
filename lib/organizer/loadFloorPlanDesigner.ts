import {
  FLOOR_PLAN_CANVAS_HEIGHT,
  FLOOR_PLAN_CANVAS_WIDTH,
  FLOOR_PLAN_GRID_SIZE,
  type FloorPlanLayout,
  type FloorPlanTicketType,
} from "@/lib/organizer/floorPlan";
import { createClient } from "@/lib/supabase/server";

export type OrganizerFloorPlanDesignerData = {
  ticketTypes: FloorPlanTicketType[];
  layout: FloorPlanLayout;
  canvasWidth: number;
  canvasHeight: number;
  gridSize: number;
};

export async function loadOrganizerFloorPlanDesigner(eventId: string): Promise<
  | { ok: true; data: OrganizerFloorPlanDesignerData }
  | { ok: false; reason: "auth" | "forbidden" }
> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event || event.organizer_id !== user.id) {
    return { ok: false, reason: "forbidden" };
  }

  const [{ data: ticketRows }, { data: planRow }] = await Promise.all([
    supabase
      .from("ticket_types")
      .select(
        "id, name, quantity, seat_layout_mode, seat_layout_rows, seat_layout_columns, seat_layout_table_count, seat_layout_seats_per_table, seat_overview_order, created_at"
      )
      .eq("event_id", eventId)
      .order("seat_overview_order", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
    supabase
      .from("event_floor_plans")
      .select("layout_json, canvas_width, canvas_height, grid_size")
      .eq("event_id", eventId)
      .maybeSingle(),
  ]);

  const ticketTypes: FloorPlanTicketType[] = (ticketRows ?? []).map((row) => ({
    id: row.id as string,
    name: (row.name as string) || "Ticket",
    quantity: Number(row.quantity ?? 0),
    seatLayoutMode: row.seat_layout_mode === "tables" ? "tables" : "rowed",
    seatLayoutRows: row.seat_layout_rows == null ? null : Number(row.seat_layout_rows),
    seatLayoutColumns: row.seat_layout_columns == null ? null : Number(row.seat_layout_columns),
    seatLayoutTableCount: row.seat_layout_table_count == null ? null : Number(row.seat_layout_table_count),
    seatLayoutSeatsPerTable:
      row.seat_layout_seats_per_table == null ? null : Number(row.seat_layout_seats_per_table),
  }));

  const layoutJson = planRow?.layout_json;
  const layout =
    layoutJson && typeof layoutJson === "object" && Array.isArray((layoutJson as { elements?: unknown }).elements)
      ? (layoutJson as FloorPlanLayout)
      : { elements: [] };

  return {
    ok: true,
    data: {
      ticketTypes,
      layout,
      canvasWidth: Number(planRow?.canvas_width ?? FLOOR_PLAN_CANVAS_WIDTH),
      canvasHeight: Number(planRow?.canvas_height ?? FLOOR_PLAN_CANVAS_HEIGHT),
      gridSize: Number(planRow?.grid_size ?? FLOOR_PLAN_GRID_SIZE),
    },
  };
}
