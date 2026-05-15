"use server";

import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

export type TermsActionState = { error?: string; ok?: string };

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/super-admin/terms");
  }
  const { data: p } = await supabase.from("profiles").select("role").eq("id", user.id).maybeSingle();
  if (p?.role !== "super_admin") {
    redirect("/");
  }
  return { supabase, userId: user.id };
}

export async function saveTermsSettingsAction(
  _prev: TermsActionState,
  formData: FormData
): Promise<TermsActionState> {
  try {
    const { supabase, userId } = await requireSuperAdmin();
    const content = String(formData.get("content") ?? "").trim();
    const is_active = formData.get("is_active") === "on";

    if (!content) {
      return { error: "Terms and Conditions content is required." };
    }
    if (content.length > 20000) {
      return { error: "Terms and Conditions must be 20,000 characters or fewer." };
    }

    const { data: existingRow, error: loadError } = await supabase
      .from("platform_terms_settings")
      .select("id, content, version")
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (loadError) {
      return { error: loadError.message };
    }

    let settingsId = (existingRow?.id as string | undefined) ?? null;
    const contentChanged = existingRow ? String(existingRow.content ?? "") !== content : true;
    const version = existingRow ? Number(existingRow.version ?? 1) + (contentChanged ? 1 : 0) : 1;

    if (settingsId) {
      const { error } = await supabase
        .from("platform_terms_settings")
        .update({
          content,
          version,
          is_active,
          updated_by: userId,
        })
        .eq("id", settingsId);
      if (error) return { error: error.message };
    } else {
      const { data, error } = await supabase
        .from("platform_terms_settings")
        .insert({
          content,
          version,
          is_active,
          updated_by: userId,
        })
        .select("id")
        .single();
      if (error) return { error: error.message };
      settingsId = data.id as string;
    }

    await writeAuditLogSafe(supabase, {
      action: "terms.settings_changed",
      entityType: "platform_terms_settings",
      entityId: settingsId,
      metadata: {
        is_active,
        version,
        content_changed: contentChanged,
      },
    });

    revalidatePath("/register");
    revalidatePath("/super-admin");
    revalidatePath("/super-admin/terms");
    return { ok: contentChanged ? `Terms saved as version ${version}.` : "Terms settings saved." };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Could not save Terms and Conditions.";
    return { error: msg };
  }
}
