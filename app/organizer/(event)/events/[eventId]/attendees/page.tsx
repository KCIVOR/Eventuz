import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { AttendeeManagementTable } from "@/components/organizer/AttendeeManagementTable";
import { loadOrganizerEventAttendees } from "@/lib/organizer/loadEventAttendees";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ eventId: string }>;
};

export default async function OrganizerAttendeeManagementPage({ params }: Props) {
  const { eventId } = await params;
  const loaded = await loadOrganizerEventAttendees(eventId);

  if (!loaded.ok) {
    if (loaded.reason === "auth") notFound();
    notFound();
  }

  const { event, attendees } = loaded.data;

  // Calculate some quick stats for the header
  const total = attendees.length;
  const checkedIn = attendees.filter(a => a.status === "checked_in").length;
  const registered = attendees.filter(a => a.is_registered).length;

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      withoutFrame
      title="Attendee Management"
      description={`Manage guest registry, purchasers, and check-ins for ${event.name}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: event.name, href: `/organizer/events/${eventId}` },
        { label: "Attendees" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col gap-10 px-4 sm:px-8">
        
        {/* Stats Summary Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="panel-card p-4 border-l-4 border-l-accent-gold">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Total Issued</p>
            <p className="text-2xl font-serif text-foreground">{total}</p>
          </div>
          <div className="panel-card p-4 border-l-4 border-l-success">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Checked In</p>
            <p className="text-2xl font-serif text-foreground">{checkedIn} <span className="text-sm font-sans text-muted-foreground ml-1">({total > 0 ? Math.round((checkedIn / total) * 100) : 0}%)</span></p>
          </div>
          <div className="panel-card p-4 border-l-4 border-l-primary">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Registered Users</p>
            <p className="text-2xl font-serif text-foreground">{registered}</p>
          </div>
          <div className="panel-card p-4 border-l-4 border-l-muted">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold mb-1">Remaining Guests</p>
            <p className="text-2xl font-serif text-foreground">{total - checkedIn}</p>
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
