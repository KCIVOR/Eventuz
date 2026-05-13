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
    <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
      
      {/* MAIN: Tickets & Active Orders */}
      <div className="lg:col-span-7 space-y-10">
        <header className="space-y-4">
          <div className="flex items-center gap-3">
             <div className="h-1.5 w-1.5 rotate-45 bg-accent-gold" />
             <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-gold">
              Digital Passbook
            </p>
          </div>
          <h1 className="font-serif text-4xl font-light tracking-tight text-foreground sm:text-5xl">
            Your Tickets
          </h1>
          <p className="max-w-2xl text-base font-light leading-relaxed text-muted-foreground">
            Access your entry codes and manage guest assignments. All confirmed passes are stored here for easy entry.
          </p>
        </header>

        {activeOrder && (
          <section
            className="panel-card p-0 overflow-hidden border-warning/30 bg-warning/[0.03] animate-fade-in-up"
            aria-labelledby="checkout-progress-heading"
          >
            <div className="bg-warning/10 px-8 py-4 border-b border-warning/10 flex items-center justify-between">
               <h2 id="checkout-progress-heading" className="text-xs font-bold uppercase tracking-widest text-warning-foreground">
                Incomplete Reservation
              </h2>
              <div className="h-2 w-2 rounded-full bg-warning animate-pulse" />
            </div>
            <div className="p-8">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {paymentPending
                  ? "Your payment is currently being processed or awaits completion. Please finish checkout to secure your seats."
                  : capacityHeld
                    ? "Your desired seats are temporarily reserved. Complete payment before the timer expires to finalize your presence."
                    : "You have an open order that requires your attention."}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {paymentPending && resumeCheckoutUrl && (
                  <a
                    href={resumeCheckoutUrl}
                    className="btn-eventuz-gold px-8 py-3 text-sm shadow-md shadow-accent-gold/10"
                    rel="noopener noreferrer"
                    target="_blank"
                  >
                    Continue to Payment
                  </a>
                )}
                <Link
                  href="/attendee/event#rsvp-tickets"
                  className="btn-eventuz-secondary px-8 py-3 text-sm"
                >
                  Review Order Details
                </Link>
              </div>
            </div>
          </section>
        )}

        {!hasAnything && (
          <section
            className="panel-card py-20 text-center animate-fade-in-up"
            aria-labelledby="empty-tickets-heading"
          >
            <div className="mx-auto h-20 w-20 rounded-full bg-muted/30 flex items-center justify-center mb-6">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="text-muted-foreground">
                <path d="M2 9a3 3 0 0 1 0 6v2a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-2a3 3 0 0 1 0-6V7a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2Z"/>
                <path d="M13 5v2"/><path d="M13 17v2"/><path d="M13 11v2"/>
              </svg>
            </div>
            <h2 id="empty-tickets-heading" className="font-serif text-2xl font-light text-foreground">
              No passes found
            </h2>
            <p className="mt-4 text-sm font-light text-muted-foreground max-w-sm mx-auto leading-relaxed">
              Once your reservation is confirmed and seats are assigned, your digital passes will be available here.
            </p>
            <Link
              href="/attendee/event"
              className="mt-10 btn-eventuz-gold px-10 py-4 text-sm"
            >
              Go to Invitation
            </Link>
          </section>
        )}

        {seatAssignmentOrders.length > 0 && (
          <section
            className="panel-card p-8 border-accent-gold/20 bg-accent-gold/[0.02] shadow-sm animate-fade-in-up"
            aria-labelledby="seat-work-heading"
            style={{ animationDelay: '0.1s' }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 id="seat-work-heading" className="font-serif text-xl font-light text-foreground">
                Finalize Assignments
              </h2>
              <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Action Required</span>
            </div>
            <p className="text-sm font-light leading-relaxed text-muted-foreground mb-8">
              Payment is confirmed. Please assign names and emails to each seat to unlock your digital entry passes.
            </p>
            <ul className="space-y-4">
              {seatAssignmentOrders.map((o) => {
                const qty = Number(o.quantity);
                const assigned = Math.min(o.assignedCount, qty);
                const remaining = Math.max(0, qty - assigned);
                const hasProgress = assigned > 0;

                return (
                  <li key={o.id}>
                    <Link
                      href={`/attendee/event/seats?order=${encodeURIComponent(o.id)}`}
                      className="group flex items-center justify-between gap-6 p-6 rounded-xl border border-border bg-card transition-all hover:border-accent-gold/40 hover:shadow-md"
                    >
                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2">
                           <span className="text-sm font-medium text-foreground">
                            {hasProgress ? `${assigned} of ${qty} Assigned` : `${qty} Seats Ready`}
                          </span>
                          {remaining === 0 && <span className="h-1.5 w-1.5 rounded-full bg-success" />}
                        </div>
                        <p className="text-xs text-muted-foreground font-light">
                          {remaining > 0 ? `${remaining} details remaining` : "Click to view or edit details"}
                        </p>
                      </div>
                      <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest text-accent-gold group-hover:translate-x-1 transition-transform">
                        {hasProgress ? "Continue" : "Begin"} →
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </section>
        )}

        {qrTickets.length > 0 && (
          <section className="space-y-8 animate-fade-in-up" aria-labelledby="pass-list-heading" style={{ animationDelay: '0.2s' }}>
            <div className="flex items-center gap-4">
              <h2 id="pass-list-heading" className="font-serif text-2xl font-light text-foreground">
                Confirmed Passes
              </h2>
              <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {qrTickets.map((t) => {
                const seat = t.seats;
                const label = seat?.display_label ?? "Pass";
                const ticketTypeName = t.ticket_types?.name ?? "Admission";
                const tablePart = seat?.table_label ? `Table ${seat.table_label}` : null;
                const seatPart = seat?.seat_label ? `Seat ${seat.seat_label}` : null;
                const detail = [tablePart, seatPart].filter(Boolean).join(" · ");
                const isCheckedIn = t.status === "checked_in";

                return (
                  <div
                    key={t.id}
                    className="panel-card p-0 flex flex-col overflow-hidden transition-all hover:shadow-lg hover:-translate-y-1 border-accent-gold/10"
                  >
                    <div className={`p-6 ${isCheckedIn ? 'bg-primary/5' : 'bg-card'} border-b border-border/50`}>
                      <div className="flex justify-between items-start mb-4">
                        <div className="space-y-1">
                          <p className="text-[10px] uppercase tracking-[0.2em] text-accent-gold font-bold">{ticketTypeName}</p>
                          <h3 className="font-serif text-xl font-medium text-foreground">{label}</h3>
                        </div>
                        <span className={`text-[10px] uppercase tracking-widest font-bold px-2 py-1 rounded-full border ${isCheckedIn ? 'border-primary/30 bg-primary/10 text-primary' : 'border-border bg-muted/50 text-muted-foreground'}`}>
                          {isCheckedIn ? 'Arrived' : 'Valid'}
                        </span>
                      </div>
                      <div className="space-y-2 pt-2">
                         <p className="text-sm text-foreground/90 font-medium">{t.attendee_name}</p>
                         {detail && <p className="text-xs text-muted-foreground font-light">{detail}</p>}
                      </div>
                    </div>
                    
                    <div className="p-6 flex flex-col items-center justify-center bg-accent-gold/[0.01]">
                      <p className="font-mono text-[10px] tracking-[0.3em] text-muted-foreground mb-4">{t.ticket_code}</p>
                      <Link
                        href={`/attendee/event/tickets/${t.id}`}
                        className="btn-eventuz-secondary w-full py-2.5 text-xs font-semibold"
                      >
                        Open Digital Pass
                      </Link>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* SIDEBAR: Wallet Summary & Tools */}
      <aside className="lg:col-span-5 space-y-6 lg:sticky lg:top-32">
        <div className="panel-card p-0 overflow-hidden shadow-xl shadow-accent-gold/[0.03]">
          <div className="p-8 bg-accent-gold/[0.03] border-b border-accent-gold/10">
            <h2 className="font-serif text-2xl font-light text-foreground mb-1">Pass Wallet</h2>
            <p className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Attendee Overview</p>
          </div>
          
          <div className="p-8 space-y-8">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-border bg-muted/5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Total Passes</p>
                <p className="font-serif text-3xl font-light text-foreground">{qrTickets.length}</p>
              </div>
              <div className="p-4 rounded-xl border border-border bg-muted/5">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Checked In</p>
                <p className="font-serif text-3xl font-light text-foreground">{qrTickets.filter(t => t.status === 'checked_in').length}</p>
              </div>
            </div>

            <section className="space-y-4">
              <h3 className="text-[10px] uppercase tracking-widest text-accent-gold font-bold">Quick Actions</h3>
              <div className="space-y-3">
                <Link
                  href="/attendee/event"
                  className="btn-eventuz-secondary w-full py-3 text-sm justify-center"
                >
                  Return to Invitation
                </Link>
                {orderIdsNeedingEmailRetry.length > 0 && (
                   <div className="space-y-2 pt-2">
                     <p className="text-[10px] text-muted-foreground font-light leading-relaxed mb-3">
                       Some guest emails may not have been delivered. Retry sending them below.
                     </p>
                     {orderIdsNeedingEmailRetry.map((oid) => (
                        <form key={oid} action={retryTicketEmailsAction}>
                          <input type="hidden" name="order_id" value={oid} />
                          <button
                            type="submit"
                            className="w-full rounded-lg border border-accent-gold/30 bg-accent-gold/5 py-3 text-[10px] font-bold uppercase tracking-widest text-accent-gold transition-colors hover:bg-accent-gold/10"
                          >
                            Resend Order {oid.slice(0, 8)}
                          </button>
                        </form>
                      ))}
                   </div>
                )}
              </div>
            </section>

            <div className="pt-8 border-t border-border/50">
              <div className="flex items-center gap-4 p-4 rounded-xl bg-muted/10">
                <div className="h-2 w-2 rounded-full bg-accent-gold shadow-[0_0_8px_rgba(212,175,55,0.5)]" />
                <p className="text-xs text-muted-foreground font-light leading-relaxed">
                  Entry requires your digital QR pass. Ensure each guest has their own copy for check-in.
                </p>
              </div>
            </div>
          </div>
        </div>
      </aside>

    </div>
  );
}
