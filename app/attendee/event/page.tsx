import { AttendeeEventDashboard } from "@/components/attendee/AttendeeEventDashboard";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadAttendeeEventContext } from "@/lib/attendee/eventContext";
import { loadAttendeeTransactions } from "@/lib/attendee/transactions";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{
    hitpay_return?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "My Event - Eventuz",
  };
}

export default async function AttendeeEventPage({ searchParams }: Props) {
  const q = await searchParams;
  const fromHitPay = q.hitpay_return === "1";
  const {
    event,
    activeOrder,
    resumeCheckoutUrl,
    seatAssignmentOrders,
    ordersNeedingQrIssue,
    qrTickets,
    message,
  } = await loadAttendeeEventContext();

  if (message || !event) {
    return (
      <RoleAreaShell role="attendee" title="My Event" showPageHeader>
        <p className="text-center text-sm text-muted-foreground">{message ?? "No event available."}</p>
      </RoleAreaShell>
    );
  }

  const { transactions: recentTransactions, total: transactionTotal } = await loadAttendeeTransactions({
    search: "",
    status: "",
    page: 1,
  });

  const name = event.name as string;
  const venue = (event.venue as string) || "Venue to be announced";
  const eventDate = (event.event_date as string) || "";
  const eventTime = String(event.event_time ?? "").slice(0, 5);

  return (
    <RoleAreaShell
      role="attendee"
      title="My Event"
      showPageHeader={false}
      compactTitle="My Event"
      layout="flush"
      mainWidth="wide"
    >
      <AttendeeEventDashboard
        event={{
          id: event.id as string,
          name,
          venue,
          eventDate,
          eventTime,
        }}
        fromHitPay={fromHitPay}
        activeOrder={activeOrder}
        resumeCheckoutUrl={resumeCheckoutUrl}
        seatAssignmentOrders={seatAssignmentOrders}
        ordersNeedingQrIssue={ordersNeedingQrIssue}
        qrTickets={qrTickets}
        recentTransactions={recentTransactions}
        transactionTotal={transactionTotal}
      />
    </RoleAreaShell>
  );
}
