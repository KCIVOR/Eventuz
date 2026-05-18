import { isHitPayDevSimulationAllowed } from "@/lib/payments/hitpayDevSimulation";
import { createClient } from "@/lib/supabase/server";

type PaymentWaitOk = {
  ok: true;
  order: {
    id: string;
    eventId: string;
    status: string;
    quantity: number;
    totalAmount: number;
    paymentExpiresAt: string | null;
    checkoutUrl: string | null;
    eventName: string;
    eventVenue: string;
    eventDate: string | null;
    eventTime: string | null;
    ticketTypeName: string;
    showDevSimulation: boolean;
  };
};

type PaymentWaitError = {
  ok: false;
  message: string;
  redirectToLogin?: boolean;
};

function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export type PaymentWaitContext = PaymentWaitOk | PaymentWaitError;

export async function loadPaymentWaitContext(orderId?: string | null): Promise<PaymentWaitContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, message: "Sign in to view payment status.", redirectToLogin: true };
  }

  if (!orderId) {
    return { ok: false, message: "Missing payment order." };
  }

  const { data: order, error } = await supabase
    .from("orders")
    .select(
      `id, event_id, status, quantity, total_amount, payment_expires_at,
       events ( name, venue, event_date, event_time, organizer_id ),
       ticket_types ( name )`
    )
    .eq("id", orderId)
    .eq("buyer_user_id", user.id)
    .maybeSingle();

  if (error || !order) {
    return { ok: false, message: "Payment order was not found." };
  }

  const { data: payment } = await supabase
    .from("payments")
    .select("provider_checkout_url")
    .eq("order_id", order.id as string)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const event = one(
    order.events as
      | {
          name: string | null;
          venue: string | null;
          event_date: string | null;
          event_time: string | null;
          organizer_id: string | null;
        }
      | {
          name: string | null;
          venue: string | null;
          event_date: string | null;
          event_time: string | null;
          organizer_id: string | null;
        }[]
      | null
  );
  const ticketType = one(order.ticket_types as { name: string | null } | { name: string | null }[] | null);
  const organizerId = event?.organizer_id ? String(event.organizer_id) : "";
  const showDevSimulation = organizerId ? await isHitPayDevSimulationAllowed(organizerId) : false;

  return {
    ok: true,
    order: {
      id: order.id as string,
      eventId: order.event_id as string,
      status: order.status as string,
      quantity: Number(order.quantity) || 0,
      totalAmount: Number(order.total_amount) || 0,
      paymentExpiresAt: order.payment_expires_at ? String(order.payment_expires_at) : null,
      checkoutUrl: payment?.provider_checkout_url ? String(payment.provider_checkout_url) : null,
      eventName: event?.name?.trim() || "Event",
      eventVenue: event?.venue?.trim() || "Venue to be announced",
      eventDate: event?.event_date ? String(event.event_date) : null,
      eventTime: event?.event_time ? String(event.event_time).slice(0, 5) : null,
      ticketTypeName: ticketType?.name?.trim() || "Ticket",
      showDevSimulation,
    },
  };
}
