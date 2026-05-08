"use server";

import { createClient } from "@/lib/supabase/server";
import { slugify, randomSuffix } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

function toNum(v: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
}

function redirectEventError(eventId: string, message: string): never {
  redirect(`/organizer/events/${eventId}?error=${encodeURIComponent(message)}`);
}

function redirectNewEventError(message: string): never {
  redirect(`/organizer/events/new?error=${encodeURIComponent(message)}`);
}

export async function createEvent(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/organizer/events/new");

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectNewEventError("Name is required");

  const description = String(formData.get("description") ?? "").trim();
  const venue = String(formData.get("venue") ?? "").trim();
  const event_date = String(formData.get("event_date") ?? "").trim();
  const event_time = String(formData.get("event_time") ?? "").trim();
  if (!event_date || !event_time) redirectNewEventError("Date and time are required");

  let public_slug = slugify(String(formData.get("public_slug") ?? "") || name);
  const image_url = emptyToNull(formData.get("image_url"));

  let payload = {
    organizer_id: user.id,
    name,
    description,
    venue,
    event_date,
    event_time,
    image_url,
    status: String(formData.get("status") ?? "draft"),
    public_slug,
    capacity_hold_minutes: toNum(formData.get("capacity_hold_minutes"), 15),
    payment_hold_minutes: toNum(formData.get("payment_hold_minutes"), 15),
    early_bird_hold_minutes: toNum(formData.get("early_bird_hold_minutes"), 15),
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data?.id) {
      revalidatePath("/organizer");
      redirect(`/organizer/events/${data.id}`);
    }
    if (error?.code === "23505") {
      public_slug = `${slugify(name)}-${randomSuffix()}`;
      payload = { ...payload, public_slug };
      continue;
    }
    redirectNewEventError(error?.message ?? "Failed to create event");
  }

  redirectNewEventError("Could not allocate a unique URL slug");
}

export async function updateEvent(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectEventError(eventId, "Name is required");

  const { error } = await supabase
    .from("events")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim(),
      venue: String(formData.get("venue") ?? "").trim(),
      event_date: String(formData.get("event_date") ?? "").trim(),
      event_time: String(formData.get("event_time") ?? "").trim(),
      image_url: emptyToNull(formData.get("image_url")),
      status: String(formData.get("status") ?? "draft"),
      public_slug: String(formData.get("public_slug") ?? "").trim(),
      capacity_hold_minutes: toNum(formData.get("capacity_hold_minutes"), 15),
      payment_hold_minutes: toNum(formData.get("payment_hold_minutes"), 15),
      early_bird_hold_minutes: toNum(formData.get("early_bird_hold_minutes"), 15),
    })
    .eq("id", eventId);

  if (error) redirectEventError(eventId, error.message);
  revalidatePath("/organizer");
  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?ok=1`);
}

export async function createTicketType(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectEventError(eventId, "Ticket name is required");

  const quantity = toNum(formData.get("quantity"), -1);
  if (quantity < 1) redirectEventError(eventId, "Quantity must be at least 1");

  const regular_price = toNum(formData.get("regular_price"), -1);
  const early_bird_price = toNum(formData.get("early_bird_price"), -1);
  if (regular_price < 0 || early_bird_price < 0)
    redirectEventError(eventId, "Prices must be zero or positive");

  const early_bird_start_at = emptyToNull(formData.get("early_bird_start_at"));
  const early_bird_end_at = emptyToNull(formData.get("early_bird_end_at"));

  const { data: tt, error } = await supabase
    .from("ticket_types")
    .insert({
      event_id: eventId,
      name,
      description: String(formData.get("description") ?? "").trim(),
      regular_price,
      early_bird_price,
      early_bird_start_at: early_bird_start_at
        ? new Date(early_bird_start_at).toISOString()
        : null,
      early_bird_end_at: early_bird_end_at
        ? new Date(early_bird_end_at).toISOString()
        : null,
      quantity,
      status: String(formData.get("status") ?? "active"),
    })
    .select("id")
    .single();

  if (error || !tt) redirectEventError(eventId, error?.message ?? "Failed to create ticket type");

  const newTypeId = tt.id;
  const base = slugify(name);
  const rows = Array.from({ length: quantity }, (_, i) => {
    const n = i + 1;
    return {
      event_id: eventId,
      ticket_type_id: newTypeId,
      table_label: null as string | null,
      seat_label: String(n),
      display_label: `${base}-${String(n).padStart(3, "0")}`,
      status: "available" as const,
    };
  });

  const { error: seatsError } = await supabase.from("seats").insert(rows);
  if (seatsError) {
    await supabase.from("ticket_types").delete().eq("id", newTypeId);
    redirectEventError(eventId, seatsError.message);
  }

  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}`);
}

