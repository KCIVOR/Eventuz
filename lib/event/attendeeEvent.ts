import type { createClient } from "@/lib/supabase/server";

type Supabase = Awaited<ReturnType<typeof createClient>>;

const POST_PURCHASE_HUB_STATUSES = [
  "capacity_held",
  "payment_pending",
  "paid_unassigned",
  "partially_assigned",
  "completed",
] as const;

/**
 * Primary resolver for attendee hub + seat assignment: published event first, then (if signed in)
 * the event tied to the buyer's in-flight or completed order so suspended/disabled events still
 * allow seat assignment, QR issue, and tickets — without opening new purchases.
 */
export async function resolveAttendeeFacingEvent(
  supabase: Supabase,
  options?: { buyerUserId?: string | null }
): Promise<{
  event: Record<string, unknown> | null;
  message: string | null;
  registrationOpen: boolean;
}> {
  const { event, message } = await resolvePublishedEventForAttendee(supabase);
  if (event) {
    return { event, message: null, registrationOpen: true };
  }

  const uid = options?.buyerUserId;
  if (!uid) {
    return { event: null, message, registrationOpen: false };
  }

  const slug = process.env.NEXT_PUBLIC_EVENT_PUBLIC_SLUG?.trim();

  const { data: rows, error } = await supabase
    .from("orders")
    .select(
      `updated_at,
       events ( id, name, description, venue, formatted_address, lat, lng, event_date, event_time, status, public_slug, cover_url )`
    )
    .eq("buyer_user_id", uid)
    .in("status", [...POST_PURCHASE_HUB_STATUSES])
    .order("updated_at", { ascending: false });

  if (error || !rows?.length) {
    return { event: null, message, registrationOpen: false };
  }

  for (const row of rows) {
    const raw = row.events as Record<string, unknown> | Record<string, unknown>[] | null;
    const ev = (Array.isArray(raw) ? raw[0] : raw) as Record<string, unknown> | null | undefined;
    if (!ev?.id) continue;
    if (slug && String(ev.public_slug ?? "") !== slug) continue;
    const st = String(ev.status ?? "");
    if (st === "disabled") {
      return { event: ev, message: null, registrationOpen: false };
    }
    if (st === "published") {
      return { event: ev, message: null, registrationOpen: true };
    }
  }

  return { event: null, message, registrationOpen: false };
}

export async function resolvePublishedEventForAttendee(supabase: Supabase): Promise<{
  event: Record<string, unknown> | null;
  message: string | null;
}> {
  const slug = process.env.NEXT_PUBLIC_EVENT_PUBLIC_SLUG?.trim();

  if (slug) {
    const { data, error } = await supabase
      .from("events")
      .select("*")
      .eq("public_slug", slug)
      .eq("status", "published")
      .maybeSingle();

    if (error) {
      return { event: null, message: error.message };
    }
    if (!data) {
      return {
        event: null,
        message: `No published event found for slug “${slug}”.`,
      };
    }
    return { event: data as Record<string, unknown>, message: null };
  }

  const { data, error } = await supabase
    .from("events")
    .select("*")
    .eq("status", "published")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error) {
    return { event: null, message: error.message };
  }
  if (!data) {
    return {
      event: null,
      message:
        "No published event yet. Publish one from the organizer dashboard, or set NEXT_PUBLIC_EVENT_PUBLIC_SLUG.",
    };
  }
  return { event: data as Record<string, unknown>, message: null };
}
