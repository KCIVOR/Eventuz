import { AttendeeTicketOverview } from "@/components/attendee/AttendeeTicketOverview";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadAttendeeEventContext } from "@/lib/attendee/eventContext";

export default async function AttendeeTicketsIndexPage() {
  const {
    event,
    message,
    activeOrder,
    resumeCheckoutUrl,
    seatAssignmentOrders,
    ordersNeedingQrIssue,
    qrTickets,
  } = await loadAttendeeEventContext();

  if (message || !event) {
    return (
      <RoleAreaShell role="attendee" title="Your tickets" showPageHeader>
        <p className="text-center text-sm text-muted-foreground">{message ?? "No event available."}</p>
      </RoleAreaShell>
    );
  }

  return (
    <RoleAreaShell
      role="attendee"
      title="Your tickets"
      showPageHeader={false}
      compactTitle="Your tickets"
      layout="flush"
      mainWidth="wide"
      breadcrumbs={[
        { label: "My Event", href: "/attendee/event" },
        { label: "Your tickets" },
      ]}
    >
      <AttendeeTicketOverview
        eventCoverUrl={event.cover_url as string | null}
        activeOrder={activeOrder}
        resumeCheckoutUrl={resumeCheckoutUrl}
        seatAssignmentOrders={seatAssignmentOrders}
        ordersNeedingQrIssue={ordersNeedingQrIssue}
        qrTickets={qrTickets}
      />
    </RoleAreaShell>
  );
}
