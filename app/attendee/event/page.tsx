import { CapacityHoldForm } from "@/components/attendee/CapacityHoldForm";
import { PaymentStatusPoller } from "@/components/attendee/PaymentStatusPoller";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadAttendeeEventContext } from "@/lib/attendee/eventContext";
import { isHitPayDevSimulationAllowed } from "@/lib/payments/hitpayDevSimulation";
import { EventMapPreview } from "@/components/ui/EventMapPreview";
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

  const showDevHitPaySimulate = event ? await isHitPayDevSimulationAllowed(event.organizer_id as string) : false;
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

  const formattedAddress = event.formatted_address as string | null;
  const lat = event.lat ? Number(event.lat) : null;
  const lng = event.lng ? Number(event.lng) : null;

  return (
    <RoleAreaShell
      role="attendee"
      title={name}
      showPageHeader={false}
      compactTitle={name}
      layout="flush"
      mainWidth="wide"
    >
      <div className="mx-auto max-w-7xl px-4 pb-12 lg:px-8">
        <div className="lg:grid lg:grid-cols-12 lg:gap-12 lg:items-start">
          
          {/* MAIN COLUMN: Narrative & Venue */}
          <div className="lg:col-span-7 space-y-10">
            <header className="overflow-hidden rounded-2xl border border-border bg-card shadow-[0_2px_16px_rgba(28,25,23,0.07)]">
              {imageUrl ? (
                <div className="aspect-[21/9] w-full overflow-hidden bg-muted">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={imageUrl} alt="" className="h-full w-full object-cover" />
                </div>
              ) : null}
              <div className="space-y-4 px-6 py-10 text-center sm:px-10 sm:py-12">
                <div className="flex items-center justify-center gap-3 mb-2">
                  <span className="h-[1px] w-8 bg-accent-gold/30" />
                  <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-accent-gold">
                    You&apos;re invited
                  </p>
                  <span className="h-[1px] w-8 bg-accent-gold/30" />
                </div>
                <h1 className="font-serif text-4xl font-semibold leading-tight tracking-tight text-foreground sm:text-5xl">
                  {name}
                </h1>
                <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 pt-2">
                  <p className="text-base font-light text-muted-foreground flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent-gold" />
                    <time dateTime={`${eventDate}T${eventTime}`}>
                      {eventDate} · {eventTime}
                    </time>
                  </p>
                  <p className="text-base font-medium text-foreground/95 flex items-center gap-2">
                    <span className="h-1 w-1 rounded-full bg-accent-gold" />
                    {venue}
                  </p>
                </div>
              </div>
            </header>

            {description ? (
              <section className="animate-fade-in-up space-y-6" aria-labelledby="invitation-message-heading">
                <div className="flex items-center gap-4">
                  <h2 id="invitation-message-heading" className="font-serif text-2xl font-light text-foreground">
                    A Message from the Hosts
                  </h2>
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                <div className="relative rounded-2xl border border-border/80 bg-card p-8 sm:p-10 shadow-sm overflow-hidden">
                   {/* Luxury Quote Ornament */}
                  <div className="absolute -top-4 -left-2 opacity-[0.05] pointer-events-none">
                    <span className="font-serif text-[120px] text-accent-gold leading-none">&ldquo;</span>
                  </div>
                  <div className="relative z-10 whitespace-pre-wrap text-lg leading-relaxed text-muted-foreground font-light italic">
                    {description}
                  </div>
                </div>
              </section>
            ) : null}

            {(formattedAddress || (lat && lng)) && (
              <section className="animate-fade-in-up space-y-6" aria-labelledby="location-heading">
                <div className="flex items-center gap-4">
                  <h2 id="location-heading" className="font-serif text-2xl font-light text-foreground">
                    The Venue
                  </h2>
                  <span className="h-[1px] flex-1 bg-gradient-to-r from-border to-transparent" />
                </div>
                
                <div className="rounded-2xl border border-border/90 bg-card overflow-hidden shadow-sm">
                  <div className="p-8 flex items-start gap-5">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-accent-gold/10 text-accent-gold">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="24"
                        height="24"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                    </div>
                    <div className="space-y-1">
                      <h3 className="text-[10px] font-semibold uppercase tracking-widest text-accent-gold">
                        Location Details
                      </h3>
                      <p className="font-serif text-2xl font-medium leading-tight text-foreground">
                        {formattedAddress || venue}
                      </p>
                    </div>
                  </div>

                  {lat && lng && (
                    <div className="border-t border-border/50">
                      <EventMapPreview
                        lat={lat}
                        lng={lng}
                        title={venue}
                        address={formattedAddress || venue}
                      />
                    </div>
                  )}
                </div>
              </section>
            )}
          </div>

          {/* STICKY SIDEBAR: Actions & Status */}
          <div className="lg:col-span-5 space-y-8 mt-12 lg:mt-0 lg:sticky lg:top-32">
            
            {/* Status Notifications */}
            <div className="space-y-4">
              {!registrationOpen && (
                <div className="rounded-2xl border border-warning/35 bg-warning/10 px-5 py-5 text-sm" role="status">
                  <p className="font-semibold text-foreground">Registration Closed</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    Sales are currently unavailable. Manage existing tickets via the buttons below.
                  </p>
                </div>
              )}

              {fromHitPay && (
                <div className="rounded-2xl border border-primary/25 bg-muted/30 px-5 py-5 text-sm text-foreground" role="status">
                  <p className="font-semibold">Back from payment</p>
                  <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                    We&apos;re verifying your transaction. This usually takes less than a minute.
                  </p>
                  {Boolean(activeOrder?.id) && (
                    <div className="mt-4 border-t border-border/40 pt-4">
                      <PaymentStatusPoller orderId={activeOrder!.id as string} />
                    </div>
                  )}
                </div>
              )}

              {(seatsDone || ticketsOk) && (
                <div className="rounded-2xl border border-success/30 bg-success-muted px-5 py-5 text-sm text-success" role="status">
                  <p className="font-semibold">{seatsDone ? "Seats Secured" : "Tickets Ready"}</p>
                  <p className="mt-2 text-xs leading-relaxed">
                    {seatsDone 
                      ? "Guest details are confirmed. You can now access your digital passes." 
                      : "QR passes have been issued and sent to your email."}
                  </p>
                </div>
              )}

              {ticketErr && (
                <div className="rounded-2xl border border-destructive/30 bg-destructive-muted px-5 py-5 text-sm text-destructive" role="alert">
                  <p className="font-semibold">Delivery Issue</p>
                  <p className="mt-2 text-xs leading-relaxed">{ticketErr}</p>
                </div>
              )}
            </div>

            {/* Main Action Hub */}
            <div className="panel-card p-1 shadow-xl shadow-accent-gold/[0.03]">
              
              {/* RSVP Section */}
              <section className="p-8 border-b border-border/50" id="rsvp-tickets">
                <div className="flex items-center justify-between mb-8">
                  <h2 className="font-serif text-2xl font-light text-foreground">
                    RSVP & Tickets
                  </h2>
                  <div className="h-1 w-1 rotate-45 bg-accent-gold" />
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
                  <div className="rounded-xl border border-dashed border-border/60 bg-muted/5 py-12 text-center">
                    <p className="text-xs text-muted-foreground font-light italic">
                      Ticket packages will appear here when published by the host.
                    </p>
                  </div>
                )}
              </section>

              {/* Next Steps / Post-Purchase */}
              {(needsSeatChoice || hasPasses || activeOrder) && (
                <section className="p-8 bg-accent-gold/[0.02]" aria-labelledby="next-steps-heading">
                   <p className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold mb-6">Manage Your Invitation</p>
                   <div className="grid grid-cols-1 gap-3">
                    <Link
                      href="/attendee/event/tickets"
                      className="btn-eventuz-secondary w-full py-4 text-center text-sm"
                    >
                      View Digital Passes
                    </Link>
                    <Link
                      href="/attendee/event/seats"
                      className="btn-eventuz-secondary w-full py-4 text-center text-sm"
                    >
                      Change Seat Assignment
                    </Link>
                  </div>
                </section>
              )}
            </div>
          </div>

        </div>
      </div>
    </RoleAreaShell>
  );
}
