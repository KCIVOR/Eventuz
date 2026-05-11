"use server";

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export async function acceptStaffInviteFormAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) {
    redirect("/staff/invite/accept");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(
      `/login?next=${encodeURIComponent(`/staff/invite/accept?token=${encodeURIComponent(token)}`)}`
    );
  }

  const { error } = await supabase.rpc("accept_staff_invitation", { p_raw_token: token });

  if (error) {
    redirect(
      `/staff/invite/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent(error.message)}`
    );
  }

  redirect("/staff?accepted=1");
}
