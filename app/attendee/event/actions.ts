"use server";

import { createClient } from "@/lib/supabase/server";
import { runStaleOrderCleanup } from "@/lib/orders/cleanup";
import {
  availableTicketQuantityForType,
} from "@/lib/orders/inventory";
import { computeEarlyBirdPriceLockExpiresAt, resolveUnitPrice } from "@/lib/orders/pricing";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createHitPayCheckout } from "@/lib/payments/hitpayClient";
import { isHitPayDevSimulationAllowed } from "@/lib/payments/hitpayDevSimulation";
import { deliverTicketEmailsForOrder } from "@/lib/tickets/deliverTicketEmails";
import { getAppOrigin } from "@/lib/url/site";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type HoldActionState = { error?: string; ok?: boolean };

export type PayActionState = { error?: string };

export type HitPaySimulateState = { error?: string; ok?: boolean };

/** Dev only (ALLOW_HITPAY_DEV_SIMULATION): mark pending HitPay payment succeeded like a real webhook. */
export async function simulateHitPaySuccessAction(
  _prev: HitPaySimulateState | undefined,
  formData: FormData
): Promise<HitPaySimulateState> {
  if (!isHitPayDevSimulationAllowed()) {
    return { error: "Payment simulation is not enabled (set ALLOW_HITPAY_DEV_SIMULATION=true locally)." };
  }

  const orderId = String(formData.get("order_id") ?? "").trim();
  const eventId = String(formData.get("event_id") ?? "").trim();

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.role !== "attendee") {
    return { error: "Only attendees can use this." };
  }
  if (profile?.status === "disabled") {
    return { error: "This account has been disabled." };
  }

  if (!orderId || !eventId) {
    return { error: "Missing order or event." };
  }

  await runStaleOrderCleanup(supabase, { buyerUserId: user.id });

  const { data: eventRow } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .maybeSingle();

  if (!eventRow || eventRow.status !== "published") {
    return { error: "This event is not open for checkout." };
  }

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("id, buyer_user_id, event_id, status, total_amount, payment_expires_at")
    .eq("id", orderId)
    .eq("buyer_user_id", user.id)
    .eq("event_id", eventId)
    .maybeSingle();

  if (oErr || !order) {
    return { error: "Order not found." };
  }

  if (order.status !== "payment_pending") {
    if (order.status === "paid_unassigned") {
      return { ok: true };
    }
    return { error: "Only payment-in-progress orders can be simulated." };
  }

  if (!order.payment_expires_at || String(order.payment_expires_at) <= new Date().toISOString()) {
    return { error: "Payment window has expired. Refresh and try a new hold." };
  }

  const amountOrder = Math.round(Number(order.total_amount) * 100) / 100;

  const { data: payment } = await supabase
    .from("payments")
    .select("id, status, amount, currency")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!payment) {
    return { error: "No pending payment record for this order." };
  }

  const payAmt = Math.round(Number(payment.amount) * 100) / 100;
  if (!Number.isFinite(payAmt) || Math.abs(payAmt - amountOrder) > 0.01) {
    return { error: "Payment amount does not match order total." };
  }

  const nowIso = new Date().toISOString();
  const payload = { source: "dev_simulation", at: nowIso };

  const { data: payRows, error: upPay } = await supabase
    .from("payments")
    .update({
      status: "succeeded",
      provider_payment_id: "dev-simulation",
      webhook_received_at: nowIso,
      raw_webhook_payload: payload,
    })
    .eq("id", payment.id as string)
    .eq("status", "pending")
    .select("id");

  if (upPay) {
    return { error: upPay.message };
  }

  if (!payRows?.length) {
    const { data: cur } = await supabase.from("payments").select("status").eq("id", payment.id).maybeSingle();
    if (cur?.status === "succeeded") {
      const { data: ord2 } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
      if (ord2?.status === "paid_unassigned") {
        revalidatePath("/attendee/event");
        return { ok: true };
      }
    }
    return { error: "Could not confirm payment (already updated?)." };
  }

  const { error: upOrd, data: ordUpdated } = await supabase
    .from("orders")
    .update({ status: "paid_unassigned" })
    .eq("id", orderId)
    .eq("status", "payment_pending")
    .select("id");

  if (upOrd) {
    return { error: upOrd.message };
  }

  if (!ordUpdated?.length) {
    const { data: cur } = await supabase.from("orders").select("status").eq("id", orderId).maybeSingle();
    if (cur?.status !== "paid_unassigned") {
      return { error: "Order was not in payment_pending." };
    }
  }

  await writeAuditLogSafe(supabase, {
    action: "hitpay.dev_simulation",
    entityType: "payment",
    entityId: payment.id as string,
    metadata: { order_id: orderId, event_id: eventId },
  });

  revalidatePath("/attendee/event");
  return { ok: true };
}

