
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { Button } from "@/components/ui/Button";
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
                <h3 className="font-serif text-xl font-light text-foreground">Package Availability</h3>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              <DashboardAvailabilityTable availability={d.availability} />
            </section>

            {/* Unassigned Paid Orders */}
            {d.paid_unassigned.length > 0 && (
              <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.15s' }}>
                <div className="flex items-center gap-4">
                  <h3 className="font-serif text-xl font-light text-foreground">Awaiting Assignment</h3>
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

            {/* Tickets Section */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
              <div className="flex items-center gap-4">
                <h3 className="font-serif text-xl font-light text-foreground">Attendee Registry</h3>
                <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
              </div>
              <DashboardTicketsTable 
                tickets={d.tickets} 
                pageData={ticketsPage} 
                dashPath={dashPath} 
                searchParams={q} 
              />
            </section>

            {/* All Orders */}
            <section className="space-y-6 animate-fade-in-up" style={{ animationDelay: '0.25s' }}>
              <div className="flex items-center gap-4">
                <h3 className="font-serif text-xl font-light text-foreground">Financial Ledger</h3>
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
          </div>

          {/* SIDEBAR: Controls & Activity */}
          <aside className="lg:col-span-4 space-y-8 lg:sticky lg:top-32">
            
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

            {/* Scan Activity Section */}
            <div className="panel-card p-0 overflow-hidden">
              <div className="p-6 bg-muted/30 border-b border-border/50">
                <h3 className="text-[10px] uppercase tracking-widest text-foreground font-bold">Recent Arrivals</h3>
              </div>
              <div className="p-6">
                <DashboardScanActivity 
                  scans={d.recent_check_ins} 
                  pageData={scansPage} 
                  dashPath={dashPath} 
                  searchParams={q} 
                />
              </div>
            </div>

          </aside>
        </div>
      </div>
    </RoleAreaShell>
  );
}
