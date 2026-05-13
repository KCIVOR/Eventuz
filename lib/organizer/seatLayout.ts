export type SeatLayoutMode = "rowed" | "tables";

export type SeatLayoutConfig =
  | {
      mode: "rowed";
      rows: number;
      columns: number;
      tableCount?: null;
      seatsPerTable?: null;
    }
  | {
      mode: "tables";
      rows?: null;
      columns?: null;
      tableCount: number;
      seatsPerTable: number;
    };

export type GeneratedSeatLayoutItem = {
  index: number;
  tableLabel: string | null;
  seatLabel: string;
  displayLabel: string;
};

function rowName(index: number): string {
  let n = index + 1;
  let out = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    out = String.fromCharCode(65 + rem) + out;
    n = Math.floor((n - 1) / 26);
  }
  return out;
}

export function expectedSeatCount(config: SeatLayoutConfig): number {
  return config.mode === "rowed"
    ? config.rows * config.columns
    : config.tableCount * config.seatsPerTable;
}

export function generateSeatLayout(config: SeatLayoutConfig): GeneratedSeatLayoutItem[] {
  const items: GeneratedSeatLayoutItem[] = [];

  if (config.mode === "rowed") {
    for (let r = 0; r < config.rows; r++) {
      const row = rowName(r);
      for (let c = 1; c <= config.columns; c++) {
        items.push({
          index: items.length,
          tableLabel: `Row ${row}`,
          seatLabel: String(c),
          displayLabel: `${row}${c}`,
        });
      }
    }
    return items;
  }

  for (let t = 1; t <= config.tableCount; t++) {
    for (let s = 1; s <= config.seatsPerTable; s++) {
      items.push({
        index: items.length,
        tableLabel: `Table ${t}`,
        seatLabel: String(s),
        displayLabel: `Table ${t} - Seat ${s}`,
      });
    }
  }

  return items;
}
