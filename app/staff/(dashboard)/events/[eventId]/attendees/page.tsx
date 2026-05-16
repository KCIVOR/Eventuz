import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { AttendeeManagementTable } from "@/components/organizer/AttendeeManagementTable";
import { loadOrganizerEventAttendees } from "@/lib/organizer/loadEventAttendees";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function StaffAttendeeManagementPage({ params }: Props) {
  const { eventId } = await params;
  const loaded = await loadOrganizerEventAttendees(eventId);

  if (!loaded.ok) {
    notFound();
  }

  const { event, attendees } = loaded.data;

  // Stats for the header
  const total = attendees.length;
  const checkedIn = attendees.filter(a => a.status === "checked_in").length;

  return (
    <RoleAreaShell
      role="staff"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title="Guest Registry"
      description={`Staff view for ${event.name} attendees`}
      breadcrumbs={[
        { label: "Home", href: "/staff" },
        { label: event.name },
        { label: "Attendees" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 sm:px-8">
        
        {/* Simple Stats Bar for Staff */}
        <div className="grid grid-cols-2 gap-4 max-w-md">
          <div className="panel-card p-4 border-l-4 border-l-accent-gold">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total Attendees</p>
            <p className="text-2xl font-serif text-foreground">{total}</p>
          </div>
          <div className="panel-card p-4 border-l-4 border-l-success">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Checked In</p>
            <p className="text-2xl font-serif text-foreground">{checkedIn}</p>
          </div>
        </div>

        <section className="panel-card p-6 sm:p-8 animate-fade-in-up">
          <AttendeeManagementTable 
            eventId={eventId} 
            initialAttendees={attendees} 
          />
        </section>
      </div>
    </RoleAreaShell>
  );
}
