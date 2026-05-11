"use client";

import type { SeatOverviewRow, TicketTypeOption } from "@/lib/organizer/loadSeatingOverview";
import { filterSeatOverviewRows, type SeatOverviewOccupancyFilter } from "@/lib/organizer/seatOverviewFilters";
import {
  organizerField,
  organizerLabel,
  organizerPanel,
  organizerSectionTitle,
} from "@/components/organizer/eventSetupStyles";
import { ClientPaginationBar } from "@/components/ui/ClientPaginationBar";
import { EmptyState } from "@/components/ui/EmptyState";
import { slicePage } from "@/lib/ui/pagination";
import { useEffect, useMemo, useState } from "react";

const TABLES_GRID_PAGE_SIZE = 6;

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

function chipClass(seatStatus: string): string {
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

export function OrganizerTableLayoutView({ rows, ticketTypes }: Props) {
  const [ticketTypeId, setTicketTypeId] = useState<string>("");
  const [occupancy, setOccupancy] = useState<SeatOverviewOccupancyFilter>("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

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

  const orderedKeys = useMemo(() => sortTableKeys([...byTable.keys()]), [byTable]);

  const keysPage = useMemo(
    () => slicePage(orderedKeys, page, TABLES_GRID_PAGE_SIZE),
    [orderedKeys, page]
  );

  useEffect(() => {
    setPage(1);
  }, [orderedKeys.length, search, ticketTypeId, occupancy]);

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No seats yet"
        description="Add ticket types under Event setup and save — seat rows are created from each type’s quantity."
      />
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col gap-4 rounded-2xl border border-border bg-card p-4 shadow-[0_2px_12px_rgba(28,25,23,0.05)] sm:flex-row sm:flex-wrap sm:items-end">
        <div className="min-w-[min(100%,14rem)] flex-1 space-y-1.5">
          <label htmlFor="tables-layout-filter-search" className={organizerLabel}>
            Search
          </label>
          <input
            id="tables-layout-filter-search"
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
          <label htmlFor="tables-layout-filter-type" className={organizerLabel}>
            Ticket type
          </label>
          <select
            id="tables-layout-filter-type"
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
          <label htmlFor="tables-layout-filter-occ" className={organizerLabel}>
            Occupancy
          </label>
          <select
            id="tables-layout-filter-occ"
            value={occupancy}
            onChange={(e) => setOccupancy(e.target.value as SeatOverviewOccupancyFilter)}
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
        {filtered.length === 1 ? "" : "s"} match filters (of {rows.length} total). Physical tables
        below; colors match the Overview tab.
      </p>

      <p className="text-sm text-muted-foreground">
        Quick visual layout by physical table. Use{" "}
        <strong className="font-medium text-foreground">Seat inventory</strong> to edit labels.
      </p>

      {filtered.length === 0 ? (
        <EmptyState
          title="No seats match"
          description="Try clearing the search box or setting occupancy and ticket type filters to “All”."
        />
      ) : (
        <>
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {keysPage.slice.map((tableKey, ti) => {
              const tableRows = byTable.get(tableKey) ?? [];
              const filled = tableRows.filter((r) => r.guestName?.trim()).length;
              return (
                <section
                  key={tableKey}
                  aria-labelledby={`table-layout-${ti}`}
                  className={organizerPanel + " flex flex-col gap-4 p-5"}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border pb-3">
                    <h2 id={`table-layout-${ti}`} className={organizerSectionTitle}>
                      {displayTableTitle(tableKey)}
                    </h2>
                    <p className="text-xs tabular-nums text-muted-foreground">
                      {filled}/{tableRows.length} assigned
                    </p>
                  </div>
                  <ul className="flex flex-wrap gap-2">
                    {tableRows.map((r) => (
                      <li key={r.seatId}>
                        <span
                          className={`inline-flex max-w-full flex-col gap-0.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-shadow duration-150 hover:ring-1 hover:ring-border/80 ${chipClass(r.seatStatus)}`}
                          title={`${r.ticketTypeName} · ${r.seatStatus}`}
                        >
                          <span className="truncate">{r.displayLabel}</span>
                          {r.guestName?.trim() ? (
                            <span className="truncate text-[10px] font-normal opacity-90">
                              {r.guestName}
                            </span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </div>
          <ClientPaginationBar
            page={keysPage.page}
            pageCount={keysPage.pageCount}
            total={keysPage.total}
            rangeStart={keysPage.rangeStart}
            rangeEnd={keysPage.rangeEnd}
            onPageChange={setPage}
            itemLabel="table"
            listLabel="Table layout cards"
          />
        </>
      )}
    </div>
  );
}
