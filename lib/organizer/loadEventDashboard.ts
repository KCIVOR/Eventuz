import { createClient } from "@/lib/supabase/server";
import { availableTicketQuantityForType } from "@/lib/orders/inventory";
import { nestedOne } from "@/lib/supabase/nestedOne";

const PAID_ORDER_STATUSES = new Set([
  "paid_unassigned",
  "partially_assigned",
  "completed",
]);

export type OrganizerDashboardOrderRow = {
  id: string;
  buyer_user_id: string;
  buyer_label: string;
  buyer_email: string | null;
  status: string;
  quantity: number;
  total_amount: number;
  ticket_type_name: string;
  created_at: string;
  latest_payment: {
    status: string;
    amount: number;
    currency: string;
    created_at: string;
  } | null;
};

export type OrganizerDashboardTicketRow = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_code: string;
  status: string;
  ticket_type_name: string;
  checked_in_at: string | null;
  issued_at: string | null;
};

export type OrganizerDashboardAvailabilityRow = {
  ticket_type_id: string;
  name: string;
  capacity: number;
  available_for_sale: number;
  type_status: string;
};

export type OrganizerDashboardMetrics = {
  total_orders: number;
  paid_attendee_slots: number;
  pending_payments: number;
  active_checkout_holds: number;
  failed_payments: number;
  paid_unassigned_count: number;
  partially_assigned_count: number;
  revenue_succeeded_php: number;
  issued_tickets: number;
  checked_in_tickets: number;
};

export type OrganizerDashboardData = {
  event: {
    id: string;
    name: string;
    public_slug: string;
    event_date: string;
    event_time: string;
  };
  metrics: OrganizerDashboardMetrics;
  availability: OrganizerDashboardAvailabilityRow[];
  orders: OrganizerDashboardOrderRow[];
  paid_unassigned: OrganizerDashboardOrderRow[];
  partially_assigned: OrganizerDashboardOrderRow[];
  tickets: OrganizerDashboardTicketRow[];
  recent_check_ins: {
    scan_result: string;
    scanned_at: string;
    ticket_code: string | null;
    attendee_name: string | null;
  }[];
};

