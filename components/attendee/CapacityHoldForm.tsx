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
import { useActionState, useMemo } from "react";

type Props = {
  eventId: string;
  ticketTypes: TicketTypeWithSlots[];
  activeHold: Record<string, unknown> | null;
  resumeCheckoutUrl?: string | null;
  /** When ALLOW_HITPAY_DEV_SIMULATION is set (server). */
  showDevHitPaySimulate?: boolean;
};

function ClockIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
      />
    </svg>
  );
}

function ExternalLinkIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      aria-hidden
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5a2.25 2.25 0 0 0 2.25-2.25V10.5M6 18 18 6M15 4.5h6v6"
      />
    </svg>
  );
}

export function CapacityHoldForm({
  eventId,
  ticketTypes,
  activeHold,
  resumeCheckoutUrl,
  showDevHitPaySimulate = false,
}: Props) {
  const [placeState, placeAction, placePending] = useActionState(placeHoldAction, {} as HoldActionState);
  const [releaseState, releaseAction, releasePending] = useActionState(
    releaseHoldAction,
    {} as HoldActionState
  );
  const [payState, payAction, payPending] = useActionState(startHitPayCheckoutAction, {} as PayActionState);
  const [simState, simAction, simPending] = useActionState(
    simulateHitPaySuccessAction,
    {} as HitPaySimulateState
  );

  const ticketNameById = useMemo(() => {
    const m = new Map<string, string>();
    ticketTypes.forEach((t) => m.set(t.id as string, (t.name as string) ?? "Ticket"));
    return m;
  }, [ticketTypes]);

  const holdTicketName = activeHold?.ticket_type_id
    ? ticketNameById.get(activeHold.ticket_type_id as string) ?? "Ticket"
    : "";

  const at = new Date();
  const anyTickets = ticketTypes.some((t) => (t.slotsLeft ?? 0) > 0);
  const paymentPending = activeHold?.status === "payment_pending";
  const capacityHeld = activeHold?.status === "capacity_held";
  const payBlocked = paymentPending;

  return (
    <div className="space-y-8">
      {(placeState.error || releaseState.error || payState.error || simState.error) && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/25 bg-destructive-muted px-4 py-3 text-sm text-destructive"
        >
          {placeState.error || releaseState.error || payState.error || simState.error}
        </p>
      )}

      {(() => {
        const success = releaseState.ok
          ? "Reservation released."
            : placeState.ok
              ? "Reservation saved. Continue to HitPay below when you’re ready."
              : simState.ok
                ? "Simulated payment confirmed. You can assign seats."
                : null;
        return success ? (
          <p
            role="status"
            className="rounded-xl border border-success/25 bg-success-muted px-4 py-3 text-sm text-success"
          >
            {success}
          </p>
        ) : null;
      })()}

      {activeHold?.id ? (
        <div className="rounded-2xl border border-warning/30 bg-card p-5 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 motion-reduce:transition-none">
          <div className="flex items-start gap-3">
            <ClockIcon className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
            <div className="min-w-0 flex-1">
              <h3 className="font-serif text-lg font-semibold text-foreground">Active reservation</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Seats are not chosen yet—only ticket count is held against capacity.
              </p>
            </div>
          </div>
          <dl className="mt-4 space-y-2 text-sm text-muted-foreground">
            <div className="flex justify-between gap-4">
              <dt>Ticket</dt>
              <dd className="text-right font-medium text-foreground">{holdTicketName}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Quantity</dt>
              <dd className="text-right tabular-nums text-foreground">{String(activeHold.quantity)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt>Total ({String(activeHold.pricing_type).replace("_", " ")})</dt>
              <dd className="text-right text-base font-semibold tabular-nums text-foreground">
                {formatPhp(Number(activeHold.total_amount))}
              </dd>
            </div>
            <div className="flex justify-between gap-4 border-t border-border/80 pt-2">
              <dt className="text-warning">Capacity hold ends</dt>
              <dd className="text-right font-medium text-foreground">
                {new Date(activeHold.capacity_hold_expires_at as string).toLocaleString()}
              </dd>
            </div>
            {activeHold.payment_expires_at ? (
              <div className="flex justify-between gap-4">
                <dt>Pay by</dt>
                <dd className="text-right text-foreground">
                  {new Date(activeHold.payment_expires_at as string).toLocaleString()}
                </dd>
              </div>
            ) : null}
            {activeHold.pricing_type === "early_bird" && activeHold.early_bird_price_expires_at ? (
              <div className="flex justify-between gap-4">
                <dt>Early-bird price locked until</dt>
                <dd className="text-right text-foreground">
                  {new Date(activeHold.early_bird_price_expires_at as string).toLocaleString()}
                </dd>
              </div>
            ) : null}
          </dl>
          {capacityHeld ? (
            <form action={payAction} className="mt-5 space-y-2">
              <input type="hidden" name="order_id" value={String(activeHold.id)} />
              <input type="hidden" name="event_id" value={eventId} />
              <button
                type="submit"
                disabled={payPending}
                className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
              >
                <ExternalLinkIcon className="h-4 w-4 shrink-0" />
                {payPending ? "Opening HitPay…" : "Pay with HitPay"}
              </button>
              <p className="text-center text-[11px] leading-relaxed text-muted-foreground">
                {showDevHitPaySimulate ? (
                  <>
                    <span className="font-medium text-foreground">Dev simulation:</span> this button does not call HitPay—you
                    return here, then use &quot;Simulate payment succeeded&quot; in checkout in progress.
                  </>
                ) : (
                  <>
                    You&apos;ll leave Eventuz to pay. The amount sent to HitPay matches your order total (
                    {formatPhp(Number(activeHold.total_amount))}).
                  </>
                )}
              </p>
            </form>
          ) : null}
          {paymentPending ? (
            <div className="mt-5 space-y-3 rounded-xl border border-border/80 bg-muted/20 px-4 py-3">
              <p className="text-xs font-medium text-foreground">Checkout in progress</p>
              <p className="text-xs leading-relaxed text-muted-foreground">
                Returning from HitPay does not confirm payment by itself. We’ll update this order only after our server
                receives HitPay&apos;s webhook (next step).
              </p>
              {showDevHitPaySimulate ? (
                <form action={simAction} className="rounded-lg border border-dashed border-warning/40 bg-warning/5 p-3">
                  <p className="text-xs font-semibold text-warning">Local dev only</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                    Simulate HitPay success without a real account. Requires{" "}
                    <code className="rounded bg-muted px-1 py-0.5 font-mono text-[10px] text-foreground">
                      ALLOW_HITPAY_DEV_SIMULATION=true
                    </code>{" "}
                    on the server. Never use in production.
                  </p>
                  <input type="hidden" name="order_id" value={String(activeHold.id)} />
                  <input type="hidden" name="event_id" value={eventId} />
                  <button
                    type="submit"
                    disabled={simPending}
                    className="mt-3 w-full cursor-pointer rounded-lg border border-warning/50 bg-card px-3 py-2 text-xs font-semibold text-foreground transition-colors hover:bg-warning/10 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {simPending ? "Simulating…" : "Simulate payment succeeded"}
                  </button>
                </form>
              ) : null}
              {resumeCheckoutUrl ? (
                <a
                  href={resumeCheckoutUrl}
                  className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-primary/30 bg-card px-4 py-2.5 text-sm font-semibold text-primary transition-colors duration-200 hover:border-primary hover:bg-primary/5 motion-reduce:transition-none"
                >
                  <ExternalLinkIcon className="h-4 w-4" />
                  Continue to HitPay
                </a>
              ) : (
                <p className="text-xs text-warning">
                  No saved checkout link. Release this reservation and start again, or contact support.
                </p>
              )}
            </div>
          ) : null}
          <form action={releaseAction} className="mt-5">
            <input type="hidden" name="order_id" value={String(activeHold.id)} />
            <button
              type="submit"
              disabled={releasePending}
              className="cursor-pointer text-sm font-semibold text-destructive underline underline-offset-4 transition-colors duration-200 hover:text-destructive/80 disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
            >
              {releasePending ? "Releasing…" : "Release reservation"}
            </button>
          </form>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_2px_12px_rgba(28,25,23,0.05)] sm:p-6">
        <h3 className="font-serif text-lg font-semibold text-foreground">Choose ticket type and quantity</h3>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          Each ticket type has a fixed pool. Your selection reserves <strong className="font-medium text-foreground">quantity</strong> only—not table or seat numbers. Those are picked after payment.
        </p>
        <p className="mt-3 rounded-lg border border-border/80 bg-muted/25 px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
          Expired reservations free capacity for other guests. If an early-bird price lock ends before checkout, your
          order moves to the regular rate while the broader hold is still active—or start again with a fresh hold. HitPay
          receives the same total as shown on your order—never a different amount from the browser alone.
        </p>

        <ul className="mt-6 space-y-4">
          {ticketTypes.map((tt) => {
            const ttDesc = String(tt.description ?? "").trim();
            const regular = Number(tt.regular_price);
            const early = Number(tt.early_bird_price);
            const { unitPrice, pricingType } = resolveUnitPrice({
              regularPrice: regular,
              earlyBirdPrice: early,
              earlyBirdStartAt: tt.early_bird_start_at as string | null,
              earlyBirdEndAt: tt.early_bird_end_at as string | null,
              at,
            });
            const earlyBirdNow = pricingType === "early_bird";
            const cap = tt.slotsLeft ?? 0;
            const defaultQty =
              activeHold?.ticket_type_id === tt.id && activeHold.quantity
                ? Number(activeHold.quantity)
                : 1;

            return (
              <li
                key={tt.id as string}
                className="rounded-2xl border border-border/90 bg-background/60 p-4 transition-shadow duration-200 hover:shadow-[0_4px_18px_rgba(28,25,23,0.06)] motion-reduce:transition-none sm:p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-foreground">{tt.name as string}</p>
                    {ttDesc ? (
                      <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{ttDesc}</p>
                    ) : null}
                  </div>
                  <p className="whitespace-nowrap text-xs font-semibold tabular-nums text-muted-foreground">
                    <span className={cap > 0 ? "text-success" : "text-warning"}>{cap}</span> left
                  </p>
                </div>

                <div className="mt-4 space-y-1 border-t border-border/80 pt-4">
                  {earlyBirdNow ? (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wide text-accent-gold">
                        Early bird
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-foreground">{formatPhp(unitPrice)}</p>
                      <p className="text-xs text-muted-foreground">
                        Then {formatPhp(regular)} after the early-bird window
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                        Price
                      </p>
                      <p className="text-lg font-semibold tabular-nums text-foreground">{formatPhp(regular)}</p>
                      {early > 0 && early < regular ? (
                        <p className="text-xs text-muted-foreground">
                          Early bird {formatPhp(early)} when the window is open
                        </p>
                      ) : null}
                    </>
                  )}
                </div>

                <form action={placeAction} className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <input type="hidden" name="event_id" value={eventId} />
                  <input type="hidden" name="ticket_type_id" value={tt.id as string} />
                  <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                    <label
                      htmlFor={`qty-${tt.id as string}`}
                      className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
                    >
                      Quantity
                    </label>
                    <input
                      id={`qty-${tt.id as string}`}
                      name="quantity"
                      type="number"
                      min={1}
                      max={Math.max(1, cap)}
                      required
                      defaultValue={Math.min(defaultQty, Math.max(1, cap)) || 1}
                      disabled={cap <= 0 || placePending || payBlocked}
                      className="rounded-xl border border-border bg-card px-3 py-2.5 text-sm text-foreground shadow-none transition-colors duration-200 focus-visible:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60 motion-reduce:transition-none"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={cap <= 0 || placePending || !anyTickets || payBlocked}
                    className="cursor-pointer shrink-0 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition-colors duration-200 hover:bg-primary-hover disabled:cursor-not-allowed disabled:opacity-50 motion-reduce:transition-none"
                  >
                    {placePending ? "Saving…" : activeHold?.ticket_type_id === tt.id ? "Update hold" : "Hold quantity"}
                  </button>
                </form>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
