import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * HitPay: HMAC-SHA256 of the raw JSON body, key = salt (Dashboard → API Keys).
 * @see https://docs.hitpayapp.com/apis/guide/events — "Validating Webhook"
 */
export function verifyHitPayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  salt: string
): boolean {
  if (!signatureHeader?.trim() || !salt) return false;

  const computed = createHmac("sha256", salt).update(rawBody, "utf8").digest();

  const sig = signatureHeader.trim();
  let received: Buffer;
  if (/^[0-9a-fA-F]+$/.test(sig) && sig.length % 2 === 0) {
    received = Buffer.from(sig, "hex");
  } else {
    return false;
  }

  if (received.length !== computed.length) return false;
  try {
    return timingSafeEqual(computed, received);
  } catch {
    return false;
  }
}
