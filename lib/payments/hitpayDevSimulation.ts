/**
 * Opt-in local/staging only: simulate HitPay webhook success without HitPay.
 * Set ALLOW_HITPAY_DEV_SIMULATION=true in .env.local — never enable in production.
 */
export function isHitPayDevSimulationAllowed(): boolean {
  const v = process.env.ALLOW_HITPAY_DEV_SIMULATION?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
