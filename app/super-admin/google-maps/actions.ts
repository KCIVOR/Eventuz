"use server";

import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createClient } from "@/lib/supabase/server";
import { encryptSecret } from "@/lib/utils/crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type GoogleMapsActionState = { error?: string; ok?: string };

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/super-admin/google-maps");
  }
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role !== "super_admin") {
    redirect("/");
  }
  return supabase;
}

export async function saveGoogleMapsSettingsAction(
  _prev: GoogleMapsActionState,
  formData: FormData
): Promise<GoogleMapsActionState> {
  try {
    const supabase = await requireSuperAdmin();

    const apiKey = String(formData.get("api_key") ?? "").trim();
    const is_active = formData.get("is_active") === "on";

    const { data: existingRow } = await supabase
      .from("google_maps_settings")
      .select("id, encrypted_api_key")
      .limit(1)
      .maybeSingle();

    let encrypted_api_key: string;
    if (apiKey.length > 0) {
      encrypted_api_key = encryptSecret(apiKey);
    } else if (existingRow?.encrypted_api_key) {
      encrypted_api_key = existingRow.encrypted_api_key as string;
    } else {
      return { error: "Google Maps API key is required on first save." };
    }

    const row = {
      encrypted_api_key,
      is_active,
      last_test_error: null,
    };

    let settingsId = (existingRow?.id as string | undefined) ?? null;
    if (settingsId) {
      const { error } = await supabase.from("google_maps_settings").update(row).eq("id", settingsId);
      if (error) {
        return { error: error.message };
      }
    } else {
      const { data, error } = await supabase.from("google_maps_settings").insert(row).select("id").single();
      if (error) {
        return { error: error.message };
      }
      settingsId = data.id as string;
    }

    await writeAuditLogSafe(supabase, {
      action: "google_maps.settings_changed",
      entityType: "google_maps_settings",
      entityId: settingsId,
      metadata: {
        is_active,
        key_updated: apiKey.length > 0,
      },
    });

    revalidatePath("/super-admin/google-maps");
    revalidatePath("/super-admin");
    revalidatePath("/organizer/events/new");
    revalidatePath("/attendee/event");
    return { ok: "Google Maps settings saved." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save Google Maps settings.";
    return { error: msg };
  }
}
