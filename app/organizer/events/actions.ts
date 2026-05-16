"use server";

import { createClient } from "@/lib/supabase/server";
import {
  parseEventStatus,
  parseHoldMinutesOptional,
  parseHoldMinutesRequired,
} from "@/lib/organizer/eventForm";
import {
  EVENT_COVER_BUCKET,
  buildEventCoverImagePath,
  readEventCoverImageDimensions,
  validateEventCoverImageDimensions,
  validateEventCoverImageFile,
} from "@/lib/organizer/eventCoverImage";
import { validateTicketTypeForm } from "@/lib/organizer/ticketTypeForm";
import {
  initialSeatsForNewTicketType,
  reconcileSeatsToQuantity,
} from "@/lib/organizer/seatSync";
import {
  expectedSeatCount,
  generateSeatLayout,
  type SeatLayoutConfig,
  type SeatLayoutMode,
} from "@/lib/organizer/seatLayout";
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

function getEventCoverImageFile(formData: FormData): File | null {
  const value = formData.get("cover_image");
  if (!(value instanceof File) || value.size === 0) return null;
  return value;
}

async function uploadEventCoverImage(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizerId: string,
  eventId: string,
  file: File
): Promise<{ ok: true; publicUrl: string } | { ok: false; message: string }> {
  const validation = validateEventCoverImageFile(file);
  if (!validation.ok) return { ok: false, message: validation.message ?? "Invalid cover image." };

  const dimensions = await readEventCoverImageDimensions(file);
  if (!dimensions) {
    return { ok: false, message: "Could not read the cover image dimensions." };
  }

  const dimensionValidation = validateEventCoverImageDimensions(dimensions);
  if (!dimensionValidation.ok) {
    return {
      ok: false,
      message: dimensionValidation.message ?? "Cover image dimensions are not supported.",
    };
  }

  const filePath = buildEventCoverImagePath({
    organizerId,
    eventId,
    fileName: file.name,
  });

  const { error: uploadError } = await supabase.storage
    .from(EVENT_COVER_BUCKET)
    .upload(filePath, file, {
      cacheControl: "31536000",
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) return { ok: false, message: uploadError.message };

  const { data } = supabase.storage.from(EVENT_COVER_BUCKET).getPublicUrl(filePath);
  if (!data.publicUrl) {
    return { ok: false, message: "Could not create a public URL for the cover image." };
  }

  return { ok: true, publicUrl: data.publicUrl };
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

  const formatted_address = emptyToNull(formData.get("formatted_address"));
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const lat = latRaw ? Number(latRaw) : null;
  const lng = lngRaw ? Number(lngRaw) : null;

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
    formatted_address,
    lat: isNaN(lat!) ? null : lat,
    lng: isNaN(lng!) ? null : lng,
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
      const coverImage = getEventCoverImageFile(formData);
      if (coverImage) {
        const uploaded = await uploadEventCoverImage(supabase, user.id, evId, coverImage);
        if (!uploaded.ok) redirectEventError(evId, uploaded.message);

        const { error: imageErr } = await supabase
          .from("events")
          .update({ cover_url: uploaded.publicUrl })
          .eq("id", evId)
          .eq("organizer_id", user.id);

        if (imageErr) redirectEventError(evId, imageErr.message);
      }

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
      revalidatePath("/");
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
    .select(
      "id, organizer_id, status, venue, formatted_address, lat, lng, cover_url, capacity_hold_minutes, payment_hold_minutes, early_bird_hold_minutes"
    )
    .eq("id", eventId)
    .maybeSingle();

  if (gateErr || !gate || gate.organizer_id !== user.id) {
    notFound();
  }

  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirectEventError(eventId, "Name is required");

  const public_slug = String(formData.get("public_slug") ?? "").trim();
  if (!public_slug) redirectEventError(eventId, "Public slug is required");

  const cap = formData.has("capacity_hold_minutes")
    ? parseHoldMinutesRequired(formData.get("capacity_hold_minutes"))
    : Number(gate.capacity_hold_minutes);
  const pay = formData.has("payment_hold_minutes")
    ? parseHoldMinutesRequired(formData.get("payment_hold_minutes"))
    : Number(gate.payment_hold_minutes);
  const eb = formData.has("early_bird_hold_minutes")
    ? parseHoldMinutesRequired(formData.get("early_bird_hold_minutes"))
    : Number(gate.early_bird_hold_minutes);
  if (
    cap === null ||
    pay === null ||
    eb === null ||
    !Number.isFinite(cap) ||
    !Number.isFinite(pay) ||
    !Number.isFinite(eb)
  ) {
    redirectEventError(
      eventId,
      "Each hold duration must be a whole number from 1 to 525600 (minutes)."
    );
  }

  const prevStatus = (gate.status as string) || "";
  const nextStatus = parseEventStatus(formData.get("status"));

  const venue = formData.has("venue")
    ? String(formData.get("venue") ?? "").trim()
    : String(gate.venue ?? "").trim();
  const formatted_address = formData.has("formatted_address")
    ? emptyToNull(formData.get("formatted_address"))
    : ((gate.formatted_address as string | null) ?? null);
  const latRaw = formData.get("lat");
  const lngRaw = formData.get("lng");
  const lat = formData.has("lat") ? (latRaw ? Number(latRaw) : null) : Number(gate.lat ?? NaN);
  const lng = formData.has("lng") ? (lngRaw ? Number(lngRaw) : null) : Number(gate.lng ?? NaN);
  const coverImage = getEventCoverImageFile(formData);
  let coverUrl = (gate.cover_url as string | null) ?? null;

  if (String(formData.get("remove_cover_image") ?? "") === "1") {
    coverUrl = null;
  }

  if (coverImage) {
    const uploaded = await uploadEventCoverImage(supabase, user.id, eventId, coverImage);
    if (!uploaded.ok) redirectEventError(eventId, uploaded.message);
    coverUrl = uploaded.publicUrl;
  }

  const { error } = await supabase
    .from("events")
    .update({
      name,
      description: String(formData.get("description") ?? "").trim(),
      venue,
      event_date: String(formData.get("event_date") ?? "").trim(),
      event_time: String(formData.get("event_time") ?? "").trim(),
      status: nextStatus,
      public_slug,
      formatted_address,
      lat: isNaN(lat!) ? null : lat,
      lng: isNaN(lng!) ? null : lng,
      cover_url: coverUrl,
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
  revalidatePath("/");
  revalidatePath("/attendee/event");
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

  const { data: orderRows, error: orderErr } = await supabase
    .from("ticket_types")
    .select("seat_overview_order")
    .eq("event_id", eventId)
    .order("seat_overview_order", { ascending: false, nullsFirst: false })
    .limit(1);

  if (orderErr) redirectEventError(eventId, orderErr.message);

  const nextOverviewOrder = Number(orderRows?.[0]?.seat_overview_order ?? 0) + 1;

  const { data: tt, error } = await supabase
    .from("ticket_types")
    .insert({
      event_id: eventId,
      ...parsed.data,
      seat_overview_order: nextOverviewOrder,
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

function positiveInt(v: FormDataEntryValue | null): number | null {
  const n = Number(v);
  if (!Number.isInteger(n) || n < 1) return null;
  return n;
}

function parseSeatLayoutConfig(formData: FormData): SeatLayoutConfig | { error: string } {
  const mode = String(formData.get("layout_mode") ?? "rowed") as SeatLayoutMode;
  if (mode === "rowed") {
    const rows = positiveInt(formData.get("layout_rows"));
    const columns = positiveInt(formData.get("layout_columns"));
    if (!rows || !columns) {
      return { error: "Rows and columns must be whole numbers greater than 0." };
    }
    return { mode, rows, columns };
  }
  if (mode === "tables") {
    const tableCount = positiveInt(formData.get("layout_table_count"));
    const seatsPerTable = positiveInt(formData.get("layout_seats_per_table"));
    if (!tableCount || !seatsPerTable) {
      return { error: "Tables and seats per table must be whole numbers greater than 0." };
    }
    return { mode, tableCount, seatsPerTable };
  }
  return { error: "Choose a valid layout type." };
}

export async function saveSeatLayout(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/organizer");

  const eventId = String(formData.get("event_id") ?? "");
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  if (!eventId || !ticketTypeId) redirect("/organizer");

  const parsed = parseSeatLayoutConfig(formData);
  if ("error" in parsed) redirectSeatInventoryError(eventId, parsed.error);

  const { data: tt, error: ttErr } = await supabase
    .from("ticket_types")
    .select("id, event_id, quantity, name")
    .eq("id", ticketTypeId)
    .eq("event_id", eventId)
    .maybeSingle();

  if (ttErr || !tt) notFound();

  const { data: ev, error: evErr } = await supabase
    .from("events")
    .select("organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !ev || ev.organizer_id !== user.id) notFound();

  const quantity = Number(tt.quantity);
  const layoutCount = expectedSeatCount(parsed);
  if (layoutCount !== quantity) {
    redirectSeatInventoryError(
      eventId,
      `Layout has ${layoutCount} seat(s), but ${tt.name} requires exactly ${quantity}. Adjust the settings before saving.`
    );
  }

  const { data: seats, error: seatsErr } = await supabase
    .from("seats")
    .select("id")
    .eq("event_id", eventId)
    .eq("ticket_type_id", ticketTypeId)
    .order("created_at", { ascending: true });

  if (seatsErr || !seats) {
    redirectSeatInventoryError(eventId, seatsErr?.message ?? "Could not load seats.");
  }
  if (seats.length !== quantity) {
    redirectSeatInventoryError(
      eventId,
      `Seat rows are out of sync (${seats.length}/${quantity}). Save the ticket type first, then try again.`
    );
  }

  const generated = generateSeatLayout(parsed);
  for (let i = 0; i < seats.length; i++) {
    const next = generated[i];
    const { error } = await supabase
      .from("seats")
      .update({
        table_label: next.tableLabel,
        seat_label: next.seatLabel,
        display_label: next.displayLabel,
      })
      .eq("id", seats[i].id as string);
    if (error) redirectSeatInventoryError(eventId, error.message);
  }

  const { error: updErr } = await supabase
    .from("ticket_types")
    .update({
      seat_layout_mode: parsed.mode,
      seat_layout_rows: parsed.mode === "rowed" ? parsed.rows : null,
      seat_layout_columns: parsed.mode === "rowed" ? parsed.columns : null,
      seat_layout_table_count: parsed.mode === "tables" ? parsed.tableCount : null,
      seat_layout_seats_per_table: parsed.mode === "tables" ? parsed.seatsPerTable : null,
    })
    .eq("id", ticketTypeId);

  if (updErr) redirectSeatInventoryError(eventId, updErr.message);

  await writeAuditLogSafe(supabase, {
    action: "seat.layout_saved",
    entityType: "ticket_type",
    entityId: ticketTypeId,
    metadata: {
      event_id: eventId,
      mode: parsed.mode,
      seat_count: layoutCount,
    },
  });

  revalidatePath(`/organizer/events/${eventId}/seating`);
  revalidatePath("/attendee/event/seats");
  redirect(`/organizer/events/${eventId}/seating?tab=inventory&ok=1`);
}

type SeatOverviewOrderRow = {
  id: string;
  seat_overview_order: number | null;
  created_at: string | null;
};

function sortTicketTypeOrder(rows: SeatOverviewOrderRow[]): SeatOverviewOrderRow[] {
  return [...rows].sort((a, b) => {
    const ao = a.seat_overview_order ?? Number.MAX_SAFE_INTEGER;
    const bo = b.seat_overview_order ?? Number.MAX_SAFE_INTEGER;
    if (ao !== bo) return ao - bo;
    const ac = a.created_at ?? "";
    const bc = b.created_at ?? "";
    const byCreated = ac.localeCompare(bc);
    if (byCreated !== 0) return byCreated;
    return a.id.localeCompare(b.id);
  });
}

async function normalizeSeatOverviewOrder(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ordered: SeatOverviewOrderRow[]
) {
  for (let i = 0; i < ordered.length; i++) {
    const nextOrder = i + 1;
    if (ordered[i].seat_overview_order === nextOrder) continue;
    const { error } = await supabase
      .from("ticket_types")
      .update({ seat_overview_order: nextOrder })
      .eq("id", ordered[i].id);
    if (error) return { ok: false as const, message: error.message };
    ordered[i].seat_overview_order = nextOrder;
  }
  return { ok: true as const };
}

export async function moveSeatOverviewTicketGroup(formData: FormData) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/organizer");

  const eventId = String(formData.get("event_id") ?? "");
  const ticketTypeId = String(formData.get("ticket_type_id") ?? "");
  const direction = String(formData.get("direction") ?? "");
  if (!eventId || !ticketTypeId || (direction !== "up" && direction !== "down")) {
    redirect(`/organizer/events/${eventId || ""}/seating?tab=map&error=Missing reorder details.`);
  }

  const { data: eventRow, error: eventErr } = await supabase
    .from("events")
    .select("id, organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (eventErr || !eventRow || eventRow.organizer_id !== user.id) notFound();

  const { data: ticketRows, error: ticketErr } = await supabase
    .from("ticket_types")
    .select("id, seat_overview_order, created_at")
    .eq("event_id", eventId);

  if (ticketErr || !ticketRows) {
    redirect(
      `/organizer/events/${eventId}/seating?tab=map&error=${encodeURIComponent(
        ticketErr?.message ?? "Could not load ticket groups."
      )}`
    );
  }

  const ordered = sortTicketTypeOrder(ticketRows as SeatOverviewOrderRow[]);
  const normalized = await normalizeSeatOverviewOrder(supabase, ordered);
  if (!normalized.ok) {
    redirect(
      `/organizer/events/${eventId}/seating?tab=map&error=${encodeURIComponent(normalized.message)}`
    );
  }

  const currentIndex = ordered.findIndex((row) => row.id === ticketTypeId);
  const adjacentIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
  const current = ordered[currentIndex];
  const adjacent = ordered[adjacentIndex];

  if (!current || !adjacent) {
    redirect(`/organizer/events/${eventId}/seating?tab=map`);
  }

  const currentOrder = current.seat_overview_order ?? currentIndex + 1;
  const adjacentOrder = adjacent.seat_overview_order ?? adjacentIndex + 1;

  const { error: firstErr } = await supabase
    .from("ticket_types")
    .update({ seat_overview_order: adjacentOrder })
    .eq("id", current.id);

  if (firstErr) {
    redirect(
      `/organizer/events/${eventId}/seating?tab=map&error=${encodeURIComponent(firstErr.message)}`
    );
  }

  const { error: secondErr } = await supabase
    .from("ticket_types")
    .update({ seat_overview_order: currentOrder })
    .eq("id", adjacent.id);

  if (secondErr) {
    redirect(
      `/organizer/events/${eventId}/seating?tab=map&error=${encodeURIComponent(secondErr.message)}`
    );
  }

  await writeAuditLogSafe(supabase, {
    action: "seat.ticket_group_order_changed",
    entityType: "event",
    entityId: eventId,
    metadata: {
      ticket_type_id: ticketTypeId,
      direction,
    },
  });

  revalidatePath(`/organizer/events/${eventId}/seating`);
  redirect(`/organizer/events/${eventId}/seating?tab=map&ok=1`);
}
