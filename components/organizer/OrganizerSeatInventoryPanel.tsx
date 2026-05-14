"use client";

import { saveSeatLayout } from "@/app/organizer/events/actions";
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
import { useState } from "react";

type Props = {
  eventId: string;
  ticketTypes: InventoryTicketType[];
  seatsByTypeId: Record<string, SeatInventoryEditorSeat[]>;
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
          className="flex aspect-square min-h-9 items-center justify-center rounded-[2px] border border-[#EDE8E3] bg-white px-1 text-[10px] font-medium text-[#1A1512]"
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
        <div key={tableNo} className="rounded-[2px] border border-[#EDE8E3] bg-white p-3">
          <div className="mb-3 flex items-center justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#C9A96E] bg-[#FDFAF4] text-center text-xs font-medium text-[#1A1512]">
              Table {tableNo}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: config.seatsPerTable }, (_, idx) => (
              <div
                key={idx}
                className="flex aspect-square min-h-8 items-center justify-center rounded-[2px] border border-[#EDE8E3] bg-[#FDFAF4] text-[10px] font-medium text-[#1A1512]"
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
      <aside className="space-y-4 rounded-[2px] border border-[#EDE8E3] bg-[#F7F4EF] p-4">
        <div className="space-y-1">
          <label htmlFor={`${ticketType.id}-layout-mode`} className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
            Layout type
          </label>
          <select
            id={`${ticketType.id}-layout-mode`}
            name="layout_mode"
            value={mode}
            onChange={(e) => setMode(e.target.value as SeatLayoutMode)}
            className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
            suppressHydrationWarning
          >
            <option value="rowed">Rowed seats</option>
            <option value="tables">Tables</option>
          </select>
        </div>

        {mode === "rowed" ? (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-rows`} className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
                Rows
              </label>
              <input
                id={`${ticketType.id}-rows`}
                name="layout_rows"
                type="number"
                min={1}
                value={rows}
                onChange={(e) => setRows(Number(e.target.value))}
                className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-columns`} className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
                Columns
              </label>
              <input
                id={`${ticketType.id}-columns`}
                name="layout_columns"
                type="number"
                min={1}
                value={columns}
                onChange={(e) => setColumns(Number(e.target.value))}
                className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
                suppressHydrationWarning
              />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-tables`} className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
                Tables
              </label>
              <input
                id={`${ticketType.id}-tables`}
                name="layout_table_count"
                type="number"
                min={1}
                value={tableCount}
                onChange={(e) => setTableCount(Number(e.target.value))}
                className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
                suppressHydrationWarning
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={`${ticketType.id}-seats-per-table`} className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
                Seats/table
              </label>
              <input
                id={`${ticketType.id}-seats-per-table`}
                name="layout_seats_per_table"
                type="number"
                min={1}
                value={seatsPerTable}
                onChange={(e) => setSeatsPerTable(Number(e.target.value))}
                className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
                suppressHydrationWarning
              />
            </div>
          </div>
        )}

        <div
          className={`rounded-[2px] border px-3 py-2 text-xs font-light ${
            countMatches
              ? "border-[#2A6645]/30 bg-[#DFF0E6] text-[#2A6645]"
              : "border-[#C9A030]/35 bg-[#F9F0DE] text-[#5A3D10]"
          }`}
        >
          Layout seats: <strong>{layoutCount}</strong> / required{" "}
          <strong>{ticketType.quantity}</strong>
        </div>

        <button
          type="submit"
          disabled={!countMatches}
          className="inline-flex w-full items-center justify-center rounded-[1px] bg-[#1A1512] px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-[#FDFAF4] transition-colors hover:bg-[#C9A96E] hover:text-[#1A1512] disabled:cursor-not-allowed disabled:opacity-45"
        >
          Save layout
        </button>
      </aside>

      <section className="min-w-0 rounded-[2px] border border-[#EDE8E3] bg-white p-4">
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="font-serif text-2xl font-light text-[#1A1512]">Preview</h3>
          <p className="text-xs font-light text-[#7A6E68]">
            {mode === "rowed"
              ? "Squares represent seats."
              : "Circles represent tables; squares are seats."}
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

export function OrganizerSeatInventoryPanel({ eventId, ticketTypes, seatsByTypeId }: Props) {
  return (
    <div className="space-y-6">
      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-[0.35em] text-[#C9A96E]">
          Layout studio
        </p>
        <h2 className="font-serif text-4xl font-light leading-tight text-[#1A1512]">
          Seat inventory
        </h2>
        <p className="mt-2 max-w-prose text-sm font-light leading-relaxed text-[#7A6E68]">
          Build the visual layout for each ticket type. The layout must equal the ticket quantity
          before it can be saved.
        </p>
      </div>

      <div className="rounded-[2px] border-l-[3px] border-[#4A82CC] bg-[#EEF4FD] px-5 py-4 text-sm font-light leading-relaxed text-[#1A3660]">
        <strong className="font-medium text-[#1A3660]">Sync</strong>
        <p className="mt-1">
          Seat count stays aligned when you save a ticket type under{" "}
          <strong className="text-foreground">Event setup</strong>. If counts look wrong, open that
          ticket type and click <strong>Save ticket type</strong> again.
        </p>
      </div>

      {ticketTypes.length === 0 ? (
        <EmptyState
          title="No ticket types yet"
          description="Add an active ticket type under Event setup. Seat rows are generated from each type's quantity."
        />
      ) : (
        <div className="space-y-8">
          {ticketTypes.map((tt) => {
            const list = seatsByTypeId[tt.id] ?? [];
            const mismatch = list.length !== tt.quantity;

            return (
              <div className="rounded-[2px] border border-[#EDE8E3] bg-white p-4 sm:p-6" key={tt.id}>
                <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2 border-b border-[#EDE8E3] pb-3">
                  <div>
                    <p className="text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
                      Ticket group
                    </p>
                    <p className="font-serif text-2xl font-light text-[#1A1512]">{tt.name}</p>
                  </div>
                  <p className="text-xs font-light tabular-nums text-[#7A6E68]">
                    {list.length} seat{list.length === 1 ? "" : "s"} / quantity{" "}
                    {String(tt.quantity)}
                    {mismatch ? (
                      <span className="ml-2 font-medium text-[#5A3D10]">- out of sync</span>
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
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
