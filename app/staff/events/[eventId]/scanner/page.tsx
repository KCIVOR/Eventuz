import { EventCheckInScanner } from "@/components/check-in/EventCheckInScanner";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { createClient } from "@/lib/supabase/server";
import { nestedOne } from "@/lib/supabase/nestedOne";
import { notFound, redirect } from "next/navigation";

type Props = { params: Promise<{ eventId: string }> };

export default async function StaffEventScannerPage({ params }: Props) {
  const { eventId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/staff/events/${eventId}/scanner`)}`);
  }

  const { data: row } = await supabase
    .from("event_staff")
    .select(
      `id, status, role,
       events ( id, name, venue, event_date, event_time )`
    )
    .eq("event_id", eventId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!row) notFound();

  if (row.status !== "active") {
    redirect(
      `/staff?error=${encodeURIComponent("Scanner access for this event has been revoked.")}`
    );
  }

  const ev = nestedOne(
    row.events as
      | {
          name: string;
          venue: string;
          event_date: string;
          event_time: string;
        }
      | {
          name: string;
          venue: string;
          event_date: string;
          event_time: string;
        }[]
      | null
  );

  return (
    <RoleAreaShell
      role="staff"
      title={ev?.name ?? "Scanner"}
      layout="flush"
      navContext={{ eventId }}
      withoutFrame
      breadcrumbs={[
        { label: "Assigned events", href: "/staff" },
        { label: "Scanner" },
      ]}
    >
      <div className="mx-auto w-full max-w-lg px-0 sm:px-2">
        <EventCheckInScanner
          eventId={eventId}
          backHref="/staff"
          backLabel="All events"
        />
      </div>
    </RoleAreaShell>
  );
}
