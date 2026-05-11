import { issueAdmissionTicketsAction, retryTicketEmailsAction } from "@/app/attendee/event/actions";
import type {
  PaidOrderSummary,
  QrTicketListRow,
  SeatAssignmentOrderLink,
} from "@/lib/attendee/eventContext";
import Link from "next/link";

export type AttendeeTicketOverviewProps = {
  eventTitle: string;
  activeOrder: Record<string, unknown> | null;
  resumeCheckoutUrl: string | null;
  seatAssignmentOrders: SeatAssignmentOrderLink[];
  ordersNeedingQrIssue: PaidOrderSummary[];
  qrTickets: QrTicketListRow[];
};

/** Full attendee ticket hub: seat work, QR issuance, passes list — no ticket purchase form */
export function AttendeeTicketOverview({
  eventTitle,
  activeOrder,
  resumeCheckoutUrl,
  seatAssignmentOrders,
  ordersNeedingQrIssue,
  qrTickets,
}: AttendeeTicketOverviewProps) {
  const orderIdsNeedingEmailRetry = [
    ...new Set(qrTickets.filter((t) => !t.emailed_at).map((t) => t.order_id)),
  ];

  const paymentPending = activeOrder?.status === "payment_pending";
  const capacityHeld = activeOrder?.status === "capacity_held";

  const hasAnything =
    Boolean(activeOrder) ||
    seatAssignmentOrders.length > 0 ||
    ordersNeedingQrIssue.length > 0 ||
    qrTickets.length > 0;

  return (
    <div className="mx-auto max-w-2xl space-y-10 px-1 sm:px-0">
      <header className="space-y-2 text-center sm:text-left">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold">{eventTitle}</p>
        <h1 className="font-serif text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
          Your tickets
        </h1>
        <p className="max-w-prose text-sm leading-relaxed text-muted-foreground">
          Passes you&apos;ve purchased and QR entry codes. Buy more from{" "}
          <Link
            href="/attendee/event"
            className="font-medium text-primary underline-offset-4 hover:text-primary-hover hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            your invitation
          </Link>
          .
        </p>
      </header>

      {activeOrder ? (
        <section
          className="rounded-2xl border border-warning/35 bg-warning/10 px-5 py-6 sm:px-8"
          aria-labelledby="checkout-progress-heading"
        >
          <h2 id="checkout-progress-heading" className="font-serif text-lg font-semibold text-foreground">
            Checkout in progress
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            {paymentPending
              ? "Complete payment to confirm your tickets."
              : capacityHeld
                ? "Your seats are held temporarily — finish checkout before the timer expires."
                : "You have an open order for this event."}
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            {paymentPending && resumeCheckoutUrl ? (
              <a
                href={resumeCheckoutUrl}
                className="inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-6 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                rel="noopener noreferrer"
                target="_blank"
              >
                Continue to payment
              </a>
            ) : null}
            <Link
              href="/attendee/event#rsvp-tickets"
              className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:bg-muted/50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              Review reservation
            </Link>
          </div>
        </section>
      ) : null}

      {!hasAnything ? (
        <section
          className="rounded-2xl border border-dashed border-border bg-muted/15 px-6 py-14 text-center"
          aria-labelledby="empty-tickets-heading"
        >
          <h2 id="empty-tickets-heading" className="font-serif text-lg font-semibold text-foreground">
            No passes yet
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            When you complete checkout, your orders and QR passes will appear here.
          </p>
          <Link
            href="/attendee/event"
            className="mt-8 inline-flex min-h-11 items-center justify-center rounded-xl bg-primary px-8 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            Back to your invitation
          </Link>
        </section>
      ) : null}

      {seatAssignmentOrders.length > 0 ? (
        <section
          className="rounded-2xl border border-primary/25 bg-card px-5 py-6 shadow-[0_2px_12px_rgba(28,25,23,0.06)] sm:px-8"
          aria-labelledby="seat-work-heading"
        >
          <h2 id="seat-work-heading" className="font-serif text-lg font-semibold text-foreground">
            Choose your seats
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Payment is confirmed for these orders. Each submit saves seats immediately. QR passes can only be created{" "}
            <span className="font-medium text-foreground">after every seat in that order</span> is assigned — then use
            Generate QR passes on this page.
          </p>
          <ul className="mt-5 space-y-3">
            {seatAssignmentOrders.map((o) => {
              const qty = Number(o.quantity);
              const assigned = Math.min(o.assignedCount, qty);
              const remaining = Math.max(0, qty - assigned);
              const hasProgress = assigned > 0;

              return (
                <li key={o.id}>
                  <Link
                    href={`/attendee/event/seats?order=${encodeURIComponent(o.id)}`}
                    className="flex min-h-12 items-center justify-between gap-4 rounded-xl border border-border bg-muted/10 px-4 py-3 text-sm transition-colors hover:border-primary/40 hover:bg-muted/25 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    <span className="min-w-0 flex-1">
                      {hasProgress ? (
                        <>
                          <span className="font-medium text-foreground">
                            {assigned} of {qty} seats assigned
                          </span>
                          {remaining > 0 ? (
                            <span className="mt-0.5 block text-xs font-normal text-muted-foreground">
                              {remaining} left — finish seats to unlock QR passes for this order
                            </span>
                          ) : null}
                        </>
                      ) : (
                        <span className="font-medium text-foreground">
                          {qty} seat{qty === 1 ? "" : "s"} to assign
                        </span>
                      )}
                    </span>
                    <span className="shrink-0 font-semibold text-primary">
                      {hasProgress ? "Continue →" : "Choose seats →"}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {ordersNeedingQrIssue.length > 0 ? (
        <section
          className="rounded-2xl border border-border bg-card px-5 py-6 shadow-[0_2px_12px_rgba(28,25,23,0.06)] sm:px-8"
          aria-labelledby="qr-issue-heading"
        >
          <h2 id="qr-issue-heading" className="font-serif text-lg font-semibold text-foreground">
            Generate QR passes
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
            Seats are saved. Create one secure QR pass per guest from each completed order below.
          </p>
          <ul className="mt-5 space-y-3">
            {ordersNeedingQrIssue.map((o) => (
              <li
                key={o.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/90 bg-muted/10 px-4 py-3"
              >
                <form action={issueAdmissionTicketsAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="order_id" value={o.id} />
                  <span className="text-sm text-muted-foreground">
                    Order · {String(o.quantity)} guest{Number(o.quantity) === 1 ? "" : "s"}
                  </span>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Generate QR tickets
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {qrTickets.length > 0 ? (
        <section className="space-y-4" aria-labelledby="pass-list-heading">
          <h2 id="pass-list-heading" className="font-serif text-lg font-semibold text-foreground">
            Your passes
          </h2>
          <ul className="space-y-4">
            {qrTickets.map((t) => {
              const seat = t.seats;
              const label = seat?.display_label ?? "Seat";
              const ticketTypeName = t.ticket_types?.name ?? "Ticket";
              const tablePart =
                seat?.table_label != null && seat.table_label !== ""
                  ? `Table ${seat.table_label}`
                  : null;
              const seatPart = seat ? `Seat ${seat.seat_label}` : null;
              const detail = [tablePart, seatPart].filter(Boolean).join(" · ");

              return (
                <li
                  key={t.id}
                  className="rounded-2xl border border-border bg-card px-5 py-5 shadow-[0_2px_12px_rgba(28,25,23,0.05)] transition-colors hover:border-primary/20 sm:px-6"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="font-semibold text-foreground">{label}</p>
                      <p className="mt-0.5 text-sm text-muted-foreground">{ticketTypeName}</p>
                      <p className="mt-1 text-sm text-foreground">{t.attendee_name}</p>
                      {detail ? <p className="mt-1 text-xs text-muted-foreground">{detail}</p> : null}
                      <p className="mt-2 font-mono text-xs tracking-wide text-foreground">{t.ticket_code}</p>
                      <p className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 font-semibold uppercase tracking-wide ${
                            t.status === "checked_in"
                              ? "border-primary/30 bg-primary/10 text-primary"
                              : "border-border bg-muted/50 text-muted-foreground"
                          }`}
                        >
                          {t.status === "checked_in" ? "Checked in" : t.status === "issued" ? "Issued" : t.status}
                        </span>
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        <span className="sr-only">Email delivery: </span>
                        {t.emailed_at ? (
                          <span className="text-success">Emailed to {t.attendee_email}</span>
                        ) : t.email_last_error ? (
                          <span className="text-destructive">Email failed: {t.email_last_error}</span>
                        ) : (
                          <span>Email pending</span>
                        )}
                      </p>
                    </div>
                    <Link
                      href={`/attendee/event/tickets/${t.id}`}
                      className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl border border-border bg-background px-5 text-sm font-semibold text-foreground transition-colors hover:border-primary/35 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                    >
                      View ticket
                    </Link>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {orderIdsNeedingEmailRetry.length > 0 ? (
        <section
          className="rounded-2xl border border-border/90 bg-muted/15 px-5 py-5 text-sm text-foreground sm:px-6"
          aria-labelledby="retry-email-heading"
        >
          <h2 id="retry-email-heading" className="font-medium text-foreground">
            Guest emails
          </h2>
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            Retry sending ticket emails if delivery failed (for example SMTP was not configured yet).
          </p>
          <ul className="mt-4 flex flex-wrap gap-2">
            {orderIdsNeedingEmailRetry.map((oid) => (
              <li key={oid}>
                <form action={retryTicketEmailsAction}>
                  <input type="hidden" name="order_id" value={oid} />
                  <button
                    type="submit"
                    className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Retry emails · order {oid.slice(0, 8)}…
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
