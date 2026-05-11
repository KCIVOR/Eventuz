"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

async function requireSuperAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/login?next=/super-admin");
  }
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "super_admin") {
    redirect("/");
  }
  return { supabase, userId: user.id };
}

export async function superAdminSetUserAccountStatusAction(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const rawId = String(formData.get("user_id") ?? "").trim();
  const status = String(formData.get("status") ?? "").trim();
  if (!rawId || (status !== "active" && status !== "disabled")) {
    redirect("/super-admin?error=" + encodeURIComponent("Invalid user or status."));
  }

  const { error } = await supabase.rpc("super_admin_set_user_account_status", {
    p_user_id: rawId,
    p_status: status,
  });

  revalidatePath("/super-admin");
  if (error) {
    redirect("/super-admin?error=" + encodeURIComponent(error.message));
  }
  redirect("/super-admin?ok=user");
}

export async function superAdminSetEventRegistrationBlockedAction(formData: FormData) {
  const { supabase } = await requireSuperAdmin();
  const rawId = String(formData.get("event_id") ?? "").trim();
  const blockedRaw = String(formData.get("blocked") ?? "").trim();
  if (!rawId || (blockedRaw !== "true" && blockedRaw !== "false")) {
    redirect("/super-admin?error=" + encodeURIComponent("Invalid event."));
  }

  const { error } = await supabase.rpc("super_admin_set_event_registration_blocked", {
    p_event_id: rawId,
    p_blocked: blockedRaw === "true",
  });

  revalidatePath("/super-admin");
  if (error) {
    redirect("/super-admin?error=" + encodeURIComponent(error.message));
  }
  redirect("/super-admin?ok=event");
}
