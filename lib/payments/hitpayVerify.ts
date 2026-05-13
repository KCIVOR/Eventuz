import { createHmac, timingSafeEqual } from "node:crypto";

/** Build Hitpay-Signature header value (hex HMAC-SHA256 of exact raw body bytes). */
export function signHitPayWebhookPayload(rawBody: string, salt: string): string {
  return createHmac("sha256", salt).update(rawBody, "utf8").digest("hex");
}

/**
 * HitPay payment_request webhooks: the `hmac` field is included in the
 * form-urlencoded body. Verification uses sorted-field concatenation:
 *   1. Take all fields except `hmac`, filter out empty/null/undefined
 *   2. Sort alphabetically by key
 *   3. Concatenate `key+value` with no separator
 *   4. HMAC-SHA256 of that string with the salt → hex digest
 * Mirrors the proven implementation from startuplab-business-ticketing.
 */
export function verifyHitPayLegacyHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  salt: string
): boolean {
  if (!receivedHmac?.trim() || !salt) return false;

  const received = String(receivedHmac).trim().replace(/^sha256=/i, "");

  const entries = Object.entries(payload)
    .filter(([k, v]) => k !== "hmac" && v !== undefined && v !== null && v !== "")
    .sort(([a], [b]) => a.localeCompare(b));
  const message = entries.map(([k, v]) => `${k}${v}`).join("");

  const computedHex = createHmac("sha256", salt).update(message, "utf8").digest("hex");

  // Try hex comparison (primary)
  if (/^[0-9a-fA-F]+$/.test(received) && received.length % 2 === 0) {
    const computedBuf = Buffer.from(computedHex, "hex");
    const receivedBuf = Buffer.from(received, "hex");
    if (computedBuf.length !== receivedBuf.length) return false;
    try {
      return timingSafeEqual(computedBuf, receivedBuf);
    } catch {
      return false;
    }
  }

  // Try base64 comparison (fallback)
  const computedB64 = createHmac("sha256", salt).update(message, "utf8").digest("base64");
  if (computedB64 === received) return true;

  return false;
}

function trimHitPaySignatureHeader(header: string): string {
  return String(header).trim().replace(/^sha256=/i, "");
}

/**
 * HitPay: HMAC-SHA256 of the raw JSON body, key = salt (Dashboard → API Keys).
 * Mirrors production edge cases handled in prior integrations: optional `sha256=` prefix
 * and base64-encoded digest, in addition to plain hex.
 * @see https://docs.hitpayapp.com/apis/guide/events — "Validating Webhook"
 */
export function verifyHitPayWebhookSignature(
  rawBody: string,
  signatureHeader: string | null,
  salt: string
): boolean {
  if (!signatureHeader?.trim() || !salt) return false;

  const normalized = trimHitPaySignatureHeader(signatureHeader);

  const computedHex = createHmac("sha256", salt).update(rawBody, "utf8").digest("hex");
  const computedBuf = Buffer.from(computedHex, "hex");

  if (/^[0-9a-fA-F]+$/.test(normalized) && normalized.length % 2 === 0) {
    const received = Buffer.from(normalized, "hex");
    if (received.length !== computedBuf.length) return false;
    try {
      return timingSafeEqual(computedBuf, received);
    } catch {
      return false;
    }
  }

  const computedB64 = createHmac("sha256", salt).update(rawBody, "utf8").digest("base64");
  if (computedB64 === normalized) return true;

  let receivedB64Buf: Buffer;
  try {
    receivedB64Buf = Buffer.from(normalized, "base64");
  } catch {
    return false;
  }
  if (receivedB64Buf.length !== computedBuf.length) return false;
  try {
    return timingSafeEqual(computedBuf, receivedB64Buf);
  } catch {
    return false;
  }
}
