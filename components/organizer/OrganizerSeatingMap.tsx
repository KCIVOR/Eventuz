"use client";

import { moveSeatOverviewTicketGroup } from "@/app/organizer/events/actions";
import type { SeatOverviewRow, TicketTypeOption } from "@/lib/organizer/loadSeatingOverview";
import {
  filterSeatOverviewRows,
  type SeatOverviewOccupancyFilter,
} from "@/lib/organizer/seatOverviewFilters";
import { useMemo, useState } from "react";

type OccupancyFilter = SeatOverviewOccupancyFilter;

type Props = {
  eventId: string;
  rows: SeatOverviewRow[];
  ticketTypes: TicketTypeOption[];
};

type TicketGroup = {
  ticketType: TicketTypeOption;
  rows: SeatOverviewRow[];
  allRows: SeatOverviewRow[];
  originalIndex: number;
};

function sortSeats(rows: SeatOverviewRow[]): SeatOverviewRow[] {
  return [...rows].sort((a, b) =>
    a.displayLabel.localeCompare(b.displayLabel, undefined, {
      numeric: true,
      sensitivity: "base",
    })
  );
}

function isSeatTaken(row: SeatOverviewRow): boolean {
  if (row.seatStatus === "disabled") return false;
  return Boolean(
    row.guestName?.trim() ||
      row.guestEmail?.trim() ||
      row.assignmentStatus?.trim() ||
      row.ticketCode?.trim() ||
      row.ticketStatus === "issued" ||
      row.ticketStatus === "checked_in" ||
      row.seatStatus === "assigned" ||
      row.seatStatus === "checked_in"
  );
}

function seatClass(row: SeatOverviewRow): string {
  if (row.seatStatus === "disabled") {
    return "border-[#EDE8E3] bg-[#F7F4EF] text-[#AEA89F] opacity-70";
  }
  if (row.seatStatus === "checked_in" || row.ticketStatus === "checked_in") {
    return "border-[#2A6645]/35 bg-[#DFF0E6] text-[#2A6645]";
  }
  if (isSeatTaken(row)) {
    return "border-[#C9A96E] bg-[#F0E4CC] text-[#8B6914]";
  }
  return "border-[#EDE8E3] bg-white text-[#1A1512] hover:border-[#C9A96E]";
}

function seatStateLabel(row: SeatOverviewRow): string {
  if (row.seatStatus === "disabled") return "Disabled";
  if (row.seatStatus === "checked_in" || row.ticketStatus === "checked_in") return "Checked in";
  if (isSeatTaken(row)) return "Taken";
  return "Open";
}

