"use server";

import { createClient } from "@/lib/supabase/server";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { generateStaffInviteRawToken, staffInviteTokenHash } from "@/lib/staff/inviteToken";
import { sendStaffInviteEmail } from "@/lib/staff/sendStaffInviteEmail";
import { getAppOrigin } from "@/lib/url/site";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function normEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function redirectWithError(eventId: string, message: string): never {
  redirect(`/organizer/events/${eventId}/staff?error=${encodeURIComponent(message)}`);
}

export async function inviteEventStaff(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventId}/staff`)}`);

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (evErr || !ev) redirectWithError(eventId, "You can’t manage staff for this event.");

  const email = normEmail(String(formData.get("email") ?? ""));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithError(eventId, "Enter a valid email address.");
  }

  await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("event_id", eventId)
    .eq("email", email)
    .eq("status", "pending");

  const rawToken = generateStaffInviteRawToken();
  const invite_token_hash = staffInviteTokenHash(rawToken);
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data: insertedInv, error: insErr } = await supabase
    .from("staff_invitations")
    .insert({
      event_id: eventId,
      organizer_id: user.id,
      email,
      status: "pending",
      invite_token_hash,
      expires_at,
    })
    .select("id")
    .single();

  if (insErr) {
    redirectWithError(eventId, insErr.message);
  }

  if (insertedInv?.id) {
    const at = email.indexOf("@");
    await writeAuditLogSafe(supabase, {
      action: "staff.invited",
      entityType: "staff_invitation",
      entityId: insertedInv.id as string,
      metadata: {
        event_id: eventId,
        invitee_email_domain: at > 0 ? email.slice(at + 1) : null,
      },
    });
  }

  const origin = await getAppOrigin();
  const acceptUrl = `${origin}/staff/invite/accept?token=${encodeURIComponent(rawToken)}`;

  const sent = await sendStaffInviteEmail({
    to: email,
    eventName: ev.name as string,
    acceptUrl,
  });

  revalidatePath(`/organizer/events/${eventId}/staff`);
  if (!sent.ok) {
    redirectWithError(
      eventId,
      `Invitation was created but the email could not be sent: ${sent.error}`
    );
  }

  redirect(`/organizer/events/${eventId}/staff?ok=1`);
}

export async function revokeStaffInvitation(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  if (!eventId || !invitationId) redirect("/organizer");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventId}/staff`)}`);

  const { error } = await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("event_id", eventId)
    .eq("organizer_id", user.id);

  if (error) redirectWithError(eventId, error.message);

  await writeAuditLogSafe(supabase, {
    action: "staff.invitation_revoked",
    entityType: "staff_invitation",
    entityId: invitationId,
    metadata: { event_id: eventId },
  });

  revalidatePath(`/organizer/events/${eventId}/staff`);
  redirect(`/organizer/events/${eventId}/staff?ok=1`);
}

export async function revokeEventStaffMember(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const staffRowId = String(formData.get("event_staff_id") ?? "").trim();
  if (!eventId || !staffRowId) redirect("/organizer");

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventId}/staff`)}`);

  const { error } = await supabase
    .from("event_staff")
    .update({ status: "revoked" })
    .eq("id", staffRowId)
    .eq("event_id", eventId);

  if (error) redirectWithError(eventId, error.message);

  await writeAuditLogSafe(supabase, {
    action: "staff.revoked",
    entityType: "event_staff",
    entityId: staffRowId,
    metadata: { event_id: eventId },
  });

  revalidatePath(`/organizer/events/${eventId}/staff`);
  redirect(`/organizer/events/${eventId}/staff?ok=1`);
}
