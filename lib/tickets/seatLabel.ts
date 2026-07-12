export type TicketSeatLabelParts = {
  display_label?: string | null;
  seat_label?: string | null;
  table_label?: string | null;
} | null | undefined;

function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : "";
}

export function formatTicketSeatLabel(seat: TicketSeatLabelParts): string {
  const displayLabel = clean(seat?.display_label);
  if (displayLabel) return displayLabel;

  const tableLabel = clean(seat?.table_label);
  const seatLabel = clean(seat?.seat_label);

  if (tableLabel && seatLabel) {
    if (/^T\d+$/i.test(tableLabel)) {
      return `${tableLabel}-${seatLabel}`;
    }

    const rowMatch = tableLabel.match(/^Row\s+(.+)$/i);
    if (rowMatch?.[1]) {
      return `${rowMatch[1]}${seatLabel}`;
    }

    return `${tableLabel} ${seatLabel}`;
  }

  if (seatLabel) return seatLabel;
  if (tableLabel) return tableLabel;
  return "Unassigned";
}

export function formatTicketSeatDescription(seat: TicketSeatLabelParts): string {
  const label = formatTicketSeatLabel(seat);
  if (label === "Unassigned") return label;

  const tableLabel = clean(seat?.table_label);
  const seatLabel = clean(seat?.seat_label);
  const parts: string[] = [];

  if (tableLabel && !label.includes(tableLabel)) {
    parts.push(/^T\d+$/i.test(tableLabel) ? `Table ${tableLabel}` : tableLabel);
  }

  if (seatLabel && label !== seatLabel && !label.endsWith(`-${seatLabel}`) && !label.endsWith(seatLabel)) {
    parts.push(`Seat ${seatLabel}`);
  }

  return parts.length > 0 ? `${label} (${parts.join(" - ")})` : label;
}
