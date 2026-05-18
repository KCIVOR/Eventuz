"use client";

import { simulateHitPaySuccessAction, type HitPaySimulateState } from "@/app/attendee/event/actions";
import { PaymentStatusPoller } from "@/components/attendee/PaymentStatusPoller";
import { formatPhp } from "@/lib/utils/money";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState } from "react";

type Props = {
  order: {
    id: string;
    eventId: string;
    status: string;
    quantity: number;
    totalAmount: number;
    paymentExpiresAt: string | null;
    checkoutUrl: string | null;
    eventName: string;
    eventVenue: string;
    eventDate: string | null;
    eventTime: string | null;
    ticketTypeName: string;
    showDevSimulation: boolean;
  };
  fromHitPay: boolean;
};

function formatWhen(date: string | null, time: string | null) {
  if (!date) return "Date to be announced";
  const displayDate = new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
  return time ? `${displayDate} - ${time}` : displayDate;
}

function statusCopy(status: string, fromHitPay: boolean) {
  if (["paid_unassigned", "partially_assigned", "completed"].includes(status)) {
    return {
      eyebrow: "Payment confirmed",
      title: "Preparing seat selection",
      body: "Your payment has been confirmed. We are sending you to guest details and seat selection.",
    };
  }

  if (status === "payment_failed" || status === "expired" || status === "cancelled") {
    return {
      eyebrow: "Payment not completed",
      title: "This checkout is no longer active",
      body: "Return to the event page to start a new reservation.",
    };
  }

  return {
    eyebrow: fromHitPay ? "Returned from HitPay" : "Secure payment",
    title: "Waiting for payment confirmation",
    body: fromHitPay
      ? "HitPay has sent you back. We are waiting for the confirmation webhook, which usually arrives in a few moments."
      : "Complete payment in the HitPay tab. This page will move forward automatically once confirmation arrives.",
  };
}

export function PaymentWaitingPanel({ order, fromHitPay }: Props) {
  const router = useRouter();
  const [simState, simAction, simPending] = useActionState(
    simulateHitPaySuccessAction,
    {} as HitPaySimulateState
  );
  const [openError, setOpenError] = useState(false);
  const redirectTo = `/attendee/event/seats?order=${encodeURIComponent(order.id)}`;
  const copy = statusCopy(order.status, fromHitPay);
  const canPoll = order.status === "payment_pending";

  useEffect(() => {
    if (simState.ok) {
      router.push(redirectTo);
    }
  }, [redirectTo, router, simState.ok]);

  function openCheckout() {
    if (!order.checkoutUrl) return;
    const tab = window.open(order.checkoutUrl, "_blank", "noopener,noreferrer");
    setOpenError(!tab);
  }

  return (
    <div className="mx-auto max-w-3xl px-1 sm:px-0">
      <section className="panel-card overflow-hidden p-0">
        <div className="border-b border-border/50 bg-accent-gold/[0.03] px-8 py-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-accent-gold">
            {copy.eyebrow}
          </p>
        </div>
        <div className="space-y-8 p-8">
          <div className="text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent-gold/30 bg-accent-gold/10">
              <div className="h-7 w-7 animate-spin rounded-full border-2 border-accent-gold border-t-transparent" />
            </div>
            <h1 className="mt-6 font-serif text-4xl font-light text-foreground">{copy.title}</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm font-light leading-relaxed text-muted-foreground">
              {copy.body}
            </p>
          </div>

          {canPoll ? (
            <div className="rounded-sm border border-primary/20 bg-muted/30 px-5 py-4">
              <PaymentStatusPoller orderId={order.id} redirectTo={redirectTo} />
            </div>
          ) : null}

          <dl className="grid gap-4 rounded-sm border border-border bg-muted/10 p-5 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Event
              </dt>
              <dd className="mt-1 text-foreground">{order.eventName}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Schedule
              </dt>
              <dd className="mt-1 text-foreground">{formatWhen(order.eventDate, order.eventTime)}</dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Ticket
              </dt>
              <dd className="mt-1 text-foreground">
                {order.quantity} x {order.ticketTypeName}
              </dd>
            </div>
            <div>
              <dt className="text-[10px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
                Total
              </dt>
              <dd className="mt-1 text-foreground">{formatPhp(order.totalAmount)}</dd>
            </div>
          </dl>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
            {order.checkoutUrl && order.status === "payment_pending" ? (
              <button type="button" onClick={openCheckout} className="btn-eventuz-gold px-8 py-4 text-sm">
                Open payment again
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => router.push("/attendee/event")}
              className="btn-eventuz-secondary px-8 py-4 text-sm"
            >
              Back to dashboard
            </button>
          </div>

          {openError ? (
            <p className="text-center text-xs text-destructive">
              Your browser blocked the payment tab. Use the button again or allow popups for this site.
            </p>
          ) : null}

          {order.showDevSimulation && order.status === "payment_pending" ? (
            <form action={simAction} className="border border-dashed border-accent-gold/30 bg-accent-gold/5 p-6 text-center">
              <p className="mb-3 text-xs font-semibold uppercase tracking-widest text-accent-gold">
                Developer Tools
              </p>
              <input type="hidden" name="order_id" value={order.id} />
              <input type="hidden" name="event_id" value={order.eventId} />
              <button type="submit" disabled={simPending} className="text-xs underline transition-colors hover:text-accent-gold">
                {simPending ? "Simulating..." : "Click to simulate successful transaction"}
              </button>
              {simState.error ? <p className="mt-3 text-xs text-destructive">{simState.error}</p> : null}
            </form>
          ) : null}
        </div>
      </section>
    </div>
  );
}
