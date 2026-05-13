import { loadHitPaySettings } from "@/lib/super-admin/loadHitPaySettings";

/**
 * Opt-in local/staging only: simulate HitPay webhook success without HitPay.
 * Priority: 
 * 1. Database settings (managed in Super Admin)
 * 2. .env.local fallback (ALLOW_HITPAY_DEV_SIMULATION)
 */
export async function isHitPayDevSimulationAllowed(): Promise<boolean> {
  // Check database first
  const dbSettings = await loadHitPaySettings();
  if (dbSettings !== null) {
    return dbSettings.allowSimulation;
  }

  // Fallback to env
  const v = process.env.ALLOW_HITPAY_DEV_SIMULATION?.trim().toLowerCase();
  return v === "true" || v === "1" || v === "yes";
}
