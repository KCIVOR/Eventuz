"use client";

import type { SeatOverviewRow, TicketTypeOption } from "@/lib/organizer/loadSeatingOverview";
import {
  filterSeatOverviewRows,
  type SeatOverviewOccupancyFilter,
} from "@/lib/organizer/seatOverviewFilters";
import {
  SEAT_OVERVIEW_PAGE_SIZE,
  slicePage,
} from "@/lib/ui/pagination";
import {
  organizerField,
  organizerLabel,
  organizerPanel,
  organizerSectionTitle,
} from "@/components/organizer/eventSetupStyles";
import { ClientPaginationBar } from "@/components/ui/ClientPaginationBar";
import { useEffect, useMemo, useState } from "react";

type OccupancyFilter = SeatOverviewOccupancyFilter;

type Props = {
  rows: SeatOverviewRow[];
  ticketTypes: TicketTypeOption[];
};

function tableGroupKey(tableLabel: string | null): string {
  const t = (tableLabel ?? "").trim();
  return t === "" ? "\u0000ungrouped" : t;
}

function displayTableTitle(key: string): string {
  return key === "\u0000ungrouped" ? "Ungrouped seats" : key;
}

function sortTableKeys(keys: string[]): string[] {
  return [...keys].sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
}

function sortRowsInTable(rows: SeatOverviewRow[]): SeatOverviewRow[] {
  return [...rows].sort((a, b) =>
    a.displayLabel.localeCompare(b.displayLabel, undefined, { numeric: true })
  );
}

function seatBadgeClass(seatStatus: string): string {
  switch (seatStatus) {
    case "available":
      return "border-success/35 bg-success-muted text-success";
    case "assigned":
      return "border-primary/30 bg-primary/10 text-primary";
    case "checked_in":
      return "border-accent-gold/40 bg-muted text-foreground";
    case "disabled":
      return "border-border bg-muted text-muted-foreground";
    default:
      return "border-border bg-muted text-muted-foreground";
  }
}

