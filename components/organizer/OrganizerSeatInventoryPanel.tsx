"use client";

import { saveSeatLayout, updateSeat } from "@/app/organizer/events/actions";
import { ScrollableTableWrapper } from "@/components/ui/ScrollableTableWrapper";
import { ClientPaginationBar } from "@/components/ui/ClientPaginationBar";
import { EmptyState } from "@/components/ui/EmptyState";
import type {
  InventoryTicketType,
  SeatInventoryEditorSeat,
} from "@/lib/organizer/loadSeatingOverview";
import {
  expectedSeatCount,
  generateSeatLayout,
  type SeatLayoutConfig,
  type SeatLayoutMode,
} from "@/lib/organizer/seatLayout";
import { SEAT_OVERVIEW_PAGE_SIZE, slicePage } from "@/lib/ui/pagination";
import { useCallback, useState } from "react";

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

function positiveOrFallback(value: number | null, fallback: number): number {
  return Number.isInteger(value) && value !== null && value > 0 ? value : fallback;
}

function RowedPreview({ config }: { config: Extract<SeatLayoutConfig, { mode: "rowed" }> }) {
  const seats = generateSeatLayout(config);
  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${config.columns}, minmax(2.25rem, 1fr))` }}
    >
      {seats.map((s) => (
        <div
          key={s.index}
          className="flex aspect-square min-h-9 items-center justify-center rounded-md border border-border bg-background px-1 text-[10px] font-semibold text-foreground"
          title={s.displayLabel}
        >
          {s.displayLabel}
        </div>
      ))}
    </div>
  );
}

function TablesPreview({ config }: { config: Extract<SeatLayoutConfig, { mode: "tables" }> }) {
  const tables = Array.from({ length: config.tableCount }, (_, i) => i + 1);
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {tables.map((tableNo) => (
        <div key={tableNo} className="rounded-xl border border-border bg-background p-3">
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-accent-gold/45 bg-card text-center text-xs font-semibold text-foreground">
              Table {tableNo}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: config.seatsPerTable }, (_, idx) => (
              <div
                key={idx}
                className="flex aspect-square min-h-8 items-center justify-center rounded-md border border-border bg-card text-[10px] font-semibold text-foreground"
              >
                {idx + 1}
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function LayoutDesigner({
  eventId,
  ticketType,
}: {
  eventId: string;
  ticketType: InventoryTicketType;
}) {
  const [mode, setMode] = useState<SeatLayoutMode>(ticketType.seatLayoutMode);
  const [rows, setRows] = useState(positiveOrFallback(ticketType.seatLayoutRows, ticketType.quantity));
  const [columns, setColumns] = useState(positiveOrFallback(ticketType.seatLayoutColumns, 1));
  const [tableCount, setTableCount] = useState(
    positiveOrFallback(ticketType.seatLayoutTableCount, 1)
  );
  const [seatsPerTable, setSeatsPerTable] = useState(
    positiveOrFallback(ticketType.seatLayoutSeatsPerTable, ticketType.quantity)
  );

  const config: SeatLayoutConfig =
    mode === "rowed"
      ? { mode, rows: Math.max(1, rows), columns: Math.max(1, columns) }
      : {
          mode,
          tableCount: Math.max(1, tableCount),
          seatsPerTable: Math.max(1, seatsPerTable),
        };

  const layoutCount = expectedSeatCount(config);
  const countMatches = layoutCount === ticketType.quantity;

  return (
    <form action={saveSeatLayout} className="grid gap-5 lg:grid-cols-[18rem_1fr]">
      <input type="hidden" name="event_id" value={eventId} />
      <input type="hidden" name="ticket_type_id" value={ticketType.id} />
      <aside className="space-y-4 rounded-xl border border-border bg-muted/15 p-4">
        <div className="space-y-1">
          <label htmlFor={`${ticketType.id}-layout-mode`} className="label-eventuz">
            Layout type
          </label>
          <select
            id={`${ticketType.id}-layout-mode`}
            name="layout_mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as SeatLayoutMode)}
            className="input-eventuz"
            suppressHydrationWarning
          >
            <option value="rowed">Rowed seats</option>
            <option value="tables">Tables</option>
          </select>
        </div>

        {mode === "rowed" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-rows`} className="label-eventuz">
                Rows
              </label>
              <input
                id={`${ticketType.id}-rows`}
                name="layout_rows"
                type="number"
                min={1}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="input-eventuz"
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-columns`} className="label-eventuz">
                Columns
              </label>
              <input
                id={`${ticketType.id}-columns`}
                name="layout_columns"
                type="number"
                min={1}
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="input-eventuz"
                suppressHydrationWarning
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-tables`} className="label-eventuz">
                Tables
              </label>
              <input
                id={`${ticketType.id}-tables`}
                name="layout_table_count"
                type="number"
                min={1}
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value))}
                className="input-eventuz"
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-seats-per-table`} className="label-eventuz">
                Seats/table
              </label>
              <input
                id={`${ticketType.id}-seats-per-table`}
                name="layout_seats_per_table"
                type="number"
                min={1}
                value={seatsPerTable}
                onChange={(e) => setSeatsPerTable(Number(e.target.value))}
                className="input-eventuz"
                suppressHydrationWarning
              />
            </div>
          </div>
        )}

        <div
          className={`rounded-lg border px-3 py-2 text-xs ${
            countMatches
              ? "border-success/30 bg-success-muted text-success"
              : "border-warning/35 bg-warning/10 text-warning"
          }`}
        >
          Layout seats: <strong>{layoutCount}</strong> / required{" "}
          <strong>{ticketType.quantity}</strong>
        </div>

        <button
          type="submit"
          disabled={!countMatches}
          className="btn-eventuz-primary w-full disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save layout
        </button>
      </aside>

      <section className="min-w-0 rounded-xl border border-border bg-card p-4">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-lg font-semibold text-foreground">Preview</h3>
          <p className="text-xs text-muted-foreground">
            {mode === "rowed" ? "Squares represent seats." : "Circles represent tables; squares are seats."}
          </p>
        </div>
        <div className="max-h-[28rem] overflow-auto pr-1">
          {config.mode === "rowed" ? (
            <RowedPreview config={config} />
          ) : (
            <TablesPreview config={config} />
          )}
        </div>
      </section>
    </form>
  );
}

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
                <LayoutDesigner
                  key={[
                    tt.id,
                    tt.seatLayoutMode,
                    tt.seatLayoutRows,
                    tt.seatLayoutColumns,
                    tt.seatLayoutTableCount,
                    tt.seatLayoutSeatsPerTable,
                  ].join(":")}
                  eventId={eventId}
                  ticketType={tt}
                />
                <div className="my-5 border-t border-border" />
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
