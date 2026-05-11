import { createClient } from "@/lib/supabase/server";
import { notFound, redirect } from "next/navigation";

/**
 * Ensures the signed-in organizer only opens URLs for their single event row.
 * Call from layouts under `/organizer/events/[eventId]`.
 */
export async function assertOrganizerOwnsEventRoute(eventIdFromRoute: string): Promise<void> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventIdFromRoute}`)}`);
  }

  const { data: row, error } = await supabase
    .from("events")
    .select("id")
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (error) notFound();
  if (!row?.id) redirect("/organizer");
  if (row.id !== eventIdFromRoute) notFound();
}
