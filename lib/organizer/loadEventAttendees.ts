import { createClient } from "@/lib/supabase/server";
import { nestedOne } from "@/lib/supabase/nestedOne";

export type AttendeeManagementRow = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_code: string;
  status: string;
  ticket_type_name: string;
  checked_in_at: string | null;
  issued_at: string | null;
  seat_display_label: string | null;
  seat_label: string | null;
  table_label: string | null;
  order_id: string;
  buyer: {
    name: string;
    email: string | null;
    user_id: string;
  };
  is_registered: boolean;
};

export type AttendeeManagementData = {
  event: {
    id: string;
    name: string;
  };
  attendees: AttendeeManagementRow[];
};

type TicketAttendeeRow = {
  id: string;
  attendee_name: string;
  attendee_email: string;
  ticket_code: string;
  status: string;
  checked_in_at: string | null;
  issued_at: string | null;
  order_id: string;
  ticket_types: { name?: string | null } | { name?: string | null }[] | null;
  seats: {
    display_label?: string | null;
    seat_label?: string | null;
    table_label?: string | null;
  } | {
    display_label?: string | null;
    seat_label?: string | null;
    table_label?: string | null;
  }[] | null;
  orders: { id?: string | null; buyer_user_id?: string | null } | { id?: string | null; buyer_user_id?: string | null }[] | null;
};

export async function loadOrganizerEventAttendees(
  eventId: string
): Promise<{ ok: true; data: AttendeeManagementData } | { ok: false; reason: "auth" | "forbidden" }> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { ok: false, reason: "auth" };

  const { data: event, error: evErr } = await supabase
    .from("events")
    .select("id, name, organizer_id")
    .eq("id", eventId)
    .maybeSingle();

  if (evErr || !event) return { ok: false, reason: "forbidden" };

  if (event.organizer_id !== user.id) {
    // Check if user is staff for this event
    const { data: staff } = await supabase
      .from("event_staff")
      .select("id")
      .eq("event_id", eventId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();
    
    if (!staff) return { ok: false, reason: "forbidden" };
  }

  const { data: ticketsRaw } = await supabase
    .from("tickets")
    .select(
      `id, attendee_name, attendee_email, ticket_code, status, checked_in_at, issued_at, order_id,
       ticket_types ( name ),
       seats ( display_label, seat_label, table_label ),
       orders ( id, buyer_user_id )`
    )
    .eq("event_id", eventId)
    .order("issued_at", { ascending: false });

  const tickets = (ticketsRaw ?? []) as TicketAttendeeRow[];
  
  // Collect all unique buyer IDs and attendee emails
  const buyerIds = [...new Set(tickets.map((t) => nestedOne(t.orders)?.buyer_user_id))].filter(Boolean);
  const attendeeEmails = [...new Set(tickets.map((t) => t.attendee_email.toLowerCase()))];

  // Fetch buyer profiles
  const { data: buyerProfiles } = buyerIds.length > 0
    ? await supabase.from("profiles").select("id, full_name, email").in("id", buyerIds)
    : { data: [] };

  const buyerById = new Map(buyerProfiles?.map((p) => [p.id, p]) ?? []);

  // Fetch attendee accounts (to check if registered)
  const { data: attendeeAccounts } = attendeeEmails.length > 0
    ? await supabase.from("profiles").select("email").in("email", attendeeEmails)
    : { data: [] };

  const registeredEmails = new Set(attendeeAccounts?.map((a) => a.email.toLowerCase()) ?? []);

  const attendees: AttendeeManagementRow[] = tickets.map((t) => {
    const tt = nestedOne(t.ticket_types);
    const seat = nestedOne(t.seats);
    const order = nestedOne(t.orders);
    const buyerProfile = order ? buyerById.get(order.buyer_user_id) : null;
    
    return {
      id: t.id,
      attendee_name: t.attendee_name,
      attendee_email: t.attendee_email,
      ticket_code: t.ticket_code,
      status: t.status,
      ticket_type_name: tt?.name ?? "—",
      checked_in_at: t.checked_in_at,
      issued_at: t.issued_at,
      seat_display_label: seat?.display_label ?? null,
      seat_label: seat?.seat_label ?? null,
      table_label: seat?.table_label ?? null,
      order_id: t.order_id,
      buyer: {
        name: buyerProfile?.full_name || "Unknown Buyer",
        email: buyerProfile?.email || null,
        user_id: order?.buyer_user_id || "",
      },
      is_registered: registeredEmails.has(t.attendee_email.toLowerCase()),
    };
  });

  return {
    ok: true,
    data: {
      event: {
        id: event.id,
        name: event.name,
      },
      attendees,
    },
  };
}
