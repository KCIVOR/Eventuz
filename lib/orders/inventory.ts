import type { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Clears this user's expired pre-payment orders (RLS-safe). */
export async function expireOwnStaleOrders(supabase: Supabase, buyerUserId: string) {
  const nowIso = new Date().toISOString();
  await supabase
    .from("orders")
    .update({ status: "expired" })
    .eq("buyer_user_id", buyerUserId)
    .eq("status", "capacity_held")
    .lt("capacity_hold_expires_at", nowIso);

  await supabase
    .from("orders")
    .update({ status: "expired" })
    .eq("buyer_user_id", buyerUserId)
    .eq("status", "payment_pending")
    .lt("payment_expires_at", nowIso);
}

/** @deprecated use expireOwnStaleOrders */
export async function expireOwnStaleCapacityHolds(supabase: Supabase, buyerUserId: string) {
  return expireOwnStaleOrders(supabase, buyerUserId);
}

const RESERVING_STATUSES = new Set([
  "paid_unassigned",
  "partially_assigned",
  "completed",
]);

function rowReservesCapacity(row: {
  status: string;
  quantity: number;
  capacity_hold_expires_at?: string | null;
  payment_expires_at?: string | null;
}, nowIso: string): boolean {
  const st = row.status;
  if (st === "capacity_held") {
    return Boolean(row.capacity_hold_expires_at && row.capacity_hold_expires_at > nowIso);
  }
  if (st === "payment_pending") {
    return Boolean(row.payment_expires_at && row.payment_expires_at > nowIso);
  }
  return RESERVING_STATUSES.has(st);
}

/**
 * Sum of quantities for this ticket type that count against organizer capacity:
 * active holds, payment-pending, paid unassigned, partially assigned, completed.
 */
export async function sumReservedQuantityForTicketType(
  _supabase: Supabase,
  ticketTypeId: string,
  options?: { excludeOrderId?: string }
): Promise<number> {
  const nowIso = new Date().toISOString();
  const inventoryClient = createServiceRoleClient();
  const { data, error } = await inventoryClient
    .from("orders")
    .select("id, quantity, status, capacity_hold_expires_at, payment_expires_at")
    .eq("ticket_type_id", ticketTypeId);

  if (error || !data) return 0;

  let sum = 0;
  for (const row of data) {
    if (options?.excludeOrderId && row.id === options.excludeOrderId) continue;
    if (rowReservesCapacity(row as { status: string; quantity: number; capacity_hold_expires_at?: string | null; payment_expires_at?: string | null }, nowIso)) {
      sum += Number(row.quantity);
    }
  }
  return sum;
}

/** Available ticket inventory for a type = declared quantity − reserved (orders). */
export async function availableTicketQuantityForType(
  supabase: Supabase,
  ticketTypeId: string,
  ticketTypeQuantity: number,
  options?: { excludeOrderId?: string }
): Promise<number> {
  const reserved = await sumReservedQuantityForTicketType(supabase, ticketTypeId, options);
  return Math.max(0, ticketTypeQuantity - reserved);
}

/** @deprecated prefer availableTicketQuantityForType (Phase 7 uses ticket_types.quantity) */
export async function countAvailableSeatsForTicketType(
  supabase: Supabase,
  ticketTypeId: string
): Promise<number> {
  const { count, error } = await supabase
    .from("seats")
    .select("*", { count: "exact", head: true })
    .eq("ticket_type_id", ticketTypeId)
    .eq("status", "available");

  if (error) return 0;
  return count ?? 0;
}

export function slotsLeftForTicketType(ticketQuantity: number, heldElsewhere: number): number {
  return Math.max(0, ticketQuantity - heldElsewhere);
}