export async function updateTicketType(formData: FormData) {
  const supabase = await createClient();
  const eventIdForm = String(formData.get("event_id") ?? "");
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  if (!ticketTypeId) {
    if (eventIdForm) redirectEventError(eventIdForm, "Missing ticket type");
    redirect("/organizer");
  }

  const { data: tt, error: fetchErr } = await supabase
    .from("ticket_types")
    .select("id, event_id, quantity")
    .eq("id", ticketTypeId)
    .single();

  if (fetchErr || !tt) {
    if (eventIdForm) redirectEventError(eventIdForm, fetchErr?.message ?? "Ticket type not found");
    redirect("/organizer");
  }

  const eventId = tt.event_id as string;

  const newQty = toNum(formData.get("quantity"), -1);
  if (newQty < 1) redirectEventError(eventId, "Quantity must be at least 1");

  const regular_price = toNum(formData.get("regular_price"), -1);
  const early_bird_price = toNum(formData.get("early_bird_price"), -1);
  if (regular_price < 0 || early_bird_price < 0)
    redirectEventError(eventId, "Prices must be zero or positive");

  const early_bird_start_at = emptyToNull(formData.get("early_bird_start_at"));
  const early_bird_end_at = emptyToNull(formData.get("early_bird_end_at"));

  const { data: seats, error: seatsErr } = await supabase
    .from("seats")
    .select("id, status")
    .eq("ticket_type_id", ticketTypeId)
    .order("created_at", { ascending: true });

  if (seatsErr || !seats) redirectEventError(eventId, seatsErr?.message ?? "Could not load seats");

  const currentCount = seats.length;
  if (newQty < currentCount) {
    const toRemove = currentCount - newQty;
    const victims = [...seats]
      .reverse()
      .filter((s) => s.status === "available")
      .slice(0, toRemove);
    if (victims.length < toRemove) {
      redirectEventError(
        eventId,
        "Cannot reduce quantity: only unassigned available seats can be removed."
      );
    }
    const { error: delErr } = await supabase
      .from("seats")
      .delete()
      .in(
        "id",
        victims.map((v) => v.id)
      );
    if (delErr) redirectEventError(eventId, delErr.message);
  } else if (newQty > currentCount) {
    const { data: ttRow } = await supabase
      .from("ticket_types")
      .select("name")
      .eq("id", ticketTypeId)
      .single();
    const base = slugify(ttRow?.name ?? "seat");
    const add = newQty - currentCount;
    const startIndex = currentCount + 1;
    const rows = Array.from({ length: add }, (_, i) => {
      const n = startIndex + i;
      return {
        event_id: eventId,
        ticket_type_id: ticketTypeId,
        table_label: null as string | null,
        seat_label: String(n),
        display_label: `${base}-${String(n).padStart(3, "0")}`,
        status: "available" as const,
      };
    });
    const { error: insErr } = await supabase.from("seats").insert(rows);
    if (insErr) redirectEventError(eventId, insErr.message);
  }

  const { error: updErr } = await supabase
    .from("ticket_types")
    .update({
      name: String(formData.get("name") ?? "").trim(),
      description: String(formData.get("description") ?? "").trim(),
      regular_price,
      early_bird_price,
      early_bird_start_at: early_bird_start_at
        ? new Date(early_bird_start_at).toISOString()
        : null,
      early_bird_end_at: early_bird_end_at
        ? new Date(early_bird_end_at).toISOString()
        : null,
      quantity: newQty,
      status: String(formData.get("status") ?? "active"),
    })
    .eq("id", ticketTypeId);

  if (updErr) redirectEventError(eventId, updErr.message);
  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?ok=1`);
}

export async function deleteTicketType(ticketTypeId: string, eventId: string) {
  const supabase = await createClient();
  const { error } = await supabase.from("ticket_types").delete().eq("id", ticketTypeId);
  if (error) redirectEventError(eventId, error.message);
  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?ok=1`);
}

export async function updateSeat(formData: FormData) {
  const supabase = await createClient();
  const seatId = String(formData.get("seat_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!seatId || !eventId) {
    if (eventId) redirectEventError(eventId, "Missing seat");
    redirect("/organizer");
  }

  const table_label = emptyToNull(formData.get("table_label"));
  const seat_label = String(formData.get("seat_label") ?? "").trim();
  const display_label = String(formData.get("display_label") ?? "").trim();
  if (!display_label) redirectEventError(eventId, "Display label is required");

  const { error } = await supabase
    .from("seats")
    .update({
      table_label,
      seat_label,
      display_label,
      status: String(formData.get("status") ?? "available"),
    })
    .eq("id", seatId);

  if (error) redirectEventError(eventId, error.message);
  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?o