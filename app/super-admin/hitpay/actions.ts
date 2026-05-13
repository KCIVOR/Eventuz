"use server";

import { encryptSecret } from "@/lib/utils/crypto";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveHitPaySettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") throw new Error("Forbidden");

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
    // Check if we should re-encrypt or use existing encrypted values
    // This allows the UI to display and resubmit the encrypted "v1:..." blob
    const { data: current } = await supabase
      .from("hitpay_settings")
      .select("encrypted_api_key, encrypted_salt")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const encryptedApiKey = (apiKey === current?.encrypted_api_key) 
      ? apiKey 
      : encryptSecret(apiKey);
      
    const encryptedSalt = (salt === current?.encrypted_salt) 
      ? salt 
      : encryptSecret(salt);

    // Disable all other active settings first
    await supabase
      .from("hitpay_settings")
      .update({ is_active: false })
      .eq("is_active", true);

    const { error } = await supabase
      .from("hitpay_settings")
      .insert({
        encrypted_api_key: encryptedApiKey,
        encrypted_salt: encryptedSalt,
        is_sandbox: isSandbox,
        currency,
        is_active: isActive,
        allow_simulation: allowSimulation,
      });

    if (error) throw error;

    await writeAuditLogSafe(supabase, {
      action: "hitpay.settings.updated",
      entityType: "system_settings",
      entityId: null,
      metadata: { is_sandbox: isSandbox, currency, is_active: isActive, allow_simulation: allowSimulation },
      actorOverride: user.id,
    });

    revalidatePath("/super-admin/hitpay");
    return { success: true };
  } catch (e) {
    console.error("Save HitPay error:", e);
    return { error: "Failed to save settings." };
  }
}

export async function toggleHitPayActive(id: string, active: boolean) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "super_admin") throw new Error("Forbidden");

  try {
    if (active) {
      // Disable others if activating this one
      await supabase
        .from("hitpay_settings")
        .update({ is_active: false })
        .neq("id", id);
    }

    const { error } = await supabase
      .from("hitpay_settings")
      .update({ is_active: active })
      .eq("id", id);

    if (error) throw error;

    revalidatePath("/super-admin/hitpay");
    return { success: true };
  } catch (e) {
    return { error: "Failed to toggle status." };
  }
}
