import React from "react";
import { formatPhp } from "@/lib/utils/money";

type Metrics = {
  total_orders: number;
  paid_attendee_slots: number;
  revenue_succeeded_php: number;
  issued_tickets: number;
  checked_in_tickets: number;
  pending_payments: number;
  active_checkout_holds: number;
  failed_payments: number;
};

type Props = {
  metrics: Metrics;
};

export function DashboardMetricsGrid({ metrics: m }: Props) {
  const checkInPct =
    m.issued_tickets > 0
      ? Math.min(100, Math.round((m.checked_in_tickets / m.issued_tickets) * 100))
      : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <div className="panel-card p-5">
        <p className="label-eventuz">Total Orders</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.total_orders}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Registration attempts and purchases</p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">Paid Tickets</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.paid_attendee_slots}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Quantity on paid orders (all stages)</p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">Confirmed Sales</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {formatPhp(m.revenue_succeeded_php)}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Sum of succeeded HitPay payments only</p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">Issued tickets</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.issued_tickets}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Non-voided tickets</p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">Checked in</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.checked_in_tickets}
          <span className="text-lg font-normal text-muted-foreground">
            {" "}
            / {m.issued_tickets}
          </span>
        </p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-2 rounded-full bg-success transition-[width] duration-500"
            style={{ width: `${checkInPct}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Tickets with status <span className="font-medium text-foreground">checked_in</span>
        </p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">Pending payments</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.pending_payments}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Checkout open & payment window active</p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">In-Progress Purchases</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.active_checkout_holds}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Capacity holds not expired</p>
      </div>
      <div className="panel-card p-5">
        <p className="label-eventuz">Failed payments</p>
        <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
          {m.failed_payments}
        </p>
        <p className="mt-1 text-xs text-muted-foreground">Orders marked payment failed</p>
      </div>
    </div>
  );
}