export async function placeHoldAction(
  _prev: HoldActionState | undefined,
  formData: FormData
): Promise<HoldActionState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "You must be signed in." };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "attendee") {
    return { error: "Only attendees can reserve tickets." };
  }
  if (profile?.status === "disabled") {
    return { error: "This account has been disabled." };
  }

  await runStaleOrderCleanup(supabase, { buyerUserId: user.id });

  const eventId = String(formData.get("event_id") ?? "");
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  const qtyRaw = Number(formData.get("quantity"));

  if (!eventId || !ticketTypeId) {
    return { error: "Missing event or ticket type." };
  }
  if (!Number.isFinite(qtyRaw) || qtyRaw < 1 || !Number.isInteger(qtyRaw)) {
    return { error: "Choose a whole number of tickets (at least 1)." };
  }

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select(
      "id, status, capacity_hold_minutes, payment_hold_minutes, early_bird_hold_minutes"
    )
    .eq("id", eventId)
    .single();

  if (evErr || !event || event.status !== "published") {
    return { error: "This event is not open for registration." };
  }

  const { data: tt, error: ttErr } = await supabase
    .from("ticket_types")
    .select("*")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .single();

  if (ttErr || !tt || tt.status !== "active") {
    return { error: "This ticket type is not available." };
  }

  const typeQuantity = Number(tt.quantity);
  if (!Number.isFinite(typeQuantity) || typeQuantity < 1) {
    return { error: "Invalid ticket capacity." };
  }

  const { data: existingHold } = await supabase
    .from("orders")
    .select("id, quantity, ticket_type_id, status")
    .eq("buyer_user_id", user.id)
    .eq("event_id", eventId)
    .in("status", ["capacity_held", "payment_pending"])
    .maybeSingle();

  if (existingHold?.status === "payment_pending") {
    return {
      error:
        "You have a payment in progress. Open HitPay checkout or release this reservation to change tickets.",
    };
  }

  const now = new Date();

  const maxSlots = await availableTicketQuantityForType(
    supabase,
    ticketTypeId,
    typeQuantity,
    existingHold?.id ? { excludeOrderId: existingHold.id as string } : undefined
  );

  if (qtyRaw > maxSlots) {
    return {
      error:
        maxSlots <= 0
          ? "This ticket type is sold out for now."
          : `Only ${maxSlots} ticket slot(s) left for this type.`,
    };
  }

  const { unitPrice, pricingType } = resolveUnitPrice({
    regularPrice: Number(tt.regular_price),
    earlyBirdPrice: Number(tt.early_bird_price),
    earlyBirdStartAt: tt.early_bird_start_at as string | null,
    earlyBirdEndAt: tt.early_bird_end_at as string | null,
    at: now,
  });

  const total = Math.round(unitPrice * qtyRaw * 100) / 100;
  const capMins = Number(event.capacity_hold_minutes) || 15;
  const payMins = Number(event.payment_hold_minutes) || 15;
  const ebHoldMins = Number(event.early_bird_hold_minutes) || 15;

  const capacityHoldExpiresAt = new Date(now.getTime() + capMins * 60 * 1000).toISOString();
  const paymentExpiresAt = new Date(now.getTime() + payMins * 60 * 1000).toISOString();
  const earlyBirdPriceExpiresAt = computeEarlyBirdPriceLockExpiresAt({
    pricingType,
    earlyBirdEndAt: tt.early_bird_end_at as string | null,
    earlyBirdHoldMinutes: ebHoldMins,
    at: now,
  });

  if (existingHold?.id) {
    const { error: upErr } = await supabase
      .from("orders")
      .update({
        ticket_type_id: ticketTypeId,
        quantity: qtyRaw,
        unit_price_locked: unitPrice,
        total_amount: total,
        pricing_type: pricingType,
        status: "capacity_held",
        capacity_hold_expires_at: capacityHoldExpiresAt,
        payment_expires_at: paymentExpiresAt,
        early_bird_price_expires_at: earlyBirdPriceExpiresAt,
      })
      .eq("id", existingHold.id)
      .eq("buyer_user_id", user.id);

    if (upErr) {
      return { error: upErr.message };
    }
  } else {
    const { data: insertedOrder, error: insErr } = await supabase
      .from("orders")
      .insert({
        buyer_user_id: user.id,
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        quantity: qtyRaw,
        unit_price_locked: unitPrice,
        total_amount: total,
        pricing_type: pricingType,
        status: "capacity_held",
        capacity_hold_expires_at: capacityHoldExpiresAt,
        payment_expires_at: paymentExpiresAt,
        early_bird_price_expires_at: earlyBirdPriceExpiresAt,
      })
      .select("id")
      .single();

    if (insErr) {
      return { error: insErr.message };
    }
    if (insertedOrder?.id) {
      await writeAuditLogSafe(supabase, {
        action: "order.created",
        entityType: "order",
        entityId: insertedOrder.id as string,
        metadata: {
          event_id: eventId,
          ticket_type_id: ticketTypeId,
          quantity: qtyRaw,
          status: "capacity_held",
        },
      });
    }
  }

  revalidatePath("/attendee/event");
  return { ok: true };
}

