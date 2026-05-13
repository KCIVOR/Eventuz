import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/utils/crypto";

export type HitPayDecryptedConfig = {
  apiKey: string;
  salt: string;
  isSandbox: boolean;
  currency: string;
  allowSimulation: boolean;
};

/** Load active HitPay settings from DB. Falls back to null if none found or active. */
export async function loadHitPaySettings(): Promise<HitPayDecryptedConfig | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("encrypted_api_key, encrypted_salt, is_sandbox, currency, allow_simulation")
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error || !data) return null;

  try {
    return {
      apiKey: decryptSecret(data.encrypted_api_key),
      salt: decryptSecret(data.encrypted_salt),
      isSandbox: data.is_sandbox,
      currency: data.currency,
      allowSimulation: data.allow_simulation,
    };
  } catch (e) {
    console.error("Failed to decrypt HitPay settings:", e);
    return null;
  }
}

/** Admin version: loads the latest row regardless of is_active and decrypts it. */
export async function loadHitPaySettingsFull(): Promise<(HitPayDecryptedConfig & { id: string, isActive: boolean, updatedAt: string, encryptedApiKey: string, encryptedSalt: string }) | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(1)
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
    console.error("Failed to decrypt HitPay settings for admin:", e);
    return null;
  }
}

/** Public metadata version for UI (doesn't decrypt secrets) */
export async function loadHitPaySettingsPublic() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("id, is_sandbox, currency, is_active, allow_simulation, updated_at")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return { settings: data, error };
}
