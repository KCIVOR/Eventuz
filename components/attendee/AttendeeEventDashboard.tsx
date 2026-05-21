import type {
  PaidOrderSummary,
  QrTicketListRow,
  SeatAssignmentOrderLink,
} from "@/lib/attendee/eventContext";
import type { TransactionRow } from "@/lib/attendee/transactions";
import { DashboardNavigationLink } from "@/components/attendee/DashboardNavigationLink";
import Link from "next/link";

type EventSummary = {
  id: string;
  name: string;
  venue: string;
  eventDate: string;
  eventTime: string;
};

type Props = {
  event: EventSummary;
  activeOrder: Record<string, unknown> | null;
  resumeCheckoutUrl: string | null;
  seatAssignmentOrders: SeatAssignmentOrderLink[];
  ordersNeedingQrIssue: PaidOrderSummary[];
  qrTickets: QrTicketListRow[];
  recentTransactions: TransactionRow[];
  transactionTotal: number;
};

function formatDate(date: string, time: string) {
  const displayDate = date
    ? new Intl.DateTimeFormat("en-US", {
        month: "long",
        day: "numeric",
        year: "numeric",
      }).format(new Date(date))
    : "Date to be announced";

  return time ? `${displayDate} · ${time}` : displayDate;
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    capacity_held: "Tickets Reserved",
    payment_pending: "Payment pending",
    paid_unassigned: "Needs Seat Assignment",
    partially_assigned: "Seats in progress",
    completed: "Completed",
    payment_failed: "Payment failed",
    expired: "Expired",
    cancelled: "Cancelled",
  };

  return labels[status] ?? status.replaceAll("_", " ");
}