function formatCheckIn(value: string | null): string {
  if (!value) return "-";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleString("en-US", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function SeatTile({
  row,
  onSelect,
}: {
  row: SeatOverviewRow;
  onSelect: (row: SeatOverviewRow) => void;
}) {
  const taken = isSeatTaken(row);
  const className = `flex aspect-square min-h-10 items-center justify-center rounded-[2px] border px-1 text-center text-[10px] font-medium uppercase tracking-[0.08em] transition-colors ${seatClass(row)}`;
  const label = `${row.displayLabel}, ${seatStateLabel(row)}`;

  if (!taken) {
    return (
      <div className={className} title={label} aria-label={label}>
        {row.displayLabel}
      </div>
    );
  }

  return (
    <button
      type="button"
      className={`${className} cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C9A96E]/35 focus-visible:ring-offset-2 focus-visible:ring-offset-[#FDFAF4]`}
      title={`${label}. Open attendee details.`}
      aria-label={`${label}. Open attendee details.`}
      onClick={() => onSelect(row)}
    >
      {row.displayLabel}
    </button>
  );
}

function RowedLayout({
  group,
  onSelect,
}: {
  group: TicketGroup;
  onSelect: (row: SeatOverviewRow) => void;
}) {
  const seats = sortSeats(group.rows);
  const configuredColumns = group.ticketType.seatLayoutColumns;
  const columns =
    configuredColumns && configuredColumns > 0
      ? configuredColumns
      : Math.max(1, Math.ceil(Math.sqrt(Math.max(seats.length, 1))));

  return (
    <div
      className="grid gap-2"
      style={{ gridTemplateColumns: `repeat(${columns}, minmax(2.25rem, 1fr))` }}
    >
      {seats.map((row) => (
        <SeatTile key={row.seatId} row={row} onSelect={onSelect} />
      ))}
    </div>
  );
}

function tableKey(row: SeatOverviewRow): string {
  const label = row.tableLabel?.trim();
  return label || "Table";
}

function TablesLayout({
  group,
  onSelect,
}: {
  group: TicketGroup;
  onSelect: (row: SeatOverviewRow) => void;
}) {
  const byTable = new Map<string, SeatOverviewRow[]>();
  for (const row of group.rows) {
    const key = tableKey(row);
    const list = byTable.get(key) ?? [];
    list.push(row);
    byTable.set(key, list);
  }

  const tables = [...byTable.entries()].sort(([a], [b]) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
  const seatsPerTable = Math.max(1, group.ticketType.seatLayoutSeatsPerTable ?? 4);
  const columns = Math.min(6, Math.max(2, Math.ceil(Math.sqrt(seatsPerTable))));

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {tables.map(([label, seats]) => (
        <div key={label} className="rounded-[2px] border border-[#EDE8E3] bg-white p-4">
          <div className="mb-4 flex items-center justify-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full border border-[#C9A96E] bg-[#FDFAF4] px-2 text-center text-xs font-medium text-[#1A1512]">
              {label}
            </div>
          </div>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {sortSeats(seats).map((row) => (
              <SeatTile key={row.seatId} row={row} onSelect={onSelect} />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="grid gap-1 border-b border-[#EDE8E3] py-3 last:border-b-0 sm:grid-cols-[9rem_1fr]">
      <dt className="text-[10px] font-semibold uppercase tracking-[0.22em] text-[#C9A96E]">
        {label}
      </dt>
      <dd className="text-sm font-light text-[#2E2825]">{value || "-"}</dd>
    </div>
  );
}

function SeatDetailsModal({
  row,
  onClose,
}: {
  row: SeatOverviewRow | null;
  onClose: () => void;
}) {
  if (!row) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A1512]/65 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="seat-details-title"
    >
      <div className="w-full max-w-lg rounded-[2px] border border-[#EDE8E3] bg-white shadow-xl">
        <div className="flex items-start justify-between gap-4 border-b border-[#EDE8E3] px-7 py-6">
          <div>
            <h3 id="seat-details-title" className="font-serif text-3xl font-light text-[#1A1512]">
              {row.displayLabel}
            </h3>
            <p className="mt-1 text-sm font-light text-[#7A6E68]">{row.ticketTypeName}</p>
          </div>
          <button
            type="button"
            className="rounded-[1px] border border-[#1A1512] px-4 py-2 text-xs font-medium uppercase tracking-[0.2em] text-[#1A1512] transition-colors hover:bg-[#1A1512] hover:text-[#FDFAF4]"
            onClick={onClose}
          >
            Close
          </button>
        </div>

        <dl className="px-7 py-5">
          <DetailRow label="Attendee" value={row.guestName?.trim() || "-"} />
          <DetailRow label="Email" value={row.guestEmail?.trim() || "-"} />
          <DetailRow label="Ticket code" value={row.ticketCode || "-"} />
          <DetailRow label="Ticket status" value={row.ticketStatus || "-"} />
          <DetailRow label="Assignment" value={row.assignmentStatus || "-"} />
          <DetailRow label="Check-in" value={formatCheckIn(row.checkedInAt)} />
          <DetailRow label="Ticket type" value={row.ticketTypeName} />
          <DetailRow label="Seat" value={`${row.displayLabel} (${row.seatLabel || "-"})`} />
        </dl>
      </div>
    </div>
  );
}

export function OrganizerSeatingMap({ eventId, rows, ticketTypes }: Props) {
  const [ticketTypeId, setTicketTypeId] = useState<string>("");
  const [occupancy, setOccupancy] = useState<OccupancyFilter>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<SeatOverviewRow | null>(null);
  const [collapsedGroups, setCollapsedGroups] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () =>
      filterSeatOverviewRows(rows, {
        search,
        ticketTypeId,
        occupancy,
      }),
    [rows, ticketTypeId, occupancy, search]
  );

  const groups = useMemo<TicketGroup[]>(() => {
    return ticketTypes
      .map((ticketType, originalIndex) => {
        const allRows = rows.filter((row) => row.ticketTypeId === ticketType.id);
        const groupRows = filtered.filter((row) => row.ticketTypeId === ticketType.id);
        return { ticketType, rows: groupRows, allRows, originalIndex };
      })
      .filter((group) => (ticketTypeId ? group.ticketType.id === ticketTypeId : true))
      .filter((group) => group.rows.length > 0 || (!search.trim() && occupancy === "all"));
  }, [filtered, rows, ticketTypeId, ticketTypes, search, occupancy]);

  const takenCount = useMemo(() => rows.filter(isSeatTaken).length, [rows]);
  const openCount = rows.filter((row) => !isSeatTaken(row) && row.seatStatus !== "disabled").length;
  const disabledCount = rows.filter((row) => row.seatStatus === "disabled").length;
  const reorderLocked = Boolean(ticketTypeId);

  function toggleGroup(ticketTypeId: string) {
    setCollapsedGroups((current) => ({
      ...current,
      [ticketTypeId]: !current[ticketTypeId],
    }));
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-[2px] border border-[#EDE8E3] bg-white p-4 shadow-[0_8px_32px_rgba(26,21,18,0.04)] sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[min(100%,14rem)] flex-1 space-y-1.5">
          <label htmlFor="seat-filter-search" className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
            Search
          </label>
          <input
            id="seat-filter-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Seat, guest, email, ticket code..."
            className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors placeholder:text-[#AEA89F] focus:border-[#C9A96E]"
            autoComplete="off"
            suppressHydrationWarning
          />
        </div>
        <div className="min-w-[min(100%,12rem)] space-y-1.5">
          <label htmlFor="seat-filter-type" className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
            Ticket type
          </label>
          <select
            id="seat-filter-type"
            value={ticketTypeId}
            onChange={(e) => setTicketTypeId(e.target.value)}
            className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
            suppressHydrationWarning
          >
            <option value="">All types</option>
            {ticketTypes.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
        <div className="min-w-[min(100%,12rem)] space-y-1.5">
          <label htmlFor="seat-filter-occ" className="text-[11px] font-medium uppercase tracking-[0.15em] text-[#7A6E68]">
            Occupancy
          </label>
          <select
            id="seat-filter-occ"
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value as OccupancyFilter)}
            className="w-full rounded-[1px] border border-[#EDE8E3] bg-white px-4 py-3 text-sm font-light text-[#1A1512] outline-none transition-colors focus:border-[#C9A96E]"
            suppressHydrationWarning
          >
            <option value="all">All seats</option>
            <option value="vacant">Open only</option>
            <option value="guests">Taken only</option>
            <option value="checked_in">Checked in</option>
          </select>
        </div>
      </div>

      <div className="grid gap-px overflow-hidden rounded-[2px] border border-[#EDE8E3] bg-[#EDE8E3] sm:grid-cols-4">
        <div className="bg-white p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#7A6E68]">Total</p>
          <p className="mt-2 font-serif text-5xl font-light leading-none tabular-nums text-[#1A1512]">{rows.length}</p>
        </div>
        <div className="bg-white p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#7A6E68]">Open</p>
          <p className="mt-2 font-serif text-5xl font-light leading-none tabular-nums text-[#2A6645]">{openCount}</p>
        </div>
        <div className="bg-white p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#7A6E68]">Taken</p>
          <p className="mt-2 font-serif text-5xl font-light leading-none tabular-nums text-[#8B6914]">{takenCount}</p>
        </div>
        <div className="bg-white p-5">
          <p className="text-[10px] font-medium uppercase tracking-[0.2em] text-[#7A6E68]">Disabled</p>
          <p className="mt-2 font-serif text-5xl font-light leading-none tabular-nums text-[#7A6E68]">
            {disabledCount}
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs font-light text-[#7A6E68]">
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[1px] border border-[#EDE8E3] bg-white" /> Open
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[1px] border border-[#C9A96E] bg-[#F0E4CC]" /> Taken
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[1px] border border-[#2A6645]/35 bg-[#DFF0E6]" /> Checked in
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="h-3 w-3 rounded-[1px] border border-[#EDE8E3] bg-[#F7F4EF]" /> Disabled
        </span>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-[2px] border border-[#EDE8E3] bg-white p-10 text-center text-sm font-light text-[#7A6E68]">
          No seats yet. Add ticket types and save under{" "}
          <strong className="font-medium text-[#1A1512]">Event setup</strong> to generate seat rows.
        </div>
      ) : groups.length === 0 ? (
        <div className="rounded-[2px] border border-[#EDE8E3] bg-white p-10 text-center text-sm font-light text-[#7A6E68]">
          No seats match your filters.
        </div>
      ) : (
        <div className="space-y-8">
          {groups.map((group) => {
            const first = group.originalIndex === 0;
            const last = group.originalIndex === ticketTypes.length - 1;
            const taken = group.allRows.filter(isSeatTaken).length;
            const collapsed = Boolean(collapsedGroups[group.ticketType.id]);
            const panelId = `seat-group-${group.ticketType.id}`;

            return (
              <section key={group.ticketType.id} className="rounded-[2px] border border-[#EDE8E3] bg-white p-4 sm:p-6">
                <div className="mb-5 flex flex-col gap-4 border-b border-[#EDE8E3] pb-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-[#C9A96E]">
                      Ticket group
                    </p>
                    <h2 className="font-serif text-3xl font-light leading-tight text-[#1A1512]">{group.ticketType.name}</h2>
                    <p className="mt-1 text-sm font-light text-[#7A6E68]">
                      {group.allRows.length} seats, {taken} taken,{" "}
                      {group.allRows.length - taken} open
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      aria-expanded={!collapsed}
                      aria-controls={panelId}
                      onClick={() => toggleGroup(group.ticketType.id)}
                      className="rounded-[1px] border border-[#C9A96E] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#8B6914] transition-colors hover:bg-[#C9A96E] hover:text-[#1A1512]"
                    >
                      {collapsed ? "Expand" : "Collapse"}
                    </button>
                    <form action={moveSeatOverviewTicketGroup}>
                      <input type="hidden" name="event_id" value={eventId} />
                      <input type="hidden" name="ticket_type_id" value={group.ticketType.id} />
                      <input type="hidden" name="direction" value="up" />
                      <button
                        type="submit"
                        disabled={first || reorderLocked}
                        className="rounded-[1px] border border-[#1A1512] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#1A1512] transition-colors hover:bg-[#1A1512] hover:text-[#FDFAF4] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Move up
                      </button>
                    </form>
                    <form action={moveSeatOverviewTicketGroup}>
                      <input type="hidden" name="event_id" value={eventId} />
                      <input type="hidden" name="ticket_type_id" value={group.ticketType.id} />
                      <input type="hidden" name="direction" value="down" />
                      <button
                        type="submit"
                        disabled={last || reorderLocked}
                        className="rounded-[1px] border border-[#1A1512] px-4 py-2 text-[11px] font-medium uppercase tracking-[0.18em] text-[#1A1512] transition-colors hover:bg-[#1A1512] hover:text-[#FDFAF4] disabled:cursor-not-allowed disabled:opacity-35"
                      >
                        Move down
                      </button>
                    </form>
                  </div>
                </div>
                {reorderLocked ? (
                  <p className="mb-4 text-xs font-light text-[#7A6E68]">
                    Clear the ticket type filter to reorder groups.
                  </p>
                ) : null}
                <div id={panelId} hidden={collapsed}>
                  {group.ticketType.seatLayoutMode === "tables" ? (
                    <TablesLayout group={group} onSelect={setSelected} />
                  ) : (
                    <RowedLayout group={group} onSelect={setSelected} />
                  )}
                </div>
                {collapsed ? (
                  <p className="rounded-[2px] border border-[#EDE8E3] bg-[#FDFAF4] px-4 py-3 text-sm font-light text-[#7A6E68]">
                    {group.ticketType.name} is collapsed. Expand to view and open individual seats.
                  </p>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <SeatDetailsModal row={selected} onClose={() => setSelected(null)} />
    </div>
  );
}
