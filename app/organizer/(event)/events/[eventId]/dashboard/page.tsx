
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
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <Button variant="outline" size="sm" asChild>
              <Link href={`/organizer/events/${eventId}/scan`}>
                Open check-in scanner
              </Link>
            </Button>
          </p>
        </div>

        {/* Priority Alerts */}
        {d.metrics.paid_unassigned_count > 0 && (
          <div className="callout-eventuz border-warning/30 bg-warning/10">
            <p className="font-semibold text-warning">
              {d.metrics.paid_unassigned_count} paid order{d.metrics.paid_unassigned_count === 1 ? "" : "s"} still need
              seat assignment
            </p>
            <p className="mt-1 text-sm text-foreground/90">
              Buyers completed payment but have not finished choosing seats. Share the attendee link
              or follow up so they can assign seats from their account.
            </p>
          </div>
        )}

        {/* Metrics Grid */}
        <section className="space-y-4">
          <h2 className="section-title">Summary</h2>
          <DashboardMetricsGrid metrics={d.metrics} />
        </section>

        {/* Availability Section */}
        <section className="space-y-4">
          <h2 className="section-title">Availability by ticket type</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            “Available” is capacity minus active holds, pending checkouts, and paid orders that still
            count against inventory.
          </p>
          <DashboardAvailabilityTable availability={d.availability} />
        </section>

        {/* Unassigned Paid Orders */}
        {d.paid_unassigned.length > 0 && (
          <section className="space-y-4">
            <h2 className="section-title">Paid — awaiting seat assignment</h2>
            <DashboardOrdersTable 
              orders={d.paid_unassigned} 
              pageData={paidPage} 
              dashPath={dashPath} 
              searchParams={q} 
              paramKey="db_p"
            />
          </section>
        )}

        {/* All Orders */}
        <section className="space-y-4">
          <h2 className="section-title">All orders</h2>
          <p className="text-xs text-muted-foreground">
            Payment rows are shown as reported by the provider (read-only).
          </p>
          <DashboardOrdersTable 
            orders={d.orders} 
            pageData={ordersPage} 
            dashPath={dashPath} 
            searchParams={q} 
            paramKey="db_o"
          />
        </section>

        {/* Tickets Section */}
        <section className="space-y-4">
          <h2 className="section-title">Tickets & attendees</h2>
          <DashboardTicketsTable 
            tickets={d.tickets} 
            pageData={ticketsPage} 
            dashPath={dashPath} 
            searchParams={q} 
          />
        </section>

        {/* Scan Activity Section */}
        <section className="space-y-4">
          <h2 className="section-title">Recent scan activity</h2>
          <DashboardScanActivity 
            scans={d.recent_check_ins} 
            pageData={scansPage} 
            dashPath={dashPath} 
            searchParams={q} 
          />
        </section>
      </div>
    </RoleAreaShell>
  );
}
