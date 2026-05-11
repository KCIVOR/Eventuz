import type { PlatformCounts } from "@/lib/super-admin/loadPlatformOverview";

function MetricCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-border bg-card p-5 shadow-[0_1px_3px_rgba(28,25,23,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_14px_rgba(28,25,23,0.07)] motion-reduce:transition-none motion-reduce:hover:shadow-[0_1px_3px_rgba(28,25,23,0.04)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-2 font-serif text-2xl font-semibold tabular-nums tracking-tight text-foreground">
        {value}
      </p>
      {hint ? <p className="mt-1.5 text-xs leading-snug text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

export function PlatformMetricGrid({
  counts,
  revenueLabel,
}: {
  counts: PlatformCounts;
  revenueLabel: string;
}) {
  const c = counts;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <MetricCard label="All users" value={c.profilesTotal} hint="Registered profiles" />
      <MetricCard
        label="Disabled users"
        value={c.profilesDisabled}
        hint="Cannot sign in or access protected areas"
      />
      <MetricCard label="Organizers" value={c.organizers} hint="Accounts with organizer role" />
      <MetricCard
        label="Events"
        value={c.eventsTotal}
        hint={`${c.eventsPublished} published · ${c.eventsDraft} draft · ${c.eventsDisabled} disabled`}
      />
      <MetricCard label="Attendees" value={c.attendees} hint="Registered user profiles" />
      <MetricCard label="Open holds" value={c.ordersOpenHolds} hint="Capacity or payment-pending orders" />
      <MetricCard label="Paid pipeline" value={c.ordersPaidPipeline} hint="Recorded paid / assignment states" />
      <MetricCard label="Gross recorded" value={revenueLabel} hint="Sum of order totals in paid pipeline" />
    </div>
  );
}
