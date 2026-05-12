import { loadPlatformOverview } from "@/lib/super-admin/loadPlatformOverview";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { SuperAdminEventsTable } from "@/components/super-admin/SuperAdminEventsTable";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";

type Props = { searchParams: Promise<SerializableSearchParams> };

export default async function SuperAdminEventsPage({ searchParams }: Props) {
  const q = await searchParams;
  const overview = await loadPlatformOverview();
  const { events, organizerNameById } = overview;

  const pgEv = parsePageParam(q.lp_ev);
  const eventsPage = slicePage(events, pgEv, DEFAULT_LIST_PAGE_SIZE);

  return (
    <RoleAreaShell
      role="super_admin"
      title="Event Management"
      description="Monitor and manage all events on the platform."
      layout="flush"
      mainWidth="wide"
      withoutFrame
    >
      <section className="space-y-3">
        <div className="flex items-end justify-between border-b border-border pb-3">
          <h2 className="font-serif text-xl font-semibold text-foreground">All Events</h2>
          <p className="text-xs text-muted-foreground">Loaded {events.length} events</p>
        </div>
        <SuperAdminEventsTable 
          events={events} 
          pageData={eventsPage} 
          pathname="/super-admin/events" 
          searchParams={q} 
          organizerNameById={organizerNameById} 
          paramKey="lp_ev" 
          listLabel="All platform events" 
        />
      </section>
    </RoleAreaShell>
  );
}
