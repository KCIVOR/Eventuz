import { TicketPrintButton } from "@/components/attendee/TicketPrintButton";
import { RoleAreaShell } from "@/components/layout/RoleAreaShell";
import { createClient } from "@/lib/supabase/server";
import { eventTicketQrDataUrl, eventTicketQrPayload } from "@/lib/tickets/eventTicketQr";
import Link from "next/link";
import { notFound } from "next/navigation";

type Props = { params: Promise<{ ticketId: string }> };

export default async function AttendeeTicketPassPage({ params }: Props) {
  const { ticketId } = await params;
  const supabase = await createClient();

  const { data: row, error } = await supabase
    .from("tickets")
    .select(
      `id, ticket_code, attendee_name, attendee_email, issued_at, status, emailed_at, email_last_error,
       events ( name ),
       ticket_types ( name ),
       seats ( display_label, seat_label, table_label )`
    )
    .eq("id", ticketId)
    .maybeSingle();

  if (error || !row || row.status === "voided") {
    notFound();
  }

  const { data: signedPayload, error: rpcErr } = await supabase.rpc("ticket_qr_payload", {
    p_ticket_id: ticketId,
  });

  if (rpcErr || typeof signedPayload !== "string" || signedPayload.length === 0) {
    notFound();
  }

  const fullQrString = eventTicketQrPayload(signedPayload);
  const qrSrc = await eventTicketQrDataUrl(signedPayload);

  const eventName = (row.events as { name?: string } | null)?.name ?? "Event";
  const typeName = (row.ticket_types as { name?: string } | null)?.name ?? "Ticket";
  const seat = row.seats as {
    display_label?: string;
    seat_label?: string;
    table_label?: string | null;
  } | null;
  const seatLabel = seat?.display_label ?? "Seat";
  const seatDetail =
    seat?.table_label != null && seat.table_label !== ""
      ? `Table ${seat.table_label} · Seat ${seat.seat_label ?? ""}`
      : seat
        ? `Seat ${seat.seat_label ?? ""}`
        : "";

  return (
    <RoleAreaShell
      role="attendee"
      layout="flush"
      title="Your ticket"
      showPageHeader={false}
      compactTitle="Your ticket"
      breadcrumbs={[
        { label: "Your invitation", href: "/attendee/event" },
        { label: "Your tickets", href: "/attendee/event/tickets" },
        { label: "Ticket" },
      ]}
    >
      <div className="mx-auto max-w-md space-y-6">
        <nav className="no-print">
          <Link
            href="/attendee/event/tickets"
            className="text-sm font-medium text-primary underline-offset-4 transition-colors duration-200 hover:text-primary-hover hover:underline motion-reduce:transition-none"
          >
            ← Back to your tickets
          </Link>
        </nav>

        <article
          id="ticket-print-root"
          className="space-y-6 rounded-2xl border border-border bg-card p-6 shadow-[0_2px_12px_rgba(28,25,23,0.06)] sm:p-8"
        >
          {row.emailed_at ? (
            <div
              className="rounded-lg border border-success/25 bg-success-muted px-3 py-2 text-xs text-success"
              role="status"
            >
              Emailed to {row.attendee_email as string} · {String(row.emailed_at).slice(0, 19).replace("T", " ")} UTC
            </div>
          ) : row.email_last_error ? (
            <div className="rounded-lg border border-destructive/25 bg-destructive-muted px-3 py-2 text-xs text-destructive" role="alert">
              Email to {row.attendee_email as string} could not be sent: {String(row.email_last_error)}
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
              Email not sent yet. If you just generated tickets, check again shortly or ask the buyer to confirm SMTP
              settings.
            </div>
          )}

          <header className="space-y-1 border-b border-border pb-4 text-center">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent-gold">Eventuz</p>
            <h1 className="font-serif text-xl font-semibold text-foreground">{eventName}</h1>
            <p className="text-sm text-muted-foreground">{typeName}</p>
          </header>

          <dl className="space-y-3 text-sm">
            <div className="flex justify-between gap-4 border-b border-border/80 py-2">
              <dt className="text-muted-foreground">Guest</dt>
              <dd className="text-right font-medium text-foreground">{row.attendee_name as string}</dd>
            </div>
            <div className="flex justify-between gap-4 border-b border-border/80 py-2">
              <dt className="text-muted-foreground">Seat</dt>
              <dd className="text-right text-foreground">{seatLabel}</dd>
            </div>
            {seatDetail ? (
              <div className="flex justify-between gap-4 border-b border-border/80 py-2">
                <dt className="text-muted-foreground">Details</dt>
                <dd className="text-right text-foreground">{seatDetail}</dd>
              </div>
            ) : null}
            <div className="flex justify-between gap-4 py-2">
              <dt className="text-muted-foreground">Ticket code</dt>
              <dd className="font-mono text-right text-sm font-semibold tracking-wide text-foreground">
                {row.ticket_code as string}
              </dd>
            </div>
          </dl>

          <div className="flex flex-col items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={qrSrc}
              width={280}
              height={280}
              alt={`QR code for ticket ${row.ticket_code as string}`}
              className="rounded-xl border border-border bg-background p-3 shadow-[inset_0_1px_2px_rgba(28,25,23,0.06)]"
            />
            <p className="max-w-full break-all px-1 text-center font-mono text-[10px] leading-relaxed text-muted-foreground opacity-90">
              {fullQrString}
            </p>
          </div>
        </article>

        <div className="no-print flex flex-wrap justify-center gap-3">
          <TicketPrintButton />
        </div>
      </div>
    </RoleAreaShell>
  );
}
