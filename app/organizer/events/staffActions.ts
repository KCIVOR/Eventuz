"use server";

import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { generateStaffInviteRawToken, staffInviteTokenHash } from "@/lib/staff/inviteToken";
import { sendStaffInviteEmail } from "@/lib/staff/sendStaffInviteEmail";
import { createClient } from "@/lib/supabase/server";
import { getAppOrigin } from "@/lib/url/site";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";

type OrganizerEventContext = {
  supabase: SupabaseClient;
  user: User;
  event: {
    id: string;
    name: string;
  };
};

function normEmail(raw: string): string {
  return raw.trim().toLowerCase();
}

function redirectWithError(eventId: string, message: string): never {
  redirect(`/organizer/events/${eventId}/staff?error=${encodeURIComponent(message)}`);
}

function redirectSuccess(eventId: string, ok = "1"): never {
  redirect(`/organizer/events/${eventId}/staff?ok=${encodeURIComponent(ok)}`);
}

async function requireOrganizerEvent(eventId: string): Promise<OrganizerEventContext> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventId}/staff`)}`);
  }

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name")
    .eq("id", eventId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (error || !event) {
    redirectWithError(eventId, "You cannot manage staff for this event.");
  }

  return {
    supabase: supabase as SupabaseClient,
    user,
    event: {
      id: event.id as string,
      name: event.name as string,
    },
  };
}

function staffAcceptUrl(origin: string, rawToken: string): string {
  return `${origin}/staff/invite/accept?token=${encodeURIComponent(rawToken)}`;
}

async function activeStaffEmailExists(
  supabase: SupabaseClient,
  eventId: string,
  email: string
): Promise<boolean> {
  const { data: activeRows } = await supabase
    .from("event_staff")
    .select("user_id")
    .eq("event_id", eventId)
    .eq("status", "active");

  const userIds = [...new Set((activeRows ?? []).map((row) => row.user_id as string).filter(Boolean))];
  if (userIds.length === 0) return false;

  const { data: profiles } = await supabase.from("profiles").select("email").in("id", userIds);
  return (profiles ?? []).some((profile) => normEmail(String(profile.email ?? "")) === email);
}

async function createPendingInvitation(
  supabase: SupabaseClient,
  eventId: string,
  organizerId: string,
  email: string
): Promise<{ id: string; rawToken: string; expiresAt: string }> {
  const rawToken = generateStaffInviteRawToken();
  const invite_token_hash = staffInviteTokenHash(rawToken);
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("staff_invitations")
    .insert({
      event_id: eventId,
      organizer_id: organizerId,
      email,
      status: "pending",
      invite_token_hash,
      expires_at,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    redirectWithError(eventId, error?.message ?? "Could not create invitation.");
  }

  return { id: data.id as string, rawToken, expiresAt: expires_at };
}

async function revokePendingInvitationsForEmail(
  supabase: SupabaseClient,
  eventId: string,
  email: string
) {
  await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("event_id", eventId)
    .eq("email", email)
    .eq("status", "pending");
}

function revalidateStaffPages(eventId: string) {
  revalidatePath(`/organizer/events/${eventId}/staff`);
  revalidatePath("/staff");
}

export async function inviteEventStaff(eventId: string, formData: FormData) {
  const { supabase, user, event } = await requireOrganizerEvent(eventId);

  const email = normEmail(String(formData.get("email") ?? ""));
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    redirectWithError(eventId, "Enter a valid email address.");
  }
  if (normEmail(user.email ?? "") === email) {
    redirectWithError(eventId, "You cannot invite yourself as event staff.");
  }
  if (await activeStaffEmailExists(supabase, eventId, email)) {
    redirectWithError(eventId, "That email already has active scanner access for this event.");
  }

  await revokePendingInvitationsForEmail(supabase, eventId, email);
  const invitation = await createPendingInvitation(supabase, eventId, user.id, email);

  const at = email.indexOf("@");
  await writeAuditLogSafe(supabase, {
    action: "staff.invited",
    entityType: "staff_invitation",
    entityId: invitation.id,
    metadata: {
      event_id: eventId,
      invitee_email_domain: at > 0 ? email.slice(at + 1) : null,
      expires_at: invitation.expiresAt,
    },
  });

  const origin = await getAppOrigin();
  const sent = await sendStaffInviteEmail({
    to: email,
    eventName: event.name,
    acceptUrl: staffAcceptUrl(origin, invitation.rawToken),
  });

  revalidateStaffPages(eventId);
  if (!sent.ok) {
    redirectWithError(
      eventId,
      `Invitation was created but the email could not be sent: ${sent.error}`
    );
  }

  redirectSuccess(eventId, "invited");
}

export async function resendStaffInvitation(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  if (!eventId || !invitationId) redirect("/organizer");

  const { supabase, user, event } = await requireOrganizerEvent(eventId);

  const { data: existing, error: loadErr } = await supabase
    .from("staff_invitations")
    .select("id, email, status, expires_at")
    .eq("id", invitationId)
    .eq("event_id", eventId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (loadErr || !existing) {
    redirectWithError(eventId, "Invitation not found.");
  }
  if ((existing.status as string) !== "pending") {
    redirectWithError(eventId, "Only pending or expired invitations can be resent.");
  }

  const email = normEmail(existing.email as string);
  if (await activeStaffEmailExists(supabase, eventId, email)) {
    redirectWithError(eventId, "That email already has active scanner access for this event.");
  }

  const { error: revokeErr } = await supabase
    .from("staff_invitations")
    .update({ status: "revoked" })
    .eq("id", invitationId)
    .eq("event_id", eventId)
    .eq("organizer_id", user.id);

  if (revokeErr) {
    redirectWithError(eventId, revokeErr.message);
  }

  const invitation = await createPendingInvitation(supabase, eventId, user.id, email);
  const at = email.indexOf("@");
  await writeAuditLogSafe(supabase, {
    action: "staff.invitation_resent",
    entityType: "staff_invitation",
    entityId: invitation.id,
    metadata: {
      event_id: eventId,
      replaced_invitation_id: invitationId,
      invitee_email_domain: at > 0 ? email.slice(at + 1) : null,
      expires_at: invitation.expiresAt,
    },
  });

  const origin = await getAppOrigin();
  const sent = await sendStaffInviteEmail({
    to: email,
    eventName: event.name,
    acceptUrl: staffAcceptUrl(origin, invitation.rawToken),
  });

  revalidateStaffPages(eventId);
  if (!sent.ok) {
    redirectWithError(
      eventId,
      `Invitation was refreshed but the email could not be sent: ${sent.error}`
    );
  }

  redirectSuccess(eventId, "resent");
}

export async function revokeStaffInvitation(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const invitationId = String(formData.get("invitation_id") ?? "").trim();
  if (!eventId || !invitationId) redirect("/organizer");

  const { supabase, user } = await requireOrganizerEvent(eventId);
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

  revalidateStaffPages(eventId);
  redirectSuccess(eventId, "revoked");
}

export async function revokeEventStaffMember(formData: FormData) {
  const eventId = String(formData.get("event_id") ?? "").trim();
  const staffRowId = String(formData.get("event_staff_id") ?? "").trim();
  if (!eventId || !staffRowId) redirect("/organizer");

  const { supabase } = await requireOrganizerEvent(eventId);
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

  revalidateStaffPages(eventId);
  redirectSuccess(eventId, "revoked");
}
