import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { verifyHitPayWebhookSignature } from "@/lib/payments/hitpayVerify";

export type HitPayWebhookResult =
  | { ok: true; detail: string }
  | { ok: false; status: number; detail: string };

function parseAmount(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value * 100) / 100;
  }
  if (typeof value === "string") {
    const n = Number.parseFloat(value);
    return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
  }
  return null;
}

function normCurrency(c: unknown): string | null {
  if (typeof c !== "string" || !c.trim()) return null;
  return c.trim().toUpperCase();
}

function isUuid(s: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(s);
}

type PaymentRequestPayload = {
  id?: string;
  reference_number?: string;
  amount?: string | number;
  currency?: string;
  status?: string;
  payments?: Array<{
    id?: string;
    status?: string;
    amount?: string | number;
    currency?: string;
  }>;
};

function asPayload(raw: unknown): PaymentRequestPayload | null {
  if (!raw || typeof raw !== "object") return null;
  return raw as PaymentRequestPayload;
}

function orderEffectivelyExpired(row: {
  status: string;
  payment_expires_at: string | null;
}): boolean {
  if (row.status === "expired") return true;
  if (!row.payment_expires_at) return true;
  return new Date(row.payment_expires_at).getTime() <= Date.now();
}

function resolveHitStatus(payload: PaymentRequestPayload): string {
  let s = (payload.status ?? "").trim().toLowerCase();
  if (s) return s;
  const list = Array.isArray(payload.payments) ? payload.payments : [];
  const succeeded = list.find((p) => String(p?.status ?? "").toLowerCase() === "succeeded");
  const first = list[0];
  const pick = succeeded ?? first;
  return String(pick?.status ?? "").trim().toLowerCase();
}

