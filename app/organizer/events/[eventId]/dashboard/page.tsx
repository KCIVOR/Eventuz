import {
  organizerCallout,
  organizerLabel,
  organizerLink,
  organizerPanel,
  organizerSectionTitle,
} from "@/components/organizer/eventSetupStyles";
import { ListPagination } from "@/components/ui/ListPagination";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { loadOrganizerEventDashboard } from "@/lib/organizer/loadEventDashboard";
import { DEFAULT_LIST_PAGE_SIZE, parsePageParam, slicePage } from "@/lib/ui/pagination";
import type { SerializableSearchParams } from "@/lib/ui/paginationUrl";
import { formatPhp } from "@/lib/utils/money";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = {
  params: Promise<{ eventId: string }>;
  searchParams: Promise<SerializableSearchParams>;
};

function orderStatusClass(status: string): string {
  switch (status) {
    case "completed":
      return "bg-success-muted text-success";
    case "paid_unassigned":
    case "partially_assigned":
      return "bg-warning/15 text-warning";
    case "payment_pending":
    case "capacity_held":
      return "bg-primary/10 text-primary";
    case "payment_failed":
    case "expired":
    case "cancelled":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-muted text-foreground";
  }
}

function paymentStatusClass(status: string): string {
  switch (status) {
    case "succeeded":
      return "text-success";
    case "pending":
      return "text-primary";
    case "failed":
    case "expired":
      return "text-destructive";
    default:
      return "text-muted-foreground";
  }
}

function scanResultBadgeClass(result: string): string {
  switch (result) {
    case "valid":
      return "bg-success-muted text-success";
    case "duplicate":
      return "bg-warning/15 text-warning";
    case "voided":
      return "bg-muted text-muted-foreground";
    case "invalid":
      return "bg-destructive-muted text-destructive";
    default:
      return "bg-muted text-foreground";
  }
}

