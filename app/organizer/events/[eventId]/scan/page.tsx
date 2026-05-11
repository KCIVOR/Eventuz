import { EventCheckInScanner } from "@/components/check-in/EventCheckInScanner";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { createClient } from "@/lib/supabase/server";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ eventId: string }> };

export default async function OrganizerEventScanPage({ params }: Props) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: event, error } = await supabase
    .from("events")
    .select("id, name, organizer_id, event_date, event_time, venue")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) notFound();
  if (!user || event.organizer_id !== user.id) notFound();

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      title="Check-in scanner"
      description={`${event.name as string} · ${event.event_date as string} · ${String(event.event_time ?? "")}${event.venue ? ` · ${event.venue as string}` : ""}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name as string, href: `/organizer/events/${eventId}` },
        { label: "Scanner" },
      ]}
    >
      <div className="mx-auto w-full max-w-lg pb-8">
        <div className="mt-2">
          <EventCheckInScanner
            eventId={eventId}
            backHref={`/organizer/events/${eventId}`}
            backLabel="Event setup"
          />
        </div>
      </div>
    </RoleAreaShell>
  );
}
