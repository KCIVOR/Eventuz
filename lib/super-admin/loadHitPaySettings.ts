import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/utils/crypto";

export type HitPayDecryptedConfig = {
  apiKey: string;
  salt: string;
  isSandbox: boolean;
  currency: string;
};

/** Load active HitPay settings from DB. Falls back to null if none found or active. */
export async function loadHitPaySettings(): Promise<HitPayDecryptedConfig | null> {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("encrypted_api_key, encrypted_salt, is_sandbox, currency")
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
    };
  } catch (e) {
    console.error("Failed to decrypt HitPay settings:", e);
    return null;
  }
}

/** Public version for UI forms (doesn't decrypt secrets, just returns metadata) */
export async function loadHitPaySettingsPublic() {
  const supabase = await createClient();
  
  const { data, error } = await supabase
    .from("hitpay_settings")
    .select("id, is_sandbox, currency, is_active, updated_at")
    .eq("is_active", true)
    .maybeSingle();

  return { settings: data, error };
}
