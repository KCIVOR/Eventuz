import { processHitPayWebhookRequest } from "@/lib/payments/processHitPayWebhook";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/**
 * HitPay payment_request webhooks.
 * Register this URL in HitPay Dashboard (API Keys → webhook). Checkout sends
 * `{origin}/api/hitpay/webhook` automatically (see `getAppOrigin` / `NEXT_PUBLIC_SITE_URL`).
 */
export async function POST(req: Request) {
  const result = await processHitPayWebhookRequest(req);

  if (!result.ok) {
    return NextResponse.json({ ok: false, detail: result.detail }, { status: result.status });
  }

  return NextResponse.json({ ok: true, detail: result.detail });
}
