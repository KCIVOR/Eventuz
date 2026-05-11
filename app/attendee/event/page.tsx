import { CapacityHoldForm } from "@/components/attendee/CapacityHoldForm";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadAttendeeEventContext } from "@/lib/attendee/eventContext";
import { isHitPayDevSimulationAllowed } from "@/lib/payments/hitpayDevSimulation";
import Link from "next/link";
import type { Metadata } from "next";

type Props = {
  searchParams: Promise<{
    hitpay_return?: string;
    seats?: string;
    ticketsOk?: string;
    ticketErr?: string;
  }>;
};

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Your invitation · Eventuz",
  };
}

export default async function AttendeeEventPage({ searchParams }: Props) {
  const q = await searchParams;
  const fromHitPay = q.hitpay_return === "1";
  const seatsDone = q.seats === "done";
  const ticketsOk = q.ticketsOk === "1";
  const ticketErr = q.ticketErr ? decodeURIComponent(q.ticketErr) : null;
  const {
    event,
    ticketTypes,
    activeOrder,
    resumeCheckoutUrl,
    seatAssignmentOrders,
    ordersNeedingQrIssue,
    qrTickets,
    registrationOpen,
    message,
  } = await loadAttendeeEventContext();

  const showDevHitPaySimulate = isHitPayDevSimulationAllowed();
  const showHoldForm = ticketTypes.length > 0 || Boolean(activeOrder);

  if (message || !event) {
    return (
      <RoleAreaShell role="attendee" title="Your invitation" showPageHeader>
        <p className="text-center text-sm text-muted-foreground">{message ?? "No event available."}</p>
      </RoleAreaShell>
    );
  }

  const name = event.name as string;
  const venue = (event.venue as string) || "—";
  const eventDate = event.event_date as string;
  const eventTime = String(event.event_time ?? "").slice(0, 5);
  const description = (event.description as string) || "";
  const imageUrl = (event.image_url as string | null | undefined)?.trim() || "";
  const eventId = event.id as string;

  const needsSeatChoice = seatAssignmentOrders.length > 0;
  const hasPasses = qrTickets.length > 0 || ordersNeedingQrIssue.length > 0;

  return (
    <RoleAreaShell
      role="attendee"
      title={name}
      showPageHeader={false}
      compactTitle={name}
      layout="flush"
      mainWidth="wide"
    >
      <div className="mx-auto max-w-2xl space-y-10 px-1 pb-12 sm:px-0">
        <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_16px_rgba(28,25,23,0.07)]">
          {imageUrl ? (
            <div className="aspect-[21/9] w-full overflow-hidden bg-muted">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={imageUrl} alt="" className="h-full w-full object-cover" />
            </div>
          ) : null}
          <div className="space-y-4 px-6 py-10 text-center sm:px-10 sm:py-12">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-accent-gold">
              You&apos;re invited
            </p>
            <h1 className="font-serif text-3xl font-semibold leading-tight tracking-tight text-foreground sm:text-4xl">
              {name}
            </h1>
            <p className="text-base leading-relaxed text-muted-foreground">
              <time dateTime={`${eventDate}T${eventTime}`}>
                {eventDate}
                <span className="text-border"> · </span>
                {eventTime}
              </time>
            </p>
            <p className="text-base font-medium text-foreground/95">{venue}</p>
          </div>
        </header>

        {description ? (
          <section className="rounded-2xl border border-border/90 bg-card px-6 py-7 shadow-[0_1px_8px_rgba(28,25,23,0.04)] sm:px-8" aria-labelledby="invitation-message-heading">
            <h2 id="invitation-message-heading" className="font-serif text-lg font-semibold text-foreground">
              Message from the hosts
            </h2>
            <div className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">{description}</div>
            <p className="mt-4 border-t border-border/70 pt-4 text-xs text-muted-foreground">
              Tip: include dress code, schedule, or RSVP notes in this message — everything your guests need in one
              place.
            </p>
          </section>
        ) : null}

        {!registrationOpen ? (
          <div
            className="rounded-2xl border border-warning/35 bg-warning/10 px-5 py-4 text-sm"
            role="status"
          >
            <p className="font-semibold text-foreground">Registration closed</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              New ticket sales aren&apos;t available. If you already paid or have an open reservation, use{" "}
              <Link href="/attendee/event/tickets" className="font-medium text-primary underline-offset-2 hover:underline">
                Your tickets
              </Link>{" "}
              or{" "}
              <Link href="/attendee/event/seats" className="font-medium text-primary underline-offset-2 hover:underline">
                Choose seats
              </Link>{" "}
              when they apply to your order.
            </p>
          </div>
        ) : null}

        {fromHitPay ? (
          <div
            className="rounded-2xl border border-primary/25 bg-muted/30 px-5 py-4 text-sm text-foreground"
            role="status"
          >
            <p className="font-semibold">Back from payment</p>
            <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
              Confirmation can take a moment while payment notifies our servers. Refresh if your status hasn&apos;t
              updated.
            </p>
          </div>
        ) : null}

        {seatsDone ? (
          <div
            className="rounded-2xl border border-success/30 bg-success-muted px-5 py-4 text-sm text-success"
            role="status"
          >
            <p className="font-semibold">Seats saved</p>
            <p className="mt-2 text-xs leading-relaxed text-success/90">
              Guest details are confirmed. Generate QR passes from{" "}
              <Link href="/attendee/event/tickets" className="font-semibold underline-offset-2 hover:underline">
                Your tickets
              </Link>
              .
            </p>
          </div>
        ) : null}

        {ticketsOk ? (
          <div
            className="rounded-2xl border border-success/30 bg-success-muted px-5 py-4 text-sm text-success"
            role="status"
          >
            <p className="font-semibold">Tickets ready</p>
            <p className="mt-2 text-xs leading-relaxed text-success/90">
              QR passes are issued. Open{" "}
              <Link href="/attendee/event/tickets" className="font-semibold underline-offset-2 hover:underline">
                Your tickets
              </Link>{" "}
              to view, print, or retry email delivery.
            </p>
          </div>
        ) : null}

        {ticketErr ? (
          <div className="rounded-2xl border border-destructive/30 bg-destructive-muted px-5 py-4 text-sm text-destructive" role="alert">
            <p className="font-semibold">Could not issue tickets</p>
            <p className="mt-2 text-xs leading-relaxed">{ticketErr}</p>
          </div>
        ) : null}

        {(needsSeatChoice || hasPasses || activeOrder) && (
          <section
            className="rounded-2xl border border-primary/20 bg-primary/[0.05] px-5 py-6 sm:px-8"
            aria-labelledby="next-steps-heading"
          >
            <h2 id="next-steps-heading" className="font-serif text-lg font-semibold text-foreground">
              Your next steps
            </h2>
            <ul className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <li className="min-w-0 flex-1">
                <Link
                  href="/attendee/event/tickets"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  View tickets &amp; passes
                </Link>
              </li>
              <li className="min-w-0 flex-1">
                <Link
                  href="/attendee/event/seats"
                  className="flex min-h-12 items-center justify-center rounded-xl border border-border bg-card px-4 py-3 text-center text-sm font-semibold text-foreground shadow-sm transition-colors hover:border-primary/30 hover:bg-muted/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                >
                  Choose seats
                </Link>
              </li>
            </ul>
          </section>
        )}

        <section className="space-y-5" id="rsvp-tickets" aria-labelledby="tickets-purchase-heading">
          <div className="border-b border-border pb-3">
            <h2 id="tickets-purchase-heading" className="font-serif text-xl font-semibold text-foreground">
              RSVP &amp; tickets
            </h2>
            <p className="mt-2 max-w-prose text-sm text-muted-foreground">
              Select a ticket package and complete checkout. Seat selection comes{" "}
              <span className="font-medium text-foreground">after</span> payment is confirmed.
            </p>
          </div>

          {showHoldForm ? (
            <CapacityHoldForm
              eventId={eventId}
              ticketTypes={ticketTypes}
              activeHold={activeOrder}
              resumeCheckoutUrl={resumeCheckoutUrl}
              showDevHitPaySimulate={showDevHitPaySimulate}
            />
          ) : (
            <p className="rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-12 text-center text-sm text-muted-foreground">
              Ticket packages will appear here when your hosts publish them.
            </p>
          )}
        </section>
      </div>
    </RoleAreaShell>
  );
}
