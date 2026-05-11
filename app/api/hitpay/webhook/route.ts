import { processHitPayWebhookRequest } from "@/lib/payments/processHitPayWebhook";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * HitPay payment_request webhooks.
 * Register the same URL in HitPay Dashboard (API Keys → webhook) and set HITPAY_WEBHOOK_URL when creating checkout.
 */
export async function POST(req: Request) {
  const result = await processHitPayWebhookRequest(req);

  if (!result.ok) {
    return NextResponse.json({ ok: false, detail: result.detail }, { status: result.status });
  }

  return NextResponse.json({ ok: true, detail: result.detail });
}
