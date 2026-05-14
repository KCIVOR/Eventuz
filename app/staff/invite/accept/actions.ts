"use server";

import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClient } from "@/lib/supabase/serviceRole";
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

export async function setupStaffAccountAndAcceptAction(formData: FormData) {
  const token = String(formData.get("token") ?? "").trim();
  const fullName = String(formData.get("full_name") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();
  const confirmPassword = String(formData.get("confirm_password") ?? "").trim();

  const errorUrl = (msg: string) =>
    `/staff/invite/accept?token=${encodeURIComponent(token)}&error=${encodeURIComponent(msg)}`;

  if (!token) redirect("/staff/invite/accept");
  if (!fullName) redirect(errorUrl("Full name is required."));
  if (!password) redirect(errorUrl("Password is required."));
  if (password.length < 6) redirect(errorUrl("Password must be at least 6 characters."));
  if (password !== confirmPassword) redirect(errorUrl("Passwords do not match."));

  const invite = await loadStaffInviteByRawToken(token);
  if (!invite.found || invite.status !== "pending") {
    redirect(errorUrl("This invitation is invalid or no longer pending."));
  }

  const supabase = await createClient();
  const serviceClient = createServiceRoleClient();

  // 1. Create the user as confirmed via Admin API (since they verified email by clicking the link)
  const { error: createError } = await serviceClient.auth.admin.createUser({
    email: invite.email,
    password: password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  });

  if (createError) {
    if (createError.message.toLowerCase().includes("already registered")) {
      redirect(errorUrl("This email is already registered. Please sign in instead to accept your invitation."));
    }
    redirect(errorUrl(createError.message));
  }

  // 2. Sign in with the new password to set the session cookies
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: invite.email,
    password: password,
  });

  if (signInError) {
    // If sign in fails for some reason, they can still try manually
    redirect(
      `/login?next=${encodeURIComponent(`/staff/invite/accept?token=${encodeURIComponent(token)}`)}&ok=account_created`
    );
  }

  // 3. Call the RPC to accept the invitation and promote role
  const { error: acceptError } = await supabase.rpc("accept_staff_invitation", {
    p_raw_token: token,
  });

  if (acceptError) {
    redirect(errorUrl(acceptError.message));
  }

  redirect("/staff?accepted=1");
}
