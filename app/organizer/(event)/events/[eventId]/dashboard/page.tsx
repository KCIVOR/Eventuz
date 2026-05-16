
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { Button } from "@/components/ui/Button";
import { SubmitButton } from "@/components/ui/SubmitButton";
import { loadOrganizerEventDashboard } from "@/lib/organizer/loadEventDashboard";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import Link from "next/link";
import { notFound } from "next/navigation";

// Decomposed components
import { DashboardMetricsGrid } from "@/components/organizer/DashboardMetricsGrid";
import { DashboardAvailabilityTable } from "@/components/organizer/DashboardAvailabilityTable";
import { DashboardOrdersTable } from "@/components/organizer/DashboardOrdersTable";
import { DashboardTicketsTable } from "@/components/organizer/DashboardTicketsTable";
import { DashboardScanActivity } from "@/components/organizer/DashboardScanActivity";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<SerializableSearchParams>;
};

export default async function OrganizerEventDashboardPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const q = await searchParams;
  const loaded = await loadOrganizerEventDashboard(eventId);
  if (!loaded.ok) notFound();

  const pgOrd = parsePageParam(q.db_o);
  const pgPu = parsePageParam(q.db_p);
  const pgTix = parsePageParam(q.db_t);
  const pgScn = parsePageParam(q.db_s);

  const d = loaded.data;
  const dashPath = `/organizer/events/${eventId}/dashboard`;

  // Data slicing for tables
  const paidPage = slicePage(d.paid_unassigned, pgPu, DEFAULT_LIST_PAGE_SIZE);
  const ordersPage = slicePage(d.orders, pgOrd, DEFAULT_LIST_PAGE_SIZE);
  const ticketsPage = slicePage(d.tickets, pgTix, DEFAULT_LIST_PAGE_SIZE);
  const scansPage = slicePage(d.recent_check_ins, pgScn, DEFAULT_LIST_PAGE_SIZE);

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title={d.event.name}
      description={`${d.event.event_date} · ${d.event.event_time} · ${d.event.public_slug}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: d.event.name, href: `/organizer/events/${eventId}` },
        { label: "Dashboard" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 sm:px-8">

        {/* TOP: Metric Hero */}
        <section className="space-y-6 animate-fade-in-up">
          <div className="flex items-center justify-between">
            <h2 className="font-serif text-2xl font-light text-foreground">Event Insights</h2>
            <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
          </div>
          <DashboardMetricsGrid metrics={d.metrics} />
        </section>

        <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">

          {/* MAIN COLUMN: Core Data Tables */}
          <div className="lg:col-span-8 space-y-12">

            {/* Availability Section */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
              <div className="flex items-center gap-4">
                <h3 className="font-serif text-xl font-light text-foreground">Ticket Availability</h3>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              <DashboardAvailabilityTable availability={d.availability} />
            </section>

            {/* Unassigned Paid Orders */}
            {d.paid_unassigned.length > 0 && (
              <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-4">
                  <h3 className="font-serif text-xl font-light text-foreground">Paid Tickets (Awaiting Seat Assignment)</h3>
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <DashboardOrdersTable
                  orders={d.paid_unassigned}
                  pageData={paidPage}
                  dashPath={dashPath}
                  searchParams={q}
                  paramKey="db_p"
                />
              </section>
            )}

            {/* Attendees Sneak Peek */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4 flex-1">
                  <h3 className="font-serif text-xl font-light text-foreground">Guest Registry</h3>
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <Button variant="outline" className="btn-eventuz-secondary ml-4 px-4 py-2 text-xs" asChild>
                  <Link href={`/organizer/events/${eventId}/attendees`}>
                    View All Attendees
                  </Link>
                </Button>
              </div>
              <DashboardTicketsTable
                tickets={d.tickets.slice(0, 5)}
                pageData={{
                  slice: d.tickets.slice(0, 5),
                  page: 1,
                  total: d.tickets.length,
                  pageCount: 1,
                  rangeStart: 1,
                  rangeEnd: Math.min(5, d.tickets.length)
                }}
                dashPath={dashPath}
                searchParams={q}
                withoutPagination
              />
            </section>

            {/* All Orders */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center gap-4">
                <h3 className="font-serif text-xl font-light text-foreground">Order History & Sales</h3>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              <DashboardOrdersTable
                orders={d.orders}
                pageData={ordersPage}
                dashPath={dashPath}
                searchParams={q}
                paramKey="db_o"
              />
            </section>

            {/* Scan Activity Section - Moved to main column for more space */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
              <div className="flex items-center gap-4">
                <h3 className="font-serif text-xl font-light text-foreground text-foreground font-bold">Recent Arrivals</h3>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              <DashboardScanActivity
                scans={d.recent_check_ins}
                pageData={scansPage}
                dashPath={dashPath}
                searchParams={q}
              />
            </section>
          </div>

          {/* SIDEBAR: Controls & Activity */}
          <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-32">

            {/* Announcements Section */}
            <div className="panel-card p-8 border-accent-gold/20 bg-accent-gold/[0.02]">
              <h3 className="text-[10px] uppercase tracking-widest text-accent-gold font-bold mb-6">Announcements</h3>
              
              <div className="space-y-6">
                <form action={async (formData) => {
                  "use server";
                  const { createAnnouncement } = await import("@/app/organizer/events/announcementActions");
                  await createAnnouncement(eventId, formData);
                }} className="space-y-4">
                  <div className="space-y-1.5">
                    <input
                      name="title"
                      placeholder="Announcement Title"
                      className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-3 py-2 text-xs font-light text-[#1A1512] outline-none transition-colors placeholder:text-[#AEA89F] focus:border-[#C9A96E]"
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <textarea
                      name="content"
                      placeholder="Write your message here..."
                      rows={3}
                      className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-3 py-2 text-xs font-light text-[#1A1512] outline-none transition-colors placeholder:text-[#AEA89F] focus:border-[#C9A96E]"
                      required
                    />
                  </div>
                  <SubmitButton className="w-full btn-eventuz-gold py-3 text-[10px] shadow-sm">
                    Publish Announcement
                  </SubmitButton>
                </form>

                {/* List of recent announcements */}
                <div className="pt-4 border-t border-border/50 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Active Announcements</p>
                  {/* We fetch these inline for simplicity or they could be passed from the loader */}
                  {(async () => {
                    const { createClient } = await import("@/lib/supabase/server");
                    const supabase = await createClient();
                    const { data: announcements } = await supabase
                      .from("event_announcements")
                      .select("id, title, created_at")
                      .eq("event_id", eventId)
                      .order("created_at", { ascending: false });

                    if (!announcements || announcements.length === 0) {
                      return <p className="text-[10px] italic text-muted-foreground">No announcements published yet.</p>;
                    }

                    return announcements.map((ann) => (
                      <div key={ann.id} className="flex items-center justify-between gap-2 p-2 rounded-[1px] bg-white border border-[#EDE8E3]">
                        <div className="min-w-0">
                          <p className="text-[11px] font-medium text-foreground truncate">{ann.title}</p>
                          <p className="text-[9px] text-muted-foreground">{new Date(ann.created_at).toLocaleDateString()}</p>
                        </div>
                        <form action={async () => {
                          "use server";
                          const { deleteAnnouncement } = await import("@/app/organizer/events/announcementActions");
                          await deleteAnnouncement(eventId, ann.id);
                        }}>
                          <SubmitButton variant="ghost" className="text-[10px] text-destructive hover:underline p-0 h-auto border-none lowercase tracking-normal font-normal">Delete</SubmitButton>
                        </form>
                      </div>
                    ));
                  })()}
                </div>
              </div>
            </div>

            {/* Quick Controls */}
            <div className="panel-card p-8 border-accent-gold/20 bg-accent-gold/[0.02]">
              <h3 className="text-[10px] uppercase tracking-widest text-accent-gold font-bold mb-6">Operations</h3>
              <div className="space-y-3">
                <Button variant="gold" className="w-full btn-eventuz-gold py-4 text-xs shadow-md shadow-accent-gold/10" asChild>
                  <Link href={`/organizer/events/${eventId}/scan`}>
                    Open Scanner Interface
                  </Link>
                </Button>
                <Button variant="outline" className="w-full btn-eventuz-secondary py-3 text-xs" asChild>
                  <Link href={`/organizer/events/${eventId}/seating`}>
                    Edit Seating Plan
                  </Link>
                </Button>
              </div>
            </div>

            {/* Priority Alerts */}
            {d.metrics.paid_unassigned_count > 0 && (
              <div className="panel-card p-6 border-warning/30 bg-warning/5 space-y-3">
                <div className="flex items-center gap-2 text-warning-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-warning" />
                  <span className="text-[10px] uppercase tracking-widest font-bold">Priority Follow-up</span>
                </div>
                <p className="text-xs leading-relaxed text-muted-foreground">
                  <span className="font-semibold text-foreground">{d.metrics.paid_unassigned_count} guests</span> have paid but haven&apos;t assigned their seats yet. Consider sending a broadcast reminder.
                </p>
              </div>
            )}
          </aside>
        </div>
      </div>
    </RoleAreaShell>
  );
}