export function AttendeeEventDashboard({
  event,
  activeOrder,
  resumeCheckoutUrl,
  seatAssignmentOrders,
  ordersNeedingQrIssue,
  qrTickets,
  recentTransactions,
  transactionTotal,
}: Props) {
  const paymentPending = activeOrder?.status === "payment_pending";
  const capacityHeld = activeOrder?.status === "capacity_held";
  const seatsToAssign = seatAssignmentOrders.reduce(
    (sum, order) => sum + Math.max(0, Number(order.quantity) - Number(order.assignedCount)),
    0
  );
  const checkedInCount = qrTickets.filter((ticket) => ticket.status === "checked_in").length;
  const firstSeatOrder = seatAssignmentOrders[0];
  const latestTransaction = recentTransactions[0];

  let actionTitle = "Reserve your tickets";
  let actionBody = "Start from the public event page to select a ticket category and begin checkout.";
  let actionHref = "/?checkout=1";
  let actionLabel = "Reserve tickets";

  if (paymentPending) {
    actionTitle = "Complete your payment";
    actionBody = "Your reservation is waiting for payment. Open the payment status page to continue checkout and wait for confirmation.";
    actionHref = activeOrder?.id
      ? `/attendee/event/payment/wait?order=${encodeURIComponent(String(activeOrder.id))}`
      : "/?checkout=1";
    actionLabel = resumeCheckoutUrl ? "Open payment status" : "Review reservation";
  } else if (capacityHeld) {
    actionTitle = "Finish your reservation";
    actionBody = "Your ticket selection is being held temporarily. Continue checkout to secure it.";
    actionHref = "/?checkout=1";
    actionLabel = "Continue reservation";
  } else if (seatAssignmentOrders.length > 0) {
    actionTitle = "Assign guest details";
    actionBody = "Payment is confirmed. Choose seats and enter guest details to unlock digital passes.";
    actionHref = firstSeatOrder
      ? `/attendee/event/seats?order=${encodeURIComponent(firstSeatOrder.id)}`
      : "/attendee/event/seats";
    actionLabel = "Choose seats";
  } else if (ordersNeedingQrIssue.length > 0) {
    actionTitle = "Generate your passes";
    actionBody = "Guest details are complete. Issue digital passes from your ticket wallet.";
    actionHref = "/attendee/event/tickets";
    actionLabel = "Open tickets";
  } else if (qrTickets.length > 0) {
    actionTitle = "Your passes are ready";
    actionBody = "Keep your QR passes available for check-in and share each guest pass as needed.";
    actionHref = "/attendee/event/tickets";
    actionLabel = "View digital passes";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 pb-12 lg:px-8">
      <div className="mb-10 grid gap-6 lg:grid-cols-[1fr_360px] lg:items-end">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
            <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-gold">
              Attendee Dashboard
            </p>
          </div>
          <div>
            <h1 className="font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
              My Event
            </h1>
            <p className="mt-3 max-w-2xl text-sm font-light leading-relaxed text-muted-foreground">
              Manage your reservation, seats, digital passes, and payment history for {event.name}.
            </p>
          </div>
        </header>

        <DashboardNavigationLink
          href="/"
          loadingLabel="Opening event..."
          className="btn-eventuz-secondary justify-center px-6 py-3 text-xs"
        >
          View public event page
        </DashboardNavigationLink>
      </div>

      <div className="grid gap-8 lg:grid-cols-12 lg:items-start">
        <main className="space-y-8 lg:col-span-7">
          <section className="panel-card overflow-hidden p-0">
            <div className="border-b border-border/50 bg-accent-gold/[0.03] px-8 py-5">
              <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
                Next step
              </p>
            </div>
            <div className="space-y-6 p-8">
              <div>
                <h2 className="font-serif text-3xl font-light text-foreground">{actionTitle}</h2>
                <p className="mt-3 text-sm font-light leading-relaxed text-muted-foreground">{actionBody}</p>
              </div>

              <Link href={actionHref} className="btn-eventuz-gold px-8 py-4 text-sm">
                {actionLabel}
              </Link>
            </div>
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <DashboardMetric label="Seats remaining" value={seatsToAssign} href="/attendee/event/seats" />
            <DashboardMetric label="Digital passes" value={qrTickets.length} href="/attendee/event/tickets" />
            <DashboardMetric label="Checked in" value={checkedInCount} href="/attendee/event/tickets" />
            <DashboardMetric label="Transactions" value={transactionTotal} href="/attendee/transactions" />
          </section>
        </main>

        <aside className="space-y-6 lg:col-span-5 lg:sticky lg:top-32">
          <section className="panel-card p-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
              Event details
            </p>
            <h2 className="mt-3 font-serif text-2xl font-light text-foreground">{event.name}</h2>
            <dl className="mt-6 space-y-4 text-sm">
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Date
                </dt>
                <dd className="mt-1 text-foreground">{formatDate(event.eventDate, event.eventTime)}</dd>
              </div>
              <div>
                <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                  Venue
                </dt>
                <dd className="mt-1 text-foreground">{event.venue}</dd>
              </div>
            </dl>
          </section>

          <section className="panel-card p-8">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
                  Recent activity
                </p>
                <h2 className="mt-2 font-serif text-2xl font-light text-foreground">Transactions</h2>
              </div>
              <Link
                href="/attendee/transactions"
                className="text-[10px] font-semibold uppercase tracking-widest text-accent-gold"
              >
                View all
              </Link>
            </div>
            {latestTransaction ? (
              <div className="mt-6 rounded-sm border border-border bg-muted/10 p-5">
                <p className="text-sm font-medium text-foreground">{latestTransaction.ticket_type_name}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {statusLabel(latestTransaction.status)} · {new Date(latestTransaction.created_at).toLocaleDateString()}
                </p>
              </div>
            ) : (
              <p className="mt-6 text-sm font-light leading-relaxed text-muted-foreground">
                No transactions yet. Your reservation activity will appear here after checkout starts.
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}

function DashboardMetric({
  label,
  value,
  href,
}: {
  label: string;
  value: number;
  href: string;
}) {
  return (
    <Link
      href={href}
      className="panel-card p-6 transition-all hover:border-accent-gold/40 hover:shadow-md"
    >
      <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">{label}</p>
      <p className="mt-3 font-serif text-4xl font-light leading-none text-foreground">{value}</p>
    </Link>
  );
}
