import { OrganizerSeatInventoryPanel } from "@/components/organizer/OrganizerSeatInventoryPanel";
import { OrganizerFloorPlanDesigner } from "@/components/organizer/OrganizerFloorPlanDesigner";
import { OrganizerSeatingMap } from "@/components/organizer/OrganizerSeatingMap";
import {
  OrganizerSeatingTabs,
  type SeatingTabId,
} from "@/components/organizer/OrganizerSeatingTabs";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { SeatingShellSkeleton } from "@/components/ui/ContentSkeleton";
import { loadOrganizerFloorPlanDesigner } from "@/lib/organizer/loadFloorPlanDesigner";
import { loadOrganizerSeatingOverview } from "@/lib/organizer/loadSeatingOverview";
import { Suspense } from "react";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<{ tab?: string; ok?: string; error?: string }>;
};

function parseTab(raw: string | undefined): SeatingTabId {
  if (raw === "inventory" || raw === "map" || raw === "floor-plan") return raw;
  return "map";
}

export default async function OrganizerSeatingPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const q = await searchParams;
  const loaded = await loadOrganizerSeatingOverview(eventId);
  if (!loaded.ok) notFound();
  const floorPlan = await loadOrganizerFloorPlanDesigner(eventId);
  if (!floorPlan.ok) notFound();

  const defaultTab = parseTab(q.tab);

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title="Seating"
      description={`${loaded.eventName} - Overview, inventory, and floor plan draft.`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: loaded.eventName, href: `/organizer/events/${eventId}` },
        { label: "Seating" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-[96rem] flex-1 flex-col gap-8">
        {q.error ? (
          <p className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
            {q.error}
          </p>
        ) : null}
        {q.ok ? (
          <p className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
            Saved.
          </p>
        ) : null}

        <Suspense fallback={<SeatingShellSkeleton />}>
          <OrganizerSeatingTabs
            eventId={eventId}
            defaultTab={defaultTab}
            mapContent={
              <OrganizerSeatingMap
                eventId={eventId}
                rows={loaded.rows}
                ticketTypes={loaded.ticketTypes}
              />
            }
            inventoryContent={
              <OrganizerSeatInventoryPanel
                eventId={eventId}
                ticketTypes={loaded.inventoryTicketTypes}
                seatsByTypeId={loaded.inventorySeatsByTypeId}
              />
            }
            floorPlanContent={
              <OrganizerFloorPlanDesigner
                eventId={eventId}
                ticketTypes={floorPlan.data.ticketTypes}
                initialLayout={floorPlan.data.layout}
                canvasWidth={floorPlan.data.canvasWidth}
                canvasHeight={floorPlan.data.canvasHeight}
                gridSize={floorPlan.data.gridSize}
              />
            }
          />
        </Suspense>
      </div>
    </RoleAreaShell>
  );
}