export default async function OrganizerEventDashboardPage({ params, searchParams }: Props) {
  const { eventId } = await params;
  const q = await searchParams;
  const loaded = await loadOrganizerEventDashboard(eventId);
  if (!loaded.ok) notFound();

  const pgOrd = parsePageParam(q.db_o);
  const pgPu = parsePageParam(q.db_p);
  const pgTix = parsePageParam(q.db_t);
  const pgScn = parsePageParam(q.db_s);

  const d = loaded.data;
  const paidPage = slicePage(d.paid_unassigned, pgPu, DEFAULT_LIST_PAGE_SIZE);
  const ordersPage = slicePage(d.orders, pgOrd, DEFAULT_LIST_PAGE_SIZE);
  const ticketsPage = slicePage(d.tickets, pgTix, DEFAULT_LIST_PAGE_SIZE);
  const scansPage = slicePage(d.recent_check_ins, pgScn, DEFAULT_LIST_PAGE_SIZE);
  const dashPath = `/organizer/events/${eventId}/dashboard`;
  const m = d.metrics;
  const checkInPct =
    m.issued_tickets > 0
      ? Math.min(100, Math.round((m.checked_in_tickets / m.issued_tickets) * 100))
      : 0;

  return (
    <RoleAreaShell
      role="organizer"
      navContext={{ eventId }}
      layout="flush"
      mainWidth="wide"
      title={d.event.name}
      description={`${d.event.event_date} · ${d.event.event_time} · ${d.event.public_slug}`}
      breadcrumbs={[
        { label: "Home", href: "/organizer" },
        { label: d.event.name, href: `/organizer/events/${eventId}` },
        { label: "Dashboard" },
      ]}
    >
      <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-10 px-0">
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
          <p className="text-sm text-muted-foreground">
            <Link href={`/organizer/events/${eventId}/scan`} className={organizerLink}>
              Open check-in scanner
            </Link>
          </p>
        </div>

        {m.paid_unassigned_count > 0 ? (
          <div className={organizerCallout + " border-warning/30 bg-warning/10"}>
            <p className="font-semibold text-warning">
              {m.paid_unassigned_count} paid order{m.paid_unassigned_count === 1 ? "" : "s"} still need
              seat assignment
            </p>
            <p className="mt-1 text-sm text-foreground/90">
              Buyers completed payment but have not finished choosing seats. Share the attendee link
              or follow up so they can assign seats from their account.
            </p>
          </div>
        ) : null}

        {m.partially_assigned_count > 0 ? (
          <div className={organizerCallout}>
            <p className="font-semibold text-foreground">
              {m.partially_assigned_count} order{m.partially_assigned_count === 1 ? "" : "s"} partially
              assigned
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Some seats are assigned; the order is not complete until every seat has a guest.
            </p>
          </div>
        ) : null}

        <section className="space-y-4">
          <h2 className={organizerSectionTitle}>Summary</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Orders (excl. cancelled)</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {m.total_orders}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Registration attempts and purchases</p>
            </div>
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Paid slots</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {m.paid_attendee_slots}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Quantity on paid orders (all stages)</p>
            </div>
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Revenue (confirmed)</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {formatPhp(m.revenue_succeeded_php)}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Sum of succeeded HitPay payments only</p>
            </div>
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Issued tickets</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {m.issued_tickets}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Non-voided tickets</p>
            </div>
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Checked in</p>
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
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Pending payments</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {m.pending_payments}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Checkout open & payment window active</p>
            </div>
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Active holds</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {m.active_checkout_holds}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Capacity holds not expired</p>
            </div>
            <div className={organizerPanel + " p-5"}>
              <p className={organizerLabel}>Failed payments</p>
              <p className="mt-2 font-serif text-2xl font-semibold tabular-nums text-foreground">
                {m.failed_payments}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Orders marked payment failed</p>
            </div>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={organizerSectionTitle}>Availability by ticket type</h2>
          <p className="max-w-prose text-sm text-muted-foreground">
            “Available” is capacity minus active holds, pending checkouts, and paid orders that still
            count against inventory—same rules as the public registration flow.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Capacity</th>
                  <th className="px-4 py-3 text-right">Available to sell</th>
                </tr>
              </thead>
              <tbody>
                {d.availability.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      No ticket types yet.
                    </td>
                  </tr>
                ) : (
                  d.availability.map((row) => (
                    <tr key={row.ticket_type_id} className="border-b border-border/80 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-foreground">{row.name}</td>
                      <td className="px-4 py-3 text-muted-foreground">{row.type_status}</td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {row.capacity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums text-foreground">
                        {row.available_for_sale}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={organizerSectionTitle}>Paid — awaiting seat assignment</h2>
          {d.paid_unassigned.length === 0 ? (
            <p className={organizerPanel + " p-6 text-sm text-muted-foreground"}>
              No orders in this state.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-border">
              <table className="w-full min-w-[640px] text-left text-sm">
                <thead>
                  <tr className="border-b border-border bg-warning/10 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <th className="px-4 py-3">Buyer</th>
                    <th className="px-4 py-3">Ticket type</th>
                    <th className="px-4 py-3 text-right">Qty</th>
                    <th className="px-4 py-3 text-right">Total</th>
                    <th className="px-4 py-3">Order</th>
                  </tr>
                </thead>
                <tbody>
                  {paidPage.slice.map((o) => (
                    <tr key={o.id} className="border-b border-border/80 last:border-b-0">
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.buyer_label}</p>
                        {o.buyer_email ? (
                          <p className="text-xs text-muted-foreground">{o.buyer_email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{o.ticket_type_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums font-medium">
                        {formatPhp(o.total_amount)}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{o.id.slice(0, 8)}…</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {d.paid_unassigned.length > 0 ? (
                <ListPagination
                  pathname={dashPath}
                  searchParams={q}
                  paramKey="db_p"
                  page={paidPage.page}
                  pageSize={DEFAULT_LIST_PAGE_SIZE}
                  total={paidPage.total}
                  pageCount={paidPage.pageCount}
                  rangeStart={paidPage.rangeStart}
                  rangeEnd={paidPage.rangeEnd}
                  listLabel="Paid orders awaiting seat assignment"
                />
              ) : null}
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className={organizerSectionTitle}>All orders</h2>
          <p className="text-xs text-muted-foreground">
            Payment rows are shown as reported by the provider (read-only). You cannot mark payments
            manually from this dashboard.
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[800px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3">Buyer</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3 text-right">Qty</th>
                  <th className="px-4 py-3 text-right">Total</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Payment</th>
                </tr>
              </thead>
              <tbody>
                {d.orders.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={8}>
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  ordersPage.slice.map((o) => (
                    <tr key={o.id} className="border-b border-border/80 last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(o.created_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-foreground">{o.buyer_label}</p>
                        {o.buyer_email ? (
                          <p className="text-xs text-muted-foreground">{o.buyer_email}</p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{o.ticket_type_name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{o.quantity}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{formatPhp(o.total_amount)}</td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {o.id.slice(0, 8)}…
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${orderStatusClass(o.status)}`}
                        >
                          {o.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {o.latest_payment ? (
                          <>
                            <span
                              className={`font-semibold ${paymentStatusClass(o.latest_payment.status)}`}
                            >
                              {o.latest_payment.status}
                            </span>
                            <span className="text-muted-foreground">
                              {" "}
                              · {formatPhp(o.latest_payment.amount)}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {d.orders.length > 0 ? (
              <ListPagination
                pathname={dashPath}
                searchParams={q}
                paramKey="db_o"
                page={ordersPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={ordersPage.total}
                pageCount={ordersPage.pageCount}
                rangeStart={ordersPage.rangeStart}
                rangeEnd={ordersPage.rangeEnd}
                listLabel="All orders"
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={organizerSectionTitle}>Tickets & attendees</h2>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Guest</th>
                  <th className="px-4 py-3">Email</th>
                  <th className="px-4 py-3">Code</th>
                  <th className="px-4 py-3">Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Checked in</th>
                </tr>
              </thead>
              <tbody>
                {d.tickets.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={6}>
                      No tickets issued yet.
                    </td>
                  </tr>
                ) : (
                  ticketsPage.slice.map((t) => (
                    <tr key={t.id} className="border-b border-border/80 last:border-b-0">
                      <td className="px-4 py-3 font-medium text-foreground">{t.attendee_name}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{t.attendee_email}</td>
                      <td className="px-4 py-3 font-mono text-xs">{t.ticket_code}</td>
                      <td className="px-4 py-3 text-muted-foreground">{t.ticket_type_name}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${orderStatusClass(t.status)}`}
                        >
                          {t.status}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {t.checked_in_at ? new Date(t.checked_in_at).toLocaleString() : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {d.tickets.length > 0 ? (
              <ListPagination
                pathname={dashPath}
                searchParams={q}
                paramKey="db_t"
                page={ticketsPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={ticketsPage.total}
                pageCount={ticketsPage.pageCount}
                rangeStart={ticketsPage.rangeStart}
                rangeEnd={ticketsPage.rangeEnd}
                listLabel="Tickets and attendees"
              />
            ) : null}
          </div>
        </section>

        <section className="space-y-4">
          <h2 className={organizerSectionTitle}>Recent scan activity</h2>
          <p className="text-sm text-muted-foreground">
            Latest check-in attempts logged at the door (includes duplicates and rejects).
          </p>
          <div className="overflow-x-auto rounded-xl border border-border">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  <th className="px-4 py-3">Time</th>
                  <th className="px-4 py-3">Result</th>
                  <th className="px-4 py-3">Ticket</th>
                  <th className="px-4 py-3">Guest</th>
                </tr>
              </thead>
              <tbody>
                {d.recent_check_ins.length === 0 ? (
                  <tr>
                    <td className="px-4 py-6 text-muted-foreground" colSpan={4}>
                      No scans recorded yet.
                    </td>
                  </tr>
                ) : (
                  scansPage.slice.map((r, i) => (
                    <tr key={`${r.scanned_at}-${i}`} className="border-b border-border/80 last:border-b-0">
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                        {new Date(r.scanned_at).toLocaleString()}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${scanResultBadgeClass(r.scan_result)}`}
                        >
                          {r.scan_result}
                        </span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                        {r.ticket_code ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{r.attendee_name ?? "—"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {d.recent_check_ins.length > 0 ? (
              <ListPagination
                pathname={dashPath}
                searchParams={q}
                paramKey="db_s"
                page={scansPage.page}
                pageSize={DEFAULT_LIST_PAGE_SIZE}
                total={scansPage.total}
                pageCount={scansPage.pageCount}
                rangeStart={scansPage.rangeStart}
                rangeEnd={scansPage.rangeEnd}
                listLabel="Recent scan activity"
              />
            ) : null}
          </div>
        </section>
      </div>
    </RoleAreaShell>
  );
}
