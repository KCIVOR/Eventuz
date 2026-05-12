"use client";

import { updateSeat } from "@/app/organizer/events/actions";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
import { ClientPaginationBar } from "@/components/ui/ClientPaginationBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  InventoryTicketType,
  SeatInventoryEditorSeat,
} from "@/lib/organizer/loadSeatingOverview";
import { SEAT_OVERVIEW_PAGE_SIZE, slicePage } from "@/lib/ui/pagination";
import { useCallback, useEffect, useMemo, useState } from "react";

type Props = {
  eventId: string;
  ticketTypes: InventoryTicketType[];
  seatsByTypeId: Record<string, SeatInventoryEditorSeat[]>;
};

const seatStatusBadge: Record<string, string> = {
  available: "bg-success-muted text-success",
  assigned: "bg-muted text-foreground",
  checked_in: "bg-primary/10 text-primary",
  disabled: "bg-muted text-muted-foreground",
};

export function OrganizerSeatInventoryPanel({
  eventId,
  ticketTypes,
  seatsByTypeId,
}: Props) {
  const [pageByTicketType, setPageByTicketType] = useState<Record<string, number>>({});

  const pageFor = useCallback(
    (ticketTypeId: string) => pageByTicketType[ticketTypeId] ?? 1,
    [pageByTicketType]
  );

  const setPageFor = useCallback((ticketTypeId: string, page: number) => {
    setPageByTicketType((prev) => ({ ...prev, [ticketTypeId]: page }));
  }, []);

  const typeSignature = useMemo(
    () =>
      ticketTypes
        .map((t) => `${t.id}:${(seatsByTypeId[t.id] ?? []).length}`)
        .join("|"),
    [ticketTypes, seatsByTypeId]
  );

  useEffect(() => {
    setPageByTicketType({});
  }, [typeSignature]);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="section-title">Seat inventory</h2>
        <p className="mt-1 max-w-prose text-sm leading-relaxed text-muted-foreground">
          Seats are created from each ticket type&apos;s quantity. Edit labels for table-style
          seating (e.g. display <span className="tabular-nums">Table 1 — Seat 2</span>) or keep
          generic codes (e.g. <span className="tabular-nums">VIP-001</span>).
        </p>
      </div>

      <div className="callout-eventuz">
        <strong className="font-semibold text-foreground">Sync</strong>
        <p className="mt-1 text-muted-foreground">
          Seat count stays aligned when you save a ticket type under{" "}
          <strong className="text-foreground">Event setup</strong>. If counts look wrong, open that
          ticket type and click <strong>Save ticket type</strong> again (quantity can stay the same)
          to fill missing rows or trim available seats.
        </p>
      </div>

      {ticketTypes.length === 0 ? (
        <EmptyState
          title="No ticket types yet"
          description="Add an active ticket type under Event setup. Seat rows are generated from each type’s quantity so you can label tables and seats here."
        />
      ) : (
        <div className="space-y-8">
          {ticketTypes.map((tt) => {
            const list = seatsByTypeId[tt.id] ?? [];
            const mismatch = list.length !== tt.quantity;
            const paginated = slicePage(list, pageFor(tt.id), SEAT_OVERVIEW_PAGE_SIZE);

            return (
              <div className="panel-card p-4 sm:p-6" key={tt.id}>
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-2">
                  <p className="font-semibold text-foreground">{tt.name}</p>
                  <p className="text-xs tabular-nums text-muted-foreground">
                    {list.length} seat{list.length === 1 ? "" : "s"} · quantity {String(tt.quantity)}
                    {mismatch ? (
                      <span className="ml-2 font-semibold text-warning">— out of sync</span>
                    ) : null}
                  </p>
                </div>
                {list.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No seats yet. Save this ticket type (or change quantity and save) on Event setup
                    to generate them.
                  </p>
                ) : (
                  <>
                    <ScrollableTableWrapper>
                      <div className="min-w-[720px]">
                        <div className="grid grid-cols-[minmax(8rem,1fr)_5.5rem_5.5rem_6.5rem_auto] items-center gap-2 border-b border-border bg-muted/40 px-3 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          <div>Display</div>
                          <div>Table</div>
                          <div>Seat</div>
                          <div>Status</div>
                          <div className="text-right" />
                        </div>
                        {paginated.slice.map((seat) => (
                          <form
                            key={seat.id}
                            action={updateSeat}
                            className="grid grid-cols-[minmax(8rem,1fr)_5.5rem_5.5rem_6.5rem_auto] items-center gap-2 border-b border-border/80 px-3 py-2 transition-colors duration-150 hover:bg-muted/25"
                          >
                            <input type="hidden" name="seat_id" value={seat.id} />
                            <input type="hidden" name="event_id" value={eventId} />
                            <input
                              name="display_label"
                              defaultValue={seat.display_label}
                              className="input-eventuz py-2 text-xs"
                              required
                              aria-label="Display label"
                              suppressHydrationWarning
                            />
                            <input
                              name="table_label"
                              defaultValue={seat.table_label ?? ""}
                              placeholder="—"
                              className="input-eventuz py-2 text-xs"
                              aria-label="Table label"
                              suppressHydrationWarning
                            />
                            <input
                              name="seat_label"
                              defaultValue={seat.seat_label}
                              className="input-eventuz py-2 text-xs"
                              aria-label="Seat label"
                              suppressHydrationWarning
                            />
                            <span
                              className={`inline-flex justify-self-start rounded-full px-2 py-0.5 text-[10px] font-semibold ${seatStatusBadge[seat.status] ?? seatStatusBadge.available}`}
                            >
                              {seat.status}
                            </span>
                            <button
                              type="submit"
                              suppressHydrationWarning
                              className="btn-eventuz-secondary justify-self-end py-2 text-xs"
                            >
                              Save row
                            </button>
                          </form>
                        ))}
                      </div>
                    </ScrollableTableWrapper>
                    <ClientPaginationBar
                      page={paginated.page}
                      pageCount={paginated.pageCount}
                      total={paginated.total}
                      rangeStart={paginated.rangeStart}
                      rangeEnd={paginated.rangeEnd}
                      onPageChange={(p) => setPageFor(tt.id, p)}
                      itemLabel="seat"
                      listLabel={`${tt.name} — inventory`}
                    />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
