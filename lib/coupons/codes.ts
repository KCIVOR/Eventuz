import { createHash, randomBytes } from "node:crypto";

const GENERATED_PREFIX = "EVTZ";

export function normalizeCouponCode(raw: string): string {
  return raw.trim().replace(/\s+/g, "").toUpperCase();
}

export function couponCodeHash(raw: string): string {
  return createHash("sha256").update(normalizeCouponCode(raw), "utf8").digest("hex");
}

export function generateCouponCode(): string {
  const body = randomBytes(8)
    .toString("base64url")
    .replace(/[-_]/g, "")
    .toUpperCase()
    .slice(0, 10);
  return `${GENERATED_PREFIX}-${body}`;
}
