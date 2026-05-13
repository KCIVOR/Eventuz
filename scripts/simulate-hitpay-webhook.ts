/**
 * Sends a HitPay-shaped `payment_request` webhook with a valid Hitpay-Signature
 * so you can verify `/api/hitpay/webhook` without waiting for HitPay (local/staging).
 *
 * Requires:
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 * - SMTP_SETTINGS_ENCRYPTION_KEY (decrypts HitPay salt from `hitpay_settings`)
 *
 * Usage:
 *   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/simulate-hitpay-webhook.ts --url http://localhost:3000
 *   node ... --url https://your-app.vercel.app --payment-id <payments.id>
 */

import crypto from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/utils/crypto";
import { signHitPayWebhookPayload } from "@/lib/payments/hitpayVerify";

function argValue(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  if (i === -1) return undefined;
  return process.argv[i + 1];
}

async function main() {
  const url =
    argValue("--url") ??
    process.env.SIMULATE_HITPAY_WEBHOOK_URL ??
    "http://localhost:3000/api/hitpay/webhook";
  const paymentId = argValue("--payment-id");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!supabaseUrl || !serviceKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    process.exit(1);
  }

  const supabase = createClient(supabaseUrl, serviceKey);

  const { data: hpRow, error: hpErr } = await supabase
    .from("hitpay_settings")
    .select("encrypted_salt")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (hpErr || !hpRow?.encrypted_salt) {
    console.error("No active HitPay settings:", hpErr?.message ?? "empty");
    process.exit(1);
  }

  let salt: string;
  try {
    salt = decryptSecret(hpRow.encrypted_salt);
  } catch (e) {
    console.error(
      "Decrypt salt failed — check SMTP_SETTINGS_ENCRYPTION_KEY:",
      e instanceof Error ? e.message : e
    );
    process.exit(1);
  }

  const { data: pay, error: payErr } = paymentId
    ? await supabase
        .from("payments")
        .select("id, order_id, status, amount, currency, provider_checkout_id, provider")
        .eq("id", paymentId)
        .maybeSingle()
    : await supabase
        .from("payments")
        .select("id, order_id, status, amount, currency, provider_checkout_id, provider")
        .eq("provider", "hitpay")
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

  if (payErr || !pay) {
    console.error(
      paymentId
        ? `Payment not found: ${paymentId}`
        : "No pending HitPay payment row. Create a checkout first or pass --payment-id.",
      payErr?.message ?? ""
    );
    process.exit(1);
  }

  if (pay.status !== "pending") {
    console.error(`Payment ${pay.id} is not pending (status=${pay.status}).`);
    process.exit(1);
  }

  if (!pay.provider_checkout_id) {
    console.error("Payment row missing provider_checkout_id.");
    process.exit(1);
  }

  const { data: order, error: ordErr } = await supabase
    .from("orders")
    .select("id, status")
    .eq("id", pay.order_id)
    .single();

  if (ordErr || !order) {
    console.error("Order not found for payment:", ordErr?.message);
    process.exit(1);
  }

  if (order.status !== "payment_pending") {
    console.error(
      `Order ${order.id} must be payment_pending (is: ${order.status}). Cannot simulate success.`
    );
    process.exit(1);
  }

  const amount = Math.round(Number(pay.amount) * 100) / 100;
  const currency = String(pay.currency ?? "PHP").trim().toLowerCase();

  const payload: Record<string, string> = {
    payment_request_id: String(pay.provider_checkout_id),
    reference_number: String(pay.order_id),
    amount: String(amount),
    currency,
    status: "completed",
  };

  const entries = Object.entries(payload)
    .filter(([k, v]) => k !== "hmac" && v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([k, v]) => `${k}${v}`).join("");
  const hmac = crypto.createHmac("sha256", salt.trim()).update(message, "utf8").digest("hex");

  payload.hmac = hmac;

  const formParams = new URLSearchParams(payload);
  const rawBody = formParams.toString();

  const webhookUrl = url.includes("/api/hitpay/webhook")
    ? url
    : `${url.replace(/\/$/, "")}/api/hitpay/webhook`;

  console.log("POST", webhookUrl);
  console.log("Payment id:", pay.id, "| checkout id:", pay.provider_checkout_id);

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: rawBody,
  });

  const text = await res.text();
  console.log("HTTP", res.status, text.slice(0, 500));

  if (!res.ok) {
    process.exit(1);
  }

  const { data: payAfter } = await supabase
    .from("payments")
    .select("status")
    .eq("id", pay.id)
    .single();
  const { data: ordAfter } = await supabase
    .from("orders")
    .select("status")
    .eq("id", pay.order_id)
    .single();

  console.log("After: payment.status =", payAfter?.status, "| order.status =", ordAfter?.status);
  if (payAfter?.status === "succeeded" && ordAfter?.status === "paid_unassigned") {
    console.log("OK — webhook path accepted and order marked paid_unassigned.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
