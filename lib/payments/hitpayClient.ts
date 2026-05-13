/** HitPay Online Payments — create hosted checkout (server-to-server). */

export type HitPayCreateResponse = {
  id: string;
  url: string;
};

import {
  type HitPayDecryptedConfig,
} from "@/lib/hitpay/settings";

function hitPayBaseUrl(isSandbox: boolean): string {
  return isSandbox ? "https://api.sandbox.hit-pay.com" : "https://api.hit-pay.com";
}

export type CreateHitPayCheckoutParams = {
  /** Amount charged to customer (must match platform order). */
  amount: number;
  /** ISO 4217 code, e.g. PHP or SGD HitPay normalizes case. */
  currency: string;
  email: string;
  name?: string;
  /** Opaque reference stored in HitPay and returned on webhook (use order id). */
  referenceNumber: string;
  redirectUrl: string;
  webhookUrl?: string | null;
};

/**
 * @param preloaded — MUST pass from the caller (the event's organizer settings).
 */
export async function createHitPayCheckout(
  params: CreateHitPayCheckoutParams,
  preloaded: HitPayDecryptedConfig
): Promise<HitPayCreateResponse> {
  const dbSettings = preloaded;

  if (!dbSettings?.apiKey?.trim()) {
    throw new Error(
      "HitPay is not configured for this organizer. Add active API key and salt in Organizer → Settings."
    );
  }

  const apiKey = dbSettings.apiKey.trim();
  const isSandbox = dbSettings.isSandbox;

  const body: Record<string, unknown> = {
    amount: params.amount,
    currency: params.currency.trim().toLowerCase(),
    email: params.email.trim(),
    reference_number: params.referenceNumber,
    redirect_url: params.redirectUrl,
    purpose: `Event order ${params.referenceNumber.slice(0, 8)}`,
  };

  if (params.name?.trim()) {
    body.name = params.name.trim();
  }
  if (params.webhookUrl?.trim()) {
    body.webhook = params.webhookUrl.trim();
  }

  const res = await fetch(`${hitPayBaseUrl(isSandbox)}/v1/payment-requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-BUSINESS-API-KEY": apiKey,
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  if (!res.ok) {
    throw new Error(`HitPay could not start checkout (${res.status}). ${text.slice(0, 280)}`);
  }

  let data: { id?: string; url?: string };
  try {
    data = JSON.parse(text) as { id?: string; url?: string };
  } catch {
    throw new Error("HitPay returned an unexpected response.");
  }

  if (!data.id || !data.url) {
    throw new Error("HitPay response missing checkout id or url.");
  }

  return { id: data.id, url: data.url };
}
