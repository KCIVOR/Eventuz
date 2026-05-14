import { createClient } from "@/lib/supabase/server";

/**
 * Helper for layouts to fetch the current user's profile data for the DashboardFrame.
 */
export async function getDashboardUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, avatar_url")
    .eq("id", user.id)
    .single();

  return {
    full_name: profile?.full_name || user.email || "User",
    avatar_url: profile?.avatar_url || null,
  };
}

/**
 * Detects the most recently active or assigned event ID for a user.
 */
export async function getActiveEventId(role: string, userId: string) {
  const supabase = await createClient();

  if (role === "organizer") {
    const { data } = await supabase
      .from("events")
      .select("id")
      .eq("organizer_id", userId)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.id || null;
  }

  if (role === "staff") {
    const { data } = await supabase
      .from("event_staff")
      .select("event_id")
      .eq("user_id", userId)
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return data?.event_id || null;
  }

  return null;
}