export async function loadOrganizerEventDashboard(
  eventId: string
): Promise<{ ok: true; data: OrganizerDashboardData } | { ok: false; reason: "auth" | "forbidden" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, name, organizer_id, public_slug, event_date, event_time")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event || event.organizer_id !== user.id) {
    return { ok: false, reason: "forbidden" };
  }

  const { data: ordersRaw } = await supabase
    .from("orders")
    .select(
      `id, buyer_user_id, status, quantity, total_amount, created_at,
       capacity_hold_expires_at, payment_expires_at,
       ticket_type_id,
       ticket_types ( id, name )`
    )
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const orderList = ordersRaw ?? [];
  const orderIds = orderList.map((o) => o.id as string);

  let paymentRows: {
    order_id: string;
    amount: number;
    currency: string;
    status: string;
    created_at: string;
  }[] = [];
  if (orderIds.length > 0) {
    const { data: payData } = await supabase
      .from("payments")
      .select("order_id, amount, currency, status, created_at")
      .in("order_id", orderIds)
      .order("created_at", { ascending: false });
    paymentRows = (payData ?? []) as typeof paymentRows;
  }

  const latestPaymentByOrder = new Map<
    string,
    { amount: number; currency: string; status: string; created_at: string }
  >();
  for (const p of paymentRows) {
    const oid = p.order_id as string;
    if (!latestPaymentByOrder.has(oid)) {
      latestPaymentByOrder.set(oid, {
        amount: Number(p.amount),
        currency: p.currency as string,
        status: p.status as string,
        created_at: p.created_at as string,
      });
    }
  }

  /** One revenue figure per order: latest succeeded payment wins (avoids double-count). */
  const succeededAmountByOrder = new Map<string, number>();
  const succeededTimeByOrder = new Map<string, string>();
  for (const p of paymentRows) {
    if (p.status !== "succeeded") continue;
    const oid = p.order_id as string;
    const t = p.created_at as string;
    const prevT = succeededTimeByOrder.get(oid);
    if (!prevT || t > prevT) {
      succeededTimeByOrder.set(oid, t);
      succeededAmountByOrder.set(oid, Number(p.amount));
    }
  }
  let revenueSucceeded = 0;
  for (const amt of succeededAmountByOrder.values()) {
    revenueSucceeded += amt;
  }

  const buyerIds = [...new Set(orderList.map((o) => o.buyer_user_id as string))];
  const { data: buyerProfiles } =
    buyerIds.length > 0
      ? await supabase.from("profiles").select("id, full_name, email").in("id", buyerIds)
      : { data: [] as { id: string; full_name: string; email: string | null }[] };

  const profileById = new Map(buyerProfiles?.map((p) => [p.id as string, p]) ?? []);

  const nowIso = new Date().toISOString();

  const mapOrderRow = (o: (typeof orderList)[0]): OrganizerDashboardOrderRow => {
    const prof = profileById.get(o.buyer_user_id as string);
    const name = prof?.full_name?.trim() || "";
    const lp = latestPaymentByOrder.get(o.id as string) ?? null;
    const tt = nestedOne(
      o.ticket_types as { name: string } | { name: string }[] | null | undefined
    );
    return {
      id: o.id as string,
      buyer_user_id: o.buyer_user_id as string,
      buyer_label: name || "Buyer",
      buyer_email: prof?.email ?? null,
      status: o.status as string,
      quantity: Number(o.quantity),
      total_amount: Number(o.total_amount),
      ticket_type_name: tt?.name ?? "—",
      created_at: o.created_at as string,
      latest_payment: lp
        ? {
            status: lp.status,
            amount: lp.amount,
            currency: lp.currency,
            created_at: lp.created_at,
          }
        : null,
    };
  };

  const orders: OrganizerDashboardOrderRow[] = orderList.map(mapOrderRow);

  const nonCancelledOrders = orderList.filter((o) => o.status !== "cancelled");
  const paidAttendeeSlots = orderList
    .filter((o) => PAID_ORDER_STATUSES.has(o.status as string))
    .reduce((s, o) => s + Number(o.quantity), 0);

  const pendingPayments = orderList.filter(
    (o) =>
      o.status === "payment_pending" &&
      o.payment_expires_at &&
      (o.payment_expires_at as string) > nowIso
  ).length;

  const activeCheckoutHolds = orderList.filter(
    (o) =>
      o.status === "capacity_held" &&
      o.capacity_hold_expires_at &&
      (o.capacity_hold_expires_at as string) > nowIso
  ).length;

  const failedPayments = orderList.filter((o) => o.status === "payment_failed").length;

  const paidUnassignedList = orders.filter((o) => o.status === "paid_unassigned");
  const partiallyAssignedList = orders.filter((o) => o.status === "partially_assigned");

  const { data: ticketTypes } = await supabase
    .from("ticket_types")
    .select("id, name, quantity, status")
    .eq("event_id", eventId)
    .order("created_at", { ascending: true });

  const availability: OrganizerDashboardAvailabilityRow[] = [];
  for (const tt of ticketTypes ?? []) {
    const cap = Number(tt.quantity);
    const avail = await availableTicketQuantityForType(supabase, tt.id as string, cap);
    availability.push({
      ticket_type_id: tt.id as string,
      name: tt.name as string,
      capacity: cap,
      available_for_sale: avail,
      type_status: tt.status as string,
    });
  }

  const { data: ticketsRaw } = await supabase
    .from("tickets")
    .select(
      `id, attendee_name, attendee_email, ticket_code, status, checked_in_at, issued_at,
       ticket_types ( name )`
    )
    .eq("event_id", eventId)
    .order("issued_at", { ascending: false });

  const tickets: OrganizerDashboardTicketRow[] = (ticketsRaw ?? []).map((t) => {
    const tt = nestedOne(t.ticket_types as { name: string } | { name: string }[] | null);
    return {
      id: t.id as string,
      attendee_name: t.attendee_name as string,
      attendee_email: t.attendee_email as string,
      ticket_code: t.ticket_code as string,
      status: t.status as string,
      ticket_type_name: tt?.name ?? "—",
      checked_in_at: (t.checked_in_at as string | null) ?? null,
      issued_at: (t.issued_at as string | null) ?? null,
    };
  });

  const issuedTickets = tickets.filter((t) => t.status !== "voided").length;
  const checkedInTickets = tickets.filter((t) => t.status === "checked_in").length;

  const { data: checkInsRaw } = await supabase
    .from("check_ins")
    .select(
      `scan_result, scanned_at, tickets ( ticket_code, attendee_name )`
    )
    .eq("event_id", eventId)
    .order("scanned_at", { ascending: false })
    .limit(20);

  const recent_check_ins = (checkInsRaw ?? []).map((r) => {
    const tk = nestedOne(
      r.tickets as { ticket_code: string; attendee_name: string } | { ticket_code: string; attendee_name: string }[] | null
    );
    return {
      scan_result: r.scan_result as string,
      scanned_at: r.scanned_at as string,
      ticket_code: tk?.ticket_code ?? null,
      attendee_name: tk?.attendee_name ?? null,
    };
  });

  const metrics: OrganizerDashboardMetrics = {
    total_orders: nonCancelledOrders.length,
    paid_attendee_slots: paidAttendeeSlots,
    pending_payments: pendingPayments,
    active_checkout_holds: activeCheckoutHolds,
    failed_payments: failedPayments,
    paid_unassigned_count: paidUnassignedList.length,
    partially_assigned_count: partiallyAssignedList.length,
    revenue_succeeded_php: revenueSucceeded,
    issued_tickets: issuedTickets,
    checked_in_tickets: checkedInTickets,
  };

  return {
    ok: true,
    data: {
      event: {
        id: event.id as string,
        name: event.name as string,
        public_slug: event.public_slug as string,
        event_date: event.event_date as string,
        event_time: String(event.event_time ?? ""),
      },
      metrics,
      availability,
      orders,
      paid_unassigned: paidUnassignedList,
      partially_assigned: partiallyAssignedList,
      tickets,
      recent_check_ins,
    },
  };
}
