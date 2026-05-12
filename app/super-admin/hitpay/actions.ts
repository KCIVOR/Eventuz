"use server";

import { encryptSecret } from "@/lib/utils/crypto";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveHitPaySettings(formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized");

  const apiKey = formData.get("apiKey") as string;
  const salt = formData.get("salt") as string;
  const isSandbox = formData.get("isSandbox") === "true";
  const currency = (formData.get("currency") as string || "PHP").toUpperCase();
  const isActive = formData.get("isActive") === "true";

  if (!apiKey || !salt) {
    return { error: "API Key and Salt are required." };
  }

  try {
    const encryptedApiKey = encryptSecret(apiKey);
    const encryptedSalt = encryptSecret(salt);

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
      });

    if (error) throw error;

    await writeAuditLogSafe(supabase, {
      action: "hitpay.settings.updated",
      entityType: "system_settings",
      entityId: null,
      metadata: { is_sandbox: isSandbox, currency, is_active: isActive },
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
