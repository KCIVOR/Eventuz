"use client";

import {
  placeHoldAction,
  releaseHoldAction,
  simulateHitPaySuccessAction,
  startHitPayCheckoutAction,
  type HitPaySimulateState,
  type HoldActionState,
  type PayActionState,
} from "@/app/attendee/event/actions";
import type { TicketTypeWithSlots } from "@/lib/attendee/eventContext";
import { formatPhp } from "@/lib/utils/money";
import { resolveUnitPrice } from "@/lib/orders/pricing";
import { useActionState, useMemo, useState, useEffect } from "react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

type Props = {
  eventId: string;
  ticketTypes: TicketTypeWithSlots[];
  activeHold: Record<string, unknown> | null;
  resumeCheckoutUrl?: string | null;
  showDevHitPaySimulate?: boolean;
};

export function CapacityHoldForm({
  eventId,
  ticketTypes,
  activeHold,
  resumeCheckoutUrl,
  showDevHitPaySimulate = false,
}: Props) {
  const [placeState, placeAction, placePending] = useActionState(placeHoldAction, {} as HoldActionState);
  const [releaseState, releaseAction, releasePending] = useActionState(releaseHoldAction, {} as HoldActionState);
  const [payState, payAction, payPending] = useActionState(startHitPayCheckoutAction, {} as PayActionState);
  const [simState, simAction, simPending] = useActionState(simulateHitPaySuccessAction, {} as HitPaySimulateState);

  // Local state for selection if no active hold exists
  const [selectedTypeId, setSelectedTypeId] = useState<string>(
    (activeHold?.ticket_type_id as string) || (ticketTypes[0]?.id as string) || ""
  );
  const [quantity, setQuantity] = useState<number>(
    Number(activeHold?.quantity) || 1
  );

  useEffect(() => {
    if (activeHold?.ticket_type_id) {
      setSelectedTypeId(activeHold.ticket_type_id as string);
      setQuantity(Number(activeHold.quantity));
    }
  }, [activeHold]);

  const selectedTicket = useMemo(() =>
    ticketTypes.find(t => t.id === selectedTypeId),
    [selectedTypeId, ticketTypes]);

  const ticketNameById = useMemo(() => {
    const m = new Map<string, string>();
    ticketTypes.forEach((t) => m.set(t.id as string, (t.name as string) ?? "Ticket"));
    return m;
  }, [ticketTypes]);

  const holdTicketName = activeHold?.ticket_type_id
    ? ticketNameById.get(activeHold.ticket_type_id as string) ?? "Ticket"
    : "";

  const now = new Date();
  const paymentPending = activeHold?.status === "payment_pending";
  const capacityHeld = activeHold?.status === "capacity_held";
  const payBlocked = paymentPending;

  return (
    <div className="space-y-10">
      {(placeState.error || releaseState.error || payState.error || simState.error) && (
        <p role="alert" className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive">
          {String(placeState.error || releaseState.error || payState.error || simState.error)}
        </p>
      )}

      {/* Success Messages */}
      {releaseState.ok && (
        <p role="status" className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
          Reservation released.
        </p>
      )}
      {placeState.ok && (
        <p role="status" className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
          Reservation saved. Proceed to secure payment.
        </p>
      )}
      {simState.ok && (
        <p role="status" className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success">
          Payment confirmed. You can now assign seats.
        </p>
      )}

      {/* 1. Ticket Type Selection Grid */}
      <section className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="font-serif text-2xl font-light text-foreground">Select Package</h3>
          <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Step 01</span>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {ticketTypes.map((tt) => {
            const isSelected = selectedTypeId === tt.id;
            const cap = tt.slotsLeft ?? 0;
            const isSoldOut = cap <= 0;

            const regular = Number(tt.regular_price);
            const early = Number(tt.early_bird_price);
            const { unitPrice, pricingType } = resolveUnitPrice({
              regularPrice: regular,
              earlyBirdPrice: early,
              earlyBirdStartAt: tt.early_bird_start_at as string | null,
              earlyBirdEndAt: tt.early_bird_end_at as string | null,
              at: now,
            });
            const isEarlyBird = pricingType === "early_bird";

            return (
              <button
                key={tt.id as string}
                disabled={isSoldOut || capacityHeld || paymentPending}
                onClick={() => setSelectedTypeId(tt.id as string)}
                className={cn(
                  "relative text-left transition-all duration-300 rounded-lg overflow-hidden group border",
                  isSelected
                    ? "border-accent-gold bg-accent-gold/[0.03] ring-1 ring-accent-gold shadow-lg"
                    : "border-border bg-card hover:border-accent-gold/40 hover:bg-muted/30",
                  isSoldOut && "opacity-60 grayscale cursor-not-allowed border-dashed"
                )}
              >
                {/* Selected Indicator */}
                {isSelected && (
                  <div className="absolute top-0 right-0 p-3">
                    <div className="h-5 w-5 bg-accent-gold flex items-center justify-center rotate-45 border border-accent-gold">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-white -rotate-45" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    </div>
                  </div>
                )}

                <div className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className={cn("font-serif text-xl", isSelected ? "text-foreground" : "text-foreground/80")}>
                        {tt.name as string}
                      </h4>
                      {!!tt.description && (
                        <p className="mt-1 text-xs text-muted-foreground line-clamp-2 max-w-[80%] font-light italic">
                          {String(tt.description)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold uppercase tracking-widest text-accent-gold mb-1">
                        {isSoldOut ? "Sold Out" : `${cap} Left`}
                      </p>
                      <p className="text-xl font-light tracking-tight text-foreground">
                        {formatPhp(unitPrice)}
                      </p>
                      {isEarlyBird && (
                        <span className="text-[9px] uppercase tracking-tighter bg-accent-gold/10 text-accent-gold px-1.5 py-0.5 border border-accent-gold/20">
                          Early Bird
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Subtle Ornamentation */}
                  <div className={cn(
                    "h-[1px] w-full transition-all duration-500 bg-gradient-to-r from-transparent via-accent-gold/20 to-transparent",
                    isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
                  )} />
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 2. Quantity and Action */}
      {!capacityHeld && !paymentPending && selectedTicket && (
        <section className="animate-fade-in-up space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-light text-foreground">Specify Quantity</h3>
            <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Step 02</span>
          </div>

          <div className="panel-card bg-muted/20 border-accent-gold/10 overflow-hidden">
            <form action={placeAction} className="flex flex-col">
              <input type="hidden" name="event_id" value={eventId} />
              <input type="hidden" name="ticket_type_id" value={selectedTypeId} />

              <div className="p-6 sm:p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-3">
                    <label htmlFor="quantity-input" className="block text-[10px] uppercase tracking-[0.2em] text-accent-gold font-semibold">
                      Number of Guests
                    </label>
                    <div className="flex items-center">
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="h-12 w-12 border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors rounded-l"
                      >
                        —
                      </button>
                      <input
                        id="quantity-input"
                        name="quantity"
                        type="number"
                        value={quantity}
                        readOnly
                        className="h-12 w-16 text-center border-y border-border bg-card font-serif text-xl focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setQuantity(Math.min(selectedTicket.slotsLeft || 1, quantity + 1))}
                        className="h-12 w-12 border border-border bg-card flex items-center justify-center hover:bg-muted transition-colors rounded-r"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="text-left sm:text-right">
                    <p className="text-[10px] uppercase tracking-[0.2em] text-accent-gold font-semibold mb-1">Estimated Total</p>
                    <p className="text-3xl font-serif text-foreground">
                      {formatPhp((selectedTicket.early_bird_price ? Number(selectedTicket.early_bird_price) : Number(selectedTicket.regular_price)) * quantity)}
                    </p>
                  </div>
                </div>

                <div className="pt-6 border-t border-border/40">
                  <p className="text-[11px] text-muted-foreground font-light italic mb-6">
                    Seating selection will be available after payment confirmation.
                  </p>
                  <button
                    type="submit"
                    disabled={placePending}
                    className="btn-eventuz-gold w-full py-5 text-base shadow-lg shadow-accent-gold/10"
                  >
                    {placePending ? "Securing..." : "Confirm Selection"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </section>
      )}

      {/* 3. Active Reservation / Checkout Flow */}
      {!!activeHold?.id && (
        <section className="animate-fade-in-up space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-serif text-2xl font-light text-foreground">Checkout</h3>
            <span className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold">Step 03</span>
          </div>

          <div className="panel-card p-8 border-accent-gold/30 bg-accent-gold/[0.02]">
            <div className="flex flex-col md:flex-row justify-between gap-8 mb-8">
              <div>
                <h4 className="font-serif text-2xl mb-2 text-foreground">Reservation Secured</h4>
                <p className="text-sm text-muted-foreground font-light italic">
                  &ldquo;{holdTicketName}&rdquo; &times; {String(activeHold.quantity)} package held for your arrival.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-widest text-accent-gold font-semibold mb-2">Capacity Hold Expires</p>
                <p className="text-sm font-medium text-foreground tabular-nums">
                  {new Date(activeHold.capacity_hold_expires_at as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>

            <div className="space-y-4 border-y border-border/50 py-6 mb-8">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-light">Price Per Ticket</span>
                <span className="text-sm text-foreground">
                  {formatPhp(Number(activeHold.total_amount) / Number(activeHold.quantity))}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground font-light">Service Fee</span>
                <span className="text-sm text-foreground">Included</span>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-lg font-serif text-foreground">Total to Secure</span>
                <span className="text-2xl font-serif text-accent-gold">{formatPhp(Number(activeHold.total_amount))}</span>
              </div>
            </div>

            {capacityHeld ? (
              <form action={payAction} className="space-y-4">
                <input type="hidden" name="order_id" value={String(activeHold.id)} />
                <input type="hidden" name="event_id" value={eventId} />
                <button
                  type="submit"
                  disabled={payPending}
                  className="btn-eventuz-gold w-full py-5 text-base"
                >
                  {payPending ? "Connecting to HitPay..." : "Proceed to Secure Payment"}
                </button>
                <p className="text-center text-[11px] text-muted-foreground font-light">
                  {showDevHitPaySimulate ? "Dev Mode: Simulation only." : "You will be redirected to HitPay to complete your transaction safely."}
                </p>
              </form>
            ) : null}

            {paymentPending && (
              <div className="space-y-4">
                <div className="flex items-center justify-center gap-3 p-4 bg-muted/40 border border-border rounded">
                  <div className="animate-spin h-4 w-4 border-2 border-accent-gold border-t-transparent rounded-full" />
                  <span className="text-sm font-light">Waiting for payment confirmation...</span>
                </div>
                {resumeCheckoutUrl && (
                  <a href={resumeCheckoutUrl} className="btn-eventuz-secondary w-full py-4 block text-center">
                    Resume Secure Payment
                  </a>
                )}
                {showDevHitPaySimulate && (
                  <form action={simAction} className="mt-8 p-6 border border-dashed border-accent-gold/30 bg-accent-gold/5 text-center">
                    <p className="text-xs font-semibold text-accent-gold uppercase tracking-widest mb-3">Developer Tools</p>
                    <input type="hidden" name="order_id" value={String(activeHold.id)} />
                    <input type="hidden" name="event_id" value={eventId} />
                    <button type="submit" disabled={simPending} className="text-xs underline hover:text-accent-gold transition-colors">
                      {simPending ? "Simulating..." : "Click to simulate successful transaction"}
                    </button>
                  </form>
                )}
              </div>
            )}

            <form action={releaseAction} className="mt-8 text-center border-t border-border/30 pt-6">
              <input type="hidden" name="order_id" value={String(activeHold.id)} />
              <button
                type="submit"
                disabled={releasePending}
                className="text-[10px] uppercase tracking-widest text-warm-gray hover:text-destructive transition-colors"
              >
                {releasePending ? "Cancelling..." : "Cancel Reservation"}
              </button>
            </form>
          </div>
        </section>
      )}
    </div>
  );
}