export function OrganizerSeatingMap({ rows, ticketTypes }: Props) {
  const [ticketTypeId, setTicketTypeId] = useState<string>("");
  const [occupancy, setOccupancy] = useState<OccupancyFilter>("all");
  const [search, setSearch] = useState("");
  /** Page index for seat *rows* (not table sections). */
  const [rowPage, setRowPage] = useState(1);

  const filtered = useMemo(
    () =>
      filterSeatOverviewRows(rows, {
        search,
        ticketTypeId,
        occupancy,
      }),
    [rows, ticketTypeId, occupancy, search]
  );

  const byTable = useMemo(() => {
    const map = new Map<string, SeatOverviewRow[]>();
    for (const r of filtered) {
      const key = tableGroupKey(r.tableLabel);
      const list = map.get(key) ?? [];
      list.push(r);
      map.set(key, list);
    }
    for (const [k, list] of map) {
      map.set(k, sortRowsInTable(list));
    }
    return map;
  }, [filtered]);

  const orderedTableKeys = useMemo(() => sortTableKeys([...byTable.keys()]), [byTable]);

  /** Single sorted list: table order, then seat label — used for row pagination. */
  const flatOrderedRows = useMemo(() => {
    const out: SeatOverviewRow[] = [];
    for (const k of orderedTableKeys) {
      out.push(...(byTable.get(k) ?? []));
    }
    return out;
  }, [orderedTableKeys, byTable]);

  const rowsPage = useMemo(
    () => slicePage(flatOrderedRows, rowPage, SEAT_OVERVIEW_PAGE_SIZE),
    [flatOrderedRows, rowPage]
  );

  /** Regroup only the rows on this page for section headings (a table may span pages). */
  const sectionsOnPage = useMemo(() => {
    const map = new Map<string, SeatOverviewRow[]>();
    for (const r of rowsPage.slice) {
      const k = tableGroupKey(r.tableLabel);
      const list = map.get(k) ?? [];
      list.push(r);
      map.set(k, list);
    }
    const keys = sortTableKeys([...map.keys()]);
    return keys.map((key) => ({ key, rows: map.get(key) ?? [] }));
  }, [rowsPage]);

  useEffect(() => {
    setRowPage(1);
  }, [ticketTypeId, occupancy, search, flatOrderedRows.length]);

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_12px_rgba(28,25,23,0.05)] sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[min(100%,14rem)] flex-1 space-y-1.5">
          <label htmlFor="seat-filter-search" className={organizerLabel}>
            Search
          </label>
          <input
            id="seat-filter-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Seat, table, guest, email, ticket code…"
            className={organizerField}
            autoComplete="off"
            suppressHydrationWarning
          />
        </div>
        <div className="min-w-[min(100%,12rem)] space-y-1.5">
          <label htmlFor="seat-filter-type" className={organizerLabel}>
            Ticket type
          </label>
          <select
            id="seat-filter-type"
            value={ticketTypeId}
            onChange={(e) => setTicketTypeId(e.target.value)}
            className={organizerField}
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
          <label htmlFor="seat-filter-occ" className={organizerLabel}>
            Occupancy
          </label>
          <select
            id="seat-filter-occ"
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value as OccupancyFilter)}
            className={organizerField}
            suppressHydrationWarning
          >
            <option value="all">All seats</option>
            <option value="vacant">Vacant only</option>
            <option value="guests">With guest assigned</option>
            <option value="checked_in">Checked in</option>
          </select>
        </div>
      </div>

      <p className="text-xs text-muted-foreground" role="status">
        <strong className="font-medium text-foreground">{filtered.length}</strong> seat
        {filtered.length === 1 ? "" : "s"} match filters (of {rows.length} total). Sorted by table,
        then label. Use pagination below for large lists.
      </p>

      {rows.length === 0 ? (
        <div className={organizerPanel + " p-10 text-center text-sm text-muted-foreground"}>
          No seats yet. Add ticket types and save under{" "}
          <strong className="text-foreground">Event setup</strong> to generate seat rows.
        </div>
      ) : filtered.length === 0 ? (
        <div className={organizerPanel + " p-10 text-center text-sm text-muted-foreground"}>
          No seats match your filters. Clear search or broaden occupancy.
        </div>
      ) : (
        <div className="space-y-10">
          {sectionsOnPage.map(({ key: tableKey, rows: tableRows }, ti) => (
            <section
              key={`sec-${tableKey}-${ti}`}
              aria-labelledby={`seat-table-${tableKey}-${ti}`}
              className="space-y-4"
            >
              <h2 id={`seat-table-${tableKey}-${ti}`} className={organizerSectionTitle}>
                {displayTableTitle(tableKey)}
              </h2>
              <div className="overflow-x-auto rounded-xl border border-border">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/40 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <th className="px-4 py-3">Seat</th>
                      <th className="px-4 py-3">Ticket type</th>
                      <th className="px-4 py-3">Seat status</th>
                      <th className="px-4 py-3">Guest</th>
                      <th className="px-4 py-3">Email</th>
                      <th className="px-4 py-3">Ticket</th>
                      <th className="px-4 py-3">Check-in</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((r) => (
                      <tr key={r.seatId} className="border-b border-border/80 last:border-b-0">
                        <td className="px-4 py-3">
                          <span className="font-medium text-foreground">{r.displayLabel}</span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            Table {r.tableLabel?.trim() ? r.tableLabel : "—"} · Seat{" "}
                            {r.seatLabel || "—"}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">{r.ticketTypeName}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${seatBadgeClass(r.seatStatus)}`}
                          >
                            {r.seatStatus}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-foreground">
                          {r.guestName?.trim() ? r.guestName : "—"}
                        </td>
                        <td className="px-4 py-3 text-xs text-muted-foreground">
                          {r.guestEmail?.trim() ? r.guestEmail : "—"}
                        </td>
                        <td className="px-4 py-3 font-mono text-xs text-foreground">
                          {r.ticketCode ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-xs">
                          {r.checkedInAt || r.ticketStatus === "checked_in" ? (
                            <span className="text-success">Yes</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          ))}
          <ClientPaginationBar
            page={rowsPage.page}
            pageCount={rowsPage.pageCount}
            total={rowsPage.total}
            rangeStart={rowsPage.rangeStart}
            rangeEnd={rowsPage.rangeEnd}
            onPageChange={setRowPage}
            itemLabel="seat"
            listLabel="Seat overview"
          />
        </div>
      )}
    </div>
  );
}