export async function processHitPayWebhookRequest(req: Request): Promise<HitPayWebhookResult> {
  const salt = process.env.HITPAY_SALT?.trim();
  if (!salt) {
    return { ok: false, status: 503, detail: "HITPAY_SALT not configured" };
  }

  const rawBody = await req.text();
  const sig = req.headers.get("Hitpay-Signature") ?? req.headers.get("hitpay-signature");

  if (!verifyHitPayWebhookSignature(rawBody, sig, salt)) {
    return { ok: false, status: 401, detail: "invalid signature" };
  }

  let json: unknown;
  try {
    json = JSON.parse(rawBody);
  } catch {
    return { ok: false, status: 400, detail: "invalid json" };
  }

  const eventObject = (req.headers.get("Hitpay-Event-Object") ?? "").trim().toLowerCase();
  if (eventObject && eventObject !== "payment_request") {
    return { ok: true, detail: `ignored object ${eventObject}` };
  }

  const payload = asPayload(json);
  if (!payload?.id) {
    return { ok: false, status: 400, detail: "missing payment request id" };
  }

  const checkoutId = String(payload.id);
  const ref = payload.reference_number != null ? String(payload.reference_number) : "";

  let supabase;
  try {
    supabase = createServiceRoleClient();
  } catch (e) {
    return {
      ok: false,
      status: 503,
      detail: e instanceof Error ? e.message : "service client error",
    };
  }

  const { data: payRow, error: payFindErr } = await supabase
    .from("payments")
    .select("id, order_id, status, amount, currency, provider_checkout_id")
    .eq("provider_checkout_id", checkoutId)
    .maybeSingle();

  if (payFindErr) {
    return { ok: false, status: 500, detail: payFindErr.message };
  }

  let payment = payRow;

  if (!payment && ref && isUuid(ref)) {
    const { data: byOrder, error: boErr } = await supabase
      .from("payments")
      .select("id, order_id, status, amount, currency, provider_checkout_id")
      .eq("order_id", ref)
      .eq("status", "pending")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (boErr) {
      return { ok: false, status: 500, detail: boErr.message };
    }
    if (byOrder && byOrder.provider_checkout_id === checkoutId) {
      payment = byOrder;
    }
  }

  if (!payment) {
    return { ok: true, detail: "no matching payment — acknowledged" };
  }

  await writeAuditLogSafe(supabase, {
    action: "hitpay.webhook.received",
    entityType: "payment",
    entityId: payment.id as string,
    metadata: {
      order_id: payment.order_id as string,
      checkout_id: checkoutId,
      reported_status: resolveHitStatus(payload),
    },
    actorOverride: null,
  });

  const webhookPayload = json as Record<string, unknown>;
  const nowIso = new Date().toISOString();

  const { data: order, error: ordErr } = await supabase
    .from("orders")
    .select("id, status, total_amount, payment_expires_at")
    .eq("id", payment.order_id)
    .single();

  if (ordErr || !order) {
    return { ok: false, status: 500, detail: ordErr?.message ?? "order missing" };
  }

  const hitStatus = resolveHitStatus(payload);
  const isSuccessStates =
    hitStatus === "completed" || hitStatus === "succeeded" || hitStatus === "success";
  const isFailedStates =
    hitStatus === "failed" || hitStatus === "expired" || hitStatus === "canceled";

  /** HitPay amount / currency: prefer a succeeded nested payment row when present. */
  let amountHit = parseAmount(payload.amount);
  let currencyHit = normCurrency(payload.currency);
  let providerPaymentId: string | null = null;

  if (Array.isArray(payload.payments) && payload.payments.length > 0) {
    const nestOk = payload.payments.find(
      (p) => String(p?.status ?? "").toLowerCase() === "succeeded"
    );
    const nest = nestOk ?? payload.payments[0];
    if (nest?.id) providerPaymentId = String(nest.id);
    const nestedAmt = parseAmount(nest?.amount);
    const nestedCur = normCurrency(nest?.currency);
    if (nestedAmt != null) amountHit = nestedAmt;
    if (nestedCur) currencyHit = nestedCur;
  }

  if (payment.status === "succeeded" && order.status === "paid_unassigned") {
    await supabase
      .from("payments")
      .update({
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
      })
      .eq("id", payment.id);
    return { ok: true, detail: "duplicate success — idempotent" };
  }

  if (payment.status === "succeeded" && order.status === "payment_pending") {
    const { error: fixOrd } = await supabase
      .from("orders")
      .update({ status: "paid_unassigned" })
      .eq("id", order.id)
      .eq("status", "payment_pending");
    if (fixOrd) {
      return { ok: false, status: 500, detail: fixOrd.message };
    }
    return { ok: true, detail: "reconciled order to paid_unassigned" };
  }

  if (payment.status === "failed") {
    await supabase
      .from("payments")
      .update({
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
      })
      .eq("id", payment.id);
    return { ok: true, detail: "duplicate failure — idempotent" };
  }

  if (isFailedStates) {
    if (payment.status === "succeeded") {
      await supabase
        .from("payments")
        .update({
          webhook_received_at: nowIso,
          raw_webhook_payload: webhookPayload,
        })
        .eq("id", payment.id);
      return { ok: true, detail: "ignored failure webhook after success" };
    }
    const { error: upPay } = await supabase
      .from("payments")
      .update({
        status: "failed",
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
      })
      .eq("id", payment.id)
      .eq("status", "pending");

    if (upPay) {
      return { ok: false, status: 500, detail: upPay.message };
    }

    if (order.status === "payment_pending") {
      await supabase.from("orders").update({ status: "payment_failed" }).eq("id", order.id);
    }
    return { ok: true, detail: "payment failed recorded" };
  }

  if (!isSuccessStates) {
    await supabase
      .from("payments")
      .update({
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
      })
      .eq("id", payment.id);
    return { ok: true, detail: `ignored status ${hitStatus || "unknown"}` };
  }

  const amountOrder = Math.round(Number(order.total_amount) * 100) / 100;
  const currencyOrder = normCurrency(payment.currency);

  if (amountHit == null || currencyHit == null) {
    await supabase
      .from("payments")
      .update({
        status: "failed",
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (order.status === "payment_pending") {
      await supabase.from("orders").update({ status: "payment_failed" }).eq("id", order.id);
    }
    return { ok: true, detail: "reject: missing amount/currency in webhook" };
  }

  if (Math.abs(amountHit - amountOrder) > 0.01 || currencyHit !== currencyOrder) {
    await supabase
      .from("payments")
      .update({
        status: "failed",
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    if (order.status === "payment_pending") {
      await supabase.from("orders").update({ status: "payment_failed" }).eq("id", order.id);
    }
    return { ok: true, detail: "reject: amount or currency mismatch" };
  }

  if (order.status !== "payment_pending") {
    await supabase
      .from("payments")
      .update({
        status: "failed",
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
        provider_payment_id: providerPaymentId,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    return { ok: true, detail: `reject: order not payment_pending (${order.status})` };
  }

  if (orderEffectivelyExpired(order)) {
    await supabase
      .from("payments")
      .update({
        status: "failed",
        webhook_received_at: nowIso,
        raw_webhook_payload: webhookPayload,
        provider_payment_id: providerPaymentId,
      })
      .eq("id", payment.id)
      .eq("status", "pending");
    await supabase.from("orders").update({ status: "expired" }).eq("id", order.id);
    return { ok: true, detail: "reject: order or payment window expired" };
  }

  const { data: payUpRows, error: upPay } = await supabase
    .from("payments")
    .update({
      status: "succeeded",
      provider_payment_id: providerPaymentId ?? payment.provider_checkout_id,
      webhook_received_at: nowIso,
      raw_webhook_payload: webhookPayload,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id");

  if (upPay) {
    return { ok: false, status: 500, detail: upPay.message };
  }

  if (!payUpRows?.length) {
    const { data: p2 } = await supabase.from("payments").select("status").eq("id", payment.id).single();
    if (p2?.status !== "succeeded") {
      return { ok: false, status: 500, detail: "concurrent payment update — not succeeded" };
    }
  }

  const { error: upOrd, data: ordUpdated } = await supabase
    .from("orders")
    .update({ status: "paid_unassigned" })
    .eq("id", order.id)
    .eq("status", "payment_pending")
    .select("id");

  if (upOrd) {
    return { ok: false, status: 500, detail: upOrd.message };
  }

  if (!ordUpdated?.length) {
    const { data: cur } = await supabase.from("orders").select("status").eq("id", order.id).single();
    if (cur?.status === "paid_unassigned") {
      return { ok: true, detail: "paid_unassigned — race idempotent" };
    }
    return { ok: false, status: 500, detail: "order was not payment_pending" };
  }

  await writeAuditLogSafe(supabase, {
    action: "payment.succeeded",
    entityType: "payment",
    entityId: payment.id as string,
    metadata: {
      order_id: order.id as string,
      amount: amountHit,
      currency: currencyHit,
    },
    actorOverride: null,
  });

  return { ok: true, detail: "payment succeeded; order paid_unassigned" };
}
