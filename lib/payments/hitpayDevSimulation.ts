import { loadHitPaySettings } from "@/lib/super-admin/loadHitPaySettings";

/**
 * Simulate HitPay webhook success without HitPay (Super Admin → HitPay → Allow dev simulation).
 */
export async function isHitPayDevSimulationAllowed(): Promise<boolean> {
  const dbSettings = await loadHitPaySettings();
  return dbSettings?.allowSimulation === true;
}