export async function releaseHoldAction(
  _prev: HoldActionState | undefined,
  formData: FormData
): Promise<HoldActionState> {
  const orderId = String(formData.get("order_id") ?? "");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !orderId) {
    return { error: "Missing order." };
  }

  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("buyer_user_id", user.id)
    .in("status", ["capacity_held", "payment_pending"]);

  if (error) {
    return { error: error.message };
  }

  revalidatePath("/attendee/event");
  return { ok: true };
}

export async function startHitPayCheckoutAction(
  _prev: PayActionState | undefined,
  formData: FormData
): Promise<PayActionState> {
  const orderId = String(formData.get("order_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email?.trim()) {
    return { error: "Sign in with an email address to use HitPay checkout." };
  }

  if (!orderId || !eventId) {
    return { error: "Missing order or event." };
  }

  await runStaleOrderCleanup(supabase, { buyerUserId: user.id });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status, full_name")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "attendee") {
    return { error: "Only attendees can check out." };
  }
  if (profile?.status === "disabled") {
    return { error: "This account has been disabled." };
  }

  const { data: order, error: oErr } = await supabase
    .from("orders")
    .select("*")
    .eq("id", orderId)
    .eq("buyer_user_id", user.id)
    .eq("event_id", eventId)
    .single();

  if (oErr || !order) {
    return { error: "Order not found." };
  }

  const { data: eventRow, error: evRowErr } = await supabase
    .from("events")
    .select("status")
    .eq("id", eventId)
    .maybeSingle();
  if (evRowErr || !eventRow || eventRow.status !== "published") {
    return { error: "This event is not open for checkout." };
  }

  if (order.status === "payment_pending") {
    const { data: pend } = await supabase
      .from("payments")
      .select("provider_checkout_url, amount")
      .eq("order_id", orderId)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (pend?.provider_checkout_url) {
      redirect(pend.provider_checkout_url as string);
    }
    return {
      error:
        "Payment is marked in progress but no checkout link was found. Release the reservation or contact support.",
    };
  }

  if (order.status !== "capacity_held") {
    return { error: "Only orders with an active capacity hold can start HitPay checkout." };
  }

  const nowIso = new Date().toISOString();
  if (!order.capacity_hold_expires_at || String(order.capacity_hold_expires_at) <= nowIso) {
    return { error: "Your capacity hold has expired. Refresh the page and reserve again." };
  }
  if (!order.payment_expires_at || String(order.payment_expires_at) <= nowIso) {
    return { error: "The payment window for this reservation has expired." };
  }

  const amount = Math.round(Number(order.total_amount) * 100) / 100;
  if (!Number.isFinite(amount) || amount < 0.3) {
    return { error: "This order total is below HitPay minimum (0.30)." };
  }

  const currency = (process.env.HITPAY_CURRENCY ?? "PHP").trim().toUpperCase();

  const { data: existingPending } = await supabase
    .from("payments")
    .select("provider_checkout_url, amount")
    .eq("order_id", orderId)
    .eq("status", "pending")
    .maybeSingle();

  if (existingPending?.provider_checkout_url) {
    const prev = Math.round(Number(existingPending.amount) * 100) / 100;
    if (prev === amount) {
      redirect(existingPending.provider_checkout_url as string);
    }
  }

  const origin = await getAppOrigin();
  const redirectUrl = `${origin}/attendee/event?hitpay_return=1`;
  const webhookUrl = process.env.HITPAY_WEBHOOK_URL?.trim() || null;

  let hitpay: { id: string; url: string };
  if (isHitPayDevSimulationAllowed()) {
    // Skip HitPay API: simulation only completes after "Simulate payment succeeded",
    // which needs payment_pending + a pending payments row (same as real checkout).
    hitpay = { id: `dev-checkout-${orderId}`, url: redirectUrl };
  } else {
    try {
      hitpay = await createHitPayCheckout({
        amount,
        currency,
        email: user.email,
        name: (profile?.full_name as string) || undefined,
        referenceNumber: orderId,
        redirectUrl,
        webhookUrl,
      });
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Could not reach HitPay." };
    }
  }

  const { data: inserted, error: insErr } = await supabase
    .from("payments")
    .insert({
      order_id: orderId,
      provider: "hitpay",
      provider_checkout_id: hitpay.id,
      provider_checkout_url: hitpay.url,
      amount,
      currency,
      status: "pending",
    })
    .select("id")
    .single();

  if (insErr || !inserted?.id) {
    return { error: insErr?.message ?? "Could not save payment record." };
  }

  const { error: upErr } = await supabase
    .from("orders")
    .update({ status: "payment_pending" })
    .eq("id", orderId)
    .eq("buyer_user_id", user.id)
    .eq("status", "capacity_held");

  if (upErr) {
    await supabase.from("payments").delete().eq("id", inserted.id as string);
    return { error: upErr.message };
  }

  revalidatePath("/attendee/event");
  redirect(hitpay.url);
}

export async function issueAdmissionTicketsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/attendee/event");
  }

  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) {
    redirect("/attendee/event?ticketErr=missing_order");
  }

  const { error } = await supabase.rpc("issue_qr_tickets_for_order", {
    p_order_id: orderId,
  });

  if (error) {
    redirect(`/attendee/event?ticketErr=${encodeURIComponent(error.message)}`);
  }

  try {
    await deliverTicketEmailsForOrder(supabase, orderId, user.id);
  } catch {
    /* Delivery errors are stored on tickets; issuance already succeeded. */
  }

  revalidatePath("/attendee/event");
  revalidatePath("/attendee/event/tickets", "layout");
  redirect("/attendee/event?ticketsOk=1");
}

export async function retryTicketEmailsAction(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/attendee/event");
  }

  const orderId = String(formData.get("order_id") ?? "");
  if (!orderId) {
    redirect("/attendee/event?ticketErr=missing_order");
  }

  try {
    await deliverTicketEmailsForOrder(supabase, orderId, user.id);
  } catch {
    /* errors on ticket rows */
  }

  revalidatePath("/attendee/event");
  revalidatePath("/attendee/event/tickets", "layout");
  redirect("/attendee/event?ticketsOk=1");
}
