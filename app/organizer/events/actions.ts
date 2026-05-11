"use server";

import { createClient } from "@/lib/supabase/server";
import {
  parseEventStatus,
  parseHoldMinutesOptional,
  parseHoldMinutesRequired,
} from "@/lib/organizer/eventForm";
import { validateTicketTypeForm } from "@/lib/organizer/ticketTypeForm";
import {
  initialSeatsForNewTicketType,
  reconcileSeatsToQuantity,
} from "@/lib/organizer/seatSync";
import { writeAuditLogSafe } from "@/lib/audit/writeAuditLog";
import { slugify, randomSuffix } from "@/lib/utils/slug";
import { revalidatePath } from "next/cache";
import { notFound, redirect } from "next/navigation";

function redirectEventError(eventId: string, message: string): never {
  redirect(`/organizer/events/${eventId}?error=${encodeURIComponent(message)}`);
}

function redirectSeatInventoryError(eventId: string, message: string): never {
  redirect(
    `/organizer/events/${eventId}/seating?tab=inventory&error=${encodeURIComponent(message)}`
  );
}

function redirectNewEventError(message: string): never {
  redirect(`/organizer/events/new?error=${encodeURIComponent(message)}`);
}

function emptyToNull(v: FormDataEntryValue | null): string | null {
  const s = String(v ?? "").trim();
  return s === "" ? null : s;
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
  const status = parseEventStatus(formData.get("status"));

  const cap = parseHoldMinutesOptional(formData.get("capacity_hold_minutes"));
  const pay = parseHoldMinutesOptional(formData.get("payment_hold_minutes"));
  const eb = parseHoldMinutesOptional(formData.get("early_bird_hold_minutes"));
  if (cap === null || pay === null || eb === null) {
    redirectNewEventError(
      "Hold durations must be blank (database default) or a whole number from 1 to 525600."
    );
  }

  const { count: existingCount, error: countErr } = await supabase
    .from("events")
    .select("*", { count: "exact", head: true })
    .eq("organizer_id", user.id);

  if (countErr) redirectNewEventError(countErr.message);
  if ((existingCount ?? 0) >= 1) {
    redirectNewEventError(
      "You already have an event. Eventuz supports one wedding per organizer — edit it under Event setup."
    );
  }

  let payload: Record<string, unknown> = {
    organizer_id: user.id,
    name,
    description,
    venue,
    event_date,
    event_time,
    status,
    public_slug,
    ...(cap !== undefined ? { capacity_hold_minutes: cap } : {}),
    ...(pay !== undefined ? { payment_hold_minutes: pay } : {}),
    ...(eb !== undefined ? { early_bird_hold_minutes: eb } : {}),
  };

  for (let attempt = 0; attempt < 5; attempt++) {
    const { data, error } = await supabase
      .from("events")
      .insert(payload)
      .select("id")
      .single();

    if (!error && data?.id) {
      const evId = data.id as string;
      await writeAuditLogSafe(supabase, {
        action: "event.created",
        entityType: "event",
        entityId: evId,
        metadata: { name, initial_status: status },
      });
      if (status === "published") {
        await writeAuditLogSafe(supabase, {
          action: "event.published",
          entityType: "event",
          entityId: evId,
          metadata: { name, source: "create" },
        });
      }
      revalidatePath("/organizer");
      redirect(`/organizer/events/${evId}`);
    }
    if (error?.code === "23505") {
      const detail = `${error.message ?? ""} ${String((error as { details?: string }).details ?? "")}`;
      if (/events_one_per_organizer|organizer_id/i.test(detail)) {
        redirectNewEventError(
          "You already have an event. Eventuz supports one wedding per organizer account."
        );
      }
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventId}`)}`);

  const { data: gate, error: gateErr } = await supabase
    .from("events")
    .select("id, organizer_id, status")
    .eq("id", eventId)
    .maybeSingle();

  if (gateErr || !gate || gate.organizer_id !== user.id) {
    notFound();
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectEventError(eventId, "Name is required");

  const public_slug = String(formData.get("public_slug") ?? "").trim();
  if (!public_slug) redirectEventError(eventId, "Public slug is required");

  const cap = parseHoldMinutesRequired(formData.get("capacity_hold_minutes"));
  const pay = parseHoldMinutesRequired(formData.get("payment_hold_minutes"));
  const eb = parseHoldMinutesRequired(formData.get("early_bird_hold_minutes"));
  if (cap === null || pay === null || eb === null) {
    redirectEventError(
      eventId,
      "Each hold duration must be a whole number from 1 to 525600 (minutes)."
    );
  }

  const prevStatus = (gate.status as string) || "";
  const nextStatus = parseEventStatus(formData.get("status"));

  const { error } = await supabase
    .from("events")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim(),
      venue: String(formData.get("venue") ?? "").trim(),
      event_date: String(formData.get("event_date") ?? "").trim(),
      event_time: String(formData.get("event_time") ?? "").trim(),
      status: nextStatus,
      public_slug,
      capacity_hold_minutes: cap,
      payment_hold_minutes: pay,
      early_bird_hold_minutes: eb,
    })
    .eq("id", eventId)
    .eq("organizer_id", user.id);

  if (error) redirectEventError(eventId, error.message);

  if (nextStatus === "published" && prevStatus !== "published") {
    await writeAuditLogSafe(supabase, {
      action: "event.published",
      entityType: "event",
      entityId: eventId,
      metadata: { name, previous_status: prevStatus || null, source: "organizer" },
    });
  }
  if (nextStatus === "disabled" && prevStatus !== "disabled") {
    await writeAuditLogSafe(supabase, {
      action: "event.disabled",
      entityType: "event",
      entityId: eventId,
      metadata: { name, source: "organizer", previous_status: prevStatus || null },
    });
  }
  revalidatePath("/organizer");
  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?ok=1`);
}

export async function createTicketType(eventId: string, formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(`/organizer/events/${eventId}`)}`);

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("id")
    .eq("id", eventId)
    .eq("organizer_id", user.id)
    .maybeSingle();

  if (evErr || !ev) notFound();

  const parsed = validateTicketTypeForm(formData);
  if (!parsed.ok) redirectEventError(eventId, parsed.message);

  const { data: tt, error } = await supabase
    .from("ticket_types")
    .insert({
      event_id: eventId,
      ...parsed.data,
    })
    .select("id, name")
    .single();

  if (error || !tt) redirectEventError(eventId, error?.message ?? "Failed to create ticket type.");

  await writeAuditLogSafe(supabase, {
    action: "ticket_type.created",
    entityType: "ticket_type",
    entityId: tt.id as string,
    metadata: {
      event_id: eventId,
      name: tt.name,
      quantity: parsed.data.quantity,
    },
  });

  const rows = initialSeatsForNewTicketType(
    eventId,
    tt.id as string,
    parsed.data.name,
    parsed.data.quantity
  );
  const { error: seatsErr } = await supabase.from("seats").insert(rows);
  if (seatsErr) {
    await supabase.from("ticket_types").delete().eq("id", tt.id);
    redirectEventError(eventId, seatsErr.message);
  }

  await writeAuditLogSafe(supabase, {
    action: "seat.inventory_changed",
    entityType: "ticket_type",
    entityId: tt.id as string,
    metadata: {
      event_id: eventId,
      quantity: parsed.data.quantity,
      reason: "ticket_type_created",
    },
  });

  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?ok=1`);
}

export async function updateTicketType(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/organizer");

  const eventIdForm = String(formData.get("event_id") ?? "");
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  if (!ticketTypeId) {
    if (eventIdForm) redirectEventError(eventIdForm, "Missing ticket type.");
    redirect("/organizer");
  }

  const { data: tt, error: fetchErr } = await supabase
    .from("ticket_types")
    .select("id, event_id, quantity, name")
    .eq("id", ticketTypeId)
    .maybeSingle();

  if (fetchErr || !tt) {
    if (eventIdForm) redirectEventError(eventIdForm, "Ticket type not found.");
    notFound();
  }

  const eventId = tt.event_id as string;

  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !eventRow || eventRow.organizer_id !== user.id) {
    notFound();
  }

  const parsed = validateTicketTypeForm(formData);
  if (!parsed.ok) redirectEventError(eventId, parsed.message);

  const { error: updErr } = await supabase
    .from("ticket_types")
    .update(parsed.data)
    .eq("id", ticketTypeId);

  if (updErr) redirectEventError(eventId, updErr.message);

  const prevQty = tt.quantity != null ? Number(tt.quantity) : null;

  const sync = await reconcileSeatsToQuantity(
    supabase,
    eventId,
    ticketTypeId,
    parsed.data.name,
    parsed.data.quantity
  );
  if (!sync.ok) redirectEventError(eventId, sync.message);

  await writeAuditLogSafe(supabase, {
    action: "ticket_type.updated",
    entityType: "ticket_type",
    entityId: ticketTypeId,
    metadata: {
      event_id: eventId,
      name: parsed.data.name,
      quantity_before: prevQty,
      quantity_after: parsed.data.quantity,
    },
  });

  if (prevQty !== parsed.data.quantity) {
    await writeAuditLogSafe(supabase, {
      action: "seat.inventory_changed",
      entityType: "ticket_type",
      entityId: ticketTypeId,
      metadata: {
        event_id: eventId,
        quantity_before: prevQty,
        quantity_after: parsed.data.quantity,
        reason: "ticket_type_quantity_update",
      },
    });
  }

  revalidatePath(`/organizer/events/${eventId}`);
  redirect(`/organizer/events/${eventId}?ok=1`);
}

export async function updateSeat(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/organizer");

  const seatId = String(formData.get("seat_id") ?? "");
  const eventId = String(formData.get("event_id") ?? "");
  if (!seatId || !eventId) {
    if (eventId) redirectSeatInventoryError(eventId, "Missing seat.");
    redirect("/organizer");
  }

  const { data: seat, error: seatErr } = await supabase
    .from("seats")
    .select("id, event_id")
    .eq("id", seatId)
    .maybeSingle();

  if (seatErr || !seat || seat.event_id !== eventId) {
    notFound();
  }

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !ev || ev.organizer_id !== user.id) {
    notFound();
  }

  const display_label = String(formData.get("display_label") ?? "").trim();
  if (!display_label) redirectSeatInventoryError(eventId, "Display label is required.");

  const { error } = await supabase
    .from("seats")
    .update({
      table_label: emptyToNull(formData.get("table_label")),
      seat_label: String(formData.get("seat_label") ?? "").trim(),
      display_label,
    })
    .eq("id", seatId);

  if (error) redirectSeatInventoryError(eventId, error.message);
  revalidatePath(`/organizer/events/${eventId}`);
  revalidatePath(`/organizer/events/${eventId}/seating`);
  redirect(`/organizer/events/${eventId}/seating?tab=inventory&ok=1`);
}
