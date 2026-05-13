import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { decryptSecret } from "@/lib/utils/crypto";

export type HitPayDecryptedConfig = {
  apiKey: string;
  salt: string;
  isSandbox: boolean;
  currency: string;
  allowSimulation: boolean;
};

/**
 * Load active HitPay settings for an organizer (server-only).
 * Uses the service role so checkout/webhooks work for non–super-admin users.
 */
export async function loadHitPaySettings(organizerId: string): Promise<HitPayDecryptedConfig | null> {
  const supabase = createServiceRoleClient();

  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("encrypted_api_key, encrypted_salt, is_sandbox, currency, allow_simulation")
    .eq("organizer_id", organizerId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    console.error(`[HitPay Config] DB error fetching settings for ${organizerId}:`, error.message);
    return null;
  }
  if (!data) {
    console.warn(`[HitPay Config] No active HitPay settings found for organizer ${organizerId}.`);
    return null;
  }

  try {
    const apiKey = decryptSecret(data.encrypted_api_key);
    const salt = decryptSecret(data.encrypted_salt);
    
    return {
      apiKey,
      salt,
      isSandbox: data.is_sandbox,
      currency: data.currency,
      allowSimulation: data.allow_simulation,
    };
  } catch (e) {
    console.error(`[HitPay Config] Failed to decrypt HitPay secrets for organizer ${organizerId}.`, e);
    return null;
  }
}

/** 
 * Load full settings for an organizer (used in setup UI).
 * If organizerId is not provided, tries to use the currently authenticated user's ID.
 */
export async function loadHitPaySettingsFull(organizerId?: string): Promise<(HitPayDecryptedConfig & { id: string, isActive: boolean, updatedAt: string, encryptedApiKey: string, encryptedSalt: string }) | null> {
  const supabase = await createClient();
  
  let targetId = organizerId;
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    targetId = user.id;
  }

  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("*")
    .eq("organizer_id", targetId)
    .maybeSingle();

  if (error || !data) return null;

  try {
    return {
      id: data.id,
      apiKey: decryptSecret(data.encrypted_api_key),
      salt: decryptSecret(data.encrypted_salt),
      encryptedApiKey: data.encrypted_api_key,
      encryptedSalt: data.encrypted_salt,
      isSandbox: data.is_sandbox,
      currency: data.currency,
      allowSimulation: data.allow_simulation,
      isActive: data.is_active,
      updatedAt: data.updated_at
    };
  } catch (e) {
    console.error("Failed to decrypt HitPay settings:", e);
    return null;
  }
}

/** Public metadata version for UI (doesn't decrypt secrets) */
export async function loadHitPaySettingsPublic(organizerId?: string) {
  const supabase = await createClient();
  
  let targetId = organizerId;
  if (!targetId) {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { settings: null, error: new Error("Unauthenticated") };
    targetId = user.id;
  }

  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("id, is_sandbox, currency, is_active, allow_simulation, updated_at")
    .eq("organizer_id", targetId)
    .maybeSingle();

  return { settings: data, error };
}
