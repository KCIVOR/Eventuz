import { createHmac, timingSafeEqual } from "node:crypto";

/** Build Hitpay-Signature header value (hex HMAC-SHA256 of exact raw body bytes). */
export function signHitPayWebhookPayload(rawBody: string, salt: string): string {
  return createHmac("sha256", salt).update(rawBody, "utf8").digest("hex");
}

/**
 * HitPay payment_request webhooks: the `hmac` field is included in the
 * form-urlencoded body. Verification can be tricky as different HitPay versions
 * sign different variations of the payload.
 *
 * Ported from the working PHP/Express implementations:
 * tries multiple "candidates" covering raw string, sorted KV, and concatenation.
 */
export function verifyHitPayLegacyHmac(
  payload: Record<string, unknown>,
  receivedHmac: string,
  salt: string,
  rawBody?: string
): boolean {
  if (!receivedHmac?.trim() || !salt) return false;

  const received = String(receivedHmac).trim().replace(/^sha256=/i, "");
  const candidates: string[] = [];

  // 1. Raw body variants (most reliable for direct payment_request webhooks)
  if (rawBody) {
    // rawBody as-is
    candidates.push(rawBody);

    // rawBody without hmac param
    const parts = rawBody.split("&").filter(Boolean);
    const withoutHmac = parts.filter((p) => !p.toLowerCase().startsWith("hmac=")).join("&");
    if (withoutHmac) {
      candidates.push(withoutHmac);
      // decoded version
      try {
        const decoded = decodeURIComponent(withoutHmac.replace(/\+/g, " "));
        if (decoded !== withoutHmac) candidates.push(decoded);
      } catch { /* ignore */ }
    }

    // Sorted query string (reconstructed)
    try {
      const params = new URLSearchParams(rawBody);
      params.delete("hmac");
      const keys = Array.from(params.keys()).sort((a, b) => a.localeCompare(b));
      const sortedParts: string[] = [];
      for (const k of keys) {
        for (const v of params.getAll(k)) {
          sortedParts.push(`${encodeURIComponent(k)}=${encodeURIComponent(v)}`);
        }
      }
      if (sortedParts.length > 0) candidates.push(sortedParts.join("&"));
    } catch { /* ignore */ }
  }

  // 2. Parsed payload variants
  const entries = Object.entries(payload)
    .filter(([k]) => k !== "hmac")
    .map(([k, v]) => [k, v === null || v === undefined ? "" : String(v)])
    .sort(([a], [b]) => a.localeCompare(b));

  console.log("[HitPay Verify] Payload fields for signature:", Object.fromEntries(entries));

  if (entries.length > 0) {
    // key=value&...
    candidates.push(entries.map(([k, v]) => `${k}=${v}`).join("&"));

    // key:value|...
    candidates.push(entries.map(([k, v]) => `${k}:${v}`).join("|"));

    // keyvalue... (concatenation)
    const concatStr = entries.map(([k, v]) => `${k}${v}`).join("");
    candidates.push(concatStr);

    // keyvalue... (excluding empty strings)
    const concatNoEmpty = entries
      .filter(([, v]) => v !== "")
      .map(([k, v]) => `${k}${v}`)
      .join("");
    if (concatNoEmpty !== concatStr) candidates.push(concatNoEmpty);
  }

  // Verification loop
  const receivedBuf = Buffer.from(received, /^[0-9a-f]+$/i.test(received) ? "hex" : "base64");
  console.log(`[HitPay Verify] Checking ${candidates.length} candidates. Received HMAC: ${received}`);

  for (const [idx, message] of candidates.entries()) {
    const hmacHex = createHmac("sha256", salt).update(message, "utf8").digest("hex");
    const matched = hmacHex.toLowerCase() === received.toLowerCase();
    
    console.log(`[HitPay Verify] Candidate #${idx}: "${message}" -> Computed Hex: ${hmacHex} -> ${matched ? "MATCH!" : "FAIL"}`);

    if (matched) return true;

    const hmacB64 = createHmac("sha256", salt).update(message, "utf8").digest("base64");
    if (hmacB64 === received) {
      console.log(`[HitPay Verify] Candidate #${idx} MATCHED (Base64)!`);
      return true;
    }
  }

  return false;
}

function trimHitPaySignatureHeader(header: string): string {
  return String(header).trim().replace(/^sha256=/i, "");
}

/**
 * HitPay: HMAC-SHA256 of the raw JSON body, key = salt (Dashboard → API Keys).
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

  const received = Buffer.from(normalized, /^[0-9a-f]+$/i.test(normalized) ? "hex" : "base64");

  if (received.length === computedBuf.length) {
    try {
      if (timingSafeEqual(computedBuf, received)) return true;
    } catch { /* ignore */ }
  }

  if (computedHex.toLowerCase() === normalized.toLowerCase()) return true;
  
  const computedB64 = createHmac("sha256", salt).update(rawBody, "utf8").digest("base64");
  if (computedB64 === normalized) return true;

  return false;
}
