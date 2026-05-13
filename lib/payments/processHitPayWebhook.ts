import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { verifyHitPayWebhookSignature, verifyHitPayLegacyHmac } from "@/lib/payments/hitpayVerify";
import { loadHitPaySettings } from "@/lib/super-admin/loadHitPaySettings";

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

/** Body shape for HitPay Online Payments `/v1/payment-requests` webhooks (what we create in checkout). */
function bodyLooksLikeOnlinePaymentRequest(raw: unknown): boolean {
  if (!raw || typeof raw !== "object") return false;
  const p = raw as Record<string, unknown>;
  const id = p.id;
  const ref = p.reference_number;
  if (typeof id !== "string" || !isUuid(id)) return false;
  if (typeof ref !== "string" || !isUuid(ref.trim())) return false;
  return true;
}

/**
 * Parse the raw body into a key-value object.
 * HitPay payment_request webhooks send `application/x-www-form-urlencoded`.
 * Older Event webhooks may send JSON with an X-Signature header.
 */
function parseWebhookBody(
  rawBody: string,
  contentType: string
): { parsed: Record<string, unknown>; format: "form" | "json" } | null {
  // Try form-urlencoded first if content-type suggests it
  if (contentType.includes("application/x-www-form-urlencoded")) {
    try {
      const params = new URLSearchParams(rawBody);
      const obj: Record<string, string> = {};
      for (const [k, v] of params.entries()) {
        obj[k] = v;
      }
      if (Object.keys(obj).length > 0) return { parsed: obj, format: "form" };
    } catch { /* fall through */ }
  }

  // Try JSON
  if (contentType.includes("application/json") || contentType === "") {
    try {
      const j = JSON.parse(rawBody);
      if (j && typeof j === "object") return { parsed: j as Record<string, unknown>, format: "json" };
    } catch { /* fall through */ }
  }

  // Unknown content-type: try JSON first, then form
  try {
    const j = JSON.parse(rawBody);
    if (j && typeof j === "object") return { parsed: j as Record<string, unknown>, format: "json" };
  } catch { /* not json */ }

  try {
    const params = new URLSearchParams(rawBody);
    const obj: Record<string, string> = {};
    for (const [k, v] of params.entries()) {
      obj[k] = v;
    }
    if (Object.keys(obj).length > 0) return { parsed: obj, format: "form" };
  } catch { /* not form */ }

  return null;
}

export async function processHitPayWebhookRequest(req: Request): Promise<HitPayWebhookResult> {
  const dbSettings = await loadHitPaySettings();
  const salt = dbSettings?.salt?.trim();

  if (!salt) {
    return {
      ok: false,
      status: 503,
      detail: "HitPay salt not configured (Super Admin → HitPay settings)",
    };
  }

  const rawBody = await req.text();
  const contentType = (req.headers.get("content-type") ?? "").toLowerCase();

  // Parse the body (form-urlencoded or JSON)
  const bodyResult = parseWebhookBody(rawBody, contentType);
  if (!bodyResult) {
    return { ok: false, status: 400, detail: "unable to parse webhook body" };
  }

  const { parsed, format } = bodyResult;

  // --- Signature verification ---
  // Path 1 (primary): HitPay payment_request webhooks include `hmac` in form body
  const legacyHmac = typeof parsed.hmac === "string" ? parsed.hmac : null;

  // Path 2 (fallback): Header-based signature (Event webhooks / newer API)
  const sigHeader =
    req.headers.get("X-Signature") ??
    req.headers.get("x-signature") ??
    req.headers.get("X-HitPay-Signature") ??
    req.headers.get("x-hitpay-signature") ??
    req.headers.get("Hitpay-Signature") ??
    req.headers.get("hitpay-signature");

  let verified = false;

  if (legacyHmac) {
    // Body-field HMAC: sorted-field concatenation (proven working method)
    verified = verifyHitPayLegacyHmac(parsed, legacyHmac, salt);
  } else if (sigHeader) {
    // Header-based HMAC: raw body hash (fallback for Event webhooks)
    verified = verifyHitPayWebhookSignature(rawBody, sigHeader, salt);
  }

  if (!verified) {
    return { ok: false, status: 401, detail: "invalid signature" };
  }

  // Use the already-parsed body — HitPay payment_request webhooks use
  // `payment_request_id` (form field) while our downstream code expects `id`.
  // Map accordingly to preserve existing downstream logic.
  let json: unknown;
  if (format === "form") {
    // HitPay form fields: payment_request_id, reference_number, amount, currency, status, hmac
    // Downstream expects: id, reference_number, amount, currency, status
    const mapped: Record<string, unknown> = { ...parsed };
    if (!mapped.id && mapped.payment_request_id) {
      mapped.id = mapped.payment_request_id;
    }
    json = mapped;
  } else {
    json = parsed;
  }

  const eventObject = (req.headers.get("Hitpay-Event-Object") ?? "").trim().toLowerCase();
  // Docs list other object types; Online Payments may still set a non–payment_request header.
  // If the signed body matches our checkout payload shape, process it anyway.
  if (
    eventObject &&
    eventObject !== "payment_request" &&
    !bodyLooksLikeOnlinePaymentRequest(json)
  ) {
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
    hitStatus === "completed" ||
    hitStatus === "complete" ||
    hitStatus === "succeeded" ||
    hitStatus === "success";
  const isFailedStates =
    hitStatus === "failed" ||
    hitStatus === "expired" ||
    hitStatus === "canceled" ||
    hitStatus === "cancelled";

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

  /** Must match the amount stored on our pending payment (what HitPay was asked to charge). */
  const amountExpected = Math.round(Number(payment.amount) * 100) / 100;
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

  if (Math.abs(amountHit - amountExpected) > 0.01 || currencyHit !== currencyOrder) {
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
