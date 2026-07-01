"use client";

import type {
  AttendeeFloorPlanPreview as AttendeeFloorPlanPreviewData,
  SeatPickerRow,
} from "@/lib/attendee/loadSeatAssignmentPage";
import {
  floorPlanSeatCount,
  type FloorPlanElement,
  type FloorPlanElementType,
} from "@/lib/organizer/floorPlan";
import { useMemo, useState } from "react";

type Props = {
  preview: AttendeeFloorPlanPreviewData;
  seats: SeatPickerRow[];
  selectedSeatIds: string[];
  mode?: "inline" | "modal";
};

const TABLE_TYPES = new Set<FloorPlanElementType>([
  "circle_table",
  "square_table",
  "rectangle_table",
]);
const ROWED_SEAT_WIDTH = 16;
const ROWED_SEAT_HEIGHT = 18;
const ROWED_SEAT_GAP_X = 12;
const ROWED_SEAT_GAP_Y = 3;
const ROWED_SEAT_PADDING = 2;

function isTableElement(type: FloorPlanElementType) {
  return TABLE_TYPES.has(type);
}

function isLineElement(type: FloorPlanElementType) {
  return type === "wall" || type === "window";
}

function lineEnd(element: FloorPlanElement) {
  return {
    x2: element.x2 ?? element.x + element.width,
    y2: element.y2 ?? element.y,
  };
}

function rowLabel(index: number) {
  let n = index + 1;
  let label = "";
  while (n > 0) {
    const rem = (n - 1) % 26;
    label = String.fromCharCode(65 + rem) + label;
    n = Math.floor((n - 1) / 26);
  }
  return label;
}

function rowedFootprint(rows: number, columns: number) {
  return {
    width:
      ROWED_SEAT_PADDING * 2 +
      columns * ROWED_SEAT_WIDTH +
      Math.max(0, columns - 1) * ROWED_SEAT_GAP_X,
    height:
      ROWED_SEAT_PADDING * 2 +
      rows * ROWED_SEAT_HEIGHT +
      Math.max(0, rows - 1) * ROWED_SEAT_GAP_Y,
  };
}

function tableSeatMarkerSize(element: FloorPlanElement) {
  return Math.min(32, Math.max(10, element.tableSeatSize ?? 16));
}

function tableSeatPosition(element: FloorPlanElement, index: number, count: number, markerSize: number) {
  const offset = markerSize / 2 + 6;
  if (element.type === "circle_table") {
    const angle = (index / count) * Math.PI * 2;
    return {
      x: Math.cos(angle) * (element.width / 2 + offset),
      y: Math.sin(angle) * (element.height / 2 + offset),
      angleDeg: (angle * 180) / Math.PI,
    };
  }

  const rx = element.width / 2 + offset;
  const ry = element.height / 2 + offset;
  const outerWidth = rx * 2;
  const outerHeight = ry * 2;
  const perimeter = 2 * (outerWidth + outerHeight);
  const distance = (index / count) * perimeter;

  if (distance < outerWidth) return { x: -rx + distance, y: -ry, angleDeg: 0 };
  if (distance < outerWidth + outerHeight) {
    return { x: rx, y: -ry + (distance - outerWidth), angleDeg: 90 };
  }
  if (distance < outerWidth * 2 + outerHeight) {
    return { x: rx - (distance - outerWidth - outerHeight), y: ry, angleDeg: 0 };
  }
  return { x: -rx, y: ry - (distance - outerWidth * 2 - outerHeight), angleDeg: 90 };
}

function seatClass(seat: SeatPickerRow | undefined, currentTicket: boolean, selectedIds: Set<string>) {
  if (!currentTicket) return { fill: "#E7E1DA", stroke: "#CFC6BC", text: "#8B8178", opacity: 0.45 };
  if (!seat) return { fill: "#F1ECE6", stroke: "#D9D2CA", text: "#8B8178", opacity: 0.55 };
  if (selectedIds.has(seat.id)) return { fill: "#C9A96E", stroke: "#8B6914", text: "#1A1512", opacity: 1 };
  if (seat.status !== "available" && !seat.is_owned_assignment) {
    return { fill: "#F7E2DF", stroke: "#D9A6A1", text: "#8F4C45", opacity: 0.92 };
  }
  return { fill: "#FDFAF4", stroke: "#C9A96E", text: "#1A1512", opacity: 1 };
}

