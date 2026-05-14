"use server";

import { createClient } from "@/lib/supabase/server";
import { loadStaffInviteByRawToken } from "@/lib/staff/loadStaffInvite";
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

  const invite = await loadStaffInviteByRawToken(token);
  const userEmail = (user.email ?? "").trim().toLowerCase();
  if (!invite.found) {
    redirect(
      `/staff/invite/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent("This invitation link is invalid or has been replaced.")}`
    );
  }
  if (invite.status !== "pending") {
    redirect(
      `/staff/invite/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent("This invitation is no longer pending. Ask the organizer to send a new invite.")}`
    );
  }
  if (invite.email !== userEmail) {
    redirect(
      `/staff/invite/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent("Switch to the invited account before accepting this staff invitation.")}`
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
