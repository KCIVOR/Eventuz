/**
 * Validates the active HitPay Business API key against HitPay's API (same path as checkout).
 * Credentials come only from `hitpay_settings` (no HITPAY_* environment variables).
 *
 * Requires in .env.local (or env):
 * - NEXT_PUBLIC_SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY (reads hitpay_settings; bypasses RLS)
 * - SMTP_SETTINGS_ENCRYPTION_KEY (decrypts stored secrets)
 *
 * Run (Node 20+):
 *   node --env-file=.env.local ./node_modules/tsx/dist/cli.mjs scripts/validate-hitpay.ts
 */

import { createClient } from "@supabase/supabase-js";
import { decryptSecret } from "@/lib/utils/crypto";

async function main() {
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !serviceKey) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in environment."
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey);
const { data, error } = await supabase
  .from("hitpay_settings")
  .select("encrypted_api_key, is_sandbox, currency")
  .eq("is_active", true)
  .maybeSingle();

if (error || !data) {
  console.error("No active hitpay_settings row:", error?.message ?? "empty");
  process.exit(1);
}

let apiKey: string;
try {
  apiKey = decryptSecret(data.encrypted_api_key);
} catch (e) {
  console.error(
    "Decrypt failed — check SMTP_SETTINGS_ENCRYPTION_KEY matches the key used when saving HitPay settings:",
    e instanceof Error ? e.message : e
  );
  process.exit(1);
}

const base = data.is_sandbox
  ? "https://api.sandbox.hit-pay.com"
  : "https://api.hit-pay.com";

const res = await fetch(`${base}/v1/payment-requests`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "X-BUSINESS-API-KEY": apiKey.trim(),
  },
  body: JSON.stringify({
    amount: 0.3,
    currency: (data.currency ?? "PHP").trim().toLowerCase(),
    email: "eventuz-validate@invalid",
    reference_number: `evt-validate-${Date.now()}`,
    redirect_url: "https://example.invalid/hitpay-validate",
    purpose: "Eventuz API key validation — discard",
  }),
});

const text = await res.text();
const mode = data.is_sandbox ? "sandbox" : "production";

console.log(`Mode: ${mode} → ${base}`);
console.log(`HTTP: ${res.status}`);
console.log(`Body (first 400 chars): ${text.slice(0, 400)}`);

if (!res.ok) {
  console.error("\nHitPay did not accept this key for this environment.");
  process.exit(1);
}

console.log("\nOK — HitPay accepted X-BUSINESS-API-KEY for", mode);
console.log(
  "Note: A minimal payment request may appear in your HitPay dashboard; cancel it if needed."
);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