function compareSeat(a: SeatPickerRow, b: SeatPickerRow) {
  return a.display_label.localeCompare(b.display_label, undefined, { numeric: true });
}

function ElementLabel({ element, muted }: { element: FloorPlanElement; muted: boolean }) {
  if (!element.label) return null;
  return (
    <text
      x={element.x + element.width / 2}
      y={element.y + element.height / 2}
      textAnchor="middle"
      dominantBaseline="middle"
      fontSize="12"
      fontWeight="700"
      letterSpacing="1"
      fill={muted ? "#8B8178" : "#1A1512"}
      opacity={muted ? 0.55 : 0.95}
      transform={`rotate(${element.keepLabelHorizontal ? 0 : element.rotation} ${element.x + element.width / 2} ${element.y + element.height / 2})`}
    >
      {element.label}
    </text>
  );
}

function StaticElement({ element }: { element: FloorPlanElement }) {
  if (isLineElement(element.type)) {
    const end = lineEnd(element);
    const width =
      element.type === "window"
        ? Math.max(6, Math.min(14, element.height || 8))
        : Math.max(3, Math.min(12, element.height || 4));
    return (
      <line
        x1={element.x}
        y1={element.y}
        x2={end.x2}
        y2={end.y2}
        stroke={element.color}
        strokeWidth={width}
        strokeDasharray={
          element.type === "wall" && element.wallStyle === "dashed"
            ? `${width * 4} ${width * 2}`
            : element.type === "wall" && element.wallStyle === "dotted"
              ? `${width} ${width * 2.2}`
              : undefined
        }
        strokeLinecap={element.type === "window" ? "butt" : "round"}
      />
    );
  }

  if (element.type === "text") {
    return <ElementLabel element={element} muted={false} />;
  }

  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const rotate = `rotate(${element.rotation} ${cx} ${cy})`;
  if (element.type === "circle_table") {
    return (
      <g transform={rotate}>
        <ellipse
          cx={cx}
          cy={cy}
          rx={element.width / 2}
          ry={element.height / 2}
          fill={element.color}
          opacity={0.45}
          stroke={element.outlineColor ?? "#1C1714"}
          strokeWidth={element.outlineWidth ?? 1}
        />
        <ElementLabel element={element} muted />
      </g>
    );
  }
  return (
    <g transform={rotate}>
      <rect
        x={element.x}
        y={element.y}
        width={element.width}
        height={element.height}
        fill={element.color}
        opacity={0.42}
        stroke={element.outlineColor ?? "#1C1714"}
        strokeWidth={element.outlineWidth ?? 1}
      />
      <ElementLabel element={element} muted />
    </g>
  );
}

function TableElement({
  element,
  seats,
  currentTicket,
  selectedIds,
}: {
  element: FloorPlanElement;
  seats: SeatPickerRow[];
  currentTicket: boolean;
  selectedIds: Set<string>;
}) {
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const rotate = `rotate(${element.rotation} ${cx} ${cy})`;
  const count = Math.min(floorPlanSeatCount(element), 24);
  const markerSize = tableSeatMarkerSize(element);
  const half = markerSize / 2;
  const sortedSeats = [...seats].sort(compareSeat);

  return (
    <g transform={rotate}>
      {element.type === "circle_table" ? (
        <ellipse
          cx={cx}
          cy={cy}
          rx={element.width / 2}
          ry={element.height / 2}
          fill={currentTicket ? element.color : "#D9D2CA"}
          opacity={currentTicket ? 0.55 : 0.32}
          stroke={element.outlineColor ?? "#1C1714"}
          strokeWidth={element.outlineWidth ?? 1}
        />
      ) : (
        <rect
          x={element.x}
          y={element.y}
          width={element.width}
          height={element.height}
          fill={currentTicket ? element.color : "#D9D2CA"}
          opacity={currentTicket ? 0.55 : 0.32}
          stroke={element.outlineColor ?? "#1C1714"}
          strokeWidth={element.outlineWidth ?? 1}
        />
      )}
      <ElementLabel element={element} muted={!currentTicket} />
      {Array.from({ length: count }).map((_, index) => {
        const marker = tableSeatPosition(element, index, count, markerSize);
        const seat = sortedSeats[index];
        const state = seatClass(seat, currentTicket, selectedIds);
        return (
          <g
            key={`${element.id}-${index}`}
            transform={`translate(${cx + marker.x} ${cy + marker.y}) rotate(${marker.angleDeg})`}
            opacity={state.opacity}
          >
            <rect
              x={-half}
              y={-half}
              width={markerSize}
              height={markerSize}
              rx="3"
              fill={state.fill}
              stroke={state.stroke}
              strokeWidth={selectedIds.has(seat?.id ?? "") ? 2.4 : 1.2}
            />
            <text
              transform={`rotate(${-marker.angleDeg})`}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={Math.max(7, Math.min(10, markerSize * 0.52))}
              fontWeight="700"
              fill={state.text}
            >
              {seat?.display_label ?? index + 1}
            </text>
          </g>
        );
      })}
    </g>
  );
}

