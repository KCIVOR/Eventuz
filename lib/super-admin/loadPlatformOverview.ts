import { createClient } from "@/lib/supabase/server";
import { loadSmtpSettingsPublic } from "@/lib/super-admin/loadSmtpSettings";

export type PlatformCounts = {
  profilesTotal: number;
  profilesDisabled: number;
  organizers: number;
  attendees: number;
  staff: number;
  superAdmins: number;
  eventsTotal: number;
  eventsPublished: number;
  eventsDraft: number;
  eventsDisabled: number;
  ordersTotal: number;
  ordersOpenHolds: number;
  ordersPaidPipeline: number;
  ordersExpired: number;
  ticketTypesTotal: number;
  seatsTotal: number;
};

export type ProfileRow = {
  id: string;
  full_name: string;
  email: string | null;
  role: string;
  created_at: string | null;
  status?: string | null;
};

export type EventRow = {
  id: string;
  name: string;
  public_slug: string;
  status: string;
  organizer_id: string;
  event_date: string;
  created_at: string | null;
};

export type PlatformOverview = {
  counts: PlatformCounts;
  revenuePhp: number;
  profiles: ProfileRow[];
  events: EventRow[];
  organizerNameById: Record<string, string>;
  smtp: {
    configured: boolean;
    isActive: boolean;
    host: string;
    fromEmail: string;
    lastTestError: string | null;
  } | null;
  loadError: string | null;
};

type Db = Awaited<ReturnType<typeof createClient>>;
type Table = "profiles" | "events" | "orders" | "ticket_types" | "seats";

async function rowCount(supabase: Db, table: Table, filters: Record<string, string>): Promise<number> {
  let q = supabase.from(table).select("*", { count: "exact", head: true });
  for (const [col, val] of Object.entries(filters)) {
    q = q.eq(col, val);
  }
  const { count, error } = await q;
  if (error) return 0;
  return count ?? 0;
}

export async function loadPlatformOverview(): Promise<PlatformOverview> {
  const supabase = await createClient();

  const [
    profilesTotal,
    profilesDisabled,
    organizers,
    attendees,
    staff,
    superAdmins,
    eventsTotal,
    eventsPublished,
    eventsDraft,
    eventsDisabled,
    ordersTotal,
    ordersOpenHoldsRes,
    ordersPaidPipelineRes,
    ordersExpired,
    ticketTypesTotal,
    seatsTotal,
    profilesRes,
    eventsRes,
    smtpRes,
  ] = await Promise.all([
    rowCount(supabase, "profiles", {}),
    rowCount(supabase, "profiles", { status: "disabled" }),
    rowCount(supabase, "profiles", { role: "organizer" }),
    rowCount(supabase, "profiles", { role: "attendee" }),
    rowCount(supabase, "profiles", { role: "staff" }),
    rowCount(supabase, "profiles", { role: "super_admin" }),
    rowCount(supabase, "events", {}),
    rowCount(supabase, "events", { status: "published" }),
    rowCount(supabase, "events", { status: "draft" }),
    rowCount(supabase, "events", { status: "disabled" }),
    rowCount(supabase, "orders", {}),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["capacity_held", "payment_pending"]),
    supabase
      .from("orders")
      .select("*", { count: "exact", head: true })
      .in("status", ["paid_unassigned", "partially_assigned", "completed"]),
    rowCount(supabase, "orders", { status: "expired" }),
    rowCount(supabase, "ticket_types", {}),
    rowCount(supabase, "seats", {}),
    supabase
      .from("profiles")
      .select("id, full_name, email, role, created_at, status")
      .order("created_at", { ascending: false })
      .limit(500),
    supabase
      .from("events")
      .select("id, name, public_slug, status, organizer_id, event_date, created_at")
      .order("created_at", { ascending: false })
      .limit(500),
    loadSmtpSettingsPublic(),
  ]);

  const ordersOpenHolds = ordersOpenHoldsRes.error ? 0 : (ordersOpenHoldsRes.count ?? 0);
  const ordersPaidPipeline = ordersPaidPipelineRes.error ? 0 : (ordersPaidPipelineRes.count ?? 0);

  const paidSelect = await supabase
    .from("orders")
    .select("total_amount")
    .in("status", ["paid_unassigned", "partially_assigned", "completed"]);

  let revenuePhp = 0;
  if (!paidSelect.error && paidSelect.data) {
    revenuePhp = paidSelect.data.reduce((s, r) => s + Number(r.total_amount ?? 0), 0);
  }

  const profiles = (profilesRes.data ?? []) as ProfileRow[];
  const events = (eventsRes.data ?? []) as EventRow[];

  const smtp = smtpRes.settings
    ? {
        configured: true,
        isActive: smtpRes.settings.is_active,
        host: smtpRes.settings.host,
        fromEmail: smtpRes.settings.from_email,
        lastTestError: smtpRes.settings.last_test_error,
      }
    : null;

  const organizerNameById: Record<string, string> = {};
  const orgIds = [...new Set(events.map((e) => e.organizer_id))];
  if (orgIds.length > 0) {
    const { data: orgProfiles } = await supabase.from("profiles").select("id, full_name").in("id", orgIds);
    (orgProfiles ?? []).forEach((p) => {
      organizerNameById[p.id as string] = (p.full_name as string) || "—";
    });
  }

  const loadError =
    profilesRes.error?.message ??
    eventsRes.error?.message ??
    smtpRes.error ??
    null;

  return {
    counts: {
      profilesTotal,
      profilesDisabled,
      organizers,
      attendees,
      staff,
      superAdmins,
      eventsTotal,
      eventsPublished,
      eventsDraft,
      eventsDisabled,
      ordersTotal,
      ordersOpenHolds,
      ordersPaidPipeline,
      ordersExpired,
      ticketTypesTotal,
      seatsTotal,
    },
    revenuePhp,
    profiles,
    events,
    organizerNameById,
    smtp,
    loadError,
  };
}
