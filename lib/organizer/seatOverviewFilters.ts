import type { SeatOverviewRow } from "@/lib/organizer/loadSeatingOverview";

export type SeatOverviewOccupancyFilter = "all" | "vacant" | "guests" | "checked_in";

export type SeatOverviewFilterState = {
  search: string;
  ticketTypeId: string;
  occupancy: SeatOverviewOccupancyFilter;
};

export function filterSeatOverviewRows(
  rows: readonly SeatOverviewRow[],
  f: SeatOverviewFilterState
): SeatOverviewRow[] {
  const q = f.search.trim().toLowerCase();
  return rows.filter((r) => {
    if (f.ticketTypeId && r.ticketTypeId !== f.ticketTypeId) return false;

    if (f.occupancy === "vacant") {
      if (
        r.guestName ||
        r.guestEmail ||
        r.assignmentStatus ||
        r.ticketCode ||
        r.ticketStatus === "issued" ||
        r.ticketStatus === "checked_in" ||
        r.seatStatus !== "available"
      ) {
        return false;
      }
    } else if (f.occupancy === "guests") {
      const taken = Boolean(
        r.guestName?.trim() ||
          r.guestEmail?.trim() ||
          r.assignmentStatus?.trim() ||
          r.ticketCode?.trim() ||
          r.ticketStatus === "issued" ||
          r.ticketStatus === "checked_in" ||
          r.seatStatus === "assigned" ||
          r.seatStatus === "checked_in"
      );
      if (!taken) return false;
    } else if (f.occupancy === "checked_in") {
      const cin = r.seatStatus === "checked_in" || r.ticketStatus === "checked_in";
      if (!cin) return false;
    }

    if (q) {
      const blob = [
        r.displayLabel,
        r.seatLabel,
        r.tableLabel,
        r.guestName,
        r.guestEmail,
        r.ticketCode,
        r.ticketTypeName,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!blob.includes(q)) return false;
    }
    return true;
  });
}