function RowedElement({
  element,
  seats,
  currentTicket,
  selectedIds,
}: {
  element: FloorPlanElement;
  seats: SeatPickerRow[];
  currentTicket: boolean;
  selectedIds: Set<string>;
}) {
  const rows = Math.min(element.rows ?? 1, 40);
  const columns = Math.min(element.columns ?? 1, 40);
  const cx = element.x + element.width / 2;
  const cy = element.y + element.height / 2;
  const footprint = rowedFootprint(rows, columns);
  const scale = Math.min(
    1,
    (element.width - ROWED_SEAT_PADDING * 2) / footprint.width,
    (element.height - ROWED_SEAT_PADDING * 2) / footprint.height
  );
  const startX = -footprint.width / 2 + ROWED_SEAT_PADDING;
  const startY = -footprint.height / 2 + ROWED_SEAT_PADDING;
  const seatByLabel = new Map(seats.map((seat) => [seat.display_label, seat]));

  return (
    <g transform={`translate(${cx} ${cy}) rotate(${element.rotation})`}>
      <rect
        x={-element.width / 2}
        y={-element.height / 2}
        width={element.width}
        height={element.height}
        fill={currentTicket ? element.color : "#D9D2CA"}
        opacity={currentTicket ? 0.28 : 0.18}
        stroke={element.outlineColor ?? "#1C1714"}
        strokeWidth={element.outlineWidth ?? 1}
      />
      <text
        x={-element.width / 2 + 4}
        y={-element.height / 2 - 8}
        fontSize="10"
        fontWeight="700"
        fill={currentTicket ? "#1A1512" : "#8B8178"}
      >
        {element.label}
      </text>
      <g transform={`scale(${scale})`}>
        {Array.from({ length: rows * columns }).map((_, index) => {
          const row = Math.floor(index / columns);
          const column = index % columns;
          const label = `${rowLabel(row)}${column + 1}`;
          const seat = seatByLabel.get(label);
          const state = seatClass(seat, currentTicket, selectedIds);
          const x = startX + column * (ROWED_SEAT_WIDTH + ROWED_SEAT_GAP_X);
          const y = startY + row * (ROWED_SEAT_HEIGHT + ROWED_SEAT_GAP_Y);
          return (
            <g key={`${element.id}-${label}`} opacity={state.opacity}>
              <rect
                x={x}
                y={y}
                width={ROWED_SEAT_WIDTH}
                height={ROWED_SEAT_HEIGHT}
                rx="3"
                fill={state.fill}
                stroke={state.stroke}
                strokeWidth={selectedIds.has(seat?.id ?? "") ? 2.2 : 1}
              />
              <text
                x={x + ROWED_SEAT_WIDTH / 2}
                y={y + ROWED_SEAT_HEIGHT / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="6.5"
                fontWeight="700"
                fill={state.text}
              >
                {label}
              </text>
            </g>
          );
        })}
      </g>
    </g>
  );
}

export function AttendeeFloorPlanPreview({ preview, seats, selectedSeatIds, mode = "inline" }: Props) {
  const [open, setOpen] = useState(true);
  const [zoom, setZoom] = useState(1);
  const isModal = mode === "modal";
  const expanded = isModal || open;
  const selectedIds = useMemo(() => new Set(selectedSeatIds), [selectedSeatIds]);
  const seatsByTable = useMemo(() => {
    const map = new Map<string, SeatPickerRow[]>();
    for (const seat of seats) {
      const key = seat.table_label ?? "";
      const list = map.get(key) ?? [];
      list.push(seat);
      map.set(key, list);
    }
    return map;
  }, [seats]);

  return (
    <section className={isModal ? "flex h-full min-h-0 flex-col bg-card" : "overflow-hidden rounded-2xl border border-border bg-card shadow-sm"}>
      {isModal ? null : (
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          className="flex w-full items-center justify-between gap-4 border-b border-border/60 bg-accent-gold/[0.03] px-6 py-4 text-left transition-colors hover:bg-accent-gold/[0.06]"
          aria-expanded={open}
        >
        <span>
          <span className="block font-serif text-xl font-light text-foreground">Floor Plan Preview</span>
          <span className="mt-1 block text-[10px] font-semibold uppercase tracking-[0.16em] text-accent-gold">
            Visual guide only
          </span>
        </span>
        <span className="text-sm font-semibold text-muted-foreground">{open ? "Hide" : "Show"}</span>
        </button>
      )}

      {expanded ? (
        <div className={isModal ? "flex min-h-0 flex-1 flex-col gap-4 p-4 sm:p-6" : "space-y-4 p-4 sm:p-6"}>
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/60 bg-muted/10 px-4 py-3">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-[#C9A96E] bg-[#FDFAF4]" />
                Selectable
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-[#8B6914] bg-[#C9A96E]" />
                Selected
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-[#D9A6A1] bg-[#F7E2DF]" />
                Occupied
              </span>
              <span className="inline-flex items-center gap-2">
                <span className="h-3 w-3 rounded border border-[#CFC6BC] bg-[#E7E1DA] opacity-60" />
                Other ticket
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <button
                type="button"
                onClick={() => setZoom((value) => Math.max(0.6, Number((value - 0.1).toFixed(1))))}
                disabled={zoom <= 0.6}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-2 font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Zoom out floor plan"
              >
                -
              </button>
              <button
                type="button"
                onClick={() => setZoom(1)}
                className="inline-flex h-8 min-w-14 items-center justify-center rounded-lg border border-border bg-card px-3 font-semibold text-foreground transition-colors hover:bg-muted/50"
              >
                {Math.round(zoom * 100)}%
              </button>
              <button
                type="button"
                onClick={() => setZoom((value) => Math.min(1.8, Number((value + 0.1).toFixed(1))))}
                disabled={zoom >= 1.8}
                className="inline-flex h-8 min-w-8 items-center justify-center rounded-lg border border-border bg-card px-2 font-semibold text-foreground transition-colors hover:bg-muted/50 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Zoom in floor plan"
              >
                +
              </button>
            </div>
          </div>
          <div
            className={
              isModal
                ? "min-h-0 flex-1 overflow-auto rounded-xl border border-border/60 bg-background p-4 shadow-inner"
                : "overflow-auto rounded-xl border border-border/60 bg-background p-3"
            }
          >
            <div className={isModal ? "flex min-w-full justify-center" : undefined}>
            <svg
              viewBox={`0 0 ${preview.canvasWidth} ${preview.canvasHeight}`}
              className="mx-auto block"
              style={{
                height: `${Math.max(isModal ? 34 : 24, (isModal ? 52 : 34) * zoom)}rem`,
                width: "auto",
                maxWidth: "none",
                background: preview.layout.backgroundColor ?? "#FDFAF4",
              }}
              role="img"
              aria-label="Read-only event floor plan"
            >
              {preview.layout.elements.map((element) => {
                const currentTicket = element.ticketTypeId === preview.currentTicketTypeId;
                if (isTableElement(element.type)) {
                  const tableLabel = element.ticketTableNumber ? `T${element.ticketTableNumber}` : "";
                  return (
                    <TableElement
                      key={element.id}
                      element={element}
                      seats={currentTicket ? seatsByTable.get(tableLabel) ?? [] : []}
                      currentTicket={currentTicket}
                      selectedIds={selectedIds}
                    />
                  );
                }
                if (element.type === "rowed_seats") {
                  return (
                    <RowedElement
                      key={element.id}
                      element={element}
                      seats={currentTicket ? seats : []}
                      currentTicket={currentTicket}
                      selectedIds={selectedIds}
                    />
                  );
                }
                return <StaticElement key={element.id} element={element} />;
              })}
            </svg>
            </div>
          </div>
          <p className="text-xs leading-relaxed text-muted-foreground">
            Use the seat buttons below to select seats. This preview updates to show your selected locations.
          </p>
        </div>
      ) : null}
    </section>
  );
}
