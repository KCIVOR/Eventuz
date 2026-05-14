import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
import { createClient } from "@/lib/supabase/server";
import { decryptSecret } from "@/lib/utils/crypto";

export type GoogleMapsSettingsPublic = {
  id: string;
  is_active: boolean;
  last_tested_at: string | null;
  last_test_error: string | null;
  created_at: string;
  updated_at: string;
  keySaved: boolean;
};

export async function loadGoogleMapsSettingsPublic(): Promise<{
  settings: GoogleMapsSettingsPublic | null;
  error: string | null;
}> {
  const supabase = await createClient();
  const { data: row, error } = await supabase.from("google_maps_settings").select("*").limit(1).maybeSingle();

  if (error) {
    return { settings: null, error: error.message };
  }
  if (!row) {
    return { settings: null, error: null };
  }

  const encrypted = row.encrypted_api_key as string | null;
  return {
    settings: {
      id: row.id as string,
      is_active: Boolean(row.is_active),
      last_tested_at: row.last_tested_at ? String(row.last_tested_at) : null,
      last_test_error: row.last_test_error ? String(row.last_test_error) : null,
      created_at: String(row.created_at),
      updated_at: String(row.updated_at),
      keySaved: Boolean(encrypted && encrypted.length > 0),
    },
    error: null,
  };
}

export async function loadActiveGoogleMapsApiKey(): Promise<string> {
  const envFallback = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY?.trim() ?? "";

  try {
    const supabase = createServiceRoleClient();
    const { data: row, error } = await supabase
      .from("google_maps_settings")
      .select("encrypted_api_key, is_active")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !row?.encrypted_api_key) {
      return envFallback;
    }
    if (!row.is_active) {
      return "";
    }

    return decryptSecret(row.encrypted_api_key as string).trim();
  } catch (e) {
    console.warn(
      "[eventuz:google-maps] Failed to decrypt Google Maps API key from database. " +
      "This usually happens if SMTP_SETTINGS_ENCRYPTION_KEY has changed. " +
      "Falling back to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY.",
      e instanceof Error ? e.message : e
    );
    return envFallback;
  }
}
