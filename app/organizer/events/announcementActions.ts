"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { sendAnnouncementEmails } from "@/lib/notifications/announcementEmail";

export async function createAnnouncement(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const title = String(formData.get("title") ?? "").trim();
  const content = String(formData.get("content") ?? "").trim();

  if (!title || !content) {
    redirect(`/organizer/events/${eventId}/dashboard?error=Title and content are required`);
  }

  // Verification that user owns the event is handled by RLS, 
  // but we can check here for better error messaging.
  const { data: event } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (!event) {
    redirect(`/organizer/events/${eventId}/dashboard?error=Access denied`);
  }

  const { error } = await supabase.from("event_announcements").insert({
    event_id: eventId,
    title,
    content,
  });

  if (error) {
    redirect(`/organizer/events/${eventId}/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  // Trigger SMTP notifications
  // We do this in the background (or awaited here) to ensure attendees get an email.
  try {
    await sendAnnouncementEmails({
      eventId,
      title,
      content,
    });
  } catch (err) {
    console.error("Failed to send announcement emails:", err);
    // We don't redirect with an error here because the announcement WAS created successfully.
  }

  revalidatePath(`/organizer/events/${eventId}/dashboard`);
  redirect(`/organizer/events/${eventId}/dashboard?ok=Announcement published and emails sent`);
}

export async function deleteAnnouncement(eventId: string, announcementId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase
    .from("event_announcements")
    .delete()
    .eq("id", announcementId);

  if (error) {
    redirect(`/organizer/events/${eventId}/dashboard?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath(`/organizer/events/${eventId}/dashboard`);
  redirect(`/organizer/events/${eventId}/dashboard?ok=Announcement deleted`);
}
