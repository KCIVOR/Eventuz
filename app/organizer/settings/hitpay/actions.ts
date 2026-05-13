"use server";

import { encryptSecret } from "@/lib/utils/crypto";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveOrganizerHitPaySettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "organizer" && profile?.role !== "super_admin") throw new Error("Forbidden");

  const apiKey = formData.get("apiKey") as string;
  const salt = formData.get("salt") as string;
  const isSandbox = formData.get("isSandbox") === "true";
  const currency = (formData.get("currency") as string || "PHP").toUpperCase();
  const isActive = formData.get("isActive") === "true";
  const allowSimulation = formData.get("allowSimulation") === "true";

  if (!apiKey || !salt) {
    return { error: "API Key and Salt are required." };
  }

  try {
    const { data: current } = await supabase
      .from("hitpay_settings")
      .select("encrypted_api_key, encrypted_salt")
      .eq("organizer_id", user.id)
      .maybeSingle();

    const encryptedApiKey = (apiKey === current?.encrypted_api_key) 
      ? apiKey 
      : encryptSecret(apiKey);
      
    const encryptedSalt = (salt === current?.encrypted_salt) 
      ? salt 
      : encryptSecret(salt);

    const { error } = await supabase
      .from("hitpay_settings")
      .upsert({
        organizer_id: user.id,
        encrypted_api_key: encryptedApiKey,
        encrypted_salt: encryptedSalt,
        is_sandbox: isSandbox,
        currency,
        is_active: isActive,
        allow_simulation: allowSimulation,
        updated_at: new Date().toISOString()
      }, { onConflict: "organizer_id" });

    if (error) throw error;

    await writeAuditLogSafe(supabase, {
      action: "organizer.hitpay.settings.updated",
      entityType: "organizer_settings",
      entityId: user.id,
      metadata: { is_sandbox: isSandbox, currency, is_active: isActive, allow_simulation: allowSimulation },
      actorOverride: user.id,
    });

    revalidatePath("/organizer/settings/hitpay");
    return { success: true };
  } catch (e) {
    console.error("Save Organizer HitPay error:", e);
    return { error: "Failed to save settings." };
  }
}
