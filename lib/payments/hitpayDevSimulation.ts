import { loadHitPaySettings } from "@/lib/hitpay/settings";

/**
 * Check if HitPay simulation is allowed for an organizer.
 */
export async function isHitPayDevSimulationAllowed(organizerId: string): Promise<boolean> {
  const dbSettings = await loadHitPaySettings(organizerId);
  return dbSettings?.allowSimulation === true;
}
