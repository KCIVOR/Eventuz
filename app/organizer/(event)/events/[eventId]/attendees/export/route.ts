import { loadOrganizerEventAttendees, type AttendeeManagementRow } from "@/lib/organizer/loadEventAttendees";
import type { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

type ExportScope =
  | "all"
  | "current"
  | "checked_in"
  | "not_checked_in"
  | "issued"
  | "voided"
  | "registered"
  | "guest";

const EXPORT_SCOPES = new Set<ExportScope>([
  "all",
  "current",
  "checked_in",
  "not_checked_in",
  "issued",
  "voided",
  "registered",
  "guest",
]);

function normalizeScope(value: string | null): ExportScope {
  return EXPORT_SCOPES.has(value as ExportScope) ? (value as ExportScope) : "all";
}

function normalizeText(value: string | null): string {
  return (value ?? "").trim();
}

function csvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return `"${text.replaceAll('"', '""')}"`;
}

function toCsv(rows: AttendeeManagementRow[]): string {
  const headers = [
    "Attendee Name",
    "Attendee Email",
    "Ticket Code",
    "Ticket Type",
    "Ticket Status",
    "Seat",
    "Table",
    "Seat Number",
    "Checked In At",
    "Issued At",
    "Account Type",
    "Buyer Name",
    "Buyer Email",
    "Order ID",
  ];

  const body = rows.map((row) =>
    [
      row.attendee_name,
      row.attendee_email,
      row.ticket_code,
      row.ticket_type_name,
      row.status,
      row.seat_display_label,
      row.table_label,
      row.seat_label,
      row.checked_in_at,
      row.issued_at,
      row.is_registered ? "Registered" : "Guest",
      row.buyer.name,
      row.buyer.email,
      row.order_id,
    ].map(csvCell).join(",")
  );

  return [[...headers.map(csvCell)].join(","), ...body].join("\r\n");
}

function filterRows(
  rows: AttendeeManagementRow[],
  options: {
    scope: ExportScope;
    query: string;
    status: string;
    ticketType: string;
  }
) {
  const query = options.query.toLowerCase();
  return rows.filter((row) => {
    if (options.scope === "checked_in" && row.status !== "checked_in") return false;
    if (options.scope === "not_checked_in" && row.status === "checked_in") return false;
    if (options.scope === "issued" && row.status !== "issued") return false;
    if (options.scope === "voided" && row.status !== "voided") return false;
    if (options.scope === "registered" && !row.is_registered) return false;
    if (options.scope === "guest" && row.is_registered) return false;

    if (options.scope === "current") {
      if (options.status !== "all" && row.status !== options.status) return false;
      if (options.ticketType !== "all" && row.ticket_type_name !== options.ticketType) return false;
      if (query) {
        const haystack = [
          row.attendee_name,
          row.attendee_email,
          row.ticket_code,
          row.ticket_type_name,
          row.buyer.name,
          row.buyer.email ?? "",
          row.seat_display_label ?? "",
        ].join(" ").toLowerCase();
        if (!haystack.includes(query)) return false;
      }
    }

    return true;
  });
}

function fileSafeName(value: string): string {
  const cleaned = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "event";
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ eventId: string }> }
) {
  const { eventId } = await params;
  const loaded = await loadOrganizerEventAttendees(eventId);

  if (!loaded.ok) {
    return new Response(loaded.reason === "auth" ? "Authentication required" : "Not found", {
      status: loaded.reason === "auth" ? 401 : 404,
    });
  }

  const scope = normalizeScope(request.nextUrl.searchParams.get("scope"));
  const rows = filterRows(loaded.data.attendees, {
    scope,
    query: normalizeText(request.nextUrl.searchParams.get("q")),
    status: normalizeText(request.nextUrl.searchParams.get("status")) || "all",
    ticketType: normalizeText(request.nextUrl.searchParams.get("ticketType")) || "all",
  });
  const csv = `\uFEFF${toCsv(rows)}`;
  const date = new Date().toISOString().slice(0, 10);
  const filename = `${fileSafeName(loaded.data.event.name)}-attendees-${scope}-${date}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
