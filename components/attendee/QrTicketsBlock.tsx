import { issueAdmissionTicketsAction, retryTicketEmailsAction } from "@/app/attendee/event/actions";
import type { PaidOrderSummary, QrTicketListRow } from "@/lib/attendee/eventContext";
import Link from "next/link";

type Props = {
  eventTitle: string;
  ordersNeedingQrIssue: PaidOrderSummary[];
  qrTickets: QrTicketListRow[];
};

/** QR entry passes (Eventuz tokens; printable detail page). */
export function QrTicketsBlock({ eventTitle, ordersNeedingQrIssue, qrTickets }: Props) {
  if (ordersNeedingQrIssue.length === 0 && qrTickets.length === 0) {
    return null;
  }

  const orderIdsNeedingEmailRetry = [
    ...new Set(qrTickets.filter((t) => !t.emailed_at).map((t) => t.order_id)),
  ];

  return (
    <section
      className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_12px_rgba(28,25,23,0.06)] transition-shadow duration-200 motion-reduce:transition-none md:p-8"
      aria-labelledby="qr-tickets-heading"
    >
      <header className="border-b border-border pb-4 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold">Your tickets</p>
        <h2 id="qr-tickets-heading" className="mt-1 font-serif text-xl font-semibold text-foreground">
          QR entry passes
        </h2>
        <p className="mt-1 text-xs text-muted-foreground">{eventTitle}</p>
      </header>

      {ordersNeedingQrIssue.length > 0 ? (
        <div className="rounded-xl border border-primary/15 bg-primary/[0.04] px-4 py-3 text-sm text-foreground">
          <p className="font-medium text-foreground">Seats confirmed — generate your passes</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            After seats and guest details are saved for a completed order, create one secure QR pass per seat. Each guest
            receives their ticket at the email recorded for that seat; you can still open every pass here while signed in.
          </p>
          <ul className="mt-3 space-y-2">
            {ordersNeedingQrIssue.map((o) => (
              <li key={o.id}>
                <form action={issueAdmissionTicketsAction} className="flex flex-wrap items-center gap-3">
                  <input type="hidden" name="order_id" value={o.id} />
                  <span className="text-xs tabular-nums text-muted-foreground">
                    Order · {String(o.quantity)} seat{Number(o.quantity) === 1 ? "" : "s"}
                  </span>
                  <button
                    type="submit"
                    className="inline-flex min-h-10 cursor-pointer items-center justify-center rounded-lg border border-primary bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-colors duration-200 motion-reduce:transition-none hover:bg-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary active:scale-[0.99] motion-reduce:active:scale-100"
                  >
                    Generate QR tickets
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {qrTickets.length > 0 ? (
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
                className="rounded-xl border border-border bg-muted/20 px-4 py-4 transition-colors duration-200 motion-reduce:transition-none hover:bg-muted/30"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 text-center sm:text-left">
                    <p className="font-semibold text-foreground">{label}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{ticketTypeName}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">{t.attendee_name}</p>
                    {detail ? <p className="mt-0.5 text-xs text-muted-foreground">{detail}</p> : null}
                    <p className="mt-2 font-mono text-xs tracking-wide text-foreground">{t.ticket_code}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {t.emailed_at ? (
                        <span className="text-success">Emailed to {t.attendee_email}</span>
                      ) : t.email_last_error ? (
                        <span className="text-destructive">Email failed: {t.email_last_error}</span>
                      ) : (
                        <span>Email pending or not sent yet</span>
                      )}
                    </p>
                  </div>
                  <Link
                    href={`/attendee/event/tickets/${t.id}`}
                    className="inline-flex min-h-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-4 text-center text-xs font-semibold text-foreground transition-colors duration-200 motion-reduce:transition-none hover:border-primary/40 hover:bg-muted/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    View & download
                  </Link>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {orderIdsNeedingEmailRetry.length > 0 ? (
        <div className="rounded-xl border border-border/90 bg-muted/15 px-4 py-3 text-sm text-foreground">
          <p className="font-medium">Guest emails</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            If some tickets were not emailed (for example SMTP was not ready), you can retry sending to each guest’s
            address on file. Already-delivered tickets are skipped.
          </p>
          <ul className="mt-3 flex flex-wrap gap-2">
            {orderIdsNeedingEmailRetry.map((oid) => (
              <li key={oid}>
                <form action={retryTicketEmailsAction}>
                  <input type="hidden" name="order_id" value={oid} />
                  <button
                    type="submit"
                    className="inline-flex min-h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground transition-colors duration-200 motion-reduce:transition-none hover:border-primary/40 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
                  >
                    Retry emails · order {oid.slice(0, 8)}…
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </section>
  );
}
